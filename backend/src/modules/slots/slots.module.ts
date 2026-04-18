import {
  Module, Controller, Get, Post, Delete, Param, Body, Query,
  Injectable, UseGuards, Req, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GymSlotEntity } from '../../database/entities/gym-slot.entity';
import { SlotBookingEntity } from '../../database/entities/slot-booking.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';

@Injectable()
class SlotsService {
  constructor(
    @InjectRepository(GymSlotEntity) private readonly slotRepo: Repository<GymSlotEntity>,
    @InjectRepository(SlotBookingEntity) private readonly bookingRepo: Repository<SlotBookingEntity>,
  ) {}

  listSlots(gymId: string, date: string) {
    return this.slotRepo.find({ where: { gymId, date }, order: { startTime: 'ASC' } });
  }

  createSlot(data: { gymId: string; date: string; startTime: string; endTime: string; capacity?: number }) {
    return this.slotRepo.save(this.slotRepo.create(data));
  }

  async bookSlot(slotId: string, userId: string) {
    const slot = await this.slotRepo.findOne({ where: { id: slotId } });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.booked >= slot.capacity) throw new BadRequestException('Slot is full');
    const existing = await this.bookingRepo.findOne({ where: { slotId, userId, status: 'confirmed' } });
    if (existing) throw new BadRequestException('Already booked');
    slot.booked += 1;
    if (slot.booked >= slot.capacity) slot.status = 'full';
    await this.slotRepo.save(slot);
    return this.bookingRepo.save(this.bookingRepo.create({ slotId, userId, gymId: slot.gymId }));
  }

  async cancelBooking(slotId: string, userId: string) {
    const booking = await this.bookingRepo.findOne({ where: { slotId, userId, status: 'confirmed' } });
    if (!booking) throw new NotFoundException('Booking not found');
    booking.status = 'cancelled';
    await this.bookingRepo.save(booking);
    const slot = await this.slotRepo.findOne({ where: { id: slotId } });
    if (slot && slot.booked > 0) {
      slot.booked -= 1;
      if (slot.status === 'full') slot.status = 'active';
      await this.slotRepo.save(slot);
    }
    return { success: true };
  }

  myBookings(userId: string) {
    return this.bookingRepo.find({
      where: { userId, status: 'confirmed' },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}

@ApiTags('Slots')
@Controller('slots')
class SlotsController {
  constructor(private readonly svc: SlotsService) {}

  @Get('my-bookings')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  myBookings(@Req() req: any) { return this.svc.myBookings(req.user.userId); }

  @Get()
  listSlots(@Query('gymId') gymId: string, @Query('date') date: string) {
    return this.svc.listSlots(gymId, date);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'gym_owner', 'gym_staff')
  createSlot(@Body() body: { gymId: string; date: string; startTime: string; endTime: string; capacity?: number }) {
    return this.svc.createSlot(body);
  }

  @Post(':id/book')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  bookSlot(@Param('id') id: string, @Req() req: any) {
    return this.svc.bookSlot(id, req.user.userId);
  }

  @Delete(':id/book')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  cancelBooking(@Param('id') id: string, @Req() req: any) {
    return this.svc.cancelBooking(id, req.user.userId);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([GymSlotEntity, SlotBookingEntity])],
  controllers: [SlotsController],
  providers: [SlotsService],
  exports: [SlotsService],
})
export class SlotsModule {}
