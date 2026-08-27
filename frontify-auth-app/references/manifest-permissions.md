# `manifest.json` — Permissions and Secrets

The App's `manifest.json` is the single source of truth for what the App is
**allowed to do** (`permissions.scopes`) and **what secrets it can use**
(`secrets[]`). Both are admin-approved at install time.

> **Canonical sample.** For a deploy-ready bare-minimum manifest (no
> secrets, single surface, single scope), see
> [`../../frontify-app/assets/scaffold/manifest.json`](../../frontify-app/assets/scaffold/manifest.json).
> The example below is the **maximal** shape — use it as a reference for
> what's *available*; copy the scaffold file as your *starting point*.

## Top-level shape (auth-relevant fields)

```json
{
  "appId": "<YOUR_APP_ID>",
  "appType": "platform-app",
  "name": "your-app",
  "metadata": { "version": 1 },

  "permissions": {
    "scopes": ["basic:read", "basic:write"]
  },

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
  },

  "surfaces": {
    "mediaLibrary": {
      "assetAction": { "title": "Asset Action", "type": ["image"] }
    }
  }
}
```

## `permissions.scopes`

Frontify validates that every `executeGraphQlWithFullResponse` /
`executeSecureRequest` call the App makes is allowed by the declared scopes. Five scopes are usable:

| Scope | Description |
|-------|-------------|
| `basic:read` | Basic read access to all brands, projects, and assets |
| `basic:write` | Basic write access to all brands, projects, and assets |
| `account:read` | Read account data, including users (admin required for other users' data) |
| `webhook:read` | Read access to webhooks |
| `webhook:write` | Write access to webhooks (install/uninstall). Also requires Editor rights on the location and `basic:write` |

Three rules:

1. **Minimum-necessary.** Admins must approve the entire scope list at
   install. Over-scoping is a red flag and slows approvals.
2. **Scope changes require a new published version.** Bumping the scope
   list means re-deploying to the Marketplace and admins re-confirming the
   authorize dialog.
3. **The dialog text matters.** The scopes shown to admins are exactly the
   strings in this array — keep them tight and predictable.

Sample dialog: when a user installs an App declaring
`["basic:read","basic:write"]`, Frontify shows an "Authorize permissions"
modal listing those grants. Installation is blocked until the admin clicks
**Authorize**.

> Older example snippets in some docs use plural `webhooks:read` /
> `webhooks:write`. The canonical scope names are the singular forms above
> (`webhook:read`, `webhook:write`). Use the singular form in your manifest.

## `secrets[]`

Each entry has two fields:

- `key` — the placeholder identifier used in `network.endpoints[*].options`
  (referenced as `%%KEY%%`)
- `label` — human-readable label shown in the Marketplace's Access Keys UI
  for admins entering the value

```json
"secrets": [
  { "key": "THIRD_PARTY_API_KEY", "label": "Example Service" },
  { "key": "OTHER_THIRD_PARTY_API", "label": "Another API" }
]
```

After the App is published, admins enter the actual secret values in the
Marketplace under the App's Settings → Access Keys section. The values are
stored securely on Frontify's side and **never delivered to the App
runtime**. They are only substituted into outgoing requests by
`executeSecureRequest`.

## `network.endpoints[]`

Each endpoint defines a single HTTP call shape that the App can invoke by
name. Frontify executes the call server-side, substituting placeholders.

Per-endpoint shape:

| Field | Required | Notes |
|-------|----------|-------|
| `name` | yes | Unique identifier — passed as `payload.endpoint` in `executeSecureRequest` |
| `resource` | yes | Target URL. May contain `$$dynamic$$` placeholders |
| `options.method` | yes | `GET` / `POST` / `PUT` / `PATCH` / `DELETE` |
| `options.headers` | no | Object — values may contain `%%KEY%%` and `$$dynamic$$` |
| `options.body` | no | Object — values may contain `%%KEY%%` and `$$dynamic$$`. JSON-serialised. |

Two placeholder forms:

- `%%KEY%%` — substituted with the **secret value** the admin saved for that
  `key`. Static — same value for every call.
- `$$dynamic-key$$` — substituted with the value passed in the call's
  `requestParams` object.

Example combining both:

```json
{
  "name": "post-with-key",
  "resource": "https://api.example.com/posts/$$page$$",
  "options": {
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "X-API-Key": "%%THIRD_PARTY_API_KEY%%"
    },
    "body": { "title": "$$title$$" }
  }
}
```

Called as:

```ts
await appBridge.api({
  name: 'executeSecureRequest',
  payload: {
    endpoint: 'post-with-key',
    requestParams: { page: 2, title: 'Hello' },
  },
});
```

Result: `POST https://api.example.com/posts/2` with header
`X-API-Key: <real-key>` and body `{"title":"Hello"}`.

Full reference: `secure-requests.md`.

## Settings vs. secrets — choosing where a value goes

| Belongs in `settings.ts` | Belongs in `secrets[]` |
|--------------------------|------------------------|
| Public configuration the App may render in the UI | Anything the App must NEVER see |
| Webhook URLs, feature toggles, default values | API keys, tokens, OAuth client secrets |
| Values an editor wants to set once and forget | Values that should rotate independently of the App's UI |
| Read at runtime via `appSettings()` | Used only inside `executeSecureRequest` substitution |

If a secret accidentally ends up in settings, the Settings UI will display
it in cleartext and the App's runtime will see it. Move it to `secrets[]`
and reference via `%%KEY%%` instead.

## Checklist before publishing

- ✅ `permissions.scopes` is the **minimum** the App actually uses
- ✅ Singular `webhook:read` / `webhook:write` (not plural)
- ✅ Every `secrets[].key` is referenced from at least one
  `network.endpoints[*]`
- ✅ Every `%%KEY%%` placeholder maps to a `secrets[].key`
- ✅ `.gitignore` excludes `.secret.json`
- ✅ The local `.secret.json` is up-to-date with all `secrets[]` keys
- ✅ The App ID in `manifest.json` matches the Marketplace draft
