import { ENGINES, EngineId } from './engines';

// Logistic-regression-style model for resonance probability.
// Now accepts oscillationAmplitude as a feature, creating a feedback loop
// with the physics simulation. No external training required.

export interface ModelFeatures {
  throttle: number; // 0.40 - 1.00
  engineId: EngineId;
  engineCount: number; // 1 - 9
  oscillationAmplitude?: number; // MPa, from the live simulation (default 0)
}

export interface ModelOutput {
  probability: number; // 0 - 1
  dominantFactor: string;
  rawLogit: number;
  contributions: Record<string, number>;
}

// Each engine has a throttle band where feedline resonance is most likely.
// This is a simplified "resonance window" centered around a problematic throttle.
const RESONANCE_BANDS: Record<EngineId, { center: number; width: number }> = {
  merlin: { center: 0.68, width: 0.14 },
  raptor: { center: 0.74, width: 0.18 },
  rd180: { center: 0.82, width: 0.10 },
};

function gaussianProximity(throttle: number, center: number, width: number): number {
  const z = (throttle - center) / width;
  return Math.exp(-0.5 * z * z);
}

export function predictResonance(features: ModelFeatures): ModelOutput {
  const engine = ENGINES[features.engineId];
  const band = RESONANCE_BANDS[features.engineId];
  const amplitude = features.oscillationAmplitude ?? 0;

  // Feature 1: proximity to resonance band (0-1)
  const proximity = gaussianProximity(features.throttle, band.center, band.width);

  // Feature 2: engine count coupling — more engines = more coupled oscillation
  const countFactor = 1 - Math.exp(-0.35 * (features.engineCount - 1));

  // Feature 3: engine-specific sensitivity
  const sensitivity = engine.riskSensitivity;

  // Feature 4: throttle extremity penalty — very low throttle causes instability too
  const lowThrottlePenalty = features.throttle < 0.5 ? (0.5 - features.throttle) * 2 : 0;

  // Feature 5: live oscillation amplitude — normalized against chamber pressure
  // This creates the feedback loop: high amplitude → higher predicted risk → more amplitude
  const amplitudeNormalized = Math.min(1, amplitude / (engine.chamberPressure * 0.15));

  // Logistic regression with hand-tuned weights
  const w0 = -3.4; // bias
  const w1 = 4.5; // proximity
  const w2 = 1.6; // count coupling
  const w3 = 2.4; // sensitivity
  const w4 = 2.1; // low throttle penalty
  const w5 = 3.2; // live oscillation amplitude (feedback)

  const contributions = {
    'Resonance band proximity': w1 * proximity,
    'Engine count coupling': w2 * countFactor,
    'Engine sensitivity': w3 * sensitivity,
    'Low-throttle instability': w4 * lowThrottlePenalty,
    'Oscillation amplitude': w5 * amplitudeNormalized,
  };

  const logit =
    w0 +
    w1 * proximity +
    w2 * countFactor +
    w3 * sensitivity +
    w4 * lowThrottlePenalty +
    w5 * amplitudeNormalized;

  const probability = 1 / (1 + Math.exp(-logit));

  const dominantFactor = Object.entries(contributions).reduce((a, b) =>
    a[1] > b[1] ? a : b
  )[0];

  return { probability, dominantFactor, rawLogit: logit, contributions };
}

export function riskLevel(probability: number): 'Low' | 'Medium' | 'High' {
  if (probability < 0.35) return 'Low';
  if (probability < 0.65) return 'Medium';
  return 'High';
}

export function riskColor(level: 'Low' | 'Medium' | 'High'): string {
  switch (level) {
    case 'Low':
      return '#22c55e';
    case 'Medium':
      return '#f59e0b';
    case 'High':
      return '#ef4444';
  }
}

// Autonomous advisor: suggests a throttle setting that minimizes resonance risk
export function suggestOptimalThrottle(
  engineId: EngineId,
  engineCount: number
): number {
  let bestThrottle = 1.0;
  let bestProb = 1.0;

  for (let t = 0.4; t <= 1.001; t += 0.01) {
    const { probability } = predictResonance({
      throttle: t,
      engineId,
      engineCount,
    });
    if (probability < bestProb) {
      bestProb = probability;
      bestThrottle = t;
    }
  }

  return Math.round(Math.max(0.4, Math.min(1.0, bestThrottle)) * 100) / 100;
}

// Autonomous advisor: returns the recommended throttle adjustment direction and magnitude
// based on the current state. Used by the simulation for smooth autonomous control.
export function recommendedThrottleAdjustment(
  currentThrottle: number,
  engineId: EngineId,
  engineCount: number,
  oscillationAmplitude: number
): { target: number; direction: 'up' | 'down' | 'hold'; magnitude: number } {
  const optimal = suggestOptimalThrottle(engineId, engineCount);
  const diff = optimal - currentThrottle;
  const magnitude = Math.abs(diff);

  if (magnitude < 0.01) {
    return { target: optimal, direction: 'hold', magnitude: 0 };
  }

  // If oscillation amplitude is high, move faster
  const amplitudeBoost = Math.min(1, oscillationAmplitude / (ENGINES[engineId].chamberPressure * 0.1));
  const adjustedMagnitude = Math.min(0.02 + amplitudeBoost * 0.03, magnitude);

  return {
    target: optimal,
    direction: diff > 0 ? 'up' : 'down',
    magnitude: adjustedMagnitude,
  };
}
