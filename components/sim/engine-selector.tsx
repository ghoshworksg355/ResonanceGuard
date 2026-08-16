'use client';

import { ENGINE_LIST, ENGINES, EngineId } from '@/lib/engines';
import { cn } from '@/lib/utils';

interface Props {
  selected: EngineId;
  onSelect: (id: EngineId) => void;
  disabled?: boolean;
}

export function EngineSelector({ selected, onSelect, disabled }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {ENGINE_LIST.map((engine) => {
        const isActive = selected === engine.id;
        return (
          <button
            key={engine.id}
            disabled={disabled}
            onClick={() => onSelect(engine.id)}
            className={cn(
              'rounded-lg border p-4 text-left transition-all duration-200',
              'hover:border-cyan-500/50 hover:bg-slate-800/40',
              isActive
                ? 'border-cyan-500 bg-slate-800/60 ring-1 ring-cyan-500/30'
                : 'border-slate-700 bg-slate-900/40',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-100">
                {engine.name}
              </span>
              {isActive && (
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
              )}
            </div>
            <div className="mt-1 text-xs text-slate-500">{engine.manufacturer}</div>
            <div className="mt-3 space-y-1 text-xs text-slate-400">
              <div className="flex justify-between">
                <span>Chamber P</span>
                <span className="font-mono text-slate-300">{engine.chamberPressure} MPa</span>
              </div>
              <div className="flex justify-between">
                <span>Thrust (SL)</span>
                <span className="font-mono text-slate-300">{engine.thrustSeaLevel} kN</span>
              </div>
              <div className="flex justify-between">
                <span>Isp (SL)</span>
                <span className="font-mono text-slate-300">{engine.ispSeaLevel} s</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
