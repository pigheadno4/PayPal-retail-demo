# Supabase

This folder holds local Supabase config, migrations, and seed tooling.

## Commands

Run from `demos/paypal-retail-demo`:

```bash
npm run db:start
npm run db:reset
npm run db:lint
```

Local Supabase commands require Docker Desktop or another compatible Docker daemon.

## Current Status

The initial private `app` schema migration has been drafted. Local apply verification is blocked until Docker is available.

Do not commit Supabase service role credentials, database passwords, or project secrets.
