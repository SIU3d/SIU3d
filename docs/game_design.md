# Infinite Alchemy Canvas — Bare-Bones Design

This document sketches the smallest possible feature set for a shared-canvas, top-down sandbox inspired by **Infinite Alchemy** and the zoomable world concept described earlier. The focus is to get a playable prototype running quickly while leaving room for expansion.

## Core Gameplay Loop
- **Spawn on shared canvas:** Players appear as a 5×5 dot on a massive, zoomable 2D plane. Everyone shares the same world; positions sync in real time.
- **Camera + movement:** WASD / arrow keys move the dot; mouse wheel zooms between "room" and "overworld" scales. Movement only pans the camera—no teleporting.
- **Interact via chat box:** A bottom chat bar accepts short commands (e.g., `place snow`, `combine fire water`). Commands are parsed client-side and applied to the current tile.
- **Tile palette:** The world is a sparse grid of 10×10 tiles. Each tile stores its current element (from the color-based tree below) and optional metadata (age, owner, protections).
- **Alchemy crafting:** Tiles can be combined in-place or in inventory: select two elements and receive the resulting one from the element tree.
- **Claiming + decay:** A plot (e.g., 32×32 tiles) gains soft protection once 50%+ of its tiles are non-blank. Unvisited plots slowly weather into lower-tier elements, enabling the archaeology loop.

## Minimal Technical Slice
- **Client:** HTML canvas (for the world) + lightweight UI overlay (chat bar, inventory). Use a simple quad-tree to track dirty regions for redraw.
- **Server:** WebSocket gateway broadcasting player poses and tile diffs. Backed by a key-value store keyed by chunk (e.g., `chunk_x:chunk_y -> tile array`).
- **Persistence:** Start with in-memory storage + periodic JSON dumps; upgrade to a document DB later.
- **Authoring:** The element tree lives in `docs/element_tree.json` and seeds the server on boot.

## Next Steps After the Bare Bones
- Add crafting latency and energy costs to pace progression.
- Introduce AI-prompts-to-texture generation for tiles marked as "adaptive".
- Layer stacking (±30 layers) to support underground / sky builds.
- Player-created quests and time capsules once core stability is proven.
