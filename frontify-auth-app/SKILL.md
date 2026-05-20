---
name: frontify-auth-app
description: >
  Authentication for Frontify **Apps** (`@frontify/platform-app`,
  `@frontify/app-bridge-app`). Apps run inside the Frontify Platform on
  multiple surfaces and inherit the user's session through AppBridge —
  no raw tokens. Covers AppBridge auth (`executeGraphql`,
  `executeSecureRequest`, `getCurrentUser`, `getAccountId`),
  `manifest.json` scopes / `secrets[]` / `network.endpoints[]`, the
  `%%KEY%%` / `$$dynamic$$` placeholder patterns, the local-dev
  `.secret.json` shim, App Settings `credentials`, App User State, and
  the marketplace authorization dialog. Use when calling Frontify
  GraphQL or third-party APIs from an App, editing manifest scopes /
  secrets / endpoints, configuring `.secret.json`, adding credential
  inputs, reading or writing per-user state, debugging the
  Authorize-permissions install dialog, or hitting 401 / 403 from
  `executeGraphql` / `executeSecureRequest`. Do **not** load for Custom
  Blocks, Themes, or external integrations.
compatibility: Designed for Claude Code and similar agentic development tools.
metadata:
  author: Frontify
  version: "1.0"
---

# Frontify Auth — Apps

Frontify Apps are React + TypeScript single-page apps that run **inside the
Frontify Platform** in an iframe under a trusted host context. They never
handle raw OAuth tokens. Instead, the **AppBridge** delivers a pre-authorised
session and a typed surface context, and exposes a small API for talking to
Frontify GraphQL or to the App's own configured third-party endpoints.

The auth surface for an App developer is therefore four things:

1. **AppBridge methods** that already carry the user's session
2. **Scopes** declared in `manifest.json` (capabilities admins approve at
   install time)
3. **Secrets** declared in `manifest.json` and proxied via
   `executeSecureRequest` (the App never sees the secret value)
4. **App Settings credentials & App User State** for non-secret per-install
   and per-user configuration

If the user is building something that runs **outside** the Frontify
Platform — a backend script, CI job, OAuth client, or anything talking
directly to `https://<domain>/graphql` with a bearer token — stop and load
`../frontify-auth-integration/SKILL.md` instead.

---

## Quick reference

### 1 — Initialize AppBridge

```ts
import { AppBridgePlatformApp } from '@frontify/app-bridge-app';

const appBridge = new AppBridgePlatformApp();
```

There is no login step. The bridge is connected the moment the surface
launches the App; the user's session is already authenticated.

### 2 — Read who is signed in

```ts
const { id, name, avatar, email } = await appBridge.api({
  name: 'getCurrentUser',
});

const accountId = await appBridge.api({ name: 'getAccountId' });
```

`getCurrentUser` is gated by the `account:read` scope (declared in
`manifest.json` — see below). `getAccountId` does not need additional scope.

### 3 — Call Frontify GraphQL — `executeGraphql`

```ts
const { data } = await appBridge.api({
  name: 'executeGraphql',
  payload: {
    query: /* GraphQL */ `
      query CurrentUserBrands {
        currentUser { id email }
        brands { items { id name } }
      }
    `,
    variables: {},
  },
});
```

`executeGraphql` is the **only** correct way for an App to talk to Frontify
GraphQL. Do not call `https://<domain>/graphql` directly with `fetch` — the
App has no token, and you'd be re-implementing what AppBridge already
provides safely.

The call honours the App's manifest scopes; a query that needs `basic:write`
will fail if the manifest only declares `basic:read`.

For data work after auth is solved, also load `../frontify-graphql/SKILL.md`.

### 4 — Call a third-party API with secrets — `executeSecureRequest`

The App can never see the secret value. Frontify proxies the request
server-side, substituting placeholders configured by the admin in the
Marketplace.

**Manifest** — declare the secret keys and the endpoint shape:

```json
{
  "appId": "<YOUR_APP_ID>",
  "appType": "platform-app",
  "name": "your-app",
  "secrets": [
    { "key": "THIRD_PARTY_API_KEY", "label": "Example Service" }
  ],
  "network": {
    "endpoints": [
      {
        "name": "create-post",
        "resource": "https://api.example.com/posts",
        "options": {
          "method": "POST",
          "headers": {
            "Content-type": "application/json",
            "Authorization": "Bearer %%THIRD_PARTY_API_KEY%%"
          },
          "body": { "title": "$$title$$" }
        }
      }
    ]
  }
}
```

Two placeholder forms:

- `%%KEY%%` — **static** substitution. At runtime, Frontify replaces this
  with the secret value the admin saved in the Marketplace's Access Keys
  section.
- `$$dynamic-key$$` — **runtime** substitution. Replaced with the value
  passed in the call's `requestParams`.

**Call**:

```ts
const { data, status } = await appBridge.api({
  name: 'executeSecureRequest',
  payload: {
    endpoint: 'create-post',
    requestParams: { title: 'Hello' },
  },
});
```

**Local development**: create a `.secret.json` at the project root (mirror
the keys from `manifest.json` `secrets[]`) and add it to `.gitignore`:

```json
{
  "THIRD_PARTY_API_KEY": "actual-api-key-value"
}
```

Frontify's local dev shim reads `.secret.json` so `executeSecureRequest`
resolves placeholders without going to the Marketplace.

Full reference: `references/secure-requests.md`.

### 5 — Declare scopes in `manifest.json`

```json
{
  "permissions": {
    "scopes": [
      "basic:read",
      "basic:write",
      "account:read",
      "webhook:read",
      "webhook:write"
    ]
  }
}
```

The five available scopes for Apps:

| Scope | Description |
|-------|-------------|
| `basic:read` | Basic read access to all brands, projects, and assets |
| `basic:write` | Basic write access to all brands, projects, and assets |
| `account:read` | Read account data, including users (admin required for other users' data) |
| `webhook:read` | Read access to webhooks |
| `webhook:write` | Write access to webhooks. Also requires Editor rights on the location and `basic:write` |

**Rules**

- Request the **minimum** the App actually uses. Admins must approve scopes
  before installation; over-scoping slows approvals and may block them.
- Scopes change after install? You must publish a new version — the admin
  is shown an updated authorize dialog and must re-approve.
- The `Authorize permissions` dialog is shown to admins on install and on
  scope change.

> A note on naming: in some older example snippets you may see plural
> `webhooks:read` / `webhooks:write`. The canonical scope names are the
> singular forms shown above (`webhook:read`, `webhook:write`).

Full reference: `references/manifest-permissions.md`.

### 6 — App Settings (`src/settings.ts`)

Settings are admin-configured values bound to the **App install**, not the
user. The `credentials` section is the conventional home for non-secret
configuration that needs UI:

```ts
import { defineSettings } from '@frontify/platform-app';

export const settings = defineSettings({
  credentials: [
    { type: 'input', id: 'webhook-url', label: 'Webhook URL' },
  ],
});
```

Read at runtime:

```ts
const [settings] = appSettings<{ 'webhook-url': string }>();
settings['webhook-url'];

// Or via AppBridge
const settings = appBridge.state('settings').get();
```

**Settings vs. Secrets**

| Use settings for | Use secrets for |
|------------------|-----------------|
| Webhook URLs, feature toggles, default values, public configuration the App can render | API keys, OAuth client secrets, anything the App must NEVER see in cleartext |

Settings flow through the App's runtime; secrets stay server-side and are
substituted into outgoing requests only via `executeSecureRequest`.

### 7 — App User State

Per-user, per-App state that survives across sessions:

```ts
const [state, setState] = appUserState<{ name: string }>();
setState({ name: 'sophie' });

// Or via AppBridge
appBridge.state('userState').set({ key: 'value' });
appBridge.state('userState').subscribe((next, prev) => { /* … */ });
```

Use this for non-secret per-user preferences the App should remember
(last-used filter, dismissed onboarding, etc.). It is **not** an
authentication mechanism — the user's identity is fixed by the surrounding
session.

### 8 — App lifecycle for auth

When a surface launches the App, Frontify instantiates an `AppBridge` and
delivers the surface-specific `context` synchronously. From that point:

- `executeGraphql` calls run with the user's session — no token to manage
- `executeSecureRequest` resolves manifest secrets server-side
- Closing the modal unmounts the React tree — persist data via
  `userState` or `createAsset` before teardown

There is no token refresh, no expiry handling, no `Authorization` header to
set. The App-side auth surface is intentionally narrow.

---

## Reference index

| File | When to read |
|------|--------------|
| `references/app-bridge-auth.md` | Full AppBridge auth methods, payloads, surface-context patterns, error shapes |
| `references/manifest-permissions.md` | Full `manifest.json` reference for `permissions.scopes` and `secrets[]` |
| `references/secure-requests.md` | `executeSecureRequest` deep-dive: `network.endpoints[]`, placeholder substitution, `.secret.json` for local |
| `references/scopes.md` | App-side scope behaviour, install-time admin dialog, version migration |

For data work after auth is solved → `../frontify-graphql/SKILL.md`.
For external scripts / Service Apps / OAuth → `../frontify-auth-integration/SKILL.md`.
