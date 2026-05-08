# Developer Sandbox & Where to Develop Safely

Before requesting a sandbox, confirm whether you actually need one.

## Default recommendation: develop in production, isolated

Frontify's permission system is granular enough that **you do not usually
need a separate sandbox.** Most teams build and test integrations directly
in their production instance, with these guardrails:

- **Create a dedicated test library** (or workspace project). Limit access
  to the developer team and a few stakeholders. Mutations against this
  library cannot affect real brand content.
- **Develop extensions privately.** Apps, Custom Blocks, and Themes can be
  deployed without publishing — they're visible only to the marketplace
  account that owns them. This makes it easy to test against real data
  with real users before going public.

This is the path of least resistance for most production integrations.

## When you actually need a sandbox

Request a Frontify Developer Sandbox if any of the following apply:

- You're an external partner without access to a Frontify customer
  instance
- You're prototyping at a contract-pre-sales stage and don't yet have a
  customer to develop against
- The integration must touch destructive operations (mass deletion, schema
  changes, tenant-wide settings) that cannot be safely isolated in a
  production instance
- You need to test multi-account flows without coordinating with a real
  customer

## How to get sandbox access

Access is granted **selectively** and **not automatically**:

1. Submit a request via the Frontify Developer Portal's "Request access"
   button (the form is hosted on `forms.clickup.com` and asks about your
   intended use case)
2. Frontify reviews the application — fit review, not just rubber-stamp
3. If approved, credentials and setup instructions arrive via email

Plan for **days, not minutes**, between request and access.

## What a sandbox is good for

- Experimenting safely without touching production
- Exploring API capabilities to scope integration work
- Onboarding a new team member to Frontify development
- Collaborating with colleagues in a shared, low-stakes space

## Helpful resources

- Frontify GraphQL API docs:
  `https://developer.frontify.com/d/wJcTnsuhwb6T/authentication-and-security`
- Custom extensions (Apps, Blocks, Themes) developer docs
- **Frontify Friends Slack** — community for developers; useful for
  troubleshooting and feedback. Join via the invite link on the developer
  portal.

## Once you're in a sandbox

The auth model is identical to production:

1. Generate a personal developer token by **navigating directly** to
   `https://<sandbox-domain>/oauth-access-token`. This page is **not
   linked from any UI menu** — older Frontify docs reference a
   profile-icon / Applications navigation path that has been removed.
   Type or paste the URL into the address bar.
2. Use it directly for development, OR mint a Service App / OAuth 2 Client
   for full integration testing
3. Apply the same `Authorization: Bearer {token}` pattern as production
4. The same five scopes apply (`basic:read`, `basic:write`, `account:read`,
   `webhook:read`, `webhook:write`)

Don't ship sandbox tokens to production — Service Apps and OAuth Clients
are bound to the account they were created in.
