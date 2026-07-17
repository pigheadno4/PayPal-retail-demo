#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

make_fixture() {
  local fixture
  fixture="$(mktemp -d)"
  mkdir -p "$fixture/demos/paypal-retail-demo" "$fixture/scripts/tests" "$fixture/learnings"

  cp "$repo_root/AGENTS.md" "$repo_root/CLAUDE.md" "$repo_root/KNOWLEDGE_SOURCES.md" "$fixture/"
  cp "$repo_root/demos/AGENTS.md" "$repo_root/demos/CLAUDE.md" "$repo_root/demos/NEW_DEMO_PROTOCOL.md" "$fixture/demos/"
  cp -R "$repo_root/demos/_templates" "$fixture/demos/"
  cp "$repo_root/demos/paypal-retail-demo/AGENTS.md" "$repo_root/demos/paypal-retail-demo/IMPLEMENTATION_PLAN.md" "$fixture/demos/paypal-retail-demo/"
  cp "$repo_root/learnings/AGENTS.md" "$repo_root/learnings/CLAUDE.md" "$repo_root/learnings/INDEX.md" "$repo_root/learnings/_template.md" "$fixture/learnings/"
  cp "$repo_root/scripts/check-agent-system.sh" "$fixture/scripts/"
  cp "$repo_root/scripts/validate-demo-workflow.mjs" "$fixture/scripts/"
  cp "$repo_root/scripts/tests/validate-demo-workflow.test.mjs" "$fixture/scripts/tests/"

  printf '%s\n' "$fixture"
}

run_checker() {
  local fixture="$1"
  (
    cd "$fixture"
    bash scripts/check-agent-system.sh
  )
}

expect_failure() {
  local fixture="$1"
  local expected="$2"
  local output

  if output="$(run_checker "$fixture" 2>&1)"; then
    echo "Expected checker failure containing: $expected" >&2
    echo "$output" >&2
    return 1
  fi

  if [[ "$output" != *"$expected"* ]]; then
    echo "Checker failed for the wrong reason." >&2
    echo "Expected: $expected" >&2
    echo "Actual: $output" >&2
    return 1
  fi
}

baseline_fixture="$(make_fixture)"
trap 'rm -rf "$baseline_fixture" "${missing_fixture:-}" "${missing_slice_fixture:-}" "${missing_validator_fixture:-}" "${stale_fixture:-}" "${wiki_fixture:-}" "${semantic_fixture:-}" "${handover_fixture:-}"' EXIT
run_checker "$baseline_fixture" >/dev/null

missing_fixture="$(make_fixture)"
rm -f "$missing_fixture/demos/_templates/standard-demo/REQUIREMENTS.md"
expect_failure "$missing_fixture" "Missing required file: demos/_templates/standard-demo/REQUIREMENTS.md"

missing_slice_fixture="$(make_fixture)"
rm -f "$missing_slice_fixture/demos/_templates/complex-demo/slices/SLICE-TEMPLATE.md"
expect_failure "$missing_slice_fixture" "Missing required file: demos/_templates/complex-demo/slices/SLICE-TEMPLATE.md"

missing_validator_fixture="$(make_fixture)"
rm -f "$missing_validator_fixture/scripts/validate-demo-workflow.mjs"
expect_failure "$missing_validator_fixture" "Missing required file: scripts/validate-demo-workflow.mjs"

stale_fixture="$(make_fixture)"
printf '\n- Feature requirements belong in `DEMO.md`, `DESIGN.md`, and `IMPLEMENTATION_PLAN.md`.\n' >> "$stale_fixture/demos/_templates/standard-demo/AGENTS.md"
expect_failure "$stale_fixture" "Stale requirement authority language"

wiki_fixture="$(make_fixture)"
wiki_path="$(sed -n 's/^- Path: `\([^`]*\)`.*/\1/p' "$wiki_fixture/KNOWLEDGE_SOURCES.md" | head -n 1)"
printf '\n%s\n' "$wiki_path" >> "$wiki_fixture/learnings/INDEX.md"
expect_failure "$wiki_fixture" "Hard-coded payment wiki path outside KNOWLEDGE_SOURCES.md"

semantic_fixture="$(make_fixture)"
cp -R "$semantic_fixture/demos/_templates/standard-demo" "$semantic_fixture/demos/workflow-test"
printf '\n### REQ-01 — Malformed live record\n' >> "$semantic_fixture/demos/workflow-test/REQUIREMENTS.md"
expect_failure "$semantic_fixture" "malformed identifier REQ-01"

for prerequisite in \
  "requirement register" \
  "traceability matrix" \
  "design links and artifact index" \
  "a passing deterministic coverage validator"; do
  handover_fixture="$(make_fixture)"
  plan="$handover_fixture/demos/paypal-retail-demo/IMPLEMENTATION_PLAN.md"
  awk -v needle="$prerequisite" '
    /^The named Workflow Authority Handover Gate passes only/ {
      sub(needle, needle "-missing")
    }
    { print }
  ' "$plan" > "$plan.tmp"
  mv "$plan.tmp" "$plan"
  expect_failure "$handover_fixture" "Missing required PayPal handover gate"
  rm -rf "$handover_fixture"
  handover_fixture=""
done

echo "Agent system regression tests passed."
