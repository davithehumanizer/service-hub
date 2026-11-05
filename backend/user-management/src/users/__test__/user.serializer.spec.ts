import { toSafeUser, toSafeUsers } from '../user.serializer';
import { User } from '../user.entity';

const fullUser = {
  id: 42,
  email: 'user@example.com',
  password: '$2a$10$abcdefghijklmnopqrstuv',
  role: { id: 2, name: 'user', permissions: [{ name: 'device.read' }] },
  created_at: new Date('2026-01-01T00:00:00Z'),
  updated_at: new Date('2026-02-01T00:00:00Z'),
  isVerified: true,
  confirmationToken: 'confirm-me',
  resetToken: 'reset-me',
  profile: { firstName: 'Ada', lastName: 'Lovelace' },
} as unknown as User;

describe('toSafeUser', () => {
  it('strips every secret carried by the entity', () => {
    const safe = toSafeUser(fullUser) as unknown as Record<string, unknown>;

    expect(safe).not.toHaveProperty('password');
    expect(safe).not.toHaveProperty('confirmationToken');
    expect(safe).not.toHaveProperty('resetToken');
  });

  it('returns null for a missing user', () => {
    expect(toSafeUser(null)).toBeNull();
    expect(toSafeUser(undefined)).toBeNull();
  });

  it('maps a list', () => {
    expect(toSafeUsers([fullUser])).toHaveLength(1);
  });

  /**
   * oauth-service builds OIDC access tokens, id_tokens and the userinfo
   * response from whatever `find_user_by_id` returns. Since that handler now
   * answers with a SafeUser, dropping any of these fields would silently break
   * the claims of a live identity provider — hence this contract test.
   *
   * See oauth.service.ts: exchangeCodeForToken, exchangeRefreshToken, getUserInfo.
   */
  describe('OIDC claim contract', () => {
    it('carries every field the OIDC token builders read', () => {
      const safe = toSafeUser(fullUser);

      // sub
      expect(safe.id).toBe(42);
      // email
      expect(safe.email).toBe('user@example.com');
      // email_verified
      expect(safe.isVerified).toBe(true);
      // role (non-standard claim, present in access_token and id_token)
      expect(safe.role).toEqual(fullUser.role);
      // name / given_name / family_name
      expect(safe.profile).toEqual({ firstName: 'Ada', lastName: 'Lovelace' });
    });

    it('keeps isVerified false rather than dropping it', () => {
      const safe = toSafeUser({ ...fullUser, isVerified: false } as User);
      expect(safe.isVerified).toBe(false);
    });
  });
});
