'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { ENGINES, EngineId } from '@/lib/engines';
import { predictResonance, riskLevel } from '@/lib/ml-model';

export interface SimulationSample {
  time: number; // seconds since start
  pressure: number; // chamber pressure MPa (with oscillation)
  basePressure: number; // nominal pressure
  oscillationAmplitude: number; // MPa
  throttle: number; // 0.4 - 1.0
  riskProbability: number; // 0 - 1
  riskLevel: 'Low' | 'Medium' | 'High';
}

const MAX_SAMPLES = 60; // keep last 60 samples (6s at 10Hz)
const TICK_MS = 100;

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
  const phaseRef = useRef<number>(0);
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

      // Nominal chamber pressure scales with throttle
      const basePressure = eng.chamberPressure * currentThrottle;

      // Risk prediction from ML model
      const { probability } = predictResonance({
        throttle: currentThrottle,
        engineId: engineIdRef.current,
        engineCount: engineCountRef.current,
      });
      const level = riskLevel(probability);

      // Oscillation amplitude grows with risk probability
      // Higher risk = larger amplitude relative to base pressure
      const amplitudeScale = 0.02 + probability * 0.12;
      const oscillationAmplitude = basePressure * amplitudeScale;

      // Generate oscillation: primary feedline frequency + harmonics + noise
      phaseRef.current += TICK_MS / 1000;
      const phase = phaseRef.current;
      const f = eng.resonanceFrequency;
      const primary = Math.sin(2 * Math.PI * f * phase * 0.1);
      const harmonic = 0.3 * Math.sin(2 * Math.PI * f * phase * 0.23);
      const noise = (Math.random() - 0.5) * 0.4;
      const oscillation = oscillationAmplitude * (primary + harmonic + noise);

      const pressure = basePressure + oscillation;

      const sample: SimulationSample = {
        time: now,
        pressure,
        basePressure,
        oscillationAmplitude,
        throttle: currentThrottle,
        riskProbability: probability,
        riskLevel: level,
      };

      setSamples((prev) => {
        const next = [...prev, sample];
        if (next.length > MAX_SAMPLES) next.shift();
        return next;
      });

      // Autonomous mode: smoothly move throttle toward target
      if (autonomousRef.current && autonomousTargetRef.current !== null) {
        const target = autonomousTargetRef.current;
        const current = throttleRef.current;
        const diff = target - current;
        if (Math.abs(diff) > 0.005) {
          const step = Math.sign(diff) * Math.min(Math.abs(diff), 0.01);
          const newThrottle = Math.max(0.4, Math.min(1.0, current + step));
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
