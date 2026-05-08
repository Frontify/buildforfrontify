# External Calls from a Custom Block

Custom Blocks render in an iframe inside the user's browser. They can call
arbitrary third-party APIs with `fetch()` — but everything in those calls
(URL, headers, body) is visible to the user via DevTools. This file covers
what's safe, what's not, and the patterns that work.

## What's safe to call directly

- **Public, no-auth endpoints** — open data APIs, public RSS, public CMS
  read endpoints. Just `fetch(url)`.
- **APIs the user is already authenticated with via cookies** — e.g. an
  internal CMS on the same root domain that uses session cookies. The
  browser sends those cookies automatically; the block inherits the user's
  session without seeing the credential.
- **APIs that authenticate via signed URLs you compute server-side** — e.g.
  a backend you control issues a signed S3 URL with a short TTL; the block
  fetches it directly.

## What's NOT safe to call directly

- **Anything requiring a static API key in the request** — the key ends up
  in the user's network tab and the block bundle.
- **Anything requiring a bearer token issued to your organisation** — same
  problem; you'd be leaking shared infrastructure credentials to every
  guideline viewer.
- **OAuth-protected APIs that aren't already authenticated by the user's
  cookies** — there's no flow to obtain a token from inside a block.

If a block embeds a credential, **assume it's already public** the moment
you publish.

## The server-side proxy pattern

For any credentialed third-party call, stand up your own backend:

```
┌────────────┐  fetch (no creds)  ┌────────────┐  authenticated  ┌─────────┐
│   Block    │ ───────────────▶   │ Your proxy │ ──────────────▶ │ Partner │
│ (browser)  │ ◀───────────────   │  backend   │ ◀────────────── │   API   │
└────────────┘    JSON results    └────────────┘    JSON results └─────────┘
```

The proxy:

1. Holds the credential as an env var / secret-manager entry
2. Authenticates against the partner API server-side
3. Returns sanitised results to the block
4. (Optionally) gates access by inspecting an upstream signal — e.g. the
   block sends a Frontify-signed JWT that the proxy validates

What the block sends to the proxy:

- **Non-sensitive parameters only** (search query, asset ID, etc.)
- **Optionally** a signed assertion that proves the call is coming from a
  legitimate Frontify session (compute server-side using a shared secret
  the block does not have)

What the block receives from the proxy:

- The partner API's response, optionally filtered or trimmed

### Why this works

The credential never enters the user's browser. The block becomes a thin
proxy client. If the user inspects DevTools, they see the call to your
backend (no secrets) and the response — which is data they were going to
see anyway.

### Where to host the proxy

- A small serverless function (AWS Lambda, Cloudflare Workers, Vercel
  Functions) — minutes to set up
- A backing service you already operate
- A dedicated microservice if traffic warrants

## When to skip the block and build an App instead

If the block needs *Frontify-stored* secrets (admins set the credential in
the Marketplace, and the credential should travel with the integration
across customer instances), **build a Frontify App instead**:

- Apps support `manifest.json` `secrets[]` and `executeSecureRequest`
- Marketplace stores the credential per-install
- The credential never enters the App's runtime
- See `../frontify-auth-app/SKILL.md`

The tradeoff: an App lives outside the guideline page (modal, asset
action, workspace). A Custom Block lives **on** the page. If the
embedded-into-guideline UX is essential, you keep the block and use a
proxy.

## CORS

Third-party APIs called directly from the block must allow CORS for the
Frontify domain (the block's iframe origin). If they don't, the proxy
pattern is also the answer — the proxy is a same-origin call from the
block's perspective (or a domain you control with the right CORS
headers).

## CSP

The Frontify host applies a Content Security Policy to block iframes. If
your block calls a third-party API that's not allow-listed, the call fails
with a CSP error in the console. Two options:

- Move to the proxy pattern with your own domain, or
- Coordinate with Frontify to update the CSP for your block's allow-list

## Concrete examples

### Example 1: public-data block (no proxy needed)

```ts
// Fetching open weather data — no credentials
const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=47.4&longitude=8.5&current=temperature_2m');
const data = await res.json();
```

Fine. The endpoint requires no auth.

### Example 2: customer-CMS block (cookies, no proxy)

```ts
// Fetching from an internal CMS on the same root domain — relies on
// the user's existing SSO cookie
const res = await fetch('https://cms.acme.com/api/articles', {
  credentials: 'include',
});
const data = await res.json();
```

Fine if (a) `cms.acme.com` shares a root domain with the Frontify instance
and (b) it's CORS-configured to accept requests from the Frontify origin.

### Example 3: third-party API with API key (proxy required)

```ts
// ❌ DO NOT DO THIS
const BAD = await fetch('https://api.partner.com/data', {
  headers: { 'Authorization': 'Bearer secret-key-leaked-to-every-viewer' },
});

// ✅ Instead: call your own proxy
const ok = await fetch('https://proxy.example.com/partner/data?q=' + encodeURIComponent(query));
const data = await ok.json();
```

The proxy at `proxy.example.com` holds the bearer token and forwards the
authenticated call to `api.partner.com`.

## Checklist

- ✅ No API keys or bearer tokens in the block bundle
- ✅ No credentials in the network panel when running the block
- ✅ Proxy validates the request is from a legitimate Frontify session
  (origin check at minimum; signed assertion if data is sensitive)
- ✅ Rate-limit your proxy — a public block + a proxy without limits is a
  free DDoS amplifier for the partner API
- ✅ Log proxy calls for audit
- ✅ Rotate proxy credentials independently of the block release cycle
