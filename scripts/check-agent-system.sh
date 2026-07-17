#!/usr/bin/env bash
set -euo pipefail

required_files=(
  "AGENTS.md"
  "CLAUDE.md"
  "KNOWLEDGE_SOURCES.md"
  "demos/AGENTS.md"
  "demos/CLAUDE.md"
  "demos/NEW_DEMO_PROTOCOL.md"
  "demos/paypal-retail-demo/AGENTS.md"
  "demos/paypal-retail-demo/IMPLEMENTATION_PLAN.md"
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
  "demos/_templates/standard-demo/tracking/evidence.md"
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
  "demos/_templates/complex-demo/tracking/evidence.md"
  "demos/_templates/complex-demo/tracking/learnings.md"
  "learnings/AGENTS.md"
  "learnings/CLAUDE.md"
  "learnings/INDEX.md"
  "learnings/_template.md"
  "scripts/validate-demo-workflow.mjs"
  "scripts/tests/validate-demo-workflow.test.mjs"
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

paypal_handover_gate="The named Workflow Authority Handover Gate passes only when the user approves the requirement register, traceability matrix, design links and artifact index, and a passing deterministic coverage validator together."
require_content "demos/paypal-retail-demo/AGENTS.md" "$paypal_handover_gate" "PayPal handover gate"
require_content "demos/paypal-retail-demo/IMPLEMENTATION_PLAN.md" "$paypal_handover_gate" "PayPal handover gate"

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
  evidence_file="demos/_templates/$template/tracking/evidence.md"

  require_content "$requirement_file" "## Identifier Rules" "identifier rules"
  require_content "$requirement_file" "## Requirement Schema" "requirement schema"
  require_content "$requirement_file" "Allowed lifecycle/disposition combinations" "lifecycle/disposition matrix"
  require_content "$requirement_file" "## Transition Rules" "transition rules"
  require_content "$requirement_file" "## Requirement Register" "requirement register"
  require_content "$requirement_file" '`removal_reason`' "removal reason field"

  require_content "$design_file" "## Taste Brief" "taste brief"
  require_content "$design_file" "## Design Decision Ledger" "design decision ledger"
  require_content "$design_file" "## Artifact Index" "design artifact index"

  require_content "$slice_file" "## Inherited Requirements" "slice requirements"
  require_content "$slice_file" "## Knowledge Evidence" "payment knowledge evidence"
  require_content "$slice_file" "## Reviewer Assignments" "reviewer assignments"
  require_content "$slice_file" "Independent from implementer" "reviewer independence"
  require_content "$slice_file" "Payment-domain sub-review required" "payment sub-review applicability"
  require_content "$slice_file" "Payment-domain engineering sub-review" "payment sub-review assignment"
  require_content "$slice_file" "## Entry Criteria" "slice entry criteria"
  require_content "$slice_file" "## Exit Criteria" "slice exit criteria"
  require_content "$slice_file" "No unresolved Critical or Important findings remain" "review close gate"
  require_content "$slice_file" "Every Minor finding has an explicit accepted disposition" "Minor finding disposition"

  require_content "$evidence_file" "## Evidence Record Template" "evidence record schema"
  require_content "$evidence_file" "## Evidence Index" "evidence index"
  require_content "$evidence_file" "EVID-0001" "evidence identifier"
done

require_content "demos/_templates/standard-demo/IMPLEMENTATION_PLAN.md" "## Task Record Template" "standard task record schema"
require_content "demos/_templates/standard-demo/IMPLEMENTATION_PLAN.md" "TASK-0001" "standard task identifier"
require_content "demos/_templates/complex-demo/IMPLEMENTATION_TASKS.md" "## Task Template" "complex task record schema"

# The protocol must distinguish the complete register from active-slice coverage.
require_content "demos/NEW_DEMO_PROTOCOL.md" "full-register disposition gate" "full-register gate"
require_content "demos/NEW_DEMO_PROTOCOL.md" "active-slice coverage gate" "active-slice gate"
require_content "demos/NEW_DEMO_PROTOCOL.md" "strongest suitable model, high effort" "high-judgment model routing"
require_content "demos/NEW_DEMO_PROTOCOL.md" 'design-system/research/YYYY-MM-DD-<topic>.md' "design-research destination"
require_content "demos/NEW_DEMO_PROTOCOL.md" '`mockups/INDEX.md`' "mockup registry destination"

# KNOWLEDGE_SOURCES.md is the sole authority for the machine-specific wiki path.
payment_wiki_path="$(sed -n 's/^- Path: `\([^`]*\)`.*/\1/p' KNOWLEDGE_SOURCES.md | head -n 1)"
if [[ -z "$payment_wiki_path" ]]; then
  echo "Missing payment wiki path in KNOWLEDGE_SOURCES.md" >&2
  exit 1
fi

markdown_files() {
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git ls-files -- '*.md'
  else
    find . -type f -name '*.md' -not -path './.git/*' -not -path './node_modules/*'
  fi
}

stale_wiki_path_file=""
while IFS= read -r markdown_file; do
  case "$markdown_file" in
    "KNOWLEDGE_SOURCES.md" | "./KNOWLEDGE_SOURCES.md") continue ;;
  esac
  if grep -Fq "$payment_wiki_path" "$markdown_file"; then
    stale_wiki_path_file="$markdown_file"
    break
  fi
done < <(markdown_files)

if [[ -n "$stale_wiki_path_file" ]]; then
  echo "Hard-coded payment wiki path outside KNOWLEDGE_SOURCES.md: $stale_wiki_path_file" >&2
  exit 1
fi

# Exercise the semantic validator and then apply it to each materialized demo
# that has adopted the new REQUIREMENTS.md authority.
node --test scripts/tests/validate-demo-workflow.test.mjs >/dev/null
while IFS= read -r requirement_file; do
  demo_dir="${requirement_file%/REQUIREMENTS.md}"
  node scripts/validate-demo-workflow.mjs "$demo_dir"
done < <(find demos -mindepth 2 -maxdepth 2 -type f -name 'REQUIREMENTS.md' -print)

echo "Agent system structure looks good."
