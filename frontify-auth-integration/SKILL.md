---
name: frontify-auth-integration
description: >
  Authenticate external Frontify integrations against
  `https://<domain>/api/oauth/*` with the `Authorization: Bearer` header.
  ALWAYS apply this skill when calling Frontify GraphQL from a backend,
  script, or CLI (Node, Python, Go, GitHub Action, Lambda, Cloud Run);
  setting up a Service App, OAuth 2 client, or personal developer token;
  or debugging 401 / 403 / HTTP 429 from a non-extension caller — even
  if the user does not name OAuth, scopes, or bearer tokens explicitly.
  Do not call `/graphql` from a backend without first acquiring a token
  through one of the OAuth flows. Skip this skill for in-platform
  extension authentication, GraphQL schema questions, or media
  transformation.
compatibility: Designed for Claude Code and similar agentic development tools.
metadata:
  author: Frontify
  version: "1.0"
---

# Frontify Auth — External Integrations

Frontify exposes its Public GraphQL API at `POST https://<your-domain>/graphql`.
Every request **must** carry an access token in the `Authorization: Bearer
{token}` header. All tokens are issued in the name of a **specific user** and
inherit that user's permissions — there is no anonymous or "app" identity.

For integrations that run **outside** the Frontify Platform, three
authentication modes are available:

| Mode | Use for | How a token is obtained |
|------|---------|-------------------------|
| **Service App** *(recommended for production M2M)* | Machine-to-machine, non-OAuth integrations, backends, CI jobs | OAuth 2.0 **client credentials** grant against `/api/oauth/accesstoken` |
| **OAuth 2.0 Client** | Public/third-party apps acting **on behalf of a user** | Authorization-code flow with **PKCE** (mandatory for public clients) |
| **Personal developer token** | Local dev, testing, CI, **setting up Service Apps** | Direct-URL only at `https://<domain>/oauth-access-token`. The page is **not linked from any UI menu** — older Frontify docs reference a profile-icon / Applications path that no longer exists. |

Personal developer tokens are **not recommended for production**.

In-platform extensions (Apps, Blocks, Themes) **do not** use any of these
flows directly — they get a session through AppBridge and call GraphQL via
`executeGraphql`. If the user's project is an in-platform extension, stop and
load the matching `frontify-auth-{app,block,theme}` skill instead.

---

## Quick reference

### 1 — Endpoint and header

```http
POST https://<your-domain>/graphql
Authorization: Bearer {access_token}
Content-Type: application/json
```

`<your-domain>` is the customer's Frontify domain (e.g. `acme.frontify.com`).
A given OAuth 2 Client or personal token is **only valid for the account
where it was created**. Multi-account integrations require contacting
`developer@frontify.com`.

### 2 — Service App (client credentials, recommended for backends)

**One-time setup** (requires a user session — usually a service user with a
personal developer token):

```graphql
# Beta header required: x-frontify-beta: enabled
mutation CreateServiceApp {
  createServiceApp(
    input: { title: "My Integration", scopes: [BASIC_READ, BASIC_WRITE] }
  ) {
    message
    secret
    serviceApp { id scopes status title }
  }
}
```

Save the `clientId` (the `id` field, e.g. `client-r33fxhupva4q93bx`) and
`secret` immediately — **the secret is shown only once**. The Service App
runs in the permission context of the user who created it.

**Runtime — exchange for an access token:**

```bash
curl -X POST \
  -F grant_type=client_credentials \
  -F client_id={clientId} \
  -F client_secret={secret} \
  -F scopes=basic:read \
  https://{domain}/api/oauth/accesstoken
```

```json
{
  "token_type": "Bearer",
  "expires_in": 2592000,
  "access_token": "yourbearertoken",
  "refresh_token": null,
  "name": null
}
```

Service-app tokens last 30 days and have **no refresh token** — when one
expires, request a new one with the same client credentials. The `scopes`
field in the request must be a subset of the scopes configured on the
Service App.

Full step-by-step in `references/oauth-client-credentials.md`.

### 3 — OAuth 2.0 Client (user-delegated, public apps)

**One-time setup** — Frontify Account Admin creates the client at the
Applications settings page. Configure: Redirect URL, scopes, and toggle
*Confidential* (off for SPAs/public clients — those must use PKCE).

**Runtime — authorize → exchange code → call API.**

| Endpoint | Method | URL |
|----------|--------|-----|
| Authorize | `GET` | `https://<domain>/api/oauth/authorize` |
| Access Token | `POST` | `https://<domain>/api/oauth/accesstoken` |
| Refresh | `POST` | `https://<domain>/api/oauth/refresh` |
| Revoke | `POST` | `https://<domain>/api/oauth/revoke` |

Authorize URL (private/confidential client):

```
https://<domain>/api/oauth/authorize
  ?response_type=code
  &client_id={ID}
  &redirect_uri={URI}
  &scope=basic:read%20basic:write
  &state={CSRF_TOKEN}
```

Authorize URL (public client with PKCE — **mandatory** for SPAs):

```
https://<domain>/api/oauth/authorize
  ?response_type=code
  &client_id={ID}
  &redirect_uri={URI}
  &scope={scope}
  &state={CSRF_TOKEN}
  &code_challenge={SHA-256(code_verifier)}
  &code_challenge_method=S256
```

Verify the returned `state` parameter to prevent CSRF. PKCE `code_verifier`
must be 43–128 characters of cryptographically secure random data.

Token exchange:

```bash
curl -X POST \
  -F code=Avv45866yyssf \
  -F grant_type=authorization_code \
  -F client_id={clientID} \
  -F redirect_uri=https://www.domain.com/redirect \
  -F scope=basic:read \
  https://{domain}/api/oauth/accesstoken
# Add: -F client_secret={secret}      (confidential clients only)
# Add: -F code_verifier={verifier}    (PKCE clients only)
```

Response:

```json
{
  "token_type": "Bearer",
  "expires_in": 2591998,
  "access_token": "ey5811sfghAffastta",
  "refresh_token": "ey5811sfghA895Xtta"
}
```

Access-token lifetime is **configured per Frontify instance** (typically one
week to three months). Use the refresh token to renew without
re-authenticating; **a refresh token can be used only once** and the previous
access token is invalidated when refresh succeeds.

Full flow with all parameters in `references/oauth-authorization-code.md`.

### 4 — Personal developer / service-user token (testing, CI, setup)

Generate at `https://<your-domain>/oauth-access-token`. **Navigate to this
URL directly** — the page is **not linked from any UI menu** (older docs
reference a profile-icon menu; that path is gone). Use cases:

- Local development and testing
- One-shot scripts and CI jobs (GitHub Actions, etc.)
- **Bootstrapping** a Service App (the `createServiceApp` mutation needs a
  user session)

Procedure:

1. Click **+ Create token**, give it a meaningful name + description
2. Select scopes (cannot be changed later)
3. Choose expiration: 7 days, 30 days, 90 days, 6 months, or 1 year
4. Click **Create** — the token is shown **once**

> **Tokens issued before January 2026 have a 10-year expiry.** New tokens
> are capped at 1 year — plan rotation before expiry.

For long-lived integrations, create a **dedicated service user** (see
`references/personal-tokens.md`) rather than tying the token to a real human.

Use the token directly in the bearer header:

```bash
curl -H "Authorization: Bearer cmFCUDPv...mru4" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ currentUser { id email } }"}' \
  https://<domain>/graphql
```

### 5 — Refresh and revoke

**Refresh** (OAuth 2 client only — service-app tokens do not refresh):

```bash
curl -X POST \
  -F grant_type=refresh_token \
  -F refresh_token={refresh_token} \
  -F client_id={clientId} \
  -F scope=basic:read \
  https://<domain>/api/oauth/refresh
# Add: -F client_secret={secret}   (confidential clients only)
```

A successful refresh **invalidates the previous access token** and returns a
new access + refresh pair. Refresh tokens are single-use.

**Revoke** (any OAuth 2 token):

```bash
curl -X POST \
  -F token=ey5811sfghA895Xtta \
  -F token_type_hint=access_token \
  https://<domain>/api/oauth/revoke
```

`token_type_hint` is `access_token` or `refresh_token`. If `NULL`, Frontify
infers the type. HTTP 200 means revoked.

### 6 — Scopes (reference)

Five scopes are usable today. Three legacy scopes (`finder:read`,
`blocks:read`, `blocks:write`) are not used in this context and can be
ignored.

| Scope | Description |
|-------|-------------|
| `basic:read` | Basic read access to all brands, projects, and assets |
| `basic:write` | Basic write access to all brands, projects, and assets |
| `account:read` | Read account data, including users (admin required for other users' data) |
| `webhook:read` | Read access to webhooks |
| `webhook:write` | Write access to webhooks (install/uninstall). Also requires Editor rights on the location and `basic:write` |

Verify the scopes a token actually carries via the `x-oauth-scopes` response
header (comma-separated):

```
x-oauth-scopes: basic:read, basic:write
```

Always request the **minimum** set of scopes your integration needs.

Full table with behaviour notes in `references/scopes.md`.

### 7 — Scopes vs. user permissions (very important)

Scopes describe what an integration is **potentially allowed** to do. They do
**not** answer whether the **specific user** the token is issued for is
actually allowed to perform a specific action on a specific entity.

Every major GraphQL entity exposes `currentUserPermissions` — a struct of
`can*` booleans (e.g. `canEdit`, `canDelete`, `canDownload`, `canComment`).
**Always check entity-level permissions before performing a write**, even if
your token has `basic:write`. A user with `Viewer` role on a library cannot
delete an asset regardless of token scopes.

Detailed model in `references/user-permissions.md`.

### 8 — Errors

| HTTP | Meaning | Recover by |
|------|---------|------------|
| **401 Unauthorized** | Missing/expired/revoked token | Re-authenticate or refresh |
| **403 Forbidden** | Token valid but lacks scope **or** the underlying user lacks permission on the resource | Check `x-oauth-scopes` and the entity's `currentUserPermissions` |
| **422 Unprocessable Entity** | GraphQL error (bad query, schema mismatch). **Limit retries** — repeated 422s flag as suspicious activity | Fix the query; use strong typing |
| **429 Too Many Requests** | Rate limit exceeded — **2500 requests / 5-minute rolling window** | **Stop and back off**; continued requests extend the block |

Frontify is migrating to a leaky-bucket rate limiter — error codes may change.
Full troubleshooting in `references/errors.md`.

---

## Where to develop

For most teams, **production with a dedicated test library** is the
recommended environment — Frontify's permission system is granular enough to
isolate work. A formal **Developer Sandbox** is available on request for
specific use cases. See `references/sandbox.md`.

---

## Reference index

Load these files on demand as the work narrows:

| File | When to read |
|------|--------------|
| `references/overview.md` | Need the full auth/identity/scopes/permissions model in one place |
| `references/oauth-client-credentials.md` | Building a Service App / backend integration |
| `references/oauth-authorization-code.md` | Building a public/third-party app with user login |
| `references/personal-tokens.md` | Generating a dev token, setting up a service user, CI pipelines |
| `references/scopes.md` | Choosing/auditing scopes; understanding scope behaviour |
| `references/user-permissions.md` | Checking what the *user* (not the token) can actually do |
| `references/errors.md` | 401 / 403 / 422 / 429 troubleshooting |
| `references/sandbox.md` | Setting up a safe development environment |

For data work after auth is solved, load `../frontify-graphql/SKILL.md`.
