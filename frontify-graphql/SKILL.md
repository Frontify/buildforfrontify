---
name: frontify-graphql
description: >
  Frontify Public GraphQL API reference for extension developers — endpoint,
  authentication, the global ID format, scopes, the most common queries
  (currentUser, brands, library, asset, node) and mutations (createAsset,
  updateAsset, addAssetTags, uploadFile…), pagination, beta-feature opt-in,
  and error handling. Load this skill before writing any query or mutation,
  before calling `executeGraphQl` from an App, or whenever the user asks
  what data Frontify exposes.
compatibility: Designed for Claude Code and similar agentic development tools.
metadata:
  author: Frontify
  version: "1.0"
---

# Frontify GraphQL

Frontify exposes a single **Public GraphQL API** at
`POST https://<your-domain>/graphql`. It is the canonical way to read and
mutate Brand, Library, Workspace, Asset, Collection, Folder, Workflow,
Comment, CustomMetadata, Account, User, ServiceApp, and Webhook data.
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

## When to use this skill

Load this skill the moment any of these come up:

- The user asks **what data they can read or write** from Frontify
- The user wants to **query** assets, brands, libraries, collections,
  guidelines, custom metadata, workflows, comments, or users
- The user needs to implement a **mutation** (create, update, delete,
  upload, tag, move, replace, publish)
- A query returns **errors**, `null` data, or unexpected shapes
- The user is building a **Service App** or webhook integration
- The user asks about **pagination**, **search/filter inputs**,
  **beta features**, or how Frontify **IDs** are encoded

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
| **External script (developer)** | Personal **Developer Token** — generated by navigating **directly** to `https://<your-domain>/oauth-access-token`. The page is **not linked from any UI menu** (older Frontify docs reference a profile / Applications path that has been removed). |
| **Backend integration** | **Service App** (machine-to-machine, OAuth Client Credentials) — created via `createServiceApp` mutation or the Marketplace |
| **End-user web app** | **OAuth 2** authorization code flow |

Required scopes are documented per query/mutation in the SDL (e.g.
`Required scopes: basic:read`). Available scopes:

`basic:read`, `basic:write`, `account:read`, `webhook:read`,
`webhook:write`. Load the auth skill that matches the caller:

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
  are deprecated.
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

### Two mutations you'll use everywhere

```graphql
# Update asset metadata (title, description, alternative text, tags…)
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

const response = await appBridge.api({
  name: 'executeGraphQl',
  payload: { query, variables: { id: brandId } },
});

// AppBridge returns the full GraphQL envelope: { data: { ... } }
const libraries = response.data?.brand?.libraries?.items ?? [];
```

`executeGraphQl` is currently flagged **alpha** in the AppBridge — the
shape may evolve. The query body itself follows the public schema
exactly.

**Response shape:** AppBridge passes through the full GraphQL envelope,
so always access your data under `response.data`:

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

Always use optional chaining (`response.data?.brand?.libraries`) — if
the query returns GraphQL errors, `data` may be `null` or the nested
field may be `null` while `errors` is populated. Check both:</p>

```ts
if (response.errors?.length) {
  console.error('GraphQL errors', response.errors);
}
const items = response.data?.brand?.libraries?.items ?? [];
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
variables and loop until `hasNextPage` is `false`:

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
| Singular query → single entity | `brand(id:)` |
| Plural query → list | `brands` |

---

## Full reference

The full SDL is split across topical files in
[`references/`](references/) so the agent can load only what it needs:

| File | Covers |
|---|---|
| [`references/schema-core.graphql`](references/schema-core.graphql) | Scalars, base interfaces (`Node`, `Asset`, `User`, `Comment`, `Marking`, `Attachment`), and shared value types (`Tag`, `Copyright`, `License`, `Target`, `Breadcrumb`, `RgbaColor`) |
| [`references/schema-assets.graphql`](references/schema-assets.graphql) | Concrete asset types (`Image`, `Video`, `Audio`, `Document`, `File`, `EmbeddedContent`), comments, markings, locations, permissions, asset mutation inputs |
| [`references/schema-brands-libraries.graphql`](references/schema-brands-libraries.graphql) | `Brand`, `Library`, `MediaLibrary`, `WorkspaceProject`, `Collection`, `Folder`, `Account`, user/collaborator types |
| [`references/schema-metadata-workflow.graphql`](references/schema-metadata-workflow.graphql) | `CustomMetadataProperty`, `CustomMetadata`, `MetadataField` (deprecated → 2026-07-01), `Workflow`, `WorkflowStatus`, `WorkflowTask`, checklist items |
| [`references/schema-creatives.graphql`](references/schema-creatives.graphql) | `CreativeTemplate`, `CreativeJob`, `CreativeExport`, external data sources, exporting |
| [`references/schema-platform.graphql`](references/schema-platform.graphql) | `ServiceApp`, `MarketplaceApp`, `ProjectWebhook`, `SecurityScope`, `AssetWebhookEvent`, related mutations |
| [`references/schema-operations.graphql`](references/schema-operations.graphql) | The full `RootQuery` and `RootMutation` — every available operation in one place |

### When to read which reference file

- Listing what queries and mutations exist → `schema-operations.graphql`
- Choosing the right field on an asset / image / video → `schema-assets.graphql`
- Walking from a `Brand` → `Library` → `Folder` → `Asset` → `schema-brands-libraries.graphql`
- Designing custom metadata or workflow integration → `schema-metadata-workflow.graphql`
- Exporting templates or working with the Creative API → `schema-creatives.graphql`
- Building a Service App / installing webhooks / publishing on the Marketplace → `schema-platform.graphql`
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

The argument is `query: AssetQueryInput`. Two distinct search surfaces
exist:

| Surface | Where | Status | Result envelope |
|---|---|---|---|
| **Library / Workspace search** | `library.assets(query:)` | Stable | `AssetItems { items }` |
| **Brand-level search** | `brand.search(query:)` | **Beta** (`X-Frontify-Beta: enabled`) | `edges.node` shape |

Search rules:

- All searches are **user-permission scoped** — different users may see
  different ranking and even different results.
- Hard cap of **10,000 results** per query. To enumerate everything in
  a library, paginate without a `query` argument.
- String search is **case-insensitive with partial matching** (`brand`
  matches `branding`, `brandbook`).
- Searched fields: title, OCR content (if enabled on the library),
  description, tags, legal metadata, custom metadata.
- **Exact phrase**: wrap in escaped quotes — `"\"business card\""`.
- **Boolean operators** in the search term: `AND`, `OR`, `NOT` —
  e.g. `logo AND guidelines`, `brandbook NOT outdated`.

Structured filters live under `query.filter` with `andConditions` /
`orConditions` arrays. Each condition is
`{ type, operator, value, customMetadataPropertyId? }`:

| `type` | `value` shape | Notes |
|---|---|---|
| `TAG` | `"EU-market"` | matches against asset tags |
| `CUSTOM_METADATA_VALUE` | `"logo"` | requires `customMetadataPropertyId` |
| `EXTERNAL_ID` | `"MY-EXTERNAL-ID"` | the asset's `externalId` field |
| `FILE_EXTENSION` | `"svg"` | exact extension match |

`operator` is `IS` (default) or `IS_NOT`.

```graphql
query LibrarySearch($id: ID!, $query: AssetQueryInput) {
  library: node(id: $id) {
    ... on Library {
      assets(page: 1, limit: 25, query: $query) {
        total
        items { id title }
      }
    }
  }
}
```

```json
{
  "id": "ey[Library]",
  "query": {
    "search": "logo",
    "filter": {
      "andConditions": [{
        "type": "CUSTOM_METADATA_VALUE",
        "operator": "IS",
        "value": "logo",
        "customMetadataPropertyId": "ey[AssetType]"
      }],
      "orConditions": [
        { "type": "TAG", "operator": "IS", "value": "EU-market" },
        { "type": "TAG", "operator": "IS", "value": "US-market" }
      ]
    }
  }
}
```

### Upload a new asset (three-step)

In Frontify an Asset is **not equal to a file** — most Assets wrap a
File but some don't. File uploads go directly to S3, so there is no
practical file-size limit.

**Step 1 — Initialise the upload.** `uploadFile(input: UploadFileInput!)`
returns a temporary file `id` and a list of presigned S3 `urls` (one
per chunk; the count depends on file size).

```graphql
mutation UploadFile($input: UploadFileInput!) {
  uploadFile(input: $input) { id urls }
}
```

Required scopes: `basic:read basic:write`.

**Step 2 — Upload binary content directly to S3.** For each URL, issue
a `PUT` with the corresponding chunk as the body and
`Content-Type: binary`. Compute chunk size as
`Math.ceil(fileSize / urls.length)` and stream the file with that as
the high-water mark.

**Step 3 — Use the file.** A file ID can be used **exactly once** in a
creation action. Pass it to `createAsset` with a base64-encoded
`parentId` (Library / WorkspaceProject / Folder ID — never the numeric
ID from the URL):

```graphql
mutation CreateAsset($input: CreateAssetInput!) {
  createAsset(input: $input) {
    job { assetId }
  }
}
```

```json
{
  "input": {
    "fileId": "<id from uploadFile>",
    "parentId": "ey[Library|Project|Folder]",
    "title": "Asset title",
    "description": "...",
    "externalId": "",
    "tags": [{ "value": "My-Tag" }]
  }
}
```

`createAsset` returns a **job** wrapping the eventual `assetId` — the
asset is created asynchronously. Poll the asset's `status`
(`PROCESSING`, `FINISHED`, `PROCESSING_FAILED`) before relying on
preview / download URLs.

The `externalId` (max 255 chars) is the recommended hook for sync
integrations — store your source-system ID there to avoid keeping a
separate mapping table.

**Allowed file types** depend on the destination:

| Destination | Allowed |
|---|---|
| `MediaLibrary`, `LogoLibrary`, `DocumentLibrary`, `Workspace`, Attachment | All except executables (`exe`, `dmg`, `cmd`, `sh`, `bat`, …) |
| `IconLibrary` | `svg` only |

For App-side asset creation that handles all three steps for you,
prefer the AppBridge `createAsset` API method (see
[`../frontify-app/SKILL.md`](../frontify-app/SKILL.md)).

### Custom metadata vs. legacy MetadataField

`MetadataField` / `MetadataValue` are **deprecated** with removal date
**2026-07-01**. New code must use `CustomMetadataProperty` /
`CustomMetadata` and the corresponding mutations
(`createCustomMetadataProperty`, `addCustomMetadata`, `setCustomMetadata`,
`removeCustomMetadata`, `updateCustomMetadataProperty`,
`deleteCustomMetadataProperty`,
`addCustomMetadataPropertyOptions`, `removeCustomMetadataPropertyOptions`).
If the user has existing `MetadataField` queries, plan a migration.

### Subscriptions

The current schema has **no `RootSubscription`** — there is no GraphQL
subscription transport. For real-time updates, use **Project Webhooks**
(`installProjectWebhook` / `configureProjectWebhook`) and subscribe to
`AssetWebhookEvent` events delivered to your `notificationUrl`. See
`schema-platform.graphql` for the full webhook surface.

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

The SDL in `references/` was generated from the introspection JSON via
`printSchema(buildClientSchema(...))`. To refresh it after a schema
change:

1. Run an introspection query against `https://<your-domain>/graphql`
   (with `X-Frontify-Beta: enabled` if you want beta types included)
2. Save the result to `schema.json`
3. Run `node -e 'const{buildClientSchema,printSchema}=require("graphql");
   const fs=require("fs");const j=JSON.parse(fs.readFileSync("schema.json","utf8"));
   fs.writeFileSync("schema.graphql",printSchema(buildClientSchema(j.data||j))+"\n")'`
4. Split `schema.graphql` back into the topical files in `references/`
   to keep the agent-friendly structure.

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
