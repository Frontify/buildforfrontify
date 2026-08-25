---
name: frontify-deployment
description: >
  Deploy Frontify extensions (Apps, Custom Blocks, Themes) via the
  `frontify-cli`. ALWAYS apply this skill when publishing or releasing any
  Frontify extension, authenticating the CLI for local use or CI
  (`frontify-cli login`, or `--instance` / `--token` flags), or diagnosing
  build-pipeline gate failures (invalid-manifest errors such as
  `'basic:read' is required in scopes`, type-check errors, `terser not
  found`, version-pinning surprises after install) — even if the user does
  not name the CLI or build gates explicitly. Do not publish Frontify
  extension code without first clearing the build gates (manifest
  validation, type-check, lint, bundle). Skip this skill for local
  development setup, source-code authoring, or end-user installation flows.
compatibility: Designed for Claude Code and similar agentic development tools.
metadata:
  author: Frontify
  version: "1.0"
---

# Frontify Deployment

Deploying a Frontify extension is the same shape regardless of whether it's
an App, a Custom Block, or a Theme: authenticate the `frontify-cli` against
the target instance, clear the build gates, and `deploy` (then,
for Marketplace surfaces, `publish`). This skill owns the **cross-type**
mechanics. The extension-specific bits — manifest fields, Marketplace UI
flow, post-deploy install behavior — stay in the type skills and are linked
from each per-type section below.

---

For a hands-off discovery flow that routes between this skill and the type
skills, see `../build-for-frontify/SKILL.md`.

---


### Build validation

Before deploying to production and during development iteration, run the following checks:

```bash
npx tsc --noEmit
npx eslint src
```

Use these frequently during development and always before committing to deployment.

---

## Shared prerequisites

### Personal access token

Generate one by **navigating directly** to
`https://YOUR-INSTANCE.frontify.com/oauth-access-token`. The page is
**not linked from any UI menu** — there is no profile-icon, no top-right
entry, no settings panel that takes you there. Frontify's own published
documentation is **outdated** on this point (it still references a
profile/Applications navigation that has been removed); type the URL
into the address bar instead.

Three ways to authenticate the CLI:

1. **Interactive login (developer machine)** —
   `npx frontify-cli login --instance YOUR-INSTANCE-URL`; browser opens;
   CLI stores a session.
2. **Personal access token (CI / agent-driven)** — generate as above,
   then pass `--instance` + `--token` on each `deploy` / `publish` /
   `verify-manifest` command (see below).
3. **Hand-off to user** — when the agent runs in a sandbox without
   network egress to the customer instance, present the deploy commands
   for the user to run on their own machine.

Full token-management reference (expiry, scopes, rotation, error codes):
`../frontify-auth-integration/references/personal-tokens.md`.

### Authenticating (interactive vs. CI)

Credentials come from one of two places:

- **Interactive** — `frontify-cli login` runs a browser OAuth flow and
  stores the session (via `conf`), so subsequent `deploy` / `publish` /
  `verify-manifest` commands need no credentials on the command line.
- **CI / non-interactive** — pass `--instance` and `--token` explicitly on
  each command:

```bash
npx frontify-cli deploy \
  --instance "https://YOUR-INSTANCE.frontify.com" \
  --token "$TOKEN"     # your own shell var, from a CI secret / secrets manager
```

Keep the token in a secrets manager and pass it via `--token`, or avoid
the flag entirely with `frontify-cli login`. `INSTANCE_URL` is the one
login-related env var the CLI honours — the default instance for
`frontify-cli login`.

### Network egress

`frontify-cli` `login`, `deploy`, and `publish` require outbound HTTPS to
the customer's Frontify instance (`<instance>.frontify.com`). In agent
runtimes with strict allowlists, these commands won't work — the agent
must hand off to the user.

`deploy --dry-run` for a **platform-app** is fully local — it validates
the manifest, type-checks, and bundles without contacting the instance, so
it works offline. A **content-block** dry-run still calls the server to
validate its manifest, so it needs egress.

### Placeholder convention (don't copy the angle brackets)

Anywhere this skill (or any scaffold asset) shows a token in
`<ANGLE_BRACKETS>` or `ALL_CAPS_WORDS`, that **entire token is the
placeholder** — angle brackets, underscores, and all. Replace the whole
thing with your real value; don't substitute *inside* the brackets and
leave them in place.

```
✅  --instance "https://acme.frontify.com"
❌  --instance "https://<acme>.frontify.com"      # brackets kept
❌  --instance "<https://acme.frontify.com>"      # whole value bracketed
```

Same rule applies to `manifest.json` placeholders (`<APP_ID>`,
`<APP_NAME>`, `<APP_TITLE>`).

---

## Build-pipeline gates the agent must clear

The CLI's deploy pipeline runs these checks in order. Each fails fast;
fixing one reveals the next.

| Gate | Failure signature | Fix |
|------|-------------------|-----|
| **Manifest validation** | Platform-app: the raw schema error, e.g. `'basic:read' is required in scopes`, `At least one scope is required`, `No more than 5 scopes are allowed`. Content-block: `The manifest is invalid: …` | Field-shape mismatch — see the canonical manifest in the matching type skill. |
| **Type-check** | `error TS####` | Fix in source; align to published `@frontify/*` types. |
| **ESLint** *(only if an eslint config exists)* | Actual lint errors in `src`. With **no** config present the step is *skipped* (`Eslint config file not found, skipping eslint checks…`), not failed. | Fix the reported lint errors, or ship the canonical `eslint.config.js` from the type skill's scaffold assets. |
| **Vite build** | `terser not found` / `Cannot resolve entry module index.html` | Add `terser` to devDeps; ship `index.html` from scaffold assets. |

Manifest validation and the Vite build always run. Type-check and ESLint
are skipped by `--no-verify` (see below).

### `--no-verify`

`--no-verify` skips the **type-check and ESLint** stages (both). Manifest
validation and the bundle build still run — the flag does not affect them.
If you deploy with `--no-verify`, run `tsc --noEmit` (and lint) yourself
first so problems aren't shipped unchecked.

---

## Token-leak hygiene

A Frontify personal-access token is equivalent to the user's password
for that instance. Three concrete leak vectors to defend against:

1. **`--token` in scrollback / CI logs.** The CLI does not print the token
   to stdout — it only logs `You are logged in as <name> (<instance>)`.
   The exposure is the `--token=…` value *you* type: it lands in terminal
   scrollback, shell history, and any CI step that echoes the command.
   Prefer `frontify-cli login` (no token on the command line), or feed the
   token from a secret as shown below; when a command line must be shared,
   redact first (see redaction recipe).
2. **The token in shell history / scrollback.** Typing the token — inline
   after `--token=`, or into a shell variable with `export TOKEN="…"` —
   lands it in `~/.bash_history` / `~/.zsh_history`. Use `read -s`
   interactively, or load from a secrets manager in CI.
3. **Tokens pasted into chat with the agent.** Treat as compromised the
   moment the conversation ends.

**Defensive form (recommended):**

```bash
# Load the token into a shell var without putting it in history:
read -s -p "Frontify token: " TOKEN
# Or from a secrets manager (1Password CLI example):
TOKEN="$(op read 'op://Personal/frontify-pat/credential')"

npx frontify-cli deploy \
  --instance "https://YOUR-INSTANCE.frontify.com" \
  --token "$TOKEN"
```

**Redaction recipe** — when a deploy run's output must be shared:

```bash
npm run deploy 2>&1 \
  | sed -E "s|${TOKEN}|***REDACTED***|g" \
  | tee deploy.log
```

**If you suspect a leak:**

1. Rotate the token immediately at the personal access tokens page
   (`https://YOUR-INSTANCE.frontify.com/oauth-access-token`) → Revoke.
   Generate a fresh one.
2. Update any CI / secrets manager with the new value.
3. Audit recent commits for accidental check-ins
   (`git log -p -S '<token-prefix>'`).
4. If the token was ever pasted into a chat with an external agent,
   assume it's logged on someone else's infrastructure and rotate
   regardless of confidence.

---

## Deploying an App

Standard flow once the prerequisites above are in place and the App's
`manifest.json` checklist is satisfied (see
`../frontify-app/SKILL.md` § Marketplace deployment → Prerequisites
checklist):

```bash
npm run lint
npm run deploy:dry          # after `frontify-cli login`, or add --instance/--token
npm run deploy
npx frontify-cli publish \
  --availability PRIVATE \
  --release-notes "Initial release."
```

Default `--availability PRIVATE`. Only switch to `COMMUNITY` when the
user explicitly authorises external publication.

App-specific procedure that stays in `../frontify-app/SKILL.md`:

- **Manifest prerequisites** — `appId` registration, `metadata.version`
  bump, `permissions.scopes`, surface `"title"` field, placeholder
  sweep (`grep -rn '<[A-Z_]\+>' manifest.json …`), build-pipeline
  files present, `.gitignore` excludes `.secret.json`.
- **Marketplace metadata + publish** — Description, screenshots, then
  `publish`, then **+ Install Platform app** in the Marketplace UI.
- **Re-deploy gotcha — existing installs do NOT auto-upgrade.**
  Installs are version-pinned. After re-deploy you must bump
  `metadata.version`, re-publish, manually upgrade the install in the
  Marketplace UI (Versions tab → Upgrade), and hard-refresh the surface
  (`Cmd-Shift-R`). This is the most common "looks broken but isn't"
  failure mode during iteration. Full procedure in
  `../frontify-app/SKILL.md`.

If the App has a backend (Hono on Lambda, GH Actions OIDC, etc.), see
"Backend deploy" in the handoff table below.

## Deploying a Custom Block

Validate the bundle before publishing:

```bash
npx @frontify/frontify-cli@latest deploy --dry-run
```

Block-specific testing flow (TypeScript compile check, live preview in a
Guidelines page, then dry-run) lives in
`../frontify-custom-block/SKILL.md` § Testing. Once validated, the same
shared CLI flow above (`deploy`, optional `publish`) applies.

## Deploying a Theme

Theme-specific deploy procedure is **not yet documented** in v1 of this
skill set. The shared mechanics above (token, env vars, build gates,
egress, placeholder rule, leak hygiene) all apply. Marketplace publish
fields and any theme-specific install behavior remain a known gap —
do not fabricate steps; flag the gap to the user and confirm the
deploy target with them before proceeding.

Cross-link: `../frontify-theme/SKILL.md`.

---

## Handoff to other skills

| Topic | Skill |
|---|---|
| App-specific Marketplace flow & post-deploy upgrade behavior | `../frontify-app/SKILL.md` |
| Custom block dry-run validation & block testing flow | `../frontify-custom-block/SKILL.md` |
| Theme deployment (gap — see note above) | `../frontify-theme/SKILL.md` |
| Backend deploy (Docker, AWS Lambda, GitHub Actions OIDC) | `../frontify-app-backend/SKILL.md` + `../frontify-app-reference/SKILL.md` (`docs/07-deployment-pipeline.md`, `templates/backend/dockerfile-lambda/`, `templates/backend/github-actions/`) |
| Personal-access-token deep-dive (expiry, scopes, rotation, errors) | `../frontify-auth-integration/references/personal-tokens.md` |
| OAuth flows for backends that aren't using static client credentials | `../frontify-auth-integration/SKILL.md` |
