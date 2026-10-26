"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Direction,
  GameConfig,
  GameState,
  Player,
} from "@/types/game";
import {
  createInitialGameState,
  DEFAULT_CONFIG,
  moveOrAttackPlayer,
  stepGameTick,
} from "@/services/gameEngine";
import { soundEngine } from "@/services/soundEngine";

export function useHungerGames(initialConfig: GameConfig = DEFAULT_CONFIG) {
  const [config, setConfig] = useState<GameConfig>(initialConfig);
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState(initialConfig)
  );
  const [highScore, setHighScore] = useState<number>(0);

  // Audio state
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.75);
  const [ambientEnabled, setAmbientEnabled] = useState<boolean>(true);

  const lastMoveTimeRef = useRef<number>(0);
  const processedSoundEffectsRef = useRef<Set<string>>(new Set());
  const processedSoundEventsRef = useRef<Set<string>>(new Set());
  const prevStatusRef = useRef<GameState["status"]>("idle");

  // Load saved high score from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hunger_games_high_score");
      if (saved) setHighScore(parseInt(saved, 10) || 0);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Update high score whenever human player's score increases
  useEffect(() => {
    const human = gameState.players.find((p) => !p.isAI);
    if (human && human.score > highScore) {
      setHighScore(human.score);
      try {
        localStorage.setItem("hunger_games_high_score", String(human.score));
      } catch {
        // Ignore storage errors
      }
    }
  }, [gameState.players, highScore]);

  // React to game status transitions for Mockingjay Whistle, Ambient Drone, and Victory Fanfare
  useEffect(() => {
    const prev = prevStatusRef.current;
    const curr = gameState.status;

    if (prev !== curr) {
      if (curr === "running") {
        if (prev === "idle" || prev === "game_over") {
          soundEngine.playMockingjayWhistle();
        }
        soundEngine.startAmbientDrone();
      } else if (curr === "paused" || curr === "idle") {
        soundEngine.stopAmbientDrone();
      } else if (curr === "game_over") {
        soundEngine.stopAmbientDrone();
        soundEngine.playVictoryFanfare();
      }
      prevStatusRef.current = curr;
    }
  }, [gameState.status]);

  // Cleanup ambient sound on unmount
  useEffect(() => {
    return () => {
      soundEngine.stopAmbientDrone();
    };
  }, []);

  // Reactive Sound Effects Dispatcher for Combat, Eliminations, Resource Pickups & Parachute Drops
  useEffect(() => {
    for (const fx of gameState.effects) {
      if (processedSoundEffectsRef.current.has(fx.id)) continue;
      processedSoundEffectsRef.current.add(fx.id);

      if (fx.text.includes("ELIMINATED")) {
        soundEngine.playCannonBoom();
      } else if (fx.text.startsWith("-")) {
        soundEngine.playCombatHit(true);
      } else if (fx.text.includes("MEDKIT")) {
        soundEngine.playResourcePickup("medkit");
      } else if (fx.text.includes("CRATE")) {
        soundEngine.playResourcePickup("supply_crate");
      } else if (fx.text.includes("ARMOR")) {
        soundEngine.playResourcePickup("armor");
      } else if (fx.text.startsWith("+")) {
        soundEngine.playResourcePickup("food");
      }
    }

    for (const evt of gameState.events) {
      if (processedSoundEventsRef.current.has(evt.id)) continue;
      processedSoundEventsRef.current.add(evt.id);

      if (evt.message.includes("CAPITOL FEAST DROP")) {
        soundEngine.playSupplyDrop();
      }
    }
  }, [gameState.effects, gameState.events]);

  // Audio controls
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      soundEngine.setMuted(next);
      return next;
    });
  }, []);

  const changeVolume = useCallback((newVol: number) => {
    setVolume(newVol);
    soundEngine.setVolume(newVol);
    if (newVol > 0) {
      setIsMuted(false);
      soundEngine.setMuted(false);
    }
  }, []);

  const toggleAmbient = useCallback(() => {
    setAmbientEnabled((prev) => {
      const next = !prev;
      soundEngine.setAmbientEnabled(next, gameState.status === "running");
      return next;
    });
  }, [gameState.status]);

  // Start / Resume game
  const startGame = useCallback(() => {
    setGameState((prev) => {
      if (prev.status === "game_over") {
        processedSoundEffectsRef.current.clear();
        processedSoundEventsRef.current.clear();
        const fresh = createInitialGameState(config);
        return { ...fresh, status: "running" };
      }
      return { ...prev, status: "running" };
    });
  }, [config]);

  // Pause game
  const pauseGame = useCallback(() => {
    setGameState((prev) =>
      prev.status === "running" ? { ...prev, status: "paused" } : prev
    );
  }, []);

  // Toggle Start / Pause
  const togglePlayPause = useCallback(() => {
    setGameState((prev) => {
      if (prev.status === "running") return { ...prev, status: "paused" };
      if (prev.status === "game_over") {
        processedSoundEffectsRef.current.clear();
        processedSoundEventsRef.current.clear();
        const fresh = createInitialGameState(config);
        return { ...fresh, status: "running" };
      }
      return { ...prev, status: "running" };
    });
  }, [config]);

  // Reset game to fresh initial state
  const resetGame = useCallback(
    (overrideConfig?: Partial<GameConfig>) => {
      processedSoundEffectsRef.current.clear();
      processedSoundEventsRef.current.clear();
      const nextConfig = overrideConfig
        ? { ...config, ...overrideConfig }
        : config;
      if (overrideConfig) {
        setConfig(nextConfig);
      }
      setGameState(createInitialGameState(nextConfig));
    },
    [config]
  );

  // Update configuration (AI count, tick speed, or game mode)
  const updateConfig = useCallback((partial: Partial<GameConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...partial };
      setGameState((currState) => {
        if (
          currState.status === "idle" &&
          (partial.aiCount !== undefined || partial.gameMode !== undefined)
        ) {
          return createInitialGameState(updated);
        }
        return { ...currState, config: updated };
      });
      return updated;
    });
  }, []);

  // Move human player in 4 directions
  const moveHumanPlayer = useCallback((direction: Direction) => {
    const now = Date.now();
    if (now - lastMoveTimeRef.current < 45) return;
    lastMoveTimeRef.current = now;

    soundEngine.playStep();

    setGameState((prev) => {
      const activeState: GameState =
        prev.status === "idle" ? { ...prev, status: "running" } : prev;

      if (activeState.status !== "running") return prev;

      const human = activeState.players.find((p) => !p.isAI);
      if (!human || !human.isAlive) return prev;

      return moveOrAttackPlayer(activeState, human.id, direction);
    });
  }, []);

  // Real-time AI & World Tick Loop
  useEffect(() => {
    if (gameState.status !== "running") return;

    const interval = setInterval(() => {
      setGameState((prev) => stepGameTick(prev));
    }, config.tickRateMs);

    return () => clearInterval(interval);
  }, [gameState.status, config.tickRateMs]);

  // Real-time 1-second Match Timer Loop
  useEffect(() => {
    if (gameState.status !== "running") return;

    const timer = setInterval(() => {
      setGameState((prev) =>
        prev.status === "running"
          ? { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 }
          : prev
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.status]);

  // Keyboard Controls (WASD + Arrow Keys + Space + R + M for Mute)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      if (key === "w" || e.key === "ArrowUp") {
        e.preventDefault();
        moveHumanPlayer("up");
      } else if (key === "s" || e.key === "ArrowDown") {
        e.preventDefault();
        moveHumanPlayer("down");
      } else if (key === "a" || e.key === "ArrowLeft") {
        e.preventDefault();
        moveHumanPlayer("left");
      } else if (key === "d" || e.key === "ArrowRight") {
        e.preventDefault();
        moveHumanPlayer("right");
      } else if (e.key === " ") {
        e.preventDefault();
        togglePlayPause();
      } else if (key === "r") {
        e.preventDefault();
        resetGame();
      } else if (key === "m") {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [moveHumanPlayer, togglePlayPause, resetGame, toggleMute]);

  const humanPlayer: Player | undefined = gameState.players.find(
    (p) => !p.isAI
  );
  const aliveCount = gameState.players.filter((p) => p.isAlive).length;

  return {
    gameState,
    config,
    humanPlayer,
    aliveCount,
    highScore,
    isMuted,
    volume,
    ambientEnabled,
    startGame,
    pauseGame,
    togglePlayPause,
    resetGame,
    updateConfig,
    moveHumanPlayer,
    toggleMute,
    changeVolume,
    toggleAmbient,
  };
}
