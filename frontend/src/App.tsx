import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
}

interface TileUpdate {
  x: number;
  y: number;
  type: TileType;
}

type TileType = 'empty' | 'grass' | 'water' | 'tree' | 'rock' | 'sand';

type ServerMessage =
  | { type: 'init'; self: PlayerState; players: PlayerState[]; tiles: TileUpdate[] }
  | { type: 'players'; players: PlayerState[] }
  | { type: 'tiles'; tiles: TileUpdate[] }
  | { type: 'chat'; from: string; text: string };

type ClientMessage =
  | { type: 'move'; dx: number; dy: number }
  | { type: 'command'; text: string };

const TILE_SIZE = 20; // pixels per tile for rendering
const CANVAS_BG = '#0b132b';
const GRID_COLOR = '#1c2541';
const PLAYER_COLOR = '#5bc0be';
const OTHER_PLAYER_COLOR = '#c1c8e4';

const TILE_COLORS: Record<TileType, string> = {
  empty: 'transparent',
  grass: '#5a9f55',
  water: '#4b7bec',
  tree: '#2c6e49',
  rock: '#7d8597',
  sand: '#d6a96a',
};

const WS_URL = import.meta.env.VITE_BACKEND_WS ?? `ws://${window.location.hostname}:4000`;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [self, setSelf] = useState<PlayerState | null>(null);
  const [players, setPlayers] = useState<Map<string, PlayerState>>(new Map());
  const [tiles, setTiles] = useState<Map<string, TileType>>(new Map());
  const [scale, setScale] = useState(1.2);
  const [chatInput, setChatInput] = useState('grass');
  const [chatLog, setChatLog] = useState<string[]>([]);

  const connectionStatus = useMemo(() => {
    if (!ws) return 'disconnected';
    if (ws.readyState === WebSocket.CONNECTING) return 'connecting';
    if (ws.readyState === WebSocket.OPEN) return 'connected';
    return 'closed';
  }, [ws]);

  useEffect(() => {
    let shouldReconnect = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const socket = new WebSocket(WS_URL);
      socket.onopen = () => setWs(socket);
      socket.onclose = () => {
        setWs(null);
        if (shouldReconnect) {
          reconnectTimer = setTimeout(connect, 1000);
        }
      };
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as ServerMessage;
        if (message.type === 'init') {
          setSelf(message.self);
          setPlayers(new Map(message.players.map((p) => [p.id, p])));
          setTiles((prev) => {
            const next = new Map(prev);
            for (const tile of message.tiles) {
              next.set(`${tile.x},${tile.y}`, tile.type);
            }
            return next;
          });
        }
        if (message.type === 'players') {
          setPlayers(new Map(message.players.map((p) => [p.id, p])));
        }
        if (message.type === 'tiles') {
          setTiles((prev) => {
            const next = new Map(prev);
            for (const tile of message.tiles) {
              const key = `${tile.x},${tile.y}`;
              if (tile.type === 'empty') {
                next.delete(key);
              } else {
                next.set(key, tile.type);
              }
            }
            return next;
          });
        }
        if (message.type === 'chat') {
          setChatLog((prev) => [`${message.from}: ${message.text}`, ...prev].slice(0, 40));
        }
      };
    };

    connect();

    return () => {
      shouldReconnect = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const step = 1; // tile units
      let dx = 0;
      let dy = 0;
      if (event.key === 'w' || event.key === 'ArrowUp') dy -= step;
      if (event.key === 's' || event.key === 'ArrowDown') dy += step;
      if (event.key === 'a' || event.key === 'ArrowLeft') dx -= step;
      if (event.key === 'd' || event.key === 'ArrowRight') dx += step;
      if (dx !== 0 || dy !== 0) {
        const message: ClientMessage = { type: 'move', dx, dy };
        ws.send(JSON.stringify(message));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [ws]);

  useEffect(() => {
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setScale((prev) => {
        const next = event.deltaY > 0 ? prev * 0.9 : prev * 1.1;
        return Math.min(Math.max(next, 0.2), 4);
      });
    };
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !self) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const draw = () => {
      if (!self) return;
      ctx.fillStyle = CANVAS_BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(scale, scale);
      ctx.translate(-self.x * TILE_SIZE, -self.y * TILE_SIZE);

      // grid (aligned to tile edges)
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1 / scale;
      const viewWidth = canvas.width / scale;
      const viewHeight = canvas.height / scale;
      const startX = Math.floor((self.x * TILE_SIZE - viewWidth / 2) / TILE_SIZE) * TILE_SIZE - TILE_SIZE;
      const endX = Math.floor((self.x * TILE_SIZE + viewWidth / 2) / TILE_SIZE) * TILE_SIZE + TILE_SIZE;
      const startY = Math.floor((self.y * TILE_SIZE - viewHeight / 2) / TILE_SIZE) * TILE_SIZE - TILE_SIZE;
      const endY = Math.floor((self.y * TILE_SIZE + viewHeight / 2) / TILE_SIZE) * TILE_SIZE + TILE_SIZE;

      ctx.beginPath();
      for (let x = startX; x <= endX; x += TILE_SIZE) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y += TILE_SIZE) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();

      // tiles
      for (const [key, type] of tiles.entries()) {
        if (type === 'empty') continue;
        const [x, y] = key.split(',').map(Number);
        const screenX = x * TILE_SIZE;
        const screenY = y * TILE_SIZE;
        ctx.fillStyle = TILE_COLORS[type] ?? '#ffffff';
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      }

      // players
      for (const p of players.values()) {
        const size = TILE_SIZE * 0.5;
        const px = p.x * TILE_SIZE;
        const py = p.y * TILE_SIZE;
        ctx.fillStyle = p.id === self.id ? PLAYER_COLOR : OTHER_PLAYER_COLOR;
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
        ctx.fillStyle = '#fff';
        ctx.font = `${10 / scale}px monospace`;
        ctx.fillText(p.name, px - size / 2, py - size);
      }

      ctx.restore();
    };

    draw();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [self, tiles, players, scale]);

  const submitCommand = (event: FormEvent) => {
    event.preventDefault();
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const text = chatInput.trim();
    if (!text) return;
    const message: ClientMessage = { type: 'command', text };
    ws.send(JSON.stringify(message));
    setChatInput('');
  };

  return (
    <div className="app">
      <canvas ref={canvasRef} className="world-canvas" />
      <div className="hud">
        <div className="panel">
          <h1>Infinite Canvas MVP</h1>
          <p>
            Status: <strong className={`status status-${connectionStatus}`}>{connectionStatus}</strong> | tiles loaded: {tiles.size}
          </p>
          <p>Use WASD / arrows to move. Scroll to zoom. Type commands like "grass", "water", "forest", "clear". Terrain evolves around you over time.</p>
          {self && (
            <p>
              You are <strong>{self.name}</strong> at x={self.x.toFixed(0)} y={self.y.toFixed(0)} | zoom {scale.toFixed(2)}x
            </p>
          )}
        </div>
        <form className="panel chat" onSubmit={submitCommand}>
          <label htmlFor="chat">Chat-to-world</label>
          <div className="chat-row">
            <input
              id="chat"
              value={chatInput}
              placeholder="e.g. make a small forest"
              onChange={(e) => setChatInput(e.target.value)}
            />
            <button type="submit" disabled={!ws || ws.readyState !== WebSocket.OPEN}>
              Send
            </button>
          </div>
          <div className="chat-log">
            {chatLog.length === 0 && <p className="muted">No messages yet</p>}
            {chatLog.map((line, idx) => (
              <p key={idx}>{line}</p>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
