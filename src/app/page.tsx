"use client";

import React, { useState } from "react";
import { Box, Grid, Volume2, VolumeX } from "lucide-react";
import { useHungerGames } from "@/hooks/useHungerGames";
import { GameHeader } from "@/components/GameHeader";
import { GameField } from "@/components/GameField";
import { GameField3D } from "@/components/GameField3D";
import { PlayerUI } from "@/components/PlayerUI";
import { GameControls } from "@/components/GameControls";

export default function HungerGamesPage() {
  const {
    gameState,
    config,
    humanPlayer,
    aliveCount,
    highScore,
    isMuted,
    volume,
    ambientEnabled,
    startGame,
    togglePlayPause,
    resetGame,
    updateConfig,
    moveHumanPlayer,
    toggleMute,
    changeVolume,
    toggleAmbient,
  } = useHungerGames();

  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");

  return (
    <main className="min-h-screen w-full max-w-[1640px] mx-auto px-3 sm:px-6 py-4 flex flex-col gap-4">
      {/* Top Status & Metrics Header */}
      <GameHeader
        status={gameState.status}
        elapsedSeconds={gameState.elapsedSeconds}
        aliveCount={aliveCount}
        totalPlayers={gameState.players.length}
        humanScore={humanPlayer?.score ?? 0}
        highScore={highScore}
      />

      {/* Responsive 3-Column Arena Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left Column: Controls, D-Pad, Audio Studio, Settings & Resource Legend */}
        <section className="xl:col-span-3 order-2 xl:order-1">
          <GameControls
            status={gameState.status}
            config={config}
            isHumanAlive={Boolean(humanPlayer?.isAlive)}
            isMuted={isMuted}
            volume={volume}
            ambientEnabled={ambientEnabled}
            onTogglePlayPause={togglePlayPause}
            onReset={resetGame}
            onUpdateConfig={updateConfig}
            onMove={moveHumanPlayer}
            onToggleMute={toggleMute}
            onChangeVolume={changeVolume}
            onToggleAmbient={toggleAmbient}
          />
        </section>

        {/* Center Column: 3D WebGL Arena (or 2D Tactical Grid) */}
        <section className="xl:col-span-5 order-1 xl:order-2 flex flex-col items-center justify-center gap-2.5">
          {/* 3D / 2D Engine Switcher & Quick Audio Pill */}
          <div className="w-full max-w-[760px] flex flex-wrap items-center justify-between gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 shadow-md">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>Vizualizare Arenă (50×50)</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                title="Comută Sunetul (M)"
                className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition ${
                  isMuted
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                    : "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                }`}
              >
                {isMuted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    Mute
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5" />
                    Audio ON
                  </>
                )}
              </button>

              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setViewMode("3d")}
                  className={`px-3 py-1 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition ${
                    viewMode === "3d"
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  3D Spectacular
                </button>
                <button
                  onClick={() => setViewMode("2d")}
                  className={`px-3 py-1 rounded-md text-xs font-extrabold flex items-center gap-1.5 transition ${
                    viewMode === "2d"
                      ? "bg-emerald-500 text-slate-950 shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Grid className="w-3.5 h-3.5" />
                  2D Grid
                </button>
              </div>
            </div>
          </div>

          {viewMode === "3d" ? (
            <GameField3D
              gameState={gameState}
              onStart={startGame}
              onReset={() => resetGame()}
              onMove={moveHumanPlayer}
            />
          ) : (
            <GameField
              gameState={gameState}
              onStart={startGame}
              onReset={() => resetGame()}
            />
          )}
        </section>

        {/* Right Column: Live Tribute Telemetry & Capitol Event Log */}
        <section className="xl:col-span-4 order-3">
          <PlayerUI
            players={gameState.players}
            events={gameState.events}
          />
        </section>
      </div>
    </main>
  );
}
