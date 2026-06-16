# {{DEMO_NAME}} Design

## UX Goal
{{UX_GOAL}}

## Main Screens
{{MAIN_SCREENS}}

## Interaction Model
{{INTERACTION_MODEL}}

## UX State Contracts And Mockups

Required for multi-step UI, payment flows, cart/minicart interactions, account flows, admin lifecycle flows, or PSP SDK surface placement.

Capture:

- initial state
- allowed transitions
- loading, success, failure, retry, blocked, and ineligible states
- expanded versus collapsed sections
- edit behavior
- backend or SDK unavailable behavior
- mobile sticky or responsive behavior when applicable

Use virtual mockups during planning when the interaction is easier to understand visually. Keep mockups aligned with `IMPLEMENTATION_PLAN.md` and `tracking/test-cases.md`.

## UI/UX Implementation Guide

Use this section as the frontend source of truth before coding customer-facing or sales-facing UI.

### Design Tokens

Define colors, typography, spacing, radius, shadows, motion, and responsive breakpoints. Include what each token is for, not only the raw value.

### Component Contracts

Define expected behavior and states for shared components such as buttons, cards, forms, modals, tabs, accordions, tables, payment surfaces, loading states, empty states, and errors.

### Page-Level Implementation Specs

For each main screen, define the layout, content hierarchy, primary/secondary actions, loading state, empty state, error state, mobile behavior, and accessibility expectations.

### UX Flow Contracts

For each multi-step flow, define the entry point, allowed transitions, blocked states, save/edit behavior, async behavior, completion state, and evidence required before the flow can be marked complete.

### Frontend Close Gate

A frontend slice is not complete until the touched page matches these design specs and has tracking/test-case coverage for visual state, interaction state, async loading/error state, and responsive behavior.

## Visual Direction
{{VISUAL_DIRECTION}}

## Architecture
{{ARCHITECTURE}}

## Platform Experience
- Web: {{WEB_EXPERIENCE}}
- Backend: {{BACKEND_EXPERIENCE}}
- Database: {{DATABASE_EXPERIENCE}}
- iOS: {{IOS_EXPERIENCE}}
- Android: {{ANDROID_EXPERIENCE}}

## Open Decisions
Decisions should be resolved before implementation starts.
