# NOVA Commerce

Production-minded commerce platform built as a pnpm monorepo with a responsive Next.js storefront and a modular NestJS API.

## Current status

NOVA Commerce currently includes the foundation and commerce flows delivered through Milestone 8:

- Authentication, authorization, customer profiles, and address management.
- Product catalog with categories, brands, variants, discovery, search, and wishlists.
- Cart management, inventory reservations, shipping selection, and checkout review.
- Payment and checkout foundations with order creation and lifecycle handling.
- Customer order history, order details, cancellation, returns, and invoice routes.
- Admin order, refund, and return views.
- Redis/BullMQ-backed background processing and Prisma/PostgreSQL persistence.
- A responsive, animated storefront homepage with collections, product filters, favorites, bag interactions, and accessible reduced-motion behavior.

The homepage visual system is implemented with deterministic React and CSS—no runtime AI-generated content is used.

## Technology

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS, Zustand, and Lucide icons.
- **Backend:** NestJS, Prisma ORM, PostgreSQL, Redis, and BullMQ.
- **Tooling:** pnpm workspaces, Turborepo, ESLint, Prettier, Docker Compose, and Vercel configuration.

## Quick start

### Prerequisites

- Node.js 22+
- pnpm 10+
- Docker Desktop

### Local setup

1. Start PostgreSQL and Redis:

   ```bash
   docker compose up -d
   ```

2. Copy `apps/api/.env.example` to `apps/api/.env` and configure local credentials.

3. Install dependencies and prepare the database:

   ```bash
   pnpm install
   pnpm db:generate
   pnpm db:migrate
   ```

4. Start the web and API applications:

   ```bash
   pnpm dev
   ```

The storefront runs at `http://localhost:3000`. The API health endpoint is available at `http://localhost:4000/api/v1/health`.

## Workspace layout

```text
NOVA-Commerce/
├── apps/
│   ├── api/       # NestJS modules, Prisma schema, queues, and API services
│   └── web/       # Next.js storefront, account, checkout, and order routes
├── docs/          # Architecture, milestone audits, and QA reports
├── tools/         # Smoke tests and QA helpers
└── docker-compose.yml
```

## Core architecture

- Domain modules own their controllers, services, DTOs, and policies.
- Prisma is the database boundary, with schema changes tracked through migrations.
- PostgreSQL remains the source of truth; Redis supports queues and ephemeral state.
- API controllers use a consistent response envelope and centralized exception handling.
- Environment configuration is validated during application startup.
- Access tokens, refresh-token rotation, guards, and role-based authorization protect customer and admin flows.

## Useful commands

```bash
pnpm dev
pnpm lint
pnpm typecheck
pnpm build
pnpm db:generate
pnpm db:migrate
pnpm --filter @nova/api prisma:deploy
```

## Validation and reports

Milestone audit and QA reports are maintained in [`docs`](./docs). Existing smoke-test helpers are available under [`tools`](./tools).

Before merging changes, run:

```bash
pnpm lint
pnpm typecheck
pnpm build
```
