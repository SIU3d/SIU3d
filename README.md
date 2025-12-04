# SIU3d — Infinite Alchemy Canvas

This repository tracks design notes for a shared-canvas, top-down sandbox inspired by **Infinite Alchemy**. Players roam a huge zoomable map as a single dot, craft color-based elements, and collaboratively paint the world.

## Getting Started
1. Review the bare-bones design outline in [`docs/game_design.md`](docs/game_design.md).
2. Use the color-driven crafting graph in [`docs/element_tree.json`](docs/element_tree.json) to seed your prototype.
3. Prototype a thin HTML canvas client: draw the grid, render player dots, and wire a chat bar that reads commands like `place snow` or `combine red blue`.
4. Wire a simple WebSocket server that tracks chunks and broadcasts tile updates and player positions.

## What to Build First
- **Movement + camera:** WASD/arrow movement with zooming to mimic a Don't Starve Together-style top-down view.
- **Tile placement:** Map chat commands to elements from the element tree and paint the current tile.
- **Basic crafting:** Allow combining two elements based on the recipes in `docs/element_tree.json`.
- **Persistence stub:** Keep the world in memory and periodically dump chunks to disk as JSON.

Once these pieces work, expand toward AI-assisted tile art, layered worlds (±30 layers), and player-made quests.
