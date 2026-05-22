import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';

async function run() {
  process.env.SEED_ON_BOOT = 'true';
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  await app.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
