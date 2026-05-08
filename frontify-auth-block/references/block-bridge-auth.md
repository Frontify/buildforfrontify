# Block Bridge — Auth-relevant API

Custom Blocks talk to Frontify through the Brand SDK's block bridge
(`@frontify/app-bridge` and the React hooks layered on top). This file
documents the auth-relevant pieces — which calls work, what scope they need,
and how identity flows in.

> Hook and method names vary slightly by SDK version. Always verify against
> the block scaffolding's `package.json` and `src/index.tsx`. The shape
> below is the steady-state pattern across recent versions.

## Initialization

The block scaffolding initialises the bridge for you. The block's entry
component receives an `appBridge` prop (or provides one via context):

```tsx
import { type BlockProps } from '@frontify/guideline-blocks-settings';

export const MyBlock = ({ appBridge }: BlockProps) => {
  // appBridge is already connected; no async login step
};
```

Construct nothing manually. There is no `Authorization` header to set, no
token to refresh.

## Block context — read-only identity of *where* you are

Hooks like `useEditorState`, `useBlockSettings`, `useBlockAssets`,
`useColorPalettes`, and `useGuidelineActions` expose pieces of the
surrounding context. Auth-relevant ones:

| Hook / property | What it tells you |
|-----------------|-------------------|
| `useEditorState(appBridge)` | `true` when the user is in edit mode, `false` in view mode. Drives whether the block exposes write controls |
| Block context object | Contains the current `brandId`, `projectId`, `guidelineId`, etc. Use these to scope queries to the surrounding brand |
| `useBlockAssets(appBridge)` | Assets the editor attached via the asset chooser. Already permission-checked by the host |
| `useBlockSettings(appBridge)` | The block's saved settings (editor-configured) |

These are session-bound: the host pins the block to the user's identity for
its entire lifecycle. There's no impersonation or account switch to handle.

## Calling Frontify GraphQL

Blocks call GraphQL **through** the AppBridge. The host injects the user's
session — you never set an `Authorization` header.

```ts
const result = await appBridge.executeGraphqlRequest({
  query: /* GraphQL */ `
    query LibraryAssets($id: ID!) {
      library(id: $id) {
        assets {
          items {
            id
            title
            currentUserPermissions { canEdit canDownload }
          }
        }
      }
    }
  `,
  variables: { id: libraryId },
});
```

The exact method name is SDK-version dependent — alternatives you may see:

- `appBridge.api({ name: 'executeGraphql', payload: { query, variables } })`
  (newer App-bridge-style API)
- `appBridge.executeGraphQlRequest({...})` (variant casing)
- A `useBlockApi`/`useGraphql` hook that wraps the same mechanic

All three end up at the same place: the host's GraphQL endpoint, with the
viewing user's credentials. **Do not** call `fetch('/graphql')` or
`fetch('https://<domain>/graphql')` directly — there's no token, the iframe
has no special access, and the request will 401 (or worse, hit CORS).

For data modeling, see `../frontify-graphql/SKILL.md`.

## Common context properties (auth-relevant)

The block's runtime context typically exposes:

```ts
type BlockContext = {
  brandId: number;       // surrounding brand
  projectId: string;     // guideline project
  // …per-SDK-version additions
};
```

Use these to:

- **Scope queries**: filter your GraphQL queries to the current brand to
  avoid pulling unrelated data
- **Generate stable cache keys**: per-brand, per-project, per-block-instance
- **Construct deep links** back into the host context (for share buttons,
  etc.)

They are not authentication tokens, but they're how the block knows where
it lives.

## Reading the current user

Querying the current user from a block:

```ts
const { data } = await appBridge.executeGraphqlRequest({
  query: `
    query {
      currentUser {
        id
        email
        name
      }
    }
  `,
});
```

This returns the **viewer or editor**, depending on who's looking at the
guideline. The block has no notion of an "app user" decoupled from the
current viewer.

## Error handling

The bridge call rejects (or returns `errors[]`) when:

- The query is malformed (GraphQL-level error)
- The user lacks permission on a queried entity (`currentUserPermissions`
  fails or `null` is returned)
- The host has been disconnected (rare — usually means the block's iframe
  was sandboxed with the wrong CSP)

Treat each like an HTTP 403 from the integration side: missing permission
means the **user** can't do this, and refresh/retry won't help.

## Subscribing to block state

```ts
appBridge.state('settings').subscribe((next, previous) => {
  // settings updated by an editor — re-render
});
```

Use this to react to editor changes in real time (the editor toggles a
setting; the block updates without a full reload).

## What blocks cannot do via the bridge

- **`executeSecureRequest`** — that's an App-only method. Blocks that need
  credentialed third-party calls must proxy via a backend (see
  `external-calls.md`).
- **Bypass user permissions.** A viewer is a viewer; the block can't
  elevate to editor mid-session.
- **Switch accounts.** The block runs against whatever account the
  guideline lives in.

## Quick decision: query Frontify or fetch external?

```
Need data from Frontify (assets, brands, guidelines, users)?
  → executeGraphqlRequest via the bridge

Need data from a public, no-auth third party (e.g. open data, RSS)?
  → fetch() directly from the iframe — fine

Need data from a credentialed third party?
  → cannot do safely from a block — either:
     a) proxy via your own backend (block fetches your backend; backend
        uses its own credentials), or
     b) build it as an App with executeSecureRequest instead
```

See `external-calls.md` for the proxy pattern and the App-vs-block tradeoff.
