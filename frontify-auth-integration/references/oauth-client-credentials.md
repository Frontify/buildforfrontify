# OAuth 2 Client Credentials — Service Apps

Use this flow for **machine-to-machine** integrations: backend services,
scheduled jobs, CI pipelines, webhooks consumers, sync workers. Each Service
App is owned by a Frontify user and **runs in that user's permission
context** — for production, create a dedicated service user (see
`personal-tokens.md`) and own the Service App from there.

> Service Apps are currently in **beta**. Creating one requires the request
> to carry the beta header: `x-frontify-beta: enabled`.

## Step 1 — Create the Service App

The Service App itself is created with a GraphQL mutation and **requires a
user session**. Use a personal developer token belonging to the service user
you've designated.

```graphql
# Required scopes on the calling token: basic:read basic:write
mutation CreateServiceApp {
  createServiceApp(
    input: {
      title: "My Integration",
      scopes: [BASIC_READ, BASIC_WRITE]
    }
  ) {
    message
    secret
    serviceApp {
      description
      id
      scopes
      status
      title
    }
  }
}
```

Sample response:

```json
{
  "data": {
    "createServiceApp": {
      "message": "This is the last time that the secret will be accessible, so make sure to copy it!",
      "secret": "a_very_secret_secret",
      "serviceApp": {
        "description": null,
        "id": "client-r33fxhupva4q93bx",
        "imageUrl": "",
        "scopes": ["BASIC_READ", "BASIC_WRITE"],
        "status": "ENABLED",
        "title": "My Integration"
      }
    }
  }
}
```

Two things to capture from the response:

- **`serviceApp.id`** — this is the OAuth `client_id` (e.g.
  `client-r33fxhupva4q93bx`). You can re-query it later.
- **`secret`** — this is the OAuth `client_secret`. **It is shown only
  once.** Lose it and you must create a new Service App.

Store both as secure environment variables (or in a secret manager) on the
side that runs the integration. Never commit them.

## Step 2 — Exchange credentials for an access token

```bash
curl -X POST \
  -F grant_type=client_credentials \
  -F client_id={clientId} \
  -F client_secret={secret} \
  -F scopes=basic:read \
  https://{domain}/api/oauth/accesstoken
```

The `scopes` form field must be a **subset of, or equal to, the scopes
configured on the Service App**. Requesting a scope the Service App does not
own returns an error.

Response:

```json
{
  "token_type": "Bearer",
  "expires_in": 2592000,
  "access_token": "yourbearertoken",
  "refresh_token": null,
  "name": null
}
```

`expires_in: 2592000` is **30 days** in seconds. The `refresh_token` is
intentionally `null` — client-credentials tokens **do not refresh**; when one
expires, request a new one with the same `client_id`/`client_secret`.

## Step 3 — Call GraphQL

```bash
curl -X POST \
  -H "Authorization: Bearer yourbearertoken" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ currentUser { id email } }"}' \
  https://{domain}/graphql
```

The session is equivalent to that of the user who created the Service App —
all `currentUserPermissions` resolve against that user.

## Recommended flow shape

```
┌────────────────┐                ┌────────────────┐
│ Developer/Admin │ One-time      │  Frontify API  │
│  (with personal │──────────────▶│                │
│ developer token)│ createServiceApp                │
└────────────────┘ (GraphQL)      │                │
        ▲                         │                │
        │ clientId + secret       │                │
        │ (shown once)            │                │
        ▼                         │                │
┌────────────────┐                │                │
│  Integration   │ Runtime        │                │
│   (backend)    │──────────────▶ │                │
└────────────────┘ POST /api/oauth/accesstoken     │
        ▲                         │                │
        │ access_token (30 days)  │                │
        ▼                         │                │
        │ GraphQL request                          │
        │ Authorization: Bearer access_token       │
        ▼                         └────────────────┘
   Response
```

When the token nears expiry (or on a 401), request a fresh one with the same
client credentials. There is no refresh-token round-trip.

## Operational notes

- Service Apps are bound to **one Frontify account**. To target multiple
  customer accounts, contact `developer@frontify.com`.
- The `secret` cannot be retrieved later — keep a recovery plan.
- Treat client credentials with the same hygiene as any production secret:
  rotate periodically, scope to the minimum, audit usage.
- If the underlying service user's permissions change in the UI, the
  Service App's effective access changes immediately — no token re-issue
  needed.
- Deleting the service user breaks the Service App permanently; Frontify
  Customer Support **cannot** restore lost service-user credentials.
