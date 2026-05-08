# Fondue Design System Reference

Use this reference when implementing or reviewing Frontify extension UI. It
is intentionally scoped to Fondue usage. It does not replace the App, Content
Block, Theme, Auth, GraphQL, or Deployment skills.

---

## Source-of-truth order

1. Inspect the target project first:
   - Existing imports — distinguish modern (`@frontify/fondue/components`)
     from legacy (bare `@frontify/fondue`). Flag legacy usage explicitly to
     the user (see "Legacy vs. modern" below).
   - Installed package exports and TypeScript declarations
   - Existing project token/CSS conventions and side-effect style imports
2. Use the Fondue **Storybook** as the canonical visual + prop reference:
   <https://fondue-components.frontify.com>. Each component story carries a
   lifecycle badge (`[stable]`, `[experimental]`, `[legacy]`).
3. Query the `fondue_components` MCP when available:
   - `list_all_documentation` to discover Storybook ids
   - `get_documentation` for props and common story examples
   - `get_documentation_for_story` for variants
4. If MCP and Storybook are unavailable, continue with local sources:
   - Installed package exports and TypeScript declarations
   - Existing repo imports and examples
   - This reference
   - Official Custom extensions docs already present in the repo
5. Prefer installed package types for compilable code. Use Storybook/MCP for
   composition intent and accessibility patterns.

Never invent Fondue props, subcomponents, package names, or icon names. If
the MCP and package types are both unavailable, implement the closest stable
React/CSS structure and tell the user Fondue integration needs verification.

---

## Package layout

Fondue is a monorepo. The user-facing meta-package is `@frontify/fondue`,
which re-exports the individual sub-packages through path exports. Most
projects only need the meta-package.

| Path / package | Contents |
| --- | --- |
| `@frontify/fondue` (bare) | **Legacy** components — only present for backwards compatibility |
| `@frontify/fondue/components` | Modern components (re-export of `@frontify/fondue-components`) |
| `@frontify/fondue/components/styles` | Required CSS for modern components (side-effect import) |
| `@frontify/fondue/tokens/base` | Base design tokens as CSS variables (side-effect import) |
| `@frontify/fondue/tokens/tailwind` | Optional Tailwind preset |
| `@frontify/fondue/charts` | Chart components (re-export of `@frontify/fondue-charts`) |
| `@frontify/fondue/charts/styles` | Required CSS for charts (side-effect import) |
| `@frontify/fondue/rte` | Rich text editor (re-export of `@frontify/fondue-rte`) |
| `@frontify/fondue/rte/styles` | Required CSS for the RTE (side-effect import) |
| `@frontify/fondue/styles` | Legacy component CSS — only needed if importing from bare `@frontify/fondue` |
| `@frontify/fondue-icons` | Icon components (also re-exported, but commonly imported directly) |

The individual packages — `@frontify/fondue-components`,
`@frontify/fondue-icons`, `@frontify/fondue-charts`, `@frontify/fondue-rte`,
`@frontify/fondue-tokens` — are real packages and can be installed
independently when a project deliberately opts out of the meta-package.

### Legacy vs. modern (the most common Fondue bug)

```ts
// Modern — what new work should use
import { Button } from '@frontify/fondue/components';

// LEGACY — older Fondue components that are styled differently and have
// a different API. If you find these in a repo, surface it to the user.
import { Button } from '@frontify/fondue';
```

In the Storybook, legacy components have a `[legacy]` badge in the top bar.
A common symptom of accidentally using legacy components is that the UI
"looks like an older Frontify design" — buttons are slightly different,
typography is off, focus rings differ. The cause is almost always an import
from bare `@frontify/fondue` instead of `@frontify/fondue/components`.

---

## MCP setup

If the `fondue_components` MCP tools are missing, tell the user:

> Fondue MCP is not configured in this session. I can continue using installed
> package types and existing repo usage, but for best component accuracy you
> should add the Frontify Fondue MCP.

Do not silently edit the user's MCP configuration. If they approve, add this
server to their MCP config (verify the URL against current Frontify docs
before assuming it is current):

```toml
[mcp_servers.fondue_components]
url = "https://fondue-components.frontify.com/mcp"
```

After setup, verify it by calling `list_all_documentation` and confirming it
returns Fondue component ids such as `components-button`, `layout-flex`, and
`utilities-themeprovider`.

---

## Installation and imports

Do not blindly add packages. Check the extension scaffold first. If Fondue is
already installed, use the existing version and import path. If the existing
import path is bare `@frontify/fondue`, treat that as legacy and confirm with
the user before continuing.

### Install

```bash
pnpm add @frontify/fondue
# or: npm install @frontify/fondue
```

`@frontify/fondue-icons` is bundled via the meta-package's path exports but
is also commonly installed directly when only icons are needed:

```bash
pnpm add @frontify/fondue-icons
```

### Required side-effect imports (app root)

These imports must run **once at the app entry**, before any Fondue component
renders. Without them components render unstyled. Order matters: tokens
first, then component styles, then any add-on styles.

```ts
import '@frontify/fondue/tokens/base';
import '@frontify/fondue/components/styles';
// Add only if used:
import '@frontify/fondue/charts/styles';
import '@frontify/fondue/rte/styles';
import '@frontify/fondue/styles'; // legacy components only
```

### Component imports

```ts
import { Button, Flex, TextInput, ThemeProvider } from '@frontify/fondue/components';
import { IconPen, IconTrashBin } from '@frontify/fondue-icons';
```

### Wrap in `ThemeProvider`

Wrap Fondue UI in `ThemeProvider` unless the host application already provides
it. `ThemeProvider` may be nested; a child override applies to its subtree.

```tsx
import { ThemeProvider } from '@frontify/fondue/components';

export const App = () => (
  <ThemeProvider theme="light">
    {/* extension UI */}
  </ThemeProvider>
);
```

If using Fondue `Link` for SPA navigation, add `RouterProvider` inside
`ThemeProvider` and provide the host router adapters. `RouterProvider`
adapts Fondue's navigation primitives to the project's router (for example
React Router) so `Link` produces the right history entries.

### Tailwind (optional)

If the project uses Tailwind, extend its config with the Fondue preset so
`tw-*` utilities and Fondue tokens are available together.

```ts
// tailwind.config.ts
import fondueTailwindPreset from '@frontify/fondue/tokens/tailwind';

export default {
  presets: [fondueTailwindPreset],
  content: ['./src/**/*.{ts,tsx}'],
};
```

### Fonts (optional, environment-dependent)

Frontify UI uses **Diatype** as the default UI typeface and **Geist Mono**
for code. Fondue does not bundle font files. The Frontify platform itself
provides the fonts at runtime, so Apps and Content Blocks rendered inside
Frontify generally look correct without extra setup. For local development,
Storybook previews, marketing sites, or any standalone host, declare the
`@font-face` rules (or load from a CDN) before Fondue mounts; otherwise
typography falls back to system fonts and visually drifts from Frontify.

---

## Component selection

Prefer Fondue primitives over raw HTML or custom reimplementations when the
surface should match Frontify.

| Need | Prefer | Avoid |
| --- | --- | --- |
| Linear layout | `Flex` | Custom flex wrappers when props are enough |
| Two-axis layout | `Grid` | Manual CSS grid unless values are product-specific |
| Spacing/sizing wrapper | `Box` or `Section` | Empty divs with arbitrary classes |
| Headings | `Heading` | Raw headings with custom typography |
| Body text | `Text` | Raw paragraphs with custom typography |
| Form label | `Label` | Placeholder-only labels |
| User action | `Button` | Raw `button` |
| Primary action plus menu | `SplitButton` | Adjacent unrelated buttons |
| Action menu | `Dropdown` | `Select` for actions |
| Value selection | `Select` | `Dropdown` for values |
| Text field | `TextInput` | Raw `input` |
| Long text | `Textarea` | Multiline `TextInput` |
| Binary submitted option | `Checkbox` | `Switch` inside submitted forms |
| Immediate boolean setting | `Switch` | `Checkbox` for instant toggles |
| Small visible choice set | `SegmentedControl` | `Select` for 2-5 choices |
| Content panels | `Tabs` | Segmented controls that hide panels |
| Blocking modal | `Dialog` | Custom modal/flyout |
| Contextual panel | `Flyout` | `Dialog` for non-blocking controls |
| Hover hint | `Tooltip` | Interactive content in a tooltip |
| Data grid | `Table` | Div-based table |
| Reorderable items | `OrderableList` | Custom drag list |
| Inline alert | `Notice` | Custom alert banner |
| Status/count label | `Badge` | Custom pills |
| Interactive metadata chip | `Tag` | `Badge` for removable chips |

### Component cautions

- `Button`: use `aspect="square"` for icon-only buttons and provide `title`
  or `aria-label`.
- `SplitButton`: compose `SplitButton.Root`, `SplitButton.Content`,
  `SplitButton.Action`, and `SplitButton.ActionButton`; pair the action side
  with `Dropdown`.
- `TextInput`: use `TextInput.Root` and `TextInput.Slot` for left/right
  decorators. Pair with `Label`.
- `Select`: use `Select.Combobox` for searchable options,
  `Select.Multi`/`Select.Combobox.Multiple` for multiple values, and
  `Select.Group` for grouped options.
- `DatePicker`: dates are `{ year, month, day }` objects. Use `Flyout` for
  trigger/panel composition.
- `ColorPicker`: color values are RGBA objects. Use `Flyout` plus
  `ColorPicker.Input` for trigger/panel composition.
- `Dialog`: always include `Dialog.Title`; use `Dialog.Close` around cancel
  actions.
- `Flyout`: use `Flyout.Header`, `Flyout.Body`, and `Flyout.Footer` for
  standard panel layout.
- `Dropdown`: use `Dropdown.Item emphasis="danger"` for destructive actions.
- `Table`: compose `Table.Root > Table.Header + Table.Body`; use
  `Table.HeaderCell` and `Table.RowCell`.
- `Table.Root gutter`: include CSS units, e.g. `"16px"`, not `"16"`.
- `Tabs`: each `Tabs.Tab` needs a unique `value`.
- `LoadingBar`: provide an accessible label.
- `ScrollArea`: set `maxHeight` or `maxWidth`; use
  `scrollbarGutter="stable"` to prevent layout shift.

---

## Tokens and styling

Use Fondue component props first. Use tokens for composition details that
component props do not expose.

Rules:

- Prefer semantic token CSS variables over hard-coded values.
- Keep token references as variables, e.g. `var(--color-text-default)`, so
  themes can resolve them.
- Use `tw-` utility classes only when the project already uses that
  convention or a Fondue example does.
- Do not hard-code UI chrome colors unless the feature explicitly stores or
  displays a user-selected color.
- For Content Blocks, scope custom CSS to the block root. The Custom
  extensions docs warn that unscoped styles can affect other Content Blocks
  or the surrounding Guideline page.

### CSS variable naming pattern

Fondue tokens are exposed as CSS custom properties on the root, mirrored by
matching `tw-*` Tailwind utilities when the preset is active. The dominant
shape is:

```
--<category>-<role>-<variant>
```

| Category | Examples |
| --- | --- |
| `--color-` | `--color-text-default`, `--color-text-weak`, `--color-text-disabled`, `--color-background-default`, `--color-background-emphasized`, `--color-line-default`, `--color-line-mid`, `--color-primary-default`, `--color-primary-on-primary`, `--color-negative-default`, `--color-positive-default`, `--color-warning-default`, `--color-charts-1`, `--color-charts-2` |
| `--space-` | spacing scale, e.g. `--space-100`, `--space-200` |
| `--radius-` | corner radii |
| `--font-`, `--text-` | typography family/size/leading |
| `--shadow-` | elevation |

The `-on-<role>` form (e.g. `--color-primary-on-primary`,
`--color-negative-on-negative`) gives the **foreground** color to use on top
of the matching background — pair them rather than picking ad-hoc text
colors. Always read concrete token names from installed package types or the
Storybook before using them; the table above is a shape guide, not an
exhaustive list.

Useful lookup commands inside an extension repo:

```bash
rg "var\\(--color-|tw-.*(text|background|line|primary|charts)" .
rg "--color-text|--color-background|--color-line|--color-primary|--color-charts" node_modules/@frontify
```

---

## Icons

Use `@frontify/fondue-icons` for Frontify-style icons:

```tsx
import { IconPen } from '@frontify/fondue-icons';

<Button aspect="square" aria-label="Edit">
  <IconPen size={16} />
</Button>
```

Verify icon names against package exports or existing project imports. Use
16px icons in compact controls unless surrounding Fondue examples use a
different size.

---

## Accessibility

Fondue handles much of the component behavior, but the extension still owns
labels, intent, and composition.

Required checks:

- Icon-only controls have `aria-label` or `title`.
- Inputs have visible `Label` + `htmlFor`, or an accessible name.
- Related inputs are grouped visually and semantically.
- Destructive actions use danger styling and clear copy.
- Dialogs have a title and a clear close/cancel path.
- Loading states have accessible labels when the component requires them.
- Tables have `aria-label` or `Table.Caption`.
- Tooltips are hover/focus hints only; use `Flyout` or `Dialog` for
  interactive content.

---

## App UI

Use Fondue for App interfaces that should feel native: action modals,
settings-driven workflows, asset operation forms, confirmation dialogs,
tables, notices, and loading states.

The Custom extensions App docs describe App Settings in `src/settings.ts` and
note that App Settings use the same setup as Content Block Settings, except
Asset and Color inputs are unavailable. When building custom runtime UI around
those settings, use Fondue form and feedback components.

Do not put secrets or privileged calls in UI components; load
`../frontify-auth-app/SKILL.md` (specifically `references/secure-requests.md`)
or `../frontify-app/SKILL.md` for secure requests and AppBridge details.

---

## Content Block UI

Use Fondue for block editing controls, inline controls, empty states, feedback
messages, and block UI that should feel native. If the block is brand/content
presentation, custom styling is acceptable, but scope it.

The Custom extensions Content Block docs include:

- Settings patterns using `defineSettings` from
  `@frontify/guideline-blocks-settings`
- Color, border, multi-input, corner radius, height, width, padding, and
  positioning setting patterns
- CSS scoping guidance: public Content Blocks need a clear CSS scope because
  unscoped styles can affect other blocks or the surrounding Guideline page

Fondue does not replace the official block settings schema. Use Fondue for
custom UI rendered by the block; use the block settings APIs for sidebar
configuration.

---

## Theme Fondue boundary

Use Fondue in themes only where the surface is Fondue-relevant:

- Theme settings UI and editor-facing controls
- Platform-adjacent controls that should look native to Frontify
- Configuration forms, labels, notices, dialogs, flyouts, selects, toggles,
  segmented controls, loading states, tables, and tooltips

Do not force Fondue onto:

- Brand-specific guideline presentation
- Custom page headers, sidebars, footers, page titles, pagination, and
  navigation treatments
- Custom content layouts, animations, transitions, and theme expression

The Custom extensions Theme design docs explicitly distinguish theme-specific
components from settings UI: the Frontify design system is not used for
theme-specific components themselves, but is used for theme-agnostic settings
UI. Keep that boundary.

---

## Verification

Before finishing a Fondue-related change:

1. Search changed files for custom replacements of Fondue primitives:
   `button`, `input`, `select`, `textarea`, `dialog`, `table`, popover/menu
   code, and ad hoc loading/notice UI.
2. Confirm imports follow the repo's existing Fondue package convention.
   For new work, confirm modern components come from
   `@frontify/fondue/components`, **not** bare `@frontify/fondue` (that is
   the legacy set).
3. Confirm the app entry contains the required side-effect imports
   (`@frontify/fondue/tokens/base`, `@frontify/fondue/components/styles`,
   plus any add-on styles that are actually used).
4. Confirm the tree is wrapped in `ThemeProvider`.
5. Confirm every Fondue prop appears in installed package types, existing
   repo usage, Storybook, or MCP docs.
6. Confirm icon names come from `@frontify/fondue-icons`.
7. Confirm custom CSS is scoped for Content Blocks.
8. For theme work, confirm Fondue is used only on settings/editor/platform-like
   surfaces, not on brand-specific guideline presentation by default.
9. Run typecheck/tests if the repo provides them.

Verification against this repo's Custom extensions PDFs:

- `pdf/Custom extensions/Apps/Getting Started/App development.pdf`:
  App Settings live in `src/settings.ts`; Content Block Settings setup is the
  model, except Asset and Color inputs are unavailable.
- `pdf/Custom extensions/Content Blocks/Reference/Settings patterns.pdf`:
  block sidebar settings use `defineSettings` and documented setting patterns.
- `pdf/Custom extensions/Content Blocks/Reference/CSS scoping.pdf`:
  public Content Blocks must scope CSS to avoid affecting other blocks or the
  surrounding Guideline page.
- `pdf/Custom extensions/Themes/Guides/Designing a Theme.pdf`:
  the Frontify design system belongs to settings UI, while theme-specific
  branded components are custom.
