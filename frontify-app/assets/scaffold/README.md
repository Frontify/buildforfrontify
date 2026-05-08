# `assets/scaffold/` — canonical Frontify App scaffold

This folder is the **inline-scaffold source** referenced by `../SKILL.md`.
Use it when the official interactive CLI (`npx @frontify/frontify-cli@latest create`)
cannot be driven — typically in agent / CI / sandboxed contexts where there is
no TTY, or when the agent has already cleared discovery and is ready to write
files in one pass.

## What's here

```
assets/scaffold/
├── README.md               (this file)
├── package.json            (deps + frontify-cli scripts; placeholders for name)
├── tsconfig.json           (strict TS, JSX react-jsx, bundler module resolution)
├── manifest.json           (canonical shape — appType, top-level name, metadata.version)
├── eslint.config.js        (minimal flat config; satisfies CLI pre-deploy gate)
├── index.html              (Vite entry; loads /src/index.tsx)
└── src/
    ├── index.tsx           (React mount)
    ├── App.tsx             (surface gate + scaffolded body)
    └── settings.ts         (defineSettings — uses dropdown, not select)
```

## Placeholders

Three tokens to substitute when copying. **Replace the entire `<TOKEN>`
including the angle brackets** — don't substitute *inside* the brackets
and leave them in place.

```
✅  "appId": "abc-123-frontify-id"
❌  "appId": "<abc-123-frontify-id>"          # brackets kept
❌  "appId": "<APP_ID-abc-123>"               # mixed-up substitution
```

| Token | Replace with | Where it appears |
|-------|--------------|------------------|
| `<APP_NAME>` | npm-style slug, e.g. `qr-generator` | `package.json` `name`, `manifest.json` `name` |
| `<APP_TITLE>` | Human-readable title, e.g. `QR Generator` | `manifest.json` `surfaces.*.title`, `index.html` `<title>`, `src/App.tsx` greeting |
| `<APP_ID>` | Marketplace App ID after registration | `manifest.json` `appId` |

Optionally also:
- `<DESCRIPTION>` — short summary used in `package.json`.
- `<SURFACE>` — pick one of `assetCreation`, `assetAction`, `assetBulkActions` for the default surface block in `manifest.json` (currently `assetCreation`).

After substituting, search the project for any remaining `<` or `>`
characters in `manifest.json`, `package.json`, and `index.html` to
catch missed replacements.

## How agents should use this

1. Determine app name, title, and primary surface via build-for-frontify discovery.
2. `mkdir <APP_NAME>` and copy every file from `assets/scaffold/` into it (preserve `src/` structure).
3. Substitute the placeholders.
4. `cd <APP_NAME> && npm install`.
5. `npm run lint` (tsc) — should be clean.
6. Implement the user's first feature in `src/App.tsx`.
7. Follow `../SKILL.md` § Marketplace deployment for the deploy flow.

## Why this is shipped instead of relying on the CLI

The interactive CLI uses arrow-key prompts and has no flags for app type,
surface, or styling. In sandbox / non-TTY contexts the agent can't drive it.
This scaffold is functionally equivalent to what the CLI would produce, plus
the three files the CLI bakes in but the SKILL.md historically did not
document: `eslint.config.js`, `index.html`, and `terser` in devDeps.

## Where to learn more

| Topic | Reference |
|-------|-----------|
| Full App skill (scaffold flow, dev loop, deploy) | [`../../SKILL.md`](../../SKILL.md) |
| Manifest scopes, `secrets[]`, `network.endpoints[]` | [`../../../frontify-auth-app/references/manifest-permissions.md`](../../../frontify-auth-app/references/manifest-permissions.md) |
| `executeSecureRequest` for credentialed third-party calls | [`../../../frontify-auth-app/references/secure-requests.md`](../../../frontify-auth-app/references/secure-requests.md) |
| AppBridge auth methods (`executeGraphql`, `getCurrentUser`, …) | [`../../../frontify-auth-app/references/app-bridge-auth.md`](../../../frontify-auth-app/references/app-bridge-auth.md) |
| Deploy build-pipeline gates + `--no-verify` caveat | [`../../SKILL.md`](../../SKILL.md) § Marketplace deployment |
