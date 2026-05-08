# Scopes and Permissions — Custom Blocks

Custom Blocks have a different relationship with scopes than Apps or
external integrations. This file explains the model and the pitfalls.

## Blocks do NOT declare scopes

There is **no `permissions.scopes`** in a block's settings/config. The host
does not present an "Authorize permissions" dialog when an editor places a
block on a page. A block runs in whatever permission context the **viewing
or editing user** has — full stop.

### Why no scopes?

Scopes exist to limit what a third-party identity can do on behalf of a
user. A block is not a third party — it's a piece of UI rendered inside
the user's session. The only meaningful capability gate is "what can
*this user* do?", which is already enforced by Frontify's user-permission
model on every entity.

## What this means in practice

| Mode | Reads | Writes |
|------|-------|--------|
| Editor (edit mode) | Whatever the editor's account permits | Whatever the editor's account permits |
| Editor (view mode) | Same as edit mode for reads | Hidden by the host UI; check `isEditing` |
| Viewer | Whatever the viewer's account permits | Hidden by the host UI; the host blocks attempts |

The block should:

1. **Branch on `isEditing`** to show editor-only controls (use
   `useEditorState(appBridge)` or equivalent).
2. **Check `currentUserPermissions` in GraphQL responses** before rendering
   write affordances. A user with Viewer role on a library may still see
   the block, but they cannot edit assets in it.

## Checking permissions

Every major Frontify entity exposes `currentUserPermissions`:

```graphql
type [Entity]UserPermissions {
  can[Action]: Boolean!
}
```

For example, `AssetUserPermissions` exposes `canEdit`, `canDelete`,
`canDownload`, `canComment`. Always query the relevant flags alongside the
data you display:

```ts
const { data } = await appBridge.executeGraphqlRequest({
  query: `
    query AssetForBlock($id: ID!) {
      asset(id: $id) {
        id
        title
        previewUrl
        currentUserPermissions {
          canEdit
          canDownload
          canDelete
        }
      }
    }
  `,
  variables: { id: assetId },
});
```

Render write controls (Replace, Delete) only when the corresponding flag is
`true`.

## Reads, writes, and the editing-vs-viewing dimension

Two orthogonal axes determine what a block can do:

```
            Editor                Viewer
          ┌──────────────────┬──────────────────┐
edit mode │ Edit + write    │ (not applicable) │
          │ controls visible │                  │
          ├──────────────────┼──────────────────┤
view mode │ Read paths;      │ Read paths;      │
          │ write controls    │ write controls   │
          │ hidden            │ hidden           │
          │                   │                  │
          │ Constrained by    │ Constrained by   │
          │ user permissions  │ user permissions │
          └──────────────────┴──────────────────┘
```

The block controls the **first** axis (whether to render write controls)
via `isEditing`. The host enforces the **second** axis (whether the call
is actually allowed) via `currentUserPermissions` and 403s on
`executeGraphqlRequest`.

## Common pitfalls

### Showing a write button to a viewer

Symptom: the user clicks "Replace asset" and the call 403s. Cause: the
block didn't gate the button on `currentUserPermissions.canEdit`. Fix:
hide or disable the button when `canEdit` is false.

### Showing edit-mode UI in view mode

Symptom: settings widgets, drag handles, or "Add asset" prompts appear to
viewers. Cause: the block didn't branch on `isEditing`. Fix: only render
edit-only controls when `isEditing === true`.

### Trusting role labels

Symptom: an "Editor" can't actually delete an asset. Cause: the account
admin customised the Editor role to disallow delete in this library. The
role label says "Editor" but `canDelete` is false. Fix: trust
`currentUserPermissions`, never the role label.

### Caching permissions across users

Symptom: a viewer sees an editor's UI affordances, or vice versa. Cause:
the block cached `currentUserPermissions` keyed only by entity ID, not by
user. Fix: include the user ID in the cache key, or refetch on user
change.

### Treating a 403 as an auth failure

Symptom: a block "logs the user out" or shows a generic auth error on a
permission denial. Cause: conflating 401 (no/bad token) with 403
(permission denied). Fix: 403 in a block means "this user can't do this
specific thing" — show the user a meaningful message, don't try to
re-authenticate.

## What a block CAN do that an integration can't

Because blocks run in the user's session:

- **No tokens to manage.** No refresh, no expiry, no rotation.
- **No scope dialog at install.** Editors place blocks freely.
- **Per-user permissions automatically apply.** The same block renders
  differently for different viewers based on their access — no
  integration-side work needed.

## What a block CANNOT do

Because blocks have no separate identity:

- **Act on behalf of a different user.** No impersonation; the block sees
  what the current user sees.
- **Hold credentials for third-party APIs.** The block runs in the user's
  browser — see `external-calls.md` for the proxy pattern.
- **Run scheduled / background work.** The block is alive only while a
  user is on the page.
- **Survive the page.** Anything that needs to outlive a page view should
  be persisted to block settings or to your own backend.

## Quick checklist before publishing a block

- ✅ Every write-affordance is gated on the relevant
  `currentUserPermissions.can*` flag
- ✅ Editor-only UI is wrapped in `isEditing` checks
- ✅ Errors from `executeGraphqlRequest` are surfaced sensibly (not
  swallowed; not turned into "logout" prompts)
- ✅ No third-party API key or bearer token in the bundle
- ✅ Cache keys include the user ID where permissions vary per user
