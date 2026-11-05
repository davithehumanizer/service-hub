import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * A subscription waits on a device model, tutorials being written per model.
 * deviceId stays: it is what the existing rows hold, until the model
 * assignment fills modelId from it.
 */
export class AddSubscriptionModel1791206396456 implements MigrationInterface {
  name = 'AddSubscriptionModel1791206396456';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tutorial_subscriptions" ADD COLUMN IF NOT EXISTS "modelId" integer`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "tutorial_subscriptions" DROP COLUMN IF EXISTS "modelId"`,
    );
  }
}
