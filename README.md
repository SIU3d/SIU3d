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
- Upgrade simulator (`/api/upgrades/simulate`) and executable upgrade flow (`/api/upgrades/execute`) that can draw down the trust fund.
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
3. Configure the API base via `NEXT_PUBLIC_BACKEND_URL` (defaults to `http://localhost:4000`). In production, always set this to the public backend URL so the frontend calls the correct host.

## Smart Contract Scaffold
- `contracts/InfinityWarranty.sol` holds upgrade rights per user/product line and exposes fee calculation helpers for future backend integration.

## Notes
- Data is stored in-memory for the MVP; swap the store out for Prisma/PostgreSQL in a future iteration.
- The trust fund logic simulates compound growth based on elapsed time and a default 5% annual yield.

## Deploying on Railway

This repo is structured as a monorepo with separate backend and frontend services. A `railway.json` file is included so you can provision two services directly from the repo:

- **backend** – builds and starts the Express API from `backend/`, exposes `PORT` (defaults to 4000) and uses `/api/health` for health checks.
- **frontend** – builds and starts the Next.js app from `frontend/`, binding to the platform-provided `$PORT`.

### One-time setup
1. Create a project in [Railway](https://railway.com/) and connect this repository.
2. When prompted for services, keep both **backend** and **frontend** enabled from `railway.json`.
3. Add environment variables:
   - **Backend service**: `PORT=4000` (optional override) and `JWT_SECRET` (set to a strong value).
   - **Frontend service**: `NEXT_PUBLIC_BACKEND_URL` pointing to the backend’s public URL (e.g., `https://your-backend.up.railway.app`). This is required in Railway so the Next.js app can reach the API instead of falling back to a localhost default.
4. Deploy. The backend will serve the API, and the frontend will render the UI that calls it. Validate `/api/health` on the backend service before exercising the frontend.

### Local parity
If you need to mirror the Railway setup locally, copy the provided `.env.example` files in `backend/` and `frontend/` to `.env` and adjust values as needed.
