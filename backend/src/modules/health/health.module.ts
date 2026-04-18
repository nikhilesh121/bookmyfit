import { Module, Controller, Get } from '@nestjs/common';

@Controller('health')
class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString(), service: 'bookmyfit-api' };
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
