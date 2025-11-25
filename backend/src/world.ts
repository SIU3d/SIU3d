import fs from 'fs';
import path from 'path';
import { TileType, TileUpdate, VIEW_RADIUS_TILES, PlayerState } from './types.js';

const CHUNK_SIZE = 64;
const SNAPSHOT_PATH = path.resolve(process.cwd(), 'data', 'world.json');

function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

function tileKey(tx: number, ty: number): string {
  return `${tx},${ty}`;
}

function worldToChunk(x: number, y: number): { cx: number; cy: number; lx: number; ly: number } {
  const cx = Math.floor(x / CHUNK_SIZE);
  const cy = Math.floor(y / CHUNK_SIZE);
  const lx = x - cx * CHUNK_SIZE;
  const ly = y - cy * CHUNK_SIZE;
  return { cx, cy, lx, ly };
}

export class WorldStore {
  private chunks = new Map<string, Map<string, TileType>>();
  private dirty = false;
  private saveTimer: NodeJS.Timeout | null = null;

  constructor(private snapshotPath: string = SNAPSHOT_PATH) {
    fs.mkdirSync(path.dirname(this.snapshotPath), { recursive: true });
  }

  loadSnapshot(): void {
    if (!fs.existsSync(this.snapshotPath)) return;
    const raw = fs.readFileSync(this.snapshotPath, 'utf8');
    const data = JSON.parse(raw) as Record<string, Record<string, TileType>>;
    this.chunks.clear();
    for (const [ck, tiles] of Object.entries(data)) {
      this.chunks.set(ck, new Map(Object.entries(tiles)));
    }
    console.log(`Loaded world snapshot with ${this.totalTileCount()} tiles from ${this.snapshotPath}`);
  }

  private scheduleSave(): void {
    this.dirty = true;
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveSnapshot();
    }, 10_000);
  }

  saveSnapshot(): void {
    if (!this.dirty) return;
    const serialised: Record<string, Record<string, TileType>> = {};
    for (const [ck, tiles] of this.chunks.entries()) {
      if (tiles.size === 0) continue;
      serialised[ck] = Object.fromEntries(tiles.entries());
    }
    fs.writeFileSync(this.snapshotPath, JSON.stringify(serialised, null, 2), 'utf8');
    this.dirty = false;
    console.log(`Saved world snapshot (${this.totalTileCount()} tiles) to ${this.snapshotPath}`);
  }

  private getChunk(cx: number, cy: number, create = false): Map<string, TileType> | undefined {
    const key = chunkKey(cx, cy);
    const existing = this.chunks.get(key);
    if (existing) return existing;
    if (!create) return undefined;
    const next = new Map<string, TileType>();
    this.chunks.set(key, next);
    return next;
  }

  private getTile(x: number, y: number): TileType {
    const { cx, cy, lx, ly } = worldToChunk(x, y);
    const chunk = this.getChunk(cx, cy);
    if (!chunk) return 'empty';
    return chunk.get(tileKey(lx, ly)) ?? 'empty';
  }

  setTile(x: number, y: number, type: TileType): TileUpdate | null {
    const { cx, cy, lx, ly } = worldToChunk(x, y);
    const chunk = this.getChunk(cx, cy, true)!;
    const key = tileKey(lx, ly);
    const prev = chunk.get(key) ?? 'empty';
    if (prev === type) return null;

    if (type === 'empty') {
      chunk.delete(key);
    } else {
      chunk.set(key, type);
    }
    this.scheduleSave();
    return { x, y, type };
  }

  tilesNear(x: number, y: number, radius: number = VIEW_RADIUS_TILES): TileUpdate[] {
    const updates: TileUpdate[] = [];
    for (let tx = x - radius; tx <= x + radius; tx++) {
      for (let ty = y - radius; ty <= y + radius; ty++) {
        const t = this.getTile(tx, ty);
        if (t !== 'empty') {
          updates.push({ x: tx, y: ty, type: t });
        }
      }
    }
    return updates;
  }

  totalTileCount(): number {
    let total = 0;
    for (const chunk of this.chunks.values()) {
      total += chunk.size;
    }
    return total;
  }

  applyProceduralTick(players: PlayerState[], radius = 8): TileUpdate[] {
    const candidates = new Set<string>();
    for (const p of players) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          candidates.add(tileKey(p.x + dx, p.y + dy));
        }
      }
    }

    const updates: TileUpdate[] = [];
    for (const key of candidates) {
      const [x, y] = key.split(',').map(Number);
      const here = this.getTile(x, y);
      const counts = this.neighborCounts(x, y);

      // Rule 1: grass spreads into empties near existing grass/tree
      if (here === 'empty' && counts.grass + counts.tree >= 3) {
        const update = this.setTile(x, y, 'grass');
        if (update) updates.push(update);
        continue;
      }

      // Rule 2: grass near water slowly becomes trees
      if (here === 'grass' && counts.water >= 1 && counts.tree < 4) {
        const update = this.setTile(x, y, 'tree');
        if (update) updates.push(update);
        continue;
      }

      // Rule 3: overcrowded trees turn to rock (stumps)
      if (here === 'tree' && counts.tree >= 5) {
        const update = this.setTile(x, y, 'rock');
        if (update) updates.push(update);
        continue;
      }

      // Rule 4: sand touching water becomes grass
      if (here === 'sand' && counts.water >= 2) {
        const update = this.setTile(x, y, 'grass');
        if (update) updates.push(update);
        continue;
      }
    }
    return updates;
  }

  private neighborCounts(x: number, y: number): Record<TileType, number> {
    const counts: Record<TileType, number> = {
      empty: 0,
      grass: 0,
      water: 0,
      tree: 0,
      rock: 0,
      sand: 0,
    };
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const t = this.getTile(x + dx, y + dy);
        counts[t] += 1;
      }
    }
    return counts;
  }
}

export { CHUNK_SIZE };
