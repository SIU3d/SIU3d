export type TileType = 'empty' | 'grass' | 'water' | 'tree' | 'rock' | 'sand';

export interface TileUpdate {
  x: number; // global tile x
  y: number; // global tile y
  type: TileType;
}

export interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface ServerToClientInit {
  type: 'init';
  self: PlayerState;
  players: PlayerState[];
  tiles: TileUpdate[];
}

export interface ServerToClientPlayers {
  type: 'players';
  players: PlayerState[];
}

export interface ServerToClientTiles {
  type: 'tiles';
  tiles: TileUpdate[];
}

export interface ServerToClientChat {
  type: 'chat';
  from: string;
  text: string;
}

export type ServerToClientMessage =
  | ServerToClientInit
  | ServerToClientPlayers
  | ServerToClientTiles
  | ServerToClientChat;

export interface ClientToServerMove {
  type: 'move';
  dx: number;
  dy: number;
}

export interface ClientToServerCommand {
  type: 'command';
  text: string;
}

export type ClientToServerMessage = ClientToServerMove | ClientToServerCommand;

export const TILE_SIZE = 10; // logical pixels per tile (view scale can change)

export const VIEW_RADIUS_TILES = 64; // half-width of tile window sent to clients
