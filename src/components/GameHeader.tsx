"use client";

import React from "react";
import { Flame, ShieldAlert, Timer, Trophy, Users } from "lucide-react";
import { GameStatus } from "@/types/game";

interface GameHeaderProps {
  status: GameStatus;
  elapsedSeconds: number;
  aliveCount: number;
  totalPlayers: number;
  humanScore: number;
  highScore: number;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export const GameHeader: React.FC<GameHeaderProps> = ({
  status,
  elapsedSeconds,
  aliveCount,
  totalPlayers,
  humanScore,
  highScore,
}) => {
  const statusBadge = {
    idle: {
      label: "AWAITING LAUNCH",
      classes: "bg-amber-500/15 text-amber-400 border-amber-500/40",
    },
    running: {
      label: "ARENA LIVE",
      classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 animate-pulse",
    },
    paused: {
      label: "ARENA PAUSED",
      classes: "bg-cyan-500/15 text-cyan-400 border-cyan-500/40",
    },
    game_over: {
      label: "MATCH CONCLUDED",
      classes: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    },
  }[status];

  return (
    <header className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:px-5 sm:py-3.5 shadow-lg backdrop-blur-md flex flex-col lg:flex-row items-center justify-between gap-3">
      {/* Brand & Title */}
      <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-start">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 via-orange-600 to-red-700 flex items-center justify-center shadow-md shadow-amber-500/20 border border-amber-400/30">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-wider uppercase bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">
                The Hunger Games
              </h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border tracking-wider ${statusBadge.classes}`}
              >
                {statusBadge.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              50×50 Tactical Survival Arena • Collect Food &amp; Armor • Outlast All Tributes
            </p>
          </div>
        </div>
      </div>

      {/* Live Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full lg:w-auto">
        {/* Match Timer */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-lg px-3 py-1.5 flex items-center gap-2.5">
          <Timer className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Arena Timer
            </div>
            <div className="text-sm sm:text-base font-mono font-bold text-slate-100">
              {formatTime(elapsedSeconds)}
            </div>
          </div>
        </div>

        {/* Survivors Count */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-lg px-3 py-1.5 flex items-center gap-2.5">
          <Users className="w-4 h-4 text-emerald-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Survivors
            </div>
            <div className="text-sm sm:text-base font-mono font-bold text-slate-100">
              {aliveCount} <span className="text-xs text-slate-500">/ {totalPlayers}</span>
            </div>
          </div>
        </div>

        {/* Player Score */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-lg px-3 py-1.5 flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-cyan-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Your Score
            </div>
            <div className="text-sm sm:text-base font-mono font-bold text-cyan-300">
              {humanScore.toLocaleString()}
            </div>
          </div>
        </div>

        {/* High Score */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-lg px-3 py-1.5 flex items-center gap-2.5">
          <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Best Score
            </div>
            <div className="text-sm sm:text-base font-mono font-bold text-amber-300">
              {highScore.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
