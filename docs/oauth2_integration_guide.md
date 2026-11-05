# Care2Repair OIDC Integration Guide

This guide describes how to integrate an external application with the Care2Repair Service Hub Identity Provider (IdP) using the **OpenID Connect (OIDC) Authorization Code Flow with PKCE**.

All tokens are signed with **RS256** (asymmetric RSA-2048). The platform exposes a standard OIDC discovery document so compliant libraries can auto-configure themselves.

## 1. Prerequisites

Before you begin, you must register your application with the Care2Repair platform to obtain credentials.

**Required Credentials:**
*   **Client ID**: A unique identifier for your application (e.g., `my-app`).
*   **Client Secret**: A secret key used to authenticate your application (keep this secure!).
*   **Redirect URI**: The URL where users will be redirected after logging in (e.g., `https://your-app.com/callback`).

> **Note:** Currently, client registration is handled manually by the platform administrators. Please contact the team to register your application.

## 2. OIDC Discovery

The platform publishes a standard OpenID Connect discovery document. OIDC-compliant libraries can use this endpoint to auto-configure all necessary URLs, signing algorithms, and supported scopes.

**Discovery Document:** `GET /.well-known/openid-configuration`

**JWKS (public keys for token verification):** `GET /.well-known/jwks.json`

```bash
curl https://care2repair.eu/.well-known/openid-configuration
```

```json
{
  "issuer": "https://care2repair.eu",
  "authorization_endpoint": "https://care2repair.eu/api/v1/auth/oauth2/authorize",
  "token_endpoint": "https://care2repair.eu/api/v1/auth/oauth2/token",
  "userinfo_endpoint": "https://care2repair.eu/api/v1/auth/oauth2/userinfo",
  "jwks_uri": "https://care2repair.eu/.well-known/jwks.json",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "profile", "email"],
  "response_modes_supported": ["query"],
  "token_endpoint_auth_methods_supported": ["client_secret_post", "client_secret_basic"],
  "claims_supported": ["sub", "iss", "aud", "iat", "exp", "jti", "email", "email_verified", "name", "given_name", "family_name", "role", "nonce"],
  "code_challenge_methods_supported": ["S256"]
}
```

## 3. Authorization Flow

The integration follows [OpenID Connect Core 1.0](https://openid.net/specs/openid-connect-core-1_0.html) with [PKCE (RFC 7636)](https://tools.ietf.org/html/rfc7636).

### PKCE

PKCE support depends on the client type:

- **Public clients** (SPAs, mobile apps — no `client_secret`): PKCE is **required**.
- **Confidential clients** (server-side apps authenticating with a `client_secret`): PKCE is **optional**. The `client_secret` already secures the code exchange; `code_challenge` and `code_verifier` may be omitted.

When using PKCE, generate a `code_verifier` and derive a `code_challenge` from it before initiating the flow:

```javascript
// Generate a cryptographically random code_verifier (43–128 characters)
const codeVerifier = base64url(crypto.randomBytes(32));

// Derive the code_challenge: BASE64URL(SHA256(ASCII(code_verifier)))
const codeChallenge = base64url(crypto.createHash('sha256').update(codeVerifier).digest());
```

Only the `S256` method is supported. Store `code_verifier` securely (e.g., in the session) — you will need it in Step 3 if PKCE was used.

---

### Step 1: Redirect User to Authorization Endpoint

Initiate the login flow by redirecting the user's browser to the Service Hub authorization endpoint.

**Endpoint:** `GET /api/v1/auth/oauth2/authorize`

**Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `client_id` | Yes | Your application's Client ID. |
| `redirect_uri` | Yes | Must match the URI registered for your client. |
| `response_type` | Yes | Must be `code`. |
| `code_challenge` | Conditional | Required for public clients. Optional for confidential clients. BASE64URL(SHA256(code_verifier)). |
| `code_challenge_method` | Conditional | Required when `code_challenge` is provided. Must be `S256`. |
| `scope` | No | Space-separated scopes (e.g., `openid profile email`). Include `openid` to receive an `id_token`. |
| `state` | Recommended | An opaque string to maintain state and prevent CSRF attacks. |
| `nonce` | Recommended | A random value bound to the session, included in the `id_token` to prevent replay attacks. |

**Example URL:**
```http
https://care2repair.eu/api/v1/auth/oauth2/authorize
  ?client_id=your-client-id
  &redirect_uri=https://your-app.com/callback
  &response_type=code
  &scope=openid%20profile%20email
  &code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
  &code_challenge_method=S256
  &state=xyz123
  &nonce=n-0S6_WzA2Mj
```

### Step 2: Handle the Callback

After the user successfully authenticates, they will be redirected back to your `redirect_uri` with an authorization code.

**Callback URL Example:**
```http
https://your-app.com/callback?code=AuthCode123XYZ&state=xyz123
```

*   **code**: The temporary authorization code (valid for 10 minutes, single-use).
*   **state**: The state value you provided in Step 1 — verify this matches before continuing.

### Step 3: Exchange Code for Tokens

Your backend server must exchange the authorization code for tokens by making a POST request to the Service Hub. The `code_verifier` from Step 1 is required.

**Endpoint:** `POST /api/v1/auth/oauth2/token`

**Headers:**
*   `Content-Type: application/json`

**Body (JSON):**

| Field | Required | Description |
|-------|----------|-------------|
| `grant_type` | Yes | Must be `authorization_code`. |
| `code` | Yes | The code received in Step 2. |
| `redirect_uri` | Yes | Must match the URI used in Step 1. |
| `client_id` | Yes | Your Client ID. |
| `client_secret` | Yes | Your Client Secret. |
| `code_verifier` | Conditional | Required only if `code_challenge` was sent in Step 1. |

**Example Request:**
```bash
curl -X POST https://care2repair.eu/api/v1/auth/oauth2/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "authorization_code",
    "code": "AuthCode123XYZ",
    "redirect_uri": "https://your-app.com/callback",
    "client_id": "your-client-id",
    "client_secret": "your-client-secret",
    "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
  }'
```

**Authentication Note:** You can also pass `client_id` and `client_secret` via the HTTP Basic Authorization header (base64-encoded `client_id:client_secret`).

**Success Response (JSON):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImVkMGIxYjI2LWQ5MTgtNDUwMS1iNDViLTY3ZWU0MjI5MTA4MCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email",
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImVkMGIxYjI2LWQ5MTgtNDUwMS1iNDViLTY3ZWU0MjI5MTA4MCJ9...",
  "refresh_token": "550e8400-e29b-41d4-a716-446655440000"
}
```

Both `access_token` and `id_token` are **RS256-signed JWTs**. Verify them using the public keys from `/.well-known/jwks.json`.

#### id_token Claims

| Claim | Type | Description |
|-------|------|-------------|
| `jti` | string | Unique token identifier (JWT ID) |
| `iss` | string | Issuer — `https://care2repair.eu` |
| `sub` | string | Subject — the user's internal ID |
| `aud` | string | Audience — your `client_id` |
| `iat` | number | Issued at (Unix timestamp) |
| `exp` | number | Expiration (Unix timestamp) |
| `email` | string | User's email address |
| `email_verified` | boolean | Whether the email has been verified |
| `name` | string | Full name (if profile scope granted) |
| `given_name` | string | First name (if profile scope granted) |
| `family_name` | string | Last name (if profile scope granted) |
| `role` | string | User's role within the platform |
| `nonce` | string | Echoed nonce from the authorization request (if provided) |

### Step 4: Retrieve User Information

Use the access token to retrieve the user's current profile information from the UserInfo endpoint.

**Endpoint:** `GET /api/v1/auth/oauth2/userinfo`

**Headers:**
*   `Authorization: Bearer <access_token>`

**Example Request:**
```bash
curl https://care2repair.eu/api/v1/auth/oauth2/userinfo \
  -H "Authorization: Bearer eyJhbGciOiJSUz..."
```

**Success Response (JSON):**
```json
{
  "sub": "123",
  "email": "user@example.com",
  "email_verified": false,
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "role": "user"
}
```

### Step 5: Refresh the Access Token

The `refresh_token` received in Step 3 can be used to obtain a new `access_token` without requiring the user to log in again. Refresh tokens are **single-use** and automatically rotated on each use.

**Endpoint:** `POST /api/v1/auth/oauth2/token`

**Body (JSON):**

| Field | Required | Description |
|-------|----------|-------------|
| `grant_type` | Yes | Must be `refresh_token`. |
| `refresh_token` | Yes | The refresh token from the previous token response. |
| `client_id` | Yes | Your Client ID. |
| `client_secret` | Yes | Your Client Secret. |

**Example Request:**
```bash
curl -X POST https://care2repair.eu/api/v1/auth/oauth2/token \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "refresh_token",
    "refresh_token": "550e8400-e29b-41d4-a716-446655440000",
    "client_id": "your-client-id",
    "client_secret": "your-client-secret"
  }'
```

**Success Response (JSON):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiI...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "openid profile email",
  "id_token": "eyJhbGciOiJSUzI1NiI...",
  "refresh_token": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

> Refresh tokens are valid for **30 days**. Store them securely and discard the old token immediately after receiving the new one.

## 4. Token Verification

All tokens are RS256-signed. Verify them using the JWKS endpoint:

```bash
curl https://care2repair.eu/.well-known/jwks.json
```

```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "ed0b1b26-d918-4501-b45b-67ee42291080",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

Most JWT libraries support JWKS natively. Example with `jsonwebtoken` (Node.js):

```javascript
import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';

const client = jwksClient({ jwksUri: 'https://care2repair.eu/.well-known/jwks.json' });

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    callback(err, key?.getPublicKey());
  });
}

jwt.verify(token, getKey, { algorithms: ['RS256'], issuer: 'https://care2repair.eu' }, (err, decoded) => {
  // decoded contains the verified claims
});
```

## 5. Scope Support

| Scope | Description |
|-------|-------------|
| `openid` | Required for OIDC flows — triggers `id_token` issuance and provides `sub` claim. |
| `profile` | Grants access to `name`, `given_name`, `family_name` claims. |
| `email` | Grants access to `email` and `email_verified` claims. |
| `read` | Read access to platform resources (machine-to-machine). |
| `write` | Write access to platform resources (machine-to-machine). |

## 6. Error Handling

If an error occurs during the authorization request (Step 1), the user may be redirected back with an `error` parameter:

```http
https://your-app.com/callback?error=invalid_request&error_description=Missing+code_challenge&state=xyz123
```

Common error codes:
*   `invalid_request`: Missing or invalid parameter.
*   `invalid_grant`: Invalid, expired, or already-used authorization code; PKCE verification failure.
*   `invalid_client`: Invalid `client_id` or `client_secret` (HTTP 401).
*   `unsupported_grant_type`: The requested `grant_type` is not supported.
*   `unauthorized_client`: Client not authorized for this flow.
*   `access_denied`: User denied the request.
*   `server_error`: Internal server error.
