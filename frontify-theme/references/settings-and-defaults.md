# Settings and Defaults

How to define theme settings, provide sensible defaults, and read them back from components at render time. Settings are how editors configure a theme without touching code — think colors, logos, typography, toggle switches, layout options.

## The round trip at a glance

```
src/settings.tsx          →  Frontify renders sidebar controls
   ↓
Editor adjusts values in sidebar
   ↓
Platform persists and emits context update
   ↓
useSettings<T>(appBridge) →  your component reads templateSettings / templateAssets
```

The same `id` you give a setting block in `settings.tsx` is the key under which its value appears in `templateSettings` (or `templateAssets`, for asset inputs).

## Structure: `defineSettings` + `ThemeSettingsStructureExport`

`ThemeSettingsStructureExport` is an object keyed by **custom section name** (what shows up as a header in the sidebar), with arrays of `SettingBlock` as values. `defineSettings` is just a type helper — it takes a structure and returns it, giving you autocomplete and type-checking.

```tsx
// src/settings.tsx
import {
    type SettingBlock,
    type ThemeSettingsStructureExport,
    defineSettings,
} from '@frontify/guideline-themes';

const logoSettingBlocks: SettingBlock[] = [
    { id: 'logoVisibility', label: 'Visibility', type: 'segmentedControls', /* ... */ },
    { id: 'logoAsset', type: 'assetInput', /* ... */ },
];

export const settingsStructure: ThemeSettingsStructureExport = {
    logo: logoSettingBlocks,        // section name "logo" in the sidebar
    header: headerSettingBlocks,     // another section
};
```

Each top-level key becomes a collapsible section in the sidebar. Group related settings under one section; split unrelated settings into multiple sections so editors don't drown in a wall of controls.

## Wiring settings into the theme

Each template variant in `defineTheme` takes its own `settings`. You can reuse the same structure across templates (simple case) or supply different ones:

```tsx
import { defineTheme, defineSettings } from '@frontify/guideline-themes';
import { settingsStructure } from './settings';

export default defineTheme({
    templates: {
        cover:        { default: { component: Theme, settings: defineSettings(settingsStructure) } },
        documentPage: { default: { component: Theme, settings: defineSettings(settingsStructure) } },
        library:      { default: { component: Theme, settings: defineSettings(settingsStructure) } },
    },
});
```

Settings defined for one template are isolated from another template's settings — editors configure each independently unless you deliberately share the structure.

## Reading settings at runtime

Inside your component, `useSettings` gives you reactive access:

```tsx
import { useSettings } from '@frontify/app-bridge-theme';
import type { MyTemplateSettings } from './types';

const { templateSettings, templateAssets } = useSettings<MyTemplateSettings>(appBridge);
```

- `templateSettings` is a `Record<string, unknown>` at the type level; the generic narrows it to your declared shape.
- `templateAssets` is `Record<string, Asset[]>` — values from `assetInput` blocks live here, not in `templateSettings`, because assets are richer objects (preview URL, metadata, multiple files).

Always type the settings shape:

```typescript
// src/types.ts
import type { LinkBlock } from '@frontify/guideline-themes';

export type LogoPageTemplateSettings = {
    logoVisibility: 'show' | 'hide';
    logoLink: LinkBlock<unknown>['value'];
    logoWidth: string;
    logoHeight: string;
};

export type TemplateSettings = {
    cover?: LogoPageTemplateSettings;
    documentPage?: LogoPageTemplateSettings;
    library?: LogoPageTemplateSettings;
};
```

## Defaults — non-negotiable

Every setting block should have a `defaultValue`. The platform applies themes to guidelines that have never been configured; without a default, the value is `undefined` when your component reads it and most layouts break.

Two common patterns:

**1. Defaults declared on the block** (simplest, preferred):

```tsx
{
    id: 'logoWidth',
    label: 'Width',
    type: 'input',
    defaultValue: DefaultLogoPageTemplateSettings.logoWidth,
    placeholder: DefaultLogoPageTemplateSettings.logoWidth,
}
```

**2. Defaults as a separate module** (makes them reusable as fallbacks in components):

```ts
// src/defaults.ts
import type { LogoPageTemplateSettings } from './types';

export const DefaultLogoPageTemplateSettings: LogoPageTemplateSettings = {
    logoVisibility: 'show',
    logoLink: { link: { link: '' }, openInNewTab: false },
    logoWidth: 'auto',
    logoHeight: 'auto',
    logoX: '0px',
    logoY: '0px',
};
```

Then in components, if you ever need to guard against stale or partial state, merge:

```tsx
const settings = { ...DefaultLogoPageTemplateSettings, ...templateSettings };
```

The boilerplate does both: defaults live in `src/defaults.ts` and are referenced from both the settings blocks (`defaultValue`) and helper functions that compute derived values.

## Setting block types (vocabulary)

These are the block types exported from `@frontify/guideline-themes`. Use the block types rather than raw strings so you get completion and type-checking.

| Block | Use for |
|-------|---------|
| `input` | Single-line text input. For numeric/dimensional values, add validation `rules`. |
| `textarea` | Multi-line text. |
| `switch` | Boolean on/off. |
| `checklist` | Multi-select list. |
| `dropdown` | Single-select from a list. |
| `segmentedControls` | Small enum pickers with icons — "Show / Hide", "Left / Center / Right". |
| `colorInput` | Color picker with preset support. |
| `assetInput` | File/image picker. Value lands in `templateAssets`, not `templateSettings`. |
| `link` | URL picker with optional open-in-new-tab. |
| `linkChooser` | More advanced link picker with internal guideline targets. |
| `multiInput` | Groups several inputs on one row. The classic use is width + height, or X + Y offsets. |
| `sectionHeading` | Visual grouping header in the sidebar. Can contain nested `blocks`. |
| `notification` | Static inline info/warning message for the editor. |
| `templateInput` | Template selector for named variants. |
| `legacyAssetInput` | Older asset picker — don't use in new code. |
| `dynamicSettingBlock` | Block whose configuration changes based on other settings. |

Most of these accept the standard fields: `id`, `label`, `defaultValue`, `show` (conditional visibility callback), plus type-specific fields. Lean on the exported types (e.g. `SegmentedControlsBlock`, `AssetInputBlock`) when building blocks — the compiler will tell you which fields are required for each.

## Conditional visibility with `show`

Any block can take a `show(bundle) => boolean` callback. Use this to hide/reveal settings based on other values — the cleanest pattern for progressive disclosure.

```tsx
{
    id: 'logoAsset',
    type: 'assetInput',
    show: (bundle) => bundle.getBlock('logoVisibility')?.value === 'show',
}
```

`bundle.getBlock(id)` reads the current (possibly unsaved) value of another block in the same settings form. Prefer this over duplicating conditional logic in the component.

## `onChange` + utility helpers

Some block types support `onChange(bundle)` to react to user edits — useful for appending units, normalizing input, or cascading changes to other blocks. The boilerplate uses `appendUnit` from `@frontify/guideline-themes` to auto-append `px` to dimensional inputs:

```tsx
{
    id: 'logoWidth',
    type: 'input',
    defaultValue: 'auto',
    onChange: (bundle) => appendUnit(bundle, 'logoWidth'),
    rules: [numericalOrPixelOrPercentOrAutoRule],
}
```

## Validation with `rules`

`input` and a few other block types accept a `rules` array of validation functions. A rule returns a truthy error message for invalid input or `null`/`undefined` for valid input. Keep rules small and composable — the boilerplate puts each rule in its own file under `src/helpers/rules/`.

## Organizing complex settings: `sectionHeading` with nested `blocks`

For complex grouped settings (position + size for a logo, for instance), nest blocks inside a `sectionHeading`. This collapses visually in the sidebar and keeps the logical grouping clear:

```tsx
{
    id: 'logoPositionAndSize',
    type: 'sectionHeading',
    label: '',
    show: (bundle) => bundle.getBlock('logoVisibility')?.value === 'show',
    blocks: [
        { id: 'logoSizeMultiInput', type: 'multiInput', blocks: [ /* width + height */ ] },
        { id: 'logoOffsetMultiInput', type: 'multiInput', blocks: [ /* X + Y */ ] },
    ],
}
```

## Platform-provided settings you can't remove

A few sidebar sections are provided by the platform and apply to theme-agnostic components (content area, sections, built-in footer). You cannot hide or remove these, and that's deliberate — they ensure consistency across themes. If a user asks to suppress them, explain that they're part of the baseline and redirect the feature request to Frontify Slack.

## Common patterns

### Typography setting (custom font families)

Expose a `fontInput` setting block and let editors configure typography values. Your theme then applies these styles to navigation items, page titles, pagination UI, and so on. (See the FAQs in the original docs for the full pattern.)

### Asset with fallback

```tsx
const { templateSettings, templateAssets } = useSettings<MyTemplateSettings>(appBridge);
const logoAsset = templateAssets.logoAsset?.[0];  // first uploaded file, or undefined
```

`templateAssets[id]` is always an array. Pull `[0]` for single-asset inputs.

### Visibility-gated pattern

Combine `show` on the block (hides from sidebar when toggle is off) with a conditional render in the component (skips the JSX when there's nothing to display). The two layers aren't redundant — the first keeps the sidebar tidy, the second avoids layout artifacts when defaults change.

## Debugging setting flow

When a setting isn't showing up the way you expect:

1. **Is the `id` consistent?** The id in `settings.tsx` must match the key you read from `templateSettings`. A typo here silently returns `undefined`.
2. **Are you reading from the right record?** Asset inputs go to `templateAssets`, not `templateSettings`.
3. **Is there a default?** Undefined at render time often means no default — add one to the block.
4. **Did you type the generic on `useSettings`?** Without it, `templateSettings` is `Record<string, unknown>` and TypeScript can't help you catch typos.
5. **Is the sidebar section collapsed or filtered?** If the setting exists but you can't see it in the sidebar, check for a `show` callback that evaluates to `false`, or a parent section that hides it.