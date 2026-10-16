---
name: frontify-media-processing
description: >
  Transform Frontify-hosted images, videos, and PDFs via
  `?mod=v1/<transform>/...` URL modifiers on `previewUrl` /
  `dynamicPreviewUrl` returned from GraphQL. ALWAYS apply this skill when
  rendering Frontify-hosted media in any surface, transforming an asset
  (resize, cover, focus, crop, zoom, rotate, recolor, blur,
  background-remove, PDF render), or building responsive `srcset` /
  `<picture>` markup against Frontify URLs — even if the user does not
  name the CDN or modifiers explicitly. Do not reach for external
  image-processing libraries before first checking whether a CDN URL
  modifier covers the case. Skip this skill for non-Frontify media,
  GraphQL schema work, or authentication / token handling.
compatibility: Designed for Claude Code and similar agentic development tools.
metadata:
  author: Frontify
  version: "1.0"
---

# Frontify Media Processing

Frontify's **Media Processing API** transforms, manipulates, and
optimises visual assets on the fly, then serves them through a global
CDN (`media.ffycdn.net`, AWS CloudFront). It is **not** a GraphQL API
and **does not** require a bearer token. Every transformation is
expressed as a chain of modifiers appended to an asset's CDN URL:

```
https://media.ffycdn.net/<path>?mod=v1/<transform>/<transform>/...
```

You don't construct these URLs from scratch — you fetch `previewUrl`
(versioned, immutable per revision) or `dynamicPreviewUrl` (always
latest, currently beta) from the GraphQL Public API and append a
modifier chain.

The service runs **independently of the main Frontify platform** —
issued CDN URLs continue to resolve even if Frontify itself is
unreachable, and `previewUrl`s continue to serve their original
revision even if the underlying asset is deleted.

---

For the data side (fetching the URL itself), load
[`../frontify-graphql/SKILL.md`](../frontify-graphql/SKILL.md). This
skill covers everything that happens *after* you have the URL.

---

## Non-negotiable rules

1. **Never invent transformation names, parameter literals, or
   modifier syntax.** The full transformation list lives in
   [`references/transformations.md`](references/transformations.md);
   parameter value formats live in
   [`references/parameters.md`](references/parameters.md). If you
   can't find it there, it does not exist — ask the user, don't guess.
2. **Always prefix the modifier chain with `?mod=v1/`** and separate
   transformations with `/`. There is no other modifier syntax.
3. **Don't construct `media.ffycdn.net` URLs from scratch.** Fetch the
   base URL from the `previewUrl` (or `dynamicPreviewUrl`) field of
   any `Asset` returned by the GraphQL Public API. Cross-system URL
   guessing is not supported.
4. **Default to `previewUrl` (versioned).** Each revision has a unique
   URL that never changes and remains valid even after the asset is
   deleted. Use `dynamicPreviewUrl` only when "always latest" is
   actually required, and remember it currently needs the
   `X-Frontify-Beta: enabled` header on the GraphQL request that
   produced it.
5. **Prefer responsive markup over single high-res transforms.** Use
   `srcset` for resolution-switching and `<picture>` for
   art-direction; let the browser pick the right asset rather than
   shipping a 4K image to a phone.
6. **Respect output limits.** Maximum output dimension is **4096px**
   (aspect ratio preserved). Originals are not retrievable through
   the CDN and metadata (EXIF/IPTC/XMP) is stripped on processing.
7. **Format selection is automatic.** Don't force a specific format
   unless you have a reason — by default the service auto-negotiates
   WebP/AVIF/JPEG/PNG based on the requesting browser. Override with
   `output=<format>` only when you need to.
8. **Treat `background=remove` and any documentation marked
   experimental as unstable.** Their results can change; flag the
   call in code so it's easy to find when behaviour drifts.

---

## Quick reference

### URL anatomy

```
https://media.ffycdn.net/<path>?mod=v1/<transform>=<params>/<transform>=<params>/...
```

- **`https://media.ffycdn.net/<path>`** — the base CDN URL. Always
  retrieved from `previewUrl` / `dynamicPreviewUrl`. The path segment
  is unguessable per asset revision.
- **`?mod=v1/`** — required prefix for every modifier chain.
- **`<transform>=<params>`** — one transformation. Format described
  in [`references/transformations.md`](references/transformations.md);
  parameter value types in
  [`references/parameters.md`](references/parameters.md).
- **`/`** — chains transformations. There is no hard limit on the
  number of chained transformations beyond the URL-length limit
  enforced by the browser.

Each transformation is applied **as if previous ones had already been
performed** — `resize=340/resize=50p` ends up at 170px wide, and
`resize=50p/focus=20x10` puts the focus at 40x20 of the original.

### Versioned vs. dynamic URLs

| Field (from GraphQL) | Behaviour | Stops on delete? | Beta? |
|---|---|---|---|
| `previewUrl` | Pinned to a specific revision; bytes never change | No — keeps working | No |
| `dynamicPreviewUrl` | Tracks the latest revision; bytes update automatically | Yes — link breaks | Yes — needs `X-Frontify-Beta: enabled` on the GraphQL call |

URLs themselves do not expire. See
[`references/architecture.md`](references/architecture.md) for the
full delivery model.

### Most-used transformations

The agent should load
[`references/transformations.md`](references/transformations.md) for
authoritative syntax. The frequent ones, in order of how often you'll
reach for them:

| Transform | What it does | Example |
|---|---|---|
| `resize` | Resize to a width, height, or both | `resize=400`, `resize=640x480`, `resize=4:3` |
| `cover` | Fill an area, cropping the overflow (focus-aware) | `cover=100x100`, `cover=16:9` |
| `contain` | Fit inside an area without cropping (no border) | `contain=150x100` |
| `inside` | Fit inside an area without cropping (translucent borders) | `inside=150x150` |
| `crop` | Extract a region (focus-driven or absolute) | `crop=200x100`, `crop=200x100@20x50` |
| `focus` | Set the focus point used by `cover` / `crop` / `zoom` | `focus=20x10`, `focus=top-left`, `focus=auto` |
| `zoom` | Zoom into the focus point (factor ≥ 1) | `zoom=1.5` |
| `quality` | Output quality 1–100 | `quality=80` |
| `output` | Force a specific output format / preview type | `output=webp`, `output=jpeg`, `output=blurhash` |
| `background` | Add a background colour (or AI-remove the background) | `background=red`, `background=remove`, `background=remove+cyan` |
| `border` | Solid colour for borders created by `inside` | `border=cyan` |
| `colorize` | Recolor / monochrome / sepia | `colorize=monochrome`, `colorize=sepia`, `colorize=black:cyan` |
| `flip` | Mirror horizontally, vertically, or both | `flip=x`, `flip=y`, `flip=both` |
| `turn` | Rotate by multiples of 90° | `turn=left`, `turn=right`, `turn=flip` |
| `refit-cover` / `refit-inside` | AI subject-aware resize | `refit-cover=1:1`, `refit-inside=1:1@left` |
| `page` | PDF source: render a specific page (zero-based) | `page=0`, `page=2` |
| `from` | Video source: extract a still at a timestamp | `from=5.75` |
| `download` | Force download (optional filename) | `download`, `download=hero` |
| `achromatopsia` / `deuteranopia` / `protanopia` / `tritanopia` | Colour-blindness corrections | `deuteranopia=0.5` |

Every transformation has conditional `-max` / `-min` variants where
relevant (`resize-max`, `cover-min`, `quality-max`, `contain-min`, …) —
load `references/transformations.md` for the full list.

### Parameter value cheatsheet

`references/parameters.md` is the authoritative source. Quick
recognition:

- **size** — `WxH` (`640x480`); omit one side with `-` (`320x-`,
  `-x240`); width-only shorthand (`320` ≡ `320x-`)
- **ratio** — `W:H` (`16:9`, `1:1`)
- **length unit suffixes** — none = pixels, `s` = scale (e.g. `(1/3)s`),
  `p` = percentage (e.g. `25p`)
- **coordinates** — `XxY` (`100x50`, `20x50p`); CSS coordinate
  system (zero-based, top-left origin)
- **anchor** — `top`, `top-left`, `top-right`, `right`, `bottom-right`,
  `bottom`, `bottom-left`, `left`
- **angle** — number rounded to nearest 90°, or literal
  (`left`, `right`, `flip`, `clockwise`, `anticlockwise`,
  `counterclockwise`, `reverse`)
- **axis** — `horizontal`/`h`/`x`, `vertical`/`v`/`y`, `both`
- **boolean** — `true`/`yes`/`on`, `false`/`no`/`off`
- **color** — named (`red`), hex (`76E`, `76E8`, `A68040`, `A6804080`),
  CSS `rgb()`/`rgba()`/`hsl()`/`hsla()`, `transparent`, alpha-suffixed
  (`violet.25`, `008.75`, `808080.3`)
- **padding** — comma-separated lengths (`10,100,23,47`,
  `0,25p`, `(1/3)s`) following CSS shorthand rules
- **number** — JSON literal or expression in parens
  (`50`, `7.2`, `(1/3)`, `(5*(7+2)/3)`)

---

## Common patterns

### Fetch a preview URL via GraphQL, then transform it

```graphql
# Required scopes: basic:read
query AssetPreview($id: ID!) {
  node(id: $id) {
    ... on Image {
      title
      previewUrl
    }
  }
}
```

```ts
const previewUrl = data.node.previewUrl;
const thumb = `${previewUrl}?mod=v1/cover=200x200/focus=auto/quality=70`;
```

### Responsive `srcset` (resolution switching)

Width-descriptor form — let the browser pick a width based on the
rendered slot size:

```html
<img
  alt="Brand hero"
  src="${previewUrl}?mod=v1/resize=400/quality=70"
  srcset="
    ${previewUrl}?mod=v1/resize=400  400w,
    ${previewUrl}?mod=v1/resize=600  600w,
    ${previewUrl}?mod=v1/resize=900  900w,
    ${previewUrl}?mod=v1/resize=1200 1200w
  "
  sizes="(max-width: 600px) 100vw, 50vw"
/>
```

### Art-directed `<picture>` (different crops per breakpoint)

```html
<picture>
  <source media="(max-width: 767px)"
          srcset="
            ${previewUrl}?mod=v1/cover=1:1/focus=auto/resize=300  300w,
            ${previewUrl}?mod=v1/cover=1:1/focus=auto/resize=500  500w,
            ${previewUrl}?mod=v1/cover=1:1/focus=auto/resize=700  700w
          "/>
  <source media="(min-width: 992px)"
          srcset="
            ${previewUrl}?mod=v1/cover=16:4/resize=1500 1500w,
            ${previewUrl}?mod=v1/cover=16:4/resize=1900 1900w
          "/>
  <source media="(min-width: 768px)"
          srcset="
            ${previewUrl}?mod=v1/cover=16:9/resize=1000 1000w,
            ${previewUrl}?mod=v1/cover=16:9/resize=1200 1200w
          "/>
  <img src="${previewUrl}?mod=v1/cover=16:9/resize=1024" alt="Hero" />
</picture>
```

### Low-quality image placeholder (LQIP) / blurhash

```ts
const lqip       = `${previewUrl}?mod=v1/resize=20/quality=30`;
const blurhash   = `${previewUrl}?mod=v1/output=blurhash`;
const meancolor  = `${previewUrl}?mod=v1/output=meancolor`;
```

`blank`, `maincolor`, `meancolor`, and `preview` outputs are served
with `X-Robots-Tag: noindex` so search engines don't index them.

### PDF page preview vs. inline document

```ts
const pdfFirstPagePng = `${previewUrl}?mod=v1/page=0/output=png/resize=1200`;
const pdfThirdPage    = `${previewUrl}?mod=v1/page=2`;
const forceDownload   = `${previewUrl}?mod=v1/download=brand-guidelines`;
// In an <img> tag, the API auto-renders an image preview of page 0.
// In an <a href>, the PDF displays inline by default.
```

### Subject-aware resize for unknown content (refit)

When you don't know the subject placement, `refit-cover` keeps the
detected subject filling the frame; `refit-inside` keeps it fully
visible with translucent borders.

```ts
const square      = `${previewUrl}?mod=v1/refit-cover=1:1`;
const squareLeft  = `${previewUrl}?mod=v1/refit-cover=1:1@left(15p)`;
const safeContain = `${previewUrl}?mod=v1/refit-inside=1:1(30p,0,5p)`;
```

### Background removal (experimental)

```ts
// Mark experimental in your code — results can change without notice.
const cutout       = `${previewUrl}?mod=v1/background=remove`;
const onCyan       = `${previewUrl}?mod=v1/background=remove+cyan`;
```

### Forced format

```ts
const webp = `${previewUrl}?mod=v1/resize=800/output=webp/quality=80`;
const jpg  = `${previewUrl}?mod=v1/resize=800/output=jpeg/quality=80`;
// Default (no `output=`) auto-negotiates WebP/AVIF/JPEG/PNG per browser.
```

---

## Full reference

Load these files surgically — don't pull everything in at once.

| File | When to read |
|---|---|
| [`references/transformations.md`](references/transformations.md) | Looking up a specific transformation's syntax, parameters, conditional variants (`-max` / `-min`), or chaining behaviour. Authoritative list of every transformation. |
| [`references/parameters.md`](references/parameters.md) | Understanding the literal value formats — what a `length`, `coordinates`, `anchor`, `color`, `padding`, `ratio`, `size`, `number`, `boolean`, `axis`, or `angle` accepts. |
| [`references/architecture.md`](references/architecture.md) | Questions about CDN behaviour, caching, format negotiation, `previewUrl` vs `dynamicPreviewUrl`, what happens after asset deletion, or PDF context-aware rendering. |

For an interactive playground, the live transformations are
documented at the
[Frontify Developer Portal — Dynamic media services](https://developer.frontify.com/document/20#/introduction/media-processing)
section.

---

## Handoff

- Fetching `previewUrl` / `dynamicPreviewUrl` from a Frontify Asset →
  [`../frontify-graphql/SKILL.md`](../frontify-graphql/SKILL.md)
- Rendering transformed images inside an App / Theme / Custom Block →
  [`../frontify-app/SKILL.md`](../frontify-app/SKILL.md),
  [`../frontify-theme/SKILL.md`](../frontify-theme/SKILL.md),
  [`../frontify-custom-block/SKILL.md`](../frontify-custom-block/SKILL.md)
- Matching Frontify's visual style for the surrounding UI →
  [`../frontify-fondue/SKILL.md`](../frontify-fondue/SKILL.md)

This skill does **not** require any of the `frontify-auth-*` skills. CDN preview URLs are
unguessable but publicly fetchable — there are no bearer tokens, OAuth
flows, or scopes for the Media Processing API itself. Authentication is
only needed when querying GraphQL to obtain the URL in the first place.
