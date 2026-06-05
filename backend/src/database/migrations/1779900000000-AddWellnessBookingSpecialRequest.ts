import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWellnessBookingSpecialRequest1779900000000 implements MigrationInterface {
  name = 'AddWellnessBookingSpecialRequest1779900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wellness_bookings" ADD COLUMN IF NOT EXISTS "specialRequest" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wellness_bookings" DROP COLUMN IF EXISTS "specialRequest"`);
  }
}
