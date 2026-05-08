# Standard PRD Template

For multi-surface Apps, multi-feature scopes, credentialed third-party
integrations, and team builds. Ten sections, roughly one page of markdown.
Read this when you're walking the user through Standard mode — it
contains the template, the questions to ask, and what good answers look
like.

## Template skeleton

Save to `./PRD.md`. Sections **2, 6, 7** drive the most build-time
decisions — get those right before the agent scaffolds.

```markdown
# <extension-name> — PRD

## 1. Problem & users
<1 paragraph: who, what pain, what better outcome>

## 2. Extension type & surfaces
- **Type:** App / Custom Block / Theme
- **Surfaces (Apps only):** <list>
- **Why this type:** <1–2 sentences>

## 3. Core user flow
1. <step>
2. <step>
…

## 4. Functional requirements
### MVP
- [ ] <requirement>
### Later
- [ ] <requirement>

## 5. Data needs
- **Frontify entities:** <list>
- **External APIs:** <list>

## 6. Auth & security
- **Frontify scopes:** <list>
- **Third-party secrets:** <list>
- **Permission notes:** <e.g. "Editor role required to use">

## 7. Settings & configuration
| Field | Type | Default | Notes |
|-------|------|---------|-------|
| ... | ... | ... | ... |

## 8. Non-goals
- <thing we are explicitly NOT building>
- ...

## 9. Acceptance criteria
- [ ] <observable behaviour>
- ...

## 10. Open questions
- <question>
- ...
```

## Per-section guidance

### 1. Problem & users

> "In a paragraph — who is this for, what pain are we solving, and what
> does 'better' look like?"

Good answers:

- Name a **specific Frontify role** (Editor, Viewer, Admin, brand
  manager, designer, agency partner, …) — not "users"
- Name the **task or moment** the friction shows up in
- Name the **better outcome** in observable terms (saves time, removes a
  manual step, unlocks something previously impossible)

Push back on:

- "Users" → which role?
- "Better experience" → measured how?
- "Streamline X" → what specific step is removed?

### 2. Extension type & surfaces

This is the **most consequential** section — it determines the CLI
scaffold, the manifest, and which type skill loads next. Get it right
before any other section.

| Question | Mapping |
|----------|---------|
| Where does the user invoke it? | **assetAction** = on a single asset's "…" menu; **assetBulkActions** = after multi-select; **assetCreation** = "+ New" menu; **assetViewer** = within an asset's viewer in a Guideline; **pageAction** = top of a Guideline page; **themeAction** = a theme's action |
| Where does it appear visually? | An **App** lives in a modal; a **Custom Block** lives inline on a Guideline page; a **Theme** restyles a Guideline |
| Does it need to outlive a single page view? | App or external integration; not Block/Theme |

Capture both the choice **and** a one-sentence rationale ("App because we
need to act on a selected asset and write a replacement; Block won't work
because there's no Guideline involved").

If the user names a multi-surface App, list each surface and what triggers
it on each.

### 3. Core user flow

> "Walk me through the happy path — 5 to 8 numbered steps from the user's
> first action to a successful outcome."

Each step is **user does X → system does Y** in present tense:

- ✅ "Editor right-clicks an image asset and chooses 'Tag with AI'."
- ✅ "App opens a modal showing 5 suggested tags."
- ❌ "AI tagging happens." *(no actor, no observable boundary)*

If the flow has branches, capture the happy path here and put alternates
in section 10 (Open questions) for resolution.

### 4. Functional requirements

Two buckets — **MVP** and **Later** — as bulleted checkboxes. Be ruthless
about what's MVP. Each MVP item should be:

- A **capability** (not a UI detail) — "import assets from Dropbox"
- **Independent** — can be cut without making other items meaningless
- **Verifiable** — there's a clear yes/no on whether it works

Push back on these MVP smells:

- More than 5 items → probably scope creep
- Anything beginning with "Also it should…" added late in the conversation
- "Optional" items in the MVP list (move them to Later)

### 5. Data needs

Two columns:

| Frontify entities | External APIs |
|-------------------|---------------|
| Assets, Brands, Libraries, Projects, Guidelines, Pages, Custom Metadata, Workflows, Comments, Users, Webhooks | Service name + URL pattern + auth required |

For each Frontify entity, note **read** vs. **write** vs. **both**. This
maps directly to scope choice in section 6.

For each external API, note:

- The vendor / service
- Whether it's public-no-auth, key-based, or OAuth
- The endpoints used (one-line)

If the external API needs credentials, that's a section-6 problem.

### 6. Auth & security

Two halves:

**Frontify scopes** — pick the minimum. Available scopes:

| Scope | When you need it |
|-------|------------------|
| `basic:read` | Reading any brand/project/asset |
| `basic:write` | Creating, updating, or deleting any brand/project/asset |
| `account:read` | Reading user data beyond the current user's own ID |
| `webhook:read` | Inspecting webhooks |
| `webhook:write` | Installing/removing webhooks (also needs `basic:write` and Editor on the location) |

**Third-party secrets** — list each:

| Key (manifest) | Label (admin UI) | Source |
|----------------|------------------|--------|
| `THIRD_PARTY_API_KEY` | "Example Service API key" | Admin enters in Marketplace |

**Permission notes** — surface anything unusual: "Only admins can install
this", "Requires Editor on the target library", etc.

This section feeds directly into:

- `manifest.json` `permissions.scopes` and `secrets[]`
- Which `frontify-auth-{app,block,theme,integration}` skill loads
- Which Fondue inputs map to settings (excluding the secret values, which
  go in Marketplace Access Keys)

### 7. Settings & configuration

What does the **editor** configure when they install the App? Capture
each setting as a row:

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `outputFormat` | select | `png` | One of png, jpg, webp |
| `confirmBeforeReplace` | boolean | true | Show modal before destructive action |

Type values map to `defineSettings` widgets — `input`, `select`,
`switch`, `checklist`, `sectionHeading`, etc. Note that `Asset` and
`Color` inputs are **not available** in App settings (they're Custom
Block-only).

If a value is sensitive, **it doesn't go here** — move it to section 6
(secrets) and access via `executeSecureRequest`.

### 8. Non-goals

The single most under-used PRD section. Explicitly list what the
extension **will not do**, especially things the user might assume are
in scope. Examples:

- "Will not work with video assets — images only."
- "Will not modify guideline content — write paths are scoped to library
  assets."
- "No batch processing in MVP — single asset at a time."
- "Will not work for Viewers — Editor role is required."

This section is what the agent points back to when scope creep arrives.

### 9. Acceptance criteria

How do we know MVP is done? Each criterion is an **observable behaviour**,
not a feeling:

- ✅ "Selecting any image asset and clicking the action replaces it with
  a transparent-background PNG within 30 seconds."
- ✅ "Bulk-selecting up to 50 assets and triggering the action processes
  them all and shows a per-asset success/failure summary."
- ❌ "It works well." *(not observable)*
- ❌ "Users are happy." *(out of scope for build)*

One criterion per MVP item from section 4 is a good rule of thumb.

### 10. Open questions

What we don't know yet. Anything the conversation surfaced that
*depends on something else* — a stakeholder decision, a vendor capability,
a Frontify Alpha-surface enablement.

Each open question should name:

- The question
- Who or what answers it
- The deadline by which it must be answered (or "blocks build" if it
  must be answered before scaffolding)

If section 10 is empty, you probably skipped over something. Push back
on yourself — there's almost always at least one open question on a
real build.

## Section dependencies

```
1 (problem)  ──▶  2 (type)  ──▶  scaffolding
                    │
                    ├──▶  6 (auth)  ──▶  manifest scopes/secrets
                    │
                    └──▶  7 (settings)  ──▶  defineSettings()

3 (flow)  ───────▶  4 (requirements)  ───▶  ordered tasks
                          │
                          └──▶  9 (acceptance)  ───▶  test plan

5 (data)  ───────▶  GraphQL queries
8 (non-goals)  ──▶  scope-creep guard
10 (open)  ──────▶  resolve before / during build
```

If a section is hard to fill in, the dependent downstream artifact will
be brittle — section 2 vague → wrong scaffold; section 6 vague → wrong
scopes → broken installs; section 7 vague → settings UI gets reworked
mid-build.

## When to stop and write code

The PRD is done when:

- All 10 sections have at least *one* concrete answer (or "N/A" with a
  reason)
- Section 2 and section 6 are unambiguous (these never get to be vague)
- Section 9 (acceptance criteria) gives the user a clear yes/no on MVP
- The user has read it back and confirmed it matches their intent

At that point, save and hand off to `frontify-tasks` (for breakdown) or
straight to the type skill (for solo execution).

A PRD that sits open in the editor is doing its job — it's the alignment
artifact the agent reads from for the rest of the build.
