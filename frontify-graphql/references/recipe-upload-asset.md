# Upload a new asset (three-step)

Loaded from [`SKILL.md`](../SKILL.md).

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

Required scopes: `basic:read basic:write`. `UploadFileInput` takes
`filename` and `size` (bytes, positive, up to 5 TB).

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
    "externalId": "my-source-system-id",
    "tags": [{ "value": "My-Tag" }]
  }
}
```

`createAsset` returns a **job** wrapping the eventual `assetId` — the
asset is created asynchronously. Poll the asset's `status`
(`PROCESSING`, `FINISHED`, `PROCESSING_FAILED`) before relying on
preview / download URLs.

`createAsset` also accepts `directory` (folder path array, folders are
created on demand — can't be combined with a Folder `parentId`),
`availability`, `expiresAt`, `copyright`, `isDecorative`,
`alternativeText`, and `skipFileMetadata`. The same single-use `fileId`
mechanism feeds `replaceAsset`, `createAttachment`, `addAssetPreviewImage`
and `createAssetVariant` / `replaceAssetVariant` (Logo/Icon libraries).

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
