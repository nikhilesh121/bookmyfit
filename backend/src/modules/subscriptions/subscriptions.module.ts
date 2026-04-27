import { Module, Controller, Get, Post, Put, Body, UseGuards, Req, Injectable, BadRequestException, NotFoundException, Param, Query } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { v4 as uuid } from 'uuid';
import { SubscriptionEntity } from '../../database/entities/subscription.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AppConfigEntity } from '../../database/entities/app-config.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CashfreeService } from '../payments/cashfree.service';
import { PaymentsModule } from '../payments/payments.module';

/**
 * Default plan pricing. Admin can override multi_gym and day_pass via /subscriptions/multigym-config.
 * Same-gym plans are managed entirely by the gym owner in gym-plans module.
 */
const DEFAULT_MULTIGYM_CONFIG = {
  multi_gym: {
    name: 'Multi Gym Pass',
    subtitle: 'Unlimited access to every partner gym',
    basePrice: 1499,
    gymLimit: null,
    features: ['Unlimited gyms, unlimited visits', 'QR Check-in', 'Priority support', 'All gym tiers', 'PT session add-on eligible'],
  },
};

@Injectable()
class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionEntity) private readonly repo: Repository<SubscriptionEntity>,
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(AppConfigEntity) private readonly configRepo: Repository<AppConfigEntity>,
    private readonly cashfree: CashfreeService,
  ) {}

  async getMultigymConfig() {
    const record = await this.configRepo.findOne({ where: { key: 'multigym_plans' } });
    return record ? { ...DEFAULT_MULTIGYM_CONFIG, ...record.value } : DEFAULT_MULTIGYM_CONFIG;
  }

  async setMultigymConfig(data: Partial<typeof DEFAULT_MULTIGYM_CONFIG>) {
    const current = await this.getMultigymConfig();
    const merged = { ...current, ...data };
    await this.configRepo.save(this.configRepo.create({ key: 'multigym_plans', value: merged }));
    return merged;
  }

  async plans() {
    const config = await this.getMultigymConfig();
    return {
      day_pass: {
        planType: 'day_pass',
        name: '1-Day Pass',
        description: 'Drop in to any partner gym for a day',
        basePrice: 149,
        features: ['Single visit', 'Any partner gym', 'Valid for 24 hours', 'No commitment'],
      },
      same_gym: {
        planType: 'same_gym',
        name: 'Same Gym Pass',
        description: 'Unlimited access to your chosen gym',
        basePrice: 599,
        features: ['Unlimited visits', 'One gym of your choice', 'Monthly subscription', 'Slot booking'],
        note: 'Gym-specific pricing may vary. Browse gyms to see their plans.',
      },
      multi_gym: { ...config.multi_gym, planType: 'multi_gym', name: 'Multi Gym Pass', basePrice: config.multi_gym?.basePrice || 1499 },
    };
  }

  myActive(userId: string) {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' }, take: 50 });
  }

  /**
   * Creates a subscription + Cashfree payment order.
   * - day_pass: no gym required, durationMonths=0.
   * - same_gym: requires gymId.
   * - multi_gym: no gym selection required.
   */
  async purchase(userId: string, phone: string, email: string | undefined, dto: {
    planType: 'day_pass' | 'same_gym' | 'multi_gym';
    durationMonths: number;
    gymId?: string;
    gymPlanId?: string;
    amountOverride?: number;
    isDayPass?: boolean;
    ptAddon?: boolean;
    couponCode?: string;
  }) {
    const config = await this.getMultigymConfig();
    let amount: number;
    let gymIds: string[] = [];
    let gymPlanId: string | undefined;
    const durationMonths = dto.planType === 'day_pass' ? 0 : (dto.durationMonths || 1);

    if (dto.planType === 'same_gym') {
      if (!dto.gymId) throw new BadRequestException('gymId required for Same Gym Pass');
      gymIds = [dto.gymId];
      gymPlanId = dto.gymPlanId;
      amount = dto.amountOverride || 0;
    } else if (dto.planType === 'multi_gym') {
      const price = config.multi_gym?.basePrice || 1499;
      amount = price * (durationMonths || 1);
    } else if (dto.planType === 'day_pass') {
      amount = dto.amountOverride || 149;
    } else {
      throw new BadRequestException('Invalid planType. Use day_pass, same_gym, or multi_gym');
    }

    const startDate = new Date();
    const endDate = new Date();
    if (dto.planType === 'day_pass') {
      endDate.setDate(endDate.getDate() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + durationMonths);
    }
    const cfOrderId = `SUB_${uuid().slice(0, 18)}`;

    const user = await this.userRepo.findOne({ where: { id: userId } });

    const entity = this.repo.create({
      userId,
      planType: dto.planType,
      durationMonths,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      status: 'pending', // becomes 'active' after payment webhook or verify
      amountPaid: amount,
      gymIds,
      gymPlanId,
      razorpayOrderId: cfOrderId,
    } as any);
    const sub = (await this.repo.save(entity as any)) as SubscriptionEntity;

    const payment = await this.cashfree.createOrder({
      orderId: cfOrderId,
      amount,
      customerId: userId,
      customerPhone: phone || user?.phone || '0000000000',
      customerEmail: email || user?.email,
      notes: { kind: 'subscription', subscriptionId: sub.id, planType: dto.planType },
    });

    // In dev/mock mode, auto-activate immediately
    if ((payment as any)?.mock) {
      await this.repo.update(sub.id, { status: 'active' });
      sub.status = 'active';
    }

    return { subscription: sub, payment };
  }

  /** Verify/activate a subscription after payment (called by mobile on success) */
  async verifyAndActivate(subId: string, userId: string) {
    const sub = await this.repo.findOne({ where: { id: subId, userId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.status === 'active') return { success: true, subscription: sub };

    // In dev mode, activate directly. In prod this would verify with Cashfree.
    if (process.env.NODE_ENV !== 'production' || !sub.razorpayOrderId) {
      await this.repo.update(subId, { status: 'active' });
      sub.status = 'active';
      return { success: true, subscription: sub };
    }

    // Prod: fetch Cashfree order status
    const cfOrder = await this.cashfree.fetchOrder(sub.razorpayOrderId);
    if (cfOrder?.order_status === 'PAID') {
      await this.repo.update(subId, { status: 'active' });
      sub.status = 'active';
    }
    return { success: true, subscription: sub };
  }

  async list(page: any = 1, limit: any = 20, status?: string, gymId?: string) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const qb = this.repo.createQueryBuilder('s').orderBy('s.createdAt', 'DESC').skip(skip).take(take);
    if (status) qb.andWhere('s.status = :status', { status });
    if (gymId) qb.andWhere(':gymId = ANY(s."gymIds")', { gymId });
    const [data, total] = await qb.getManyAndCount();
    return paginatedResponse(data, total, p, l);
  }

  async freeze(subscriptionId: string, userId: string) {
    const sub = await this.repo.findOne({ where: { id: subscriptionId, userId } });
    if (!sub) throw new BadRequestException('Subscription not found');
    if (sub.status !== 'active') throw new BadRequestException('Only active subscriptions can be frozen');
    await this.repo.update(subscriptionId, { status: 'frozen' });
    return { success: true, message: 'Subscription frozen. Days will be added when you unfreeze.' };
  }

  async unfreeze(subscriptionId: string, userId: string) {
    const sub = await this.repo.findOne({ where: { id: subscriptionId, userId } });
    if (!sub) throw new BadRequestException('Subscription not found');
    if (sub.status !== 'frozen') throw new BadRequestException('Subscription is not frozen');
    const newEnd = new Date(sub.endDate);
    newEnd.setDate(newEnd.getDate() + 30);
    await this.repo.update(subscriptionId, {
      status: 'active',
      endDate: newEnd.toISOString().slice(0, 10),
    });
    return { success: true, message: 'Subscription reactivated. End date extended by 30 days.' };
  }

  async generateInvoice(id: string, userId: string) {
    const sub = await this.repo.findOne({ where: { id } });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (!sub.invoiceNumber) {
      const d = new Date();
      const seq = Math.floor(10000 + Math.random() * 90000);
      sub.invoiceNumber = `BMF-INV-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${seq}`;
      await this.repo.save(sub);
    }
    const user = await this.userRepo.findOne({ where: { id: sub.userId } });
    const amount = Number(sub.amountPaid) || 0;
    const gstRate = 0.18;
    const baseAmount = Math.round(amount / (1 + gstRate));
    const gstAmount = amount - baseAmount;
    const cgst = Math.round(gstAmount / 2);
    const sgst = Math.round(gstAmount / 2);
    const planLabels: Record<string, string> = {
      day_pass: '1-Day Pass',
      same_gym: 'Same Gym Pass',
      multi_gym: 'Multi Gym Pass',
    };
    const planName = planLabels[sub.planType] || sub.planType || 'Standard';
    return {
      invoiceNumber: sub.invoiceNumber,
      invoiceDate: sub.createdAt,
      customer: { name: user?.name, phone: user?.phone, email: user?.email },
      items: [{ description: `BookMyFit Subscription - ${planName}`, months: sub.durationMonths || 1, amount: baseAmount }],
      subtotal: baseAmount,
      cgst,
      sgst,
      totalGst: cgst + sgst,
      total: amount,
      gstin: 'PENDING_REGISTRATION',
      companyName: 'BookMyFit Technologies Pvt Ltd',
      companyAddress: 'Mumbai, Maharashtra, India',
      pan: 'PENDING',
    };
  }

  async adminInvoices() {
    const subs = await this.repo.find({ order: { createdAt: 'DESC' }, take: 200 });
    return subs.map(sub => ({
      id: sub.id,
      userId: sub.userId,
      planType: sub.planType,
      amountPaid: sub.amountPaid,
      invoiceNumber: sub.invoiceNumber || null,
      status: sub.status,
      createdAt: sub.createdAt,
    }));
  }
}

@ApiTags('Subscriptions')
@Controller('subscriptions')
class SubscriptionsController {
  constructor(private readonly svc: SubscriptionsService) {}

  /** Public: returns multigym plan structure (Pro & Max). Individual plans are per-gym. */
  @Get('plans') plans() { return this.svc.plans(); }

  /** Admin: get multigym config */
  @Get('multigym-config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  getConfig() { return this.svc.getMultigymConfig(); }

  /** Admin: update multigym pricing */
  @Put('multigym-config')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  setConfig(@Body() body: any) { return this.svc.setMultigymConfig(body); }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@Req() req: any) { return this.svc.myActive(req.user.userId); }

  @Post('purchase')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  purchase(@Req() req: any, @Body() body: any) {
    return this.svc.purchase(req.user.userId, req.user.phone, req.user.email, body);
  }

  @Post(':id/verify')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  verify(@Param('id') id: string, @Req() req: any) { return this.svc.verifyAndActivate(id, req.user.userId); }

  @Get('all')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  all(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('gymId') gymId?: string,
  ) { return this.svc.list(+page, +limit, status, gymId); }

  @Post(':id/freeze')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  freeze(@Param('id') id: string, @Req() req: any) { return this.svc.freeze(id, req.user.userId); }

  @Post(':id/unfreeze')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  unfreeze(@Param('id') id: string, @Req() req: any) { return this.svc.unfreeze(id, req.user.userId); }

  @Post(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'end_user')
  async cancel(@Param('id') id: string, @Req() req: any) {
    // Allow owner to cancel their own, or super_admin to cancel any
    return this.svc.freeze(id, req.user.userId).then(() => ({ success: true, subscriptionId: id, status: 'cancelled' }));
  }

  @Get('admin/invoices')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  adminInvoices() { return this.svc.adminInvoices(); }

  @Get(':id/invoice')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  invoice(@Param('id') id: string, @Req() req: any) { return this.svc.generateInvoice(id, req.user.userId); }
}

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionEntity, UserEntity, AppConfigEntity]), PaymentsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
