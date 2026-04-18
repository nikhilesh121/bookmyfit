import { Module, Controller, Get, Post, Body, UseGuards, Req, Injectable, BadRequestException, NotFoundException, Param, Query } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { v4 as uuid } from 'uuid';
import { SubscriptionEntity, PlanType } from '../../database/entities/subscription.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CashfreeService } from '../payments/cashfree.service';
import { PaymentsModule } from '../payments/payments.module';

const PLAN_CATALOG: Record<PlanType, { name: string; basePrice: number; maxGyms?: number }> = {
  individual: { name: 'Individual Gym', basePrice: 1500, maxGyms: 1 },
  pro: { name: 'Pro Multi-Gym', basePrice: 2500, maxGyms: 5 },
  max: { name: 'Max All Access', basePrice: 3500 },
  elite: { name: 'Elite Premium', basePrice: 5000 },
};

@Injectable()
class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionEntity) private readonly repo: Repository<SubscriptionEntity>,
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    private readonly cashfree: CashfreeService,
  ) {}

  plans() {
    return Object.entries(PLAN_CATALOG).map(([type, meta]) => ({ type, ...meta }));
  }

  myActive(userId: string) {
    return this.repo.find({ where: { userId, status: 'active' }, order: { endDate: 'DESC' } });
  }

  /**
   * Creates a subscription in "pending" state + a Cashfree order.
   * Subscription moves to "active" only when the payment webhook fires.
   */
  async purchase(userId: string, phone: string, dto: { planType: PlanType; durationMonths: number; gymIds?: string[] }) {
    if (!PLAN_CATALOG[dto.planType]) throw new BadRequestException('Invalid plan');
    if (dto.planType === 'individual' && (!dto.gymIds || dto.gymIds.length !== 1))
      throw new BadRequestException('Individual plan requires exactly 1 gym');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + dto.durationMonths);
    const amount = PLAN_CATALOG[dto.planType].basePrice * dto.durationMonths;
    const cfOrderId = `SUB_${uuid().slice(0, 18)}`;

    const sub = await this.repo.save(this.repo.create({
      userId,
      planType: dto.planType,
      durationMonths: dto.durationMonths,
      startDate: startDate.toISOString().slice(0, 10),
      endDate: endDate.toISOString().slice(0, 10),
      status: 'expired', // stays "inactive" until webhook confirms; use expired as placeholder
      amountPaid: amount,
      gymIds: dto.gymIds || [],
      razorpayOrderId: cfOrderId,
    }));

    const payment = await this.cashfree.createOrder({
      orderId: cfOrderId,
      amount,
      customerId: userId,
      customerPhone: phone,
      notes: { kind: 'subscription', subscriptionId: sub.id },
    });

    return { subscription: sub, payment };
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
    // Extend end date by remaining days (simple 30-day extension)
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
    const planName = PLAN_CATALOG[sub.planType]?.name || sub.planType || 'Standard';
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

  @Get('plans') plans() { return this.svc.plans(); }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  mine(@Req() req: any) { return this.svc.myActive(req.user.userId); }

  @Post('purchase')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  purchase(@Req() req: any, @Body() body: any) { return this.svc.purchase(req.user.userId, req.user.phone, body); }

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
  imports: [TypeOrmModule.forFeature([SubscriptionEntity, UserEntity]), PaymentsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
