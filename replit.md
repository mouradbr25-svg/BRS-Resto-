# BRS Resto

A high-end Restaurant Management SaaS (POS & CRM) tailored for the Algerian market — covering operational efficiency, inventory precision, and gamified customer loyalty.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/brs-resto run dev` — run the frontend (port 19129)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`

## Default Credentials

- **Owner**: `Mouradx` / `BRSRESTOx025` (full access to all pages)
- **Receptionist**: `receptionist` / `admin123` (orders, tables, menu, customers only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + TanStack Query + Recharts
- API: Express 5 + express-session
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (users, tables, categories, menuItems, ingredients, customers, orders, quiz)
- `artifacts/api-server/src/routes/` — Express route handlers (auth, tables, categories, menuItems, ingredients, customers, orders, quiz, analytics)
- `artifacts/brs-resto/src/` — React frontend (pages per route, shadcn UI, Recharts)

## Architecture decisions

- Contract-first: OpenAPI spec → Orval codegen → typed React Query hooks (frontend) + Zod schemas (backend)
- Session-based auth (express-session) with role-based access (owner vs receptionist)
- All monetary values in DZD (Algerian Dinar) formatted throughout UI
- Loyalty quiz: 40% discount for first-time visitors; score + order value formula for returning customers
- Ingredients trigger low-stock alert below 50% of maxStock; Saturday refill routine restores to maximum

## Product

- **Owner Dashboard**: Revenue metrics (today/week/month in DZD), active orders, low-stock alerts, top menu items, orders by status
- **Live Orders Board**: Create/manage orders by table, track status (pending → preparing → served → completed)
- **Table Management**: 8 tables with QR codes, real-time availability status
- **Menu Management**: 7 categories, 17 items in French/Arabic with pricing in DZD
- **Inventory**: 18 ingredients with stock level tracking, low-stock highlighting, weekly refill action
- **Customer CRM**: Loyalty tiers (bronze/silver/gold), total spend tracking, first-visit detection
- **Gamified Quiz**: 5 Algerian culture questions; results compute tiered discounts post-order
- **Analytics**: Revenue charts (day/week/month), top items, order status breakdown

## User preferences

- All amounts displayed in DZD (Algerian Dinar)
- No emojis in the UI
- Dual-access system: Owner (full control) vs Receptionist (operational only)

## Gotchas

- Routes must be exact — Express 5 uses `/{*splat}` not `*` for wildcards
- `ingredients/low-stock` and `ingredients/refill` routes must be registered BEFORE `/:id` routes
- `orders/active` route must be registered BEFORE `/:id` routes
- `customers/top` route must be registered BEFORE `/:id` routes
- After any OpenAPI spec change, always run codegen before using updated types

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
