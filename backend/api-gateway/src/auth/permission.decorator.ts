import { applyDecorators, SetMetadata } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';

/**
 * Declares the permissions PermissionsGuard will require on this handler, and
 * documents them as the OAuth2 scopes the endpoint needs.
 *
 * The two are emitted from the same argument on purpose: the documented scopes
 * cannot drift from the ones actually enforced (PBI 13777). Endpoints without
 * this decorator are public and appear in Scalar with no security requirement.
 */
export const Permissions = (...permissions: string[]) =>
  applyDecorators(
    SetMetadata('permissions', permissions),
    ApiSecurity('oauth2', permissions),
  );
