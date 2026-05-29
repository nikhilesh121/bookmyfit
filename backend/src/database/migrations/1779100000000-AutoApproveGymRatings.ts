import { MigrationInterface, QueryRunner } from 'typeorm';

export class AutoApproveGymRatings1779100000000 implements MigrationInterface {
  name = 'AutoApproveGymRatings1779100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "ratings"
      SET "status" = 'approved'
      WHERE "gymId" IS NOT NULL
        AND "status" = 'pending'
    `);

    await queryRunner.query(`
      UPDATE "gyms" AS g
      SET
        "rating" = rated."rating",
        "ratingCount" = rated."ratingCount"
      FROM (
        SELECT
          r."gymId",
          ROUND(AVG(r.stars)::numeric, 1)::float AS "rating",
          COUNT(*)::int AS "ratingCount"
        FROM "ratings" AS r
        WHERE r."gymId" IS NOT NULL
          AND r."status" = 'approved'
        GROUP BY r."gymId"
      ) AS rated
      WHERE g.id = rated."gymId"
    `);
  }

  public async down(): Promise<void> {
    // Intentionally no-op: publishing eligible gym reviews is a product rule,
    // and reverting would hide genuine member feedback.
  }
}
