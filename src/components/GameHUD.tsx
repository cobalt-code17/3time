import React from 'react';
import { Pause, Shield, Volume2, VolumeX, Zap } from 'lucide-react';
import { ERA_CONFIGS, TIMELINE_ORDER, WEAPON_PROFILES } from '../game/lore';
import { HudSnapshot } from '../game/types';

interface GameHUDProps {
  hud: HudSnapshot;
  onPause: () => void;
  onToggleMute: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({ hud, onPause, onToggleMute }) => {
  const activeCfg = ERA_CONFIGS[hud.activeTimeline];
  const weapon = WEAPON_PROFILES[hud.activeTimeline];
  const activeTimelineStatus = hud.timelines[hud.activeTimeline];

  const bannerColors: Record<HudSnapshot['statusBannerTone'], string> = {
    neutral: 'border-slate-400/35 text-slate-100 bg-[#0b101b]/90',
    amber: 'border-amber-400/60 text-amber-200 bg-[#1c1409]/90',
    emerald: 'border-emerald-400/60 text-emerald-200 bg-[#091c16]/90',
    magenta: 'border-fuchsia-400/60 text-fuchsia-200 bg-[#1b0b24]/90',
    cyan: 'border-cyan-400/70 text-cyan-200 bg-[#081a24]/90',
    danger: 'border-rose-500/70 text-rose-200 bg-[#240a10]/90',
  };

  return (
    <div className="fixed inset-0 z-10 pointer-events-none select-none overflow-hidden">
      {/* Subtle Edge Flashes (Damage / Phase Shift / Chronal Stasis) */}
      {hud.damageFlashTimer > 0 && (
        <div
          className="absolute inset-0 border-[12px] border-rose-500/55"
          style={{ opacity: Math.min(1, hud.damageFlashTimer * 3.5) }}
        />
      )}
      {hud.shiftFlashTimer > 0 && (
        <div
          className="absolute inset-0 border-[6px]"
          style={{
            borderColor: activeCfg.primaryHex,
            opacity: Math.min(0.8, hud.shiftFlashTimer * 3),
          }}
        />
      )}
      {hud.chronalStasisActiveTimer > 0 && (
        <div
          className="absolute inset-0 border-[5px] border-cyan-400/60"
          style={{ opacity: Math.min(0.85, hud.chronalStasisActiveTimer * 0.45 + 0.25) }}
        />
      )}

      {/* TOP BAR: Tri-Timeline Control Strip + Utility Actions */}
      <div className="absolute top-3 left-0 right-0 px-4 flex items-start justify-between">
        {/* Left Match Timer & Kills */}
        <div className="hidden sm:flex flex-col gap-1 bg-[#0a0e17]/85 border border-white/10 rounded px-3 py-1.5">
          <div className="font-mono-num text-[11px] text-slate-400">
            TIME{' '}
            <span className="text-slate-100 font-bold">
              {Math.floor(hud.elapsedSeconds / 60)
                .toString()
                .padStart(2, '0')}
              :
              {Math.floor(hud.elapsedSeconds % 60)
                .toString()
                .padStart(2, '0')}
            </span>
          </div>
          <div className="font-mono-num text-[11px] text-slate-400">
            ELIMINATIONS <span className="text-slate-100 font-bold">{hud.kills}</span>
          </div>
          <div className="font-mono-num text-[10px] tracking-wider pt-0.5 border-t border-white/10">
            <span
              className={
                hud.threatLevel >= 3
                  ? 'text-rose-400 font-bold'
                  : hud.threatLevel === 2
                    ? 'text-amber-300 font-bold'
                    : 'text-slate-400'
              }
            >
              THREAT TIER {hud.threatLevel === 1 ? 'I' : hud.threatLevel === 2 ? 'II' : 'III'}
            </span>
            {hud.threatLevel > 1 && (
              <span className="text-slate-300 ml-1.5">
                +{Math.round((hud.enemyHpScale - 1) * 100)}% HP · +
                {Math.round((hud.enemyAggressionScale - 1) * 100)}% AGGRO
              </span>
            )}
          </div>
        </div>

        {/* Center: 3-Timeline Status Cluster */}
        <div className="mx-auto flex flex-col items-center gap-1.5">
          <div className="flex items-stretch gap-2">
            {TIMELINE_ORDER.map((id) => {
              const cfg = ERA_CONFIGS[id];
              const st = hud.timelines[id];
              const isActive = hud.activeTimeline === id;

              return (
                <div
                  key={id}
                  className="w-32 sm:w-36 rounded px-2.5 py-1.5 border transition-colors"
                  style={{
                    backgroundColor: isActive ? 'rgba(14, 20, 34, 0.94)' : 'rgba(9, 12, 20, 0.82)',
                    borderColor: st.secured
                      ? '#38bdf8'
                      : isActive
                        ? cfg.primaryHex
                        : 'rgba(255,255,255,0.12)',
                  }}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono-num">
                    <span style={{ color: cfg.primaryHex }} className="font-bold">
                      [{cfg.keyNum}] {cfg.yearLabel}
                    </span>
                    <span
                      className={
                        st.secured
                          ? 'text-sky-300 font-bold'
                          : st.anchorUnlocked
                            ? 'text-emerald-300 font-bold'
                            : 'text-slate-400'
                      }
                    >
                      {st.secured
                        ? 'SECURED'
                        : st.anchorUnlocked
                          ? `${Math.floor(st.captureProgress)}%`
                          : `FOES ${st.enemiesRemaining}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-display text-[11px] font-semibold tracking-wider text-slate-100">
                    <span className="truncate">{cfg.eraLabel}</span>
                    {hud.decoyTimeline === id && hud.decoyActiveTimer > 0 && (
                      <span className="ml-1 px-1 rounded bg-sky-500/25 border border-sky-400/70 font-mono-num text-[9px] text-sky-200 shrink-0">
                        DECOY
                      </span>
                    )}
                  </div>

                  {/* Capture / Rift Surge Dual Bar */}
                  <div className="mt-1 h-1 w-full bg-white/10 rounded-sm overflow-hidden">
                    {st.secured ? (
                      <div className="h-full w-full bg-sky-400" />
                    ) : st.captureProgress > 0 ? (
                      <div
                        className="h-full"
                        style={{
                          width: `${st.captureProgress}%`,
                          backgroundColor: cfg.primaryHex,
                        }}
                      />
                    ) : (
                      <div
                        className="h-full bg-rose-500/80"
                        style={{ width: `${st.riftSurge}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-3 py-0.5 rounded bg-[#090c14]/85 border border-white/10 font-mono-num text-[10px] tracking-[0.16em] text-slate-300">
            TIMELINES CONTROLLED:{' '}
            <span className="text-sky-300 font-bold">
              {hud.securedCount} / {hud.sweepMode ? 3 : hud.requiredToWin}
            </span>
          </div>

          {hud.statusBanner && (
            <div
              className={`mt-0.5 px-3.5 py-1 rounded border font-display text-xs font-semibold tracking-[0.12em] uppercase ${bannerColors[hud.statusBannerTone]}`}
            >
              {hud.statusBanner}
            </div>
          )}
        </div>

        {/* Right: Audio & Pause controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={onToggleMute}
            className="p-2 rounded bg-[#0a0e17]/85 border border-white/12 text-slate-300 hover:text-white hover:border-white/30 cursor-pointer"
            title={hud.muted ? 'Unmute' : 'Mute'}
          >
            {hud.muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={onPause}
            className="flex items-center gap-1.5 px-2.5 py-2 rounded bg-[#0a0e17]/85 border border-white/12 text-xs font-mono-num text-slate-300 hover:text-white hover:border-white/30 cursor-pointer"
          >
            <Pause className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ESC</span>
          </button>
        </div>
      </div>

      {/* CENTER: Era-Adaptive Crosshair, Hitmarkers, & Capture Ring Readout */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* Dynamic Reticle by Era Weapon */}
          {hud.activeTimeline === 'past' && (
            <div className="w-7 h-7 rounded-full border-2 border-amber-400/80 flex items-center justify-center">
              <div className="w-1 h-1 bg-amber-300 rounded-full" />
            </div>
          )}
          {hud.activeTimeline === 'present' && (
            <div className="relative w-6 h-6 flex items-center justify-center">
              <div className="absolute top-0 w-0.5 h-2 bg-emerald-400/90" />
              <div className="absolute bottom-0 w-0.5 h-2 bg-emerald-400/90" />
              <div className="absolute left-0 h-0.5 w-2 bg-emerald-400/90" />
              <div className="absolute right-0 h-0.5 w-2 bg-emerald-400/90" />
              <div className="w-1 h-1 bg-white rounded-full" />
            </div>
          )}
          {hud.activeTimeline === 'future' && (
            <div className="relative w-7 h-7 flex items-center justify-center">
              <div className="w-4 h-4 rotate-45 border border-fuchsia-400/90" />
              <div className="absolute w-1.5 h-1.5 bg-cyan-300 rounded-full" />
            </div>
          )}

          {/* Hitmarker X */}
          {(hud.hitMarkerTimer > 0 || hud.critMarkerTimer > 0) && (
            <svg viewBox="0 0 32 32" className="absolute w-8 h-8">
              <line
                x1="6"
                y1="6"
                x2="12"
                y2="12"
                stroke={hud.critMarkerTimer > 0 ? '#f59e0b' : '#ffffff'}
                strokeWidth="2.2"
              />
              <line
                x1="26"
                y1="6"
                x2="20"
                y2="12"
                stroke={hud.critMarkerTimer > 0 ? '#f59e0b' : '#ffffff'}
                strokeWidth="2.2"
              />
              <line
                x1="6"
                y1="26"
                x2="12"
                y2="20"
                stroke={hud.critMarkerTimer > 0 ? '#f59e0b' : '#ffffff'}
                strokeWidth="2.2"
              />
              <line
                x1="26"
                y1="26"
                x2="20"
                y2="20"
                stroke={hud.critMarkerTimer > 0 ? '#f59e0b' : '#ffffff'}
                strokeWidth="2.2"
              />
            </svg>
          )}
        </div>

        {/* Anchor Ring Capture Prompt below crosshair */}
        {activeTimelineStatus.playerInsideRing && !activeTimelineStatus.secured && (
          <div className="absolute mt-28 px-4 py-1.5 rounded bg-[#090d16]/90 border border-white/15 text-center">
            {activeTimelineStatus.anchorUnlocked ? (
              <div>
                <div className="font-display text-xs font-bold tracking-[0.14em] text-sky-300">
                  CAPTURING {activeCfg.eraLabel} ANCHOR
                </div>
                <div className="mt-1 w-44 h-1.5 bg-white/10 rounded overflow-hidden">
                  <div
                    className="h-full bg-sky-400"
                    style={{ width: `${activeTimelineStatus.captureProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="font-mono-num text-[11px] text-amber-300">
                ANCHOR LOCKED — DEFEAT {activeTimelineStatus.enemiesRemaining} ERA DEFENDERS
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOTTOM-LEFT: Suit Integrity, Phase Dash, & Secured Era Buffs */}
      <div className="absolute bottom-5 left-5 flex flex-col gap-2 w-60">
        {/* Secured Era Passive Buffs */}
        {hud.securedCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {TIMELINE_ORDER.filter((id) => hud.timelines[id].secured).map((id) => (
              <div
                key={id}
                className="px-2 py-0.5 rounded bg-[#0a0f1c]/90 border text-[10px] font-mono-num text-slate-200"
                style={{ borderColor: ERA_CONFIGS[id].primaryHex }}
              >
                {ERA_CONFIGS[id].buffTitle.toUpperCase()}
              </div>
            ))}
          </div>
        )}

        <div className="bg-[#090d16]/90 border border-white/12 rounded p-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-display font-semibold tracking-wider text-slate-300">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              <span>SUIT INTEGRITY</span>
            </div>
            <span
              className={`font-mono-num text-base font-bold ${
                hud.hp <= 30 ? 'text-rose-400' : 'text-slate-100'
              }`}
            >
              {hud.hp}
            </span>
          </div>

          <div className="h-2 w-full bg-white/10 rounded-sm overflow-hidden mb-2.5">
            <div
              className="h-full transition-all duration-100"
              style={{
                width: `${(hud.hp / hud.maxHp) * 100}%`,
                backgroundColor: hud.hp <= 30 ? '#f43f5e' : '#10b981',
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono-num text-slate-400">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-sky-400" />
              <span>PHASE DASH [SHIFT]</span>
            </div>
            <span className={hud.dashCooldown >= 0.99 ? 'text-sky-300 font-bold' : 'text-slate-500'}>
              {hud.dashCooldown >= 0.99 ? 'READY' : `${Math.round(hud.dashCooldown * 100)}%`}
            </span>
          </div>
          <div className="mt-1 h-1 w-full bg-white/10 rounded-sm overflow-hidden mb-2.5">
            <div
              className="h-full bg-sky-400"
              style={{ width: `${hud.dashCooldown * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono-num text-slate-400">
            <span>STASIS PULSE [RMB / F]</span>
            <span className={hud.stasisCooldown >= 0.99 ? 'text-emerald-300 font-bold' : 'text-slate-500'}>
              {hud.stasisCooldown >= 0.99 ? 'READY' : `${Math.round(hud.stasisCooldown * 100)}%`}
            </span>
          </div>
          <div className="mt-1 h-1 w-full bg-white/10 rounded-sm overflow-hidden mb-2.5">
            <div
              className="h-full bg-emerald-400"
              style={{ width: `${hud.stasisCooldown * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono-num text-slate-400">
            <span>CHRONAL STASIS [C]</span>
            <span
              className={
                hud.chronalStasisActiveTimer > 0
                  ? 'text-cyan-300 font-bold'
                  : hud.chronalStasisCooldown >= 0.999
                    ? 'text-cyan-300 font-bold'
                    : 'text-slate-400'
              }
            >
              {hud.chronalStasisActiveTimer > 0
                ? `FREEZE ${hud.chronalStasisActiveTimer.toFixed(1)}s`
                : hud.chronalStasisCooldown >= 0.999
                  ? 'READY'
                  : `${Math.ceil(hud.chronalStasisRemaining)}s`}
            </span>
          </div>
          <div className="mt-1 h-1 w-full bg-white/10 rounded-sm overflow-hidden mb-2.5">
            <div
              className="h-full bg-cyan-400"
              style={{ width: `${hud.chronalStasisCooldown * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono-num text-slate-400">
            <span>TEMPORAL DECOY [G]</span>
            <span
              className={
                hud.decoyActiveTimer > 0
                  ? 'text-sky-300 font-bold'
                  : hud.decoyCooldown >= 0.999
                    ? 'text-sky-300 font-bold'
                    : 'text-slate-400'
              }
            >
              {hud.decoyActiveTimer > 0
                ? `${hud.decoyTimeline?.toUpperCase()} ${hud.decoyActiveTimer.toFixed(1)}s`
                : hud.decoyCooldown >= 0.999
                  ? 'READY'
                  : `${Math.ceil(hud.decoyRemaining)}s`}
            </span>
          </div>
          <div className="mt-1 h-1 w-full bg-white/10 rounded-sm overflow-hidden">
            <div
              className="h-full bg-sky-400"
              style={{ width: `${hud.decoyCooldown * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* BOTTOM-RIGHT: Tactical Bonuses + Era-Morphed Weapon & Ammo Counter */}
      <div className="absolute bottom-5 right-5 flex flex-col items-end gap-2 w-64">
        {(hud.decoyActiveTimer > 0 ||
          hud.chronalStasisActiveTimer > 0 ||
          hud.chronoBreakTimer > 0 ||
          hud.highGroundActive) && (
          <div className="flex flex-wrap justify-end gap-1.5">
            {hud.decoyActiveTimer > 0 && hud.decoyTimeline && (
              <div className="px-2 py-0.5 rounded bg-[#081524]/92 border border-sky-400/75 font-mono-num text-[10px] font-bold text-sky-200">
                DECOY IN {ERA_CONFIGS[hud.decoyTimeline].eraLabel} ({hud.decoyActiveTimer.toFixed(1)}s)
              </div>
            )}
            {hud.chronalStasisActiveTimer > 0 && (
              <div className="px-2 py-0.5 rounded bg-[#081a24]/92 border border-cyan-400/75 font-mono-num text-[10px] font-bold text-cyan-200">
                TIMELINE FROZEN ({hud.chronalStasisActiveTimer.toFixed(1)}s)
              </div>
            )}
            {hud.chronoBreakTimer > 0 && (
              <div className="px-2 py-0.5 rounded bg-[#1b0b24]/92 border border-fuchsia-400/70 font-mono-num text-[10px] font-bold text-fuchsia-200">
                CHRONO-BREAK +35% ({hud.chronoBreakTimer.toFixed(1)}s)
              </div>
            )}
            {hud.highGroundActive && (
              <div className="px-2 py-0.5 rounded bg-[#141108]/92 border border-amber-400/70 font-mono-num text-[10px] font-bold text-amber-200">
                HIGH GROUND +20%
              </div>
            )}
          </div>
        )}

        <div className="w-full bg-[#090d16]/90 border border-white/12 rounded p-3">
          <div className="flex items-center justify-between text-[10px] font-mono-num text-slate-400 mb-0.5">
            <span style={{ color: weapon.accentHex }}>{weapon.subtitle}</span>
            <span>[Q/E] SHIFT</span>
          </div>

          <div className="font-display text-sm font-bold tracking-wider text-slate-100 truncate">
            {weapon.name}
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <span className="font-mono-num text-[11px] text-slate-400">{weapon.fireMode}</span>
            <div className="font-mono-num">
              <span
                className="text-2xl font-bold"
                style={{ color: hud.ammo === 0 ? '#f43f5e' : '#f8fafc' }}
              >
                {hud.ammo.toString().padStart(2, '0')}
              </span>
              <span className="text-xs text-slate-500">
                {' '}
                / {hud.maxAmmo.toString().padStart(2, '0')}
              </span>
            </div>
          </div>

          {hud.reloading && (
            <div className="mt-2">
              <div className="flex justify-between font-mono-num text-[10px] text-amber-300 mb-0.5">
                <span>TRANSMUTING AMMO...</span>
                <span>{Math.round(hud.reloadProgress * 100)}%</span>
              </div>
              <div className="h-1 w-full bg-white/10 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${hud.reloadProgress * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
