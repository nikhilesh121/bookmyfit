import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGymPlanSalePrice1778800000000 implements MigrationInterface {
  name = 'AddGymPlanSalePrice1778800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "gym_plans" ADD COLUMN IF NOT EXISTS "salePrice" numeric(10,2)`);
    await queryRunner.query(`UPDATE "gym_plans" SET "salePrice" = "price" WHERE "salePrice" IS NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "gym_plans" DROP COLUMN IF EXISTS "salePrice"`);
  }
}
