import { Module, Controller, Get, Post, Put, Param, Body, Query, Injectable, UseGuards, Req } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags } from '@nestjs/swagger';
import { IsString, IsDateString, IsOptional, IsPhoneNumber } from 'class-validator';
import { WellnessPartnerEntity, WellnessServiceEntity, WellnessBookingEntity } from '../../database/entities/wellness.entity';
import { CashfreeService } from '../payments/cashfree.service';
import { PaymentsModule } from '../payments/payments.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { v4 as uuid } from 'uuid';

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
  updatePartner(id: string, data: Partial<WellnessPartnerEntity>) { return this.partners.save({ id, ...data }); }
  listServicesOf(partnerId: string) { return this.services.find({ where: { partnerId, isActive: true } }); }
  createService(data: Partial<WellnessServiceEntity>) { return this.services.save(this.services.create(data)); }
  updateService(id: string, data: Partial<WellnessServiceEntity>) { return this.services.save({ id, ...data }); }

  async listAllServices(filter: { category?: string } = {}) {
    const qb = this.services.createQueryBuilder('s')
      .innerJoinAndMapOne('s.partner', WellnessPartnerEntity, 'p', 's."partnerId" = p.id')
      .where('s."isActive" = true')
      .andWhere("p.status = 'active'");
    if (filter.category) qb.andWhere('p."serviceType" = :cat', { cat: filter.category });
    return qb.orderBy('s.price', 'ASC').getMany();
  }

  async listPartnersWithMinPrice(filter: { city?: string; serviceType?: string } = {}, page: any = 1, limit: any = 20) {
    const where: any = { status: 'active' };
    if (filter.city) where.city = filter.city;
    if (filter.serviceType) where.serviceType = filter.serviceType;
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [partners, total] = await this.partners.findAndCount({ where, order: { rating: 'DESC' }, skip, take });
    const result = await Promise.all(partners.map(async (partner) => {
      const svcs = await this.services.find({ where: { partnerId: partner.id, isActive: true } });
      const minPrice = svcs.length ? Math.min(...svcs.map(s => Number(s.price))) : null;
      return { ...partner, minPrice, serviceCount: svcs.length };
    }));
    return paginatedResponse(result, total, p, l);
  }

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

  async myBookings(userId: string) {
    const bks = await this.bookings.find({ where: { userId }, order: { bookingDate: 'DESC' } });
    return Promise.all(bks.map(async (b) => {
      const service = b.serviceId ? await this.services.findOne({ where: { id: b.serviceId } }) : null;
      const partner = b.partnerId ? await this.partners.findOne({ where: { id: b.partnerId } }) : null;
      return {
        id: b.id, status: b.status, bookingDate: b.bookingDate, amount: b.amount,
        cashfreeOrderId: b.cashfreeOrderId, invoiceNumber: (b as any).invoiceNumber,
        service: service ? { id: service.id, name: service.name, durationMinutes: service.durationMinutes, imageUrl: service.imageUrl } : null,
        partner: partner ? { id: partner.id, name: partner.name, serviceType: partner.serviceType, city: partner.city, area: partner.area, photos: partner.photos } : null,
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

  @Get('partners')
  partners(
    @Query('city') city?: string,
    @Query('serviceType') type?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.listPartnersWithMinPrice({ city, serviceType: type }, +page, +limit);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Post('partners')
  createPartner(@Body() b: any) { return this.svc.createPartner(b); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @Put('partners/:id')
  updatePartner(@Param('id') id: string, @Body() b: any) { return this.svc.updatePartner(id, b); }

  @Get('services/all')
  allServices(@Query('category') cat?: string) {
    return this.svc.listAllServices({ category: cat });
  }

  @Get('partners/:id/services')
  services(@Param('id') id: string) { return this.svc.listServicesOf(id); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'wellness_partner')
  @Post('services')
  createService(@Body() b: any) { return this.svc.createService(b); }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin', 'wellness_partner')
  @Put('services/:id')
  updateService(@Param('id') id: string, @Body() b: any) { return this.svc.updateService(id, b); }

  @UseGuards(JwtAuthGuard)
  @Post('services/:id/book')
  book(@Param('id') id: string, @Body() b: BookWellnessDto, @Req() req: any) {
    return this.svc.book(req.user.id, id, b.bookingDate, b.phone || req.user.phone || '');
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookings/my')
  myBookings(@Req() req: any) {
    return this.svc.myBookings(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bookings/:id/confirm')
  confirmBooking(@Param('id') id: string) {
    return this.svc.confirmBooking(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bookings/:id/invoice')
  getInvoice(@Param('id') id: string, @Req() req: any) {
    return this.svc.getBookingInvoice(id, req.user.id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([WellnessPartnerEntity, WellnessServiceEntity, WellnessBookingEntity]), PaymentsModule],
  controllers: [WellnessController],
  providers: [WellnessService],
})
export class WellnessModule {}
