# OAuth 2.0 Authorization Code Flow

Use this flow for **public** or **third-party** applications that act on
behalf of an end user — "Login with Frontify". Frontify implements the
standard authorization-code grant. Public clients (anything running in the
browser, mobile, native) **must** use **PKCE**.

## Endpoints

| Endpoint | HTTP | URL |
|----------|------|-----|
| Authorization | `GET` | `https://<domain>/api/oauth/authorize` |
| Access Token | `POST` | `https://<domain>/api/oauth/accesstoken` |
| Refresh | `POST` | `https://<domain>/api/oauth/refresh` |
| Revoke | `POST` | `https://<domain>/api/oauth/revoke` |

`<domain>` is the customer's Frontify domain. A given OAuth 2 Client is
**only valid for the account where it was registered** — for multi-account
SaaS, contact `developer@frontify.com`.

## Step 0 — Register an OAuth 2 Client

Requires Frontify **Account Admin** permission.

1. Open the **Applications** settings page. The Frontify UI no longer
   exposes a profile-menu link to this page — confirm the current path
   with your Frontify admin (older docs reference *Profile menu →
   Applications*; that entry has been removed). If a dedicated URL exists
   for your instance (analogous to `/oauth-access-token` for personal
   tokens), use that.
2. **+ Add application**
3. Configure:
   - **Name**, **Description**
   - **Redirect URL** — must exactly match the `redirect_uri` you'll send.
     Multiple redirects are allowed (one per environment).
   - **Logo URL**, **Built by** (optional)
   - **Support Authenticator** — leave **OFF** unless using the Frontify
     Authenticator JS library
   - **Confidential** — toggle **ON** if your app has a secure backend that
     can hold a `client_secret`. Toggle **OFF** for SPAs/native apps; those
     **must** use PKCE
   - **Scopes** — enable each scope your app will request. The
     `/api/oauth/authorize` request can only ask for scopes that are
     pre-enabled here

After saving, the client detail page shows the **Client ID** (e.g.
`client-ur7wjag7wr3gylcn`) and, for confidential clients, a generated
**Client Secret**.

## Step 1 — Initialize authorization

Redirect the user's browser to `/api/oauth/authorize`.

### Authorize parameters

| Param | Required | Sample | Notes |
|-------|----------|--------|-------|
| `response_type` | yes | `code` | Frontify supports the code flow only |
| `client_id` | yes | `client-tppftg3xddecd2vw` | From the Applications page |
| `redirect_uri` | yes | `https://www.example.com/redirect` | Must exactly match a registered redirect |
| `scope` | yes | `basic:read basic:write` | Space-separated; **URL-encode the space** as `%20`. At least `basic:read` is required |
| `state` | recommended | `testStateA@s432!` | ≤255 chars. Not server-enforced, but send a random value and **verify it on response** to prevent CSRF |
| `code_challenge_method` | PKCE only | `S256` | Always `S256` |
| `code_challenge` | PKCE only | `xxxxxxxxxxxxxxxxxxxxx` | SHA-256 hash of a 43–128 char `code_verifier` |

Confidential client (no PKCE):

```
https://<domain>/api/oauth/authorize?response_type=code&client_id={ID}&redirect_uri={URI}&scope={scope}&state={STATE}
```

Public client (with PKCE):

```
https://<domain>/api/oauth/authorize?response_type=code&client_id={ID}&scope={scope}&state={STATE}&code_challenge={SECRET}&code_challenge_method=S256&redirect_uri={URI}
```

### PKCE primer

1. Generate a cryptographically secure random string of **43–128
   characters** — the `code_verifier`. Keep it client-side.
2. Compute `code_challenge = BASE64URL(SHA-256(code_verifier))`.
3. Send `code_challenge` + `code_challenge_method=S256` on the authorize
   request.
4. On token exchange, send the original `code_verifier` instead of a
   `client_secret`.

This binds the code to the same client that initiated the flow without
requiring a server-side secret.

### Authorization page

The user sees Frontify's "Authorize App" dialog listing the requested scopes
and your app's name/logo. They click **Allow access** or **Cancel**.

## Step 2 — Handle the redirect

After consent, Frontify redirects the user to your `redirect_uri`:

```
https://{redirect_uri}?code=asfeYffSampleAuthCode&state=testStateA@s432!
```

**Verify the `state`** matches the value you sent. If it doesn't, abort —
this is a CSRF protection.

## Step 3 — Exchange the code for tokens

`POST https://<domain>/api/oauth/accesstoken` with form-data or JSON body.

| Param | Required | Sample | Notes |
|-------|----------|--------|-------|
| `code` | yes | `Avv45866yyssf` | The `code` value from the redirect |
| `grant_type` | yes | `authorization_code` | Only supported value |
| `client_id` | yes | `client-tppftg3xddecd2vw` | Same as authorize |
| `redirect_uri` | yes | `https://www.domain.com/redirect` | Must match registered redirect |
| `scope` | yes | `basic:read+basic:write` | Combined with `+` (URL-encoded space) |
| `client_secret` | confidential only | `26tkfuapevzpp...` | From the Applications page |
| `code_verifier` | PKCE only | `a66huffuapev...` | The unhashed verifier from Step 1 |

```bash
curl -X POST \
  -F code=Avv45866yyssf \
  -F grant_type=authorization_code \
  -F client_id={clientID} \
  -F redirect_uri=https://www.domain.com/redirect \
  -F scope=basic:read \
  https://{domain}/api/oauth/accesstoken
```

Response:

```json
{
  "token_type": "Bearer",
  "expires_in": 2591998,
  "access_token": "ey5811sfghAffastta",
  "refresh_token": "ey5811sfghA895Xtta"
}
```

Access-token lifetime is **configured per Frontify instance** — typically
between one week and three months. Don't hard-code; trust `expires_in`.

## Step 4 — Call the API

```http
POST https://<domain>/graphql
Authorization: Bearer ey5811sfghAffastta
Content-Type: application/json
```

## Refresh

```bash
curl -X POST \
  -F grant_type=refresh_token \
  -F refresh_token=ey5811sfghA895Xtta \
  -F client_id={clientId} \
  -F scope=basic:read+basic:write \
  https://<domain>/api/oauth/refresh
# Add: -F client_secret={secret}    (confidential clients only)
```

Refresh response is the same shape as the initial token exchange. Two rules:

1. **A refresh token can be used only once.** A successful refresh returns a
   new access *and* a new refresh token; persist both.
2. **The previous access token is invalidated** the moment a refresh
   succeeds.

## Revoke

```bash
curl -X POST \
  -F token=ey5811sfghA895Xtta \
  -F token_type_hint=access_token \
  https://<domain>/api/oauth/revoke
```

`token_type_hint` is `access_token` or `refresh_token` (or null — Frontify
infers). HTTP 200 means revoked.

Revoke proactively when:

- A user signs out
- An admin de-authorizes the app
- A token is suspected leaked
- Scopes change and tokens need re-issuance (check `x-oauth-scopes`)

## CSRF & PKCE checklist

- ✅ Random, opaque `state` per request; verify on redirect
- ✅ `code_verifier` 43–128 chars of CSPRNG output for public clients
- ✅ `redirect_uri` allow-list pinned to the exact registered values
- ✅ Refresh tokens stored encrypted at rest, single-use
- ❌ Never embed `client_secret` in browser/mobile code — make the client
     **public** and use PKCE instead

## Troubleshooting

- **Invalid scope** — the requested scope isn't enabled on the Application.
  Open Applications settings, toggle it on, save, retry.
- **Redirect mismatch** — `redirect_uri` must match exactly (including
  trailing slashes and query string handling).
- **`state` missing on redirect** — Frontify always returns it; if absent,
  inspect for downstream redirect chains stripping the query.
- **PKCE required** — public (non-confidential) clients always require
  PKCE. Either flip the client to confidential or implement PKCE.
