# PayPal Retail Demo

TypeScript scaffold for the POP MART-style PayPal retail demo.

## Status

Current stage: Milestone 16 QA, UX Review, and Demo Polish is mostly complete for buyer-facing POP MART storefront surfaces. The shadcn component foundation, responsive page polish, API-backed PayPal SDK render checks, full cart PayPal sandbox approval/capture, and local test suite are passing. Earlier backlog remains open for M15 Admin Portal, local Supabase migration verification until Docker is available, final media/LQIP assets, generic-profile asset safety, and broader wallet/card sandbox capture coverage.

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
npm run seed:summary
npm run seed:linked
npm run typecheck
npm test
npm run lint
npm run format:check
```

Supabase local database commands require Docker Desktop or another compatible Docker daemon.

For API-backed browser QA, use `http://localhost:5173` rather than `127.0.0.1` unless CORS settings are changed. If the server environment is loaded from `.env`, the verified local server command is:

```bash
node --env-file=.env node_modules/tsx/dist/cli.mjs watch server/src/server.ts
```

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
