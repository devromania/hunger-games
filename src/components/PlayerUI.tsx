"use client";

import React from "react";
import {
  Activity,
  Award,
  Compass,
  Crosshair,
  Heart,
  Radio,
  Shield,
  Skull,
  Swords,
} from "lucide-react";
import { AIBehavior, CombatEvent, Player } from "@/types/game";
import { formatTime } from "@/components/GameHeader";

interface PlayerUIProps {
  players: Player[];
  events: CombatEvent[];
}

const BEHAVIOR_BADGES: Record<
  AIBehavior,
  { label: string; classes: string; icon: React.ReactNode }
> = {
  aggressive: {
    label: "Aggressive",
    classes: "bg-rose-500/15 text-rose-400 border-rose-500/40",
    icon: <Crosshair className="w-3 h-3" />,
  },
  defensive: {
    label: "Defensive",
    classes: "bg-amber-500/15 text-amber-400 border-amber-500/40",
    icon: <Shield className="w-3 h-3" />,
  },
  explorer: {
    label: "Explorer",
    classes: "bg-purple-500/15 text-purple-400 border-purple-500/40",
    icon: <Compass className="w-3 h-3" />,
  },
};

export const PlayerUI: React.FC<PlayerUIProps> = ({ players, events }) => {
  // Sort so Human Player is always top, followed by alive players by score, then eliminated
  const sortedPlayers = [...players].sort((a, b) => {
    if (!a.isAI) return -1;
    if (!b.isAI) return 1;
    if (a.isAlive !== b.isAlive) return a.isAlive ? -1 : 1;
    return b.score - a.score;
  });

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Tribute Status Cards */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            Tribute Telemetry &amp; AI Status
          </h2>
          <span className="text-[11px] font-mono text-slate-400">
            {players.filter((p) => p.isAlive).length} Alive
          </span>
        </div>

        <div className="space-y-2.5">
          {sortedPlayers.map((player) => {
            const hpPct = Math.max(
              0,
              Math.min(100, (player.hp / player.maxHp) * 100)
            );
            const armorPct = Math.max(
              0,
              Math.min(100, (player.armor / player.maxArmor) * 100)
            );
            const behaviorBadge =
              player.isAI && player.behavior
                ? BEHAVIOR_BADGES[player.behavior]
                : null;

            return (
              <div
                key={player.id}
                className={`rounded-lg border p-3 transition-all ${
                  !player.isAlive
                    ? "bg-slate-950/40 border-slate-800/60 opacity-60"
                    : !player.isAI
                    ? "bg-slate-950/95 border-emerald-500/50 shadow-md shadow-emerald-950/30"
                    : "bg-slate-950/80 border-slate-800"
                }`}
              >
                {/* Header Row: Avatar, Name, District, Behavior Badge, Score */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      style={{
                        backgroundColor: `${player.color}22`,
                        borderColor: player.color,
                      }}
                      className="w-7 h-7 rounded-full border flex items-center justify-center text-sm shrink-0"
                    >
                      {player.isAlive ? player.avatar : "💀"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className="text-xs sm:text-sm font-bold truncate"
                          style={{ color: player.isAlive ? player.color : "#94a3b8" }}
                        >
                          {player.name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          D{player.district}
                        </span>
                        {!player.isAI && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            USER
                          </span>
                        )}
                        {behaviorBadge && (
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border flex items-center gap-1 ${behaviorBadge.classes}`}
                          >
                            {behaviorBadge.icon}
                            {behaviorBadge.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Score Pill */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1 justify-end">
                      <Award className="w-3.5 h-3.5" />
                      {player.score.toLocaleString()}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      ({player.position.x}, {player.position.y})
                    </div>
                  </div>
                </div>

                {/* Health & Armor Bars */}
                <div className="grid grid-cols-2 gap-2.5 mb-2">
                  {/* HP Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-0.5">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Heart className="w-3 h-3 text-rose-400" /> HP
                      </span>
                      <span
                        className={
                          hpPct > 50
                            ? "text-emerald-400 font-bold"
                            : hpPct > 25
                            ? "text-amber-400 font-bold"
                            : "text-rose-400 font-bold"
                        }
                      >
                        {player.hp}/{player.maxHp}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-200 ${
                          hpPct > 55
                            ? "bg-emerald-500"
                            : hpPct > 25
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${hpPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Armor Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-0.5">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-cyan-400" /> ARMOR
                      </span>
                      <span className="text-cyan-400 font-bold">
                        {player.armor}/{player.maxArmor}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-cyan-500 transition-all duration-200"
                        style={{ width: `${armorPct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Row: Combat Stats & Current Tactical Intent */}
                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-800/80 text-slate-400">
                  <div className="flex items-center gap-3 font-mono">
                    <span title="Attack Power" className="flex items-center gap-1">
                      <Swords className="w-3 h-3 text-orange-400" />
                      {player.attackPower} ATK
                    </span>
                    <span title="Eliminations" className="flex items-center gap-1">
                      <Skull className="w-3 h-3 text-rose-400" />
                      {player.kills} Kills
                    </span>
                  </div>
                  <div className="text-[10px] font-medium text-slate-300 truncate max-w-[175px]">
                    {player.lastAction || "Standing by"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Capitol Arena Feed */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
            Capitol Arena Feed
          </h2>
          <span className="text-[10px] text-slate-500 uppercase font-mono">
            Live Telemetry
          </span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {events.map((evt) => {
            const badgeColor =
              evt.type === "elimination"
                ? "border-l-2 border-rose-500 bg-rose-950/30 text-rose-200"
                : evt.type === "combat"
                ? "border-l-2 border-amber-500 bg-slate-950/70 text-slate-200"
                : evt.type === "resource"
                ? "border-l-2 border-emerald-500 bg-slate-950/70 text-emerald-200"
                : "border-l-2 border-cyan-500 bg-slate-950/70 text-cyan-200";

            return (
              <div
                key={evt.id}
                className={`px-2.5 py-1.5 rounded text-xs flex items-start gap-2 ${badgeColor}`}
              >
                <span className="text-[10px] font-mono text-slate-400 shrink-0 mt-0.5">
                  [{formatTime(evt.timestamp)}]
                </span>
                <span className="leading-snug">{evt.message}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
