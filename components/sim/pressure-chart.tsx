'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { SimulationSample } from '@/hooks/use-resonance-simulation';

interface Props {
  samples: SimulationSample[];
  chamberPressure: number;
}

export function PressureChart({ samples, chamberPressure }: Props) {
  const data = samples.map((s) => ({
    time: s.time.toFixed(1),
    pressure: Number(s.pressure.toFixed(3)),
    base: Number(s.basePressure.toFixed(3)),
  }));

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
          <defs>
            <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="time"
            stroke="#475569"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#1e293b' }}
          />
          <YAxis
            stroke="#475569"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#1e293b' }}
            domain={[0, (chamberPressure || 30) * 1.3]}
            tickFormatter={(v) => `${v} MPa`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelStyle={{ color: '#94a3b8' }}
            formatter={(value: number) => [`${value.toFixed(2)} MPa`, '']}
          />
          <ReferenceLine
            y={chamberPressure}
            stroke="#64748b"
            strokeDasharray="4 4"
            label={{ value: 'Nominal', fill: '#64748b', fontSize: 10, position: 'right' }}
          />
          <Area
            type="monotone"
            dataKey="pressure"
            stroke="#06b6d4"
            strokeWidth={2}
            fill="url(#pressureGrad)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
