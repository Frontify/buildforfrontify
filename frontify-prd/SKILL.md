---
name: frontify-prd
description: >
  Produces a tight, build-ready Product Requirements Document for a Frontify
  extension (App, Custom Block, or Theme). Two modes — **Lite** (5 lines for
  exploratory / single-surface / single-feature builds) and **Standard** (10
  sections, ~1 page, for multi-surface Apps, multi-feature scopes, third-party
  integrations, and team builds). The PRD is for **alignment with the agent
  before scaffolding** — not for stakeholder communication. Optimized to
  surface decisions that change *how the build runs* (extension type +
  surfaces, scopes, secrets, settings shape) and to feed directly into
  `frontify-tasks` for breakdown into ordered work.
compatibility: Designed for Claude Code and similar agentic development tools.
metadata:
  author: Frontify
  version: "1.0"
---

# Frontify PRD

Use this skill when the user wants to **align on what to build before any
code is written**. The output is a markdown document — saved to the project
root as `PRD.md` by default — that captures the minimum context the agent
and the user need to share to avoid drift during the build.

This skill is **not** a stakeholder-PRD skill. There are no personas,
market analyses, KPIs, GTM sections, or RACI charts. Those belong in a
different artifact for a different audience. Here, the user IS the
stakeholder and the agent IS the team — the document captures alignment,
not communication.

---

## When to use this skill

Run this skill when:

- The build will span more than a single afternoon
- The extension has multiple features or surfaces
- The user expresses uncertainty about scope ("I think we want…")
- A third-party API with credentials is in scope
- More than one developer will touch the project

Skip this skill when:

- The user wants to start coding immediately and the request is unambiguous
- The build is a single-line change or a single component
- The user already has a written brief — read that instead

When in doubt, propose **Lite** mode. It's faster than asking permission.

---

## Lite vs. Standard — decision rule

Use **Lite** when **all** of the following hold:

| Signal | Lite if… |
|--------|----------|
| Extension type + surface | One type, one surface (or N/A for Block/Theme) |
| Feature count | One main user flow |
| Third-party APIs | None, or public-no-auth only |
| Team | Solo developer / spike |
| Lifecycle | Exploratory / prototype / one-off |

Use **Standard** when **any** of these are true:

- Multi-surface App (e.g. `assetAction` + `assetCreation` + `assetBulkActions`)
- Multi-feature scope ("upload + transform + tag + sync")
- Calls a credentialed third-party API (auth + secrets in play)
- Will be maintained by multiple people
- Marketplace-published / sold externally
- User describes uncertainty about scope or stakeholders

Default to Lite when borderline. Upgrading Lite → Standard later costs
nothing; over-planning costs trust and momentum.

---

## Lite mode (≤ 5 lines)

Walk the user through five questions and write a 5-line PRD inline:

```markdown
# <name> — Lite PRD

**What:** <1 sentence — the extension and the outcome>
**Type:** <App / Block / Theme — and surface(s) if App>
**Flow:** <1 sentence happy-path — the user does X, then sees Y>
**Auth & data:** <Frontify scopes + any third-party APIs>
**Done when:** <1 sentence acceptance criterion>
```

Save to `./PRD.md`. Full Lite walkthrough and example in
`references/lite-template.md`.

---

## Standard mode (10 sections, ~1 page)

Walk the user through 10 sections **conversationally** — one at a time, not
all at once. Skip any section the user has already answered through prior
context. Push back on vagueness.

| # | Section | Purpose |
|---|---------|---------|
| 1 | Problem & users | Who, what pain, what better outcome (1 paragraph) |
| 2 | Extension type + surfaces | Drives all scaffolding — non-negotiable to nail early |
| 3 | Core user flow | Happy path as 5–8 numbered steps |
| 4 | Functional requirements | MVP vs. Later, prioritized |
| 5 | Data needs | Frontify entities + external APIs |
| 6 | Auth & security | Manifest scopes + third-party secrets |
| 7 | Settings & configuration | What the editor configures (maps to `defineSettings`) |
| 8 | Non-goals | Explicit: what we are NOT building |
| 9 | Acceptance criteria | How we know MVP is done |
| 10 | Open questions | Unknowns to resolve before/during build |

The full template, with prompt hints and sample copy per section, lives in
`references/standard-template.md`. A worked example for a multi-surface App
is in `references/example-app-prd.md` — load it when the user gets stuck on
"what does a good answer look like?".

---

## Workflow

```
1. Pick mode  ────────  Apply the decision rule above. State the choice
                         to the user; one quick chance to override.

2. Walk through ─────  Conversational, one section at a time. Don't
                         dump the template. Skip what's already known.

3. Push back ────────  Vague answers ("all assets", "users", "fast")
                         get sharpened. Name the entity, the role, the
                         number where possible.

4. Surface decisions ─ When section 2 (type/surface), section 6
                         (scopes), or section 7 (settings) lands,
                         note the downstream skill that will be loaded
                         (frontify-auth-app etc.) so the user can
                         course-correct early.

5. Save ──────────────  Write to ./PRD.md (or wherever the user prefers).
                         Confirm the path; don't assume.

6. Hand off ──────────  Offer ../frontify-tasks/SKILL.md for breakdown.
                         If the user wants to start coding, route to the
                         relevant type skill instead.
```

### Anti-patterns to avoid

- **Asking 10 questions in one turn.** Conversational, one section at a time.
- **Accepting "all assets" / "users" / "fast"** without sharpening. "Which
  assets — images only? videos? a specific library?" "Which users —
  editors, viewers, admins?"
- **Inventing requirements** the user didn't ask for. If unsure, list it
  in section 10 (Open questions) instead of section 4.
- **Filling in the PRD without the user.** This is alignment — silent
  authorship defeats the point.
- **Running this skill for a one-line change.** Skip it; route directly.

---

## What changes in the build because of the PRD

The PRD's value is concrete: each section maps to a build-time decision.

| PRD section | Drives |
|-------------|--------|
| 2 (type + surfaces) | CLI scaffold; `manifest.json` `surfaces`; which type skill loads |
| 6 (auth) | `manifest.json` `permissions.scopes` and `secrets[]`; which `frontify-auth-*` skill loads |
| 7 (settings) | `src/settings.ts` `defineSettings()`; which Fondue inputs to use |
| 5 (data) | Which `frontify-graphql` queries the agent will write |
| 8 (non-goals) | What the agent will *refuse* to scope-creep into |
| 9 (acceptance criteria) | The test plan |

Use these mappings when explaining to the user *why* a section matters.

---

## Reference index

| File | When to read |
|------|--------------|
| `references/lite-template.md` | Lite mode template + walkthrough hints + example |
| `references/standard-template.md` | Standard mode 10-section template + per-section guidance |
| `references/example-app-prd.md` | Worked Standard PRD for a multi-surface App |

## Handoff

After the PRD is written and confirmed:

- **Break it down into work** → `../frontify-tasks/SKILL.md`
- **Start coding directly** → load the matching extension type skill:
  - App → `../frontify-app/SKILL.md` (and `../frontify-auth-app/SKILL.md` for auth specifics)
  - Custom Block → `../frontify-custom-block/SKILL.md` (+ `../frontify-auth-block/SKILL.md`)
  - Theme → `../frontify-theme/SKILL.md` (+ `../frontify-auth-theme/SKILL.md`)
- **External integration** (not an in-platform extension) →
  `../frontify-auth-integration/SKILL.md`

The PRD is the agent's working memory for the rest of the build — keep
the file open and refer back to it when scope drift is suspected.
