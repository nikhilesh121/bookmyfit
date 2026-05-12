import { Module, Controller, Get, Post, Put, Delete, Param, Body, Query, Injectable, UseGuards, Req, BadRequestException, ConflictException } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags } from '@nestjs/swagger';
import { GymPlanEntity } from '../../database/entities/gym.entity';
import { GymEntity } from '../../database/entities/gym.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';

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
  ) {}

  async listForGym(gymId: string) {
    return this.repo.find({ where: { gymId, isActive: true }, order: { price: 'ASC' } });
  }

  async listForOwner(ownerId: string) {
    const gym = await this.gyms.findOne({ where: { ownerId } });
    if (!gym) return [];
    return this.repo.find({ where: { gymId: gym.id }, order: { price: 'ASC' } });
  }

  private readonly allowedDurations = [30, 90, 180, 365];

  private sanitizePlan(data: any) {
    const durationDays = Number(data.durationDays);
    if (!this.allowedDurations.includes(durationDays)) {
      throw new BadRequestException('Duration must be 30, 90, 180, or 365 days');
    }
    const price = Number(data.price);
    if (!Number.isFinite(price) || price <= 0) throw new BadRequestException('Plan price must be greater than 0');
    return {
      name: data.name,
      description: data.description,
      price,
      durationDays,
      sessionsPerDay: Math.max(1, Number(data.sessionsPerDay) || 1),
      features: Array.isArray(data.features) ? data.features : [],
      isActive: data.isActive ?? true,
    };
  }

  private async assertNoActiveDuration(gymId: string, durationDays: number, excludeId?: string) {
    const qb = this.repo.createQueryBuilder('p')
      .where('p."gymId" = :gymId', { gymId })
      .andWhere('p."durationDays" = :durationDays', { durationDays })
      .andWhere('p."isActive" = true');
    if (excludeId) qb.andWhere('p.id != :excludeId', { excludeId });
    const existing = await qb.getOne();
    if (existing) throw new ConflictException(`An active ${durationDays}-day plan already exists. Edit that plan instead.`);
  }

  async create(ownerId: string, data: Partial<GymPlanEntity>) {
    const gym = await this.gyms.findOne({ where: { ownerId } });
    if (!gym) throw new Error('Gym not found');
    const plan = this.sanitizePlan(data);
    if (plan.isActive) await this.assertNoActiveDuration(gym.id, plan.durationDays);
    return this.repo.save(this.repo.create({ ...plan, gymId: gym.id }));
  }

  async update(id: string, ownerId: string, data: Partial<GymPlanEntity>) {
    const plan = await this.repo.findOne({ where: { id } });
    if (!plan) throw new Error('Plan not found');
    const gym = await this.gyms.findOne({ where: { ownerId } });
    if (!gym || gym.id !== plan.gymId) throw new Error('Unauthorized');
    const next = { ...plan, ...data };
    const patch = data.durationDays || data.price || data.features || data.name || data.description || data.sessionsPerDay
      ? this.sanitizePlan(next)
      : data;
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
    await this.repo.update(id, { isActive: false });
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

  /** Gym owner: deactivate a plan (soft delete) */
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
  imports: [TypeOrmModule.forFeature([GymPlanEntity, GymEntity])],
  controllers: [GymPlansController],
  providers: [GymPlansService],
  exports: [GymPlansService],
})
export class GymPlansModule {}
