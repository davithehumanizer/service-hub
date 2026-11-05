import { OpenAPIObject } from '@nestjs/swagger';

/**
 * Routes read `Accept-Language` through @Headers(), which @nestjs/swagger
 * documents as a required header. It never is: without it, names are English.
 *
 * Returns how many operations it described, for tests.
 */
export function describeLanguageHeader(document: OpenAPIObject): number {
  let described = 0;

  for (const pathItem of Object.values(document.paths ?? {})) {
    for (const operation of Object.values(pathItem ?? {})) {
      // A path item also holds non-operation keys such as `parameters`.
      const parameters = (operation as { parameters?: unknown })?.parameters;
      if (!Array.isArray(parameters)) {
        continue;
      }
      for (const parameter of parameters as Record<string, unknown>[]) {
        if (
          parameter?.in !== 'header' ||
          String(parameter.name).toLowerCase() !== 'accept-language'
        ) {
          continue;
        }
        parameter.required = false;
        parameter.description =
          'Language of translated names, such as categories: the first listed of `en`, `fr`, `nl`, `de`. English without it, and for a name not translated.';
        parameter.schema = { type: 'string', example: 'fr' };
        described++;
      }
    }
  }

  return described;
}
