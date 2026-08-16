'use client';

import { useMemo } from 'react';
import { useResonanceSimulation } from '@/hooks/use-resonance-simulation';
import { ENGINES } from '@/lib/engines';
import { predictResonance, riskLevel, riskColor, suggestOptimalThrottle } from '@/lib/ml-model';
import { EngineSelector } from '@/components/sim/engine-selector';
import { ThrottleControl } from '@/components/sim/throttle-control';
import { PressureChart } from '@/components/sim/pressure-chart';
import { RiskGauge } from '@/components/sim/risk-gauge';
import { ThrottleHistoryChart } from '@/components/sim/throttle-history-chart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Rocket,
  Activity,
  Gauge,
  Bot,
  Play,
  Pause,
  RotateCcw,
  Cpu,
  Zap,
  TrendingDown,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Home() {
  const sim = useResonanceSimulation();
  const engine = ENGINES[sim.engineId];
  const lastSample = sim.samples[sim.samples.length - 1];
  const probability = lastSample?.riskProbability ?? 0;
  const level = lastSample?.riskLevel ?? 'Low';
  const color = riskColor(level);

  const prediction = useMemo(
    () =>
      predictResonance({
        throttle: sim.throttle,
        engineId: sim.engineId,
        engineCount: sim.engineCount,
      }),
    [sim.throttle, sim.engineId, sim.engineCount]
  );

  const optimalThrottle = useMemo(
    () => suggestOptimalThrottle(sim.engineId, sim.engineCount),
    [sim.engineId, sim.engineCount]
  );

  const riskGlowClass = {
    Low: 'glow-green',
    Medium: 'glow-amber',
    High: 'glow-red',
  }[level];

  const handleAutonomous = () => {
    if (sim.autonomous) {
      sim.disableAutonomous();
    } else {
      sim.enableAutonomous(optimalThrottle);
    }
  };

  if (sim.loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <div className="relative">
          <Rocket className="h-16 w-16 text-cyan-500 animate-pulse" />
        </div>
        <div className="text-lg font-medium text-slate-400">
          Initializing ResonanceGuard...
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-cyan-500"
              style={{ animation: `pulse-ring 1.5s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/60 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 ring-1 ring-cyan-500/30">
              <Rocket className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-100">
                ResonanceGuard
              </h1>
              <p className="text-xs text-slate-500">
                Real-time Engine Resonance Simulator
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="border-slate-700 bg-slate-900/50 text-slate-400"
            >
              <Cpu className="mr-1.5 h-3 w-3" />
              ML Predictor Active
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => sim.setRunning(!sim.running)}
              className="border border-slate-700 hover:bg-slate-800"
            >
              {sim.running ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        {/* Engine Selection */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Rocket className="h-4 w-4 text-cyan-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
              Engine Configuration
            </h2>
          </div>
          <EngineSelector
            selected={sim.engineId}
            onSelect={(id) => {
              sim.setEngineId(id);
              sim.disableAutonomous();
            }}
            disabled={sim.autonomous}
          />
        </section>

        {/* Engine count + throttle control */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Engine count */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Zap className="h-4 w-4 text-cyan-400" />
                Engine Count
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 text-center">
                <span className="font-mono text-4xl font-bold text-cyan-400">
                  {sim.engineCount}
                </span>
                <span className="ml-1 text-sm text-slate-500">engines</span>
              </div>
              <Slider
                value={[sim.engineCount]}
                min={1}
                max={9}
                step={1}
                disabled={sim.autonomous}
                onValueChange={(v) => sim.setEngineCount(v[0])}
              />
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>1</span>
                <span>5</span>
                <span>9</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-md bg-slate-800/50 p-2 text-center">
                  <div className="text-slate-500">Total Thrust</div>
                  <div className="mt-0.5 font-mono text-slate-200">
                    {(engine.thrustSeaLevel * sim.engineCount).toLocaleString()} kN
                  </div>
                </div>
                <div className="rounded-md bg-slate-800/50 p-2 text-center">
                  <div className="text-slate-500">Mass Flow</div>
                  <div className="mt-0.5 font-mono text-slate-200">
                    {(engine.massFlow * sim.engineCount).toLocaleString()} kg/s
                  </div>
                </div>
                <div className="rounded-md bg-slate-800/50 p-2 text-center">
                  <div className="text-slate-500">Feedline F</div>
                  <div className="mt-0.5 font-mono text-slate-200">
                    {engine.resonanceFrequency} Hz
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Throttle control */}
          <Card className="border-slate-800 bg-slate-900/40 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Gauge className="h-4 w-4 text-cyan-400" />
                Throttle Control
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThrottleControl
                throttle={sim.throttle}
                onChange={sim.setThrottle}
                locked={sim.autonomous}
              />
              <div className="mt-5 flex items-center gap-3">
                <Button
                  onClick={handleAutonomous}
                  className={cn(
                    'flex-1 transition-all',
                    sim.autonomous
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 glow-amber'
                      : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400 glow-cyan'
                  )}
                >
                  <Bot className="mr-2 h-4 w-4" />
                  {sim.autonomous ? 'Disable Autonomous Mode' : 'Enable Autonomous Mode'}
                </Button>
                {sim.autonomous && (
                  <Button
                    variant="outline"
                    onClick={() => sim.disableAutonomous()}
                    className="border-slate-700 hover:bg-slate-800"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {sim.autonomous && sim.autonomousTarget !== null && (
                <div className="mt-3 flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  <Bot className="h-3.5 w-3.5" />
                  Adjusting throttle toward optimal target:{' '}
                  <span className="font-mono font-bold">
                    {Math.round(sim.autonomousTarget * 100)}%
                  </span>
                  <span className="ml-auto text-amber-400/70">
                    Current: {Math.round(sim.throttle * 100)}%
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Pressure chart */}
          <Card className="border-slate-800 bg-slate-900/40 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-slate-300">
                <span className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-cyan-400" />
                  Chamber Pressure Oscillation
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {lastSample ? `${lastSample.pressure.toFixed(2)} MPa` : '—'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PressureChart
                samples={sim.samples}
                chamberPressure={engine.chamberPressure * sim.throttle}
              />
            </CardContent>
          </Card>

          {/* Risk gauge */}
          <Card className={cn('border-slate-800 bg-slate-900/40 transition-all', riskGlowClass)}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <ShieldCheck className="h-4 w-4" style={{ color }} />
                Resonance Risk
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RiskGauge probability={probability} level={level} />
              <div className="mt-2 text-center text-xs text-slate-500">
                {prediction.dominantFactor}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Throttle history + ML insights */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="border-slate-800 bg-slate-900/40 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <TrendingDown className="h-4 w-4 text-violet-400" />
                Throttle History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ThrottleHistoryChart samples={sim.samples} />
            </CardContent>
          </Card>

          {/* ML Advisor panel */}
          <Card className="border-slate-800 bg-slate-900/40">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-slate-300">
                <Cpu className="h-4 w-4 text-cyan-400" />
                ML Advisor
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-slate-800/40 p-3">
                <div className="text-xs text-slate-500">Optimal Throttle</div>
                <div className="mt-1 font-mono text-2xl font-bold text-green-400">
                  {Math.round(optimalThrottle * 100)}%
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Minimizes resonance probability for this configuration
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-400">
                  Risk Factor Breakdown
                </div>
                {[
                  { label: 'Resonance band proximity', value: predictResonance({ throttle: sim.throttle, engineId: sim.engineId, engineCount: sim.engineCount }).rawLogit },
                ].map((factor) => {
                  const pct = Math.max(0, Math.min(100, (factor.value + 5) * 10));
                  return (
                    <div key={factor.label}>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">{factor.label}</span>
                        <span className="font-mono text-slate-400">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className="h-full rounded-full bg-cyan-500 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-400">
                {engine.description}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status bar */}
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-800 bg-slate-900/40 px-4 py-3">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
            />
            <span className="text-sm font-medium" style={{ color }}>
              {level} Risk
            </span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="text-sm text-slate-400">
            Engine: <span className="font-mono text-slate-300">{engine.name}</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="text-sm text-slate-400">
            Count: <span className="font-mono text-slate-300">{sim.engineCount}</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="text-sm text-slate-400">
            Throttle: <span className="font-mono text-slate-300">{Math.round(sim.throttle * 100)}%</span>
          </div>
          <div className="h-4 w-px bg-slate-700" />
          <div className="text-sm text-slate-400">
            Mode:{' '}
            <span className={sim.autonomous ? 'font-mono text-amber-400' : 'font-mono text-slate-300'}>
              {sim.autonomous ? 'Autonomous' : 'Manual'}
            </span>
          </div>
          <div className="ml-auto text-xs text-slate-600">
            {sim.samples.length > 0
              ? `Sampling at 10 Hz · ${sim.samples.length} data points`
              : 'Awaiting data...'}
          </div>
        </div>
      </main>
    </div>
  );
}
