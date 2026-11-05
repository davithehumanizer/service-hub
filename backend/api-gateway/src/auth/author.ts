/** The role whose every creation is demonstration data (docs/demo-data.md). */
export const CONTRIBUTOR_ROLE = 'contributor';

/** Who created a row of the catalogue or of the repairers. */
export interface Author {
  /** The signed-in user; null for a guest or an API client. */
  created_by: number | null;
  /** Created by a contributor: shown as such, and purged with them. */
  is_demo: boolean;
}

/**
 * The author of what a request creates. Set here, after validation, so that
 * no caller can claim it. A user is `id` from the app's own token, `sub`
 * from OAuth2; a guest's role is its bare name.
 */
/** Who changes a row: its author may, an administrator may change any. */
export interface Editor extends Author {
  admin: boolean;
}

export const editorOf = (req: any): Editor => {
  const role = req?.user?.role;
  return {
    ...authorOf(req),
    admin: (typeof role === 'string' ? role : role?.name) === 'admin',
  };
};

export const authorOf = (req: any): Author => {
  const id = Number(req?.user?.id ?? req?.user?.sub ?? NaN);
  const role = req?.user?.role;
  return {
    created_by: Number.isInteger(id) ? id : null,
    is_demo:
      (typeof role === 'string' ? role : role?.name) === CONTRIBUTOR_ROLE,
  };
};
