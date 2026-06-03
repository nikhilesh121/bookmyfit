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

const MSG91_SEND_OTP_URL = 'https://api.msg91.com/api/v5/widget/sendOtp';
const MSG91_VERIFY_OTP_URL = 'https://api.msg91.com/api/v5/widget/verifyOtp';
const MSG91_VERIFY_ACCESS_TOKEN_URL = 'https://control.msg91.com/api/v5/widget/verifyAccessToken';

function normalizeCatalogName(value: any): string {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizePhone(value: string) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return digits.slice(-10);
}

function findNestedValue(data: any, keys: string[]): any {
  if (!data || typeof data !== 'object') return undefined;
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') return data[key];
  }
  for (const value of Object.values(data)) {
    const nested = findNestedValue(value, keys);
    if (nested !== undefined && nested !== null && nested !== '') return nested;
  }
  return undefined;
}

function looksLikeMsg91RequestId(value: any) {
  const text = String(value ?? '').trim();
  if (!text || text.length < 8 || text.length > 160) return false;
  if (/\s/.test(text) || !/^[A-Za-z0-9_-]+$/.test(text)) return false;
  const lower = text.toLowerCase();
  if (lower.includes('otp') || lower.includes('sent') || lower.includes('success') || lower.includes('verified')) return false;
  return true;
}

function findMsg91RequestId(data: any) {
  const explicit = findNestedValue(data, ['reqId', 'req_id', 'requestId', 'request_id', 'requestID', 'request-id', 'id']);
  if (looksLikeMsg91RequestId(explicit)) return String(explicit).trim();

  // Some MSG91 OTP responses return the request id in `message` instead of `reqId`.
  const message = findNestedValue(data, ['message', 'msg']);
  if (looksLikeMsg91RequestId(message)) return String(message).trim();

  return null;
}

function looksLikeJwt(value: any) {
  const text = String(value ?? '').trim();
  return /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(text);
}

function findMsg91AccessToken(data: any) {
  const explicit = findNestedValue(data, ['access-token', 'accessToken', 'token', 'jwt', 'jwtToken']);
  if (explicit) return String(explicit).trim();

  const message = findNestedValue(data, ['message', 'msg']);
  if (looksLikeJwt(message)) return String(message).trim();

  return null;
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

  async sendOtp(rawPhone: string) {
    const phone = normalizePhone(rawPhone);
    if (phone.length !== 10) throw new BadRequestException('Enter a valid 10-digit mobile number');
    const existingUser = await this.users.findOne({ where: { phone } });
    const testCode = this.getTestOtpCode(phone);

    if (testCode) {
      await this.redis.set(`otp:${phone}`, JSON.stringify({ provider: 'test', code: testCode }), 'EX', 600);
      return {
        success: true,
        message: 'OTP sent',
        userExists: !!existingUser,
        userName: existingUser?.name || null,
        ...(this.shouldExposeDevOtp() && { devOtp: testCode }),
      };
    }

    if (this.isMsg91Configured()) {
      const identifier = `91${phone}`;
      const response = await this.msg91Post(
        MSG91_SEND_OTP_URL,
        { widgetId: process.env.MSG91_OTP_WIDGET_ID, identifier },
        { authkey: process.env.MSG91_AUTH_KEY || '' },
      );
      if (!this.isMsg91Success(response)) {
        throw new BadRequestException(this.msg91ErrorMessage(response, 'Unable to send OTP'));
      }
      const reqId = findMsg91RequestId(response);
      if (!reqId) throw new BadRequestException('OTP provider did not return request ID');
      await this.redis.set(`otp:${phone}`, JSON.stringify({ provider: 'msg91', reqId, identifier }), 'EX', 600);
      return {
        success: true,
        message: 'OTP sent via SMS',
        userExists: !!existingUser,
        userName: existingUser?.name || null,
      };
    }

    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('OTP service is not configured');
    }

    const code = '123456';
    await this.redis.set(`otp:${phone}`, JSON.stringify({ provider: 'local', code }), 'EX', 600);
    return {
      success: true,
      message: 'OTP sent',
      userExists: !!existingUser,
      userName: existingUser?.name || null,
      ...(this.shouldExposeDevOtp() && { devOtp: code }),
    };
  }

  async verifyOtp(rawPhone: string, code: string, deviceId: string, name?: string) {
    const phone = normalizePhone(rawPhone);
    const stored = await this.redis.get(`otp:${phone}`);
    if (!stored) throw new UnauthorizedException('Invalid or expired OTP');

    let session: any;
    try {
      session = JSON.parse(stored);
    } catch {
      session = { provider: 'legacy', code: stored };
    }

    if (session.provider === 'msg91') {
      const verifyResponse = await this.msg91Post(
        MSG91_VERIFY_OTP_URL,
        { widgetId: process.env.MSG91_OTP_WIDGET_ID, reqId: session.reqId, otp: code },
        { authkey: process.env.MSG91_AUTH_KEY || '' },
      );
      if (!this.isMsg91Success(verifyResponse)) {
        throw new UnauthorizedException(this.msg91ErrorMessage(verifyResponse, 'Invalid or expired OTP'));
      }
      const verifiedIdentifier = findNestedValue(verifyResponse, ['identifier', 'mobile', 'phone', 'phoneNumber', 'number']);
      if (verifiedIdentifier && normalizePhone(String(verifiedIdentifier)) !== phone) {
        throw new UnauthorizedException('OTP token does not match this phone number');
      }
      const accessToken = findMsg91AccessToken(verifyResponse);
      if (accessToken) {
        const accessResponse = await this.msg91Post(
          MSG91_VERIFY_ACCESS_TOKEN_URL,
          { authkey: process.env.MSG91_AUTH_KEY, 'access-token': accessToken },
        );
        if (!this.isMsg91Success(accessResponse)) {
          throw new UnauthorizedException(this.msg91ErrorMessage(accessResponse, 'OTP token verification failed'));
        }
        const tokenIdentifier = findNestedValue(accessResponse, ['identifier', 'mobile', 'phone', 'phoneNumber', 'number']);
        if (tokenIdentifier && normalizePhone(String(tokenIdentifier)) !== phone) {
          throw new UnauthorizedException('OTP token does not match this phone number');
        }
      }
    } else if (!session.code || session.code !== code) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

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

  private isMsg91Configured() {
    const authKey = process.env.MSG91_AUTH_KEY;
    const widgetId = process.env.MSG91_OTP_WIDGET_ID;
    return !!authKey && !!widgetId && authKey !== 'xxxxx' && authKey !== 'placeholder';
  }

  private getTestOtpCode(phone: string) {
    const entries = String(process.env.OTP_TEST_NUMBERS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    for (const entry of entries) {
      const [rawNumber, rawCode] = entry.split(':').map((part) => String(part || '').trim());
      if (normalizePhone(rawNumber) === phone && /^\d{6}$/.test(rawCode)) return rawCode;
    }
    const singleTestPhone = process.env.OTP_TEST_PHONE ? normalizePhone(process.env.OTP_TEST_PHONE) : '';
    const singleTestCode = process.env.OTP_TEST_CODE || '123456';
    if (singleTestPhone && singleTestPhone === phone && /^\d{6}$/.test(singleTestCode)) return singleTestCode;
    return null;
  }

  private shouldExposeDevOtp() {
    return process.env.OTP_EXPOSE_DEV_OTP === 'true' || process.env.NODE_ENV !== 'production';
  }

  private async msg91Post(url: string, body: Record<string, any>, headers: Record<string, string> = {}) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
    if (!res.ok) throw new BadRequestException(this.msg91ErrorMessage(data, `OTP provider error ${res.status}`));
    return data;
  }

  private isMsg91Success(data: any) {
    const type = String(data?.type || data?.status || '').toLowerCase();
    const message = String(data?.message || data?.msg || '').toLowerCase();
    const hasToken = !!findMsg91AccessToken(data);
    const hasReqId = !!findMsg91RequestId(data);
    if (type.includes('error') || message.includes('invalid') || message.includes('failed') || message.includes('fail')) return false;
    return type.includes('success') || message.includes('success') || message.includes('sent') || message.includes('verified') || hasToken || hasReqId;
  }

  private msg91ErrorMessage(data: any, fallback: string) {
    const message = String(data?.message || data?.msg || data?.error || fallback);
    if (message.toLowerCase().includes('captcha')) {
      return 'OTP setup error: disable Captcha Validation in the MSG91 OTP Widget settings for this API flow.';
    }
    return message;
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
    gymName: string; country?: string; state?: string; city: string; area: string; address: string; phone?: string; categories?: string[];
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
            name: data.gymName,
            country: String(data.country || 'India').trim() || 'India',
            state: String(data.state || '').trim() || null,
            city: data.city,
            area: data.area,
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
    email: string; password: string; companyName: string; billingContact: string; employeeCount?: number; totalSeats?: number;
  }) {
    const existing = await this.users.findOne({ where: { email: data.email } });
    if (existing) throw new BadRequestException('An account with this email already exists');
    const passwordHash = await bcrypt.hash(data.password, 10);
    const requestedSeats = Math.max(0, Math.round(Number(data.totalSeats ?? data.employeeCount ?? 0) || 0));
    const user = await this.users.save(
      this.users.create({ email: data.email, name: data.companyName, passwordHash, role: 'corporate_admin', isActive: true }),
    );
    const corporate = await this.corporates.save(
      this.corporates.create({
        companyName: data.companyName, email: data.email,
        billingContact: data.billingContact, planType: 'multigym',
        totalSeats: requestedSeats, assignedSeats: 0, adminUserId: user.id, isActive: false,
        pricePerSeat: 0,
        billingStatus: 'pending_payment',
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
