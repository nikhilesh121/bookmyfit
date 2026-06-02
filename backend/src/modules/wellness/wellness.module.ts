import { Module, Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, Injectable, UseGuards, Req, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional } from 'class-validator';
import { WellnessPartnerEntity, WellnessServiceEntity, WellnessBookingEntity } from '../../database/entities/wellness.entity';
import { AppConfigEntity } from '../../database/entities/app-config.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { CashfreeService } from '../payments/cashfree.service';
import { PaymentsModule } from '../payments/payments.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { v4 as uuid } from 'uuid';
import { PLATFORM_PRICING_CONFIG_KEY, applyCheckoutCommission, commissionAmount, serviceCommission } from '../../common/commission-config';

class BookWellnessDto {
  @IsDateString() bookingDate: string;
  @IsOptional() @IsString() phone?: string;
}

@Injectable()
class WellnessService {
  constructor(
    @InjectRepository(WellnessPartnerEntity) private readonly partners: Repository<WellnessPartnerEntity>,
    @InjectRepository(WellnessServiceEntity) private readonly services: Repository<WellnessServiceEntity>,
    @InjectRepository(WellnessBookingEntity) private readonly bookings: Repository<WellnessBookingEntity>,
    @InjectRepository(AppConfigEntity) private readonly configRepo: Repository<AppConfigEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly cashfree: CashfreeService,
  ) {}
  private normalizeServiceTypes(value: any): string[] {
    const raw = Array.isArray(value)
      ? value
      : String(value || '')
        .split(',')
        .map((item) => item.trim());
    const normalized = raw
      .map((item) => String(item || '').trim().toLowerCase())
      .filter(Boolean);
    return Array.from(new Set(normalized));
  }

  private serviceTypesFor(partner: any): string[] {
    const types = this.normalizeServiceTypes(
      Array.isArray(partner?.serviceTypes) && partner.serviceTypes.length
        ? partner.serviceTypes
        : partner?.serviceType,
    );
    return types.length ? types : ['spa'];
  }

  private partnerResponse<T extends Record<string, any>>(partner: T): T {
    if (!partner) return partner;
    const serviceTypes = this.serviceTypesFor(partner);
    return {
      ...partner,
      serviceTypes,
      serviceType: serviceTypes[0] || partner.serviceType || 'spa',
    };
  }

  private partnerPatch(data: any, existing?: WellnessPartnerEntity) {
    const patch: any = {};
    ['name', 'city', 'area', 'address', 'status', 'distanceLabel'].forEach((key) => {
      if (data[key] !== undefined) patch[key] = String(data[key] ?? '').trim();
    });
    ['discountPercent', 'rating', 'reviewCount', 'commissionRate', 'lat', 'lng'].forEach((key) => {
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        const value = Number(data[key]);
        if (Number.isFinite(value)) patch[key] = value;
      }
    });
    if (data.photos !== undefined) {
      patch.photos = Array.isArray(data.photos)
        ? data.photos.map((item: any) => String(item || '').trim()).filter(Boolean)
        : String(data.photos || '').split(',').map((item) => item.trim()).filter(Boolean);
    }
    const serviceTypes = this.normalizeServiceTypes(data.serviceTypes ?? data.serviceType ?? existing?.serviceTypes ?? existing?.serviceType);
    if (serviceTypes.length) {
      patch.serviceTypes = serviceTypes;
      patch.serviceType = serviceTypes[0];
    } else if (!existing) {
      patch.serviceTypes = ['spa'];
      patch.serviceType = 'spa';
    }
    return patch;
  }

  private async resolveOwnerId(data: any, existing?: WellnessPartnerEntity) {
    if (data.ownerId !== undefined && data.ownerId !== null && String(data.ownerId).trim()) {
      const ownerId = String(data.ownerId).trim();
      const user = await this.users.findOne({ where: { id: ownerId } });
      if (!user) throw new BadRequestException('Selected wellness owner user was not found');
      if (user.role !== 'wellness_partner') throw new BadRequestException('Selected owner must be a wellness partner user');
      return ownerId;
    }

    const ownerEmail = String(data.ownerEmail || '').trim().toLowerCase();
    if (!ownerEmail) {
      const ownerPassword = String(data.ownerPassword || '').trim();
      if (ownerPassword && existing?.ownerId) {
        const user = await this.users.findOne({ where: { id: existing.ownerId } });
        if (!user) throw new BadRequestException('Linked wellness owner user was not found');
        user.passwordHash = await bcrypt.hash(ownerPassword, 10);
        user.isActive = true;
        await this.users.save(user);
      }
      return existing?.ownerId;
    }
    let user = await this.users.findOne({ where: { email: ownerEmail } });
    if (user && user.role !== 'wellness_partner') {
      throw new BadRequestException('Owner email is already used by another account type');
    }
    if (!user) {
      const ownerPassword = String(data.ownerPassword || '').trim();
      if (!ownerPassword || ownerPassword.length < 6) {
        throw new BadRequestException('Owner password of at least 6 characters is required for a new wellness login');
      }
      user = await this.users.save(this.users.create({
        email: ownerEmail,
        passwordHash: await bcrypt.hash(ownerPassword, 10),
        name: String(data.ownerName || data.name || ownerEmail.split('@')[0] || 'Wellness Partner').trim(),
        role: 'wellness_partner',
        isActive: true,
      }));
    } else if (data.ownerPassword !== undefined && String(data.ownerPassword || '').trim()) {
      user.passwordHash = await bcrypt.hash(String(data.ownerPassword).trim(), 10);
      user.isActive = true;
      await this.users.save(user);
    }
    return user.id;
  }

  private applyPartnerTypeFilter(qb: any, serviceType?: string) {
    const normalized = this.normalizeServiceTypes(serviceType)[0];
    if (!normalized) return;
    qb.andWhere(
      `(:serviceType = ANY(COALESCE(p."serviceTypes", ARRAY[]::text[])) OR LOWER(p."serviceType") = :serviceType)`,
      { serviceType: normalized },
    );
  }

  async listPartners(filter: { city?: string; serviceType?: string } = {}, page: any = 1, limit: any = 20) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const qb = this.partners.createQueryBuilder('p')
      .where("p.status = 'active'");
    if (filter.city) qb.andWhere('p.city = :city', { city: filter.city });
    this.applyPartnerTypeFilter(qb, filter.serviceType);
    const [data, total] = await qb.orderBy('p.rating', 'DESC').skip(skip).take(take).getManyAndCount();
    return paginatedResponse(data.map((partner) => this.partnerResponse(partner)), total, p, l);
  }
  async createPartner(data: Partial<WellnessPartnerEntity> & { ownerEmail?: string; ownerPassword?: string; ownerName?: string }) {
    const patch = this.partnerPatch(data);
    const ownerId = await this.resolveOwnerId(data);
    if (ownerId) patch.ownerId = ownerId;
    const partner = await this.partners.save(this.partners.create(patch));
    return this.partnerResponse(partner);
  }
  async getPartner(id: string) {
    const partner = await this.partners.findOne({ where: { id } });
    if (!partner) throw new NotFoundException('Wellness partner not found');
    return this.partnerResponse(partner);
  }
  async getPartnerForOwner(ownerId: string) {
    const partner = await this.partners.findOne({ where: { ownerId }, order: { createdAt: 'ASC' } as any });
    if (!partner) throw new NotFoundException('No wellness partner profile is linked to this login');
    return this.partnerResponse(partner);
  }
  async updatePartner(id: string, data: Partial<WellnessPartnerEntity> & { ownerEmail?: string; ownerPassword?: string; ownerName?: string }) {
    const existing = await this.partners.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Wellness partner not found');
    const patch = this.partnerPatch(data, existing);
    if (data.ownerId !== undefined || data.ownerEmail !== undefined || data.ownerPassword !== undefined) {
      patch.ownerId = await this.resolveOwnerId(data, existing);
    }
    const saved = await this.partners.save({ ...existing, ...patch });
    return this.partnerResponse(saved);
  }
  async updatePartnerForOwner(ownerId: string, data: Partial<WellnessPartnerEntity>) {
    const existing = await this.partners.findOne({ where: { ownerId } });
    if (!existing) throw new NotFoundException('No wellness partner profile is linked to this login');
    return this.updatePartner(existing.id, data);
  }
  async deletePartner(id: string) {
    await this.partners.update(id, { status: 'inactive' } as any);
    await this.services.update({ partnerId: id } as any, { isActive: false } as any);
    return { success: true };
  }
  private normalizeServiceData(data: any, defaults: Partial<WellnessServiceEntity> = {}) {
    const durationMinutes = Number(data.durationMinutes ?? data.duration ?? defaults.durationMinutes ?? 60);
    const price = Number(data.price ?? defaults.price ?? 0);
    const originalPrice = data.originalPrice === null || data.originalPrice === ''
      ? null
      : data.originalPrice !== undefined
        ? Number(data.originalPrice)
        : defaults.originalPrice;
    return {
      ...defaults,
      ...data,
      durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 60,
      price: Number.isFinite(price) ? price : 0,
      originalPrice,
      approvalStatus: data.approvalStatus || defaults.approvalStatus || 'approved',
    };
  }
  listServicesOf(partnerId: string) {
    return this.services
      .find({ where: { partnerId, isActive: true, approvalStatus: 'approved' } as any })
      .then((rows) => this.withCheckoutPrices(rows));
  }
  createService(data: Partial<WellnessServiceEntity>) {
    const normalized = this.normalizeServiceData(data, { approvalStatus: 'approved', isActive: true } as any);
    return this.services.save(this.services.create(normalized));
  }
  async updateService(id: string, data: Partial<WellnessServiceEntity>) {
    const existing = await this.services.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Service not found');
    return this.services.save({ ...existing, ...this.normalizeServiceData(data, existing) });
  }
  async deleteService(id: string) {
    await this.services.update(id, { isActive: false } as any);
    return { success: true };
  }

  async listAllServices(filter: { category?: string } = {}) {
    const qb = this.services.createQueryBuilder('s')
      .innerJoinAndMapOne('s.partner', WellnessPartnerEntity, 'p', 's."partnerId" = p.id')
      .where('s."isActive" = true')
      .andWhere("s.\"approvalStatus\" = 'approved'")
      .andWhere("p.status = 'active'");
    if (filter.category) {
      const category = this.normalizeServiceTypes(filter.category)[0];
      if (category) {
        qb.andWhere(
          `(:category = ANY(COALESCE(p."serviceTypes", ARRAY[]::text[])) OR LOWER(p."serviceType") = :category)`,
          { category },
        );
      }
    }
    const rows = await qb.orderBy('s.price', 'ASC').getMany();
    return this.withCheckoutPrices(rows);
  }

  private async withCheckoutPrices<T extends any>(rows: T[]): Promise<T[]> {
    const configRow = await this.configRepo.findOne({ where: { key: PLATFORM_PRICING_CONFIG_KEY } });
    const commission = serviceCommission(configRow?.value, 'wellness');
    return rows.map((row: any) => {
      const basePrice = Number(row.price || 0);
      const checkoutPrice = applyCheckoutCommission(basePrice, commission);
      return {
        ...row,
        basePrice,
        platformAddOn: Math.max(0, checkoutPrice - basePrice),
        price: checkoutPrice || basePrice,
      };
    });
  }

  async listAdminPartners() {
    const [partners] = await this.partners.findAndCount({ order: { createdAt: 'DESC' } });
    const result = await Promise.all(partners.map(async (partner) => {
      const svcs = await this.services.find({ where: { partnerId: partner.id } });
      const active = svcs.filter((s) => s.isActive && (s as any).approvalStatus === 'approved');
      const minPrice = active.length ? Math.min(...active.map(s => Number(s.price))) : null;
      return { ...this.partnerResponse(partner), minPrice, serviceCount: active.length, totalServiceCount: svcs.length };
    }));
    return result;
  }

  listAdminServices() {
    return this.services.createQueryBuilder('s')
      .leftJoinAndMapOne('s.partner', WellnessPartnerEntity, 'p', 's."partnerId" = p.id')
      .orderBy('s.name', 'ASC')
      .getMany();
  }

  private validLatLng(lat: any, lng: any) {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLng)) return null;
    if (Math.abs(parsedLat) > 90 || Math.abs(parsedLng) > 180) return null;
    return { lat: parsedLat, lng: parsedLng };
  }

  private validRadius(radiusKm: any) {
    const parsed = Number(radiusKm);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.min(parsed, 250);
  }

  private distanceSql(alias = 'p') {
    return `(6371 * acos(LEAST(1, GREATEST(-1, cos(radians(:lat)) * cos(radians(${alias}.lat)) * cos(radians(${alias}.lng) - radians(:lng)) + sin(radians(:lat)) * sin(radians(${alias}.lat))))))`;
  }

  async listPartnersWithMinPrice(filter: { city?: string; serviceType?: string; lat?: any; lng?: any; sort?: string; radiusKm?: any } = {}, page: any = 1, limit: any = 20) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const coords = this.validLatLng(filter.lat, filter.lng);
    const radiusKm = this.validRadius(filter.radiusKm);
    const distanceSql = this.distanceSql('p');
    const qb = this.partners.createQueryBuilder('p')
      .where("p.status = 'active'");
    if (filter.city) qb.andWhere('p.city = :city', { city: filter.city });
    this.applyPartnerTypeFilter(qb, filter.serviceType);
    if (coords) {
      qb.andWhere('p.lat IS NOT NULL')
        .andWhere('p.lng IS NOT NULL')
        .andWhere('p.lat <> 0')
        .andWhere('p.lng <> 0')
        .addSelect(distanceSql, 'distanceKm')
        .setParameters(coords);
      if (radiusKm) qb.andWhere(`${distanceSql} <= :radiusKm`, { radiusKm });
    }
    if (coords && (filter.sort === 'nearby_best' || filter.sort === 'nearest' || radiusKm)) {
      if (filter.sort === 'nearby_best') {
        qb.orderBy(`CASE
          WHEN ${distanceSql} <= 2 THEN 0
          WHEN ${distanceSql} <= 5 THEN 1
          WHEN ${distanceSql} <= 10 THEN 2
          WHEN ${distanceSql} <= 25 THEN 3
          WHEN ${distanceSql} <= 50 THEN 4
          ELSE 5
        END`, 'ASC')
          .addOrderBy('p.rating', 'DESC')
          .addOrderBy('p."reviewCount"', 'DESC')
          .addOrderBy(distanceSql, 'ASC');
      } else {
        qb.orderBy(distanceSql, 'ASC').addOrderBy('p.rating', 'DESC').addOrderBy('p."reviewCount"', 'DESC');
      }
    } else {
      qb.orderBy('p.rating', 'DESC').addOrderBy('p."reviewCount"', 'DESC').addOrderBy('p.createdAt', 'DESC');
    }
    const total = await qb.clone().getCount();
    const { entities: partners, raw } = await qb.skip(skip).take(take).getRawAndEntities();
    const distanceById = new Map<string, number>();
    raw.forEach((row: any) => {
      const id = row.p_id || row.p_id_id || row.id;
      const distance = Number(row.distanceKm);
      if (id && Number.isFinite(distance)) distanceById.set(id, distance);
    });
    const result = await Promise.all(partners.map(async (partner) => {
      const svcs = await this.services.find({ where: { partnerId: partner.id, isActive: true } });
      const priced = await this.withCheckoutPrices(svcs as any[]);
      const minPrice = priced.length ? Math.min(...priced.map(s => Number((s as any).price))) : null;
      const distanceKm = distanceById.get(partner.id);
      return {
        ...this.partnerResponse(partner),
        minPrice,
        serviceCount: svcs.length,
        ...(distanceKm !== undefined ? { distanceKm: Number(distanceKm.toFixed(2)), distanceLabel: `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km` } : {}),
      };
    }));
    return paginatedResponse(result, total, p, l);
  }

  async book(userId: string, serviceId: string, bookingDate: string, phone: string) {
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(serviceId)) throw new NotFoundException('Service not found');
    const service = await this.services.findOne({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Service not found');
    const configRow = await this.configRepo.findOne({ where: { key: PLATFORM_PRICING_CONFIG_KEY } });
    const baseAmount = Number(service.price);
    const centralCommission = serviceCommission(configRow?.value, 'wellness');
    const platformAddOn = commissionAmount(baseAmount, centralCommission);
    const amount = applyCheckoutCommission(baseAmount, centralCommission);
    const platformCommission = platformAddOn;
    const orderId = `WL_${uuid().slice(0, 18)}`;
    const booking = await this.bookings.save(this.bookings.create({
      userId, partnerId: service.partnerId, serviceId,
      bookingDate: new Date(bookingDate), amount, platformCommission,
      status: 'pending', cashfreeOrderId: orderId,
    }));
    const payment = await this.cashfree.createOrder({
      orderId, amount, customerId: userId, customerPhone: phone,
      notes: { kind: 'wellness', bookingId: booking.id },
    });
    return { booking, payment };
  }

  async myBookings(userId: string) {
    const bks = await this.bookings.find({ where: { userId }, order: { bookingDate: 'DESC' } });
    return Promise.all(bks.map(async (b) => {
      const service = b.serviceId ? await this.services.findOne({ where: { id: b.serviceId } }) : null;
      const partner = b.partnerId ? await this.partners.findOne({ where: { id: b.partnerId } }) : null;
      return {
        id: b.id, status: b.status, bookingDate: b.bookingDate, amount: b.amount,
        cashfreeOrderId: b.cashfreeOrderId, invoiceNumber: (b as any).invoiceNumber,
        service: service ? { id: service.id, name: service.name, durationMinutes: service.durationMinutes, imageUrl: service.imageUrl } : null,
        partner: partner ? {
          id: partner.id,
          name: partner.name,
          serviceType: this.serviceTypesFor(partner)[0],
          serviceTypes: this.serviceTypesFor(partner),
          city: partner.city,
          area: partner.area,
          photos: partner.photos,
        } : null,
      };
    }));
  }

  async confirmBooking(bookingId: string) {
    const b = await this.bookings.findOne({ where: { id: bookingId } });
    if (!b) throw new Error('Booking not found');
    b.status = 'confirmed';
    await this.bookings.save(b);
    return b;
  }

  /** Bookings for a specific partner (used by wellness portal) */
  async partnerBookings(partnerId: string) {
    const bks = await this.bookings.find({ where: { partnerId }, order: { bookingDate: 'DESC' } });
    return Promise.all(bks.map(async (b) => {
      const service = b.serviceId ? await this.services.findOne({ where: { id: b.serviceId } }) : null;
      return { ...b, serviceName: service?.name, scheduledAt: b.bookingDate };
    }));
  }

  async updateBookingStatus(partnerId: string, bookingId: string, status: string) {
    const b = await this.bookings.findOne({ where: { id: bookingId, partnerId } });
    if (!b) throw new Error('Booking not found');
    await this.bookings.update(bookingId, { status } as any);
    return { ...b, status };
  }

  /** Services scoped to a partner (used by wellness portal) */
  partnerServices(partnerId: string) { return this.services.find({ where: { partnerId } }); }

  async createPartnerService(partnerId: string, data: Partial<WellnessServiceEntity>) {
    const normalized = this.normalizeServiceData(data, {
      partnerId,
      isActive: false,
      approvalStatus: 'pending',
    } as any);
    return this.services.save(this.services.create(normalized));
  }

  async updatePartnerService(partnerId: string, serviceId: string, data: Partial<WellnessServiceEntity>) {
    const svc = await this.services.findOne({ where: { id: serviceId, partnerId } });
    if (!svc) throw new Error('Service not found');
    const normalized = this.normalizeServiceData(data, {
      ...svc,
      isActive: false,
      approvalStatus: 'pending',
      reviewNote: null,
    } as any);
    return this.services.save({ ...svc, ...normalized, partnerId });
  }

  async deletePartnerService(partnerId: string, serviceId: string) {
    const svc = await this.services.findOne({ where: { id: serviceId, partnerId } });
    if (!svc) throw new Error('Service not found');
    await this.services.update(serviceId, { isActive: false } as any);
    return { success: true };
  }

  /** Earnings summary for wellness partner dashboard */
  async partnerEarnings(partnerId: string) {
    const bks = await this.bookings.find({ where: { partnerId }, order: { bookingDate: 'DESC' } });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const completed = bks.filter(b => b.status === 'completed' || b.status === 'confirmed');
    const thisMonth = completed.filter(b => new Date(b.bookingDate) >= monthStart);
    const lastMonth = completed.filter(b => {
      const d = new Date(b.bookingDate);
      return d >= lastMonthStart && d < monthStart;
    });

    const totalRevenue = completed.reduce((s, b) => s + Number(b.amount || 0), 0);
    const totalCommission = completed.reduce((s, b) => s + Number(b.platformCommission || 0), 0);
    const netEarnings = totalRevenue - totalCommission;

    const thisMonthRevenue = thisMonth.reduce((s, b) => s + Number(b.amount || 0), 0);
    const thisMonthNet = thisMonth.reduce((s, b) => s + Number(b.amount || 0) - Number(b.platformCommission || 0), 0);
    const lastMonthNet = lastMonth.reduce((s, b) => s + Number(b.amount || 0) - Number(b.platformCommission || 0), 0);

    // Monthly breakdown (last 6 months)
    const monthly: Record<string, { month: string; revenue: number; commission: number; net: number; bookings: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthly[key] = { month: key, revenue: 0, commission: 0, net: 0, bookings: 0 };
    }
    completed.forEach(b => {
      const d = new Date(b.bookingDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthly[key]) {
        monthly[key].revenue += Number(b.amount || 0);
        monthly[key].commission += Number(b.platformCommission || 0);
        monthly[key].net += Number(b.amount || 0) - Number(b.platformCommission || 0);
        monthly[key].bookings += 1;
      }
    });

    return {
      summary: {
        totalRevenue, totalCommission, netEarnings,
        thisMonthRevenue, thisMonthNet, lastMonthNet,
        totalBookings: bks.length, completedBookings: completed.length,
      },
      monthly: Object.values(monthly),
      recentBookings: bks.slice(0, 10).map(b => ({
        id: b.id, status: b.status, bookingDate: b.bookingDate,
        amount: b.amount, platformCommission: b.platformCommission,
        net: Number(b.amount || 0) - Number(b.platformCommission || 0),
      })),
    };
  }

  async getBookingInvoice(bookingId: string, userId: string) {
    const b = await this.bookings.findOne({ where: { id: bookingId, userId } });
    if (!b) throw new Error('Booking not found');
    const service = b.serviceId ? await this.services.findOne({ where: { id: b.serviceId } }) : null;
    const partner = b.partnerId ? await this.partners.findOne({ where: { id: b.partnerId } }) : null;
    if (!(b as any).invoiceNumber) {
      const seq = Math.floor(Date.now() / 1000) % 100000;
      const d = new Date();
      (b as any).invoiceNumber = `BMF-WL-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${seq}`;
      await this.bookings.save(b);
    }
    return {
      invoiceNumber: (b as any).invoiceNumber, bookingDate: b.bookingDate,
      amount: b.amount, status: b.status, cashfreeOrderId: b.cashfreeOrderId,
      service: service ? { name: service.name, durationMinutes: service.durationMinutes } : null,
      partner: partner ? { name: partner.name, address: partner.address, city: partner.city } : null,
      issuedAt: new Date(),
    };
  }
}

@ApiTags('Wellness')
@Controller('wellness')
class WellnessController {
  constructor(private readonly svc: WellnessService) {}

  private async assertPartnerAccess(partnerId: string, req: any) {
    if (req.user?.role !== 'wellness_partner') return;
    const partner = await this.svc.getPartner(partnerId);
    if (partner.ownerId !== req.user.userId) throw new ForbiddenException('Cannot access another wellness partner');
  }

  @Get('partners')
  partners(
    @Query('city') city?: string,
    @Query('serviceType') type?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('sort') sort?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.listPartnersWithMinPrice({ city, serviceType: type, lat, lng, sort, radiusKm }, +page, +limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('wellness_partner')
  @Get('me')
  myPartner(@Req() req: any) {
    return this.svc.getPartnerForOwner(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('wellness_partner')
  @Put('me')
  updateMyPartner(@Body() b: any, @Req() req: any) {
    return this.svc.updatePartnerForOwner(req.user.userId, b);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('admin/partners')
  adminPartners() {
    return this.svc.listAdminPartners();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Get('admin/services')
  adminServices() {
    return this.svc.listAdminServices();
  }

  @Get('partners/:id')
  getPartner(@Param('id') id: string) { return this.svc.getPartner(id); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('partners')
  createPartner(@Body() b: any) { return this.svc.createPartner(b); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'wellness_partner')
  @Put('partners/:id')
  async updatePartner(@Param('id') id: string, @Body() b: any, @Req() req: any) {
    if (req.user.role === 'wellness_partner') {
      const partner = await this.svc.getPartner(id);
      if (partner.ownerId !== req.user.userId) throw new ForbiddenException('Cannot update another wellness partner');
    }
    return this.svc.updatePartner(id, b);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Delete('partners/:id')
  deletePartner(@Param('id') id: string) { return this.svc.deletePartner(id); }

  @Get('services/all')
  allServices(@Query('category') cat?: string) {
    return this.svc.listAllServices({ category: cat });
  }

  @Get('partners/:id/services')
  services(@Param('id') id: string) { return this.svc.listServicesOf(id); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('services')
  createService(@Body() b: any) { return this.svc.createService(b); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Put('services/:id')
  updateService(@Param('id') id: string, @Body() b: any) { return this.svc.updateService(id, b); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Delete('services/:id')
  deleteService(@Param('id') id: string) { return this.svc.deleteService(id); }

  @UseGuards(JwtAuthGuard)
  @Post('services/:id/book')
  book(@Param('id') id: string, @Body() b: BookWellnessDto, @Req() req: any) {
    return this.svc.book(req.user.userId, id, b.bookingDate, b.phone || req.user.phone || '');
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookings/my')
  myBookings(@Req() req: any) {
    return this.svc.myBookings(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bookings/:id/confirm')
  confirmBooking(@Param('id') id: string) {
    return this.svc.confirmBooking(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookings/:id/invoice')
  getInvoice(@Param('id') id: string, @Req() req: any) {
    return this.svc.getBookingInvoice(id, req.user.userId);
  }

  // ─── Partner-scoped routes (used by wellness portal frontend) ─────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'wellness_partner')
  @Get(':partnerId/bookings')
  async partnerBookings(@Param('partnerId') partnerId: string, @Req() req: any) {
    await this.assertPartnerAccess(partnerId, req);
    return this.svc.partnerBookings(partnerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'wellness_partner')
  @Patch(':partnerId/bookings/:id')
  async updateBooking(@Param('partnerId') partnerId: string, @Param('id') id: string, @Body() body: any, @Req() req: any) {
    await this.assertPartnerAccess(partnerId, req);
    return this.svc.updateBookingStatus(partnerId, id, body.status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'wellness_partner')
  @Get(':partnerId/services')
  async partnerServices(@Param('partnerId') partnerId: string, @Req() req: any) {
    await this.assertPartnerAccess(partnerId, req);
    return this.svc.partnerServices(partnerId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'wellness_partner')
  @Post(':partnerId/services')
  async createPartnerService(@Param('partnerId') partnerId: string, @Body() body: any, @Req() req: any) {
    await this.assertPartnerAccess(partnerId, req);
    return this.svc.createPartnerService(partnerId, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'wellness_partner')
  @Put(':partnerId/services/:id')
  async updatePartnerService(@Param('partnerId') partnerId: string, @Param('id') id: string, @Body() body: any, @Req() req: any) {
    await this.assertPartnerAccess(partnerId, req);
    return this.svc.updatePartnerService(partnerId, id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'wellness_partner')
  @Delete(':partnerId/services/:id')
  async deletePartnerService(@Param('partnerId') partnerId: string, @Param('id') id: string, @Req() req: any) {
    await this.assertPartnerAccess(partnerId, req);
    return this.svc.deletePartnerService(partnerId, id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'wellness_partner')
  @Get(':partnerId/earnings')
  async partnerEarnings(@Param('partnerId') partnerId: string, @Req() req: any) {
    await this.assertPartnerAccess(partnerId, req);
    return this.svc.partnerEarnings(partnerId);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([WellnessPartnerEntity, WellnessServiceEntity, WellnessBookingEntity, AppConfigEntity, UserEntity]), PaymentsModule],
  controllers: [WellnessController],
  providers: [WellnessService],
})
export class WellnessModule {}
