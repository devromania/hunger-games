export type Direction = "up" | "down" | "left" | "right";

export type AIBehavior = "aggressive" | "defensive" | "explorer";

export type ResourceType = "food" | "armor" | "medkit" | "supply_crate";

export type GameStatus = "idle" | "running" | "paused" | "game_over";

export type GameMode = "last_survivor" | "first_elimination";

export interface Position {
  x: number;
  y: number;
}

export interface Resource {
  id: string;
  type: ResourceType;
  position: Position;
  value: number; // HP restored or Armor added
  scoreBonus: number;
  spawnedAtTick: number;
}

export interface Player {
  id: string;
  name: string;
  district: number;
  isAI: boolean;
  behavior?: AIBehavior;
  position: Position;
  hp: number;
  maxHp: number;
  armor: number; // Reduces incoming damage & provides shield
  maxArmor: number;
  attackPower: number;
  score: number;
  kills: number;
  damageDealt: number;
  resourcesCollected: number;
  isAlive: boolean;
  color: string;
  avatar: string;
  lastDirection: Direction;
  lastAction?: string; // e.g., "Seeking Food", "Hunting Cato", "Evading Threat"
  lastHitTick?: number; // For visual hit flash feedback
  eliminatedAtSecond?: number;
}

export interface CombatEvent {
  id: string;
  timestamp: number;
  type: "combat" | "resource" | "elimination" | "arena";
  message: string;
}

export interface FloatingEffect {
  id: string;
  position: Position;
  text: string;
  color: string;
  createdAt: number;
}

export interface GameConfig {
  gridSize: number; // 50x50 default
  aiCount: 3 | 4;
  tickRateMs: number; // Speed of AI & world ticks
  maxResources: number;
  gameMode: GameMode;
}

export interface GameState {
  status: GameStatus;
  players: Player[];
  resources: Resource[];
  events: CombatEvent[];
  effects: FloatingEffect[];
  elapsedSeconds: number;
  tickCount: number;
  winner: Player | null;
  eliminatedFirst: Player | null;
  config: GameConfig;
}
