import { OpenAPIObject } from '@nestjs/swagger';

/**
 * Turns a permission name into something readable in the Scalar scope picker:
 * `repairer.get_all` -> `get all on repairer`.
 */
function describeScope(scope: string): string {
  const separator = scope.indexOf('.');
  if (separator === -1) {
    return scope;
  }
  const resource = scope.slice(0, separator);
  const action = scope.slice(separator + 1).replace(/_/g, ' ');
  return `${action} on ${resource}`;
}

/**
 * Collects every scope required by an operation's `oauth2` security requirement
 * and writes them into the oauth2 scheme's clientCredentials flow.
 *
 * Those requirements come from @Permissions, which emits both the guard
 * metadata and the OpenAPI security entry, so what is advertised here is by
 * construction what PermissionsGuard enforces (PBI 13777).
 *
 * Returns the sorted scope list, for tests and for logging.
 */
export function collectOAuth2Scopes(document: OpenAPIObject): string[] {
  const scopes = new Set<string>();

  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const operation of Object.values(pathItem ?? {})) {
      // A path item also holds non-operation keys such as `parameters`.
      const security = (operation as { security?: unknown })?.security;
      if (!Array.isArray(security)) {
        continue;
      }
      for (const requirement of security as Record<string, string[]>[]) {
        for (const scope of requirement?.oauth2 ?? []) {
          scopes.add(scope);
        }
      }
    }
  }

  const sorted = [...scopes].sort();

  const scheme = document.components?.securitySchemes?.oauth2;
  const flow =
    scheme && 'flows' in scheme ? scheme.flows?.clientCredentials : undefined;
  if (flow) {
    flow.scopes = Object.fromEntries(
      sorted.map((scope) => [scope, describeScope(scope)]),
    );
  }

  return sorted;
}
