import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCorporateDefaultPricing1779700000000 implements MigrationInterface {
  name = 'RemoveCorporateDefaultPricing1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "corporate_accounts" ALTER COLUMN "pricePerSeat" SET DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" ALTER COLUMN "billingStatus" SET DEFAULT 'pending_payment'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "corporate_accounts" ALTER COLUMN "pricePerSeat" SET DEFAULT 999`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" ALTER COLUMN "billingStatus" SET DEFAULT 'active'`);
  }
}
