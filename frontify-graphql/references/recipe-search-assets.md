# Search assets in a library

Loaded from [`SKILL.md`](../SKILL.md). Pick the surface that fits;
**prefer `searchAssets`** for anything beyond a simple listing.

| Surface | Where | Status | Result envelope |
|---|---|---|---|
| **`searchAssets`** | `library.searchAssets(input:)` / `workspace.searchAssets(input:)` | Stable | `LibrarySearchAssetsResult { items nextCursor hasNextPage }` — cursor-paginated |
| **`assetsByExternalId`** | `library.assetsByExternalId(externalId:, cursor:, limit:)` | Stable (needs edit access to the Library) | `{ items nextCursor }` |
| Legacy list/search | `library.assets(query: AssetQueryInput)` | Stable, **legacy** | `AssetItems { items total … }` |
| Brand-level search | `brand.search(query:)`, `brand.enhancedSearch(query:)` | **Beta** | `edges`/`items` |
| Account-level search | `account.search(query:)` | **Beta** | `AccountSearchItems` |

## `searchAssets` (typed filters, deep pagination)

`input: AssetSearchInput!` — `limit` and `sortBy` are **required**.

| Field | Notes |
|---|---|
| `searchTerm` | Free text. When set, only the first **10,000** matches are reachable. |
| `filters` | List of `AssetSearchFilterInput`. Entries are AND-ed. **Exactly one key per entry**; repeat a key to add a second condition on it. |
| `folderId`, `isRecursive` | Scope to a folder; `isRecursive` defaults to `true`. |
| `sortBy` | `{ key, direction }` — keys: `RELEVANCE`, `TITLE`, `CREATED`, `LAST_MODIFIED`, `FILE_CREATION_DATE`, `FILE_EXTENSION`, `AVAILABLE_FROM`, `AVAILABLE_UNTIL`, `MANUAL`; direction `ASCENDING`/`DESCENDING`. |
| `cursor` | `nextCursor` of the previous page. **`filters` and `sortBy` must stay identical** between pages — changing them is not detected and gives undefined results. |

Filter keys (each takes a typed input; most accept `isAny` / `isNotAny`,
and multi-value fields also `is` / `isNot` / `isEmpty` / `isNotEmpty`):
`tags`, `extension`, `creatorId`, `collectionId`, `licenseId`,
`targetId`, `workflowStatusId`, `copyrightStatus`, `orientation`,
`assetAvailability`, `createdDate`, `modifiedDate`, `fileCreatedDate`,
`beginDate`, `expiryDate` (date filters: `isAfter` / `isBefore` /
`isBetween`), `customMetadataValue` (`{ propertyId, condition }`; values
are plain strings — dates `YYYY-MM-DD`, select options by **text** not id,
catalog by display value), and booleans `hasDescription`,
`hasCopyrightNotice`, `hasMissingMetadata`, `isDownloadProtected`.

Caveats:

- Backed by a **search index** — results are eventually consistent.
  A just-created/edited/deleted asset can take up to ~10 minutes to show
  up. Don't use it to read-after-write; use `asset(id:)` for that.
- Sorting by `LAST_MODIFIED` or filtering on `modifiedDate` while
  paginating can duplicate or skip assets that change mid-walk.
- Search is permission-scoped per user.

```graphql
query SearchAssets($libraryId: ID!, $input: AssetSearchInput!) {
  library(id: $libraryId) {
    searchAssets(input: $input) {
      hasNextPage
      nextCursor
      items { id title ... on Image { previewUrl } }
    }
  }
}
```

```json
{
  "libraryId": "ey[Library]",
  "input": {
    "limit": 50,
    "searchTerm": "logo",
    "sortBy": { "key": "LAST_MODIFIED", "direction": "DESCENDING" },
    "filters": [
      { "tags": { "isAny": ["EU-market", "US-market"] } },
      { "extension": { "isAny": ["svg", "png"] } },
      { "customMetadataValue": {
          "propertyId": "ey[AssetType]",
          "condition": { "isAny": ["logo"] } } },
      { "createdDate": { "isAfter": "2026-01-01T00:00:00.000Z" } },
      { "workflowStatusId": { "isNotEmpty": true } }
    ]
  }
}
```

Next page: resend the same `input` plus `"cursor": "<nextCursor>"`.

## Legacy `library.assets(query:)`

Still works and still the simplest way to page through *everything* (no
`query`), but its filter is limited. Rules:

- Permission-scoped; hard cap of **10,000** results when a `query` is used.
- String search is case-insensitive with partial matching; exact phrase
  via escaped quotes (`"\"business card\""`); `AND` / `OR` / `NOT` work.
- Searched fields: title, OCR content (if enabled), description, tags,
  legal metadata, custom metadata.
- Structured filters live under `query.filter` as `andConditions` /
  `orConditions`, each `{ type, operator, value, customMetadataPropertyId? }`
  with `type` ∈ `TAG`, `CUSTOM_METADATA_VALUE` (needs
  `customMetadataPropertyId`), `EXTERNAL_ID`, `FILE_EXTENSION`,
  `METADATA_VALUE` (legacy, needs `metadataFieldId`) and `operator`
  `IS` (default) / `IS_NOT`.

```graphql
query LibrarySearch($id: ID!, $query: AssetQueryInput) {
  library(id: $id) {
    assets(page: 1, limit: 25, query: $query) {
      total
      items { id title }
    }
  }
}
```

For external-system sync use `assetsByExternalId` instead of an
`EXTERNAL_ID` condition — it's cursor-based and has no result cap.
