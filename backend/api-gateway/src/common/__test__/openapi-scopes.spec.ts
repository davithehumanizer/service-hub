import { OpenAPIObject } from '@nestjs/swagger';
import { collectOAuth2Scopes } from '../openapi-scopes';

const documentWith = (paths: OpenAPIObject['paths']): OpenAPIObject =>
  ({
    openapi: '3.0.0',
    info: { title: 'test', version: '1.0' },
    paths,
    components: {
      securitySchemes: {
        oauth2: {
          type: 'oauth2',
          flows: {
            clientCredentials: { tokenUrl: 'https://example.test', scopes: {} },
          },
        },
      },
    },
  }) as OpenAPIObject;

describe('collectOAuth2Scopes', () => {
  it('collects scopes from every operation, deduplicated and sorted', () => {
    const document = documentWith({
      '/repairers': {
        get: { security: [{ oauth2: ['repairer.get_all'] }] },
        post: { security: [{ oauth2: ['repairer.create'] }] },
      },
      '/repairers/{id}': {
        get: { security: [{ oauth2: ['repairer.get_all'] }] },
      },
    } as unknown as OpenAPIObject['paths']);

    expect(collectOAuth2Scopes(document)).toEqual([
      'repairer.create',
      'repairer.get_all',
    ]);
  });

  it('writes the scopes into the clientCredentials flow with a readable label', () => {
    const document = documentWith({
      '/repairers': {
        get: { security: [{ oauth2: ['repairer.get_all'] }] },
      },
    } as unknown as OpenAPIObject['paths']);

    collectOAuth2Scopes(document);

    const scheme = document.components?.securitySchemes?.oauth2 as {
      flows: { clientCredentials: { scopes: Record<string, string> } };
    };
    expect(scheme.flows.clientCredentials.scopes).toEqual({
      'repairer.get_all': 'get all on repairer',
    });
  });

  it('leaves public endpoints out of the scope list', () => {
    const document = documentWith({
      '/health': { get: {} },
      '/devices': { get: { security: [{ oauth2: ['device.search'] }] } },
    } as unknown as OpenAPIObject['paths']);

    expect(collectOAuth2Scopes(document)).toEqual(['device.search']);
  });

  it('ignores non-operation path item entries', () => {
    const document = documentWith({
      '/devices/{id}': {
        parameters: [{ name: 'id', in: 'path' }],
        get: { security: [{ oauth2: ['device.getById'] }] },
      },
    } as unknown as OpenAPIObject['paths']);

    expect(() => collectOAuth2Scopes(document)).not.toThrow();
    expect(collectOAuth2Scopes(document)).toEqual(['device.getById']);
  });
});
