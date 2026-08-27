# Scopes — Apps

Scopes describe the capabilities an App requests from Frontify. They're
declared in `manifest.json` `permissions.scopes`, presented to admins at
install time, and enforced on every `executeGraphQlWithFullResponse` /
`executeSecureRequest` call.

> Apps do **not** handle OAuth tokens or scope negotiations at runtime. The
> auth side of scopes is entirely manifest-driven. For a standalone
> integration that handles its own tokens, see
> `../frontify-auth-integration/references/scopes.md`.

## Available scopes for Apps

| Scope | Description |
|-------|-------------|
| `basic:read` | Basic read access to all brands, projects, and assets |
| `basic:write` | Basic write access to all brands, projects, and assets |
| `account:read` | Read account data, including users (admin required for other users' data) |
| `webhook:read` | Read access to webhooks |
| `webhook:write` | Write access to webhooks (install/uninstall). Also requires Editor rights on the location and `basic:write` |

These match the integration scopes — there is no App-only scope. The
mechanism that delivers them is different (manifest declaration vs OAuth
authorize), but the access they grant is identical.

> **Naming**: the canonical scope names are singular (`webhook:read`,
> `webhook:write`). Some example snippets in older Frontify docs use plural
> (`webhooks:read`, `webhooks:write`); use the singular form.

## Declaring scopes

```json
{
  "permissions": {
    "scopes": ["basic:read", "basic:write"]
  }
}
```

The order doesn't matter. Duplicates are ignored. Unknown values fail the
deploy.

## What admins see

When an admin installs the App, Frontify shows an **Authorize permissions**
dialog listing each scope from the manifest with its description. The
admin must click **Authorize** to proceed; cancelling blocks installation.

The dialog also appears whenever the App is **upgraded to a new version
that changes the scope list** — the admin must re-authorize before the new
version becomes active.

## Choosing scopes

### Minimum-necessary

Request **only** what the App actually uses. Three reasons:

1. Admins reviewing install requests reject over-scoped Apps.
2. The dialog makes the App look more invasive than it is.
3. If a scope is removed in a later version, the dialog shows "Removed
   permissions" — that's a positive signal users should see.

### Read vs. write

If the App only displays data, request `basic:read` only. Don't preemptively
request `basic:write` "just in case." A user-visible upgrade dialog when
write functionality is added later is good UX.

### `account:read`

Required for `getCurrentUser` to return identity beyond the user ID. If the
App only needs the current user's ID for client-side keying, you can skip
`account:read` — `getAccountId` is always available.

For querying *other* users (admin directory), `account:read` is required
**and** the underlying user must have admin rights.

### Webhook scopes

Apps that need to install or remove webhooks (e.g. a sync App that hooks
asset-published events) need `webhook:write`. Note the layered requirements:

- The token must have `webhook:write`
- The user must have Editor rights on the target location
- The token must also have `basic:write`

`webhook:read` alone is enough for Apps that only inspect existing webhooks.

## Scope enforcement at runtime

```ts
const { data } = await appBridge.api({
  name: 'executeGraphQlWithFullResponse',
  payload: { query: '...' },
});
```

Frontify enforces the manifest scope set on every call. A query that needs
`basic:write` against an App declaring only `basic:read` returns a
GraphQL-level error / rejected promise — refresh / retry won't fix it.

The enforcement is conservative: even if the underlying user has plenty of
permission, the App is capped by its manifest scopes. This is by design —
the App is a third party as far as the host is concerned.

## Migrating scopes

Adding a scope:

1. Add it to `manifest.json` `permissions.scopes`
2. Bump the App version (`metadata.version`)
3. Deploy and publish the new version
4. On the next install / upgrade, the admin sees the new scope in the
   Authorize permissions dialog
5. Existing installs continue running on the old scope set until the admin
   chooses to upgrade

Removing a scope: same flow. The admin's authorize dialog shows the scope
list narrowing — usually a positive signal.

Renaming a scope is not possible — it's just an add + remove across two
versions.

## Common pitfalls

- **Plural vs. singular `webhook(s):*`** — use singular.
- **Adding a scope without bumping the version** — the new scope won't take
  effect; bumps are required for re-authorization.
- **Skipping `account:read` and getting empty `getCurrentUser`** — without
  this scope, the call returns an ID-only payload (or fails outright in
  some envs). Add the scope or stop calling `getCurrentUser`.
- **Including `account:read` "for safety"** — admins notice; only request
  if the App actually needs user data beyond the current user's identity.

## Audit / debugging

You cannot read the App's effective scope list at runtime via AppBridge —
the host doesn't expose it. The manifest is the source of truth. If you
suspect a scope mismatch, check three places:

1. The local `manifest.json`
2. The deployed manifest in the Marketplace (Version history)
3. The error message on the failing call — Frontify usually says which
   scope was missing
