import {
  AIBehavior,
  CombatEvent,
  Direction,
  FloatingEffect,
  GameConfig,
  GameState,
  Player,
  Position,
  Resource,
  ResourceType,
} from "@/types/game";

export const DEFAULT_CONFIG: GameConfig = {
  gridSize: 50,
  aiCount: 4,
  tickRateMs: 220,
  maxResources: 32,
  gameMode: "last_survivor",
};

const DIRECTION_DELTAS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const ALL_DIRECTIONS: Direction[] = ["up", "down", "left", "right"];

export function manhattanDistance(a: Position, b: Position): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function isSamePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function isCornucopiaTile(x: number, y: number, gridSize = 50): boolean {
  const center = Math.floor(gridSize / 2);
  return Math.abs(x - center) <= 3 && Math.abs(y - center) <= 3;
}

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

export function createInitialPlayers(config: GameConfig): Player[] {
  const g = config.gridSize;
  const humanPlayer: Player = {
    id: "player-human",
    name: "Katniss (You)",
    district: 12,
    isAI: false,
    position: { x: 8, y: g - 9 },
    hp: 100,
    maxHp: 100,
    armor: 20,
    maxArmor: 100,
    attackPower: 22,
    score: 0,
    kills: 0,
    damageDealt: 0,
    resourcesCollected: 0,
    isAlive: true,
    color: "#10b981", // Emerald
    avatar: "🏹",
    lastDirection: "up",
    lastAction: "Ready in Arena",
  };

  const aiRoster: Player[] = [
    {
      id: "ai-cato",
      name: "Cato",
      district: 2,
      isAI: true,
      behavior: "aggressive",
      position: { x: 8, y: 8 },
      hp: 100,
      maxHp: 100,
      armor: 25,
      maxArmor: 100,
      attackPower: 24,
      score: 0,
      kills: 0,
      damageDealt: 0,
      resourcesCollected: 0,
      isAlive: true,
      color: "#ef4444", // Crimson
      avatar: "⚔️",
      lastDirection: "down",
      lastAction: "Scanning targets",
    },
    {
      id: "ai-thresh",
      name: "Thresh",
      district: 11,
      isAI: true,
      behavior: "defensive",
      position: { x: g - 9, y: g - 9 },
      hp: 100,
      maxHp: 100,
      armor: 35,
      maxArmor: 100,
      attackPower: 21,
      score: 0,
      kills: 0,
      damageDealt: 0,
      resourcesCollected: 0,
      isAlive: true,
      color: "#f59e0b", // Amber
      avatar: "🛡️",
      lastDirection: "left",
      lastAction: "Fortifying position",
    },
    {
      id: "ai-foxface",
      name: "Foxface",
      district: 5,
      isAI: true,
      behavior: "explorer",
      position: { x: g - 9, y: 8 },
      hp: 100,
      maxHp: 100,
      armor: 15,
      maxArmor: 100,
      attackPower: 19,
      score: 0,
      kills: 0,
      damageDealt: 0,
      resourcesCollected: 0,
      isAlive: true,
      color: "#a855f7", // Purple
      avatar: "🦊",
      lastDirection: "down",
      lastAction: "Scouting supplies",
    },
    {
      id: "ai-glimmer",
      name: "Glimmer",
      district: 1,
      isAI: true,
      behavior: "aggressive",
      position: { x: Math.floor(g / 2), y: 5 },
      hp: 100,
      maxHp: 100,
      armor: 20,
      maxArmor: 100,
      attackPower: 22,
      score: 0,
      kills: 0,
      damageDealt: 0,
      resourcesCollected: 0,
      isAlive: true,
      color: "#06b6d4", // Cyan
      avatar: "🗡️",
      lastDirection: "down",
      lastAction: "Rushing Cornucopia",
    },
  ];

  return [humanPlayer, ...aiRoster.slice(0, config.aiCount)];
}

export function spawnResource(
  gridSize: number,
  players: Player[],
  existingResources: Resource[],
  tick: number,
  forceCornucopia = false
): Resource | null {
  const maxAttempts = 60;
  const center = Math.floor(gridSize / 2);

  for (let i = 0; i < maxAttempts; i++) {
    let x: number;
    let y: number;

    if (forceCornucopia) {
      x = center + Math.floor(Math.random() * 7) - 3;
      y = center + Math.floor(Math.random() * 7) - 3;
    } else {
      x = Math.floor(Math.random() * gridSize);
      y = Math.floor(Math.random() * gridSize);
    }

    const pos = { x, y };
    const occupiedByPlayer = players.some(
      (p) => p.isAlive && isSamePosition(p.position, pos)
    );
    const occupiedByResource = existingResources.some((r) =>
      isSamePosition(r.position, pos)
    );

    if (!occupiedByPlayer && !occupiedByResource) {
      const roll = Math.random();
      let type: ResourceType = "food";
      let value = 25;
      let scoreBonus = 50;

      if (forceCornucopia && roll < 0.35) {
        type = "supply_crate";
        value = 30;
        scoreBonus = 150;
      } else if (roll < 0.48) {
        type = "food";
        value = 25;
        scoreBonus = 50;
      } else if (roll < 0.85) {
        type = "armor";
        value = 25;
        scoreBonus = 60;
      } else if (roll < 0.95) {
        type = "medkit";
        value = 45;
        scoreBonus = 100;
      } else {
        type = "supply_crate";
        value = 30;
        scoreBonus = 150;
      }

      return {
        id: createId("res"),
        type,
        position: pos,
        value,
        scoreBonus,
        spawnedAtTick: tick,
      };
    }
  }

  return null;
}

export function createInitialGameState(
  config: GameConfig = DEFAULT_CONFIG
): GameState {
  const players = createInitialPlayers(config);
  const resources: Resource[] = [];

  // Spawn initial Cornucopia center cluster (8 high-value resources)
  for (let i = 0; i < 8; i++) {
    const res = spawnResource(config.gridSize, players, resources, 0, true);
    if (res) resources.push(res);
  }

  // Spawn scattered resources across the 50x50 field
  const scatteredCount = config.maxResources - resources.length;
  for (let i = 0; i < scatteredCount; i++) {
    const res = spawnResource(config.gridSize, players, resources, 0, false);
    if (res) resources.push(res);
  }

  return {
    status: "idle",
    players,
    resources,
    events: [
      {
        id: createId("evt"),
        timestamp: 0,
        type: "arena",
        message:
          "Welcome to the 74th Hunger Games! Collect Food & Armor, survive the Arena, and outlast all tributes.",
      },
    ],
    effects: [],
    elapsedSeconds: 0,
    tickCount: 0,
    winner: null,
    eliminatedFirst: null,
    config,
  };
}

/**
 * Evaluates and executes a movement or attack in the given direction for a specific player.
 */
export function moveOrAttackPlayer(
  state: GameState,
  playerId: string,
  direction: Direction
): GameState {
  const playerIdx = state.players.findIndex((p) => p.id === playerId);
  if (playerIdx === -1) return state;

  const actor = state.players[playerIdx];
  if (!actor.isAlive) return state;

  const delta = DIRECTION_DELTAS[direction];
  const targetPos: Position = {
    x: Math.max(0, Math.min(state.config.gridSize - 1, actor.position.x + delta.x)),
    y: Math.max(0, Math.min(state.config.gridSize - 1, actor.position.y + delta.y)),
  };

  // If clamped to exact same spot (wall hit), just update facing direction
  if (isSamePosition(targetPos, actor.position)) {
    const updatedPlayers = [...state.players];
    updatedPlayers[playerIdx] = { ...actor, lastDirection: direction };
    return { ...state, players: updatedPlayers };
  }

  const players = state.players.map((p) => ({ ...p }));
  let resources = [...state.resources];
  let events = [...state.events];
  let effects = [...state.effects];
  let eliminatedFirst = state.eliminatedFirst;

  const currentActor = players[playerIdx];
  currentActor.lastDirection = direction;

  // Check if another living player occupies targetPos -> COMBAT!
  const defenderIdx = players.findIndex(
    (p) => p.id !== currentActor.id && p.isAlive && isSamePosition(p.position, targetPos)
  );

  if (defenderIdx !== -1) {
    const defender = players[defenderIdx];

    // Calculate primary strike damage
    const rawDamage =
      currentActor.attackPower + Math.floor(Math.random() * 7) - 2;
    const armorAbsorbed = Math.min(
      defender.armor,
      Math.floor(rawDamage * 0.55)
    );
    const hpDamage = Math.max(6, rawDamage - armorAbsorbed);

    defender.armor = Math.max(0, defender.armor - armorAbsorbed);
    defender.hp = Math.max(0, defender.hp - hpDamage);
    defender.lastHitTick = state.tickCount;

    currentActor.damageDealt += hpDamage;
    currentActor.score += hpDamage * 3;
    currentActor.lastAction = `Attacked ${defender.name} (-${hpDamage} HP)`;

    effects.push({
      id: createId("fx"),
      position: { ...defender.position },
      text: `-${hpDamage} HP`,
      color: "#ef4444",
      createdAt: Date.now(),
    });

    if (defender.hp <= 0) {
      defender.hp = 0;
      defender.isAlive = false;
      defender.eliminatedAtSecond = state.elapsedSeconds;
      defender.lastAction = `Eliminated by ${currentActor.name}`;
      currentActor.kills += 1;
      currentActor.score += 300;
      // Loot boost on elimination
      currentActor.hp = Math.min(currentActor.maxHp, currentActor.hp + 15);
      currentActor.armor = Math.min(
        currentActor.maxArmor,
        currentActor.armor + 15
      );

      if (!eliminatedFirst) {
        eliminatedFirst = { ...defender };
      }

      events = [
        {
          id: createId("evt"),
          timestamp: state.elapsedSeconds,
          type: "elimination" as const,
          message: `💥 CANNON FIRES! ${currentActor.name} eliminated ${defender.name} (District ${defender.district})!`,
        },
        ...events,
      ].slice(0, 40);

      effects.push({
        id: createId("fx"),
        position: { ...defender.position },
        text: `💀 ELIMINATED`,
        color: "#f59e0b",
        createdAt: Date.now(),
      });
    } else {
      // Defender counter-attacks slightly in close-quarters skirmish!
      const counterRaw = Math.floor(defender.attackPower * 0.45);
      const counterArmor = Math.min(
        currentActor.armor,
        Math.floor(counterRaw * 0.55)
      );
      const counterHpDmg = Math.max(3, counterRaw - counterArmor);

      currentActor.armor = Math.max(0, currentActor.armor - counterArmor);
      currentActor.hp = Math.max(1, currentActor.hp - counterHpDmg); // Counter-attack leaves attacker with at least 1 HP
      currentActor.lastHitTick = state.tickCount;

      events = [
        {
          id: createId("evt"),
          timestamp: state.elapsedSeconds,
          type: "combat" as const,
          message: `⚔️ ${currentActor.name} struck ${defender.name} for ${hpDamage} HP (${defender.hp} HP left)!`,
        },
        ...events,
      ].slice(0, 40);
    }

    return evaluateVictoryState({
      ...state,
      players,
      resources,
      events,
      effects,
      eliminatedFirst,
    });
  }

  // Otherwise, move onto targetPos
  currentActor.position = targetPos;

  // Check if a resource is at targetPos
  const resIdx = resources.findIndex((r) => isSamePosition(r.position, targetPos));
  if (resIdx !== -1) {
    const resource = resources[resIdx];
    resources.splice(resIdx, 1);
    currentActor.resourcesCollected += 1;
    currentActor.score += resource.scoreBonus;

    if (resource.type === "food") {
      const prevHp = currentActor.hp;
      currentActor.hp = Math.min(
        currentActor.maxHp,
        currentActor.hp + resource.value
      );
      const healed = currentActor.hp - prevHp;
      if (healed === 0) {
        currentActor.attackPower += 1; // Well-fed vigor bonus
      }
      currentActor.lastAction = `Ate Food (+${healed > 0 ? healed + " HP" : "1 ATK"})`;
      effects.push({
        id: createId("fx"),
        position: { ...targetPos },
        text: healed > 0 ? `+${healed} HP` : `+${resource.scoreBonus} PTS`,
        color: "#10b981",
        createdAt: Date.now(),
      });
    } else if (resource.type === "armor") {
      const prevArmor = currentActor.armor;
      currentActor.armor = Math.min(
        currentActor.maxArmor,
        currentActor.armor + resource.value
      );
      const gained = currentActor.armor - prevArmor;
      currentActor.lastAction = `Equipped Armor (+${gained} DEF)`;
      effects.push({
        id: createId("fx"),
        position: { ...targetPos },
        text: `+${gained > 0 ? gained + " ARMOR" : resource.scoreBonus + " PTS"}`,
        color: "#06b6d4",
        createdAt: Date.now(),
      });
    } else if (resource.type === "medkit") {
      const prevHp = currentActor.hp;
      currentActor.hp = Math.min(
        currentActor.maxHp,
        currentActor.hp + resource.value
      );
      const healed = currentActor.hp - prevHp;
      currentActor.lastAction = `Used Capitol Medkit (+${healed} HP)`;
      effects.push({
        id: createId("fx"),
        position: { ...targetPos },
        text: `+${healed} HP MEDKIT`,
        color: "#22c55e",
        createdAt: Date.now(),
      });
    } else if (resource.type === "supply_crate") {
      currentActor.hp = Math.min(currentActor.maxHp, currentActor.hp + 20);
      currentActor.armor = Math.min(
        currentActor.maxArmor,
        currentActor.armor + 25
      );
      currentActor.attackPower += 3;
      currentActor.lastAction = `Looted Cornucopia Crate (+3 ATK, +HP/DEF)`;
      effects.push({
        id: createId("fx"),
        position: { ...targetPos },
        text: `🎁 CRATE +3 ATK`,
        color: "#f59e0b",
        createdAt: Date.now(),
      });

      events = [
        {
          id: createId("evt"),
          timestamp: state.elapsedSeconds,
          type: "resource" as const,
          message: `🎁 ${currentActor.name} looted a Capitol Supply Crate (+20 HP, +25 Armor, +3 ATK)!`,
        },
        ...events,
      ].slice(0, 40);
    }
  }

  return evaluateVictoryState({
    ...state,
    players,
    resources,
    events,
    effects,
    eliminatedFirst,
  });
}

/**
 * Intelligent AI Decision Engine based on behavior profile:
 * - "aggressive": Hunts nearest or weakest enemy when HP > 38; seeks food/medkit when injured.
 * - "defensive": Prioritizes armor & food; avoids enemies when HP < 65 unless adjacent to a weak target.
 * - "explorer": Rapidly collects resources across the arena for high score & stats; evades enemies within 7 tiles.
 */
export function computeAIMove(
  ai: Player,
  state: GameState
): { direction: Direction; actionLabel: string } {
  const behavior: AIBehavior = ai.behavior || "explorer";
  const otherPlayers = state.players.filter((p) => p.isAlive && p.id !== ai.id);
  const resources = state.resources;
  const g = state.config.gridSize;
  const center: Position = { x: Math.floor(g / 2), y: Math.floor(g / 2) };

  // Find nearest enemy & weakest enemy
  let nearestEnemy: Player | null = null;
  let nearestEnemyDist = Infinity;
  for (const enemy of otherPlayers) {
    const d = manhattanDistance(ai.position, enemy.position);
    if (d < nearestEnemyDist) {
      nearestEnemyDist = d;
      nearestEnemy = enemy;
    }
  }

  // Decide high-level tactical intent
  const effectiveStrength = ai.hp + ai.armor * 0.65 + ai.attackPower * 1.5;
  const enemyStrength = nearestEnemy
    ? nearestEnemy.hp + nearestEnemy.armor * 0.65 + nearestEnemy.attackPower * 1.5
    : 0;

  let mode: "hunt" | "flee" | "heal" | "fortify" | "scavenge" = "scavenge";
  let targetPos: Position = center;
  let actionLabel = "Exploring Arena";

  if (ai.hp < 40) {
    // Critical HP: prioritize healing or fleeing if enemy is close
    if (nearestEnemy && nearestEnemyDist <= 5 && nearestEnemy.hp > ai.hp) {
      mode = "flee";
      targetPos = nearestEnemy.position;
      actionLabel = `Evading ${nearestEnemy.name}`;
    } else {
      mode = "heal";
      actionLabel = "Seeking Food / Medkit";
    }
  } else if (behavior === "aggressive") {
    if (nearestEnemy && (ai.hp >= 45 || nearestEnemy.hp < ai.hp)) {
      mode = "hunt";
      targetPos = nearestEnemy.position;
      actionLabel = `Hunting ${nearestEnemy.name}`;
    } else {
      mode = "heal";
      actionLabel = "Recovering Strength";
    }
  } else if (behavior === "defensive") {
    if (nearestEnemy && nearestEnemyDist <= 2 && effectiveStrength >= enemyStrength * 0.85) {
      mode = "hunt";
      targetPos = nearestEnemy.position;
      actionLabel = `Counter-attacking ${nearestEnemy.name}`;
    } else if (nearestEnemy && nearestEnemyDist <= 5 && effectiveStrength < enemyStrength) {
      mode = "flee";
      targetPos = nearestEnemy.position;
      actionLabel = `Retreating from ${nearestEnemy.name}`;
    } else if (ai.armor < 65) {
      mode = "fortify";
      actionLabel = "Seeking Armor Shield";
    } else if (ai.hp < 85) {
      mode = "heal";
      actionLabel = "Stockpiling Food";
    } else if (nearestEnemy) {
      mode = "hunt";
      targetPos = nearestEnemy.position;
      actionLabel = `Advancing on ${nearestEnemy.name}`;
    }
  } else {
    // Explorer behavior
    if (nearestEnemy && nearestEnemyDist === 1 && nearestEnemy.hp <= 28) {
      // Opportunistic finisher
      mode = "hunt";
      targetPos = nearestEnemy.position;
      actionLabel = `Finishing ${nearestEnemy.name}`;
    } else if (nearestEnemy && nearestEnemyDist <= 5) {
      mode = "flee";
      targetPos = nearestEnemy.position;
      actionLabel = `Outmaneuvering ${nearestEnemy.name}`;
    } else {
      mode = "scavenge";
      actionLabel = "Scavenging Resources";
    }
  }

  // Pick best resource if in heal, fortify, or scavenge mode
  if (mode === "heal" || mode === "fortify" || mode === "scavenge") {
    let bestResScore = -Infinity;
    let chosenResource: Resource | null = null;

    for (const res of resources) {
      const d = Math.max(1, manhattanDistance(ai.position, res.position));
      let valueWeight = 50;

      if (mode === "heal") {
        if (res.type === "medkit") valueWeight = 180;
        else if (res.type === "food") valueWeight = 140;
        else if (res.type === "supply_crate") valueWeight = 120;
        else valueWeight = 30;
      } else if (mode === "fortify") {
        if (res.type === "armor") valueWeight = 160;
        else if (res.type === "supply_crate") valueWeight = 150;
        else if (res.type === "food" && ai.hp < 80) valueWeight = 100;
        else valueWeight = 45;
      } else {
        // Explorer scavenge
        if (res.type === "supply_crate") valueWeight = 165;
        else if (res.type === "medkit" && ai.hp < 90) valueWeight = 135;
        else if (res.type === "armor" && ai.armor < 80) valueWeight = 115;
        else valueWeight = 95;
      }

      // Explorers & Defensive AIs avoid resources guarded closely by dangerous enemies
      let dangerPenalty = 0;
      if (nearestEnemy && behavior !== "aggressive") {
        const enemyDistToRes = manhattanDistance(
          nearestEnemy.position,
          res.position
        );
        if (enemyDistToRes <= 3) dangerPenalty = 65;
      }

      const score = valueWeight - d * 4.2 - dangerPenalty;
      if (score > bestResScore) {
        bestResScore = score;
        chosenResource = res;
      }
    }

    if (chosenResource) {
      targetPos = chosenResource.position;
      const resLabel =
        chosenResource.type === "food"
          ? "Food"
          : chosenResource.type === "armor"
          ? "Armor"
          : chosenResource.type === "medkit"
          ? "Medkit"
          : "Supply Crate";
      actionLabel = `Seeking ${resLabel}`;
    } else if (nearestEnemy) {
      mode = "hunt";
      targetPos = nearestEnemy.position;
      actionLabel = `Engaging ${nearestEnemy.name}`;
    }
  }

  // Score all 4 possible moves
  let bestDirection: Direction = ai.lastDirection;
  let bestMoveUtility = -Infinity;

  for (const dir of ALL_DIRECTIONS) {
    const delta = DIRECTION_DELTAS[dir];
    const nextX = ai.position.x + delta.x;
    const nextY = ai.position.y + delta.y;

    // Out of bounds check
    if (nextX < 0 || nextX >= g || nextY < 0 || nextY >= g) {
      continue;
    }

    const nextPos: Position = { x: nextX, y: nextY };
    let utility = 0;

    if (mode === "flee" && nearestEnemy) {
      // Maximize distance from nearest enemy
      const distFromThreat = manhattanDistance(nextPos, nearestEnemy.position);
      utility += distFromThreat * 15;

      // Avoid corners when fleeing
      const edgeDist = Math.min(nextX, nextY, g - 1 - nextX, g - 1 - nextY);
      utility += Math.min(edgeDist, 5) * 3;

      // Bonus if stepping onto food/armor while fleeing
      const resOnTile = resources.find((r) => isSamePosition(r.position, nextPos));
      if (resOnTile) utility += 45;
    } else {
      // Minimize distance to targetPos
      const distToTarget = manhattanDistance(nextPos, targetPos);
      utility -= distToTarget * 12;

      // Immediate bonus if nextPos has a helpful resource
      const resOnTile = resources.find((r) => isSamePosition(r.position, nextPos));
      if (resOnTile) {
        utility += 35;
      }

      // If another player is directly on nextPos
      const enemyOnTile = otherPlayers.find((p) =>
        isSamePosition(p.position, nextPos)
      );
      if (enemyOnTile) {
        if (mode === "hunt" || ai.hp > enemyOnTile.hp || enemyOnTile.hp <= 25) {
          utility += 85; // Strike!
        } else {
          utility -= 90; // Don't accidentally walk into a stronger enemy while scavenging
        }
      }
    }

    // Momentum bonus to prevent jittering back and forth
    if (dir === ai.lastDirection) {
      utility += 2.5;
    }

    // Small random tie-breaker
    utility += Math.random() * 2;

    if (utility > bestMoveUtility) {
      bestMoveUtility = utility;
      bestDirection = dir;
    }
  }

  return { direction: bestDirection, actionLabel };
}

/**
 * Checks whether the game has reached a terminal Victory / Game Over condition.
 */
export function evaluateVictoryState(state: GameState): GameState {
  if (state.status === "game_over") return state;

  const alivePlayers = state.players.filter((p) => p.isAlive);
  const deadPlayers = state.players.filter((p) => !p.isAlive);

  // Mode 1: "first_elimination" -> First player to reach 0 HP loses the game immediately, highest score / survivors win
  if (state.config.gameMode === "first_elimination" && deadPlayers.length >= 1) {
    const sortedSurvivors = [...alivePlayers].sort(
      (a, b) => b.score + b.hp * 2 - (a.score + a.hp * 2)
    );
    const winner = sortedSurvivors[0] || state.players[0];

    return {
      ...state,
      status: "game_over",
      winner,
      events: [
        {
          id: createId("evt"),
          timestamp: state.elapsedSeconds,
          type: "arena" as const,
          message: `🏆 SUDDEN DEATH OVER! ${deadPlayers[0].name} reached 0 HP first. ${winner.name} claims victory!`,
        },
        ...state.events,
      ].slice(0, 40),
    };
  }

  // Mode 2: "last_survivor" (Standard Hunger Games Battle Royale) -> Last survivor standing wins!
  if (alivePlayers.length <= 1) {
    const winner = alivePlayers[0] || state.players[0];
    return {
      ...state,
      status: "game_over",
      winner,
      events: [
        {
          id: createId("evt"),
          timestamp: state.elapsedSeconds,
          type: "arena" as const,
          message: `👑 VICTORY! ${winner.name} (District ${winner.district}) is the last survivor of the Hunger Games!`,
        },
        ...state.events,
      ].slice(0, 40),
    };
  }

  return state;
}

/**
 * Advances the game simulation by 1 tick:
 * - Moves all living AI players intelligently
 * - Spawns periodic resources & Capitol Supply Drops
 * - Cleans up expired floating visual effects
 */
export function stepGameTick(state: GameState): GameState {
  if (state.status !== "running") return state;

  let nextState: GameState = {
    ...state,
    tickCount: state.tickCount + 1,
    effects: state.effects.filter((fx) => Date.now() - fx.createdAt < 900),
  };

  // Process each AI player's decision and move
  for (const player of nextState.players) {
    if (nextState.status !== "running") break;
    if (!player.isAI || !player.isAlive) continue;

    const { direction, actionLabel } = computeAIMove(player, nextState);
    // Update AI's action label before moving
    nextState = {
      ...nextState,
      players: nextState.players.map((p) =>
        p.id === player.id ? { ...p, lastAction: actionLabel } : p
      ),
    };
    nextState = moveOrAttackPlayer(nextState, player.id, direction);
  }

  // Replenish resources if below threshold or every 8 ticks
  if (
    nextState.status === "running" &&
    nextState.tickCount % 7 === 0 &&
    nextState.resources.length < nextState.config.maxResources
  ) {
    const isCornucopiaDrop = nextState.tickCount % 35 === 0;
    const newRes = spawnResource(
      nextState.config.gridSize,
      nextState.players,
      nextState.resources,
      nextState.tickCount,
      isCornucopiaDrop
    );
    if (newRes) {
      const updatedResources = [...nextState.resources, newRes];
      let updatedEvents = nextState.events;

      if (isCornucopiaDrop) {
        updatedEvents = [
          {
            id: createId("evt"),
            timestamp: nextState.elapsedSeconds,
            type: "arena" as const,
            message: `🪂 CAPITOL FEAST DROP! High-value supplies have parachuted into the central Cornucopia!`,
          },
          ...updatedEvents,
        ].slice(0, 40);
      }

      nextState = {
        ...nextState,
        resources: updatedResources,
        events: updatedEvents,
      };
    }
  }

  return nextState;
}
