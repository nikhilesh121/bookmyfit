import { Module, Controller, Get, Post, Put, Body, Param, Injectable, BadRequestException, UseGuards, Query, Req } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags } from '@nestjs/swagger';
import { CorporateAccountEntity, CorporateEmployeeEntity } from '../../database/entities/corporate.entity';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';

@Injectable()
class CorporateService {
  constructor(
    @InjectRepository(CorporateAccountEntity) private readonly accounts: Repository<CorporateAccountEntity>,
    @InjectRepository(CorporateEmployeeEntity) private readonly employees: Repository<CorporateEmployeeEntity>,
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

  @Get() @Roles('super_admin')
  list(@Query('page') page = 1, @Query('limit') limit = 20) { return this.svc.list(+page, +limit); }

  @Post() @Roles('super_admin')
  create(@Body() body: any) { return this.svc.create(body); }

  @Post(':id/link-admin') @Roles('super_admin')
  linkAdmin(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.svc.linkAdmin(id, body.userId);
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
  imports: [TypeOrmModule.forFeature([CorporateAccountEntity, CorporateEmployeeEntity])],
  controllers: [CorporateController],
  providers: [CorporateService],
})
export class CorporateModule {}
