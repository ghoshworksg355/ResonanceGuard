'use client';

import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { riskColor } from '@/lib/ml-model';

interface Props {
  probability: number;
  level: 'Low' | 'Medium' | 'High';
}

export function RiskGauge({ probability, level }: Props) {
  const color = riskColor(level);
  const data = [{ name: 'risk', value: probability * 100, fill: color }];

  return (
    <div className="relative h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar
            background={{ fill: '#1e293b' }}
            dataKey="value"
            cornerRadius={10}
            isAnimationActive={false}
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-4xl font-bold tabular-nums"
          style={{ color }}
        >
          {(probability * 100).toFixed(0)}%
        </span>
        <span className="mt-1 text-sm font-medium text-slate-400">{level} Risk</span>
      </div>
    </div>
  );
}
