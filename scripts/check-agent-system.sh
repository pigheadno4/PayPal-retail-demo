#!/usr/bin/env bash
set -euo pipefail

required_files=(
  "AGENTS.md"
  "CLAUDE.md"
  "KNOWLEDGE_SOURCES.md"
  "demos/AGENTS.md"
  "demos/CLAUDE.md"
  "demos/NEW_DEMO_PROTOCOL.md"
  "demos/_templates/simple-demo/DEMO.md"
  "demos/_templates/simple-demo/tracking/test-cases.md"
  "demos/_templates/standard-demo/AGENTS.md"
  "demos/_templates/standard-demo/CLAUDE.md"
  "demos/_templates/standard-demo/DEMO.md"
  "demos/_templates/standard-demo/REQUIREMENTS.md"
  "demos/_templates/standard-demo/DESIGN.md"
  "demos/_templates/standard-demo/IMPLEMENTATION_PLAN.md"
  "demos/_templates/standard-demo/PLAN.md"
  "demos/_templates/standard-demo/design-system/MASTER.md"
  "demos/_templates/standard-demo/design-system/TYPOGRAPHY.md"
  "demos/_templates/standard-demo/design-system/COMPONENTS.md"
  "demos/_templates/standard-demo/design-system/BOARD.md"
  "demos/_templates/standard-demo/design-system/research/RESEARCH-TEMPLATE.md"
  "demos/_templates/standard-demo/design-system/pages/PAGE-TEMPLATE.md"
  "demos/_templates/standard-demo/mockups/INDEX.md"
  "demos/_templates/standard-demo/slices/SLICE-TEMPLATE.md"
  "demos/_templates/standard-demo/tracking/todos.md"
  "demos/_templates/standard-demo/tracking/progress.md"
  "demos/_templates/standard-demo/tracking/debug.md"
  "demos/_templates/standard-demo/tracking/test-cases.md"
  "demos/_templates/standard-demo/tracking/learnings.md"
  "demos/_templates/complex-demo/AGENTS.md"
  "demos/_templates/complex-demo/CLAUDE.md"
  "demos/_templates/complex-demo/DEMO.md"
  "demos/_templates/complex-demo/REQUIREMENTS.md"
  "demos/_templates/complex-demo/DESIGN.md"
  "demos/_templates/complex-demo/IMPLEMENTATION_PLAN.md"
  "demos/_templates/complex-demo/IMPLEMENTATION_TASKS.md"
  "demos/_templates/complex-demo/PLAN.md"
  "demos/_templates/complex-demo/design-system/MASTER.md"
  "demos/_templates/complex-demo/design-system/TYPOGRAPHY.md"
  "demos/_templates/complex-demo/design-system/COMPONENTS.md"
  "demos/_templates/complex-demo/design-system/BOARD.md"
  "demos/_templates/complex-demo/design-system/research/RESEARCH-TEMPLATE.md"
  "demos/_templates/complex-demo/design-system/pages/PAGE-TEMPLATE.md"
  "demos/_templates/complex-demo/mockups/INDEX.md"
  "demos/_templates/complex-demo/slices/SLICE-TEMPLATE.md"
  "demos/_templates/complex-demo/tracking/todos.md"
  "demos/_templates/complex-demo/tracking/progress.md"
  "demos/_templates/complex-demo/tracking/debug.md"
  "demos/_templates/complex-demo/tracking/test-cases.md"
  "demos/_templates/complex-demo/tracking/learnings.md"
  "learnings/AGENTS.md"
  "learnings/CLAUDE.md"
  "learnings/INDEX.md"
  "learnings/_template.md"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required file: $file" >&2
    exit 1
  fi
done

require_content() {
  local file="$1"
  local content="$2"
  local label="$3"

  if ! grep -Fq "$content" "$file"; then
    echo "Missing required $label in: $file" >&2
    exit 1
  fi
}

grep -q "@AGENTS.md" CLAUDE.md
grep -q "@AGENTS.md" demos/CLAUDE.md
grep -q "@AGENTS.md" learnings/CLAUDE.md
grep -q "Payment Flow Map" demos/_templates/complex-demo/DEMO.md
grep -q "Learning Pool Rules" learnings/AGENTS.md

# Demo templates must declare their complexity level.
grep -q "Complexity: simple" demos/_templates/simple-demo/DEMO.md
grep -q "Complexity: standard" demos/_templates/standard-demo/DEMO.md
grep -q "Complexity: complex" demos/_templates/complex-demo/DEMO.md

# Requirement and design authority must be explicit and consistent.
require_content "AGENTS.md" '`REQUIREMENTS.md` is the only product-requirement authority' "requirement authority"
require_content "demos/AGENTS.md" '`REQUIREMENTS.md` is the only product-requirement authority' "requirement authority"
require_content "demos/_templates/standard-demo/AGENTS.md" 'Product requirements belong only in `REQUIREMENTS.md`' "requirement authority"
require_content "demos/_templates/complex-demo/AGENTS.md" 'Product requirements belong only in `REQUIREMENTS.md`' "requirement authority"
require_content "demos/paypal-retail-demo/AGENTS.md" 'the authority transition is atomic' "PayPal authority transition"

authority_files=(
  "AGENTS.md"
  "demos/AGENTS.md"
  "demos/_templates/standard-demo/AGENTS.md"
  "demos/_templates/complex-demo/AGENTS.md"
  "demos/paypal-retail-demo/AGENTS.md"
)

if grep -Fq 'Feature requirements belong in `DEMO.md`, `DESIGN.md`, and `IMPLEMENTATION_PLAN.md`.' "${authority_files[@]}"; then
  echo "Stale requirement authority language" >&2
  exit 1
fi

for template in standard-demo complex-demo; do
  requirement_file="demos/_templates/$template/REQUIREMENTS.md"
  design_file="demos/_templates/$template/DESIGN.md"
  slice_file="demos/_templates/$template/slices/SLICE-TEMPLATE.md"

  require_content "$requirement_file" "## Identifier Rules" "identifier rules"
  require_content "$requirement_file" "## Requirement Schema" "requirement schema"
  require_content "$requirement_file" "Allowed lifecycle/disposition combinations" "lifecycle/disposition matrix"
  require_content "$requirement_file" "## Transition Rules" "transition rules"
  require_content "$requirement_file" "## Requirement Register" "requirement register"

  require_content "$design_file" "## Taste Brief" "taste brief"
  require_content "$design_file" "## Design Decision Ledger" "design decision ledger"
  require_content "$design_file" "## Artifact Index" "design artifact index"

  require_content "$slice_file" "## Inherited Requirements" "slice requirements"
  require_content "$slice_file" "## Knowledge Evidence" "payment knowledge evidence"
  require_content "$slice_file" "## Reviewer Assignments" "reviewer assignments"
  require_content "$slice_file" "Independent from implementer" "reviewer independence"
  require_content "$slice_file" "## Entry Criteria" "slice entry criteria"
  require_content "$slice_file" "## Exit Criteria" "slice exit criteria"
  require_content "$slice_file" "No unresolved Critical or Important findings remain" "review close gate"
  require_content "$slice_file" "Every Minor finding has an explicit accepted disposition" "Minor finding disposition"
done

# The protocol must distinguish the complete register from active-slice coverage.
require_content "demos/NEW_DEMO_PROTOCOL.md" "full-register disposition gate" "full-register gate"
require_content "demos/NEW_DEMO_PROTOCOL.md" "active-slice coverage gate" "active-slice gate"
require_content "demos/NEW_DEMO_PROTOCOL.md" "strongest suitable model, high effort" "high-judgment model routing"
require_content "demos/NEW_DEMO_PROTOCOL.md" 'design-system/research/YYYY-MM-DD-<topic>.md' "design-research destination"
require_content "demos/NEW_DEMO_PROTOCOL.md" '`mockups/INDEX.md`' "mockup registry destination"

# KNOWLEDGE_SOURCES.md is the sole authority for the machine-specific wiki path.
stale_wiki_path_file="$(
  grep -RIl --include='*.md' -F '/Users/tengtao/Development/wiki-v2' AGENTS.md demos docs scripts 2>/dev/null \
    | head -n 1 || true
)"
if [[ -n "$stale_wiki_path_file" ]]; then
  echo "Hard-coded payment wiki path outside KNOWLEDGE_SOURCES.md: $stale_wiki_path_file" >&2
  exit 1
fi

echo "Agent system structure looks good."
