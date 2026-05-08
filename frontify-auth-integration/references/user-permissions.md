# User Permissions

Scopes describe what a token *may* attempt. **User permissions** describe
what the underlying user is *actually allowed* to do on a specific entity.
A request fails if **either** gate is closed. Always check both.

## The model

Permissions in Frontify are entity-based: a user might be allowed to view an
asset but not edit it, or be Editor on one library while remaining Viewer on
another. Three things compose to produce an effective permission:

1. **Account roles** — set in the customer's Frontify account configuration
2. **Library/project roles** — Viewer, Editor, Owner — assigned per
   collaborator
3. **Account-level customization** — fine-grained overrides per action
   (e.g. "Viewers in this account *can* download")

Because of the customization layer, **roles alone are not authoritative**.
A "Viewer" in one account may be able to download assets while a "Viewer"
in another cannot. Always trust the entity-level permission flags.

## `currentUserPermissions` in GraphQL

Every major entity exposes a `currentUserPermissions` field whose type
follows a uniform shape:

```graphql
type [Entity]UserPermissions {
  can[Action]: Boolean!
}
```

For example:

```graphql
type AssetUserPermissions {
  canEdit: Boolean!
  canDelete: Boolean!
  canDownload: Boolean!
  canComment: Boolean!
  # …
}
```

The full list of `can*` fields varies per entity. The asset reference is at
`https://frontify.github.io/graphql-reference/type/AssetUserPermissions`.

### Querying it

```graphql
query AssetWithPermissions($id: ID!) {
  asset(id: $id) {
    id
    title
    currentUserPermissions {
      canEdit
      canDelete
      canDownload
    }
  }
}
```

Use the result to gate the action **before attempting the mutation**. This
gives a clean UX (disable the button) and avoids inflating the 422/403 rate.

## Patterns

### Read-then-write

```ts
const { asset } = await client.query(GET_ASSET, { id });
if (!asset.currentUserPermissions.canEdit) {
  throw new Error('User cannot edit this asset');
}
await client.mutate(UPDATE_ASSET, { id, /* … */ });
```

### Bulk filtering

When operating across many entities, fetch permissions in the same query
and filter client-side:

```graphql
query AssetsToProcess($ids: [ID!]!) {
  assets(ids: $ids) {
    id
    currentUserPermissions { canEdit }
  }
}
```

Then process only `assets.filter(a => a.currentUserPermissions.canEdit)`.

### Surfacing in the UI

Map each `can*` flag to a button state. A disabled button with a tooltip
("You don't have permission to delete assets in this library") is far better
UX than letting the click 403.

## Why scopes alone aren't enough

Consider a user with the `basic:write` scope on their token who is a Viewer
on Library X. The token allows write attempts in principle, but the user is
not allowed to write into Library X. A `deleteAsset` against an asset in
that library will:

- Pass scope check (`basic:write` is present)
- Fail the user-permission check on `AssetUserPermissions.canDelete`
- Return **403 Forbidden**

This is by design. Tokens cannot grant permissions the user doesn't have.

## Library / project roles

For context, the standard collaborator roles in a library or workspace
project are:

| Role | Default capability |
|------|--------------------|
| **Viewer** | View content only |
| **Editor** | Create, update, delete |
| **Owner** | Modify settings of the library |

Each role's actual capabilities are further customised at the account
level. The full role/permission matrix is documented at
`https://help.frontify.com/en/articles/1356460-user-roles-and-permissions`.

## Common pitfalls

- **Trusting role labels.** "Editor" doesn't guarantee `canEdit` on every
  asset. Always check `currentUserPermissions`.
- **Caching permissions across users.** Permissions are per-user; if your
  integration impersonates multiple users, key the cache on user ID.
- **Skipping permissions on read-paths.** Even reads are permission-gated
  for some entities (e.g. private libraries). If a query returns
  `null` unexpectedly, check whether the user has access.
- **Treating 403s as auth failures.** A 403 with a valid token usually means
  permissions, not auth. Don't refresh the token — fix the user's access.
