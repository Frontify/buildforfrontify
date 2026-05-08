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
  brandId: number;     // associated brand
  domain: string;      // account domain
  parentId: string;    // parent entity id
  rootId: string;
};
```

These are not auth tokens, but they identify the **scope of the current
session** — the brand and account the App is running against. Use them
when constructing requests to the App's own backend.

### Per-surface context (for reference)

| Surface | Adds | Notes |
|---------|------|-------|
| `assetAction` | `assetId: string` | Triggered from an asset's "…" menu |
| `assetCreation` | (base only) | "+ New" menu inside a project |
| `assetBulkActions` | `selection: { assets: { ids[] }, folders: { ids[] } }` | Multi-select bar |
| `assetViewer` *(Alpha)* | `assetId`, `brandId`, `domain` | Top-right of Asset Viewer in a Guideline |
| `pageAction` *(Alpha)* | (base only) | Top-right of a Guideline page |
| `themeAction` *(Alpha)* | `portalId`, `projectId` | Triggered from a Guideline |

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
const accountId = await appBridge.api({ name: 'getAccountId' });
```

Returns the Frontify account ID. No additional scope required.

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
const asset = await appBridge.api({
  name: 'createAsset',
  payload: { /* upload payload — File | Blob | URL string */ },
});
```

Uploads a new asset on behalf of the user. Requires `basic:write` scope and
the user must have Editor rights on the target library.

### `executeGraphql`

```ts
const { data, errors } = await appBridge.api({
  name: 'executeGraphql',
  payload: {
    query: `{ currentUser { id email } }`,
    variables: {},
  },
});
```

The canonical way for an App to call Frontify GraphQL. Auth and scope
checking happen on the host side; the App never sees a token. For
data-modeling guidance, load `../frontify-graphql/SKILL.md`.

> **Do not** call `https://<domain>/graphql` directly with `fetch` — there
> is no token to put in the header, and the host already provides this
> method safely.

### `executeSecureRequest`

```ts
const { data, status } = await appBridge.api({
  name: 'executeSecureRequest',
  payload: {
    endpoint: 'create-post',
    requestParams: { title: 'Hello' },
  },
});
```

Calls a manifest-declared third-party endpoint with secrets substituted
server-side. The App never sees the secret value. Full reference in
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
