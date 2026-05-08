# Auth Errors and Rate Limits — Troubleshooting

Reference table of HTTP/GraphQL failure modes specific to authentication and
authorization. Quick rule of thumb: **401 = token problem, 403 = permission
problem, 422 = query problem, 429 = back off.**

## 401 Unauthorized

The request didn't carry a usable token, or the token is expired/revoked.

**Common causes**

- Missing `Authorization` header
- Wrong format — must be exactly `Authorization: Bearer {token}` (case
  matters in some clients; literal word `Bearer`, single space, then token)
- Token has expired (`expires_in` elapsed)
- Token was revoked (manually, by a successful refresh, or by admin
  de-authorization)
- Token belongs to a different Frontify account than the `<domain>` on the
  request URL — tokens are account-scoped

**Resolution**

| Token type | Recovery |
|------------|----------|
| OAuth 2 user token | `POST /api/oauth/refresh` with the refresh token. If that fails too, restart the authorization-code flow |
| Service App token | `POST /api/oauth/accesstoken` again with `client_credentials` |
| Personal token | Generate a new one in the UI; deploy it; revoke the old |

If 401s appear on a token that should still be valid, double-check the
domain — most often this is a multi-tenant code path pointing at the wrong
customer instance.

## 403 Forbidden

The token is valid, but **either** its scopes don't include what the request
requires **or** the underlying user lacks permission on the resource.

**Diagnosis**

1. Check `x-oauth-scopes` on a successful response. Does it include the
   scope this endpoint needs (`basic:read` for reads, `basic:write` for
   writes, `account:read` for user data, `webhook:*` for webhooks)?
2. If the scope is present, query the entity's `currentUserPermissions`
   for the relevant `can*` boolean. Almost always the user doesn't have
   the action permitted on that specific entity.

**Resolution**

| Cause | Fix |
|-------|-----|
| Missing scope | Re-issue the token with the right scopes (Service App → recreate; OAuth → re-authorize; personal → generate new) |
| User permission | Adjust the user's role or per-entity sharing in Frontify — token is fine |

Refreshing the token does **not** fix a permission 403.

## 422 Unprocessable Entity

A GraphQL-level error (bad query, schema mismatch, invalid input).
**Important: this is rate-controlled.** Repeated 422s flag the integration
as suspicious activity, and may extend any rate-limit blocks.

**Resolution**

- Don't blindly retry. Fix the query first.
- Use a **strongly-typed GraphQL client** (codegen → TypeScript types from
  the schema) so 422s are caught at compile time, not at runtime.
- Validate inputs client-side before sending mutations.

## 429 Too Many Requests

The token's quota of **2500 requests per 5-minute rolling window** has been
exceeded.

**Resolution**

1. **Stop sending requests immediately.** Continued requests at the same
   rate extend the block.
2. **Back off.** Honor any `Retry-After` header if present; otherwise wait
   at least the remainder of the 5-minute window before retrying.
3. **Re-engineer the workload:**
   - Cache results (asset metadata, brand structure, scopes — these don't
     change every second)
   - Throttle / queue requests with a token-bucket or leaky-bucket limiter
     on the integration side
   - Batch reads where the schema allows (one query for many IDs vs. many
     queries for one)
   - Avoid polling — use webhooks where the data supports them

> Frontify is migrating to a **leaky-bucket** rate limiter. Error codes may
> change. Build the integration to handle non-200 responses generically
> rather than pattern-matching on 429.

## Other common failure modes

### Invalid scope (during OAuth authorize)

Frontify rejects the authorize request if the requested scope is not
**enabled** on the Applications page for that OAuth Client. Account Admin
must toggle the scope on first.

### Redirect URI mismatch

`redirect_uri` must match a value registered on the Application **exactly**,
including trailing slashes, protocol, and casing. Common gotcha: registering
`https://app.example.com/callback` then sending
`https://app.example.com/callback/` (note the trailing slash).

### `state` parameter missing on redirect

Frontify always echoes the `state` value back. If it's missing client-side,
inspect for a downstream redirect (CDN, framework, tenant subdomain handler)
that's stripping the query string.

### PKCE required

For non-confidential ("public") OAuth Clients — SPAs, mobile, native — PKCE
is mandatory. The error explicitly mentions PKCE / code_challenge. Either
flip the client to confidential (only if you have a server-side secret
store) or implement PKCE.

### Service-app secret lost

The `secret` returned by `createServiceApp` cannot be retrieved later. If
lost, create a new Service App and migrate.

### "Customer Support cannot restore lost service-user credentials"

If the user account that owns a Service App or personal token is deleted,
the credentials die with it and **Frontify Customer Support cannot restore
them.** Always:

- Use a dedicated service-user email (e.g.
  `integration-name@yourcompany.com`)
- Name the user something like `DO NOT DELETE - Integration-name user`
- Document which integrations depend on it

## Quick triage flowchart

```
401? → token issue → refresh / re-issue / re-authorize
403?
  ├─ check x-oauth-scopes → missing? re-issue token with right scopes
  └─ scope present → check currentUserPermissions → adjust user permissions
422? → fix the query; do not retry blindly
429? → STOP. Back off. Throttle, cache, batch.
5xx? → retry with exponential backoff (not in this skill — generic infra)
```
