import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { Permissions } from '../permission.decorator';

class TestController {
  @Permissions('repairer.get_all')
  findAll() {}

  @Permissions('repairer.reports.admin', 'repairer.update')
  moderate() {}

  publicEndpoint() {}
}

const metadataOf = (key: string, method: keyof TestController) =>
  Reflect.getMetadata(key, TestController.prototype[method]);

describe('Permissions decorator', () => {
  it('sets the metadata PermissionsGuard reads', () => {
    expect(metadataOf('permissions', 'findAll')).toEqual([
      'repairer.get_all',
    ]);
  });

  it('documents the same permissions as OAuth2 scopes', () => {
    expect(metadataOf(DECORATORS.API_SECURITY, 'findAll')).toEqual([
      { oauth2: ['repairer.get_all'] },
    ]);
  });

  // The point of the decorator: what Scalar advertises cannot drift from what
  // the guard enforces, because both come from the same argument (PBI 13777).
  it('keeps guard metadata and documented scopes aligned for several permissions', () => {
    const enforced = metadataOf('permissions', 'moderate') as string[];
    const documented = metadataOf(DECORATORS.API_SECURITY, 'moderate') as {
      oauth2: string[];
    }[];

    expect(documented).toHaveLength(1);
    expect(documented[0].oauth2).toEqual(enforced);
  });

  it('leaves undecorated endpoints without any security requirement', () => {
    expect(metadataOf('permissions', 'publicEndpoint')).toBeUndefined();
    expect(metadataOf(DECORATORS.API_SECURITY, 'publicEndpoint')).toBeUndefined();
  });
});
