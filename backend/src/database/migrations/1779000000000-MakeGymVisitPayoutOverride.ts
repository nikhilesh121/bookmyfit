import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeGymVisitPayoutOverride1779000000000 implements MigrationInterface {
  name = 'MakeGymVisitPayoutOverride1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "gyms" ALTER COLUMN "ratePerDay" DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE "gyms" ALTER COLUMN "ratePerDay" DROP NOT NULL`);
    await queryRunner.query(`UPDATE "gyms" SET "ratePerDay" = NULL WHERE "ratePerDay" = 50`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "gyms" SET "ratePerDay" = 50 WHERE "ratePerDay" IS NULL`);
    await queryRunner.query(`ALTER TABLE "gyms" ALTER COLUMN "ratePerDay" SET DEFAULT 50`);
    await queryRunner.query(`ALTER TABLE "gyms" ALTER COLUMN "ratePerDay" SET NOT NULL`);
  }
}
