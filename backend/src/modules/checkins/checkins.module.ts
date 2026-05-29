import { Module, Controller, Get, Post, Body, Query, Req, Injectable, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags } from '@nestjs/swagger';
import { CheckinEntity } from '../../database/entities/checkin.entity';
import { GymEntity } from '../../database/entities/gym.entity';
import { SubscriptionEntity } from '../../database/entities/subscription.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AppConfigEntity } from '../../database/entities/app-config.entity';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { CapacityGateway } from './capacity.gateway';
import { PLATFORM_PRICING_CONFIG_KEY, normalizePlatformPricingConfig } from '../../common/commission-config';

@Injectable()
class CheckinsService {
  constructor(
    @InjectRepository(CheckinEntity) private readonly repo: Repository<CheckinEntity>,
    @InjectRepository(GymEntity) private readonly gyms: Repository<GymEntity>,
    @InjectRepository(SubscriptionEntity) private readonly subs: Repository<SubscriptionEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(AppConfigEntity) private readonly configs: Repository<AppConfigEntity>,
    private readonly capacityGateway: CapacityGateway,
  ) {}

  private visitSplit(ratePerDay: number, planType?: string | null) {
    const gymEarns = planType === 'multi_gym' ? Math.max(0, Number(ratePerDay) || 0) : 0;
    return { gymEarns, adminEarns: 0 };
  }

  private async enrichWithAmounts(rows: CheckinEntity[], gymId?: string) {
    if (rows.length === 0) return rows;
    const subIds = [...new Set(rows.map((row) => row.subscriptionId).filter(Boolean))];
    const gymIds = [...new Set(rows.map((row) => row.gymId).filter(Boolean))];
    const [subs, gyms, configRow] = await Promise.all([
      subIds.length ? this.subs.find({ where: { id: In(subIds) } }) : [],
      gymIds.length ? this.gyms.find({ where: { id: In(gymIds) } }) : [],
      this.configs.findOne({ where: { key: PLATFORM_PRICING_CONFIG_KEY } }),
    ]);
    const globalVisitPayout = Number(normalizePlatformPricingConfig(configRow?.value).multi_gym?.visitPayout || 0);
    const subMap = new Map<string, SubscriptionEntity>(subs.map((sub): [string, SubscriptionEntity] => [sub.id, sub]));
    const gymMap = new Map<string, GymEntity>(gyms.map((gym): [string, GymEntity] => [gym.id, gym]));
    return rows.map((row) => {
      const sub = subMap.get(row.subscriptionId);
      const gym = gymMap.get(gymId || row.gymId);
      const override = Number((gym as any)?.ratePerDay);
      const ratePerDay = Number.isFinite(override) && override > 0 ? override : globalVisitPayout;
      const { gymEarns, adminEarns } = this.visitSplit(ratePerDay, sub?.planType);
      return {
        ...row,
        planType: sub?.planType || null,
        ratePerDay,
        gymEarns: row.status === 'success' ? gymEarns : 0,
        adminEarns: row.status === 'success' ? adminEarns : 0,
      };
    });
  }

  async listByGym(gymId: string, page: any = 1, limit: any = 20) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.repo.findAndCount({ where: { gymId, status: 'success' }, order: { checkinTime: 'DESC' }, skip, take });
    return paginatedResponse(await this.enrichWithAmounts(data, gymId), total, p, l);
  }
  async listAll(page: any = 1, limit: any = 20) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.repo.findAndCount({ order: { checkinTime: 'DESC' }, skip, take });
    return paginatedResponse(data, total, p, l);
  }
  async listByUser(userId: string, page: any = 1, limit: any = 20) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.repo.findAndCount({ where: { userId }, order: { checkinTime: 'DESC' }, skip, take });
    return paginatedResponse(data, total, p, l);
  }
  async todayStats(gymId?: string, userId?: string) {
    let resolvedGymId = gymId;
    if (!resolvedGymId && userId) {
      const gym = await this.gymForActor(userId);
      resolvedGymId = gym?.id;
    }
    if (!resolvedGymId) return { count: 0, checkins: [] };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkins = await this.repo.find({
      where: { gymId: resolvedGymId, status: 'success', checkinTime: Between(today, tomorrow) },
      order: { checkinTime: 'DESC' },
    });
    const gym = await this.gyms.findOne({ where: { id: resolvedGymId } });
    this.capacityGateway.broadcastCapacity(resolvedGymId, checkins.length, (gym as any)?.capacity || 100);
    return { count: checkins.length, checkins: await this.enrichWithAmounts(checkins, resolvedGymId) };
  }
  async statsForGym(gymId: string, month?: string) {
    const normalizedMonth = month || new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(normalizedMonth)) {
      throw new BadRequestException('month must be in YYYY-MM format');
    }
    const [year, m] = normalizedMonth.split('-').map(Number);
    if (!Number.isInteger(year) || !Number.isInteger(m) || m < 1 || m > 12) {
      throw new BadRequestException('month must be in YYYY-MM format');
    }
    const from = new Date(year, m - 1, 1);
    const to = new Date(year, m, 1);
    const count = await this.repo.count({
      where: { gymId, status: 'success', checkinTime: Between(from, to) },
    });
    return { gymId, month: normalizedMonth, checkinCount: count };
  }

  async gymIdForScanner(user: any, requestedGymId?: string) {
    if (user?.role === 'super_admin') {
      if (!requestedGymId) throw new BadRequestException('gymId is required');
      return requestedGymId;
    }
    const gym = user?.role === 'gym_staff'
      ? await this.gymForActor(user?.userId)
      : await this.gyms.findOne({ where: { ownerId: user?.userId } });
    if (!gym) throw new ForbiddenException('This account is not linked to a gym profile');
    if (requestedGymId && requestedGymId !== gym.id) throw new ForbiddenException('This account is linked to another gym');
    return gym.id;
  }

  private async gymForActor(actorId?: string) {
    if (!actorId) return null;
    const owned = await this.gyms.findOne({ where: { ownerId: actorId } });
    if (owned) return owned;
    const user = await this.users.findOne({ where: { id: actorId } });
    return user?.role === 'gym_staff' && user.gymId
      ? this.gyms.findOne({ where: { id: user.gymId } })
      : null;
  }

  /**
   * Core scan logic — enforces the BMF business rules:
   * - Multi-gym plans (pro/max/elite): 1 session per day per gym; gym gets paid per visit-day
   * - Individual plans: must belong to this specific gym; unlimited by policy (gym sets its own rules)
   */
  async scan(userId: string, gymId: string, qrToken?: string) {
    // Basic UUID format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!userId || !gymId || !uuidRegex.test(gymId) || !uuidRegex.test(userId)) {
      return { allowed: false, reason: 'Invalid gym or user ID', status: 'failed_invalid' };
    }
    const gym = await this.gyms.findOne({ where: { id: gymId, status: 'active' } });
    if (!gym) return { allowed: false, reason: 'Gym not found or inactive', status: 'failed_invalid' };

    // Find active subscription for this user
    const now = new Date();
    const activeSub = await this.subs
      .createQueryBuilder('s')
      .where('s.userId = :userId', { userId })
      .andWhere('s.status = :status', { status: 'active' })
      .andWhere('s.startDate <= :now', { now: now.toISOString().slice(0, 10) })
      .andWhere('s.endDate >= :now', { now: now.toISOString().slice(0, 10) })
      .orderBy('s.createdAt', 'DESC')
      .getOne();

    if (!activeSub) return { allowed: false, reason: 'No active subscription', status: 'failed_expired' };

    const planType = activeSub.planType;
    const isSameGym = planType === 'same_gym';
    const isMultiGym = planType === 'multi_gym';
    // Same-gym plan: user must be at their registered gym
    if (isSameGym) {
      if (!activeSub.gymIds?.includes(gymId)) {
        return { allowed: false, reason: 'This gym is not included in your Same Gym plan', status: 'failed_invalid' };
      }
    }

    // Enforce 1 check-in per day per gym for multi-gym plan
    if (isMultiGym) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const todayCheckin = await this.repo.findOne({
        where: { userId, gymId, status: 'success', checkinTime: Between(todayStart, todayEnd) },
      });
      if (todayCheckin) {
        return { allowed: false, reason: 'Already checked in at this gym today (1 session per gym per day)', status: 'failed_daily_limit' };
      }
    }

    const token = qrToken || `QR_${userId}_${gymId}_${Date.now()}`;
    const checkin = await this.repo.save(this.repo.create({
      userId, gymId, subscriptionId: activeSub.id,
      qrToken: token, status: 'success',
    }));

    // Broadcast live capacity
    const todayStart2 = new Date(); todayStart2.setHours(0, 0, 0, 0);
    const todayEnd2 = new Date(); todayEnd2.setHours(23, 59, 59, 999);
    const todayCount = await this.repo.count({ where: { gymId, status: 'success', checkinTime: Between(todayStart2, todayEnd2) } });
    this.capacityGateway.broadcastCapacity(gymId, todayCount, (gym as any)?.capacity || 100);

    return {
      allowed: true,
      checkin,
      planType,
      gymName: gym.name,
      message: isSameGym
        ? `Welcome to ${gym.name}! Enjoy your session.`
        : `Welcome to ${gym.name}! Session recorded.`,
    };
  }
}

@ApiTags('Check-ins')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('checkins')
class CheckinsController {
  constructor(private readonly svc: CheckinsService) {}

  @Post('scan') @Roles('gym_owner', 'gym_staff')
  async scan(@Body() body: any, @Req() req: any) {
    if (process.env.ALLOW_LEGACY_CHECKINS_SCAN !== 'true') {
      throw new BadRequestException('Legacy check-in scan is disabled. Use /qr/validate with a signed QR token.');
    }
    if (!body.qrToken) throw new BadRequestException('qrToken is required');
    // userId can come from JWT (mobile app) or body (gym staff scanning)
    const userId = body.userId || req.user?.userId;
    const gymId = await this.svc.gymIdForScanner(req.user, body.gymId);
    return this.svc.scan(userId, gymId, body.qrToken);
  }

  @Get('my-history') @Roles()
  myHistory(@Req() req: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.listByUser(req.user.userId, +page, +limit);
  }

  @Get('today') @Roles('super_admin', 'gym_owner', 'gym_staff')
  async today(@Req() req: any, @Query('gymId') gymId?: string) {
    const resolvedGymId = req.user?.role === 'super_admin' && gymId ? gymId : await this.svc.gymIdForScanner(req.user, gymId);
    return this.svc.todayStats(resolvedGymId, req.user.userId);
  }

  @Get('today-count') @Roles('super_admin', 'gym_owner', 'gym_staff')
  async todayCount(@Req() req: any) {
    const gymId = await this.svc.gymIdForScanner(req.user);
    const stats = await this.svc.todayStats(gymId, req.user.userId);
    return { count: (stats as any)?.count ?? 0 };
  }

  @Get('recent') @Roles('super_admin', 'gym_owner', 'gym_staff')
  async recent(@Req() req: any) {
    if (req.user?.role === 'super_admin') return this.svc.listAll(1, 10);
    const gymId = await this.svc.gymIdForScanner(req.user);
    return this.svc.listByGym(gymId, 1, 10);
  }

  @Get() @Roles('super_admin', 'gym_owner', 'gym_staff')
  async list(@Req() req: any, @Query('gymId') gymId?: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    if (req.user?.role === 'super_admin') {
      return gymId ? this.svc.listByGym(gymId, +page, +limit) : this.svc.listAll(+page, +limit);
    }
    const resolvedGymId = await this.svc.gymIdForScanner(req.user, gymId);
    return this.svc.listByGym(resolvedGymId, +page, +limit);
  }

  @Get('stats') @Roles('super_admin', 'gym_owner', 'gym_staff')
  async stats(@Req() req: any, @Query('gymId') gymId: string, @Query('month') month: string) {
    const resolvedGymId = await this.svc.gymIdForScanner(req.user, gymId);
    return this.svc.statsForGym(resolvedGymId, month);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([CheckinEntity, GymEntity, SubscriptionEntity, UserEntity, AppConfigEntity])],
  controllers: [CheckinsController],
  providers: [CheckinsService, CapacityGateway],
  exports: [CheckinsService, CapacityGateway],
})
export class CheckinsModule {}
