import { Injectable, Inject, BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { CheckinEntity } from '../../database/entities/checkin.entity';
import { SubscriptionEntity } from '../../database/entities/subscription.entity';
import { GymEntity } from '../../database/entities/gym.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { FraudAlertEntity } from '../../database/entities/misc.entity';
import { BookingQrEntity } from '../../database/entities/booking-qr.entity';
import { SessionBookingEntity } from '../../database/entities/session-booking.entity';
import { SessionSlotEntity } from '../../database/entities/session-slot.entity';
import { AppConfigEntity } from '../../database/entities/app-config.entity';
import { PLATFORM_PRICING_CONFIG_KEY, normalizePlatformPricingConfig } from '../../common/commission-config';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

const QR_EXPIRY_SECONDS = 30;
const VELOCITY_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const VELOCITY_THRESHOLD = 3;
const CHECKIN_GRACE_BEFORE_MINUTES = 15;
const CHECKIN_GRACE_AFTER_MINUTES = 30;

function isPastDateOnly(endDate: string | Date) {
  const iso = endDate instanceof Date ? endDate.toISOString().slice(0, 10) : String(endDate).slice(0, 10);
  return iso < new Date().toISOString().slice(0, 10);
}

function subscriptionCoversDate(sub: SubscriptionEntity, date: string) {
  const start = String(sub.startDate || '').slice(0, 10);
  const end = String(sub.endDate || '').slice(0, 10);
  return (!start || start <= date) && (!end || end >= date);
}

function nowISTParts() {
  const d = new Date(Date.now() + 5.5 * 3600 * 1000);
  return {
    date: d.toISOString().slice(0, 10),
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

function todayIST() {
  return nowISTParts().date;
}

function minutesOf(time: string) {
  const [h, m] = String(time || '00:00').split(':').map(Number);
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
}

function memberCode(userId?: string | null) {
  const id = String(userId || '').replace(/-/g, '').toUpperCase();
  return id ? `BMF-${id.slice(0, 10)}` : 'BMF-UNKNOWN';
}

function subscriptionCode(subscriptionId?: string | null) {
  const id = String(subscriptionId || '').replace(/-/g, '').toUpperCase();
  return id ? `BMF-${id.slice(0, 10)}` : '';
}

function memberName(user?: UserEntity | null, userId?: string | null) {
  const name = String(user?.name || '').trim();
  if (/\b[6-9]\d{9}\b/.test(name)) {
    return `Member ${memberCode(userId).replace('BMF-', '').slice(0, 6)}`;
  }
  return name || `Member ${memberCode(userId).replace('BMF-', '').slice(0, 6)}`;
}

@Injectable()
export class QrService {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(CheckinEntity) private readonly checkins: Repository<CheckinEntity>,
    @InjectRepository(SubscriptionEntity) private readonly subs: Repository<SubscriptionEntity>,
    @InjectRepository(GymEntity) private readonly gyms: Repository<GymEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(FraudAlertEntity) private readonly fraudAlerts: Repository<FraudAlertEntity>,
    @InjectRepository(BookingQrEntity) private readonly bookingQrs: Repository<BookingQrEntity>,
    @InjectRepository(SessionBookingEntity) private readonly sessionBookings: Repository<SessionBookingEntity>,
    @InjectRepository(SessionSlotEntity) private readonly sessionSlots: Repository<SessionSlotEntity>,
    @InjectRepository(AppConfigEntity) private readonly configs: Repository<AppConfigEntity>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  private visitSplit(ratePerDay: number, planType?: string | null) {
    const payout = planType === 'multi_gym' ? Math.max(0, Number(ratePerDay) || 0) : 0;
    return { adminEarns: 0, gymEarns: payout };
  }

  private istDayRangeUtc(today: string) {
    const [year, month, day] = today.split('-').map((part) => Number(part));
    const start = new Date(Date.UTC(year, month - 1, day) - 5.5 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    return { start, end };
  }

  private async existingDailyCheckinGymId(userId: string, today: string) {
    const dailyKey = `checkin:daily:${userId}:${today}`;
    const redisGymId = await this.redis.get(dailyKey);
    if (redisGymId) return redisGymId;

    const { start, end } = this.istDayRangeUtc(today);
    const row = await this.checkins.findOne({
      where: { userId, status: 'success', checkinTime: Between(start, end) },
      order: { checkinTime: 'DESC' },
    });
    if (row?.gymId) await this.redis.set(dailyKey, row.gymId, 'EX', 24 * 60 * 60);
    return row?.gymId || null;
  }

  private async existingDailyCheckinAtGym(userId: string, gymId: string, today: string) {
    const dailyKey = `checkin:daily:${userId}:${today}:${gymId}`;
    const redisHit = await this.redis.get(dailyKey);
    if (redisHit) return true;

    const { start, end } = this.istDayRangeUtc(today);
    const count = await this.checkins.count({
      where: { userId, gymId, status: 'success', checkinTime: Between(start, end) },
    });
    if (count > 0) await this.redis.set(dailyKey, '1', 'EX', 24 * 60 * 60);
    return count > 0;
  }

  private async ensureDailyCheckinAllowed(userId: string, gymId: string, today: string, planType?: string | null) {
    if (planType === 'same_gym') {
      const checkedInHere = await this.existingDailyCheckinAtGym(userId, gymId, today);
      if (checkedInHere) throw new ConflictException('Already checked in at this gym today');
      return;
    }

    const existingCheckinGymId = await this.existingDailyCheckinGymId(userId, today);
    if (existingCheckinGymId) {
      throw new ConflictException(existingCheckinGymId === gymId
        ? 'Already checked in at this gym today'
        : 'Already checked in at another gym today');
    }
  }

  private async lockDailyCheckin(userId: string, gymId: string, today: string, planType?: string | null) {
    await this.redis.set(`checkin:daily:${userId}:${today}`, gymId, 'EX', 24 * 60 * 60);
    if (planType === 'same_gym') {
      await this.redis.set(`checkin:daily:${userId}:${today}:${gymId}`, '1', 'EX', 24 * 60 * 60);
    }
  }

  private async multiGymVisitPayout(gym: GymEntity | any) {
    const override = Number(gym?.ratePerDay);
    if (Number.isFinite(override) && override > 0) return override;
    const row = await this.configs.findOne({ where: { key: PLATFORM_PRICING_CONFIG_KEY } });
    const config = normalizePlatformPricingConfig(row?.value);
    return Math.max(0, Number(config.multi_gym?.visitPayout) || 0);
  }

  private async findManualMembershipSubscription(code: string, gymId: string) {
    const compact = String(code || '')
      .trim()
      .replace(/^#+/, '')
      .replace(/^BMF[-_]?/i, '')
      .replace(/[^a-fA-F0-9]/g, '')
      .toLowerCase();
    if (compact.length < 6) return null;
    const today = todayIST();
    return this.subs.createQueryBuilder('sub')
      .where('sub."planType" = :planType', { planType: 'same_gym' })
      .andWhere('sub.status = :status', { status: 'active' })
      .andWhere('sub."startDate" <= :today', { today })
      .andWhere('sub."endDate" >= :today', { today })
      .andWhere('CAST(:gymId AS uuid) = ANY(sub."gymIds")', { gymId })
      .andWhere("LOWER(REPLACE(sub.id::text, '-', '')) LIKE :prefix", { prefix: `${compact}%` })
      .orderBy('sub."createdAt"', 'DESC')
      .getOne();
  }

  private fixedGymQrToken(gymId: string) {
    return this.jwt.sign({ type: 'gym_fixed', gym: gymId }, { noTimestamp: true });
  }

  async getFixedGymQr(gymId: string) {
    const gym = await this.gyms.findOne({ where: { id: gymId } });
    if (!gym) throw new NotFoundException('Gym not found');
    return {
      gymId: gym.id,
      gymName: gym.name,
      token: this.fixedGymQrToken(gym.id),
      type: 'gym_fixed',
      message: 'Fixed gym QR for member self check-in',
    };
  }

  private async activeBookingForUserAtGymNow(userId: string, gymId: string) {
    const now = nowISTParts();
    const candidates = await this.sessionBookings.createQueryBuilder('b')
      .innerJoin(SessionSlotEntity, 's', 'b."slotId" = s.id')
      .where('b."userId" = :userId AND b."gymId" = :gymId AND b."slotDate" = :today', { userId, gymId, today: now.date })
      .andWhere("b.status = 'confirmed'")
      .orderBy('b."bookedAt"', 'DESC')
      .select('b')
      .getMany();

    for (const booking of candidates) {
      const slot = await this.sessionSlots.findOne({ where: { id: booking.slotId } });
      if (!slot) continue;
      const start = minutesOf(slot.startTime) - CHECKIN_GRACE_BEFORE_MINUTES;
      const end = minutesOf(slot.endTime) + CHECKIN_GRACE_AFTER_MINUTES;
      if (slot.date === now.date && now.minutes >= start && now.minutes <= end) return booking;
    }
    return null;
  }

  /** Mobile app calls this to generate a short-lived QR token */
  async generateQr(userId: string, subscriptionId: string) {
    const sub = await this.subs.findOne({ where: { id: subscriptionId, userId } });
    if (!sub) throw new BadRequestException('Subscription not found');
    if (sub.status !== 'active') throw new BadRequestException('Subscription is not active');
    if (isPastDateOnly(sub.endDate)) throw new BadRequestException('Subscription has expired');
    if (!subscriptionCoversDate(sub, todayIST())) throw new BadRequestException('Subscription is not valid today');
    if (sub.planType !== 'same_gym') {
      throw new BadRequestException('Book a slot first for Multi Gym and 1-Day Pass check-ins');
    }
    const gymId = sub.gymIds?.[0];
    if (!gymId) throw new BadRequestException('This subscription is not linked to a gym');
    const gym = await this.gyms.findOne({ where: { id: gymId } });
    if (!gym || gym.status !== 'active') throw new BadRequestException('Gym not available');

    const jti = uuidv4();
    const payload = {
      sub: userId,
      sid: subscriptionId,
      gym: gymId,
      jti,
      type: 'membership',
      ref: subscriptionCode(subscriptionId),
      iat: Math.floor(Date.now() / 1000),
    };
    const token = this.jwt.sign(payload, { expiresIn: `${QR_EXPIRY_SECONDS}s` });
    return {
      token,
      expiresIn: QR_EXPIRY_SECONDS,
      expiresAt: new Date(Date.now() + QR_EXPIRY_SECONDS * 1000).toISOString(),
      gymId,
      gymName: gym.name,
      subscriptionId,
      planType: sub.planType,
      manualCode: subscriptionCode(subscriptionId),
    };
  }

  decodeQrGymId(qrToken: string) {
    try {
      const payload: any = this.jwt.decode(qrToken);
      return typeof payload?.gym === 'string' && payload.gym ? payload.gym : null;
    } catch {
      return null;
    }
  }

  /** Gym panel scanner calls this with the QR token */
  async validateQr(qrToken: string, gymId: string) {
    // 1. Verify JWT signature + expiry
    let payload: any;
    try {
      payload = this.jwt.verify(qrToken);
    } catch (err: any) {
      await this.logFailure(qrToken, gymId, 'failed_expired', err.message);
      throw new UnauthorizedException('QR code expired or invalid');
    }

    const { sub: userId, sid: subscriptionId, jti } = payload;
    const isBookingQr = payload.type === 'booking' || !!payload.bid;
    const isMembershipQr = payload.type === 'membership';

    // 2. Idempotency: has this JTI been used?
    if (!jti) {
      await this.logFailure(qrToken, gymId, 'failed_invalid', 'QR missing token id');
      throw new UnauthorizedException('QR code is invalid');
    }
    const alreadyUsed = await this.redis.exists(`qr:used:${jti}`);
    if (alreadyUsed) {
      await this.logFailure(qrToken, gymId, 'failed_invalid', 'Duplicate QR');
      throw new ConflictException('QR already used');
    }

    if (isMembershipQr && payload.gym !== gymId) {
      await this.logFailure(qrToken, gymId, 'failed_invalid', 'Membership QR is for another gym');
      throw new UnauthorizedException('This membership QR is for another gym');
    }

    let bookingQr: BookingQrEntity | null = null;
    let booking: SessionBookingEntity | null = null;
    if (isBookingQr) {
      if (payload.gym !== gymId) {
        await this.logFailure(qrToken, gymId, 'failed_invalid', 'QR booked for another gym');
        throw new UnauthorizedException('This booking QR is for another gym');
      }

      bookingQr = await this.bookingQrs.findOne({ where: { qrToken } });
      if (
        !bookingQr ||
        bookingQr.userId !== userId ||
        bookingQr.subscriptionId !== subscriptionId ||
        bookingQr.gymId !== gymId ||
        (payload.bid && bookingQr.slotBookingId !== payload.bid)
      ) {
        await this.logFailure(qrToken, gymId, 'failed_invalid', 'Booking QR record mismatch');
        throw new UnauthorizedException('Booking QR is invalid');
      }
      if (bookingQr.usedAt) {
        await this.logFailure(qrToken, gymId, 'failed_invalid', 'Booking QR already used');
        throw new ConflictException('QR already used');
      }
      if (new Date(bookingQr.expiresAt) <= new Date()) {
        await this.logFailure(qrToken, gymId, 'failed_expired', 'Booking QR expired');
        throw new UnauthorizedException('QR code expired or invalid');
      }

      booking = bookingQr.slotBookingId ? await this.sessionBookings.findOne({ where: { id: bookingQr.slotBookingId } }) : null;
      if (!booking || booking.gymId !== gymId || booking.userId !== userId || booking.subscriptionId !== subscriptionId) {
        await this.logFailure(qrToken, gymId, 'failed_invalid', 'Booking record mismatch');
        throw new UnauthorizedException('Booking is invalid');
      }
      if (booking.status === 'attended') {
        await this.logFailure(qrToken, gymId, 'failed_invalid', 'Booking already attended');
        throw new ConflictException('Booking already checked in');
      }
      if (booking.status !== 'confirmed') {
        await this.logFailure(qrToken, gymId, 'failed_invalid', `Booking status is ${booking.status}`);
        throw new UnauthorizedException('Booking is not active');
      }

      const slot = await this.sessionSlots.findOne({ where: { id: booking.slotId } });
      if (!slot) {
        await this.logFailure(qrToken, gymId, 'failed_invalid', 'Slot missing');
        throw new UnauthorizedException('Booking slot is invalid');
      }
      const now = nowISTParts();
      const start = minutesOf(slot.startTime) - CHECKIN_GRACE_BEFORE_MINUTES;
      const end = minutesOf(slot.endTime) + CHECKIN_GRACE_AFTER_MINUTES;
      if (slot.date !== now.date || now.minutes < start || now.minutes > end) {
        await this.logFailure(qrToken, gymId, 'failed_invalid', 'Outside booked slot check-in window');
        throw new BadRequestException('This QR can be used only around the booked slot time');
      }
    }

    // 3. Validate subscription + plan allows this gym
    const sub = await this.subs.findOne({ where: { id: subscriptionId } });
    if (!sub || sub.userId !== userId || sub.status !== 'active' || isPastDateOnly(sub.endDate)) {
      await this.logFailure(qrToken, gymId, 'failed_invalid', 'No active subscription');
      throw new UnauthorizedException('Subscription not active');
    }
    if (booking && !subscriptionCoversDate(sub, booking.slotDate)) {
      await this.logFailure(qrToken, gymId, 'failed_invalid', 'Subscription not valid for booking date');
      throw new UnauthorizedException('Subscription is not valid for this booking date');
    }
    const coveredGyms = sub.gymIds || [];
    if (sub.planType === 'same_gym' && !coveredGyms.includes(gymId)) {
      await this.logFailure(qrToken, gymId, 'failed_invalid', 'Gym not in plan');
      throw new UnauthorizedException('This plan does not cover this gym');
    }
    if (sub.planType === 'same_gym' && isBookingQr) {
      await this.logFailure(qrToken, gymId, 'failed_invalid', 'Same gym QR should not use slot booking');
      throw new BadRequestException('Single Gym Pass does not require slot booking. Use membership check-in QR.');
    }
    if (sub.planType === 'day_pass' && coveredGyms.length > 0 && !coveredGyms.includes(gymId)) {
      await this.logFailure(qrToken, gymId, 'failed_invalid', 'Day pass is for a different gym');
      throw new UnauthorizedException('This day pass does not cover this gym');
    }
    if (sub.planType !== 'same_gym' && !isBookingQr) {
      await this.logFailure(qrToken, gymId, 'failed_invalid', 'Booking required for multi/day QR');
      throw new BadRequestException('Book a slot before checking in with this pass');
    }

    // 4. Daily lock: same-gym members are locked per gym; booked passes remain locked per day.
    const today = todayIST();
    try {
      await this.ensureDailyCheckinAllowed(userId, gymId, today, sub.planType);
    } catch (err: any) {
      await this.logFailure(qrToken, gymId, 'failed_daily_limit', err?.message || 'Daily check-in limit reached');
      throw err;
    }

    const gym = await this.gyms.findOne({ where: { id: gymId } });
    if (!gym || gym.status !== 'active') {
      await this.logFailure(qrToken, gymId, 'failed_invalid', 'Gym inactive');
      throw new BadRequestException('Gym not available');
    }

    // 5. Mark used + daily lock
    const ttl = payload.exp ? Math.max(60, payload.exp - Math.floor(Date.now() / 1000)) : 60;
    await this.redis.set(`qr:used:${jti}`, '1', 'EX', ttl);
    await this.lockDailyCheckin(userId, gymId, today, sub.planType);
    if (bookingQr) {
      const update = await this.bookingQrs
        .createQueryBuilder()
        .update(BookingQrEntity)
        .set({ usedAt: new Date() })
        .where('id = :id', { id: bookingQr.id })
        .andWhere('"usedAt" IS NULL')
        .execute();
      if (!update.affected) throw new ConflictException('QR already used');

      await this.sessionBookings.update(
        { id: bookingQr.slotBookingId },
        { status: 'attended' as any, checkinAt: new Date() },
      );
    }

    // 6. Record check-in
    const checkin = await this.checkins.save(
      this.checkins.create({
        userId,
        gymId,
        subscriptionId,
        qrToken,
        status: 'success',
      }),
    );
    const user = await this.users.findOne({ where: { id: userId } });
    const ratePerDay = await this.multiGymVisitPayout(gym);
    const { gymEarns, adminEarns } = this.visitSplit(ratePerDay, sub.planType);

    // 7. Async velocity fraud check (non-blocking)
    this.checkVelocityFraud(userId, gymId, gym.name);

    return {
      success: true,
      checkinId: checkin.id,
      user: { id: userId, memberCode: memberCode(userId), name: memberName(user, userId) },
      gym: { id: gym.id, name: gym.name },
      planType: sub.planType,
      bookingRef: booking?.bookingRef,
      gymEarns,
      adminEarns,
      checkinTime: checkin.checkinTime,
    };
  }

  /** Gym staff fallback: enter the booking reference / booking ID printed in the app. */
  async validateManualCode(code: string, gymId: string) {
    const clean = String(code || '').trim().replace(/^#+/, '').trim();
    if (!clean) throw new BadRequestException('Booking ID is required');

    const candidates = await this.sessionBookings.createQueryBuilder('b')
      .where('b."gymId" = :gymId', { gymId })
      .andWhere('(LOWER(b.id::text) = LOWER(:code) OR UPPER(b."bookingRef") = UPPER(:code))', { code: clean })
      .orderBy('b."bookedAt"', 'DESC')
      .take(10)
      .getMany();
    if (candidates.length === 0) {
      const membershipSub = await this.findManualMembershipSubscription(clean, gymId);
      if (!membershipSub) throw new NotFoundException('Booking or membership code not found for this gym');

      const gym = await this.gyms.findOne({ where: { id: gymId } });
      if (!gym || gym.status !== 'active') throw new BadRequestException('Gym not available');
      const today = todayIST();
      await this.ensureDailyCheckinAllowed(membershipSub.userId, gymId, today, membershipSub.planType);
      await this.lockDailyCheckin(membershipSub.userId, gymId, today, membershipSub.planType);

      const qrToken = `MANUAL_MEMBERSHIP_${membershipSub.id}_${Date.now()}`;
      const checkin = await this.checkins.save(
        this.checkins.create({
          userId: membershipSub.userId,
          gymId,
          subscriptionId: membershipSub.id,
          qrToken,
          status: 'success',
        }),
      );
      const user = await this.users.findOne({ where: { id: membershipSub.userId } });
      this.checkVelocityFraud(membershipSub.userId, gymId, gym.name);

      return {
        success: true,
        manual: true,
        membership: true,
        checkinId: checkin.id,
        user: { id: membershipSub.userId, memberCode: memberCode(membershipSub.userId), name: memberName(user, membershipSub.userId) },
        gym: { id: gym.id, name: gym.name },
        planType: membershipSub.planType,
        gymEarns: 0,
        adminEarns: 0,
        checkinTime: checkin.checkinTime,
        message: 'Membership check-in recorded',
      };
    }

    const now = nowISTParts();
    let booking: SessionBookingEntity | null = null;
    let lastStatus: string | null = null;
    let hadWindowMiss = false;
    for (const candidate of candidates) {
      lastStatus = candidate.status;
      if (candidate.status !== 'confirmed') continue;
      const candidateSlot = await this.sessionSlots.findOne({ where: { id: candidate.slotId } });
      if (!candidateSlot) continue;
      const start = minutesOf(candidateSlot.startTime) - CHECKIN_GRACE_BEFORE_MINUTES;
      const end = minutesOf(candidateSlot.endTime) + CHECKIN_GRACE_AFTER_MINUTES;
      if (candidateSlot.date === now.date && now.minutes >= start && now.minutes <= end) {
        booking = candidate;
        break;
      }
      hadWindowMiss = true;
    }

    if (!booking) {
      if (hadWindowMiss) throw new BadRequestException('This booking can be checked in only around the booked slot time');
      if (lastStatus === 'attended') throw new ConflictException('This booking is already checked in');
      if (lastStatus === 'cancelled') throw new ConflictException('This booking was cancelled');
      if (lastStatus === 'not_attended') throw new ConflictException('This booking has already expired');
      throw new BadRequestException('No active booking found for this code');
    }

    const slot = await this.sessionSlots.findOne({ where: { id: booking.slotId } });
    if (!slot) throw new UnauthorizedException('Booking slot is invalid');
    const start = minutesOf(slot.startTime) - CHECKIN_GRACE_BEFORE_MINUTES;
    const end = minutesOf(slot.endTime) + CHECKIN_GRACE_AFTER_MINUTES;
    if (slot.date !== now.date || now.minutes < start || now.minutes > end) {
      throw new BadRequestException('This booking can be checked in only around the booked slot time');
    }

    const sub = booking.subscriptionId
      ? await this.subs.findOne({ where: { id: booking.subscriptionId } })
      : null;
    if (!sub || sub.userId !== booking.userId || sub.status !== 'active' || isPastDateOnly(sub.endDate)) {
      throw new UnauthorizedException('Subscription not active');
    }
    if (!subscriptionCoversDate(sub, booking.slotDate)) {
      throw new UnauthorizedException('Subscription is not valid for this booking date');
    }

    const coveredGyms = sub.gymIds || [];
    if (sub.planType === 'same_gym' && !coveredGyms.includes(gymId)) {
      throw new UnauthorizedException('This plan does not cover this gym');
    }
    if (sub.planType === 'day_pass' && coveredGyms.length > 0 && !coveredGyms.includes(gymId)) {
      throw new UnauthorizedException('This day pass does not cover this gym');
    }

    const gym = await this.gyms.findOne({ where: { id: gymId } });
    if (!gym || gym.status !== 'active') throw new BadRequestException('Gym not available');

    const today = todayIST();
    await this.ensureDailyCheckinAllowed(booking.userId, gymId, today, sub.planType);

    const update = await this.sessionBookings
      .createQueryBuilder()
      .update(SessionBookingEntity)
      .set({ status: 'attended' as any, checkinAt: new Date() })
      .where('id = :id', { id: booking.id })
      .andWhere('status = :status', { status: 'confirmed' })
      .execute();
    if (!update.affected) throw new ConflictException('This booking is already checked in');
    await this.bookingQrs
      .createQueryBuilder()
      .update(BookingQrEntity)
      .set({ usedAt: new Date() })
      .where('"slotBookingId" = :bookingId', { bookingId: booking.id })
      .andWhere('"userId" = :userId', { userId: booking.userId })
      .andWhere('"gymId" = :gymId', { gymId })
      .andWhere('"usedAt" IS NULL')
      .execute();
    await this.lockDailyCheckin(booking.userId, gymId, today, sub.planType);

    const qrToken = `MANUAL_${booking.id}_${Date.now()}`;
    const checkin = await this.checkins.save(
      this.checkins.create({
        userId: booking.userId,
        gymId,
        subscriptionId: sub.id,
        qrToken,
        status: 'success',
      }),
    );
    const user = await this.users.findOne({ where: { id: booking.userId } });
    const ratePerDay = await this.multiGymVisitPayout(gym);
    const { gymEarns, adminEarns } = this.visitSplit(ratePerDay, sub.planType);
    this.checkVelocityFraud(booking.userId, gymId, gym.name);

    return {
      success: true,
      manual: true,
      checkinId: checkin.id,
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      user: { id: booking.userId, memberCode: memberCode(booking.userId), name: memberName(user, booking.userId) },
      gym: { id: gym.id, name: gym.name },
      planType: sub.planType,
      gymEarns,
      adminEarns,
      checkinTime: checkin.checkinTime,
      message: 'Manual check-in recorded',
    };
  }

  /** Member scans the gym's fixed QR. Same-gym passes check in directly; multi/day passes require an active booking window. */
  async validateGymQr(gymToken: string, userId: string) {
    let payload: any;
    try {
      payload = this.jwt.verify(gymToken);
    } catch (err: any) {
      throw new UnauthorizedException('Gym QR code is invalid');
    }

    const gymId = typeof payload?.gym === 'string' ? payload.gym : '';
    if (payload?.type !== 'gym_fixed' || !gymId) {
      throw new UnauthorizedException('This is not a valid gym check-in QR');
    }

    const gym = await this.gyms.findOne({ where: { id: gymId } });
    if (!gym || gym.status !== 'active') throw new BadRequestException('Gym not available');

    const today = todayIST();
    const directSub = await this.subs.createQueryBuilder('sub')
      .where('sub."userId" = :userId', { userId })
      .andWhere('sub."planType" = :planType', { planType: 'same_gym' })
      .andWhere('sub.status = :status', { status: 'active' })
      .andWhere('sub."startDate" <= :today', { today })
      .andWhere('sub."endDate" >= :today', { today })
      .andWhere('CAST(:gymId AS uuid) = ANY(sub."gymIds")', { gymId })
      .orderBy('sub."createdAt"', 'DESC')
      .getOne();

    if (directSub) {
      await this.ensureDailyCheckinAllowed(userId, gymId, today, directSub.planType);
      await this.lockDailyCheckin(userId, gymId, today, directSub.planType);
      const checkin = await this.checkins.save(
        this.checkins.create({
          userId,
          gymId,
          subscriptionId: directSub.id,
          qrToken: `GYM_FIXED_MEMBERSHIP_${gymId}_${userId}_${Date.now()}`,
          status: 'success',
        }),
      );
      const user = await this.users.findOne({ where: { id: userId } });
      this.checkVelocityFraud(userId, gymId, gym.name);
      return {
        success: true,
        source: 'gym_qr',
        checkinId: checkin.id,
        user: { id: userId, memberCode: memberCode(userId), name: memberName(user, userId) },
        gym: { id: gym.id, name: gym.name },
        planType: directSub.planType,
        gymEarns: 0,
        adminEarns: 0,
        checkinTime: checkin.checkinTime,
        message: 'Membership check-in recorded',
      };
    }

    const booking = await this.activeBookingForUserAtGymNow(userId, gymId);
    if (!booking) {
      throw new BadRequestException('Book a slot first for Multi Gym or 1-Day Pass check-in');
    }

    const sub = booking.subscriptionId ? await this.subs.findOne({ where: { id: booking.subscriptionId } }) : null;
    if (!sub || sub.userId !== userId || sub.status !== 'active' || isPastDateOnly(sub.endDate)) {
      throw new UnauthorizedException('Subscription not active');
    }
    if (!subscriptionCoversDate(sub, booking.slotDate)) {
      throw new UnauthorizedException('Subscription is not valid for this booking date');
    }
    if (sub.planType === 'day_pass' && Array.isArray(sub.gymIds) && sub.gymIds.length > 0 && !sub.gymIds.includes(gymId)) {
      throw new UnauthorizedException('This day pass does not cover this gym');
    }
    if (sub.planType === 'same_gym') {
      throw new BadRequestException('Single Gym Pass does not require slot booking. Use membership check-in QR.');
    }

    await this.ensureDailyCheckinAllowed(userId, gymId, today, sub.planType);
    const update = await this.sessionBookings
      .createQueryBuilder()
      .update(SessionBookingEntity)
      .set({ status: 'attended' as any, checkinAt: new Date() })
      .where('id = :id', { id: booking.id })
      .andWhere('status = :status', { status: 'confirmed' })
      .execute();
    if (!update.affected) throw new ConflictException('This booking is already checked in');
    await this.bookingQrs
      .createQueryBuilder()
      .update(BookingQrEntity)
      .set({ usedAt: new Date() })
      .where('"slotBookingId" = :bookingId', { bookingId: booking.id })
      .andWhere('"userId" = :userId', { userId })
      .andWhere('"gymId" = :gymId', { gymId })
      .andWhere('"usedAt" IS NULL')
      .execute();
    await this.lockDailyCheckin(userId, gymId, today, sub.planType);

    const checkin = await this.checkins.save(
      this.checkins.create({
        userId,
        gymId,
        subscriptionId: sub.id,
        qrToken: `GYM_FIXED_BOOKING_${gymId}_${booking.id}_${Date.now()}`,
        status: 'success',
      }),
    );
    const user = await this.users.findOne({ where: { id: userId } });
    const ratePerDay = await this.multiGymVisitPayout(gym);
    const { gymEarns, adminEarns } = this.visitSplit(ratePerDay, sub.planType);
    this.checkVelocityFraud(userId, gymId, gym.name);

    return {
      success: true,
      source: 'gym_qr',
      checkinId: checkin.id,
      bookingId: booking.id,
      bookingRef: booking.bookingRef,
      user: { id: userId, memberCode: memberCode(userId), name: memberName(user, userId) },
      gym: { id: gym.id, name: gym.name },
      planType: sub.planType,
      gymEarns,
      adminEarns,
      checkinTime: checkin.checkinTime,
      message: 'Booking check-in recorded',
    };
  }

  private async checkVelocityFraud(userId: string, gymId: string, gymName: string) {
    try {
      const since = new Date(Date.now() - VELOCITY_WINDOW_MS);
      const recentCount = await this.checkins
        .createQueryBuilder('c')
        .where('c.userId = :userId', { userId })
        .andWhere('c.status = :status', { status: 'success' })
        .andWhere('c.checkinTime >= :since', { since })
        .getCount();

      if (recentCount >= VELOCITY_THRESHOLD) {
        await this.fraudAlerts.save(
          this.fraudAlerts.create({
            userId,
            eventType: 'velocity_check',
            gymId,
            gymName,
            riskScore: Math.min(50 + recentCount * 10, 100),
            details: `User checked in ${recentCount} times within the last hour`,
            status: 'open',
          }),
        );
      }
    } catch {
      // swallow fraud check errors to not disrupt check-in flow
    }
  }

  private async logFailure(qrToken: string, gymId: string, status: any, reason: string) {
    try {
      await this.checkins.save(
        this.checkins.create({
          userId: '00000000-0000-0000-0000-000000000000',
          gymId,
          subscriptionId: '00000000-0000-0000-0000-000000000000',
          qrToken: `${qrToken}-fail-${Date.now()}`,
          status,
          failReason: reason,
        }),
      );
    } catch {/* swallow log failures */}
  }

  async getUserHistory(userId: string, limit = 50) {
    return this.checkins.find({
      where: { userId, status: 'success' },
      order: { checkinTime: 'DESC' },
      take: limit,
    });
  }
}
