# AI Service Subscription Pilot Design System

## Linked Decisions And Requirements

The C3-A information architecture, C3-G visual treatment, and shadcn/ui component routing are selected and implement the customer-facing intent of REQ-0001, REQ-0005, and REQ-0026 through REQ-0029. Full visual approval still requires representative desktop and mobile states, accessibility review, reduced-transparency proof, and runtime proof.

## Selected Direction

Use the C3-A AI Atelier Plan Gallery structure with the C3-G surface system:

- customer value and four neutral service tiers appear before payment selection
- warm editorial display typography is paired with highly legible interface text
- PayPal, Stripe, wallets, Link, and other payment routes never appear as tier capabilities
- merchant evidence remains progressively disclosed rather than dominating the customer homepage
- G1 restrained editorial glass is the light theme
- G3 aubergine glass is the dark theme
- both themes express the same semantic hierarchy and preserve high-opacity evidence islands

## Semantic Color

Use shadcn/ui semantic names in components. Do not hard-code light or dark palette values inside page components.

| Semantic token | Light | Dark | Role |
| --- | --- | --- | --- |
| `background` | `#FFF8F1` | `#201A1B` | page canvas |
| `foreground` | `#352623` | `#FFF6EF` | primary text |
| `card` | `#FFFDF9` | `#2A2223` | cards, tables, and panels |
| `card-foreground` | `#352623` | `#FFF6EF` | text on cards |
| `primary` | `#C75B39` | `#F28A66` | primary action and selected control |
| `primary-foreground` | `#FFF8F1` | `#2A1611` | text on primary |
| `secondary` | `#F6E9E1` | `#3A2C2E` | secondary action and grouped region |
| `secondary-foreground` | `#7B3D2D` | `#FFD1C0` | text on secondary |
| `accent` | `#E3A64A` | `#E7B363` | allowance and educational emphasis |
| `accent-foreground` | `#3A260B` | `#2A1C08` | text on accent |
| `muted` | `#F3EAE4` | `#302627` | quiet surfaces |
| `muted-foreground` | `#6F5C55` | `#C9B7AF` | supporting text |
| `border` | `#E3D5CD` | `#4A393B` | structural borders |
| `ring` | `#C75B39` | `#F28A66` | keyboard focus |
| `destructive` | `#B42318` | `#F97066` | destructive or terminal failure |
| `destructive-foreground` | `#FFFFFF` | `#2A1611` | text on destructive |

Color is never the sole indicator of tier eligibility, allowance severity, payment state, or provider evidence. Official provider components and marks retain their provider-controlled branding.

## Glass Surface Contract

Glass is a depth treatment, not an information authority.

| Role | G1 light | G3 dark |
| --- | --- | --- |
| standard glass panel | warm near-white at approximately 82% opacity | aubergine-charcoal at approximately 75% opacity |
| strong reading panel | warm near-white at approximately 94% opacity | aubergine-charcoal at approximately 90% opacity |
| quiet glass region | warm near-white at approximately 68% opacity | aubergine-charcoal at approximately 58% opacity |
| border | high-visibility warm white | low-opacity warm cream |
| backdrop blur | restrained 18px target | restrained 18px target |

Navigation, workspace panels, non-critical cards, drawers, sheets, and overlays may use standard glass. Prices, balances, allowance and credit authority, warnings, payment and tax evidence, recovery actions, forms, tables, identifiers, and provider provenance use strong reading panels or opaque `card` surfaces.

If backdrop filtering is unsupported or transparency is reduced, the same components fall back to opaque semantic `card` and `background` tokens without changing layout, meaning, or interaction. Decorative ambient color cannot appear beneath provider-controlled buttons or reduce the contrast of official marks.

## Spacing And Geometry

Use rounded but restrained geometry: page-section corner radii at 20–24px, card corner radii at 16–18px, compact controls as pills only when their shape communicates selection or status, and a consistent content width. The approved component board establishes these ranges; final runtime values remain subject to representative-screen proof.

## Elevation

Use glass opacity, borders, and small tonal shifts before shadows. Reserve the strongest shadow for the main customer-story frame and overlays; pricing cards, evidence islands, and matrix regions use visible borders without competing elevation.

## Motion

Use 150–300ms color, border, opacity, and disclosure transitions. Active AI processing may use restrained Shimmer or Marker motion; completed content, balances, prices, and payment outcomes remain static. All motion respects reduced-motion preferences.

## Responsive Foundations

Desktop presents four tier cards followed by the grouped comparison table. Narrow screens stack the tier cards and default the detailed comparison to one selected tier through shadcn Tabs or an equivalent accessible plan selector. A secondary `Compare all` view may horizontally scroll inside its bounded table region with the first column retained; the page itself cannot scroll horizontally.

## Accessibility Foundations

Status will not depend on color, blur, or transparency alone. Theme selection must expose an accessible name, support keyboard operation, respect system preference on first visit, and persist an explicit customer choice. Keyboard, focus, labels, errors, contrast, table semantics, reduced-motion behavior, opaque fallbacks, and reduced-transparency behavior require representative-state and runtime verification.

## Approval Record

- Status: selected C3-A structure, C3-G G1/G3 treatment, and component routing; full design gate pending
- Approval references:
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-30:c3-a-plan-gallery-apricot-aubergine
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-30:shadcn-component-routing
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-30:c3-g-g1-light-g3-dark
