# Splitwise Pro

A private, mobile-first expense-sharing PWA for a fixed group of friends. See `docs/` for the full product specification (PRD, architecture, database schema, API design, business logic, security, testing, and UI/UX documents).

## Status

Foundation phase only: project scaffold, tooling, and a health-check wired between the client and server. No database, business logic, or product UI has been implemented yet.

## Project structure

```text
client/       React + Vite + TypeScript PWA frontend
server/       Node.js + Express + TypeScript REST API
database/     Migrations and seed data (added in a later phase)
tests/        Cross-cutting unit/API/e2e test suites (added in a later phase)
docs/         Product specification documents (source of truth)
```

`client` and `server` are independently deployable npm workspaces sharing one root install.

## Prerequisites

- Node.js >= 20
- npm >= 10

## Setup

```bash
npm install
cp client/.env.example client/.env
cp server/.env.example server/.env
```

## Development

```bash
npm run dev:server   # starts the Express API on http://localhost:4000
npm run dev:client    # starts the Vite dev server on http://localhost:5173
```

With both running, the client's home screen reports the backend connection status by calling `GET /api/health`.

## Verification

Run from the repo root (applies to both workspaces):

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run format:check
```

## Environment variables

See `client/.env.example` and `server/.env.example` for the full list. Real secrets (admin password hash, Supabase credentials, database URL) must never be committed — only placeholders belong in the `*.env.example` files.

## Deployment (planned)

The Express server is written as a conventional app (`server/src/index.ts` calling `app.listen`), which Vercel can deploy with zero configuration. The current plan is two independent Vercel projects against this repo — one rooted at `client/`, one rooted at `server/` — unless investigation at deploy time shows a simpler option. Nothing is deployed yet.
