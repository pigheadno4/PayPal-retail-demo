# AI Service Subscription Pilot Typography

## Linked Decisions And Requirements

Typography supports the warm AI-service narrative and optional technical layer. The selected C3-A direction uses Fraunces for restrained editorial display text and Source Sans 3 for interface, commerce, usage, account, and evidence content. Runtime proof remains pending.

## Font Sources And Licenses

| Role | Family | File/source | License | Weights | Fallback |
| ---- | ------ | ----------- | ------- | ------- | -------- |
| Display headings | Fraunces | Google Fonts during design; self-hosted web font before production | SIL OFL 1.1; verify at asset intake | 600, 700 | Georgia, serif |
| Interface and body | Source Sans 3 | Google Fonts during design; self-hosted web font before production | SIL OFL 1.1; verify at asset intake | 400, 500, 600, 700 | system-ui, sans-serif |

## Type Scale

The initial responsive scale is:

- homepage display: 49/50 desktop, 38/40 narrow
- section title: 27/32 desktop, 24/29 narrow
- card title: 19/24
- body: 16/25
- interface and table: 12–14 with at least 1.4 line height
- metadata and uppercase labels: 10–11 with increased letter spacing

The component board must verify that long provider constraints, currency values, allowance figures, and narrow comparison cells remain readable before these values become implementation authority.

## Real-Content Comparison

Must include pricing, allowance figures, payment rows, evidence statuses, long provider constraints, matrix cells, technical traces, errors, and narrow mobile content.

## Loading Contract

Prefer self-hosted WOFF2 files with only approved weights, `font-display: swap`, and metric-compatible fallbacks where practical. The page cannot delay authentication, checkout, usage, or evidence controls until font loading completes.

## Runtime Verification

- `document.fonts` evidence: pending
- Computed-family/weight evidence: pending
- Layout-shift evidence: pending

The proposed `DESIGN-0156` proof board adds an explicit browser-local font-presence report and compares selected versus fallback roles with real product content. That report is diagnostic design evidence only: the runtime gate still requires committed self-hosted assets, license intake, computed-family and weight capture, `font-display` behavior, and layout-shift measurement.

## Approval Record

- Status: family roles, scale, real-content wrapping, and fallback hierarchy visually approved; local asset and runtime proof pending
- Approval references:
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-30:c3-a-plan-gallery-apricot-aubergine
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-12:design-readiness-board-visual-approved
