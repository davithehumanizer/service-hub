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

## Loading data from an outside source

A partner that adds its own data to the hub (a data provider, a reuse organisation's system) names itself as its **source**, so that what it brings stays recognisable, credited, and apart from what users enter on the site. Device models and variants, and repairers, are loaded this way.

### 1. Get a client

Ask the platform administrators for an OAuth2 client with the scopes you need:

| To load | Scopes |
|---|---|
| Device models and variants | `device.create device.source.set` |
| Repairers | `repairer.create`, and `repairer.update` to update them |

Agree on your source name with them at the same time. Then obtain a token with the client credentials flow:

```bash
curl -X POST https://care2repair.eu/api/v1/auth/oauth2/token \
  -H 'Content-Type: application/json' \
  -d '{"grant_type": "client_credentials", "client_id": "<id>", "client_secret": "<secret>"}'
```

The token lasts one hour and carries the client's scopes. Requests are limited to 300 per minute from one address: for a large load, contact the platform team first.

### 2. Device models and variants

- **A model**, with its first variant when a barcode or a reference comes with it: [`POST /api/v2/device-models`](#tag/device-models/POST/api/v2/device-models)

```json
{ "brand": "Fairphone", "name": "Fairphone 5", "ean": "8718819372424", "source": "ACME_DATA" }
```

- **Another variant** of a model: [`POST /api/v2/device-models/{id}/variants`](#tag/device-models/POST/api/v2/device-models/{id}/variants), with `ean` or `product_code`, its `technicalProperties`, and the same `source`.

Nothing is duplicated: a barcode, a reference or a model name the catalogue already has answers with the existing model (`200`, `"created": false`) instead of creating one.

Rules:

- `source` is a code: capitals, digits and `_`, starting with a letter, 2 to 32 characters. `MANUAL`, `ICECAT` and `UNKNOWN` are the catalogue's own and are refused (`400`).
- Without the `device.source.set` scope, a request that names a source is refused (`403`) and nothing is created. Without a source, the record counts as entered by hand.
- The source is set at creation and never changed afterwards. Once created, a model or variant from a source is changed by the platform administrators only.
- Records created with client credentials have no user as their author: the source is what identifies them.

### 3. Repairers

[`POST /api/v1/repairers`](#tag/repairers/POST/api/v1/repairers) creates a repairer; [`POST /api/v1/repairers/{id}`](#tag/repairers/POST/api/v1/repairers/{id}) updates one.

```json
{
  "name": "Atelier Vélo Fives",
  "address": "18 rue Pierre Legrand",
  "postal_code": "59000",
  "city": "Lille",
  "country": "FR",
  "latitude": 50.6292,
  "longitude": 3.0573,
  "partner_type": "repairer",
  "source": "ACME Data – repairer directory"
}
```

Rules:

- A repairer's `source` is not a code: it is the **credit shown with it to the public**, as the licence of your data asks. Send the same text for every repairer you load: removing a source's repairers will rest on it.
- `Service Hub` is the hub's own, for repairers proposed on its site, and is refused (`400`).
- Send `name`, `address`, `city`, `country`, `latitude` and `longitude`: the map needs them all.
- A repairer created this way is **published at once**, without the review that proposals made on the site go through.
- Nothing checks for duplicates: the hub already lists tens of thousands of repairers. Search before creating, with [`POST /api/v1/repairers/search`](#tag/repairers/POST/api/v1/repairers/search) or by area.
