# Build for Frontify

A bundle of **agent skills** for building extensions on the [Frontify](https://www.frontify.com) platform with AI coding tools (Claude Code, Cursor, and similar agentic development environments).

Each top-level folder is a self-contained skill — a `SKILL.md` plus optional `references/`, `scripts/`, and `assets/` — that an agent loads on demand to gain Frontify-specific knowledge for the task at hand. The skills cover scaffolding, authentication, the GraphQL API, the Media Processing CDN, the Fondue design system, deployment, and lightweight PRD/task planning.

---

## Quick start

Point your agent at this repository (or copy the skill folders into your agent's skill directory) and invoke the orchestrator:

```
/build-for-frontify
```

The orchestrator (`build-for-frontify/SKILL.md`) runs a short discovery dialogue — extension type, surface, project status, immediate goal, UI framework — then routes to the right type-specific skill and pulls in shared resources as needed.

If you already know what you're building, you can also load a type skill directly (for example, `frontify-app/SKILL.md`).

### Prerequisites

- **Node.js ≥ 22.14** (bundles `npm` and `npx`)
- **React Developer Tools** browser extension (required for HMR)
- A **Frontify account** with at least Editor permission, or a free Developer Sandbox
- Windows: **WSL 2**

---

## Repository layout

### Orchestrator

| Skill | Purpose |
|---|---|
| [`build-for-frontify/`](build-for-frontify/SKILL.md) | Entry point. Discovers what the user wants to build and routes to the right type and resource skills. |

### Extension type skills

| Skill | Use when building... |
|---|---|
| [`frontify-app/`](frontify-app/SKILL.md) | A **Frontify App** — React SPA running on platform surfaces (`assetAction`, `assetCreation`, `assetBulkActions`, `assetViewer`, `pageAction`, `themeAction`). |
| [`frontify-custom-block/`](frontify-custom-block/SKILL.md) | A **Custom Content Block** — guideline component built with the Brand SDK and placed on Brand Guideline pages. |
| [`frontify-theme/`](frontify-theme/SKILL.md) | A **Theme** — customizes the look and feel of Brand Guidelines via `AppBridgeTheme`. |

### Authentication (one per execution context)

| Skill | Context |
|---|---|
| [`frontify-auth-app/`](frontify-auth-app/SKILL.md) | Apps — AppBridge auth, scopes in `manifest.json`, `executeSecureRequest`, secrets, App User State. |
| [`frontify-auth-block/`](frontify-auth-block/SKILL.md) | Custom Blocks — block AppBridge, GraphQL via the host, scope model. |
| [`frontify-auth-theme/`](frontify-auth-theme/SKILL.md) | Themes — theme AppBridge, Guideline/Portal/Project/Brand context, `themeAction`. |
| [`frontify-auth-integration/`](frontify-auth-integration/SKILL.md) | External integrations — backend scripts, CI jobs, OAuth 2.0 client apps, Service Apps, personal tokens, raw bearer auth against `/api/oauth/*`. |

### Shared resources

| Skill | Topic |
|---|---|
| [`frontify-graphql/`](frontify-graphql/SKILL.md) | Public GraphQL API — endpoint, global IDs, common queries/mutations, pagination, beta flags. |
| [`frontify-media-processing/`](frontify-media-processing/SKILL.md) | URL-based image/video/PDF transforms on Frontify's CDN (`?mod=v1/...`). |
| [`frontify-fondue/`](frontify-fondue/SKILL.md) | Fondue — Frontify's component and design-token system. |
| [`frontify-deployment/`](frontify-deployment/SKILL.md) | Deploy mechanics — `FRONTIFY_INSTANCE` / `FRONTIFY_TOKEN`, build gates, Marketplace publishing. |

### Planning (optional)

| Skill | Use when... |
|---|---|
| [`frontify-prd/`](frontify-prd/SKILL.md) | Producing a tight Lite (5 lines) or Standard (~1 page) PRD before scaffolding. |
| [`frontify-tasks/`](frontify-tasks/SKILL.md) | Breaking a PRD into an ordered, actionable task list. |

---

## How skills are loaded

Skills follow the [SKILL.md](https://github.com/anthropics/skills) convention. Each `SKILL.md` starts with YAML front matter declaring `name` and `description`; the agent reads the description to decide whether to load the skill, then follows the Markdown body.

The orchestrator pattern in this repo is:

1. `build-for-frontify` runs discovery and selects an extension type.
2. It loads the matching type skill (`frontify-app`, `frontify-custom-block`, or `frontify-theme`).
3. As the build progresses, the agent **lazily** loads shared skills — auth, GraphQL, media processing, deployment, Fondue — only when the relevant topic comes up.
4. For non-trivial builds, `frontify-prd` and `frontify-tasks` can be invoked first to align on scope.

Skills are intentionally narrow and load on demand to keep the agent's context window focused on the work at hand.

---

## License

Skills authored by Frontify. See individual `SKILL.md` files for version and authorship metadata.
