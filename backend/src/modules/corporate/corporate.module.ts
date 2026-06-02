import { Module, Controller, Get, Post, Put, Body, Param, Injectable, BadRequestException, ForbiddenException, NotFoundException, UseGuards, Query, Req } from '@nestjs/common';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { paginate, paginatedResponse } from '../../common/pagination.helper';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CorporateAccountEntity, CorporateEmployeeEntity } from '../../database/entities/corporate.entity';
import { CheckinEntity } from '../../database/entities/checkin.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { SubscriptionEntity } from '../../database/entities/subscription.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { CashfreeService } from '../payments/cashfree.service';
import { PaymentsModule } from '../payments/payments.module';
import { EmailModule } from '../email/email.module';
import { EmailService } from '../email/email.service';

const CORPORATE_PORTAL_URL = process.env.CORP_PANEL_URL || 'https://corporate.bookmyfit.in';
const ACTIVE_BILLING_STATES = new Set(['active', 'trial']);

@Injectable()
class CorporateService {
  constructor(
    @InjectRepository(CorporateAccountEntity) private readonly accounts: Repository<CorporateAccountEntity>,
    @InjectRepository(CorporateEmployeeEntity) private readonly employees: Repository<CorporateEmployeeEntity>,
    @InjectRepository(CheckinEntity) private readonly checkins: Repository<CheckinEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(SubscriptionEntity) private readonly subscriptions: Repository<SubscriptionEntity>,
    private readonly cashfree: CashfreeService,
    private readonly email: EmailService,
  ) {}

  async list(page: any = 1, limit: any = 20) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.accounts.findAndCount({ order: { createdAt: 'DESC' }, skip, take });
    const synced = await Promise.all(data.map(async (account) => ({
      ...account,
      assignedSeats: await this.syncAssignedSeats(account.id),
    })));
    return paginatedResponse(synced, total, p, l);
  }

  async getByAdminUser(userId: string) {
    const account = await this.accounts.findOne({ where: { adminUserId: userId } });
    if (!account) return null;
    account.assignedSeats = await this.syncAssignedSeats(account.id);
    return account;
  }

  async getAccount(id: string) {
    const account = await this.accounts.findOne({ where: { id } });
    if (!account) throw new NotFoundException('Corporate account not found');
    account.assignedSeats = await this.syncAssignedSeats(account.id);
    return account;
  }

  async ensureAccountAccess(id: string, user: { role?: string; userId?: string }) {
    if (user.role === 'super_admin') return this.getAccount(id);
    if (user.role !== 'corporate_admin' || !user.userId) {
      throw new ForbiddenException('Corporate access denied');
    }
    const account = await this.getByAdminUser(user.userId);
    if (!account || account.id !== id) throw new ForbiddenException('Corporate access denied');
    return account;
  }

  async linkAdmin(corporateId: string, userId: string) {
    await this.getAccount(corporateId);
    await this.assertCorporateAdminUser(userId);
    await this.accounts.update(corporateId, { adminUserId: userId });
    return this.getAccount(corporateId);
  }

  private normalizePhone(value: any): string | null {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 10) return digits;
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    return null;
  }

  private tempPassword() {
    return `Bmf@${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 6)}`;
  }

  private async assertCorporateAdminUser(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Corporate admin user not found');
    if (user.role !== 'corporate_admin') throw new BadRequestException('Selected user is not a corporate admin');
    return user;
  }

  private async createOrUpdateCorporateAdmin(data: any, companyName: string, corporateEmail: string) {
    const adminUserId = data.adminUserId ? String(data.adminUserId).trim() : '';
    if (adminUserId) {
      const user = await this.assertCorporateAdminUser(adminUserId);
      return { user, login: null };
    }

    const adminEmail = String(data.adminEmail || data.hrEmail || corporateEmail || '').trim().toLowerCase();
    if (!adminEmail) throw new BadRequestException('Corporate admin email is required');
    const adminName = String(data.adminName || data.hrName || `${companyName} HR`).trim();
    const adminPhone = this.normalizePhone(data.adminPhone || data.phone);
    const password = String(data.adminPassword || data.password || this.tempPassword()).trim();
    if (password.length < 6) throw new BadRequestException('Corporate admin password must be at least 6 characters');

    let user = await this.users.findOne({ where: { email: adminEmail } });
    if (user && user.role !== 'corporate_admin') {
      throw new BadRequestException('This admin email is already used by another account role');
    }

    if (adminPhone) {
      const byPhone = await this.users.findOne({ where: { phone: adminPhone } });
      if (byPhone && (!user || byPhone.id !== user.id)) {
        throw new BadRequestException('This admin phone is already used by another account');
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    if (!user) {
      user = this.users.create({
        email: adminEmail,
        phone: adminPhone,
        name: adminName,
        passwordHash,
        role: 'corporate_admin',
        isActive: true,
      });
    } else {
      user.name = adminName || user.name;
      user.phone = adminPhone || user.phone;
      user.passwordHash = passwordHash;
      user.isActive = true;
    }
    user = await this.users.save(user);

    const login = { email: user.email, password, portalUrl: CORPORATE_PORTAL_URL };
    this.email.sendCorporateAdminCredentials({
      companyName,
      adminName: user.name,
      email: user.email || adminEmail,
      password,
      portalUrl: CORPORATE_PORTAL_URL,
    }).catch(() => {});

    return { user, login };
  }

  async create(data: any) {
    const email = String(data.email || '').trim().toLowerCase();
    const companyName = String(data.companyName || '').trim();
    if (!email) throw new BadRequestException('Corporate email is required');
    if (!companyName) throw new BadRequestException('Company name is required');
    const existing = await this.accounts.findOne({ where: [{ email }, { companyName }] });
    if (existing) throw new BadRequestException('Corporate account already exists');

    const totalSeats = Math.max(0, Math.round(Number(data.totalSeats ?? data.seats ?? 0) || 0));
    const pricePerSeat = Math.max(0, Math.round(Number(data.pricePerSeat ?? 999) || 999));
    const { user, login } = await this.createOrUpdateCorporateAdmin(data, companyName, email);
    const account = this.accounts.create({
      companyName,
      email,
      totalSeats,
      assignedSeats: 0,
      pricePerSeat,
      billingStatus: String(data.billingStatus || 'active') as any,
      planType: String(data.planType || 'corporate').trim(),
      billingContact: data.billingContact || email,
      adminUserId: user.id,
      isActive: data.isActive ?? true,
    });
    const saved = await this.accounts.save(account);
    return { ...saved, adminLogin: login };
  }

  async update(id: string, data: any) {
    const account = await this.getAccount(id);
    const patch: Partial<CorporateAccountEntity> = {};
    if (data.companyName !== undefined) {
      const companyName = String(data.companyName || '').trim();
      if (!companyName) throw new BadRequestException('Company name is required');
      patch.companyName = companyName;
    }
    if (data.email !== undefined) {
      const email = String(data.email || '').trim().toLowerCase();
      if (!email) throw new BadRequestException('Corporate email is required');
      patch.email = email;
    }
    if (data.totalSeats !== undefined) {
      const totalSeats = Math.max(0, Math.round(Number(data.totalSeats) || 0));
      if (totalSeats < account.assignedSeats) {
        throw new BadRequestException('Total seats cannot be lower than assigned seats');
      }
      patch.totalSeats = totalSeats;
    }
    if (data.pricePerSeat !== undefined) {
      const pricePerSeat = Math.max(0, Math.round(Number(data.pricePerSeat) || 0));
      patch.pricePerSeat = pricePerSeat;
    }
    if (data.billingStatus !== undefined) patch.billingStatus = String(data.billingStatus || 'pending_payment') as any;
    if (data.planType !== undefined) patch.planType = String(data.planType || 'corporate').trim();
    if (data.billingContact !== undefined) patch.billingContact = data.billingContact || null;
    if (data.adminUserId !== undefined) {
      const adminUserId = data.adminUserId ? String(data.adminUserId).trim() : null;
      if (adminUserId) await this.assertCorporateAdminUser(adminUserId);
      patch.adminUserId = adminUserId as any;
    }
    if (data.isActive !== undefined) patch.isActive = Boolean(data.isActive);
    await this.accounts.update(id, patch);
    return this.getAccount(id);
  }

  async updateSelf(adminUserId: string, data: any) {
    const account = await this.getByAdminUser(adminUserId);
    if (!account) throw new NotFoundException('Corporate account not found');
    const patch: Partial<CorporateAccountEntity> = {};
    if (data.companyName !== undefined) patch.companyName = String(data.companyName || account.companyName).trim();
    if (data.billingContact !== undefined) patch.billingContact = data.billingContact || null;
    await this.accounts.update(account.id, patch);
    return this.getAccount(account.id);
  }

  async approve(id: string, userId?: string) {
    const patch: Partial<CorporateAccountEntity> = { isActive: true };
    if (userId) {
      await this.assertCorporateAdminUser(userId);
      patch.adminUserId = userId;
    }
    await this.accounts.update(id, patch);
    return this.getAccount(id);
  }

  private async enrichEmployees(data: CorporateEmployeeEntity[]) {
    const userIds = data.map((employee) => employee.userId).filter(Boolean);
    const users = userIds.length ? await this.users.find({ where: { id: In(userIds) } }) : [];
    const userMap = new Map(users.map((user) => [user.id, user]));
    const checkinRows = userIds.length
      ? await this.checkins.createQueryBuilder('checkin')
        .select('checkin."userId"', 'userId')
        .addSelect('COUNT(*)', 'checkinCount')
        .addSelect('MAX(checkin."checkinTime")', 'lastCheckin')
        .where('checkin."userId" IN (:...userIds)', { userIds })
        .andWhere('checkin.status = :status', { status: 'success' })
        .groupBy('checkin."userId"')
        .getRawMany()
      : [];
    const checkinMap = new Map(checkinRows.map((row) => [row.userId, {
      checkinCount: Number(row.checkinCount || 0),
      lastCheckin: row.lastCheckin || null,
    }]));
    return data.map((employee) => {
      const user = userMap.get(employee.userId);
      const checkins = checkinMap.get(employee.userId) || { checkinCount: 0, lastCheckin: null };
      return {
        ...employee,
        name: user?.name || employee.employeeCode,
        email: user?.email || null,
        phone: user?.phone || null,
        plan: 'Corporate Multi-Gym',
        loginMethod: user?.phone ? `OTP to ${user.phone}` : 'Phone missing',
        checkinCount: checkins.checkinCount,
        lastCheckin: checkins.lastCheckin,
      };
    });
  }

  async employeesOf(corporateId: string, page: any = 1, limit: any = 20) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const [data, total] = await this.employees.findAndCount({
      where: { corporateId },
      relations: { corporate: true },
      order: { assignedDate: 'DESC' },
      skip,
      take,
    });
    const enriched = await this.enrichEmployees(data);
    await this.syncAssignedSeats(corporateId);
    return paginatedResponse(enriched, total, p, l);
  }

  async allEmployees(page: any = 1, limit: any = 50, corporateId?: string, status?: string) {
    const { skip, take, page: p, limit: l } = paginate(page, limit);
    const where: any = {};
    if (corporateId) where.corporateId = corporateId;
    if (status && status !== 'all') where.status = status;
    const [data, total] = await this.employees.findAndCount({
      where,
      relations: { corporate: true },
      order: { assignedDate: 'DESC' },
      skip,
      take,
    });
    const enriched = await this.enrichEmployees(data);
    return paginatedResponse(enriched, total, p, l);
  }

  private async activeSeatCount(corporateId: string) {
    return this.employees.count({ where: { corporateId, status: 'active' } });
  }

  private async syncAssignedSeats(corporateId: string) {
    const active = await this.activeSeatCount(corporateId);
    await this.accounts.update(corporateId, { assignedSeats: active });
    return active;
  }

  private employeeCode() {
    return `EMP-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  }

  private assertCanUseSeats(account: CorporateAccountEntity) {
    if (!account.isActive) throw new BadRequestException('Corporate account is not approved or is suspended');
    if (!ACTIVE_BILLING_STATES.has(String(account.billingStatus || 'active'))) {
      throw new BadRequestException('Corporate payment is pending. Please complete billing before assigning employees.');
    }
  }

  private isoDate(date: Date) {
    return date.toISOString().slice(0, 10);
  }

  private addMonths(date: Date, months: number) {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
  }

  private async ensureEmployeeAccessSubscription(account: CorporateAccountEntity, userId: string) {
    const now = new Date();
    const existing = await this.subscriptions.findOne({
      where: { corporateId: account.id, userId },
      order: { createdAt: 'DESC' },
    });
    if (existing) {
      existing.planType = 'multi_gym';
      existing.status = 'active';
      existing.durationMonths = Math.max(Number(existing.durationMonths || 12), 12);
      existing.startDate = this.isoDate(now);
      existing.endDate = this.isoDate(this.addMonths(now, 12));
      existing.amountPaid = 0;
      existing.gymIds = [];
      return this.subscriptions.save(existing);
    }
    return this.subscriptions.save(this.subscriptions.create({
      userId,
      planType: 'multi_gym',
      durationMonths: 12,
      startDate: this.isoDate(now),
      endDate: this.isoDate(this.addMonths(now, 12)),
      status: 'active',
      amountPaid: 0,
      gymIds: [],
      corporateId: account.id,
      invoiceNumber: `CORP-${Date.now().toString(36).toUpperCase()}`,
    }));
  }

  private async deactivateEmployeeAccess(accountId: string, userId: string) {
    const subs = await this.subscriptions.find({ where: { corporateId: accountId, userId } });
    const active = subs.filter((sub) => sub.status !== 'cancelled' && sub.status !== 'expired');
    if (!active.length) return;
    await this.subscriptions.save(active.map((sub) => ({ ...sub, status: 'cancelled' as any })));
  }

  async assignEmployee(corporateId: string, body: any) {
    const account = await this.accounts.findOne({ where: { id: corporateId } });
    if (!account) throw new BadRequestException('Corporate account not found');
    this.assertCanUseSeats(account);

    const email = String(body.email || '').trim().toLowerCase();
    const phone = this.normalizePhone(body.phone || body.mobile);
    const requestedUserId = body.userId || body.id || '';
    let user: UserEntity | null = null;
    if (requestedUserId) user = await this.users.findOne({ where: { id: requestedUserId } });
    if (!user && phone) user = await this.users.findOne({ where: { phone } });
    if (!user && email) user = await this.users.findOne({ where: { email } });
    if (!user && !phone) throw new BadRequestException('Employee phone number is required for mobile OTP login');
    if (user && !phone && !user.phone) throw new BadRequestException('Existing employee user must have a phone number for mobile OTP login');

    if (phone) {
      const byPhone = await this.users.findOne({ where: { phone } });
      if (byPhone && (!user || byPhone.id !== user.id)) {
        throw new BadRequestException('This phone number is already used by another user');
      }
    }
    if (email) {
      const byEmail = await this.users.findOne({ where: { email } });
      if (byEmail && (!user || byEmail.id !== user.id)) {
        throw new BadRequestException('This email is already used by another user');
      }
    }

    const existing = user ? await this.employees.findOne({ where: { corporateId, userId: user.id } }) : null;
    if (existing?.status === 'active') throw new BadRequestException('Employee is already assigned to this corporate account');

    const employeeCode = String(body.code || body.employeeCode || this.employeeCode()).trim();
    const duplicateCode = employeeCode
      ? await this.employees.findOne({ where: { corporateId, employeeCode } })
      : null;
    if (duplicateCode && (!existing || duplicateCode.id !== existing.id)) {
      throw new BadRequestException('This employee code is already used in this corporate account');
    }

    const totalSeats = Number(account.totalSeats || 0);
    const usedSeats = await this.activeSeatCount(corporateId);
    if (usedSeats !== Number(account.assignedSeats || 0)) {
      await this.accounts.update(corporateId, { assignedSeats: usedSeats });
    }
    if (totalSeats <= 0) {
      throw new BadRequestException('No seats available. Ask admin to assign seats to this corporate account first.');
    }
    if (usedSeats >= totalSeats) {
      throw new BadRequestException(`No seats available. ${usedSeats}/${totalSeats} seats are already assigned.`);
    }

    if (!user) {
      user = await this.users.save(this.users.create({
        email: email || null,
        phone,
        name: String(body.name || email?.split('@')[0] || 'Corporate Employee').trim(),
        role: 'end_user',
        isActive: true,
      }));
    } else {
      user.email = email || user.email;
      user.phone = phone || user.phone;
      user.name = String(body.name || user.name || 'Corporate Employee').trim();
      user.isActive = true;
      user = await this.users.save(user);
    }

    const department = String(body.department || '').trim();
    let employee: CorporateEmployeeEntity;
    if (existing) {
      employee = await this.employees.save({ ...existing, status: 'active', department, employeeCode });
    } else {
      employee = await this.employees.save(
        this.employees.create({ corporateId, userId: user.id, employeeCode, department, status: 'active' }),
      );
    }
    await this.ensureEmployeeAccessSubscription(account, user.id);
    await this.syncAssignedSeats(corporateId);

    if (user.email) {
      this.email.sendCorporateEmployeeInvite({
        companyName: account.companyName,
        employeeName: user.name,
        email: user.email,
        phone: user.phone,
      }).catch(() => {});
    }

    return { ...employee, name: user.name, email: user.email, phone: user.phone, plan: 'Corporate Multi-Gym' };
  }

  async bulkAssign(corporateId: string, employees: any[]) {
    const results = [];
    for (const employee of employees || []) {
      try {
        results.push(await this.assignEmployee(corporateId, employee));
      } catch (err: any) {
        results.push({ error: err.message, email: employee.email, phone: employee.phone, userId: employee.userId });
      }
    }
    return { processed: employees?.length || 0, results };
  }

  async removeEmployee(corporateId: string, employeeId: string) {
    const emp = await this.employees.findOne({ where: { id: employeeId, corporateId } });
    if (!emp) throw new BadRequestException('Employee not found');
    emp.status = 'removed';
    await this.employees.save(emp);
    await this.deactivateEmployeeAccess(corporateId, emp.userId);
    await this.syncAssignedSeats(corporateId);
    return { success: true };
  }

  async updateEmployee(corporateId: string, employeeId: string, body: any) {
    const emp = await this.employees.findOne({ where: { id: employeeId, corporateId } });
    if (!emp) throw new BadRequestException('Employee not found');
    const account = await this.accounts.findOne({ where: { id: corporateId } });
    if (!account) throw new BadRequestException('Corporate account not found');

    const nextStatus = body.status !== undefined ? String(body.status || emp.status) : emp.status;
    if (nextStatus === 'active' && emp.status !== 'active') {
      this.assertCanUseSeats(account);
      const usedSeats = await this.activeSeatCount(corporateId);
      if (usedSeats >= Number(account.totalSeats || 0)) {
        throw new BadRequestException(`No seats available. ${usedSeats}/${account.totalSeats} seats are already assigned.`);
      }
    }

    emp.department = body.department !== undefined ? String(body.department || '').trim() : emp.department;
    if (body.employeeCode !== undefined) {
      const employeeCode = String(body.employeeCode || '').trim();
      if (employeeCode) {
        const duplicateCode = await this.employees.findOne({ where: { corporateId, employeeCode } });
        if (duplicateCode && duplicateCode.id !== emp.id) {
          throw new BadRequestException('This employee code is already used in this corporate account');
        }
      }
      emp.employeeCode = employeeCode || emp.employeeCode;
    }
    emp.status = nextStatus;

    const user = await this.users.findOne({ where: { id: emp.userId } });
    if (user) {
      const email = body.email !== undefined ? String(body.email || '').trim().toLowerCase() : user.email;
      const phone = body.phone !== undefined ? this.normalizePhone(body.phone) : user.phone;
      if (body.phone !== undefined && body.phone && !phone) throw new BadRequestException('Enter a valid 10-digit phone number');
      if (phone && phone !== user.phone) {
        const byPhone = await this.users.findOne({ where: { phone } });
        if (byPhone && byPhone.id !== user.id) throw new BadRequestException('This phone number is already used by another user');
      }
      if (email && email !== user.email) {
        const byEmail = await this.users.findOne({ where: { email } });
        if (byEmail && byEmail.id !== user.id) throw new BadRequestException('This email is already used by another user');
      }
      user.name = body.name !== undefined ? String(body.name || user.name).trim() : user.name;
      user.email = email || user.email;
      user.phone = phone || user.phone;
      await this.users.save(user);
    }

    const saved = await this.employees.save(emp);
    if (saved.status === 'active') await this.ensureEmployeeAccessSubscription(account, saved.userId);
    else await this.deactivateEmployeeAccess(corporateId, saved.userId);
    await this.syncAssignedSeats(corporateId);
    return this.employeesOf(corporateId, 1, 1).then(() => saved);
  }

  async requestSeatPayment(adminUserId: string, additionalSeatsRaw: any = 0) {
    const account = await this.getByAdminUser(adminUserId);
    if (!account) throw new NotFoundException('Corporate account not found');
    const additionalSeats = Math.max(0, Math.round(Number(additionalSeatsRaw) || 0));
    if (account.pendingSeatOrderId) {
      throw new BadRequestException(`Seat payment already pending for order ${account.pendingSeatOrderId}`);
    }

    const isTopup = additionalSeats > 0;
    if (!isTopup && ACTIVE_BILLING_STATES.has(String(account.billingStatus || 'active'))) {
      throw new BadRequestException('Corporate billing is already active');
    }

    const seatsToBill = isTopup ? additionalSeats : Math.max(1, Number(account.totalSeats || 0));
    const pricePerSeat = Math.max(0, Number(account.pricePerSeat || 999));
    const amount = Math.round(seatsToBill * pricePerSeat);
    if (amount <= 0) throw new BadRequestException('Seat payment amount must be greater than zero');

    const admin = await this.users.findOne({ where: { id: adminUserId } });
    const orderId = `CORP_${account.id.replace(/-/g, '').slice(0, 12)}_${Date.now()}`;
    const payment = await this.cashfree.createOrder({
      orderId,
      amount,
      customerId: adminUserId,
      customerPhone: admin?.phone || '9999999999',
      customerEmail: admin?.email || account.email,
      notes: {
        kind: isTopup ? 'corporate_seat_topup' : 'corporate_initial_seats',
        corporateId: account.id,
        seats: seatsToBill,
        pricePerSeat,
      },
    });

    account.pendingSeatRequest = isTopup ? additionalSeats : 0;
    account.pendingSeatOrderId = payment.orderId || orderId;
    if (!isTopup) account.billingStatus = 'pending_payment' as any;
    await this.accounts.save(account);
    return {
      success: true,
      amount,
      seats: seatsToBill,
      pricePerSeat,
      orderId: payment.orderId || orderId,
      payment,
      message: isTopup
        ? `Payment created for ${additionalSeats} additional seats`
        : 'Payment created for current corporate seats',
    };
  }

  async getAnalytics(adminUserId: string) {
    const account = await this.accounts.findOne({ where: { adminUserId } });
    if (!account) return { totalEmployees: 0, activeThisMonth: 0, totalCheckins: 0, monthlyBreakdown: [] };
    const assignedSeats = await this.syncAssignedSeats(account.id);
    const employees = await this.employees.find({ where: { corporateId: account.id, status: 'active' } });
    const userIds = employees.map((e) => e.userId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [totalCheckins, monthCheckins] = await Promise.all([
      userIds.length ? this.checkins.count({ where: { userId: In(userIds), status: 'success' } }) : Promise.resolve(0),
      userIds.length ? this.checkins.count({ where: { userId: In(userIds), status: 'success', checkinTime: MoreThanOrEqual(monthStart) } }) : Promise.resolve(0),
    ]);
    return {
      corporateName: account.companyName,
      totalSeats: account.totalSeats,
      assignedSeats,
      billingStatus: account.billingStatus,
      pricePerSeat: account.pricePerSeat,
      totalEmployees: employees.length,
      activeThisMonth: monthCheckins,
      totalCheckins,
      monthlyRevenue: [],
      totalRevenue: Number(account.totalSeats || 0) * Number(account.pricePerSeat || 999),
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
      relations: { user: true, gym: true },
      order: { checkinTime: 'DESC' },
      skip,
      take,
    });
    const employeeMap = new Map(employees.map((employee) => [employee.userId, employee]));
    const enriched = data.map((checkin) => {
      const employee = employeeMap.get(checkin.userId);
      return {
        ...checkin,
        createdAt: checkin.checkinTime,
        userName: checkin.user?.name || employee?.employeeCode || null,
        gymName: checkin.gym?.name || null,
        department: employee?.department || null,
        employeeCode: employee?.employeeCode || null,
      };
    });
    return paginatedResponse(enriched, total, p, l);
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

  @Put('me') @Roles('corporate_admin')
  updateMe(@Req() req: any, @Body() body: any) {
    return this.svc.updateSelf(req.user.userId, body);
  }

  @Get('me/analytics') @Roles('corporate_admin')
  meAnalytics(@Req() req: any) {
    return this.svc.getAnalytics(req.user.userId);
  }

  @Get('me/checkins') @Roles('corporate_admin')
  meCheckins(@Req() req: any, @Query('page') page = 1, @Query('limit') limit = 50) {
    return this.svc.getCheckins(req.user.userId, +page, +limit);
  }

  @Post('me/seat-payment') @Roles('corporate_admin')
  seatPayment(@Req() req: any, @Body() body: { additionalSeats?: number }) {
    return this.svc.requestSeatPayment(req.user.userId, body?.additionalSeats || 0);
  }

  @Post('me/topup-request') @Roles('corporate_admin')
  topupRequest(@Req() req: any, @Body() body: { additionalSeats: number }) {
    return this.svc.requestSeatPayment(req.user.userId, body?.additionalSeats || 0);
  }

  @Get() @Roles('super_admin')
  list(@Query('page') page = 1, @Query('limit') limit = 20) { return this.svc.list(+page, +limit); }

  @Post() @Roles('super_admin')
  create(@Body() body: any) { return this.svc.create(body); }

  @Get('employees') @Roles('super_admin')
  allEmployees(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('corporateId') corporateId?: string,
    @Query('status') status?: string,
  ) {
    return this.svc.allEmployees(+page, +limit, corporateId, status);
  }

  @Get(':id') @Roles('super_admin', 'corporate_admin')
  getOne(@Param('id') id: string, @Req() req: any) {
    return this.svc.ensureAccountAccess(id, req.user);
  }

  @Put(':id') @Roles('super_admin')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Post(':id/link-admin') @Roles('super_admin')
  linkAdmin(@Param('id') id: string, @Body() body: { userId: string }) {
    return this.svc.linkAdmin(id, body.userId);
  }

  @Post(':id/approve') @Roles('super_admin')
  approve(@Param('id') id: string, @Body() body: { userId?: string }) {
    return this.svc.approve(id, body?.userId);
  }

  @Get(':id/employees') @Roles('super_admin', 'corporate_admin')
  async employees(@Param('id') id: string, @Query('page') page = 1, @Query('limit') limit = 20, @Req() req: any) {
    await this.svc.ensureAccountAccess(id, req.user);
    return this.svc.employeesOf(id, +page, +limit);
  }

  @Post(':id/employees') @Roles('super_admin', 'corporate_admin')
  async assign(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    await this.svc.ensureAccountAccess(id, req.user);
    return this.svc.assignEmployee(id, body);
  }

  @Post(':id/employees/bulk') @Roles('super_admin', 'corporate_admin')
  async bulk(@Param('id') id: string, @Body() body: { employees: any[] }, @Req() req: any) {
    await this.svc.ensureAccountAccess(id, req.user);
    return this.svc.bulkAssign(id, body.employees);
  }

  @Put(':id/employees/:empId') @Roles('super_admin', 'corporate_admin')
  async updateEmployee(@Param('id') id: string, @Param('empId') empId: string, @Body() body: any, @Req() req: any) {
    await this.svc.ensureAccountAccess(id, req.user);
    return this.svc.updateEmployee(id, empId, body);
  }

  @Post(':id/employees/:empId/remove') @Roles('super_admin', 'corporate_admin')
  async removeEmployee(@Param('id') id: string, @Param('empId') empId: string, @Req() req: any) {
    await this.svc.ensureAccountAccess(id, req.user);
    return this.svc.removeEmployee(id, empId);
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([CorporateAccountEntity, CorporateEmployeeEntity, CheckinEntity, UserEntity, SubscriptionEntity]),
    PaymentsModule,
    EmailModule,
  ],
  controllers: [CorporateController],
  providers: [CorporateService],
})
export class CorporateModule {}
