import React, { useState } from 'react';
import { Layers, ShieldAlert, Sparkles, X } from 'lucide-react';
import {
  ERA_CONFIGS,
  PARADOX_LORE_OVERVIEW,
  TIMELINE_ORDER,
  WEAPON_PROFILES,
} from '../game/lore';
import { TimelineId } from '../game/types';

interface CodexModalProps {
  onClose: () => void;
}

export const CodexModal: React.FC<CodexModalProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'paradox' | TimelineId>('paradox');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#05070c]/90">
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-[#0c111d] border border-white/15 rounded-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <div className="font-mono-num text-[10px] tracking-[0.2em] text-sky-400 uppercase">
              AETHELGARD ARCHIVE // FIELD DOSSIER
            </div>
            <h2 className="font-display text-xl font-bold tracking-wider text-white">
              TEMPORAL RIFT & COMBAT CODEX
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 px-6 py-3 border-b border-white/10 bg-[#090d17]">
          <button
            type="button"
            onClick={() => setTab('paradox')}
            className={`px-3.5 py-1.5 rounded font-display text-xs font-semibold tracking-wider uppercase cursor-pointer border ${
              tab === 'paradox'
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            Rift Physics & Rules
          </button>
          {TIMELINE_ORDER.map((id) => {
            const cfg = ERA_CONFIGS[id];
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="px-3.5 py-1.5 rounded font-display text-xs font-semibold tracking-wider uppercase cursor-pointer border"
                style={{
                  backgroundColor: active ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                  borderColor: active ? cfg.primaryHex : 'rgba(255,255,255,0.1)',
                  color: active ? cfg.primaryHex : '#94a3b8',
                }}
              >
                [{cfg.keyNum}] {cfg.eraLabel}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-300">
          {tab === 'paradox' ? (
            <>
              <div className="p-4 rounded bg-[#12192b] border border-sky-400/25">
                <div className="font-display text-base font-bold text-white mb-1.5">
                  {PARADOX_LORE_OVERVIEW.title}
                </div>
                <p className="leading-relaxed text-slate-300">
                  {PARADOX_LORE_OVERVIEW.premise}
                </p>
              </div>

              <div className="space-y-3">
                {PARADOX_LORE_OVERVIEW.mechanics.map((m) => (
                  <div
                    key={m.heading}
                    className="p-4 rounded bg-[#090d17] border border-white/10"
                  >
                    <div className="flex items-center gap-2 font-display text-sm font-bold text-sky-300 mb-1">
                      <Layers className="w-4 h-4" />
                      <span>{m.heading}</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-[13px]">{m.body}</p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            (() => {
              const cfg = ERA_CONFIGS[tab];
              const weap = WEAPON_PROFILES[tab];
              return (
                <>
                  <div
                    className="p-4 rounded bg-[#090d17] border"
                    style={{ borderColor: cfg.primaryHex }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className="font-mono-num text-xs font-bold"
                        style={{ color: cfg.primaryHex }}
                      >
                        {cfg.yearLabel} // {cfg.locationName.toUpperCase()}
                      </span>
                      <span className="font-mono-num text-[11px] text-slate-400">
                        KEY [{cfg.keyNum}]
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-white mb-2">
                      {cfg.eraLabel}
                    </h3>
                    <p className="text-slate-300 leading-relaxed text-[13px]">
                      {cfg.loreSummary}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded bg-[#090d17] border border-white/10">
                      <div className="flex items-center gap-2 font-display text-xs font-bold tracking-wider uppercase text-sky-300 mb-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Anchor Capture Buff: {cfg.buffTitle}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {cfg.buffDescription}
                      </p>
                    </div>

                    <div className="p-4 rounded bg-[#090d17] border border-white/10">
                      <div className="flex items-center gap-2 font-display text-xs font-bold tracking-wider uppercase text-amber-300 mb-1.5">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Spatial Rift Shift</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {cfg.architecturalShift}
                      </p>
                    </div>
                  </div>

                  {/* Era-Morphed Weapon */}
                  <div className="p-4 rounded bg-[#101626] border border-white/10">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-display text-sm font-bold text-white">
                        ERA WEAPON: {weap.name}
                      </span>
                      <span
                        className="font-mono-num text-[11px] font-bold"
                        style={{ color: weap.accentHex }}
                      >
                        {weap.fireMode} · MAG {weap.magSize}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{weap.loreNote}</p>
                  </div>

                  {/* Enemy Roster */}
                  <div>
                    <div className="font-display text-xs font-bold tracking-[0.14em] uppercase text-slate-400 mb-2">
                      HOSTILE ENTITIES IN THIS TIMELINE
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {cfg.enemyRoster.map((en) => (
                        <div
                          key={en.name}
                          className="p-3 rounded bg-[#090d17] border border-white/10"
                        >
                          <div className="font-display text-sm font-bold text-white">
                            {en.name}
                          </div>
                          <div className="font-mono-num text-[10px] text-slate-400 uppercase mb-1">
                            {en.role}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">{en.threat}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
};
