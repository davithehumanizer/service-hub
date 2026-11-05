import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Disabled: this migration used to insert a `test-client` / `test-secret`
 * OAuth client with `{read,write}` scopes.
 *
 * It never ran in any container — both the migration glob and the CLI
 * DataSource path were wrong, so the schema was maintained by `synchronize`
 * instead. Now that migrations actually execute, replaying it would either seed
 * a credential whose secret is published in this repository, or abort the run
 * on a unique-key conflict and block the two migrations that follow.
 *
 * The class is kept rather than deleted so the runner records it as applied and
 * never reconsiders it — same convention as
 * devices-service/src/migrations/1697390000000-CreateDeviceCategory.ts.
 *
 * Register development clients explicitly instead; see
 * docs/oauth2_integration_guide.md.
 */
export class InsertTestOauthClient1719330000000 implements MigrationInterface {
  public async up(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally a no-op.
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally a no-op.
  }
}
