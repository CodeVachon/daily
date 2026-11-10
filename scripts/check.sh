#!/usr/bin/env bash
# Everything that must pass before a commit (see AGENTS.md "Commit rules").
# Run manually with `bun run check`; the pre-commit hook runs it too.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

step() { printf '\n\033[1m▶ %s\033[0m\n' "$1"; }

step "motte: no issues left In Progress"
open_issues="$(motte list --state "In Progress" --json | node -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    const { issues } = JSON.parse(s)
    for (const i of issues) console.log(`  #${i.id} ${i.title}${i.assignee ? ` (${i.assignee})` : ""}`)
  })')"
if [ -n "$open_issues" ]; then
  echo "Close (motte move <ref> Done) or release (motte release <ref>) before committing:"
  echo "$open_issues"
  exit 1
fi

step "typecheck"
bun run typecheck

step "lint (database boundary + zero warnings)"
bun run lint

step "tests + coverage"
bun run test

step "fallow (dead code, duplication, complexity/CRAP with coverage)"
bun run fallow

printf '\n\033[32m✓ all checks passed\033[0m\n'
