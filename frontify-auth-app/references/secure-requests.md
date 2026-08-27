# Secure Requests — `executeSecureRequest`

Apps need to call third-party APIs with API keys, OAuth client secrets, or
other credentials. Putting those values in the App bundle would leak them to
the user's browser. `executeSecureRequest` solves this: the App declares the
endpoint and references secrets by name; Frontify performs the call
server-side, substituting the actual secret values at request time.

> Secure Requests work best for **JSON-based** endpoints.

## The pieces

1. **`secrets[]` in `manifest.json`** — declares which secret keys exist
2. **`network.endpoints[]` in `manifest.json`** — declares the call shape
3. **Marketplace Access Keys UI** — admins paste the real secret values
4. **`appBridge.api({ name: 'executeSecureRequest', ... })`** — the App
   invokes a named endpoint with optional dynamic parameters
5. **`.secret.json`** (local only, gitignored) — local-dev mirror of the
   Marketplace's stored secrets

## Manifest setup

```json
{
  "appId": "<YOUR_APP_ID>",
  "appType": "platform-app",
  "secrets": [
    { "key": "THIRD_PARTY_API_KEY", "label": "Example Service" },
    { "key": "OTHER_API_KEY",       "label": "Another API" }
  ],
  "network": {
    "endpoints": [
      {
        "name": "create-post",
        "resource": "https://api.example.com/posts",
        "options": {
          "method": "POST",
          "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer %%THIRD_PARTY_API_KEY%%"
          },
          "body": { "title": "$$title$$" }
        }
      },
      {
        "name": "get-page",
        "resource": "https://api.example.com/items/$$page$$",
        "options": {
          "method": "GET",
          "headers": { "Content-Type": "application/json" }
        }
      }
    ]
  }
}
```

## Placeholder substitution

| Form | Source | Behaviour |
|------|--------|-----------|
| `%%KEY%%` | Static — looked up in `secrets[]` at request time | Replaced with the value the admin saved for that `key` in the Marketplace |
| `$$dynamic-key$$` | Dynamic — pulled from `payload.requestParams[dynamic-key]` at call time | Replaced with the value the caller passed |

Both can appear in:

- `resource` (the URL itself)
- `options.headers` values
- `options.body` values (string or nested object)

The substitution is a literal string replace — the values are
URL-encoded/JSON-encoded depending on context.

## Calling from the App

```ts
import { AppBridgePlatformApp } from '@frontify/app-bridge-app';

const appBridge = new AppBridgePlatformApp();

const response = await appBridge.api({
  name: 'executeSecureRequest',
  payload: {
    endpoint: 'create-post',         // matches network.endpoints[*].name
    requestParams: { title: 'Hello' }, // populates $$title$$
  },
});

const data = await response.json();
```

`executeSecureRequest` resolves to a raw `fetch` `Response` — read the body
yourself with `.json()` / `.text()` and inspect `response.status` /
`response.ok`.

If you'd rather receive a pre-parsed result, call `getSecureRequest` with
the identical payload — it resolves to `{ data, status, statusText }` where
`data` is the parsed body and `status` is the HTTP status (as a string):

```ts
const { data, status, statusText } = await appBridge.api({
  name: 'getSecureRequest',
  payload: { endpoint: 'create-post', requestParams: { title: 'Hello' } },
});
```

## Local development — `.secret.json`

For local dev, Frontify can't reach the Marketplace's Access Keys store. Use
a local mirror:

1. Copy `.secret-example.json` to `.secret.json` (or create the file)
2. Add an entry per `secrets[].key` from the manifest:

   ```json
   {
     "THIRD_PARTY_API_KEY": "actual-api-key-value",
     "OTHER_API_KEY": "another-real-value"
   }
   ```

3. Add `.secret.json` to `.gitignore` — **never commit it**

The local dev shim reads `.secret.json` and uses it for `%%KEY%%`
substitution while you run `pnpm serve` / `npm run serve`.

## Marketplace setup (after deploy)

After the App is deployed and published:

1. Open the App in Marketplace → Settings → Access Keys section
2. For each entry from `secrets[]`, paste the real value and save
3. Admins can later revoke/replace any value — the App restarts using the
   new value on the next call

The Access Keys section appears only **after** the App has been deployed
and published. During draft/development, the Settings tab shows
"No Settings".

## Common patterns

### Bearer token to a third-party

```json
{
  "name": "fetch-records",
  "resource": "https://api.partner.com/records",
  "options": {
    "method": "GET",
    "headers": {
      "Accept": "application/json",
      "Authorization": "Bearer %%PARTNER_TOKEN%%"
    }
  }
}
```

### API key in URL parameter

```json
{
  "name": "fetch-with-key-in-url",
  "resource": "https://api.example.com/data?key=%%API_KEY%%&q=$$query$$",
  "options": { "method": "GET" }
}
```

### Mixed static + dynamic in body

```json
{
  "name": "submit",
  "resource": "https://api.example.com/submit",
  "options": {
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "X-API-Key": "%%API_KEY%%"
    },
    "body": {
      "user": "$$user_id$$",
      "data": "$$payload$$"
    }
  }
}
```

```ts
await appBridge.api({
  name: 'executeSecureRequest',
  payload: {
    endpoint: 'submit',
    requestParams: { user_id: 'u-123', payload: 'hello' },
  },
});
```

## What you cannot do

- **Read the secret value in the App's runtime.** It is intentionally
  invisible — the whole point.
- **Use `executeSecureRequest` for endpoints that aren't pre-declared** in
  `network.endpoints[]`. Add the endpoint to the manifest, redeploy, and
  reinstall.
- **Bypass the substitution** with arbitrary fetches from the App. Direct
  `fetch()` from the iframe would expose the credential.
- **Change endpoint shapes at runtime.** The manifest is static — different
  shapes mean different `name` entries.

## Troubleshooting

| Symptom | Likely cause |
|---------|-------------|
| `%%KEY%%` appears literally in the request the third party receives | Admin hasn't entered a value in the Marketplace Access Keys UI; locally, `.secret.json` is missing the key |
| `Unknown endpoint: <name>` | The `endpoint` in the call doesn't match any `network.endpoints[*].name` — typo or stale manifest |
| Works locally, fails after deploy | Marketplace Access Keys not populated; or App was redeployed without the new `secrets[]` entry |
| 401 from the third party | The static value the admin entered is wrong / expired — rotate it in Access Keys |
| Infinite loading on call | Some third-party APIs require specific `Content-Type`/`Accept` headers; add them to `options.headers` |

## Security notes

- Secrets are **stored encrypted on Frontify's side**. Frontify never
  exposes them to the App's JavaScript.
- Admins can replace a secret without redeploying the App — only the App's
  next call sees the new value.
- Do **not** put secrets in `defineSettings`. Settings flow to the App
  runtime.
- Do **not** commit `.secret.json` — confirm it's in `.gitignore` and the
  CI build uses Marketplace-stored values, not a local mirror.
