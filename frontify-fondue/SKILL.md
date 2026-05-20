---
name: frontify-fondue
description: >
  Build Frontify extension UI with Fondue components and design tokens.
  ALWAYS apply this skill when authoring visible UI for a Frontify App or
  Content Block (settings panels, forms, buttons, menus, dialogs,
  flyouts, tables, tabs, notices, loading / empty / error states),
  building theme settings UI or platform-adjacent theme controls, or
  asking how to match Frontify's visual style or about tokens,
  accessibility, dark mode, or responsive layout — even if the user does
  not name Fondue explicitly. Do not introduce a new UI library or
  hand-roll components without first checking whether Fondue covers the
  need. Skip this skill for theme-specific guideline presentation
  (custom brand UI), non-UI extension logic, or non-Frontify projects.
compatibility: Designed for Claude Code and similar agentic development tools.
metadata:
  author: Frontify
  version: "1.0"
---

# Frontify Fondue

Fondue is the default UI system for Frontify-like extension surfaces. Use
it for Apps, Content Blocks, settings panels, and theme controls that should
feel native to Frontify. Do not use this skill for extension scaffolding,
AppBridge usage, theme architecture, publishing, authentication, or data
fetching; load the matching Frontify skill for those concerns.

---

## Non-negotiable rules

1. **Never import modern components from bare `@frontify/fondue`.** That path
   resolves to **legacy** components (marked `[legacy]` in Storybook) and is
   the most common cause of "the UI looks old / wrong version" bugs. For new
   work, always import from `@frontify/fondue/components`.

   ```ts
   // Correct (modern)
   import { Button } from '@frontify/fondue/components';

   // Legacy — only use when working in a codebase already on the legacy set
   // and migration is out of scope. Surface this to the user.
   import { Button } from '@frontify/fondue';
   ```

2. **Required side-effect imports must live at the app root** (e.g. `main.tsx`,
   `App.tsx`, or the extension entry). Without these, components render
   unstyled. Order matters: tokens first, then component styles, then any
   add-ons (charts, RTE, legacy).

   ```ts
   import '@frontify/fondue/tokens/base';
   import '@frontify/fondue/components/styles';
   // Optional, only if used:
   import '@frontify/fondue/charts/styles';
   import '@frontify/fondue/rte/styles';
   import '@frontify/fondue/styles'; // legacy components only
   ```

3. **Never invent components, subcomponents, props, or icon names.** Verify
   against the Storybook (<https://fondue-components.frontify.com>), the
   `fondue_components` MCP, or installed package types. The Storybook is the
   canonical visual + prop reference, including lifecycle badges
   (`[stable]`, `[experimental]`, `[legacy]`).
4. **Wrap Fondue UI in `ThemeProvider`** unless the host app already provides
   one. Nesting providers is supported and is how children scope a different
   theme.
5. **Use Fondue props and tokens before custom CSS.** Custom CSS is acceptable
   for product-specific composition, but not for reimplementing Fondue
   primitives.
6. **For Content Blocks, scope custom CSS to the block root.** Unscoped styles
   leak into other blocks and the surrounding Guideline page.

---

## Setup

Use this checklist when starting a new project or auditing an existing one.

### 1. Install

Fondue ships as a single package with sub-path exports. Adding the meta-package
covers components, icons, tokens, charts, RTE, and the Tailwind preset.

```bash
pnpm add @frontify/fondue
# or: npm install @frontify/fondue
```

The Fondue monorepo also publishes the individual sub-packages
(`@frontify/fondue-components`, `@frontify/fondue-icons`,
`@frontify/fondue-charts`, `@frontify/fondue-rte`, `@frontify/fondue-tokens`).
Most projects only need `@frontify/fondue`; only install a sub-package
directly when the project explicitly opts out of the meta-package.

### 2. Import styles + tokens at the app root

These are **side-effect imports**. They must run once before any Fondue
component renders. Put them in your entry file.

```ts
import '@frontify/fondue/tokens/base';
import '@frontify/fondue/components/styles';
```

Add only if you actually use them:

| Import | When |
| --- | --- |
| `@frontify/fondue/charts/styles` | Using Fondue charts |
| `@frontify/fondue/rte/styles` | Using the rich text editor |
| `@frontify/fondue/styles` | Using legacy components from `@frontify/fondue` |

### 3. Wrap the tree in `ThemeProvider`

```tsx
import { ThemeProvider } from '@frontify/fondue/components';

export const App = () => (
  <ThemeProvider theme="light">
    {/* extension UI */}
  </ThemeProvider>
);
```

`ThemeProvider` can be nested. A child `ThemeProvider` overrides the parent
theme for its subtree, which is useful for scoped dark sections inside a
light app shell.

If the app uses Fondue `Link` for SPA navigation, wrap with `RouterProvider`
inside `ThemeProvider` and pass the host router's adapters.

### 4. (Optional) Tailwind preset

If the project uses Tailwind, extend its config with the Fondue preset so
Fondue's `tw-` utility classes are available alongside the design tokens.

```ts
// tailwind.config.ts
import fondueTailwindPreset from '@frontify/fondue/tokens/tailwind';

export default {
  presets: [fondueTailwindPreset],
  content: ['./src/**/*.{ts,tsx}'],
};
```

### 5. (Optional) Fonts

Frontify UI uses **Diatype** as the default UI typeface and **Geist Mono** for
code. Fondue does not bundle the font files. If the host environment does not
already provide them (the Frontify platform does), declare `@font-face` rules
or load the fonts from your CDN before mounting Fondue components — otherwise
typography falls back to system fonts and visually drifts from Frontify.

---

## Quick reference

### Canonical sources (in priority order)

1. **Installed package types** in the target repo — the source of truth for
   compilable props.
2. **Storybook**: <https://fondue-components.frontify.com> — the canonical
   visual + prop reference. Each component story shows a **lifecycle badge**:
   - `[stable]` — production-ready, follows semver
   - `[experimental]` — usable but API may change
   - `[legacy]` — only for projects still on the old set; flag to user
3. **`fondue_components` MCP** for prose docs, prop tables, and story
   examples. Tools:
   - `list_all_documentation`
   - `get_documentation` with ids like `components-button`,
     `layout-flex`, `components-select`, `components-dialog`,
     `utilities-themeprovider`
   - `get_documentation_for_story` for variants
4. **[`references/fondue.md`](references/fondue.md)** in this skill, plus the
   Custom extensions PDFs already in the repo, as the offline fallback.

If the MCP is not configured, recommend it but **do not silently edit MCP
configuration**. The MCP server URL `https://fondue-components.frontify.com/mcp`
should be confirmed against current Frontify docs before relying on it.

If the installed package types and MCP examples disagree, prefer the installed
package for compilable code and the MCP for composition intent.

### Imports for new work

```ts
import { Button, Flex, TextInput, ThemeProvider } from '@frontify/fondue/components';
import { IconPen } from '@frontify/fondue-icons';
```

For an existing repo, follow its established import convention before changing
it. If it imports from bare `@frontify/fondue`, that's legacy — call it out
explicitly before producing code (see Non-negotiable rule #1).

Most common component choices:

| Need | Use |
| --- | --- |
| Layout | `Box`, `Flex`, `Grid`, `Section`, `Divider`, `ScrollArea` |
| Typography | `Heading`, `Text`, `Label`, `Link` |
| Actions | `Button`, `SplitButton`, `Dropdown` |
| Forms | `TextInput`, `Textarea`, `Select`, `Checkbox`, `RadioList`, `Switch`, `SegmentedControl`, `Slider` |
| Feedback | `Notice`, `Badge`, `Tag`, `LoadingBar`, `LoadingCircle` |
| Overlays | `Dialog`, `Flyout`, `Tooltip` |
| Data | `Table`, `OrderableList`, `Accordion`, `Tabs` |

Accessibility defaults:

- Icon-only actions need `aria-label` or `title`.
- Inputs need a visible `Label` linked with `htmlFor`, or an accessible
  name via `aria-label`/`aria-labelledby`.
- `Dialog.Content` needs `Dialog.Title`; use `screenReaderOnly` if needed.
- `Table.Root` needs `aria-label` or `Table.Caption`.
- `LoadingBar` needs `aria-label` or `aria-labelledby`.

---

## Full reference

See [references/fondue.md](references/fondue.md) for component selection,
tokens, icons, accessibility, theme boundaries, and the verification notes
from the Custom extensions documentation.
