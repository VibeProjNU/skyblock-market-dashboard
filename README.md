# SkyBlock Market Dashboard

A local Next.js dashboard for exploring live Hypixel SkyBlock Bazaar data from the official Hypixel Public API.

V1 focuses on Bazaar products only. It includes an order-flip dashboard, Supabase-backed snapshot storage, and an Investment History page that reads real saved Bazaar snapshots.

## Features

- Live Bazaar dashboard using the official Hypixel Public API
- Buy order to sell offer spread, margin, liquidity, fill confidence, and flip score calculations
- Search, sortable columns, margin range, spread, volume, and order-count filters
- Refresh button that fetches fresh Bazaar data and saves a snapshot to Supabase
- Investment History page powered by saved `bazaar_snapshots` rows

## Environment

Copy `.env.example` to `.env.local` and fill in:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SNAPSHOT_ADMIN_SECRET`

Never commit `.env.local`.
