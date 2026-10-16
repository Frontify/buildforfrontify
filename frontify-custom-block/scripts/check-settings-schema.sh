#!/usr/bin/env bash
# scripts/check-settings-schema.sh — settingsSchema validator for Content Blocks
#
# PURPOSE
#   Validates the settingsSchema in a Content Block's manifest.json, and cross-checks it
#   against the block's own src/settings.ts. Catches the errors that
#   `frontify-cli verify-manifest` accepts silently — keywords on containers, keywords
#   inside conditional branches, unsupported frontify-type values, misspelled keywords,
#   and every kind of drift between the schema and the settings it is supposed to describe.
#
#   Run this BEFORE `verify-manifest`, not instead of it. verify-manifest is the gate that
#   runs at submission time; this script covers what that gate does not see.
#
# USAGE
#   bash scripts/check-settings-schema.sh [<block-project-dir>]
#
#   <block-project-dir>   Root of the Content Block project (default: current directory).
#                         Must contain manifest.json.
#
# WHAT THIS SCRIPT DOES
#   1. Checks that Node 22.14+ is installed
#   2. Checks that the target directory contains a manifest.json
#   3. Tier A — validates manifest.json and its settingsSchema on their own
#   4. Tier B — imports src/settings.ts and cross-checks every setting against the schema
#   5. Prints one line per finding, tagged with the check ID a Marketplace review would cite
#
#   Tier B uses Node's built-in TypeScript stripping, so it needs no extra tooling — but it
#   does need the project's own dependencies installed (`npm install`), because settings.ts
#   imports from @frontify/guideline-blocks-settings. If the import fails, Tier B reports
#   itself unavailable and Tier A findings are still returned. It never guesses.
#
# ERROR HANDLING
#   Missing Node or wrong version  → prints install instructions and exits 2
#   No manifest.json in target     → prints the expected location and exits 2
#   Findings reported              → exits 3
#
# EXIT CODES
#   0  — no problems found
#   1  — invalid arguments
#   2  — prerequisite not found, or target is not a Content Block project
#   3  — one or more problems found
#
# MAINTENANCE
#   The check IDs this script reports (FB-MF-*, FB-SCH-*, FB-SER-*, FB-I18N-*, FB-SET-*)
#   are the same IDs Frontify's Marketplace review tooling uses, so a finding here names
#   the same rule a reviewer would cite. This script reimplements a subset of those rules
#   so that block authors can self-check without that tooling.
#
#   It is therefore a stand-in, not a second source of truth. Once the official review
#   tooling is published for external use, retire this script and point authors at it
#   instead — one implementation, no rule set to keep in sync. Until then, the rules here
#   and the mapping table in references/settings-schema.md § 6 must be updated together
#   whenever @frontify/guideline-blocks-settings adds or deprecates a setting type.

set -euo pipefail

# ─── Defaults ────────────────────────────────────────────────────────────────

TARGET="."

# ─── Argument parsing ────────────────────────────────────────────────────────

while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            # Print the header comment block: every line from 2 until the first non-comment.
            awk 'NR>1 { if ($0 !~ /^#/) exit; sub(/^# ?/, ""); print }' "$0"
            exit 0
            ;;
        -*)
            echo "Unknown argument: $1" >&2
            echo "Usage: bash scripts/check-settings-schema.sh [<block-project-dir>]" >&2
            exit 1
            ;;
        *)
            TARGET="$1"
            shift
            ;;
    esac
done

# ─── Helpers ─────────────────────────────────────────────────────────────────

info()    { echo "  ✔  $*"; }
warn()    { echo "  ⚠  $*" >&2; }
error()   { echo "  ✖  $*" >&2; }
heading() { echo; echo "── $* ──"; echo; }

# ─── Prerequisite checks ─────────────────────────────────────────────────────

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

if [[ ! -d "$TARGET" ]]; then
    error "No such directory: $TARGET"
    exit 2
fi

if [[ ! -f "$TARGET/manifest.json" ]]; then
    error "No manifest.json in $TARGET"
    echo "    Run this from the root of a Content Block project, or pass the path:"
    echo "      bash scripts/check-settings-schema.sh path/to/my-block"
    exit 2
fi

# ─── Run ─────────────────────────────────────────────────────────────────────

heading "Checking settingsSchema in $TARGET/manifest.json"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

set +e
node --experimental-strip-types --disable-warning=ExperimentalWarning \
    "$SCRIPT_DIR/check-settings-schema.mjs" "$TARGET"
STATUS=$?
set -e

if [[ "$STATUS" -ne 0 ]] && [[ "$STATUS" -ne 3 ]]; then
    error "The checker exited unexpectedly (status $STATUS). This is a bug in the script, not in your block."
    exit 2
fi

if [[ "$STATUS" -eq 0 ]]; then
    heading "Clean"
    echo "  Next: npx @frontify/frontify-cli@latest verify-manifest"
    echo
    exit 0
fi

heading "Fix these before submitting"

cat <<EOF
  Every finding above is tagged with the check ID a Marketplace review would cite.
  The rules, the setting-type mapping table, and a pre-submission checklist are in:

    $(dirname "$SCRIPT_DIR")/references/settings-schema.md

EOF

exit "$STATUS"
