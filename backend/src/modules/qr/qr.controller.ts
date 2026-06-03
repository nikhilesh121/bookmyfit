import { Body, Controller, Get, Post, Query, UseGuards, Req, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GymEntity } from '../../database/entities/gym.entity';
import { UserEntity } from '../../database/entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { QrService } from './qr.service';

class GenerateQrDto {
  @IsUUID() subscriptionId: string;
}
class ValidateQrDto {
  @IsString() qrToken: string;
  @IsOptional() @IsUUID() gymId?: string;
}
class ValidateManualDto {
  @IsString() code: string;
  @IsOptional() @IsUUID() gymId?: string;
}

@ApiTags('QR Check-in')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('qr')
export class QrController {
  constructor(
    private readonly qr: QrService,
    @InjectRepository(GymEntity) private readonly gyms: Repository<GymEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
  ) {}

  private async scannerGymId(req: any, requestedGymId?: string) {
    if (req.user?.role === 'super_admin') {
      if (!requestedGymId) throw new BadRequestException('gymId is required for admin scanner validation');
      return requestedGymId;
    }
    const gym = req.user?.role === 'gym_staff'
      ? await this.users.findOne({ where: { id: req.user?.userId } }).then((staff) => (
        staff?.gymId ? this.gyms.findOne({ where: { id: staff.gymId } }) : null
      ))
      : await this.gyms.findOne({ where: { ownerId: req.user?.userId } });
    if (!gym) throw new ForbiddenException('Scanner is not linked to a gym profile');
    if (requestedGymId && requestedGymId !== gym.id) throw new ForbiddenException('Scanner is linked to another gym');
    return gym.id;
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate a 30-second QR token (mobile app)' })
  generate(@Req() req: any, @Body() dto: GenerateQrDto) {
    return this.qr.generateQr(req.user.userId, dto.subscriptionId);
  }

  @Post('validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gym_owner', 'gym_staff', 'super_admin')
  @ApiOperation({ summary: 'Validate a QR token (gym panel scanner)' })
  async validate(@Req() req: any, @Body() dto: ValidateQrDto) {
    const inferredGymId = req.user?.role === 'super_admin' && !dto.gymId
      ? this.qr.decodeQrGymId(dto.qrToken)
      : null;
    const gymId = await this.scannerGymId(req, dto.gymId || inferredGymId || undefined);
    return this.qr.validateQr(dto.qrToken, gymId);
  }

  @Post('validate-manual')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('gym_owner', 'gym_staff', 'super_admin')
  @ApiOperation({ summary: 'Validate a booking reference manually when QR scan fails' })
  async validateManual(@Req() req: any, @Body() dto: ValidateManualDto) {
    const gymId = await this.scannerGymId(req, dto.gymId);
    return this.qr.validateManualCode(dto.code, gymId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get current user check-in history' })
  history(@Req() req: any, @Query('limit') limit?: string) {
    return this.qr.getUserHistory(req.user.userId, limit ? parseInt(limit, 10) : 50);
  }
}
