import { Module, Controller, Get, Post, Put, Patch, Param, Body, Query, Injectable, UseGuards, Req, NotFoundException } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, Between, In, Like } from 'typeorm';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags } from '@nestjs/swagger';
import { GymEntity, GymStatus } from '../../database/entities/gym.entity';
import { SubscriptionEntity } from '../../database/entities/subscription.entity';
import { CheckinEntity } from '../../database/entities/checkin.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';

@Injectable()
class GymsService {
  constructor(
    @InjectRepository(GymEntity) private readonly repo: Repository<GymEntity>,
    @InjectRepository(SubscriptionEntity) private readonly subs: Repository<SubscriptionEntity>,
    @InjectRepository(CheckinEntity) private readonly checkins: Repository<CheckinEntity>,
  ) {}

  myGym(ownerId: string) { return this.repo.findOne({ where: { ownerId } }); }

  async myMembers(ownerId: string, opts: { page?: number; limit?: number; search?: string; status?: string } = {}) {
    const gym = await this.repo.findOne({ where: { ownerId } });
    if (!gym) return { data: [], total: 0, page: 1, limit: 20, pages: 0 };
    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const skip = (page - 1) * limit;

    const qb = this.subs
      .createQueryBuilder('s')
      .where(':gymId = ANY(s."gymIds")', { gymId: gym.id })
      .orderBy('s."createdAt"', 'DESC');

    if (opts.status && opts.status !== 'all') {
      qb.andWhere('s.status = :status', { status: opts.status });
    }
    if (opts.search) {
      qb.andWhere('(s."userId" ILIKE :q)', { q: `%${opts.search}%` });
    }

    const [subs, total] = await qb.skip(skip).take(limit).getManyAndCount();

    // Enrich with today's check-in count per user
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const data = subs.map(s => {
      const endDate = s.endDate ? new Date(s.endDate) : null;
      const isExpired = endDate ? endDate < new Date() : false;
      const gymCount = (s.gymIds || []).length;
      return {
        id: s.id,
        userId: s.userId,
        name: (s as any).userName || `User-${s.userId.slice(0, 6)}`,
        phone: (s as any).userPhone || '—',
        planType: s.planType,
        gymType: gymCount <= 1 ? 'Single Gym' : 'Multi Gym',
        gymCount,
        status: isExpired ? 'expired' : s.status,
        subscriptionStatus: s.status,
        startDate: s.startDate,
        endDate: s.endDate,
        amountPaid: s.amountPaid,
        createdAt: s.createdAt,
      };
    });

    return { data, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async deactivateMember(ownerId: string, subId: string) {
    const gym = await this.repo.findOne({ where: { ownerId } });
    if (!gym) throw new NotFoundException('Gym not found');
    const sub = await this.subs.findOne({ where: { id: subId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (!(sub.gymIds || []).includes(gym.id)) throw new NotFoundException('Member not in this gym');
    await this.subs.update(subId, { status: 'cancelled' as any });
    return { success: true, message: 'Member subscription deactivated' };
  }

  async myCheckins(ownerId: string, page: any = 1, limit: any = 20) {
    const gym = await this.repo.findOne({ where: { ownerId } });
    if (!gym) return { data: [], total: 0, page: 1, limit: 20, pages: 0 };
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.checkins.findAndCount({
      where: { gymId: gym.id },
      order: { checkinTime: 'DESC' },
      skip, take,
    });
    const ratePerDay = Number((gym as any).ratePerDay ?? 50);
    const commissionRate = Number(gym.commissionRate ?? 15) / 100;
    const gymShare = ratePerDay * (1 - commissionRate);
    const adminShare = ratePerDay * commissionRate;
    const enriched = data.map(c => ({
      ...c,
      ratePerDay,
      gymEarns: c.status === 'success' ? gymShare : 0,
      adminEarns: c.status === 'success' ? adminShare : 0,
    }));
    return { data: enriched, total, page: p, limit: l, pages: Math.ceil(total / l), gym: { name: gym.name, ratePerDay, commissionRate: gym.commissionRate } };
  }

  async myTodayStats(ownerId: string) {
    const gym = await this.repo.findOne({ where: { ownerId } });
    if (!gym) return { count: 0, recent: [] };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const recent = await this.checkins.find({
      where: { gymId: gym.id, status: 'success', checkinTime: Between(today, tomorrow) },
      order: { checkinTime: 'DESC' },
      take: 10,
    });
    return { count: recent.length, recent };
  }

  async list(filter: { city?: string; status?: string; search?: string; tier?: string } = {}, page: any = 1, limit: any = 20) {
    const where: any = {};
    if (filter.city) where.city = filter.city;
    if (filter.status) where.status = filter.status;
    if (filter.search) where.name = ILike(`%${filter.search}%`);
    if (filter.tier) {
      // Map mobile display names to DB enum values
      const tierMap: Record<string, string> = {
        elite: 'corporate_exclusive',
        premium: 'premium',
        standard: 'standard',
        corporate_exclusive: 'corporate_exclusive',
      };
      where.tier = tierMap[filter.tier.toLowerCase()] ?? filter.tier.toLowerCase();
    }
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.repo.findAndCount({ where, order: { rating: 'DESC' }, skip, take });
    return paginatedResponse(data, total, p, l);
  }

  get(id: string) { return this.repo.findOne({ where: { id } }); }

  create(data: Partial<GymEntity>) { return this.repo.save(this.repo.create(data)); }

  update(id: string, data: Partial<GymEntity>) { return this.repo.update(id, data).then(() => this.get(id)); }

  async approve(id: string) {
    await this.repo.update(id, { status: 'active' as GymStatus });
    return this.get(id);
  }

  async reject(id: string) {
    await this.repo.update(id, { status: 'rejected' as GymStatus });
    return this.get(id);
  }

  async suspend(id: string) {
    await this.repo.update(id, { status: 'suspended' as GymStatus });
    return this.get(id);
  }

  async setTier(id: string, tier: string, commissionRate: number) {
    await this.repo.update(id, { tier: tier as any, commissionRate });
    return this.get(id);
  }

  async submitKycDocument(gymId: string, doc: { name: string; url: string; type: string }) {
    const gym = await this.repo.findOne({ where: { id: gymId } });
    if (!gym) throw new NotFoundException('Gym not found');
    const docs = gym.kycDocuments || [];
    docs.push({ ...doc, uploadedAt: new Date().toISOString() });
    await this.repo.update(gymId, { kycDocuments: docs, kycStatus: 'in_review' });
    return { success: true, documents: docs };
  }

  async getKycStatus(gymId: string) {
    const gym = await this.repo.findOne({ where: { id: gymId } });
    return { kycStatus: gym?.kycStatus || 'not_started', kycDocuments: gym?.kycDocuments || [] };
  }

  async getRecommended(userId: string) {
    const subs = await this.subs.find({ where: { userId }, take: 5, order: { createdAt: 'DESC' } });
    const gymIds = subs.map(s => (s.gymIds || [])).flat();

    const usedGyms = gymIds.length > 0
      ? await this.repo.find({ where: { id: In(gymIds.slice(0, 3)) } })
      : [];
    const preferredCities = [...new Set(usedGyms.map(g => g.city).filter(Boolean))];
    const preferredCategories = [...new Set(usedGyms.map(g => g.categories || []).flat().filter(Boolean))];

    const excludeIds = gymIds.length > 0 ? gymIds : ['00000000-0000-0000-0000-000000000000'];

    const qb = this.repo.createQueryBuilder('gym')
      .where('gym.status = :status', { status: 'active' })
      .andWhere('gym.id NOT IN (:...usedIds)', { usedIds: excludeIds })
      .orderBy('gym.rating', 'DESC')
      .take(10);

    if (preferredCities.length > 0) {
      qb.orWhere('gym.city IN (:...cities)', { cities: preferredCities });
    }
    if (preferredCategories.length > 0) {
      qb.orWhere('gym.city IN (:...cats)', { cats: preferredCategories });
    }

    const recommended = await qb.getMany();

    if (recommended.length < 5) {
      const topRated = await this.repo.find({ where: { status: 'active' }, order: { rating: 'DESC' }, take: 10 });
      const existing = new Set(recommended.map(g => g.id));
      for (const g of topRated) {
        if (!existing.has(g.id)) recommended.push(g);
        if (recommended.length >= 10) break;
      }
    }
    return recommended.slice(0, 10);
  }
}

@ApiTags('Gyms')
@Controller('gyms')
class GymsController {
  constructor(private readonly svc: GymsService) {}
  @Get('my-gym') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner', 'gym_staff')
  myGym(@Req() req: any) { return this.svc.myGym(req.user.userId); }

  @Get('my-members') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner', 'gym_staff')
  myMembers(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) { return this.svc.myMembers(req.user.userId, { page: +page, limit: +limit, search, status }); }

  @Patch('my-members/:subId/deactivate') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner', 'gym_staff')
  deactivateMember(@Req() req: any, @Param('subId') subId: string) {
    return this.svc.deactivateMember(req.user.userId, subId);
  }

  @Get('my-checkins') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner', 'gym_staff')
  myCheckins(@Req() req: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.myCheckins(req.user.userId, +page, +limit);
  }

  @Get('my-checkins/today') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner', 'gym_staff')
  myTodayStats(@Req() req: any) { return this.svc.myTodayStats(req.user.userId); }

  @Get() list(
    @Query('city') city?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('tier') tier?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.list({ city, status, search, tier }, +page, +limit);
  }
  @Get('recommended') @UseGuards(JwtAuthGuard)
  recommended(@Req() req: any) { return this.svc.getRecommended(req.user.userId); }

  @Get(':id') get(@Param('id') id: string) { return this.svc.get(id); }
  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin', 'gym_owner')
  create(@Body() body: Partial<GymEntity>) { return this.svc.create(body); }

  @Put(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin', 'gym_owner')
  update(@Param('id') id: string, @Body() body: Partial<GymEntity>) { return this.svc.update(id, body); }

  @Post(':id/approve') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  approve(@Param('id') id: string) { return this.svc.approve(id); }

  @Post(':id/reject') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  reject(@Param('id') id: string) { return this.svc.reject(id); }

  @Post(':id/suspend') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  suspend(@Param('id') id: string) { return this.svc.suspend(id); }

  @Post(':id/tier') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  @Put(':id/tier')
  setTier(@Param('id') id: string, @Body() b: { tier: string; commissionRate: number }) {
    return this.svc.setTier(id, b.tier, b.commissionRate);
  }

  @Get(':id/kyc') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin', 'gym_owner', 'gym_staff')
  getKyc(@Param('id') id: string) { return this.svc.getKycStatus(id); }

  @Post(':id/kyc-documents') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner', 'gym_staff')
  submitKyc(@Param('id') id: string, @Body() body: any) { return this.svc.submitKycDocument(id, body); }
}

@Module({
  imports: [TypeOrmModule.forFeature([GymEntity, SubscriptionEntity, CheckinEntity])],
  controllers: [GymsController],
  providers: [GymsService],
  exports: [GymsService],
})
export class GymsModule {}
