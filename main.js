const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
const logEl = document.getElementById('log');
const chatInput = document.getElementById('chat');
const chatForm = document.getElementById('chat-form');

const TILE_SIZE = 18;
const VIEW_RADIUS = 16; // tiles from center
const GRID_COLOR = '#1f2636';
const BLANK_COLOR = '#0f111a';

let elementTree = { tiers: [], rules: {} };
let elementIndex = new Map();
let zoom = 1;
let player = { x: 0, y: 0 };
let world = new Map();

const elementPalette = {
  snow: '#d7f2ff',
  volcanic_rock: '#45312a',
  ember: '#ff7b3a',
  water: '#5fc4ff',
  sunlight: '#ffd166',
  moss: '#6bdc7f',
  soil: '#9c7152',
  iron: '#8d99ae',
  stormcloud: '#5f6f94',
  lava: '#ff4b2b',
  glacier: '#bde8f8',
  loam: '#8a7c5b',
  ash: '#7a6c62',
  bronze: '#d48a5a',
  mist: '#b8e2f2',
  sap: '#b6da55',
  obsidian: '#2f2a39',
  canopy: '#2f9e44',
  aurora: '#7cd2ff',
  steel: '#8c9aa8',
  riftroot: '#6e3f2f',
  tempest: '#7bb2ff',
  glassland: '#f0fff9',
  mycelium: '#c6b1d7'
};

function log(message) {
  const p = document.createElement('p');
  p.textContent = message;
  logEl.appendChild(p);
  logEl.scrollTop = logEl.scrollHeight;
}

async function loadElements() {
  try {
    const res = await fetch('docs/element_tree.json');
    elementTree = await res.json();
    for (const tier of elementTree.tiers) {
      for (const el of tier.elements) {
        elementIndex.set(el.id, el);
      }
    }
    log(`Loaded ${elementIndex.size} elements.`);
  } catch (err) {
    log('Failed to load element tree. Check that docs/element_tree.json is served.');
    console.error(err);
  }
}

function key(event) {
  switch (event.key.toLowerCase()) {
    case 'w':
    case 'arrowup':
      player.y -= 1;
      break;
    case 's':
    case 'arrowdown':
      player.y += 1;
      break;
    case 'a':
    case 'arrowleft':
      player.x -= 1;
      break;
    case 'd':
    case 'arrowright':
      player.x += 1;
      break;
    default:
      return;
  }
  event.preventDefault();
}

function wheel(event) {
  const delta = Math.sign(event.deltaY);
  zoom = Math.min(2.5, Math.max(0.5, zoom - delta * 0.1));
}

function tileKey(x, y) {
  return `${x},${y}`;
}

function getTile(x, y) {
  return world.get(tileKey(x, y));
}

function setTile(x, y, elementId) {
  const element = elementIndex.get(elementId);
  if (!element) {
    log(`Unknown element: ${elementId}`);
    return;
  }
  world.set(tileKey(x, y), { element: elementId });
  log(`Placed ${element.label} at (${x}, ${y}).`);
}

function findCombination(elements) {
  const bag = [...elements].sort();
  for (const tier of elementTree.tiers) {
    for (const el of tier.elements) {
      if (!el.resultOf) continue;
      const recipe = [...el.resultOf].sort();
      if (recipe.length !== bag.length) continue;
      const match = recipe.every((r, i) => r === bag[i]);
      if (match) return el;
    }
  }
  return null;
}

function handleCommand(input) {
  const parts = input.trim().split(/\s+/);
  if (!parts.length) return;
  const [command, ...rest] = parts;
  if (command === 'place') {
    const target = rest[0];
    if (!target) {
      log('Usage: place <elementId>');
      return;
    }
    setTile(player.x, player.y, target);
    return;
  }
  if (command === 'combine') {
    if (rest.length < 2) {
      log('Usage: combine <a> <b>');
      return;
    }
    const result = findCombination(rest.slice(0, 2));
    if (result) {
      setTile(player.x, player.y, result.id);
      log(`Crafted ${result.label} from ${rest[0]} + ${rest[1]}.`);
    } else {
      log(`No recipe for ${rest.join(' + ')}.`);
    }
    return;
  }
  log(`Unknown command: ${command}`);
}

function drawGrid() {
  ctx.fillStyle = BLANK_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const tilesAcross = Math.ceil((canvas.width / (TILE_SIZE * zoom)) / 2);
  const tilesDown = Math.ceil((canvas.height / (TILE_SIZE * zoom)) / 2);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(zoom, zoom);

  for (let y = -tilesDown - VIEW_RADIUS; y <= tilesDown + VIEW_RADIUS; y++) {
    for (let x = -tilesAcross - VIEW_RADIUS; x <= tilesAcross + VIEW_RADIUS; x++) {
      const worldX = player.x + x;
      const worldY = player.y + y;
      const tile = getTile(worldX, worldY);
      const color = tile ? elementPalette[tile.element] || '#3a3f55' : BLANK_COLOR;
      ctx.fillStyle = color;
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  ctx.fillStyle = '#ffd166';
  ctx.fillRect(-TILE_SIZE / 4, -TILE_SIZE / 4, TILE_SIZE / 2, TILE_SIZE / 2);
  ctx.restore();
}

function loop() {
  drawGrid();
  requestAnimationFrame(loop);
}

chatForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (message) handleCommand(message);
  chatInput.value = '';
});

document.addEventListener('keydown', key);
canvas.addEventListener('wheel', wheel);

loadElements();
log('Use WASD/arrows to move. Type commands to interact.');
loop();
