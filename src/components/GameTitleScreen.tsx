import React, { useEffect } from 'react';
import { BookOpen, Crosshair, Volume2, VolumeX } from 'lucide-react';
import { PARADOX_LORE_OVERVIEW, TIMELINE_ORDER, ERA_CONFIGS } from '../game/lore';
import { DifficultyMode } from '../game/types';

interface GameTitleScreenProps {
  muted: boolean;
  difficulty: DifficultyMode;
  onChangeDifficulty: (mode: DifficultyMode) => void;
  onToggleMute: () => void;
  onStart: () => void;
  onOpenCodex: () => void;
}

export const GameTitleScreen: React.FC<GameTitleScreenProps> = ({
  muted,
  difficulty,
  onChangeDifficulty,
  onToggleMute,
  onStart,
  onOpenCodex,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onStart]);

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between p-6 md:p-10 pointer-events-none bg-gradient-to-r from-[#07080d]/90 via-[#07080d]/45 to-transparent">
      {/* Top Bar: Incident Tag + Audio Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-block w-2 h-2 bg-emerald-400" />
          <span className="font-mono-num text-xs tracking-[0.22em] text-slate-300 uppercase">
            {PARADOX_LORE_OVERVIEW.incidentCode}
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 rounded bg-[#0e121c]/90 border border-white/15 text-xs font-mono-num text-slate-200 hover:border-sky-400/60 transition-colors cursor-pointer"
        >
          {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-sky-400" />}
          <span>{muted ? 'AUDIO OFF' : 'AUDIO ON'}</span>
        </button>
      </div>

      {/* Main Title Lockup over calm left negative space */}
      <div className="max-w-xl my-auto">
        {/* Bespoke inline SVG Title Lockup */}
        <svg
          viewBox="0 0 540 124"
          className="w-full max-w-[490px] h-auto mb-5"
          aria-label="CHRONO-BREACH"
        >
          <defs>
            <linearGradient id="cb-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#e879f9" />
            </linearGradient>
          </defs>
          {/* Tri-timeline geometric rift emblem */}
          <g transform="translate(4, 18)">
            <polygon
              points="34,0 68,20 68,60 34,80 0,60 0,20"
              fill="none"
              stroke="url(#cb-grad)"
              strokeWidth="2.5"
            />
            <polygon
              points="34,14 54,26 54,54 34,66 14,54 14,26"
              fill="#0c111d"
              stroke="#e2e8f0"
              strokeWidth="1.5"
            />
            <line x1="34" y1="0" x2="34" y2="80" stroke="#38bdf8" strokeWidth="1.5" strokeOpacity="0.65" />
            <circle cx="34" cy="40" r="6" fill="#f8fafc" />
          </g>
          {/* Title typography */}
          <text
            x="90"
            y="60"
            fill="#f8fafc"
            fontFamily="Chakra Petch, sans-serif"
            fontWeight="700"
            fontSize="50"
            letterSpacing="3"
          >
            CHRONO
          </text>
          <text
            x="92"
            y="102"
            fill="url(#cb-grad)"
            fontFamily="Chakra Petch, sans-serif"
            fontWeight="700"
            fontSize="36"
            letterSpacing="9"
          >
            BREACH
          </text>
          <rect x="92" y="114" width="380" height="2" fill="url(#cb-grad)" opacity="0.7" />
        </svg>

        <p className="text-sm md:text-[15px] leading-relaxed text-slate-300 mb-5 max-w-lg">
          {PARADOX_LORE_OVERVIEW.premise}
        </p>

        {/* Compact 3-Era Summary Strip */}
        <div className="grid grid-cols-3 gap-2.5 mb-7 max-w-lg">
          {TIMELINE_ORDER.map((id) => {
            const cfg = ERA_CONFIGS[id];
            return (
              <div
                key={id}
                className="px-3 py-2 rounded bg-[#0c1018]/90 border border-white/10"
                style={{ borderTopColor: cfg.primaryHex, borderTopWidth: '2px' }}
              >
                <div className="font-mono-num text-[10px] tracking-wider text-slate-400">
                  [{cfg.keyNum}] {cfg.yearLabel}
                </div>
                <div className="font-display text-xs font-semibold tracking-wide text-slate-100 mt-0.5">
                  {cfg.eraLabel}
                </div>
              </div>
            );
          })}
        </div>

        {/* Difficulty Selector */}
        <div className="flex items-center gap-2 mb-5 max-w-lg pointer-events-auto">
          <button
            type="button"
            onClick={() => onChangeDifficulty('tactical')}
            className={`flex-1 px-3.5 py-2 rounded border text-left cursor-pointer transition-colors ${
              difficulty === 'tactical'
                ? 'bg-sky-500/15 border-sky-400 text-white'
                : 'bg-[#0c1018]/85 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-display text-xs font-bold tracking-wider uppercase">
              Tactical Hard
            </div>
            <div className="font-mono-num text-[10px] text-slate-400">
              6-foe squads · Counter-breaches
            </div>
          </button>

          <button
            type="button"
            onClick={() => onChangeDifficulty('nightmare')}
            className={`flex-1 px-3.5 py-2 rounded border text-left cursor-pointer transition-colors ${
              difficulty === 'nightmare'
                ? 'bg-rose-500/20 border-rose-400 text-white'
                : 'bg-[#0c1018]/85 border-white/10 text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className="font-display text-xs font-bold tracking-wider uppercase text-rose-300">
              Paradox Nightmare
            </div>
            <div className="font-mono-num text-[10px] text-slate-400">
              +35% HP · Lethal surge · Fast AI
            </div>
          </button>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center gap-3 pointer-events-auto">
          <button
            type="button"
            onClick={onStart}
            className="flex items-center gap-2.5 px-7 py-3.5 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm tracking-[0.14em] uppercase transition-colors cursor-pointer shadow-lg shadow-emerald-950/50"
          >
            <Crosshair className="w-4 h-4" />
            <span>Deploy Into Rift</span>
          </button>

          <button
            type="button"
            onClick={onOpenCodex}
            className="flex items-center gap-2 px-5 py-3.5 rounded bg-[#0f1522]/90 hover:bg-[#172033] border border-white/15 text-slate-200 font-display font-semibold text-sm tracking-[0.1em] uppercase transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span>Rift Lore & Codex</span>
          </button>
        </div>
      </div>

      {/* Single Flat Control-Hint Line */}
      <div className="flex items-center justify-between text-[11px] font-mono-num tracking-wider text-slate-400">
        <div>
          WASD Move · LMB Fire · RMB/F Stasis Pulse · C Chronal Stasis · G Temporal Decoy · Q/E or 1-3 Phase Shift · Shift Dash · Space Jump · R Reload · Esc Pause
        </div>
        <div className="hidden md:block text-slate-500">
          OBJECTIVE: SECURE 2 OF 3 TIMELINES
        </div>
      </div>
    </div>
  );
};
