import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGymVideosAndCatalogIconText1778500000000 implements MigrationInterface {
  name = 'AddGymVideosAndCatalogIconText1778500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "gyms"
      ADD COLUMN IF NOT EXISTS "videos" text[] NOT NULL DEFAULT '{}'
    `);
    await queryRunner.query('ALTER TABLE "categories" ALTER COLUMN "iconUrl" TYPE text');
    await queryRunner.query('ALTER TABLE "amenities" ALTER COLUMN "iconUrl" TYPE text');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "gyms" DROP COLUMN IF EXISTS "videos"');
    await queryRunner.query('ALTER TABLE "categories" ALTER COLUMN "iconUrl" TYPE varchar(255)');
    await queryRunner.query('ALTER TABLE "amenities" ALTER COLUMN "iconUrl" TYPE varchar(255)');
  }
}
