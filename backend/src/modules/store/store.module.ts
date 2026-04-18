import { Module, Controller, Get, Post, Put, Delete, Param, Body, Query, Injectable, BadRequestException, UseGuards, Req } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags } from '@nestjs/swagger';
import { ProductEntity, OrderEntity } from '../../database/entities/store.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { CashfreeService } from '../payments/cashfree.service';
import { PaymentsModule } from '../payments/payments.module';
import { v4 as uuid } from 'uuid';

@Injectable()
class StoreService {
  constructor(
    @InjectRepository(ProductEntity) private readonly products: Repository<ProductEntity>,
    @InjectRepository(OrderEntity) private readonly orders: Repository<OrderEntity>,
    private readonly cashfree: CashfreeService,
  ) {}

  async listProducts(page: any = 1, limit: any = 20, category?: string) {
    const where: any = { isActive: true };
    if (category) where.category = category;
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.products.findAndCount({ where, order: { createdAt: 'DESC' }, skip, take });
    return paginatedResponse(data, total, p, l);
  }
  getProduct(id: string) { return this.products.findOne({ where: { id } }); }
  createProduct(data: Partial<ProductEntity>) { return this.products.save(this.products.create(data)); }
  updateProduct(id: string, data: Partial<ProductEntity>) { return this.products.update(id, data).then(() => this.getProduct(id)); }
  deleteProduct(id: string) { return this.products.delete(id); }

  async placeOrder(userId: string, phone: string, items: Array<{ productId: string; quantity: number }>, address: any, couponCode?: string) {
    if (!items?.length) throw new BadRequestException('Cart is empty');
    let subtotal = 0;
    const hydrated: any[] = [];
    for (const it of items) {
      const p = await this.getProduct(it.productId);
      if (!p) throw new BadRequestException(`Product ${it.productId} not found`);
      if (p.stock < it.quantity) throw new BadRequestException(`Out of stock: ${p.name}`);
      subtotal += Number(p.price) * it.quantity;
      hydrated.push({ productId: p.id, name: p.name, price: Number(p.price), quantity: it.quantity });
    }
    const shipping = subtotal > 1000 ? 0 : 70;
    const discount = 0; // coupon logic hook
    const totalAmount = subtotal + shipping - discount;
    const orderId = `ORD_${uuid().slice(0, 18)}`;
    const order = await this.orders.save(this.orders.create({
      userId, items: hydrated, subtotal, shipping, discount, totalAmount,
      status: 'pending', shippingAddress: address, couponCode,
      cashfreeOrderId: orderId,
    }));
    const payment = await this.cashfree.createOrder({
      orderId, amount: totalAmount, customerId: userId, customerPhone: phone,
      notes: { kind: 'store', orderId: order.id },
    });
    return { order, payment };
  }

  async markShipped(id: string, trackingNumber: string) {
    await this.orders.update(id, { status: 'shipped', trackingNumber });
    return this.orders.findOne({ where: { id } });
  }

  async listOrders(page: any = 1, limit: any = 20, userId?: string) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.orders.findAndCount({ where: userId ? { userId } : {}, order: { createdAt: 'DESC' }, skip, take });
    return paginatedResponse(data, total, p, l);
  }
}

@ApiTags('Store')
@Controller('store')
class StoreController {
  constructor(private readonly svc: StoreService) {}
  @Get('products') list(@Query('category') c?: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.listProducts(+page, +limit, c);
  }
  @Get('products/:id') get(@Param('id') id: string) { return this.svc.getProduct(id); }

  @Post('products') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  create(@Body() b: any) { return this.svc.createProduct(b); }

  @Put('products/:id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  update(@Param('id') id: string, @Body() b: any) { return this.svc.updateProduct(id, b); }

  @Delete('products/:id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  del(@Param('id') id: string) { return this.svc.deleteProduct(id); }

  @Post('orders') @UseGuards(JwtAuthGuard)
  order(@Req() req: any, @Body() b: { items: any[]; address: any; couponCode?: string }) {
    return this.svc.placeOrder(req.user.userId, req.user.phone, b.items, b.address, b.couponCode);
  }

  @Get('orders') @UseGuards(JwtAuthGuard)
  orders(@Req() req: any, @Query('all') all?: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    if (all === 'true' && req.user.role === 'super_admin') return this.svc.listOrders(+page, +limit);
    return this.svc.listOrders(+page, +limit, req.user.userId);
  }

  @Post('orders/:id/ship') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('super_admin')
  ship(@Param('id') id: string, @Body() b: { trackingNumber: string }) {
    return this.svc.markShipped(id, b.trackingNumber);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([ProductEntity, OrderEntity]), PaymentsModule],
  controllers: [StoreController],
  providers: [StoreService],
})
export class StoreModule {}
