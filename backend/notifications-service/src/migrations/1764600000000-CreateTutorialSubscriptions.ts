import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the table behind the "notify me when a tutorial exists" feature.
 *
 * The TutorialSubscription entity shipped without a migration, relying on
 * `synchronize: true` to create its table. Now that synchronize is disabled the
 * table has to be declared explicitly — without it, POST
 * /api/v1/notifications/tutorial-subscriptions answers 500.
 *
 * SQL taken from `typeorm schema:log` so the result matches what the entity
 * expects exactly, including the primary key name.
 */
export class CreateTutorialSubscriptions1764600000000
  implements MigrationInterface
{
  name = 'CreateTutorialSubscriptions1764600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // `uuid_generate_v4()` is the default the entity expects.
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tutorial_subscriptions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" integer,
        "deviceId" character varying,
        "issueTypes" text,
        "email" character varying NOT NULL,
        "locale" character varying NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_acb6fa826f2f6a6583a61f78531" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "tutorial_subscriptions"`);
  }
}
