import { Module, Controller, Get, Post, Put, Delete, Param, Body, Query, Injectable, UseGuards, Req, BadRequestException, ConflictException } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags } from '@nestjs/swagger';
import { GymPlanEntity } from '../../database/entities/gym.entity';
import { GymEntity } from '../../database/entities/gym.entity';
import { AppConfigEntity } from '../../database/entities/app-config.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { PLATFORM_PRICING_CONFIG_KEY, applyCheckoutCommission, serviceCommission } from '../../common/commission-config';

/**
 * Gym-specific individual subscription plans.
 * Only gym_owner manages their plans. These appear on mobile for that gym only.
 * Revenue from these plans: gym keeps (1 - commissionRate)% ; BMF keeps commissionRate%.
 */
@Injectable()
class GymPlansService {
  constructor(
    @InjectRepository(GymPlanEntity) private readonly repo: Repository<GymPlanEntity>,
    @InjectRepository(GymEntity) private readonly gyms: Repository<GymEntity>,
    @InjectRepository(AppConfigEntity) private readonly configs: Repository<AppConfigEntity>,
  ) {}

  async listForGym(gymId: string) {
    const plans = await this.repo.find({ where: { gymId, isActive: true }, order: { durationDays: 'ASC', price: 'ASC' } });
    return this.attachDisplayPricing(this.compactByDuration(plans));
  }

  async listForOwner(ownerId: string) {
    const gym = await this.gyms.findOne({ where: { ownerId } });
    if (!gym) return [];
    const plans = await this.repo.find({ where: { gymId: gym.id }, order: { durationDays: 'ASC', createdAt: 'DESC' } });
    return this.attachDisplayPricing(plans);
  }

  private readonly allowedDurations = [30, 90, 180, 365];

  private durationLabel(durationDays: number) {
    const labels: Record<number, string> = { 30: '1-month', 90: '3-month', 180: '6-month', 365: '12-month' };
    return labels[durationDays] || `${durationDays}-day`;
  }

  private compactByDuration(plans: GymPlanEntity[]) {
    const sorted = [...plans].sort((a: any, b: any) => {
      const durationDiff = this.allowedDurations.indexOf(a.durationDays) - this.allowedDurations.indexOf(b.durationDays);
      if (durationDiff !== 0) return durationDiff;
      if (Number(b.isActive) !== Number(a.isActive)) return Number(b.isActive) - Number(a.isActive);
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
    const byDuration = new Map<number, GymPlanEntity>();
    for (const plan of sorted) {
      if (!byDuration.has(plan.durationDays)) byDuration.set(plan.durationDays, plan);
    }
    return Array.from(byDuration.values());
  }

  private salePriceFor(plan: Pick<GymPlanEntity, 'price' | 'salePrice'>) {
    const regularPrice = Number(plan.price || 0);
    const rawSale = Number(plan.salePrice || 0);
    if (!Number.isFinite(rawSale) || rawSale <= 0) return regularPrice;
    return Math.min(rawSale, regularPrice);
  }

  private async attachDisplayPricing(plans: GymPlanEntity[]) {
    const config = await this.configs.findOne({ where: { key: PLATFORM_PRICING_CONFIG_KEY } });
    const commission = serviceCommission(config?.value, 'same_gym');
    return plans.map((plan: any) => {
      const regularPrice = Number(plan.price || 0);
      const salePrice = this.salePriceFor(plan);
      const checkoutRegularPrice = applyCheckoutCommission(regularPrice, commission);
      const checkoutSalePrice = applyCheckoutCommission(salePrice, commission);
      const discountPercent = checkoutRegularPrice > checkoutSalePrice
        ? Math.round((1 - checkoutSalePrice / checkoutRegularPrice) * 100)
        : 0;
      return {
        ...plan,
        price: regularPrice,
        salePrice,
        checkoutRegularPrice,
        checkoutSalePrice,
        discountPercent,
      };
    });
  }

  private sanitizePlan(data: any) {
    const durationDays = Number(data.durationDays);
    if (!this.allowedDurations.includes(durationDays)) {
      throw new BadRequestException('Duration must be 30, 90, 180, or 365 days');
    }
    const price = Number(data.price);
    if (!Number.isFinite(price) || price <= 0) throw new BadRequestException('Plan regular price must be greater than 0');
    const rawSalePrice = data.salePrice === undefined || data.salePrice === null || data.salePrice === ''
      ? price
      : Number(data.salePrice);
    if (!Number.isFinite(rawSalePrice) || rawSalePrice <= 0) throw new BadRequestException('Plan sale price must be greater than 0');
    if (rawSalePrice > price) throw new BadRequestException('Sale price cannot be greater than regular price');
    return {
      name: data.name,
      description: data.description,
      price,
      salePrice: rawSalePrice,
      durationDays,
      sessionsPerDay: Math.max(1, Number(data.sessionsPerDay) || 1),
      features: Array.isArray(data.features) ? data.features : [],
      isActive: data.isActive ?? true,
    };
  }

  private async assertNoDuration(gymId: string, durationDays: number, excludeId?: string) {
    const qb = this.repo.createQueryBuilder('p')
      .where('p."gymId" = :gymId', { gymId })
      .andWhere('p."durationDays" = :durationDays', { durationDays });
    if (excludeId) qb.andWhere('p.id != :excludeId', { excludeId });
    const existing = await qb.getOne();
    if (existing) throw new ConflictException(`A ${this.durationLabel(durationDays)} plan already exists. Delete that plan first, or edit/deactivate it.`);
  }

  private async assertNoActiveDuration(gymId: string, durationDays: number, excludeId?: string) {
    const qb = this.repo.createQueryBuilder('p')
      .where('p."gymId" = :gymId', { gymId })
      .andWhere('p."durationDays" = :durationDays', { durationDays })
      .andWhere('p."isActive" = true');
    if (excludeId) qb.andWhere('p.id != :excludeId', { excludeId });
    const existing = await qb.getOne();
    if (existing) throw new ConflictException(`An active ${this.durationLabel(durationDays)} plan already exists. Deactivate or edit that plan instead.`);
  }

  async create(ownerId: string, data: Partial<GymPlanEntity>) {
    const gym = await this.gyms.findOne({ where: { ownerId } });
    if (!gym) throw new Error('Gym not found');
    const plan = this.sanitizePlan(data);
    await this.assertNoDuration(gym.id, plan.durationDays);
    return this.repo.save(this.repo.create({ ...plan, gymId: gym.id }));
  }

  async update(id: string, ownerId: string, data: Partial<GymPlanEntity>) {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new Error('Plan not found');
    const gym = await this.gyms.findOne({ where: { ownerId } });
    if (!gym || gym.id !== plan.gymId) throw new Error('Unauthorized');
    const next = { ...plan, ...data };
    const patch = data.durationDays || data.price || data.salePrice || data.features || data.name || data.description || data.sessionsPerDay
      ? this.sanitizePlan(next)
      : data;
    if (data.durationDays && Number(data.durationDays) !== Number(plan.durationDays)) {
      await this.assertNoDuration(gym.id, Number(data.durationDays), id);
    }
    if ((patch as any).isActive !== false) {
      await this.assertNoActiveDuration(gym.id, Number((patch as any).durationDays ?? plan.durationDays), id);
    }
    await this.repo.update(id, patch as any);
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: string, ownerId: string) {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new Error('Plan not found');
    const gym = await this.gyms.findOne({ where: { ownerId } });
    if (!gym || gym.id !== plan.gymId) throw new Error('Unauthorized');
    await this.repo.delete(id);
    return { success: true };
  }
}

@ApiTags('Gym Plans (Individual Subscriptions)')
@Controller('gym-plans')
class GymPlansController {
  constructor(private readonly svc: GymPlansService) {}

  /** Public: get plans for a specific gym (used by mobile app) */
  @Get('by-gym/:gymId')
  byGym(@Param('gymId') gymId: string) { return this.svc.listForGym(gymId); }

  /** Gym owner: list their own gym's plans */
  @Get('my-gym')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner')
  myGym(@Req() req: any) { return this.svc.listForOwner(req.user.userId); }

  /** Gym owner: create a new individual plan */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner')
  create(@Req() req: any, @Body() body: any) { return this.svc.create(req.user.userId, body); }

  /** Gym owner: update a plan */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner')
  update(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.svc.update(id, req.user.userId, body);
  }

  /** Gym owner: delete a plan definition. Existing subscriptions keep their saved records. */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('gym_owner')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.svc.remove(id, req.user.userId);
  }

  /** Admin: view all plans across gyms */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  list(@Query('gymId') gymId?: string) {
    return gymId
      ? this.svc.listForGym(gymId)
      : this.svc.listForGym('__none__'); // return empty for now; admin uses by-gym
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([GymPlanEntity, GymEntity, AppConfigEntity])],
  controllers: [GymPlansController],
  providers: [GymPlansService],
  exports: [GymPlansService],
})
export class GymPlansModule {}
