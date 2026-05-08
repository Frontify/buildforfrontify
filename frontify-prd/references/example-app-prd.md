# Worked Example — Standard PRD for a Multi-Surface App

A complete Standard-mode PRD for a representative multi-surface App so the
agent has a concrete reference point. Use this when the user gets stuck on
"what does a good answer look like?" — point at the relevant section here.

The example: an App that imports assets from a third-party stock service
(authenticated via API key) into the user's Library, with both
single-asset and bulk-creation flows.

---

```markdown
# stock-import — PRD

## 1. Problem & users

**Editors** in Frontify libraries currently leave Frontify when they need
stock imagery — they download from a stock provider, switch tabs back to
Frontify, and upload manually. This breaks flow, drops the original asset
metadata (license, source URL, photographer credit), and creates a
needle-in-a-haystack search problem when the same stock photo is
re-uploaded by a different editor a month later.

The App lets editors search a stock provider directly from the Library's
"+ New" surface, preview results, and import selected images **into the
current Library** with metadata preserved. Better outcome: zero
context-switch, license & credit attached as Custom Metadata,
deduplication via the `source-url` metadata field.

## 2. Extension type & surfaces

- **Type:** App
- **Surfaces:**
  - `assetCreation` — primary entry point; "+ New → Stock import"
  - `assetBulkActions` — secondary; "Find similar stock" using selected
    assets as search seeds (Later — not MVP)
- **Why this type:**
  App because the work is asset-creation-flavoured (writes new assets) and
  needs a modal-style search/preview UI. A Custom Block doesn't fit — there's
  no Guideline involved. A Theme is unrelated.

## 3. Core user flow

1. Editor in a Library clicks **"+ New" → "Stock import"**.
2. App opens a modal with a search bar and recent searches.
3. Editor types a query; results render in a 3-column grid with previews.
4. Editor clicks one or more thumbnails to mark for import.
5. Editor clicks **"Import selected"**; App calls the stock provider API
   (server-side, via `executeSecureRequest`) to fetch full-resolution
   images.
6. For each selected image, App calls `createAsset` with the image data
   and attaches Custom Metadata: `source`, `source-url`, `license`,
   `photographer`.
7. App shows per-image success/failure status; on completion, closes the
   modal and the Library refreshes.

## 4. Functional requirements

### MVP

- [ ] Search the stock provider by free-text query
- [ ] Render results in a paginated grid (24 per page, infinite scroll)
- [ ] Multi-select via thumbnail click; selection counter visible
- [ ] Bulk import selected assets into the **current** Library
- [ ] Persist source URL, license, photographer as Custom Metadata fields
- [ ] Per-asset success/failure feedback during import
- [ ] Settings: API key (secret), default license filter

### Later

- [ ] `assetBulkActions` "Find similar" entry point seeded by selected
      assets
- [ ] Filter by orientation, colour, size
- [ ] Auto-tag imported assets using existing AI-tag App if installed
- [ ] Deduplication check ("This image is already in the library at …")

## 5. Data needs

- **Frontify entities:**
  - **Library** (read) — context (which library is the user in?)
  - **Asset** (write) — `createAsset` mutation per imported image
  - **CustomMetadata** (write) — attach license/source/photographer to
    each created asset
  - **CurrentUser** (read) — for activity logging
- **External APIs:**
  - Stock provider REST API at `https://api.stockservice.example/v2/`
    — endpoints: `GET /search`, `GET /photos/{id}/download`
  - Auth: API key in `X-API-Key` header (key-based, single static key
    per install)

## 6. Auth & security

- **Frontify scopes:**
  - `basic:read` — read Library context
  - `basic:write` — `createAsset`, attach Custom Metadata
- **Third-party secrets:**

  | Key | Label | Source |
  |-----|-------|--------|
  | `STOCK_API_KEY` | "Stock service API key" | Admin enters in Marketplace Access Keys |

- **Permission notes:**
  - Editor role required on the target Library (enforced by Frontify on
    `createAsset`; the App should also gate the import button on the
    current user's `LibraryUserPermissions.canCreateAsset`).
  - Admin-only install — the Authorize permissions dialog should mention
    that the App writes to all libraries the user has access to.

## 7. Settings & configuration

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `defaultLicense` | select | `royalty-free` | Filter results by license type at search time |
| `attributionTemplate` | input | `Photo by {photographer} via {source}` | Inserted into asset description on import |
| `confirmOnLargeImport` | switch | true | Show confirmation modal when importing > 10 assets |

Secret (NOT in settings — see section 6):
- `STOCK_API_KEY` — admin-managed via Marketplace Access Keys

## 8. Non-goals

- Will not edit existing assets — import-only.
- Will not work outside the current Library context — no cross-library
  bulk import in MVP.
- Will not handle video — images only (PNG, JPG, WebP).
- Will not enforce paid-tier limits on the stock provider — assumes the
  configured API key has sufficient quota.
- No "favourites" / saved searches in MVP.
- Will not run for Viewers — Editor or Owner role required.

## 9. Acceptance criteria

- [ ] In a Library, "+ New → Stock import" opens the App's modal within
      2 seconds.
- [ ] A free-text search returns results within 5 seconds for queries
      that match common stock keywords.
- [ ] Selecting 1–25 results and clicking "Import" creates all assets in
      the current Library; license, source URL, and photographer appear
      as Custom Metadata on each.
- [ ] If the third-party API returns an error, the import surfaces a
      per-asset error message and does not roll back already-imported
      assets.
- [ ] Settings can be changed by the admin; the next search reflects the
      new default license filter.
- [ ] Without `STOCK_API_KEY` configured, the App opens with a clear
      "API key not configured — ask your admin" empty state.

## 10. Open questions

- **Custom Metadata schema** — does the target Library already have
  fields named `source`, `source-url`, `license`, `photographer`, or
  do we need to create them on first install? (Owner: PM. Resolution:
  before scaffolding, decide whether the App auto-creates the schema.)
- **Stock provider rate limits** — what's the quota on a typical paid
  plan, and how should we throttle to avoid 429s? (Owner: integration
  partner. Resolution: before MVP go-live.)
- **Bulk import upper bound** — is 25 the right cap, or should it scale
  with library size? (Owner: design. Resolution: during build —
  acceptable to ship MVP at 25.)
- **License filter values** — what are the allowed values from the
  stock API and how do we map them to `defaultLicense` options?
  (Owner: product. Resolution: before scaffolding settings.ts.)
```

---

## Why this example works

- **Section 2 nails type + surfaces** with a one-sentence rationale that
  rules out the alternatives.
- **Section 3** is concrete (system actor named, GraphQL methods named).
- **Section 4** has a tight MVP (7 items) and clearly deferred Later
  items.
- **Section 6** uses both halves: scopes AND secrets; calls out admin
  install behaviour.
- **Section 7** keeps secrets *out* — they live in section 6.
- **Section 8** (non-goals) is **explicit** about scope cuts that the
  user might otherwise drift into.
- **Section 9** is **observable** — every criterion has a clear yes/no
  test.
- **Section 10** has owners and resolutions; nothing is "we'll figure it
  out later".

When walking a user through Standard mode, point them at this example for
any section they're stuck on. It's faster than explaining the abstract
guidance.
