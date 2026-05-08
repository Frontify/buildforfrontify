# Platform & Domain Rules

The rules that govern what a Frontify theme must do, must not do, and can reasonably expect from the platform. These are **business rules**, not coding style — they describe the contract between a theme and Frontify itself.

Read this file any time the task is "should my theme do X", "is Y allowed", or "what happens if…". Treat violations as bugs, not stylistic issues.

## Rule categories

- [Validity rules](#validity-rules) — if these fail, the theme is broken or won't load at all
- [Baseline rules](#baseline-rules) — the theme-agnostic foundation Frontify expects every theme to respect
- [Domain rules](#domain-rules) — how Frontify itself models guidelines, navigation, content, and settings
- [Feature gating rules](#feature-gating-rules) — what must be checked before exposing optional platform features
- [Hard limitations](#hard-limitations) — things the platform does not support today
- [Release & staging rules](#release--staging-rules) — how deployed themes behave in the Marketplace
- [Design principles](#design-principles) — non-binding but strong defaults

## Validity rules

These are non-negotiable. A theme that violates any of these will either fail to load, fail to deploy, or render incorrectly.

### V1. The manifest must identify the app as a theme

Every theme project needs a `manifest.json` at the root with:

```json
{
  "appType": "theme",
  "appId": "<marketplace-app-id>"
}
```

`appType: "theme"` is what tells Frontify to load the bundle as a theme (as opposed to a content block or a platform app). `appId` must be a real Marketplace App ID — the placeholder `<ADD_YOUR_MARKETPLACE_APP_ID_HERE>` will work for local dev via "Local Theme Development" but **deployment will fail**.

### V2. All three template types must be exported with a `default` variant

`defineTheme(...)` requires `cover`, `documentPage`, and `library` under `templates`, each with at least a `default`. A theme that omits any of them will render nothing on pages of that type — not an error, just silent blankness.

```ts
// Required shape:
templates: {
  cover:        { default: { component, settings }, ...optionalNamedVariants },
  documentPage: { default: { component, settings }, ...optionalNamedVariants },
  library:      { default: { component, settings }, ...optionalNamedVariants },
}
```

Named variants alongside `default` are optional and let editors choose per-page layouts.

### V3. Every `documentPage` template must render `<Content />`

The platform-provided `Content` component is the only way guideline content (sections, blocks, media, headings) reaches the page. If you forget it, document pages will appear empty to readers even though navigation and chrome look fine. The docs call this out explicitly as the critical rule for the `Content` component.

### V4. Render `<Footer />` conditionally

`Footer` is passed as `FC | null` — it can legitimately be `null` (the editor has removed it). Always guard:

```tsx
{Footer && <Footer />}
```

Unconditional rendering will throw when Footer is null.

### V5. Every theme setting must declare a default value

Themes are applied to guidelines that have never been configured. Without a default, the component receives `undefined` at render time and most layouts break. This is a platform-level rule, not just a style preference — the official documentation lists it alongside baseline compliance as a hard rule.

Provide defaults either via `defaultValue` on the setting block, or through a defaults module you merge into `templateSettings` in the component.

### V6. Do not mutate `context` values

Context is read-only by contract. It's enforced at the type level (values come back as `Readonly<T>`), but also a rule at the behavioral level: attempting to modify returned navigation items, settings, or template context will not sync back to the platform and will desync your UI from platform state.

## Baseline rules

Frontify's three-layer model treats certain functionality as **theme-agnostic baseline** — the foundation every theme shares. Removing or omitting baseline items is allowed by the SDK but causes UX issues across the Frontify ecosystem.

### B1. Respect the theme-agnostic baseline

The baseline layer (guideline-level, theme-agnostic) consists of:

**Type styles** — every theme should render these correctly because editors use them to author content:
- General: H1, H2, H3, H4, Body, Link, Quote
- Image: Title, Caption
- Custom styles: 01, 02, 03

**Button variants** — three levels editors can apply inline:
- Primary
- Secondary
- Tertiary

**Color schemes** — at minimum:
- Default (baseline)
- Custom schemes (editor-defined)

### B2. Strongly recommended baseline components

These are not required at the SDK level, but their absence meaningfully degrades the product. Include them unless there's an explicit product reason not to:

- **Logo input** — links to brand libraries
- **Global search** — searches across all platform areas the user can access (wire via `openSearchDialog` command)
- **Library search bar** — filters content within a library page
- **Language selector** — connects guideline localization to the view mode (needed whenever `languages.length > 1`)
- **Collection cards** — displays collection content and sharing status
- **Asset cards** — displays asset content and sharing status
- **Content area** — the structure where editors add sections and blocks (delivered via the `<Content />` prop)

Designers can **expand** beyond this baseline freely — add custom components, animations, unique layouts. They should **not remove** baseline items without understanding the downstream UX cost.

### B3. Frontify's design system (Fondue) is not used inside the rendered theme

Fondue is the internal design system Frontify uses. It is **not** used when building theme-specific components — the whole point of a custom theme is to apply your brand, which Fondue would fight. However, Fondue **is** used when the platform renders the settings sidebar controls you declare via `defineSettings` — that's handled behind the scenes and ensures consistent editor UX across themes.

Practical implication: don't try to import Fondue components into your theme layout. Use your own UI primitives.

### B4. Every baseline setting must have a default value

Restated from V5 but worth repeating in the baseline context: color scheme mappings, button styles, type styles, and other baseline settings are **especially** sensitive to missing defaults because editors may have mapped them to components that persist across theme changes.

## Domain rules

How Frontify models the guideline world. Understanding these is how you stop fighting the platform and start working with it.

### D1. The navigation hierarchy is fixed

Navigation is defined in the Navigation Manager, **outside** of the theme. Your theme cannot add custom node types, reorder the hierarchy, or restructure nesting.

**Current hierarchy:**

```
Portal
└─ Cover page | Document Group
   └─ Document | Library
      └─ Category
         └─ Document page | Library page
            └─ Section
               └─ Block
```

**Future hierarchy** (Frontify's stated direction — not yet live):

```
Portal
└─ Group
   └─ Page
      └─ Section
         └─ Block
```

Design navigation components to work with the current structure while keeping them adaptable to the future simplification. This means: don't hardcode assumptions about Category depth, don't treat Document as necessarily having children, and build around the discriminated union of node types rather than depth-counting.

### D2. Content is platform-owned

Guideline content — sections, blocks, media, headings, assets — is rendered by the `<Content />` component. The theme never touches this rendering path. You cannot:
- Intercept content rendering
- Inject custom blocks into `<Content />`
- Restyle platform blocks from the theme (they have their own settings)
- Read arbitrary block data to render your own version

The theme's job is the shell. Platform's job is the content. This separation is load-bearing.

### D3. Navigation is theme-agnostic; theme applies styling

You can style navigation items freely, filter them (e.g. hide unpublished cover pages when not editing), compute active states, and wire up transitions. You **cannot** add nav nodes that don't exist in the Navigation Manager, cross-link across documents in ways the Navigation Manager doesn't express, or invent synthetic grouping.

If a customer wants restructured navigation, the right answer is: raise it with Frontify Slack as a feature request, not build around the SDK.

### D4. Settings cascade top-down

Theme settings are the single source of truth. Values set at the theme level cascade down to all components and pages. For example: setting the background color to white in color scheme settings means all new pages default to white unless explicitly changed at a lower level.

Consequences:
- Design settings with cascading in mind — what's the sensible theme-wide default, and what should override it per-page?
- Don't try to build cross-page settings access in your theme code (not supported anyway, per limitation L4).

### D5. Color scheme values persist across theme changes

When a color scheme is mapped to a component (e.g. the default scheme is mapped to the header), those color values stay applied **even when the user switches to a different theme**. This is deliberate — it preserves brand continuity across theme changes.

Practical implication: design your components to consume color scheme values via the standard mapping rather than hardcoding colors. This makes your theme play well inside a multi-theme ecosystem and respects editor choices across switches.

### D6. The `AppBridgeTheme` is the only communication channel

Themes run in a sandbox. There is no `window` access to Frontify internals, no direct REST calls to platform APIs, no shared globals. Everything flows through `appBridge.context(...)`, `appBridge.state(...)`, `appBridge.dispatch(...)`, and `appBridge.subscribe(...)`. If a capability isn't on `AppBridgeTheme`, it's not available — don't try to reverse-engineer a workaround.

### D7. `documentNavigation` is lazy — hydration required

Unlike other context keys that are always populated, `documentNavigation` is a `Record<number, DocumentChildNavigationItem[] | undefined>` keyed by document id. Entries only exist after you dispatch `hydrateContextDocumentNavigation(documentId)`. The `useDocumentNavigation(appBridge, document)` hook handles this for you; prefer it over manual hydration.

Why this matters at a rule level: it reflects Frontify's domain model — documents have potentially large navigation trees that aren't fetched up-front for performance. Don't assume navigation is available; always hydrate.

### D8. `scrollTopOffset` is a contract for scroll math

The platform reads `state.scrollTopOffset` when handling `navigateToSectionHeading` to calculate correct scroll positions. If your theme has a sticky header, **you are responsible** for writing its total height into this state key. Failing to do so means scrolling to section headings lands underneath your header — a platform bug from the user's perspective, but actually a theme responsibility.

## Feature gating rules

Frontify exposes optional features via `context.enabledFeatures` (a `string[]` read with `useEnabledFeatures(appBridge)`). Some features exist on the platform but are disabled on a given guideline — either because the account hasn't opted in, the plan doesn't include it, or the feature is in a gated rollout. Themes must **check before exposing**, otherwise users see triggers that do nothing when clicked.

Known feature flags observed in the official Frontify sample themes:

- `AI_BRAND_ASSISTANT` — the AI Brand Assistant dialog (opened via `openAiBrandAssistantDialog`)
- `PLATFORM_APPS` — platform apps dialog (used in the boilerplate Header)

This list is not exhaustive; Frontify adds new flags over time. Treat any platform feature that could be selectively enabled per account as falling under these rules.

### F1. Any UI that triggers a gated feature must be conditionally rendered on `enabledFeatures`

If the theme exposes a button, link, menu item, or any other UI element whose sole purpose is to open or invoke a gated feature, that element must not render when the feature is disabled. Dispatching the corresponding command when the feature is off silently does nothing, leaving the user confused about why their click had no effect.

**Canonical pattern for the AI Brand Assistant trigger:**

```tsx
import { openAiBrandAssistantDialog, useEnabledFeatures } from '@frontify/app-bridge-theme';

const enabledFeatures = useEnabledFeatures(appBridge);

{enabledFeatures.includes('AI_BRAND_ASSISTANT') && (
    <button onClick={() => appBridge.dispatch(openAiBrandAssistantDialog())}>
        Brand Assistant
    </button>
)}
```

This is the exact pattern used in both the boilerplate's `Header` and the Muse theme's navigation components — it is the house style, not one option among several.

Apply the same check before any other AI-Brand-Assistant-related UI: menu entries, floating action buttons, keyboard-shortcut hints, onboarding tooltips. If it wouldn't make sense without the feature, it shouldn't render without the feature.

### F2. Use the `useEnabledFeatures` hook, not `.get()`

Features can be toggled at runtime (e.g. by an admin changing plan features, or by Frontify rolling out a gated release). Reading `appBridge.context('enabledFeatures').get()` once at mount will not reflect subsequent changes. Always use `useEnabledFeatures(appBridge)` so the UI reacts if the feature state changes during the session.

### F3. Don't invert the check — render explicitly when enabled, not when "not disabled"

Write the condition as `enabledFeatures.includes('AI_BRAND_ASSISTANT') && <...>`, not as `!enabledFeatures.includes('AI_BRAND_ASSISTANT') ? null : <...>` or similar. The first form is the one all Frontify sample code uses and it's easier to scan — "show this if the feature is on" reads cleanly, while negated forms obscure intent and are more error-prone when new flags are added.

### F4. Don't fake the feature when it's disabled

If `AI_BRAND_ASSISTANT` is off, don't replace the trigger with a disabled button, a tooltip saying "upgrade to unlock", or a link to marketing. The correct behavior is to render nothing. Upselling is the platform's responsibility, not the theme's — second-guessing that boundary produces inconsistent UX across the Frontify ecosystem.

### F5. Test both states

When building anything that gates on a feature flag, verify the component renders correctly in both states — enabled and disabled. Mock `useEnabledFeatures` in tests to return each case, or flip the feature in your dev environment to confirm. The "enabled" path is what gets tested by default; the "disabled" path is where bugs hide because nobody thought about it.

## Hard limitations

Things the platform genuinely does not support today. When a user asks for these, the correct answer is to explain the limitation and direct them to Frontify Slack for feature requests. Don't try to engineer around them.

### L1. No per-guideline theme versions

You cannot deploy a theme version that's only visible to specific guidelines. When you deploy an update to a theme's Marketplace App ID, all guidelines using that theme get the new version immediately.

**Workaround:** use a separate Marketplace App ID for staging. See release rule R2.

### L2. No translation of sidebar settings labels

Settings sidebar labels (the text shown to editors when configuring the theme) cannot be localized. The sidebar renders in a single language regardless of the editor's locale. This is a Frontify-side limitation, not something the theme controls.

### L3. No custom 404 page

The platform's default 404 page cannot be replaced or customized from a theme.

### L4. No cross-page settings access

A page cannot read settings from another page or template. `useSettings` scopes to the current template instance. If your design requires cross-page settings (e.g. "use the cover page's logo on document pages"), the answer today is "not supported" — design around it, typically by putting the shared value at the theme-wide level.

### L5. Platform-provided settings sections cannot be hidden

The sidebar's platform-provided sections (Content area, Sections, built-in Footer, etc.) are required and cannot be hidden from the theme. They configure theme-agnostic components the platform depends on for consistent behavior across themes.

### L6. Library document UI is not customizable

You can provide a layout for the `library` template type, but the internal UI of library documents (asset cards' internal behavior, filtering, sharing status) is not customizable from the theme.

### L7. Navigation structure cannot be extended

See D1. Adding custom node types, reordering beyond the hierarchy, or inventing synthetic groupings is not supported.

### L8. Mobile layouts should be hardcoded for now

The platform does not yet expose flexible mobile responsiveness primitives for themes. The documentation explicitly recommends designing desktop-first and hardcoding mobile views. Don't build an elaborate responsive system expecting future platform support without checking first.

## Release & staging rules

How your theme behaves once deployed.

### R1. Required OAuth scopes for deployment

When deploying via an authentication token (e.g. CI/CD), the token must have these scopes:
- `basic:read`
- `blocks:read`
- `blocks:write`

Generate at `https://<your-domain>/api/oauth-access-token/show`. Tokens without these scopes will fail deployment with an authentication error.

### R2. Staging requires a separate Marketplace App ID

Because of L1, the only supported way to test a theme in a production-like environment without affecting live guidelines is:

1. Create a separate Marketplace App ID for staging.
2. Deploy your work-in-progress build under that staging App ID.
3. Assign the staging theme only to test guidelines.
4. Once validated, deploy the same code to your **production** App ID.

This means your deployment pipeline needs to know which App ID to stamp into `manifest.json`. Keep the manifest templated (or swap it at build time) rather than hand-editing.

### R3. Marketplace publishing is a separate step from deployment

`frontify-cli deploy` uploads the theme to the instance and makes it available there. To list the theme on the Marketplace (so other customers can discover and install it), you still need to:

1. Open the Marketplace.
2. Find your theme.
3. Enter edit mode.
4. Click **Publish**.

This is a conscious distinction — deploy = available to your instance, publish = available to the Marketplace catalog.

### R4. Themes are installed then selected per guideline

For an end-user:

1. Install the theme from the Marketplace (once).
2. Select the theme on a specific guideline via **Theme Settings** → **Theme chooser**.

Installation alone does not apply the theme anywhere. This distinction matters when debugging "why isn't my theme showing up" — it may be installed but not selected on the guideline the user is viewing.

### R5. Development mode must be enabled on the instance

`frontify-cli serve` requires the "Local Theme Development" app to be present in the guideline's theme chooser. That app only appears when Frontify's team has enabled development mode on your instance — a support action triggered by messaging Frontify Slack. Without it, local development cannot work at all. Treat this as a prerequisite, not a troubleshooting step.

## Design principles

Non-binding but strong defaults. Deviate only with clear reason.

### P1. Start from the baseline, expand thoughtfully

The official guidance from Frontify: *"Stick to the baseline, expand thoughtfully beyond baseline requirements, and always define default values. If unsure, use the Classic theme as your reference point and build upward."*

Classic is the reference implementation. When you're unsure whether a decision is on-platform or off-platform, check what Classic does and ask whether your deviation is principled or accidental.

### P2. Decide customizability early

Every setting you expose is a maintenance burden and a surface for editors to create visual chaos. Decide up-front whether your theme is:
- **Highly customizable** — many settings, editors tune the brand themselves
- **Mostly static** — hardcoded values, editors adjust only content

The middle ground works but tends to drift. Pick a posture and defend it in settings reviews.

### P3. Design desktop-first, hardcode mobile

See L8. Frontify's stated direction is desktop-first; mobile views should be explicitly hardcoded until the platform provides better responsive primitives.

### P4. Prefer Marketplace visibility when shareable

If a theme is generalizable beyond your own brand (a template for a category of customers, a white-label pattern), Frontify's Marketplace reaches 1,200+ enterprise customers. That's a distribution channel worth optimizing for even at the cost of slightly more generic design.

### P5. Match the sample code's conventions

The Frontify boilerplate and Muse themes embody opinions — small focused helper files, `th-` Tailwind prefix, React function components, `/* (c) Copyright Frontify Ltd., all rights reserved. */` headers, Vitest for tests. Deviating is allowed; doing so for no reason makes your code harder for other Frontify theme developers to read. Match unless you have a reason.

### P6. Know which features require theme-specific custom components

Some commonly-requested guideline features are **not** covered by the theme-agnostic baseline and must be implemented as theme-specific custom components (or, for content surfaces, as Custom Blocks). Scope these into the theme work explicitly rather than discovering them mid-build:

- **Table of contents** — custom block or navigation component that consumes `useDocumentNavigation` + `headings()` per page.
- **Pagination** (previous / next page) — custom theme component using `templateContext.documentPage.previousPage()` / `.nextPage()`.
- **Logout button** — custom theme component (no built-in trigger).
- **Scroll-to-top** — custom theme component dispatching `scrollPageToTop`.
- **Breadcrumb navigation** — custom theme navigation component derived from `portalNavigation` and the active document/page.
- **Full-bleed headers** — custom navigation/header component, not a baseline option.
- **"Last modified on" timestamps** — custom theme component using `templateContext.documentPage.lastModified()`.
- **Custom page titles** — custom theme component using `templateContext.documentPage`.

See [`boilerplate-snippets.md`](boilerplate-snippets.md) for ready-to-adapt patterns for several of these (back-to-top, pagination, last-modified, active section heading).

## When a rule and a user request conflict

If a user asks for something that breaks a rule here, state the rule plainly, explain the consequence, and offer the nearest supported alternative. Don't silently do what they asked if it would produce a broken theme — the rules exist because the platform enforces them or because they prevent real downstream damage (missing defaults, unrenderable content, orphaned navigation). Name the rule you're invoking so the user can push back if they think it's wrong.

Genuine disagreements with a rule belong in Frontify Slack as feature requests, not in the code.