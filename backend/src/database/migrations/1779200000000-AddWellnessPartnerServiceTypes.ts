import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWellnessPartnerServiceTypes1779200000000 implements MigrationInterface {
  name = 'AddWellnessPartnerServiceTypes1779200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wellness_partners"
      ADD COLUMN IF NOT EXISTS "serviceTypes" text[] NOT NULL DEFAULT '{}'
    `);

    await queryRunner.query(`
      UPDATE "wellness_partners"
      SET "serviceTypes" = ARRAY[LOWER(TRIM("serviceType"))]
      WHERE COALESCE(array_length("serviceTypes", 1), 0) = 0
        AND "serviceType" IS NOT NULL
        AND TRIM("serviceType") <> ''
    `);

    await queryRunner.query(`
      UPDATE "wellness_partners"
      SET "serviceType" = COALESCE(NULLIF("serviceTypes"[1], ''), 'spa')
      WHERE "serviceType" IS NULL
        OR TRIM("serviceType") = ''
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wellness_partners"
      DROP COLUMN IF EXISTS "serviceTypes"
    `);
  }
}
