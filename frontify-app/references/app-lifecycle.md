# App Lifecycle Reference

The full lifecycle of a Frontify App — from registration through runtime
to teardown. Read this when the user asks how the app is initialised, how
it receives context, or how state is shared and torn down.

---

## App registration

- An app is created in the **Marketplace UI**, which issues a 25-character
  **App ID**.
- Copy it into `manifest.json` under `appId`. Also required:
  `appType: "platform-app"`, a top-level `name` slug, and
  `metadata.version: 1`.
- `permissions.scopes` lists 1–5 scopes; `basic:read` must always be
  present. `surfaces` declares where the app appears (see
  `surfaces.md`).
- A local dev build is linked to a registered app by setting the same
  `appId`; during development the running dev server is connected
  directly (see the SKILL's Development workflow).

---

## Initialisation

The entry point spans two files: `src/index.ts` default-exports
`defineApp({ app, settings })`, and `index.html` hands that export to
`renderReactApp` (from `@frontify/app-bridge-app`) — the app mounts
through `renderReactApp`, not `createRoot`:

```ts
// src/index.ts
import { defineApp } from '@frontify/platform-app';
import { App } from './App';
import { settings } from './settings';

export default defineApp({ app: App, settings });
```

```html
<!-- index.html -->
<script type="module">
    import module from '/src/index.ts';
    import { renderReactApp } from '@frontify/app-bridge-app';

    renderReactApp(module);
</script>
```

`renderReactApp` instantiates the `AppBridgePlatformApp` singleton,
subscribes to the `Context.connected` event, dispatches `openConnection`,
and only then renders `App` into `#root`. Because React mounts **after**
the handshake, `appContext()` is already populated on the first render —
mounting manually would render before the bridge connects and
`appContext()` would be `undefined`.

The authentication token needed for API calls is delivered on the context
as `token` (part of `AppBaseProps`); the AppBridge uses it internally for
`api()` calls, so app code rarely reads it directly.

---

## Context object

`appContext()` (equivalently `appBridge.context().get()`) returns a
`PlatformAppContext` — a discriminated union keyed on `surface`.

- **Base props on every surface (`AppBaseProps`):** `token`,
  `marketplaceServiceAppId`, `connected`, `brandId`, `domain`.
- **Surface-specific fields:** e.g. `assetId` on `assetAction` /
  `assetViewer`, `parentId`/`rootId` on `assetAction` / `assetCreation` /
  `assetBulkActions`, `selection` on `assetBulkActions`. See
  `surfaces.md` for the per-surface shape.

Narrow before access:

```ts
const context = appContext();
if (context.surface === 'assetAction') {
  // context.assetId is now typed
}
```

---

## State management

Three stores, each reachable via `appBridge.state('<name>')` with
`.get()`, `.set()`, and `.subscribe()`:

| Store | Scope | React hook |
|-------|-------|------------|
| `settings` | Admin-configured, per install | `appSettings<T>()` → `[value, setValue]` |
| `userState` | Per user, per app | `appUserState<T>()` → `[value, setValue]` |
| context | Read-only surface context | `appContext<T>()` |

```ts
// Reactive updates (subscribe payload is untyped — narrow it):
const unsubscribe = appBridge
  .state('userState')
  .subscribe((next: unknown) => apply(next as MyState));
```

`settings` is written by admins in the app's configuration UI; the app
reads it. `userState` is read/write from the app and is isolated per
user — different users see different values. State set on `userState`
persists across sessions for that user.

---

## Events and messaging

- The app talks to the host through the AppBridge, which wraps a
  `postMessage` channel to the Frontify iframe host.
- **App → host:** `appBridge.api({ name, payload })` — e.g.
  `getAssetResourceInformation`, `getCurrentUser`, `getAccountId`,
  `createAsset`, `getSecureRequest` / `executeSecureRequest`,
  `executeGraphQlWithFullResponse` (and the deprecated `executeGraphQl`).
- **Host → app:** lifecycle events such as `Context.connected` (consumed
  by `renderReactApp`) and store-change notifications delivered through
  `.subscribe()`.
- API calls are promises; wrap them in `try/catch` and surface failures
  in the UI, since the host may reject a call (e.g. missing scope,
  disallowed endpoint).

---

## Teardown

- Closing the modal unmounts the React tree; in-memory component state is
  lost.
- Persist anything that must survive to `userState` (or commit it to
  Frontify via `createAsset` / a GraphQL mutation) **before** teardown.
- Await or cancel in-flight async work before writing final state — a
  promise that resolves after unmount cannot update the UI and its
  `setState` will be a no-op.
