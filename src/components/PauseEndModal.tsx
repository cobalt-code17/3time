import React from 'react';
import { BookOpen, Play, RotateCcw, ShieldCheck, Skull, Volume2, VolumeX } from 'lucide-react';
import { GameSettings, HudSnapshot } from '../game/types';

interface PauseEndModalProps {
  hud: HudSnapshot;
  settings: GameSettings;
  onUpdateSettings: (next: Partial<GameSettings>) => void;
  onResume: () => void;
  onContinueSweep: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
  onOpenCodex: () => void;
}

export const PauseEndModal: React.FC<PauseEndModalProps> = ({
  hud,
  settings,
  onUpdateSettings,
  onResume,
  onContinueSweep,
  onRestart,
  onReturnTitle,
  onOpenCodex,
}) => {
  if (hud.phase !== 'paused' && hud.phase !== 'victory' && hud.phase !== 'gameover') {
    return null;
  }

  const accuracy =
    hud.shotsFired > 0 ? Math.round((hud.shotsHit / hud.shotsFired) * 100) : 0;

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
      .toString()
      .padStart(2, '0');
    const s = Math.floor(sec % 60)
      .toString()
      .padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4 bg-[#05070c]/88">
      <div className="w-full max-w-md rounded-lg bg-[#0c111d] border border-white/15 p-6 shadow-2xl">
        {/* Header */}
        {hud.phase === 'paused' && (
          <div className="mb-5">
            <div className="font-mono-num text-[10px] tracking-[0.22em] text-sky-400 uppercase">
              TEMPORAL STASIS // PAUSED
            </div>
            <h2 className="font-display text-2xl font-bold tracking-wider text-white mt-0.5">
              DEPLOYMENT PAUSED
            </h2>
          </div>
        )}

        {hud.phase === 'victory' && (
          <div className="mb-5">
            <div className="flex items-center gap-2 font-mono-num text-[10px] tracking-[0.22em] text-emerald-400 uppercase">
              <ShieldCheck className="w-4 h-4" />
              <span>PARADOX COLLAPSED</span>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-wider text-white mt-1">
              {hud.securedCount >= 3 ? 'TRI-TIMELINE SUPREMACY' : 'REALITY STABILIZED'}
            </h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              {hud.securedCount >= 3
                ? 'All three Chrono-Anchors have been locked under your control across 1240 BCE, 2089 CE, and 2410 CE.'
                : 'You secured 2 of 3 Chrono-Anchors and halted the Aethelgard Temporal Shear. You may extract now or re-enter to claim the final timeline.'}
            </p>
          </div>
        )}

        {hud.phase === 'gameover' && (
          <div className="mb-5">
            <div className="flex items-center gap-2 font-mono-num text-[10px] tracking-[0.22em] text-rose-400 uppercase">
              <Skull className="w-4 h-4" />
              <span>SUIT INTEGRITY CRITICAL</span>
            </div>
            <h2 className="font-display text-2xl font-bold tracking-wider text-white mt-1">
              CHRONO-COLLAPSE
            </h2>
            <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
              Temporal shear overwhelmed your Chrono-Lattice frame. Shift between centuries to break enemy line-of-sight and recover behind alternate cover.
            </p>
          </div>
        )}

        {/* Match Stats Grid */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <div className="p-2.5 rounded bg-[#090d17] border border-white/10">
            <div className="font-mono-num text-[10px] text-slate-400">ANCHORS SECURED</div>
            <div className="font-mono-num text-lg font-bold text-sky-300">
              {hud.securedCount} / 3
            </div>
          </div>
          <div className="p-2.5 rounded bg-[#090d17] border border-white/10">
            <div className="font-mono-num text-[10px] text-slate-400">TIME ELAPSED</div>
            <div className="font-mono-num text-lg font-bold text-white">
              {formatTime(hud.elapsedSeconds)}
            </div>
          </div>
          <div className="p-2.5 rounded bg-[#090d17] border border-white/10">
            <div className="font-mono-num text-[10px] text-slate-400">ELIMINATIONS</div>
            <div className="font-mono-num text-lg font-bold text-white">{hud.kills}</div>
          </div>
          <div className="p-2.5 rounded bg-[#090d17] border border-white/10">
            <div className="font-mono-num text-[10px] text-slate-400">ACCURACY / SHIFTS</div>
            <div className="font-mono-num text-lg font-bold text-white">
              {accuracy}% <span className="text-xs text-slate-400">/ {hud.phaseShifts}</span>
            </div>
          </div>
        </div>

        {/* Settings Controls (Pause Screen) */}
        {hud.phase === 'paused' && (
          <div className="space-y-3 mb-5 p-3.5 rounded bg-[#090d17] border border-white/10">
            <div className="flex items-center justify-between">
              <span className="font-mono-num text-xs text-slate-300">
                AIM SENSITIVITY ({settings.sensitivity.toFixed(1)}x)
              </span>
              <input
                type="range"
                min={0.4}
                max={2.0}
                step={0.1}
                value={settings.sensitivity}
                onChange={(e) =>
                  onUpdateSettings({ sensitivity: parseFloat(e.target.value) })
                }
                className="chrono-slider w-32"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="font-mono-num text-xs text-slate-300">SYNTH AUDIO</span>
              <button
                type="button"
                onClick={() => onUpdateSettings({ muted: !settings.muted })}
                className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono-num text-slate-200 cursor-pointer"
              >
                {settings.muted ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                    <span>MUTED</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ACTIVE</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          {hud.phase === 'paused' && (
            <button
              type="button"
              onClick={onResume}
              className="flex items-center justify-center gap-2 w-full py-3 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm tracking-[0.12em] uppercase cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Resume Combat</span>
            </button>
          )}

          {hud.phase === 'victory' && hud.securedCount < 3 && (
            <button
              type="button"
              onClick={onContinueSweep}
              className="flex items-center justify-center gap-2 w-full py-3 rounded bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 font-display font-bold text-sm tracking-[0.12em] uppercase cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Continue for 3/3 Perfect Sweep</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenCodex}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 font-display font-semibold text-xs tracking-[0.12em] uppercase cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span>Open Rift Lore & Codex</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onRestart}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-display font-semibold text-xs tracking-wider uppercase cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Redeploy</span>
            </button>

            <button
              type="button"
              onClick={onReturnTitle}
              className="py-2.5 rounded bg-white/5 hover:bg-white/10 border border-white/12 text-slate-300 font-display font-semibold text-xs tracking-wider uppercase cursor-pointer"
            >
              Title Screen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
