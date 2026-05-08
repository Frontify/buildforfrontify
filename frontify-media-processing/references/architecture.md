# Architecture, performance, and delivery model

This file is loaded when the user asks how the Media Processing
service is built, how caching works, what happens when an asset
changes or is deleted, or which CDN URL variant to use for which
purpose.

---

## CDN and processing pipeline

- Delivery runs on **AWS CloudFront** with all edge zones enabled.
- Image and video derivatives are generated **just-in-time** on the
  first request, then cached at the edge. The first hit for a brand-new
  modifier chain may take longer; every subsequent hit is fast.
- Multiple cache layers exist between origin and the edge.
- The Media Processing service **autoscales** independently to handle
  traffic spikes.
- The Media Processing service is **decoupled from Frontify itself**.
  Even if the main Frontify platform is down, existing CDN preview
  URLs continue to serve correctly.

---

## CDN URL types

Frontify exposes two URL fields on the GraphQL `Asset` types. Both are
fully compatible with the Media Processing API and accept all
transformations.

### Static / versioned: `previewUrl`

- Always points to a **specific revision** of an asset.
- The URL never changes for that revision, even if the asset is
  updated, replaced, or deleted later.
- Once issued, the URL is permanently valid — including after the
  source asset is deleted on Frontify.
- **Default choice.** Use it for compliance, archiving, legal references,
  newsletters, embedded social shares — anything where stability of the
  rendered bytes matters.

### Dynamic / latest: `dynamicPreviewUrl`

- Always points to the **latest revision** of the asset.
- The URL stays the same; the bytes update automatically when the
  asset is replaced.
- Cache invalidation propagates revisions globally in close to
  real-time.
- **Stops resolving when the underlying asset is deleted.**
- Querying `dynamicPreviewUrl` from GraphQL currently still requires
  the **`X-Frontify-Beta: enabled`** header on the GraphQL request and
  may need a special flag.
- Use it for live websites, applications, and integrations where you
  want updates to propagate without re-fetching URLs.

| Need | Use |
|---|---|
| Bytes must never change for this exact reference | `previewUrl` |
| Always serve the latest version of the asset | `dynamicPreviewUrl` |
| Asset may be deleted but the link must keep working | `previewUrl` |
| Can tolerate a broken link if the source is deleted | `dynamicPreviewUrl` |

URLs of either type **do not expire** — there is no time limit on
issued CDN URLs.

---

## Constraints and security

- Maximum output dimension is **4096px** (aspect ratio preserved).
- The original (untransformed) image is **not retrievable** through the
  CDN URL — there is no "raw" mode.
- All original metadata (EXIF, IPTC, XMP) is **stripped** during
  processing.
- The path segment in `https://media.ffycdn.net/<path>` is unguessable
  per asset version — preview URLs are not enumerable but they are
  publicly fetchable when known. Treat them like share links.

---

## Format negotiation

The service auto-negotiates the best output format based on the
requesting browser:

- Modern browsers receive **WebP** (or AVIF where appropriate).
- Older browsers fall back to **JPEG** or **PNG**.
- Override with the `output=` transformation
  (`output=jpeg`, `output=png`, `output=webp`, `output=avif`,
  `output=heif`, `output=auto`).

This means a single URL serves the right format to each client without
extra logic on the caller's side.

---

## PDF rendering

The API is **context-aware** for PDF sources by default:

- Loaded from an HTML `<img>` tag → returns an image preview of the
  first page.
- Linked directly (e.g. as an `<a href>`) → displays the full PDF
  inline.

You can override this with explicit transformations:

- `page=<n>` — render a preview of the *n*th page (zero-based;
  `page=0` is the first page).
- `output=image` — force an image preview.
- `download` (no parameter) or `download=<basename>` — force download
  rather than inline display, with an optional custom filename.
