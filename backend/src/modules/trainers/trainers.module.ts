import { Module, Controller, Get, Post, Put, Param, Body, Query, Injectable, UseGuards, Req } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags } from '@nestjs/swagger';
import { TrainerEntity, TrainerBookingEntity } from '../../database/entities/trainer.entity';
import { CashfreeService } from '../payments/cashfree.service';
import { PaymentsModule } from '../payments/payments.module';
import { v4 as uuid } from 'uuid';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';

@Injectable()
class TrainersService {
  constructor(
    @InjectRepository(TrainerEntity) private readonly repo: Repository<TrainerEntity>,
    @InjectRepository(TrainerBookingEntity) private readonly bookings: Repository<TrainerBookingEntity>,
    private readonly cashfree: CashfreeService,
  ) {}
  async listByGym(gymId: string, page: any = 1, limit: any = 20) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.repo.findAndCount({ where: { gymId, isActive: true }, skip, take });
    return paginatedResponse(data, total, p, l);
  }
  get(id: string) { return this.repo.findOne({ where: { id } }); }
  create(data: Partial<TrainerEntity>) { return this.repo.save(this.repo.create(data)); }
  update(id: string, data: Partial<TrainerEntity>) { return this.repo.update(id, data).then(() => this.get(id)); }

  async book(userId: string, trainerId: string, sessions: number, sessionDate: string, customerPhone: string) {
    const trainer = await this.get(trainerId);
    if (!trainer) throw new Error('Trainer not found');
    const amount = Number(trainer.pricePerSession) * sessions;
    const commissionRate = 0.25; // default 25%
    const platformCommission = amount * commissionRate;
    const orderId = `PT_${uuid().slice(0, 18)}`;

    const booking = await this.bookings.save(this.bookings.create({
      userId, trainerId, gymId: trainer.gymId,
      sessionDate: new Date(sessionDate), sessions, amount, platformCommission,
      status: 'pending', cashfreeOrderId: orderId,
    }));

    const payment = await this.cashfree.createOrder({
      orderId, amount, customerId: userId, customerPhone,
      notes: { kind: 'pt_booking', bookingId: booking.id },
    });

    return { booking, payment };
  }
}

@ApiTags('Trainers (PT)')
@Controller('trainers')
@UseGuards(JwtAuthGuard, RolesGuard)
class TrainersController {
  constructor(private readonly svc: TrainersService) {}
  @Get() @Roles('end_user', 'gym_owner', 'gym_staff', 'super_admin', 'corporate_admin')
  list(@Query('gymId') gymId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.listByGym(gymId, +page, +limit);
  }
  @Get(':id') @Roles('end_user', 'gym_owner', 'gym_staff', 'super_admin')
  get(@Param('id') id: string) { return this.svc.get(id); }
  @Post() @Roles('gym_owner', 'super_admin')
  create(@Body() body: any) { return this.svc.create(body); }
  @Put(':id') @Roles('gym_owner', 'super_admin')
  update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
  @Post(':id/book') @Roles('end_user', 'corporate_admin')
  book(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const userId = body.userId || req.user?.userId;
    return this.svc.book(userId, id, body.sessions, body.sessionDate, body.phone);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([TrainerEntity, TrainerBookingEntity]), PaymentsModule],
  controllers: [TrainersController],
  providers: [TrainersService],
})
export class TrainersModule {}
