/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';
import * as express from 'express';
import helmet from 'helmet';
import { RequestMethod, ValidationPipe, VersioningType } from '@nestjs/common';
import * as dotenv from 'dotenv';
import { apiReference } from '@scalar/nestjs-api-reference';
import { scalarConfig } from './scalar.config';

dotenv.config();

import { FluentLoggerService } from './common/fluent-logger.service';
import { TraceIdInterceptor } from './common/traceid.interceptor';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { ApiDocumentationService } from './common/api-documentation.service';
import { RequestLoggingInterceptor } from './common/request-logging.interceptor';
import { collectOAuth2Scopes } from './common/openapi-scopes';
import { describeLanguageHeader } from './common/openapi-language';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    cors: {
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'x-trace-id',
        'x-correlation-id',
        'x-session-id',
        'x-handoff-token',
      ],
      // Defaults to '*': the API is public and does not use cookies, so a
      // browser on another origin can read only what a guest could read anyway.
      // Set CORS_ORIGINS (comma-separated) to restrict it.
      origin: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
        : '*',
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    },
  });
  // Apache terminates TLS and proxies to this service, so without this every
  // request carries the proxy's address and rate limiting would bucket all
  // users together. Trust exactly one hop.
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api', {
    // Exclude OIDC discovery endpoints so they are served at the root
    // (/.well-known/...) rather than under /api/
    exclude: [
      { path: '.well-known/openid-configuration', method: RequestMethod.GET },
      { path: '.well-known/jwks.json', method: RequestMethod.GET },
    ],
  });

  // Security headers. contentSecurityPolicy is disabled for the API itself —
  // the gateway serves JSON plus the Swagger/Scalar UIs, which need inline
  // scripts; the CSP that matters for the app is nginx's, in front of the SPA.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: false,
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // Serve locally uploaded files when STORAGE_PROVIDER=local.
  // These files are attacker-supplied and served from the site's own origin, so
  // they are pinned to their stored Content-Type, never sniffed, never framed,
  // and never treated as active content.
  const uploadDir = process.env.LOCAL_STORAGE_PATH ?? '/app/uploads';
  fs.mkdirSync(uploadDir, { recursive: true });
  app.use(
    '/api/uploads',
    express.static(uploadDir, {
      index: false,
      dotfiles: 'deny',
      setHeaders: (res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Content-Security-Policy', "default-src 'none'");
        res.setHeader('X-Frame-Options', 'DENY');
        // These images are meant to be displayed by the frontend, which runs
        // on a different origin (nginx :3010 / care2repair.eu vs the gateway
        // behind /api). Helmet's default same-origin CORP would otherwise
        // make browsers refuse to render them as <img> there.
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    }),
  );

  // Increase body size limit for bulk CSV imports (default 100KB is too small)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Enable native NestJS versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  const fluentLoggerService = app.get(FluentLoggerService);
  app.useLogger(fluentLoggerService);

  app.useGlobalInterceptors(
    app.get(TraceIdInterceptor),
    new RequestLoggingInterceptor(fluentLoggerService),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const configService = app.get(ConfigService);
  const apiDocumentationService = app.get(ApiDocumentationService);

  console.log('🚀 API Gateway init');

  // log host and port
  console.log(
    `User Management Host: ${process.env.USER_MANAGEMENT_HOST || configService.get('USER_SERVICE_HOST')}, Port: ${process.env.USER_MANAGEMENT_PORT || configService.get<number>('USER_SERVICE_PORT')}`,
  );

  // Connexion aux microservices
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      port: 3000,
      retryDelay: 5000,
      retryAttempts: 5,
    },
  });

  // Load the long API description from an external markdown file so the
  // documentation text is easier to edit and re-use in docs.
  let apiDescription = '';
  try {
    const descPath = path.join(process.cwd(), 'docs', 'description.md');
    apiDescription = fs.readFileSync(descPath, 'utf8');
    console.log(`Loaded API description from ${descPath}`);
  } catch (e) {
    console.warn(
      'Failed to load external API description, falling back to inline text:',
      e?.message || e,
    );
    apiDescription =
      'This is the API Gateway for the E6 Service Hub, a modular digital ecosystem designed to extend the lifespan of Electrical and Electronic Equipment (EEE) through low-threshold support for citizens and infrastructure for RRR (Reuse, Refurbishment, and Repair) practices.';
  }

  const config = new DocumentBuilder()
    .setTitle('E6 Service Hub API Gateway')
    .setDescription(apiDescription)
    .setVersion('1.0')
    .setLicense('AGPL-3.0-only', 'https://www.gnu.org/licenses/agpl-3.0.html')
    .addTag('Auth', 'Authentication and authorization related endpoints')
    .addTag('Users', 'User management related endpoints')
    .addTag('Permissions', 'Permission management related endpoints')
    .addTag('Roles', 'Role management related endpoints')
    .addTag('Devices', 'Device management endpoints')
    .addTag('Ownership', 'Device ownership management related endpoints')
    .addTag('Repairers', 'Repairer management related endpoints')
    .addTag(
      'Issue Tag',
      'Device issue origin classification powered by a fine-tuned RoBERTa model',
    )
    .addBearerAuth()
    .addOAuth2({
      type: 'oauth2',
      flows: {
        clientCredentials: {
          tokenUrl: 'https://care2repair.eu/api/v1/auth/oauth2/token',
          scopes: [],
        },
      },
    })
    .build();
  const document = SwaggerModule.createDocument(app, config);

  // The OAuth2 scheme is declared with an empty scope list because the scopes
  // are only knowable once every @Permissions decorator has been collected into
  // the document. Harvest them back so Scalar can list and request them.
  collectOAuth2Scopes(document);
  describeLanguageHeader(document);

  // Setup versioned Swagger documentation
  SwaggerModule.setup('api/v:version/swagger', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    patchDocumentOnRequest: (req, res, document) => {
      const version = (req as any).params.version;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      if (!version || !/^v\d+$/.test(version)) {
        return document;
      }

      // Deep copy the document to avoid modifying the original

      const copyDocument = JSON.parse(JSON.stringify(document));

      // Filter paths to only include routes for the requested version.
      // Routes may be registered with a global prefix (e.g. '/api') so
      // we accept either '/v1' or '/api/v1' (or other prefixes) when
      // deciding which paths to keep.
      const versionPattern = new RegExp(`/${version}(?:/|$)`);
      for (const route in copyDocument.paths) {
        if (!versionPattern.test(route)) {
          delete copyDocument.paths[route];
        }
      }

      return copyDocument;
    },
  });

  console.log(
    'Swagger UI is configured at /api/:version/swagger (e.g., /api/v1/swagger, /api/v2/swagger)',
  );

  // Expose OpenAPI JSON at /api/api-json for Scalar
  app.use('/api/api-json', (req, res) => {
    // Create a copy of the document to avoid modifying the original
    const documentCopy = JSON.parse(JSON.stringify(document));

    // Add tools documentation to the description
    if (documentCopy.info && documentCopy.info.description) {
      documentCopy.info.description +=
        '\n\n' + apiDocumentationService.generateToolsDocumentation();
    }

    res.json(documentCopy);
  });

  // Serve Scalar API Reference at /api/scalar
  app.use('/api/scalar', apiReference(scalarConfig));
  console.log('Scalar API Reference is configured at /api/scalar');

  // Enable global validation pipe to validate incoming DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  console.log('🚀 API Gateway connected to User Management');
  await app.startAllMicroservices();

  console.log('🚀 API Gateway startAllMicroservices');
  await app.listen(3000, '0.0.0.0');
  console.log(`✅ API Gateway running on port 3000`);
}
bootstrap();
