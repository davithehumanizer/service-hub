import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Gives the user role to every account still holding the guest role.
 *
 * Guest is the anonymous visitor's role, which the api-gateway applies to
 * requests without a token; no account should hold it. Sign-up has long given
 * the user role, but older accounts kept guest, which lacks user.update: they
 * could not save their profile, nor finish the onboarding every page sent them
 * back to.
 *
 * Idempotent, and a no-op on a database whose roles are not seeded yet. Not
 * reverted: which accounts were moved is not recorded, and none should go
 * back to guest.
 */
export class MoveGuestAccountsToUserRole1791990039257
  implements MigrationInterface
{
  name = 'MoveGuestAccountsToUserRole1791990039257';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users"
         SET "roleId" = (SELECT "id" FROM "roles" WHERE "name" = 'user')
       WHERE "roleId" = (SELECT "id" FROM "roles" WHERE "name" = 'guest')
         AND EXISTS (SELECT 1 FROM "roles" WHERE "name" = 'user')
    `);
  }

  public async down(): Promise<void> {
    // Nothing to undo: see above.
  }
}
