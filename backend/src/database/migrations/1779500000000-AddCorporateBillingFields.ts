import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCorporateBillingFields1779500000000 implements MigrationInterface {
  name = 'AddCorporateBillingFields1779500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "corporate_accounts" ALTER COLUMN "billingContact" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" ADD COLUMN IF NOT EXISTS "pricePerSeat" integer NOT NULL DEFAULT 999`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" ADD COLUMN IF NOT EXISTS "billingStatus" character varying(30) NOT NULL DEFAULT 'active'`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" ADD COLUMN IF NOT EXISTS "pendingSeatRequest" integer NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" ADD COLUMN IF NOT EXISTS "pendingSeatOrderId" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" ADD COLUMN IF NOT EXISTS "lastSeatPaymentOrderId" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" ADD COLUMN IF NOT EXISTS "lastSeatPaymentAt" TIMESTAMP WITH TIME ZONE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "corporate_accounts" DROP COLUMN IF EXISTS "lastSeatPaymentAt"`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" DROP COLUMN IF EXISTS "lastSeatPaymentOrderId"`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" DROP COLUMN IF EXISTS "pendingSeatOrderId"`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" DROP COLUMN IF EXISTS "pendingSeatRequest"`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" DROP COLUMN IF EXISTS "billingStatus"`);
    await queryRunner.query(`ALTER TABLE "corporate_accounts" DROP COLUMN IF EXISTS "pricePerSeat"`);
  }
}
