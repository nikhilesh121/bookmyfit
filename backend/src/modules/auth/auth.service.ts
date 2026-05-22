import { Injectable, Inject, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { UserEntity } from '../../database/entities/user.entity';
import { GymEntity } from '../../database/entities/gym.entity';
import { CategoryEntity } from '../../database/entities/misc.entity';
import { CorporateAccountEntity } from '../../database/entities/corporate.entity';
import { REDIS_CLIENT } from '../../common/redis/redis.module';
import { EmailService } from '../email/email.service';

function normalizeCatalogName(value: any): string {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(GymEntity) private readonly gyms: Repository<GymEntity>,
    @InjectRepository(CategoryEntity) private readonly categoriesRepo: Repository<CategoryEntity>,
    @InjectRepository(CorporateAccountEntity) private readonly corporates: Repository<CorporateAccountEntity>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jwt: JwtService,
    private readonly email: EmailService,
    private readonly dataSource: DataSource,
  ) {}

  async sendOtp(phone: string) {
    const smsConfigured = process.env.TWILIO_ACCOUNT_SID &&
      !process.env.TWILIO_ACCOUNT_SID.startsWith('xxxxx') &&
      process.env.TWILIO_ACCOUNT_SID !== 'placeholder';

    // Use fixed dev OTP when SMS is not configured (no Twilio keys set)
    const code = smsConfigured
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : '123456';

    await this.redis.set(`otp:${phone}`, code, 'EX', 600);

    if (smsConfigured) {
      // TODO: uncomment when Twilio is live
      // await twilio.messages.create({ to: `+91${phone}`, from: process.env.TWILIO_PHONE_NUMBER, body: `Your BookMyFit OTP: ${code}` });
    }

    const existingUser = await this.users.findOne({ where: { phone } });
    return {
      success: true,
      message: smsConfigured ? 'OTP sent via SMS' : 'OTP sent',
      userExists: !!existingUser,
      userName: existingUser?.name || null,
      // Always expose devOtp when SMS is not configured so app can show the hint
      ...(!smsConfigured && { devOtp: code }),
    };
  }

  async verifyOtp(phone: string, code: string, deviceId: string, name?: string) {
    const stored = await this.redis.get(`otp:${phone}`);
    if (!stored || stored !== code) throw new UnauthorizedException('Invalid or expired OTP');
    await this.redis.del(`otp:${phone}`);

    let user = await this.users.findOne({ where: { phone } });
    if (!user) {
      user = this.users.create({ phone, name: name || 'User', deviceId, role: 'end_user' });
      user = await this.users.save(user);
    } else if (user.isActive === false) {
      throw new UnauthorizedException('This account is inactive');
    } else if (user.deviceId && user.deviceId !== deviceId) {
      user.deviceId = deviceId;
      await this.users.save(user);
    } else if (!user.deviceId) {
      user.deviceId = deviceId;
      await this.users.save(user);
    }

    return this.issueTokens(user);
  }

  async setupFirstAdmin(email: string, password: string) {
    const existing = await this.users.findOne({ where: { role: 'super_admin' } });
    if (existing) throw new BadRequestException('Admin already exists. Use /auth/admin/login instead.');
    const passwordHash = await bcrypt.hash(password, 10);
    const admin = this.users.create({ email, passwordHash, name: 'Super Admin', role: 'super_admin', isActive: true });
    await this.users.save(admin);
    return this.issueTokens(admin);
  }

  async passwordLogin(email: string, password: string) {
    const user = await this.users.findOne({ where: { email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
    if (user.isActive === false) throw new UnauthorizedException('This account is inactive');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.issueTokens(user);
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      });
      const user = await this.users.findOne({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();
      if (user.isActive === false) throw new UnauthorizedException('This account is inactive');
      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async registerGym(data: {
    email: string; password: string; name: string;
    gymName: string; city: string; area: string; address: string; phone?: string; categories?: string[];
  }) {
    const email = String(data.email || '').trim().toLowerCase();
    const phone = data.phone ? String(data.phone).trim() : undefined;
    const existingEmail = await this.users
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .getOne();
    if (existingEmail) throw new BadRequestException('An account with this email already exists');
    if (phone) {
      const existingPhone = await this.users.findOne({ where: { phone } });
      if (existingPhone) throw new BadRequestException('An account with this phone number already exists');
    }
    const activeCategories = await this.categoriesRepo.find({ where: { isActive: true } });
    if (activeCategories.length === 0) {
      throw new BadRequestException('Workout categories are not configured yet. Please ask admin to add categories first.');
    }
    const categoryByName = new Map(activeCategories.map((category) => [normalizeCatalogName(category.name), category.name.trim()]));
    const categories = [...new Set((data.categories || []).map((name) => categoryByName.get(normalizeCatalogName(name))).filter(Boolean) as string[])];
    if (categories.length === 0) throw new BadRequestException('Select at least one valid workout category');
    const passwordHash = await bcrypt.hash(data.password, 10);
    let created: { user: UserEntity; gym: GymEntity };
    try {
      created = await this.dataSource.transaction(async (manager) => {
        const users = manager.getRepository(UserEntity);
        const gyms = manager.getRepository(GymEntity);
        const user = await users.save(
          users.create({ email, name: data.name, phone, passwordHash, role: 'gym_owner', isActive: true }),
        );
        const gym = await gyms.save(
          gyms.create({
            name: data.gymName, city: data.city, area: data.area,
            address: data.address,
            categories,
            lat: 0,
            lng: 0,
            status: 'pending', ownerId: user.id, kycStatus: 'not_started',
          }),
        );
        return { user, gym };
      });
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new BadRequestException('An account with this email or phone number already exists');
      }
      throw err;
    }
    // Fire-and-forget welcome email
    this.email.sendGymRegistered({ gymName: data.gymName, ownerName: data.name, email }).catch(() => {});
    return { ...this.issueTokens(created.user), gym: created.gym };
  }

  async registerCorporate(data: {
    email: string; password: string; companyName: string; billingContact: string;
  }) {
    const existing = await this.users.findOne({ where: { email: data.email } });
    if (existing) throw new BadRequestException('An account with this email already exists');
    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await this.users.save(
      this.users.create({ email: data.email, name: data.companyName, passwordHash, role: 'corporate_admin', isActive: true }),
    );
    const corporate = await this.corporates.save(
      this.corporates.create({
        companyName: data.companyName, email: data.email,
        billingContact: data.billingContact, planType: 'multigym',
        totalSeats: 0, assignedSeats: 0, adminUserId: user.id, isActive: true,
      }),
    );
    // Fire-and-forget welcome email
    this.email.sendCorporateRegistered({ companyName: data.companyName, adminName: data.companyName, email: data.email }).catch(() => {});
    return { ...this.issueTokens(user), corporate };
  }

  private issueTokens(user: UserEntity) {
    const payload = { sub: user.id, role: user.role, phone: user.phone, email: user.email };
    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
      expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
    });
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, phone: user.phone, name: user.name, email: user.email, role: user.role },
    };
  }
}
