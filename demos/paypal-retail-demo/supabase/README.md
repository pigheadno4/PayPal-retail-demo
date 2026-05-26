# Supabase

This folder holds local Supabase config, migrations, and seed tooling.

## Commands

Run from `demos/paypal-retail-demo`:

```bash
npm run db:start
npm run db:reset
npm run db:lint
npm run seed:summary
npm run seed:linked
```

Local Supabase commands require Docker Desktop or another compatible Docker daemon.

## Current Status

The initial private `app` schema migration has been drafted and applied to the linked remote Supabase project. Local apply verification is blocked until Docker is available.

The first seed runner slice covers storefront/reference data in the private `app` schema. Auth users, account addresses, saved payments, reviews, and sample orders remain a later guarded seed slice.

Do not commit Supabase service role credentials, database passwords, or project secrets.
