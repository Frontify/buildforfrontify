# Architecture

How a Frontify custom theme is put together, from project root down to individual components.

## The three-layer functionality model

Frontify's theme system distinguishes three layers of functionality. Understanding which layer a feature lives in determines who's responsible for it and what you can control.

1. **Platform-level** — Built into Frontify and consistent across all guidelines. Fonts and colors (Essentials), drag-and-drop editing, the Navigation Manager. Themes do not touch this layer.
2. **Guideline-level, theme-agnostic** — The baseline that every theme is expected to provide. Type styles (H1–H4, body, link, quote, image title/caption, custom 01/02/03), button variants (primary/secondary/tertiary), color schemes (default + custom), and baseline components (logo, global search, library search bar, language selector, collection cards, asset cards, content area). Your theme should include these; removing baseline settings causes UX issues.
3. **Guideline-level, theme-specific** — The brand-unique parts. Custom headers, sidebars, dropdowns, page titles, pagination, footer layouts, animations, transitions. This is where the theme expresses itself.

When designing, start from the baseline and expand thoughtfully beyond it. If in doubt, look at the Classic theme as a reference point.

## The entry point

A theme's entry file exports a default `ThemeConfigExport`, which `defineTheme` helps you type-check. The shape is non-negotiable: three template types, each with at minimum a `default` variant.

```typescript
// src/index.ts
import { defineSettings, defineTheme } from '@frontify/guideline-themes';
import { settingsStructure } from './settings';
import { MyTheme } from './MyTheme';

export default defineTheme({
    templates: {
        cover: {
            default: { component: MyTheme, settings: defineSettings(settingsStructure) },
        },
        documentPage: {
            default: { component: MyTheme, settings: defineSettings(settingsStructure) },
        },
        library: {
            default: { component: MyTheme, settings: defineSettings(settingsStructure) },
        },
    },
});
```

All three template keys (`cover`, `documentPage`, `library`) are required. Each must have a `default` inside it. You can also add named variants alongside `default` — useful when editors should be able to pick a different layout per page.

The `settings` for each template variant is a separate structure. You can share one structure across templates (as the boilerplate does) or split them per template. Split when the templates legitimately need different controls; share otherwise.

## `ThemeProps` — what your component receives

Every template component receives exactly three props:

```typescript
type ThemeProps = {
    appBridge: AppBridgeTheme;  // Your interface to the platform
    Content: FC;                 // Renders the guideline's editable content
    Footer: FC | null;           // Configurable footer, or null if removed
};
```

- `appBridge` is how your theme reads platform state, subscribes to updates, and dispatches commands. It is the only way to talk to Frontify.
- `Content` is a drop-in component. Render it inside your layout and the platform handles fetching, rendering, and editing of the actual guideline content (sections, blocks, media, headings). **You must render `Content` inside every `documentPage` template variant, otherwise the page will appear empty.**
- `Footer` is a built-in multi-column footer that editors configure in the sidebar. It is `null` when the editor has chosen not to use it, so always conditional-render:
  ```tsx
  {Footer && <Footer />}
  ```

  Once `Footer` is rendered anywhere in the theme, the platform automatically surfaces a "Footer" section under **Theme Settings → Layout and navigation** so editors can configure columns, links, and text — you do not declare those settings yourself.

You do not pass props to `Content` or `Footer`. The platform wires them up for you.

## Routing by template type

A single top-level component typically branches on `useTemplateContext(appBridge)` to render the right layout for each template type. The boilerplate's pattern is the canonical one:

```tsx
export const MyTheme = ({ appBridge, Content, Footer }: ThemeProps): ReactElement | null => {
    const templateContext = useTemplateContext(appBridge);
    if (!templateContext) return null;

    return (
        <div id="my-theme">
            {templateContext.type === 'cover' && (
                <CoverPageLayout appBridge={appBridge}>
                    <Content />
                    {Footer && <Footer />}
                </CoverPageLayout>
            )}
            {templateContext.type === 'documentPage' && (
                <DocumentPageLayout appBridge={appBridge} documentId={templateContext.document.id()}>
                    <Content />
                    {Footer && <Footer />}
                </DocumentPageLayout>
            )}
            {templateContext.type === 'library' && (
                <LibraryLayout appBridge={appBridge}>
                    <Content />
                    {Footer && <Footer />}
                </LibraryLayout>
            )}
        </div>
    );
};
```

`templateContext` is also the place to read per-template data:
- `cover` → `templateContext.coverPage`
- `documentPage` → `templateContext.document` and `templateContext.documentPage`
- `library` → `templateContext.document` (a `DocumentLibrary`)

## Typical project layout

This is what the Frontify boilerplate uses. You don't have to follow it exactly, but it's the lingua franca and departing from it without reason makes it harder for other Frontify developers to navigate your code.

```
my-theme/
├── manifest.json           # appType: "theme", appId: "<marketplace-app-id>"
├── package.json            # scripts: serve, deploy, typecheck, test
├── tsconfig.json
├── vitest.config.ts        # if using vitest
├── src/
│   ├── index.ts            # exports defineTheme({...})
│   ├── MyTheme.tsx         # top-level router by templateContext.type
│   ├── CoverPage.tsx       # per-template layouts
│   ├── DocumentPage.tsx
│   ├── LibraryPage.tsx
│   ├── settings.tsx        # exports settingsStructure
│   ├── defaults.ts         # default values for each setting
│   ├── types.ts            # TemplateSettings, per-template settings shapes
│   ├── theme.css           # or styles/, depending on styling approach
│   ├── components/         # Header, Sidebar, Navigation, Logo, etc.
│   └── helpers/            # small focused utilities (isPageActive, etc.)
```

Note: `src/index.ts` imports `./theme.css` at the top (or your equivalent global stylesheet), then exports `defineTheme(...)`. If you're using Tailwind, the boilerplate prefixes classes with `th-` to avoid colliding with platform styles (see `className="th-relative th-z-20 ..."` in the official samples).

## The settings flow

Settings defined in `src/settings.tsx` appear in the Frontify sidebar alongside platform-provided sections. When an editor changes a value, the platform persists it. At render time, your component reads the current values via `useSettings(appBridge)`:

```tsx
const { templateSettings, templateAssets } = useSettings<MyTemplateSettings>(appBridge);
```

- `templateSettings` is a keyed record of the values configured for the current template (typed via your generic).
- `templateAssets` is a keyed record of uploaded assets (images, files), keyed by the setting id.

Setting keys in `templateSettings` and `templateAssets` correspond 1:1 to the `id` fields of your setting blocks. If you have a setting block with `id: 'logoAsset'`, the uploaded asset will be at `templateAssets.logoAsset`.

Every setting must have a default value (declared either via `defaultValue` on the block, or supplied as a fallback by your component). This is required because the platform applies your theme to guidelines that have never been configured — without a default, the component receives `undefined` and typically breaks.

See `settings-and-defaults.md` for the full setting block vocabulary.

## The manifest

```json
{
  "appType": "theme",
  "appId": "<ADD_YOUR_MARKETPLACE_APP_ID_HERE>"
}
```

The `appId` comes from the Frontify Marketplace after you create a theme entry there. Until it's set, local dev may still work (via the "Local Theme Development" app), but deployment will fail. This is a common early-stage gotcha.

## Styling conventions

Themes can use whatever styling approach you like — plain CSS, CSS Modules, Tailwind, styled-components. The official boilerplate uses Tailwind with a `th-` prefix. Whatever you choose, scope styles to the theme (wrap the root element in a theme-specific `id` or class) so you don't leak into the platform's own UI.

Frontify's own design system (Fondue) is **not** used inside the rendered theme. It *is* used when authoring setting sidebar UI, but that's hidden from you as a theme developer — you declare setting blocks by type and Frontify renders them using Fondue.

## Scripts

The canonical `package.json` scripts (taken from the boilerplate) are:

```json
{
  "scripts": {
    "serve": "frontify-cli serve --entryPath src/index.ts",
    "deploy": "frontify-cli theme deploy --entryPath src/index.ts",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "lint": "eslint ."
  }
}
```

`serve` starts the local development server (default port 5600) that the "Local Theme Development" app in your guideline connects to. `deploy` uploads the built theme to the Marketplace under the `appId` in the manifest.