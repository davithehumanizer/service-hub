import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';

/**
 * Replaces plaintext `oauth_clients.client_secret` values with bcrypt hashes.
 *
 * Client secrets are bearer credentials: read access to the database (a dump, a
 * backup, a support query) was enough to impersonate any registered
 * integration. The previous lookup compared them in SQL, which required storing
 * them in clear.
 *
 * Existing clients keep working — the secrets they already hold are hashed in
 * place, not rotated. `verifyClientSecret` in oauth.service.ts accepts both
 * formats, so this migration and the service deployment can happen in either
 * order.
 *
 * Idempotent: rows that already carry a bcrypt hash are skipped.
 *
 * Irreversible by design — `down()` cannot recover the plaintext. If you need
 * to roll back, re-issue the secrets.
 */
export class HashOauthClientSecrets1764500000000 implements MigrationInterface {
  name = 'HashOauthClientSecrets1764500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const clients: { id: number; client_secret: string }[] =
      await queryRunner.query(
        `SELECT id, client_secret FROM oauth_clients WHERE client_secret IS NOT NULL`,
      );

    for (const client of clients) {
      if (/^\$2[aby]\$/.test(client.client_secret)) {
        continue; // already hashed
      }
      const hash = await bcrypt.hash(client.client_secret, 10);
      await queryRunner.query(
        `UPDATE oauth_clients SET client_secret = $1 WHERE id = $2`,
        [hash, client.id],
      );
    }
  }

  public async down(): Promise<void> {
    // Hashing is one-way: the original secrets cannot be restored. Rolling back
    // means re-issuing secrets to every registered client.
    throw new Error(
      'HashOauthClientSecrets cannot be reverted: plaintext client secrets are unrecoverable. Re-issue client secrets instead.',
    );
  }
}
