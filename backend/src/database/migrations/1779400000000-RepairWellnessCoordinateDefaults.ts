import { MigrationInterface, QueryRunner } from 'typeorm';

export class RepairWellnessCoordinateDefaults1779400000000 implements MigrationInterface {
  name = 'RepairWellnessCoordinateDefaults1779400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "wellness_partners" SET "lat" = 0 WHERE "lat" IS NULL`);
    await queryRunner.query(`UPDATE "wellness_partners" SET "lng" = 0 WHERE "lng" IS NULL`);
    await queryRunner.query(`ALTER TABLE "wellness_partners" ALTER COLUMN "lat" SET DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "wellness_partners" ALTER COLUMN "lng" SET DEFAULT 0`);
  }

  public async down(): Promise<void> {
    // Keep coordinate defaults in place to avoid breaking partner creation in live DBs.
  }
}
