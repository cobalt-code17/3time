import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  ANCHOR_COORDS,
  ArenaBuildResult,
  BoxCollider,
  buildTriTimelineArena,
  ERA_ATMOSPHERE,
} from './arena';
import { chronoAudio } from './audio';
import { ERA_CONFIGS, TIMELINE_ORDER, WEAPON_PROFILES } from './lore';
import {
  createDecoyProjection,
  createEnemyVisual,
  createWeaponRig,
  DecoyVisual,
  EnemyVisual,
  WeaponRig,
} from './models';
import { ChronoPostProcessor } from './postprocessing';
import { createContactShadowTexture } from './textures';
import { GamePhase, GameSettings, HudSnapshot, TimelineId, TimelineStatus } from './types';

interface ActiveEnemy {
  id: number;
  era: TimelineId;
  variant: 'heavy' | 'ranged';
  visual: EnemyVisual;
  position: THREE.Vector3;
  velocityY: number;
  hp: number;
  maxHp: number;
  baseMaxHp: number;
  speed: number;
  baseSpeed: number;
  attackRange: number;
  state: 'chase' | 'windup' | 'recover' | 'stagger';
  stateTimer: number;
  slowTimer: number;
  hitFlashTimer: number;
  freezeTimer: number;
  strafeSign: number;
  shieldBroken: boolean;
}

interface TracerBeam {
  line: THREE.Line;
  mat: THREE.LineBasicMaterial;
  life: number;
  maxLife: number;
}

interface SparkParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface EnemyProjectile {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  damage: number;
  life: number;
  freezeTimer: number;
  active: boolean;
}

// Module-level reusable math helpers (zero GC inside tick loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _raycaster = new THREE.Raycaster();
const _skyTarget = new THREE.Color();
const _fogTarget = new THREE.Color();
const _keyTarget = new THREE.Color();
const _hemiSkyTarget = new THREE.Color();
const _hemiGroundTarget = new THREE.Color();

export class ChronoGameEngine {
  private container: HTMLElement;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private arena!: ArenaBuildResult;
  private weaponRig!: WeaponRig;
  private keyLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private shadowTexture!: THREE.Texture;
  private postProcessor: ChronoPostProcessor | null = null;

  private isSoftwareGl = false;
  private frameId = 0;
  private disposed = false;
  private lastTime = 0;

  // Pooled VFX
  private tracers: TracerBeam[] = [];
  private sparks: SparkParticle[] = [];
  private projectiles: EnemyProjectile[] = [];
  private enemyVisualGroup = new THREE.Group();
  private vfxGroup = new THREE.Group();

  // Simulation state
  private phase: GamePhase = 'title';
  private activeTimeline: TimelineId = 'present';
  private settings: GameSettings = {
    sensitivity: 1.0,
    muted: false,
    difficulty: 'tactical',
  };

  private playerPos = new THREE.Vector3(0, 0, 22);
  private playerVel = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0;
  private grounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;

  private hp = 100;
  private readonly maxHp = 100;
  private dashTimer = 0; // cooldown remaining
  private dashActiveTimer = 0;
  private dashDir = new THREE.Vector3();
  private stasisTimer = 0; // tactical Stasis Pulse cooldown
  private chronalStasisCooldownTimer = 0; // 15s cooldown for Chronal Stasis
  private chronalStasisActiveTimer = 0; // 3s timeline freeze active countdown
  private chronalStasisEra: TimelineId | null = null;
  private decoyVisual!: DecoyVisual;
  private decoyCooldownTimer = 0; // 20s cooldown for Temporal Decoy
  private decoyActiveTimer = 0; // 6.5s distraction duration
  private decoyTimeline: TimelineId | null = null;
  private decoyPos = new THREE.Vector3();
  private chronoBreakTimer = 0; // post-shift +35% ambush window
  private shiftCooldownTimer = 0;
  private morphAnimTimer = 0;

  private ammoByEra: Record<TimelineId, number> = {
    past: WEAPON_PROFILES.past.magSize,
    present: WEAPON_PROFILES.present.magSize,
    future: WEAPON_PROFILES.future.magSize,
  };
  private fireCooldown = 0;
  private reloading = false;
  private reloadTimer = 0;
  private recoilPitch = 0;
  private recoilZ = 0;
  private muzzleFlashTimer = 0;
  private cameraShake = 0;
  private hitstopTimer = 0;

  private timelines!: Record<TimelineId, TimelineStatus>;
  private enemies: ActiveEnemy[] = [];
  private nextEnemyId = 1;
  private sweepMode = false;

  // Match stats & feedback timers
  private elapsedSeconds = 0;
  private kills = 0;
  private shotsFired = 0;
  private shotsHit = 0;
  private headshots = 0;
  private phaseShifts = 0;
  private hitMarkerTimer = 0;
  private critMarkerTimer = 0;
  private damageFlashTimer = 0;
  private shiftFlashTimer = 0;
  private statusBanner = 'CAPTURE AT LEAST 2 OF 3 CHRONO-ANCHORS';
  private statusBannerTone: HudSnapshot['statusBannerTone'] = 'neutral';
  private bannerTimer = 4.0;
  private hudSyncAccum = 0;
  private titleOrbitAngle = 0.4;

  // Input state
  private heldKeys = new Set<string>();
  private mouseDown = false;
  private pointerLocked = false;

  // Bound listeners
  private handleResize = () => this.onResize();
  private handleKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
  private handleKeyUp = (e: KeyboardEvent) => this.onKeyUp(e);
  private handleMouseMove = (e: MouseEvent) => this.onMouseMove(e);
  private handleMouseDown = (e: MouseEvent) => this.onMouseDown(e);
  private handleMouseUp = (e: MouseEvent) => this.onMouseUp(e);
  private handlePointerLockChange = () => this.onPointerLockChange();
  private handleBlur = () => this.clearInputs();
  private handleContextMenu = (e: MouseEvent) => e.preventDefault();

  constructor(container: HTMLElement, onHudUpdate: (snapshot: HudSnapshot) => void) {
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    this.initScene();
    this.resetMatchState('title');
    this.bindEvents();
    this.lastTime = performance.now();
    this.startLoop();
  }

  private detectSoftwareGl(): boolean {
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return false;
    }
  }

  private initScene() {
    this.isSoftwareGl = this.detectSoftwareGl();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2)
    );
    this.renderer.setSize(this.container.clientWidth || window.innerWidth, this.container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const atm = ERA_ATMOSPHERE.present;
    this.scene.background = new THREE.Color(atm.skyHex);
    this.scene.fog = new THREE.FogExp2(atm.fogHex, atm.fogDensity);

    // Studio IBL environment map
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(74, width / height, 0.1, 220);
    this.scene.add(this.camera);

    // 3-point balanced lighting rig
    this.hemiLight = new THREE.HemisphereLight(atm.hemiSky, atm.hemiGround, atm.hemiIntensity);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(atm.keyColor, atm.keyIntensity);
    this.keyLight.position.set(28, 42, 24);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    const d = 40;
    this.keyLight.shadow.camera.left = -d;
    this.keyLight.shadow.camera.right = d;
    this.keyLight.shadow.camera.top = d;
    this.keyLight.shadow.camera.bottom = -d;
    this.keyLight.shadow.camera.near = 2;
    this.keyLight.shadow.camera.far = 110;
    this.keyLight.shadow.bias = -0.0005;
    this.keyLight.shadow.normalBias = 0.02;
    this.scene.add(this.keyLight);

    const rimLight = new THREE.DirectionalLight(0x94a3b8, 0.65);
    rimLight.position.set(-25, 18, -30);
    this.scene.add(rimLight);

    // Build Arena
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.arena = buildTriTimelineArena(this.scene, maxAniso, this.isSoftwareGl);
    this.shadowTexture = createContactShadowTexture();

    // Weapon Rig mounted to camera
    this.weaponRig = createWeaponRig();
    this.weaponRig.root.position.set(0.24, -0.24, -0.44);
    this.camera.add(this.weaponRig.root);

    this.scene.add(this.enemyVisualGroup);
    this.scene.add(this.vfxGroup);

    this.decoyVisual = createDecoyProjection();
    this.decoyVisual.root.visible = false;
    this.scene.add(this.decoyVisual.root);

    // Pre-allocate pools
    for (let i = 0; i < 20; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(),
        new THREE.Vector3(0, 0, -1),
      ]);
      const mat = new THREE.LineBasicMaterial({
        color: 0x34d399,
        transparent: true,
        opacity: 0,
      });
      const line = new THREE.Line(geo, mat);
      line.visible = false;
      line.frustumCulled = false;
      this.vfxGroup.add(line);
      this.tracers.push({ line, mat, life: 0, maxLife: 0.12 });
    }

    const sparkGeo = new THREE.BoxGeometry(0.11, 0.11, 0.11);
    for (let i = 0; i < 48; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
      const mesh = new THREE.Mesh(sparkGeo, mat);
      mesh.visible = false;
      this.vfxGroup.add(mesh);
      this.sparks.push({ mesh, vel: new THREE.Vector3(), life: 0, maxLife: 0.35 });
    }

    const projGeo = new THREE.SphereGeometry(0.2, 8, 8);
    for (let i = 0; i < 24; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xff5500 });
      const mesh = new THREE.Mesh(projGeo, mat);
      mesh.visible = false;
      this.vfxGroup.add(mesh);
      this.projectiles.push({
        mesh,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        damage: 10,
        life: 0,
        freezeTimer: 0,
        active: false,
      });
    }

    if (!this.isSoftwareGl) {
      this.postProcessor = new ChronoPostProcessor(this.renderer, this.scene, this.camera);
      this.postProcessor.setSize(
        width,
        height,
        Math.min(window.devicePixelRatio, 2)
      );
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private bindEvents() {
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('contextmenu', this.handleContextMenu);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  private unbindEvents() {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('contextmenu', this.handleContextMenu);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  private clearInputs() {
    this.heldKeys.clear();
    this.mouseDown = false;
  }

  public setSettings(next: Partial<GameSettings>) {
    this.settings = { ...this.settings, ...next };
    chronoAudio.setMuted(this.settings.muted);
    this.emitHud();
  }

  public requestPointerLock() {
    const el = this.renderer.domElement;
    if (document.pointerLockElement !== el) {
      el.requestPointerLock?.();
    }
  }

  public startNewGame() {
    this.resetMatchState('playing');
    this.requestPointerLock();
    this.emitHud();
  }

  public resumeGame() {
    if (this.phase === 'paused') {
      this.phase = 'playing';
      this.requestPointerLock();
      this.emitHud();
    }
  }

  public pauseGame() {
    if (this.phase === 'playing') {
      this.phase = 'paused';
      this.clearInputs();
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
      this.emitHud();
    }
  }

  public continueSweep() {
    if (this.phase === 'victory') {
      this.sweepMode = true;
      this.phase = 'playing';
      this.setBanner('PERFECT SWEEP ACTIVE — SECURE THE FINAL ANCHOR', 'magenta', 4.0);
      this.requestPointerLock();
      this.emitHud();
    }
  }

  public returnToTitle() {
    this.clearInputs();
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    this.resetMatchState('title');
    this.emitHud();
  }

  private resetMatchState(targetPhase: GamePhase) {
    this.phase = targetPhase;
    this.activeTimeline = 'present';
    this.applyEraVisibility('present');

    this.playerPos.set(0, 0, 22);
    this.playerVel.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.grounded = true;
    this.hp = this.maxHp;
    this.dashTimer = 0;
    this.dashActiveTimer = 0;
    this.stasisTimer = 0;
    this.chronalStasisCooldownTimer = 0;
    this.chronalStasisActiveTimer = 0;
    this.chronalStasisEra = null;
    this.decoyCooldownTimer = 0;
    this.decoyActiveTimer = 0;
    this.decoyTimeline = null;
    if (this.decoyVisual) {
      this.decoyVisual.root.visible = false;
    }
    this.chronoBreakTimer = 0;
    this.shiftCooldownTimer = 0;
    this.morphAnimTimer = 0;

    this.ammoByEra = {
      past: WEAPON_PROFILES.past.magSize,
      present: WEAPON_PROFILES.present.magSize,
      future: WEAPON_PROFILES.future.magSize,
    };
    this.fireCooldown = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.recoilPitch = 0;
    this.recoilZ = 0;
    this.cameraShake = 0;
    this.hitstopTimer = 0;
    this.sweepMode = false;

    this.elapsedSeconds = 0;
    this.kills = 0;
    this.shotsFired = 0;
    this.shotsHit = 0;
    this.headshots = 0;
    this.phaseShifts = 0;
    this.hitMarkerTimer = 0;
    this.critMarkerTimer = 0;
    this.damageFlashTimer = 0;
    this.shiftFlashTimer = 0;

    this.timelines = {
      past: {
        id: 'past',
        captureProgress: 0,
        secured: false,
        anchorUnlocked: false,
        counterWaveTriggered: false,
        enemiesRemaining: 0,
        riftSurge: 0,
        playerInsideRing: false,
      },
      present: {
        id: 'present',
        captureProgress: 0,
        secured: false,
        anchorUnlocked: false,
        counterWaveTriggered: false,
        enemiesRemaining: 0,
        riftSurge: 0,
        playerInsideRing: false,
      },
      future: {
        id: 'future',
        captureProgress: 0,
        secured: false,
        anchorUnlocked: false,
        counterWaveTriggered: false,
        enemiesRemaining: 0,
        riftSurge: 0,
        playerInsideRing: false,
      },
    };

    // Clear existing enemies & projectiles
    for (const enemy of this.enemies) {
      this.enemyVisualGroup.remove(enemy.visual.root);
    }
    this.enemies = [];
    for (const proj of this.projectiles) {
      proj.active = false;
      proj.mesh.visible = false;
    }

    // Spawn era patrols around their respective Chrono-Anchors
    this.spawnEraSquad('past');
    this.spawnEraSquad('present');
    this.spawnEraSquad('future');

    this.weaponRig.root.visible = targetPhase !== 'title';
    this.setBanner('ELIMINATE ANCHOR DEFENDERS & CAPTURE 2 OF 3 TIMELINES', 'neutral', 5.0);
  }

  private spawnEraSquad(era: TimelineId) {
    const anchor = ANCHOR_COORDS[era];
    const offsets: [number, number, 'heavy' | 'ranged'][] = [
      [-4.8, 4.5, 'heavy'],
      [4.8, 4.2, 'ranged'],
      [0, -6.0, 'ranged'],
      [era === 'future' ? -8.5 : 8.5, 8.0, 'heavy'],
      [-10.5, -2.5, 'ranged'],
      [9.5, -6.5, 'ranged'],
    ];
    for (const [ox, oz, variant] of offsets) {
      this.spawnEnemy(era, variant, anchor.x + ox, anchor.z + oz);
    }
  }

  private spawnEnemy(era: TimelineId, variant: 'heavy' | 'ranged', x: number, z: number) {
    const id = this.nextEnemyId++;
    const visual = createEnemyVisual(era, variant, id, this.shadowTexture, this.isSoftwareGl);
    // Clamp inside playfield
    const cx = THREE.MathUtils.clamp(x, -31, 31);
    const cz = THREE.MathUtils.clamp(z, -31, 31);
    visual.root.position.set(cx, 0, cz);
    visual.root.visible = era === this.activeTimeline;
    this.enemyVisualGroup.add(visual.root);

    const diffMult = this.settings.difficulty === 'nightmare' ? 1.35 : 1.0;
    const rawHp =
      era === 'past'
        ? variant === 'heavy'
          ? 200
          : 110
        : era === 'present'
          ? variant === 'heavy'
            ? 155
            : 95
          : variant === 'heavy'
            ? 225
            : 120;
    const baseMaxHp = Math.round(rawHp * diffMult);
    const maxHp = Math.round(baseMaxHp * this.getAnchorHpScale());

    const rawSpeed =
      era === 'past'
        ? variant === 'heavy'
          ? 4.8
          : 3.7
        : era === 'present'
          ? variant === 'heavy'
            ? 5.2
            : 6.2
          : variant === 'heavy'
            ? 4.1
            : 2.8;
    const baseSpeed = rawSpeed * (this.settings.difficulty === 'nightmare' ? 1.12 : 1.0);
    const speed = baseSpeed * this.getAnchorSpeedScale();

    this.enemies.push({
      id,
      era,
      variant,
      visual,
      position: new THREE.Vector3(cx, 0, cz),
      velocityY: 0,
      hp: maxHp,
      maxHp,
      baseMaxHp,
      speed,
      baseSpeed,
      attackRange: variant === 'heavy' && era === 'past' ? 15 : 27,
      state: 'chase',
      stateTimer: 0.45 + Math.random() * 0.75,
      slowTimer: 0,
      hitFlashTimer: 0,
      freezeTimer: 0,
      strafeSign: Math.random() > 0.5 ? 1 : -1,
      shieldBroken: false,
    });

    this.recountEraEnemies();
  }

  private getSecuredAnchorCount(): number {
    if (!this.timelines) return 0;
    return TIMELINE_ORDER.filter((id) => this.timelines[id].secured).length;
  }

  private getAnchorHpScale(secured = this.getSecuredAnchorCount()): number {
    if (secured >= 2) return 1.58;
    if (secured === 1) return 1.28;
    return 1.0;
  }

  private getAnchorAggressionScale(secured = this.getSecuredAnchorCount()): number {
    if (secured >= 2) return 1.42;
    if (secured === 1) return 1.22;
    return 1.0;
  }

  private getAnchorSpeedScale(secured = this.getSecuredAnchorCount()): number {
    const aggro = this.getAnchorAggressionScale(secured);
    return 1 + (aggro - 1) * 0.72;
  }

  private applyAnchorDifficultyEscalation(securedCount: number) {
    const hpScale = this.getAnchorHpScale(securedCount);
    const speedScale = this.getAnchorSpeedScale(securedCount);
    for (const enemy of this.enemies) {
      const nextMaxHp = Math.round(enemy.baseMaxHp * hpScale);
      const ratio = nextMaxHp / Math.max(1, enemy.maxHp);
      enemy.hp = Math.max(1, Math.round(enemy.hp * ratio));
      enemy.maxHp = nextMaxHp;
      enemy.speed = enemy.baseSpeed * speedScale;
    }
  }

  private recountEraEnemies() {
    for (const era of TIMELINE_ORDER) {
      const count = this.enemies.filter((e) => e.era === era).length;
      const prevUnlocked = this.timelines[era].anchorUnlocked;
      this.timelines[era].enemiesRemaining = count;
      if (count === 0 && !this.timelines[era].secured) {
        this.timelines[era].anchorUnlocked = true;
        if (!prevUnlocked && this.phase === 'playing') {
          const cfg = ERA_CONFIGS[era];
          this.setBanner(
            `${cfg.eraLabel} ANCHOR UNLOCKED — ENTER RING TO CAPTURE`,
            era === 'past' ? 'amber' : era === 'present' ? 'emerald' : 'magenta',
            4.2
          );
        }
      } else if (count > 0 && !this.timelines[era].secured) {
        this.timelines[era].anchorUnlocked = false;
      }
    }
  }

  private setBanner(
    text: string,
    tone: HudSnapshot['statusBannerTone'],
    duration = 3.2
  ) {
    this.statusBanner = text;
    this.statusBannerTone = tone;
    this.bannerTimer = duration;
  }

  private applyEraVisibility(era: TimelineId) {
    for (const id of TIMELINE_ORDER) {
      this.arena.eraGroups[id].visible = id === era;
      this.weaponRig.forms[id].visible = id === era;
    }
    for (const enemy of this.enemies) {
      enemy.visual.root.visible = enemy.era === era;
    }
    if (this.decoyVisual) {
      this.decoyVisual.root.visible = this.decoyActiveTimer > 0 && this.decoyTimeline === era;
    }
  }

  private phaseShiftTo(targetEra: TimelineId) {
    if (this.phase !== 'playing') return;
    if (targetEra === this.activeTimeline) return;
    if (this.shiftCooldownTimer > 0) return;

    this.activeTimeline = targetEra;
    this.shiftCooldownTimer = this.timelines.future.secured ? 0.28 : 0.45;
    this.morphAnimTimer = 0.24;
    this.shiftFlashTimer = 0.26;
    this.chronoBreakTimer = 2.6; // +35% tactical ambush strike window!
    this.reloading = false;
    this.reloadTimer = 0;
    this.phaseShifts += 1;

    // Clear active enemy projectiles from the previous century
    for (const p of this.projectiles) {
      p.active = false;
      p.mesh.visible = false;
    }

    this.applyEraVisibility(targetEra);
    this.pushPlayerOutOfColliders(targetEra);
    this.postProcessor?.triggerPhaseShift(targetEra);
    chronoAudio.playPhaseShift(targetEra);
    this.emitHud();
  }

  private cycleTimeline(dir: 1 | -1) {
    const idx = TIMELINE_ORDER.indexOf(this.activeTimeline);
    const nextIdx = (idx + dir + TIMELINE_ORDER.length) % TIMELINE_ORDER.length;
    this.phaseShiftTo(TIMELINE_ORDER[nextIdx]);
  }

  private pushPlayerOutOfColliders(era: TimelineId) {
    this.resolvePointOutOfColliders(this.playerPos, era, 0.65);
  }

  private resolvePointOutOfColliders(pos: THREE.Vector3, era: TimelineId, radius: number) {
    const colliders = this.arena.collidersByEra[era];
    for (let pass = 0; pass < 3; pass++) {
      for (const box of colliders) {
        if (pos.y >= box.maxY - 0.1 || pos.y + 1.8 <= box.minY) {
          continue;
        }
        const closestX = THREE.MathUtils.clamp(pos.x, box.minX, box.maxX);
        const closestZ = THREE.MathUtils.clamp(pos.z, box.minZ, box.maxZ);
        const dx = pos.x - closestX;
        const dz = pos.z - closestZ;
        const distSq = dx * dx + dz * dz;
        if (distSq < radius * radius) {
          // If directly inside box, pick shortest axis pushout
          if (distSq < 0.0001) {
            const left = Math.abs(pos.x - box.minX);
            const right = Math.abs(box.maxX - pos.x);
            const front = Math.abs(pos.z - box.minZ);
            const back = Math.abs(box.maxZ - pos.z);
            const minPen = Math.min(left, right, front, back);
            if (minPen === left) pos.x = box.minX - radius;
            else if (minPen === right) pos.x = box.maxX + radius;
            else if (minPen === front) pos.z = box.minZ - radius;
            else pos.z = box.maxZ + radius;
          } else {
            const dist = Math.sqrt(distSq);
            const push = radius - dist;
            pos.x += (dx / dist) * push;
            pos.z += (dz / dist) * push;
          }
        }
      }
    }
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.repeat) return;
    this.heldKeys.add(e.code);

    if (e.code === 'Escape' && this.phase === 'playing') {
      this.pauseGame();
      return;
    }

    if (this.phase !== 'playing') return;

    if (e.code === 'Space') {
      this.jumpBufferTimer = 0.14;
    } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.triggerDash();
    } else if (e.code === 'Digit1') {
      this.phaseShiftTo('past');
    } else if (e.code === 'Digit2') {
      this.phaseShiftTo('present');
    } else if (e.code === 'Digit3') {
      this.phaseShiftTo('future');
    } else if (e.code === 'KeyQ') {
      this.cycleTimeline(-1);
    } else if (e.code === 'KeyE') {
      this.cycleTimeline(1);
    } else if (e.code === 'KeyR') {
      this.triggerReload();
    } else if (e.code === 'KeyF') {
      this.triggerStasisPulse();
    } else if (e.code === 'KeyC') {
      this.triggerChronalStasis();
    } else if (e.code === 'KeyG') {
      this.triggerTemporalDecoy();
    }
  }

  private onKeyUp(e: KeyboardEvent) {
    this.heldKeys.delete(e.code);
  }

  private onMouseMove(e: MouseEvent) {
    if (this.phase !== 'playing' || !this.pointerLocked) return;
    const sens = 0.0021 * this.settings.sensitivity;
    this.yaw -= e.movementX * sens;
    this.pitch = THREE.MathUtils.clamp(
      this.pitch - e.movementY * sens,
      -Math.PI / 2 + 0.05,
      Math.PI / 2 - 0.05
    );
  }

  private onMouseDown(e: MouseEvent) {
    if (this.phase !== 'playing') return;
    if (!this.pointerLocked) {
      if (e.button === 0) this.requestPointerLock();
      return;
    }
    if (e.button === 0) {
      this.mouseDown = true;
      this.tryShoot();
    } else if (e.button === 2) {
      this.triggerStasisPulse();
    }
  }

  private onMouseUp(e: MouseEvent) {
    if (e.button === 0) {
      this.mouseDown = false;
    }
  }

  private onPointerLockChange() {
    const locked = document.pointerLockElement === this.renderer.domElement;
    this.pointerLocked = locked;
    if (!locked && this.phase === 'playing') {
      this.pauseGame();
    } else {
      this.emitHud();
    }
  }

  private onResize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    const pixelRatio = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2);
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(pixelRatio);
    this.postProcessor?.setSize(width, height, pixelRatio);
  }

  private triggerDash() {
    if (this.dashTimer > 0) return;
    const futureBonus = this.timelines.future.secured ? 0.6 : 1.0;
    this.dashTimer = 2.1 * futureBonus;
    this.dashActiveTimer = 0.16;

    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    this.dashDir.set(0, 0, 0);
    if (this.heldKeys.has('KeyW')) this.dashDir.add(_forward);
    if (this.heldKeys.has('KeyS')) this.dashDir.sub(_forward);
    if (this.heldKeys.has('KeyD')) this.dashDir.add(_right);
    if (this.heldKeys.has('KeyA')) this.dashDir.sub(_right);
    if (this.dashDir.lengthSq() < 0.01) {
      this.dashDir.copy(_forward);
    } else {
      this.dashDir.normalize();
    }
    this.cameraShake = Math.max(this.cameraShake, 0.015);
    chronoAudio.playDash();
  }

  private triggerStasisPulse() {
    if (this.phase !== 'playing' || this.stasisTimer > 0) return;
    const futureBonus = this.timelines.future.secured ? 0.65 : 1.0;
    this.stasisTimer = 9.5 * futureBonus;
    this.cameraShake = Math.max(this.cameraShake, 0.025);
    chronoAudio.playStasisPulse();

    // Shatter all airborne enemy projectiles
    let shattered = 0;
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.active = false;
      p.mesh.visible = false;
      this.spawnSparkBurst(p.pos, 0x38bdf8, 4);
      shattered += 1;
    }

    // Stagger & strip shields on nearby active enemies (11m radius)
    let stunned = 0;
    for (const enemy of this.enemies) {
      if (enemy.era !== this.activeTimeline) continue;
      const d = Math.hypot(
        enemy.position.x - this.playerPos.x,
        enemy.position.z - this.playerPos.z
      );
      if (d <= 11.5) {
        stunned += 1;
        enemy.state = 'stagger';
        enemy.stateTimer = 2.2;
        enemy.hp -= 22;
        if (!enemy.shieldBroken && enemy.visual.shieldMesh) {
          enemy.shieldBroken = true;
          enemy.visual.shieldMesh.visible = false;
        }
        this.spawnSparkBurst(
          _v1.set(enemy.position.x, 1.35, enemy.position.z),
          0x38bdf8,
          8
        );
        if (enemy.hp <= 0) {
          this.handleEnemyKilled(enemy);
          chronoAudio.playKill(false);
        }
      }
    }

    // Suppress Rift Surge by 20% across uncaptured timelines
    for (const era of TIMELINE_ORDER) {
      if (!this.timelines[era].secured) {
        this.timelines[era].riftSurge = Math.max(0, this.timelines[era].riftSurge - 20);
      }
    }

    this.setBanner(
      `STASIS PULSE — ${shattered} SHOTS SHATTERED · ${stunned} FOES STUNNED`,
      'emerald',
      2.6
    );
    this.emitHud();
  }

  private triggerChronalStasis() {
    if (this.phase !== 'playing' || this.chronalStasisCooldownTimer > 0) return;

    const freezeDuration = 3.0;
    this.chronalStasisCooldownTimer = 15.0;
    this.chronalStasisActiveTimer = freezeDuration;
    this.chronalStasisEra = this.activeTimeline;
    this.cameraShake = Math.max(this.cameraShake, 0.02);

    let frozenCount = 0;
    for (const enemy of this.enemies) {
      if (enemy.era !== this.activeTimeline) continue;
      enemy.freezeTimer = freezeDuration;
      enemy.visual.stasisCage.visible = true;
      frozenCount += 1;
      this.spawnSparkBurst(
        _v1.set(enemy.position.x, 1.35, enemy.position.z),
        0x22d3ee,
        7
      );
    }

    // Freeze airborne enemy projectiles in place during the 3-second time lock
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.freezeTimer = freezeDuration;
    }

    this.postProcessor?.triggerChronalStasis();
    chronoAudio.playChronalStasis();
    const eraLabel = ERA_CONFIGS[this.activeTimeline].eraLabel;
    this.setBanner(
      frozenCount > 0
        ? `CHRONAL STASIS — ${frozenCount} ${eraLabel} FOES FROZEN (3.0s)`
        : `CHRONAL STASIS — ${eraLabel} TIMELINE LOCKED (3.0s)`,
      'cyan',
      3.0
    );
    this.emitHud();
  }

  private triggerTemporalDecoy() {
    if (this.phase !== 'playing' || this.decoyCooldownTimer > 0) return;

    const otherEras = TIMELINE_ORDER.filter((e) => e !== this.activeTimeline);
    const activeIdx = TIMELINE_ORDER.indexOf(this.activeTimeline);
    const nextEra = TIMELINE_ORDER[(activeIdx + 1) % TIMELINE_ORDER.length];

    // Prefer an uncaptured timeline with living defenders; fallback to uncaptured, then next timeline
    const targetEra =
      otherEras.find((e) => !this.timelines[e].secured && this.timelines[e].enemiesRemaining > 0) ??
      otherEras.find((e) => this.timelines[e].enemiesRemaining > 0) ??
      otherEras.find((e) => !this.timelines[e].secured) ??
      nextEra;

    this.decoyCooldownTimer = 20.0;
    this.decoyActiveTimer = 6.5;
    this.decoyTimeline = targetEra;
    this.decoyPos.set(
      THREE.MathUtils.clamp(this.playerPos.x, -30, 30),
      0,
      THREE.MathUtils.clamp(this.playerPos.z, -30, 30)
    );
    this.resolvePointOutOfColliders(this.decoyPos, targetEra, 0.75);
    this.decoyVisual.root.position.copy(this.decoyPos);
    this.decoyVisual.root.rotation.y = this.yaw;
    this.decoyVisual.root.visible = false;

    chronoAudio.playTemporalDecoy();
    this.setBanner(
      `TEMPORAL DECOY PROJECTED INTO ${ERA_CONFIGS[targetEra].eraLabel} (6.5s)`,
      'cyan',
      3.4
    );
    this.emitHud();
  }

  private triggerReload() {
    const prof = WEAPON_PROFILES[this.activeTimeline];
    if (this.reloading) return;
    if (this.ammoByEra[this.activeTimeline] >= prof.magSize) return;
    this.reloading = true;
    const reloadMult = this.timelines.present.secured ? 0.76 : 1.0;
    this.reloadTimer = prof.reloadTime * reloadMult;
    chronoAudio.playReload();
  }

  private tryShoot() {
    if (this.fireCooldown > 0 || this.reloading || this.morphAnimTimer > 0.08) return;
    const prof = WEAPON_PROFILES[this.activeTimeline];
    const currentAmmo = this.ammoByEra[this.activeTimeline];
    if (currentAmmo <= 0) {
      this.triggerReload();
      return;
    }

    this.ammoByEra[this.activeTimeline] = currentAmmo - 1;
    const rateMult = this.timelines.present.secured ? 0.78 : 1.0;
    this.fireCooldown = prof.fireInterval * rateMult;

    this.shotsFired += 1;
    this.recoilZ = 0.085;
    this.recoilPitch = prof.era === 'past' ? 0.045 : prof.era === 'future' ? 0.055 : 0.016;
    this.cameraShake = Math.max(
      this.cameraShake,
      prof.era === 'past' ? 0.025 : prof.era === 'future' ? 0.028 : 0.008
    );
    this.muzzleFlashTimer = 0.055;
    this.weaponRig.muzzleLight.color.setHex(prof.tracerColor);
    this.weaponRig.muzzleLight.intensity = 4.5;
    (this.weaponRig.muzzleFlash.material as THREE.MeshBasicMaterial).color.setHex(
      prof.tracerColor
    );

    chronoAudio.playShoot(this.activeTimeline);

    // Compute muzzle world origin for visual tracer
    this.weaponRig.muzzleAnchor.getWorldPosition(_v3);

    // Collect active era enemy meshes & cover meshes
    const enemyMeshes: THREE.Object3D[] = [];
    for (const enemy of this.enemies) {
      if (enemy.era === this.activeTimeline) {
        enemyMeshes.push(...enemy.visual.bodyParts);
      }
    }
    const wallMeshes = this.arena.bulletMeshesByEra[this.activeTimeline];

    _rayOrigin.copy(this.camera.position);

    let landedAnyHit = false;
    let landedCrit = false;
    let killedAny = false;

    for (let p = 0; p < prof.pellets; p++) {
      _rayDir.set(
        (Math.random() - 0.5) * prof.spread * 2,
        (Math.random() - 0.5) * prof.spread * 2,
        -1
      );
      _rayDir.normalize().applyQuaternion(this.camera.quaternion);

      _raycaster.set(_rayOrigin, _rayDir);
      _raycaster.far = prof.range;

      const wallHits = _raycaster.intersectObjects(wallMeshes, false);
      const maxDist = wallHits.length > 0 ? wallHits[0].distance : prof.range;

      const enemyHits = _raycaster.intersectObjects(enemyMeshes, false);
      let endPoint = _v2.copy(_rayOrigin).addScaledVector(_rayDir, maxDist);

      if (enemyHits.length > 0 && enemyHits[0].distance < maxDist) {
        const hit = enemyHits[0];
        endPoint = hit.point;
        const enemyId = hit.object.userData.enemyId as number | undefined;
        const isHead = Boolean(hit.object.userData.isHead);
        const enemy = this.enemies.find((e) => e.id === enemyId);

        if (enemy) {
          landedAnyHit = true;
          const chronoMult = this.chronoBreakTimer > 0 ? 1.35 : 1.0;
          const highGroundMult = this.playerPos.y > 0.6 ? 1.2 : 1.0;
          let dmg = prof.damage * (isHead ? 1.75 : 1.0) * chronoMult * highGroundMult;
          if (isHead) landedCrit = true;

          // Future Enforcer Mech frontal shield attenuation unless shattered, Chrono-Break active, or Rail-Lance
          if (enemy.era === 'future' && enemy.variant === 'heavy' && !enemy.shieldBroken) {
            _v1.subVectors(this.playerPos, enemy.position).normalize();
            const fx = Math.sin(enemy.visual.root.rotation.y);
            const fz = Math.cos(enemy.visual.root.rotation.y);
            const dot = fx * _v1.x + fz * _v1.z;
            if (dot > 0.3 && prof.era !== 'future' && this.chronoBreakTimer <= 0) {
              dmg *= 0.32;
            } else if (prof.era === 'future' || this.chronoBreakTimer > 0) {
              dmg *= prof.shieldMultiplier;
              if (this.chronoBreakTimer > 0 && enemy.visual.shieldMesh) {
                enemy.shieldBroken = true;
                enemy.visual.shieldMesh.visible = false;
              }
            }
          }

          enemy.hp -= dmg;
          enemy.hitFlashTimer = 0.09;
          if (prof.cryoSlowDuration > 0) {
            enemy.slowTimer = prof.cryoSlowDuration;
          }
          if (prof.staggerPower >= 0.7 && enemy.state !== 'stagger' && enemy.freezeTimer <= 0) {
            enemy.state = 'stagger';
            enemy.stateTimer = 0.25;
          }

          this.spawnSparkBurst(hit.point, prof.tracerColor, 5);

          if (enemy.hp <= 0) {
            killedAny = true;
            this.handleEnemyKilled(enemy);
          }
        }
      } else if (wallHits.length > 0) {
        this.spawnSparkBurst(wallHits[0].point, 0x94a3b8, 3);
      }

      this.spawnTracer(_v3, endPoint, prof.tracerColor);
    }

    if (landedAnyHit) {
      this.shotsHit += 1;
      if (landedCrit) {
        this.headshots += 1;
        this.critMarkerTimer = 0.18;
        chronoAudio.playHeadshot();
      } else {
        this.hitMarkerTimer = 0.14;
        chronoAudio.playStandardHit();
      }
    }

    if (killedAny) {
      this.hitstopTimer = 0.042; // crisp 42ms impact hitstop
      chronoAudio.playKill(landedCrit);
    }

    if (this.ammoByEra[this.activeTimeline] <= 0) {
      this.triggerReload();
    }
  }

  private handleEnemyKilled(enemy: ActiveEnemy) {
    this.kills += 1;
    this.spawnSparkBurst(
      _v1.set(enemy.position.x, 1.3, enemy.position.z),
      enemy.era === 'past' ? 0xf59e0b : enemy.era === 'present' ? 0x10b981 : 0xe879f9,
      14
    );
    this.enemyVisualGroup.remove(enemy.visual.root);
    this.enemies = this.enemies.filter((e) => e.id !== enemy.id);
    this.recountEraEnemies();
  }

  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, colorHex: number) {
    const slot = this.tracers.find((t) => t.life <= 0) || this.tracers[0];
    const posAttr = slot.line.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.setXYZ(0, start.x, start.y, start.z);
    posAttr.setXYZ(1, end.x, end.y, end.z);
    posAttr.needsUpdate = true;
    slot.mat.color.setHex(colorHex);
    slot.mat.opacity = 0.95;
    slot.life = slot.maxLife;
    slot.line.visible = true;
  }

  private spawnSparkBurst(origin: THREE.Vector3, colorHex: number, count: number) {
    let spawned = 0;
    for (const s of this.sparks) {
      if (s.life > 0) continue;
      s.mesh.position.copy(origin);
      (s.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
      s.vel.set(
        (Math.random() - 0.5) * 9,
        1.5 + Math.random() * 5,
        (Math.random() - 0.5) * 9
      );
      s.life = s.maxLife;
      s.mesh.visible = true;
      s.mesh.scale.setScalar(1);
      spawned += 1;
      if (spawned >= count) break;
    }
  }

  private spawnEnemyProjectile(
    origin: THREE.Vector3,
    target: THREE.Vector3,
    speed: number,
    damage: number,
    colorHex: number
  ) {
    const slot = this.projectiles.find((p) => !p.active);
    if (!slot) return;
    slot.active = true;
    slot.pos.copy(origin);
    slot.vel.subVectors(target, origin).normalize().multiplyScalar(speed);
    slot.damage = damage;
    slot.life = 3.2;
    slot.freezeTimer = 0;
    (slot.mesh.material as THREE.MeshBasicMaterial).color.setHex(colorHex);
    slot.mesh.position.copy(origin);
    slot.mesh.visible = true;
  }

  private startLoop() {
    const tick = () => {
      if (this.disposed) return;
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      this.update(dt, now * 0.001);
      if (this.isSoftwareGl || !this.postProcessor) {
        this.renderer.render(this.scene, this.camera);
      } else {
        this.postProcessor.render();
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private update(dt: number, elapsed: number) {
    this.postProcessor?.update(dt, elapsed);

    // Update atmosphere smoothly towards active era
    const atm = ERA_ATMOSPHERE[this.activeTimeline];
    _skyTarget.setHex(atm.skyHex);
    _fogTarget.setHex(atm.fogHex);
    _keyTarget.setHex(atm.keyColor);
    _hemiSkyTarget.setHex(atm.hemiSky);
    _hemiGroundTarget.setHex(atm.hemiGround);

    const atmLerp = 1 - Math.exp(-10 * dt);
    (this.scene.background as THREE.Color).lerp(_skyTarget, atmLerp);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.lerp(_fogTarget, atmLerp);
      this.scene.fog.density = THREE.MathUtils.lerp(
        this.scene.fog.density,
        atm.fogDensity,
        atmLerp
      );
    }
    this.keyLight.color.lerp(_keyTarget, atmLerp);
    this.keyLight.intensity = THREE.MathUtils.lerp(
      this.keyLight.intensity,
      atm.keyIntensity,
      atmLerp
    );
    this.hemiLight.color.lerp(_hemiSkyTarget, atmLerp);
    this.hemiLight.groundColor.lerp(_hemiGroundTarget, atmLerp);

    // Animate Chrono-Anchor Spires & ambient props even on Title Screen
    for (const era of TIMELINE_ORDER) {
      const spire = this.arena.spires[era];
      const st = this.timelines[era];
      spire.gyroRings[0].rotation.x += dt * (st.secured ? 2.2 : 0.9);
      spire.gyroRings[0].rotation.y += dt * 1.1;
      spire.gyroRings[1].rotation.z -= dt * (st.secured ? 2.4 : 1.2);
      spire.coreCrystal.rotation.y += dt * 1.6;
      spire.coreCrystal.position.y = 2.6 + Math.sin(elapsed * 2.2) * 0.16;

      // Color feedback on Spire core
      const mat = spire.coreCrystal.material as THREE.MeshStandardMaterial;
      if (st.secured) {
        mat.color.setHex(0x38bdf8);
        mat.emissive.setHex(0x38bdf8);
        spire.pointLight.color.setHex(0x38bdf8);
        (spire.ringFloor.material as THREE.MeshBasicMaterial).color.setHex(0x38bdf8);
        (spire.ringFloor.material as THREE.MeshBasicMaterial).opacity = 0.75;
      } else if (st.anchorUnlocked) {
        (spire.ringFloor.material as THREE.MeshBasicMaterial).opacity = 0.85;
      } else {
        (spire.ringFloor.material as THREE.MeshBasicMaterial).opacity = 0.3;
      }
    }

    for (const prop of this.arena.animatedProps) {
      prop.mesh.rotation.y += dt * prop.speed;
      prop.mesh.position.y = prop.baseY + Math.sin(elapsed * prop.speed) * 0.12;
    }
    this.arena.ambientParticles.rotation.y += dt * 0.04;

    if (this.phase === 'title') {
      this.titleOrbitAngle += dt * 0.18;
      const anchor = ANCHOR_COORDS.present;
      this.camera.position.set(
        anchor.x + Math.cos(this.titleOrbitAngle) * 24,
        10.5 + Math.sin(this.titleOrbitAngle * 0.7) * 2.0,
        anchor.z + Math.sin(this.titleOrbitAngle) * 24 + 12
      );
      this.camera.lookAt(0, 2.2, -6);
      return;
    }

    if (this.phase !== 'playing') {
      return;
    }

    // Brief hitstop freezes combat simulation while keeping VFX responsive
    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
      this.updateVfx(dt);
      return;
    }

    this.elapsedSeconds += dt;

    // Timers
    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.dashTimer > 0) this.dashTimer = Math.max(0, this.dashTimer - dt);
    if (this.stasisTimer > 0) this.stasisTimer = Math.max(0, this.stasisTimer - dt);
    if (this.chronalStasisCooldownTimer > 0) {
      this.chronalStasisCooldownTimer = Math.max(0, this.chronalStasisCooldownTimer - dt);
    }
    if (this.chronalStasisActiveTimer > 0) {
      this.chronalStasisActiveTimer = Math.max(0, this.chronalStasisActiveTimer - dt);
      if (this.chronalStasisActiveTimer <= 0) {
        this.chronalStasisEra = null;
      }
    }
    if (this.decoyCooldownTimer > 0) {
      this.decoyCooldownTimer = Math.max(0, this.decoyCooldownTimer - dt);
    }
    if (this.decoyActiveTimer > 0) {
      this.decoyActiveTimer = Math.max(0, this.decoyActiveTimer - dt);
      if (this.decoyActiveTimer <= 0) {
        this.decoyTimeline = null;
        this.decoyVisual.root.visible = false;
      } else if (this.decoyVisual.root.visible) {
        this.decoyVisual.haloRing.rotation.z += dt * 3.2;
        this.decoyVisual.ringFloor.rotation.z -= dt * 1.4;
        this.decoyVisual.bodyGroup.position.y = Math.sin(elapsed * 5.0) * 0.07;
      }
    }
    if (this.chronoBreakTimer > 0)
      this.chronoBreakTimer = Math.max(0, this.chronoBreakTimer - dt);
    if (this.shiftCooldownTimer > 0)
      this.shiftCooldownTimer = Math.max(0, this.shiftCooldownTimer - dt);
    if (this.hitMarkerTimer > 0) this.hitMarkerTimer = Math.max(0, this.hitMarkerTimer - dt);
    if (this.critMarkerTimer > 0) this.critMarkerTimer = Math.max(0, this.critMarkerTimer - dt);
    if (this.damageFlashTimer > 0)
      this.damageFlashTimer = Math.max(0, this.damageFlashTimer - dt);
    if (this.shiftFlashTimer > 0) this.shiftFlashTimer = Math.max(0, this.shiftFlashTimer - dt);
    if (this.bannerTimer > 0) this.bannerTimer = Math.max(0, this.bannerTimer - dt);

    // Past Anchor Buff: Passive Suit Integrity Regen
    if (this.timelines.past.secured && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + 2.2 * dt);
    }

    // Auto-fire if holding LMB
    if (this.mouseDown && this.pointerLocked) {
      this.tryShoot();
    }

    // Reload progression
    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloading = false;
        this.ammoByEra[this.activeTimeline] = WEAPON_PROFILES[this.activeTimeline].magSize;
      }
    }

    this.updatePlayerMovement(dt, elapsed);
    this.updateWeaponViewmodel(dt, elapsed);
    this.updateEnemies(dt);
    this.updateProjectiles(dt);
    this.updateAnchorsAndSurge(dt);
    this.updateVfx(dt);

    this.hudSyncAccum += dt;
    if (this.hudSyncAccum >= 0.05) {
      this.hudSyncAccum = 0;
      this.emitHud();
    }
  }

  private updatePlayerMovement(dt: number, elapsed: number) {
    const moveMult = this.timelines.future.secured ? 1.15 : 1.0;
    const baseSpeed = 9.4 * moveMult;

    _forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    _right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    _v1.set(0, 0, 0);
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) _v1.add(_forward);
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) _v1.sub(_forward);
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) _v1.add(_right);
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) _v1.sub(_right);
    if (_v1.lengthSq() > 0) _v1.normalize();

    if (this.dashActiveTimer > 0) {
      this.dashActiveTimer -= dt;
      this.playerVel.x = this.dashDir.x * 24;
      this.playerVel.z = this.dashDir.z * 24;
    } else {
      const accel = this.grounded ? 14 : 6;
      const targetVx = _v1.x * baseSpeed;
      const targetVz = _v1.z * baseSpeed;
      const alpha = 1 - Math.exp(-accel * dt);
      this.playerVel.x = THREE.MathUtils.lerp(this.playerVel.x, targetVx, alpha);
      this.playerVel.z = THREE.MathUtils.lerp(this.playerVel.z, targetVz, alpha);
    }

    // Coyote time + jump buffer
    if (this.grounded) {
      this.coyoteTimer = 0.12;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }
    if (this.jumpBufferTimer > 0) {
      this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    }
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.playerVel.y = 8.4;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
    }

    this.playerVel.y -= 21.5 * dt;

    // Integrate X then Z with AABB collision + step-up
    const colliders = this.arena.collidersByEra[this.activeTimeline];
    const radius = 0.62;

    this.playerPos.x += this.playerVel.x * dt;
    this.resolveHorizontalCollision(colliders, radius, 'x');

    this.playerPos.z += this.playerVel.z * dt;
    this.resolveHorizontalCollision(colliders, radius, 'z');

    // Vertical collision
    this.playerPos.y += this.playerVel.y * dt;
    let floorY = 0;
    for (const box of colliders) {
      if (
        this.playerPos.x + radius > box.minX &&
        this.playerPos.x - radius < box.maxX &&
        this.playerPos.z + radius > box.minZ &&
        this.playerPos.z - radius < box.maxZ
      ) {
        if (this.playerPos.y >= box.maxY - 0.5 && this.playerVel.y <= 0) {
          floorY = Math.max(floorY, box.maxY);
        }
      }
    }
    if (this.playerPos.y <= floorY) {
      this.playerPos.y = floorY;
      this.playerVel.y = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    // Hard arena safety clamp
    this.playerPos.x = THREE.MathUtils.clamp(this.playerPos.x, -34, 34);
    this.playerPos.z = THREE.MathUtils.clamp(this.playerPos.z, -34, 34);

    // Camera position + bob + trauma shake + FOV dash kick
    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    const bob =
      this.grounded && horizSpeed > 1.2 ? Math.sin(elapsed * 11.5) * 0.045 : 0;

    this.cameraShake = Math.max(0, this.cameraShake - dt * 0.14);
    const shakeX = (Math.random() - 0.5) * this.cameraShake * 0.8;
    const shakeY = (Math.random() - 0.5) * this.cameraShake * 0.8;

    this.camera.position.set(
      this.playerPos.x + shakeX,
      this.playerPos.y + 1.68 + bob + shakeY,
      this.playerPos.z
    );

    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, 14, dt);
    _euler.set(
      THREE.MathUtils.clamp(this.pitch + this.recoilPitch, -1.5, 1.5),
      this.yaw,
      0,
      'YXZ'
    );
    this.camera.quaternion.setFromEuler(_euler);

    const targetFov = this.dashActiveTimer > 0 ? 84 : 74;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 14, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private resolveHorizontalCollision(
    colliders: BoxCollider[],
    radius: number,
    axis: 'x' | 'z'
  ) {
    for (const box of colliders) {
      if (this.playerPos.y >= box.maxY - 0.05 || this.playerPos.y + 1.75 <= box.minY) {
        continue;
      }
      if (
        this.playerPos.x + radius > box.minX &&
        this.playerPos.x - radius < box.maxX &&
        this.playerPos.z + radius > box.minZ &&
        this.playerPos.z - radius < box.maxZ
      ) {
        // Allow step-up onto low slabs (<= 0.95m above feet)
        if (box.maxY - this.playerPos.y <= 0.95) {
          this.playerPos.y = box.maxY;
          continue;
        }
        if (axis === 'x') {
          if (this.playerVel.x > 0) this.playerPos.x = box.minX - radius;
          else if (this.playerVel.x < 0) this.playerPos.x = box.maxX + radius;
          this.playerVel.x = 0;
        } else {
          if (this.playerVel.z > 0) this.playerPos.z = box.minZ - radius;
          else if (this.playerVel.z < 0) this.playerPos.z = box.maxZ + radius;
          this.playerVel.z = 0;
        }
      }
    }
  }

  private updateWeaponViewmodel(dt: number, elapsed: number) {
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      this.weaponRig.muzzleFlash.visible = true;
      this.weaponRig.muzzleFlash.rotation.z += dt * 40;
    } else {
      this.weaponRig.muzzleFlash.visible = false;
      this.weaponRig.muzzleLight.intensity = 0;
    }

    this.recoilZ = THREE.MathUtils.damp(this.recoilZ, 0, 16, dt);

    // Morph animation during phase-shift
    let morphScale = 1;
    let morphRoll = 0;
    if (this.morphAnimTimer > 0) {
      this.morphAnimTimer = Math.max(0, this.morphAnimTimer - dt);
      const t = this.morphAnimTimer / 0.24; // 1 -> 0
      morphScale = 1 - Math.sin(t * Math.PI) * 0.45;
      morphRoll = Math.sin(t * Math.PI) * 0.65;
    }

    const reloadDip = this.reloading ? Math.sin(this.reloadTimer * 5) * 0.08 - 0.14 : 0;
    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    const swayX = this.grounded && horizSpeed > 1 ? Math.cos(elapsed * 5.8) * 0.012 : 0;
    const swayY = this.grounded && horizSpeed > 1 ? Math.abs(Math.sin(elapsed * 5.8)) * 0.01 : 0;

    this.weaponRig.root.position.set(
      0.24 + swayX,
      -0.24 - swayY + reloadDip,
      -0.44 + this.recoilZ
    );
    this.weaponRig.root.scale.setScalar(morphScale);
    this.weaponRig.root.rotation.set(this.recoilPitch * 1.6, 0, morphRoll);

    this.weaponRig.spinningParts.forEach((part, idx) => {
      if (idx === 0) {
        // Past Sunstone crystal drum rotates around its horizontal X axle
        part.rotation.x += dt * 3.4;
      } else if (idx === 1) {
        // Future outer singularity gimbal ring
        part.rotation.z += dt * 3.2;
        part.rotation.y += dt * 1.4;
      } else if (idx === 2) {
        // Future inner singularity gimbal ring
        part.rotation.x += dt * 4.2;
        part.rotation.z -= dt * 2.1;
      } else {
        // Future suspended singularity core
        part.rotation.y += dt * 5.0;
        part.rotation.x += dt * 2.5;
      }
    });
  }

  private hasEnemyLineOfSight(
    enemyPos: THREE.Vector3,
    targetPos: THREE.Vector3 = this.playerPos
  ): boolean {
    const wallMeshes = this.arena.bulletMeshesByEra[this.activeTimeline];
    _rayOrigin.set(enemyPos.x, 1.45, enemyPos.z);
    _v3.set(targetPos.x, targetPos.y + 1.35, targetPos.z);
    _rayDir.subVectors(_v3, _rayOrigin);
    const dist = _rayDir.length();
    if (dist < 0.5) return true;
    _rayDir.divideScalar(dist);
    _raycaster.set(_rayOrigin, _rayDir);
    _raycaster.far = dist - 0.3;
    return _raycaster.intersectObjects(wallMeshes, false).length === 0;
  }

  private updateEnemies(dt: number) {
    const colliders = this.arena.collidersByEra[this.activeTimeline];
    const isNightmare = this.settings.difficulty === 'nightmare';

    for (const enemy of this.enemies) {
      if (enemy.freezeTimer > 0) {
        enemy.freezeTimer = Math.max(0, enemy.freezeTimer - dt);
        enemy.visual.stasisCage.visible = enemy.freezeTimer > 0;
      }

      // Off-timeline distraction: enemies in the decoy's era physically converge on the projection
      if (enemy.era !== this.activeTimeline) {
        if (
          this.decoyActiveTimer > 0 &&
          this.decoyTimeline === enemy.era &&
          enemy.freezeTimer <= 0
        ) {
          _v1.subVectors(this.decoyPos, enemy.position);
          const d = Math.hypot(_v1.x, _v1.z);
          const stopDist = enemy.variant === 'heavy' ? 2.4 : 4.8;
          if (d > stopDist) {
            const step = enemy.speed * 0.72 * dt;
            enemy.position.x = THREE.MathUtils.clamp(
              enemy.position.x + (_v1.x / d) * step,
              -32,
              32
            );
            enemy.position.z = THREE.MathUtils.clamp(
              enemy.position.z + (_v1.z / d) * step,
              -32,
              32
            );
            enemy.visual.root.position.set(enemy.position.x, 0, enemy.position.z);
          }
          enemy.visual.root.rotation.y = Math.atan2(_v1.x, _v1.z);
        }
        continue;
      }

      // Billboard floating HP bar toward camera even while frozen in time
      enemy.visual.hpBarBg.lookAt(this.camera.position);
      enemy.visual.hpBarFill.lookAt(this.camera.position);
      const hpRatio = THREE.MathUtils.clamp(enemy.hp / enemy.maxHp, 0, 1);
      enemy.visual.hpBarFill.scale.x = Math.max(0.001, hpRatio);

      // Chronal Stasis freezes enemy movement, facing, animations, and attacks for 3 seconds
      if (enemy.freezeTimer > 0) {
        enemy.visual.stasisCage.rotation.y += dt * 0.9;
        continue;
      }

      if (enemy.slowTimer > 0) enemy.slowTimer = Math.max(0, enemy.slowTimer - dt);
      if (enemy.hitFlashTimer > 0) {
        enemy.hitFlashTimer = Math.max(0, enemy.hitFlashTimer - dt);
      }

      const slowFactor = enemy.slowTimer > 0 ? 0.52 : 1.0;
      const isDecoyTarget =
        this.decoyActiveTimer > 0 && this.decoyTimeline === this.activeTimeline;
      const targetPos = isDecoyTarget ? this.decoyPos : this.playerPos;

      // Face target (decoy projection if active in this era, otherwise player)
      _v1.subVectors(targetPos, enemy.position);
      const distToTarget = Math.hypot(_v1.x, _v1.z);
      const targetAngle = Math.atan2(_v1.x, _v1.z);
      enemy.visual.root.rotation.y = targetAngle;

      // Animate floating drones/acolytes, spinning rotors, orbiting rings, and shield
      if (enemy.visual.floatNode) {
        enemy.visual.floatNode.position.y =
          (enemy.era === 'present' ? 1.45 : 0.35) +
          Math.sin(this.elapsedSeconds * 3.2 + enemy.id) * 0.16;
      }
      if (enemy.visual.rotors) {
        for (const rotor of enemy.visual.rotors) {
          rotor.rotation.y += dt * 22 * slowFactor;
        }
      }
      if (enemy.visual.orbiters) {
        enemy.visual.orbiters.forEach((orb, idx) => {
          if (enemy.era === 'past') {
            if (idx === 0) {
              orb.rotation.z += dt * 1.6 * slowFactor;
            } else {
              orb.rotation.y += dt * 3.2 * slowFactor;
              orb.position.y =
                1.35 + Math.sin(this.elapsedSeconds * 4.2 + idx * 2.1 + enemy.id) * 0.12;
            }
          } else {
            orb.rotation.z += dt * 2.4 * slowFactor;
            if (enemy.era === 'present') {
              orb.rotation.y = Math.sin(this.elapsedSeconds * 3.0 + enemy.id) * 0.22;
            }
          }
        });
      }
      if (enemy.visual.shieldMesh && !enemy.shieldBroken) {
        enemy.visual.shieldMesh.rotation.z += dt * 0.6;
      }

      // Articulated arm animation (Golem stride/overhead slam & Trooper recoil)
      if (enemy.era === 'past' && enemy.variant === 'heavy' && enemy.visual.leftArm && enemy.visual.rightArm) {
        if (enemy.state === 'windup') {
          enemy.visual.leftArm.rotation.x = THREE.MathUtils.damp(
            enemy.visual.leftArm.rotation.x,
            -1.65,
            12,
            dt
          );
          enemy.visual.rightArm.rotation.x = THREE.MathUtils.damp(
            enemy.visual.rightArm.rotation.x,
            -1.65,
            12,
            dt
          );
        } else if (enemy.state === 'chase') {
          const swing = Math.sin(this.elapsedSeconds * 7.5 * slowFactor + enemy.id) * 0.45;
          enemy.visual.leftArm.rotation.x = THREE.MathUtils.damp(
            enemy.visual.leftArm.rotation.x,
            swing,
            10,
            dt
          );
          enemy.visual.rightArm.rotation.x = THREE.MathUtils.damp(
            enemy.visual.rightArm.rotation.x,
            -swing,
            10,
            dt
          );
        } else {
          enemy.visual.leftArm.rotation.x = THREE.MathUtils.damp(
            enemy.visual.leftArm.rotation.x,
            0.15,
            10,
            dt
          );
          enemy.visual.rightArm.rotation.x = THREE.MathUtils.damp(
            enemy.visual.rightArm.rotation.x,
            0.15,
            10,
            dt
          );
        }
      } else if (enemy.era === 'present' && enemy.variant === 'heavy' && enemy.visual.rightArm) {
        const targetKick = enemy.state === 'recover' ? -0.14 : 0;
        enemy.visual.rightArm.rotation.x = THREE.MathUtils.damp(
          enemy.visual.rightArm.rotation.x,
          targetKick,
          14,
          dt
        );
      }

      // State machine
      enemy.stateTimer -= dt * slowFactor;

      if (enemy.state === 'stagger') {
        enemy.visual.windupCore.scale.setScalar(0.8);
        if (enemy.stateTimer <= 0) {
          enemy.state = 'chase';
          enemy.stateTimer = 0.45;
        }
        continue;
      }

      if (enemy.state === 'chase') {
        enemy.visual.windupCore.scale.setScalar(1.0);
        const los =
          distToTarget <= enemy.attackRange &&
          this.hasEnemyLineOfSight(enemy.position, targetPos);
        const moveVec = _v2.set(0, 0, 0);
        const dirX = _v1.x / Math.max(distToTarget, 0.01);
        const dirZ = _v1.z / Math.max(distToTarget, 0.01);

        if (
          !los ||
          distToTarget > enemy.attackRange * 0.65 ||
          (enemy.era === 'past' && enemy.variant === 'heavy' && distToTarget > 4.2)
        ) {
          // Advance and flank slightly around cover if LOS is blocked
          const flankBias = los ? 0.18 : 0.52;
          moveVec.set(
            dirX - dirZ * enemy.strafeSign * flankBias,
            0,
            dirZ + dirX * enemy.strafeSign * flankBias
          ).normalize();
        } else if (enemy.variant === 'ranged') {
          // Strafe sideways aggressively
          moveVec.set(
            -dirZ * enemy.strafeSign * 0.85,
            0,
            dirX * enemy.strafeSign * 0.85
          );
        }

        const step = enemy.speed * slowFactor * dt;
        enemy.position.x = THREE.MathUtils.clamp(enemy.position.x + moveVec.x * step, -32, 32);
        enemy.position.z = THREE.MathUtils.clamp(enemy.position.z + moveVec.z * step, -32, 32);

        // Simple separation from cover boxes
        for (const box of colliders) {
          if (box.maxY < 1.0) continue;
          const r = 0.75;
          if (
            enemy.position.x + r > box.minX &&
            enemy.position.x - r < box.maxX &&
            enemy.position.z + r > box.minZ &&
            enemy.position.z - r < box.maxZ
          ) {
            const cx = THREE.MathUtils.clamp(enemy.position.x, box.minX, box.maxX);
            const cz = THREE.MathUtils.clamp(enemy.position.z, box.minZ, box.maxZ);
            const dx = enemy.position.x - cx;
            const dz = enemy.position.z - cz;
            const d = Math.hypot(dx, dz);
            if (d > 0.001) {
              enemy.position.x += (dx / d) * (r - d);
              enemy.position.z += (dz / d) * (r - d);
            }
          }
        }
        enemy.visual.root.position.set(enemy.position.x, 0, enemy.position.z);

        // Transition to windup attack if LOS clear and timer ready
        const aggroScale = this.getAnchorAggressionScale();
        const cadenceScale = 1 / aggroScale;
        if (los && enemy.stateTimer <= 0) {
          enemy.state = 'windup';
          enemy.stateTimer = (isNightmare ? 0.44 : 0.56) * cadenceScale;
        }
      } else if (enemy.state === 'windup') {
        const pulse = 1.45 + Math.sin(this.elapsedSeconds * 34) * 0.4;
        enemy.visual.windupCore.scale.setScalar(pulse);

        if (enemy.stateTimer <= 0) {
          const aggroScale = this.getAnchorAggressionScale();
          const cadenceScale = 1 / aggroScale;
          this.executeEnemyAttack(enemy, distToTarget, targetPos, isDecoyTarget);
          enemy.state = 'recover';
          enemy.stateTimer = (isNightmare ? 0.65 : 0.85) * cadenceScale;
          enemy.strafeSign *= -1;
        }
      } else if (enemy.state === 'recover') {
        enemy.visual.windupCore.scale.setScalar(0.85);
        if (enemy.stateTimer <= 0) {
          const aggroScale = this.getAnchorAggressionScale();
          const cadenceScale = 1 / aggroScale;
          enemy.state = 'chase';
          enemy.stateTimer = (isNightmare ? 0.28 : 0.42) * cadenceScale;
        }
      }
    }
  }

  private executeEnemyAttack(
    enemy: ActiveEnemy,
    distToTarget: number,
    targetPos: THREE.Vector3,
    isDecoyTarget: boolean
  ) {
    const aggroScale = this.getAnchorAggressionScale();
    const dmgMult =
      (this.settings.difficulty === 'nightmare' ? 1.28 : 1.0) * (1 + (aggroScale - 1) * 0.7);
    const projSpeedMult = 1 + (aggroScale - 1) * 0.65;
    const origin = _v1.set(enemy.position.x, 1.45, enemy.position.z);
    const target = _v2.set(targetPos.x, targetPos.y + 1.35, targetPos.z);

    // Past Golem Warden: Heavy shock-slam up close, or hurled basalt orb if kited
    if (enemy.era === 'past' && enemy.variant === 'heavy') {
      if (distToTarget <= 4.7) {
        if (!isDecoyTarget) {
          this.applyPlayerDamage(Math.round(24 * dmgMult));
        }
        this.spawnSparkBurst(
          _v1.set(enemy.position.x, 0.35, enemy.position.z),
          isDecoyTarget ? 0x38bdf8 : 0xf59e0b,
          14
        );
      } else {
        this.spawnEnemyProjectile(
          origin,
          target,
          20 * projSpeedMult,
          Math.round(16 * dmgMult),
          0xf59e0b
        );
      }
      return;
    }

    // Past Ember Acolyte: 3-orb solar spread fan
    if (enemy.era === 'past') {
      for (const yawOffset of [-0.14, 0, 0.14]) {
        const fanTarget = _v3.copy(target);
        const dx = fanTarget.x - origin.x;
        const dz = fanTarget.z - origin.z;
        const cos = Math.cos(yawOffset);
        const sin = Math.sin(yawOffset);
        fanTarget.x = origin.x + dx * cos - dz * sin;
        fanTarget.z = origin.z + dx * sin + dz * cos;
        this.spawnEnemyProjectile(
          origin,
          fanTarget,
          19 * projSpeedMult,
          Math.round(13 * dmgMult),
          0xfb923c
        );
      }
      return;
    }

    // Present Bio-Trooper: Double-shot tight stagger
    if (enemy.era === 'present' && enemy.variant === 'heavy') {
      this.spawnEnemyProjectile(
        origin,
        target,
        25 * projSpeedMult,
        Math.round(12 * dmgMult),
        0x10b981
      );
      const offsetTarget = isDecoyTarget
        ? _v3.copy(target)
        : _v3.copy(target).addScaledVector(this.playerVel, 0.12);
      this.spawnEnemyProjectile(
        origin,
        offsetTarget,
        27 * projSpeedMult,
        Math.round(11 * dmgMult),
        0x34d399
      );
      return;
    }

    // Present Hazmat Drone: Predictive velocity-leading plasma dart
    if (enemy.era === 'present') {
      const dist = origin.distanceTo(target);
      const travelTime = dist / (26 * projSpeedMult);
      const leadTarget = isDecoyTarget
        ? _v3.copy(target)
        : _v3.copy(target).addScaledVector(this.playerVel, travelTime * 0.65);
      leadTarget.y = Math.max(0.8, leadTarget.y);
      this.spawnEnemyProjectile(
        origin,
        leadTarget,
        26 * projSpeedMult,
        Math.round(14 * dmgMult),
        0x38bdf8
      );
      return;
    }

    // Future Enforcer Mech: Twin heavy plasma bolts
    if (enemy.era === 'future' && enemy.variant === 'heavy') {
      for (const side of [-0.45, 0.45]) {
        const sideOrigin = _v3.copy(origin);
        sideOrigin.x += Math.cos(enemy.visual.root.rotation.y) * side;
        sideOrigin.z -= Math.sin(enemy.visual.root.rotation.y) * side;
        this.spawnEnemyProjectile(
          sideOrigin,
          target,
          28 * projSpeedMult,
          Math.round(14 * dmgMult),
          0xe879f9
        );
      }
      return;
    }

    // Future Prism Sentinel: High-velocity hyper-bolt
    this.spawnEnemyProjectile(
      origin,
      target,
      38 * projSpeedMult,
      Math.round(20 * dmgMult),
      0x22d3ee
    );
  }

  private updateProjectiles(dt: number) {
    const colliders = this.arena.collidersByEra[this.activeTimeline];
    for (const p of this.projectiles) {
      if (!p.active) continue;
      if (p.freezeTimer > 0) {
        p.freezeTimer = Math.max(0, p.freezeTimer - dt);
        continue;
      }
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);

      // Hit decoy projection?
      if (this.decoyActiveTimer > 0 && this.decoyTimeline === this.activeTimeline) {
        const ddx = p.pos.x - this.decoyPos.x;
        const ddy = p.pos.y - (this.decoyPos.y + 1.15);
        const ddz = p.pos.z - this.decoyPos.z;
        if (ddx * ddx + ddy * ddy + ddz * ddz < 0.9 * 0.9) {
          this.spawnSparkBurst(p.pos, 0x38bdf8, 5);
          p.active = false;
          p.mesh.visible = false;
          continue;
        }
      }

      // Hit player?
      const dx = p.pos.x - this.playerPos.x;
      const dy = p.pos.y - (this.playerPos.y + 1.1);
      const dz = p.pos.z - this.playerPos.z;
      if (dx * dx + dy * dy + dz * dz < 0.85 * 0.85) {
        p.active = false;
        p.mesh.visible = false;
        if (this.dashActiveTimer <= 0) {
          this.applyPlayerDamage(p.damage);
        }
        continue;
      }

      // Hit active era cover wall?
      for (const box of colliders) {
        if (
          p.pos.x >= box.minX &&
          p.pos.x <= box.maxX &&
          p.pos.y >= box.minY &&
          p.pos.y <= box.maxY &&
          p.pos.z >= box.minZ &&
          p.pos.z <= box.maxZ
        ) {
          this.spawnSparkBurst(p.pos, 0xfbbf24, 4);
          p.active = false;
          p.mesh.visible = false;
          break;
        }
      }
    }
  }

  private applyPlayerDamage(amount: number) {
    this.hp = Math.max(0, this.hp - amount);
    this.damageFlashTimer = 0.28;
    this.cameraShake = Math.max(this.cameraShake, 0.032);
    chronoAudio.playDamage();

    if (this.hp <= 0) {
      this.phase = 'gameover';
      this.clearInputs();
      if (document.pointerLockElement) {
        document.exitPointerLock?.();
      }
      this.emitHud();
    }
  }

  private updateAnchorsAndSurge(dt: number) {
    let securedCount = 0;
    const prevSecured = TIMELINE_ORDER.filter((id) => this.timelines[id].secured).length;
    const surgeBaseRate = prevSecured >= 1 ? 4.3 : 3.3;
    const surgeRate =
      surgeBaseRate * (this.settings.difficulty === 'nightmare' ? 1.32 : 1.0);

    for (const era of TIMELINE_ORDER) {
      const st = this.timelines[era];
      if (st.secured) {
        securedCount += 1;
        st.playerInsideRing = false;
        continue;
      }

      // Check capture progress in active timeline
      const anchor = ANCHOR_COORDS[era];
      const distToAnchor = Math.hypot(
        this.playerPos.x - anchor.x,
        this.playerPos.z - anchor.z
      );
      const inside = era === this.activeTimeline && distToAnchor <= 6.25;
      st.playerInsideRing = inside;

      if (inside && st.anchorUnlocked) {
        st.captureProgress = Math.min(100, st.captureProgress + 18 * dt);

        // 50% Anchor Capture Counter-Breach!
        if (st.captureProgress >= 50 && !st.counterWaveTriggered) {
          st.counterWaveTriggered = true;
          chronoAudio.playBreachWarning();
          const a1 = Math.random() * Math.PI * 2;
          this.spawnEnemy(
            era,
            'heavy',
            anchor.x + Math.cos(a1) * 12,
            anchor.z + Math.sin(a1) * 12
          );
          this.spawnEnemy(
            era,
            'ranged',
            anchor.x - Math.cos(a1) * 12,
            anchor.z - Math.sin(a1) * 12
          );
          this.setBanner(
            `${ERA_CONFIGS[era].eraLabel} COUNTER-BREACH — DEFEAT BREACH GUARDIANS!`,
            'danger',
            4.5
          );
        }

        if (st.captureProgress >= 100) {
          st.secured = true;
          st.riftSurge = 0;
          securedCount += 1;
          this.hp = Math.min(this.maxHp, this.hp + 30);
          this.applyAnchorDifficultyEscalation(securedCount);
          chronoAudio.playAnchorSecured();
          const cfg = ERA_CONFIGS[era];
          const hpPct = Math.round((this.getAnchorHpScale(securedCount) - 1) * 100);
          const aggroPct = Math.round((this.getAnchorAggressionScale(securedCount) - 1) * 100);
          this.setBanner(
            `${cfg.eraLabel} SECURED! ${cfg.buffTitle.toUpperCase()} · FOE THREAT +${hpPct}% HP / +${aggroPct}% AGGRO`,
            era === 'past' ? 'amber' : era === 'present' ? 'emerald' : 'magenta',
            5.0
          );
        }
      } else if (st.captureProgress > 0 && st.captureProgress < 100) {
        // Slow partial decay if player leaves ring or fights counter-breach
        st.captureProgress = Math.max(0, st.captureProgress - 2.2 * dt);
      }

      // Rift Surge buildup in uncaptured inactive timelines (65% suppressed if decoy is active there)
      if (!st.secured && era !== this.activeTimeline) {
        const decoySuppress =
          this.decoyActiveTimer > 0 && this.decoyTimeline === era ? 0.35 : 1.0;
        st.riftSurge += surgeRate * decoySuppress * dt;
        if (st.riftSurge >= 100) {
          st.riftSurge = 15;
          // Spawn an Elite Rift Bleed duo (1 Heavy + 1 Ranged) in the player's active timeline
          const angle = Math.random() * Math.PI * 2;
          const sx1 = THREE.MathUtils.clamp(this.playerPos.x + Math.cos(angle) * 17, -30, 30);
          const sz1 = THREE.MathUtils.clamp(this.playerPos.z + Math.sin(angle) * 17, -30, 30);
          const sx2 = THREE.MathUtils.clamp(this.playerPos.x + Math.cos(angle + 0.7) * 19, -30, 30);
          const sz2 = THREE.MathUtils.clamp(this.playerPos.z + Math.sin(angle + 0.7) * 19, -30, 30);
          this.spawnEnemy(this.activeTimeline, 'heavy', sx1, sz1);
          this.spawnEnemy(this.activeTimeline, 'ranged', sx2, sz2);
          this.setBanner(
            `RIFT SURGE FROM ${ERA_CONFIGS[era].eraLabel}! ELITE ECHOES DEPLOYED`,
            'danger',
            4.0
          );
        }
      }
    }

    // Victory check: 2/3 secured (or 3/3 if continuing sweep)
    if (!this.sweepMode && securedCount >= 2) {
      this.triggerVictory();
    } else if (this.sweepMode && securedCount >= 3) {
      this.triggerVictory();
    }
  }

  private triggerVictory() {
    this.phase = 'victory';
    this.clearInputs();
    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
    chronoAudio.playVictory();
    this.emitHud();
  }

  private updateVfx(dt: number) {
    for (const t of this.tracers) {
      if (t.life > 0) {
        t.life -= dt;
        t.mat.opacity = Math.max(0, t.life / t.maxLife);
        if (t.life <= 0) t.line.visible = false;
      }
    }

    for (const s of this.sparks) {
      if (s.life > 0) {
        s.life -= dt;
        s.vel.y -= 14 * dt;
        s.mesh.position.addScaledVector(s.vel, dt);
        const ratio = Math.max(0.01, s.life / s.maxLife);
        s.mesh.scale.setScalar(ratio);
        if (s.life <= 0) s.mesh.visible = false;
      }
    }
  }

  private emitHud() {
    const prof = WEAPON_PROFILES[this.activeTimeline];
    const reloadMult = this.timelines.present.secured ? 0.76 : 1.0;
    const totalReload = prof.reloadTime * reloadMult;
    const dashMax = 2.1 * (this.timelines.future.secured ? 0.6 : 1.0);
    const stasisMax = 9.5 * (this.timelines.future.secured ? 0.65 : 1.0);
    const shiftMax = this.timelines.future.secured ? 0.28 : 0.45;
    const securedCount = TIMELINE_ORDER.filter((id) => this.timelines[id].secured).length;

    this.onHudUpdate({
      phase: this.phase,
      difficulty: this.settings.difficulty,
      pointerLocked: this.pointerLocked,
      activeTimeline: this.activeTimeline,
      hp: Math.ceil(this.hp),
      maxHp: this.maxHp,
      ammo: this.ammoByEra[this.activeTimeline],
      maxAmmo: prof.magSize,
      reloading: this.reloading,
      reloadProgress: this.reloading
        ? THREE.MathUtils.clamp(1 - this.reloadTimer / totalReload, 0, 1)
        : 0,
      dashCooldown: 1 - THREE.MathUtils.clamp(this.dashTimer / dashMax, 0, 1),
      stasisCooldown: 1 - THREE.MathUtils.clamp(this.stasisTimer / stasisMax, 0, 1),
      chronalStasisCooldown:
        1 - THREE.MathUtils.clamp(this.chronalStasisCooldownTimer / 15.0, 0, 1),
      chronalStasisRemaining: this.chronalStasisCooldownTimer,
      chronalStasisActiveTimer:
        this.chronalStasisEra === this.activeTimeline ? this.chronalStasisActiveTimer : 0,
      decoyCooldown: 1 - THREE.MathUtils.clamp(this.decoyCooldownTimer / 20.0, 0, 1),
      decoyRemaining: this.decoyCooldownTimer,
      decoyActiveTimer: this.decoyActiveTimer,
      decoyTimeline: this.decoyTimeline,
      shiftCooldown: 1 - THREE.MathUtils.clamp(this.shiftCooldownTimer / shiftMax, 0, 1),
      chronoBreakTimer: this.chronoBreakTimer,
      highGroundActive: this.playerPos.y > 0.6,
      timelines: {
        past: { ...this.timelines.past },
        present: { ...this.timelines.present },
        future: { ...this.timelines.future },
      },
      securedCount,
      requiredToWin: 2,
      sweepMode: this.sweepMode,
      threatLevel: (securedCount >= 2 ? 3 : securedCount === 1 ? 2 : 1) as 1 | 2 | 3,
      enemyHpScale: this.getAnchorHpScale(securedCount),
      enemyAggressionScale: this.getAnchorAggressionScale(securedCount),
      elapsedSeconds: this.elapsedSeconds,
      kills: this.kills,
      shotsFired: this.shotsFired,
      shotsHit: this.shotsHit,
      headshots: this.headshots,
      phaseShifts: this.phaseShifts,
      hitMarkerTimer: this.hitMarkerTimer,
      critMarkerTimer: this.critMarkerTimer,
      damageFlashTimer: this.damageFlashTimer,
      shiftFlashTimer: this.shiftFlashTimer,
      statusBanner: this.bannerTimer > 0 ? this.statusBanner : '',
      statusBannerTone: this.statusBannerTone,
      muted: this.settings.muted,
    });
  }

  public dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unbindEvents();
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock?.();
    }
    this.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material?.dispose();
        }
      }
    });
    this.postProcessor?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
