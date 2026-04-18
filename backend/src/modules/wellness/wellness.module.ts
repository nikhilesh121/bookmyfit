import { Module, Controller, Get, Post, Param, Body, Query, Injectable } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags } from '@nestjs/swagger';
import { WellnessPartnerEntity, WellnessServiceEntity, WellnessBookingEntity } from '../../database/entities/wellness.entity';
import { CashfreeService } from '../payments/cashfree.service';
import { PaymentsModule } from '../payments/payments.module';
import { v4 as uuid } from 'uuid';

@Injectable()
class WellnessService_ {
  constructor(
    @InjectRepository(WellnessPartnerEntity) private readonly partners: Repository<WellnessPartnerEntity>,
    @InjectRepository(WellnessServiceEntity) private readonly services: Repository<WellnessServiceEntity>,
    @InjectRepository(WellnessBookingEntity) private readonly bookings: Repository<WellnessBookingEntity>,
    private readonly cashfree: CashfreeService,
  ) {}
  async listPartners(filter: { city?: string; serviceType?: string } = {}, page: any = 1, limit: any = 20) {
    const where: any = { status: 'active' };
    if (filter.city) where.city = filter.city;
    if (filter.serviceType) where.serviceType = filter.serviceType;
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.partners.findAndCount({ where, order: { rating: 'DESC' }, skip, take });
    return paginatedResponse(data, total, p, l);
  }
  createPartner(data: Partial<WellnessPartnerEntity>) { return this.partners.save(this.partners.create(data)); }
  listServicesOf(partnerId: string) { return this.services.find({ where: { partnerId, isActive: true } }); }
  createService(data: Partial<WellnessServiceEntity>) { return this.services.save(this.services.create(data)); }

  async book(userId: string, serviceId: string, bookingDate: string, phone: string) {
    const service = await this.services.findOne({ where: { id: serviceId } });
    if (!service) throw new Error('Service not found');
    const partner = await this.partners.findOne({ where: { id: service.partnerId } });
    const amount = Number(service.price);
    const platformCommission = amount * (Number(partner?.commissionRate || 30) / 100);
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
}

@ApiTags('Wellness')
@Controller('wellness')
class WellnessController {
  constructor(private readonly svc: WellnessService_) {}
  @Get('partners') partners(
    @Query('city') city?: string,
    @Query('serviceType') type?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.listPartners({ city, serviceType: type }, +page, +limit);
  }
  @Post('partners') createPartner(@Body() b: any) { return this.svc.createPartner(b); }
  @Get('partners/:id/services') services(@Param('id') id: string) { return this.svc.listServicesOf(id); }
  @Post('services') createService(@Body() b: any) { return this.svc.createService(b); }
  @Post('services/:id/book') book(@Param('id') id: string, @Body() b: any) {
    return this.svc.book(b.userId, id, b.bookingDate, b.phone);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([WellnessPartnerEntity, WellnessServiceEntity, WellnessBookingEntity]), PaymentsModule],
  controllers: [WellnessController],
  providers: [WellnessService_],
})
export class WellnessModule {}
