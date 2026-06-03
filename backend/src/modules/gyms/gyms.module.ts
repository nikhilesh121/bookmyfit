import { Module, Controller, Get, Post, Put, Patch, Param, Body, Query, Injectable, UseGuards, Req, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Brackets, In } from 'typeorm';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags } from '@nestjs/swagger';
import { GymEntity, GymPlanEntity, GymStatus } from '../../database/entities/gym.entity';
import { SubscriptionEntity } from '../../database/entities/subscription.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { CheckinEntity } from '../../database/entities/checkin.entity';
import { AmenityEntity, CategoryEntity, RatingEntity } from '../../database/entities/misc.entity';
import { AppConfigEntity } from '../../database/entities/app-config.entity';
import { GymScheduleEntity } from '../../database/entities/gym-schedule.entity';
import { TrainerBookingEntity, TrainerEntity } from '../../database/entities/trainer.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { CommissionConfig, PLATFORM_PRICING_CONFIG_KEY, normalizePlatformPricingConfig, serviceCommission } from '../../common/commission-config';

function normalizeCatalogName(value: any): string {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function defaultCatalogIcon(name: any, kind: 'category' | 'amenity' = 'category') {
  const key = String(name || '').toLowerCase();
  const matchers: Array<[string[], string]> = [
    [['strength', 'weight', 'muscle', 'dumbbell'], 'lucide:dumbbell'],
    [['cardio', 'run', 'running', 'treadmill'], 'lucide:activity'],
    [['yoga', 'pilates', 'stretch'], 'lucide:flower'],
    [['crossfit', 'hiit', 'functional'], 'lucide:zap'],
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

@Injectable()
class GymsService {
  constructor(
    @InjectRepository(GymEntity) private readonly repo: Repository<GymEntity>,
    @InjectRepository(SubscriptionEntity) private readonly subs: Repository<SubscriptionEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(CheckinEntity) private readonly checkins: Repository<CheckinEntity>,
    @InjectRepository(AmenityEntity) private readonly amenities: Repository<AmenityEntity>,
    @InjectRepository(CategoryEntity) private readonly categoriesRepo: Repository<CategoryEntity>,
    @InjectRepository(GymScheduleEntity) private readonly schedules: Repository<GymScheduleEntity>,
    @InjectRepository(GymPlanEntity) private readonly gymPlans: Repository<GymPlanEntity>,
    @InjectRepository(TrainerBookingEntity) private readonly trainerBookings: Repository<TrainerBookingEntity>,
    @InjectRepository(TrainerEntity) private readonly trainers: Repository<TrainerEntity>,
    @InjectRepository(RatingEntity) private readonly ratings: Repository<RatingEntity>,
    @InjectRepository(AppConfigEntity) private readonly configs: Repository<AppConfigEntity>,
  ) {}

  private approvedRatingAverageSelect(alias = 'g') {
    return `COALESCE((SELECT ROUND(AVG(r.stars)::numeric, 1)::double precision FROM ratings r WHERE r."gymId" = ${alias}.id AND r.status = 'approved'), 0)`;
  }

  private approvedRatingCountSelect(alias = 'g') {
    return `COALESCE((SELECT COUNT(*)::int FROM ratings r WHERE r."gymId" = ${alias}.id AND r.status = 'approved'), 0)`;
  }

  private totalCheckinsSelect(alias = 'g') {
    return `COALESCE((SELECT COUNT(*)::int FROM checkins c WHERE c."gymId" = ${alias}.id AND c.status = 'success'), 0)`;
  }

  private memberCode(userId?: string | null) {
    const id = String(userId || '').replace(/-/g, '').toUpperCase();
    return id ? `BMF-${id.slice(0, 10)}` : 'BMF-UNKNOWN';
  }

  private memberName(user?: UserEntity | null, userId?: string | null) {
    const name = String(user?.name || '').trim();
    if (/\b[6-9]\d{9}\b/.test(name)) {
      return `Member ${this.memberCode(userId).replace('BMF-', '').slice(0, 6)}`;
    }
    return name || `Member ${this.memberCode(userId).replace('BMF-', '').slice(0, 6)}`;
  }

  private safeGymQuery(alias = 'g', includeSensitive = false) {
    const qb = this.repo.createQueryBuilder(alias)
      .select(`${alias}.id`, 'id')
      .addSelect(`${alias}.name`, 'name')
      .addSelect(`${alias}.country`, 'country')
      .addSelect(`${alias}.state`, 'state')
      .addSelect(`${alias}.city`, 'city')
      .addSelect(`${alias}.area`, 'area')
      .addSelect(`${alias}.address`, 'address')
      .addSelect(`${alias}.description`, 'description')
      .addSelect(`${alias}.pinCode`, 'pinCode')
      .addSelect(`${alias}.contactPhone`, 'contactPhone')
      .addSelect(`${alias}.contactEmail`, 'contactEmail')
      .addSelect(`${alias}.website`, 'website')
      .addSelect(`${alias}.openingTime`, 'openingTime')
      .addSelect(`${alias}.closingTime`, 'closingTime')
      .addSelect(`${alias}.breakStartTime`, 'breakStartTime')
      .addSelect(`${alias}.breakEndTime`, 'breakEndTime')
      .addSelect(`${alias}.lat`, 'lat')
      .addSelect(`${alias}.lng`, 'lng')
      .addSelect(`${alias}.tier`, 'tier')
      .addSelect(this.approvedRatingAverageSelect(alias), 'rating')
      .addSelect(this.approvedRatingCountSelect(alias), 'ratingCount')
      .addSelect(this.totalCheckinsSelect(alias), 'totalCheckins')
      .addSelect(`${alias}.status`, 'status')
      .addSelect(`${alias}.commissionRate`, 'commissionRate')
      .addSelect(`${alias}.coverPhoto`, 'coverPhoto')
      .addSelect(`${alias}.photos`, 'photos')
      .addSelect(`${alias}.videos`, 'videos')
      .addSelect(`${alias}.amenities`, 'amenities')
      .addSelect(`${alias}.categories`, 'categories')
      .addSelect(`${alias}.ratePerDay`, 'ratePerDay')
      .addSelect(`${alias}.dayPassPrice`, 'dayPassPrice')
      .addSelect(`${alias}.sameGymMonthlyPrice`, 'sameGymMonthlyPrice')
      .addSelect(`${alias}.capacity`, 'capacity')
      .addSelect(`${alias}.ownerId`, 'ownerId')
      .addSelect(`${alias}.kycStatus`, 'kycStatus')
      .addSelect(`${alias}.createdAt`, 'createdAt')
      .addSelect(`${alias}.updatedAt`, 'updatedAt');
    if (includeSensitive) {
      qb.addSelect(`${alias}.kycDocuments`, 'kycDocuments')
        .addSelect(`${alias}.kycReviewNote`, 'kycReviewNote');
    }
    return qb;
  }

  private normalizeGym(row: any, options: { publicView?: boolean } = {}) {
    if (!row) return null;
    const openingTime = row.openingTime || '06:00';
    const closingTime = row.closingTime || '22:00';
    const photos = Array.isArray(row.photos) ? row.photos.filter(Boolean) : [];
    const videos = Array.isArray(row.videos) ? row.videos.filter(Boolean) : [];
    const coverPhoto = row.coverPhoto || photos[0] || null;
    const ratingCount = Number(row.ratingCount || 0);
    const rating = ratingCount > 0 ? Math.round(Number(row.rating || 0) * 10) / 10 : 0;
    const normalized: any = {
      ...row,
      rating,
      ratingCount,
      ratingsCount: ratingCount,
      reviewCount: ratingCount,
      totalCheckins: Number(row.totalCheckins || 0),
      popularityScore: Number(row.totalCheckins || 0) + ratingCount,
      distanceKm: row.distanceKm !== undefined && row.distanceKm !== null ? Math.round(Number(row.distanceKm) * 10) / 10 : undefined,
      distance: row.distanceKm !== undefined && row.distanceKm !== null ? `${(Math.round(Number(row.distanceKm) * 10) / 10).toFixed(1)} km` : undefined,
      coverPhoto,
      coverImage: coverPhoto,
      photos,
      images: photos.length > 0 ? photos : (coverPhoto ? [coverPhoto] : []),
      videos,
      phone: row.contactPhone ?? null,
      email: row.contactEmail ?? null,
      openingHours: `${openingTime} - ${closingTime}`,
      breakHours: row.breakStartTime && row.breakEndTime ? `${row.breakStartTime} - ${row.breakEndTime}` : null,
      dayPassPrice: row.dayPassPrice ?? null,
      sameGymMonthlyPrice: row.sameGymMonthlyPrice ?? null,
    };
    if (options.publicView) {
      delete normalized.ownerId;
      delete normalized.commissionRate;
      delete normalized.ratePerDay;
      delete normalized.kycStatus;
      delete normalized.kycDocuments;
      delete normalized.kycReviewNote;
    }
    return normalized;
  }

  private async withLiveRatings(rows: any[]) {
    const ids = [...new Set((rows || []).map((row) => row?.id).filter(Boolean))];
    if (!ids.length) return rows;

    const aggregates = await this.ratings
      .createQueryBuilder('r')
      .select('r."gymId"', 'gymId')
      .addSelect('AVG(r.stars)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('r."gymId" IN (:...ids)', { ids })
      .andWhere('r.status = :status', { status: 'approved' })
      .groupBy('r."gymId"')
      .getRawMany();
    const byGym = new Map(aggregates.map((row: any) => [row.gymId, row]));

    return rows.map((row) => {
      const aggregate = byGym.get(row.id);
      const ratingCount = Number(aggregate?.count || 0);
      const rating = ratingCount > 0 ? Math.round(Number(aggregate?.avg || 0) * 10) / 10 : 0;
      return {
        ...row,
        rating,
        ratingCount,
        ratingsCount: ratingCount,
        reviewCount: ratingCount,
        reviewsCount: ratingCount,
      };
    });
  }

  private async attachSchedule(row: any, options: { publicView?: boolean } = {}) {
    const normalized = this.normalizeGym(row, options);
    if (!normalized?.id) return normalized;
    const schedule = await this.schedules.find({ where: { gymId: normalized.id }, order: { dayOfWeek: 'ASC' } });
    if (schedule.length > 0) {
      normalized.operatingSchedule = schedule;
      const today = schedule[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1] || schedule.find((d) => d.isOpen);
      if (today) {
        normalized.openingTime = today.openTime;
        normalized.closingTime = today.closeTime;
        normalized.breakStartTime = today.breakStartTime;
        normalized.breakEndTime = today.breakEndTime;
        normalized.openingHours = today.isOpen ? `${today.openTime} - ${today.closeTime}` : 'Closed today';
        normalized.breakHours = today.breakStartTime && today.breakEndTime ? `${today.breakStartTime} - ${today.breakEndTime}` : null;
      }
    }
    return normalized;
  }

  private async attachMasterDetails(row: any, options: { publicView?: boolean } = {}) {
    const normalized = await this.attachSchedule(row, options);
    if (!normalized) return normalized;
    const amenityNames = Array.isArray(normalized.amenities) ? normalized.amenities.filter(Boolean) : [];
    const categoryNames = Array.isArray(normalized.categories) ? normalized.categories.filter(Boolean) : [];
    const [amenities, categories]: [AmenityEntity[], CategoryEntity[]] = await Promise.all([
      amenityNames.length ? this.amenities.find({ where: { isActive: true, status: 'approved' } }) : [],
      categoryNames.length ? this.categoriesRepo.find({ where: { isActive: true } }) : [],
    ]);
    const amenityByName = new Map<string, AmenityEntity>(amenities.map((item): [string, AmenityEntity] => [normalizeCatalogName(item.name), item]));
    const categoryByName = new Map<string, CategoryEntity>(categories.map((item): [string, CategoryEntity] => [normalizeCatalogName(item.name), item]));
    normalized.amenityDetails = amenityNames.map((name: string) => {
      const item = amenityByName.get(normalizeCatalogName(name));
      return { name, iconUrl: item?.iconUrl || defaultCatalogIcon(name, 'amenity') };
    });
    normalized.categoryDetails = categoryNames.map((name: string) => {
      const item = categoryByName.get(normalizeCatalogName(name));
      return { name, iconUrl: item?.iconUrl || defaultCatalogIcon(name, 'category') };
    });
    return normalized;
  }

  private isTime(value: any) {
    return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  }

  private compactPatch(data: Record<string, any>) {
    return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
  }

  private normalizeStringList(value: any): string[] | undefined {
    if (value === undefined) return undefined;
    const rawItems = Array.isArray(value) ? value : (typeof value === 'string' ? value.split(',') : []);
    const cleaned = rawItems
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        return String(item?.url ?? item?.uri ?? item?.src ?? item?.path ?? '').trim();
      })
      .filter(Boolean);
    return [...new Set(cleaned)];
  }

  private normalizeStringValue(value: any): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const clean = String(value).trim();
    return clean || null;
  }

  private kycPhotoUrls(docs: any[] = []) {
    const urls = docs
      .filter((doc) => doc?.type === 'gym_photos')
      .flatMap((doc) => [
        doc?.fields?.exteriorPhotoUrl,
        doc?.fields?.interiorPhotoUrl,
        doc?.fields?.equipmentPhotoUrl,
        ...(this.normalizeStringList(doc?.fields?.photoUrls) || []),
        ...(this.normalizeStringList(doc?.fields?.photos) || []),
        ...(this.normalizeStringList(doc?.fields?.images) || []),
        doc?.url,
      ])
      .filter((url) => typeof url === 'string' && url.trim().length > 0)
      .map((url) => url.trim());
    return [...new Set(urls)];
  }

  private sanitizeGymPatch(data: any, isAdmin = false): Partial<GymEntity> {
    const raw = data || {};
    const photos = this.normalizeStringList(raw.photos ?? raw.images ?? raw.media ?? raw.galleryImages);
    const videos = this.normalizeStringList(raw.videos ?? raw.profileVideos ?? raw.videoUrls);
    const coverInput = raw.coverPhoto !== undefined ? raw.coverPhoto : raw.coverImage;
    let coverPhoto = this.normalizeStringValue(coverInput);
    if (photos !== undefined && coverPhoto === undefined) coverPhoto = photos[0] || null;
    const patch: any = {
      name: raw.name ?? raw.displayName,
      country: raw.country,
      state: raw.state,
      city: raw.city,
      area: raw.area,
      address: raw.address,
      description: raw.description,
      pinCode: raw.pinCode ?? raw.pincode,
      contactPhone: raw.contactPhone ?? raw.phone,
      contactEmail: raw.contactEmail ?? raw.email,
      website: raw.website,
      coverPhoto,
      photos,
      videos,
      amenities: Array.isArray(raw.amenities) ? raw.amenities : undefined,
      categories: Array.isArray(raw.categories) ? raw.categories : undefined,
      openingTime: raw.openingTime,
      closingTime: raw.closingTime,
      breakStartTime: raw.breakStartTime === '' ? null : raw.breakStartTime,
      breakEndTime: raw.breakEndTime === '' ? null : raw.breakEndTime,
      dayPassPrice: raw.dayPassPrice === '' ? null : raw.dayPassPrice,
      sameGymMonthlyPrice: raw.sameGymMonthlyPrice === '' ? null : raw.sameGymMonthlyPrice,
      capacity: raw.capacity,
      lat: raw.lat === '' ? undefined : raw.lat,
      lng: raw.lng === '' ? undefined : raw.lng,
    };

    if (raw.openingHours && (!patch.openingTime || !patch.closingTime)) {
      const [open, close] = String(raw.openingHours).split(/\s*-\s*/);
      patch.openingTime = patch.openingTime ?? open;
      patch.closingTime = patch.closingTime ?? close;
    }

    const clean = this.compactPatch(patch);
    for (const key of ['openingTime', 'closingTime', 'breakStartTime', 'breakEndTime']) {
      if (clean[key] !== null && clean[key] !== undefined && !this.isTime(clean[key])) {
        throw new BadRequestException(`${key} must be HH:MM`);
      }
    }
    if ((clean.breakStartTime && !clean.breakEndTime) || (!clean.breakStartTime && clean.breakEndTime)) {
      throw new BadRequestException('Both break start and break end time are required');
    }
    if (clean.breakStartTime && clean.breakEndTime && clean.breakStartTime >= clean.breakEndTime) {
      throw new BadRequestException('Break end time must be after break start time');
    }
    if (clean.openingTime && clean.closingTime && clean.openingTime >= clean.closingTime) {
      throw new BadRequestException('Closing time must be after opening time');
    }
    for (const key of ['dayPassPrice', 'sameGymMonthlyPrice', 'capacity', 'lat', 'lng']) {
      if (clean[key] !== null && clean[key] !== undefined) clean[key] = Number(clean[key]);
    }
    if (clean.lat !== undefined && (!Number.isFinite(clean.lat) || clean.lat < -90 || clean.lat > 90)) {
      throw new BadRequestException('Latitude must be between -90 and 90');
    }
    if (clean.lng !== undefined && (!Number.isFinite(clean.lng) || clean.lng < -180 || clean.lng > 180)) {
      throw new BadRequestException('Longitude must be between -180 and 180');
    }
    if (isAdmin) {
      const allowedStatuses = ['pending', 'active', 'suspended', 'rejected', 'inactive'];
      if (raw.status !== undefined && !allowedStatuses.includes(String(raw.status))) {
        throw new BadRequestException('Invalid gym status');
      }
      Object.assign(clean, this.compactPatch({
        tier: raw.tier,
        status: raw.status,
        commissionRate: raw.commissionRate,
        ratePerDay: raw.ratePerDay === '' ? null : raw.ratePerDay,
        ownerId: raw.ownerId,
        kycStatus: raw.kycStatus,
      }));
    }
    if (clean.ratePerDay !== null && clean.ratePerDay !== undefined) clean.ratePerDay = Number(clean.ratePerDay);
    if (clean.ratePerDay !== null && clean.ratePerDay !== undefined && (!Number.isFinite(clean.ratePerDay) || clean.ratePerDay < 0)) {
      throw new BadRequestException('Multi-gym visit payout override must be 0 or higher');
    }
    return clean;
  }

  private async assertGymAccess(id: string, user: any) {
    const gym = await this.repo.findOne({ where: { id } });
    if (!gym) throw new NotFoundException('Gym not found');
    if (user?.role === 'super_admin' || gym.ownerId === user?.userId) return gym;
    if (user?.role === 'gym_staff') {
      const staff = await this.users.findOne({ where: { id: user?.userId } });
      if (staff?.gymId === gym.id) return gym;
    }
    throw new ForbiddenException('Cannot update another gym');
  }

  private async gymEntityForActor(actorId: string) {
    const owned = await this.repo.findOne({ where: { ownerId: actorId } });
    if (owned) return owned;
    const user = await this.users.findOne({ where: { id: actorId } });
    if (user?.role === 'gym_staff' && user.gymId) {
      return this.repo.findOne({ where: { id: user.gymId } });
    }
    return null;
  }

  private async gymForActorQuery(actorId: string, alias = 'g') {
    const gym = await this.gymEntityForActor(actorId);
    if (!gym) return null;
    return this.safeGymQuery(alias).where(`${alias}.id = :id`, { id: gym.id }).getRawOne();
  }

  private async canonicalCategories(names: any[] | undefined) {
    if (!Array.isArray(names)) return undefined;
    const active = await this.categoriesRepo.find({ where: { isActive: true } });
    const byName = new Map(active.map((category) => [normalizeCatalogName(category.name), category.name.trim()]));
    const normalized = [...new Set(names.map((name) => byName.get(normalizeCatalogName(name))).filter(Boolean) as string[])];
    if (names.length > 0 && normalized.length === 0) {
      throw new BadRequestException('Select valid workout categories created by admin');
    }
    return normalized;
  }

  private readonly kycSchemas: Record<string, { label: string; fields: Array<{ key: string; label: string; type?: string; required?: boolean }> }> = {
    business_registration: {
      label: 'Business Registration',
      fields: [
        { key: 'legalName', label: 'Legal business name', required: true },
        { key: 'registrationNumber', label: 'Registration number', required: true },
        { key: 'businessType', label: 'Business type', required: true },
        { key: 'documentUrl', label: 'Registration document URL', type: 'url', required: true },
      ],
    },
    gst_certificate: {
      label: 'GST Certificate',
      fields: [
        { key: 'gstNumber', label: 'GST number', required: true },
        { key: 'registeredName', label: 'Registered name', required: true },
        { key: 'documentUrl', label: 'GST certificate URL', type: 'url', required: true },
      ],
    },
    bank_details: {
      label: 'Bank Details',
      fields: [
        { key: 'accountHolderName', label: 'Account holder name', required: true },
        { key: 'bankName', label: 'Bank name', required: true },
        { key: 'accountNumber', label: 'Account number', required: true },
        { key: 'ifsc', label: 'IFSC code', required: true },
        { key: 'cancelledChequeUrl', label: 'Cancelled cheque/passbook URL', type: 'url', required: true },
      ],
    },
    identity_document: {
      label: 'Owner Identity Document',
      fields: [
        { key: 'ownerName', label: 'Owner name', required: true },
        { key: 'documentType', label: 'Document type', required: true },
        { key: 'documentNumber', label: 'Document number', required: true },
        { key: 'documentUrl', label: 'Identity document URL', type: 'url', required: true },
      ],
    },
    gym_photos: {
      label: 'Gym Photos',
      fields: [
        { key: 'exteriorPhotoUrl', label: 'Exterior photo URL', type: 'url', required: true },
        { key: 'interiorPhotoUrl', label: 'Interior photo URL', type: 'url', required: true },
        { key: 'equipmentPhotoUrl', label: 'Equipment photo URL', type: 'url', required: false },
      ],
    },
    trainer_certs: {
      label: 'Trainer Certificates',
      fields: [
        { key: 'trainerName', label: 'Trainer name', required: true },
        { key: 'certificateName', label: 'Certificate name', required: true },
        { key: 'certificateUrl', label: 'Certificate URL', type: 'url', required: true },
      ],
    },
  };

  private recomputeKycStatus(docs: any[] = []) {
    if (!docs.length) return 'not_started';
    if (this.areRequiredKycDocsApproved(docs)) return 'approved';
    if (!this.areRequiredKycDocsSubmitted(docs)) return 'in_review';
    if (docs.some((doc) => doc.status === 'in_review' || doc.status === 'rejected')) return 'in_review';
    return 'in_review';
  }

  private requiredKycTypes() {
    return ['business_registration', 'gst_certificate', 'identity_document', 'bank_details'];
  }

  private areRequiredKycDocsSubmitted(docs: any[] = []) {
    const byType = new Map(docs.map((doc) => [doc.type, doc]));
    return this.requiredKycTypes().every((type) => !!byType.get(type));
  }

  private areRequiredKycDocsApproved(docs: any[] = []) {
    const byType = new Map(docs.map((doc) => [doc.type, doc]));
    return this.requiredKycTypes().every((type) => byType.get(type)?.status === 'approved');
  }

  private missingKycLabels(docs: any[] = [], requireApproved = false) {
    const byType = new Map(docs.map((doc) => [doc.type, doc]));
    return this.requiredKycTypes()
      .filter((type) => {
        const doc = byType.get(type);
        return requireApproved ? doc?.status !== 'approved' : !doc;
      })
      .map((type) => this.kycSchemas[type]?.label || type);
  }

  private assertKycApproved(gym: any) {
    const docs = gym?.kycDocuments || [];
    if (!this.areRequiredKycDocsApproved(docs)) {
      const missing = this.missingKycLabels(docs, true).join(', ');
      throw new BadRequestException(`Approve all required KYC details before activating this gym${missing ? `: ${missing}` : ''}`);
    }
  }

  private statusForKyc(kycStatus: string, currentStatus?: string): GymStatus {
    if (kycStatus === 'approved') {
      if (currentStatus === 'suspended' || currentStatus === 'inactive') return currentStatus;
      return 'active';
    }
    if (kycStatus === 'rejected') return 'rejected';
    if (currentStatus === 'active' || currentStatus === 'rejected') return 'pending';
    return (currentStatus as GymStatus) || 'pending';
  }

  private paidSubscriptionStatuses() {
    return ['active', 'frozen', 'expired'];
  }

  private money(value: any) {
    const amount = Number(value || 0);
    return Number.isFinite(amount) ? Math.round(amount) : 0;
  }

  private isPaidSubscription(sub: SubscriptionEntity) {
    return this.paidSubscriptionStatuses().includes(String(sub.status || '').toLowerCase());
  }

  private baseFromCheckoutAmount(checkoutAmount: any, commission?: CommissionConfig | null) {
    const amount = Number(checkoutAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    const value = Math.max(0, Number(commission?.value) || 0);
    if (value <= 0) return this.money(amount);
    if (commission?.mode === 'fixed') return this.money(Math.max(0, amount - value));
    return this.money(amount / (1 + value / 100));
  }

  private gymPlanAmount(
    sub: SubscriptionEntity,
    gym: any,
    plan?: GymPlanEntity | null,
    commission?: CommissionConfig | null,
    checkoutAmountOverride?: number,
  ) {
    if (!this.isPaidSubscription(sub)) return 0;
    const checkoutAmount = checkoutAmountOverride ?? Number(sub.amountPaid || 0);
    if (sub.planType === 'same_gym') {
      const planPrice = Number((plan as any)?.salePrice || plan?.price || 0);
      if (planPrice > 0) return this.money(planPrice);
      const monthlyPrice = Number(gym.sameGymMonthlyPrice || 0);
      if (monthlyPrice > 0) return this.money(monthlyPrice * Math.max(1, Number(sub.durationMonths) || 1));
      return this.baseFromCheckoutAmount(checkoutAmount, commission);
    }
    if (sub.planType === 'day_pass') {
      const gymPrice = Number(gym.dayPassPrice || 0);
      if (gymPrice > 0) return this.money(gymPrice);
      return this.baseFromCheckoutAmount(checkoutAmount, commission) || 149;
    }
    return 0;
  }

  private subscriptionCheckoutWithoutTrainer(sub: SubscriptionEntity, trainerCheckoutAmount: number) {
    return Math.max(0, this.money(sub.amountPaid) - this.money(trainerCheckoutAmount));
  }

  private async directSubscriptionCommissionConfig() {
    const row = await this.configs.findOne({ where: { key: PLATFORM_PRICING_CONFIG_KEY } });
    return {
      same_gym: serviceCommission(row?.value, 'same_gym'),
      day_pass: serviceCommission(row?.value, 'day_pass'),
    };
  }

  private async multiGymVisitPayout(gym: any) {
    const override = Number(gym?.ratePerDay);
    if (Number.isFinite(override) && override > 0) return override;
    const row = await this.configs.findOne({ where: { key: PLATFORM_PRICING_CONFIG_KEY } });
    const config = normalizePlatformPricingConfig(row?.value);
    return Math.max(0, Number(config.multi_gym?.visitPayout) || 0);
  }

  private trainerGymAmount(booking: TrainerBookingEntity) {
    return this.money(Number(booking.amount || 0) - Number(booking.platformCommission || 0));
  }

  private gymSubscriptionsQuery(gymId: string) {
    return this.subs
      .createQueryBuilder('s')
      .leftJoin(UserEntity, 'u', 'u.id = s."userId"')
      .leftJoin(GymPlanEntity, 'gp', 'gp.id::text = s."gymPlanId" AND gp."gymId" = :gymId', { gymId })
      .where(new Brackets((where) => {
        where
          .where('CAST(:gymId AS uuid) = ANY(COALESCE(s."gymIds", ARRAY[]::uuid[]))', { gymId })
          .orWhere('gp.id IS NOT NULL')
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

  private async trainerAddonsByOrder(gymId: string, orderIds: string[]) {
    const ids = [...new Set(orderIds.filter(Boolean))];
    if (!ids.length) {
      return {
        byOrder: new Map<string, any[]>(),
        amountByOrder: new Map<string, number>(),
        checkoutAmountByOrder: new Map<string, number>(),
      };
    }
    const bookings = await this.trainerBookings.find({ where: { gymId, cashfreeOrderId: In(ids) } });
    const trainerIds = [...new Set(bookings.map((b) => b.trainerId).filter(Boolean))];
    const trainers = trainerIds.length ? await this.trainers.find({ where: { id: In(trainerIds) } }) : [];
    const trainerMap = new Map(trainers.map((t) => [t.id, t]));
    const byOrder = new Map<string, any[]>();
    const amountByOrder = new Map<string, number>();
    const checkoutAmountByOrder = new Map<string, number>();
    for (const booking of bookings) {
      const trainer = trainerMap.get(booking.trainerId);
      const checkoutAmount = this.money(booking.amount);
      const gymAmount = ['confirmed', 'completed', 'active'].includes(String(booking.status).toLowerCase())
        ? this.trainerGymAmount(booking)
        : 0;
      const item = {
        id: booking.id,
        trainerId: booking.trainerId,
        trainerName: trainer?.name || 'Assigned trainer',
        specialization: trainer?.specialization || null,
        photoUrl: trainer?.photoUrl || null,
        status: booking.status,
        sessionDate: booking.sessionDate,
        durationMonths: booking.durationMonths,
        sessions: booking.sessions,
        amount: checkoutAmount,
        platformCommission: this.money(booking.platformCommission),
        monthlyPrice: booking.durationMonths ? Math.round(gymAmount / Math.max(1, booking.durationMonths)) : gymAmount,
        gymAmount,
        cashfreeOrderId: booking.cashfreeOrderId,
        createdAt: booking.createdAt,
      };
      const rows = byOrder.get(booking.cashfreeOrderId) || [];
      rows.push(item);
      byOrder.set(booking.cashfreeOrderId, rows);
      amountByOrder.set(booking.cashfreeOrderId, (amountByOrder.get(booking.cashfreeOrderId) || 0) + gymAmount);
      checkoutAmountByOrder.set(booking.cashfreeOrderId, (checkoutAmountByOrder.get(booking.cashfreeOrderId) || 0) + checkoutAmount);
    }
    return { byOrder, amountByOrder, checkoutAmountByOrder };
  }

  private async multiGymVisitCounts(gymId: string, subIds: string[], from?: Date, to?: Date) {
    const ids = [...new Set(subIds.filter(Boolean))];
    if (!ids.length) return new Map<string, number>();
    const qb = this.checkins.createQueryBuilder('c')
      .select('c."subscriptionId"', 'subscriptionId')
      .addSelect('COUNT(DISTINCT (c."userId"::text || \':\' || DATE(c."checkinTime")::text))', 'count')
      .where('c."gymId" = :gymId', { gymId })
      .andWhere('c.status = :status', { status: 'success' })
      .andWhere('c."subscriptionId" IN (:...ids)', { ids });
    if (from && to) qb.andWhere('c."checkinTime" >= :from AND c."checkinTime" <= :to', { from, to });
    const rows = await qb.groupBy('c."subscriptionId"').getRawMany();
    return new Map(rows.map((row: any) => [row.subscriptionId, Number(row.count || 0)]));
  }

  private async trainerTotalsForGym(gymId: string, from?: Date, to?: Date) {
    const qb = this.trainerBookings.createQueryBuilder('tb')
      .where('tb."gymId" = :gymId', { gymId })
      .andWhere('tb.status IN (:...statuses)', { statuses: ['confirmed', 'completed', 'active'] });
    if (from && to) qb.andWhere('tb."createdAt" >= :from AND tb."createdAt" <= :to', { from, to });
    const bookings = await qb.getMany();
    return {
      count: bookings.length,
      gross: bookings.reduce((sum, b) => sum + this.money(b.amount), 0),
      gymAmount: bookings.reduce((sum, b) => sum + this.trainerGymAmount(b), 0),
      commission: bookings.reduce((sum, b) => sum + this.money(b.platformCommission), 0),
    };
  }

  async myGym(ownerId: string) {
    const row = await this.gymForActorQuery(ownerId, 'g');
    return this.attachMasterDetails(row);
  }

  async myReviews(ownerId: string) {
    const gym = await this.myGym(ownerId) as any;
    if (!gym?.id) return { data: [], stats: { total: 0, approved: 0, pending: 0, rejected: 0, average: 0 } };
    const rows = await this.ratings
      .createQueryBuilder('r')
      .leftJoin(UserEntity, 'u', 'u.id = r."userId"')
      .where('r."gymId" = :gymId', { gymId: gym.id })
      .orderBy('r.createdAt', 'DESC')
      .select([
        'r.id AS id',
        'r."userId" AS "userId"',
        'r.stars AS stars',
        'r.review AS review',
        'r.status AS status',
        'r.createdAt AS "createdAt"',
        'u.name AS "userName"',
      ])
      .getRawMany();
    const approved = rows.filter((row: any) => row.status === 'approved');
    const average = approved.length
      ? Math.round((approved.reduce((sum: number, row: any) => sum + Number(row.stars || 0), 0) / approved.length) * 10) / 10
      : 0;
    return {
      data: rows.map((row: any) => ({
        id: row.id,
        userId: row.userId,
        memberCode: this.memberCode(row.userId),
        userName: this.memberName({ name: row.userName } as any, row.userId),
        stars: Number(row.stars || 0),
        review: row.review || '',
        status: row.status,
        createdAt: row.createdAt,
      })),
      stats: {
        total: rows.length,
        approved: approved.length,
        pending: rows.filter((row: any) => row.status === 'pending').length,
        rejected: rows.filter((row: any) => row.status === 'rejected').length,
        average,
      },
    };
  }

  async myMembers(ownerId: string, opts: { page?: number; limit?: number; search?: string; status?: string } = {}) {
    const gym = await this.myGym(ownerId) as any;
    if (!gym) return { data: [], total: 0, page: 1, limit: 20, pages: 0 };
    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const skip = (page - 1) * limit;

    const search = opts.search?.trim();

    const makeBaseQuery = () => this.gymSubscriptionsQuery(gym.id);

    const applySearch = (qb: ReturnType<typeof makeBaseQuery>) => {
      if (!search) return qb;
      return qb.andWhere(new Brackets((where) => {
        where
          .where('s."userId"::text ILIKE :q', { q: `%${search}%` })
          .orWhere('u.name ILIKE :q', { q: `%${search}%` });
      }));
    };

    const applyStatus = (qb: ReturnType<typeof makeBaseQuery>) => {
      if (!opts.status || opts.status === 'all') return qb;
      if (opts.status === 'expired') return qb.andWhere('s."endDate" < CURRENT_DATE').andWhere('s.status != :cancelled', { cancelled: 'cancelled' });
      if (opts.status === 'active') {
        return qb.andWhere('s.status = :status', { status: 'active' }).andWhere('s."endDate" >= CURRENT_DATE');
      }
      return qb.andWhere('s.status = :status', { status: opts.status });
    };

    const qb = applyStatus(applySearch(makeBaseQuery())).orderBy('s.createdAt', 'DESC');
    const [subs, total] = await Promise.all([
      qb.clone().skip(skip).take(limit).getMany(),
      qb.clone().getCount(),
    ]);

    const statsBase = applySearch(makeBaseQuery());
    const [activeCount, pendingCount, expiredCount, cancelledCount] = await Promise.all([
      statsBase.clone().andWhere('s.status = :status', { status: 'active' }).andWhere('s."endDate" >= CURRENT_DATE').getCount(),
      statsBase.clone().andWhere('s.status = :status', { status: 'pending' }).getCount(),
      statsBase.clone().andWhere('s."endDate" < CURRENT_DATE').andWhere('s.status != :cancelled', { cancelled: 'cancelled' }).getCount(),
      statsBase.clone().andWhere('s.status = :status', { status: 'cancelled' }).getCount(),
    ]);

    // Enrich with today's check-in count per user
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const userIds = [...new Set(subs.map((s) => s.userId).filter(Boolean))];
    const gymPlanIds = [...new Set(subs.map((s) => s.gymPlanId).filter(Boolean))];
    const users = userIds.length ? await this.users.find({ where: { id: In(userIds) } }) : [];
    const userMap = new Map(users.map((u) => [u.id, u]));
    const planRows = gymPlanIds.length ? await this.gymPlans.find({ where: { id: In(gymPlanIds as string[]) } }) : [];
    const planMap = new Map(planRows.map((p) => [p.id, p]));
    const commissionConfig = await this.directSubscriptionCommissionConfig();
    const {
      byOrder: trainerAddonsByOrder,
      amountByOrder: trainerAmountByOrder,
      checkoutAmountByOrder: trainerCheckoutAmountByOrder,
    } = await this.trainerAddonsByOrder(
      gym.id,
      subs.map((s) => s.razorpayOrderId).filter(Boolean),
    );
    const multiGymVisitCount = await this.multiGymVisitCounts(gym.id, subs.filter((s) => s.planType === 'multi_gym').map((s) => s.id));
    const ratePerDay = await this.multiGymVisitPayout(gym);
    const todayRows = userIds.length ? await this.checkins
      .createQueryBuilder('c')
      .select('c."userId"', 'userId')
      .addSelect('COUNT(*)', 'count')
      .where('c."gymId" = :gymId', { gymId: gym.id })
      .andWhere('c.status = :status', { status: 'success' })
      .andWhere('c."checkinTime" >= :today AND c."checkinTime" < :tomorrow', { today, tomorrow })
      .andWhere('c."userId" IN (:...userIds)', { userIds })
      .groupBy('c."userId"')
      .getRawMany() : [];
    const todayCheckins = new Map(todayRows.map((row: any) => [row.userId, Number(row.count || 0)]));
    const todayIso = new Date().toISOString().slice(0, 10);

    const data = subs.map(s => {
      const user = userMap.get(s.userId);
      const gymPlan = s.gymPlanId ? planMap.get(s.gymPlanId) : null;
      const belongsByGymPlan = gymPlan?.gymId === gym.id;
      const isExpired = s.endDate ? String(s.endDate).slice(0, 10) < todayIso : false;
      const gymCount = Math.max((s.gymIds || []).length, belongsByGymPlan ? 1 : 0);
      const canDeactivate = s.planType !== 'multi_gym' && ((s.gymIds || []).includes(gym.id) || belongsByGymPlan);
      const trainerAddons = s.razorpayOrderId ? (trainerAddonsByOrder.get(s.razorpayOrderId) || []) : [];
      const trainerGymAmount = s.razorpayOrderId ? (trainerAmountByOrder.get(s.razorpayOrderId) || 0) : 0;
      const trainerCheckoutAmount = s.razorpayOrderId ? (trainerCheckoutAmountByOrder.get(s.razorpayOrderId) || 0) : 0;
      const subscriptionGymAmount = s.planType === 'multi_gym'
        ? this.money((multiGymVisitCount.get(s.id) || 0) * ratePerDay)
        : this.gymPlanAmount(
          s,
          gym,
          gymPlan,
          commissionConfig[s.planType as 'same_gym' | 'day_pass'],
          this.subscriptionCheckoutWithoutTrainer(s, trainerCheckoutAmount),
        );
      const memberCode = this.memberCode(s.userId);
      return {
        id: s.id,
        subscriptionId: s.id,
        userId: s.userId,
        memberCode,
        name: this.memberName(user, s.userId),
        phone: null,
        planType: s.planType,
        planName: gymPlan?.name || null,
        gymPlanId: s.gymPlanId || null,
        gymIds: s.gymIds || [],
        durationMonths: s.durationMonths,
        gymType: s.planType === 'multi_gym' ? 'Multi Gym' : 'Single Gym',
        gymCount: s.planType === 'multi_gym' ? Math.max(gymCount, 1) : gymCount,
        status: s.status === 'cancelled' ? 'cancelled' : (isExpired ? 'expired' : s.status),
        subscriptionStatus: s.status,
        startDate: s.startDate,
        endDate: s.endDate,
        amountPaid: subscriptionGymAmount + trainerGymAmount,
        gymAmount: subscriptionGymAmount + trainerGymAmount,
        subscriptionGymAmount,
        trainerGymAmount,
        trainerAddons,
        hasTrainerAddon: trainerAddons.length > 0,
        trainerSummary: trainerAddons.length
          ? trainerAddons.map((addon) => `${addon.trainerName} (${addon.status})`).join(', ')
          : null,
        userPaidAmount: this.money(s.amountPaid),
        cashfreeOrderId: s.razorpayOrderId || null,
        cashfreePaymentId: s.razorpayPaymentId || null,
        invoiceNumber: s.invoiceNumber || null,
        planBaseAmount: gymPlan ? this.money(gymPlan.price) : null,
        createdAt: s.createdAt,
        todayCheckins: todayCheckins.get(s.userId) || 0,
        canDeactivate,
      };
    });

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      stats: { total, active: activeCount, pending: pendingCount, expired: expiredCount, cancelled: cancelledCount },
    };
  }

  async myMembersGrouped(ownerId: string, opts: { page?: number; limit?: number; search?: string; status?: string } = {}) {
    const gym = await this.myGym(ownerId) as any;
    if (!gym) return { data: [], total: 0, page: 1, limit: 20, pages: 0, stats: { total: 0, active: 0, pending: 0, expired: 0, cancelled: 0 } };
    const page = opts.page || 1;
    const limit = opts.limit || 20;
    const skip = (page - 1) * limit;
    const search = opts.search?.trim();

    const makeBaseQuery = () => this.gymSubscriptionsQuery(gym.id);
    const applySearch = (qb: ReturnType<typeof makeBaseQuery>) => {
      if (!search) return qb;
      return qb.andWhere(new Brackets((where) => {
        where
          .where('s."userId"::text ILIKE :q', { q: `%${search}%` })
          .orWhere('u.name ILIKE :q', { q: `%${search}%` });
      }));
    };

    const subs = await applySearch(makeBaseQuery()).orderBy('s.createdAt', 'DESC').getMany();
    const userIds = [...new Set(subs.map((s) => s.userId).filter(Boolean))];
    const subIds = [...new Set(subs.map((s) => s.id).filter(Boolean))];
    const gymPlanIds = [...new Set(subs.map((s) => s.gymPlanId).filter(Boolean))];
    const [users, planRows] = await Promise.all([
      userIds.length ? this.users.find({ where: { id: In(userIds) } }) : [],
      gymPlanIds.length ? this.gymPlans.find({ where: { id: In(gymPlanIds as string[]) } }) : [],
    ]);
    const userMap = new Map<string, UserEntity>(users.map((u): [string, UserEntity] => [u.id, u]));
    const planMap = new Map<string, GymPlanEntity>(planRows.map((p): [string, GymPlanEntity] => [p.id, p]));
    const commissionConfig = await this.directSubscriptionCommissionConfig();
    const {
      byOrder: trainerAddonsByOrder,
      amountByOrder: trainerAmountByOrder,
      checkoutAmountByOrder: trainerCheckoutAmountByOrder,
    } = await this.trainerAddonsByOrder(
      gym.id,
      subs.map((s) => s.razorpayOrderId).filter(Boolean),
    );
    const multiGymVisitCount = await this.multiGymVisitCounts(gym.id, subs.filter((s) => s.planType === 'multi_gym').map((s) => s.id));
    const ratePerDay = await this.multiGymVisitPayout(gym);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const [todayRows, checkinRows] = await Promise.all([
      userIds.length ? this.checkins
        .createQueryBuilder('c')
        .select('c."userId"', 'userId')
        .addSelect('COUNT(*)', 'count')
        .where('c."gymId" = :gymId', { gymId: gym.id })
        .andWhere('c.status = :status', { status: 'success' })
        .andWhere('c."checkinTime" >= :today AND c."checkinTime" < :tomorrow', { today, tomorrow })
        .andWhere('c."userId" IN (:...userIds)', { userIds })
        .groupBy('c."userId"')
        .getRawMany() : [],
      subIds.length ? this.checkins
        .createQueryBuilder('c')
        .select('c."subscriptionId"', 'subscriptionId')
        .addSelect('c."userId"', 'userId')
        .addSelect('COUNT(*)', 'count')
        .addSelect('MAX(c."checkinTime")', 'lastVisit')
        .where('c."gymId" = :gymId', { gymId: gym.id })
        .andWhere('c.status = :status', { status: 'success' })
        .andWhere('c."subscriptionId" IN (:...subIds)', { subIds })
        .groupBy('c."subscriptionId"')
        .addGroupBy('c."userId"')
        .getRawMany() : [],
    ]);
    const todayCheckins = new Map(todayRows.map((row: any) => [row.userId, Number(row.count || 0)]));
    const checkinsBySub = new Map(checkinRows.map((row: any) => [row.subscriptionId, {
      count: Number(row.count || 0),
      lastVisit: row.lastVisit ? new Date(row.lastVisit).toISOString() : null,
    }]));
    const checkinsByUser = new Map<string, { count: number; lastVisit: string | null }>();
    for (const row of checkinRows as any[]) {
      const current = checkinsByUser.get(row.userId) || { count: 0, lastVisit: null };
      const rowLast = row.lastVisit ? new Date(row.lastVisit).toISOString() : null;
      current.count += Number(row.count || 0);
      if (rowLast && (!current.lastVisit || rowLast > current.lastVisit)) current.lastVisit = rowLast;
      checkinsByUser.set(row.userId, current);
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const historyRows = subs.map((s) => {
      const user = userMap.get(s.userId);
      const gymPlan = s.gymPlanId ? planMap.get(s.gymPlanId) : null;
      const belongsByGymPlan = gymPlan?.gymId === gym.id;
      const isExpired = s.endDate ? String(s.endDate).slice(0, 10) < todayIso : false;
      const gymCount = Math.max((s.gymIds || []).length, belongsByGymPlan ? 1 : 0);
      const canDeactivate = s.planType !== 'multi_gym' && ((s.gymIds || []).includes(gym.id) || belongsByGymPlan);
      const trainerAddons = s.razorpayOrderId ? (trainerAddonsByOrder.get(s.razorpayOrderId) || []) : [];
      const trainerGymAmount = s.razorpayOrderId ? (trainerAmountByOrder.get(s.razorpayOrderId) || 0) : 0;
      const trainerCheckoutAmount = s.razorpayOrderId ? (trainerCheckoutAmountByOrder.get(s.razorpayOrderId) || 0) : 0;
      const subscriptionGymAmount = s.planType === 'multi_gym'
        ? this.money((multiGymVisitCount.get(s.id) || 0) * ratePerDay)
        : this.gymPlanAmount(
          s,
          gym,
          gymPlan,
          commissionConfig[s.planType as 'same_gym' | 'day_pass'],
          this.subscriptionCheckoutWithoutTrainer(s, trainerCheckoutAmount),
        );
      const checkinSummary = checkinsBySub.get(s.id) || { count: 0, lastVisit: null };
      const memberCode = this.memberCode(s.userId);
      return {
        id: s.id,
        subscriptionId: s.id,
        userId: s.userId,
        memberCode,
        name: this.memberName(user, s.userId),
        phone: null,
        planType: s.planType,
        planName: gymPlan?.name || null,
        gymPlanId: s.gymPlanId || null,
        gymIds: s.gymIds || [],
        durationMonths: s.durationMonths,
        gymType: s.planType === 'multi_gym' ? 'Multi Gym' : 'Single Gym',
        gymCount: s.planType === 'multi_gym' ? Math.max(gymCount, 1) : gymCount,
        status: s.status === 'cancelled' ? 'cancelled' : (isExpired ? 'expired' : s.status),
        subscriptionStatus: s.status,
        startDate: s.startDate,
        endDate: s.endDate,
        amountPaid: subscriptionGymAmount + trainerGymAmount,
        gymAmount: subscriptionGymAmount + trainerGymAmount,
        subscriptionGymAmount,
        trainerGymAmount,
        trainerAddons,
        hasTrainerAddon: trainerAddons.length > 0,
        trainerSummary: trainerAddons.length
          ? trainerAddons.map((addon) => `${addon.trainerName} (${addon.status})`).join(', ')
          : null,
        userPaidAmount: this.money(s.amountPaid),
        cashfreeOrderId: s.razorpayOrderId || null,
        cashfreePaymentId: s.razorpayPaymentId || null,
        invoiceNumber: s.invoiceNumber || null,
        planBaseAmount: gymPlan ? this.money(gymPlan.price) : null,
        createdAt: s.createdAt,
        todayCheckins: todayCheckins.get(s.userId) || 0,
        checkinsAtGym: (checkinSummary as any).count || 0,
        lastVisitAt: (checkinSummary as any).lastVisit,
        canDeactivate,
      };
    });

    const grouped = new Map<string, any>();
    for (const row of historyRows) {
      const group = grouped.get(row.userId) || { userId: row.userId, memberCode: row.memberCode, name: row.name, phone: null, history: [] };
      group.history.push(row);
      grouped.set(row.userId, group);
    }

    const members = Array.from(grouped.values()).map((group: any) => {
      const history = group.history.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const current = history.find((item: any) => item.status === 'active') || history[0];
      const userCheckins = checkinsByUser.get(group.userId) || { count: 0, lastVisit: null };
      const lifetimeGymAmount = history.reduce((sum: number, item: any) => sum + Number(item.gymAmount || item.amountPaid || 0), 0);
      return {
        ...current,
        id: current.id,
        memberId: group.userId,
        memberCode: group.memberCode || this.memberCode(group.userId),
        phone: null,
        currentSubscriptionId: current.id,
        subscriptionCount: history.length,
        history,
        totalCheckinsAtGym: userCheckins.count,
        lastVisitAt: userCheckins.lastVisit,
        lastVisit: userCheckins.lastVisit ? new Date(userCheckins.lastVisit).toLocaleString('en-IN') : 'No visits',
        lifetimeGymAmount,
      };
    });

    const statusFilter = opts.status && opts.status !== 'all' ? opts.status : null;
    const filtered = statusFilter ? members.filter((member) => member.status === statusFilter) : members;
    const total = filtered.length;
    const data = filtered.slice(skip, skip + limit);
    const stats = {
      total: members.length,
      active: members.filter((member) => member.status === 'active').length,
      pending: members.filter((member) => member.status === 'pending').length,
      expired: members.filter((member) => member.status === 'expired').length,
      cancelled: members.filter((member) => member.status === 'cancelled').length,
    };

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      stats,
    };
  }

  async deactivateMember(ownerId: string, subId: string) {
    const gym = await this.myGym(ownerId) as any;
    if (!gym) throw new NotFoundException('Gym not found');
    const sub = await this.subs.findOne({ where: { id: subId } });
    if (!sub) throw new NotFoundException('Subscription not found');
    if (sub.planType === 'multi_gym') throw new ForbiddenException('Multi-gym passes are managed by the platform admin');
    const belongsByGymIds = (sub.gymIds || []).includes(gym.id);
    const plan = !belongsByGymIds && sub.gymPlanId
      ? await this.gymPlans.findOne({ where: { id: sub.gymPlanId } })
      : null;
    if (!belongsByGymIds && plan?.gymId !== gym.id) throw new NotFoundException('Member not in this gym');
    await this.subs.update(subId, { status: 'cancelled' as any });
    return { success: true, message: 'Member subscription deactivated' };
  }

  async myCheckins(ownerId: string, page: any = 1, limit: any = 20) {
    const gym = await this.myGym(ownerId) as any;
    if (!gym) return { data: [], total: 0, page: 1, limit: 20, pages: 0 };
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.checkins.findAndCount({
      where: { gymId: gym.id },
      order: { checkinTime: 'DESC' },
      skip, take,
    });
    const subIds = [...new Set(data.map((c) => c.subscriptionId).filter(Boolean))];
    const userIds = [...new Set(data.map((c) => c.userId).filter(Boolean))];
    const [subs, users] = await Promise.all([
      subIds.length ? this.subs.find({ where: { id: In(subIds) } }) : [],
      userIds.length ? this.users.find({ where: { id: In(userIds) } }) : [],
    ]);
    const subMap = new Map<string, SubscriptionEntity>(subs.map((s): [string, SubscriptionEntity] => [s.id, s]));
    const userMap = new Map<string, UserEntity>(users.map((u): [string, UserEntity] => [u.id, u]));
    const ratePerDay = await this.multiGymVisitPayout(gym);
    const adminShare = 0;
    const enriched = data.map(c => {
      const sub = subMap.get(c.subscriptionId);
      const user = userMap.get(c.userId);
      const gymShare = sub?.planType === 'multi_gym' ? ratePerDay : 0;
      return {
        ...c,
        planType: sub?.planType || null,
        memberCode: this.memberCode(c.userId),
        userName: this.memberName(user, c.userId),
        userPhone: null,
        ratePerDay,
        gymEarns: c.status === 'success' ? gymShare : 0,
        adminEarns: c.status === 'success' ? adminShare : 0,
      };
    });
    return { data: enriched, total, page: p, limit: l, pages: Math.ceil(total / l), gym: { name: gym.name, ratePerDay, commissionRate: 0, payoutMode: 'multi_gym_visit_payout' } };
  }

  async myTodayStats(ownerId: string) {
    const gym = await this.myGym(ownerId) as any;
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

  async myReport(ownerId: string, from?: string, to?: string) {
    const gym = await this.myGym(ownerId) as any;
    if (!gym) {
      return { totalCheckins: 0, uniqueMembers: 0, subscriberCount: 0, activeSubscribers: 0, peakHour: '--', revenueShare: 0, lifetimeGymEarned: 0, dailyCheckins: [], topMembers: [] };
    }
    const end = to ? new Date(to) : new Date();
    end.setHours(23, 59, 59, 999);
    const start = from ? new Date(from) : new Date(end);
    if (!from) start.setDate(start.getDate() - 29);
    start.setHours(0, 0, 0, 0);

    const [rows, allSubs, periodSubs] = await Promise.all([
      this.checkins.find({
        where: { gymId: gym.id, status: 'success', checkinTime: Between(start, end) },
        order: { checkinTime: 'ASC' },
      }),
      this.gymSubscriptionsQuery(gym.id)
        .andWhere('s.status IN (:...statuses)', { statuses: this.paidSubscriptionStatuses() })
        .getMany(),
      this.gymSubscriptionsQuery(gym.id)
        .andWhere('s.status IN (:...statuses)', { statuses: this.paidSubscriptionStatuses() })
        .andWhere('s."createdAt" >= :start AND s."createdAt" <= :end', { start, end })
        .getMany(),
    ]);
    const userIds = [...new Set(rows.map((row) => row.userId).filter(Boolean))];
    const subIds = [...new Set(rows.map((row) => row.subscriptionId).filter(Boolean))];
    const allReportSubs = [...allSubs, ...periodSubs];
    const gymPlanIds = [...new Set(allReportSubs.map((s) => s.gymPlanId).filter(Boolean))];
    const [users, subs] = await Promise.all([
      userIds.length ? this.users.find({ where: { id: In(userIds) } }) : [],
      subIds.length ? this.subs.find({ where: { id: In(subIds) } }) : [],
    ]);
    const plans = gymPlanIds.length ? await this.gymPlans.find({ where: { id: In(gymPlanIds as string[]) } }) : [];
    const planMap = new Map(plans.map((plan) => [plan.id, plan]));
    const userMap = new Map<string, UserEntity>(users.map((u): [string, UserEntity] => [u.id, u]));
    const subMap = new Map<string, SubscriptionEntity>(subs.map((s): [string, SubscriptionEntity] => [s.id, s]));
    const commissionConfig = await this.directSubscriptionCommissionConfig();
    const { checkoutAmountByOrder: reportTrainerCheckoutAmountByOrder } = await this.trainerAddonsByOrder(
      gym.id,
      allReportSubs.map((s) => s.razorpayOrderId).filter(Boolean),
    );
    const daily = new Map<string, number>();
    const hourly = new Map<number, number>();
    const members = new Map<string, { id: string; memberCode: string; name: string; visits: number; plan: string; lastVisit: string }>();
    for (const row of rows) {
      const date = new Date(row.checkinTime);
      const key = date.toISOString().slice(0, 10);
      daily.set(key, (daily.get(key) || 0) + 1);
      hourly.set(date.getHours(), (hourly.get(date.getHours()) || 0) + 1);
      const user = userMap.get(row.userId);
      const sub = subMap.get(row.subscriptionId);
      const member = members.get(row.userId) || {
        id: row.userId,
        memberCode: this.memberCode(row.userId),
        name: this.memberName(user, row.userId),
        visits: 0,
        plan: sub?.planType || 'Membership',
        lastVisit: '',
      };
      member.visits += 1;
      member.lastVisit = date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      members.set(row.userId, member);
    }
    const dailyCheckins = Array.from(daily.entries()).map(([day, count]) => ({
      day: new Date(day).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      count,
    }));
    const peak = Array.from(hourly.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
    const peakHour = peak === undefined ? '--' : `${String(peak).padStart(2, '0')}:00`;
    const ratePerDay = await this.multiGymVisitPayout(gym);
    const directPlans = (list: SubscriptionEntity[]) => list.filter((sub) => sub.planType === 'same_gym' || sub.planType === 'day_pass');
    const planAmountForReport = (sub: SubscriptionEntity) => {
      const trainerCheckoutAmount = sub.razorpayOrderId ? (reportTrainerCheckoutAmountByOrder.get(sub.razorpayOrderId) || 0) : 0;
      return this.gymPlanAmount(
        sub,
        gym,
        sub.gymPlanId ? planMap.get(sub.gymPlanId) : null,
        commissionConfig[sub.planType as 'same_gym' | 'day_pass'],
        this.subscriptionCheckoutWithoutTrainer(sub, trainerCheckoutAmount),
      );
    };
    const totalForPlans = (list: SubscriptionEntity[]) => directPlans(list).reduce((sum, sub) => sum + planAmountForReport(sub), 0);
    const sameGymRevenue = periodSubs
      .filter((sub) => sub.planType === 'same_gym')
      .reduce((sum, sub) => sum + planAmountForReport(sub), 0);
    const dayPassRevenue = periodSubs
      .filter((sub) => sub.planType === 'day_pass')
      .reduce((sum, sub) => sum + planAmountForReport(sub), 0);
    const periodMultiGymSubIds = [...new Set(rows
      .filter((row) => subMap.get(row.subscriptionId)?.planType === 'multi_gym')
      .map((row) => row.subscriptionId)
      .filter(Boolean))];
    const allMultiGymSubIds = allSubs.filter((sub) => sub.planType === 'multi_gym').map((sub) => sub.id);
    const [periodMultiVisits, lifetimeMultiVisits, periodTrainer, lifetimeTrainer] = await Promise.all([
      this.multiGymVisitCounts(gym.id, periodMultiGymSubIds, start, end),
      this.multiGymVisitCounts(gym.id, allMultiGymSubIds),
      this.trainerTotalsForGym(gym.id, start, end),
      this.trainerTotalsForGym(gym.id),
    ]);
    const multiGymRevenue = Array.from(periodMultiVisits.values()).reduce((sum, visits) => sum + visits * ratePerDay, 0);
    const lifetimeMultiGymRevenue = Array.from(lifetimeMultiVisits.values()).reduce((sum, visits) => sum + visits * ratePerDay, 0);
    const subscriptionRevenue = sameGymRevenue + dayPassRevenue;
    const periodGymEarned = subscriptionRevenue + multiGymRevenue + periodTrainer.gymAmount;
    const lifetimeGymEarned = totalForPlans(allSubs) + lifetimeMultiGymRevenue + lifetimeTrainer.gymAmount;
    const todayIso = new Date().toISOString().slice(0, 10);
    const subscriberCount = directPlans(allSubs).length;
    const activeSubscribers = directPlans(allSubs).filter((sub) => sub.status === 'active' && String(sub.endDate).slice(0, 10) >= todayIso).length;
    return {
      totalCheckins: rows.length,
      uniqueMembers: userIds.length,
      subscriberCount,
      activeSubscribers,
      peakHour,
      revenueShare: this.money(periodGymEarned),
      periodGymEarned: this.money(periodGymEarned),
      lifetimeGymEarned: this.money(lifetimeGymEarned),
      subscriptionRevenue: this.money(subscriptionRevenue),
      sameGymRevenue: this.money(sameGymRevenue),
      dayPassRevenue: this.money(dayPassRevenue),
      multiGymRevenue: this.money(multiGymRevenue),
      trainerRevenue: this.money(periodTrainer.gymAmount),
      trainerAddonsCount: periodTrainer.count,
      dailyCheckins,
      topMembers: Array.from(members.values()).sort((a, b) => b.visits - a.visits).slice(0, 10),
    };
  }

  private validCoordinate(lat: any, lng: any) {
    const parsedLat = Number(lat);
    const parsedLng = Number(lng);
    return Number.isFinite(parsedLat) && Number.isFinite(parsedLng)
      && parsedLat >= -90 && parsedLat <= 90 && parsedLng >= -180 && parsedLng <= 180
      ? { lat: parsedLat, lng: parsedLng }
      : null;
  }

  private hasValidGymLocation(gym: any) {
    const location = this.validCoordinate(gym?.lat, gym?.lng);
    return !!location && !(location.lat === 0 && location.lng === 0);
  }

  private assertGymLocationReady(gym: any) {
    if (!gym) throw new NotFoundException('Gym not found');
    if (!this.hasValidGymLocation(gym)) {
      throw new BadRequestException('Set valid gym latitude and longitude before approving or activating this gym');
    }
  }

  private requireSubmittedLocation(data: any) {
    const location = this.validCoordinate(data?.lat, data?.lng);
    if (!location || (location.lat === 0 && location.lng === 0)) {
      throw new BadRequestException('Set a valid latitude and longitude for the gym location');
    }
    return location;
  }

  private publicVisibilityPredicate(alias = 'g') {
    return `${alias}.status = :publicStatus AND ${alias}."kycStatus" = 'approved' AND ${this.publicLocationPredicate(alias)}`;
  }

  private publicLocationPredicate(alias = 'g') {
    return `${alias}.lat IS NOT NULL AND ${alias}.lng IS NOT NULL AND NOT (${alias}.lat = 0 AND ${alias}.lng = 0)`;
  }

  private validRadiusKm(value: any) {
    const radius = Number(value);
    if (!Number.isFinite(radius) || radius <= 0) return null;
    return Math.min(radius, 500);
  }

  async list(
    filter: { country?: string; state?: string; city?: string; status?: string; kycStatus?: string; search?: string; tier?: string; category?: string; lat?: string; lng?: string; sort?: string; radiusKm?: string } = {},
    page: any = 1,
    limit: any = 20,
    options: { includeSensitive?: boolean; publicOnly?: boolean } = {},
  ) {
    const qb = this.safeGymQuery('g', !!options.includeSensitive);
    if (filter.country) qb.andWhere('LOWER(COALESCE(g.country, :defaultCountry)) = LOWER(:country)', { defaultCountry: 'India', country: filter.country });
    if (filter.state) qb.andWhere('LOWER(COALESCE(g.state, \'\')) = LOWER(:state)', { state: filter.state });
    if (filter.city) qb.andWhere('LOWER(g.city) = LOWER(:city)', { city: filter.city });
    if (options.publicOnly !== false) {
      if (filter.status && filter.status !== 'active') qb.andWhere('1 = 0');
      else qb.andWhere(this.publicVisibilityPredicate('g'), { publicStatus: 'active' });
    } else if (filter.status) {
      qb.andWhere('g.status = :status', { status: filter.status });
    }
    if (filter.kycStatus) qb.andWhere('g."kycStatus" = :kycStatus', { kycStatus: filter.kycStatus });
    if (filter.search) qb.andWhere('g.name ILIKE :search', { search: `%${filter.search}%` });
    if (filter.tier) {
      // Map mobile display names to DB enum values
      const tierMap: Record<string, string> = {
        elite: 'corporate_exclusive',
        premium: 'premium',
        standard: 'standard',
        corporate_exclusive: 'corporate_exclusive',
      };
      qb.andWhere('g.tier = :tier', { tier: tierMap[filter.tier.toLowerCase()] ?? filter.tier.toLowerCase() });
    }
    if (filter.category) {
      qb.andWhere(`
        EXISTS (
          SELECT 1
          FROM unnest(COALESCE(g.categories, ARRAY[]::text[]) || COALESCE(g.amenities, ARRAY[]::text[])) AS cat(name)
          WHERE lower(cat.name) = lower(:category)
             OR regexp_replace(lower(cat.name), '[^a-z0-9]+', '', 'g') = regexp_replace(lower(:category), '[^a-z0-9]+', '', 'g')
        )
      `, { category: filter.category });
    }
    const location = this.validCoordinate(filter.lat, filter.lng);
    const radiusKm = location ? this.validRadiusKm(filter.radiusKm) : null;
    const distanceExpr = `(6371 * acos(least(1, greatest(-1, cos(radians(:lat)) * cos(radians(g.lat)) * cos(radians(g.lng) - radians(:lng)) + sin(radians(:lat)) * sin(radians(g.lat))))))`;
    if (location) {
      qb.addSelect(
        distanceExpr,
        'distanceKm',
      ).setParameters(location);
      if (filter.sort === 'nearest' || filter.sort === 'nearby_best' || radiusKm !== null) {
        qb.andWhere('NOT (g.lat = 0 AND g.lng = 0)');
      }
      if (radiusKm !== null) {
        qb.andWhere(`${distanceExpr} <= :radiusKm`, { radiusKm });
      }
    }
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const rankedQuery = qb.clone();
    if (location && (filter.sort === 'nearby_best' || filter.sort === 'nearest' || radiusKm !== null)) {
      if (filter.sort === 'nearby_best') {
        rankedQuery
          .orderBy(`CASE
            WHEN ${distanceExpr} <= 2 THEN 0
            WHEN ${distanceExpr} <= 5 THEN 1
            WHEN ${distanceExpr} <= 10 THEN 2
            WHEN ${distanceExpr} <= 25 THEN 3
            WHEN ${distanceExpr} <= 50 THEN 4
            ELSE 5
          END`, 'ASC')
          .addOrderBy('"rating"', 'DESC')
          .addOrderBy('"ratingCount"', 'DESC')
          .addOrderBy('"totalCheckins"', 'DESC')
          .addOrderBy('"distanceKm"', 'ASC');
      } else {
        rankedQuery.orderBy('"distanceKm"', 'ASC').addOrderBy('"rating"', 'DESC').addOrderBy('"ratingCount"', 'DESC');
      }
    } else {
      rankedQuery.orderBy(filter.kycStatus ? 'g.updatedAt' : '"rating"', 'DESC').addOrderBy('"ratingCount"', 'DESC');
    }
    const [data, total] = await Promise.all([
      rankedQuery.skip(skip).take(take).getRawMany(),
      qb.clone().getCount(),
    ]);
    const liveRows = await this.withLiveRatings(data);
    return paginatedResponse(liveRows.map((row) => this.normalizeGym(row, { publicView: options.publicOnly !== false })), total, p, l);
  }

  async get(id: string, options: { publicOnly?: boolean } = {}) {
    const row = await this.safeGymQuery('g').where('g.id = :id', { id }).getRawOne();
    if (!row) throw new NotFoundException('Gym not found');
    if (options.publicOnly && (row.status !== 'active' || row.kycStatus !== 'approved' || !this.hasValidGymLocation(row))) {
      throw new NotFoundException('Gym not found');
    }
    const [liveRow] = await this.withLiveRatings([row]);
    return this.attachMasterDetails(liveRow, { publicView: !!options.publicOnly });
  }

  async adminList(filter: { country?: string; state?: string; city?: string; status?: string; kycStatus?: string; search?: string; tier?: string; category?: string } = {}, page: any = 1, limit: any = 20) {
    return this.list(filter, page, limit, { includeSensitive: true, publicOnly: false });
  }

  async create(data: Partial<GymEntity>) {
    const patch = this.sanitizeGymPatch(data, true);
    const categories = await this.canonicalCategories((data as any)?.categories);
    if (categories !== undefined) (patch as any).categories = categories;
    if ((patch as any).status === 'active') {
      this.assertGymLocationReady(patch);
      this.assertKycApproved(patch);
    }
    return this.repo.save(this.repo.create(patch));
  }

  async update(id: string, data: Partial<GymEntity>, user: any) {
    const gym = await this.assertGymAccess(id, user);
    const patch = this.sanitizeGymPatch(data, user?.role === 'super_admin');
    if (user?.role !== 'super_admin') {
      delete (patch as any).lat;
      delete (patch as any).lng;
    }
    const categories = await this.canonicalCategories((data as any)?.categories);
    if (categories !== undefined) (patch as any).categories = categories;
    const effectiveGym = { ...gym, ...patch };
    if ((patch as any).status === 'active' || gym.status === 'active') {
      this.assertGymLocationReady(effectiveGym);
      this.assertKycApproved(effectiveGym);
    }
    await this.repo.update(id, patch);
    await this.syncProfileHoursToSchedule(id, patch as any);
    return this.get(id);
  }

  async submitMyLocation(ownerId: string, data: { lat?: number; lng?: number }) {
    const gym = await this.gymEntityForActor(ownerId);
    if (!gym) throw new NotFoundException('Gym not found');
    if (this.hasValidGymLocation(gym)) {
      throw new BadRequestException('Gym location is already submitted. Contact admin to change latitude or longitude.');
    }
    const location = this.requireSubmittedLocation(data);
    await this.repo.update(gym.id, { lat: location.lat, lng: location.lng });
    return this.get(gym.id);
  }

  private async syncProfileHoursToSchedule(gymId: string, patch: any) {
    const touchesHours = ['openingTime', 'closingTime', 'breakStartTime', 'breakEndTime'].some((key) => key in patch);
    if (!touchesHours) return;
    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
      let row = await this.schedules.findOne({ where: { gymId, dayOfWeek } });
      if (!row) {
        row = this.schedules.create({
          gymId,
          dayOfWeek,
          isOpen: dayOfWeek < 6,
          openTime: patch.openingTime || '06:00',
          closeTime: patch.closingTime || '22:00',
          breakStartTime: patch.breakStartTime ?? null,
          breakEndTime: patch.breakEndTime ?? null,
        });
      } else {
        if (patch.openingTime) row.openTime = patch.openingTime;
        if (patch.closingTime) row.closeTime = patch.closingTime;
        if ('breakStartTime' in patch) row.breakStartTime = patch.breakStartTime ?? null;
        if ('breakEndTime' in patch) row.breakEndTime = patch.breakEndTime ?? null;
      }
      await this.schedules.save(row);
    }
  }

  async updateMyAmenities(ownerId: string, names: string[]) {
    const gym = await this.gymEntityForActor(ownerId);
    if (!gym) throw new NotFoundException('Gym not found');
    const active = await this.amenities.find({ where: { isActive: true, status: 'approved' } });
    const byName = new Map(active.map((a) => [a.name.trim().toLowerCase(), a.name.trim()]));
    const normalized = [...new Set((names || []).map((n) => byName.get(String(n).trim().toLowerCase())).filter(Boolean) as string[])];
    await this.repo.update(gym.id, { amenities: normalized });
    return { success: true, amenities: normalized };
  }

  async approve(id: string) {
    const gym = await this.repo.findOne({ where: { id } });
    if (!gym) throw new NotFoundException('Gym not found');
    this.assertGymLocationReady(gym);
    if (!this.areRequiredKycDocsSubmitted(gym.kycDocuments || [])) {
      const missing = this.missingKycLabels(gym.kycDocuments || []).join(', ');
      throw new BadRequestException(`All required KYC details must be submitted before approval${missing ? `: ${missing}` : ''}`);
    }
    const docs = (gym.kycDocuments || []).map((d: any) => ({
      ...d,
      status: 'approved',
      reviewedAt: new Date().toISOString(),
    }));
    if (!this.areRequiredKycDocsApproved(docs)) {
      const missing = this.missingKycLabels(docs, true).join(', ');
      throw new BadRequestException(`Approve all required KYC details before activating this gym${missing ? `: ${missing}` : ''}`);
    }
    const kycPhotos = this.kycPhotoUrls(docs);
    const existingPhotos = Array.isArray(gym?.photos) ? gym.photos.filter(Boolean) : [];
    const photos = [...new Set([...existingPhotos, ...kycPhotos])];
    await this.repo.update(id, {
      status: 'active' as GymStatus,
      kycStatus: 'approved',
      kycDocuments: docs,
      kycReviewNote: null,
      coverPhoto: gym?.coverPhoto || photos[0] || null,
      photos,
    });
    return this.get(id);
  }

  async reject(id: string, reason?: string) {
    const gym = await this.repo.findOne({ where: { id } });
    const docs = (gym?.kycDocuments || []).map((d: any) => ({
      ...d,
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      reviewNote: reason || d.reviewNote,
    }));
    await this.repo.update(id, { status: 'rejected' as GymStatus, kycStatus: 'rejected', kycDocuments: docs, kycReviewNote: reason || null });
    return this.get(id);
  }

  async reviewKycDocument(id: string, type: string, body: { status: 'approved' | 'rejected'; reason?: string }, user: any) {
    const gym = await this.repo.findOne({ where: { id } });
    if (!gym) throw new NotFoundException('Gym not found');
    if (!this.kycSchemas[type]) throw new BadRequestException('Invalid KYC type');
    if (!['approved', 'rejected'].includes(body?.status)) throw new BadRequestException('Status must be approved or rejected');
    const docs = [...(gym.kycDocuments || [])];
    const index = docs.findIndex((doc: any) => doc.type === type);
    if (index < 0) throw new NotFoundException('KYC document not submitted');
    docs[index] = {
      ...docs[index],
      status: body.status,
      reviewedAt: new Date().toISOString(),
      reviewedBy: user?.userId || null,
      reviewNote: body.status === 'rejected' ? (body.reason || 'Rejected by admin') : null,
    };
    const kycStatus = this.recomputeKycStatus(docs);
    const kycPhotos = kycStatus === 'approved' ? this.kycPhotoUrls(docs) : [];
    const existingPhotos = Array.isArray(gym.photos) ? gym.photos.filter(Boolean) : [];
    const photos = kycStatus === 'approved' ? [...new Set([...existingPhotos, ...kycPhotos])] : existingPhotos;
    const nextStatus = this.statusForKyc(kycStatus, gym.status);
    if (nextStatus === 'active') this.assertGymLocationReady(gym);
    const rejectedDoc = docs.find((doc: any) => doc.status === 'rejected');
    await this.repo.update(id, {
      status: nextStatus,
      kycStatus,
      kycDocuments: docs,
      kycReviewNote: kycStatus === 'approved' ? null : (rejectedDoc?.reviewNote || null),
      coverPhoto: kycStatus === 'approved' ? (gym.coverPhoto || photos[0] || null) : gym.coverPhoto,
      photos,
    });
    return this.getKycStatus(id);
  }

  async suspend(id: string) {
    return this.setStatus(id, 'suspended');
  }

  async setStatus(id: string, status: GymStatus) {
    const allowedStatuses: GymStatus[] = ['pending', 'active', 'suspended', 'rejected', 'inactive'];
    if (!allowedStatuses.includes(status)) throw new BadRequestException('Invalid gym status');
    const gym = await this.repo.findOne({ where: { id } });
    if (!gym) throw new NotFoundException('Gym not found');
    if (status === 'active') {
      this.assertGymLocationReady(gym);
      this.assertKycApproved(gym);
    }
    await this.repo.update(id, { status });
    return this.get(id);
  }

  async setTier(id: string, tier: string, commissionRate: number) {
    const tierMap: Record<string, string> = {
      elite: 'corporate_exclusive',
      corporate_exclusive: 'corporate_exclusive',
      premium: 'premium',
      standard: 'standard',
    };
    const normalizedTier = tierMap[String(tier || '').toLowerCase()] || 'standard';
    const normalizedCommission = Math.max(0, Math.min(100, Number(commissionRate) || 0));
    await this.repo.update(id, { tier: normalizedTier as any, commissionRate: normalizedCommission });
    return this.get(id);
  }

  async submitKycDocument(gymId: string, doc: { name?: string; url?: string; type: string; fields?: Record<string, any>; fileName?: string; mimeType?: string }, user: any) {
    const gym = await this.assertGymAccess(gymId, user);
    if (!gym) throw new NotFoundException('Gym not found');
    const schema = this.kycSchemas[doc.type];
    if (!schema) throw new BadRequestException('Invalid KYC type');
    const fields = doc.fields || {};
    for (const field of schema.fields) {
      const hasUploadedDocument = field.type === 'url' && String(doc.url || '').trim();
      if (field.required && !hasUploadedDocument && !String(fields[field.key] ?? '').trim()) {
        throw new BadRequestException(`${field.label} is required`);
      }
    }
    const docs = gym.kycDocuments || [];
    const url = doc.url || fields.documentUrl || fields.cancelledChequeUrl || fields.exteriorPhotoUrl || fields.certificateUrl;
    const name = doc.name || schema.label;
    const nextDoc = {
      type: doc.type,
      name,
      url,
      fields,
      fileName: doc.fileName || null,
      mimeType: doc.mimeType || null,
      status: 'in_review' as const,
      uploadedAt: new Date().toISOString(),
    };
    const existingIndex = docs.findIndex((d: any) => d.type === doc.type);
    const existingDoc = existingIndex >= 0 ? docs[existingIndex] : null;
    if (existingDoc && existingDoc.status !== 'rejected') {
      throw new BadRequestException('This KYC document is already submitted or approved');
    }
    if (existingIndex >= 0) docs[existingIndex] = nextDoc;
    else docs.push(nextDoc);
    const kycStatus = this.recomputeKycStatus(docs);
    const nextStatus = this.statusForKyc(kycStatus, gym.status);
    await this.repo.update(gymId, { kycDocuments: docs, kycStatus, status: nextStatus, kycReviewNote: null });
    return { success: true, documents: docs };
  }

  async getKycStatus(gymId: string) {
    const row = await this.safeGymQuery('g', true).where('g.id = :id', { id: gymId }).getRawOne();
    const gym = await this.attachSchedule(row) as any;
    return { kycStatus: gym?.kycStatus || 'not_started', kycReviewNote: gym?.kycReviewNote || null, kycDocuments: gym?.kycDocuments || [], schemas: this.kycSchemas };
  }

  async getKycStatusForUser(gymId: string, user: any) {
    await this.assertGymAccess(gymId, user);
    return this.getKycStatus(gymId);
  }

  async getRecommended(userId: string) {
    const subs = await this.subs.find({ where: { userId }, take: 5, order: { createdAt: 'DESC' } });
    const gymIds = subs.map(s => (s.gymIds || [])).flat();

    const usedGyms = gymIds.length > 0
      ? await this.safeGymQuery('g').where('g.id IN (:...ids)', { ids: gymIds.slice(0, 3) }).getRawMany()
      : [];
    const preferredCities = [...new Set(usedGyms.map(g => g.city).filter(Boolean))];
    const preferredCategories = [...new Set(usedGyms.map(g => g.categories || []).flat().filter(Boolean))];

    const excludeIds = gymIds.length > 0 ? gymIds : ['00000000-0000-0000-0000-000000000000'];

    const qb = this.safeGymQuery('gym')
      .where(this.publicVisibilityPredicate('gym'), { publicStatus: 'active' })
      .andWhere('gym.id NOT IN (:...usedIds)', { usedIds: excludeIds })
      .orderBy('"rating"', 'DESC')
      .take(10);

    if (preferredCities.length > 0) {
      qb.andWhere('gym.city IN (:...cities)', { cities: preferredCities });
    }
    if (preferredCategories.length > 0) {
      qb.andWhere(`
        EXISTS (
          SELECT 1
          FROM unnest(COALESCE(gym.categories, ARRAY[]::text[]) || COALESCE(gym.amenities, ARRAY[]::text[])) AS cat(name)
          WHERE lower(cat.name) IN (:...cats)
        )
      `, { cats: preferredCategories.map((category) => String(category).toLowerCase()) });
    }

    const recommended = await qb.getRawMany();

    if (recommended.length < 5) {
      const topRated = await this.safeGymQuery('g')
        .where(this.publicVisibilityPredicate('g'), { publicStatus: 'active' })
        .orderBy('"rating"', 'DESC')
        .take(10)
        .getRawMany();
      const existing = new Set(recommended.map(g => g.id));
      for (const g of topRated) {
        if (!existing.has(g.id)) recommended.push(g);
        if (recommended.length >= 10) break;
      }
    }
    const liveRows = await this.withLiveRatings(recommended.slice(0, 10));
    return liveRows.map((row) => this.normalizeGym(row));
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
  ) { return this.svc.myMembersGrouped(req.user.userId, { page: +page, limit: +limit, search, status }); }

  @Get('my-reviews') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner', 'gym_staff')
  myReviews(@Req() req: any) { return this.svc.myReviews(req.user.userId); }

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

  @Get('my-report') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner', 'gym_staff')
  myReport(@Req() req: any, @Query('from') from?: string, @Query('to') to?: string) {
    return this.svc.myReport(req.user.userId, from, to);
  }

  @Put('my-gym/amenities') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner', 'gym_staff')
  updateMyAmenities(@Req() req: any, @Body() body: { amenities: string[] }) {
    return this.svc.updateMyAmenities(req.user.userId, body.amenities || []);
  }

  @Put('my-gym/location') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner', 'gym_staff')
  submitMyLocation(@Req() req: any, @Body() body: { lat?: number; lng?: number }) {
    return this.svc.submitMyLocation(req.user.userId, body);
  }

  @Get() list(
    @Query('country') country?: string,
    @Query('state') state?: string,
    @Query('city') city?: string,
    @Query('status') status?: string,
    @Query('kycStatus') kycStatus?: string,
    @Query('search') search?: string,
    @Query('tier') tier?: string,
    @Query('category') category?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('sort') sort?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.list({ country, state, city, status, kycStatus, search, tier, category, lat, lng, sort, radiusKm }, +page, +limit, { publicOnly: true });
  }

  @Get('admin/list') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  adminList(
    @Query('country') country?: string,
    @Query('state') state?: string,
    @Query('city') city?: string,
    @Query('status') status?: string,
    @Query('kycStatus') kycStatus?: string,
    @Query('search') search?: string,
    @Query('tier') tier?: string,
    @Query('category') category?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.adminList({ country, state, city, status, kycStatus, search, tier, category }, +page, +limit);
  }
  @Get('recommended') @UseGuards(JwtAuthGuard)
  recommended(@Req() req: any) { return this.svc.getRecommended(req.user.userId); }

  @Get(':id') get(@Param('id') id: string) { return this.svc.get(id, { publicOnly: true }); }
  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin', 'gym_owner')
  create(@Body() body: Partial<GymEntity>) { return this.svc.create(body); }

  @Put(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin', 'gym_owner')
  update(@Param('id') id: string, @Body() body: Partial<GymEntity>, @Req() req: any) { return this.svc.update(id, body, req.user); }

  @Post(':id/approve') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  approve(@Param('id') id: string) { return this.svc.approve(id); }

  @Post(':id/reject') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  reject(@Param('id') id: string, @Body() body: any) { return this.svc.reject(id, body?.reason); }

  @Post(':id/suspend') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  suspend(@Param('id') id: string) { return this.svc.suspend(id); }

  @Post(':id/activate') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  activate(@Param('id') id: string) { return this.svc.setStatus(id, 'active'); }

  @Post(':id/deactivate') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  deactivate(@Param('id') id: string) { return this.svc.setStatus(id, 'inactive'); }

  @Post(':id/tier') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  @Put(':id/tier')
  setTier(@Param('id') id: string, @Body() b: { tier: string; commissionRate: number }) {
    return this.svc.setTier(id, b.tier, b.commissionRate);
  }

  @Get(':id/kyc') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin', 'gym_owner', 'gym_staff')
  getKyc(@Param('id') id: string, @Req() req: any) { return this.svc.getKycStatusForUser(id, req.user); }

  @Post(':id/kyc-documents') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner', 'gym_staff')
  submitKyc(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.svc.submitKycDocument(id, body, req.user); }

  @Patch(':id/kyc-documents/:type/review') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  reviewKyc(@Param('id') id: string, @Param('type') type: string, @Body() body: any, @Req() req: any) {
    return this.svc.reviewKycDocument(id, type, body, req.user);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([GymEntity, GymPlanEntity, SubscriptionEntity, UserEntity, CheckinEntity, AmenityEntity, CategoryEntity, RatingEntity, AppConfigEntity, GymScheduleEntity, TrainerBookingEntity, TrainerEntity])],
  controllers: [GymsController],
  providers: [GymsService],
  exports: [GymsService],
})
export class GymsModule {}
