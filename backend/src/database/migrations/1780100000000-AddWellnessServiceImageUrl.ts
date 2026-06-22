import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWellnessServiceImageUrl1780100000000 implements MigrationInterface {
  name = 'AddWellnessServiceImageUrl1780100000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "wellness_services"
      ADD COLUMN IF NOT EXISTS "imageUrl" text
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "wellness_services" DROP COLUMN IF EXISTS "imageUrl"');
  }
}
