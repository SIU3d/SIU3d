# Infinity Warranty (EverLock) MVP

This repository contains a lightweight MVP for the **Infinity Warranty** concept (code name: **EverLock**). It includes:

- **Backend (Node.js + TypeScript + Express)** with in-memory data models for users, trust fund accounts, product ownership, and upgrade simulations.
- **Frontend (Next.js + Tailwind CSS)** showing dashboards for trust fund growth, product ownership, and upgrade simulations.
- **Solidity scaffold** for a future `InfinityWarranty` smart contract that can anchor upgrade rights on-chain.

## Project Structure

- `backend/` – Express API in TypeScript, using simple in-memory storage and JWT auth.
- `frontend/` – Next.js UI with Tailwind components wired to the REST API.
- `contracts/` – `InfinityWarranty.sol` smart contract stub.

## Backend

### Key features
- Auth endpoints (`/api/auth/register`, `/api/auth/login`) issuing JWT tokens.
- Trust fund endpoints (`/api/trust-fund/me`, `/api/trust-fund/deposit`, `/api/trust-fund/apply-yield`).
- Product endpoints (`/api/products`, `/api/products/owned`, `/api/products/register`).
- Upgrade simulator (`/api/upgrades/simulate`).
- Seeded product catalog (console + phone generations) and Infinity Warranty logic using upgrade rights and recovery value calculations.

### Running the API
1. Install dependencies inside `backend/`:
   ```bash
   npm install
   ```
2. Start the dev server:
   ```bash
   npm run dev
   ```
3. The API listens on `http://localhost:4000` by default. Set `JWT_SECRET` to override the default token secret.

## Frontend

### Key pages
- **Dashboard** – Auth panel, trust fund snapshot, and owned products summary.
- **Trust Fund** – Deposit simulator and yield application.
- **Products** – Seeded catalog with ownership registration.
- **Upgrade Simulator** – Choose an owned product and target generation to view upgrade fee math and trust fund impact.

### Running the UI
1. Install dependencies inside `frontend/`:
   ```bash
   npm install
   ```
2. Start Next.js in dev mode:
   ```bash
   npm run dev
   ```
3. Configure the API base via `NEXT_PUBLIC_BACKEND_URL` (defaults to `http://localhost:4000`).

## Smart Contract Scaffold
- `contracts/InfinityWarranty.sol` holds upgrade rights per user/product line and exposes fee calculation helpers for future backend integration.

## Notes
- Data is stored in-memory for the MVP; swap the store out for Prisma/PostgreSQL in a future iteration.
- The trust fund logic simulates compound growth based on elapsed time and a default 5% annual yield.

## Running on OneCompiler
If you want to demo the backend quickly inside a single online sandbox like [OneCompiler](https://onecompiler.com/), you can run just the Express API:

1. Open a new **Node.js** project in OneCompiler and create the following files/directories:
   - `backend/package.json`
   - `backend/tsconfig.json`
   - `backend/src/` (copy the TypeScript files from this repository)
2. In the OneCompiler shell, install dependencies:
   ```bash
   cd backend
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Use the built-in console to hit endpoints (e.g., with `curl`) at `http://localhost:4000/api/...`.

> Note: The Next.js frontend is not recommended for OneCompiler because of its multi-process dev server; for a quick demo, run only the backend there and interact via REST calls.
