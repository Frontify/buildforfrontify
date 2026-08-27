# App Surfaces Reference

Detailed, per-surface implementation guide. Read this once the target
surface(s) are known. Each section is self-contained.

A surface is declared in `manifest.json` under a **project type**, then a
**surface type**:

```jsonc
{
  "surfaces": {
    "<projectType>": {
      "<surfaceType>": { "title": "…" }
    }
  }
}
```

- **Project types:** `guideline`, `mediaLibrary`, `iconLibrary`,
  `logoLibrary`, `documentLibrary`, `workspace`.
- **Surface types:** `assetAction`, `assetCreation`, `assetBulkActions`,
  `assetViewer`, `pageAction`, `assetChooser`.
- `assetAction` / `assetCreation` / `assetBulkActions` live under the
  library/workspace project types; `assetViewer`, `pageAction`, and
  `assetChooser` live under `guideline`.

At runtime, `appContext()` returns a discriminated union keyed on
`surface`. Every member carries `AppBaseProps` — `token`,
`marketplaceServiceAppId`, `connected`, `brandId`, `domain` — plus the
surface-specific fields documented below. Always narrow on
`context.surface` before reading a surface-specific field.

`type` in a surface declaration is an `AssetType[]`:
`audio`, `document`, `image`, `video`, `file`, `embeddedContent`.
`iconLibrary` and `logoLibrary` `assetAction` accept `["image"]` only.
`filenameExtension` (and `filenameExtensions` for bulk) narrows further
by extension. Titles are 2–28 characters, except `assetCreation` which
allows 1–40. `exe`, `dmg`, `cmd`, `sh`, and `bat` are never allowed
extensions.

---

## Asset action (`assetAction`)

- **Trigger:** the user opens a single asset's "…" action menu inside a
  Library, Project, or Workspace and picks the app.
- **Project types:** `mediaLibrary`, `iconLibrary`, `logoLibrary`,
  `documentLibrary`, `workspace`.
- **Context:** `{ surface: 'assetAction', assetId, parentId, rootId }`
  plus base props.
- **Manifest:**

  ```json
  {
    "surfaces": {
      "mediaLibrary": {
        "assetAction": {
          "title": "Remove Background",
          "type": ["image"],
          "filenameExtension": ["png", "jpeg", "jpg"]
        }
      }
    }
  }
  ```

- **Minimal app:**

  ```tsx
  import { appContext } from '@frontify/app-bridge-app';

  export default function App() {
    const context = appContext();
    if (context.surface !== 'assetAction') return null;
    return <p>Acting on asset {context.assetId}</p>;
  }
  ```

Fetch the asset's preview/download/source URLs with
`appBridge.api({ name: 'getAssetResourceInformation', payload: { assetId } })`.

---

## Asset creation (`assetCreation`)

- **Trigger:** the "+ New" menu inside a Library, Project, or Workspace.
- **Project types:** `mediaLibrary`, `iconLibrary`, `logoLibrary`,
  `documentLibrary`, `workspace`.
- **Context:** `{ surface: 'assetCreation', parentId, rootId }` plus base
  props. `parentId` is the folder/library the new asset lands in.
- **Manifest** (title only; 1–40 chars):

  ```json
  {
    "surfaces": {
      "mediaLibrary": {
        "assetCreation": { "title": "Generate Asset" }
      }
    }
  }
  ```

- Create the asset with
  `appBridge.api({ name: 'createAsset', payload: { data, filename, parentId: context.parentId } })`,
  which resolves to `{ assetId }`.

---

## Asset bulk actions (`assetBulkActions`)

- **Trigger:** the bottom action bar shown after multi-selecting assets.
- **Project types:** `mediaLibrary`, `iconLibrary`, `logoLibrary`,
  `documentLibrary`, `workspace`.
- **Context:**
  `{ surface: 'assetBulkActions', selection: { assets: { ids }, folders: { ids } }, parentId, rootId }`
  plus base props.
- **Manifest** — note the plural `filenameExtensions`:

  ```json
  {
    "surfaces": {
      "mediaLibrary": {
        "assetBulkActions": {
          "title": "Bulk Rename",
          "filenameExtensions": ["png", "jpeg", "jpg"]
        }
      }
    }
  }
  ```

- Read the selection from `context.selection.assets.ids`. For large
  selections, page through the IDs in chunks (≈100) when calling the
  GraphQL API. See `../../frontify-graphql/SKILL.md`.

---

## Asset viewer (`assetViewer`) — on-demand

- **Trigger:** the app icon in the top-right of the Asset Viewer inside a
  Guideline.
- **Project type:** `guideline`.
- **Context:** `{ surface: 'assetViewer', assetId }` plus base props.
  (No `parentId`/`rootId`.)
- **Manifest:**

  ```json
  {
    "surfaces": {
      "guideline": {
        "assetViewer": {
          "title": "Publish to Social",
          "type": ["image"],
          "filenameExtension": ["jpeg", "jpg", "png", "svg"]
        }
      }
    }
  }
  ```

On-demand surface — request enablement via the Frontify Friends Slack
channel.

---

## Page action (`pageAction`) — on-demand

- **Trigger:** the app icon in the top-right of a Guideline page.
- **Project type:** `guideline`.
- **Context:** `{ surface: 'pageAction' }` plus base props only.
- **Manifest** (title only):

  ```json
  {
    "surfaces": {
      "guideline": {
        "pageAction": { "title": "Page Tools" }
      }
    }
  }
  ```

On-demand surface — request enablement via Frontify Friends.

---

## Asset chooser (`assetChooser`) — on-demand

- **Trigger:** the Asset Chooser inside a Guideline.
- **Project type:** `guideline`.
- **Context:** `{ surface: 'assetChooser' }` plus base props only.

On-demand surface — request enablement via Frontify Friends.

---

## Multi-surface apps

A single app can register on several surfaces at once by declaring each
under its project type:

```json
{
  "surfaces": {
    "mediaLibrary": {
      "assetAction": { "title": "My App", "type": ["image"], "filenameExtension": ["png"] },
      "assetCreation": { "title": "My App" }
    },
    "guideline": {
      "assetViewer": { "title": "My App", "type": ["image"], "filenameExtension": ["png"] }
    }
  }
}
```

The same React entry point serves every surface. Branch on
`context.surface` to render the right UI and to safely read
surface-specific fields. Shared logic (auth, settings, API calls) is
identical across surfaces; only the context shape differs. To test each
surface locally, connect from the corresponding place in the Frontify UI
(asset "…" menu, "+ New" menu, bulk action bar, or the Guideline
viewer/page).
