import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserGymId1778600000000 implements MigrationInterface {
  name = 'AddUserGymId1778600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "gymId" uuid`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_gymId" ON "users" ("gymId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_gymId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "gymId"`);
  }
}
