import React, { useState } from 'react';
import { SimulatedWorld } from '../types';
import { Globe, RefreshCw, Zap, Flame, Lock, Unlock } from 'lucide-react';

interface SimulatedWorldsProps {
  worlds: SimulatedWorld[];
  activeWorldId: string;
  onSelectWorld: (id: string) => void;
  onUpdateWorldConstants: (worldId: string, constants: Partial<SimulatedWorld>) => void;
}

export const SimulatedWorlds: React.FC<SimulatedWorldsProps> = ({
  worlds,
  activeWorldId,
  onSelectWorld,
  onUpdateWorldConstants,
}) => {
  const [isLocked, setIsLocked] = useState(true);
  const activeWorld = worlds.find(w => w.id === activeWorldId) || worlds[0];

  const handleSliderChange = (key: 'gravity' | 'speed' | 'chaos', val: number) => {
    if (isLocked) return;
    onUpdateWorldConstants(activeWorldId, { [key]: val });
  };

  return (
    <div className="bg-neutral-950/90 border border-neutral-900 rounded-xl p-4 font-mono shadow-2xl flex flex-col gap-4 text-xs">
      <div className="flex justify-between items-center border-b border-neutral-900 pb-2.5">
        <div className="flex items-center gap-2 text-neutral-300">
          <Globe size={15} className="text-indigo-400" />
          <span className="font-bold tracking-wider uppercase text-xs">SÉLECTEUR DE MONDES SIMULÉS</span>
        </div>
        <span className="text-[10px] text-neutral-500 uppercase">table_mondes</span>
      </div>

      {/* Grid of worlds */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {worlds.map((world) => {
          const isActive = world.id === activeWorldId;
          return (
            <button
              key={world.id}
              onClick={() => onSelectWorld(world.id)}
              className={`p-2 rounded border text-left text-[11px] transition-all cursor-pointer ${
                isActive
                  ? 'bg-indigo-950/40 border-indigo-500/80 text-white shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                  : 'bg-neutral-900/40 border-neutral-900 text-neutral-400 hover:border-neutral-800 hover:text-neutral-300'
              }`}
            >
              <div className="font-bold mb-0.5 uppercase flex items-center justify-between">
                <span>{world.name}</span>
                {isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>}
              </div>
              <p className="text-[9px] text-neutral-500 leading-tight truncate">
                {world.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* World Physical constants adjustment section */}
      <div className="p-3 bg-neutral-900/30 rounded border border-neutral-900 space-y-3.5">
        <div className="flex justify-between items-center text-[10px] text-neutral-400">
          <span>CONSTANTES ALGORITHMIQUES : <b className="text-white font-semibold uppercase">{activeWorld.name}</b></span>
          <span className="text-neutral-600">MODES DE GRAVITATION ET TRANSFERT</span>
        </div>

        {/* Gravity Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-neutral-400 relative">
            <span className="flex items-center gap-1">
              <RefreshCw size={10} className="text-indigo-400" />
              GRAVITATION SÉMANTIQUE
              <button 
                onClick={() => setIsLocked(!isLocked)}
                className={`ml-2 p-1 rounded-full opacity-50 hover:opacity-100 transition-opacity ${isLocked ? 'text-rose-500' : 'text-emerald-500'}`}
              >
                {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
            </span>
            <span className="font-semibold text-neutral-300">{activeWorld.gravity.toFixed(2)} G</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.01"
            value={activeWorld.gravity}
            disabled={isLocked}
            onChange={(e) => handleSliderChange('gravity', parseFloat(e.target.value))}
            className={`w-full h-1 bg-neutral-950 rounded-lg cursor-pointer ${isLocked ? 'opacity-30 cursor-not-allowed' : 'accent-indigo-500'}`}
          />
        </div>

        {/* Speed Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span className="flex items-center gap-1">
              <Zap size={10} className="text-indigo-400" />
              VITESSE CYCLIQUE DE PARTIS (SP)
            </span>
            <span className="font-semibold text-neutral-300">{activeWorld.speed.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.01"
            value={activeWorld.speed}
            disabled={isLocked}
            onChange={(e) => handleSliderChange('speed', parseFloat(e.target.value))}
            className={`w-full h-1 bg-neutral-950 rounded-lg cursor-pointer ${isLocked ? 'opacity-30 cursor-not-allowed' : 'accent-indigo-500'}`}
          />
        </div>

        {/* Chaos Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span className="flex items-center gap-1">
              <Flame size={10} className="text-rose-400" />
              CHAOS ET BRUIT QUANTIQUE (DELTA_MAX)
            </span>
            <span className="font-semibold text-neutral-300">{(activeWorld.chaos * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.01"
            value={activeWorld.chaos}
            disabled={isLocked}
            onChange={(e) => handleSliderChange('chaos', parseFloat(e.target.value))}
            className={`w-full h-1 bg-neutral-950 rounded-lg cursor-pointer ${isLocked ? 'opacity-30 cursor-not-allowed' : 'accent-rose-500'}`}
          />
        </div>
      </div>
    </div>
  );
};
