# Settings Schema Reference

`settingsSchema` is a JSON Schema document in `manifest.json` that declares the shape of
everything your block stores. It is a **required** part of any Content Block that has settings,
and it is validated when you submit the block to the Marketplace.

Read this file when you are writing or changing `manifest.json`, adding a setting to
`src/settings.ts`, or preparing a Marketplace submission. For the sidebar settings API itself
(`defineSettings`, setting types, hooks), see [custom-block-api.md](custom-block-api.md).

**Table of contents**
1. [Why settingsSchema is required](#1-why-settingsschema-is-required)
2. [Canonical manifest.json](#2-canonical-manifestjson)
3. [Settings are stored flat](#3-settings-are-stored-flat)
4. [Frontify keywords](#4-frontify-keywords)
5. [Where keywords may sit](#5-where-keywords-may-sit)
6. [Setting type to JSON Schema type](#6-setting-type-to-json-schema-type)
7. [Translation and serialization](#7-translation-and-serialization)
8. [choices, enum, and defaultValue](#8-choices-enum-and-defaultvalue)
9. [Validating the schema](#9-validating-the-schema)
10. [Pre-submission checklist](#10-pre-submission-checklist)

---

## 1. Why settingsSchema is required

A block without a `settingsSchema` is accepted by the local tooling but degraded on the platform:

- Its settings **cannot be translated** in multi-language Guidelines.
- Its content is **not indexed for search**.
- The `settings` and `content` fields come back **`null`** on the public API.

New blocks must define one. A Marketplace submission whose block declares value settings but has
no `settingsSchema` is rejected.

Once a `settingsSchema` exists, every save must comply with it. A setting whose value does not
match the schema is rejected — so a wrong schema breaks the block at runtime, not just at review.

---

## 2. Canonical manifest.json

```json
{
    "appId": "<your-app-id-from-the-frontify-marketplace>",
    "settingsSchema": {
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "type": "object",
        "additionalProperties": false,
        "properties": {
            "title": {
                "type": "string",
                "frontify-translatable": true,
                "frontify-serializable": true,
                "frontify-serialization-index": 1,
                "frontify-api-read": true,
                "frontify-api-write": true
            },
            "showBorder": {
                "type": "boolean"
            },
            "columns": {
                "type": "integer",
                "minimum": 1,
                "maximum": 6
            }
        }
    }
}
```

Field notes:

- **`$schema`** — JSON Schema draft 2020-12. Use exactly this URL.
- **`type: "object"`** — block settings are a key/value object. A non-object root can never match
  anything the block saves.
- **`additionalProperties: false`** — strongly recommended. Without it, unexpected settings get
  persisted and drift accumulates silently. With it, **a setting missing from the schema can never
  be saved** — so the schema must be complete.
- **`properties`** — keyed by the setting `id` from `src/settings.ts`. One property per setting.
- Any arbitrary data your block writes through `useBlockSettings` must also be declared, for the
  same reason.

---

## 3. Settings are stored flat

**Every setting object that carries an `id` becomes a top-level property of
`settingsSchema.properties`, no matter how deeply it is nested in `src/settings.ts`.**

Nesting in `settings.ts` is a *sidebar layout* concern — which control appears under which section,
inside which switch, behind which heading. It has no effect on storage. Storage is one flat
key/value object keyed by setting `id`.

This is the single most common way to get the schema wrong: authors mirror the nesting of
`settings.ts` into nested schema objects, and every nested setting then fails to save.

### Example

```ts
// src/settings.ts
export const settings = defineSettings({
    basics: [
        { id: 'title', type: 'input', label: 'Title' },
    ],
    style: [
        {
            id: 'showBorder',
            type: 'switch',
            label: 'Show border',
            on: [
                { id: 'borderColor', type: 'colorInput', label: 'Colour' },
                { id: 'borderWidth', type: 'input', label: 'Width' },
            ],
            off: [],
        },
        {
            id: 'advanced',
            type: 'sectionHeading',
            label: 'Advanced',
            blocks: [
                { id: 'customClass', type: 'input', label: 'CSS class' },
            ],
        },
    ],
});
```

```json
{
    "type": "object",
    "additionalProperties": false,
    "properties": {
        "title":       { "type": "string", "frontify-translatable": true,
                         "frontify-serializable": true, "frontify-serialization-index": 1 },
        "showBorder":  { "type": "boolean" },
        "borderColor": { "type": ["object", "null"] },
        "borderWidth": { "type": "string" },
        "customClass": { "type": "string" }
    }
}
```

`borderColor`, `borderWidth` and `customClass` are **top-level**, even though they are nested two
levels deep in `settings.ts`. `advanced` gets no property at all — see the exceptions below.

### Exceptions — settings that store no value

Two setting types are pure presentation. They need **no** schema property:

| Type | Why |
|---|---|
| `notification` | Renders an info/warning banner. Not an input. |
| `sectionHeading` | Groups other settings under a heading. The settings inside it still get their own top-level properties. **Exception:** with `hasSwitch: true` it stores its own boolean — declare `{ "type": "boolean" }` for it. |

### multiInput

Declare a property for the `multiInput` container **and** one for each of its child `blocks`:

```ts
{
    id: 'padding',
    type: 'multiInput',
    blocks: [
        { id: 'paddingTop',  type: 'input', defaultValue: '0px' },
        { id: 'paddingLeft', type: 'input', defaultValue: '0px' },
    ],
}
```

```json
"padding":     {},
"paddingTop":  { "type": "string" },
"paddingLeft": { "type": "string" }
```

The children hold the values you read through `useBlockSettings`, so they get real types. The
container is declared as `{}` — an empty schema that accepts anything.

That looks odd, and it is a deliberate compromise. In
`@frontify/sidebar-settings@0.12.0`, `MultiInputBlock` intersects `BaseBlock<AppBridge>` with no
value parameter, which means **the container itself stores nothing** — the same declaration
`NotificationBlock` uses. But Marketplace review still expects a property for every setting id it
finds, including this one. Declaring `{}` satisfies the review without asserting a shape that the
type declarations say does not exist. Do not give it `"type": "array"`.

---

## 4. Frontify keywords

On top of standard JSON Schema, annotate individual fields with these keywords. All are optional
and all start with `frontify-`.

| Keyword | Value type | Meaning |
|---|---|---|
| `frontify-api-read` | boolean | Field can be read through the public API. Unmarked fields are excluded. |
| `frontify-api-write` | boolean | Field can be written through the public API. Unmarked fields are excluded. |
| `frontify-type` | string | Marks a special Frontify content type. **`"fondueRte"` is the only supported value** — it tells Frontify how to serialize rich-text content. |
| `frontify-translatable` | boolean | Users can translate this field in multi-language Guidelines. |
| `frontify-machine-translatable` | boolean | Field is included in AI translation. Translatable fields are machine-translatable by default; set `false` to opt a field out. |
| `frontify-serializable` | boolean | Field's content is serialized to text — search indexing, and the `content` value on the public API. |
| `frontify-serialization-index` | integer | Concatenation order for serializable fields. |

Containers do not need marking. When a leaf is exposed via `frontify-api-read`, the objects and
arrays around it are included automatically so the value can be reached.

If a field allows several types (`"type": ["null", "string"]`), a keyword on it applies to the
field regardless of which type the value takes at runtime. The keyword describes the field, not a
type.

---

## 5. Where keywords may sit

Two rules, both silent failures when broken — the manifest still validates, the keyword is just
ignored.

**1. Leaf fields only.** A keyword describes a single value, so it belongs on the `string`,
`number`, or `boolean` node — never on the object or array that contains it.

```json
// ❌ ignored — the keyword sits on a container
"card": {
    "type": "object",
    "frontify-translatable": true,
    "properties": {
        "title": { "type": "string" }
    }
}

// ✅ on the leaf
"card": {
    "type": "object",
    "properties": {
        "title": { "type": "string", "frontify-translatable": true }
    }
}
```

**2. Statically resolvable nodes only.** The field must be reachable from the schema alone —
through `properties`, `items`, or `$ref`. Keywords inside `oneOf`, `anyOf`, `allOf`, `if`, `then`,
`else`, or `not` are ignored, because those branches only resolve at runtime.

```json
// ❌ ignored — inside a conditional branch
"title": {
    "oneOf": [
        { "type": "string", "frontify-translatable": true },
        { "type": "null" }
    ]
}

// ✅ hoisted onto the field itself
"title": {
    "type": ["string", "null"],
    "frontify-translatable": true
}
```

---

## 6. Setting type to JSON Schema type

> Derived by reading the `BaseBlock<AppBridge, T>` value parameter of each setting type in
> `@frontify/sidebar-settings@0.12.0`, as pulled in by
> `@frontify/guideline-blocks-settings@2.1.11`. `T` is what the setting stores; a `BaseBlock` with
> no `T` stores nothing. Re-derive for a newer version with:
>
> ```bash
> grep -n -B2 'BaseBlock<' node_modules/@frontify/sidebar-settings/dist/index.d.ts
> ```
>
> Some rows below are deliberately **wider** than the declared `T`. A schema wider than reality
> never rejects a legitimate save; one that is too narrow breaks the block at runtime. If your
> version declares a type absent from this table, leave the `type` constraint off rather than
> guessing.

| Setting type | JSON Schema `type` | Notes |
|---|---|---|
| `input` | `"string"` | Text-bearing — see §7. `inputType: 'number'` still stores a string. |
| `textarea` | `"string"` | Text-bearing — see §7. |
| `switch` | `"boolean"` | |
| `dropdown` | `["string", "number", "null"]` | Stores `string \| number`; `null` is allowed for the cleared state. Has `choices` — see §8. |
| `segmentedControls` | `["string", "number"]` | Has `choices` — see §8. |
| `checklist` | `["array", "null"]` | Array of selected choice `id` values. Stores `null` when empty. |
| `multiInput` | *omit `type`* | Container stores nothing, but still needs a property. Declare `{}` — see §3. |
| `colorInput` | `["object", "null"]` | `null` when cleared. |
| `link` | `["object", "null"]` | |
| `fontInput` | `["string", "object", "null"]` | Stores a `FontValue`. |
| `assetInput` | *omit `type`* | Stored shape not confirmed. Declare `{}`. |
| `legacyAssetInput` | *omit `type`* | Stored shape not confirmed. Declare `{}`. |
| `templateInput` | `"number"` | |
| `notification` | *no property* | Stores no value. |
| `sectionHeading` | *no property*, or `"boolean"` | Stores nothing normally. With `hasSwitch: true` it stores a boolean — declare it then. |
| `slider` | `["string", "number"]` | **Deprecated** — use `segmentedControls`. |
| `linkChooser` | `["object", "null"]` | **Deprecated** — use `link`. |

For `assetInput`, `legacyAssetInput` and `multiInput`, declare the property but leave the type open:

```json
"heroImage": {}
```

That satisfies `additionalProperties: false` without asserting a shape that might be wrong.
Note that `assetInput` values are not readable through `useBlockSettings` — use `useBlockAssets`.

---

## 7. Translation and serialization

**Text-bearing settings are `input` and `textarea`.** These hold user copy, and should carry:

```json
"title": {
    "type": "string",
    "frontify-translatable": true,
    "frontify-serializable": true,
    "frontify-serialization-index": 1
}
```

- `frontify-translatable` — without it the text cannot be localised in a multi-language Guideline.
- `frontify-serializable` — without it the text is missing from search results and from the
  `content` field on the public API.
- `frontify-serialization-index` — serializable values are concatenated with a single space, and
  JSON object properties have no inherent order. **Every serializable field needs an index, and
  the indices must be unique**, or the output order is undefined.

Omit `frontify-translatable` only when the field is deliberately single-language — an identifier,
a CSS class name, a URL.

**Rich text.** A field holding Fondue rich-text content needs `"frontify-type": "fondueRte"` so
Frontify can serialize it correctly. There is no `rte` setting type to key on, so nothing can
infer this for you — set it deliberately on any field that stores rich text.

---

## 8. choices, enum, and defaultValue

**`enum` must match `choices` exactly.** If you constrain a `dropdown` or `segmentedControls`
property with an `enum`, the enum values and the setting's `choices` values must be the same set,
in both directions. A choice the schema rejects is a value the UI offers and the platform refuses;
an enum entry with no choice behind it is dead surface.

```ts
{ id: 'align', type: 'dropdown', choices: [
    { label: 'Left', value: 'left' }, { label: 'Right', value: 'right' } ] }
```

```json
"align": { "type": "string", "enum": ["left", "right"] }
```

Leaving the `enum` off entirely is valid — the values are then only constrained by `type`.

**Every `defaultValue` must validate against its own property.** A default that violates its own
schema fails on the block's first save:

```ts
{ id: 'columns', type: 'input', defaultValue: '3' }   // string
```

```json
"columns": { "type": "integer", "minimum": 1 }        // ❌ "3" is not an integer
```

**Keep the `Settings` type in step.** The setting `id` in `settings.ts`, the property key in
`manifest.json`, and the member of the `Settings` type in `Block.tsx` are the same name in three
places. Drift means the component reads fields the platform will never store.

---

## 9. Validating the schema

Run both, in this order:

```bash
bash scripts/check-settings-schema.sh          # from this skill; cross-checks against settings.ts
npx @frontify/frontify-cli@latest verify-manifest
```

`verify-manifest` is the validator that runs at submission time, so it is the gate that matters —
but it is a manifest-only check and it accepts a lot of schemas that do not work:

- `frontify-*` keywords sitting on containers, where they are ignored.
- `frontify-*` keywords inside `oneOf` / `anyOf` / `allOf` / `if`, where they are ignored.
- Unsupported `frontify-type` values, such as `"markdown"`.
- Misspelled keywords, such as `frontify-translateable`.
- A non-object schema root.
- Structurally broken JSON Schema, such as `"type": "stringg"`.
- **Anything at all about `src/settings.ts`** — it never sees your source, so a setting missing
  from the schema, a type mismatch, or a bad default is invisible to it.

That is what the check script and the checklist below are for.

---

## 10. Pre-submission checklist

- [ ] `manifest.json` parses and `appId` is filled in — no `<placeholder>` left.
- [ ] `settingsSchema` is present.
- [ ] Root is `"type": "object"` with `"$schema"` set to draft 2020-12.
- [ ] Root sets `"additionalProperties": false`.
- [ ] Every value setting in `src/settings.ts` has a **top-level** property — including ids nested
      in `switch.on` / `switch.off`, `sectionHeading.blocks`, and `multiInput.blocks`.
- [ ] `notification` and `sectionHeading` ids have **no** property.
- [ ] No property without a setting behind it.
- [ ] Each property's `type` matches its setting type (§6).
- [ ] Where an `enum` is declared, it equals the setting's `choices` values exactly.
- [ ] Every `defaultValue` validates against its own property.
- [ ] Setting ids are unique.
- [ ] `frontify-*` keywords sit on leaves only — never on containers.
- [ ] No `frontify-*` keyword inside `oneOf` / `anyOf` / `allOf` / `if` / `then` / `else` / `not`.
- [ ] `frontify-type`, where used, is `"fondueRte"`.
- [ ] Every `input` and `textarea` is `frontify-translatable` and `frontify-serializable`, unless
      deliberately single-language.
- [ ] Every serializable field has a `frontify-serialization-index`, and the indices are unique.
- [ ] No `i18nFields` or `searchFields` in the manifest — both are removed, and a manifest
      carrying either alongside `settingsSchema` is rejected.
- [ ] `bash scripts/check-settings-schema.sh` is clean.
- [ ] `npx frontify-cli verify-manifest` passes.
