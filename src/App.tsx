import { useCallback, useEffect, useRef, useState } from 'react';
import { CodexModal } from './components/CodexModal';
import { GameHUD } from './components/GameHUD';
import { GameTitleScreen } from './components/GameTitleScreen';
import { PauseEndModal } from './components/PauseEndModal';
import { ChronoGameEngine } from './game/engine';
import { WEAPON_PROFILES } from './game/lore';
import { GameSettings, HudSnapshot } from './game/types';

const INITIAL_HUD: HudSnapshot = {
  phase: 'title',
  difficulty: 'tactical',
  pointerLocked: false,
  activeTimeline: 'present',
  hp: 100,
  maxHp: 100,
  ammo: WEAPON_PROFILES.present.magSize,
  maxAmmo: WEAPON_PROFILES.present.magSize,
  reloading: false,
  reloadProgress: 0,
  dashCooldown: 1,
  stasisCooldown: 1,
  chronalStasisCooldown: 1,
  chronalStasisRemaining: 0,
  chronalStasisActiveTimer: 0,
  decoyCooldown: 1,
  decoyRemaining: 0,
  decoyActiveTimer: 0,
  decoyTimeline: null,
  shiftCooldown: 1,
  chronoBreakTimer: 0,
  highGroundActive: false,
  timelines: {
    past: {
      id: 'past',
      captureProgress: 0,
      secured: false,
      anchorUnlocked: false,
      counterWaveTriggered: false,
      enemiesRemaining: 6,
      riftSurge: 0,
      playerInsideRing: false,
    },
    present: {
      id: 'present',
      captureProgress: 0,
      secured: false,
      anchorUnlocked: false,
      counterWaveTriggered: false,
      enemiesRemaining: 6,
      riftSurge: 0,
      playerInsideRing: false,
    },
    future: {
      id: 'future',
      captureProgress: 0,
      secured: false,
      anchorUnlocked: false,
      counterWaveTriggered: false,
      enemiesRemaining: 6,
      riftSurge: 0,
      playerInsideRing: false,
    },
  },
  securedCount: 0,
  requiredToWin: 2,
  sweepMode: false,
  threatLevel: 1,
  enemyHpScale: 1.0,
  enemyAggressionScale: 1.0,
  elapsedSeconds: 0,
  kills: 0,
  shotsFired: 0,
  shotsHit: 0,
  headshots: 0,
  phaseShifts: 0,
  hitMarkerTimer: 0,
  critMarkerTimer: 0,
  damageFlashTimer: 0,
  shiftFlashTimer: 0,
  statusBanner: '',
  statusBannerTone: 'neutral',
  muted: false,
};

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<ChronoGameEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [settings, setSettings] = useState<GameSettings>({
    sensitivity: 1.0,
    muted: false,
    difficulty: 'tactical',
  });
  const [codexOpen, setCodexOpen] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new ChronoGameEngine(container, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleUpdateSettings = useCallback((next: Partial<GameSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next };
      engineRef.current?.setSettings(merged);
      return merged;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setSettings((prev) => {
      const merged = { ...prev, muted: !prev.muted };
      engineRef.current?.setSettings(merged);
      return merged;
    });
  }, []);

  const handleStart = useCallback(() => {
    setCodexOpen(false);
    engineRef.current?.startNewGame();
  }, []);

  const handleResume = useCallback(() => {
    setCodexOpen(false);
    engineRef.current?.resumeGame();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleContinueSweep = useCallback(() => {
    engineRef.current?.continueSweep();
  }, []);

  const handleReturnTitle = useCallback(() => {
    setCodexOpen(false);
    engineRef.current?.returnToTitle();
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07080d]">
      {/* Isolated WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Title Screen */}
      {hud.phase === 'title' && (
        <GameTitleScreen
          muted={settings.muted}
          difficulty={settings.difficulty}
          onChangeDifficulty={(difficulty) => handleUpdateSettings({ difficulty })}
          onToggleMute={handleToggleMute}
          onStart={handleStart}
          onOpenCodex={() => setCodexOpen(true)}
        />
      )}

      {/* Active Playing HUD */}
      {hud.phase === 'playing' && (
        <>
          <GameHUD
            hud={hud}
            onPause={handlePause}
            onToggleMute={handleToggleMute}
          />
          {!hud.pointerLocked && (
            <div
              onClick={() => engineRef.current?.requestPointerLock()}
              className="fixed inset-0 z-15 flex items-center justify-center bg-[#05070c]/50 cursor-pointer"
            >
              <div className="px-6 py-3 rounded bg-[#0c111d]/95 border border-sky-400/50 font-display text-sm font-bold tracking-[0.16em] uppercase text-sky-200">
                CLICK ANYWHERE TO LOCK AIM
              </div>
            </div>
          )}
        </>
      )}

      {/* Pause / Victory / Game Over Modals */}
      <PauseEndModal
        hud={hud}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onResume={handleResume}
        onContinueSweep={handleContinueSweep}
        onRestart={handleStart}
        onReturnTitle={handleReturnTitle}
        onOpenCodex={() => setCodexOpen(true)}
      />

      {/* Temporal Lore & Mechanics Codex */}
      {codexOpen && <CodexModal onClose={() => setCodexOpen(false)} />}
    </div>
  );
}
