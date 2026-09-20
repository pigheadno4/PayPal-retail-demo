# AI Service Subscription Pilot Component Contracts

## Foundation

Vite, React, and shadcn/ui are preferred for the web experience. shadcn/ui is a primitive foundation rather than the visual identity. The component route below is approved design intent, but no component, package, or runtime dependency is authorized for installation during discovery.

## Shared Foundation

| Surface | Approved component route | Owning role |
| ------- | ------------------------ | ----------- |
| Authentication and account | `Field`, `InputOTP`, `Input`, `Button`, `AlertDialog` | labelled controls, email-code entry, validation, explicit actions, and guarded confirmation |
| Simulated AI workspace | `Typeset`, Message, Bubble, Attachment, Marker, Message Scroller, Toast, Spinner, and restrained Shimmer | streamed markdown and structured results, persistent conversation content, attachments, live-edge behavior, transient task feedback, and active processing |
| Plans, credits, and payment state | `Alert`, `Progress`, `Item`, `Empty`, `Card`, `Tabs`, `RadioGroup`, `Select`, and `Badge` | persistent recovery and warning state, measurable allowance, content/action rows, absent-data state, plan and method selection, and concise status |
| Progressive disclosure | desktop `Sheet`, mobile `Drawer`, `Collapsible`, `Dialog`, `Table`, and `Separator` | merchant explanation, mobile-equivalent detail, raw evidence expansion, focused tasks, readable comparison, and structural grouping |

These primitives are shared vocabulary, not permission to create one universal component for every domain surface.

## Ownership Boundaries

| Pair | Contract |
| ---- | -------- |
| Toast and Alert | Toast is transient task feedback. Alert persists for recovery, low allowance, tax assumptions, or payment problems. |
| Progress and Spinner or Shimmer | Progress requires a real measurable value. Spinner or Shimmer represents active work when completion is not measurable. |
| Sheet and Drawer | Sheet is the desktop side-panel treatment. Drawer is the touch-oriented mobile treatment for the same content contract. |
| Item and Field | Item presents content and actions such as a saved method or billing event. Field composes a label, control, help text, and validation. |
| Message Scroller and Scroll Area | Message Scroller owns chat anchoring and `Jump to latest`. Scroll Area is limited to bounded non-chat lists and panels. |
| Table and Data Table | Table handles readable static comparison. A surface-specific Data Table is justified only by sorting, filtering, pagination, selection, or column controls. |

## Surface-Specific Components

- Integration Lab scenario runs and administrator accounts may each compose their own TanStack-powered Data Table from shadcn Table primitives. They cannot share one overloaded global table contract.
- `Command` or `Combobox` may replace `Select` only when scenario volume or search needs justify it.
- `Accordion` may group longer capability explanations.
- `Popover` and `Tooltip` may explain optional terms but cannot hide required payment, eligibility, or recovery meaning.
- `Resizable` may support desktop matched comparison only after that layout proves clearer than a fixed split; mobile remains stacked or tabbed.
- `Chart` is justified only when a usage time trend communicates more than the authoritative balance and ledger.

## Deferred Components

Carousel, Calendar, Date Picker, Slider, Menubar, Context Menu, and Hover Card have no approved first-web-scope job. Pagination is also deferred until realistic row volume requires it. Deferral is not a permanent prohibition; each addition requires a concrete owning surface and user-state reason.

## Semantic Variants

Variants must communicate action hierarchy, evidence level, capability status, allowance severity, fulfillment state, and provider-owned versus merchant-owned surfaces. Names and exact styling remain subject to representative-state and accessibility proof.

## Size And State Contracts

Implementation-grade loading, disabled, hover, pressed, focus, error, empty, expanded, collapsed, selected, pending, expired, and recovery states remain pending.

The proposed `DESIGN-0156` board supplies the shared visual meaning for default, hover, focus-visible, pressed, disabled, loading, empty, success, warning, error, progress, and expanded or collapsed disclosure states. Visual approval will not replace later semantic shadcn composition, keyboard, focus-management, screen-reader, automated contrast, or hydrated provider-control evidence.

## Domain Components

Potential repeated patterns include Allowance Meter, Credit Pack, Scenario Context, Capability Cell, Evidence Drawer, Process Trace, and Matched Step. Their primitive routes may follow this contract, but names and interfaces remain unapproved until representative surfaces establish genuine repetition.

## Glass Styling Boundary

C3-G uses G1 restrained editorial glass in light mode and G3 aubergine glass in dark mode. Components keep their approved semantic roles regardless of surface opacity.

- navigation, non-critical cards, workspace panels, sheets, drawers, dialogs, and supporting overlays may use standard glass
- prices, balances, warnings, payment and tax evidence, recovery state, forms, tables, identifiers, and provider provenance use strong high-opacity or opaque surfaces
- Toast, Alert, locked, selected, failed, low, and critical meanings cannot depend on blur, transparency, ambient color, or elevation
- unsupported backdrop filtering and reduced transparency fall back to opaque semantic surfaces without layout or behavior changes

## Official PSP Boundary

Provider-controlled components remain isolated from merchant styling. Merchant wrappers may control placement, surrounding explanation, loading, errors, and geometry but cannot imitate or restyle provider internals. Decorative glass and ambient color cannot sit behind provider-controlled components when they reduce official-mark contrast or create the appearance that the provider surface was restyled.

## Approval Record

- Status: component routing and shared visual state meanings approved; implementation semantics and runtime accessibility proof pending
- Approval references:
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-30:shadcn-component-routing
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-30:c3-g-g1-light-g3-dark
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-12:design-readiness-board-visual-approved
