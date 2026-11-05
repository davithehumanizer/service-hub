/** Who changes a row, as the gateway sends it (docs/demo-data.md). */
export interface Editor {
  /** The signed-in user; null for a guest or an API client. */
  created_by: number | null;
  /** A contributor: what they create is demonstration data. */
  is_demo: boolean;
  admin: boolean;
}

export const NO_EDITOR: Editor = { created_by: null, is_demo: false, admin: false };

/** Whether the editor may change what this user created. */
export const mayEdit = (editor: Editor, createdBy: number | null): boolean =>
  editor.admin || (createdBy !== null && createdBy === editor.created_by);
