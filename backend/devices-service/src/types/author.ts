/** Who created a row, as the gateway sends it (docs/demo-data.md). */
export interface Author {
  /** The signed-in user; null for an import or an API client. */
  created_by: number | null;
  /** Created by a contributor: demonstration data, purged with them. */
  is_demo: boolean;
}

export const NO_AUTHOR: Author = { created_by: null, is_demo: false };

/** Who changes a row: its author may, an administrator may change any. */
export interface Editor extends Author {
  admin: boolean;
}

export const NO_EDITOR: Editor = { ...NO_AUTHOR, admin: false };

/** Whether the editor may change what this user created. */
export const mayEdit = (editor: Editor, createdBy: number | null): boolean =>
  editor.admin || (createdBy !== null && createdBy === editor.created_by);
