'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ENGINES, EngineId } from '@/lib/engines';
import {
  predictResonance,
  riskLevel,
  suggestOptimalThrottle,
  recommendedThrottleAdjustment,
} from '@/lib/ml-model';

export interface SimulationSample {
  time: number; // seconds since start
  pressure: number; // chamber pressure MPa (with oscillation)
  basePressure: number; // nominal pressure
  oscillationAmplitude: number; // MPa
  dominantFrequency: number; // Hz
  throttle: number; // 0.4 - 1.0
  throttleRate: number; // |dThrottle/dt| per second
  riskProbability: number; // 0 - 1
  riskLevel: 'Low' | 'Medium' | 'High';
}

const MAX_SAMPLES = 80; // keep last 80 samples (8s at 10Hz)
const TICK_MS = 100;
const TICK_S = TICK_MS / 1000;

// Internal physics state — persists across ticks via refs
interface PhysicsState {
  amplitude: number; // current oscillation amplitude in MPa
  phase: number; // accumulated phase for oscillation synthesis
  prevThrottle: number; // for computing throttle rate
  prevThrottleTime: number; // timestamp of previous throttle reading
  couplingPhase: number; // phase offset for multi-engine coupling
  transientBoost: number; // decaying excitation from fast throttle moves
}

export function useResonanceSimulation() {
  const [engineId, setEngineId] = useState<EngineId>('raptor');
  const [engineCount, setEngineCount] = useState(3);
  const [throttle, setThrottle] = useState(0.85);
  const [autonomous, setAutonomous] = useState(false);
  const [autonomousTarget, setAutonomousTarget] = useState<number | null>(null);
  const [samples, setSamples] = useState<SimulationSample[]>([]);
  const [running, setRunning] = useState(true);
  const [loading, setLoading] = useState(true);

  const startTimeRef = useRef<number>(Date.now());
  const physicsRef = useRef<PhysicsState>({
    amplitude: 0,
    phase: 0,
    prevThrottle: 0.85,
    prevThrottleTime: 0,
    couplingPhase: 0,
    transientBoost: 0,
  });
  const throttleRef = useRef<number>(throttle);
  const autonomousRef = useRef<boolean>(autonomous);
  const autonomousTargetRef = useRef<number | null>(autonomousTarget);
  const engineIdRef = useRef<EngineId>(engineId);
  const engineCountRef = useRef<number>(engineCount);

  // Keep refs in sync
  useEffect(() => {
    throttleRef.current = throttle;
  }, [throttle]);
  useEffect(() => {
    autonomousRef.current = autonomous;
  }, [autonomous]);
  useEffect(() => {
    autonomousTargetRef.current = autonomousTarget;
  }, [autonomousTarget]);
  useEffect(() => {
    engineIdRef.current = engineId;
  }, [engineId]);
  useEffect(() => {
    engineCountRef.current = engineCount;
  }, [engineCount]);

  // Initial loading
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(t);
  }, []);

  // Main simulation loop
  useEffect(() => {
    const interval = setInterval(() => {
      if (!running) return;

      const now = (Date.now() - startTimeRef.current) / 1000;
      const eng = ENGINES[engineIdRef.current];
      const currentThrottle = throttleRef.current;
      const phys = physicsRef.current;

      // --- Throttle rate of change ---
      const dt = Math.max(TICK_S, now - phys.prevThrottleTime);
      const throttleDelta = currentThrottle - phys.prevThrottle;
      const throttleRate = Math.abs(throttleDelta) / dt;
      phys.prevThrottle = currentThrottle;
      phys.prevThrottleTime = now;

      // Fast throttle moves excite transient oscillations
      // Sensitivity depends on engine type
      const transientExcitation = throttleRate * eng.throttleSensitivity * 0.8;
      phys.transientBoost = phys.transientBoost * 0.88 + transientExcitation;
      phys.transientBoost = Math.min(phys.transientBoost, 2.0);

      // --- Base chamber pressure ---
      // Slightly nonlinear: lower throttle is less efficient
      const throttleEfficiency = 0.85 + 0.15 * currentThrottle;
      const basePressure = eng.chamberPressure * currentThrottle * throttleEfficiency;

      // --- Resonance band excitation ---
      // Sum contributions from all resonance bands for this engine
      let bandExcitation = 0;
      let dominantFreq = eng.resonanceFrequency;

      for (const band of eng.resonanceBands) {
        const z = (currentThrottle - band.center) / band.width;
        const proximity = Math.exp(-0.5 * z * z);
        const contribution = proximity * band.severity;
        bandExcitation += contribution;
        if (contribution > bandExcitation - contribution * 0.01) {
          dominantFreq = band.frequency;
        }
      }

      // Pick the dominant frequency as the band with highest contribution
      let maxContribution = 0;
      for (const band of eng.resonanceBands) {
        const z = (currentThrottle - band.center) / band.width;
        const proximity = Math.exp(-0.5 * z * z);
        const contribution = proximity * band.severity;
        if (contribution > maxContribution) {
          maxContribution = contribution;
          dominantFreq = band.frequency;
        }
      }

      // --- Multi-engine coupling ---
      // More engines → shared feedline coupling amplifies oscillations
      // The coupling factor grows nonlinearly with engine count
      const couplingFactor = 1 + 0.15 * (engineCountRef.current - 1) * (1 - Math.exp(-0.4 * (engineCountRef.current - 1)));

      // --- Damped oscillator model ---
      // The amplitude follows a damped driven oscillator:
      //   dA/dt = excitation - damping * A
      // Where excitation comes from resonance bands + transients
      // and damping comes from the engine's inherent damping coefficient.
      //
      // We add inertia by limiting how fast amplitude can change per tick.

      const excitation =
        bandExcitation * basePressure * 0.04 * couplingFactor +
        phys.transientBoost * basePressure * 0.03;

      const damping = eng.dampingCoefficient + 0.02; // base damping floor
      const targetAmplitude = excitation / damping;

      // Inertia: amplitude moves toward target at a rate limited by damping
      // This prevents instant jumps — amplitude has "mass"
      const amplitudeChangeRate = damping * 2.5; // how fast amplitude responds
      const amplitudeDiff = targetAmplitude - phys.amplitude;
      const maxChange = amplitudeChangeRate * basePressure * 0.015 * TICK_S;
      const clampedDiff = Math.max(-maxChange, Math.min(maxChange, amplitudeDiff));
      phys.amplitude = Math.max(0, phys.amplitude + clampedDiff);

      // Add a small floor of noise so the trace is never perfectly flat
      const noiseFloor = basePressure * 0.002;
      const effectiveAmplitude = phys.amplitude + noiseFloor;

      // --- Synthesize pressure waveform ---
      // Primary frequency + harmonic + coupling beat + noise
      phys.phase += TICK_S;
      phys.couplingPhase += TICK_S * (1 + 0.1 * (engineCountRef.current - 1));

      const omega1 = 2 * Math.PI * dominantFreq;
      const omega2 = 2 * Math.PI * dominantFreq * 1.7; // harmonic
      const omegaCoupling = 2 * Math.PI * (dominantFreq * 0.3); // low-freq beat from multi-engine

      const primary = Math.sin(omega1 * phys.phase);
      const harmonic = 0.25 * Math.sin(omega2 * phys.phase + 0.7);
      const couplingBeat =
        engineCountRef.current > 1
          ? 0.2 * Math.sin(omegaCoupling * phys.couplingPhase)
          : 0;
      const noise = (Math.random() - 0.5) * 0.3;

      const waveform = primary + harmonic + couplingBeat + noise;
      const oscillation = effectiveAmplitude * waveform;
      const pressure = basePressure + oscillation;

      // --- Feed amplitude into ML predictor (feedback loop) ---
      const { probability } = predictResonance({
        throttle: currentThrottle,
        engineId: engineIdRef.current,
        engineCount: engineCountRef.current,
        oscillationAmplitude: phys.amplitude,
      });
      const level = riskLevel(probability);

      const sample: SimulationSample = {
        time: now,
        pressure,
        basePressure,
        oscillationAmplitude: phys.amplitude,
        dominantFrequency: dominantFreq,
        throttle: currentThrottle,
        throttleRate,
        riskProbability: probability,
        riskLevel: level,
      };

      setSamples((prev) => {
        const next = [...prev, sample];
        if (next.length > MAX_SAMPLES) next.shift();
        return next;
      });

      // --- Autonomous mode: apply recommended throttle adjustment smoothly ---
      if (autonomousRef.current) {
        const adjustment = recommendedThrottleAdjustment(
          currentThrottle,
          engineIdRef.current,
          engineCountRef.current,
          phys.amplitude
        );

        if (adjustment.direction !== 'hold') {
          const step = Math.sign(adjustment.target - currentThrottle) * Math.min(
            adjustment.magnitude,
            Math.abs(adjustment.target - currentThrottle)
          );
          const newThrottle = Math.max(0.4, Math.min(1.0, currentThrottle + step));
          throttleRef.current = newThrottle;
          setThrottle(newThrottle);
        }
      }
    }, TICK_MS);

    return () => clearInterval(interval);
  }, [running]);

  const enableAutonomous = useCallback((target: number) => {
    setAutonomousTarget(target);
    setAutonomous(true);
  }, []);

  const disableAutonomous = useCallback(() => {
    setAutonomous(false);
    setAutonomousTarget(null);
  }, []);

  return {
    engineId,
    setEngineId,
    engineCount,
    setEngineCount,
    throttle,
    setThrottle: (t: number) => {
      if (autonomous) return; // locked during autonomous mode
      setThrottle(t);
    },
    autonomous,
    autonomousTarget,
    enableAutonomous,
    disableAutonomous,
    samples,
    running,
    setRunning,
    loading,
  };
}
