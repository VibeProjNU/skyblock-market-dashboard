# SkyBlock Market Dashboard

A local Next.js dashboard for exploring live Hypixel SkyBlock Bazaar data from the official Hypixel Public API.

V1 focuses on Bazaar products only. It includes an order-flip dashboard, Supabase-backed snapshot storage, and an Investment History page that reads real saved Bazaar snapshots.

## Features

- Live Bazaar dashboard using the official Hypixel Public API
- Buy order to sell offer spread, margin, liquidity, fill confidence, and flip score calculations
- Search, sortable columns, margin range, spread, volume, and order-count filters
- Refresh button that fetches fresh Bazaar data and saves a snapshot to Supabase
- Investment History page powered by saved `bazaar_snapshots` rows
- Daily server-side snapshot collection via Vercel Cron
- 24h, 7d, 28d, and 30d saved-price averages

## Environment

Copy `.env.example` to `.env.local` and fill in:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY`
- `SNAPSHOT_ADMIN_SECRET`
- `CRON_SECRET`

Never commit `.env.local`.

`SUPABASE_SERVICE_ROLE_KEY` is also supported for older local setups, but
`SUPABASE_SECRET_KEY` is the preferred name for new deployments.

## Daily Snapshots

`vercel.json` schedules `/api/snapshots/collect` once per day. In Vercel,
set `CRON_SECRET` as a private environment variable so the cron request can
write snapshots securely. Local development can still use the manual snapshot
route, but true automatic daily collection requires a hosted server.
