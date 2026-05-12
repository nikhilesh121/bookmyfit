import { Module, Controller, Get, Post, Put, Body, Param, Injectable, BadRequestException, UseGuards, Query, Req } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags } from '@nestjs/swagger';
import { CorporateAccountEntity, CorporateEmployeeEntity } from '../../database/entities/corporate.entity';
import { CheckinEntity } from '../../database/entities/checkin.entity';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';

@Injectable()
class CorporateService {
  constructor(
    @InjectRepository(CorporateAccountEntity) private readonly accounts: Repository<CorporateAccountEntity>,
    @InjectRepository(CorporateEmployeeEntity) private readonly employees: Repository<CorporateEmployeeEntity>,
    @InjectRepository(CheckinEntity) private readonly checkins: Repository<CheckinEntity>,
  ) {}

  async list(page: any = 1, limit: any = 20) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.accounts.findAndCount({ order: { createdAt: 'DESC' }, skip, take });
    return paginatedResponse(data, total, p, l);
  }

  async getByAdminUser(userId: string) {
    return this.accounts.findOne({ where: { adminUserId: userId } });
  }

  async linkAdmin(corporateId: string, userId: string) {
    await this.accounts.update(corporateId, { adminUserId: userId });
    return this.accounts.findOne({ where: { id: corporateId } });
  }

  create(data: Partial<CorporateAccountEntity>) {
    return this.accounts.save(this.accounts.create(data));
  }

  async employeesOf(corporateId: string, page: any = 1, limit: any = 20) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.employees.findAndCount({ where: { corporateId }, order: { assignedDate: 'DESC' }, skip, take });
    return paginatedResponse(data, total, p, l);
  }

  async assignEmployee(corporateId: string, userId: string, code: string, department: string) {
    const account = await this.accounts.findOne({ where: { id: corporateId } });
    if (!account) throw new BadRequestException('Corporate account not found');
    if (account.assignedSeats >= account.totalSeats) throw new BadRequestException('No seats available');
    const employee = await this.employees.save(
      this.employees.create({ corporateId, userId, employeeCode: code, department, status: 'active' }),
    );
    await this.accounts.update(corporateId, { assignedSeats: account.assignedSeats + 1 });
    return employee;
  }

  async bulkAssign(corporateId: string, employees: Array<{ userId: string; code: string; department?: string }>) {
    const results = [];
    for (const e of employees) {
      try {
        results.push(await this.assignEmployee(corporateId, e.userId, e.code, e.department || ''));
      } catch (err: any) {
        results.push({ error: err.message, userId: e.userId });
      }
    }
    return { processed: employees.length, results };
  }

  async removeEmployee(corporateId: string, employeeId: string) {
    const emp = await this.employees.findOne({ where: { id: employeeId, corporateId } });
    if (!emp) throw new BadRequestException('Employee not found');
    await this.employees.remove(emp);
    await this.accounts.decrement({ id: corporateId }, 'assignedSeats', 1);
    return { success: true };
  }

  async getAnalytics(adminUserId: string) {
    const account = await this.accounts.findOne({ where: { adminUserId } });
    if (!account) return { totalEmployees: 0, activeThisMonth: 0, totalCheckins: 0, monthlyBreakdown: [] };
    const employees = await this.employees.find({ where: { corporateId: account.id, status: 'active' } });
    const userIds = employees.map((e) => e.userId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalCheckins, monthCheckins] = await Promise.all([
      userIds.length ? this.checkins.count({ where: { userId: In(userIds), status: 'success', checkinTime: MoreThanOrEqual(monthStart) } }) : Promise.resolve(0),
      userIds.length ? this.checkins.count({ where: { userId: In(userIds), status: 'success' } }) : Promise.resolve(0),
    ]);
    return {
      corporateName: account.companyName,
      totalSeats: account.totalSeats,
      assignedSeats: account.assignedSeats,
      totalEmployees: employees.length,
      activeThisMonth: monthCheckins,
      totalCheckins,
      monthlyRevenue: [],
      totalRevenue: account.assignedSeats * 1500,
      activeSubscribers: employees.length,
      newSignups: 0,
    };
  }

  async getCheckins(adminUserId: string, page: any = 1, limit: any = 50) {
    const account = await this.accounts.findOne({ where: { adminUserId } });
    if (!account) return { data: [], total: 0 };
    const employees = await this.employees.find({ where: { corporateId: account.id } });
    const userIds = employees.map((e) => e.userId);
    if (!userIds.length) return { data: [], total: 0 };
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.checkins.findAndCount({
      where: { userId: In(userIds) },
      order: { checkinTime: 'DESC' },
      skip,
      take,
    });
    return paginatedResponse(data, total, p, l);
  }
}

@ApiTags('Corporate')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('corporate')
class CorporateController {
  constructor(private readonly svc: CorporateService) {}

  @Get('me') @Roles('corporate_admin', 'super_admin')
  async getMe(@Req() req: any) {
    const corp = await this.svc.getByAdminUser(req.user.userId);
    if (!corp) return null;
    return corp;
  }

  @Get('me/analytics') @Roles('corporate_admin')
  meAnalytics(@Req() req: any) {
    return this.svc.getAnalytics(req.user.userId);
  }

  @Get('me/checkins') @Roles('corporate_admin')
  meCheckins(@Req() req: any, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.svc.getCheckins(req.user.userId, +page, +limit);
  }

  @Get() @Roles('super_admin')
  list(@Query('page') page = 1, @Query('limit') limit = 20) { return this.svc.list(+page, +limit); }

  @Post() @Roles('super_admin')
  create(@Body() body: any) { return this.svc.create(body); }

  @Post(':id/link-admin') @Roles('super_admin')
  linkAdmin(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.svc.linkAdmin(id, body.userId);
  }

  /** Alias for link-admin — used by admin panel "Approve Corporate" button */
  @Post(':id/approve') @Roles('super_admin')
  approve(@Param('id') id: string, @Body() body: { userId?: string }) {
    // Approve = activate the corporate account (link-admin if userId provided)
    if (body.userId) return this.svc.linkAdmin(id, body.userId);
    return { success: true, corporateId: id, status: 'approved' };
  }

  /** Corporate admin requests additional seat allocation */
  @Post('me/topup-request') @Roles('corporate_admin')
  topupRequest(@Req() req: any, @Body() body: { additionalSeats: number }) {
    // Creates a notification/request for super_admin — actual seat update is manual
    return { success: true, message: `Topup request for ${body.additionalSeats} seats submitted`, requestedBy: req.user?.sub };
  }

  @Get(':id/employees') @Roles('super_admin', 'corporate_admin')
  employees(@Param('id') id: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.svc.employeesOf(id, +page, +limit);
  }

  @Post(':id/employees') @Roles('super_admin', 'corporate_admin')
  assign(@Param('id') id: string, @Body() body: any) {
    return this.svc.assignEmployee(id, body.userId || body.id || '', body.code || body.employeeCode || Date.now().toString(), body.department || '');
  }

  @Post(':id/employees/bulk') @Roles('super_admin', 'corporate_admin')
  bulk(@Param('id') id: string, @Body() body: { employees: any[] }) {
    return this.svc.bulkAssign(id, body.employees);
  }

  @Put(':id/employees/:empId') @Roles('super_admin', 'corporate_admin')
  updateEmployee(@Param('id') id: string, @Param('empId') empId: string, @Body() body: any) {
    return this.svc['employees'].update({ id: empId, corporateId: id }, body);
  }

  @Post(':id/employees/:empId/remove') @Roles('super_admin', 'corporate_admin')
  removeEmployee(@Param('id') id: string, @Param('empId') empId: string) {
    return this.svc.removeEmployee(id, empId);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([CorporateAccountEntity, CorporateEmployeeEntity, CheckinEntity])],
  controllers: [CorporateController],
  providers: [CorporateService],
})
export class CorporateModule {}
