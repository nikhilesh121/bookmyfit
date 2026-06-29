import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTrainerGenderGymPtPriceEssentials1780200000000 implements MigrationInterface {
  name = 'AddTrainerGenderGymPtPriceEssentials1780200000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // Task 3 — trainer gender (drives default profile image in mobile app)
    await queryRunner.query(`
      ALTER TABLE "trainers"
      ADD COLUMN IF NOT EXISTS "gender" character varying(10) NOT NULL DEFAULT 'male'
    `);
    // Task 5 — gym-level Personal Training monthly charge inherited by all trainers
    await queryRunner.query(`
      ALTER TABLE "gyms"
      ADD COLUMN IF NOT EXISTS "ptMonthlyPrice" numeric(10,2)
    `);
    // Task 8 — configurable "gym essentials" list shown on gym details
    await queryRunner.query(`
      ALTER TABLE "gyms"
      ADD COLUMN IF NOT EXISTS "essentials" text[] NOT NULL DEFAULT '{}'
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "gyms" DROP COLUMN IF EXISTS "essentials"');
    await queryRunner.query('ALTER TABLE "gyms" DROP COLUMN IF EXISTS "ptMonthlyPrice"');
    await queryRunner.query('ALTER TABLE "trainers" DROP COLUMN IF EXISTS "gender"');
  }
}
