export type TimelineId = 'past' | 'present' | 'future';

export type GamePhase = 'title' | 'playing' | 'paused' | 'victory' | 'gameover';

export interface WeaponProfile {
  id: string;
  era: TimelineId;
  name: string;
  subtitle: string;
  fireMode: string;
  damage: number;
  pellets: number;
  fireInterval: number; // seconds between shots
  magSize: number;
  reloadTime: number; // seconds
  spread: number; // radians
  range: number;
  staggerPower: number;
  cryoSlowDuration: number;
  shieldMultiplier: number;
  tracerColor: number;
  accentHex: string;
  loreNote: string;
}

export interface EraLoreConfig {
  id: TimelineId;
  keyNum: '1' | '2' | '3';
  eraLabel: string;
  yearLabel: string;
  locationName: string;
  primaryHex: string;
  secondaryHex: string;
  buffTitle: string;
  buffDescription: string;
  riftHazardTitle: string;
  riftHazardDescription: string;
  architecturalShift: string;
  enemyRoster: {
    name: string;
    role: string;
    threat: string;
  }[];
  loreSummary: string;
}

export type DifficultyMode = 'tactical' | 'nightmare';

export interface TimelineStatus {
  id: TimelineId;
  captureProgress: number; // 0..100
  secured: boolean;
  anchorUnlocked: boolean;
  counterWaveTriggered: boolean;
  enemiesRemaining: number;
  riftSurge: number; // 0..100
  playerInsideRing: boolean;
}

export interface HudSnapshot {
  phase: GamePhase;
  difficulty: DifficultyMode;
  pointerLocked: boolean;
  activeTimeline: TimelineId;
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  reloading: boolean;
  reloadProgress: number; // 0..1
  dashCooldown: number; // 0..1 (1 = ready)
  stasisCooldown: number; // 0..1 (1 = ready)
  chronalStasisCooldown: number; // 0..1 (1 = ready)
  chronalStasisRemaining: number; // seconds left on 15s cooldown
  chronalStasisActiveTimer: number; // >0 while active timeline enemies are frozen (3s)
  decoyCooldown: number; // 0..1 (1 = ready)
  decoyRemaining: number; // seconds left on 20s cooldown
  decoyActiveTimer: number; // >0 while projection is distracting another timeline
  decoyTimeline: TimelineId | null; // which timeline holds the decoy projection
  shiftCooldown: number; // 0..1 (1 = ready)
  chronoBreakTimer: number; // >0 means +35% post-shift ambush damage active
  highGroundActive: boolean;
  timelines: Record<TimelineId, TimelineStatus>;
  securedCount: number;
  requiredToWin: number;
  sweepMode: boolean; // true if player continued after 2/3 to chase 3/3
  threatLevel: 1 | 2 | 3; // scales dynamically with stabilized Chrono-Anchors
  enemyHpScale: number; // e.g. 1.0, 1.28, 1.58
  enemyAggressionScale: number; // e.g. 1.0, 1.22, 1.42
  elapsedSeconds: number;
  kills: number;
  shotsFired: number;
  shotsHit: number;
  headshots: number;
  phaseShifts: number;
  hitMarkerTimer: number;
  critMarkerTimer: number;
  damageFlashTimer: number;
  shiftFlashTimer: number;
  statusBanner: string;
  statusBannerTone: 'neutral' | 'amber' | 'emerald' | 'magenta' | 'cyan' | 'danger';
  muted: boolean;
}

export interface GameSettings {
  sensitivity: number; // 0.4 .. 2.0
  muted: boolean;
  difficulty: DifficultyMode;
}
