import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  ClientToServerMessage,
  PlayerState,
  ServerToClientMessage,
  TileType,
  TileUpdate,
} from './types.js';
import { WorldStore } from './world.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const players = new Map<string, PlayerState>();
const sockets = new Map<string, WebSocket>();
const world = new WorldStore();
world.loadSnapshot();

function randomSpawn(): Omit<PlayerState, 'id'> {
  const range = 500;
  return {
    name: `Player-${Math.floor(Math.random() * 999)}`,
    x: Math.floor(Math.random() * range) - range / 2,
    y: Math.floor(Math.random() * range) - range / 2,
  };
}

function broadcast(message: ServerToClientMessage, exceptId?: string) {
  const data = JSON.stringify(message);
  for (const [id, socket] of sockets.entries()) {
    if (exceptId && id === exceptId) continue;
    if (socket.readyState === WebSocket.OPEN) socket.send(data);
  }
}

function collectPlayers(): PlayerState[] {
  return Array.from(players.values());
}

function parseCommand(text: string, player: PlayerState): TileUpdate[] {
  const normalized = text.trim().toLowerCase();
  const updates: TileUpdate[] = [];

  const primary: TileType | null =
    normalized.includes('water') || normalized.includes('lake')
      ? 'water'
      : normalized.includes('forest') || normalized.includes('tree')
      ? 'tree'
      : normalized.includes('rock') || normalized.includes('stone')
      ? 'rock'
      : normalized.includes('sand')
      ? 'sand'
      : normalized.includes('clear') || normalized.includes('erase')
      ? 'empty'
      : normalized.includes('grass')
      ? 'grass'
      : null;

  if (!primary) return updates;

  const radius = normalized.includes('big') || normalized.includes('large') ? 4 : normalized.includes('small') ? 1 : 2;

  for (let dx = -radius; dx <= radius; dx++) {
    for (let dy = -radius; dy <= radius; dy++) {
      const distance = Math.abs(dx) + Math.abs(dy);
      if (distance > radius) continue;
      const update = world.setTile(player.x + dx, player.y + dy, primary);
      if (update) updates.push(update);
    }
  }

  // Add a simple flourish: forests also add rocks as stumps on the edges
  if (primary === 'tree') {
    for (let dx = -radius - 1; dx <= radius + 1; dx++) {
      for (let dy = -radius - 1; dy <= radius + 1; dy++) {
        const distance = Math.abs(dx) + Math.abs(dy);
        if (distance !== radius + 1) continue;
        const rockUpdate = world.setTile(player.x + dx, player.y + dy, 'rock');
        if (rockUpdate) updates.push(rockUpdate);
      }
    }
  }

  return updates;
}

wss.on('connection', (socket) => {
  const player: PlayerState = { id: crypto.randomUUID(), ...randomSpawn() };
  players.set(player.id, player);
  sockets.set(player.id, socket);

  const init: ServerToClientMessage = {
    type: 'init',
    self: player,
    players: collectPlayers(),
    tiles: world.tilesNear(player.x, player.y),
  };
  socket.send(JSON.stringify(init));

  broadcast({ type: 'players', players: collectPlayers() }, player.id);

  socket.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString()) as ClientToServerMessage;
      if (message.type === 'move') {
        player.x += message.dx;
        player.y += message.dy;
        broadcast({ type: 'players', players: collectPlayers() });

        // send fresh tiles near player after moving
        socket.send(
          JSON.stringify({ type: 'tiles', tiles: world.tilesNear(player.x, player.y) } satisfies ServerToClientMessage),
        );
      }

      if (message.type === 'command') {
        const updates = parseCommand(message.text, player);
        if (updates.length > 0) {
          broadcast({ type: 'tiles', tiles: updates });
        }
        broadcast({ type: 'chat', from: player.name, text: message.text });
      }
    } catch (error) {
      console.error('Failed to handle message', error);
    }
  });

  socket.on('close', () => {
    players.delete(player.id);
    sockets.delete(player.id);
    broadcast({ type: 'players', players: collectPlayers() });
  });
});

// periodic persistence + procedural ecosystem
setInterval(() => world.saveSnapshot(), 30_000);
setInterval(() => {
  const updates = world.applyProceduralTick(collectPlayers());
  if (updates.length > 0) {
    broadcast({ type: 'tiles', tiles: updates });
  }
}, 3_000);

const shutdown = () => {
  world.saveSnapshot();
  process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';
httpServer.listen(PORT, HOST, () => {
  console.log(`Backend running on http://${HOST}:${PORT}`);
});
