import * as THREE from 'three';
import { TimelineId } from './types';

export interface WeaponRig {
  root: THREE.Group;
  muzzleAnchor: THREE.Object3D;
  muzzleFlash: THREE.Mesh;
  muzzleLight: THREE.PointLight;
  forms: Record<TimelineId, THREE.Group>;
  spinningParts: THREE.Object3D[];
}

export interface EnemyVisual {
  root: THREE.Group;
  headMesh: THREE.Mesh;
  bodyParts: THREE.Mesh[];
  windupCore: THREE.Mesh;
  shieldMesh?: THREE.Mesh;
  leftArm?: THREE.Object3D;
  rightArm?: THREE.Object3D;
  floatNode?: THREE.Object3D;
  rotors?: THREE.Object3D[];
  orbiters?: THREE.Object3D[];
  stasisCage: THREE.Mesh;
  hpBarFill: THREE.Mesh;
  hpBarBg: THREE.Mesh;
}

export interface AnchorSpireVisual {
  root: THREE.Group;
  ringFloor: THREE.Mesh;
  gyroRings: THREE.Mesh[];
  coreCrystal: THREE.Mesh;
  beaconBeam: THREE.Mesh;
  pointLight: THREE.PointLight;
}

export interface DecoyVisual {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  ringFloor: THREE.Mesh;
  haloRing: THREE.Mesh;
}

function makeExtrudedProfile(
  pts: [number, number][],
  depth: number,
  bevelThickness = 0.012,
  bevelSize = 0.01
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    shape.lineTo(pts[i][0], pts[i][1]);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness,
    bevelSize,
    bevelSegments: 2,
    steps: 1,
  });
  geo.center();
  return geo;
}

function makeTurnedLathe(profile: [number, number][], segments = 16): THREE.LatheGeometry {
  const vectors = profile.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(vectors, segments);
}

function makeTube(
  points: [number, number, number][],
  radius: number,
  tubularSegments = 14
): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z))
  );
  return new THREE.TubeGeometry(curve, tubularSegments, radius, 8, false);
}

/**
 * Builds the 3-era morphing first-person weapon rig (10-14 intricate parts per era form).
 */
export function createWeaponRig(): WeaponRig {
  const root = new THREE.Group();
  const spinningParts: THREE.Object3D[] = [];

  // Shared high-contrast PBR materials
  const gunmetalMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e2430,
    metalness: 0.9,
    roughness: 0.24,
    anisotropy: 0.7,
  });
  const matteGripMat = new THREE.MeshStandardMaterial({
    color: 0x101217,
    metalness: 0.08,
    roughness: 0.88,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. PAST: SUNSTONE SCATTER-CARBINE (Beveled basalt receiver, lathe flared barrels, rotating crystal drum)
  // ═══════════════════════════════════════════════════════════════════════════
  const pastForm = new THREE.Group();
  const bronzeMat = new THREE.MeshPhysicalMaterial({
    color: 0xc2853a,
    metalness: 0.92,
    roughness: 0.22,
    anisotropy: 0.8,
  });
  const carvedStoneMat = new THREE.MeshStandardMaterial({
    color: 0x3a3028,
    metalness: 0.05,
    roughness: 0.88,
  });
  const leatherWrapMat = new THREE.MeshStandardMaterial({
    color: 0x4d2f1e,
    metalness: 0.04,
    roughness: 0.92,
  });
  const amberCoreMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.0,
    roughness: 0.16,
    metalness: 0.1,
  });

  // Sculpted beveled receiver housing (rotated so extrusion depth = width X)
  const pastReceiverGeo = makeExtrudedProfile(
    [
      [-0.22, -0.055],
      [0.18, -0.055],
      [0.24, -0.015],
      [0.24, 0.055],
      [0.08, 0.072],
      [-0.2, 0.062],
    ],
    0.095,
    0.01,
    0.008
  );
  pastReceiverGeo.rotateY(Math.PI / 2);
  const pastReceiver = new THREE.Mesh(pastReceiverGeo, carvedStoneMat);
  pastReceiver.position.set(0, 0.008, -0.17);
  pastForm.add(pastReceiver);

  // Leather-wrapped curved grip + bronze pommel
  const pastGripGeo = makeExtrudedProfile(
    [
      [-0.035, -0.07],
      [0.035, -0.07],
      [0.048, 0.06],
      [-0.025, 0.06],
    ],
    0.048,
    0.008,
    0.006
  );
  pastGripGeo.rotateY(Math.PI / 2);
  const pastGrip = new THREE.Mesh(pastGripGeo, leatherWrapMat);
  pastGrip.position.set(0, -0.085, -0.02);
  pastGrip.rotation.x = 0.25;
  pastForm.add(pastGrip);

  const triggerGuard = new THREE.Mesh(
    new THREE.TorusGeometry(0.03, 0.006, 6, 14, Math.PI * 1.2),
    bronzeMat
  );
  triggerGuard.rotation.y = Math.PI / 2;
  triggerGuard.rotation.z = Math.PI * 0.9;
  triggerGuard.position.set(0, -0.055, -0.09);
  pastForm.add(triggerGuard);

  // Twin turned blunderbuss-flared bronze barrels
  const pastBarrelGeo = makeTurnedLathe(
    [
      [0.026, 0.0],
      [0.026, 0.08],
      [0.02, 0.14],
      [0.021, 0.36],
      [0.032, 0.43],
      [0.029, 0.45],
      [0.018, 0.45],
    ],
    14
  );
  pastBarrelGeo.rotateX(-Math.PI / 2);

  for (const xOff of [-0.028, 0.028]) {
    const barrel = new THREE.Mesh(pastBarrelGeo, bronzeMat);
    barrel.position.set(xOff, 0.032, -0.25);
    pastForm.add(barrel);
  }

  // Barrel clamp band & under-rail bronze rib
  const clampBand = new THREE.Mesh(new THREE.BoxGeometry(0.112, 0.055, 0.045), gunmetalMat);
  clampBand.position.set(0, 0.028, -0.52);
  pastForm.add(clampBand);

  const underRib = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.34), carvedStoneMat);
  underRib.position.set(0, -0.012, -0.42);
  pastForm.add(underRib);

  // Rotating sunstone crystal drum + bronze cage bars
  const drumGroup = new THREE.Group();
  drumGroup.position.set(0, 0.02, -0.22);
  const sunCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 1), amberCoreMat);
  sunCore.scale.set(1.2, 0.85, 0.85);
  drumGroup.add(sunCore);

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.01, 0.01), bronzeMat);
    rib.position.set(0, Math.cos(angle) * 0.046, Math.sin(angle) * 0.046);
    drumGroup.add(rib);
  }
  pastForm.add(drumGroup);
  spinningParts.push(drumGroup);

  // Brass astrolabe front & rear iron sights
  const rearSight = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 16), bronzeMat);
  rearSight.position.set(0, 0.095, -0.08);
  pastForm.add(rearSight);

  const frontPost = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.032, 4), amberCoreMat);
  frontPost.position.set(0, 0.075, -0.64);
  pastForm.add(frontPost);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. PRESENT: CRYO-PULSE RIFLE (Sculpted tactical polymer, translucent cryo chamber, curved hoses)
  // ═══════════════════════════════════════════════════════════════════════════
  const presentForm = new THREE.Group();
  const labShellMat = new THREE.MeshPhysicalMaterial({
    color: 0xe2ecf0,
    metalness: 0.2,
    roughness: 0.3,
    clearcoat: 0.65,
    clearcoatRoughness: 0.15,
  });
  const slateFrameMat = new THREE.MeshStandardMaterial({
    color: 0x22333d,
    metalness: 0.78,
    roughness: 0.32,
  });
  const cryoGlowMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x10b981,
    emissiveIntensity: 1.85,
    roughness: 0.15,
  });
  const cyanOpticMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.35,
    transparent: true,
    opacity: 0.68,
    roughness: 0.08,
  });

  // Sculpted upper & lower tactical receiver
  const presChassisGeo = makeExtrudedProfile(
    [
      [-0.26, -0.045],
      [0.24, -0.045],
      [0.28, -0.01],
      [0.26, 0.055],
      [-0.18, 0.055],
      [-0.27, 0.02],
    ],
    0.082,
    0.008,
    0.006
  );
  presChassisGeo.rotateY(Math.PI / 2);
  const presChassis = new THREE.Mesh(presChassisGeo, slateFrameMat);
  presChassis.position.set(0, 0.0, -0.2);
  presentForm.add(presChassis);

  // White contoured upper shroud with cooling vents
  const presShroudGeo = makeExtrudedProfile(
    [
      [-0.2, -0.02],
      [0.18, -0.02],
      [0.21, 0.025],
      [-0.16, 0.028],
    ],
    0.094,
    0.007,
    0.005
  );
  presShroudGeo.rotateY(Math.PI / 2);
  const presShroud = new THREE.Mesh(presShroudGeo, labShellMat);
  presShroud.position.set(0, 0.048, -0.24);
  presentForm.add(presShroud);

  // Ergonomic angled pistol grip + forward angled magwell
  const presGrip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.135, 0.068), matteGripMat);
  presGrip.position.set(0, -0.09, -0.02);
  presGrip.rotation.x = 0.26;
  presentForm.add(presGrip);

  const presMag = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.14, 0.055), slateFrameMat);
  presMag.position.set(0, -0.085, -0.23);
  presMag.rotation.x = -0.18;
  presentForm.add(presMag);

  // Fluted precision barrel + machined muzzle brake
  const presBarrelGeo = makeTurnedLathe(
    [
      [0.022, 0],
      [0.022, 0.12],
      [0.017, 0.14],
      [0.017, 0.3],
      [0.026, 0.31],
      [0.026, 0.38],
      [0.014, 0.38],
    ],
    14
  );
  presBarrelGeo.rotateX(-Math.PI / 2);
  const presBarrel = new THREE.Mesh(presBarrelGeo, gunmetalMat);
  presBarrel.position.set(0, 0.02, -0.34);
  presentForm.add(presBarrel);

  // Side pressurized cryo canisters + curved TubeGeometry coolant hoses
  for (const side of [-1, 1]) {
    const xOff = side * 0.06;
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.015, 0.22, 12),
      cryoGlowMat
    );
    tube.rotation.x = Math.PI / 2;
    tube.position.set(xOff, 0.008, -0.26);
    presentForm.add(tube);

    const hose = new THREE.Mesh(
      makeTube(
        [
          [xOff, 0.008, -0.37],
          [side * 0.072, 0.024, -0.45],
          [side * 0.026, 0.022, -0.52],
        ],
        0.006,
        10
      ),
      gunmetalMat
    );
    presentForm.add(hose);
  }

  // Holographic reflex optic with arched frame & glowing reticle dot
  const opticBase = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.014, 0.1), gunmetalMat);
  opticBase.position.set(0, 0.078, -0.15);
  presentForm.add(opticBase);

  const opticArch = new THREE.Mesh(
    new THREE.TorusGeometry(0.028, 0.006, 6, 16, Math.PI),
    slateFrameMat
  );
  opticArch.position.set(0, 0.085, -0.15);
  presentForm.add(opticArch);

  const opticLens = new THREE.Mesh(new THREE.CircleGeometry(0.025, 16), cyanOpticMat);
  opticLens.position.set(0, 0.095, -0.15);
  presentForm.add(opticLens);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. FUTURE: SINGULARITY RAIL-LANCE (Stealth obsidian chassis, 3 accelerator prongs, dual gimbal rings)
  // ═══════════════════════════════════════════════════════════════════════════
  const futureForm = new THREE.Group();
  const obsidianMat = new THREE.MeshPhysicalMaterial({
    color: 0x130e24,
    metalness: 0.92,
    roughness: 0.16,
    clearcoat: 0.85,
    anisotropy: 0.75,
  });
  const magentaCoreMat = new THREE.MeshStandardMaterial({
    color: 0xe879f9,
    emissive: 0xe879f9,
    emissiveIntensity: 2.3,
    roughness: 0.1,
  });
  const neonCyanMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.8,
    roughness: 0.15,
  });

  const futChassisGeo = makeExtrudedProfile(
    [
      [-0.22, -0.045],
      [0.14, -0.045],
      [0.24, 0.005],
      [0.16, 0.06],
      [-0.18, 0.052],
    ],
    0.076,
    0.009,
    0.007
  );
  futChassisGeo.rotateY(Math.PI / 2);
  const futChassis = new THREE.Mesh(futChassisGeo, obsidianMat);
  futChassis.position.set(0, 0, -0.14);
  futureForm.add(futChassis);

  const futGrip = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.13, 0.062), matteGripMat);
  futGrip.position.set(0, -0.085, -0.01);
  futGrip.rotation.x = 0.22;
  futureForm.add(futGrip);

  // 3 radial floating magnetic accelerator prongs (top + lower-left + lower-right)
  const prongAngles = [Math.PI / 2, (Math.PI * 7) / 6, (Math.PI * 11) / 6];
  for (const ang of prongAngles) {
    const px = Math.cos(ang) * 0.044;
    const py = Math.sin(ang) * 0.044 + 0.01;

    const prong = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.02, 0.56), obsidianMat);
    prong.position.set(px, py, -0.45);
    prong.rotation.z = ang - Math.PI / 2;
    futureForm.add(prong);

    const railStrip = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.007, 0.52), neonCyanMat);
    railStrip.position.set(px * 0.78, py * 0.78 + 0.002, -0.45);
    railStrip.rotation.z = ang - Math.PI / 2;
    futureForm.add(railStrip);
  }

  // Curved plasma conduit cables feeding the front emitter
  for (const side of [-1, 1]) {
    const conduit = new THREE.Mesh(
      makeTube(
        [
          [side * 0.04, -0.01, -0.12],
          [side * 0.065, -0.02, -0.26],
          [side * 0.036, 0.01, -0.36],
        ],
        0.005,
        10
      ),
      magentaCoreMat
    );
    futureForm.add(conduit);
  }

  // Dual counter-rotating singularity gimbal rings + suspended core octahedron
  const singRingOuter = new THREE.Mesh(
    new THREE.TorusGeometry(0.052, 0.007, 8, 24),
    magentaCoreMat
  );
  singRingOuter.position.set(0, 0.01, -0.35);
  futureForm.add(singRingOuter);
  spinningParts.push(singRingOuter);

  const singRingInner = new THREE.Mesh(
    new THREE.TorusGeometry(0.036, 0.005, 8, 20),
    neonCyanMat
  );
  singRingInner.position.set(0, 0.01, -0.35);
  singRingInner.rotation.x = Math.PI / 3;
  futureForm.add(singRingInner);
  spinningParts.push(singRingInner);

  const singOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.022, 0), magentaCoreMat);
  singOrb.position.set(0, 0.01, -0.35);
  futureForm.add(singOrb);
  spinningParts.push(singOrb);

  // Floating holographic diamond sight
  const futScope = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.004, 6, 4), neonCyanMat);
  futScope.position.set(0, 0.086, -0.14);
  futureForm.add(futScope);

  presentForm.visible = false;
  futureForm.visible = false;
  root.add(pastForm, presentForm, futureForm);

  // Muzzle anchor + flash
  const muzzleAnchor = new THREE.Object3D();
  muzzleAnchor.position.set(0, 0.025, -0.74);
  root.add(muzzleAnchor);

  const muzzleFlash = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.095, 0),
    new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  muzzleFlash.visible = false;
  muzzleAnchor.add(muzzleFlash);

  const muzzleLight = new THREE.PointLight(0xffb703, 0, 8, 2);
  muzzleAnchor.add(muzzleLight);

  return {
    root,
    muzzleAnchor,
    muzzleFlash,
    muzzleLight,
    forms: {
      past: pastForm,
      present: presentForm,
      future: futureForm,
    },
    spinningParts,
  };
}

/**
 * Builds an 8-part Chrono-Anchor Spire with bottom-center pivot (y=0).
 */
export function createAnchorSpire(era: TimelineId, isSoftwareGl: boolean): AnchorSpireVisual {
  const root = new THREE.Group();

  const hue = era === 'past' ? 0xf59e0b : era === 'present' ? 0x10b981 : 0xe879f9;
  const secondary = era === 'past' ? 0xfbbf24 : era === 'present' ? 0x38bdf8 : 0x22d3ee;

  const plinthMat = new THREE.MeshStandardMaterial({
    color: era === 'past' ? 0x45392e : era === 'present' ? 0x263842 : 0x161229,
    roughness: era === 'past' ? 0.85 : 0.42,
    metalness: era === 'past' ? 0.15 : 0.78,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: secondary,
    emissive: secondary,
    emissiveIntensity: 0.9,
    roughness: 0.25,
    metalness: 0.6,
  });

  const baseLower = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.0, 0.35, 8), plinthMat);
  baseLower.position.y = 0.175;
  baseLower.receiveShadow = true;
  baseLower.castShadow = !isSoftwareGl;
  root.add(baseLower);

  const baseUpper = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.1, 0.4, 8), plinthMat);
  baseUpper.position.y = 0.55;
  baseUpper.receiveShadow = true;
  root.add(baseUpper);

  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2 + Math.PI / 4;
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.42, 3.4, 0.55), plinthMat);
    pylon.position.set(Math.cos(angle) * 1.45, 2.0, Math.sin(angle) * 1.45);
    pylon.rotation.y = -angle;
    pylon.castShadow = !isSoftwareGl;
    root.add(pylon);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.8, 0.12), trimMat);
    strip.position.set(Math.cos(angle) * 1.28, 2.0, Math.sin(angle) * 1.28);
    root.add(strip);
  }

  const ringMat = new THREE.MeshBasicMaterial({
    color: hue,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const ringFloor = new THREE.Mesh(new THREE.RingGeometry(5.9, 6.25, 48), ringMat);
  ringFloor.rotation.x = -Math.PI / 2;
  ringFloor.position.y = 0.04;
  root.add(ringFloor);

  const gyroRings: THREE.Mesh[] = [];
  const gyroMat = new THREE.MeshStandardMaterial({
    color: hue,
    emissive: hue,
    emissiveIntensity: 1.2,
    metalness: 0.85,
    roughness: 0.2,
  });
  for (let i = 0; i < 2; i++) {
    const gRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.15 - i * 0.25, 0.06, 10, 32),
      gyroMat.clone()
    );
    gRing.position.y = 2.6;
    root.add(gRing);
    gyroRings.push(gRing);
  }

  const coreCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55, 0),
    new THREE.MeshStandardMaterial({
      color: hue,
      emissive: hue,
      emissiveIntensity: 2.0,
      roughness: 0.15,
      metalness: 0.25,
    })
  );
  coreCrystal.position.y = 2.6;
  root.add(coreCrystal);

  const beaconBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.45, 22, 12, 1, true),
    new THREE.MeshBasicMaterial({
      color: hue,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  beaconBeam.position.y = 12;
  root.add(beaconBeam);

  const pointLight = new THREE.PointLight(hue, 3.5, 18, 1.8);
  pointLight.position.y = 3.2;
  root.add(pointLight);

  return {
    root,
    ringFloor,
    gyroRings,
    coreCrystal,
    beaconBeam,
    pointLight,
  };
}

/**
 * Builds composite 8-12 part articulated enemy models with bottom-center pivots (y=0) + contact shadow.
 */
export function createEnemyVisual(
  era: TimelineId,
  variant: 'heavy' | 'ranged',
  enemyId: number,
  shadowTexture: THREE.Texture,
  isSoftwareGl: boolean
): EnemyVisual {
  const root = new THREE.Group();
  const bodyParts: THREE.Mesh[] = [];
  const rotors: THREE.Object3D[] = [];
  const orbiters: THREE.Object3D[] = [];

  const shadowDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(2.0, 2.0),
    new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
      opacity: 0.55,
    })
  );
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.025;
  root.add(shadowDisc);

  let headMesh!: THREE.Mesh;
  let windupCore!: THREE.Mesh;
  let shieldMesh: THREE.Mesh | undefined;
  let leftArm: THREE.Object3D | undefined;
  let rightArm: THREE.Object3D | undefined;
  let floatNode: THREE.Object3D | undefined;

  const tagMesh = (mesh: THREE.Mesh, isHead = false) => {
    mesh.userData.enemyId = enemyId;
    mesh.userData.isHead = isHead;
    mesh.castShadow = !isSoftwareGl;
    bodyParts.push(mesh);
  };

  if (era === 'past' && variant === 'heavy') {
    // ── OBSIDIAN GOLEM WARDEN (Sculpted chestplate, boulder limbs, horned monolith head) ──
    const stone = new THREE.MeshStandardMaterial({
      color: 0x3b3129,
      roughness: 0.9,
      metalness: 0.08,
    });
    const bronzeArmor = new THREE.MeshStandardMaterial({
      color: 0x9c682b,
      roughness: 0.34,
      metalness: 0.78,
    });
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.8,
      roughness: 0.2,
    });

    // Dual articulated legs
    for (const side of [-0.32, 0.32]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.88, 6), stone);
      leg.position.set(side, 0.44, 0);
      tagMesh(leg);
      root.add(leg);

      const kneeGuard = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.28), bronzeArmor);
      kneeGuard.position.set(side, 0.56, 0.14);
      root.add(kneeGuard);
    }

    // Beveled sculpted monolith chest
    const chestGeo = makeExtrudedProfile(
      [
        [-0.45, -0.45],
        [0.45, -0.45],
        [0.64, 0.18],
        [0.42, 0.5],
        [-0.42, 0.5],
        [-0.64, 0.18],
      ],
      0.66,
      0.06,
      0.05
    );
    const torso = new THREE.Mesh(chestGeo, stone);
    torso.position.set(0, 1.38, 0);
    tagMesh(torso);
    root.add(torso);

    // Floating bronze shoulder pauldrons
    for (const side of [-0.78, 0.78]) {
      const pauldron = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), bronzeArmor);
      pauldron.position.set(side, 1.78, 0);
      pauldron.scale.set(1.1, 0.8, 1.1);
      tagMesh(pauldron);
      root.add(pauldron);
    }

    // Glowing solar chest core
    windupCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), emberMat.clone());
    windupCore.position.set(0, 1.38, 0.4);
    tagMesh(windupCore);
    root.add(windupCore);

    // Horned head monolith
    headMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), stone);
    headMesh.position.set(0, 2.12, 0.04);
    tagMesh(headMesh, true);
    root.add(headMesh);

    for (const side of [-0.26, 0.26]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.42, 5), bronzeArmor);
      horn.position.set(side, 2.38, 0.04);
      horn.rotation.z = side < 0 ? 0.35 : -0.35;
      root.add(horn);
    }

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.12), emberMat);
    visor.position.set(0, 2.12, 0.28);
    root.add(visor);

    // Articulated arms with heavy boulder gauntlets
    const buildArm = (x: number) => {
      const armGrp = new THREE.Group();
      armGrp.position.set(x, 1.65, 0.05);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.55, 6), stone);
      upper.position.y = -0.28;
      tagMesh(upper);
      armGrp.add(upper);
      const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.26, 0), stone);
      fist.position.set(0, -0.68, 0.12);
      tagMesh(fist);
      armGrp.add(fist);
      root.add(armGrp);
      return armGrp;
    };
    leftArm = buildArm(-0.88);
    rightArm = buildArm(0.88);
  } else if (era === 'past') {
    // ── EMBER-CASTER ACOLYTE (Lathe ritual robe, orbiting astrolabe rings & flame orbs) ──
    const robeMat = new THREE.MeshStandardMaterial({
      color: 0x452d20,
      roughness: 0.85,
      metalness: 0.12,
    });
    const goldMat = new THREE.MeshPhysicalMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.88,
      anisotropy: 0.6,
    });
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xfb923c,
      emissive: 0xf97316,
      emissiveIntensity: 2.0,
      roughness: 0.15,
    });

    floatNode = new THREE.Group();
    floatNode.position.y = 0.35;
    root.add(floatNode);

    const robeGeo = makeTurnedLathe(
      [
        [0.62, 0.0],
        [0.44, 0.45],
        [0.36, 0.95],
        [0.48, 1.15],
        [0.18, 1.32],
      ],
      10
    );
    const robe = new THREE.Mesh(robeGeo, robeMat);
    tagMesh(robe);
    floatNode.add(robe);

    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.045, 8, 24), goldMat);
    halo.position.set(0, 1.65, -0.18);
    floatNode.add(halo);
    orbiters.push(halo);

    headMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), goldMat);
    headMesh.position.y = 1.65;
    headMesh.scale.set(0.85, 1.2, 0.85);
    tagMesh(headMesh, true);
    floatNode.add(headMesh);

    const eyeSlit = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.12), flameMat);
    eyeSlit.position.set(0, 1.66, 0.24);
    floatNode.add(eyeSlit);

    windupCore = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), flameMat.clone());
    windupCore.position.set(0, 1.2, 0.52);
    tagMesh(windupCore);
    floatNode.add(windupCore);

    // Orbiting miniature braziers
    for (const side of [-0.62, 0.62]) {
      const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), flameMat);
      orb.position.set(side, 1.35, 0.15);
      floatNode.add(orb);
      orbiters.push(orb);
    }
  } else if (era === 'present' && variant === 'heavy') {
    // ── BIO-CONTAINMENT TROOPER (Sculpted tactical rig, respirator mask, cryo backpack + tubes) ──
    const armorMat = new THREE.MeshPhysicalMaterial({
      color: 0xd5e3e8,
      roughness: 0.34,
      metalness: 0.42,
      clearcoat: 0.4,
    });
    const suitMat = new THREE.MeshStandardMaterial({
      color: 0x1a262d,
      roughness: 0.78,
      metalness: 0.22,
    });
    const bioGlow = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.85,
      roughness: 0.15,
    });

    // Articulated armored legs + boots
    for (const side of [-0.21, 0.21]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.11, 0.88, 8), suitMat);
      leg.position.set(side, 0.44, 0);
      tagMesh(leg);
      root.add(leg);

      const shinPlate = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.44, 0.22), armorMat);
      shinPlate.position.set(side, 0.3, 0.05);
      root.add(shinPlate);
    }

    // Beveled tactical chestplate
    const chestGeo = makeExtrudedProfile(
      [
        [-0.32, -0.34],
        [0.32, -0.34],
        [0.4, 0.2],
        [0.24, 0.38],
        [-0.24, 0.38],
        [-0.4, 0.2],
      ],
      0.46,
      0.04,
      0.03
    );
    const chest = new THREE.Mesh(chestGeo, armorMat);
    chest.position.set(0, 1.24, 0);
    tagMesh(chest);
    root.add(chest);

    // Shoulder pads
    for (const side of [-0.46, 0.46]) {
      const pad = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.34), armorMat);
      pad.position.set(side, 1.52, 0);
      pad.rotation.z = side < 0 ? 0.28 : -0.28;
      root.add(pad);
    }

    // Twin pressurized cryo tanks + TubeGeometry hoses
    for (const side of [-0.14, 0.14]) {
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.56, 10), bioGlow.clone());
      tank.position.set(side, 1.28, -0.34);
      tagMesh(tank);
      root.add(tank);
    }
    const feedHose = new THREE.Mesh(
      makeTube(
        [
          [0.14, 1.12, -0.34],
          [0.42, 1.05, -0.15],
          [0.44, 1.2, 0.25],
        ],
        0.032,
        10
      ),
      suitMat
    );
    root.add(feedHose);

    // Respirator helmet + twin glowing ocular lenses
    headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 12), armorMat);
    headMesh.position.set(0, 1.86, 0);
    tagMesh(headMesh, true);
    root.add(headMesh);

    const respirator = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.18, 8), suitMat);
    respirator.rotation.x = Math.PI / 2;
    respirator.position.set(0, 1.78, 0.24);
    root.add(respirator);

    for (const eyeX of [-0.09, 0.09]) {
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), bioGlow);
      lens.position.set(eyeX, 1.88, 0.23);
      root.add(lens);
    }

    // Articulated weapon arm + detailed carbine
    rightArm = new THREE.Group();
    rightArm.position.set(0.46, 1.26, 0.1);
    const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.72), suitMat);
    gunBody.position.z = 0.24;
    tagMesh(gunBody);
    rightArm.add(gunBody);
    const gunBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8), armorMat);
    gunBarrel.rotation.x = Math.PI / 2;
    gunBarrel.position.set(0, 0.03, 0.68);
    rightArm.add(gunBarrel);
    root.add(rightArm);

    windupCore = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 10), bioGlow.clone());
    windupCore.position.set(0.46, 1.29, 0.92);
    root.add(windupCore);
  } else if (era === 'present') {
    // ── HAZMAT RECON DRONE (Gyro hull, 3 vectored turbine pods with spinning blades, optical eye) ──
    const shellMat = new THREE.MeshPhysicalMaterial({
      color: 0x223640,
      roughness: 0.28,
      metalness: 0.82,
      clearcoat: 0.5,
    });
    const cyanGlow = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 2.0,
      roughness: 0.15,
    });

    floatNode = new THREE.Group();
    floatNode.position.y = 1.45;
    root.add(floatNode);

    headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 14), shellMat);
    tagMesh(headMesh, true);
    floatNode.add(headMesh);

    const gyroBand = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.04, 8, 24), cyanGlow);
    gyroBand.rotation.x = Math.PI / 2;
    floatNode.add(gyroBand);
    orbiters.push(gyroBand);

    windupCore = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.22, 12), cyanGlow.clone());
    windupCore.rotation.x = Math.PI / 2;
    windupCore.position.z = 0.36;
    tagMesh(windupCore);
    floatNode.add(windupCore);

    // 3 vectored thruster pods with spinning rotor discs
    const podGeo = makeTurnedLathe(
      [
        [0.14, -0.1],
        [0.2, 0.0],
        [0.17, 0.16],
        [0.11, 0.2],
      ],
      12
    );
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3 + Math.PI / 6;
      const px = Math.cos(ang) * 0.64;
      const pz = Math.sin(ang) * 0.64;

      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.08), shellMat);
      strut.position.set(px * 0.5, 0.05, pz * 0.5);
      strut.rotation.y = -ang;
      floatNode.add(strut);

      const pod = new THREE.Mesh(podGeo, shellMat);
      pod.position.set(px, 0.05, pz);
      tagMesh(pod);
      floatNode.add(pod);

      const rotor = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.015, 0.06), cyanGlow);
      rotor.position.set(px, 0.25, pz);
      floatNode.add(rotor);
      rotors.push(rotor);
    }
  } else if (era === 'future' && variant === 'heavy') {
    // ── CHRONO-ENFORCER MECH (Reverse-jointed legs, stealth beveled chassis, shoulder rail pods, shield) ──
    const obsidian = new THREE.MeshPhysicalMaterial({
      color: 0x151126,
      roughness: 0.2,
      metalness: 0.9,
      anisotropy: 0.75,
    });
    const magenta = new THREE.MeshStandardMaterial({
      color: 0xe879f9,
      emissive: 0xe879f9,
      emissiveIntensity: 2.0,
      roughness: 0.12,
    });
    const cyanTrim = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });

    // Reverse-jointed articulated legs
    for (const side of [-0.36, 0.36]) {
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.56, 0.28), obsidian);
      thigh.position.set(side, 0.78, 0.08);
      thigh.rotation.x = -0.32;
      tagMesh(thigh);
      root.add(thigh);

      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.58, 0.22), obsidian);
      shin.position.set(side, 0.32, -0.05);
      shin.rotation.x = 0.26;
      tagMesh(shin);
      root.add(shin);

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.12, 0.42), obsidian);
      foot.position.set(side, 0.06, 0.04);
      root.add(foot);
    }

    // Angular stealth chassis
    const hullGeo = makeExtrudedProfile(
      [
        [-0.44, -0.36],
        [0.44, -0.36],
        [0.62, 0.18],
        [0.36, 0.46],
        [-0.36, 0.46],
        [-0.62, 0.18],
      ],
      0.66,
      0.05,
      0.04
    );
    const chassis = new THREE.Mesh(hullGeo, obsidian);
    chassis.position.set(0, 1.42, 0);
    tagMesh(chassis);
    root.add(chassis);

    // Twin shoulder rail-cannon pods
    for (const side of [-0.72, 0.72]) {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.76), obsidian);
      pod.position.set(side, 1.82, 0.14);
      tagMesh(pod);
      root.add(pod);

      const barrelGlow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.78), cyanTrim);
      barrelGlow.position.set(side, 1.82, 0.18);
      root.add(barrelGlow);
    }

    headMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), obsidian);
    headMesh.position.set(0, 2.08, 0.08);
    tagMesh(headMesh, true);
    root.add(headMesh);

    const optic = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.16), magenta);
    optic.position.set(0, 2.08, 0.3);
    root.add(optic);

    windupCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), magenta.clone());
    windupCore.position.set(0, 1.42, 0.42);
    tagMesh(windupCore);
    root.add(windupCore);

    // Hexagonal energy barrier shield
    shieldMesh = new THREE.Mesh(
      new THREE.CircleGeometry(0.95, 6),
      new THREE.MeshBasicMaterial({
        color: 0xe879f9,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    shieldMesh.position.set(0, 1.38, 0.74);
    root.add(shieldMesh);
  } else {
    // ── PRISM SENTINEL TURRET (Splayed 3-leg tripod, rotating gyro cage, twin rail fins, laser prism) ──
    const obsidian = new THREE.MeshPhysicalMaterial({
      color: 0x191430,
      roughness: 0.22,
      metalness: 0.88,
    });
    const neon = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x22d3ee,
      emissiveIntensity: 2.0,
      roughness: 0.12,
    });
    const magGlow = new THREE.MeshStandardMaterial({
      color: 0xe879f9,
      emissive: 0xe879f9,
      emissiveIntensity: 1.7,
    });

    // Splayed 3-legged tripod struts
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3;
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.25, 0.18), obsidian);
      strut.position.set(Math.cos(ang) * 0.34, 0.56, Math.sin(ang) * 0.34);
      strut.rotation.z = Math.cos(ang) * 0.44;
      strut.rotation.x = -Math.sin(ang) * 0.44;
      tagMesh(strut);
      root.add(strut);

      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.1, 6), obsidian);
      pad.position.set(Math.cos(ang) * 0.62, 0.05, Math.sin(ang) * 0.62);
      root.add(pad);
    }

    const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.06, 8, 18), magGlow);
    collarRing.rotation.x = Math.PI / 2;
    collarRing.position.y = 1.12;
    root.add(collarRing);
    orbiters.push(collarRing);

    headMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), obsidian);
    headMesh.position.y = 1.54;
    tagMesh(headMesh, true);
    root.add(headMesh);

    for (const side of [-0.36, 0.36]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.68), obsidian);
      fin.position.set(side, 1.54, 0.18);
      tagMesh(fin);
      root.add(fin);
    }

    windupCore = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.52, 6), neon.clone());
    windupCore.rotation.x = Math.PI / 2;
    windupCore.position.set(0, 1.54, 0.48);
    tagMesh(windupCore);
    root.add(windupCore);
  }

  // Chronal Stasis crystalline freeze cage (hidden unless enemy is frozen in time)
  const stasisCage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(variant === 'heavy' ? 1.35 : 1.05, 0),
    new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      wireframe: true,
      transparent: true,
      opacity: 0.72,
    })
  );
  stasisCage.position.y = variant === 'heavy' ? 1.3 : 1.35;
  stasisCage.scale.set(1.0, variant === 'heavy' ? 1.25 : 1.05, 1.0);
  stasisCage.visible = false;
  root.add(stasisCage);

  // World-space floating HP bar above enemy
  const hpBarBg = new THREE.Mesh(
    new THREE.PlaneGeometry(1.15, 0.11),
    new THREE.MeshBasicMaterial({ color: 0x090b10, side: THREE.DoubleSide })
  );
  hpBarBg.position.y = 2.68;
  root.add(hpBarBg);

  const hpBarFill = new THREE.Mesh(
    new THREE.PlaneGeometry(1.08, 0.07),
    new THREE.MeshBasicMaterial({
      color: era === 'past' ? 0xf59e0b : era === 'present' ? 0x10b981 : 0xe879f9,
      side: THREE.DoubleSide,
    })
  );
  hpBarFill.position.set(0, 2.68, 0.01);
  root.add(hpBarFill);

  return {
    root,
    headMesh,
    bodyParts,
    windupCore,
    shieldMesh,
    leftArm,
    rightArm,
    floatNode,
    rotors,
    orbiters,
    stasisCage,
    hpBarFill,
    hpBarBg,
  };
}

/**
 * Builds a holographic player projection (bottom-center pivot y=0, facing -Z) for Temporal Decoy.
 */
export function createDecoyProjection(): DecoyVisual {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const holoMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.56,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const holoWireMat = new THREE.MeshBasicMaterial({
    color: 0x7dd3fc,
    wireframe: true,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const visorMat = new THREE.MeshBasicMaterial({
    color: 0xe0f2fe,
    transparent: true,
    opacity: 0.9,
  });

  // Ground holographic emitter ring
  const ringFloor = new THREE.Mesh(
    new THREE.RingGeometry(0.68, 0.88, 24),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  ringFloor.rotation.x = -Math.PI / 2;
  ringFloor.position.y = 0.04;
  root.add(ringFloor);

  // Armored holographic legs
  for (const side of [-0.18, 0.18]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.09, 0.85, 8), holoMat);
    leg.position.set(side, 0.425, 0);
    bodyGroup.add(leg);
  }

  // Sculpted torso + wireframe overlay
  const chestGeo = makeExtrudedProfile(
    [
      [-0.28, -0.32],
      [0.28, -0.32],
      [0.36, 0.18],
      [0.2, 0.34],
      [-0.2, 0.34],
      [-0.36, 0.18],
    ],
    0.38,
    0.03,
    0.02
  );
  const torso = new THREE.Mesh(chestGeo, holoMat);
  torso.position.set(0, 1.2, 0);
  bodyGroup.add(torso);

  const torsoWire = new THREE.Mesh(chestGeo, holoWireMat);
  torsoWire.position.copy(torso.position);
  torsoWire.scale.setScalar(1.04);
  bodyGroup.add(torsoWire);

  // Helmet + glowing visor facing -Z
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), holoMat);
  helmet.position.set(0, 1.76, 0);
  bodyGroup.add(helmet);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.1), visorMat);
  visor.position.set(0, 1.77, -0.2);
  bodyGroup.add(visor);

  // Outstretched carbine silhouette aiming forward (-Z)
  const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.72), holoMat);
  rifle.position.set(0.28, 1.22, -0.36);
  bodyGroup.add(rifle);

  // Orbiting temporal halo ring around midsection
  const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.03, 8, 28), visorMat);
  haloRing.rotation.x = Math.PI / 2;
  haloRing.position.y = 1.15;
  root.add(haloRing);

  return {
    root,
    bodyGroup,
    ringFloor,
    haloRing,
  };
}
