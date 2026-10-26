---
name: build-for-frontify
description: Use when the user invokes /build-for-frontify or expresses intent to build
  an extension for the Frontify platform. Runs a short discovery dialogue to
  identify the extension type (custom block, theme, or app) and the user's
  immediate goal, then routes to the appropriate type-specific skill. Also
  surfaces shared resource skills (auth, GraphQL, deployment, design system).
compatibility: Designed for Claude Code and similar agentic development tools.
metadata:
  author: Frontify
  version: "1.0"
---

# Build for Frontify

You are helping the user build an extension for the **Frontify** platform.
Your first job is discovery — understand what they want to build. Your second
job is routing — load the right skills and resources for the task.

Keep your questions conversational. Do not ask all of them at once if context
already makes some answers obvious.

---

## Step 1 — Discovery

Ask the user the following, in natural conversation:

**1. Extension type** — which of these best describes what they want to build?

| Option | Description |
|--------|-------------|
| **Custom block** | Create custom guideline components to add functionality for Brand Guideline editors and viewers.|
| **Theme** |  Customize the look and feel of your guidelines by building a custom Theme that can be reused across Brand Guidelines. |
| **App** | Create React based single page apps that can be accessed by logged in users on surfaces or entry points including Asset Libraries and Brand Guidelines. |

**2. Surface (apps only)** — if the user chose App, which surface(s) will it run on?

Standard surfaces (always available):

- **`assetAction`** — triggered from the "…" action menu on an asset (image, video, file…). Context extends the base props with `assetId`, the unique identifier of the asset the action was invoked on.
- **`assetCreation`** — accessed from the "+ New" menu inside a project or library, used for apps that produce a new asset (e.g. AI image generation). Context contains only the base props.
- **`assetBulkActions`** — accessed from the bulk action bar after multi-selecting assets. Context adds a `selection` property listing the IDs of the selected assets and folders.

On-demand surfaces (request via the Frontify Friends Slack channel if not enabled in your environment):

- **`assetViewer`** *(Alpha)* — app icon at the top right of the Asset Viewer in a Guideline. Context provides `assetId`, `brandId`, `domain`.
- **`pageAction`** *(Alpha)* — app icon at the top right of a Guideline page. Context contains the base props.
- **`themeAction`** *(Alpha)* — invoked from a Guideline. Context provides `portalId`, `projectId`.

More than one surface is allowed; a single app can support multiple, declared in `manifest.json` under the relevant Frontify section (`mediaLibrary`, `iconLibrary`, `logoLibrary`, `documentLibrary`, `workspace`, `guideline`).

**3. Project status** — is this a new project or an existing codebase?

- New → you will scaffold it from scratch with the Frontify CLI
  (`npx @frontify/frontify-cli@latest create`)
- Existing → you will help extend or fix it; ask them to share relevant
  files (especially `manifest.json` and `src/`)

**4. Immediate goal** (optional, but useful) — what is the first thing they want to
achieve? Examples: "scaffold a project and install dependencies", "implement
a specific feature", "understand the API before writing code".

**5. UI framework (apps only)** — if the user chose App, ask which UI library
they want to use. Apps render inside Frontify chrome, so visual parity with
the rest of the platform is the dominant concern.

| Option | When it fits |
| --- | --- |
| **Fondue** *(recommended default)* | The user wants the app to feel native to Frontify, doesn't already have a design system, or is starting fresh. Fondue ships components, tokens, accessibility patterns, and a Tailwind preset out of the box. |
| **Other framework** (MUI, Chakra, Mantine, an in-house design system, plain CSS, …) | The user has an existing component library they need to reuse, has a strong brand-design reason to diverge, or the app is non-visual enough that the choice doesn't matter. They accept that matching Frontify's visual style is now their responsibility. |
| **Undecided** | Treat as Fondue unless the user pushes back; explain the trade-off in one sentence and move on. |

This question does not apply to Custom Blocks (where Fondue covers
editor-facing controls and brand styling drives block content) or Themes
(where Fondue is explicitly not used inside the rendered theme — see
`../frontify-theme/references/platform-rules.md`, Rule B3). Skip it for
those types.

Carry the answer forward into the App skill so per-type guidance honours the
choice (`../frontify-app/SKILL.md` → "UI framework").

### Prerequisite check (lightweight)

Before scaffolding, confirm the user has the Brand SDK prerequisites in
place. Don't interrogate — just mention them and ask if anything is
missing:

- **Node.js ≥ 22.14** (bundles `npm` and `npx`)
- **React Developer Tools** browser extension (required for HMR)
- A **Frontify account** with at least Editor permission, or a free
  Developer Sandbox
- Windows users: **WSL 2**
- **Frontify CLI** — install via npm: `npm install -g @frontify/frontify-cli`.
  This is required for scaffolding, development, and deployment.


### Verify command (build validation)

During development iteration, run the following checks to validate the build:

```bash
npx tsc --noEmit
npx eslint src
```

Use these frequently during development and always before committing to deployment.

---

## Step 2 — Routing

Once you have clarity, load the appropriate extension type skill **immediately**
by reading its `SKILL.md`. Do not wait for the user to confirm — proceed.

```
Custom block  →  read ../frontify-custom-block/SKILL.md
Theme         →  read ../frontify-theme/SKILL.md
App           →  read ../frontify-app/SKILL.md
```

After loading the type skill, follow its instructions. It will guide scaffolding,
dependency installation, and the development flow from that point forward.

---

## Step 3 — Shared resource skills

These skills are available across extension types. Load them **on demand** when
the relevant topic comes up — do not pre-load all of them upfront.

### Authentication (split per extension type)

Authentication varies sharply by extension type — there is no shared
`frontify-auth` skill. Route to the matching one based on Step 1:

```
App                →  ../frontify-auth-app/SKILL.md
Custom block       →  (no auth skill: blocks inherit the session; see ../frontify-custom-block/SKILL.md)
Theme              →  (no auth skill: themes inherit the session; see ../frontify-theme/SKILL.md)
External / script  →  ../frontify-auth-integration/SKILL.md
```

- **Apps, blocks, themes** run inside Frontify and inherit the user's session
  via AppBridge — no tokens to handle, but each has its own scope/permission
  model and (for Apps) a `secrets[]` + `executeSecureRequest` mechanism.
- **External integrations** (backends, CI jobs, OAuth client apps, Service
  Apps, personal developer tokens) handle raw bearer tokens against
  `https://{domain}/api/oauth/*` — load `frontify-auth-integration` for any
  caller that hits `/graphql` directly.
- **Hybrid case**: an App that calls a third-party API with secrets is **still
  an App** — load `frontify-auth-app` (specifically its
  `references/secure-requests.md`), not the integration skill.

### Other shared resources

```
GraphQL API (schema, queries, mutations, subscriptions)
  →  ../frontify-graphql/SKILL.md

Media Processing (URL-based image / video / PDF transformations on the CDN)
  →  ../frontify-media-processing/SKILL.md

Deployment (CI/CD, environments, versioning, publishing)
  →  ../frontify-deployment/SKILL.md

Fondue design system (installation, tokens, components)
  →  ../frontify-fondue/SKILL.md
```

**When to load each:**

- Load the matching auth skill (`frontify-auth-{app,integration}`; custom blocks and themes
  have none) the moment authentication, scopes, secrets, or token handling comes up.
- Load `frontify-graphql` before writing any API queries or when the user asks
  what data is available.
- Load `frontify-media-processing` whenever the user wants to render, resize,
  crop, focus, recolor, or otherwise transform a Frontify-hosted asset for
  delivery — or when they're working with `previewUrl` / `dynamicPreviewUrl`.
- Load `frontify-deployment` when the user asks about publishing, CI, or
  environment configuration. The deployment skill owns the cross-type CLI
  mechanics (personal access token setup, env vars, build-pipeline gates,
  token-leak hygiene) and routes per-type Marketplace specifics back to
  the matching extension skill.
- Load `frontify-fondue` when the user starts building UI or asks how to
  match Frontify's visual style **and** Fondue is in scope for the project:
  - **Apps** — only when the user chose Fondue in Step 1 question 5. If they
    chose another UI framework, do not auto-load `frontify-fondue`; rely on
    the user's chosen library and your general React/UI knowledge instead.
  - **Custom Blocks** — load it for editor-facing UI (settings forms,
    editor controls). For viewer-facing block content, defer to the brand
    styling the block author provides.
  - **Themes** — do not load. Fondue is not used inside the rendered theme
    (Rule B3 in the theme skill).

---

## Behavioural principles

- **Be a guide, not a gatekeeper.** Discovery should take one short exchange,
  not an interrogation. If the user says "I want to build a custom block",
  that's enough — start routing.
- **Load skills lazily.** Only pull in what the current step needs. The
  context window is shared with the actual code being written.
- **Favour action over planning.** Unless the user signals they want a plan
  first, move toward working code quickly.
- **Stay in scope.** This skill set covers Frontify extension development.
  For general TypeScript, React, or tooling questions that aren't
  Frontify-specific, answer from your own knowledge without loading
  additional skills.
- **Plan before non-trivial builds.** For multi-surface, multi-feature, or
  team builds, briefly align with the user on scope, surfaces, scopes,
  secrets, and settings shape before scaffolding — use your own planning
  capabilities; there is no dedicated planning skill.
