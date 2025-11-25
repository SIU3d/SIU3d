# SIU3d High-Level Architecture & Data Model

## Concept restatement
An infinite, shared 2D world is represented as a procedurally chunked grid (~3,000,000×3,000,000 tiles). Each tile can carry multiple ordered layers (surface/underground). Every player appears as a small dot centered in their own camera view and can move around the world while seeing other players in real time. Players issue natural-language-ish chat commands that translate into tile edits (e.g., planting trees, placing water), and lightweight simulation rules (like water + dirt → grass) can evolve tiles over time. Plots (64×64 tiles) can be claimed when a player customizes most of the area, locking further edits by others. The system is built to expand with ecosystems, quests, and AI-driven content later.

## High-level architecture (text diagram)
- **Frontend (React + Canvas/Vite)**
  - Renders zoomable/pannable canvas with layered tiles.
  - WebSocket client for live player positions and tile diffs in the view radius.
  - Command/chat bar to send intent text to backend.
- **Gateway / API (Node + Fastify/Express)**
  - REST: auth, profile, plot metadata, chunk fetch.
  - WebSocket: session init, player movement, tile updates, simulation ticks.
- **World Service**
  - Chunk manager: loads/saves chunks (e.g., 64×64 tiles) on demand.
  - Tile rules engine: applies deterministic procedural rules each tick.
  - Command interpreter: keyword/LLM pluggable module that converts chat to tile operations.
- **Plot/Ownership Service**
  - Computes plot ownership (>50% edited), locks/unlocks edits, manages plot names/metadata.
- **Persistence**
  - PostgreSQL: users, players, plots, chunk metadata, audit/history.
  - Object storage / table: tile payloads per chunk (compressed blob or sparse rows).
  - Redis (later): hot chunk cache, presence, rate limiting.

## Data model (TypeScript shapes)
```ts
export type LayerKind = 'empty' | 'grass' | 'water' | 'tree' | 'rock' | 'structure';

export interface TileLayer {
  z: number;            // layer index (-30..29), 0 is ground surface
  kind: LayerKind;
  data?: Record<string, unknown>; // extensible payload
}

export interface Tile {
  x: number;            // global tile coords
  y: number;
  layers: TileLayer[];  // ordered bottom→top, max 60
  updatedBy?: string;   // player id last modified
  updatedAt?: string;   // ISO timestamp
}

export interface Chunk {
  id: string;           // `${cx}:${cy}`
  cx: number;
  cy: number;
  tiles: Tile[];        // sparse (omit unchanged/empty tiles)
  version: number;      // increments on write for optimistic locking
}

export interface Plot {
  id: string;           // `${px}:${py}`
  px: number;           // plot coordinate (e.g., 64×64 tiles per plot)
  py: number;
  ownerUserId?: string;
  locked: boolean;
  editedByCounts: Record<string, number>; // tile edit counts per player
  name?: string;
  valueScore?: number;
}

export interface Player {
  id: string;
  userId: string;
  x: number;
  y: number;
  facing: number;       // radians or degrees
  lastActiveAt: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}
```

## PostgreSQL schemas (initial pass)
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  facing REAL NOT NULL DEFAULT 0,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chunk metadata + payload pointer (tile data can live as JSONB or separate storage)
CREATE TABLE chunks (
  id TEXT PRIMARY KEY, -- format `${cx}:${cy}`
  cx INTEGER NOT NULL,
  cy INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB NOT NULL DEFAULT '[]' -- sparse tile array [{x,y,layers:[...] }]
);

-- Optional normalized tile table (sparse) if we want row-per-tile instead of blob storage
CREATE TABLE tiles (
  chunk_id TEXT NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  x SMALLINT NOT NULL, -- relative to chunk origin (0-63)
  y SMALLINT NOT NULL,
  layers JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (chunk_id, x, y)
);

CREATE TABLE plots (
  id TEXT PRIMARY KEY, -- `${px}:${py}` where plot is e.g., 64×64 tiles
  px INTEGER NOT NULL,
  py INTEGER NOT NULL,
  owner_user_id UUID REFERENCES users(id),
  locked BOOLEAN NOT NULL DEFAULT FALSE,
  edited_by_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  name TEXT,
  value_score REAL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## MVP slice (this repo state)
- Backend: Express + WebSocket server that spawns players at random coords, accepts chat commands that paint tiles, persists chunks to `data/world.json`, and runs light procedural rules near active players.
- Frontend: Vite + React + Canvas rendering a zoomable grid with tiles, player dots, chat-to-world bar, and live HUD via WebSocket.
- Scripts: `npm run dev` from repo root runs both frontend (5173) and backend (4000); `VITE_BACKEND_WS` can override the WS endpoint when hosting elsewhere.
