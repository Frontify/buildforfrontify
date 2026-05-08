---
name: frontify-app
description: >
  Scaffolds, develops, and tests Frontify Apps — React-based single-page
  applications that run inside the Frontify Platform on one or more
  surfaces (asset action, asset creation, asset bulk action, asset viewer,
  page action). Loaded by the build-for-frontify orchestrator when the
  user chooses "App", or directly when the user asks to modify, debug, or
  deploy an existing App. For NEW App projects, prefer routing through
  build-for-frontify first — it owns the project-bootstrap concerns
  (Brand SDK prerequisites, Frontify CLI install, UI-framework choice,
  optional PRD/tasks planning, and the shared resource skills map).
  Covers project setup with the Frontify CLI, local development against
  a Frontify sandbox, surface configuration via manifest.json, AppBridge
  usage, app settings, secure requests, and marketplace deployment.
compatibility: Designed for Claude Code and similar agentic development tools.
metadata:
  author: Frontify
  version: "1.1"
---

# Frontify App

A **Frontify App** is a React + TypeScript single-page application that
runs inside the Frontify Platform. Apps are more capable than Content
Blocks or Themes because they are not limited to Brand Guidelines — they
can launch from multiple **surfaces** across Asset Libraries, Brand
Guidelines, and the Marketplace, and they can call the Frontify Public
API on the user's behalf via the AppBridge.

Use an App when the user wants to:

- Perform an action on one or many assets (e.g. background removal, format
  conversion, AI tagging)
- Create new assets from a prompt or an external service
- Add a custom action button to a guideline page or asset viewer
- Integrate Frontify with a third-party system through a configurable UI

If the user only needs to add a UI component to a guideline page, prefer
a **Content Block** (`../frontify-custom-block/SKILL.md`). If they want to
restyle guidelines, prefer a **Theme** (`../frontify-theme/SKILL.md`).

---

## Before you start — load the orchestrator for new projects

If this is a **new** App (not yet scaffolded), also load
[`../build-for-frontify/SKILL.md`](../build-for-frontify/SKILL.md). It owns the
upstream concerns this skill assumes are handled:

- **Brand SDK prerequisites** — Node ≥ 22.14, React Developer Tools, Frontify
  account / sandbox, WSL 2 on Windows.
- **Frontify CLI install** — install with `npm install -g @frontify/frontify-cli`.
- **Build validation** — run `npx tsc --noEmit` and `npx eslint src` during
  iteration and before deployment.
- **UI framework choice** — Fondue (recommended default) vs. another library;
  the answer is carried into this skill.
- **Optional PRD / tasks planning layer** — `frontify-prd` + `frontify-tasks`
  are strongly recommended for multi-surface Apps, multi-feature scopes,
  third-party-API integrations, or team builds.
- **Shared resource map** — when to load `frontify-auth-app`,
  `frontify-graphql`, `frontify-deployment`, `frontify-fondue`.

For an **existing** App project (debugging, extending, deploying), you can stay
in this skill and reach for shared skills as the work demands.

---

## Surface selection

A single App can register on one or more surfaces. If the orchestrator
has not already determined them, ask the user a short, focused question
referencing the options below.

### Standard surfaces (always available)

| Surface | Where it appears | Context provided |
|---------|------------------|------------------|
| **`assetAction`** | Asset Detail → "…" menu inside a Library or Project | `assetId`, base props |
| **`assetCreation`** | "+ New" menu inside a project or library | `parentId`, base props |
| **`assetBulkActions`** | Bottom action bar after multi-selecting assets | `selection.assets.ids[]`, `selection.folders.ids[]`, base props |

### On-demand surfaces (request via Frontify Friends)

| Surface | Where it appears | Context provided |
|---------|------------------|------------------|
| **`assetViewer`** | App icon in the top right of the Asset Viewer in a Guideline | `assetId`, `brandId`, `domain` |
| **`pageAction`** | App icon in the top right of a Guideline page | base props |
| **`themeAction`** *(Alpha)* | Triggered from a Guideline | `portalId`, `projectId` |

All surfaces share `AppBaseProps`: `brandId`, `domain`, `parentId`,
`rootId`. **Note:** `parentId` is on most surfaces but not on
`assetViewer` — narrow with `if (context.surface === '…')` before
accessing surface-specific fields, or `tsc` will reject the access. See
`references/surfaces.md` for the full per-surface implementation guide
and `references/app-lifecycle.md` for how surface context is delivered
at runtime.

---

## UI framework

Apps render inside Frontify chrome and the default expectation is that
they feel native to the platform. The orchestrator
(`../build-for-frontify/SKILL.md`, Step 1 question 5) asks the user
whether they want **Fondue** or **another UI framework** before routing
here.

- **If Fondue was chosen** (or the user was undecided): treat
  `../frontify-fondue/SKILL.md` as in-scope. Load it the moment the user
  starts building UI. Examples in this skill that import from
  `@frontify/fondue/components` apply directly.

- **If another framework was chosen** (MUI, Chakra, Mantine, an in-house
  design system, plain CSS, etc.): **do not import from `@frontify/fondue`
  or `@frontify/fondue/components`** in scaffolded or generated code.
  Use the project's chosen library. Everything else in this skill —
  AppBridge usage, surface context, `manifest.json`, settings, secure
  requests, deployment — still applies unchanged. Surface that the user
  is now responsible for visual parity with Frontify themselves.

- **If the orchestrator was skipped** and the project is fresh, ask the
  question once before producing UI code; carry the answer forward for
  the rest of the session.

The choice does not affect the scaffold's **styling framework** prompt
(Tailwind / CSS Modules / none) — those are independent. Fondue ships
its own Tailwind preset (`@frontify/fondue/tokens/tailwind`) which
composes with the scaffold's Tailwind option.

---

## Project setup

### Prerequisites

- **Node.js ≥ 22.14** (bundles `npm` and `npx`)
- **Frontify CLI** — used via `npx @frontify/frontify-cli@latest`
- **React Developer Tools** browser extension (required for HMR)
- A **Frontify account** with at least Editor permission, or a
  Developer Sandbox
- **Google Chrome** is recommended for local connection (Safari requires
  HTTPS on the dev server)
- On Windows, use **WSL 2**

### Scaffold a new app — interactive (TTY required)

The official Frontify CLI is the canonical scaffold path:

```bash
npx @frontify/frontify-cli@latest create
```

The CLI prompts (arrow-key driven) for:

1. **App name** — folder name and identifier
2. **Extension type** — choose **App**
3. **Styling framework** — Tailwind, CSS Modules, or none

After scaffolding, the directory contains a working demo app that prints
its surface name (e.g. `"assetAction"`) so you can verify the
AppBridge connection.

### Scaffold a new app — non-interactive (agent / CI)

The interactive CLI cannot be driven without a TTY (it has no flags for
type/surface/styling). When running in a sandbox, container, or CI agent,
**inline-scaffold** instead by copying the canonical files in
`assets/scaffold/` into the new project directory and substituting the
`<APP_NAME>` and `<APP_TITLE>` placeholders. The scaffold ships a
complete, deploy-ready project: `manifest.json`, `package.json`,
`tsconfig.json`, `eslint.config.js`, `index.html`, `src/index.tsx`,
`src/App.tsx`, `src/settings.ts`. After copying:

```bash
cd <APP_NAME>
npm install
npm run lint     # tsc --noEmit
```

### Verify the scaffold

```bash
cd <app-name>
npm install      # or pnpm i
npm run serve    # or pnpm serve
```

The dev server starts a websocket on `http://localhost:5600`. The page
itself is intentionally blank — the app must be connected from inside
Frontify (next section).

---

## Development workflow

### 1. Enable Developer Mode in Frontify (user-side, one-time)

Developer Mode is **off by default**. The user (not the agent) enables
it once via either:

- **localStorage** in their browser console:
  ```js
  localStorage.setItem('developer-mode', '{"json":true}')
  ```
- **User profile UI** — toggle "Developer Mode". If the toggle is not
  visible, ask Frontify to enable it for your environment via the
  Frontify Friends Slack channel.

> Agents should not script `localStorage.setItem` — it's a user-side
> step in their browser. The agent's job is to remind the user.

### 2. Connect the local app

With `npm run serve` running:

1. Navigate to an asset (or bulk-select assets) in a Library or Project
2. Open the "…" Asset Actions menu (or the bulk action bar)
3. Choose **"+ Connect…"**
4. Enter `localhost:5600` — Frontify confirms it found the running app
5. Click **Connect**

The app launches in a modal and is then accessible from the **More
(…)** menu on subsequent visits. **Hot Module Replacement** is
enabled — code changes appear immediately without reconnecting.

### 3. Iterate

Edit `src/App.tsx`, `src/settings.ts`, and `manifest.json` as needed.
Use the in-app **configuration button** (bottom-right in dev mode) to
exercise different settings values; they persist in `localStorage` for
the current dev session.

---

## Entry point — `src/index.tsx`

A Platform App MUST mount React via the bundled `renderReactApp` helper.
Mounting manually with `createRoot(...).render(<App />)` renders the App
**before** AppBridge has finished its handshake with the host iframe, so
`appContext()` returns `undefined` and the App crashes on first read with
`TypeError: Cannot read properties of undefined (reading 'surface')`. The
modal opens but the body is blank.

The canonical entry:

```tsx
// src/index.tsx
import { renderReactApp } from '@frontify/app-bridge-app';
import { defineApp } from '@frontify/platform-app';
import App from './App';
import { settings } from './settings';

renderReactApp(
    defineApp({
        app: App,
        settings,
    }),
);
```

`renderReactApp` instantiates the AppBridge singleton, subscribes to the
`Context.connected` event, dispatches `openConnection`, and only then
mounts React on `#root`. After this, `appContext()` inside the App
component returns a real, populated context.

## AppBridge — interacting with the platform

Apps communicate with Frontify via the **AppBridge**. Inside the App
component, get the singleton instance — `new AppBridgePlatformApp()`
returns the same instance `renderReactApp` already created (it stores
itself on `window.appBridgePlatformApp`):

```ts
import { AppBridgePlatformApp } from '@frontify/app-bridge-app';

const appBridge = new AppBridgePlatformApp();
```

### Reading surface context

`appContext()` returns a discriminated union — narrow with the `surface`
field before accessing surface-specific properties, otherwise `tsc`
will reject the access:

```ts
import { appContext } from '@frontify/app-bridge-app';

const context = appContext();
if (context.surface === 'assetAction') {
  console.log(context.assetId);   // narrowed to AssetActionContext
}
if (context.surface === 'assetCreation') {
  console.log(context.parentId);  // narrowed to AssetCreationContext
}
```

### Core API methods

Available via `appBridge.api({ name, payload })`:

| Method | Purpose |
|--------|---------|
| `getAssetResourceInformation` | Fetch asset metadata + preview / download / source URLs |
| `getCurrentUser` | `{ id, name?, avatar?, email }` of the authenticated user |
| `getAccountId` | Frontify account ID |
| `createAsset` | Upload a new asset — payload `{ data, filename, parentId }` |
| `executeSecureRequest` | Call a manifest-declared endpoint with stored secrets |
| `executeGraphql` *(alpha)* | Run any query/mutation against the Frontify Public API |

> **`createAsset` payload shape:** `{ data: File \| Blob, filename: string, parentId: string }`.
> `parentId` is the library/folder where the new asset lands — on the
> `assetCreation` surface it comes from `context.parentId`. Earlier
> docs that say `createAsset` accepts a bare `File` are incorrect for
> `@frontify/app-bridge-app` v0.2.x.

For GraphQL data work, load `../frontify-graphql/SKILL.md`.

### App settings (`src/settings.ts`)

```ts
import { defineSettings } from '@frontify/platform-app';

export const settings = defineSettings({
  credentials: [
    { type: 'input',    id: 'apiBaseUrl', label: 'API base URL' },
    { type: 'dropdown', id: 'mode',
      label: 'Mode',
      defaultValue: 'standard',
      choices: [
        { value: 'standard', label: 'Standard' },
        { value: 'advanced', label: 'Advanced' },
      ],
    },
    { type: 'switch',   id: 'verbose', label: 'Verbose logs', defaultValue: false },
  ],
});
```

Valid setting types in `@frontify/platform-app` v0.1.x: `slider`,
`switch`, `textarea`, `input`, `colorInput`, `checklist`, `dropdown`,
`multiInput`, `notification`, `sectionHeading`, `segmentedControls`.
**There is no `select` type — use `dropdown`.**

Read and write at runtime with the `appSettings` helper or via
`appBridge.state('settings')`. The subscribe callback parameter is
typed as `unknown`; narrow with a known type:

```ts
const unsubscribe = appBridge
  .state('settings')
  .subscribe((next: unknown) => apply(next as MySettingsShape));
```

Settings UI is identical to Content Block settings except `Asset` and
`Color` inputs are unavailable.

### Secure requests (secrets)

For API keys and other sensitive values, declare a `secrets` array in
`manifest.json` and define an endpoint under `network.endpoints`. Call
the endpoint via `executeSecureRequest` — secrets are interpolated
server-side using `%%KEY%%` (static) and `$$dynamic-key$$` (per-call)
placeholders. For local testing, mirror the secret values in a
`.secret.json` file (gitignored).

### Scopes (permissions)

Declare in `manifest.json` under `permissions.scopes`. Available scopes:
`basic:read`, `basic:write`, `account:read`, `webhook:read`,
`webhook:write`. Admins must approve scopes before installation —
request only what you need. See
`../frontify-auth-app/references/scopes.md` for selection guidance.

---

## Canonical `manifest.json`

The complete shape — the agent should write this minimum for any new
App, then add `secrets[]` / `network.endpoints[]` only as needed.

```json
{
  "appId": "<APP_ID>",
  "appType": "platform-app",
  "name": "<app-slug>",
  "metadata": {
    "version": 1
  },
  "permissions": {
    "scopes": ["basic:write"]
  },
  "surfaces": {
    "mediaLibrary": {
      "assetCreation": {
        "title": "<Human-readable label>"
      }
    }
  }
}
```

Field notes (see also `../frontify-auth-app/references/manifest-permissions.md`):

- `appType` — exactly `"platform-app"` (NOT `"type"`).
- `name` — top-level slug. Required. Distinct from any `metadata.name`.
- `metadata.version` — integer; bump on every published change.
- Surface declarations use `"title"` (NOT `"label"`); `"icon"` is not
  part of the surface object.
- Marketplace metadata (description, screenshots, gallery icon) lives
  in the Marketplace listing UI, not in the manifest.

A wrong manifest validates as `policy '<name>' not fulfilled` — the
common culprit is `type` instead of `appType` or a missing top-level
`name`.

---

## App lifecycle

Brief orientation; the full reference is in
`references/app-lifecycle.md`. Read that file when the user asks how
the app is registered, how state is shared, or how teardown works.

1. **Registration** — an app is created on the Marketplace UI, which
   issues an **App ID**. Copy it into `manifest.json` under `appId`.
2. **Initialisation** — when a surface launches the app, Frontify
   instantiates an `AppBridge` and delivers the surface-specific
   `context` synchronously.
3. **State** — three stores: `settings` (admin-configured),
   `userState` (per-user), and surface context (read-only). All three
   support `.get()`, `.set()`, and `.subscribe()`.
4. **Teardown** — closing the modal unmounts the React tree; persistent
   data must be written to `userState` or via `createAsset` before
   teardown.

---

## Testing

- **Unit tests** — run with the framework chosen at scaffold time
  (Vitest is the CLI default). Mock `@frontify/app-bridge-app` to
  return surface-specific context fixtures.
- **Surface simulation** — for each surface, build a fixture matching
  the documented context shape (`AssetActionContext`,
  `AssetBulkActionsContext`, etc.) and inject it via your AppBridge
  mock.
- **Integration** — run the dev server and connect to a real Frontify
  Developer Sandbox. The dev-mode settings menu lets you simulate
  different admin configurations without redeploying.
- **Secure requests** — populate `.secret.json` locally so
  `executeSecureRequest` resolves placeholders in the dev environment.

---

## Marketplace deployment

### Prerequisites checklist

Before the agent attempts any deploy command, verify:

- [ ] `manifest.json` `appId` matches a Marketplace draft (registered in UI by the user).
- [ ] `metadata.version` is set and **bumped if previously published**
      (existing installs are version-pinned — see "After re-deploy" below).
- [ ] `permissions.scopes` is the minimum the App actually uses.
- [ ] Surface declarations use `"title"` (not `"label"`).
- [ ] No `<…>` placeholder strings remain in `manifest.json`,
      `package.json`, or `index.html`. Quick check:
      `grep -rn '<[A-Z_]\+>' manifest.json package.json index.html`
      — should return no results.
- [ ] Project contains all build-pipeline files: `eslint.config.js`,
      `index.html`, `terser` in devDeps, valid `tsconfig.json`.
- [ ] `tsc --noEmit` (i.e. `npm run lint`) is clean.
- [ ] `.gitignore` excludes `.secret.json`.

### CLI mechanics, build gates, and token hygiene → deployment skill

The cross-type deploy mechanics — personal access token setup,
`FRONTIFY_INSTANCE` / `FRONTIFY_TOKEN` env vars, the four build-pipeline
gates, network-egress requirements, the angle-bracket placeholder
convention, and token-leak hygiene / redaction — live in
`../frontify-deployment/SKILL.md`. Read that first; the App-specific
sections below assume it.

### `package.json` scripts (App scaffold defaults)

Wire `package.json` scripts to use the entry path explicitly (the CLI's
default `src/index.ts` does not match a TSX entry):

```json
{
  "scripts": {
    "serve": "frontify-cli serve --entryPath src/index.tsx",
    "deploy": "frontify-cli deploy --entryPath src/index.tsx --no-verify",
    "deploy:dry": "frontify-cli deploy --entryPath src/index.tsx --dry-run --no-verify",
    "publish": "frontify-cli publish",
    "verify-manifest": "frontify-cli verify-manifest",
    "lint": "tsc --noEmit"
  }
}
```

With `FRONTIFY_INSTANCE` and `FRONTIFY_TOKEN` exported per the deployment
skill:

```bash
npm run lint
npm run deploy:dry
npm run deploy

# Publish — user-discretion, irreversible visibility change.
npx frontify-cli publish \
  --availability PRIVATE \
  --release-notes "Initial release."
```

### Marketplace metadata + publish

After `deploy` lands a draft:

1. Marketplace UI → fill **Description** (Overview) and any required
   screenshots. The CLI's `publish` step refuses without these.
2. Run `frontify-cli publish --availability PRIVATE …` (the agent
   should default to PRIVATE; only switch to COMMUNITY when the user
   explicitly authorises external publication).
3. UI → **+ Install Platform app** on the target instance.

### After re-deploy: existing installs do NOT auto-upgrade

This is the most common "looks broken but isn't" failure mode during
iteration. Existing installs are **version-pinned** to the version that
was current at install time. Deploying and publishing a new version
puts a new version on the Marketplace **but does not upgrade any
installed copies.** The user's surfaces will keep running the old code
indefinitely.

To pick up changes after a re-deploy:

1. **Bump `metadata.version`** in `manifest.json` before deploying. A
   re-publish with the same version number is a no-op for installs.
2. **Re-deploy + re-publish** to make the new version available.
3. **Manually upgrade the install** in the Marketplace UI:
   Marketplace → open the App → **Versions** tab → click the install
   dropdown → **Upgrade**. Or, as a workaround: **Uninstall** then
   **+ Install Platform app** again.
4. **Hard-refresh the surface** that hosts the App
   (`Cmd-Shift-R` / `Ctrl-Shift-R` in the browser). The surface caches
   the old App bundle in the iframe; without a hard refresh, the new
   code won't load even after the install upgrade.

If a deploy succeeded but changes don't show up:

- Confirm the install version in Marketplace matches the version you
  just published (most often it doesn't — step 3 above wasn't done).
- Confirm browser cache was cleared (step 4).
- Confirm `metadata.version` was bumped (step 1).

> **Note:** the long stream of `HydrateFallback` / "Dialog is changing
> from uncontrolled to controlled" / "DialogContent requires a
> DialogTitle" warnings in the browser console comes from
> `frontify-vendors.js` — Frontify's own host frame, not the App.
> Filter them out when triaging your own logs.

---

## Handoff to shared resources

Load these skills on demand during app development:

- AppBridge auth methods, manifest scopes/secrets, `executeSecureRequest` → `../frontify-auth-app/SKILL.md`
- Reading or mutating Frontify data → `../frontify-graphql/SKILL.md`
- Rendering or transforming asset images returned from
  `getAssetResourceInformation` / `previewUrl` (resize, crop, focus,
  srcset, PDF previews, etc.) → `../frontify-media-processing/SKILL.md`
- Building UI to match Frontify visual style → `../frontify-fondue/SKILL.md`
  (only when Fondue was chosen in the orchestrator's UI-framework question
  — see the "UI framework" section above)
- CI / publishing automation → `../frontify-deployment/SKILL.md`
