import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnsurePortalAccountLinks1779300000000 implements MigrationInterface {
  name = 'EnsurePortalAccountLinks1779300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wellness_partners" ADD COLUMN IF NOT EXISTS "ownerId" uuid`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" ADD COLUMN IF NOT EXISTS "adminUserId" uuid`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" ADD COLUMN IF NOT EXISTS "isActive" boolean NOT NULL DEFAULT true`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" ADD COLUMN IF NOT EXISTS "assignedSeats" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" ADD COLUMN IF NOT EXISTS "totalSeats" integer NOT NULL DEFAULT 0`);
  }

  public async down(): Promise<void> {
    // Kept intentionally non-destructive because this migration repairs live schema drift.
  }
}
