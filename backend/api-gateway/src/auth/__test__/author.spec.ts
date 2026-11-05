import { authorOf, editorOf } from '../author';

describe('authorOf', () => {
  it("marks a contributor's creation as demonstration data", () => {
    expect(
      authorOf({ user: { id: 42, role: { name: 'contributor' } } }),
    ).toEqual({ created_by: 42, is_demo: true });
  });

  it("keeps a user's as real data", () => {
    expect(authorOf({ user: { id: 7, role: { name: 'user' } } })).toEqual({
      created_by: 7,
      is_demo: false,
    });
  });

  it('reads the id of an OAuth2 user from `sub`', () => {
    expect(authorOf({ user: { sub: '12', role: { name: 'user' } } })).toEqual({
      created_by: 12,
      is_demo: false,
    });
  });

  it('names no author for a guest, an API client or no user', () => {
    const none = { created_by: null, is_demo: false };
    expect(authorOf({ user: { role: 'guest' } })).toEqual(none);
    expect(
      authorOf({ user: { clientId: 'importer', isOAuth2: true } }),
    ).toEqual(none);
    expect(authorOf({})).toEqual(none);
  });

  it('takes an administrator as the editor of anything', () => {
    expect(editorOf({ user: { id: 1, role: { name: 'admin' } } })).toEqual({
      created_by: 1,
      is_demo: false,
      admin: true,
    });
    expect(editorOf({ user: { role: 'guest' } }).admin).toBe(false);
  });
});
