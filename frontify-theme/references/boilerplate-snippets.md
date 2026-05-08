# Boilerplate Snippets

Ready-to-adapt code patterns pulled from the official Frontify boilerplate and Muse themes. Use these as starting points instead of writing from scratch — they capture the conventions Frontify uses internally and handle the edge cases correctly.

## Minimal theme entry

The smallest `src/index.ts` that satisfies all three templates. Use this when the theme looks identical across template types.

```tsx
// src/index.ts
import './theme.css';
import { defineSettings, defineTheme } from '@frontify/guideline-themes';
import { MyTheme } from './MyTheme';
import { settingsStructure } from './settings';

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

## Top-level template router

A single component that branches on `templateContext.type`. All three layouts get `<Content />` and a conditional `<Footer />`.

```tsx
// src/MyTheme.tsx
import { useTemplateContext } from '@frontify/app-bridge-theme';
import type { ThemeProps } from '@frontify/guideline-themes';
import type { ReactElement } from 'react';
import { CoverPage } from './CoverPage';
import { DocumentPage } from './DocumentPage';
import { LibraryPage } from './LibraryPage';

export const MyTheme = ({ appBridge, Content, Footer }: ThemeProps): ReactElement | null => {
    const templateContext = useTemplateContext(appBridge);
    if (!templateContext) return null;

    return (
        <div id="my-theme">
            {templateContext.type === 'cover' && (
                <CoverPage appBridge={appBridge}>
                    <Content />
                    {Footer && <Footer />}
                </CoverPage>
            )}

            {templateContext.type === 'documentPage' && (
                <DocumentPage appBridge={appBridge} documentId={templateContext.document.id()}>
                    <Content />
                    {Footer && <Footer />}
                </DocumentPage>
            )}

            {templateContext.type === 'library' && (
                <LibraryPage appBridge={appBridge}>
                    <Content />
                    {Footer && <Footer />}
                </LibraryPage>
            )}
        </div>
    );
};
```

## A per-template layout (documentPage)

```tsx
// src/DocumentPage.tsx
import { type AppBridgeTheme, usePortalNavigation, useSettings } from '@frontify/app-bridge-theme';
import { type ReactNode, useMemo } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { findDocumentById } from './helpers/findDocumentById';
import type { TemplateSettings } from './types';

type DocumentPageProps = {
    appBridge: AppBridgeTheme;
    documentId: number;
    children?: ReactNode;
};

export const DocumentPage = ({ appBridge, documentId, children }: DocumentPageProps) => {
    const { templateSettings, templateAssets } = useSettings<TemplateSettings['documentPage']>(appBridge);
    const navigationItems = usePortalNavigation(appBridge);
    const activeDocument = useMemo(
        () => findDocumentById(navigationItems, documentId),
        [documentId, navigationItems],
    );

    if (!templateSettings || !templateAssets) return null;

    return (
        <div>
            <Header appBridge={appBridge} pageTemplateSettings={templateSettings} templateAssets={templateAssets} />
            <main>
                {activeDocument?.type === 'document' && (
                    <Sidebar appBridge={appBridge} document={activeDocument} />
                )}
                <div>{children}</div>
            </main>
        </div>
    );
};
```

## Portal-level navigation with type narrowing

`portalNavigation` is a union of five different node types. The key pattern is narrowing on `.type` before calling type-specific methods.

```tsx
// src/components/Navigation.tsx
import {
    type AppBridgeTheme,
    navigate,
    useCurrentLanguage,
    useIsEditing,
    usePortalNavigation,
    useTemplateContext,
} from '@frontify/app-bridge-theme';
import type { MouseEvent } from 'react';

export const Navigation = ({ appBridge }: { appBridge: AppBridgeTheme }) => {
    const portalNavigation = usePortalNavigation(appBridge);
    const isEditing = useIsEditing(appBridge);
    const currentLanguage = useCurrentLanguage(appBridge);
    const templateContext = useTemplateContext(appBridge);

    // Hide unpublished cover pages when not in edit mode
    const items = portalNavigation.filter((item) => {
        if (item.type === 'cover-page') {
            return (item.isPublished() && !item.isHiddenInNavigation()) || isEditing;
        }
        return true;
    });

    const navigateInternal = (event: MouseEvent, url: string) => {
        event.preventDefault();
        appBridge.dispatch(navigate(url));
    };

    return (
        <nav>
            <ul>
                {items.map((item) => (
                    <li key={`${item.type}-${item.id()}`}>
                        {item.type === 'cover-page' && (
                            <a
                                href={item.url(currentLanguage)}
                                onClick={(e) => navigateInternal(e, item.url(currentLanguage))}
                            >
                                {item.title(currentLanguage)}
                            </a>
                        )}
                        {(item.type === 'document' || item.type === 'document-library') && (
                            <a
                                href={item.url(currentLanguage)}
                                onClick={(e) => navigateInternal(e, item.url(currentLanguage))}
                            >
                                {item.title(currentLanguage)}
                            </a>
                        )}
                        {item.type === 'document-group' && (
                            <span>{item.title(currentLanguage)}</span>
                            // render item.children() recursively for nested groups
                        )}
                        {item.type === 'document-link' && (
                            <a
                                href={item.url()}
                                target={item.shouldOpenInNewTab() ? '_blank' : undefined}
                                rel="noreferrer"
                            >
                                {item.title(currentLanguage)}
                            </a>
                        )}
                    </li>
                ))}
            </ul>
        </nav>
    );
};
```

Always preserve the `href` on anchors so right-click, cmd-click, and accessibility tools keep working. `appBridge.dispatch(navigate(url))` handles the SPA transition on normal clicks.

## Document sidebar with lazy-hydrated navigation

Use `useDocumentNavigation` — it dispatches `hydrateContextDocumentNavigation` for you on mount.

```tsx
// src/components/Sidebar.tsx
import {
    type AppBridgeTheme,
    type DocumentNavigationItem,
    useCurrentLanguage,
    useDocumentNavigation,
    useTemplateContext,
} from '@frontify/app-bridge-theme';

type SidebarProps = {
    appBridge: AppBridgeTheme;
    document: DocumentNavigationItem;
};

export const Sidebar = ({ appBridge, document }: SidebarProps) => {
    const templateContext = useTemplateContext(appBridge);
    const currentLanguage = useCurrentLanguage(appBridge);
    const items = useDocumentNavigation(appBridge, document);

    const categories = items.filter((i) => i.type === 'page-category');
    const uncategorized = items.filter(
        (i) => i.type === 'document-page' || i.type === 'document-page-link',
    );

    if (templateContext?.type !== 'documentPage') return null;

    return (
        <aside>
            <nav>
                <ul>
                    {categories.map((category) =>
                        category.type === 'page-category' ? (
                            <li key={category.id()}>
                                <strong>{category.title(currentLanguage)}</strong>
                                <ul>
                                    {category.children().map((page) => (
                                        <li key={page.id()}>
                                            {page.type === 'document-page' && (
                                                <a href={page.url(currentLanguage)}>
                                                    {page.title(currentLanguage)}
                                                </a>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </li>
                        ) : null,
                    )}
                    {uncategorized.map((page) => (
                        <li key={page.id()}>
                            {page.type === 'document-page' && (
                                <a href={page.url(currentLanguage)}>{page.title(currentLanguage)}</a>
                            )}
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
};
```

## Language switcher

Builds a URL for each language by asking the current navigation item for its `url(isoCode)`.

```tsx
// src/components/LanguageSwitch.tsx
import {
    type AppBridgeTheme,
    type Language,
    useCurrentLanguage,
    useTemplateContext,
} from '@frontify/app-bridge-theme';
import { getCurrentNavigationItem } from '../helpers/getCurrentNavigationItem';

export const LanguageSwitch = ({
    appBridge,
    languages,
}: {
    appBridge: AppBridgeTheme;
    languages: Language[];
}) => {
    const templateContext = useTemplateContext(appBridge);
    const current = useCurrentLanguage(appBridge);
    const navItem = getCurrentNavigationItem(templateContext);
    if (!navItem) return null;

    return (
        <ul>
            {languages.map((language) => (
                <li key={language.isoCode}>
                    <a
                        href={navItem.url(language.isoCode)}
                        aria-current={language.isoCode === current ? 'true' : undefined}
                    >
                        {language.name}
                    </a>
                </li>
            ))}
        </ul>
    );
};
```

Only render the switcher when there's more than one language configured:

```tsx
const languages = useLanguages(appBridge);
{languages && languages.length > 1 && <LanguageSwitch appBridge={appBridge} languages={[...languages]} />}
```

## Header with platform dialogs and feature gating

```tsx
// src/components/Header.tsx
import {
    type AppBridgeTheme,
    openAiBrandAssistantDialog,
    openSearchDialog,
    useEnabledFeatures,
} from '@frontify/app-bridge-theme';

export const Header = ({ appBridge }: { appBridge: AppBridgeTheme }) => {
    const features = useEnabledFeatures(appBridge);

    return (
        <header>
            {/* ...logo, nav, language switch... */}

            <button onClick={() => appBridge.dispatch(openSearchDialog())}>Search</button>

            {features.includes('AI_BRAND_ASSISTANT') && (
                <button onClick={() => appBridge.dispatch(openAiBrandAssistantDialog())}>
                    Brand Assistant
                </button>
            )}
        </header>
    );
};
```

**Always gate feature-specific triggers on `enabledFeatures`.** Dispatching `openAiBrandAssistantDialog` when the feature is off silently does nothing, leaving the user confused. *(Rules F1, F2.)*

## "Back to top" button

```tsx
import { scrollPageToTop, useScrollableAreaAttributes } from '@frontify/app-bridge-theme';

const scroll = useScrollableAreaAttributes(appBridge);
const showButton = (scroll?.scrollTop ?? 0) > 200;

{showButton && (
    <button onClick={() => appBridge.dispatch(scrollPageToTop())}>Back to top</button>
)}
```

## Setting `scrollTopOffset` for a sticky header

If you have a sticky header, tell the platform its height so `navigateToSectionHeading` lands correctly.

```tsx
import { useLayoutEffect, useRef } from 'react';

const headerRef = useRef<HTMLElement>(null);

useLayoutEffect(() => {
    if (!headerRef.current) return;
    const height = headerRef.current.getBoundingClientRect().height;
    appBridge.state('scrollTopOffset').set(height);
}, [appBridge]);
```

If the header's height is dynamic (e.g. shrinks on scroll), update it on resize via a `ResizeObserver`.

## Custom pagination (previous/next page)

`templateContext.documentPage` has `.previousPage()` and `.nextPage()` returning `AdjacentPage | null`.

```tsx
const templateContext = useTemplateContext(appBridge);
const currentLanguage = useCurrentLanguage(appBridge);

if (templateContext?.type !== 'documentPage') return null;

const prev = templateContext.documentPage.previousPage();
const next = templateContext.documentPage.nextPage();

return (
    <nav aria-label="Page navigation">
        {prev && (
            <a
                href={prev.url(currentLanguage)}
                onClick={(e) => {
                    e.preventDefault();
                    appBridge.dispatch(navigate(prev.url(currentLanguage)));
                }}
            >
                ← {prev.title(currentLanguage)}
            </a>
        )}
        {next && (
            <a
                href={next.url(currentLanguage)}
                onClick={(e) => {
                    e.preventDefault();
                    appBridge.dispatch(navigate(next.url(currentLanguage)));
                }}
            >
                {next.title(currentLanguage)} →
            </a>
        )}
    </nav>
);
```

## Active section heading highlighting

Useful for "on this page" sidebars that follow scroll position.

```tsx
import { useActiveSectionHeadingId, useDocumentNavigation } from '@frontify/app-bridge-theme';

const activeId = useActiveSectionHeadingId(appBridge);
const navItems = useDocumentNavigation(appBridge, document);
const currentPage = navItems.find((i) => i.type === 'document-page' && /* match current */);

const headings = currentPage?.type === 'document-page' ? currentPage.headings() : [];

<ul>
    {headings.map((h) => (
        <li key={h.id()} className={activeId === h.id() ? 'active' : undefined}>
            <a
                href={`#${h.slug()}`}
                onClick={(e) => {
                    e.preventDefault();
                    appBridge.dispatch(navigateToSectionHeading(h.id()));
                }}
            >
                {h.title()}
            </a>
        </li>
    ))}
</ul>
```

## "Last modified on" component

```tsx
const templateContext = useTemplateContext(appBridge);
if (templateContext?.type !== 'documentPage') return null;

const lastModified = templateContext.documentPage.lastModified();

return <time dateTime={lastModified.toISOString()}>{lastModified.toLocaleDateString()}</time>;
```

## A representative settings structure

Logo visibility toggle + asset upload + size/position. Demonstrates `segmentedControls`, `assetInput`, conditional `show`, nested `multiInput`, `onChange` with `appendUnit`, and validation rules.

```tsx
// src/settings.tsx
import {
    AssetChooserObjectType,
    FileExtensionSets,
    IconEnum,
    type SettingBlock,
    type ThemeSettingsStructureExport,
    appendUnit,
} from '@frontify/guideline-themes';
import { DefaultLogoPageTemplateSettings } from './defaults';
import { numericalOrPixelOrPercentOrAutoRule } from './helpers/rules/numericalOrPixelOrPercentOrAutoRule';

const logoSettings: SettingBlock[] = [
    {
        id: 'logoVisibility',
        label: 'Visibility',
        type: 'segmentedControls',
        defaultValue: DefaultLogoPageTemplateSettings.logoVisibility ? 'show' : 'hide',
        choices: [
            { value: 'show', label: 'Show', icon: IconEnum.Eye },
            { value: 'hide', label: 'Hide', icon: IconEnum.EyeOff },
        ],
    },
    {
        id: 'logoAsset',
        type: 'assetInput',
        size: 'small',
        allowDelete: true,
        objectTypes: [AssetChooserObjectType.ImageVideo],
        extensions: FileExtensionSets.Images,
        show: (bundle) => bundle.getBlock('logoVisibility')?.value === 'show',
    },
    {
        id: 'logoLink',
        label: 'URL',
        type: 'link',
        placeholder: 'https://www.example.com',
        clearable: true,
        show: (bundle) => bundle.getBlock('logoVisibility')?.value === 'show',
    },
    {
        id: 'logoPositionAndSize',
        type: 'sectionHeading',
        label: '',
        show: (bundle) => bundle.getBlock('logoVisibility')?.value === 'show',
        blocks: [
            {
                id: 'logoSizeMultiInput',
                type: 'multiInput',
                blocks: [
                    {
                        id: 'logoWidth',
                        label: 'Width',
                        type: 'input',
                        defaultValue: DefaultLogoPageTemplateSettings.logoWidth,
                        onChange: (bundle) => appendUnit(bundle, 'logoWidth'),
                        rules: [numericalOrPixelOrPercentOrAutoRule],
                    },
                    {
                        id: 'logoHeight',
                        label: 'Height',
                        type: 'input',
                        defaultValue: DefaultLogoPageTemplateSettings.logoHeight,
                        onChange: (bundle) => appendUnit(bundle, 'logoHeight'),
                        rules: [numericalOrPixelOrPercentOrAutoRule],
                    },
                ],
            },
        ],
    },
];

export const settingsStructure: ThemeSettingsStructureExport = {
    logo: logoSettings,
};
```

## Typed settings shape + defaults

```typescript
// src/types.ts
import type { LinkBlock } from '@frontify/guideline-themes';

export type LogoPageTemplateSettings = {
    logoVisibility: 'show' | 'hide';
    logoLink: LinkBlock<unknown>['value'];
    logoWidth: string;
    logoHeight: string;
    logoX: string;
    logoY: string;
};

export type TemplateSettings = {
    cover?: LogoPageTemplateSettings;
    documentPage?: LogoPageTemplateSettings;
    library?: LogoPageTemplateSettings;
};
```

```typescript
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

## A tiny "active item" helper pattern

The boilerplate puts one helper per concept in `src/helpers/`. This is the house style — resist the urge to bundle them all into a single file.

```typescript
// src/helpers/isPageActive.ts
import type { DocumentPageNavigationItem, TemplateContext } from '@frontify/app-bridge-theme';

export const isPageActive = (
    page: DocumentPageNavigationItem,
    templateContext: TemplateContext | null,
) => templateContext?.type === 'documentPage' && templateContext.documentPage.id() === page.id();
```

```typescript
// src/helpers/isDocumentActive.ts
import type { DocumentNavigationItem, TemplateContext } from '@frontify/app-bridge-theme';

export const isDocumentActive = (
    document: DocumentNavigationItem,
    templateContext: TemplateContext | null,
) => templateContext?.type === 'documentPage' && templateContext.document.id() === document.id();
```

Pair each helper with a colocated `.test.ts` using Vitest + `@testing-library/react`.

## `getValueOrDefault` helper pattern

The boilerplate uses a small helper to resolve setting values with fallbacks:

```typescript
// src/helpers/settings.ts
type ValueOrDefaultArgs<T> = { value: T | undefined; defaultValue: T };

export const getValueOrDefault = <T>({ value, defaultValue }: ValueOrDefaultArgs<T>): T =>
    value === undefined || value === null ? defaultValue : value;
```

Then compose setting derivations on top, as in the Logo example — this isolates "where does this value come from" logic into a place that's easy to test.