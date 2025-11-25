# SIU3d – Infinite Canvas MVP

A self-hostable, free-to-run vertical slice of the massively shared, zoomable 2D canvas game.

What you get in this slice:
- **Realtime multiplayer**: every browser tab is a player dot; positions broadcast over WebSockets.
- **Chat-to-world**: type commands like `grass`, `water`, `forest`, `clear` to paint tiles around you; everyone sees updates instantly.
- **Tile rendering + evolution**: colored 10×10 tiles on a zoomable canvas plus a simple grid; nearby terrain evolves with light Game-of-Life style rules.
- **Zero-cost local stack**: Node.js + Vite + Express + ws; no external paid services required.

## Prerequisites (free)
- Node.js 18+ (or any recent LTS)
- npm (ships with Node)

**If you see `npm : The term 'npm' is not recognized` on Windows/PowerShell**
- Install Node.js from https://nodejs.org/ (it includes npm) or use [nvm-windows](https://github.com/coreybutler/nvm-windows) to manage versions.
- Close and reopen your terminal so the `%ProgramFiles%\nodejs` path is added to `PATH`.
- Verify with `node -v` and `npm -v`. If they fail, run PowerShell as administrator and ensure execution policy allows scripts: `Set-ExecutionPolicy RemoteSigned`.
- In a browser-only editor like vscode.dev, run the commands in a **remote** shell (Codespace/VM); npm is not available locally in the browser.

## Install & run locally
From the repo root:

```bash
# install shared dev tooling (none right now, but keeps root scripts working)
npm install

# install backend deps (add --registry if your network blocks the default registry)
npm install --prefix backend

# install frontend deps (add --registry if your network blocks the default registry)
npm install --prefix frontend

# start both servers in parallel (backend on 4000, frontend on 5173)
npm run dev
```

Then open the frontend at http://localhost:5173. It connects to the backend WebSocket at ws://localhost:4000 (configurable via `VITE_BACKEND_WS`).

> Tip: copy `frontend/.env.example` to `frontend/.env.local` if you need to override the backend URL.

### Controls
- Move: **WASD** or **Arrow keys**
- Zoom: mouse wheel
- Command box: type text such as `make a small forest`, `drop water here`, `clear`, `big grass patch`

### Commands available
- `grass`, `water`, `forest`/`tree`, `rock`/`stone`, `sand`, `clear`/`erase`
- Include words like `small` or `big/large` to change radius.
- Every command affects tiles around your player and is broadcast to everyone.

### Procedural rules (server tick)
- Grass spreads into empties near existing grass/trees.
- Grass touching water grows trees.
- Overcrowded trees become rocks/stumps.
- Sand touching enough water turns into grass.

## How to run for free in the cloud
If you want to share with friends without cost:
1. Use a free-tier VM (e.g., GitHub Codespaces, Fly.io free trial, or a free Railway/Render web service).
2. Expose port **4000** for the backend WebSocket and **5173** for the frontend dev server (or run `npm run build` and serve the `frontend/dist` folder with any static server).
3. No database or paid services are required for this MVP; world state lives in memory and snapshots to disk.

### VS Code in the browser (vscode.dev) workflow
`vscode.dev` itself is editor-only; run the stack in a remote environment (Codespaces, VS Code Tunnels, or any VM you can SSH into) and forward ports:

1. Open the repo in vscode.dev, then connect to your remote host.
2. In the remote terminal, install deps and start the stack: `npm install && npm install --prefix backend && npm install --prefix frontend && npm run dev`.
3. Forward **5173** and **4000** from the remote to your browser. In forwarded environments (e.g., `5173-<id>.preview.app.github.dev`), set `frontend/.env.local` with `VITE_BACKEND_WS=wss://4000-<id>.preview.app.github.dev` so the client reaches the backend.
4. If the backend runs on a different host, also set `VITE_BACKEND_PROXY` in `frontend/.env.local` so Vite’s `/health` proxy keeps working during dev.

## Project layout
- `backend/`: Express + ws server (`npm run dev --prefix backend` for backend-only)
- `frontend/`: Vite React client (`npm run dev --prefix frontend` for client-only)
- `docs/ARCHITECTURE.md`: conceptual architecture and data model notes

## Notes
- The world snapshots to `data/world.json` every ~10 seconds and on shutdown.
- The code is structured to accept richer parsers and storage later without swapping protocols.
