import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Takes user.get_all back from every role but admin.
 *
 * The user role held it, and repairer inherits it: any signed-in account could
 * list every account with its profile. The seeder only ever adds, so removing
 * it from the code is not enough. Users lose it at their next token refresh,
 * within the hour.
 */
export class RevokeUserGetAllFromNonAdmins1793884051516
  implements MigrationInterface
{
  name = 'RevokeUserGetAllFromNonAdmins1793884051516';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "roles_permissions_permission"
       WHERE "permissionId" IN (SELECT "id" FROM "permission" WHERE "name" = 'user.get_all')
         AND "rolesId" IN (SELECT "id" FROM "roles" WHERE "name" <> 'admin')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Back to what the seeder used to grant.
    await queryRunner.query(`
      INSERT INTO "roles_permissions_permission" ("rolesId", "permissionId")
      SELECT r."id", p."id"
        FROM "roles" r, "permission" p
       WHERE r."name" IN ('user', 'repairer')
         AND p."name" = 'user.get_all'
      ON CONFLICT DO NOTHING
    `);
  }
}
