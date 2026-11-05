import { OpenAPIObject } from '@nestjs/swagger';
import { describeLanguageHeader } from '../openapi-language';

const documentWith = (paths: Record<string, unknown>): OpenAPIObject =>
  ({
    openapi: '3.0.0',
    info: { title: 'test', version: '1.0' },
    paths,
  }) as unknown as OpenAPIObject;

const parametersOf = (document: OpenAPIObject, path: string, method: string) =>
  (
    document.paths[path] as unknown as Record<
      string,
      { parameters: Record<string, unknown>[] }
    >
  )[method].parameters;

describe('describeLanguageHeader', () => {
  it('makes Accept-Language optional and says what it does', () => {
    const document = documentWith({
      '/device-models': {
        get: {
          parameters: [
            { name: 'search', in: 'query', required: false },
            { name: 'accept-language', in: 'header', required: true },
          ],
        },
      },
    });

    expect(describeLanguageHeader(document)).toBe(1);
    const [search, language] = parametersOf(document, '/device-models', 'get');
    expect(language).toEqual(
      expect.objectContaining({
        required: false,
        description: expect.stringContaining('English without it'),
      }),
    );
    expect(search).toEqual({ name: 'search', in: 'query', required: false });
  });

  it('leaves alone other headers, query parameters of that name, and operations without parameters', () => {
    const document = documentWith({
      '/a': {
        parameters: [{ name: 'accept-language', in: 'header', required: true }],
        get: {
          parameters: [
            { name: 'x-trace-id', in: 'header', required: true },
            { name: 'accept-language', in: 'query', required: true },
          ],
        },
        post: {},
      },
    });

    expect(describeLanguageHeader(document)).toBe(0);
    expect(parametersOf(document, '/a', 'get').map((p) => p.required)).toEqual([
      true,
      true,
    ]);
  });
});
