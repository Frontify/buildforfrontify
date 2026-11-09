---
name: frontify-theme
description: >
  Build, iterate on, and debug custom Themes for Frontify Guidelines using the
  AppBridgeTheme from the Brand SDK, and answer what Frontify does or doesn't
  support in Themes. Loaded by the build-for-frontify orchestrator when the user
  chooses "Theme", or directly to modify, debug, or deploy an existing Theme. For
  NEW Theme projects, route through build-for-frontify first. Load whenever the
  user mentions Frontify themes, AppBridgeTheme, defineTheme, defineSettings,
  @frontify/app-bridge-theme, @frontify/guideline-themes, theme deploy, the
  Boilerplate or Muse themes, or is in a theme project (manifest.json with
  appType: "theme"). Also use for template types (cover, documentPage, library),
  setting blocks, theme navigation, the built-in Content and Footer components,
  and rule questions like "is X allowed" or "can I remove the footer". Prefer
  over generic React guidance: the theme runtime has specific conventions.
compatibility: Designed for Claude Code and similar agentic development tools.
metadata:
  author: Frontify
  version: "1.0"
---

# Frontify Theme

This skill covers everything about implementing, iterating on, and debugging
custom Themes for Frontify Guidelines using the `AppBridgeTheme` that ships with
the Brand SDK.

## What a Frontify theme actually is

A Frontify custom theme is a React + TypeScript project that exports a
`ThemeConfigExport` from `src/index.ts`. It is built, deployed to the Frontify
Marketplace as an app (`appType: "theme"`), and rendered inside a sandbox on
the Frontify platform. Your theme controls the **shell** — headers, sidebars,
navigation, footer placement, layout — while the platform renders the actual
guideline **content** (sections, blocks, assets) inside a provided `Content`
component.

The theme communicates with the platform exclusively through a single object:
an instance of `AppBridgeTheme` passed in as a prop. There is no `window`
access to Frontify's state, no direct API calls to the platform from the
theme. Everything flows through `appBridge.context(...)`,
`appBridge.state(...)`, and `appBridge.dispatch(...)`.

Three template types exist and all three must be exported: `cover`,
`documentPage`, `library`. Each can have a `default` variant plus any number
of named variants.

The CLI looks for the entry file at `src/index.ts` by default, for both
`serve` and `deploy`. Keep `defineTheme(...)` in `src/index.ts` and put JSX
in other files (as the boilerplate does). If the entry has to be for example
`src/index.tsx`, pass `--entryPath src/index.tsx` to `serve` and `deploy`
(or bake it into the `package.json` scripts), otherwise the CLI points at a
file that doesn't exist.

> Note: Unlike Custom Blocks and Apps, the Frontify CLI does **not** have a
> `theme create` command. The canonical scaffolding path is to download the
> official Boilerplate Theme and customise from there — see
> [Project setup](#project-setup) below.

---

## Before you start — load the orchestrator for new projects

If this is a **new** Theme (not yet scaffolded), also load
[`../build-for-frontify/SKILL.md`](../build-for-frontify/SKILL.md). It owns the
upstream concerns this skill assumes are handled:

- **Brand SDK prerequisites** — Node ≥ 22.14, React Developer Tools, Frontify
  account / sandbox, WSL 2 on Windows.
- **Frontify CLI install** — install with `npm install -g @frontify/frontify-cli`.
- **Build validation** — run `npx tsc --noEmit` and `npx eslint src` during
  iteration and before deployment.
- **Shared resource map** — when to load `frontify-graphql`, `frontify-deployment`. (Note: `frontify-fondue` is **not**
  used inside themes — see Rule B3 in `references/platform-rules.md`.)

For an **existing** Theme project (debugging, extending, deploying), you can
stay in this skill and reach for shared skills as the work demands.

---

## Decide where you are, then route

Before doing anything concrete, identify which mode you're in. The right next
action differs sharply between them:

1. **Scaffolding** — the user wants to start a new theme, or doesn't have a
   project yet. Common signals: "I want to build a theme for X", "how do I get
   started", "set up a new Frontify theme", or there's no `manifest.json` /
   `frontify-cli` setup visible.
   → Follow [Project setup](#project-setup) below, then read
   [`references/architecture.md`](references/architecture.md) to understand
   what you're building.

2. **Iterating** — the user has a working theme and wants to add features,
   change behavior, or refine settings. Common signals: they reference
   existing files in their theme, they want to "add a language switcher",
   "make the sidebar collapsible", "add a setting for X".
   → Read [`references/architecture.md`](references/architecture.md) (if not
   already loaded) for the mental model, then
   [`references/app-bridge-api.md`](references/app-bridge-api.md) for what's
   available on `appBridge`, then
   [`references/settings-and-defaults.md`](references/settings-and-defaults.md)
   if settings are involved. Grab ready-to-paste patterns from
   [`references/boilerplate-snippets.md`](references/boilerplate-snippets.md).
   If the change touches navigation, content ownership, or anything the
   platform might constrain, cross-check against
   [`references/platform-rules.md`](references/platform-rules.md) before
   writing code.

3. **Debugging** — something is broken or behaving unexpectedly. Common
   signals: "my theme isn't showing up", "the settings don't persist",
   "Content is empty", "I get a type error on ThemeProps", "the dev server
   connects but nothing renders".
   → Go straight to [`references/debugging.md`](references/debugging.md). It
   is organised by symptom and also covers setup and deploy failures.

4. **Rule / constraint / "is this allowed"** — the user is asking whether
   something is supported, what Frontify requires, or what will happen if they
   do X. Common signals: "can I remove the footer", "is cross-page settings
   access possible", "do I have to render Content", "what are the baseline
   requirements", "how does color persistence work across themes", "can
   editors override this".
   → Go to [`references/platform-rules.md`](references/platform-rules.md). It
   is the authoritative list of validity rules, baseline expectations, domain
   model rules, feature-gating, and hard limitations. Cite specific rule IDs
   (V* validity, B* baseline, D* domain, F* feature-gating, L* limitations,
   R* release, P* design principles) when answering so the user can look them
   up.

If the user's intent is ambiguous, ask a single clarifying question — don't
guess, because scaffolding, debugging, and rule advice have very different
shapes.

---

## Project setup

How to go from zero to a locally running theme connected to a real
guideline. There is no `theme create` command, so you start from the
Boilerplate Theme.

### Prerequisites

1. **Node.js and the Frontify CLI** — see the orchestrator for versions and
   install. Without a global install, use `npx @frontify/frontify-cli@latest`.
2. **React Developer Tools** — optional, but very helpful for debugging.
3. **Development mode enabled on the Frontify account.** This is the
   easy-to-miss one. Frontify's team has to turn it on — join the
   [Frontify Friends Slack community](https://frontify-friends.slack.com/)
   and ask them to enable dev mode for the account URL. Without it, the
   "Local Theme Development" app does not appear in the Marketplace and
   local development cannot work.

### 1. Install "Local Theme Development" in the guideline

1. Open `https://{YOUR_DOMAIN}/marketplace/type/theme` and install
   **Local Theme Development**.
2. Open the guideline to develop against → **Theme Settings** →
   **Layout and navigation** → **Theme chooser** → select
   **Local Theme Development**.
3. Enter the dev server port (default `5600`) and keep the tab open; you
   click **Connect** in step 4.

### 2. Get the boilerplate

The Boilerplate Theme is a separate download (Frontify developer docs →
"Sample Code"). Unzip or clone it into the project directory.

```
boilerplate-theme/
├── manifest.json              # appType: "theme", appId: placeholder
├── package.json               # scripts: serve, deploy, typecheck, test
├── src/
│   ├── index.ts               # defineTheme({ templates: { cover, documentPage, library } })
│   ├── FrontifyClassicTheme.tsx
│   ├── CoverPage.tsx, DocumentPage.tsx, LibraryPage.tsx
│   ├── settings.tsx, defaults.ts, types.ts
│   ├── components/            # Header, Navigation, Sidebar, Logo, LanguageSwitch
│   └── helpers/               # small focused utility functions
```

Rename the folder and update `package.json` `name`. Keep the
`/* (c) Copyright Frontify Ltd., all rights reserved. */` headers if you
build on Frontify code, or replace them with the user's own.

The boilerplate ships TypeScript, Vitest (`@testing-library/react` +
`happy-dom`), ESLint (`@frontify/eslint-config-react`), Prettier and
Tailwind with a `th-` prefix to avoid clashing with platform styles. Keep
these unless there is a strong reason to change them. Components that talk
to `appBridge` benefit from a mock bridge; see `setupTests.ts` in the
boilerplate.

### 3. Install dependencies and start the dev server

```bash
npm install
npm run serve
```

The output shows `Local: http://localhost:5600/`. The port defaults to
`5600` but the server picks another if it is in use — note the actual one.

### 4. Connect the guideline

In the guideline tab from step 1, enter the port (if not `5600`) and click
**Connect**. The guideline now renders your local theme and hot-reloads on
save.

### First-run sanity checks

If it connects but nothing renders, check these before assuming something
deeper is wrong:

- `src/index.ts` exports a `defineTheme(...)` default.
- All three templates (`cover`, `documentPage`, `library`) have a `default`
  variant. A missing one falls through silently.
- `<Content />` is rendered inside the `documentPage` variant.
- The guideline actually has published content. An empty guideline looks
  like a broken theme.
- The browser console shows no React errors from the theme.

For connection and white-page failures see
[`references/debugging.md`](references/debugging.md).

---

## Marketplace deployment

Deploying makes the theme available on the Frontify instance; publishing
lists it on the Marketplace. CLI authentication, token handling, build gates
and token-leak hygiene are shared across extension types and live in
[`../frontify-deployment/SKILL.md`](../frontify-deployment/SKILL.md) — read
that first. The theme-specific parts are below.

### Prerequisites checklist

- [ ] A theme entry exists in the Marketplace (created by the user in the
      UI) and its **Marketplace App ID** (also called Theme ID) is copied
      from the theme details page.
- [ ] `manifest.json` has that real id. The manifest accepts only `appType`
      and `appId` — **no `title`** or other metadata. Name and description
      are edited in the Marketplace UI.

      ```json
      {
        "appType": "theme",
        "appId": "{YOUR_MARKETPLACE_APP_ID}"
      }
      ```

- [ ] No `<…>` placeholder such as `<ADD_YOUR_MARKETPLACE_APP_ID_HERE>`
      remains in `manifest.json`.
- [ ] The entry file is `src/index.ts`, or `--entryPath` is passed to
      `deploy` (and `serve`) when it is `src/index.tsx`.
- [ ] `npx tsc --noEmit` and `npx eslint src` are clean.
- [ ] **The local dev server is stopped.** `frontify-cli login` does not work
      while `npm run serve` is running (true for every extension type, see
      the deployment skill). Stop the server, log in, then restart it
      afterwards if needed.

### Deploy

```bash
npx @frontify/frontify-cli@latest login --instance=your.domain.com
npx @frontify/frontify-cli@latest deploy
```

`login` opens a browser OAuth flow. For CI, or when the user prefers a
token, pass `--instance` and `--token` on `deploy` instead; the token needs
the scopes `basic:read`, `blocks:read` and `blocks:write`. See
[`../frontify-deployment/SKILL.md`](../frontify-deployment/SKILL.md) for how
to generate the token and keep it out of history and logs.

### Staging

Frontify does not support publishing a test-only version of a theme: once
deployed, everyone using that theme gets the new version. Workaround: create
a **separate Marketplace App ID for staging**, deploy the test build under
that id, assign it only to test guidelines, then deploy again under the
production id once validated.

### Publish to the Marketplace (user-discretion)

Publishing lists the theme for other Frontify customers, so do it only when
the user asks. In the Marketplace on the instance: find the theme → enter
edit mode → **Publish**.

### Install and select the theme

1. Install the theme from the Marketplace.
2. Open a guideline → **Theme Settings** → **Theme chooser** → pick the
   theme.

If changes don't show up after a deploy, see
[`references/debugging.md`](references/debugging.md).

---

## Things that are easy to get wrong

A few patterns trip people up repeatedly. Internalise these before writing
code. For the full, authoritative list of rules, see
[`references/platform-rules.md`](references/platform-rules.md).

- **`Content` and `Footer` are components passed in via props, not something
  you import.** You receive them on `ThemeProps` and render them in your
  layout. `Footer` can be `null` (the editor may have removed it), so render
  it conditionally. If you forget to render `Content` in a `documentPage`
  template, the page will look empty even though everything else works.
  *(Rules V3, V4.)*

- **Hooks over `.get()` for anything that changes.**
  `appBridge.context(key).get()` returns the current value but does not
  re-render when it updates. For anything that can change at runtime
  (language, isEditing, navigation, settings, scroll position), use the
  provided React hooks or `useSyncExternalStore`. Using `.get()` inside a
  component without a subscription is a very common source of "why doesn't
  it update" bugs.

- **`documentNavigation` must be hydrated before you can read it.** Unlike
  other context keys, `documentNavigation` is lazy. You must dispatch
  `hydrateContextDocumentNavigation(documentId)` first. The
  `useDocumentNavigation(appBridge, document)` hook does this for you —
  prefer it over manual hydration. *(Rule D7.)*

- **Every setting needs a `defaultValue`.** Themes can be applied to a
  guideline that has never been configured. Without defaults, components
  receive `undefined` and typically break layout. The platform docs call
  this out as a rule, not a suggestion. *(Rule V5.)*

- **The navigation tree is theme-agnostic.** You cannot restructure it, add
  custom node types, or reorder groupings from the theme. Design around
  `portalNavigation` + hydrated per-document navigation. This is a frequent
  request and the answer is "not supported" — point the user at the Frontify
  Friends Slack community if they need this. *(Rules D1, D3, L7.)*

- **Design for desktop first, hardcode mobile for now.** The docs explicitly
  note mobile support is not yet flexible. *(Rule L8.)*

- **Fondue is not used inside a rendered theme.** Frontify's design system
  is used by the platform when rendering the settings sidebar (you don't
  control that), but **not** for theme-specific components — your theme
  expresses your brand instead. Don't import Fondue into theme layout code.
  *(Rule B3.)*

---

## When writing or modifying code

A handful of tone/style defaults that match Frontify's own samples:

- TypeScript, strict mode, no `any` unless genuinely unavoidable. Import
  types with `import { type X } from '...'`.
- React function components with explicit prop types. Prefer
  `ReactElement | null` or an inferred return type.
- The Frontify file header comment
  `/* (c) Copyright Frontify Ltd., all rights reserved. */` appears in the
  official samples — include it at the top of new files in an existing
  Frontify project unless the user has their own convention.
- When the user has an existing theme, **match their existing patterns**
  (CSS approach, file structure, naming) rather than imposing the
  boilerplate's style. Read a few of their files first.
- Don't invent APIs. If you're not sure whether something exists on
  `AppBridgeTheme`, check
  [`references/app-bridge-api.md`](references/app-bridge-api.md) — that file
  is the source of truth for what `context()`, `state()`, and commands are
  actually available.

### Don't over-scaffold

When helping with a small change, resist the urge to rewrite the whole theme
or introduce new abstractions. The Frontify boilerplate intentionally uses
a lot of small focused files (`helpers/isPageActive.ts`,
`helpers/isDocumentActive.ts`, one helper per concept). That's the house
style. Follow it, but don't refactor the user's code into that style unless
they ask.

---

## Reference files

Load these as the situation calls for — don't read all of them upfront:

- [`references/architecture.md`](references/architecture.md) — How themes are
  structured: `defineTheme`, `ThemeProps`, templates, the three-layer model
  (platform / theme-agnostic / theme-specific), built-in `Content` and
  `Footer` components, project layout, settings flow, manifest. Read this
  early for any iteration or scaffolding task.
- [`references/app-bridge-api.md`](references/app-bridge-api.md) — The full
  surface of `AppBridgeTheme`: every context key, state key, command, and
  React hook, with signatures and common usage patterns. Read this whenever
  the user needs to read from or interact with the platform.
- [`references/settings-and-defaults.md`](references/settings-and-defaults.md)
  — `defineSettings`, setting block types, defaults, `templateSettings` /
  `templateAssets`, how settings flow from sidebar → `useSettings` →
  component. Read this whenever the user is adding, changing, or debugging a
  configurable setting.
- [`references/platform-rules.md`](references/platform-rules.md) — The
  authoritative list of platform rules, baseline requirements, Frontify
  domain model, feature-gating rules, hard limitations, and release/staging
  rules. Read this when answering "is this allowed", "does Frontify support
  X", "what happens if I do Y", or whenever you need to cite a specific
  constraint. Rule IDs are stable references: V* (validity), B* (baseline),
  D* (domain), F* (feature gating), L* (limitations), R* (release),
  P* (design principles).
- [`references/debugging.md`](references/debugging.md) — Symptom-indexed
  failure modes and diagnostic steps, including setup (dev server won't
  connect) and deploy failures. Start here whenever something is broken.
- [`references/boilerplate-snippets.md`](references/boilerplate-snippets.md)
  — Ready-to-adapt code patterns from the official boilerplate: Header,
  Navigation, Sidebar, Logo, LanguageSwitch, settings definitions. Pull
  from this instead of writing from scratch.

---

## Handoff to shared resources

When the user's task crosses out of the theme runtime itself, route to the
matching shared-resource skill:

- **Transforming asset images returned in `templateAssets`** (resize, crop,
  focus, format conversion, srcset, PDF previews) →
  [`../frontify-media-processing/SKILL.md`](../frontify-media-processing/SKILL.md).
  `assetInput` settings produce `Asset[]` values whose `previewUrl` /
  `dynamicPreviewUrl` can be transformed via the Media Processing CDN.
- **Deployment, OAuth tokens, CI/CD pipelines, Marketplace publishing
  workflow** → [`../frontify-deployment/SKILL.md`](../frontify-deployment/SKILL.md).
  [Marketplace deployment](#marketplace-deployment) above covers the
  theme-specific parts; the deployment skill covers CLI auth, tokens and
  the broader pipeline story.
- **OAuth scopes for token-based deployment**
  (`basic:read`, `blocks:read`, `blocks:write`) and any auth question about
  external tooling that talks to Frontify from outside the AppBridge sandbox
  (CI scripts, backend services) →
  [`../frontify-auth-integration/SKILL.md`](../frontify-auth-integration/SKILL.md).
- **Back to the orchestrator** if the user pivots to a different extension
  type (Custom Block, App) or wants planning help →
  [`../build-for-frontify/SKILL.md`](../build-for-frontify/SKILL.md).

Skills that **do not apply** inside a theme — call this out if the user
expects them:

- The **Frontify GraphQL API** is not reachable from a theme. Themes are
  sandboxed; the only interface is `AppBridgeTheme`. If the user wants data
  the bridge does not expose, that's a feature request, not a code change.
- **Fondue** is not used inside the rendered theme (Rule B3). The platform
  uses Fondue when rendering your declared settings sidebar; you do not.
