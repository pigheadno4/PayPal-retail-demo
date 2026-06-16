# {{DEMO_NAME}} Design

## UX Goal
{{UX_GOAL}}

## Main Screens
{{MAIN_SCREENS}}

## Interaction Model
{{INTERACTION_MODEL}}

## UX State Contracts And Mockups

For multi-step UI or PSP SDK placement, define the expected states before coding: initial, loading, success, failure, retry, blocked, and completion states.

Use virtual mockups when the interaction is easier to validate visually, and keep them aligned with tests.

## UI/UX Implementation Guide

Use this section as the frontend source of truth before coding customer-facing or sales-facing UI.

- Design tokens: colors, typography, spacing, radius, motion, and responsive breakpoints.
- Component contracts: buttons, cards, forms, modals, payment surfaces, loading, empty, and error states.
- Page-level implementation specs: layout, content hierarchy, actions, states, mobile behavior, and accessibility for each main screen.
- UX flow contracts: entry point, transitions, blocked states, async behavior, completion state, and evidence required before completion.

A frontend slice is not complete until the touched UI matches this guide and has test or manual evidence for visual, interaction, async, and responsive behavior.

## Visual Direction
{{VISUAL_DIRECTION}}

## Architecture
{{ARCHITECTURE}}

## Open Decisions
Decisions should be resolved before implementation starts.
