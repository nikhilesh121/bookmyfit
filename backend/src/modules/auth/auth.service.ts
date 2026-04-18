import { Injectable, Inject, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import Redis from 'ioredis';
import { UserEntity } from '../../database/entities/user.entity';
import { REDIS_CLIENT } from '../../common/redis/redis.module';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly jwt: JwtService,
  ) {}

  async sendOtp(phone: string) {
    const code = process.env.NODE_ENV === 'production'
      ? Math.floor(100000 + Math.random() * 900000).toString()
      : '123456'; // Fixed OTP in dev for easier testing
    await this.redis.set(`otp:${phone}`, code, 'EX', 300);
    // TODO: integrate Twilio in production
    // await twilio.messages.create({ to: phone, from: TWILIO_PHONE, body: `Your BMF OTP: ${code}` });
    return { success: true, message: 'OTP sent', ...(process.env.NODE_ENV !== 'production' && { devOtp: code }) };
  }

  async verifyOtp(phone: string, code: string, deviceId: string, name?: string) {
    const stored = await this.redis.get(`otp:${phone}`);
    if (!stored || stored !== code) throw new UnauthorizedException('Invalid or expired OTP');
    await this.redis.del(`otp:${phone}`);

    let user = await this.users.findOne({ where: { phone } });
    if (!user) {
      user = this.users.create({ phone, name: name || 'User', deviceId, role: 'end_user' });
      user = await this.users.save(user);
    } else if (user.deviceId && user.deviceId !== deviceId) {
      // device mismatch → could flag account here
      user.deviceId = deviceId;
      await this.users.save(user);
    } else if (!user.deviceId) {
      user.deviceId = deviceId;
      await this.users.save(user);
    }

    return this.issueTokens(user);
  }

  async passwordLogin(email: string, password: string) {
    const user = await this.users.findOne({ where: { email } });
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials');
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
      return this.issueTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private issueTokens(user: UserEntity) {
    const payload = { sub: user.id, role: user.role, phone: user.phone };
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
