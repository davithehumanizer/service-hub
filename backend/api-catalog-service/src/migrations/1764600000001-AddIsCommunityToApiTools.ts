import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `api_tools.isCommunity`, the community-contribution flag introduced with
 * the "Community Tools" rename.
 *
 * The column shipped on the entity without a migration, created in practice by
 * `synchronize: true`. With synchronize disabled every query on api_tools fails
 * with `column ApiTool.isCommunity does not exist`, which takes the whole
 * catalogue down.
 */
export class AddIsCommunityToApiTools1764600000001
  implements MigrationInterface
{
  name = 'AddIsCommunityToApiTools1764600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "api_tools"
      ADD COLUMN IF NOT EXISTS "isCommunity" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "api_tools" DROP COLUMN IF EXISTS "isCommunity"`,
    );
  }
}
