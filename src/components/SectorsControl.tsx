import React from 'react';
import { CognitiveSector } from '../types';
import { Sliders, Lock, Unlock, Eye, EyeOff } from 'lucide-react';

interface SectorsControlProps {
  sectors: CognitiveSector[];
  onUpdateOpacity: (id: string, opacity: number) => void;
  rigourLock: boolean;
  onToggleLock: () => void;
}

export const SectorsControl: React.FC<SectorsControlProps> = ({
  sectors,
  onUpdateOpacity,
  rigourLock,
  onToggleLock,
}) => {
  const handleSliderChange = (id: string, value: number) => {
    let finalVal = value;
    if (rigourLock && finalVal > 0.50) {
      finalVal = 0.50;
    }
    onUpdateOpacity(id, finalVal);
  };

  // Sector visual theme colors
  const labelColors: Record<string, string> = {
    physique: 'text-red-400 bg-red-950/20 border-red-900/40',
    philosophie: 'text-indigo-400 bg-indigo-950/20 border-indigo-900/40',
    technologie: 'text-blue-400 bg-blue-950/20 border-blue-900/40',
    biologie: 'text-emerald-400 bg-emerald-950/20 border-emerald-900/40',
    sciences_sociales: 'text-amber-400 bg-amber-950/20 border-amber-900/40',
    arts: 'text-pink-400 bg-pink-950/20 border-pink-900/40',
    metacognition: 'text-purple-400 bg-purple-950/20 border-purple-900/40',
  };

  const fillColors: Record<string, string> = {
    physique: 'accent-red-500 bg-red-900/30',
    philosophie: 'accent-indigo-500 bg-indigo-900/30',
    technologie: 'accent-blue-500 bg-blue-900/30',
    biologie: 'accent-emerald-500 bg-emerald-900/30',
    sciences_sociales: 'accent-amber-500 bg-amber-900/30',
    arts: 'accent-pink-500 bg-pink-900/30',
    metacognition: 'accent-purple-500 bg-purple-900/30',
  };

  return (
    <div id="sectors-control-widget" className="bg-neutral-950/90 border border-neutral-900 rounded-xl p-4 font-mono shadow-2xl flex flex-col gap-4 text-xs">
      <div className="flex justify-between items-center border-b border-neutral-900 pb-2.5">
        <div className="flex items-center gap-2 text-neutral-300">
          <Sliders size={15} className="text-pink-400" />
          <span className="font-bold tracking-wider uppercase text-xs">OPACITÉ DES SECTEURS COGNITIFS</span>
        </div>
        <span className="text-[10px] text-neutral-500 uppercase">table_secteurs_cognitifs</span>
      </div>

      {/* Rigour filter status block */}
      <div className="flex items-center justify-between bg-neutral-900/45 p-3 rounded border border-neutral-900">
        <div>
          <span className="text-[11px] font-bold text-neutral-200 uppercase flex items-center gap-1.5">
            {rigourLock ? <Lock size={12} className="text-amber-500 animate-pulse" /> : <Unlock size={12} className="text-emerald-450" />}
            Filtre de Rigueur : {rigourLock ? 'ACTIF (LIMITE 0.50)' : 'DÉSACTIVÉ (ACCÈS TOTAL)'}
          </span>
          <p className="text-[9px] text-neutral-500 leading-tight">
            Par défaut, le filtre de rigueur bloque la dissipation d'opacité à 0.50. Désactiver pour libérer la netteté maximale (1.00).
          </p>
        </div>
        <button
          onClick={onToggleLock}
          type="button"
          className={`p-1.5 rounded transition-all flex items-center justify-center cursor-pointer border ${
            rigourLock
              ? 'bg-amber-950/40 border-amber-900/60 text-amber-400 hover:bg-neutral-900'
              : 'bg-emerald-950/30 border-emerald-900/60 text-emerald-400 hover:bg-neutral-900'
          }`}
          title={rigourLock ? 'Déverrouiller la limite' : 'Verrouiller la limite à 0.50'}
        >
          {rigourLock ? <Unlock size={14} /> : <Lock size={14} />}
        </button>
      </div>

      {/* Equalizer layout */}
      <div className="grid grid-cols-7 gap-1 md:gap-2 pt-2 h-44 items-end">
        {sectors.map((sector) => {
          const labelColor = labelColors[sector.id] || 'text-neutral-400 bg-neutral-900';
          const fillCol = fillColors[sector.id] || 'accent-indigo-500';

          return (
            <div key={sector.id} className="flex flex-col items-center justify-end h-full relative group">
              {/* Opacity digital feedback top label */}
              <div className="absolute -top-6 text-[9px] font-semibold text-neutral-400 opacity-60 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {Math.round(sector.opacity * 100)}%
              </div>

              {/* Slider track container */}
              <div className="relative h-28 flex items-center justify-center p-1 w-full bg-neutral-950 border border-neutral-900 rounded-lg">
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.01"
                  value={sector.opacity}
                  onChange={(e) => handleSliderChange(sector.id, parseFloat(e.target.value))}
                  style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                  className={`w-4 h-full cursor-pointer rounded-md ${fillCol}`}
                />
                
                {/* Rigour Limit threshold visual marker (0.50 horizontal dashed line) */}
                {rigourLock && (
                  <div className="absolute top-1/2 left-0 right-0 border-t border-dashed border-amber-600/60 pointer-events-none z-10"></div>
                )}
              </div>

              {/* Vertical label & Sector symbol */}
              <div className={`mt-2.5 p-1 rounded-md text-[9px] md:text-[10px] text-center font-bold tracking-tighter w-full border ${labelColor}`}>
                <div className="truncate max-w-full" title={sector.name}>
                  {sector.codename}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-start gap-3 text-[9px] text-neutral-500 border-t border-neutral-900/60 pt-2.5">
        <span className="flex items-center gap-1">
          <Eye size={10} className="text-emerald-400" /> &gt; 0.50 : CLARIFICATION DES FLUX
        </span>
        <span className="flex items-center gap-1">
          <EyeOff size={10} className="text-amber-500" /> &lt; 0.50 : FLOU ET DISSIPATION SYSTÉMIQUE
        </span>
      </div>
    </div>
  );
};
