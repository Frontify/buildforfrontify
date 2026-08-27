#!/usr/bin/env bash
# scripts/scaffold.sh — App project scaffolder
#
# PURPOSE
#   Validates prerequisites and launches the official Frontify CLI to scaffold
#   a new App project via an interactive prompt.
#
# USAGE
#   bash scripts/scaffold.sh [--port <port>]
#
#   --port <port>   Port the dev server will use (default: 5600). Only printed
#                   in next-step instructions; does not start the server.
#
# WHAT THIS SCRIPT DOES
#   1. Checks that Node 22.14+ is installed
#   2. Checks that npx is available
#   3. Runs: npx @frontify/frontify-cli@latest create  (interactive)
#      → When prompted, select "App" as the extension type
#   4. Installs dependencies (pnpm if available, otherwise npm)
#   5. Prints next-step instructions
#
# ERROR HANDLING
#   Missing Node or wrong version  → prints install instructions and exits 2
#   npx not found                  → prints install instructions and exits 2
#   CLI create command fails       → exits 3
#   install fails                  → exits 3
#
# EXIT CODES
#   0  — scaffold completed successfully
#   1  — invalid arguments
#   2  — prerequisite not found or version mismatch
#   3  — scaffold or install failed

set -euo pipefail

# ─── Defaults ────────────────────────────────────────────────────────────────

PORT=5600

# ─── Argument parsing ────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
    case "$1" in
        --port)
            PORT="$2"
            shift 2
            ;;
        *)
            echo "Unknown argument: $1" >&2
            echo "Usage: bash scripts/scaffold.sh [--port <port>]" >&2
            exit 1
            ;;
    esac
done

# ─── Helpers ─────────────────────────────────────────────────────────────────

info()    { echo "  ✔  $*"; }
warn()    { echo "  ⚠  $*" >&2; }
error()   { echo "  ✖  $*" >&2; }
heading() { echo; echo "── $* ──"; echo; }

# ─── Prerequisite checks ─────────────────────────────────────────────────────

heading "Checking prerequisites"

# Node.js ≥ 22.14
if ! command -v node &>/dev/null; then
    error "Node.js is not installed."
    echo "    Install it from https://nodejs.org/ (version 22.14 or newer required)."
    exit 2
fi

NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
NODE_MINOR=$(echo "$NODE_VERSION" | cut -d. -f2)

if [[ "$NODE_MAJOR" -lt 22 ]] || { [[ "$NODE_MAJOR" -eq 22 ]] && [[ "$NODE_MINOR" -lt 14 ]]; }; then
    error "Node.js $NODE_VERSION found, but 22.14+ is required."
    echo "    Update Node.js at https://nodejs.org/"
    exit 2
fi

info "Node.js $NODE_VERSION"

# npx
if ! command -v npx &>/dev/null; then
    error "npx is not available. It ships with Node.js — try reinstalling Node."
    exit 2
fi

info "npx $(npx --version)"

# Detect package manager — prefer pnpm
if command -v pnpm &>/dev/null; then
    PKG_MANAGER="pnpm"
    INSTALL_CMD="pnpm install"
    DEV_CMD="pnpm serve"
    LOGIN_CMD="pnpm run login"
    DEPLOY_CMD="pnpm run deploy"
else
    PKG_MANAGER="npm"
    INSTALL_CMD="npm install"
    DEV_CMD="npm run serve"
    LOGIN_CMD="npm run login"
    DEPLOY_CMD="npm run deploy"
fi

info "Package manager: $PKG_MANAGER"

# ─── Scaffold ────────────────────────────────────────────────────────────────

heading "Scaffolding App"

echo "  Running: npx @frontify/frontify-cli@latest create"
echo "  Answer the prompts:"
echo "    • Extension type  → select App"
echo "    • Styling         → Tailwind (recommended) or your preference"
echo

# Snapshot directory listing before the CLI runs so we can detect the new folder.
BEFORE=$(ls -d */ 2>/dev/null || true)

if ! npx @frontify/frontify-cli@latest create; then
    error "Frontify CLI scaffold failed."
    exit 3
fi

AFTER=$(ls -d */ 2>/dev/null || true)

# First directory entry present after but not before the CLI run.
NEW_DIR=$(comm -13 <(echo "$BEFORE" | sort) <(echo "$AFTER" | sort) | head -1 | tr -d '/')

# ─── Install dependencies ─────────────────────────────────────────────────────

if [[ -n "$NEW_DIR" ]] && [[ -d "$NEW_DIR" ]]; then
    heading "Installing dependencies in ./$NEW_DIR"
    if ! (cd "$NEW_DIR" && $INSTALL_CMD); then
        error "$INSTALL_CMD failed in ./$NEW_DIR"
        exit 3
    fi
    info "Dependencies installed"
else
    warn "Could not detect the new project directory. Run '$INSTALL_CMD' manually."
    NEW_DIR="<your-app-directory>"
fi

# ─── Next steps ───────────────────────────────────────────────────────────────

heading "You're all set!"

cat <<EOF
  Your Frontify App is ready. Here's what to do next:

  1. Start the dev server:

       cd ${NEW_DIR}
       ${DEV_CMD}

     The dev server broadcasts on port ${PORT}.
     The page is intentionally blank — connect it from inside Frontify (step 3).

  2. Enable Developer Mode in your Frontify instance (only needed once):

       In your browser console on any Frontify page:
         localStorage.setItem('developer-mode', '{"json":true}')

     Or toggle it via your user profile if the option is visible there.

  3. Connect the running app:

       a. Navigate to an asset in a Library or Project
       b. Open the "…" Asset Actions menu
       c. Choose "+ Connect…"
       d. Enter localhost:${PORT}
       e. Click Connect

     For bulk actions, multi-select assets first — the action bar appears at the bottom.

  4. Declare your surfaces in manifest.json:

     A single app can run on multiple surfaces. Add your app entry under the
     relevant section(s) in manifest.json:

       mediaLibrary / iconLibrary / logoLibrary / documentLibrary / workspace
         → assetAction, assetCreation, assetBulkActions

       guideline
         → assetViewer, pageAction, assetChooser (on-demand — request via Frontify Friends)

     See references/surfaces.md for the exact manifest structure per surface.

  5. Register your app on the Frontify Marketplace to get an App ID, then
     set it in manifest.json under "appId".

  6. When ready to publish:

       ${LOGIN_CMD}   # authorise the CLI for your Frontify instance
       ${DEPLOY_CMD} --dry-run   # validate before publishing
       ${DEPLOY_CMD}

  Full reference: $(dirname "$0")/../SKILL.md

EOF
