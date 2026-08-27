# AppBridge — Auth-relevant API

The `@frontify/app-bridge-app` package gives an App a typed handle on the
host's session and a small set of API methods. None of these methods take a
token — the host injects authentication automatically.

## Initialization

```ts
import { AppBridgePlatformApp } from '@frontify/app-bridge-app';

const appBridge = new AppBridgePlatformApp();
```

Construct once near the App root and pass the instance through React context
or a singleton. The bridge connects synchronously — there is no async
"login" step.

## Surface context (read-only authentication of *where* you are)

Every surface delivers a typed context object via `appContext()`:

```ts
import { appContext } from '@frontify/app-bridge-app';

const context = appContext();
if (context.surface === 'assetAction') {
  console.log(context.assetId);   // narrowed by TypeScript
}
```

Or with a typed generic when the surface is fixed:

```ts
const ctx = appContext<AssetActionContext>();
ctx.assetId;    // typed
```

Or via the bridge directly:

```ts
const appBridge = new AppBridgePlatformApp();
const context = appBridge.context().get();
```

### Common context properties

All surfaces share `AppBaseProps`:

```ts
type AppBaseProps = {
  token: string;                    // session token; used internally by the bridge
  marketplaceServiceAppId: string;
  connected: boolean;
  brandId: number;                  // associated brand
  domain: string;                   // account domain
};
```

Most of these are consumed internally by the bridge rather than by App
code, but `brandId` / `domain` identify the **scope of the current
session** — the brand and account the App is running against.
`parentId` and `rootId` are **not** base props; they are delivered
per-surface (see below).

### Per-surface context (for reference)

| Surface | Adds (beyond base) | Notes |
|---------|------|-------|
| `assetAction` | `assetId`, `parentId`, `rootId` | Triggered from an asset's "…" menu |
| `assetCreation` | `parentId`, `rootId` | "+ New" menu inside a project |
| `assetBulkActions` | `selection: { assets: { ids[] }, folders: { ids[] } }`, `parentId`, `rootId` | Multi-select bar |
| `assetViewer` *(on-demand)* | `assetId` | Top-right of Asset Viewer in a Guideline |
| `pageAction` *(on-demand)* | (base only) | Top-right of a Guideline page |
| `assetChooser` *(on-demand)* | (base only) | Asset Chooser inside a Guideline |

## API methods (auth-relevant)

All API methods are invoked through `appBridge.api({ name, payload })` and
return promises.

### `getCurrentUser`

```ts
const user = await appBridge.api({ name: 'getCurrentUser' });
// { id: string, name?: string, avatar?: string, email: string }
```

Returns the signed-in user's identity. Requires the `account:read` scope in
`manifest.json` `permissions.scopes`.

### `getAccountId`

```ts
const { id: accountId } = await appBridge.api({ name: 'getAccountId' });
```

Resolves to `{ id }` (the Frontify account ID). No additional scope required.

### `getAssetResourceInformation`

```ts
const info = await appBridge.api({
  name: 'getAssetResourceInformation',
  payload: { assetId: ctx.assetId },
});
// { previewUrl, downloadUrl, sourceUrl, … }
```

Surface-friendly metadata + ready-to-use URLs. The URLs are time-limited
signed CDN links — treat them as ephemeral. Requires `basic:read` scope.

### `createAsset`

```ts
const { assetId } = await appBridge.api({
  name: 'createAsset',
  payload: {
    data: file,             // File | Blob | string
    filename: 'photo.png',
    parentId: ctx.parentId, // target library / folder
    // optional: description, externalId, tags: [{ value }]
  },
});
```

Uploads a new asset on behalf of the user and resolves to `{ assetId }`.
`data`, `filename`, and `parentId` are required. Requires `basic:write`
scope and the user must have Editor rights on the target library.

### `executeGraphQlWithFullResponse` / `executeGraphQl`

```ts
const { data, errors } = await appBridge.api({
  name: 'executeGraphQlWithFullResponse',
  payload: {
    query: `{ currentUser { id email } }`,
    variables: {},
  },
});
```

The recommended way for an App to call Frontify GraphQL — it resolves the
full `{ data, errors, extensions }` envelope. The shorter `executeGraphQl`
is **deprecated**: it resolves only the `data` object, so top-level GraphQL
`errors` are not accessible. Auth and scope checking happen on the host
side; the App never sees a token. For data-modeling guidance, load
`../frontify-graphql/SKILL.md`.

> **Do not** call `https://<domain>/graphql` directly with `fetch` — there
> is no token to put in the header, and the host already provides this
> method safely.

### `executeSecureRequest`

```ts
const response = await appBridge.api({
  name: 'executeSecureRequest',
  payload: {
    endpoint: 'create-post',
    requestParams: { title: 'Hello' },
  },
});
const data = await response.json();
```

Calls a manifest-declared third-party endpoint with secrets substituted
server-side. The App never sees the secret value. `executeSecureRequest`
resolves to a raw `fetch` `Response` — call `.json()` / `.text()`
yourself; the sibling `getSecureRequest` (same payload) instead resolves to
a pre-parsed `{ data, status, statusText }`. Full reference in
`secure-requests.md`.

## Typed surface context — patterns

### Branch on surface

```ts
const ctx = appContext();
switch (ctx.surface) {
  case 'assetAction':
    return processSingleAsset(ctx.assetId);
  case 'assetBulkActions':
    return processMany(ctx.selection.assets.ids);
  case 'assetCreation':
    return startCreation();
}
```

### Pin to a known surface

```ts
const ctx = appContext<AssetActionContext>();   // throws if surface mismatches
ctx.assetId;
```

Use this in code paths that only make sense on one surface — it's both
typed and fail-fast.

## Error handling

`appBridge.api(...)` rejects with a structured error when:

- The required scope is missing on the manifest (`Insufficient scope`)
- The user lacks permission on the target entity (`Forbidden`)
- Network/host error (`Bridge error`)

Treat each like an HTTP 401/403 from the integration side: missing scope
means **change the manifest**; missing permission means **the user can't do
this**, and refreshing/retrying won't help.

## Subscribing to host state

```ts
appBridge.state('settings').subscribe((next, previous) => {
  // settings updated by the admin
});

appBridge.state('userState').subscribe((next, previous) => {
  // per-user state changed
});
```

These are **state stores**, not auth signals — but they're how the App
detects when admin-configured credentials (`settings`) change at runtime
and need to be re-applied.

## What AppBridge does NOT give you

- Direct access to the user's bearer token (intentional — the App
  cannot leak what it cannot see)
- Cross-account / multi-tenant access (the host pins the App to one
  account)
- Background execution outside the surface lifecycle (the App is always
  user-driven; for scheduled work, build a Service App and load
  `../frontify-auth-integration/SKILL.md`)
