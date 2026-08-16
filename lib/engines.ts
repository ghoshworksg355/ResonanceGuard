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
  resonanceFrequency: number; // Hz (natural feedline resonance)
  dampingCoefficient: number; // dimensionless
  riskSensitivity: number; // 0-1, how sensitive this engine is to resonance
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
    description:
      'Russian two-chamber staged combustion engine. Mature design with excellent damping characteristics. Lowest resonance risk, though the long feedline can excite low-frequency modes at high throttle.',
  },
};

export const ENGINE_LIST = Object.values(ENGINES);
