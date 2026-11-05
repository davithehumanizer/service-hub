# Documentation

## Introduction

This is the API Gateway for the E6 Service Hub, a modular digital ecosystem designed to extend the lifespan of Electrical and Electronic Equipment (EEE) through low-threshold support for citizens and infrastructure for RRR (Reuse, Refurbishment, and Repair) practices.

The E6 Service Hub is part of the INTERREG North-West Europe program, focusing on facilitating a circular economy for EEE by responding to rising waste levels and aligning with EU directives that prioritize reuse, refurbishment, and repair as key actions.

This API Gateway aggregates and exposes endpoints from various microservices, including:

- **User Management**: User CRUD operations, profiles, and authentication
- **Device Management**: Device catalog, technical specifications, and categories
- **Ownership Service**: Device-user relationships and assignments
- **Repairers Service**: Repairer management and geolocation
- **Notifications Service**: Email and SMS notifications
- **OAuth Service**: JWT tokens and OAuth2 flows
- **Fast Plan Eco Service**: Route planning, geocoding, and GPX export
- **External Adapters Service**: Integration with iFixit and Fixometer platforms

## API Versioning

This API supports versioning through URI paths:

- **v1** (current): `/api/v1/*` - Production stable version
- **v2** (future): `/api/v2/*` - Next version with breaking changes

Use the `X-API-Version` header as fallback when URI versioning is not available.


*Note:* Additional API documentation and tools are appended at runtime to this description (Tooling & integrations documentation).

## Authentication

The API Gateway exposes two common authentication methods for accessing protected endpoints:

- **Bearer JWT (user session)** — obtain a JWT token via the login endpoint and send it with the `Authorization: Bearer <token>` header. These tokens are signed with HS256.
- **OAuth2 client credentials** — obtain a machine-to-machine access token using the OAuth2 client credentials flow. Tokens are signed with RS256.
- **OIDC Authorization Code Flow** — allows external applications to authenticate users via "Login with Care2Repair". Tokens are signed with RS256 and a full `id_token` is issued when the `openid` scope is requested. PKCE (S256) is supported and recommended for public clients.

### OIDC Discovery

The platform publishes a standard OpenID Connect discovery document and a JWKS endpoint for public key distribution:

- **Discovery document:** `GET /.well-known/openid-configuration`
- **JWKS (public keys):** `GET /.well-known/jwks.json`

These endpoints are accessible without authentication and are not prefixed with `/api`.

### Interactive docs

- Login (JWT): see the API reference for the login endpoint at: [User login](#tag/auth/POST/api/v1/auth/login)
- OAuth2 token (client credentials): see the API reference for the token endpoint at: [OAuth2 token](#tag/auth/POST/api/v1/auth/oauth2/token)
- OAuth2 Authorize (Identity Provider / OIDC): see the API reference for the authorize endpoint at: [OAuth2 authorize](#tag/auth/GET/api/v1/auth/oauth2/authorize)

### Notes

- Access tokens issued via the Authorization Code Flow are RS256-signed JWTs. Verify them using the public keys from `/.well-known/jwks.json`.
- **PKCE (S256) is recommended** for public clients (SPAs, mobile apps). Confidential clients (server-side applications with a `client_secret`) may omit PKCE — the secret alone secures the flow. If `code_challenge` is provided, `code_challenge_method=S256` is required.
- An `id_token` (RS256) is issued when the `openid` scope is requested. It includes: `sub`, `email`, `email_verified`, `role`, `name`, `given_name`, `family_name`, `nonce`.
- Refresh tokens are issued alongside access tokens for the Authorization Code Flow, are single-use, and rotate automatically on each use. They are valid for 30 days.
- Tokens have a limited lifetime (default 3600s). Use the `refresh_token` grant to renew access tokens without re-authenticating.
- For programmatic access (CI, services) prefer OAuth2 client credentials.
- Access control is enforced by `FlexibleAuthGuard`, `PermissionsGuard`, and decorators like `@Permissions(...)` and `@Roles(...)`. Ensure the token contains the required permissions/roles for the endpoint you call.
