import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultCategories1778700000000 implements MigrationInterface {
  name = 'SeedDefaultCategories1778700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const categories = [
      ['Strength', 'lucide:dumbbell'],
      ['Cardio', 'lucide:activity'],
      ['Yoga', 'lucide:flower'],
      ['CrossFit', 'lucide:zap'],
      ['HIIT', 'lucide:zap'],
      ['Zumba', 'lucide:music'],
      ['Pilates', 'lucide:flower'],
      ['Weights', 'lucide:dumbbell'],
      ['Pool', 'lucide:waves'],
      ['Boxing', 'lucide:badge'],
      ['MMA', 'lucide:badge'],
      ['Functional Training', 'lucide:activity'],
      ['Dance Fitness', 'lucide:music'],
    ];

    await queryRunner.query(
      `
        INSERT INTO "categories" ("name", "iconUrl", "isActive")
        VALUES ${categories.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2}, true)`).join(', ')}
        ON CONFLICT ("name") DO UPDATE
        SET
          "iconUrl" = COALESCE("categories"."iconUrl", EXCLUDED."iconUrl"),
          "isActive" = true
      `,
      categories.flat(),
    );
  }

  public async down(): Promise<void> {
    // Keep master categories on rollback so existing gym profiles do not lose references.
  }
}
