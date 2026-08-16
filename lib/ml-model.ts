import { ENGINES, EngineId } from './engines';

// Logistic-regression-style model for resonance probability.
// Weights derived from domain heuristics (throttle proximity to resonance band,
// engine sensitivity, engine count coupling). No external training required.

interface ModelFeatures {
  throttle: number; // 0.40 - 1.00
  engineId: EngineId;
  engineCount: number; // 1 - 9
}

interface ModelOutput {
  probability: number; // 0 - 1
  dominantFactor: string;
  rawLogit: number;
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

  // Feature 1: proximity to resonance band (0-1)
  const proximity = gaussianProximity(features.throttle, band.center, band.width);

  // Feature 2: engine count coupling — more engines = more coupled oscillation
  const countFactor = 1 - Math.exp(-0.35 * (features.engineCount - 1));

  // Feature 3: engine-specific sensitivity
  const sensitivity = engine.riskSensitivity;

  // Feature 4: throttle extremity penalty — very low throttle causes instability too
  const lowThrottlePenalty = features.throttle < 0.5 ? (0.5 - features.throttle) * 2 : 0;

  // Logistic regression with hand-tuned weights
  const w0 = -3.2; // bias
  const w1 = 4.8; // proximity
  const w2 = 1.6; // count coupling
  const w3 = 2.4; // sensitivity
  const w4 = 2.1; // low throttle penalty

  const logit =
    w0 +
    w1 * proximity +
    w2 * countFactor +
    w3 * sensitivity +
    w4 * lowThrottlePenalty;

  const probability = 1 / (1 + Math.exp(-logit));

  // Determine dominant factor for explainability
  const contributions = {
    'Resonance band proximity': w1 * proximity,
    'Engine count coupling': w2 * countFactor,
    'Engine sensitivity': w3 * sensitivity,
    'Low-throttle instability': w4 * lowThrottlePenalty,
  };

  const dominantFactor = Object.entries(contributions).reduce((a, b) =>
    a[1] > b[1] ? a : b
  )[0];

  return { probability, dominantFactor, rawLogit: logit };
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
