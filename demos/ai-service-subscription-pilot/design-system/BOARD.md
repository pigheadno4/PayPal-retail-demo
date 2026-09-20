# AI Service Subscription Pilot Design-System Board

## Purpose

This will become the implementation baseline for shared tokens, typography, primitives, domain components, and states.

## Required Board Surfaces

- merchant story and technical-detail hierarchy
- typography with real pricing, allowance, evidence, and provider content
- buttons, fields, tabs, disclosures, drawers, matrices, timelines, status treatments, and warning messages
- loading, empty, error, disabled, selected, expanded, collapsed, hover, pressed, and focus-visible states
- mobile and desktop geometry
- official PSP wrapper geometry without provider-internal styling

## Implementation Route

UI/UX Pro Max retrieval, C3-A information-architecture selection, C3-G visual-treatment selection, the shared component board, and the shadcn/ui component-routing map are complete. Build future representative surfaces from the C3-A Plan Gallery structure; the selected G1 restrained-glass light theme and G3 aubergine-glass dark theme; Fraunces display family; Source Sans 3 interface family; and the ownership rules in `COMPONENTS.md`.

Component routing approval does not approve package installation or runtime implementation. Implementation-grade state, responsive, accessibility, and runtime proof remain pending.

## Evidence

- C3-A shared component board reviewed in the visual companion on 2026-07-30
- C3-G G1, G2, and G3 AI-workspace treatments compared with G1 light and G3 dark selected on 2026-07-30
- shadcn/ui component-routing map reviewed at desktop and mobile widths with no page-level horizontal overflow
- routing separates shared foundation, surface-specific additions, explicit ownership boundaries, and deliberately deferred components
- the C3-G study verified the active Plus document-analysis composition at desktop and narrow mobile widths, but remains discovery evidence rather than a durable implementation-grade screen artifact; representative screens must still be registered in `mockups/INDEX.md`
- proposed `DESIGN-0156` consolidates the remaining visual contract into Typography proof, Component states, and Accessibility contract; it explicitly separates visually reviewable behavior from font, framework, browser, assistive-technology, and PSP runtime evidence

## Proposed Readiness Proof Board

`mockups/design-readiness-typography-components-accessibility.html` provides one bounded review surface rather than another customer page:

- real subscription, allowance, payment, evidence, and mobile copy exercises selected and fallback typography roles
- the browser reports whether locally available Fraunces and Source Sans 3 sources are detected, so fallback rendering cannot be mistaken for closed font proof
- component examples distinguish default, hover, focus-visible, pressed, disabled, loading, empty, success, warning, error, progress, disclosure, and provider-owned boundaries
- accessibility examples expose keyboard order, a focus treatment independent from selection and error, 44-pixel mobile targets, text-plus-icon status, light and dark themes, reduced motion, and opaque fallback
- the final boundary lists the required runtime evidence that this static design artifact cannot satisfy

Direction and responsive visual treatment are approved under `DESIGN-0156`. Runtime semantic, accessibility, font-loading, and provider-hydration evidence remains pending.

## Approval Record

- Status: C3-A structure, C3-G G1/G3 treatment, component routing, shared visual states, and responsive accessibility contract approved; runtime evidence pending
- Approval references:
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-30:c3-a-plan-gallery-apricot-aubergine
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-30:shadcn-component-routing
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-07-30:c3-g-g1-light-g3-dark
  - user:019f7869-8cff-70e2-9bf1-9307a514e970:2026-08-12:design-readiness-board-visual-approved
