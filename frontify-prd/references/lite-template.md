# Lite PRD Template

For exploratory / single-surface / single-feature builds. Five lines, five
minutes, then code. The Lite PRD is **not** a watered-down Standard PRD —
it's a different artifact for a different scope. If the build needs more
than this, run Standard instead (see the decision rule in `../SKILL.md`).

## Template

```markdown
# <extension-name> — Lite PRD

**What:** <1 sentence — the extension and the outcome>
**Type:** <App / Block / Theme — and surface(s) if App>
**Flow:** <1 sentence happy-path — user does X, sees Y>
**Auth & data:** <Frontify scopes + any third-party APIs>
**Done when:** <1 sentence acceptance criterion>
```

Save to `./PRD.md`.

## Walkthrough

Ask the five questions conversationally, one or two at a time. Don't drop
the whole template on the user.

### 1. What

> "In one sentence — what does this extension do, and for whom?"

A good answer names the **user**, the **action**, and the **outcome**:

- ✅ "A button on the asset detail page that lets editors trigger a
  background-removal pass and replaces the asset with the result."
- ❌ "A tool for image stuff."

### 2. Type

> "Is this an App, a Custom Block, or a Theme? If it's an App, which
> surface(s)?"

If you already know from earlier conversation, skip the question — confirm
your understanding and move on. The valid surfaces for Apps are:

- **Standard** — `assetAction`, `assetCreation`, `assetBulkActions`
- **On-demand (Alpha)** — `assetViewer`, `pageAction`, `themeAction`

Only one surface for Lite. If two or more come up, propose Standard.

### 3. Flow

> "Walk me through one happy-path moment — what does the user do, and what
> happens next?"

Capture as a single sentence in *user-does → system-does* form:

- ✅ "The editor selects an asset and clicks 'Remove background'; the App
  uploads a replacement and shows a confirmation."
- ❌ "User uses the app to do background removal."

### 4. Auth & data

> "What Frontify data does it need (read or write)? And does it call any
> third-party API?"

Capture in two halves:

- **Frontify scopes** — `basic:read`, `basic:write`, `account:read`,
  `webhook:read`, `webhook:write` (pick the minimum)
- **Third-party** — none; or "public no-auth API at <url>"; or "credentialed
  API X" (the moment a credential is in scope, propose Standard — secrets
  warrant a real PRD)

Examples:

- "`basic:read`, `basic:write`. No third party."
- "`basic:read`. Public weather data from open-meteo.com."

### 5. Done when

> "How do we know it works? One acceptance criterion."

A good answer is a single observable behaviour, not a feeling:

- ✅ "Selecting any image asset and clicking the button replaces it with a
  background-free version within 30 seconds."
- ❌ "Background removal works well."

## Worked example

```markdown
# remove-bg — Lite PRD

**What:** A button on the asset detail page that lets editors trigger a
background-removal pass on any image asset.
**Type:** App, surface `assetAction` only.
**Flow:** Editor opens an image asset → clicks "Remove background" in the
… menu → app uploads the cleaned image as a replacement → confirmation
toast.
**Auth & data:** `basic:read`, `basic:write`. Calls a public-only
background-removal API at example.com (no credential).
**Done when:** A previously-uploaded image asset is replaced with a
PNG-with-transparency version within 30 seconds of clicking the button.
```

That's enough for the agent to scaffold, declare the right scope, wire up
the right surface, and stop scope-creeping. If the user wants tagging,
batch processing, or an API key flow, that's a Standard PRD.

## Upgrade signals

Re-propose Standard mode if any of these come up while drafting Lite:

- A second surface joins the request
- A second feature joins the request
- A credentialed third-party API joins the request
- The user starts naming stakeholders or release dates
- The acceptance criterion needs more than one sentence

Re-proposing is cheap — just say "this is starting to look like a Standard
build, want to switch?" and let the user decide.

## Terminology check

Users often describe their build with technical terms that don't quite mean
what they think — capturing the misunderstanding into the PRD propagates it
into code review and stakeholder docs. When you hear any of the words below
during the Lite walkthrough, ask one short clarifying question before writing
the PRD line.

| User says | Likely confused with | Quick clarifier |
|-----------|----------------------|-----------------|
| **encrypt** (a QR / barcode / link) | encode | "QR codes encode, they don't encrypt — anyone with a scanner can read them. Is the goal to make the data unreadable to a scanner, or just to put it into a QR?" |
| **library** | project / brand / collection | "By library do you mean a Frontify Library (assets), a Brand, or a project folder?" |
| **asset** | file / attachment / image | "Asset in Frontify means anything stored as a managed entity (image, video, document, file). Is that what you mean?" |
| **template** | preset / custom block / theme | "Template can mean a few things. Are you thinking of a Custom Block, a Theme, or saved settings for an App?" |
| **plugin** | App / Custom Block / integration | "Frontify uses 'App' (in-platform extension) and 'Integration' (external caller). Which fits what you want to build?" |
| **publish** | deploy / release / make-public | "By publish, do you mean upload a new version to the Marketplace draft (deploy), or make it visible to the wider community (publish + COMMUNITY)?" |

Capture the user's actual intent, not their first wording. If the user
insists on the original term despite the clarifier, note both forms in
section 10 (Open questions) of a Standard PRD or in the relevant Lite
line so it surfaces during review.
