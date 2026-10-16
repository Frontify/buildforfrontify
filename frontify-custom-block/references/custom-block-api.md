# Custom Block API Reference

This file is the primary technical reference for the Frontify Content Block API.
Read it when writing block logic, wiring up settings, working with assets, or asking
about a specific hook or setting type. Sections are organized by concern — jump to
the relevant one rather than reading top to bottom.

**Table of contents**
1. [Block manifest](#1-block-manifest)
2. [Entry point — defineBlock](#2-entry-point--defineblock)
3. [Settings schema — defineSettings](#3-settings-schema--definesettings)
4. [Setting types reference](#4-setting-types-reference)
5. [AppBridge hooks](#5-appbridge-hooks)
6. [Lifecycle hooks](#6-lifecycle-hooks)
7. [Events — appBridge.dispatch](#7-events--appbridgedispatch)
8. [Constraints and limitations](#8-constraints-and-limitations)
9. [Minimal working example](#9-minimal-working-example)

**Companion reference:** [settings-schema.md](settings-schema.md) — the `settingsSchema` in
`manifest.json`, which declares the stored shape of everything the settings below produce.

---

## 1. Block manifest

**File:** `manifest.json` at the project root.

The manifest is read by the Frontify CLI at deploy time. It identifies the block on the
Marketplace and declares the shape of every setting the block stores.

### Canonical manifest

```json
{
    "appId": "<your-app-id-from-the-marketplace>",
    "settingsSchema": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "additionalProperties": false,
        "properties": {
            "title": {
                "type": "string",
                "frontify-translatable": true,
                "frontify-serializable": true,
                "frontify-serialization-index": 1
            }
        }
    }
}
```

- **`appId`** is required. Obtain it from the Frontify Marketplace developer portal when you
  create a new block entry.
- **`settingsSchema`** is required for any block that declares value settings. Without it the
  block is not translatable, not indexed for search, and its `settings` and `content` fields come
  back `null` on the public API.

### settingsSchema in brief

A [JSON Schema draft 2020-12](https://json-schema.org/specification) document describing the
block's stored settings:

- Root is `"type": "object"`; set `"additionalProperties": false`.
- `properties` is keyed by the setting `id` from `src/settings.ts` — one property per setting.
- **Properties are flat.** Every setting carrying an `id` gets a top-level property, however
  deeply it is nested in `switch.on`, `sectionHeading.blocks`, or `multiInput.blocks`. Nesting in
  `settings.ts` is sidebar layout only; it has no effect on storage.
- `notification` and `sectionHeading` store no value and need no property.
- `frontify-*` keywords mark fields as translatable, serializable, or API-visible. They only take
  effect on leaf fields, and never inside `oneOf` / `anyOf` / `allOf` / `if`.

Full rules, the setting-type to JSON Schema type mapping, and a pre-submission checklist are in
[settings-schema.md](settings-schema.md). Validate with:

```bash
bash scripts/check-settings-schema.sh
npx @frontify/frontify-cli@latest verify-manifest
```

---

## 2. Entry point — defineBlock

**File:** `src/index.ts`
**Import:** `import { defineBlock } from '@frontify/guideline-blocks-settings';`

`defineBlock` is the single export the Frontify CLI and host expect from a block.

```ts
export default defineBlock({
    block: MyBlock,            // required — the React component
    settings,                  // required — from defineSettings(...)
    onBlockCreated: async ({ appBridge }) => { /* ... */ },   // optional
    onBlockDeleted: async ({ appBridge }) => { /* ... */ },   // optional
});
```

The `settings` export can be either the direct `defineSettings(...)` return value **or**
an async function (useful when settings need data from a network call):

```ts
// Async settings — fetches remote data before building the schema
export const settings = async () => {
    const response = await fetch('https://api.example.com/config');
    const config = await response.json();
    return defineSettings({
        basics: [buildSettingFromConfig(config)],
    });
};
```

---

## 3. Settings schema — defineSettings

**File:** `src/settings.ts`
**Import:** `import { defineSettings } from '@frontify/guideline-blocks-settings';`

The settings schema declares the controls that appear in the block's sidebar panel.

### Sections

```ts
export const settings = defineSettings({
    main: [],     // Block-type selector dropdown (hidden if only one type)
    basics: [],   // Core block options — asset selection, content config
    layout: [],   // Positioning, padding, content alignment
    style: [],    // Colors, borders, line styles, corners
    security: [], // Asset access control (use when block shows assets)
    custom: [],   // Optional free-named sections; appear between Style and Security
    // targets is always appended automatically — don't declare it
});
```

### Shared properties (all setting types)

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | ✓ | Unique key — used to save and retrieve the value |
| `label` | `string` | | Human-readable label shown in the sidebar |
| `info` | `string` | | Tooltip text for additional context |
| `defaultValue` | depends | | Initial value when the block is first placed |
| `show` | `(bundle) => boolean` | | Conditionally hide/show the setting |
| `onChange` | `(bundle) => void` | | Modify other settings when this value changes |
| `rules` | `Rule[]` | | Validation rules with `validate` fn and `errorMessage` |
| `showForTranslations` | `boolean` | | Whether to show when translating a page |

### Conditional visibility with `show`

```ts
// Only show 'borderRadius' if 'showBorder' switch is on
{
    id: 'borderRadius',
    type: 'input',
    label: 'Border radius',
    show: (bundle) => bundle.getBlock('showBorder')?.value === true,
}
```

### Accessing other settings with `bundle.getBlock(id)`

Inside `show` and `onChange` callbacks, `bundle.getBlock('settingId')` returns the
current state of another setting so you can make decisions based on it.

---

## 4. Setting types reference

Every setting below also needs a matching property in the manifest's `settingsSchema`. The
setting type to JSON Schema type mapping is in
[settings-schema.md § 6](settings-schema.md#6-setting-type-to-json-schema-type).

### assetInput

Lets the editor upload or choose an asset from the Frontify DAM.
**Note:** assets are NOT accessible via `useBlockSettings` — use `useBlockAssets` instead.

```ts
{
    id: 'heroImage',
    type: 'assetInput',
    multiSelection: false,          // default true
    objectTypes: ['IMAGE'],         // restrict by object type
    extensions: ['jpg', 'png'],     // restrict by file extension
    mode: AssetInputMode.BrowseAndUpload,
}
```

### checklist

Multiple-choice setting. Returns an array of selected `id` values.

```ts
{
    id: 'features',
    type: 'checklist',
    label: 'Features',
    choices: [
        { id: 'dark-mode', label: 'Dark mode' },
        { id: 'animations', label: 'Animations' },
    ],
    showClearAndSelectAllButtons: true,
    columns: 2,
}
```

### colorInput

Color picker supporting both guideline brand colors and custom hex/rgba values.

```ts
{
    id: 'backgroundColor',
    type: 'colorInput',
    label: 'Background color',
    clearable: true,   // allows removing the color (value becomes null)
}
```

### dropdown (select field)

Single-value selector.

```ts
{
    id: 'alignment',
    type: 'dropdown',
    label: 'Alignment',
    defaultValue: 'center',
    choices: [
        { value: 'left',   label: 'Left',   icon: IconEnum.TextAlignLeft },
        { value: 'center', label: 'Center', icon: IconEnum.TextAlignCenter },
        { value: 'right',  label: 'Right',  icon: IconEnum.TextAlignRight },
    ],
}
```

### input

Plain text, number, or password input with optional validation rules.

```ts
{
    id: 'embedUrl',
    type: 'input',
    label: 'Embed URL',
    placeholder: 'https://...',
    inputType: 'text',     // 'text' | 'number' | 'password'
    rules: [
        {
            errorMessage: 'Must be a valid URL',
            validate: (value) => value.startsWith('https://'),
        },
    ],
}
```

### multiInput

Group of `input`, `colorInput`, or `dropdown` controls displayed side-by-side.

```ts
{
    id: 'padding',
    type: 'multiInput',
    layout: 'columns',    // 'columns' | 'spider'
    blocks: [
        { id: 'paddingTop',    type: 'input', label: 'Top',    defaultValue: '0px' },
        { id: 'paddingRight',  type: 'input', label: 'Right',  defaultValue: '0px' },
        { id: 'paddingBottom', type: 'input', label: 'Bottom', defaultValue: '0px' },
        { id: 'paddingLeft',   type: 'input', label: 'Left',   defaultValue: '0px' },
    ],
    lastItemFullWidth: false,
}
```

### notification

Displays an informational, warning, or error banner inside the sidebar (not a user input).

```ts
{
    id: 'infoNote',
    type: 'notification',
    title: 'Note',
    text: 'This setting applies only in view mode.',
    styles: { type: 'info', icon: true, divider: 'bottom' },
}
```

### sectionHeading

Groups a set of settings under a collapsible heading.

```ts
{
    id: 'advancedGroup',
    type: 'sectionHeading',
    label: 'Advanced',
    blocks: [
        { id: 'customClass', type: 'input', label: 'CSS class' },
    ],
}
```

### segmentedControls

Button-group selector (similar to a radio group, visually compact).

```ts
{
    id: 'size',
    type: 'segmentedControls',
    label: 'Size',
    defaultValue: 'md',
    choices: [
        { label: 'S', value: 'sm' },
        { label: 'M', value: 'md' },
        { label: 'L', value: 'lg' },
    ],
}
```

### switch

Toggle that shows/hides subordinate settings based on its state.

```ts
{
    id: 'showBorder',
    type: 'switch',
    label: 'Show border',
    switchLabel: 'Enable',
    defaultValue: false,
    on: [
        { id: 'borderColor', type: 'colorInput', label: 'Border color' },
        { id: 'borderWidth', type: 'input', label: 'Width', defaultValue: '1px' },
    ],
    off: [],
}
```

### textarea

Multi-line text input.

```ts
{
    id: 'description',
    type: 'textarea',
    label: 'Description',
    placeholder: 'Enter description…',
    rules: [
        { errorMessage: 'Max 500 characters', validate: (v) => v.length <= 500 },
    ],
}
```

---

## 5. AppBridge hooks

All hooks are imported from `@frontify/app-bridge` and require `appBridge` (from `BlockProps`) as their first argument.

### useBlockSettings\<T\>

Read and write the block's sidebar setting values. Works like React `useState`.

```ts
import { useBlockSettings } from '@frontify/app-bridge';

type Settings = { color: string; width: string };

const [settings, setSettings] = useBlockSettings<Settings>(appBridge);

// Read
const color = settings.color;

// Write a subset of settings (merged, not replaced)
setSettings({ color: 'red' });
```

You can also store arbitrary non-setting data in the settings object:

```ts
setSettings({ _internalCache: { lastFetched: Date.now(), items: [...] } });
const cached = settings._internalCache;
```

### useEditorState

Returns `true` when the editor has edit mode active, `false` in view mode.

```ts
import { useEditorState } from '@frontify/app-bridge';

const isEditing = useEditorState(appBridge);
```

Use `isEditing` to toggle editor-only UI (add/remove buttons, drag handles, empty
state prompts) and to guard write operations.

### useBlockAssets

Manages assets associated with the block. Asset keys correspond to `assetInput`
setting IDs in `settings.ts`.

```ts
import { useBlockAssets } from '@frontify/app-bridge';

const {
    blockAssets,
    addAssetIdsToKey,
    updateAssetIdsFromKey,
    deleteAssetIdsFromKey,
} = useBlockAssets(appBridge);

// Access the first selected asset for key 'heroImage'
const asset = blockAssets['heroImage']?.[0];
const url = asset?.previewUrl ?? asset?.genericUrl ?? '';

// Replace all assets for a key
await updateAssetIdsFromKey('heroImage', [assetId]);

// Add to existing assets
await addAssetIdsToKey('heroImage', [assetId]);

// Remove specific asset IDs
await deleteAssetIdsFromKey('heroImage', [assetId]);
```

### useAssetChooser

Opens the Frontify asset chooser modal. Combine with `useBlockAssets` to wire up the
chosen asset IDs.

```ts
import { useAssetChooser, AssetChooserObjectType } from '@frontify/app-bridge';

const { openAssetChooser, closeAssetChooser } = useAssetChooser(appBridge);

openAssetChooser(
    (result) => {
        const ids = result.map((a) => a.id);
        updateAssetIdsFromKey('heroImage', ids);
        closeAssetChooser();
    },
    { objectTypes: [AssetChooserObjectType.ImageVideo] }
);
```

### useAssetUpload

Triggers a file upload from the user's local machine into Frontify.

```ts
import { useAssetUpload } from '@frontify/app-bridge';

const [{ selectedFiles, uploadResults, doneAll }, { uploadFile }] = useAssetUpload(appBridge);
```

- `selectedFiles` — files the user picked (trigger upload with `uploadFile(selectedFiles)`)
- `doneAll` — `true` once all uploads are complete
- `uploadResults` — array of uploaded asset objects with `.id`

### useReadyForPrint

For blocks that load content asynchronously (e.g., fetch a remote chart). Signals
Frontify when the block is ready for print/PDF export.

```ts
import { useReadyForPrint } from '@frontify/app-bridge';

const { setIsReadyForPrint } = useReadyForPrint(appBridge);

useEffect(() => {
    if (dataLoaded) setIsReadyForPrint(true);
}, [dataLoaded]);
```

### usePrivacySettings

Returns the guideline page's privacy configuration — whether assets can be downloaded
or the asset viewer is enabled.

```ts
import { usePrivacySettings } from '@frontify/app-bridge';

const { isDownloadEnabled, isAssetViewerEnabled } = usePrivacySettings(appBridge);
```

---

## 6. Lifecycle hooks

Declared inside `defineBlock(...)` in `src/index.ts`. Both hooks receive `{ appBridge }`
and support async execution.

### onBlockCreated

Runs once the first time the block is rendered (i.e., when an editor first places it on a
page). Use it to pre-populate settings with data from an API, or to perform any
one-time initialization.

```ts
export default defineBlock({
    block: MyBlock,
    settings,
    onBlockCreated: async ({ appBridge }) => {
        const data = await fetch('https://api.example.com/defaults').then(r => r.json());
        // appBridge is available here for any initialization logic
    },
});
```

### onBlockDeleted

Runs just before the block is removed from the page. Use it for cleanup: removing
records from an external system, logging, or releasing resources.

```ts
export default defineBlock({
    block: MyBlock,
    settings,
    onBlockDeleted: async ({ appBridge }) => {
        await fetch('https://api.example.com/cleanup', { method: 'DELETE' });
    },
});
```

---

## 7. Events — appBridge.dispatch

Use `appBridge.dispatch` to send events from the block to the Frontify host.

### Custom tracking events

Available since `@frontify/app-bridge@4.0.0-alpha.45`.

```ts
appBridge.dispatch({
    name: 'trackEvent',
    payload: {
        action: 'button:clicked',
        payload: { buttonId: 'share-button', label: 'Share' },
    },
});

// Without metadata
appBridge.dispatch({
    name: 'trackEvent',
    payload: { action: 'button:clicked', payload: null },
});
```

Currently only `'button:clicked'` is supported as an action value.

### Download asset

Triggers the host's native asset download flow (respects privacy settings):

```ts
appBridge.dispatch({
    name: 'downloadAsset',
    payload: blockAssets.myAssetKey[0],
});
```

---

## 8. Constraints and limitations

| Area | Constraint |
|------|-----------|
| **Manifest** | A block with value settings and no `settingsSchema` is rejected at Marketplace submission |
| **Isolation** | Each block runs in its own React instance — no shared state with other blocks on the page |
| **Authentication** | No tokens, no OAuth — the host injects the session. Never attempt to handle auth yourself |
| **Secrets in settings** | Settings values are visible in the rendered page source. Never store API keys, tokens, or credentials in block settings |
| **External HTTP** | Plain `fetch()` is fine for public/no-auth endpoints. Credentialed third-party calls require a server-side proxy (see `../frontify-auth-block/SKILL.md`) |
| **GraphQL** | All Frontify GraphQL calls must go through the AppBridge, never via direct `fetch` to `/graphql` |
| **CSS scoping** | All styles must be scoped to a unique root class — especially required for Marketplace blocks |
| **Node version** | Build tooling requires Node 22.14+ |
| **TypeScript** | All block code must be TypeScript (`tsconfig.json` is part of the scaffold) |
| **Browser compatibility** | Targets the same browsers Frontify supports; check the generated `package.json` for the browserslist config |

---

## 9. Minimal working example

### `src/index.ts`

```ts
import { defineBlock } from '@frontify/guideline-blocks-settings';
import { MyBlock } from './Block';
import { settings } from './settings';

export default defineBlock({ block: MyBlock, settings });
```

### `src/Block.tsx`

```tsx
import type { FC } from 'react';
import type { BlockProps } from '@frontify/guideline-blocks-settings';
import { useBlockSettings, useEditorState } from '@frontify/app-bridge';

type Settings = { message: string };

export const MyBlock: FC<BlockProps> = ({ appBridge }) => {
    const [{ message }] = useBlockSettings<Settings>(appBridge);
    const isEditing = useEditorState(appBridge);

    return (
        <div className="my-block">
            <p>{message || (isEditing ? 'Enter a message in the sidebar.' : '')}</p>
        </div>
    );
};
```

### `src/settings.ts`

```ts
import { defineSettings } from '@frontify/guideline-blocks-settings';

export const settings = defineSettings({
    basics: [
        {
            id: 'message',
            type: 'textarea',
            label: 'Message',
            defaultValue: 'Hello from my block!',
        },
    ],
});
```

### `manifest.json`

```json
{
    "appId": "<your-app-id>",
    "settingsSchema": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "additionalProperties": false,
        "properties": {
            "message": {
                "type": "string",
                "default": "Hello from my block!",
                "frontify-translatable": true,
                "frontify-serializable": true,
                "frontify-serialization-index": 1
            }
        }
    }
}
```

Note that `message` appears three times, under the same name: as a member of the `Settings` type
in `Block.tsx`, as the setting `id` in `settings.ts`, and as a schema property key in
`manifest.json`. Keeping those three in step is what the checklist in
[settings-schema.md § 10](settings-schema.md#10-pre-submission-checklist) is for.
