---
name: frontify-custom-block
description: >
  Scaffolds, develops, and tests Frontify Content Block extensions — React/TypeScript
  components placed on Brand Guideline pages by editors using the Frontify Brand SDK.
  Loaded by the build-for-frontify orchestrator when the user chooses "custom block",
  or directly when the user asks to modify, debug, or deploy an existing Content Block.
  For NEW Content Block projects, prefer routing through build-for-frontify first — it
  owns the project-bootstrap concerns (Brand SDK prerequisites, Frontify CLI install,
  optional PRD/tasks planning, and the shared resource skills map). Use this skill
  whenever a user mentions Content Blocks, Brand Guidelines blocks, guideline blocks,
  the Brand SDK, @frontify/app-bridge, @frontify/guideline-blocks-settings, or wants
  to create a custom component for Frontify Guidelines.
compatibility: Designed for Claude Code and similar agentic development tools.
metadata:
  author: Frontify
  version: "1.0"
---

# Frontify Custom Block

A **Content Block** is a React/TypeScript component that an editor places onto a Brand
Guideline page in Frontify. Frontify ships 40 built-in blocks (image, text, color palette,
etc.); the Brand SDK lets developers build custom ones for any use case that isn't covered.
Blocks run inside the Frontify host under the AppBridge — they receive an authenticated
session automatically, can read brand/guideline context, and communicate settings back to
the host's sidebar. Blocks can be kept private (visible only within one Frontify environment)
or published to the Frontify Marketplace for others to install.

---

## Before you start — load the orchestrator for new projects

If this is a **new** Content Block (not yet scaffolded), also load
[`../build-for-frontify/SKILL.md`](../build-for-frontify/SKILL.md). It owns the
upstream concerns this skill assumes are handled:

- **Brand SDK prerequisites** — Node ≥ 22.14, React Developer Tools, Frontify
  account / sandbox, WSL 2 on Windows.
- **Frontify CLI install** — install with `npm install -g @frontify/frontify-cli`.
- **Build validation** — run `npx tsc --noEmit` and `npx eslint src` during
  iteration and before deployment.
- **Shared resource map** — when to load `frontify-auth-block`, `frontify-graphql`,
  `frontify-deployment`, `frontify-fondue`.

For an **existing** Content Block project (debugging, extending, deploying), you
can stay in this skill and reach for shared skills via the handoff table at the
bottom.

---

## Gather intent before writing any code

Before scaffolding or writing block code, extract answers to the questions below
from the user's prompt. If something is clearly stated, use it — only ask about
what is genuinely unclear.

| Question | Why it matters |
|----------|---------------|
| What does the block display? (text, image, embed, chart, …) | Determines component structure and which hooks are needed |
| What should editors be able to configure in the sidebar? | Drives the settings schema — types, sections, defaults |
| Does the block show assets from the Frontify DAM? | If yes: add `assetInput` setting + `useBlockAssets` hook |
| Should the block behave differently in edit vs. view mode? | If yes: use `useEditorState` to branch the UI |
| CSS preference: Tailwind, CSS Modules, or none? | Passed to the CLI prompt; affects `postcss.config.js` |

Once you have enough context, proceed directly to scaffolding and code — don't ask
for confirmation on every detail.

---

## Project setup

### Prerequisites

| Requirement | Version / Notes |
|-------------|-----------------|
| Node.js | 22.14 or newer (`node --version`) |
| npm / npx | Bundled with Node |
| React Developer Tools | Chrome or Firefox extension — required for HMR |
| Frontify account | Developer Sandbox needed to preview blocks |

### Scaffold a new block

The official way to create a block is through the Frontify CLI:

```bash
npx @frontify/frontify-cli@latest create
```

This launches an interactive prompt that asks for a name, CSS framework preference (Tailwind,
CSS Modules, or none), and other options. It then generates the full project.

Alternatively, use the `scripts/scaffold.sh` helper in this skill directory, which wraps
the CLI call with prerequisite checking and prints helpful next steps:

```bash
bash scripts/scaffold.sh
```

### Generated structure

`manifest.json` holds the Marketplace app ID — fill it in after registering the block:

```json
{ "appId": "<your-app-id-from-the-frontify-marketplace>" }
```

```
my-block/
├── manifest.json       # Marketplace metadata (appId, searchFields)
├── package.json        # Dependencies and npm scripts
├── tsconfig.json       # TypeScript config
├── postcss.config.js   # CSS pipeline (varies by CSS option chosen)
├── tailwind.config.js  # Only present if Tailwind was selected
├── cssModule.d.ts      # Only present if CSS Modules was selected
├── README.md
└── src/
    ├── index.ts        # Entry point — exports defineBlock({ block, settings })
    ├── Block.tsx       # React component that renders in the Guideline
    └── settings.ts     # Sidebar settings schema — defineSettings({...})
```

After generation, install dependencies:

```bash
cd my-block
npm install
```

### Verify the scaffold succeeded

```bash
npm run build     # Should exit 0 with no TypeScript errors
```

---

## Development workflow

### Start the local dev server

```bash
npm run serve
# or directly via CLI:
npx @frontify/frontify-cli@latest serve --entryPath src/index.ts
```

Default port is **5600**. The serve command supports:

| Option | Default | Description |
|--------|---------|-------------|
| `--entryPath` | `src/index.ts` | Path to entry file |
| `--port` | `5600` | Local web server port |

### Connect to Frontify for preview

1. Navigate to your Frontify Guidelines in the browser.
2. Add the **"Local Block Development"** block to a guideline page.
3. In its settings sidebar, enter the port number (default `5600`).
4. Your block renders live — changes hot-reload via HMR as you save files.

> React Developer Tools must be installed in the browser for HMR to work correctly.

### Hot reload behaviour

- Editing `src/Block.tsx` or other React files triggers instant HMR — the block
  updates without losing settings state.
- Editing `src/settings.ts` (the sidebar schema) requires a page refresh to pick up
  structural changes.
- Stop the server with `Ctrl-C`; restart with `npm run serve`.

---

## Custom block API

The full reference is in [references/custom-block-api.md](references/custom-block-api.md).
Read it when the user is writing block logic, wiring up settings, or asking about a
specific API capability. Here are the high-level concepts:

### Core packages

| Package | Purpose |
|---------|---------|
| `@frontify/guideline-blocks-settings` | `defineBlock`, `defineSettings`, `BlockProps` — the structural entry points |
| `@frontify/app-bridge` | React hooks for settings, assets, editing state, uploads, etc. |

### Block entry point (`src/index.ts`)

```ts
import { defineBlock } from '@frontify/guideline-blocks-settings';
import { ContentBlock } from './Block';
import { settings } from './settings';

export default defineBlock({
    block: ContentBlock,
    settings,
    onBlockCreated: async ({ appBridge }) => { /* optional */ },
    onBlockDeleted: async ({ appBridge }) => { /* optional */ },
});
```

### Block component (`src/Block.tsx`)

The component receives `appBridge` as a prop and uses hooks to read settings, assets,
and editing state:

```ts
import type { FC } from 'react';
import type { BlockProps } from '@frontify/guideline-blocks-settings';
import { useBlockSettings, useEditorState } from '@frontify/app-bridge';

export const MyBlock: FC<BlockProps> = ({ appBridge }) => {
    const [settings, setSettings] = useBlockSettings<MySettings>(appBridge);
    const isEditing = useEditorState(appBridge);
    return <div>{isEditing ? 'Edit mode' : 'View mode'}</div>;
};
```

### Settings schema (`src/settings.ts`)

```ts
import { defineSettings } from '@frontify/guideline-blocks-settings';

export const settings = defineSettings({
    main: [],     // block-type selector
    basics: [],   // core block options
    layout: [],   // positioning and padding
    style: [],    // colors, borders, typography
    security: [], // asset access control
    custom: [],   // optional custom sections (ordered between Style and Security)
});
```

### Key AppBridge hooks

| Hook | Use |
|------|-----|
| `useBlockSettings(appBridge)` | Read/write sidebar setting values |
| `useEditorState(appBridge)` | `true` when the editor has edit mode active |
| `useBlockAssets(appBridge)` | Read/write assets linked to the block |
| `useAssetChooser(appBridge)` | Open the Frontify asset chooser modal |
| `useAssetUpload(appBridge)` | Upload new files to Frontify from the block |
| `useReadyForPrint(appBridge)` | Signal the host that async content is loaded |
| `usePrivacySettings(appBridge)` | Read download-allowed / asset-viewer settings |

See [references/custom-block-api.md](references/custom-block-api.md) for full hook signatures,
all setting types, lifecycle hooks, and constraint details.

---

## Testing

The scaffold does not include a pre-wired unit test setup. For a typical block:

1. **TypeScript compile check** — `npm run build` catches type errors; run it after
   any significant change.
2. **Live preview** — Start the dev server (`npm run serve`) and interact with the
   block in a real Frontify Guidelines page. This is the primary way to verify
   settings changes, asset flows, and edit/view mode behaviour.
3. **Marketplace dry-run** — Before publishing, run:
   ```bash
   npx @frontify/frontify-cli@latest deploy --dry-run
   ```
   This validates the bundle without actually publishing.

---

## CSS scoping

All CSS in a Content Block **must be scoped** to a unique root class to avoid leaking
styles into other blocks or the surrounding Guidelines page. This is a hard requirement
for Marketplace blocks and strongly recommended for private ones.

1. Wrap the block output in a root element with a unique class:
   ```tsx
   export const ContentBlock = ({ appBridge }: BlockProps) => (
       <div className="my-block">
           {/* content */}
       </div>
   );
   ```

2. Use the PostCSS scope helper to automatically prefix all CSS:
   ```js
   // postcss.config.js
   module.exports = {
       plugins: [
           require('./postcss/scope.js')({ scope: '.my-block' }),
           require('tailwindcss'),
           require('autoprefixer'),
       ],
   };
   ```
   The scope.js helper is at https://github.com/Frontify/guideline-blocks/blob/main/postcss/scope.js

   If you choose anything other than Tailwind, you are responsible for ensuring that
   all styles are properly scoped to the block's root element.

3. **Do not import global Fondue styles** (e.g. `@frontify/fondue/components/styles`)
   from inside a Content Block. The Frontify host already provides the Fondue styling
   context — re-importing it at the block level leaks unscoped CSS into the surrounding
   Guidelines page. Tailwind is safe because it is processed through the PostCSS scope
   pipeline and all generated classes are prefixed with the block root class.

---

## Handoff to shared resources

Load these companion skills when the work expands beyond block component code:

| Situation | Load |
|-----------|------|
| Auth — calling Frontify GraphQL via the bridge, 3rd-party API calls from a block, scope/permissions questions | `../frontify-auth-block/SKILL.md` |
| Reading or mutating Frontify data via GraphQL | `../frontify-graphql/SKILL.md` |
| Publishing, CI, versioning, deployment pipeline | `../frontify-deployment/SKILL.md` |
| Building UI with Fondue design system components | `../frontify-fondue/SKILL.md` |
