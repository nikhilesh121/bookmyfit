import { Body, Controller, Post, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';
import { AuthService } from './auth.service';

class SendOtpDto {
  @IsString() @Length(10, 15) phone: string;
}
class VerifyOtpDto {
  @IsString() @Length(10, 15) phone: string;
  @IsString() @Length(4, 6) code: string;
  @IsString() @IsNotEmpty() deviceId: string;
  @IsString() name?: string;
}
class AdminLoginDto {
  @IsString() email: string;
  @IsString() password: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/send')
  @HttpCode(200)
  @ApiOperation({ summary: 'Send OTP to a phone number' })
  sendOtp(@Body() dto: SendOtpDto) {
    return this.auth.sendOtp(dto.phone);
  }

  @Post('otp/verify')
  @HttpCode(200)
  @ApiOperation({ summary: 'Verify OTP and issue JWT' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto.phone, dto.code, dto.deviceId, dto.name);
  }

  @Post('admin/login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Admin / Gym / Corporate login (email + password)' })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.auth.passwordLogin(dto.email, dto.password);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: { refreshToken: string }) {
    return this.auth.refresh(dto.refreshToken);
  }
}
