# Bulk-update assets (`updateAssets`)

Loaded from [`SKILL.md`](../SKILL.md).

Updates many assets in one
call, **each with its own values**. Prefer it over looping `updateAsset`
/ `addAssetTags` / `setCustomMetadata`.

```graphql
mutation UpdateAssets($input: UpdateAssetsInput!) {
  updateAssets(input: $input) {
    status                       # SUCCEEDED | PARTIALLY_SUCCEEDED | FAILED
    updatedAssets { id title }
    failedAssets {
      id
      code                       # ASSET_NOT_FOUND | ASSET_NOT_EDITABLE (whole asset skipped) or null
      fieldErrors { field code id }
    }
  }
}
```

```json
{
  "input": {
    "projectId": "ey[Library|Workspace]",
    "assets": [
      { "id": "ey[Asset1]",
        "data": {
          "title": "New title",
          "description": null,
          "addTags": [{ "value": "approved" }],
          "removeTags": [{ "value": "draft" }],
          "customMetadata": [
            { "propertyId": "ey[Prop]", "value": { "text": "Campaign A" } },
            { "propertyId": "ey[Select]", "value": { "optionIds": ["ey[Option]"] } }
          ],
          "workflowStatus": { "id": "ey[Status]" }
        } }
    ]
  }
}
```

Semantics to get right:

- `projectId` is the Library/Workspace containing **all** assets.
- **Omitted field = untouched; explicit `null` = clear** (for `title`,
  `description`, `author`, `alternativeText`, `beginsAt`, `expiresAt`,
  `filename`, `copyrightNotice`, `workflowStatus`, a custom-metadata
  `value`). `isDecorative` and `copyrightStatus` do **not** accept
  `null` (`UNKNOWN` is the empty status).
- Available fields beyond `updateAsset`: `addTags`/`removeTags` (remove
  wins if a tag is in both), `addLicenses`, `addCollections` (curated
  collections in the same Library only), `customMetadata`,
  `workflowStatus`.
- `customMetadata[].value` is a typed one-of: `text` (TEXT/LONGTEXT/URL),
  `number`, `date`, or `optionIds` (SELECT/MULTISELECT). Setting a value
  **replaces** that property's current value on the asset; unlisted
  properties are untouched. Catalog-type properties are not covered by this
  input — use `setCustomMetadata`.
- **No rollback.** Changes apply per asset *and* per field. Always
  inspect `status`, `failedAssets`, and `fieldErrors[].code`
  (`PERMISSION_DENIED`, `INVALID_VALUE`, `PROPERTY_NOT_FOUND`,
  `LICENSE_NOT_FOUND`, `COLLECTION_NOT_FOUND`, `COLLECTION_NOT_CURATED`,
  `STATUS_NOT_FOUND`). An asset absent from `failedAssets` was fully
  applied; assets with a non-null `code` were not touched at all.
- The field doesn't document its scope; use `basic:write` like the other
  asset mutations.
