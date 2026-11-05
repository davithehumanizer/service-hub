# Service Hub - AI Agent Instructions

## Project Overview

This is the repository for **care2repair.eu**, a web application designed to connect users with device repair services. The application is built using a microservices architecture, with a React frontend and a backend powered by NestJS.

### Key Technologies

- **Frontend:** React, Redux, Tailwind CSS, Leaflet
- **Backend:** NestJS, TypeORM, PostgreSQL
- **Authentication:** JWT (email/password) and OAuth2 (client credentials)
- **Deployment:** Docker, Docker Compose
- **CI/CD:** GitHub Actions
- **Logging:** EFK Stack (Elasticsearch, Fluentd, Kibana)

---

## Architecture Overview

**Microservices Architecture**: API Gateway (NestJS) orchestrates 13+ backend services via message-based communication. Each service runs independently with dedicated ports.

> **Note on non-NestJS services:** `fast-plan-eco-service` is JavaScript/Express. `device-identification` and `device-issue-tag` are Python services.

### Services

| Service | Port | Description |
|---------|------|-------------|
| `service-hub-front` | 3010 | React frontend application (nginx) |
| `api-gateway` | 3000 | Single entry point, routing and authentication |
| `user-management` | 3001 | User CRUD, profiles, authentication |
| `repairers-service` | 3002 | Repairer management and geolocation |
| `devices-service` | 3003 | Device catalog and technical specifications |
| `notifications-service` | 3004 | Email/SMS notifications |
| `ownership-service` | 3005 | Device-user relationships |
| `oauth-service` | 3006 | JWT tokens, OAuth2 flows |
| `fast-plan-eco-service` | 3007 | Route planning, geocoding, GPX export (JS/Express) |
| `external-adapters-service` | 3008 | iFixit, Fixometer integrations |
| `surveys-service` | 3009 | Survey and questionnaire management |
| `api-catalog-service` | 3011 | Community API tools catalog |
| `spare-parts-service` | 3012 | Spare parts catalog |
| `device-identification` | 8000 | ML-based device identification (Python) |
| `device-issue-tag` | 8001 | RoBERTa issue classification (Python, external image) |

### Infrastructure Services

- `db`: PostgreSQL database
- `fluentd`: Logging agent forwarding to Elasticsearch
- `kibana`: Web interface for log visualization (http://localhost:5601)
- `elasticsearch`: Centralized log storage (also queried by api-gateway, devices-service, repairers-service)

---

## Frontend Features

### Customer Journey

1. **Device Registration:** Users register devices specifying type, manufacturer, and model
2. **Find a Repairer:** Search for repairers using the interactive RepairMap
3. **Consult Tutorials:** Access iFixit tutorials for DIY repairs
4. **Calculate Environmental Impact:** Use the Fixometer Calculator
5. **Request a Repair:** Select a repairer and send repair requests
6. **Track Repair Status:** Monitor repair progress and communicate with repairers

### Key Components

- **RepairMap**: Interactive Leaflet map displaying repairer locations with filtering by device type
- **iFixit Tutorials**: Integration with iFixit API for repair guides
- **Fixometer Calculator**: Environmental impact estimation tool (repair vs. replace)
- **API Catalog**: Community-submitted API tools browser and submission form
- **Spare Parts Catalog**: Spare parts search and detail pages
- **Surveys**: Contextual survey system with trigger-based display
- **Omnisearch**: Global search bar across devices, repairers, and tools
- **Device Identification**: ML-assisted device identification via `device-identification` service
- **Issue Tagging**: RoBERTa-powered repair issue classification via `device-issue-tag` service

---

## Communication Patterns

### Inter-Service Communication

Uses NestJS ClientProxy with message patterns:

```typescript
// In controllers (API Gateway)
const result = await firstValueFrom(
  this.userService.send({ cmd: 'find_user' }, { userId })
);

// In services (message handlers)
@MessagePattern({ cmd: 'find_user' })
async findUser(@Payload() data: { userId: string }) {
  // handler logic
}
```

### Service Discovery

Environment variables define service hosts/ports in `docker-compose.yml`.

---

## DTO Conventions

### Static Name Property

All DTOs include `static name` for Swagger schema naming with hierarchical prefixes:

```typescript
export class LoginDto {
  static name = 'Auth.Login'; // Used by Swagger for schema names

  @ApiProperty()
  @IsEmail()
  email: string;
}
```

### Hierarchical Naming Convention

| Prefix | Domain |
|--------|--------|
| `Auth.*` | Authentication and authorization |
| `User.*` | User management |
| `Device.*` | Device and category management |
| `Repairer.*` | Repairer management |
| `Ownership.*` | Device ownership |
| `External.*` | External API integrations |
| `FastPlanEco.*` | Route planning and geocoding |
| `Survey.*` | Survey and questionnaire management |
| `ApiCatalog.*` | Community API tools catalog |
| `SpareParts.*` | Spare parts catalog |

### Response DTOs

Located in `dto/response/` subdirectories with matching hierarchical names:
- `Auth.LoginResponse`
- `User.ProfileResponse`
- `Device.ListResponse`
- `Ownership.AssignDeviceResponse`
- `External.AdapterResponse`
- `FastPlanEco.Route.CalculateResponse`
- `Survey.ListResponse`
- `ApiCatalog.ToolResponse`
- `SpareParts.ListResponse`

---

## Development Workflow

### Building and Running

The application is fully containerized using Docker:

```bash
# Start all services
docker compose up -d

# Build and start
docker compose up --build

# Build and start in detached mode
docker compose up --build -d
```

### Individual Service Development

**Frontend:**
```bash
cd frontend
npm install
npm start
```

**Backend (e.g., api-gateway):**
```bash
cd backend/api-gateway
npm install
npm run start:dev  # Hot reload enabled
```

### Build & Deploy

```bash
npm run build      # TypeScript compilation
npm run lint       # ESLint with auto-fix
npm run format     # Prettier formatting
```

---

## Testing

### Running Tests

Each service has its own set of unit and end-to-end tests:

```bash
npm test                    # All tests
npm run test:watch         # Watch mode
npm run test -- --testPathPattern=auth  # Specific module
```

### Controller Testing Pattern

Mock ClientProxy for microservice calls:

```typescript
const mockClientProxy = {
  send: jest.fn().mockReturnValue(of(mockResponse))
};

beforeEach(async () => {
  const module = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [
      { provide: 'USER_SERVICE', useValue: mockClientProxy }
    ]
  }).compile();
});
```

### Error Testing

Use `throwError()` from RxJS to simulate service failures.

---

## Key Files & Directories

| Path | Description |
|------|-------------|
| `src/main.ts` | App bootstrap, Swagger setup, microservice connections |
| `src/app.module.ts` | Global module imports, service registrations |
| `src/common/` | Shared utilities (logging, interceptors, filters) |
| `docker-compose.yml` | Service orchestration and networking |
| `backend/*/src/dto/` | Service-specific DTOs (request/response) |

---

## API Documentation

### Access Points

- **Scalar UI:** http://localhost:3000/api/scalar
- **Swagger UI:** http://localhost:3000/api/swagger
- **OpenAPI JSON:** http://localhost:3000/api/api-json

### API Versioning

URI-based versioning is enabled (default: `v1`). Endpoints are accessible at `/api/v1/...`. OIDC `.well-known` endpoints are excluded from the `/api` prefix.

### Schema Naming

DTO `static name` properties control OpenAPI schema names for better documentation.

---

## Common Patterns

| Pattern | Description |
|---------|-------------|
| **Health Checks** | All services include `/api/health` endpoints with Docker health checks |
| **Logging** | Pino logger with Fluentd integration for centralized logging |
| **Validation** | Class-validator decorators on all DTOs with automatic transformation |
| **Error Handling** | Global exception filters with consistent error responses |

### Authentication & Authorization

All protected endpoints in the API Gateway use a two-guard stack:

```typescript
@UseGuards(FlexibleAuthGuard, PermissionsGuard)
@Permissions('device.read')
@Get()
```

- `FlexibleAuthGuard`: supports JWT, OAuth2 client credentials, and social sessions
- `PermissionsGuard`: validates permissions from user roles, OAuth2 scopes, or guest roles
- `@Permissions()` sets the required permission via `Reflector` metadata

Relevant files: `src/auth/flexible-auth.guard.ts`, `src/auth/permission.guard.ts`, `src/auth/permission.decorator.ts`

### Error Handling Pattern

Two-tier approach depending on layer:

**API Gateway** (converts to HTTP responses):
```typescript
try {
  return await firstValueFrom(
    this.service.send({ cmd: 'get_item' }, payload),
  );
} catch (error) {
  this.logger.error('Error: ' + error.message, error.stack);
  throw new HttpException(
    error.message || 'Internal error',
    HttpStatus.INTERNAL_SERVER_ERROR,
  );
}
```

**Microservices** (throw RPC exceptions):
```typescript
throw new RpcException('Resource not found');
```

### Swagger Decorator Convention

All controller endpoints follow this pattern:

```typescript
@ApiTags('Users')
@ApiSecurity('oauth2')
@ApiOperation({ summary: 'Register a new user' })
@ApiBody({ type: RegisterUserDto })
@ApiResponse({ status: 201, type: UserResponseDto })
@ApiResponse({ status: 500, description: 'Internal Server Error.' })
@Post('register')
```

### Pagination Query DTOs

List endpoints use a typed Query DTO with `@Transform` for string-to-number coercion:

```typescript
export class PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(String(value), 10) : undefined))
  @IsNumber() @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(String(value), 10) : undefined))
  @IsNumber() @Min(1) @Max(100)
  limit?: number = 10;
}
```

---

## CI/CD

The project uses GitHub Actions for continuous integration and deployment. The workflow is defined in `.github/workflows/deploy.yml`. Changes pushed to the `main` branch are automatically deployed to the production server.

- Unit tests for all 13 NestJS services run in **parallel** before deployment
- Jest coverage reports are generated per service
- Deployment proceeds only when all test jobs pass

---

## Documentation Style Guidelines

- **Professional Style**: Avoid emojis in documentation
- **Clear Language**: Use clear, technical language without decorative elements
- **Consistent Formatting**: Follow established patterns for code examples and documentation