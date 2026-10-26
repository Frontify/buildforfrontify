# Auth Overview — External Integrations

Comprehensive model: identity, tokens, scopes, permissions. Read this when
the agent needs the full picture rather than a procedural recipe.

## The two halves of access control

**Authentication** verifies *who* a request comes from. In Frontify it is
always done with an **access token**. There is no anonymous identity and no
"app" identity decoupled from a user — every token is issued **in the name
of a specific user** and carries that user's identity end-to-end.

**Authorization** decides whether the authenticated identity is *allowed* to
perform a specific action on a specific resource. Frontify decides this in
two steps:

1. **Scopes** on the token (what the integration *may* attempt)
2. **User permissions** on the entity (what the underlying user is *actually*
   allowed to do)

A request fails authorization if either gate is closed.

## Tokens

All tokens carry the same shape on the wire: an opaque bearer string sent in
`Authorization: Bearer {token}`. Where they differ is **how they are
obtained** and **what they bind to**:

| Token kind | Bound to | Lifetime | Refresh? |
|------------|----------|----------|----------|
| **Service-app token** (client credentials) | The user who created the Service App | 30 days (`expires_in: 2592000`) | No — request a new one |
| **OAuth 2 user token** (authorization code) | The end user who authorized the client | Configured per Frontify instance (1 week–3 months typical) | Yes — single-use refresh token |
| **Personal developer token** | The user who generated it | 7 days, 30 days, 90 days, 6 months, or 1 year (chosen at creation). Pre-2026 tokens have 10-year expiry | No — re-generate manually |

A token cannot exceed the permissions of the user it is bound to. If that
user loses Editor on a project, the token immediately can no longer write
into that project — even if its scopes include `basic:write`.

## Scopes

Scopes are coarse, account-wide capabilities. Five are usable:

- `basic:read`, `basic:write` — brands, projects, assets
- `account:read` — account data and users
- `webhook:read`, `webhook:write` — webhooks (write also requires Editor on
  the location and `basic:write`)

Three legacy scopes (`finder:read`, `blocks:read`, `blocks:write`) appear in
the API but are not relevant to this context.

Three rules:

1. **Request only what you need.** Admins approve scopes during OAuth and
   when installing apps; over-scoping is a red flag.
2. **Once a personal token is created, its scopes cannot be changed.** Plan
   accordingly.
3. **Verify the scopes a token actually carries** with the `x-oauth-scopes`
   response header (comma-separated). Useful when an app's required scopes
   change and existing tokens may need re-authorization.

Full reference in `scopes.md`.

## User permissions

User permissions are fine-grained, per-entity, per-action booleans. Every
significant GraphQL entity exposes a `currentUserPermissions` field whose
shape is:

```graphql
type [Entity]UserPermissions {
  can[Action]: Boolean!
}
```

For example `AssetUserPermissions` exposes `canEdit`, `canDelete`,
`canDownload`, `canComment`. Roles in a library/project (Viewer, Editor,
Owner) influence these flags but the account can further customise them, so
**always trust `currentUserPermissions` — never the role label.**

Rule of thumb: if your code is about to perform a write, query
`currentUserPermissions` first and gate the action on the relevant `can*`
boolean. This avoids racy 403s and gives you a clean way to render UI affordances.

Full model in `user-permissions.md`.

## Choosing a flow

```
Is the integration running INSIDE Frontify
(an App, Custom Block, or Theme)?
├─ Yes → stop reading this skill — use the matching extension skill
│         (Apps → frontify-auth-app)
└─ No → continue

Does it act on behalf of an end user
(SSO-style "Login with Frontify")?
├─ Yes → OAuth 2.0 Client (authorization code, with PKCE if public)
└─ No → continue

Is it a long-running backend / scheduled job / CI?
├─ Yes → Service App (client credentials)
└─ No → continue

Is it a one-shot script, local dev, or CI step?
└─ → Personal developer token (short expiry, dedicated service user)
```

Personal tokens are also the **bootstrapping** mechanism: you need a user
session to call `createServiceApp`, so you generate a developer token first,
then use it to mint the Service App, then switch your integration to client
credentials.

## Endpoints at a glance

```
POST  https://{domain}/graphql                  # the API itself
GET   https://{domain}/api/oauth/authorize      # OAuth 2 — start auth code flow
POST  https://{domain}/api/oauth/accesstoken    # exchange code OR client credentials
POST  https://{domain}/api/oauth/refresh        # refresh OAuth user token
POST  https://{domain}/api/oauth/revoke         # revoke any token
       https://{domain}/oauth-access-token      # personal developer tokens — direct URL only, NOT linked from any UI menu
```

A given OAuth 2 Client or personal token is **scoped to a single Frontify
account**. Multi-account integrations require coordination with
`developer@frontify.com`.

## Rate limits

2500 requests per 5-minute rolling window per token. Exceeding returns
**HTTP 429** — back off immediately. Repeated GraphQL errors (HTTP 422) are
also rate-controlled and may trigger a longer block. Use strongly-typed
GraphQL clients to avoid generating errors at scale.
