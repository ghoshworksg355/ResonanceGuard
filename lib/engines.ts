// Engine resonance profiles based on publicly known approximate values.
// These are the physics-relevant parameters used by the simulation.
// The ENGINES constant below merges these with general performance data.

export interface ResonanceBand {
  center: number; // throttle fraction (0-1) where this band peaks
  width: number; // half-width of the band
  severity: number; // 0-1, how strongly this band excites oscillations
  frequency: number; // Hz, dominant frequency content in this band
}

export interface EngineProfile {
  chamberPressure: number; // MPa at 100% throttle
  throttleMin: number; // minimum throttle fraction
  throttleMax: number; // maximum throttle fraction
  resonanceBands: ResonanceBand[]; // critical resonance bands across the throttle range
  sensitivityMultiplier: number; // 0-1+, how sensitive this engine is to resonance excitation
  dampingCoefficient: number; // dimensionless (higher = oscillations decay faster)
  couplingFactor: number; // 0-1, how strongly multiple engines couple into shared resonance
  primaryResonanceFrequency: number; // Hz, natural feedline resonance at nominal throttle
  throttleResponseRate: number; // 0-1, how fast oscillations respond to throttle changes
}

export const ENGINE_PROFILES: Record<EngineId, EngineProfile> = {
  // Merlin 1D — gas-generator cycle, moderate chamber pressure.
  // Public data: ~9.7 MPa Pc, throttle range 40%-100%.
  // Gas-generator coupling creates a mid-throttle resonance band around 65-75%.
  // Moderate sensitivity, decent damping, moderate multi-engine coupling.
  merlin: {
    chamberPressure: 9.7,
    throttleMin: 0.40,
    throttleMax: 1.00,
    resonanceBands: [
      { center: 0.62, width: 0.08, severity: 0.45, frequency: 38 },
      { center: 0.72, width: 0.06, severity: 0.70, frequency: 52 },
      { center: 0.95, width: 0.05, severity: 0.30, frequency: 60 },
    ],
    sensitivityMultiplier: 0.55,
    dampingCoefficient: 0.085,
    couplingFactor: 0.45,
    primaryResonanceFrequency: 42,
    throttleResponseRate: 0.55,
  },

  // Raptor 2 — full-flow staged combustion, very high chamber pressure.
  // Public data: ~30 MPa Pc, deep throttle capability down to ~40%.
  // Dual preburner architecture creates multiple strong resonance modes.
  // Highest sensitivity, lowest damping, strong multi-engine coupling.
  raptor: {
    chamberPressure: 30.0,
    throttleMin: 0.40,
    throttleMax: 1.00,
    resonanceBands: [
      { center: 0.55, width: 0.07, severity: 0.55, frequency: 55 },
      { center: 0.72, width: 0.10, severity: 0.90, frequency: 72 },
      { center: 0.88, width: 0.06, severity: 0.65, frequency: 85 },
    ],
    sensitivityMultiplier: 0.85,
    dampingCoefficient: 0.058,
    couplingFactor: 0.80,
    primaryResonanceFrequency: 68,
    throttleResponseRate: 0.82,
  },

  // RD-180 — staged combustion (oxidizer-rich), high chamber pressure.
  // Public data: ~26.7 MPa Pc, throttle range ~50%-105% (capped at 100% here).
  // Mature Russian design with excellent damping. Two-chamber architecture
  // reduces coupling. Lowest sensitivity, highest damping, weak coupling.
  rd180: {
    chamberPressure: 26.7,
    throttleMin: 0.47,
    throttleMax: 1.00,
    resonanceBands: [
      { center: 0.70, width: 0.07, severity: 0.35, frequency: 32 },
      { center: 0.85, width: 0.06, severity: 0.50, frequency: 45 },
      { center: 0.98, width: 0.04, severity: 0.35, frequency: 50 },
    ],
    sensitivityMultiplier: 0.40,
    dampingCoefficient: 0.095,
    couplingFactor: 0.30,
    primaryResonanceFrequency: 35,
    throttleResponseRate: 0.40,
  },
};

export interface EngineSpec extends EngineProfile {
  id: EngineId;
  name: string;
  manufacturer: string;
  cycle: string;
  propellant: string;
  thrustVacuum: number; // kN
  thrustSeaLevel: number; // kN
  ispVacuum: number; // seconds
  ispSeaLevel: number; // seconds
  massFlow: number; // kg/s
  feedlineLength: number; // meters (simplified)
  description: string;
}

export type EngineId = 'merlin' | 'raptor' | 'rd180';

// General performance data (public domain approximate values)
const ENGINE_PERF: Record<EngineId, Omit<EngineSpec, keyof EngineProfile | 'id'>> = {
  merlin: {
    name: 'Merlin 1D',
    manufacturer: 'SpaceX',
    cycle: 'Gas-generator (open)',
    propellant: 'LOX / RP-1',
    thrustVacuum: 981,
    thrustSeaLevel: 845,
    ispVacuum: 348,
    ispSeaLevel: 282,
    massFlow: 280,
    feedlineLength: 3.2,
    description:
      'High-performance kerosene engine. Gas-generator cycle introduces coupling between the turbine drive and main chamber, creating moderate feedline resonance risk at intermediate throttle settings.',
  },
  raptor: {
    name: 'Raptor 2',
    manufacturer: 'SpaceX',
    cycle: 'Full-flow staged combustion',
    propellant: 'LOX / LCH4',
    thrustVacuum: 2300,
    thrustSeaLevel: 1850,
    ispVacuum: 380,
    ispSeaLevel: 327,
    massFlow: 620,
    feedlineLength: 4.8,
    description:
      'Methalox full-flow staged combustion engine. Extremely high chamber pressure and dual preburner architecture create complex coupled oscillation modes. Highest resonance risk across the throttle band.',
  },
  rd180: {
    name: 'RD-180',
    manufacturer: 'NPO Energomash',
    cycle: 'Staged combustion (oxidizer-rich)',
    propellant: 'LOX / RP-1',
    thrustVacuum: 4150,
    thrustSeaLevel: 3830,
    ispVacuum: 338,
    ispSeaLevel: 311,
    massFlow: 1250,
    feedlineLength: 5.5,
    description:
      'Russian two-chamber staged combustion engine. Mature design with excellent damping characteristics. Lowest resonance risk, though the long feedline can excite low-frequency modes at high throttle.',
  },
};

export const ENGINES: Record<EngineId, EngineSpec> = {
  merlin: {
    id: 'merlin',
    ...ENGINE_PROFILES.merlin,
    ...ENGINE_PERF.merlin,
  },
  raptor: {
    id: 'raptor',
    ...ENGINE_PROFILES.raptor,
    ...ENGINE_PERF.raptor,
  },
  rd180: {
    id: 'rd180',
    ...ENGINE_PROFILES.rd180,
    ...ENGINE_PERF.rd180,
  },
};

export const ENGINE_LIST = Object.values(ENGINES);
