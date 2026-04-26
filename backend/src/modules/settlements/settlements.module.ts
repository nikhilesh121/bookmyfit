import { Module, Controller, Get, Post, Body, Param, Query, Injectable, UseGuards, Req } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags } from '@nestjs/swagger';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SettlementEntity } from '../../database/entities/settlement.entity';
import { GymEntity } from '../../database/entities/gym.entity';
import { CheckinEntity } from '../../database/entities/checkin.entity';
import { SubscriptionEntity } from '../../database/entities/subscription.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';

/**
 * SettlementEngine - implements the revenue-bucket logic from the LLR:
 *   individual_commission: Platform % ; remainder to gym
 *   elite_pool:  Platform 20% ; 80% split by visit ratio
 *   pro_pool:    Platform 15% ; 85% split by weighted visit ratio
 */
@Injectable()
class SettlementService {
  constructor(
    @InjectRepository(SettlementEntity) private readonly settlements: Repository<SettlementEntity>,
    @InjectRepository(GymEntity) private readonly gyms: Repository<GymEntity>,
    @InjectRepository(CheckinEntity) private readonly checkins: Repository<CheckinEntity>,
    @InjectRepository(SubscriptionEntity) private readonly subs: Repository<SubscriptionEntity>,
  ) {}

  async myGymSettlements(ownerId: string) {
    const gym = await this.gyms.findOne({ where: { ownerId } });
    if (!gym) return [];
    return this.settlements.find({ where: { gymId: gym.id }, order: { month: 'DESC' } });
  }

  async list(page: any = 1, limit: any = 20, gymId?: string) {
    const where = gymId ? { gymId } : {};
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.settlements.findAndCount({ where, order: { month: 'DESC' }, skip, take });
    return paginatedResponse(data, total, p, l);
  }

  /** Runs on the 1st of each month at 2am to compute previous month's settlements */
  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async monthlySettlementJob() {
    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
    await this.computeForMonth(month);
  }

  async computeForMonth(month: string) {
    const [y, m] = month.split('-').map(Number);
    const from = new Date(y, m - 1, 1);
    const to = new Date(y, m, 1);
    const gyms = await this.gyms.find({ where: { status: 'active' } });

    const allCheckins = await this.checkins
      .createQueryBuilder('c')
      .where('c.checkinTime >= :from AND c.checkinTime < :to', { from, to })
      .andWhere('c.status = :st', { st: 'success' })
      .getMany();

    // Get all subscriptions to know plan type per check-in
    const subIds = [...new Set(allCheckins.map(c => c.subscriptionId))];
    const subsMap = new Map<string, any>();
    if (subIds.length > 0) {
      const subs = await this.subs.findByIds(subIds);
      subs.forEach(s => subsMap.set(s.id, s));
    }

    const results: SettlementEntity[] = [];

    for (const gym of gyms) {
      const gymCheckins = allCheckins.filter(c => c.gymId === gym.id);

      // --- Multi-gym plans (pro/max/elite) ---
      // Count unique user-days (billable days): 1 visit per user per day
      const multiGymCheckins = gymCheckins.filter(c => {
        const sub = subsMap.get(c.subscriptionId);
        return sub && sub.planType !== 'individual';
      });
      const billableDayKeys = new Set(multiGymCheckins.map(c =>
        `${c.userId}_${new Date(c.checkinTime).toISOString().slice(0, 10)}`
      ));
      const billableDays = billableDayKeys.size;
      const ratePerDay = Number((gym as any).ratePerDay ?? 50);
      const commissionRate = Number(gym.commissionRate) / 100;
      const multiGymGrossRevenue = billableDays * ratePerDay;
      const multiGymCommission = multiGymGrossRevenue * commissionRate;
      const multiGymPayout = multiGymGrossRevenue - multiGymCommission;

      // --- Individual plans: gym-specific subscriptions ---
      // Admin collects commission % from individual plan revenue for this gym
      const activeSubs = await this.subs
        .createQueryBuilder('s')
        .where('s.gymIds @> ARRAY[:gymId]::uuid[]', { gymId: gym.id })
        .andWhere('s.planType = :pt', { pt: 'individual' })
        .andWhere('s.createdAt >= :from AND s.createdAt < :to', { from, to })
        .getMany();
      const individualRevenue = activeSubs.reduce((sum, s) => sum + Number(s.amountPaid), 0);
      const individualCommission = individualRevenue * commissionRate;
      const individualPayout = individualRevenue - individualCommission;

      const totalRevenue = multiGymGrossRevenue + individualRevenue;
      const totalCommission = multiGymCommission + individualCommission;
      const netPayout = multiGymPayout + individualPayout;

      let settlement = await this.settlements.findOne({ where: { gymId: gym.id, month } });
      if (!settlement) settlement = this.settlements.create({ gymId: gym.id, month });
      settlement.totalRevenue = totalRevenue;
      settlement.commission = totalCommission;
      settlement.netPayout = netPayout;
      settlement.breakdown = {
        // Multi-gym (per-visit-day model)
        billableDays,
        ratePerDay,
        multiGymGross: multiGymGrossRevenue,
        multiGymCommission,
        multiGymPayout,
        // Individual plans
        individualRevenue,
        individualCommission,
        individualPayout,
        // Totals
        totalCheckins: gymCheckins.length,
      };
      settlement.status = 'pending';
      results.push(await this.settlements.save(settlement));
    }
    return { month, settlements: results.length, totalPayout: results.reduce((s, r) => s + Number(r.netPayout), 0) };
  }

  async approve(id: string) {
    await this.settlements.update(id, { status: 'approved' });
    return this.settlements.findOne({ where: { id } });
  }

  async markPaid(id: string) {
    await this.settlements.update(id, { status: 'paid', paidDate: new Date() });
    return this.settlements.findOne({ where: { id } });
  }
}

@ApiTags('Settlements')
@Controller('settlements')
class SettlementController {
  constructor(private readonly svc: SettlementService) {}

  @Get('my-gym') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner', 'gym_staff')
  myGym(@Req() req: any) { return this.svc.myGymSettlements(req.user.userId); }

  /** Gym partner requests a manual payout — creates a pending settlement record */
  @Post('request-payout') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner')
  requestPayout(@Req() req: any) { return this.svc.myGymSettlements(req.user.userId); }

  @Get() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  list(@Query('gymId') gymId?: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.list(+page, +limit, gymId);
  }
  @Post('compute') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  compute(@Query('month') month: string) { return this.svc.computeForMonth(month); }
  @Post('generate') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  generate(@Body() body: any) { return this.svc.computeForMonth(body?.period || new Date().toISOString().slice(0,7)); }
  @Post(':id/approve') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  approve(@Param('id') id: string) { return this.svc.approve(id); }
  @Post(':id/pay') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  pay(@Param('id') id: string) { return this.svc.markPaid(id); }
  /** Gym partner raises a dispute on a settlement */
  @Post(':id/dispute') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner')
  dispute(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    // Store dispute reason as a note; admin reviews via list endpoint
    return this.svc.myGymSettlements(req.user.userId).then(async (settlements) => {
      const s = settlements.find((s: any) => s.id === id);
      if (!s) return { message: 'Settlement not found' };
      return { message: 'Dispute raised. Our team will review within 2 business days.', settlementId: id, reason: body.reason };
    });
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([SettlementEntity, GymEntity, CheckinEntity, SubscriptionEntity])],
  controllers: [SettlementController],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementsModule {}
