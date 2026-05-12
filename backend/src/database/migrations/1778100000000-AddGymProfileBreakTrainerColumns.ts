import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGymProfileBreakTrainerColumns1778100000000 implements MigrationInterface {
  name = 'AddGymProfileBreakTrainerColumns1778100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "gyms"
      ADD COLUMN IF NOT EXISTS "description" text,
      ADD COLUMN IF NOT EXISTS "pinCode" varchar(20),
      ADD COLUMN IF NOT EXISTS "contactPhone" varchar(30),
      ADD COLUMN IF NOT EXISTS "contactEmail" varchar(150),
      ADD COLUMN IF NOT EXISTS "website" varchar(255),
      ADD COLUMN IF NOT EXISTS "openingTime" varchar(5) NOT NULL DEFAULT '06:00',
      ADD COLUMN IF NOT EXISTS "closingTime" varchar(5) NOT NULL DEFAULT '22:00',
      ADD COLUMN IF NOT EXISTS "breakStartTime" varchar(5),
      ADD COLUMN IF NOT EXISTS "breakEndTime" varchar(5),
      ADD COLUMN IF NOT EXISTS "kycReviewNote" text
    `);
    await queryRunner.query(`
      ALTER TABLE "gym_schedules"
      ADD COLUMN IF NOT EXISTS "breakStartTime" varchar(5),
      ADD COLUMN IF NOT EXISTS "breakEndTime" varchar(5)
    `);
    await queryRunner.query(`
      ALTER TABLE "trainers"
      ADD COLUMN IF NOT EXISTS "monthlyPrice" numeric(10,2) NOT NULL DEFAULT 0
    `);
    await queryRunner.query(`
      ALTER TABLE "trainer_bookings"
      ADD COLUMN IF NOT EXISTS "durationMonths" integer NOT NULL DEFAULT 1
    `);
    await queryRunner.query(`
      ALTER TABLE "amenities"
      ADD COLUMN IF NOT EXISTS "requestedByGymId" uuid,
      ADD COLUMN IF NOT EXISTS "requestedByUserId" uuid
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "amenities" DROP COLUMN IF EXISTS "requestedByUserId"');
    await queryRunner.query('ALTER TABLE "amenities" DROP COLUMN IF EXISTS "requestedByGymId"');
    await queryRunner.query('ALTER TABLE "trainer_bookings" DROP COLUMN IF EXISTS "durationMonths"');
    await queryRunner.query('ALTER TABLE "trainers" DROP COLUMN IF EXISTS "monthlyPrice"');
    await queryRunner.query('ALTER TABLE "gym_schedules" DROP COLUMN IF EXISTS "breakEndTime"');
    await queryRunner.query('ALTER TABLE "gym_schedules" DROP COLUMN IF EXISTS "breakStartTime"');
    await queryRunner.query('ALTER TABLE "gyms" DROP COLUMN IF EXISTS "breakEndTime"');
    await queryRunner.query('ALTER TABLE "gyms" DROP COLUMN IF EXISTS "breakStartTime"');
    await queryRunner.query('ALTER TABLE "gyms" DROP COLUMN IF EXISTS "kycReviewNote"');
    await queryRunner.query('ALTER TABLE "gyms" DROP COLUMN IF EXISTS "closingTime"');
    await queryRunner.query('ALTER TABLE "gyms" DROP COLUMN IF EXISTS "openingTime"');
    await queryRunner.query('ALTER TABLE "gyms" DROP COLUMN IF EXISTS "website"');
    await queryRunner.query('ALTER TABLE "gyms" DROP COLUMN IF EXISTS "contactEmail"');
    await queryRunner.query('ALTER TABLE "gyms" DROP COLUMN IF EXISTS "contactPhone"');
    await queryRunner.query('ALTER TABLE "gyms" DROP COLUMN IF EXISTS "pinCode"');
    await queryRunner.query('ALTER TABLE "gyms" DROP COLUMN IF EXISTS "description"');
  }
}
