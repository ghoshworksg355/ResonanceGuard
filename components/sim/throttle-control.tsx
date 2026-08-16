'use client';

import { Slider } from '@/components/ui/slider';
import { Lock } from 'lucide-react';

interface Props {
  throttle: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  locked?: boolean;
}

export function ThrottleControl({ throttle, onChange, disabled, locked }: Props) {
  const pct = Math.round(throttle * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">Throttle Setting</span>
        <div className="flex items-center gap-2">
          {locked && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <Lock className="h-3 w-3" />
              Autonomous
            </span>
          )}
          <span className="font-mono text-2xl font-bold text-cyan-400 tabular-nums">
            {pct}%
          </span>
        </div>
      </div>
      <Slider
        value={[throttle * 100]}
        min={40}
        max={100}
        step={1}
        disabled={disabled || locked}
        onValueChange={(vals) => onChange(vals[0] / 100)}
        className="py-2"
      />
      <div className="flex justify-between text-xs text-slate-500">
        <span>40%</span>
        <span>70%</span>
        <span>100%</span>
      </div>
    </div>
  );
}
