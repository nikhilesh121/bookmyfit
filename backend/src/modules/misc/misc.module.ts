import { Module, Controller, Get, Post, Put, Delete, Param, Body, Query, Injectable, BadRequestException, UseGuards, Req, Res, NotFoundException } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import type { Response } from 'express';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags } from '@nestjs/swagger';
import {
  RatingEntity, CouponEntity, NotificationEntity,
  CategoryEntity, AmenityEntity, WorkoutVideoEntity, FraudAlertEntity,
} from '../../database/entities/misc.entity';
import { CheckinEntity } from '../../database/entities/checkin.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { SubscriptionEntity } from '../../database/entities/subscription.entity';
import { GymEntity } from '../../database/entities/gym.entity';
import { TrainerEntity } from '../../database/entities/trainer.entity';
import { WellnessPartnerEntity } from '../../database/entities/wellness.entity';
import { AppConfigEntity } from '../../database/entities/app-config.entity';
import { ProductEntity } from '../../database/entities/store.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import {
  PLATFORM_PRICING_CONFIG_KEY,
  platformPricingResponse,
} from '../../common/commission-config';

// ============ Ratings ============
@Injectable()
export class RatingsService {
  constructor(
    @InjectRepository(RatingEntity) private readonly repo: Repository<RatingEntity>,
    @InjectRepository(CheckinEntity) private readonly checkins: Repository<CheckinEntity>,
    @InjectRepository(SubscriptionEntity) private readonly subscriptions: Repository<SubscriptionEntity>,
    @InjectRepository(GymEntity) private readonly gyms: Repository<GymEntity>,
    @InjectRepository(TrainerEntity) private readonly trainers: Repository<TrainerEntity>,
    @InjectRepository(WellnessPartnerEntity) private readonly wellnessPartners: Repository<WellnessPartnerEntity>,
  ) {}
  private targetFromRating(rating: RatingEntity) {
    if (rating.gymId) return { targetType: 'gym', targetId: rating.gymId };
    if (rating.trainerId) return { targetType: 'trainer', targetId: rating.trainerId };
    if (rating.wellnessPartnerId) return { targetType: 'wellness', targetId: rating.wellnessPartnerId };
    return { targetType: null, targetId: null };
  }

  private memberCode(userId?: string | null) {
    const compact = String(userId || 'member').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    return `BMF-${compact.slice(0, 10).padEnd(10, '0')}`;
  }

  private publicMemberName(name: any, userId?: string | null) {
    const clean = String(name || '').trim();
    if (/^\d{10,15}$/.test(clean)) return `Member ${this.memberCode(userId).replace('BMF-', '').slice(0, 6)}`;
    return clean || `Member ${this.memberCode(userId).replace('BMF-', '').slice(0, 6)}`;
  }

  private ratingResponse(rating: RatingEntity) {
    const target = this.targetFromRating(rating);
    return { ...rating, ...target };
  }

  private async aggregateFor(column: 'gymId' | 'trainerId' | 'wellnessPartnerId', targetId: string) {
    const row = await this.repo
      .createQueryBuilder('r')
      .select('AVG(r.stars)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where(`r."${column}" = :targetId`, { targetId })
      .andWhere('r.status = :status', { status: 'approved' })
      .getRawOne();
    const count = Number(row?.count || 0);
    const rating = count > 0 ? Math.round(Number(row?.avg || 0) * 10) / 10 : 0;
    return { rating, count };
  }

  private async refreshAggregateForRating(rating: RatingEntity) {
    if (rating.gymId) {
      const aggregate = await this.aggregateFor('gymId', rating.gymId);
      await this.gyms.update(rating.gymId, { rating: aggregate.rating, ratingCount: aggregate.count });
    }
    if (rating.trainerId) {
      const aggregate = await this.aggregateFor('trainerId', rating.trainerId);
      await this.trainers.update(rating.trainerId, { rating: aggregate.rating, ratingCount: aggregate.count });
    }
    if (rating.wellnessPartnerId) {
      const aggregate = await this.aggregateFor('wellnessPartnerId', rating.wellnessPartnerId);
      await this.wellnessPartners.update(rating.wellnessPartnerId, { rating: aggregate.rating, reviewCount: aggregate.count });
    }
  }

  private async targetPatch(targetType: 'gym' | 'trainer' | 'wellness', targetId: string) {
    if (!targetId) throw new BadRequestException('targetId is required');
    if (targetType === 'gym') {
      const gym = await this.gyms.findOne({ where: { id: targetId } });
      if (!gym) throw new NotFoundException('Gym not found');
      return { gymId: targetId };
    }
    if (targetType === 'trainer') {
      const trainer = await this.trainers.findOne({ where: { id: targetId } });
      if (!trainer) throw new NotFoundException('Trainer not found');
      return { trainerId: targetId };
    }
    if (targetType === 'wellness') {
      const partner = await this.wellnessPartners.findOne({ where: { id: targetId } });
      if (!partner) throw new NotFoundException('Wellness partner not found');
      return { wellnessPartnerId: targetId };
    }
    throw new BadRequestException('Invalid targetType');
  }

  private async canUserRateGym(userId: string, gymId: string) {
    const [checkinCount, activeDirectPassCount] = await Promise.all([
      this.checkins.count({ where: { userId, gymId, status: 'success' } }),
      this.subscriptions
        .createQueryBuilder('s')
        .where('s."userId" = :userId', { userId })
        .andWhere('s.status = :status', { status: 'active' })
        .andWhere('s."planType" IN (:...planTypes)', { planTypes: ['same_gym', 'day_pass'] })
        .andWhere('s."startDate" <= CURRENT_DATE')
        .andWhere('s."endDate" >= CURRENT_DATE')
        .andWhere('CAST(:gymId AS uuid) = ANY(COALESCE(s."gymIds", ARRAY[]::uuid[]))', { gymId })
        .getCount(),
    ]);
    return checkinCount > 0 || activeDirectPassCount > 0;
  }

  async submit(userId: string, targetType: 'gym' | 'trainer' | 'wellness', targetId: string, stars: number, review?: string, status: 'pending' | 'approved' | 'rejected' = 'pending') {
    const normalizedStars = Number(stars);
    if (!userId) throw new BadRequestException('userId is required');
    if (!Number.isInteger(normalizedStars) || normalizedStars < 1 || normalizedStars > 5) throw new BadRequestException('Stars must be 1-5');
    if (!['gym', 'trainer', 'wellness'].includes(targetType)) throw new BadRequestException('Invalid targetType');
    if (!['pending', 'approved', 'rejected'].includes(status)) throw new BadRequestException('Invalid status');
    const target = await this.targetPatch(targetType, targetId);
    let finalStatus = status;
    if (targetType === 'gym') {
      const canRate = await this.canUserRateGym(userId, targetId);
      if (!canRate) throw new BadRequestException('You need an active pass for this gym or a completed check-in to rate it');
      if (status === 'pending') finalStatus = 'approved';
    }
    const ratingWhere = { userId, ...(target as any) } as any;
    const existingRows = typeof (this.repo as any).find === 'function'
      ? await this.repo.find({ where: ratingWhere, order: { createdAt: 'DESC' } as any })
      : [];
    const existing = existingRows[0] || (typeof (this.repo as any).findOne === 'function'
      ? await this.repo.findOne({ where: ratingWhere })
      : null);
    if (existingRows.length > 1 && typeof (this.repo as any).delete === 'function') {
      await this.repo.delete(existingRows.slice(1).map((row) => row.id));
    }
    const rating = await this.repo.save({
      ...(existing || {}),
      userId,
      stars: normalizedStars,
      review: String(review || '').trim() || null,
      status: finalStatus,
      ...target,
    });
    if (rating.status === 'approved') await this.refreshAggregateForRating(rating);
    return this.ratingResponse(rating);
  }
  async moderate(id: string, approve: boolean) {
    const rating = await this.repo.findOne({ where: { id } });
    if (!rating) throw new NotFoundException('Rating not found');
    rating.status = approve ? 'approved' : 'rejected';
    const saved = await this.repo.save(rating);
    await this.refreshAggregateForRating(saved);
    return this.ratingResponse(saved);
  }
  async listPending() {
    const rows = await this.repo.find({ where: { status: 'pending' }, order: { createdAt: 'DESC' } });
    return rows.map((rating) => this.ratingResponse(rating));
  }
  async listByStatus(status?: string) {
    const where: any = status ? { status } : {};
    const rows = await this.repo.find({ where, order: { createdAt: 'DESC' } });
    return rows.map((rating) => this.ratingResponse(rating));
  }
  async listForGym(gymId: string) {
    const rows = await this.repo
      .createQueryBuilder('r')
      .leftJoin(UserEntity, 'u', 'u.id = r."userId"')
      .where('r."gymId" = :gymId', { gymId })
      .andWhere('r.status = :status', { status: 'approved' })
      .orderBy('r.createdAt', 'DESC')
      .select([
        'r.id AS id',
        'r."userId" AS "userId"',
        'r."gymId" AS "gymId"',
        'r.stars AS stars',
        'r.review AS review',
        'r.status AS status',
        'r.createdAt AS "createdAt"',
        'u.name AS "userName"',
      ])
      .getRawMany();
    return rows.map((rating) => ({
      id: rating.id,
      gymId: rating.gymId,
      stars: Number(rating.stars),
      review: rating.review,
      status: rating.status,
      createdAt: rating.createdAt,
      targetType: 'gym',
      targetId: rating.gymId,
      user: {
        memberCode: this.memberCode(rating.userId),
        name: this.publicMemberName(rating.userName, rating.userId),
      },
    }));
  }
}

// ============ Coupons ============
@Injectable()
class CouponsService {
  constructor(@InjectRepository(CouponEntity) private readonly repo: Repository<CouponEntity>) {}
  list() { return this.repo.find({ order: { createdAt: 'DESC' } }); }
  create(d: Partial<CouponEntity>) { return this.repo.save(this.repo.create(d)); }
  async validate(code: string, amount: number, kind: string) {
    const c = await this.repo.findOne({ where: { code, isActive: true } });
    if (!c) throw new BadRequestException('Invalid coupon');
    const now = new Date();
    if (now < new Date(c.validFrom) || now > new Date(c.validTo)) throw new BadRequestException('Expired');
    if (c.usageLimit > 0 && c.usedCount >= c.usageLimit) throw new BadRequestException('Limit reached');
    if (amount < Number(c.minOrderValue)) throw new BadRequestException(`Min order ₹${c.minOrderValue}`);
    if (c.applicableTo?.length && !c.applicableTo.includes(kind)) throw new BadRequestException('Not applicable');
    let discount = c.discountType === 'percentage' ? amount * (Number(c.discountValue) / 100) : Number(c.discountValue);
    if (c.maxDiscount) discount = Math.min(discount, Number(c.maxDiscount));
    return { valid: true, discount, coupon: c.code };
  }
}

// ============ Notifications ============
@Injectable()
class NotificationsService {
  constructor(@InjectRepository(NotificationEntity) private readonly repo: Repository<NotificationEntity>) {}
  send(userId: string, title: string, body: string, type = 'general', data: any = {}) {
    // TODO: integrate FCM push
    return this.repo.save(this.repo.create({ userId, title, body, type, data }));
  }
  broadcast(userIds: string[], title: string, body: string) {
    return Promise.all(userIds.map((u) => this.send(u, title, body, 'broadcast')));
  }
  async listForUser(userId: string, page: any = 1, limit: any = 20) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.repo.findAndCount({ where: { userId }, order: { createdAt: 'DESC' }, skip, take });
    return paginatedResponse(data, total, p, l);
  }
  markRead(id: string) { return this.repo.update(id, { isRead: true }); }
}

// ============ Master Data (categories, amenities) ============
function defaultCatalogIcon(name: any, kind: 'category' | 'amenity' = 'category') {
  const key = String(name || '').toLowerCase();
  const matchers: Array<[string[], string]> = [
    [['strength', 'weight', 'muscle', 'dumbbell'], 'lucide:dumbbell'],
    [['cardio', 'run', 'running', 'treadmill'], 'lucide:activity'],
    [['yoga', 'pilates', 'stretch'], 'lucide:flower'],
    [['crossfit', 'hiit', 'functional', 'bolt'], 'lucide:zap'],
    [['zumba', 'dance'], 'lucide:music'],
    [['boxing', 'mma'], 'lucide:badge'],
    [['pool', 'swim'], 'lucide:waves'],
    [['parking'], 'lucide:parking-circle'],
    [['shower', 'wash', 'bath'], 'lucide:shower-head'],
    [['locker', 'changing', 'change room'], 'lucide:lock-keyhole'],
    [['steam', 'sauna'], 'lucide:flame'],
    [['wifi', 'internet'], 'lucide:wifi'],
    [['ac', 'air', 'ventilation'], 'lucide:snowflake'],
    [['trainer', 'coach'], 'lucide:user-round-check'],
    [['nutrition', 'diet'], 'lucide:apple'],
    [['cycle', 'spin', 'bike'], 'lucide:bike'],
    [['recovery', 'physio'], 'lucide:heart-pulse'],
    [['water', 'drinking'], 'lucide:waves'],
    [['access', '24/7', '24x7'], 'lucide:badge'],
  ];
  const found = matchers.find(([tokens]) => tokens.some((token) => key.includes(token)));
  if (found) return found[1];
  return kind === 'amenity' ? 'lucide:sparkles' : 'lucide:dumbbell';
}

function normalizeIconUrl(value: any) {
  const icon = String(value || '').trim();
  return icon || undefined;
}

class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name: string;

  @IsOptional()
  @IsString()
  @Length(1, 50000)
  iconUrl?: string;
}

class UpdateCatalogDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  name?: string;

  @IsOptional()
  @IsString()
  @Length(1, 50000)
  iconUrl?: string;
}

@Injectable()
class MasterDataService {
  constructor(
    @InjectRepository(CategoryEntity) private readonly categories: Repository<CategoryEntity>,
    @InjectRepository(AmenityEntity) private readonly amenities: Repository<AmenityEntity>,
    @InjectRepository(GymEntity) private readonly gyms: Repository<GymEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
  ) {}
  async listCategories() {
    const rows = await this.categories.find({ where: { isActive: true }, order: { name: 'ASC' } });
    return rows.map((row) => ({ ...row, iconUrl: row.iconUrl || defaultCatalogIcon(row.name, 'category') }));
  }
  async createCategory(d: Partial<CategoryEntity>) {
    const clean = String(d.name ?? '').trim();
    if (!clean) throw new BadRequestException('Category name is required');
    const iconUrl = normalizeIconUrl(d.iconUrl) || defaultCatalogIcon(clean, 'category');
    const existing = await this.categories
      .createQueryBuilder('c')
      .where('LOWER(c.name) = LOWER(:name)', { name: clean })
      .getOne();
    if (existing) {
      await this.categories.update(existing.id, { name: clean, iconUrl: normalizeIconUrl(d.iconUrl) ?? existing.iconUrl ?? iconUrl, isActive: true });
      return this.categories.findOne({ where: { id: existing.id } });
    }
    return this.categories.save(this.categories.create({ ...d, name: clean, iconUrl, isActive: true }));
  }
  async updateCategory(id: string, d: Partial<CategoryEntity>) {
    const existing = await this.categories.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');
    const clean = String(d.name ?? existing.name).trim();
    if (!clean) throw new BadRequestException('Category name is required');
    const duplicate = await this.categories
      .createQueryBuilder('c')
      .where('LOWER(c.name) = LOWER(:name)', { name: clean })
      .andWhere('c.id != :id', { id })
      .getOne();
    if (duplicate) throw new BadRequestException('Category name already exists');
    const oldDefault = defaultCatalogIcon(existing.name, 'category');
    const shouldRefreshDefault = !existing.iconUrl || existing.iconUrl === oldDefault;
    const iconUrl = normalizeIconUrl(d.iconUrl) || (shouldRefreshDefault ? defaultCatalogIcon(clean, 'category') : existing.iconUrl);
    await this.categories.update(id, { name: clean, iconUrl, isActive: true });
    return this.categories.findOne({ where: { id } });
  }
  async listAmenities(includeAll = false) {
    const rows = await this.amenities.find({
      where: includeAll ? {} : { isActive: true, status: 'approved' },
      order: { name: 'ASC' },
    });
    return rows.map((row) => ({ ...row, iconUrl: row.iconUrl || defaultCatalogIcon(row.name, 'amenity') }));
  }
  async createAmenity(d: Partial<AmenityEntity>) {
    const clean = String(d.name ?? '').trim();
    if (!clean) throw new BadRequestException('Amenity name is required');
    const iconUrl = normalizeIconUrl(d.iconUrl) || defaultCatalogIcon(clean, 'amenity');
    const existing = await this.amenities
      .createQueryBuilder('a')
      .where('LOWER(a.name) = LOWER(:name)', { name: clean })
      .getOne();
    if (existing) {
      await this.amenities.update(existing.id, {
        ...d,
        name: clean,
        iconUrl: normalizeIconUrl(d.iconUrl) ?? existing.iconUrl ?? iconUrl,
        status: 'approved',
        isActive: true,
        requestedByGym: false,
        requestedByGymId: null,
        requestedByUserId: null,
      });
      return this.amenities.findOne({ where: { id: existing.id } });
    }
    return this.amenities.save(this.amenities.create({ ...d, name: clean, iconUrl, status: 'approved', isActive: true }));
  }
  async updateAmenity(id: string, d: Partial<AmenityEntity>) {
    const existing = await this.amenities.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Amenity not found');
    const clean = String(d.name ?? existing.name).trim();
    if (!clean) throw new BadRequestException('Amenity name is required');
    const duplicate = await this.amenities
      .createQueryBuilder('a')
      .where('LOWER(a.name) = LOWER(:name)', { name: clean })
      .andWhere('a.id != :id', { id })
      .getOne();
    if (duplicate) throw new BadRequestException('Amenity name already exists');
    const oldDefault = defaultCatalogIcon(existing.name, 'amenity');
    const shouldRefreshDefault = !existing.iconUrl || existing.iconUrl === oldDefault;
    const iconUrl = normalizeIconUrl(d.iconUrl) || (shouldRefreshDefault ? defaultCatalogIcon(clean, 'amenity') : existing.iconUrl);
    await this.amenities.update(id, { name: clean, iconUrl, status: 'approved', isActive: true });
    return this.amenities.findOne({ where: { id } });
  }
  async requestAmenity(name: string, gymId?: string, userId?: string) {
    const clean = name?.trim();
    if (!clean) throw new BadRequestException('Amenity name is required');
    const existing = await this.amenities.findOne({ where: { name: clean } });
    if (existing) return existing;
    return this.amenities.save(this.amenities.create({
      name: clean,
      iconUrl: defaultCatalogIcon(clean, 'amenity'),
      requestedByGym: true,
      requestedByGymId: gymId || null,
      requestedByUserId: userId || null,
      status: 'pending',
      isActive: false,
    }));
  }
  async requestAmenityForUser(name: string, userId?: string) {
    const gym = userId ? await this.gymForActor(userId) : null;
    return this.requestAmenity(name, gym?.id, userId);
  }
  async listAmenityRequestsForUser(userId?: string) {
    if (!userId) return [];
    const gym = await this.gymForActor(userId);
    const where: any[] = [{ requestedByUserId: userId }];
    if (gym?.id) where.push({ requestedByGymId: gym.id });
    return this.amenities.find({ where, order: { name: 'ASC' } });
  }
  private async gymForActor(userId: string) {
    const owned = await this.gyms.findOne({ where: { ownerId: userId } });
    if (owned) return owned;
    const user = await this.users.findOne({ where: { id: userId } });
    return user?.role === 'gym_staff' && user.gymId
      ? this.gyms.findOne({ where: { id: user.gymId } })
      : null;
  }
  approveAmenity(id: string) { return this.amenities.update(id, { status: 'approved', isActive: true }); }
  deleteCategory(id: string) { return this.categories.update(id, { isActive: false } as any); }
  rejectOrDeleteAmenity(id: string) { return this.amenities.update(id, { status: 'rejected', isActive: false } as any); }
}

// ============ Videos ============
@Injectable()
class VideosService {
  constructor(@InjectRepository(WorkoutVideoEntity) private readonly repo: Repository<WorkoutVideoEntity>) {}
  list(category?: string) {
    return this.repo.find({ where: category ? { category } : {}, order: { createdAt: 'DESC' } });
  }
  create(d: Partial<WorkoutVideoEntity>) { return this.repo.save(this.repo.create(d)); }
}

// ============ Analytics ============
@Injectable()
class AnalyticsService {
  constructor(
    @InjectRepository(SubscriptionEntity) private readonly subs: Repository<SubscriptionEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(CheckinEntity) private readonly checkins: Repository<CheckinEntity>,
    @InjectRepository(GymEntity) private readonly gyms: Repository<GymEntity>,
  ) {}

  async summary() {
    const [totalRevenue, activeSubscribers, totalUsers, totalCheckins, totalGyms, pendingKyc] = await Promise.all([
      this.subs.createQueryBuilder('s').select('SUM(s."amountPaid")', 'total').getRawOne().then((r) => Number(r?.total || 0)),
      this.subs.count({ where: { status: 'active' } }),
      this.users.count(),
      this.checkins.count({ where: { status: 'success' } }),
      this.gyms.count(),
      this.gyms.count({ where: { kycStatus: 'in_review' } }),
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newSignups = await this.users
      .createQueryBuilder('u')
      .where('u.createdAt >= :since', { since: thirtyDaysAgo })
      .getCount();

    const avgCheckinsPerDay = totalCheckins > 0 ? Math.round(totalCheckins / 30) : 0;

    const topGyms = await this.checkins
      .createQueryBuilder('c')
      .select('c.gymId', 'gymId')
      .addSelect('COUNT(*)', 'checkins')
      .where('c.status = :st', { st: 'success' })
      .groupBy('c.gymId')
      .orderBy('"checkins"', 'DESC')
      .limit(5)
      .getRawMany();

    const topPlans = await this.subs
      .createQueryBuilder('s')
      .select('s.planType', 'name')
      .addSelect('COUNT(*)', 'subscribers')
      .addSelect('SUM(s."amountPaid")', 'revenue')
      .groupBy('s.planType')
      .orderBy('"subscribers"', 'DESC')
      .getRawMany();

    const monthlyRevenue = await this.subs
      .createQueryBuilder('s')
      .select("TO_CHAR(s.\"createdAt\", 'YYYY-MM')", 'month')
      .addSelect('SUM(s."amountPaid")', 'revenue')
      .groupBy("TO_CHAR(s.\"createdAt\", 'YYYY-MM')")
      .orderBy('month', 'DESC')
      .limit(12)
      .getRawMany();

    return { totalRevenue, activeSubscribers, totalUsers, newSignups, avgCheckinsPerDay, totalGyms, pendingKyc, topGyms, topPlans, monthlyRevenue };
  }
}

// ============ Controllers ============
@ApiTags('Ratings')
@Controller('ratings')
class RatingsController {
  constructor(private readonly svc: RatingsService) {}
  @Post() @UseGuards(JwtAuthGuard)
  submit(@Body() b: any, @Req() req: any) { return this.svc.submit(req.user?.userId || b.userId, b.targetType, b.targetId, b.stars, b.review); }
  @Post('approved') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  submitApproved(@Body() b: any) { return this.svc.submit(b.userId, b.targetType, b.targetId, b.stars, b.review, 'approved'); }
  @Post(':id/approve') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  approve(@Param('id') id: string) { return this.svc.moderate(id, true); }
  @Post(':id/reject') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  reject(@Param('id') id: string) { return this.svc.moderate(id, false); }
  @Get('pending') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  pending() { return this.svc.listPending(); }
  @Get('gym/:gymId') forGym(@Param('gymId') gymId: string) { return this.svc.listForGym(gymId); }
  /** Admin list with optional ?status=pending|approved|rejected filter */
  @Get() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  list(@Query('status') status?: string) { return this.svc.listByStatus(status); }
}

@ApiTags('Coupons')
@Controller('coupons')
class CouponsController {
  constructor(private readonly svc: CouponsService) {}
  @Get() list() { return this.svc.list(); }
  @Post() create(@Body() b: any) { return this.svc.create(b); }
  @Post('validate') validate(@Body() b: any) { return this.svc.validate(b.code, b.amount, b.kind); }
}

@ApiTags('Notifications')
@Controller('notifications')
class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}
  @Get() @UseGuards(JwtAuthGuard)
  list(@Req() req: any, @Query('userId') userIdOverride?: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    const userId = userIdOverride && req.user?.role === 'super_admin' ? userIdOverride : req.user.userId;
    return this.svc.listForUser(userId, +page, +limit);
  }
  @Post('send') send(@Body() b: any) { return this.svc.send(b.userId, b.title, b.body, b.type, b.data); }
  @Post('broadcast') broadcast(@Body() b: any) { return this.svc.broadcast(b.userIds, b.title, b.body); }
  @Post(':id/read') read(@Param('id') id: string) { return this.svc.markRead(id); }
}

@ApiTags('Master Data')
@Controller('master')
class MasterController {
  constructor(private readonly svc: MasterDataService) {}
  @Get('categories') cats() { return this.svc.listCategories(); }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('categories') newCat(@Body() b: CreateCategoryDto) { return this.svc.createCategory(b); }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Put('categories/:id') updateCat(@Param('id') id: string, @Body() b: UpdateCatalogDto) { return this.svc.updateCategory(id, b); }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Delete('categories/:id') delCat(@Param('id') id: string) { return this.svc.deleteCategory(id); }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('amenities/all') allAm() { return this.svc.listAmenities(true); }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gym_owner', 'gym_staff')
  @Get('amenities/my-requests') myAmenityRequests(@Req() req: any) { return this.svc.listAmenityRequestsForUser(req.user?.userId); }
  @Get('amenities') am() { return this.svc.listAmenities(false); }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('amenities') newAm(@Body() b: any) { return this.svc.createAmenity(b); }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Put('amenities/:id') updateAm(@Param('id') id: string, @Body() b: UpdateCatalogDto) { return this.svc.updateAmenity(id, b); }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gym_owner', 'gym_staff')
  @Post('amenities/request') req(@Body() b: { name: string }, @Req() req: any) { return this.svc.requestAmenityForUser(b.name, req.user?.userId); }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('amenities/:id/approve') ap(@Param('id') id: string) { return this.svc.approveAmenity(id); }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Delete('amenities/:id') delAm(@Param('id') id: string) { return this.svc.rejectOrDeleteAmenity(id); }
}

@ApiTags('Videos')
@Controller('videos')
class VideosController {
  constructor(private readonly svc: VideosService) {}
  @Get() list(@Query('category') c?: string) { return this.svc.list(c); }
  @Post() create(@Body() b: any) { return this.svc.create(b); }
}

@ApiTags('Analytics')
@Controller('analytics')
class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}
  @Get('summary') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  summary() { return this.svc.summary(); }
}

// ============ Fraud Detection ============
const SEED_ALERTS = [
  { userId: 'seed-user-001', eventType: 'velocity_check', gymId: 'seed-gym-001', gymName: 'PowerFit Andheri', riskScore: 85, device: 'iPhone 14', details: 'Checked in 4 times within 1 hour', status: 'open' },
  { userId: 'seed-user-002', eventType: 'duplicate_qr', gymId: 'seed-gym-002', gymName: 'FitZone Bandra', riskScore: 92, device: 'Samsung S23', details: 'QR code reused within 60s', status: 'open' },
  { userId: 'seed-user-003', eventType: 'device_mismatch', gymId: 'seed-gym-001', gymName: 'PowerFit Andheri', riskScore: 70, device: 'Pixel 7', details: 'Device fingerprint changed between sessions', status: 'investigating' },
  { userId: 'seed-user-004', eventType: 'velocity_check', gymId: 'seed-gym-003', gymName: 'Iron House Juhu', riskScore: 78, device: 'OnePlus 11', details: 'Checked in 3 times within 45 minutes', status: 'cleared' },
];

@Injectable()
export class FraudService {
  constructor(@InjectRepository(FraudAlertEntity) private readonly repo: Repository<FraudAlertEntity>) {}

  async list(page: any = 1, limit: any = 20, status?: string) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const qb = this.repo.createQueryBuilder('f').orderBy('f.createdAt', 'DESC').skip(skip).take(take);
    if (status) qb.andWhere('f.status = :status', { status });
    const [data, total] = await qb.getManyAndCount();
    return paginatedResponse(data, total, p, l);
  }

  create(data: Partial<FraudAlertEntity>) {
    return this.repo.save(this.repo.create(data));
  }

  async flag(id: string) {
    const alert = await this.repo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('Alert not found');
    await this.repo.update(id, { status: 'investigating' });
    return this.repo.findOne({ where: { id } });
  }

  async clear(id: string) {
    const alert = await this.repo.findOne({ where: { id } });
    if (!alert) throw new NotFoundException('Alert not found');
    await this.repo.update(id, { status: 'cleared' });
    return this.repo.findOne({ where: { id } });
  }
}

@ApiTags('Fraud')
@Controller('fraud')
class FraudController {
  constructor(private readonly svc: FraudService) {}

  @Get('alerts') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  list(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: string) {
    return this.svc.list(+page, +limit, status);
  }

  @Post('alerts') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  create(@Body() body: any) { return this.svc.create(body); }

  @Post('alerts/:id/flag') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  flag(@Param('id') id: string) { return this.svc.flag(id); }

  @Post('alerts/:id/clear') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  clear(@Param('id') id: string) { return this.svc.clear(id); }
}

// ============ Homepage Config ============
const HOMEPAGE_CONFIG_KEY = 'homepage_config';

const DEFAULT_HOMEPAGE_CONFIG = {
  _version: 2,
  sections: [
    {
      id: 'hero', type: 'hero', title: 'Hero Banner', visible: true, order: 0,
      slides: [
        {
          imageUrl: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=900&q=80',
          headline: 'Make Every Rep', headlineAccent: 'Count.',
          sub: 'Book day passes at 50+ gyms in Bhubaneswar. No commitment.',
          cta: 'Explore Gyms', ctaRoute: '/gyms',
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=900&q=80',
          headline: 'One Pass,', headlineAccent: 'Every Gym.',
          sub: 'The Multi-Gym plan gets you into any partner gym — anytime.',
          cta: 'View Plans', ctaRoute: '/plans',
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?w=900&q=80',
          headline: 'Cardio. Strength.', headlineAccent: 'Yoga. All of it.',
          sub: 'Filter by workout type and book the perfect session.',
          cta: 'Find a Gym', ctaRoute: '/gyms?category=all',
        },
        {
          imageUrl: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=900&q=80',
          headline: 'Spa &', headlineAccent: 'Recovery.',
          sub: 'Premium wellness services — massage, physio, and more.',
          cta: 'Explore Wellness', ctaRoute: '/wellness',
        },
      ],
    },
    { id: 'categories', type: 'categories', title: 'Browse by Category', visible: true, order: 1 },
    { id: 'featured_gyms', type: 'featured_gyms', title: 'Featured Gyms', visible: true, order: 2, featuredGymIds: [], gymLimit: 6 },
    { id: 'products', type: 'products', title: 'Shop Fitness Store', visible: true, order: 3, productCategory: null, featuredProductIds: [], productLimit: 5 },
  ],
};

@ApiTags('Homepage')
@Controller('homepage')
class HomepageController {
  constructor(
    @InjectRepository(AppConfigEntity) private readonly configRepo: Repository<AppConfigEntity>,
    @InjectRepository(GymEntity) private readonly gymRepo: Repository<GymEntity>,
    @InjectRepository(RatingEntity) private readonly ratingsRepo: Repository<RatingEntity>,
    @InjectRepository(ProductEntity) private readonly productRepo: Repository<ProductEntity>,
  ) {}

  private async loadConfig(): Promise<any> {
    const row = await this.configRepo.findOne({ where: { key: HOMEPAGE_CONFIG_KEY } });
    const value = row?.value as any;
    if (!value?._version || !Array.isArray(value.sections) || value.sections.length === 0) {
      return DEFAULT_HOMEPAGE_CONFIG;
    }
    return value;
  }

  private async withLiveGymRatings(gyms: GymEntity[]) {
    if (!gyms.length) return gyms;
    const ids = gyms.map((gym) => gym.id).filter(Boolean);
    const rows = ids.length ? await this.ratingsRepo
      .createQueryBuilder('r')
      .select('r."gymId"', 'gymId')
      .addSelect('AVG(r.stars)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r."gymId" IN (:...ids)', { ids })
      .andWhere('r.status = :status', { status: 'approved' })
      .groupBy('r."gymId"')
      .getRawMany() : [];
    const byGym = new Map(rows.map((row: any) => [row.gymId, row]));
    return gyms.map((gym) => {
      const {
        ownerId: _ownerId,
        commissionRate: _commissionRate,
        ratePerDay: _ratePerDay,
        kycDocuments: _kycDocuments,
        kycReviewNote: _kycReviewNote,
        kycStatus: _kycStatus,
        ...publicGym
      } = gym as any;
      const aggregate = byGym.get(gym.id);
      const ratingCount = Number(aggregate?.count || 0);
      const rating = ratingCount > 0 ? Math.round(Number(aggregate?.avg || 0) * 10) / 10 : 0;
      const photos = Array.isArray(gym.photos) ? gym.photos.filter(Boolean) : [];
      const coverPhoto = gym.coverPhoto || photos[0] || null;
      return {
        ...publicGym,
        rating,
        ratingCount,
        ratingsCount: ratingCount,
        reviewCount: ratingCount,
        coverPhoto,
        coverImage: coverPhoto,
        photos,
        images: photos.length > 0 ? photos : (coverPhoto ? [coverPhoto] : []),
      };
    });
  }

  private publicGymQuery() {
    return this.gymRepo.createQueryBuilder('g')
      .where('g.status = :status', { status: 'active' })
      .andWhere('g."kycStatus" = :kycStatus', { kycStatus: 'approved' })
      .andWhere('g.lat IS NOT NULL AND g.lng IS NOT NULL')
      .andWhere('NOT (g.lat = 0 AND g.lng = 0)');
  }

  private async loadPublicGyms(limit: number, featuredGymIds?: string[]) {
    const ids = (featuredGymIds || []).filter(Boolean);
    if (featuredGymIds && ids.length === 0) return [];
    const qb = this.publicGymQuery();
    if (ids.length > 0) {
      qb.andWhere('g.id IN (:...ids)', { ids });
    } else {
      qb.orderBy('g.updatedAt', 'DESC').take(limit);
    }
    const gyms = await qb.getMany();
    const ordered = ids.length > 0
      ? [...gyms].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
      : gyms;
    return this.withLiveGymRatings(ordered);
  }

  @Get('config')
  async getConfig() {
    const config = await this.loadConfig();
    const resolved = JSON.parse(JSON.stringify(config));

    const sections: any[] = (resolved.sections || []).sort((a: any, b: any) => a.order - b.order);

    for (const section of sections) {
      if (!section.visible) continue;

      if (section.type === 'featured_gyms') {
        if (section.featuredGymIds?.length > 0) {
          section.gyms = await this.loadPublicGyms(section.gymLimit || 6, section.featuredGymIds);
        } else {
          section.gyms = await this.loadPublicGyms(section.gymLimit || 6);
        }
      }

      if (section.type === 'products') {
        if (section.featuredProductIds?.length > 0) {
          section.products = await this.productRepo.find({ where: { id: In(section.featuredProductIds) } });
        } else {
          const where: any = { isActive: true };
          if (section.productCategory) where.category = section.productCategory;
          section.products = await this.productRepo.find({ where, take: section.productLimit || 5 });
        }
      }
    }

    resolved.sections = sections;
    return resolved;
  }

  @Put('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async saveConfig(@Body() body: any) {
    const value = {
      _version: body?._version || DEFAULT_HOMEPAGE_CONFIG._version,
      sections: Array.isArray(body?.sections) && body.sections.length
        ? body.sections
        : DEFAULT_HOMEPAGE_CONFIG.sections,
    };
    await this.configRepo.save({ key: HOMEPAGE_CONFIG_KEY, value });
    return value;
  }
}

// ============ Admin Settings ============
const ADMIN_SETTINGS_KEY = 'admin_settings';

const DEFAULT_ADMIN_SETTINGS = {
  branding: { logoUrl: '', logoText: 'BookMyFit.in', shortText: 'BookMyFit' },
  settlements: { cycle: 'Monthly', minPayout: 5000, processingWindow: 7 },
  flags: { storeModule: true, wellnessBooking: true, aiRecommendations: false, corporatePortal: true, mapView: false },
};

// ============ Mobile Launch Content ============
const MOBILE_LAUNCH_CONFIG_KEY = 'mobile_launch_config';

const DEFAULT_MOBILE_LAUNCH_CONFIG = {
  _version: 1,
  splash: {
    minDurationMs: 1400,
    logoUrl: '',
    imageUrl: '',
    title: 'BookMyFit',
    subtitle: 'Opening BookMyFit...',
    backgroundColor: '#060606',
    showSpinner: true,
  },
  onboarding: {
    kicker: 'BOOKMYFIT',
    slides: [
      {
        id: 'train-anywhere',
        imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
        title: 'Train Anywhere',
        description: 'One subscription. Access gyms across your city.',
        aurora: ['rgba(120,40,200,0.45)', 'rgba(255,120,40,0.25)'],
      },
      {
        id: 'qr-check-in',
        imageUrl: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800&q=80',
        title: 'QR Check-In',
        description: 'Book a slot and get a secure QR code for the gym desk.',
        aurora: ['rgba(0,140,255,0.35)', 'rgba(120,40,200,0.30)'],
      },
      {
        id: 'track-progress',
        imageUrl: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?w=800&q=80',
        title: 'Track Progress',
        description: 'See your visits, memberships, trainer add-ons, and bookings.',
        aurora: ['rgba(0,212,106,0.20)', 'rgba(0,140,255,0.30)'],
      },
    ],
  },
};

function cleanConfigText(value: any, fallback: string, maxLength = 200) {
  const clean = String(value ?? '').trim();
  return (clean || fallback).slice(0, maxLength);
}

function cleanOptionalText(value: any, maxLength = 1000) {
  const clean = String(value ?? '').trim();
  return clean.slice(0, maxLength);
}

function clampNumber(value: any, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function normalizeLaunchSlide(slide: any, index: number) {
  const fallback = DEFAULT_MOBILE_LAUNCH_CONFIG.onboarding.slides[index % DEFAULT_MOBILE_LAUNCH_CONFIG.onboarding.slides.length];
  const description = cleanConfigText(slide?.description ?? slide?.subtitle, fallback.description, 260);
  const aurora = Array.isArray(slide?.aurora) && slide.aurora.length >= 2
    ? [cleanConfigText(slide.aurora[0], fallback.aurora[0], 80), cleanConfigText(slide.aurora[1], fallback.aurora[1], 80)]
    : fallback.aurora;
  return {
    id: cleanConfigText(slide?.id, fallback.id || `slide-${index + 1}`, 80),
    imageUrl: cleanOptionalText(slide?.imageUrl || slide?.image, 1000) || fallback.imageUrl,
    title: cleanConfigText(slide?.title, fallback.title, 80),
    description,
    subtitle: description,
    kicker: cleanOptionalText(slide?.kicker, 40),
    aurora,
    order: index,
  };
}

function normalizeMobileLaunchConfig(value: any) {
  const rawSlides = Array.isArray(value?.onboarding?.slides) ? value.onboarding.slides : [];
  const sourceSlides = rawSlides.length ? rawSlides : DEFAULT_MOBILE_LAUNCH_CONFIG.onboarding.slides;
  const slides = sourceSlides.map((slide: any, index: number) => normalizeLaunchSlide(slide, index));
  while (slides.length < 3) {
    slides.push(normalizeLaunchSlide(DEFAULT_MOBILE_LAUNCH_CONFIG.onboarding.slides[slides.length], slides.length));
  }

  return {
    _version: 1,
    splash: {
      minDurationMs: clampNumber(value?.splash?.minDurationMs ?? value?.splash?.durationMs, DEFAULT_MOBILE_LAUNCH_CONFIG.splash.minDurationMs, 500, 10000),
      logoUrl: cleanOptionalText(value?.splash?.logoUrl, 1000),
      imageUrl: cleanOptionalText(value?.splash?.imageUrl ?? value?.splash?.backgroundImageUrl, 1000),
      title: cleanConfigText(value?.splash?.title, DEFAULT_MOBILE_LAUNCH_CONFIG.splash.title, 80),
      subtitle: cleanConfigText(value?.splash?.subtitle ?? value?.splash?.message, DEFAULT_MOBILE_LAUNCH_CONFIG.splash.subtitle, 180),
      backgroundColor: cleanConfigText(value?.splash?.backgroundColor, DEFAULT_MOBILE_LAUNCH_CONFIG.splash.backgroundColor, 24),
      showSpinner: value?.splash?.showSpinner !== false,
    },
    onboarding: {
      kicker: cleanConfigText(value?.onboarding?.kicker, DEFAULT_MOBILE_LAUNCH_CONFIG.onboarding.kicker, 40),
      slides,
    },
    updatedAt: value?.updatedAt || null,
  };
}

function assertMobileLaunchConfig(body: any) {
  const splash = body?.splash || {};
  if (!String(splash.title || '').trim()) throw new BadRequestException('Splash title is required');
  if (!String(splash.subtitle || splash.message || '').trim()) throw new BadRequestException('Splash subtitle is required');
  const slides = Array.isArray(body?.onboarding?.slides) ? body.onboarding.slides : [];
  if (slides.length < 3) throw new BadRequestException('At least 3 onboarding pages are required');
  slides.forEach((slide: any, index: number) => {
    if (!String(slide?.title || '').trim()) throw new BadRequestException(`Onboarding page ${index + 1} title is required`);
    if (!String(slide?.description || slide?.subtitle || '').trim()) throw new BadRequestException(`Onboarding page ${index + 1} description is required`);
  });
}

@Injectable()
class MobileLaunchConfigService {
  constructor(@InjectRepository(AppConfigEntity) private readonly configRepo: Repository<AppConfigEntity>) {}

  private async loadStoredConfig() {
    const row = await this.configRepo.findOne({ where: { key: MOBILE_LAUNCH_CONFIG_KEY } });
    return normalizeMobileLaunchConfig(row?.value);
  }

  private async loadBranding() {
    const row = await this.configRepo.findOne({ where: { key: ADMIN_SETTINGS_KEY } });
    const branding = { ...DEFAULT_ADMIN_SETTINGS.branding, ...(row?.value?.branding || {}) };
    return {
      logoUrl: String(branding.logoUrl || '/api/v1/branding/logo').trim(),
      logoText: String(branding.logoText || 'BookMyFit.in').trim(),
      shortText: String(branding.shortText || branding.logoText || 'BookMyFit').trim(),
    };
  }

  async getPublicConfig() {
    const [config, branding] = await Promise.all([this.loadStoredConfig(), this.loadBranding()]);
    return { ...config, branding };
  }

  async getAdminConfig() {
    return this.loadStoredConfig();
  }

  async saveAdminConfig(body: any) {
    assertMobileLaunchConfig(body);
    const value = normalizeMobileLaunchConfig({ ...body, updatedAt: new Date().toISOString() });
    await this.configRepo.save({ key: MOBILE_LAUNCH_CONFIG_KEY, value });
    return value;
  }
}

@ApiTags('Mobile Launch Content')
@Controller('mobile/launch-config')
class MobileLaunchConfigController {
  constructor(private readonly svc: MobileLaunchConfigService) {}

  @Get()
  getConfig() {
    return this.svc.getPublicConfig();
  }
}

@ApiTags('Admin Mobile Launch Content')
@Controller('admin/mobile-launch-config')
class AdminMobileLaunchConfigController {
  constructor(private readonly svc: MobileLaunchConfigService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  getConfig() {
    return this.svc.getAdminConfig();
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  saveConfig(@Body() body: any) {
    return this.svc.saveAdminConfig(body);
  }
}

@ApiTags('Admin Settings')
@Controller('admin/settings')
class AdminSettingsController {
  constructor(@InjectRepository(AppConfigEntity) private readonly configRepo: Repository<AppConfigEntity>) {}

  private async loadPlanManagement() {
    const row = await this.configRepo.findOne({ where: { key: PLATFORM_PRICING_CONFIG_KEY } });
    return platformPricingResponse(row?.value);
  }

  private mergeSettings(value: any, planManagement: any) {
    return {
      branding: { ...DEFAULT_ADMIN_SETTINGS.branding, ...(value?.branding || {}) },
      settlements: { ...DEFAULT_ADMIN_SETTINGS.settlements, ...(value?.settlements || {}) },
      flags: { ...DEFAULT_ADMIN_SETTINGS.flags, ...(value?.flags || {}) },
      revenueControls: {
        source: 'plan_management',
        globalCommission: planManagement.globalCommission,
        services: {
          day_pass: planManagement.day_pass?.commission,
          same_gym: planManagement.same_gym?.commission,
          wellness: planManagement.wellness?.commission,
          personal_training: planManagement.personal_training?.commission,
        },
      },
      planManagement,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async getSettings() {
    const [row, planManagement] = await Promise.all([
      this.configRepo.findOne({ where: { key: ADMIN_SETTINGS_KEY } }),
      this.loadPlanManagement(),
    ]);
    return this.mergeSettings(row?.value, planManagement);
  }

  @Put()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async saveSettings(@Body() body: any) {
    const planManagement = await this.loadPlanManagement();
    const value = this.mergeSettings(body, planManagement);
    const persisted = {
      branding: value.branding,
      settlements: value.settlements,
      flags: value.flags,
    };
    await this.configRepo.save({ key: ADMIN_SETTINGS_KEY, value: persisted });
    return value;
  }
}

@ApiTags('Branding')
@Controller('branding')
class BrandingController {
  constructor(@InjectRepository(AppConfigEntity) private readonly configRepo: Repository<AppConfigEntity>) {}
  private readonly defaultLogoVersion = 'brand-crop-1';

  private requestOrigin(req: any) {
    const forwardedProto = String(req?.headers?.['x-forwarded-proto'] || '').split(',')[0].trim();
    const proto = forwardedProto || req?.protocol || 'http';
    const forwardedHost = String(req?.headers?.['x-forwarded-host'] || '').split(',')[0].trim();
    const host = forwardedHost || req?.headers?.host || '';
    return host ? `${proto}://${host}` : '';
  }

  private resolveLogoUrl(logoUrl: string, req: any) {
    const origin = this.requestOrigin(req);
    const clean = String(logoUrl || '').trim();
    const withLogoVersion = (url: string) => url.includes('?') ? `${url}&v=${this.defaultLogoVersion}` : `${url}?v=${this.defaultLogoVersion}`;
    const isDefaultLogo = (url: string) => /\/api\/v1\/branding\/logo\/?$/i.test(url.split('?')[0]);
    if (!clean) return withLogoVersion(origin ? `${origin}/api/v1/branding/logo` : '/api/v1/branding/logo');
    if (/^https?:\/\//i.test(clean)) return isDefaultLogo(clean) ? withLogoVersion(clean) : clean;
    if (clean.startsWith('/')) {
      const path = origin ? `${origin}${clean}` : clean;
      return isDefaultLogo(path) ? withLogoVersion(path) : path;
    }
    return clean;
  }

  @Get()
  async getBranding(@Req() req: any) {
    const row = await this.configRepo.findOne({ where: { key: ADMIN_SETTINGS_KEY } });
    const branding = { ...DEFAULT_ADMIN_SETTINGS.branding, ...(row?.value?.branding || {}) };
    return {
      logoUrl: this.resolveLogoUrl(branding.logoUrl, req),
      logoText: String(branding.logoText || 'BookMyFit.in').trim(),
      shortText: String(branding.shortText || branding.logoText || 'BookMyFit').trim(),
    };
  }

  @Get('logo')
  logo(@Res() res: Response) {
    const logoPath = [
      resolve(process.cwd(), '../logo-brand.png'),
      resolve(process.cwd(), 'logo-brand.png'),
      resolve(process.cwd(), '../logo-full.png'),
      resolve(process.cwd(), 'logo-full.png'),
    ].find((candidate) => existsSync(candidate));
    if (!logoPath) throw new NotFoundException('Default logo not found');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(logoPath);
  }
}

@ApiTags('Commission')
@Controller('commission')
class CommissionController {
  constructor(@InjectRepository(AppConfigEntity) private readonly configRepo: Repository<AppConfigEntity>) {}

  private async loadPlanManagement() {
    const row = await this.configRepo.findOne({ where: { key: PLATFORM_PRICING_CONFIG_KEY } });
    return platformPricingResponse(row?.value);
  }

  @Get('rates') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  async getRates() {
    const pricing = await this.loadPlanManagement();
    return [
      { id: 'global', planType: 'Global Checkout Add-on', source: 'plan_management', commission: pricing.globalCommission },
      { id: 'day_pass', planType: '1-Day Pass Checkout', source: 'plan_management', basePrice: pricing.day_pass?.basePrice, commission: pricing.day_pass?.commission, commissionSetting: pricing.day_pass?.commissionSetting },
      { id: 'same_gym', planType: 'Same Gym Checkout', source: 'plan_management', commission: pricing.same_gym?.commission, commissionSetting: pricing.same_gym?.commissionSetting },
      { id: 'wellness', planType: 'Wellness Checkout', source: 'plan_management', commission: pricing.wellness?.commission, commissionSetting: pricing.wellness?.commissionSetting },
      { id: 'personal_training', planType: 'Personal Training Checkout', source: 'plan_management', commission: pricing.personal_training?.commission, commissionSetting: pricing.personal_training?.commissionSetting },
      { id: 'multi_gym', planType: 'Multi Gym Pass', source: 'plan_management', basePrice: pricing.multi_gym?.basePrice, commission: null, commissionSetting: null },
    ];
  }

  @Put('rates/:id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  updateRate(@Param('id') id: string) {
    throw new BadRequestException(`Commission rate ${id} is managed from Plan Management. Use /subscriptions/multigym-config.`);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([
    RatingEntity, CouponEntity, NotificationEntity, CategoryEntity, AmenityEntity, WorkoutVideoEntity,
    CheckinEntity, UserEntity, SubscriptionEntity, GymEntity, TrainerEntity, WellnessPartnerEntity, FraudAlertEntity,
    AppConfigEntity, ProductEntity,
  ])],
  controllers: [RatingsController, CouponsController, NotificationsController, MasterController, VideosController, AnalyticsController, FraudController, CommissionController, HomepageController, MobileLaunchConfigController, AdminMobileLaunchConfigController, AdminSettingsController, BrandingController],
  providers: [RatingsService, CouponsService, NotificationsService, MasterDataService, VideosService, AnalyticsService, FraudService, MobileLaunchConfigService],
  exports: [RatingsService, CouponsService, NotificationsService, MasterDataService, VideosService, FraudService],
})
export class MiscModule {}
