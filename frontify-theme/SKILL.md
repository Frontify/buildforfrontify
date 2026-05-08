---
name: frontify-theme
description: >
  Build, iterate on, and debug custom Themes for Frontify Guidelines using the
  AppBridgeTheme from the Brand SDK, and answer what Frontify does or doesn't
  support in Themes. Loaded by the build-for-frontify orchestrator when the user
  chooses "Theme", or directly when the user asks to modify, debug, or deploy an
  existing Theme. For NEW Theme projects, prefer routing through build-for-frontify
  first — it owns the project-bootstrap concerns (Brand SDK prerequisites, Frontify
  CLI install, optional PRD/tasks planning, and the shared resource skills map).
  Load this skill whenever the user mentions Frontify themes,
  AppBridgeTheme, defineTheme, defineSettings, @frontify/app-bridge-theme,
  @frontify/guideline-themes, the Frontify CLI's theme deploy, the Boilerplate
  or Muse themes, or is in a Frontify theme project (manifest.json with
  appType: "theme", src/index.ts exporting defineTheme, scripts like
  "frontify-cli serve" or "theme deploy"). Also use for template types
  (cover, documentPage, library), setting blocks, theme navigation, the
  built-in Content and Footer components, and rule/constraint questions like
  "is X allowed", "does Frontify support Y", "can I remove the footer", or
  "what are the baseline requirements". Prefer this skill over generic React
  guidance when Frontify is in the picture — the theme runtime has specific
  conventions that generic React advice gets wrong.
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

> Note: Unlike Custom Blocks and Apps, the Frontify CLI does **not** have a
> `theme create` command. The canonical scaffolding path is to download the
> official Boilerplate Theme and customise from there — see
> [`references/scaffolding.md`](references/scaffolding.md).

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
- **Optional PRD / tasks planning layer** — `frontify-prd` + `frontify-tasks`
  for any non-trivial theme (multi-template variants, custom navigation, team
  build).
- **Shared resource map** — when to load `frontify-auth-theme`,
  `frontify-graphql`, `frontify-deployment`. (Note: `frontify-fondue` is **not**
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
   → Read [`references/scaffolding.md`](references/scaffolding.md) for the
   setup flow, then [`references/architecture.md`](references/architecture.md)
   to understand what you're building.

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
   is organised by symptom.

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
- [`references/scaffolding.md`](references/scaffolding.md) — Local setup
  from zero: Node/CLI prerequisites, dev-mode activation, boilerplate
  download, manifest wiring, port connection, deployment. Read this for any
  "getting started" or "why won't my theme connect" situation.
- [`references/debugging.md`](references/debugging.md) — Symptom-indexed
  failure modes and diagnostic steps. Start here whenever something is
  broken.
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
  Mike's [`references/scaffolding.md`](references/scaffolding.md) covers the
  `frontify-cli deploy` / token-based deploy basics; the deployment skill
  covers the broader pipeline story.
- **Auth questions specific to Themes** (the AppBridge sandbox model, what
  the runtime gets for free, what's not reachable) →
  [`../frontify-auth-theme/SKILL.md`](../frontify-auth-theme/SKILL.md).
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
