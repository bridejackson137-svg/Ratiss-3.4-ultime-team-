import React, { useEffect, useState, useRef } from 'react';
import { CognitiveSector, Neuromodulator, SimulatedWorld } from '../types';

interface BrainVisualizerProps {
  sectors: CognitiveSector[];
  neuromodulators: Neuromodulator[];
  activeWorld: SimulatedWorld;
  isHallucinating: boolean;
  delta: number;
  lastSedimentedSectorId: string | null;
  pulseTrigger: number;
  rigourLock: boolean;
}

interface VisualPulse {
  id: string;
  sectorId: string;
  startX: string;
  startY: string;
}

export const BrainVisualizer: React.FC<BrainVisualizerProps> = ({
  sectors,
  neuromodulators,
  activeWorld,
  isHallucinating,
  delta,
  lastSedimentedSectorId,
  pulseTrigger,
  rigourLock,
}) => {
  const [activePulses, setActivePulses] = useState<VisualPulse[]>([]);
  const lastTriggerRef = useRef(0);

  // Map sector IDs to coordinates (using percentage values for exact absolute positioning)
  const sectorPositions: Record<string, { x: string; y: string; color: string; label: string }> = {
    arts: { x: '25%', y: '18%', color: '#ec4899', label: 'ARTS & DESIGN' },
    sciences_sociales: { x: '75%', y: '18%', color: '#f59e0b', label: 'SCIENCES SOC.' },
    biologie: { x: '15%', y: '50%', color: '#10b981', label: 'BIOLOGIE' },
    technologie: { x: '85%', y: '50%', color: '#3b82f6', label: 'TECHNOLOGIE' },
    philosophie: { x: '30%', y: '80%', color: '#6366f1', label: 'PHILOSOPHIE' },
    physique: { x: '70%', y: '75%', color: '#ef4444', label: 'PHYSIQUE' },
    metacognition: { x: '50%', y: '50%', color: '#a855f7', label: 'MÉTACOGNITION' },
  };

  // Track Sedimentation Shocks waves / pulses triggers
  useEffect(() => {
    if (pulseTrigger > lastTriggerRef.current && lastSedimentedSectorId) {
      lastTriggerRef.current = pulseTrigger;
      
      const pos = sectorPositions[lastSedimentedSectorId];
      if (pos) {
        const newPulse: VisualPulse = {
          id: Math.random().toString(),
          sectorId: lastSedimentedSectorId,
          startX: pos.x,
          startY: pos.y,
        };
        
        setActivePulses((prev) => [...prev, newPulse]);
        
        // Auto remove pulse after CSS animation completes (750ms)
        setTimeout(() => {
          setActivePulses((prev) => prev.filter((p) => p.id !== newPulse.id));
        }, 800);
      }
    }
  }, [pulseTrigger, lastSedimentedSectorId]);

  // Read dominant chemical for dynamic borders
  const dominantNeuro = neuromodulators.reduce(
    (prev, curr) => (curr.value > prev.value ? curr : prev),
    neuromodulators[0] || { id: 'serotonin', color: '#3b82f6' }
  );

  return (
    <div 
      id="visualizer-container" 
      className={`relative w-full h-full bg-neutral-950 rounded-xl overflow-hidden border border-neutral-905 shadow-2xl flex flex-col justify-between transition-all duration-500`}
      style={{
        boxShadow: isHallucinating 
          ? `inset 0 0 40px rgba(168, 85, 247, ${0.1 + delta * 0.15})` 
          : `inset 0 0 30px ${dominantNeuro.color}15`
      }}
    >
      {/* 1. Static/Decorative Vortex Backdrop (Incredibly lightweight CSS gradient rotating vortex) */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1000 ${isHallucinating ? 'opacity-40' : 'opacity-20'}`}>
        <div 
          className="absolute inset-[10%] rounded-full border border-dashed border-indigo-950/40 animate-[spin_55s_linear_infinite]"
          style={{ backgroundImage: 'radial-gradient(circle, transparent 40%, rgba(46, 16, 101, 0.08) 70%)' }}
        />
        <div 
          className="absolute inset-[30%] rounded-full border border-dashed border-emerald-950/20 animate-[spin_35s_linear_infinite_reverse]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(#1e1e2f_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />
      </div>

      {/* 2. Synaptic Grid Connections via SVG (Hardware-accelerated rendering) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
        <defs>
          <radialGradient id="metaglow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Central Metacognition Ambient Glow */}
        <circle cx="50%" cy="50%" r="120" fill="url(#metaglow)" />

        {/* Draw Synaptic Wires between nodes */}
        {Object.entries(sectorPositions).map(([id, pos]) => {
          if (id === 'metacognition') return null;

          // Connect every node to the central metacognition node
          return (
            <g key={`connect-${id}`}>
              {/* Static Background wire */}
              <line 
                x1={pos.x} 
                y1={pos.y} 
                x2="50%" 
                y2="50%" 
                stroke={`${pos.color}1c`} 
                strokeWidth="1.5" 
              />
              {/* Dynamic flowing sync signal */}
              <line 
                x1={pos.x} 
                y1={pos.y} 
                x2="50%" 
                y2="50%" 
                stroke={pos.color} 
                strokeWidth="2" 
                strokeDasharray="4 24" 
                className="opacity-60"
                style={{
                  strokeDashoffset: Math.sin(id.charCodeAt(0)) * 100,
                  animation: `synapse-slide ${5.5 / (activeWorld.speed * 1.5 + 0.4)}s linear infinite`
                }}
              />
            </g>
          );
        })}

        {/* Inter-sector support wires to build the hexagonal structural grid */}
        <line x1="25%" y1="18%" x2="75%" y2="18%" stroke="#ffffff08" strokeWidth="1" strokeDasharray="5 5" />
        <line x1="15%" y1="50%" x2="25%" y2="18%" stroke="#ffffff08" strokeWidth="1" strokeDasharray="5 5" />
        <line x1="75%" y1="18%" x2="85%" y2="50%" stroke="#ffffff08" strokeWidth="1" strokeDasharray="5 5" />
        <line x1="15%" y1="50%" x2="30%" y2="80%" stroke="#ffffff08" strokeWidth="1" strokeDasharray="5 5" />
        <line x1="85%" y1="50%" x2="70%" y2="75%" stroke="#ffffff08" strokeWidth="1" strokeDasharray="5 5" />
        <line x1="30%" y1="80%" x2="70%" y2="75%" stroke="#ffffff08" strokeWidth="1" strokeDasharray="5 5" />
      </svg>

      {/* 3. Sedimentation Shockwave/Pulse Circles */}
      {activePulses.map((pulse) => (
        <div
          key={pulse.id}
          className="absolute w-20 h-20 -ml-10 -mt-10 rounded-full border-2 border-dashed pointer-events-none z-10 animate-shockwave"
          style={{
            left: pulse.startX,
            top: pulse.startY,
            borderColor: sectorPositions[pulse.sectorId]?.color,
          }}
        />
      ))}

      {/* 4. Cognitive Header Telemetry */}
      <div className="absolute top-4 left-4 flex flex-col pointer-events-none z-10 font-mono gap-1 select-none text-left">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full bg-indigo-500 ${isHallucinating ? 'animate-[pulse_1.5s_infinite]' : 'animate-ping'}`}></span>
          <span className="text-xs uppercase tracking-widest text-neutral-300 font-bold">
            RATISS_768D_COG_STREAM
          </span>
        </div>
        <span className="text-[10px] text-neutral-500 uppercase">
          ENV: GRAV={activeWorld.gravity.toFixed(2)}G | SPEED={activeWorld.speed.toFixed(2)}x | DRIFT={(delta*100).toFixed(0)}%
        </span>
      </div>

      <div className="absolute top-4 right-4 z-10 font-mono select-none">
        <span className="text-[9px] text-emerald-400 px-2.5 py-1 bg-emerald-950/20 border border-emerald-900/30 rounded-lg flex items-center gap-1.5 font-bold animate-pulse">
          ⚡ STABILISATION FLUIDE RATISS 4 FUSION
        </span>
      </div>

      {/* 5. Dynamic placement of labels and discipline nodes */}
      {sectors.map((sector) => {
        const coords = sectorPositions[sector.id];
        if (!coords) return null;

        const isMeta = sector.id === 'metacognition';
        const opacity = sector.opacity;

        return (
          <div
            key={sector.id}
            className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-500 select-none z-10 ${
              isMeta ? 'scale-110' : ''
            }`}
            style={{
              left: coords.x,
              top: coords.y,
              opacity: rigourLock && !isMeta ? 0.35 : opacity,
            }}
          >
            {/* Outer Pulsing Aura */}
            <div 
              className={`absolute rounded-full transition-all duration-500 ${
                isMeta 
                  ? 'w-16 h-16 bg-purple-500/10 border border-purple-500/30 blur-sm animate-[pulse_2.5s_infinite]' 
                  : 'w-10 h-10 border border-white/5 bg-black/40 blur-[2px]'
              }`}
            />

            {/* Core Node Seed */}
            <div 
              className={`relative rounded-full flex items-center justify-center transition-all duration-300 ${
                isMeta
                  ? 'w-8 h-8 border border-purple-500/40 bg-purple-950/60 shadow-[0_0_15px_#a855f770]'
                  : 'w-5.5 h-5.5 border border-neutral-800'
              }`}
              style={{
                backgroundColor: isMeta ? undefined : `${coords.color}18`,
                borderColor: !isMeta ? `${coords.color}40` : undefined,
                boxShadow: !isMeta ? `0 0 10px ${coords.color}15` : undefined
              }}
            >
              {/* Inner glowing core */}
              <div 
                className="w-2.5 h-2.5 rounded-full"
                style={{ 
                  backgroundColor: coords.color,
                  boxShadow: `0 0 8px ${coords.color}` 
                }}
              />
            </div>

            {/* Sector Title Label */}
            <span 
              className={`text-[10px] font-black tracking-widest mt-2 px-1 text-center`}
              style={{ color: coords.color }}
            >
              {coords.label}
            </span>

            {/* Sector Opacity percentage text */}
            {!isMeta && (
              <span className="text-[8px] text-neutral-600 font-bold uppercase tracking-tight">
                OP: {Math.round(opacity * 100)}%
              </span>
            )}
          </div>
        );
      })}

      {/* Styled Grid Inject dynamic CSS to support animated flowing SYNAPSE sliding effects */}
      <style>{`
        @keyframes synapse-slide {
          to {
            stroke-dashoffset: -28;
          }
        }
        @keyframes shock-expand {
          0% {
            transform: scale(0.1);
            opacity: 0.9;
          }
          100% {
            transform: scale(1.6);
            opacity: 0;
            border-width: 0.5px;
          }
        }
        .animate-shockwave {
          animation: shock-expand 0.75s cubic-bezier(0.1, 0.8, 0.3, 1) forwards;
        }
      `}</style>

      {/* 6. Current active world name positioned gracefully on the bottom */}
      <div className="absolute bottom-6 right-6 pointer-events-none z-10 font-mono select-none">
        <span className="text-xl font-black text-neutral-850/80 uppercase tracking-[0.2em]">
          {activeWorld.name}
        </span>
      </div>
    </div>
  );
};
