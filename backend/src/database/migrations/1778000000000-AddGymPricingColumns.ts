import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGymPricingColumns1778000000000 implements MigrationInterface {
  name = 'AddGymPricingColumns1778000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "gyms"
      ADD COLUMN IF NOT EXISTS "dayPassPrice" numeric(10,2)
    `);
    await queryRunner.query(`
      ALTER TABLE "gyms"
      ADD COLUMN IF NOT EXISTS "sameGymMonthlyPrice" numeric(10,2)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "gyms" DROP COLUMN IF EXISTS "sameGymMonthlyPrice"');
    await queryRunner.query('ALTER TABLE "gyms" DROP COLUMN IF EXISTS "dayPassPrice"');
  }
}
