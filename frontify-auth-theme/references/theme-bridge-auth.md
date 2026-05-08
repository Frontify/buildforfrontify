# Theme Bridge — Auth-relevant API

A Theme talks to Frontify through the Brand SDK's theme bridge. This file
documents the auth-relevant pieces — which calls work, what context they
deliver, and how identity flows in.

> Hook and method names vary by SDK version. Always verify against the
> theme scaffolding's `package.json` and `src/index.tsx`. The shape below
> is the steady-state pattern across recent versions.

## Initialization

The theme scaffolding initialises the bridge for you. The theme's entry
component receives an `appBridge` prop (or provides one via context):

```tsx
import { type ThemeProps } from '@frontify/guideline-blocks-settings';

export const MyTheme = ({ appBridge }: ThemeProps) => {
  // appBridge is connected; no async login step
};
```

Construct nothing manually. There is no `Authorization` header to set, no
token to refresh. The host injects the user's session.

## Theme context — read-only identity of *where* you are

Hooks/properties expose the surrounding identity:

| Property | What it tells you |
|----------|-------------------|
| `brandId` | The brand the theme is currently styling |
| `projectId` | The guideline project (one brand can have many) |
| `portalId` | The published guideline surface (on `themeAction`) |
| `domain` | The Frontify account domain |
| `isEditing` | `true` in edit mode, `false` in view mode |

These are session-bound: the host pins the theme to the user's identity for
its entire lifecycle. There's no impersonation or account switch to
handle.

## Calling Frontify GraphQL

Themes call GraphQL through the AppBridge. The host injects the user's
session — you never set an `Authorization` header.

```ts
const result = await appBridge.executeGraphqlRequest({
  query: /* GraphQL */ `
    query GuidelinePages($projectId: ID!) {
      project(id: $projectId) {
        id
        title
        pages { items { id title } }
      }
    }
  `,
  variables: { projectId },
});
```

The exact method name is SDK-version dependent — alternatives you may see:

- `appBridge.api({ name: 'executeGraphql', payload: { query, variables } })`
- `appBridge.executeGraphQlRequest({...})`
- A `useGraphql` hook that wraps the same mechanic

All three end up at the same place: the host's GraphQL endpoint, with the
viewing user's credentials. **Do not** call `fetch('/graphql')` or
`fetch('https://<domain>/graphql')` directly — there's no token, the iframe
has no special access, and the request will 401 (or hit CORS).

For data modeling, see `../frontify-graphql/SKILL.md`.

## Reading the current user

```ts
const { data } = await appBridge.executeGraphqlRequest({
  query: `query { currentUser { id email name } }`,
});
```

This returns the **viewer or editor**, depending on who's looking at the
guideline. The theme has no notion of an "app user" decoupled from the
current viewer.

## Subscribing to state

```ts
appBridge.state('settings').subscribe((next, previous) => {
  // theme settings updated by an editor — re-render styles
});
```

Use this to react to editor changes in real time (the editor toggles a
color, the theme updates without a full reload).

## Error handling

The bridge call rejects (or returns `errors[]`) when:

- The query is malformed (GraphQL-level error)
- The user lacks permission on a queried entity
- The host has been disconnected (rare)

Treat each like an HTTP 403 from the integration side: missing permission
means the **user** can't do this, and refresh/retry won't help.

## Permissions in a theme

Like Custom Blocks, themes don't declare scopes. They run in the viewing
user's permission context. Always:

- **Branch on `isEditing`** to show editor-only controls
- **Check `currentUserPermissions`** in GraphQL responses before rendering
  write affordances:

  ```graphql
  query AssetForTheme($id: ID!) {
    asset(id: $id) {
      id
      title
      previewUrl
      currentUserPermissions { canDownload canEdit }
    }
  }
  ```

- **Don't elevate.** A viewer is a viewer; the theme can't elevate to
  editor mid-session.

## Quick decision: query Frontify or fetch external?

```
Need Frontify data (pages, assets, brands, users)?
  → executeGraphqlRequest via the bridge

Public/no-auth third party (open data, RSS, public CMS read)?
  → fetch() directly from the iframe — fine

Credentialed third party?
  → cannot do safely from a theme — proxy via your own backend, or
    build it as a Frontify App with executeSecureRequest instead
```

See `../frontify-auth-block/references/external-calls.md` for the proxy
walkthrough — the pattern is identical for themes — or
`../frontify-auth-app/SKILL.md` for the App route.

## What themes cannot do via the bridge

- **`executeSecureRequest`** — App-only. Themes that need credentialed
  third-party calls must proxy via a backend.
- **Bypass user permissions.** A viewer is a viewer.
- **Switch accounts or brands** mid-session. The theme is pinned to the
  surrounding context.
