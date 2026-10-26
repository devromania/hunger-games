"use client";

import React, { useMemo } from "react";
import { Play, RotateCcw, Skull, Sparkles, Trophy } from "lucide-react";
import { GameState, Player, Resource } from "@/types/game";
import { isCornucopiaTile } from "@/services/gameEngine";

interface GameFieldProps {
  gameState: GameState;
  onStart: () => void;
  onReset: () => void;
}

const RESOURCE_VISUALS: Record<
  Resource["type"],
  { symbol: string; bg: string; border: string; label: string }
> = {
  food: {
    symbol: "🍎",
    bg: "bg-emerald-500/30",
    border: "border-emerald-400/80",
    label: "Food (+25 HP)",
  },
  armor: {
    symbol: "🛡️",
    bg: "bg-cyan-500/30",
    border: "border-cyan-400/80",
    label: "Armor (+25 DEF)",
  },
  medkit: {
    symbol: "💊",
    bg: "bg-green-500/40",
    border: "border-green-300",
    label: "Medkit (+45 HP)",
  },
  supply_crate: {
    symbol: "🎁",
    bg: "bg-amber-500/40",
    border: "border-amber-300",
    label: "Cornucopia Crate (+HP/DEF/ATK)",
  },
};

export const GameField: React.FC<GameFieldProps> = ({
  gameState,
  onStart,
  onReset,
}) => {
  const { gridSize } = gameState.config;
  const cellPercent = 100 / gridSize; // 2% for 50x50 grid

  // Memoize the 50x50 (2,500 cells) arena grid background so ticks only re-render entities
  const staticGridCells = useMemo(() => {
    const cells: React.ReactNode[] = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const isCornucopia = isCornucopiaTile(x, y, gridSize);
        const isCenterHorn =
          x === Math.floor(gridSize / 2) && y === Math.floor(gridSize / 2);
        const isSectorLine = x % 10 === 0 || y % 10 === 0;

        cells.push(
          <div
            key={`${x}-${y}`}
            className={`border-[0.5px] ${
              isCenterHorn
                ? "bg-amber-500/30 border-amber-400/60"
                : isCornucopia
                ? "bg-amber-500/10 border-amber-500/25"
                : isSectorLine
                ? "bg-slate-900/70 border-slate-700/40"
                : "bg-slate-950/60 border-slate-800/35"
            }`}
          />
        );
      }
    }
    return cells;
  }, [gridSize]);

  const humanPlayer = gameState.players.find((p) => !p.isAI);

  return (
    <div className="relative w-full aspect-square max-w-[720px] mx-auto bg-slate-950 rounded-xl border-2 border-slate-800 shadow-2xl overflow-hidden select-none">
      {/* 50x50 Static Terrain Grid Layer */}
      <div
        className="w-full h-full grid"
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
        }}
      >
        {staticGridCells}
      </div>

      {/* Central Cornucopia Watermark Label */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="w-[14%] h-[14%] rounded-lg border border-dashed border-amber-500/40 flex items-center justify-center">
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-amber-400/50 text-center leading-none">
            Cornucopia
          </span>
        </div>
      </div>

      {/* Coordinate Compass Markers */}
      <div className="pointer-events-none absolute top-1.5 left-2 text-[10px] font-mono text-slate-500">
        (0,0) NW Sector
      </div>
      <div className="pointer-events-none absolute top-1.5 right-2 text-[10px] font-mono text-slate-500">
        NE (49,0)
      </div>
      <div className="pointer-events-none absolute bottom-1.5 left-2 text-[10px] font-mono text-slate-500">
        SW (0,49)
      </div>
      <div className="pointer-events-none absolute bottom-1.5 right-2 text-[10px] font-mono text-slate-500">
        SE (49,49)
      </div>

      {/* Resources Layer */}
      <div className="pointer-events-none absolute inset-0">
        {gameState.resources.map((res) => {
          const visual = RESOURCE_VISUALS[res.type];
          return (
            <div
              key={res.id}
              title={visual.label}
              style={{
                left: `${res.position.x * cellPercent}%`,
                top: `${res.position.y * cellPercent}%`,
                width: `${cellPercent}%`,
                height: `${cellPercent}%`,
              }}
              className="absolute flex items-center justify-center"
            >
              <div
                className={`w-[150%] h-[150%] shrink-0 rounded-full border ${visual.bg} ${visual.border} flex items-center justify-center text-[9px] sm:text-[11px] shadow-sm transition-transform`}
              >
                {visual.symbol}
              </div>
            </div>
          );
        })}
      </div>

      {/* Players & AI Tributes Layer */}
      <div className="pointer-events-none absolute inset-0">
        {gameState.players.map((player: Player) => {
          const isRecentlyHit =
            player.lastHitTick !== undefined &&
            gameState.tickCount - player.lastHitTick <= 2;

          if (!player.isAlive) {
            // Render Tombstone marker at elimination site
            return (
              <div
                key={player.id}
                style={{
                  left: `${player.position.x * cellPercent}%`,
                  top: `${player.position.y * cellPercent}%`,
                  width: `${cellPercent}%`,
                  height: `${cellPercent}%`,
                }}
                className="absolute flex items-center justify-center opacity-50 z-10"
              >
                <div className="w-4 h-4 rounded-full bg-slate-900/90 border border-rose-500/50 flex items-center justify-center text-[10px]">
                  💀
                </div>
              </div>
            );
          }

          const hpPercent = Math.max(
            0,
            Math.min(100, (player.hp / player.maxHp) * 100)
          );

          return (
            <div
              key={player.id}
              style={{
                left: `${player.position.x * cellPercent}%`,
                top: `${player.position.y * cellPercent}%`,
                width: `${cellPercent}%`,
                height: `${cellPercent}%`,
              }}
              className="absolute flex items-center justify-center z-20 transition-all duration-100 ease-linear"
            >
              {/* Floating Name & Mini HP Bar above Player */}
              <div className="absolute bottom-[135%] left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none whitespace-nowrap z-30">
                <span
                  className="text-[9px] sm:text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-950/90 border shadow-sm leading-tight"
                  style={{
                    color: player.color,
                    borderColor: `${player.color}66`,
                  }}
                >
                  {player.isAI ? player.name : "YOU"}
                </span>
                <div className="w-7 sm:w-8 h-1 bg-slate-900 rounded-full overflow-hidden border border-slate-700/80 mt-0.5">
                  <div
                    className={`h-full transition-all duration-150 ${
                      hpPercent > 55
                        ? "bg-emerald-400"
                        : hpPercent > 25
                        ? "bg-amber-400"
                        : "bg-rose-500"
                    }`}
                    style={{ width: `${hpPercent}%` }}
                  />
                </div>
              </div>

              {/* Player Token on 50x50 Grid */}
              <div
                style={{
                  backgroundColor: player.color,
                  boxShadow: `0 0 12px ${player.color}`,
                }}
                className={`w-[210%] h-[210%] shrink-0 rounded-full border-2 flex items-center justify-center text-[10px] sm:text-xs font-bold shadow-md ${
                  !player.isAI
                    ? "border-white ring-2 ring-emerald-400/70"
                    : "border-slate-950"
                } ${isRecentlyHit ? "scale-125 ring-4 ring-rose-500 bg-rose-500" : ""}`}
              >
                <span>{player.avatar}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Combat / Heal Effects Layer */}
      <div className="pointer-events-none absolute inset-0 z-30">
        {gameState.effects.map((fx) => (
          <div
            key={fx.id}
            style={{
              left: `${fx.position.x * cellPercent}%`,
              top: `${Math.max(2, fx.position.y * cellPercent - 3)}%`,
              color: fx.color,
            }}
            className="absolute -translate-x-1/2 -translate-y-full text-[10px] sm:text-xs font-extrabold px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-700 shadow-lg animate-bounce whitespace-nowrap"
          >
            {fx.text}
          </div>
        ))}
      </div>

      {/* Spectator Notice if Human Player is Eliminated While Match Continues */}
      {gameState.status === "running" && humanPlayer && !humanPlayer.isAlive && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 bg-rose-950/90 border border-rose-500/60 text-rose-100 px-4 py-2 rounded-lg shadow-xl flex items-center gap-3 backdrop-blur-md">
          <Skull className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="text-xs">
            <span className="font-bold text-rose-300">You Were Eliminated!</span>{" "}
            Spectating remaining AI Tributes...
          </div>
          <button
            onClick={onReset}
            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded transition"
          >
            New Match
          </button>
        </div>
      )}

      {/* IDLE OVERLAY */}
      {gameState.status === "idle" && (
        <div className="absolute inset-0 z-40 bg-slate-950/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-amber-400" />
            </div>
            <h2 className="text-xl font-extrabold text-white mb-1">
              Enter the 50×50 Capitol Arena
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mb-5 leading-relaxed">
              Control <span className="text-emerald-400 font-bold">Katniss (🏹)</span> using{" "}
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-xs font-mono">
                WASD
              </kbd>{" "}
              or{" "}
              <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-600 rounded text-xs font-mono">
                Arrow Keys
              </kbd>
              . Collect Food (<span className="text-emerald-400">🍎</span>) to heal, Armor (
              <span className="text-cyan-400">🛡️</span>) to block damage, and strike rival AI
              tributes by moving into them!
            </p>
            <button
              onClick={onStart}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition"
            >
              <Play className="w-4 h-4 fill-current" />
              Launch Hunger Games
            </button>
          </div>
        </div>
      )}

      {/* PAUSED OVERLAY */}
      {gameState.status === "paused" && (
        <div className="absolute inset-0 z-40 bg-slate-950/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-900/95 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-extrabold text-cyan-400 uppercase tracking-wider mb-1">
              Arena Simulation Paused
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Press Spacebar or click Resume to continue the battle.
            </p>
            <div className="flex gap-3">
              <button
                onClick={onStart}
                className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition"
              >
                <Play className="w-4 h-4 fill-current" />
                Resume
              </button>
              <button
                onClick={onReset}
                className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase flex items-center justify-center gap-1.5 border border-slate-700 transition"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER OVERLAY */}
      {gameState.status === "game_over" && (
        <div className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-8 h-8 text-amber-400" />
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-amber-400 mb-1">
              74th Hunger Games Victor
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-1 flex items-center justify-center gap-2">
              <span>{gameState.winner?.avatar}</span>
              <span>{gameState.winner?.name}</span>
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              District {gameState.winner?.district} •{" "}
              {gameState.winner?.isAI
                ? `AI (${gameState.winner?.behavior?.toUpperCase()})`
                : "Human Tribute"}
            </p>

            {gameState.eliminatedFirst && (
              <div className="bg-rose-950/50 border border-rose-800/50 rounded-lg px-3 py-2 mb-4 text-xs text-rose-200">
                <span className="font-bold text-rose-400">First Eliminated (0 HP):</span>{" "}
                {gameState.eliminatedFirst.name} (District{" "}
                {gameState.eliminatedFirst.district})
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 mb-5 text-center">
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400 uppercase">Winner Score</div>
                <div className="text-sm font-mono font-bold text-amber-400">
                  {gameState.winner?.score.toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400 uppercase">Eliminations</div>
                <div className="text-sm font-mono font-bold text-rose-400">
                  {gameState.winner?.kills}
                </div>
              </div>
              <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2">
                <div className="text-[10px] text-slate-400 uppercase">Remaining HP</div>
                <div className="text-sm font-mono font-bold text-emerald-400">
                  {gameState.winner?.hp} / {gameState.winner?.maxHp}
                </div>
              </div>
            </div>

            <button
              onClick={onStart}
              className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-extrabold text-sm tracking-wide uppercase flex items-center justify-center gap-2 shadow-lg transition"
            >
              <RotateCcw className="w-4 h-4" />
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
