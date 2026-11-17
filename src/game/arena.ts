import * as THREE from 'three';
import { createAnchorSpire, AnchorSpireVisual } from './models';
import { createEraBlockTexture, createEraFloorTexture } from './textures';
import { TimelineId } from './types';

export interface BoxCollider {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface EraAtmosphere {
  skyHex: number;
  fogHex: number;
  fogDensity: number;
  keyColor: number;
  keyIntensity: number;
  hemiSky: number;
  hemiGround: number;
  hemiIntensity: number;
}

export const ANCHOR_COORDS: Record<TimelineId, THREE.Vector3> = {
  past: new THREE.Vector3(-21, 0, -8),
  present: new THREE.Vector3(0, 0, -21),
  future: new THREE.Vector3(21, 0, 8),
};

export const ERA_ATMOSPHERE: Record<TimelineId, EraAtmosphere> = {
  past: {
    skyHex: 0x261a11,
    fogHex: 0x261a11,
    fogDensity: 0.016,
    keyColor: 0xffb366,
    keyIntensity: 2.2,
    hemiSky: 0xd97706,
    hemiGround: 0x2a2018,
    hemiIntensity: 0.9,
  },
  present: {
    skyHex: 0x0b1c22,
    fogHex: 0x0b1c22,
    fogDensity: 0.015,
    keyColor: 0xdbeafe,
    keyIntensity: 2.0,
    hemiSky: 0x38bdf8,
    hemiGround: 0x0f2622,
    hemiIntensity: 1.0,
  },
  future: {
    skyHex: 0x0b071a,
    fogHex: 0x0b071a,
    fogDensity: 0.017,
    keyColor: 0xf0abfc,
    keyIntensity: 1.9,
    hemiSky: 0x22d3ee,
    hemiGround: 0x1e1136,
    hemiIntensity: 0.95,
  },
};

export interface ArenaBuildResult {
  eraGroups: Record<TimelineId, THREE.Group>;
  collidersByEra: Record<TimelineId, BoxCollider[]>;
  bulletMeshesByEra: Record<TimelineId, THREE.Mesh[]>;
  spires: Record<TimelineId, AnchorSpireVisual>;
  echoMarkersByEra: Record<TimelineId, THREE.Mesh[]>;
  animatedProps: { mesh: THREE.Object3D; speed: number; baseY: number }[];
  ambientParticles: THREE.Points;
}

export function buildTriTimelineArena(
  scene: THREE.Scene,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): ArenaBuildResult {
  const eraGroups: Record<TimelineId, THREE.Group> = {
    past: new THREE.Group(),
    present: new THREE.Group(),
    future: new THREE.Group(),
  };

  const collidersByEra: Record<TimelineId, BoxCollider[]> = {
    past: [],
    present: [],
    future: [],
  };

  const bulletMeshesByEra: Record<TimelineId, THREE.Mesh[]> = {
    past: [],
    present: [],
    future: [],
  };

  const echoMarkersByEra: Record<TimelineId, THREE.Mesh[]> = {
    past: [],
    present: [],
    future: [],
  };

  const animatedProps: { mesh: THREE.Object3D; speed: number; baseY: number }[] = [];

  // Shared outer world terrain ring (prevents floating void edge)
  const outerGround = new THREE.Mesh(
    new THREE.CircleGeometry(140, 48),
    new THREE.MeshStandardMaterial({
      color: 0x101218,
      roughness: 0.95,
      metalness: 0.1,
    })
  );
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.05;
  scene.add(outerGround);

  // Natural crater monolith ring beyond the 36m playfield radius (InstancedMesh)
  const cliffCount = 36;
  const cliffGeo = new THREE.DodecahedronGeometry(4.2, 0);
  const cliffMat = new THREE.MeshStandardMaterial({
    color: 0x1c1f29,
    roughness: 0.92,
    metalness: 0.15,
  });
  const cliffInst = new THREE.InstancedMesh(cliffGeo, cliffMat, cliffCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < cliffCount; i++) {
    const angle = (i / cliffCount) * Math.PI * 2;
    const rad = 43 + (i % 3) * 3.5;
    dummy.position.set(Math.cos(angle) * rad, 1.5 + (i % 4) * 1.1, Math.sin(angle) * rad);
    dummy.rotation.set(i * 0.4, angle, i * 0.2);
    const s = 1.0 + (i % 3) * 0.45;
    dummy.scale.set(s * 1.4, s * 2.1, s * 1.2);
    dummy.updateMatrix();
    cliffInst.setMatrixAt(i, dummy.matrix);
  }
  cliffInst.instanceMatrix.needsUpdate = true;
  cliffInst.computeBoundingSphere();
  scene.add(cliffInst);

  // Shared low perimeter retaining curb (radius ~36m square bounds: -34..34)
  const sharedBounds: [number, number, number, number, number, number][] = [
    [0, 1.4, -36, 74, 2.8, 2.2],
    [0, 1.4, 36, 74, 2.8, 2.2],
    [-36, 1.4, 0, 2.2, 2.8, 74],
    [36, 1.4, 0, 2.2, 2.8, 74],
  ];

  const curbMat = new THREE.MeshStandardMaterial({
    color: 0x20242f,
    roughness: 0.8,
    metalness: 0.35,
  });

  for (const [x, y, z, w, h, d] of sharedBounds) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), curbMat);
    wall.position.set(x, y, z);
    wall.receiveShadow = true;
    scene.add(wall);

    const col: BoxCollider = {
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: y - h / 2,
      maxY: y + h / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
    };
    collidersByEra.past.push(col);
    collidersByEra.present.push(col);
    collidersByEra.future.push(col);
    bulletMeshesByEra.past.push(wall);
    bulletMeshesByEra.present.push(wall);
    bulletMeshesByEra.future.push(wall);
  }

  // Helper to add cover block to an era
  const addCover = (
    era: TimelineId,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    accentMat?: THREE.Material
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = !isSoftwareGl;
    mesh.receiveShadow = true;
    eraGroups[era].add(mesh);

    if (accentMat) {
      const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.14, d + 0.08), accentMat);
      trim.position.set(x, y + h / 2 - 0.14, z);
      eraGroups[era].add(trim);
    }

    collidersByEra[era].push({
      minX: x - w / 2,
      maxX: x + w / 2,
      minY: y - h / 2,
      maxY: y + h / 2,
      minZ: z - d / 2,
      maxZ: z + d / 2,
    });
    bulletMeshesByEra[era].push(mesh);
  };

  // Build each era's floor, cover layout, and props
  const eras: TimelineId[] = ['past', 'present', 'future'];

  const spires = {} as Record<TimelineId, AnchorSpireVisual>;

  for (const era of eras) {
    const group = eraGroups[era];
    const floorTex = createEraFloorTexture(era, maxAnisotropy);
    const blockTex = createEraBlockTexture(era, maxAnisotropy);

    const floorMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(72, 72),
      new THREE.MeshStandardMaterial({
        map: floorTex,
        roughness: era === 'past' ? 0.88 : era === 'present' ? 0.45 : 0.32,
        metalness: era === 'past' ? 0.08 : era === 'present' ? 0.35 : 0.65,
      })
    );
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    group.add(floorMesh);

    const blockMat = new THREE.MeshStandardMaterial({
      map: blockTex,
      roughness: era === 'past' ? 0.86 : era === 'present' ? 0.42 : 0.28,
      metalness: era === 'past' ? 0.1 : era === 'present' ? 0.55 : 0.78,
    });

    if (era === 'past') {
      const amberTrim = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        emissive: 0xd97706,
        emissiveIntensity: 0.9,
      });

      // Past Ruin: Sunken temple colonnade + flanking stone blocks + West Sanctuary walls
      const pastBlocks: [number, number, number, number, number, number][] = [
        [-10, 2.0, -14, 3.2, 4.0, 3.2],
        [-10, 2.0, 0, 3.2, 4.0, 3.2],
        [-12, 1.3, 12, 6.0, 2.6, 2.4],
        [6, 1.5, -10, 4.5, 3.0, 2.4],
        [8, 2.2, 8, 3.6, 4.4, 3.6],
        [18, 1.2, -16, 6.5, 2.4, 2.5],
        [-24, 1.6, 12, 5.2, 3.2, 2.6],
        [0, 0.8, 18, 8.0, 1.6, 2.2],
        // Low step-up altar slabs
        [-15, 0.45, -8, 2.8, 0.9, 5.0],
        [14, 0.45, 2, 3.2, 0.9, 4.2],
      ];
      for (const b of pastBlocks) {
        addCover('past', b[0], b[1], b[2], b[3], b[4], b[5], blockMat, amberTrim);
      }

      // Glowing amber braziers
      for (const [bx, bz] of [
        [-14, -15],
        [-14, -1],
        [12, -14],
        [12, 14],
      ]) {
        const brazierBase = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.7, 1.2, 6),
          blockMat
        );
        brazierBase.position.set(bx, 0.6, bz);
        group.add(brazierBase);

        const flame = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.42, 0),
          new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
        );
        flame.position.set(bx, 1.55, bz);
        group.add(flame);
        animatedProps.push({ mesh: flame, speed: 2.4, baseY: 1.55 });
      }
    } else if (era === 'present') {
      const bioTrim = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 1.0,
      });

      // Present Bio-Lab: Central quarantine bulkheads & cryo-vat chambers (distinct lanes!)
      const presentBlocks: [number, number, number, number, number, number][] = [
        [-7, 1.7, -4, 2.4, 3.4, 8.5],
        [7, 1.7, -4, 2.4, 3.4, 8.5],
        [0, 1.35, 9, 9.0, 2.7, 2.2],
        [-18, 1.5, -16, 5.5, 3.0, 2.5],
        [18, 1.5, -16, 5.5, 3.0, 2.5],
        [-19, 1.3, 6, 3.4, 2.6, 7.0],
        [18, 1.3, 18, 6.0, 2.6, 2.6],
        [-4, 0.45, -13, 4.0, 0.9, 2.6],
      ];
      for (const b of presentBlocks) {
        addCover('present', b[0], b[1], b[2], b[3], b[4], b[5], blockMat, bioTrim);
      }

      // Glowing Cryo-Vats around Central Atrium
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.45,
        transparent: true,
        opacity: 0.42,
        roughness: 0.1,
        depthWrite: false,
      });
      const coreFluidMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        emissive: 0x10b981,
        emissiveIntensity: 1.4,
      });

      for (const [vx, vz] of [
        [-11, -15],
        [11, -15],
        [-11, 14],
        [11, 14],
      ]) {
        const capB = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.4, 16), blockMat);
        capB.position.set(vx, 0.2, vz);
        group.add(capB);

        const fluid = new THREE.Mesh(
          new THREE.CylinderGeometry(0.55, 0.55, 2.5, 12),
          coreFluidMat
        );
        fluid.position.set(vx, 1.65, vz);
        group.add(fluid);
        animatedProps.push({ mesh: fluid, speed: 1.4, baseY: 1.65 });

        const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 2.8, 16), glassMat);
        glass.position.set(vx, 1.8, vz);
        glass.renderOrder = 2;
        group.add(glass);

        collidersByEra.present.push({
          minX: vx - 1.0,
          maxX: vx + 1.0,
          minY: 0,
          maxY: 3.2,
          minZ: vz - 1.0,
          maxZ: vz + 1.0,
        });
        bulletMeshesByEra.present.push(capB);
      }
    } else {
      const neonTrim = new THREE.MeshStandardMaterial({
        color: 0xe879f9,
        emissive: 0xe879f9,
        emissiveIntensity: 1.2,
      });

      // Future Cyber-Citadel: Long sniper corridors, floating monolith pylons, open center!
      const futureBlocks: [number, number, number, number, number, number][] = [
        [-14, 2.4, -2, 2.4, 4.8, 2.4],
        [-14, 2.4, 14, 2.4, 4.8, 2.4],
        [14, 2.4, -14, 2.4, 4.8, 2.4],
        [11, 1.2, 16, 6.2, 2.4, 2.2],
        [2, 1.4, -9, 2.6, 2.8, 2.6],
        [-23, 1.6, -20, 5.0, 3.2, 3.0],
        [25, 1.6, -6, 3.0, 3.2, 6.5],
        [15, 0.45, 2, 3.6, 0.9, 5.2],
      ];
      for (const b of futureBlocks) {
        addCover('future', b[0], b[1], b[2], b[3], b[4], b[5], blockMat, neonTrim);
      }

      // Holographic floating data shards overhead
      for (const [hx, hz] of [
        [0, 0],
        [12, 0],
        [-12, 0],
      ]) {
        const holo = new THREE.Mesh(
          new THREE.OctahedronGeometry(0.75, 0),
          new THREE.MeshBasicMaterial({
            color: 0x22d3ee,
            wireframe: true,
          })
        );
        holo.position.set(hx, 6.2, hz);
        group.add(holo);
        animatedProps.push({ mesh: holo, speed: 1.9, baseY: 6.2 });
      }
    }

    // Add this era's Chrono-Anchor Spire
    const spire = createAnchorSpire(era, isSoftwareGl);
    spire.root.position.copy(ANCHOR_COORDS[era]);
    group.add(spire.root);
    spires[era] = spire;

    // Add ghosted Temporal Echo Markers for the OTHER two eras' Anchors
    for (const otherEra of eras) {
      if (otherEra === era) continue;
      const echoHue =
        otherEra === 'past' ? 0xf59e0b : otherEra === 'present' ? 0x10b981 : 0xe879f9;
      const echo = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.85, 5.2, 8, 1, true),
        new THREE.MeshBasicMaterial({
          color: echoHue,
          transparent: true,
          opacity: 0.14,
          wireframe: true,
          depthWrite: false,
        })
      );
      echo.position.set(ANCHOR_COORDS[otherEra].x, 2.6, ANCHOR_COORDS[otherEra].z);
      group.add(echo);
      echoMarkersByEra[era].push(echo);
    }

    group.visible = era === 'past';
    scene.add(group);
  }

  // Drifting Chrono-Rift ambient particles
  const pCount = 260;
  const pPositions = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPositions[i * 3] = (Math.random() - 0.5) * 68;
    pPositions[i * 3 + 1] = 0.4 + Math.random() * 14;
    pPositions[i * 3 + 2] = (Math.random() - 0.5) * 68;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  const ambientParticles = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      color: 0xfbbf24,
      size: 0.18,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
  scene.add(ambientParticles);

  return {
    eraGroups,
    collidersByEra,
    bulletMeshesByEra,
    spires,
    echoMarkersByEra,
    animatedProps,
    ambientParticles,
  };
}
