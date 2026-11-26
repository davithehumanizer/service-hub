/**
 * Whether the caller holds a permission, read as PermissionsGuard reads it:
 * a signed-in user's role, or an OAuth2 client's scopes.
 */
export const holdsPermission = (req: any, permission: string): boolean => {
  const roles: { name: string }[] | undefined = req?.user?.role?.permissions;
  if (roles) return roles.some((p) => p.name === permission);
  return (
    !!req?.client &&
    String(req?.scope ?? '')
      .split(' ')
      .includes(permission)
  );
};
