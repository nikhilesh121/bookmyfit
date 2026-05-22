import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedDefaultAmenities1778900000000 implements MigrationInterface {
  name = 'SeedDefaultAmenities1778900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const amenities = [
      ['AC', 'lucide:snowflake'],
      ['Parking', 'lucide:parking-circle'],
      ['Shower', 'lucide:shower-head'],
      ['Locker', 'lucide:lock-keyhole'],
      ['Changing Room', 'lucide:lock-keyhole'],
      ['WiFi', 'lucide:wifi'],
      ['Pool', 'lucide:waves'],
      ['Steam Room', 'lucide:flame'],
      ['Sauna', 'lucide:flame'],
      ['Personal Trainer', 'lucide:user-round-check'],
      ['Drinking Water', 'lucide:waves'],
      ['24/7 Access', 'lucide:badge'],
      ['Cycling Studio', 'lucide:bike'],
      ['Recovery Zone', 'lucide:heart-pulse'],
      ['Air Ventilation', 'lucide:air-vent'],
    ];

    await queryRunner.query(
      `
        INSERT INTO "amenities" ("name", "iconUrl", "isActive", "status", "requestedByGym")
        VALUES ${amenities.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2}, true, 'approved', false)`).join(', ')}
        ON CONFLICT ("name") DO UPDATE
        SET
          "iconUrl" = COALESCE("amenities"."iconUrl", EXCLUDED."iconUrl"),
          "isActive" = true,
          "status" = 'approved',
          "requestedByGym" = false
      `,
      amenities.flat(),
    );
  }

  public async down(): Promise<void> {
    // Keep master amenities on rollback so existing gym profiles do not lose references.
  }
}
