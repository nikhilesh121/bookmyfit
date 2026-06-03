import { Module, Controller, Get, Post, Put, Delete, Body, UseGuards, Req, Injectable, BadRequestException, NotFoundException, Param, Query } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { v4 as uuid } from 'uuid';
import { SubscriptionEntity } from '../../database/entities/subscription.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { AppConfigEntity } from '../../database/entities/app-config.entity';
import { CouponEntity } from '../../database/entities/misc.entity';
import { GymEntity, GymPlanEntity, MultiGymNetworkEntity } from '../../database/entities/gym.entity';
import { TrainerEntity, TrainerBookingEntity } from '../../database/entities/trainer.entity';
import { SessionSlotEntity } from '../../database/entities/session-slot.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CashfreeService } from '../payments/cashfree.service';
import { PaymentsModule } from '../payments/payments.module';
import { SessionsModule, SessionsService } from '../sessions/sessions.module';
import {
  DEFAULT_PLATFORM_PRICING_CONFIG,
  PLATFORM_PRICING_CONFIG_KEY,
  applyCheckoutCommission,
  normalizePlatformPricingConfig,
  platformPricingResponse,
  serviceCommission,
} from '../../common/commission-config';

@Injectable()
class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionEntity) private readonly repo: Repository<SubscriptionEntity>,
    @InjectRepository(UserEntity) private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(AppConfigEntity) private readonly configRepo: Repository<AppConfigEntity>,
    @InjectRepository(CouponEntity) private readonly couponRepo: Repository<CouponEntity>,
    @InjectRepository(GymEntity) private readonly gymRepo: Repository<GymEntity>,
    @InjectRepository(GymPlanEntity) private readonly gymPlanRepo: Repository<GymPlanEntity>,
    @InjectRepository(MultiGymNetworkEntity) private readonly networkRepo: Repository<MultiGymNetworkEntity>,
    @InjectRepository(TrainerEntity) private readonly trainerRepo: Repository<TrainerEntity>,
    @InjectRepository(TrainerBookingEntity) private readonly trainerBookings: Repository<TrainerBookingEntity>,
    @InjectRepository(SessionSlotEntity) private readonly slotRepo: Repository<SessionSlotEntity>,
    private readonly cashfree: CashfreeService,
    private readonly sessions: SessionsService,
  ) {}

  private async platformPricingConfig() {
    const record = await this.configRepo.findOne({ where: { key: PLATFORM_PRICING_CONFIG_KEY } });
    return normalizePlatformPricingConfig(record?.value);
  }

  private amountWithCheckoutCommission(baseAmount: number, planType: 'day_pass' | 'same_gym', config: any) {
    return applyCheckoutCommission(baseAmount, serviceCommission(config, planType));
  }

  private todayIST() {
    return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  }

  private nowTimeIST() {
    const d = new Date(Date.now() + 5.5 * 3600 * 1000);
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  }

  private isDateString(value: any): value is string {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  }

  private async ensureScheduledDayPassBooking(sub: SubscriptionEntity) {
    if (sub.planType !== 'day_pass' || sub.status !== 'active' || !sub.scheduledSlotId) return null;
    try {
      return await this.sessions.bookSlot(sub.userId, { slotId: sub.scheduledSlotId, subscriptionId: sub.id });
    } catch (err: any) {
      if (/already|booked/i.test(String(err?.message || ''))) return null;
      return null;
    }
  }

  async getMultigymConfig() {
    return platformPricingResponse(await this.platformPricingConfig());
  }

  async setMultigymConfig(data: Partial<typeof DEFAULT_PLATFORM_PRICING_CONFIG>) {
    const row = await this.configRepo.findOne({ where: { key: PLATFORM_PRICING_CONFIG_KEY } });
    const current = normalizePlatformPricingConfig(row?.value);
    const multiGym = { ...((data as any)?.multi_gym || {}) };
    delete (multiGym as any).commission;
    delete (multiGym as any).commissionSetting;
    const merged = normalizePlatformPricingConfig({
      ...current,
      ...data,
      globalCommission: (data as any)?.globalCommission || current.globalCommission,
      day_pass: { ...current.day_pass, ...((data as any)?.day_pass || {}) },
      same_gym: { ...current.same_gym, ...((data as any)?.same_gym || {}) },
      multi_gym: { ...current.multi_gym, ...multiGym },
      wellness: { ...current.wellness, ...((data as any)?.wellness || {}) },
      personal_training: { ...current.personal_training, ...((data as any)?.personal_training || {}) },
    });
    await this.configRepo.save(this.configRepo.create({ key: PLATFORM_PRICING_CONFIG_KEY, value: merged }));
    return platformPricingResponse(merged);
  }

  async plans() {
    const config = await this.platformPricingConfig();
    const pricing = platformPricingResponse(config);
    return {
      day_pass: {
        planType: 'day_pass',
        name: '1-Day Pass',
        description: 'Drop in to any partner gym for a day',
        basePrice: pricing.day_pass?.basePrice || 149,
        imageUrl: pricing.day_pass?.imageUrl,
        commission: pricing.day_pass?.commission,
        commissionSetting: pricing.day_pass?.commissionSetting,
        features: ['Single visit', 'Selected gym', 'Valid on selected date', 'No commitment'],
      },
      same_gym: {
        planType: 'same_gym',
        name: 'Same Gym Pass',
        description: 'Unlimited access to your chosen gym',
        basePrice: null,
        imageUrl: pricing.same_gym?.imageUrl,
        commission: pricing.same_gym?.commission,
        commissionSetting: pricing.same_gym?.commissionSetting,
        features: ['Unlimited visits', 'One gym of your choice', 'Monthly subscription', 'Slot booking'],
        note: 'Same-gym memberships are priced by each gym. Select a gym to see active plans.',
        requiresGymPlan: true,
      },
      multi_gym: { ...pricing.multi_gym, planType: 'multi_gym', name: 'Multi Gym Pass', basePrice: pricing.multi_gym?.basePrice || 1499 },
      wellness: pricing.wellness,
      personal_training: pricing.personal_training,
      globalCommission: pricing.globalCommission,
    };
  }

  private activeGymPass(userId: string, gymId?: string, excludeId?: string) {
    if (!gymId) return Promise.resolve(null);
    const qb = this.repo.createQueryBuilder('s')
      .select('s.id', 'id')
      .addSelect('s."endDate"', 'endDate')
      .addSelect('s."planType"', 'planType')
      .where('s."userId" = :userId', { userId })
      .andWhere('s.status = :status', { status: 'active' })
      .andWhere('s."planType" IN (:...planTypes)', { planTypes: ['same_gym', 'day_pass'] })
      .andWhere('CAST(:gymId AS uuid) = ANY(s."gymIds")', { gymId })
      .andWhere('s."endDate" >= CURRENT_DATE');

    if (excludeId) qb.andWhere('s.id != :excludeId', { excludeId });
    return qb.getRawOne();
  }

  private duplicateGymPassMessage(existing: any) {
    return `You already have an active pass for this gym${existing?.endDate ? ` until ${existing.endDate}` : ''}`;
  }

  private activeMultiGymPass(userId: string, excludeId?: string) {
    const qb = this.repo.createQueryBuilder('s')
      .select('s.id', 'id')
      .addSelect('s."endDate"', 'endDate')
      .where('s."userId" = :userId', { userId })
      .andWhere('s.status = :status', { status: 'active' })
      .andWhere('s."planType" = :planType', { planType: 'multi_gym' })
      .andWhere('s."endDate" >= CURRENT_DATE');

    if (excludeId) qb.andWhere('s.id != :excludeId', { excludeId });
    return qb.getRawOne();
  }

  private async assertNoActiveMultiGymPass(userId: string, excludeId?: string) {
    const existing = await this.activeMultiGymPass(userId, excludeId);
    if (existing) {
      throw new BadRequestException(`You already have an active Multi Gym Pass${existing?.endDate ? ` until ${existing.endDate}` : ''}`);
    }
  }

  private normalizeGymSummary(gym: any) {
    if (!gym) return null;
    const photos = Array.isArray(gym.photos) ? gym.photos.filter(Boolean) : [];
    const coverPhoto = gym.coverPhoto || photos[0] || null;
    return {
      ...gym,
      coverPhoto,
      coverImage: coverPhoto,
      photos,
      images: photos.length > 0 ? photos : (coverPhoto ? [coverPhoto] : []),
    };
  }

  private hasPublicGymLocation(gym: any) {
    const lat = Number(gym?.lat);
    const lng = Number(gym?.lng);
    return gym?.status === 'active'
      && Number.isFinite(lat)
      && Number.isFinite(lng)
      && !(lat === 0 && lng === 0);
  }

  private async assertNoActiveGymPass(userId: string, gymId?: string, excludeId?: string) {
    const existing = await this.activeGymPass(userId, gymId, excludeId);
    if (existing) throw new BadRequestException(this.duplicateGymPassMessage(existing));
  }

  private async cancelPendingGymPasses(userId: string, gymId?: string) {
    if (!gymId) return;
    const pending = await this.repo.createQueryBuilder('s')
      .select('s.id', 'id')
      .addSelect('s."razorpayOrderId"', 'cashfreeOrderId')
      .where('s."userId" = :userId', { userId })
      .andWhere('s.status = :status', { status: 'pending' })
      .andWhere('s."planType" IN (:...planTypes)', { planTypes: ['same_gym', 'day_pass'] })
      .andWhere('CAST(:gymId AS uuid) = ANY(s."gymIds")', { gymId })
      .getRawMany();
    if (!pending.length) return;
    const ids = pending.map((row: any) => row.id).filter(Boolean);
    const orderIds = pending.map((row: any) => row.cashfreeOrderId).filter(Boolean);
    if (ids.length) await this.repo.update(ids, { status: 'cancelled' as any });
    if (orderIds.length) await this.trainerBookings.update({ cashfreeOrderId: In(orderIds) }, { status: 'cancelled' });
  }

  private async cancelPendingMultiGymPasses(userId: string) {
    const pending = await this.repo.createQueryBuilder('s')
      .select('s.id', 'id')
      .addSelect('s."razorpayOrderId"', 'cashfreeOrderId')
      .where('s."userId" = :userId', { userId })
      .andWhere('s.status = :status', { status: 'pending' })
      .andWhere('s."planType" = :planType', { planType: 'multi_gym' })
      .getRawMany();
    if (!pending.length) return;
    const ids = pending.map((row: any) => row.id).filter(Boolean);
    const orderIds = pending.map((row: any) => row.cashfreeOrderId).filter(Boolean);
    if (ids.length) await this.repo.update(ids, { status: 'cancelled' as any });
    if (orderIds.length) await this.trainerBookings.update({ cashfreeOrderId: In(orderIds) }, { status: 'cancelled' });
  }

  private async discountForCoupon(code: string | undefined, amount: number) {
    const couponCode = code?.trim();
    if (!couponCode) return 0;

    const coupon = await this.couponRepo.findOne({ where: { code: couponCode, isActive: true } });
    if (!coupon) throw new BadRequestException('Invalid coupon');

    const now = new Date();
    if (now < new Date(coupon.validFrom) || now > new Date(coupon.validTo)) throw new BadRequestException('Coupon expired');
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) throw new BadRequestException('Coupon usage limit reached');
    if (amount < Number(coupon.minOrderValue || 0)) throw new BadRequestException(`Minimum order value is Rs ${coupon.minOrderValue}`);
    if (coupon.applicableTo?.length && !coupon.applicableTo.includes('subscription')) throw new BadRequestException('Coupon not applicable to subscriptions');

    let discount = coupon.discountType === 'percentage'
      ? amount * (Number(coupon.discountValue) / 100)
      : Number(coupon.discountValue);
    if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
    return Math.max(0, Math.min(amount, Math.round(discount)));
  }

  async myActive(userId: string) {
    const subs = await this.repo.createQueryBuilder('s')
      .select('s.id', 'id')
      .addSelect('s."userId"', 'userId')
      .addSelect('s."planType"', 'planType')
      .addSelect('s."durationMonths"', 'durationMonths')
      .addSelect('s."startDate"', 'startDate')
      .addSelect('s."endDate"', 'endDate')
      .addSelect('s.status', 'status')
      .addSelect('s."amountPaid"', 'amountPaid')
      .addSelect('s."gymIds"', 'gymIds')
      .addSelect('s."gymPlanId"', 'gymPlanId')
      .addSelect('s."scheduledVisitDate"', 'scheduledVisitDate')
      .addSelect('s."scheduledSlotId"', 'scheduledSlotId')
      .addSelect('s."scheduledStartTime"', 'scheduledStartTime')
      .addSelect('s."scheduledEndTime"', 'scheduledEndTime')
      .addSelect('s."razorpayOrderId"', 'razorpayOrderId')
      .addSelect('s."createdAt"', 'createdAt')
      .where('s."userId" = :userId', { userId })
      .orderBy('s."createdAt"', 'DESC')
      .limit(50)
      .getRawMany();
    // Enrich with gym name for same_gym and day_pass
    const allGymIds = [...new Set(subs.flatMap((s: any) => s.gymIds || []).filter(Boolean))];
    const gyms = allGymIds.length > 0
      ? await this.gymRepo.createQueryBuilder('g')
        .select('g.id', 'id')
        .addSelect('g.name', 'name')
        .addSelect('g."coverPhoto"', 'coverPhoto')
        .addSelect('g.photos', 'photos')
        .where('g.id IN (:...ids)', { ids: allGymIds })
        .getRawMany()
      : [];
    const gymMap: Record<string, any> = Object.fromEntries(gyms.map((g: any) => [g.id, this.normalizeGymSummary(g)]));
    const gymPlanIds = [...new Set(subs.map((s: any) => s.gymPlanId).filter(Boolean))];
    const gymPlans = gymPlanIds.length > 0
      ? await this.gymPlanRepo.createQueryBuilder('gp')
        .select('gp.id', 'id')
        .addSelect('gp.name', 'name')
        .addSelect('gp.price', 'price')
        .addSelect('gp."durationDays"', 'durationDays')
        .where('gp.id IN (:...ids)', { ids: gymPlanIds })
        .getRawMany()
      : [];
    const gymPlanMap: Record<string, any> = Object.fromEntries(gymPlans.map((plan: any) => [plan.id, plan]));
    const PLAN_LABELS: Record<string, string> = { day_pass: '1-Day Pass', same_gym: 'Same Gym Pass', multi_gym: 'Multi Gym Pass' };
    const today = new Date().toISOString().slice(0, 10);
    return subs.map((sub: any) => {
      const primaryGymId = sub.gymIds?.[0] || null;
      const gym = primaryGymId ? (gymMap[primaryGymId] || null) : null;
      const gymPlan = sub.gymPlanId ? (gymPlanMap[sub.gymPlanId] || null) : null;
      const gymName = gym?.name || null;
      const effectiveStatus = sub.status === 'active' && sub.endDate && String(sub.endDate).slice(0, 10) < today
        ? 'expired'
        : sub.status;
      return {
        ...sub,
        status: effectiveStatus,
        isCurrent: effectiveStatus === 'active',
        primaryGymId,
        gymId: primaryGymId,
        gymName,
        gym: primaryGymId ? { id: primaryGymId, name: gymName, coverPhoto: gym?.coverPhoto || null, coverImage: gym?.coverImage || null, photos: gym?.photos || [], images: gym?.images || [] } : null,
        plan: gymPlan ? { id: gymPlan.id, name: gymPlan.name, price: Number(gymPlan.price || 0), salePrice: Number((gymPlan as any).salePrice || gymPlan.price || 0), durationDays: gymPlan.durationDays } : null,
        planLabel: gymPlan?.name || PLAN_LABELS[sub.planType] || sub.planType,
      };
    });
  }

  /**
   * Creates a subscription + Cashfree payment order.
   * - day_pass: requires gymId, durationMonths=0.
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
    dayPassDate?: string;
    dayPassSlotId?: string;
    ptAddon?: boolean;
    ptDurationMonths?: number;
    ptTrainerId?: string;
    couponCode?: string;
  }) {
    const config = await this.getMultigymConfig();
    let amount: number;
    let gymIds: string[] = [];
    let gymPlanId: string | undefined;
    let durationMonths = dto.planType === 'day_pass' ? 0 : (dto.durationMonths || 1);
    let scheduledVisitDate: string | null = null;
    let scheduledSlotId: string | null = null;
    let scheduledStartTime: string | null = null;
    let scheduledEndTime: string | null = null;
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (dto.planType === 'same_gym') {
      if (!dto.gymId) throw new BadRequestException('gymId required for Same Gym Pass');
      if (!uuidRe.test(dto.gymId)) throw new BadRequestException('Invalid gymId format');
      gymIds = [dto.gymId];
      gymPlanId = dto.gymPlanId;
      const gym = await this.gymRepo.createQueryBuilder('g')
        .select('g.id', 'id')
        .addSelect('g.name', 'name')
        .addSelect('g.status', 'status')
        .addSelect('g.lat', 'lat')
        .addSelect('g.lng', 'lng')
        .where('g.id = :id', { id: dto.gymId })
        .getRawOne();
      if (!this.hasPublicGymLocation(gym)) throw new BadRequestException('Gym is not available for booking');
      await this.cancelPendingGymPasses(userId, dto.gymId);
      await this.assertNoActiveGymPass(userId, dto.gymId);

      if (!gymPlanId) {
        throw new BadRequestException('Select an active gym subscription plan before checkout');
      }

      const gymPlan = await this.gymPlanRepo.findOne({ where: { id: gymPlanId, gymId: dto.gymId, isActive: true } });
      if (!gymPlan) throw new BadRequestException('Gym plan not found');

      amount = this.amountWithCheckoutCommission(Number((gymPlan as any).salePrice || gymPlan.price), 'same_gym', config);
      durationMonths = Math.max(1, Math.round((gymPlan.durationDays || 30) / 30));
    } else if (dto.planType === 'multi_gym') {
      await this.cancelPendingMultiGymPasses(userId);
      await this.assertNoActiveMultiGymPass(userId);
      const price = config.multi_gym?.basePrice || 1499;
      amount = Math.max(1, Math.round(price * (durationMonths || 1)));
    } else if (dto.planType === 'day_pass') {
      if (!dto.gymId) throw new BadRequestException('Select a gym before buying a 1-Day Pass');
      if (!uuidRe.test(dto.gymId)) throw new BadRequestException('Invalid gymId format');
      if (!this.isDateString(dto.dayPassDate)) throw new BadRequestException('Select the visit date for your 1-Day Pass');
      if (!dto.dayPassSlotId || !uuidRe.test(dto.dayPassSlotId)) throw new BadRequestException('Select a valid visit time for your 1-Day Pass');
      if (dto.dayPassDate < this.todayIST()) throw new BadRequestException('Select today or a future date for your 1-Day Pass');
      gymIds = [dto.gymId];
      const gym = await this.gymRepo.createQueryBuilder('g')
        .select('g.id', 'id')
        .addSelect('g."dayPassPrice"', 'dayPassPrice')
        .addSelect('g.status', 'status')
        .addSelect('g.lat', 'lat')
        .addSelect('g.lng', 'lng')
        .where('g.id = :id', { id: dto.gymId })
        .getRawOne();
      if (!this.hasPublicGymLocation(gym)) throw new BadRequestException('Gym is not available for booking');
      await this.cancelPendingGymPasses(userId, dto.gymId);
      await this.assertNoActiveGymPass(userId, dto.gymId);

      const slot = await this.slotRepo.findOne({ where: { id: dto.dayPassSlotId } });
      if (!slot || slot.gymId !== dto.gymId || slot.date !== dto.dayPassDate) {
        throw new BadRequestException('Selected visit slot is not available for this gym and date');
      }
      if (slot.status !== 'scheduled') throw new BadRequestException('Selected visit slot is not available');
      if (slot.bookedCount >= slot.maxCapacity) throw new BadRequestException('Selected visit slot is full');
      if (slot.date === this.todayIST() && slot.startTime <= this.nowTimeIST()) {
        throw new BadRequestException('Selected visit slot has already started');
      }

      scheduledVisitDate = slot.date;
      scheduledSlotId = slot.id;
      scheduledStartTime = slot.startTime;
      scheduledEndTime = slot.endTime;
      amount = this.amountWithCheckoutCommission(Number(gym.dayPassPrice || config.day_pass?.basePrice || 149), 'day_pass', config);
    } else {
      throw new BadRequestException('Invalid planType. Use day_pass, same_gym, or multi_gym');
    }

    let ptBooking: TrainerBookingEntity | null = null;
    if (dto.ptAddon && dto.planType === 'multi_gym') {
      throw new BadRequestException('Personal trainer add-on is not available for Multi Gym Pass');
    }

    if (dto.ptAddon && dto.planType === 'same_gym') {
      const ptMonths = Math.max(1, Math.min(durationMonths || 1, Math.round(Number(dto.ptDurationMonths) || durationMonths || 1)));
      if (!dto.ptTrainerId) throw new BadRequestException('Select a trainer for the personal trainer add-on');
      const trainer = await this.trainerRepo.findOne({ where: { id: dto.ptTrainerId, isActive: true } });
      if (!trainer) throw new BadRequestException('Selected trainer is not available');
      if (dto.planType === 'same_gym' && gymIds[0] && trainer.gymId !== gymIds[0]) {
        throw new BadRequestException('Selected trainer does not belong to this gym');
      }
      const ptMonthlyPrice = Number(trainer.monthlyPrice || trainer.pricePerSession || 0);
      if (!Number.isFinite(ptMonthlyPrice) || ptMonthlyPrice <= 0) throw new BadRequestException('Selected trainer monthly price is not configured');
      const ptBaseAmount = Math.round(ptMonthlyPrice * ptMonths);
      const ptAmount = applyCheckoutCommission(ptBaseAmount, serviceCommission(config, 'personal_training'));
      amount += ptAmount;
      const ptCommission = Math.max(0, ptAmount - ptBaseAmount);
      ptBooking = this.trainerBookings.create({
        userId,
        trainerId: trainer.id,
        gymId: trainer.gymId,
        sessionDate: new Date(),
        durationMonths: ptMonths,
        sessions: 0,
        amount: ptAmount,
        platformCommission: ptCommission,
        status: 'pending',
      });
    }

    const couponDiscount = await this.discountForCoupon(dto.couponCode, amount);
    amount = Math.max(0, amount - couponDiscount);
    amount = Math.max(1, Math.round(amount));

    const startDate = new Date();
    const endDate = new Date();
    let startDateStr = startDate.toISOString().slice(0, 10);
    let endDateStr = endDate.toISOString().slice(0, 10);
    if (dto.planType === 'day_pass') {
      startDateStr = scheduledVisitDate || this.todayIST();
      endDateStr = startDateStr;
    } else {
      endDate.setMonth(endDate.getMonth() + durationMonths);
      endDateStr = endDate.toISOString().slice(0, 10);
    }
    const cfOrderId = `SUB_${uuid().slice(0, 18)}`;

    const user = await this.userRepo.findOne({ where: { id: userId } });

    const entity = this.repo.create({
      userId,
      planType: dto.planType,
      durationMonths,
      startDate: startDateStr,
      endDate: endDateStr,
      status: 'pending', // becomes 'active' after payment webhook or verify
      amountPaid: amount,
      gymIds,
      gymPlanId,
      scheduledVisitDate,
      scheduledSlotId,
      scheduledStartTime,
      scheduledEndTime,
      razorpayOrderId: cfOrderId,
    } as any);
    const sub = (await this.repo.save(entity as any)) as SubscriptionEntity;
    if (ptBooking) {
      ptBooking.cashfreeOrderId = cfOrderId;
      await this.trainerBookings.save(ptBooking);
    }

    const payment = await this.cashfree.createOrder({
      orderId: cfOrderId,
      amount,
      customerId: userId,
      customerPhone: phone || user?.phone || '0000000000',
      customerEmail: email || user?.email,
      notes: {
        kind: 'subscription',
        subscriptionId: sub.id,
        planType: dto.planType,
        ptAddon: String(!!dto.ptAddon),
        ptDurationMonths: String(dto.ptDurationMonths || 0),
        ptTrainerId: dto.ptTrainerId || '',
        dayPassDate: scheduledVisitDate || '',
        dayPassSlotId: scheduledSlotId || '',
      },
    });

    // In dev/mock mode, auto-activate immediately
    if ((payment as any)?.mock) {
      if ((sub.planType === 'same_gym' || sub.planType === 'day_pass') && sub.gymIds?.[0]) {
        await this.assertNoActiveGymPass(userId, sub.gymIds[0], sub.id);
      } else if (sub.planType === 'multi_gym') {
        await this.assertNoActiveMultiGymPass(userId, sub.id);
      }
      await this.repo.update(sub.id, { status: 'active' });
      if (ptBooking) await this.trainerBookings.update(ptBooking.id, { status: 'confirmed' });
      sub.status = 'active';
      await this.ensureScheduledDayPassBooking(sub);
    }

    return { subscription: sub, payment };
  }

  /** Verify/activate a subscription after payment (called by mobile on success) */
  async verifyAndActivate(subId: string, userId: string) {
    const sub = await this.repo.findOne({ where: { id: subId, userId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.status === 'active') {
      if (sub.razorpayOrderId) await this.trainerBookings.update({ cashfreeOrderId: sub.razorpayOrderId }, { status: 'confirmed' });
      const scheduledBooking = await this.ensureScheduledDayPassBooking(sub);
      return { success: true, subscription: sub, scheduledBooking };
    }

    if ((sub.planType === 'same_gym' || sub.planType === 'day_pass') && sub.gymIds?.[0]) {
      await this.assertNoActiveGymPass(userId, sub.gymIds[0], sub.id);
    } else if (sub.planType === 'multi_gym') {
      await this.assertNoActiveMultiGymPass(userId, sub.id);
    }

    // Only explicit mock orders activate without asking Cashfree.
    if ((process.env.CASHFREE_MOCK_MODE === 'true' && process.env.NODE_ENV !== 'production') || !sub.razorpayOrderId) {
      await this.repo.update(subId, { status: 'active' });
      if (sub.razorpayOrderId) await this.trainerBookings.update({ cashfreeOrderId: sub.razorpayOrderId }, { status: 'confirmed' });
      sub.status = 'active';
      const scheduledBooking = await this.ensureScheduledDayPassBooking(sub);
      return { success: true, subscription: sub, scheduledBooking };
    }

    // Prod: fetch Cashfree order status
    const payment = await this.cashfree.fetchPaidStatus(sub.razorpayOrderId);
    if (payment.paid) {
      await this.repo.update(subId, {
        status: 'active',
        razorpayPaymentId: payment.paymentId || sub.razorpayPaymentId,
      });
      await this.trainerBookings.update({ cashfreeOrderId: sub.razorpayOrderId }, { status: 'confirmed' });
      sub.status = 'active';
      sub.razorpayPaymentId = payment.paymentId || sub.razorpayPaymentId;
      await this.ensureScheduledDayPassBooking(sub);
    } else if (['FAILED', 'CANCELLED', 'USER_DROPPED', 'EXPIRED'].includes(String(payment.orderStatus || '').toUpperCase())) {
      await this.repo.update(subId, { status: 'cancelled' as any });
      await this.trainerBookings.update({ cashfreeOrderId: sub.razorpayOrderId }, { status: 'cancelled' });
      sub.status = 'cancelled' as any;
    }
    return { success: sub.status === 'active', subscription: sub, paymentStatus: payment.paid ? 'PAID' : payment.orderStatus || 'unknown' };
  }

  async list(page: any = 1, limit: any = 20, status?: string, gymId?: string) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const qb = this.repo.createQueryBuilder('s')
      .select('s.id', 'id')
      .addSelect('s."userId"', 'userId')
      .addSelect('s."planType"', 'planType')
      .addSelect('s."durationMonths"', 'durationMonths')
      .addSelect('s."startDate"', 'startDate')
      .addSelect('s."endDate"', 'endDate')
      .addSelect('s.status', 'status')
      .addSelect('s."amountPaid"', 'amountPaid')
      .addSelect('s."gymIds"', 'gymIds')
      .addSelect('s."gymPlanId"', 'gymPlanId')
      .addSelect('s."scheduledVisitDate"', 'scheduledVisitDate')
      .addSelect('s."scheduledSlotId"', 'scheduledSlotId')
      .addSelect('s."scheduledStartTime"', 'scheduledStartTime')
      .addSelect('s."scheduledEndTime"', 'scheduledEndTime')
      .addSelect('s."razorpayOrderId"', 'cashfreeOrderId')
      .addSelect('s."razorpayPaymentId"', 'cashfreePaymentId')
      .addSelect('s."createdAt"', 'createdAt')
      .orderBy('s."createdAt"', 'DESC');
    if (status === 'expired') {
      qb.andWhere('s."endDate" < CURRENT_DATE').andWhere('s.status != :cancelled', { cancelled: 'cancelled' });
    } else if (status === 'active') {
      qb.andWhere('s.status = :status', { status }).andWhere('s."endDate" >= CURRENT_DATE');
    } else if (status) {
      qb.andWhere('s.status = :status', { status });
    }
    if (gymId) {
      qb.andWhere(new Brackets((where) => {
        where
          .where('CAST(:gymId AS uuid) = ANY(COALESCE(s."gymIds", ARRAY[]::uuid[]))', { gymId })
          .orWhere(`(
            s."planType" = :multiGym
            AND EXISTS (
              SELECT 1
              FROM checkins c
              WHERE c."subscriptionId" = s.id
                AND c."gymId" = :gymId
                AND c.status = :checkinSuccess
            )
          )`, { multiGym: 'multi_gym', checkinSuccess: 'success' });
      }));
    }
    const [rows, total] = await Promise.all([
      qb.clone().skip(skip).take(take).getRawMany(),
      qb.clone().getCount(),
    ]);

    const userIds = [...new Set(rows.map((s: any) => s.userId).filter(Boolean))];
    const allGymIds = [...new Set(rows.flatMap((s: any) => s.gymIds || []).filter(Boolean))];
    const gymPlanIds = [...new Set(rows.map((s: any) => s.gymPlanId).filter(Boolean))];
    const [users, gyms, gymPlans] = await Promise.all([
      userIds.length ? this.userRepo.find({ where: { id: In(userIds) } }) : [],
      allGymIds.length ? this.gymRepo.find({ where: { id: In(allGymIds) } }) : [],
      gymPlanIds.length ? this.gymPlanRepo.find({ where: { id: In(gymPlanIds as string[]) } }) : [],
    ]);
    const userMap = new Map<string, UserEntity>(users.map((u): [string, UserEntity] => [u.id, u]));
    const gymMap = new Map<string, any>(gyms.map((g): [string, any] => [g.id, this.normalizeGymSummary(g)]));
    const planMap = new Map<string, GymPlanEntity>(gymPlans.map((plan): [string, GymPlanEntity] => [plan.id, plan]));
    const planLabels: Record<string, string> = {
      day_pass: '1-Day Pass',
      same_gym: 'Same Gym Pass',
      multi_gym: 'Multi Gym Pass',
    };

    const data = rows.map((sub: any) => {
      const user = userMap.get(sub.userId);
      const subGyms = (sub.gymIds || []).map((id: string) => gymMap.get(id)).filter(Boolean);
      const plan = sub.gymPlanId ? planMap.get(sub.gymPlanId) : null;
      const effectiveStatus = sub.status === 'active' && String(sub.endDate).slice(0, 10) < new Date().toISOString().slice(0, 10)
        ? 'expired'
        : sub.status;
      return {
        ...sub,
        status: effectiveStatus,
        amountPaid: Number(sub.amountPaid || 0),
        user: user ? { id: user.id, name: user.name, phone: user.phone, email: user.email } : null,
        userName: user?.name || user?.phone || user?.email || `User-${String(sub.userId).slice(0, 6)}`,
        userPhone: user?.phone || null,
        userEmail: user?.email || null,
        gym: subGyms[0] || null,
        gyms: subGyms.map((g: any) => ({ id: g.id, name: g.name, city: g.city, area: g.area })),
        gymName: sub.planType === 'multi_gym'
          ? 'All Partner Gyms'
          : (subGyms[0]?.name || null),
        plan: plan ? { id: plan.id, name: plan.name, price: Number(plan.price || 0), salePrice: Number((plan as any).salePrice || plan.price || 0), durationDays: plan.durationDays } : null,
        planName: plan?.name || planLabels[sub.planType] || sub.planType,
        accessType: sub.planType === 'multi_gym' ? 'Multi Gym' : 'Single Gym',
        paymentStatus: effectiveStatus === 'active' ? 'paid' : effectiveStatus,
      };
    });
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
    if ((sub.planType === 'same_gym' || sub.planType === 'day_pass') && sub.gymIds?.[0]) {
      await this.assertNoActiveGymPass(userId, sub.gymIds[0], sub.id);
    }
    const newEnd = new Date(sub.endDate);
    newEnd.setDate(newEnd.getDate() + 30);
    await this.repo.update(subscriptionId, {
      status: 'active',
      endDate: newEnd.toISOString().slice(0, 10),
    });
    return { success: true, message: 'Subscription reactivated. End date extended by 30 days.' };
  }

  async cancel(subscriptionId: string, actor: any) {
    const sub = actor?.role === 'super_admin'
      ? await this.repo.findOne({ where: { id: subscriptionId } })
      : await this.repo.findOne({ where: { id: subscriptionId, userId: actor?.userId } });
    if (!sub) throw new BadRequestException('Subscription not found');
    await this.repo.update(subscriptionId, { status: 'cancelled' as any });
    return { success: true, subscriptionId, status: 'cancelled' };
  }

  async listMultiGymNetwork() {
    const entries = await this.networkRepo.find({ where: { isActive: true } });
    const gymIds = entries.map(e => e.gymId);
    if (gymIds.length === 0) return [];
    const gyms = await this.gymRepo.findByIds(gymIds);
    return gyms.filter((gym) => this.hasPublicGymLocation(gym)).map((gym) => this.normalizeGymSummary(gym));
  }

  async addToNetwork(gymId: string) {
    const gym = await this.gymRepo.findOne({ where: { id: gymId } });
    if (!this.hasPublicGymLocation(gym)) {
      throw new BadRequestException('Only active gyms with valid coordinates can be added to the multi-gym network');
    }
    const existing = await this.networkRepo.findOne({ where: { gymId } });
    if (existing) { existing.isActive = true; return this.networkRepo.save(existing); }
    return this.networkRepo.save(this.networkRepo.create({ gymId, isActive: true }));
  }

  async removeFromNetwork(gymId: string) {
    await this.networkRepo.update({ gymId }, { isActive: false });
    return { success: true };
  }

  async generateInvoice(id: string, userId: string) {
    const sub = await this.repo.findOne({ where: { id, userId } });
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
  cancel(@Param('id') id: string, @Req() req: any) { return this.svc.cancel(id, req.user); }

  @Get('admin/invoices')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  adminInvoices() { return this.svc.adminInvoices(); }

  @Get('multigym-network')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  listNetwork() { return this.svc.listMultiGymNetwork(); }

  @Post('multigym-network')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  addToNetwork(@Body() body: { gymId: string }) { return this.svc.addToNetwork(body.gymId); }

  @Delete('multigym-network/:gymId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  removeFromNetwork(@Param('gymId') gymId: string) { return this.svc.removeFromNetwork(gymId); }

  @Get(':id/invoice')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  invoice(@Param('id') id: string, @Req() req: any) { return this.svc.generateInvoice(id, req.user.userId); }
}

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionEntity, UserEntity, AppConfigEntity, CouponEntity, GymEntity, GymPlanEntity, MultiGymNetworkEntity, TrainerEntity, TrainerBookingEntity, SessionSlotEntity]), PaymentsModule, SessionsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
