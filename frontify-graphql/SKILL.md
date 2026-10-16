---
name: frontify-graphql
description: >
  Query and mutate Frontify data through the Public GraphQL API at
  `POST https://<domain>/graphql`. ALWAYS apply this skill when writing
  any Frontify query or mutation, when calling `executeGraphql` from an
  App, when asking what data Frontify exposes, or when a Frontify query
  returns errors / null / unexpected shapes — even if the user does not
  name GraphQL explicitly. Do not invent GraphQL fields, input names,
  enums, scopes, or global IDs without first checking the Frontify
  schema. Skip this skill for media transformation (CDN URL modifiers),
  authentication / token handling, or non-Frontify GraphQL APIs.
compatibility: Designed for Claude Code and similar agentic development tools.
metadata:
  author: Frontify
  version: "1.0"
---

# Frontify GraphQL

Frontify exposes a single **Public GraphQL API** at
`POST https://<your-domain>/graphql`. It is the canonical way to read and
mutate Brand, Library, Workspace, Asset, Collection, Folder, Workflow,
Comment, CustomMetadata, Catalog, Guideline (pages, sections, blocks,
design settings), Brand Essentials, Creative Template, ServiceApp, and Webhook data.
The API is versionless and evolves through field-level deprecations
(announced in the changelog) and an opt-in **beta channel** for new
functionality.

For Apps, Themes, and Custom Blocks built with the Brand SDK, you almost
never call this endpoint directly — you use the AppBridge wrapper
`appBridge.api({ name: 'executeGraphQl', payload: { query, variables } })`
which forwards the call with the user's session. For external scripts,
backend integrations, and Service Apps you call the endpoint directly
with a bearer token.

---

For full type signatures, load the SDL split files in
[`references/`](references/) (see "Full reference" below).

---

## Non-negotiable rules

These rules apply to every query, mutation, and integration produced
under this skill. They override stylistic preferences and any
"reasonable-looking" output the agent might be tempted to fabricate.

1. **Never invent GraphQL fields, input names, enum values, scopes, or
   response shapes.** If you can't find it in the local SDL or the
   online reference, it does not exist — ask the user, don't guess.
2. **Always verify against the schema before producing
   production-ready GraphQL.** Two sources of truth, in order:
   (1) the local SDL files in [`references/schema-*.graphql`](references/),
   (2) the online [Frontify GraphQL Reference](https://frontify.github.io/graphql-reference)
   (check its "Last updated" date if the local SDL might be stale).
3. **Treat `Beta` fields and mutations as unstable.** When using any
   field marked `**BETA**` or `**PREVIEW**`, send the
   `X-Frontify-Beta: enabled` header (or toggle "Beta Features" in the
   GraphQL Explorer) and add a code comment marking the call as beta
   so it's easy to find when the API stabilises or breaks.
4. **Use GraphQL variables for all non-trivial queries and mutations.**
   Never inline user-supplied values into the query string — pass them
   through `variables` to keep queries cacheable, type-checked, and
   safe.
5. **All external GraphQL requests require an authenticated bearer
   token.** The exception is calls made from inside an App / Theme /
   Block via `appBridge.api({ name: 'executeGraphQl' })`, where the
   AppBridge handles auth — do not add manual `Authorization` headers
   in that path.
6. **Store tokens, client IDs, and client secrets only in
   environment variables.** Never hard-code secrets into source files,
   queries, or `manifest.json`. For Apps specifically, declare them in
   the `secrets` array of `manifest.json` and mirror local values in
   `.secret.json` (gitignored) — see
   [`../frontify-app/SKILL.md`](../frontify-app/SKILL.md).
7. **Every mutation has exactly one `input` argument and returns a
   dedicated payload type.** The shape is always
   `mutationName(input: <Name>Input!): <Name>` with the payload type
   wrapping the resulting entity (e.g. `UpdateAsset { asset: Asset }`,
   `CreateAsset { job { assetId } }`). Don't generate flattened
   argument lists or assume a top-level entity is returned directly.
   A few mutations return a **union** (`deleteGuidelinePageSection`,
   `removeCatalogColumns`, `removeCatalogRows`) — select with inline
   fragments for every member. Bulk mutations such as `updateAssets`
   report per-item failures in the payload instead of in `errors[]`.
8. **Prefer minimal scopes.** Request only the scopes the task
   actually needs. `basic:read` covers most reads; add `basic:write`
   only for mutations; only request `account:read`, `webhook:read`,
   `webhook:write` when those domains are in scope. Broad scopes
   require explicit admin approval and slow down installation.

---

## Quick reference

### Endpoint

```
POST https://<your-domain>/graphql
Content-Type: application/json
Authorization: Bearer <token>
```

`<your-domain>` is the customer's Frontify domain — it can be
`<tenant>.frontify.com` or a fully custom domain. Apps running inside
Frontify don't need to construct this URL; the AppBridge handles it.

The request body is `{ query: string, variables?: object }`.

### Authentication

| Caller | Token source |
|---|---|
| **App / Theme / Block** (in-platform) | Implicit — call `appBridge.api({ name: 'executeGraphQl', payload: { query, variables } })`. Auth is the logged-in user. |
| **External script (developer)** | Personal **Developer Token** — generated by navigating **directly** to `https://<your-domain>/oauth-access-token`. The page is **not linked from any UI menu**. |
| **Backend integration** | **Service App** (machine-to-machine, OAuth Client Credentials) — created via `createServiceApp` mutation or the Marketplace |
| **End-user web app** | **OAuth 2** authorization code flow |

Required scopes are documented per query/mutation in the SDL (e.g.
`Required scopes: basic:read`). Available scopes:

`basic:read`, `basic:write`, `account:read`, `webhook:read`,
`webhook:write` (the `SecurityScope` enum). 

Load the auth skill that matches the caller:

- External integrations / Service Apps / OAuth Clients / personal tokens →
  [`../frontify-auth-integration/SKILL.md`](../frontify-auth-integration/SKILL.md)
- Apps using AppBridge `executeGraphql` →
  [`../frontify-auth-app/SKILL.md`](../frontify-auth-app/SKILL.md)
- Custom Blocks → [`../frontify-auth-block/SKILL.md`](../frontify-auth-block/SKILL.md)
- Themes → [`../frontify-auth-theme/SKILL.md`](../frontify-auth-theme/SKILL.md)

### Global IDs

All IDs are **globally unique, opaque, Base64-encoded** strings starting
with `ey…`. They encode `{"identifier": <int>, "type": "<entity>"}`,
e.g. `eyJpZGVudGlmaWVyIjozLCJ0eXBlIjoiYnJhbmQifQ==`.

- **Always pass the encoded ID** — accept numeric IDs nowhere new; they
  are deprecated. A few fields declare `String` instead of `ID`
  (e.g. `GuidelineColorScheme.id`, some `colorSchemeId` inputs). The
  values are still normal global IDs — copy them exactly as returned.
- The `node(id: ID!): Node` query resolves any ID to its concrete type
  via inline fragments (`... on Library { name }`).

### Scalars

Shared scalar definitions live in
[`references/schema-core.graphql`](references/schema-core.graphql).

Important formats:

- `DateTime`: RFC 3339 date-time string with millisecond precision, e.g.
  `2001-12-31T22:10:30.000+00:00`.
- `Url`: absolute URL string.
- `Email`: email address string.
- `BigInt`: large integer value.
- `JsonObject`: JSON object, not a JSON-encoded string.

When passing scalar values, use GraphQL variables. Do not inline dates,
URLs, emails, or JSON into query strings.

### Three queries you'll use everywhere

```graphql
# 1. Who am I?
query CurrentUser {
  currentUser {
    ... on AccountUser { id email name avatar }
  }
}

# 2. List brands available to the account
query Brands {
  brands { id name }
}

# 3. Fetch any node by ID (works for assets, libraries, projects, folders…)
query NodeById($id: ID!) {
  node(id: $id) {
    id
    ... on Library {
      name
      assets(limit: 25, page: 1) { total hasNextPage items { id title } }
    }
    ... on Image {
      title
      filename
      previewUrl
    }
  }
}
```

### Mutations you'll use everywhere

```graphql
# Update ONE asset (title, description, alt text, author, dates, copyright…)
mutation UpdateAsset($input: UpdateAssetInput!) {
  updateAsset(input: $input) {
    asset { id title description }
  }
}

# Tag an asset
mutation AddAssetTags($input: AddAssetTagsInput!) {
  addAssetTags(input: $input) {
    asset { id tags { value source } }
  }
}
```

Both require `basic:write` and `Asset` permission level `EDIT`.

**Updating many assets? Use `updateAssets`, not a loop** — see
[Bulk-update assets](#bulk-update-assets-updateassets) below
(full recipe: [`references/recipe-bulk-update-assets.md`](references/recipe-bulk-update-assets.md)).

### Calling from an App (AppBridge)

```ts
import { AppBridgePlatformApp } from '@frontify/app-bridge-app';

const appBridge = new AppBridgePlatformApp();

const query = /* GraphQL */ `
  query BrandLibraries($id: ID!) {
    brand(id: $id) {
      id
      name
      libraries(page: 1, limit: 25) {
        total
        items { type: __typename id name }
      }
    }
  }
`;

const { data, errors } = await appBridge.api({
  name: 'executeGraphQlWithFullResponse',
  payload: { query, variables: { id: brandId } },
});

if (errors?.length) console.error('GraphQL errors', errors);
const libraries = data?.brand?.libraries?.items ?? [];
```

Use **`executeGraphQlWithFullResponse`** — it resolves the full
`{ data, errors }` envelope. The older `executeGraphQl` is deprecated:
it resolves only `data`, so top-level GraphQL `errors` are silently
dropped (see [`../frontify-auth-app/SKILL.md`](../frontify-auth-app/SKILL.md)).
The query body itself follows the public schema exactly.

Always use optional chaining — if the query returns GraphQL errors,
`data` may be `null` or a nested field may be `null` while `errors` is
populated:

```json
{
  "data": {
    "brand": {
      "id": "ey...",
      "name": "Brand name",
      "libraries": {
        "total": 1,
        "items": [{ "type": "MediaLibrary", "id": "ey...", "name": "Library name" }]
      }
    }
  }
}
```

### Calling from a script (curl)

```bash
curl -X POST https://<your-domain>/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"query":"query { currentUser { ... on AccountUser { id email } } }"}'
```

### Testing against real data

Prefer direct testing when the environment has credentials and network
access. Direct testing is allowed when:

- `FRONTIFY_DOMAIN` is set, e.g. `customer.frontify.com`
- `FRONTIFY_GRAPHQL_TOKEN` is set
- The query is read-only, or the user explicitly approved a mutation
- Network access is available

Use GraphQL variables and never print tokens. Do not ask the user to paste
access tokens into chat; ask them to set environment variables or run the
provided command locally.

```bash
curl -sS "https://${FRONTIFY_DOMAIN}/graphql" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${FRONTIFY_GRAPHQL_TOKEN}" \
  --data '{"query":"query CurrentUser { currentUser { ... on AccountUser { id email name } } }"}'
```

For beta fields or mutations, include:

```bash
-H "X-Frontify-Beta: enabled"
```

When direct testing is not possible, provide the query, variables JSON,
required headers, expected response shape, and instructions for the user to
run it in the GraphQL Explorer / Public API Explorer.

### Pagination

Frontify uses **page + limit** (offset-style). Every paginated field
returns an `Items` envelope:

```graphql
type AssetItems {
  total: Int!
  page: Int!
  limit: Int!
  hasNextPage: Boolean!
  items: [Asset]!
}
```

Defaults: `limit = 25`, `page = 1`. Maximum `limit` is **100**. Use
variables and loop until `hasNextPage` is `false`. Exceptions:

- **Cursor-paginated** — `searchAssets` and `assetsByExternalId` return
  `{ items, nextCursor, hasNextPage }` (no `page`/`total`); pass
  `nextCursor` back as `cursor` until it is `null`.
- Some beta fields have different bounds/defaults (e.g. Brand Essentials
  and catalog `columns` default to `limit: 100`; `catalog.window`
  clamps to 50). Check the field's arguments in the SDL.
- `guideline.contentSearch` returns only `{ items, hasNextPage }`.

Page/limit example:

```graphql
query PaginateLibraryAssets($libraryId: ID!, $page: Int!, $limit: Int!) {
  library: node(id: $libraryId) {
    ... on MediaLibrary {
      assets(page: $page, limit: $limit) {
        total
        hasNextPage
        items { ... on Image { id filename previewUrl } }
      }
    }
  }
}
```

### Beta / preview features

To use fields marked `**BETA**` or `**PREVIEW**` in the schema, add the
header:

```
X-Frontify-Beta: enabled
```

In the GraphQL Explorer, toggle **Beta Features** — it sets the header
automatically. Beta APIs can change without warning and don't follow the
regular changelog cadence.

### Errors

Every GraphQL response returns HTTP **200** unless authentication or the
server itself fails. Field-level errors appear in an `errors` array
alongside (possibly partial) `data`:

```json
{
  "errors": [
    {
      "message": "Invalid identifier.",
      "locations": [{ "line": 5, "column": 3 }],
      "path": ["project"],
      "extensions": { "category": "validation" }
    }
  ],
  "data": { "currentUser": { "id": "ey…" }, "project": null }
}
```

| HTTP | Meaning | Action |
|---|---|---|
| **200** + `errors[]` | GraphQL-level error (validation, permission, businessLogic, internal, graphql) | Inspect `extensions.category` and `path` |
| **401** | Token invalid / expired / revoked | Refresh or re-issue token |
| **5xx** | Server error | Retry with backoff; report to Frontify support if persistent |

Errors propagate up to the **nearest nullable parent** — so a failure
deep inside an asset query may simply null out that branch while sibling
fields keep their data. Always inspect both `data` and `errors`.

### Naming conventions cheatsheet

| Concept | Convention | Example |
|---|---|---|
| Types / Unions / Interfaces / Enums | `UpperCamelCase` | `Asset`, `MediaLibrary`, `AssetStatusType` |
| Inputs | `UpperCamelCase` ending in `Input` | `UpdateAssetInput`, `AssetQueryInput` |
| Fields | `camelCase` | `currentUser`, `customMetadata` |
| Date fields | suffix `At` | `createdAt`, `expiresAt` |
| Permission fields | prefix `can` | `canEdit`, `canDownload` |
| Mutations | verb-first | `createAsset`, `updateFolder`, `addAssetTags`, `removeAssetLicense` |
| Enum constants | `UPPER_SNAKE_CASE` | `MEDIA_LIBRARY`, `FINISHED` |
| Queries | singular → one entity, plural → list | `brand(id:)`, `brands` |
| Paginated fields | `…Items` envelope | `AssetItems`, `CollectionItems` |
| Search / bulk inputs | `…FilterInput`, `…SearchInput` | `AssetSearchInput`, `AssetUpdateEntryInput` |

---

## Full reference

The full SDL is split across topical files in
[`references/`](references/) so the agent can load only what it needs:

| File | Covers |
|---|---|
| [`references/schema-core.graphql`](references/schema-core.graphql) | Scalars, base interfaces (`Node`, `Asset`, `User`, `Comment`, `Marking`, `Attachment`), and shared value types (`Tag`, `Copyright`, `License`, `Target`, `Breadcrumb`, `RgbaColor`) |
| [`references/schema-assets.graphql`](references/schema-assets.graphql) | Concrete asset types (`Image`, `Video`, `Audio`, `Document`, `File`, `EmbeddedContent`), `searchAssets` filter inputs, `updateAssets` inputs, comments, markings, locations, permissions, variants, revisions, asset mutation inputs |
| [`references/schema-brands-libraries.graphql`](references/schema-brands-libraries.graphql) | `Brand`, `Library` (+ `MediaLibrary`/`LogoLibrary`/`IconLibrary`/`DocumentLibrary`), `Workspace`, `Collection`, `Folder`, `Account`, user/collaborator types |
| [`references/schema-metadata-workflow.graphql`](references/schema-metadata-workflow.graphql) | `CustomMetadataProperty`, `CustomMetadata`, `Catalog*` types, `MetadataField` (deprecated; removal date 2026-07-01 passed), `Workflow`, `WorkflowStatus`, `WorkflowTask`, checklist items |
| [`references/schema-creatives.graphql`](references/schema-creatives.graphql) | `Guideline*` (pages, sections, blocks, navigation, design settings, color schemes), `BrandEssentials*`, `CreativeTemplate`, `CreativeExport` |
| [`references/schema-platform.graphql`](references/schema-platform.graphql) | `ServiceApp`, `ProjectWebhook`, `SecurityScope`, `AssetWebhookEvent`, marketplace publishing |
| [`references/schema-operations.graphql`](references/schema-operations.graphql) | The full `RootQuery` and `RootMutation` — every available operation in one place |

### Recipes

Longer worked examples live next to the schema files:

| File | Use for |
|---|---|
| [`references/recipe-search-assets.md`](references/recipe-search-assets.md) | `searchAssets` filters, sorting, cursor pagination, legacy search |
| [`references/recipe-bulk-update-assets.md`](references/recipe-bulk-update-assets.md) | `updateAssets` input, null semantics, per-asset failures |
| [`references/recipe-upload-asset.md`](references/recipe-upload-asset.md) | Three-step upload, `createAsset` options, allowed file types |

### When to read which reference file

- Listing what queries and mutations exist → `schema-operations.graphql`
- Choosing the right field on an asset / image / video, or building `searchAssets` filters / `updateAssets` input → `schema-assets.graphql`
- Walking from a `Brand` → `Library` → `Folder` → `Asset` → `schema-brands-libraries.graphql`
- Designing custom metadata, catalogs, or workflow integration → `schema-metadata-workflow.graphql`
- Reading/editing guidelines, brand essentials, or exporting templates → `schema-creatives.graphql`
- Building a Service App / installing webhooks / Marketplace → `schema-platform.graphql`
- Resolving any ID to a concrete type, or looking up a base interface → `schema-core.graphql`

If the user asks about a specific field or mutation by name and you're
unsure which file holds it, grep the `references/` folder.

---

## Common patterns

### Resolve an ID to its concrete type

```graphql
query Resolve($id: ID!) {
  node(id: $id) {
    id
    type: __typename
    ... on Library { name }
    ... on Image   { title filename previewUrl }
    ... on Video   { title filename previewUrl }
    ... on Folder  { name }
  }
}
```

### Search assets in a library

**Prefer `searchAssets`** for anything beyond a simple listing. Full
recipe (filters, sorting, pagination, caveats, examples, legacy search):
[`references/recipe-search-assets.md`](references/recipe-search-assets.md).

| Surface | Where | Status | Result envelope |
|---|---|---|---|
| **`searchAssets`** | `library.searchAssets(input:)` / `workspace.searchAssets(input:)` | Stable | `{ items nextCursor hasNextPage }` — cursor-paginated |
| **`assetsByExternalId`** | `library.assetsByExternalId(externalId:, cursor:, limit:)` | Stable (needs edit access to the Library) | `{ items nextCursor }` |
| Legacy list/search | `library.assets(query: AssetQueryInput)` | Stable, **legacy** | `AssetItems { items total … }` |
| Brand-level search | `brand.search(query:)`, `brand.enhancedSearch(query:)` | **Beta** | `edges`/`items` |
| Account-level search | `account.search(query:)` | **Beta** | `AccountSearchItems` |

Essentials: `input: AssetSearchInput!` needs `limit` and `sortBy`;
`filters` entries are AND-ed with exactly one key each; keep `filters` and
`sortBy` identical across pages when passing `cursor`. Results come from a
search index and are eventually consistent (up to ~10 min) — use
`asset(id:)` for read-after-write.

### Bulk-update assets (`updateAssets`)

Updates many assets in one call,
each with its own values — prefer it over looping `updateAsset` /
`addAssetTags` / `setCustomMetadata`. Full recipe with query and example
input:
[`references/recipe-bulk-update-assets.md`](references/recipe-bulk-update-assets.md).

- Input: `projectId` (the Library/Workspace holding **all** assets) plus
  `assets: [{ id, data }]`.
- **Omitted field = untouched; explicit `null` = clear.**
- **No rollback**: always inspect `status`, `failedAssets` and
  `fieldErrors[].code`. An asset absent from `failedAssets` was fully
  applied.

### Upload a new asset (three-step)

An Asset is **not equal to a file**. Uploads go directly to S3. Full
recipe with queries, chunking and allowed file types:
[`references/recipe-upload-asset.md`](references/recipe-upload-asset.md).

1. `uploadFile(input: { filename, size })` → temporary file `id` plus
   presigned S3 `urls` (one per chunk). Scopes: `basic:read basic:write`.
2. `PUT` each chunk to its URL (`Content-Type: binary`).
3. Use the file `id` **exactly once** — e.g. `createAsset` with `fileId`
   and a base64 `parentId` (Library / Workspace / Folder). It returns a
   **job** with the eventual `assetId`; poll `status` before relying on
   preview/download URLs.

`externalId` (max 255 chars) is the recommended hook for sync
integrations. For App-side uploads prefer the AppBridge `createAsset`
method (see [`../frontify-app/SKILL.md`](../frontify-app/SKILL.md)).

### Custom metadata vs. legacy MetadataField

`MetadataField` / `MetadataValue` and their mutations
(`createMetadataField`, `deleteMetadataField`,
`addAssetMetadataFieldValue`, `removeMetadataValue`) are **deprecated
with removal date 2026-07-01 — that date has passed**, so assume they
may already be gone. Never write new code against them; migrate
existing queries (`Asset.metadataValues` → `Asset.customMetadata`,
`Library.metadataFields` → `Library.customMetadataProperties`).

Use `CustomMetadataProperty` / `CustomMetadata` and
`createCustomMetadataProperty`, `updateCustomMetadataProperty`,
`deleteCustomMetadataProperty`, `addCustomMetadataPropertyOptions`,
`removeCustomMetadataPropertyOptions`, plus the value mutations:

| Goal | Use |
|---|---|
| Add values (keep others) on assets/workspaces | `addCustomMetadata` |
| **Overwrite** values for the given properties: same values on many parents, workspaces, or `CATALOG` properties (beta) | `setCustomMetadata` |
| **Overwrite** values on assets, different values per asset (can be combined with tags, status, …) | `updateAssets` → `customMetadata` |
| Remove values | `removeCustomMetadata` |

`customMetadata` on an asset is an **interface**; select with inline
fragments (`... on CustomMetadataValue { value }`,
`... on CustomMetadataValues { values }`,
`... on CustomMetadataCatalogValue { … }`). Property `type` is also an
interface (`CustomMetadataPropertyTypeSelect { options { id value } }`,
…). `CustomMetadataInput.value` is the untyped `Any` scalar: scalar for
single-value types, a list of option IDs for `MULTISELECT`, and an entry
list for `CATALOG` — see the field description in the SDL.

### Catalogs (beta)

`Catalog` is a table (columns, rows, cells) that custom-metadata
properties of type `CATALOG` can point at. Read via `catalog(id:)`,
`account.catalogs`, `catalog.window` (paged rectangular slice),
`searchCells`, `cellsByPrimaryKey`; write via `createCatalog*`,
`setCatalogCells`, `ingestCatalogRows` (upsert, positional by
`columnIds`), `removeCatalogRows`/`Columns` (`SAFE` mode returns the
in-use blockers instead of deleting). All beta; see
`schema-metadata-workflow.graphql`.

### Guidelines (beta)

The schema now exposes guideline content for reading **and** writing:
`brand.guidelines` → `Guideline` (`navigation`, `pages`, `colorSchemes`,
`designSettings`, `availableBlockTypes`, `contentSearch`), page structure
(`GuidelinePage` → `sections` → `elements` = heading | block | block
reference), `guidelinePage(id:)`, `guidelinePageBlock(id:)`, and
mutations to create/update/delete documents, groups, libraries, links,
pages, sections, headings and blocks, toggle navigation visibility,
publish/unpublish pages, and edit design settings. Pass `language`
(enum) **or** `locale` (`"de"`, `"de-DE"`) at the highest level of the
query for translated content. Block `settings` are validated against the
block type's `settingsSchema` (`availableBlockTypes`) — fetch it before
`createGuidelinePageBlock`. Everything here is beta; see
`schema-creatives.graphql`.

### Other things the API exposes

| Need | Look at |
|---|---|
| AI provenance / C2PA of an asset | `Asset.provenance` (beta) |
| Version history | `Asset.revisions` |
| Logo/Icon variants | `Asset.variants`, `createAssetVariant`, `replaceAssetVariant`, `deleteAssetVariant` |
| Targets (audience) | `account.targets`, `addLibraryAssetTargets` / `setLibraryAssetTargets` / `removeLibraryAssetTargets` (beta, max 100 ids) |
| Brand fonts & colours | read: `brand.essentials`; edit: `create`/`update`/`delete`/`move`/`repositionBrandEssentialsColor`, `…ColorPalette`, `removeBrandEssentialsFontFamily`/`FontStyle`, `installBrandEssentialsSelfhostedFontFormats` (all beta) |
| Creative export | `creativeTemplate`, `exportCreative`, `creativeExport` |

### Subscriptions

The current schema has **no `RootSubscription`** — there is no GraphQL
subscription transport. For real-time updates, use **Project Webhooks**
(`installProjectWebhook` / `configureProjectWebhook`) and subscribe to
`AssetWebhookEvent` events delivered to your `notificationUrl`. See
`schema-platform.graphql` for the full webhook surface.

---

## Deprecated — don't use in new code

| Deprecated | Use instead |
|---|---|
| `project(id:)`, `Brand.projects` | `library(id:)` / `workspaceProject(id:)`, `Brand.libraries` / `Brand.workspaceProjects` |
| `subFolders` (on `Folder`, `LibraryRootFolder`, …) | `folders` |
| `assetCount` | `assets.total` |
| `Asset.metadataValues`, `Library.metadataFields`, `MetadataField` mutations | Custom metadata (above) |
| `DeleteAsset.asset`, `DeleteCollection.collection`, `DeleteComment.comment`, `DeleteAttachment.attachment` | the returned `id` |
| `User.avatar` / `User.email` on the interface | `... on AccountUser { avatar email }` |
| `Collection.isPrivate` | — |
| `CreativeTemplate.assetId`, `CreativeTemplate.brandId` | removal 2027-01-01 |

---

## Tooling

### Online references (authoritative — check first if local SDL might be stale)

- **[Frontify GraphQL Reference](https://frontify.github.io/graphql-reference)**
  — the canonical, auto-generated reference for every type, query,
  mutation, input, enum, scalar, interface, and union. Includes
  per-field `Beta` / `Deprecated` flags and required scopes. Check
  the "Last updated on" date at the top of the page to know when the
  schema was last published.
- **[GraphQL Explorer / Public API Explorer](https://frontify.github.io/public-api-explorer)**
  — Frontify's GraphiQL-based Explorer for browsing docs and running
  queries with live authentication. Introspection must be enabled for the
  Frontify account. Toggle **Beta Features** to send
  `X-Frontify-Beta: enabled` automatically.

When to prefer which:

| Situation | Use |
|---|---|
| Looking up a type, field, or input shape while writing code | Local SDL in `references/` (fastest, offline) |
| Verifying a field exists or checking deprecation status | [Online reference](https://frontify.github.io/graphql-reference) — most current |
| Testing a query against real data with env credentials and network available | Direct request to `https://${FRONTIFY_DOMAIN}/graphql` |
| Testing a query when credentials/network are unavailable to the agent | User-run GraphQL Explorer / Public API Explorer (`https://frontify.github.io/public-api-explorer`) |

### Local schema

The SDL in `references/` was generated from the **beta-channel**
introspection JSON via `printSchema(buildClientSchema(...))`, so it
includes beta types. It goes stale whenever Frontify ships new fields —
if a field you need is missing, check the
[online reference](https://frontify.github.io/graphql-reference) before
concluding it doesn't exist. To refresh it after a schema
change:

1. Run an introspection query against `https://<your-domain>/graphql`
   (with `X-Frontify-Beta: enabled` if you want beta types included)
2. Save the result to `schema.json`
3. Run `node -e 'const{buildClientSchema,printSchema}=require("graphql");
   const fs=require("fs");const j=JSON.parse(fs.readFileSync("schema.json","utf8"));
   fs.writeFileSync("schema.graphql",printSchema(buildClientSchema(j.data||j))+"\n")'`
4. Split `schema.graphql` back into the topical files in `references/`
   (use `printType` per type and keep each type in the file that already
   owns it; new types go to the file matching the table above).
5. If a new type doesn't clearly fit any file in the table, **don't drop
   it and don't guess silently**: put it in the closest file and warn the
   user which types were placed by judgement, so they can confirm.

Notes: file headers (leading `#` lines) need a hand edit when a file's
scope changes. Afterwards, re-check the examples in this file against the
new SDL.

---

## Handoff

- For OAuth flows, Service Apps, Developer Tokens, and scopes (external
  integrations) →
  [`../frontify-auth-integration/SKILL.md`](../frontify-auth-integration/SKILL.md)
- For calling GraphQL from inside an App via the AppBridge →
  [`../frontify-auth-app/SKILL.md`](../frontify-auth-app/SKILL.md)
  (or the App skill itself: [`../frontify-app/SKILL.md`](../frontify-app/SKILL.md))
- For Custom Blocks calling GraphQL through the bridge →
  [`../frontify-auth-block/SKILL.md`](../frontify-auth-block/SKILL.md)
- For Themes calling GraphQL through the bridge →
  [`../frontify-auth-theme/SKILL.md`](../frontify-auth-theme/SKILL.md)
- For transforming `previewUrl` / `dynamicPreviewUrl` returned from
  asset queries (resize, crop, focus, format conversion, srcset, PDF
  rendering, etc.) →
  [`../frontify-media-processing/SKILL.md`](../frontify-media-processing/SKILL.md)
- For deploying the integration that uses these queries →
  [`../frontify-deployment/SKILL.md`](../frontify-deployment/SKILL.md)
