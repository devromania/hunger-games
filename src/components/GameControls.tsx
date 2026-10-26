"use client";

import React from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Gamepad2,
  Info,
  Music,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Direction, GameConfig, GameMode, GameStatus } from "@/types/game";
import { soundEngine } from "@/services/soundEngine";

interface GameControlsProps {
  status: GameStatus;
  config: GameConfig;
  isHumanAlive: boolean;
  isMuted: boolean;
  volume: number;
  ambientEnabled: boolean;
  onTogglePlayPause: () => void;
  onReset: (override?: Partial<GameConfig>) => void;
  onUpdateConfig: (partial: Partial<GameConfig>) => void;
  onMove: (direction: Direction) => void;
  onToggleMute: () => void;
  onChangeVolume: (val: number) => void;
  onToggleAmbient: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  status,
  config,
  isHumanAlive,
  isMuted,
  volume,
  ambientEnabled,
  onTogglePlayPause,
  onReset,
  onUpdateConfig,
  onMove,
  onToggleMute,
  onChangeVolume,
  onToggleAmbient,
}) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Primary Action Buttons */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
          <Gamepad2 className="w-4 h-4 text-emerald-400" />
          Control Arenă &amp; Deplasare
        </h2>

        <div className="flex gap-2.5 mb-4">
          <button
            onClick={onTogglePlayPause}
            className={`flex-1 py-2.5 px-4 rounded-lg font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-md ${
              status === "running"
                ? "bg-amber-500 hover:bg-amber-400 text-slate-950"
                : "bg-emerald-500 hover:bg-emerald-400 text-slate-950"
            }`}
          >
            {status === "running" ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                Pauză (Space)
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                {status === "paused"
                  ? "Continuă"
                  : status === "game_over"
                  ? "Joacă Din Nou"
                  : "Start Joc"}
              </>
            )}
          </button>

          <button
            onClick={() => onReset()}
            className="py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-slate-700 transition"
            title="Reset Arena (R)"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>

        {/* Directional Pad (Touch / Mouse / Keyboard visual) */}
        <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-3 flex flex-col items-center">
          <div className="text-[11px] text-slate-400 font-medium mb-2 flex items-center gap-1.5">
            <span>Deplasare:</span>
            <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono text-slate-300">
              WASD
            </kbd>
            <span>sau</span>
            <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono text-slate-300">
              Săgeți
            </kbd>
          </div>

          <div className="grid grid-cols-3 gap-1.5 w-36">
            <div />
            <button
              onClick={() => onMove("up")}
              disabled={!isHumanAlive}
              aria-label="Move Up"
              className="h-10 rounded-lg bg-slate-800 hover:bg-emerald-500/20 hover:border-emerald-500/50 active:scale-95 border border-slate-700 flex flex-col items-center justify-center text-slate-200 disabled:opacity-40 transition"
            >
              <ArrowUp className="w-4 h-4" />
              <span className="text-[9px] font-mono text-slate-400">W</span>
            </button>
            <div />

            <button
              onClick={() => onMove("left")}
              disabled={!isHumanAlive}
              aria-label="Move Left"
              className="h-10 rounded-lg bg-slate-800 hover:bg-emerald-500/20 hover:border-emerald-500/50 active:scale-95 border border-slate-700 flex flex-col items-center justify-center text-slate-200 disabled:opacity-40 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-[9px] font-mono text-slate-400">A</span>
            </button>
            <button
              onClick={() => onMove("down")}
              disabled={!isHumanAlive}
              aria-label="Move Down"
              className="h-10 rounded-lg bg-slate-800 hover:bg-emerald-500/20 hover:border-emerald-500/50 active:scale-95 border border-slate-700 flex flex-col items-center justify-center text-slate-200 disabled:opacity-40 transition"
            >
              <ArrowDown className="w-4 h-4" />
              <span className="text-[9px] font-mono text-slate-400">S</span>
            </button>
            <button
              onClick={() => onMove("right")}
              disabled={!isHumanAlive}
              aria-label="Move Right"
              className="h-10 rounded-lg bg-slate-800 hover:bg-emerald-500/20 hover:border-emerald-500/50 active:scale-95 border border-slate-700 flex flex-col items-center justify-center text-slate-200 disabled:opacity-40 transition"
            >
              <ArrowRight className="w-4 h-4" />
              <span className="text-[9px] font-mono text-slate-400">D</span>
            </button>
          </div>
        </div>
      </div>

      {/* Audio & Sound Effects Studio Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
            {isMuted ? (
              <VolumeX className="w-4 h-4 text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-400" />
            )}
            Sunete &amp; Efecte Audio (Web Audio)
          </h2>
          <span className="text-[10px] font-mono text-slate-500">Tasta M</span>
        </div>

        <div className="space-y-3 text-xs">
          {/* Mute & Ambient Toggle Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onToggleMute}
              className={`py-2 px-3 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition ${
                !isMuted
                  ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                  : "bg-rose-500/15 border-rose-500/50 text-rose-300"
              }`}
            >
              {isMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  Sunet Oprit
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5" />
                  Efecte Active
                </>
              )}
            </button>

            <button
              onClick={onToggleAmbient}
              className={`py-2 px-3 rounded-lg border font-bold flex items-center justify-center gap-1.5 transition ${
                ambientEnabled && !isMuted
                  ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-300"
                  : "bg-slate-950 border-slate-800 text-slate-400"
              }`}
            >
              <Music className="w-3.5 h-3.5" />
              Ambianță {ambientEnabled ? "ON" : "OFF"}
            </button>
          </div>

          {/* Volume Slider */}
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2.5">
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Volum General</span>
              <span className="font-mono font-bold text-amber-400">
                {isMuted ? "0%" : `${Math.round(volume * 100)}%`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
          </div>

          {/* Soundboard Preview Buttons */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1.5">
              Testează Efectele Sonore din Arenă:
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => soundEngine.playMockingjayWhistle()}
                className="py-1.5 px-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-amber-300 font-medium transition flex items-center justify-center gap-1"
              >
                🐦 Mockingjay
              </button>
              <button
                onClick={() => soundEngine.playCannonBoom()}
                className="py-1.5 px-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-rose-300 font-medium transition flex items-center justify-center gap-1"
              >
                💥 Tun Eliminare
              </button>
              <button
                onClick={() => soundEngine.playCombatHit(true)}
                className="py-1.5 px-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-cyan-300 font-medium transition flex items-center justify-center gap-1"
              >
                ⚔️ Lovitură / Scut
              </button>
              <button
                onClick={() => soundEngine.playResourcePickup("supply_crate")}
                className="py-1.5 px-2 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-emerald-300 font-medium transition flex items-center justify-center gap-1"
              >
                🎁 Cutie Loot
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Arena Settings Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-3">
          <Settings2 className="w-4 h-4 text-cyan-400" />
          Configurare Joc
        </h2>

        <div className="space-y-3 text-xs">
          {/* AI Opponents Count (3 or 4) */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Număr Tributuri AI
            </label>
            <div className="grid grid-cols-2 gap-2">
              {([3, 4] as const).map((count) => (
                <button
                  key={count}
                  onClick={() => onReset({ aiCount: count })}
                  className={`py-1.5 px-3 rounded-lg border font-semibold transition ${
                    config.aiCount === count
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {count} Jucători AI
                </button>
              ))}
            </div>
          </div>

          {/* Simulation Speed */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Viteză Simulare AI
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: "Tactic", ms: 320 },
                { label: "Standard", ms: 220 },
                { label: "Blitz", ms: 135 },
              ].map((spd) => (
                <button
                  key={spd.label}
                  onClick={() => onUpdateConfig({ tickRateMs: spd.ms })}
                  className={`py-1.5 px-2 rounded-lg border font-semibold transition ${
                    config.tickRateMs === spd.ms
                      ? "bg-amber-500/20 border-amber-500 text-amber-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {spd.label}
                </button>
              ))}
            </div>
          </div>

          {/* Victory Mode */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">
              Regulă Victorie
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  mode: "last_survivor" as GameMode,
                  label: "Ultimul Supraviețuitor",
                  desc: "Câștigă ultimul rămas în viață",
                },
                {
                  mode: "first_elimination" as GameMode,
                  label: "Sudden Death",
                  desc: "Primul la 0 HP încheie meciul",
                },
              ].map((item) => (
                <button
                  key={item.mode}
                  onClick={() => onUpdateConfig({ gameMode: item.mode })}
                  className={`p-2 rounded-lg border text-left transition ${
                    config.gameMode === item.mode
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  <div className="font-bold text-[11px]">{item.label}</div>
                  <div className="text-[10px] opacity-80">{item.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Resource & Combat Guide */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-lg">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2 mb-2.5">
          <Info className="w-4 h-4 text-amber-400" />
          Resurse &amp; Reguli Arenă
        </h2>

        <div className="grid grid-cols-2 gap-2 text-xs mb-3">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 flex items-center gap-2">
            <span className="text-base">🍎</span>
            <div>
              <div className="font-bold text-emerald-400 text-[11px]">Hrană</div>
              <div className="text-[10px] text-slate-400">+25 HP &amp; +50 Scor</div>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 flex items-center gap-2">
            <span className="text-base">🛡️</span>
            <div>
              <div className="font-bold text-cyan-400 text-[11px]">Armură</div>
              <div className="text-[10px] text-slate-400">+25 Scut &amp; +60 Scor</div>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 flex items-center gap-2">
            <span className="text-base">💊</span>
            <div>
              <div className="font-bold text-green-400 text-[11px]">Medkit</div>
              <div className="text-[10px] text-slate-400">+45 HP &amp; +100 Scor</div>
            </div>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 flex items-center gap-2">
            <span className="text-base">🎁</span>
            <div>
              <div className="font-bold text-amber-400 text-[11px]">Cutie Capitoliu</div>
              <div className="text-[10px] text-slate-400">+3 ATK, +HP &amp; +Scut</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
