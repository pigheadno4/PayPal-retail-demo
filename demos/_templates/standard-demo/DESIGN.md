# {{DEMO_NAME}} Design

This file routes design authority. Detailed tokens, typography, components, pages, research, mockups, and states live in the linked canonical artifacts.

## Taste Brief

- Audience: {{PRIMARY_AUDIENCE}}
- Product personality: {{PRODUCT_PERSONALITY}}
- Density: {{DENSITY}}
- Typography goals: {{TYPOGRAPHY_GOALS}}
- Imagery direction: {{IMAGERY_DIRECTION}}
- References: {{REFERENCES}}
- Explicit reject list: {{REJECT_LIST}}

## Approved Direction

{{APPROVED_VISUAL_DIRECTION}}

## Design Decision Ledger

Design IDs use `DESIGN-0001` through `DESIGN-9999`, are permanent, and are never reused.

| ID  | Decision | Status | Requirement links | Artifact links | Approval reference |
| --- | -------- | ------ | ----------------- | -------------- | ------------------ |

`ID` is the only ledger key. Use one exact `DESIGN-NNNN` per non-empty row; identifiers in other columns do not create decisions, and duplicate keys are invalid. Statuses are `proposed`, `approved`, `rejected`, and `superseded`. Historical decisions remain in the ledger, but only `approved` decisions with concrete artifact links, at least one reciprocal requirement link, and a durable `user:<task-or-thread-id>:<YYYY-MM-DD>:<decision-locator>` approval reference may be linked by active requirements, slice charters, or execution records. A slice linking one of these decisions requires a concrete design-fidelity reviewer and an approved design decision before closure.

## Artifact Index

- Master system: `design-system/MASTER.md`
- Typography: `design-system/TYPOGRAPHY.md`
- Components: `design-system/COMPONENTS.md`
- Component board: `design-system/BOARD.md`
- Research records: `design-system/research/`
- Page contracts: `design-system/pages/`
- Mockup and state-board registry: `mockups/INDEX.md`

## Main Screens

{{MAIN_SCREENS_AND_PAGE_CONTRACT_LINKS}}

## UX Flow Links

{{FLOW_AND_SLICE_LINKS}}

## Design Approval Record

- Component board: pending
- Typography proof: pending
- Representative desktop surfaces: pending
- Representative mobile surfaces: pending
- Required interaction states: pending
- User approval reference: none

Frontend planning remains blocked while an applicable approval is pending. Approved decisions require concrete decision text, at least one reciprocal requirement, and existing local or HTTPS artifacts. Every Artifact Index and Design Approval Record proof field resolves to an existing local or HTTPS artifact, and its user approval reference is durable before design-linked execution starts.
