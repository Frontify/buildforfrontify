# Scopes — Reference

Scopes are coarse, account-wide capabilities granted to a token at the time
it is issued. They limit what the integration **can attempt** on behalf of
its underlying user. They do **not** answer whether that user is actually
allowed to perform a specific action — see `user-permissions.md` for the
authorization side.

## Available scopes

| Scope | Description |
|-------|-------------|
| `basic:read` | Basic read access to all **brands**, **projects**, and **assets**. The most basic scope. |
| `basic:write` | Basic **write** access to all brands, projects, and assets. |
| `account:read` | Read account data, including users. **Admin** account is required to access other users' data. |
| `webhook:read` | Read access to webhooks. |
| `webhook:write` | **Write** access to webhooks (install/uninstall). Installing a webhook additionally requires Editor rights of the user on the specific location, and the scope `basic:write`. |

The legacy scopes `finder:read`, `blocks:read`, `blocks:write` appear in the
API surface but are **not used in this context** and should be ignored.

## Where scopes are declared

| Auth mode | Where scopes are set |
|-----------|----------------------|
| Service App | In the `createServiceApp` mutation `input.scopes` (enum form: `BASIC_READ`, `BASIC_WRITE`, `ACCOUNT_READ`, `WEBHOOK_READ`, `WEBHOOK_WRITE`). Cannot be raised later — create a new Service App. |
| OAuth 2 Client (authorize URL) | In the `scope` query param of `/api/oauth/authorize`. **Must be a subset of scopes enabled on the Application Settings page** by an Account Admin. |
| OAuth 2 Client (token request) | In the `scope` form field of `/api/oauth/accesstoken`. Must be a subset of what was authorized. |
| Personal developer token | Selected at token creation in the UI. **Cannot be changed** later. |

Common pattern: an Admin enables a generous scope set on the OAuth 2 Client
(e.g. `basic:read basic:write account:read`) so different users / runtime
calls can request narrower combinations.

## Scope encoding

| Endpoint | Separator |
|----------|-----------|
| Authorize URL `scope=` | Space, **URL-encoded as `%20`** (e.g. `basic:read%20basic:write`) |
| Token endpoint `scope=` | Plus sign (`basic:read+basic:write`) |
| Service App mutation | GraphQL enum array (`[BASIC_READ, BASIC_WRITE]`) |

The `:` in scope names is intentional (`basic:read`, not `basic.read`).

## Inspecting a token's actual scopes

Every API response carries the granted scopes in the `x-oauth-scopes`
response header, comma-separated with spaces between:

```
x-oauth-scopes: basic:read, basic:write
```

Useful when:

- An app's required scopes change and you need to find which existing tokens
  must be re-authorized
- Debugging a 403 to confirm whether the issue is scope or
  user-permission
- Auditing what an integration actually carries vs. what it asked for

## Choosing scopes — guidance

- **Request the minimum.** Over-scoping is a red flag for admins reviewing
  install requests and slows approvals.
- **Account-level scopes (`account:read`) require admin** for cross-user
  reads. If your integration only needs the calling user's identity (not
  the directory), `account:read` is overkill.
- **Webhook scopes are layered.** `webhook:write` on its own does nothing —
  you also need Editor rights on the location and `basic:write`.
- **Splitting reads from writes** is good practice. If an integration reads
  most of the time and writes rarely, get two tokens (or one token with
  both, but request narrowly when possible).
- **Document scope rationale** alongside the token in your secrets manager
  ("needs `webhook:write` to install the asset-published webhook on Library
  X").

## Authorize dialog

When a third-party app redirects a user to `/api/oauth/authorize`, Frontify
shows an "Authorize App" dialog listing the requested scopes. The user must
click **Allow access** for each grant. Public marketplace apps that ship
with broad scopes lose installs to less-greedy competitors — keep the
authorize dialog short.

## When scopes change

Scopes attached to a Service App or personal token are immutable. To change
them:

1. Issue a new token / Service App with the new scope set
2. Cut traffic over to the new credentials
3. Revoke the old token (`/api/oauth/revoke`) — see
   `oauth-authorization-code.md`

For OAuth 2 Clients, you can adjust the **enabled scope list** on the
Applications page; existing tokens keep their original grants until
re-authorized.
