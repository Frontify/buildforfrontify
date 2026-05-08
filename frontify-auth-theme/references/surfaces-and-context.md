# Surfaces and Context — Themes

A Theme primarily renders the visual style of a Brand Guideline, but it can
also expose **actions** on the Guidelines surface. Each render path
delivers a different context object — this file documents them and the
auth-relevant differences.

> Some surfaces are in **Alpha** and may not be enabled in every Frontify
> environment. Request enablement via the Frontify Friends Slack channel
> if a surface isn't available.

## Default rendering — the theme styles a guideline

In normal rendering (a viewer or editor opens a guideline page), the theme
applies its visual treatment. The auth-relevant context is:

| Property | Notes |
|----------|-------|
| `brandId` | The current brand |
| `projectId` | The guideline project |
| `domain` | The Frontify account domain |
| `isEditing` | Edit mode vs. view mode |

No surface-specific identifier is needed — the theme is rendering, not
acting on a specific surface. Read context via the appropriate hooks for
the SDK version (e.g. `useEditorState`, theme settings hooks).

## `themeAction` (Alpha)

The `themeAction` surface lets a theme expose an **action button** invoked
from a Guideline. When the user clicks it, Frontify launches the action
handler with this context:

```ts
type ThemeActionContext = {
  surface: 'themeAction';
  portalId: string;       // published guideline (portal) ID
  projectId: string;      // guideline project
} & AppBaseProps;

type AppBaseProps = {
  brandId: number;
  domain: string;
  parentId: string;
  rootId: string;
};
```

Auth-relevant facts:

- The user is **already authenticated** — no token to obtain
- The action runs in **the user's permission context** — viewers can't
  perform editor-only actions, even if the action's button is visible
- The `portalId` ties the action to a specific published guideline; use it
  to scope GraphQL queries

### Branching on surface

If the theme registers `themeAction` and also renders normally, branch
your code on the surface identifier:

```ts
const ctx = appContext();
switch (ctx.surface) {
  case 'themeAction':
    return runAction(ctx.portalId, ctx.projectId);
  default:
    return renderStyles();
}
```

Or pin to the action surface where the code only makes sense there:

```ts
const ctx = appContext<ThemeActionContext>();
ctx.portalId; // typed
```

## Other Theme-related context properties

Themes commonly need:

| Concept | Where it comes from |
|---------|--------------------|
| Color tokens | Theme settings + brand color palette via GraphQL |
| Typography tokens | Theme settings + brand typography settings |
| Asset references | Theme settings (logo, hero image) — selected by editor |
| Navigation structure | `project { pages { items } }` GraphQL query |

All of these arrive **already authenticated**. The theme doesn't manage
identity for any of them.

## Auth-relevant differences across surfaces

| Surface | Token? | Scope dialog? | Per-surface context | Notes |
|---------|--------|---------------|---------------------|-------|
| Default render | none — bridge | none — no manifest scopes | brand/project/domain/isEditing | The common case |
| `themeAction` (Alpha) | none — bridge | none | + portalId, projectId | User-initiated action |

There is no surface where the theme handles raw OAuth tokens. If a flow
calls for that, it doesn't belong in a theme — it's either:

- An external integration (load `../frontify-auth-integration/SKILL.md`)
- A Frontify App (load `../frontify-auth-app/SKILL.md`)

## Permissions: what changes by surface?

- **Default render** — viewer/editor permissions apply per asset, per
  page, per section. Always check `currentUserPermissions` before
  rendering write affordances.
- **`themeAction`** — same rules, but the action button itself should be
  hidden for users who can't perform the action. Check the relevant
  permissions during render and conditionally show the button.

## Common pitfalls

- **Conflating `isEditing` with permissions.** `isEditing` is true only
  when the user has explicitly entered edit mode; it doesn't tell you the
  user's role. A viewer never sees `isEditing === true`, but an editor in
  view mode also sees `isEditing === false`. Use `currentUserPermissions`
  for permission decisions.
- **Treating `themeAction` like a Frontify App surface.** It runs in the
  theme's process; it has no `executeSecureRequest`, no manifest scopes,
  no separate scope dialog. If the action needs credentialed third-party
  calls, build it as an App instead.
- **Caching results across users.** Permissions and identity vary per
  user; key caches on user ID.
