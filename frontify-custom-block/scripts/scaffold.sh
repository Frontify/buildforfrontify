#!/usr/bin/env bash
# scripts/scaffold.sh — Content Block project scaffolder
#
# PURPOSE
#   Validates prerequisites and launches the official Frontify CLI to scaffold
#   a new Content Block project via an interactive prompt.
#
# USAGE
#   bash scripts/scaffold.sh [--port <port>]
#
#   --port <port>   Port the dev server will use (default: 5600). This is only
#                   printed in the next-step instructions; it does not start the
#                   server.
#
# WHAT THIS SCRIPT DOES
#   1. Checks that Node 22.14+ is installed
#   2. Checks that npx is available
#   3. Runs: npx @frontify/frontify-cli@latest create  (interactive)
#   4. Installs npm dependencies in the newly created directory
#   5. Prints next-step instructions
#
# ERROR HANDLING
#   Missing Node or wrong version  → prints install instructions and exits 2
#   npx not found                  → prints install instructions and exits 2
#   CLI create command fails        → exits 3
#   npm install fails               → exits 3
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

# ─── Scaffold ────────────────────────────────────────────────────────────────

heading "Scaffolding Content Block"

echo "  Running: npx @frontify/frontify-cli@latest create"
echo "  Answer the prompts to configure your block name, CSS framework, etc."
echo

# Capture the directory created by the CLI so we can cd into it for npm install.
# The CLI creates a new directory whose name matches what the user enters.
# We compare directory listings before and after to find it.

BEFORE=$(ls -d */ 2>/dev/null || true)

if ! npx @frontify/frontify-cli@latest create; then
    error "Frontify CLI scaffold failed."
    exit 3
fi

AFTER=$(ls -d */ 2>/dev/null || true)

# Determine the new directory (first new entry)
NEW_DIR=$(comm -13 <(echo "$BEFORE" | sort) <(echo "$AFTER" | sort) | head -1 | tr -d '/')

# ─── Install dependencies ─────────────────────────────────────────────────────

if [[ -n "$NEW_DIR" ]] && [[ -d "$NEW_DIR" ]]; then
    heading "Installing dependencies in ./$NEW_DIR"
    if ! (cd "$NEW_DIR" && npm install); then
        error "npm install failed in ./$NEW_DIR"
        exit 3
    fi
    info "Dependencies installed"
else
    warn "Could not detect the new project directory. Run 'npm install' manually."
    NEW_DIR="<your-block-directory>"
fi

# ─── Next steps ───────────────────────────────────────────────────────────────

heading "You're all set 🎉"

cat <<EOF
  Your Content Block is ready. Here's what to do next:

  1. Start the dev server:

       cd ${NEW_DIR}
       npm run serve

     The block will be broadcast on port ${PORT}.

  2. Add the "Local Block Development" block to a page in your Frontify
     Guidelines, and set the port to ${PORT} in its settings sidebar.

  3. Edit src/Block.tsx to build your block, and src/settings.ts to
     configure the settings panel. Changes hot-reload automatically.

  4. Fill in manifest.json — the appId from the Marketplace, and a
     settingsSchema describing every setting in src/settings.ts.

     settingsSchema is required: without it your block cannot be
     translated or searched, and its settings come back null on the
     public API. See:

       $(dirname "$0")/../references/settings-schema.md

  5. When you're ready to publish:

       bash $(dirname "$0")/check-settings-schema.sh          # check the schema
       npx @frontify/frontify-cli@latest verify-manifest      # official gate
       npx @frontify/frontify-cli@latest login --instance=<your-frontify-url>
       npx @frontify/frontify-cli@latest deploy --dry-run     # validate first
       npx @frontify/frontify-cli@latest deploy               # publish

  Full API reference: $(dirname "$0")/../references/custom-block-api.md

EOF
