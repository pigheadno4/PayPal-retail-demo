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
  "demos/_templates/standard-demo/DESIGN.md"
  "demos/_templates/standard-demo/IMPLEMENTATION_PLAN.md"
  "demos/_templates/standard-demo/tracking/todos.md"
  "demos/_templates/standard-demo/tracking/progress.md"
  "demos/_templates/standard-demo/tracking/debug.md"
  "demos/_templates/standard-demo/tracking/test-cases.md"
  "demos/_templates/standard-demo/tracking/learnings.md"
  "demos/_templates/complex-demo/AGENTS.md"
  "demos/_templates/complex-demo/CLAUDE.md"
  "demos/_templates/complex-demo/DEMO.md"
  "demos/_templates/complex-demo/DESIGN.md"
  "demos/_templates/complex-demo/IMPLEMENTATION_PLAN.md"
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

grep -q "@AGENTS.md" CLAUDE.md
grep -q "@AGENTS.md" demos/CLAUDE.md
grep -q "@AGENTS.md" learnings/CLAUDE.md
grep -q "Payment Flow Map" demos/_templates/complex-demo/DEMO.md
grep -q "Learning Pool Rules" learnings/AGENTS.md

# Demo templates must declare their complexity level.
grep -q "Complexity: simple" demos/_templates/simple-demo/DEMO.md
grep -q "Complexity: standard" demos/_templates/standard-demo/DEMO.md
grep -q "Complexity: complex" demos/_templates/complex-demo/DEMO.md

echo "Agent system structure looks good."
