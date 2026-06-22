import { Module, Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, Injectable, UseGuards, Req, NotFoundException, ForbiddenException, BadRequestException, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional } from 'class-validator';
import { WellnessPartnerEntity, WellnessServiceEntity, WellnessBookingEntity } from '../../database/entities/wellness.entity';
import { RatingEntity } from '../../database/entities/misc.entity';
import { AppConfigEntity } from '../../database/entities/app-config.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { CashfreeService } from '../payments/cashfree.service';
import { PaymentsModule } from '../payments/payments.module';
import { EmailModule } from '../email/email.module';
import { EmailService } from '../email/email.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { v4 as uuid } from 'uuid';
import { PLATFORM_PRICING_CONFIG_KEY, applyCheckoutCommission, commissionAmount, serviceCommission } from '../../common/commission-config';

const MAX_WELLNESS_SERVICE_IMAGE_BYTES = 10 * 1024 * 1024;

export class BookWellnessDto {
  @IsDateString() bookingDate: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() specialRequest?: string;
  @IsOptional() @IsString() note?: string;
}

@Injectable()
export class WellnessService {
  constructor(
    @InjectRepository(WellnessPartnerEntity) private readonly partners: Repository<WellnessPartnerEntity>,
    @InjectRepository(WellnessServiceEntity) private readonly services: Repository<WellnessServiceEntity>,
    @InjectRepository(WellnessBookingEntity) private readonly bookings: Repository<WellnessBookingEntity>,
    @InjectRepository(RatingEntity) private readonly ratings: Repository<RatingEntity>,
    @InjectRepository(AppConfigEntity) private readonly configRepo: Repository<AppConfigEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly cashfree: CashfreeService,
    private readonly email: EmailService = { sendWellnessOwnerCredentials: async () => false } as any,
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

  private async withLiveRatings<T extends WellnessPartnerEntity>(partners: T[]): Promise<T[]> {
    if (!partners.length) return partners;
    const partnerIds = [...new Set(partners.map((partner) => partner.id).filter(Boolean))];
    const rows = await this.ratings
      .createQueryBuilder('r')
      .select('r."wellnessPartnerId"', 'partnerId')
      .addSelect('AVG(r.stars)', 'rating')
      .addSelect('COUNT(*)', 'reviewCount')
      .where('r.status = :status', { status: 'approved' })
      .andWhere('r."wellnessPartnerId" IN (:...partnerIds)', { partnerIds })
      .groupBy('r."wellnessPartnerId"')
      .getRawMany();
    const liveByPartnerId = new Map(rows.map((row: any) => {
      const reviewCount = Number(row.reviewCount || 0);
      const rating = reviewCount > 0 ? Math.round(Number(row.rating || 0) * 10) / 10 : 0;
      return [row.partnerId, { rating, reviewCount }];
    }));
    partners.forEach((partner) => {
      const live = liveByPartnerId.get(partner.id) || { rating: 0, reviewCount: 0 };
      partner.rating = live.rating;
      partner.reviewCount = live.reviewCount;
    });
    return partners;
  }

  private parseFutureBookingDate(value: any) {
    const bookingDate = new Date(value);
    if (!value || Number.isNaN(bookingDate.getTime())) {
      throw new BadRequestException('bookingDate must be a valid date');
    }
    if (bookingDate.getTime() <= Date.now()) {
      throw new BadRequestException('bookingDate must be in the future');
    }
    return bookingDate;
  }

  private normalizeSpecialRequest(value: any) {
    const specialRequest = String(value ?? '').trim();
    return specialRequest || null;
  }

  private bookingRequestResponse(booking: Pick<WellnessBookingEntity, 'specialRequest'>) {
    const specialRequest = this.normalizeSpecialRequest(booking?.specialRequest);
    return { specialRequest, note: specialRequest };
  }

  private uploadRoot() {
    return process.env.UPLOAD_DIR || join(process.cwd(), 'uploads');
  }

  private publicApiBase() {
    const fallback = process.env.NODE_ENV === 'production'
      ? 'https://bookmyfit.in/api/v1'
      : `http://localhost:${process.env.PORT || 3003}/api/v1`;
    const raw = (process.env.PUBLIC_API_BASE_URL || process.env.API_PUBLIC_URL || process.env.NEXT_PUBLIC_API_URL || fallback)
      .replace(/\/$/, '');
    return /\/api\/v1$/i.test(raw) ? raw : `${raw}/api/v1`;
  }

  private uploadUrl(relativePath: string) {
    const base = this.publicApiBase().replace(/\/uploads\/?$/i, '').replace(/\/$/, '');
    const path = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    return `${base}/uploads/${path}`;
  }

  private async normalizeServiceImageFile(file: any) {
    const buffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    return {
      buffer,
      extension: '.webp',
      mimeType: 'image/webp',
      size: buffer.length,
    };
  }

  private partnerPatch(data: any, existing?: WellnessPartnerEntity) {
    const patch: any = {};
    ['name', 'country', 'state', 'city', 'area', 'address', 'status', 'distanceLabel'].forEach((key) => {
      if (data[key] !== undefined) patch[key] = String(data[key] ?? '').trim();
    });
    ['discountPercent', 'commissionRate', 'lat', 'lng'].forEach((key) => {
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
    if (!existing) {
      if (patch.lat === undefined) patch.lat = 0;
      if (patch.lng === undefined) patch.lng = 0;
    }
    return patch;
  }

  private ownerPartnerInput(data: Partial<WellnessPartnerEntity>) {
    const allowed = [
      'name', 'country', 'state', 'city', 'area', 'address',
      'photos', 'serviceTypes', 'serviceType', 'lat', 'lng',
    ];
    return Object.fromEntries(
      allowed
        .filter((key) => (data as any)?.[key] !== undefined)
        .map((key) => [key, (data as any)[key]]),
    );
  }

  private async assertOwnerAvailable(ownerId: string, existing?: WellnessPartnerEntity) {
    const linkedPartner = await this.partners.findOne({ where: { ownerId } });
    if (linkedPartner && linkedPartner.id !== existing?.id) {
      throw new BadRequestException('This wellness login is already linked to another wellness partner');
    }
  }

  private generateTemporaryPassword() {
    return `BMF-${randomBytes(4).toString('hex').toUpperCase()}-${randomBytes(3).toString('hex').toUpperCase()}`;
  }

  private async resolveOwnerAccount(data: any, existing?: WellnessPartnerEntity) {
    if (data.ownerId !== undefined && data.ownerId !== null && String(data.ownerId).trim()) {
      const ownerId = String(data.ownerId).trim();
      const user = await this.users.findOne({ where: { id: ownerId } });
      if (!user) throw new BadRequestException('Selected wellness owner user was not found');
      if (user.role !== 'wellness_partner') throw new BadRequestException('Selected owner must be a wellness partner user');
      await this.assertOwnerAvailable(ownerId, existing);
      return { ownerId };
    }

    const ownerEmail = String(data.ownerEmail || '').trim().toLowerCase();
    const suppliedPassword = String(data.ownerPassword || '').trim();
    const shouldResetPassword = data.resetOwnerPassword === true || data.resetOwnerPassword === 'true';
    if (!ownerEmail) {
      if ((suppliedPassword || shouldResetPassword) && existing?.ownerId) {
        const user = await this.users.findOne({ where: { id: existing.ownerId } });
        if (!user) throw new BadRequestException('Linked wellness owner user was not found');
        const temporaryPassword = suppliedPassword || this.generateTemporaryPassword();
        user.passwordHash = await bcrypt.hash(temporaryPassword, 10);
        user.isActive = true;
        user.mustChangePassword = true;
        user.temporaryPasswordIssuedAt = new Date();
        await this.users.save(user);
        return {
          ownerId: user.id,
          generatedPassword: temporaryPassword,
          ownerEmail: user.email,
          ownerName: user.name,
        };
      }
      return { ownerId: existing?.ownerId };
    }
    let user = await this.users.findOne({ where: { email: ownerEmail } });
    if (user && user.role !== 'wellness_partner') {
      throw new BadRequestException('Owner email is already used by another account type');
    }
    if (user) {
      await this.assertOwnerAvailable(user.id, existing);
    }
    if (!user) {
      const temporaryPassword = suppliedPassword || this.generateTemporaryPassword();
      if (temporaryPassword.length < 6) throw new BadRequestException('Owner password must be at least 6 characters');
      user = await this.users.save(this.users.create({
        email: ownerEmail,
        passwordHash: await bcrypt.hash(temporaryPassword, 10),
        name: String(data.ownerName || data.name || ownerEmail.split('@')[0] || 'Wellness Partner').trim(),
        role: 'wellness_partner',
        isActive: true,
        mustChangePassword: true,
        temporaryPasswordIssuedAt: new Date(),
      }));
      return {
        ownerId: user.id,
        generatedPassword: temporaryPassword,
        ownerEmail: user.email,
        ownerName: user.name,
      };
    } else if (suppliedPassword || shouldResetPassword) {
      const temporaryPassword = suppliedPassword || this.generateTemporaryPassword();
      if (temporaryPassword.length < 6) throw new BadRequestException('Owner password must be at least 6 characters');
      user.passwordHash = await bcrypt.hash(temporaryPassword, 10);
      user.isActive = true;
      user.mustChangePassword = true;
      user.temporaryPasswordIssuedAt = new Date();
      await this.users.save(user);
      return {
        ownerId: user.id,
        generatedPassword: temporaryPassword,
        ownerEmail: user.email,
        ownerName: user.name,
      };
    }
    return { ownerId: user.id };
  }

  private async withOwnerLoginResponse(response: any, ownerAccount: any, partner: WellnessPartnerEntity) {
    if (!ownerAccount?.generatedPassword || !ownerAccount?.ownerEmail) return response;
    const portalUrl = process.env.WELLNESS_PORTAL_URL || 'https://wellness.bookmyfit.in';
    const emailSent = await this.email.sendWellnessOwnerCredentials({
      partnerName: partner.name,
      ownerName: ownerAccount.ownerName || partner.name || 'Wellness Partner',
      email: ownerAccount.ownerEmail,
      password: ownerAccount.generatedPassword,
      portalUrl,
    }).catch(() => false);
    return {
      ...response,
      ownerLogin: {
        email: ownerAccount.ownerEmail,
        password: ownerAccount.generatedPassword,
        portalUrl,
        emailSent,
        mustChangePassword: true,
      },
    };
  }

  private applyPartnerTypeFilter(qb: any, serviceType?: string) {
    const normalized = this.normalizeServiceTypes(serviceType)[0];
    if (!normalized) return;
    qb.andWhere(
      `(:serviceType = ANY(COALESCE(p."serviceTypes", ARRAY[]::text[])) OR LOWER(p."serviceType") = :serviceType)`,
      { serviceType: normalized },
    );
  }

  async listPartners(filter: { country?: string; state?: string; city?: string; serviceType?: string } = {}, page: any = 1, limit: any = 20) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const qb = this.partners.createQueryBuilder('p')
      .where("p.status = 'active'");
    if (filter.country) qb.andWhere('LOWER(COALESCE(p.country, :defaultCountry)) = LOWER(:country)', { defaultCountry: 'India', country: filter.country });
    if (filter.state) qb.andWhere('LOWER(COALESCE(p.state, \'\')) = LOWER(:state)', { state: filter.state });
    if (filter.city) qb.andWhere('LOWER(p.city) = LOWER(:city)', { city: filter.city });
    this.applyPartnerTypeFilter(qb, filter.serviceType);
    const [data, total] = await qb.orderBy('p.rating', 'DESC').skip(skip).take(take).getManyAndCount();
    const rated = await this.withLiveRatings(data);
    return paginatedResponse(rated.map((partner) => this.partnerResponse(partner)), total, p, l);
  }
  async createPartner(data: Partial<WellnessPartnerEntity> & { ownerEmail?: string; ownerPassword?: string; ownerName?: string; resetOwnerPassword?: boolean }) {
    const patch = this.partnerPatch(data);
    const ownerAccount = await this.resolveOwnerAccount(data);
    if (ownerAccount.ownerId) patch.ownerId = ownerAccount.ownerId;
    const partner = await this.partners.save(this.partners.create(patch as Partial<WellnessPartnerEntity>));
    const [ratedPartner] = await this.withLiveRatings([partner]);
    return this.withOwnerLoginResponse(this.partnerResponse(ratedPartner), ownerAccount, partner);
  }
  async getPartner(id: string) {
    const partner = await this.partners.findOne({ where: { id } });
    if (!partner) throw new NotFoundException('Wellness partner not found');
    const [ratedPartner] = await this.withLiveRatings([partner]);
    return this.partnerResponse(ratedPartner);
  }
  async getPartnerForOwner(ownerId: string) {
    const partner = await this.partners.findOne({ where: { ownerId }, order: { createdAt: 'ASC' } as any });
    if (!partner) throw new NotFoundException('No wellness partner profile is linked to this login');
    const [ratedPartner] = await this.withLiveRatings([partner]);
    return this.partnerResponse(ratedPartner);
  }
  async updatePartner(id: string, data: Partial<WellnessPartnerEntity> & { ownerEmail?: string; ownerPassword?: string; ownerName?: string; resetOwnerPassword?: boolean }) {
    const existing = await this.partners.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Wellness partner not found');
    const patch = this.partnerPatch(data, existing);
    let ownerAccount: any = null;
    if (data.ownerId !== undefined || data.ownerEmail !== undefined || data.ownerPassword !== undefined || data.resetOwnerPassword !== undefined) {
      ownerAccount = await this.resolveOwnerAccount(data, existing);
      patch.ownerId = ownerAccount.ownerId;
    }
    const saved = await this.partners.save({ ...existing, ...patch });
    const [ratedPartner] = await this.withLiveRatings([saved]);
    return this.withOwnerLoginResponse(this.partnerResponse(ratedPartner), ownerAccount, saved);
  }
  async updatePartnerForOwner(ownerId: string, data: Partial<WellnessPartnerEntity>) {
    const existing = await this.partners.findOne({ where: { ownerId } });
    if (!existing) throw new NotFoundException('No wellness partner profile is linked to this login');
    return this.updatePartner(existing.id, this.ownerPartnerInput(data));
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
      imageUrl: data.imageUrl === null || data.imageUrl === ''
        ? null
        : data.imageUrl !== undefined
          ? String(data.imageUrl).trim()
          : defaults.imageUrl,
      durationMinutes: Number.isFinite(durationMinutes) && durationMinutes > 0 ? durationMinutes : 60,
      price: Number.isFinite(price) ? price : 0,
      originalPrice,
      approvalStatus: data.approvalStatus || defaults.approvalStatus || 'approved',
    };
  }

  private validateServiceData(data: Partial<WellnessServiceEntity> & { duration?: number }) {
    if (!String(data.name || '').trim()) throw new BadRequestException('Service name is required');
    if (!String(data.partnerId || '').trim()) throw new BadRequestException('Wellness partner is required');
    if (!Number.isFinite(Number(data.price)) || Number(data.price) <= 0) {
      throw new BadRequestException('Service price must be greater than zero');
    }
    if (!Number.isFinite(Number(data.durationMinutes ?? data.duration)) || Number(data.durationMinutes ?? data.duration) <= 0) {
      throw new BadRequestException('Service duration must be greater than zero');
    }
  }

  listServicesOf(partnerId: string) {
    return this.services
      .find({ where: { partnerId, isActive: true, approvalStatus: 'approved' } as any })
      .then((rows) => this.withCheckoutPrices(rows));
  }
  async createService(data: Partial<WellnessServiceEntity>) {
    this.validateServiceData(data);
    const partner = await this.partners.findOne({ where: { id: String(data.partnerId) } });
    if (!partner) throw new NotFoundException('Wellness partner not found');
    const normalized = this.normalizeServiceData(data, { approvalStatus: 'approved', isActive: true } as any);
    return this.services.save(this.services.create(normalized));
  }
  async updateService(id: string, data: Partial<WellnessServiceEntity>) {
    const existing = await this.services.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Service not found');
    return this.services.save({ ...existing, ...this.normalizeServiceData(data, existing) });
  }

  async uploadServiceImageFile(file: any) {
    if (!file?.buffer?.length) throw new BadRequestException('Service image is required');
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowedTypes.has(file.mimetype)) {
      throw new BadRequestException('Upload a JPG, PNG, or WebP image only');
    }
    if (file.size > MAX_WELLNESS_SERVICE_IMAGE_BYTES) {
      throw new BadRequestException('Service image must be 10 MB or smaller');
    }

    const relativeDir = join('wellness', 'services');
    const targetDir = join(this.uploadRoot(), relativeDir);
    await mkdir(targetDir, { recursive: true });
    const normalizedFile = await this.normalizeServiceImageFile(file);
    const fileName = `${Date.now()}-${randomUUID()}${normalizedFile.extension}`;
    await writeFile(join(targetDir, fileName), normalizedFile.buffer);

    const relativePath = join(relativeDir, fileName).replace(/\\/g, '/');
    return {
      url: this.uploadUrl(relativePath),
      fileName: file.originalname || fileName,
      mimeType: normalizedFile.mimeType,
      size: normalizedFile.size,
    };
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
    await this.withLiveRatings(
      rows.map((row: any) => row.partner).filter(Boolean) as WellnessPartnerEntity[],
    );
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
    const ratedPartners = await this.withLiveRatings(partners);
    const result = await Promise.all(ratedPartners.map(async (partner) => {
      const svcs = await this.services.find({ where: { partnerId: partner.id } });
      const active = svcs.filter((s) => s.isActive && (s as any).approvalStatus === 'approved');
      const minPrice = active.length ? Math.min(...active.map(s => Number(s.price))) : null;
      return { ...this.partnerResponse(partner), minPrice, serviceCount: active.length, totalServiceCount: svcs.length };
    }));
    return result;
  }

  async listAdminServices() {
    const rows = await this.services.createQueryBuilder('s')
      .leftJoinAndMapOne('s.partner', WellnessPartnerEntity, 'p', 's."partnerId" = p.id')
      .orderBy('s.name', 'ASC')
      .getMany();
    await this.withLiveRatings(
      rows.map((row: any) => row.partner).filter(Boolean) as WellnessPartnerEntity[],
    );
    return rows;
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

  async listPartnersWithMinPrice(filter: { country?: string; state?: string; city?: string; serviceType?: string; lat?: any; lng?: any; sort?: string; radiusKm?: any } = {}, page: any = 1, limit: any = 20) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const coords = this.validLatLng(filter.lat, filter.lng);
    const radiusKm = this.validRadius(filter.radiusKm);
    const distanceSql = this.distanceSql('p');
    const qb = this.partners.createQueryBuilder('p')
      .where("p.status = 'active'");
    if (filter.country) qb.andWhere('LOWER(COALESCE(p.country, :defaultCountry)) = LOWER(:country)', { defaultCountry: 'India', country: filter.country });
    if (filter.state) qb.andWhere('LOWER(COALESCE(p.state, \'\')) = LOWER(:state)', { state: filter.state });
    if (filter.city) qb.andWhere('LOWER(p.city) = LOWER(:city)', { city: filter.city });
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
    const ratedPartners = await this.withLiveRatings(partners);
    const result = await Promise.all(ratedPartners.map(async (partner) => {
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

  async book(userId: string, serviceId: string, bookingDate: string, phone: string, specialRequest?: string) {
    const scheduledAt = this.parseFutureBookingDate(bookingDate);
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(serviceId)) throw new NotFoundException('Service not found');
    const service = await this.services.findOne({
      where: { id: serviceId, isActive: true, approvalStatus: 'approved' },
    });
    if (!service) throw new NotFoundException('Service not found');
    const partner = await this.partners.findOne({ where: { id: service.partnerId, status: 'active' } });
    if (!partner) throw new NotFoundException('Wellness partner not found');
    const configRow = await this.configRepo.findOne({ where: { key: PLATFORM_PRICING_CONFIG_KEY } });
    const baseAmount = Number(service.price);
    const centralCommission = serviceCommission(configRow?.value, 'wellness');
    const platformAddOn = commissionAmount(baseAmount, centralCommission);
    const amount = applyCheckoutCommission(baseAmount, centralCommission);
    const platformCommission = platformAddOn;
    const orderId = `WL_${uuid().slice(0, 18)}`;
    const booking = await this.bookings.save(this.bookings.create({
      userId, partnerId: service.partnerId, serviceId,
      bookingDate: scheduledAt, specialRequest: this.normalizeSpecialRequest(specialRequest), amount, platformCommission,
      status: 'pending', cashfreeOrderId: orderId,
    }));
    const payment = await this.cashfree.createOrder({
      orderId, amount, customerId: userId, customerPhone: phone,
      notes: { kind: 'wellness', bookingId: booking.id },
    });
    return { booking: { ...booking, ...this.bookingRequestResponse(booking) }, payment };
  }

  async myBookings(userId: string) {
    const bks = await this.bookings.find({ where: { userId }, order: { bookingDate: 'DESC' } });
    return Promise.all(bks.map(async (b) => {
      const service = b.serviceId ? await this.services.findOne({ where: { id: b.serviceId } }) : null;
      const partner = b.partnerId ? await this.partners.findOne({ where: { id: b.partnerId } }) : null;
      return {
        id: b.id, status: b.status, bookingDate: b.bookingDate, amount: b.amount,
        cashfreeOrderId: b.cashfreeOrderId, invoiceNumber: (b as any).invoiceNumber,
        ...this.bookingRequestResponse(b),
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

  async confirmBooking(bookingId: string, userId: string) {
    const b = await this.bookings.findOne({ where: { id: bookingId, userId } });
    if (!b) throw new NotFoundException('Booking not found');
    if (b.status !== 'confirmed') {
      throw new BadRequestException('Payment has not been confirmed for this booking');
    }
    return { ...b, ...this.bookingRequestResponse(b) };
  }

  /** Bookings for a specific partner (used by wellness portal) */
  async partnerBookings(partnerId: string) {
    const bks = await this.bookings.find({ where: { partnerId }, order: { bookingDate: 'DESC' } });
    const serviceIds = [...new Set(bks.map((booking) => booking.serviceId).filter(Boolean))];
    const userIds = [...new Set(bks.map((booking) => booking.userId).filter(Boolean))];
    const [services, users] = await Promise.all([
      serviceIds.length ? this.services.findBy({ id: In(serviceIds) }) : Promise.resolve([]),
      userIds.length ? this.users.findBy({ id: In(userIds) }) : Promise.resolve([]),
    ]);
    const servicesById = new Map(services.map((service) => [service.id, service]));
    const usersById = new Map(users.map((user) => [user.id, user]));
    return bks.map((booking) => {
      const service = servicesById.get(booking.serviceId);
      const user = usersById.get(booking.userId);
      return {
        ...booking,
        ...this.bookingRequestResponse(booking),
        serviceName: service?.name || null,
        scheduledAt: booking.bookingDate,
        userName: user?.name || null,
        userEmail: user?.email || null,
        userPhone: user?.phone || null,
        user: user ? { id: user.id, name: user.name, email: user.email, phone: user.phone } : null,
      };
    });
  }

  async updateBookingStatus(partnerId: string, bookingId: string, status: string) {
    const b = await this.bookings.findOne({ where: { id: bookingId, partnerId } });
    if (!b) throw new NotFoundException('Booking not found');
    const nextStatus = String(status || '').trim().toLowerCase();
    const allowedTransitions: Record<string, string[]> = {
      pending: ['cancelled'],
      confirmed: ['completed', 'cancelled'],
      completed: [],
      cancelled: [],
    };
    if (!allowedTransitions[b.status]?.includes(nextStatus)) {
      throw new BadRequestException(`Cannot change booking status from ${b.status} to ${nextStatus || 'empty'}`);
    }
    await this.bookings.update(bookingId, { status: nextStatus } as any);
    return { ...b, status: nextStatus, ...this.bookingRequestResponse(b) };
  }

  /** Services scoped to a partner (used by wellness portal) */
  partnerServices(partnerId: string) { return this.services.find({ where: { partnerId } }); }

  async createPartnerService(partnerId: string, data: Partial<WellnessServiceEntity>) {
    this.validateServiceData({ ...data, partnerId });
    const normalized = this.normalizeServiceData(data, {
      partnerId,
      isActive: false,
      approvalStatus: 'pending',
    } as any);
    return this.services.save(this.services.create({
      ...normalized,
      partnerId,
      isActive: false,
      approvalStatus: 'pending',
    }));
  }

  async updatePartnerService(partnerId: string, serviceId: string, data: Partial<WellnessServiceEntity>) {
    const svc = await this.services.findOne({ where: { id: serviceId, partnerId } });
    if (!svc) throw new NotFoundException('Service not found');
    this.validateServiceData({ ...svc, ...data, partnerId });
    const normalized = this.normalizeServiceData(data, {
      ...svc,
      isActive: false,
      approvalStatus: 'pending',
      reviewNote: null,
    } as any);
    return this.services.save({
      ...svc,
      ...normalized,
      partnerId,
      isActive: false,
      approvalStatus: 'pending',
      reviewNote: null,
    });
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
        ...this.bookingRequestResponse(b),
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
      ...this.bookingRequestResponse(b),
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
    @Query('country') country?: string,
    @Query('state') state?: string,
    @Query('city') city?: string,
    @Query('serviceType') type?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('sort') sort?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.listPartnersWithMinPrice({ country, state, city, serviceType: type, lat, lng, sort, radiusKm }, +page, +limit);
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
      return this.svc.updatePartnerForOwner(req.user.userId, b);
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
  @Post('services/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_WELLNESS_SERVICE_IMAGE_BYTES } }))
  uploadServiceImage(@UploadedFile() file: any) {
    return this.svc.uploadServiceImageFile(file);
  }

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
    return this.svc.book(req.user.userId, id, b.bookingDate, b.phone || req.user.phone || '', b.specialRequest ?? b.note);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookings/my')
  myBookings(@Req() req: any) {
    return this.svc.myBookings(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bookings/:id/confirm')
  confirmBooking(@Param('id') id: string, @Req() req: any) {
    return this.svc.confirmBooking(id, req.user.userId);
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
  @Post(':partnerId/services/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_WELLNESS_SERVICE_IMAGE_BYTES } }))
  async uploadPartnerServiceImage(@Param('partnerId') partnerId: string, @UploadedFile() file: any, @Req() req: any) {
    await this.assertPartnerAccess(partnerId, req);
    return this.svc.uploadServiceImageFile(file);
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
  imports: [TypeOrmModule.forFeature([WellnessPartnerEntity, WellnessServiceEntity, WellnessBookingEntity, RatingEntity, AppConfigEntity, UserEntity]), PaymentsModule, EmailModule],
  controllers: [WellnessController],
  providers: [WellnessService],
})
export class WellnessModule {}
