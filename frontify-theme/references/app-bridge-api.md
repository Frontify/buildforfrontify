# AppBridgeTheme API Reference

The complete surface of the `AppBridgeTheme` object — every context key, state key, command, and React hook you can use from a theme. This file is the source of truth: if something isn't listed here, it probably doesn't exist on the public API.

## Table of contents

- [The four methods on `AppBridgeTheme`](#the-four-methods-on-appbridgetheme)
- [Context (read-only, subscribable)](#context-read-only-subscribable)
- [State (read-write, subscribable)](#state-read-write-subscribable)
- [Commands (dispatch to the platform)](#commands-dispatch-to-the-platform)
- [React hooks](#react-hooks)
- [Reading context: three approaches](#reading-context-three-approaches)
- [Events (advanced)](#events-advanced)
- [Guideline data shapes](#guideline-data-shapes)

## The four methods on `AppBridgeTheme`

```typescript
interface AppBridgeTheme {
    context<K>(key?: K): { get(); subscribe(cb); };
    state<K>(key?: K): { get(); set(value); subscribe(cb); };
    dispatch<CommandName>(command): Promise<void>;
    subscribe<EventName>(eventName, callback): EventUnsubscribeFunction;
}
```

- `context(key)` — read-only platform state (language, navigation, isEditing, etc.). Can't be mutated.
- `state(key)` — read-write theme-owned state (only `scrollTopOffset` right now). Mutable with `.set()`.
- `dispatch(command)` — send a command to the platform (open search, navigate, scroll).
- `subscribe(eventName, callback)` — low-level event subscription. Context and state each have their own `.subscribe()` already; this is rarely needed directly.

## Context (read-only, subscribable)

All context keys are accessed via `appBridge.context(key).get()` or the corresponding hook. Context is never written to directly — it reflects platform state.

| Key | Return type | Hook | Notes |
|-----|-------------|------|-------|
| `brandPortalLink` | `BrandPortalLink \| null` | — | Configured in the Navigation Manager. Use `.isEnabled()` before rendering. |
| `portalId` | `number` | — | The guideline's portal id. |
| `portalNavigation` | `PortalNavigationItem[] \| null` | `usePortalNavigation(appBridge)` | Top-level nav: cover page, document groups, documents, libraries, external links. |
| `documentNavigation` | `Record<number, DocumentChildNavigationItem[] \| undefined>` | `useDocumentNavigation(appBridge, document)` | **Lazy** — must be hydrated first. Prefer the hook. |
| `currentLanguage` | `string` (e.g. `"EN"`) | `useCurrentLanguage(appBridge)` | ISO code of the active language. |
| `defaultLanguage` | `string` | `useDefaultLanguage(appBridge)` | The guideline's default language. |
| `enabledFeatures` | `string[]` | `useEnabledFeatures(appBridge)` | e.g. `['AI_BRAND_ASSISTANT', 'PLATFORM_APPS']`. Check before rendering feature triggers. |
| `isEditing` | `boolean` | `useIsEditing(appBridge)` | True when the guideline is in edit mode. |
| `isPublicLink` | `boolean` | — | True when visitor arrived via a public link. |
| `isAuthenticated` | `boolean` | — | True when the current user is signed in. |
| `isAiBrandAssistantDialogOpen` | `boolean` | — | — |
| `isSearchDialogOpen` | `boolean` | — | — |
| `activeSectionHeadingId` | `number \| null` | `useActiveSectionHeadingId(appBridge)` | The currently scrolled-to heading. Useful for highlighting sidebar items. |
| `scrollableAreaAttributes` | `{ scrollTop: number } \| null` | `useScrollableAreaAttributes(appBridge)` | Current scroll position of the main scroll container. |
| `languages` | `Language[]` | `useLanguages(appBridge)` | All languages configured for the guideline. |
| `template` | `TemplateContext \| null` | `useTemplateContext(appBridge)` | The current template type + its data (see below). |
| `settings` | `{ templateSettings, templateAssets }` | `useSettings(appBridge)` | Current values of the theme settings for this template. |

### `TemplateContext` shape

`template` is a discriminated union on `type`:

```typescript
type TemplateContext =
    | { type: 'cover';        templateId: string; coverPage: CoverPage; }
    | { type: 'documentPage'; templateId: string; document: Document; documentPage: DocumentPage; }
    | { type: 'library';      templateId: string; document: DocumentLibrary; };
```

Narrow on `.type` before accessing the type-specific fields.

## State (read-write, subscribable)

State is theme-owned and mutable. Currently there is exactly one state key.

| Key | Type | Purpose |
|-----|------|---------|
| `scrollTopOffset` | `number` (pixels) | The total height of sticky elements at the top of the page. The platform reads this to calculate correct scroll positions for `navigateToSectionHeading`. **Set this to the sum of any sticky headers you render**, or the scroll-to-heading behavior will land in the wrong place. |

```typescript
appBridge.state('scrollTopOffset').set(80);
```

## Commands (dispatch to the platform)

Commands are dispatched via `appBridge.dispatch(commandCreator(...))`. Each creator is a small function that returns `{ name, payload }`. You import the creators from `@frontify/app-bridge-theme`.

| Command creator | Payload | Purpose |
|-----------------|---------|---------|
| `openSearchDialog()` | none | Open the platform's search dialog. |
| `closeSearchDialog()` | none | Close it. *(Deprecated — will be removed in v2.)* |
| `openAiBrandAssistantDialog()` | none | Open the AI Brand Assistant dialog. **Check `enabledFeatures.includes('AI_BRAND_ASSISTANT')` first** — dispatching when disabled does nothing useful. *(See rule F1.)* |
| `closeAiBrandAssistantDialog()` | none | Close it. *(Deprecated — will be removed in v2.)* |
| `navigate(path: string)` | URL string | Client-side navigation within the guideline. Use this for internal links so the SPA doesn't do a full reload. |
| `navigateToSectionHeading(id: number \| string)` | heading id | Scroll to a section heading on the current page. |
| `scrollPageToTop()` | none | Smoothly scroll to the top. Use for "back to top" buttons. |
| `hydrateContextDocumentNavigation(documentId: number)` | document id | Populates `context.documentNavigation[documentId]`. Required before reading document-level navigation. `useDocumentNavigation` does this for you. |

### Internal link example

```tsx
const handleClick = (event: MouseEvent, url: string) => {
    event.preventDefault();
    appBridge.dispatch(navigate(url));
};

<a href={url} onClick={(e) => handleClick(e, url)}>{title}</a>
```

Always preserve the `href` so right-click / cmd-click / accessibility tools work normally. Dispatch `navigate` on the click itself for SPA-style transitions.

## React hooks

The SDK exports ready-made hooks for most context keys. **Prefer these over calling `.get()` manually** — they handle subscription and re-rendering for you.

```typescript
import {
    useActiveSectionHeadingId,
    useCurrentLanguage,
    useDefaultLanguage,
    useDocumentNavigation,
    useEnabledFeatures,
    useIsEditing,
    useLanguages,
    usePortalNavigation,
    useScrollableAreaAttributes,
    useSettings,
    useTemplateContext,
} from '@frontify/app-bridge-theme';
```

All hooks take `appBridge` as their first argument. `useDocumentNavigation` additionally takes a `DocumentNavigationItem` (it hydrates that document's navigation for you).

### `useSettings` generic

`useSettings` accepts a type parameter so `templateSettings` is strongly typed:

```typescript
const { templateSettings, templateAssets } = useSettings<MyTemplateSettings>(appBridge);
```

Where `MyTemplateSettings` matches the setting ids you declared in your settings structure.

## Reading context: three approaches

Picking the right approach matters — the wrong one is a common source of "why doesn't my component update" bugs.

### 1. `.get()` — one-shot read, no re-render

Use only for non-reactive reads, e.g. inside event handlers or effects where you don't need the UI to update on change.

```typescript
const current = appBridge.context('currentLanguage').get();
```

### 2. `.subscribe(cb)` — manual subscription

Returns an `unsubscribe` function. Use when you need to react to changes outside React's rendering cycle.

```typescript
useEffect(() => {
    const unsubscribe = appBridge
        .context('currentLanguage')
        .subscribe((next) => console.log('language changed to', next));
    return unsubscribe;
}, [appBridge]);
```

### 3. `useSyncExternalStore` or a prebuilt hook — reactive read

**This is the default.** Triggers re-render when the value changes.

```typescript
// Low-level
const currentLanguage = useSyncExternalStore(
    appBridge.context('currentLanguage').subscribe,
    appBridge.context('currentLanguage').get,
);

// Or, equivalently, the convenience hook
const currentLanguage = useCurrentLanguage(appBridge);
```

Use the convenience hook when one exists. For context keys without a convenience hook (`brandPortalLink`, `isPublicLink`, `isAuthenticated`, etc.), fall back to `useSyncExternalStore`.

## Events (advanced)

`appBridge.subscribe(eventName, callback)` exposes a lower-level event bus. Two categories exist:

- Context and state changes are also emitted as events (`Context.currentLanguage`, `State.scrollTopOffset`, plus `Context.*` / `State.*` wildcards). You rarely need these directly — the per-key `.subscribe()` methods are more ergonomic.
- `assetsChosen` fires when an asset selection flow completes. This is the main first-class event.

Unless you specifically need wildcard subscriptions or cross-cutting event logic, prefer the context/state `.subscribe()` or hooks.

## Guideline data shapes

The navigation items and page objects have a consistent pattern: fields are accessed via method calls (not plain properties), and language-dependent fields take an optional language ISO code.

### Common method signatures

- `id()` → `number`
- `title(language?: string)` → `string`
- `slug(language?: string)` → `string`
- `url(language?: string)` → `string`
- `isPublished()` → `boolean` (on pages)
- `isHiddenInNavigation()` → `boolean` (on cover pages)
- `type` → a discriminator string (`'cover-page'`, `'document'`, `'document-library'`, `'document-group'`, `'document-link'`, `'page-category'`, `'document-page'`, `'document-page-link'`, `'document-page-heading'`)

### `PortalNavigationItem` union

`portalNavigation` returns one of:

- `CoverPageNavigationItem` (`type: 'cover-page'`)
- `DocumentGroupNavigationItem` (`type: 'document-group'`) — has `.children()`
- `DocumentNavigationItem` (`type: 'document'`)
- `DocumentLibraryNavigationItem` (`type: 'document-library'`)
- `DocumentLinkNavigationItem` (`type: 'document-link'`) — external link, has `.displayMode()`, `.iconPosition()`, `.customIconUrl()`, `.shouldOpenInNewTab()`

Always narrow on `.type` before accessing variant-specific fields.

### `DocumentChildNavigationItem` union

The inside of a document (returned by `useDocumentNavigation`):

- `PageCategoryNavigationItem` (`type: 'page-category'`) — has `.children()` returning pages/links
- `DocumentPageNavigationItem` (`type: 'document-page'`) — has `.headings()` returning `DocumentPageHeadingNavigationItem[]`
- `DocumentPageLinkNavigationItem` (`type: 'document-page-link'`) — external link from within a document

### `DocumentPage` (on `templateContext` when `type === 'documentPage'`)

In addition to the common methods:
- `categoryId()` → `Nullable<number>`
- `documentId()` → `number`
- `previousPage()` → `Nullable<AdjacentPage>` — use for custom pagination
- `nextPage()` → `Nullable<AdjacentPage>` — use for custom pagination
- `lastModified()` → `Date` — use for "Last modified on" components

### `Language`

```typescript
interface Language {
    isoCode: string;   // "EN", "DE", ...
    name: string;      // "English", "Deutsch", ...
    // additional metadata
}
```

## Things the theme cannot do

Coming up often enough to call out explicitly:

- **Restructure the navigation tree** — the navigation is set in the Navigation Manager, outside of themes. You can style it, filter it (e.g. hide unpublished cover pages when not editing), but not reorder or redefine the hierarchy.
- **Replace or customize the 404 page** — not supported.
- **Hide platform-provided settings sections** in the sidebar — those sections configure theme-agnostic components and are required.
- **Access settings from other pages or templates** — cross-page settings reads aren't supported.
- **Customize library document UI elements** — not supported.
- **Translate setting labels** — the settings sidebar labels are not localizable.

When a user asks for one of these, explain the limitation and direct them to the Frontify Slack community for feature requests.