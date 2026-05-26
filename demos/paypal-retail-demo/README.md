# PayPal Retail Demo

TypeScript scaffold for the POP MART-style PayPal retail demo.

## Status

Milestone 1 scaffold is intentionally minimal. Payment, Supabase migrations, seed data, and buyer/admin UI flows are implemented in later milestones from `PLAN.md` and `IMPLEMENTATION_TASKS.md`.

## Local Setup

```bash
npm install
npm run verify
```

## Development Commands

```bash
npm run dev:web
npm run dev:server
npm run db:start
npm run db:reset
npm run db:lint
npm run typecheck
npm test
npm run lint
npm run format:check
```

Supabase local database commands require Docker Desktop or another compatible Docker daemon.

## Environment

Create a local `.env` from `.env.example`. Do not commit real secrets.

Browser-safe values use `VITE_` prefixes. Server-only values include Supabase service credentials and PayPal client secret/webhook IDs.

## Planning Entry Points

- `PLAN.md`: active execution router.
- `IMPLEMENTATION_TASKS.md`: detailed milestone checklist.
- `DEMO.md`: business and payment-flow contract.
- `DESIGN.md`: UX and visual contract.
- `DATA_MODEL.md`: Supabase schema plan.
- `API_CONTRACT.md`: Express and PayPal API contract.
- `ENVIRONMENT.md`: local environment and secret strategy.
- `PAYPAL_EVIDENCE.md`: local PayPal evidence map.
