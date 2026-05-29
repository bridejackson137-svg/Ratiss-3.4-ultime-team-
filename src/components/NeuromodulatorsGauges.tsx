import React from 'react';
import { Neuromodulator } from '../types';
import { Flame, Compass, Eye, ShieldAlert } from 'lucide-react';

interface NeuromodulatorsGaugesProps {
  neuromodulators: Neuromodulator[];
  onUpdateValue: (id: string, value: number) => void;
}

export const NeuromodulatorsGauges: React.FC<NeuromodulatorsGaugesProps> = ({
  neuromodulators,
  onUpdateValue,
}) => {
  // Map icons to the 4 neuromodulators
  const getIcon = (id: string) => {
    switch (id) {
      case 'dopamine': return <Flame size={14} className="text-red-400" />;
      case 'serotonin': return <Compass size={14} className="text-blue-400" />;
      case 'noradrenaline': return <ShieldAlert size={14} className="text-emerald-400" />;
      case 'acetylcholine': return <Eye size={14} className="text-yellow-400" />;
      default: return null;
    }
  };

  const getBioluminescentStyles = (id: string, val: number) => {
    const intensity = Math.round(val * 100);
    switch (id) {
      case 'dopamine':
        return {
          barColor: 'bg-red-500',
          shadow: `0 0 16px rgba(239, 68, 68, ${val * 0.95})`,
          textColor: 'text-red-400 border-red-950 bg-red-950/20',
          trackColor: 'border-red-900/30',
        };
      case 'serotonin':
        return {
          barColor: 'bg-blue-500',
          shadow: `0 0 16px rgba(59, 130, 246, ${val * 0.95})`,
          textColor: 'text-blue-400 border-blue-950 bg-blue-950/20',
          trackColor: 'border-blue-900/30',
        };
      case 'noradrenaline':
        return {
          barColor: 'bg-emerald-500',
          shadow: `0 0 16px rgba(16, 185, 129, ${val * 0.95})`,
          textColor: 'text-emerald-400 border-emerald-950 bg-emerald-950/20',
          trackColor: 'border-emerald-900/30',
        };
      case 'acetylcholine':
        return {
          barColor: 'bg-yellow-500',
          shadow: `0 0 16px rgba(234, 179, 8, ${val * 0.95})`,
          textColor: 'text-yellow-400 border-yellow-950 bg-yellow-950/20',
          trackColor: 'border-yellow-900/30',
        };
      default:
        return {
          barColor: 'bg-neutral-500',
          shadow: 'none',
          textColor: 'text-neutral-400 border-neutral-900',
          trackColor: 'border-neutral-900',
        };
    }
  };

  return (
    <div className="bg-neutral-950/90 border border-neutral-900 rounded-xl p-4 font-mono shadow-2xl flex flex-col gap-4 text-xs">
      <div className="flex justify-between items-center border-b border-neutral-900 pb-2.5">
        <div className="flex items-center gap-2 text-neutral-300">
          <Flame size={15} className="text-amber-500 animate-pulse" />
          <span className="font-bold tracking-wider uppercase text-xs">JAUGES NEUROMODULATOIRES</span>
        </div>
        <span className="text-[10px] text-neutral-500 uppercase">table_neuromodulation</span>
      </div>

      <p className="text-[9px] text-neutral-500 leading-tight">
        Ajustez la concentration bio-luminescente pour moduler en temps réel les filtres mathématiques 768-D de RATISS.
      </p>

      {/* Grid of 4 vertical bar gauges */}
      <div className="grid grid-cols-4 gap-3 pt-1">
        {neuromodulators.map((neuro) => {
          const styles = getBioluminescentStyles(neuro.id, neuro.value);
          const percent = Math.round(neuro.value * 100);

          return (
            <div key={neuro.id} className="flex flex-col items-center gap-2 group">
              {/* Digital percentage top label */}
              <span className={`text-[10px] font-bold ${styles.textColor.split(' ')[0]}`}>
                {percent}%
              </span>

              {/* Vertical slider wrapper */}
              <div className={`relative w-9 h-36 bg-neutral-950 border ${styles.trackColor} rounded-xl p-1.5 flex items-end justify-center transition-all overflow-hidden`}>
                {/* Visual glow overlay backbar */}
                <div
                  style={{
                    height: `${percent}%`,
                    boxShadow: styles.shadow,
                  }}
                  className={`w-full ${styles.barColor} rounded-lg opacity-85 transition-all duration-150 absolute bottom-1.5 left-1.5 right-1.5 max-w-[calc(100%-12px)] pointer-events-none`}
                ></div>

                {/* Input slider layered above track */}
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.01"
                  value={neuro.value}
                  onChange={(e) => onUpdateValue(neuro.id, parseFloat(e.target.value))}
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                />
              </div>

              {/* Icon indicator & labels */}
              <div className="flex flex-col items-center">
                <span className="p-1 rounded bg-neutral-900/40 border border-neutral-900/70 mb-1">
                  {getIcon(neuro.id)}
                </span>
                <span className="text-[9px] font-bold tracking-tighter uppercase text-neutral-300">
                  {neuro.name.substring(0, 5)}
                </span>
                <span className="text-[7px] text-neutral-500 font-mono scale-90">
                  {neuro.id === 'dopamine' && 'CHAOS'}
                  {neuro.id === 'serotonin' && 'NEUTRE'}
                  {neuro.id === 'noradrenaline' && 'VIGIL'}
                  {neuro.id === 'acetylcholine' && 'ATTENT'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
