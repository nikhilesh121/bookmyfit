import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCountryStateToPartners1779600000000 implements MigrationInterface {
  name = 'AddCountryStateToPartners1779600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "gyms" ADD COLUMN IF NOT EXISTS "country" character varying(100) DEFAULT 'India'`);
    await queryRunner.query(`ALTER TABLE "gyms" ADD COLUMN IF NOT EXISTS "state" character varying(100)`);
    await queryRunner.query(`UPDATE "gyms" SET "country" = 'India' WHERE "country" IS NULL OR TRIM("country") = ''`);

    await queryRunner.query(`ALTER TABLE "wellness_partners" ADD COLUMN IF NOT EXISTS "country" character varying(100) DEFAULT 'India'`);
    await queryRunner.query(`ALTER TABLE "wellness_partners" ADD COLUMN IF NOT EXISTS "state" character varying(100)`);
    await queryRunner.query(`UPDATE "wellness_partners" SET "country" = 'India' WHERE "country" IS NULL OR TRIM("country") = ''`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "wellness_partners" DROP COLUMN IF EXISTS "state"`);
    await queryRunner.query(`ALTER TABLE "wellness_partners" DROP COLUMN IF EXISTS "country"`);
    await queryRunner.query(`ALTER TABLE "gyms" DROP COLUMN IF EXISTS "state"`);
    await queryRunner.query(`ALTER TABLE "gyms" DROP COLUMN IF EXISTS "country"`);
  }
}
