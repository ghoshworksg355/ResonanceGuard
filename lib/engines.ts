export interface ResonanceBand {
  center: number; // throttle fraction (0-1) where this band peaks
  width: number; // half-width of the band
  severity: number; // 0-1, how strongly this band excites oscillations
  frequency: number; // Hz, dominant frequency content in this band
}

export interface EngineSpec {
  id: EngineId;
  name: string;
  manufacturer: string;
  cycle: string;
  propellant: string;
  thrustVacuum: number; // kN
  thrustSeaLevel: number; // kN
  ispVacuum: number; // seconds
  ispSeaLevel: number; // seconds
  chamberPressure: number; // MPa (nominal at 100% throttle)
  massFlow: number; // kg/s
  feedlineLength: number; // meters (simplified)
  resonanceFrequency: number; // Hz (primary natural feedline resonance)
  dampingCoefficient: number; // dimensionless (higher = more damping)
  riskSensitivity: number; // 0-1, how sensitive this engine is to resonance
  throttleSensitivity: number; // 0-1, how fast oscillations respond to throttle changes
  resonanceBands: ResonanceBand[]; // multiple resonance bands across the throttle range
  description: string;
}

export type EngineId = 'merlin' | 'raptor' | 'rd180';

export const ENGINES: Record<EngineId, EngineSpec> = {
  merlin: {
    id: 'merlin',
    name: 'Merlin 1D',
    manufacturer: 'SpaceX',
    cycle: 'Gas-generator (open)',
    propellant: 'LOX / RP-1',
    thrustVacuum: 981,
    thrustSeaLevel: 845,
    ispVacuum: 348,
    ispSeaLevel: 282,
    chamberPressure: 9.7,
    massFlow: 280,
    feedlineLength: 3.2,
    resonanceFrequency: 42,
    dampingCoefficient: 0.082,
    riskSensitivity: 0.45,
    throttleSensitivity: 0.55,
    resonanceBands: [
      { center: 0.62, width: 0.08, severity: 0.45, frequency: 38 },
      { center: 0.78, width: 0.06, severity: 0.65, frequency: 52 },
      { center: 0.95, width: 0.05, severity: 0.30, frequency: 60 },
    ],
    description:
      'High-performance kerosene engine. Gas-generator cycle introduces coupling between the turbine drive and main chamber, creating moderate feedline resonance risk at intermediate throttle settings.',
  },
  raptor: {
    id: 'raptor',
    name: 'Raptor 2',
    manufacturer: 'SpaceX',
    cycle: 'Full-flow staged combustion',
    propellant: 'LOX / LCH4',
    thrustVacuum: 2300,
    thrustSeaLevel: 1850,
    ispVacuum: 380,
    ispSeaLevel: 327,
    chamberPressure: 30,
    massFlow: 620,
    feedlineLength: 4.8,
    resonanceFrequency: 68,
    dampingCoefficient: 0.061,
    riskSensitivity: 0.72,
    throttleSensitivity: 0.82,
    resonanceBands: [
      { center: 0.55, width: 0.07, severity: 0.50, frequency: 55 },
      { center: 0.72, width: 0.10, severity: 0.85, frequency: 72 },
      { center: 0.88, width: 0.06, severity: 0.60, frequency: 85 },
    ],
    description:
      'Methalox full-flow staged combustion engine. Extremely high chamber pressure and dual preburner architecture create complex coupled oscillation modes. Highest resonance risk across the throttle band.',
  },
  rd180: {
    id: 'rd180',
    name: 'RD-180',
    manufacturer: 'NPO Energomash',
    cycle: 'Staged combustion (oxidizer-rich)',
    propellant: 'LOX / RP-1',
    thrustVacuum: 4150,
    thrustSeaLevel: 3830,
    ispVacuum: 338,
    ispSeaLevel: 311,
    chamberPressure: 26.7,
    massFlow: 1250,
    feedlineLength: 5.5,
    resonanceFrequency: 35,
    dampingCoefficient: 0.094,
    riskSensitivity: 0.38,
    throttleSensitivity: 0.40,
    resonanceBands: [
      { center: 0.70, width: 0.07, severity: 0.35, frequency: 32 },
      { center: 0.85, width: 0.06, severity: 0.55, frequency: 45 },
      { center: 0.98, width: 0.04, severity: 0.40, frequency: 50 },
    ],
    description:
      'Russian two-chamber staged combustion engine. Mature design with excellent damping characteristics. Lowest resonance risk, though the long feedline can excite low-frequency modes at high throttle.',
  },
};

export const ENGINE_LIST = Object.values(ENGINES);
