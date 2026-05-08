# Scaffolding a New Theme

How to go from zero to a locally running custom theme connected to a real Frontify guideline. The Frontify CLI does not have a `theme create` command (the `create` command only covers content blocks and platform apps), so the canonical path is to start from the Boilerplate Theme and customize from there.

## Prerequisites

Before touching any code:

1. **Node.js** — LTS or newer. The boilerplate's dev toolchain targets Node 18+.
2. **Frontify CLI** — used for the dev server and deployment. You can install globally (`npm install -g @frontify/frontify-cli`) or invoke via `npx`.
3. **React Developer Tools** — Chrome extension, not strictly required but extremely helpful for debugging.
4. **Development mode enabled on the Frontify account.** This is the easy-to-miss one. Dev mode must be turned on by Frontify's team — join the [Frontify Friends Slack community](https://frontify-friends.slack.com/) and message the team:

   > Hi team! Please enable dev-mode on this account: \[your account URL]. Thanks!

   Without dev mode, the "Local Theme Development" app won't appear in the Marketplace and local development can't work.

## Setup flow

### 1. Install the "Local Theme Development" app in the guideline

Once dev mode is active:

1. Log in to the Frontify account.
2. Navigate to `https://<YOUR_DOMAIN>/marketplace/type/theme`.
3. Install **Local Theme Development**.
4. Open the guideline you want to develop against.
5. Open **Theme Settings** → **Layout and navigation** → **Theme chooser**.
6. Select **Local Theme Development**.
7. Enter the dev server port (default: `5600`).
8. Keep the tab open — you'll click **Connect** in a minute.

### 2. Get the boilerplate

The boilerplate is a separate download (link in the Frontify developer docs under "Sample Code"). Clone or unzip it into your project directory and open it in the IDE.

What you get:

```
boilerplate-theme/
├── manifest.json              # appType: "theme", appId: placeholder
├── package.json               # scripts: serve, deploy, typecheck, test
├── src/
│   ├── index.ts               # defineTheme({ templates: { cover, documentPage, library } })
│   ├── FrontifyClassicTheme.tsx
│   ├── CoverPage.tsx
│   ├── DocumentPage.tsx
│   ├── LibraryPage.tsx
│   ├── settings.tsx
│   ├── defaults.ts
│   ├── types.ts
│   ├── components/            # Header, Navigation, Sidebar, Logo, LanguageSwitch
│   └── helpers/               # small focused utility functions
```

Rename the top-level folder, update `package.json` `name`, and generally make it yours. Keep the file header comments (`/* (c) Copyright Frontify Ltd., all rights reserved. */`) if you're building on Frontify code — or replace with your own company's header.

### 3. Create a Marketplace theme entry (needed even for local dev once deploying)

For local development alone the "Local Theme Development" app is sufficient, but to deploy you'll need a real Marketplace app id:

1. In the Marketplace, create a new theme.
2. Copy the **Marketplace App ID** (also called Theme ID) from the theme details page.
3. Open `manifest.json` in your project:

   ```json
   {
     "appType": "theme",
     "appId": "<ADD_YOUR_MARKETPLACE_APP_ID_HERE>"
   }
   ```

4. Replace the placeholder with your real App ID.

**For staging/testing:** Frontify does not currently support publishing a test-only version of a theme. Once you deploy, everyone using that theme gets the new version. The workaround is to create a **separate Marketplace App ID for staging**, deploy the test build under that id, assign it only to test guidelines, and then re-deploy under the production id once validated.

### 4. Install dependencies and start the dev server

```bash
cd your-theme
npm install
npm run serve
```

The dev server output looks like:

```
[09:00:00] Starting the development server for theme...
  ➜  Local:   http://localhost:5600/
```

Note the port. It defaults to `5600` but if that's in use, the server will pick another.

### 5. Connect the guideline to the dev server

Back in the Frontify tab you kept open:

1. Enter the dev server port (if different from 5600).
2. Click **Connect**.

If everything is wired up correctly, the guideline will now render using your local theme. Save a file in your IDE and it hot-reloads in the browser.

## First-run sanity checks

If the connection succeeds but nothing renders, or the UI looks broken, run through these before assuming something is deeply wrong:

- Is `src/index.ts` actually exporting a `defineTheme(...)` default? The CLI expects that exact shape.
- Are all three template types (`cover`, `documentPage`, `library`) populated with a `default` variant? Missing even one causes templates to fall through silently.
- Is `<Content />` being rendered inside the `documentPage` template variant? Without it, document pages appear empty.
- Are you on a guideline that actually has published content in it? An empty guideline looks a lot like a broken theme.
- Check the browser console for errors from the theme's own code — React errors bubble up here.

## Deployment

Once you're happy with a build, deploy it to your Frontify instance:

```bash
npx @frontify/frontify-cli@latest login --instance=your.domain.com
npx @frontify/frontify-cli@latest deploy
```

The `login` step opens a browser flow to authorize the CLI.

Alternative: use an OAuth access token instead of interactive login. Generate one at:

```
https://<your-domain>/api/oauth-access-token/show
```

Required scopes: `basic:read`, `blocks:read`, `blocks:write`.

```bash
npx @frontify/frontify-cli@latest deploy --instance=your.domain.com --token=<accessToken>
```

Token-based deployment is the way to go for CI/CD pipelines.

## Publishing to the Marketplace

Deploy makes the theme available on your instance. To list it for other Frontify customers:

1. Open the Marketplace on your instance.
2. Find your theme.
3. Enter edit mode.
4. Click **Publish**.

## Selecting a deployed theme in a guideline

1. Install your theme on the Marketplace (once deployed).
2. Open a guideline.
3. **Theme Settings** → **Theme chooser** → pick your theme.

## Tooling recommendations

The boilerplate ships with a solid baseline: TypeScript, Vitest, ESLint (via `@frontify/eslint-config-react`), Prettier, Tailwind with a `th-` prefix to avoid colliding with platform styles. Keep these unless you have a strong reason to change — they match what Frontify uses internally and make it easier to share code with other theme developers.

The test setup in the boilerplate uses `@testing-library/react` + `happy-dom`. Unit tests for helper functions pay off quickly — navigation highlight logic, setting helpers, rule functions. Component tests for anything that talks to `appBridge` benefit from a mock bridge; look at `setupTests.ts` in the boilerplate for the scaffolding.

## Things that commonly go wrong during setup

- **"Local Theme Development" doesn't appear in the Marketplace** → dev mode not enabled. Message Frontify Slack.
- **Dev server starts but Connect fails** → port mismatch between the server and the guideline's Theme chooser field, or a browser blocking localhost due to a service worker from a previous session (hard-refresh the guideline tab).
- **Theme connects but shows a white page** → likely a runtime error in your theme code. Open the browser devtools console.
- **Type errors on `ThemeProps` from `@frontify/guideline-themes`** → version mismatch between `@frontify/app-bridge-theme` and `@frontify/guideline-themes`. Keep both on compatible alpha releases (check `package.json` in the boilerplate as a reference).
- **`frontify-cli` command not found** → not installed globally; use `npx @frontify/frontify-cli` or the `scripts` in `package.json`.

See `debugging.md` for deeper diagnostic flow once you're past initial setup.