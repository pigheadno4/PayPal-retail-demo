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

The seed runner covers storefront/reference data plus guarded buyer/account/order scenarios in the private `app` schema and Supabase Auth tables. It includes deterministic demo users, addresses, saved payment placeholders, pending orders, completed orders, reviews, lifecycle events, and sanitized PayPal/webhook snapshots.

Do not commit Supabase service role credentials, database passwords, or project secrets.
