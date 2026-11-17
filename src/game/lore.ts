import { EraLoreConfig, TimelineId, WeaponProfile } from './types';

export const TIMELINE_ORDER: TimelineId[] = ['past', 'present', 'future'];

export const PARADOX_LORE_OVERVIEW = {
  title: 'THE TRI-FOLD PARADOX',
  incidentCode: 'EVENT HORIZON // AETHELGARD-07',
  premise:
    'In 2089, an experimental Chronon Containment Lattice ruptured beneath Aethelgard Sector-7—directly above an excavated 1240 BCE Sunstone Sanctuary. Instead of erasing the timeline, the shear folded three centuries into a single overlapping physical coordinate.',
  mechanics: [
    {
      heading: 'Spatial Overlap & Tactical Phasing',
      body: 'Walls, monoliths, and energy catwalks do not cross temporal boundaries. A reinforced bio-containment bulkhead blocking your sightline in 2089 may be crumbled rubble in 1240 BCE or an open plasma walkway in 2410 CE. Phase-shift mid-firefight to flank enemies through vanished cover or evade incoming barrages.',
    },
    {
      heading: 'Matter Harmonic Transmutation',
      body: 'Conventional brass and chemical propellants destabilize the instant you shift centuries. Your Chrono-Lattice Frame automatically transmutes its receiver, barrel geometry, and core output to obey the dominant physics of whichever timeline you occupy.',
    },
    {
      heading: 'Chrono-Break Flanking & High Ground',
      body: 'Shifting timelines destabilizes enemy temporal locks: for 2.6 seconds after any Phase Shift, your Chrono-Break Strike deals +35% damage and pierces energy barriers. Firing from elevated sanctuary steps or citadel ledges grants an additional +20% High Ground precision bonus.',
    },
    {
      heading: 'Temporal Stasis Pulse (RMB / F)',
      body: 'Emit a localized chrono-shockwave that shatters all airborne enemy projectiles, staggers nearby foes, strips Enforcer Mech frontal shields, and suppresses inactive Rift Surge buildup by 20%.',
    },
    {
      heading: 'Chronal Stasis (C)',
      body: 'Lock the entire active timeline in suspended animation—freezing every enemy and airborne hostile projectile in your current century for 3 seconds (15-second cooldown).',
    },
    {
      heading: 'Temporal Decoy (G)',
      body: 'Project a holographic Chrono-Operative phantom into another timeline for 6.5 seconds (20-second cooldown). Enemies in that century turn to engage your decoy and suppress their Rift Surge by 65%, setting up effortless Chrono-Break rear flanks when you phase-shift in.',
    },
    {
      heading: 'Rift Surge & Paradox Escalation',
      body: 'Hostile Chrono-Anchors resist capture. Clear an era’s defenders to unlock its Spire, then hold the ring through a 50% Guardian Counter-Breach. Each stabilized Anchor compresses remaining paradox energy—dynamically scaling surviving and newly deployed enemy HP (+28% / +58%) and aggression (+22% / +42%). Stabilize 2 of 3 Anchors to win.',
    },
  ],
};

export const WEAPON_PROFILES: Record<TimelineId, WeaponProfile> = {
  past: {
    id: 'sunstone-scatter',
    era: 'past',
    name: 'SUNSTONE SCATTER-CARBINE',
    subtitle: '1240 BCE // KINETIC RELIC',
    fireMode: '6-PELLET BURST',
    damage: 21, // per pellet (126 max point blank)
    pellets: 6,
    fireInterval: 0.56,
    magSize: 6,
    reloadTime: 1.35,
    spread: 0.048,
    range: 48,
    staggerPower: 1.0,
    cryoSlowDuration: 0,
    shieldMultiplier: 0.85,
    tracerColor: 0xf59e0b,
    accentHex: '#f59e0b',
    loreNote:
      'Forged when solar-charged obsidian shards collided with your Chrono-Lattice frame. Fires superheated basalt buckshot capable of staggering heavy golems and shattering stone cover.',
  },
  present: {
    id: 'cryo-pulse',
    era: 'present',
    name: 'CRYO-PULSE RIFLE',
    subtitle: '2089 CE // BIO-LAB CARBINE',
    fireMode: 'RAPID AUTO',
    damage: 26,
    pellets: 1,
    fireInterval: 0.115,
    magSize: 28,
    reloadTime: 1.25,
    spread: 0.014,
    range: 95,
    staggerPower: 0.25,
    cryoSlowDuration: 2.2,
    shieldMultiplier: 1.0,
    tracerColor: 0x34d399,
    accentHex: '#10b981',
    loreNote:
      'Standard-issue Aethelgard security armature modified with pressurized liquid-nitrogen canisters. Each dart chills enemy actuators, slowing fast drones and flanking troopers.',
  },
  future: {
    id: 'singularity-rail',
    era: 'future',
    name: 'SINGULARITY RAIL-LANCE',
    subtitle: '2410 CE // HYPER-PIERCER',
    fireMode: 'RAIL BEAM',
    damage: 92,
    pellets: 1,
    fireInterval: 0.72,
    magSize: 5,
    reloadTime: 1.45,
    spread: 0.001,
    range: 140,
    staggerPower: 0.7,
    cryoSlowDuration: 0,
    shieldMultiplier: 1.65,
    tracerColor: 0xe879f9,
    accentHex: '#e879f9',
    loreNote:
      'Suspended magnetic prongs accelerate micro-singularities at relativistic speed. Slices straight through cyber-shields and rewards precision headshots with devastating critical multipliers.',
  },
};

export const ERA_CONFIGS: Record<TimelineId, EraLoreConfig> = {
  past: {
    id: 'past',
    keyNum: '1',
    eraLabel: 'PAST RUIN',
    yearLabel: '1240 BCE',
    locationName: 'Sunstone Sanctuary',
    primaryHex: '#f59e0b',
    secondaryHex: '#84cc16',
    buffTitle: 'Stonebark Plating',
    buffDescription: 'Restores +2.0 Suit Integrity per second continuously across all eras.',
    riftHazardTitle: 'Seismic Rift Echoes',
    riftHazardDescription:
      'High-mass ancient stone monoliths create tight line-of-sight pockets and ambush alleys.',
    architecturalShift:
      'Colonnade pillars and sunken altar stairs provide thick ballistic cover in the West Quadrant.',
    enemyRoster: [
      {
        name: 'Obsidian Golem Warden',
        role: 'Armored Juggernaut',
        threat: 'Closes distance and unleashes glowing amber shock-slams; weak to head/core crits.',
      },
      {
        name: 'Ember-Caster Acolyte',
        role: 'Rift Artillery',
        threat: 'Floats above ruins and launches high-arc solar orbs after a visible charge telegraph.',
      },
    ],
    loreSummary:
      'Long before Aethelgard broke ground, an ancient order built the Sunstone Sanctuary around a natural chronon vein. In this timeline, moss-draped basalt colonnades and amber braziers cast long shadows across fractured temple steps.',
  },
  present: {
    id: 'present',
    keyNum: '2',
    eraLabel: 'PRESENT BIO-LAB',
    yearLabel: '2089 CE',
    locationName: 'Aethelgard Sector-7',
    primaryHex: '#10b981',
    secondaryHex: '#38bdf8',
    buffTitle: 'Cryo-Cooling Loop',
    buffDescription: '+25% weapon fire rate & faster reload speed across all three timelines.',
    riftHazardTitle: 'Containment Lockdown',
    riftHazardDescription:
      'Central cryo-tanks and reinforced bulkheads divide the atrium into crisp tactical firing lanes.',
    architecturalShift:
      'Central glass-and-steel containment walls stand where the Past and Future leave open plazas.',
    enemyRoster: [
      {
        name: 'Bio-Containment Trooper',
        role: 'Tactical Rifleman',
        threat: 'Strafes between lab bulkheads and fires suppressed emerald burst rounds.',
      },
      {
        name: 'Hazmat Recon Drone',
        role: 'Aerial Flanker',
        threat: 'Orbits above cover and locks on with a cyan targeting beam before firing.',
      },
    ],
    loreSummary:
      'Ground zero of the Temporal Shear. Emergency emerald floodlights wash over ruptured cryo-vats and quarantine dividers while automated defense squads attempt to purge every temporal anomaly—including you.',
  },
  future: {
    id: 'future',
    keyNum: '3',
    eraLabel: 'FUTURE CYBER-CITADEL',
    yearLabel: '2410 CE',
    locationName: 'Nexus Spire Grid',
    primaryHex: '#e879f9',
    secondaryHex: '#22d3ee',
    buffTitle: 'Chronon Overclock',
    buffDescription: '-40% Phase-Dash cooldown and +15% movement speed across all timelines.',
    riftHazardTitle: 'Quantum Hyper-Lattice',
    riftHazardDescription:
      'Elevated holographic bridges and sparse obsidian pylons create lethal long-range sniper corridors.',
    architecturalShift:
      'Floating neon platforms and translucent barriers span gaps that are solid walls in earlier centuries.',
    enemyRoster: [
      {
        name: 'Chrono-Enforcer Mech',
        role: 'Shielded Heavy Walker',
        threat: 'Projects a frontal magenta energy barrier; vulnerable to Rail-Lance hits and flanking.',
      },
      {
        name: 'Prism Sentinel Turret',
        role: 'Overwatch Beam Node',
        threat: 'Locks onto exposed targets with a sweeping magenta laser sight before firing.',
      },
    ],
    loreSummary:
      'Three centuries after the rupture, an AI Directorate encased the anomaly inside an obsidian cyber-citadel. Neon circuit grids and hovering monoliths harvest paradox energy while Enforcer Mechs guard the East Citadel Anchor.',
  },
};
