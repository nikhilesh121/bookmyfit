import { Module, Controller, Get, Post, Put, Param, Body, Query, Injectable } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags } from '@nestjs/swagger';
import { TrainerEntity, TrainerBookingEntity } from '../../database/entities/trainer.entity';
import { CashfreeService } from '../payments/cashfree.service';
import { PaymentsModule } from '../payments/payments.module';
import { v4 as uuid } from 'uuid';

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
class TrainersController {
  constructor(private readonly svc: TrainersService) {}
  @Get() list(@Query('gymId') gymId: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.listByGym(gymId, +page, +limit);
  }
  @Get(':id') get(@Param('id') id: string) { return this.svc.get(id); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Put(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
  @Post(':id/book') book(@Param('id') id: string, @Body() body: any) {
    return this.svc.book(body.userId, id, body.sessions, body.sessionDate, body.phone);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([TrainerEntity, TrainerBookingEntity]), PaymentsModule],
  controllers: [TrainersController],
  providers: [TrainersService],
})
export class TrainersModule {}
