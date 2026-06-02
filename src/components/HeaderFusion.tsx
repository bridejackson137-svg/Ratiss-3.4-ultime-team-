import React from 'react';

interface HeaderFusionProps {
  supabaseConnected: boolean;
  currentWorld: string;
  reveAutonome: boolean;
  onOpenTokenSettings: () => void;
}

export const HeaderFusion: React.FC<HeaderFusionProps> = ({
  supabaseConnected = true,
  currentWorld = "TERRE",
  reveAutonome = false,
  onOpenTokenSettings
}) => {
  return (
    <header className="w-full bg-slate-950 p-6 border-b border-slate-800 font-mono select-none">
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        
        {/* LIGNE 1 : Titre principal & Version */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="bg-cyan-950/50 p-2 rounded-lg border border-cyan-800/40">
                🧠
              </div>
              <h1 className="text-xl font-black tracking-wider text-slate-100 uppercase">
                Simulateur Cognitif RATISS
              </h1>
              <span className="bg-cyan-950 border border-cyan-700 text-cyan-400 text-[10px] px-2 py-0.5 rounded font-bold">
                v4.0_768D
              </span>
            </div>
            <p className="text-[10px] text-slate-500 tracking-widest mt-1 uppercase">
              SYNAPTIC TOPOLOGY • BIOMETRIC MICRO-FLUCTUATIONS & FAILOVER SECURITY
            </p>
          </div>
        </div>

        {/* LIGNE 2 : Barre de Statut et Badges */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Badge Supabase Status */}
          <div className={`flex items-center gap-2 text-xs px-3 py-1 rounded-md border ${
            supabaseConnected 
              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-400' 
              : 'bg-red-950/30 border-red-800/60 text-red-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
            SUPABASE REALTIME {supabaseConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </div>

          {/* Badge Monde Actuel */}
          <div className="bg-slate-900 border border-slate-800 text-slate-300 text-xs px-3 py-1 rounded-md flex items-center gap-1">
            🧭 M_WORLD: <span className="text-slate-100 font-bold uppercase">{currentWorld}</span>
          </div>

          {/* Badge Rêve Autonome */}
          <div className="bg-slate-900 border border-slate-800 text-slate-300 text-xs px-3 py-1 rounded-md flex items-center gap-1">
            ♒ RÊVE_AUTONOME: <span className={reveAutonome ? "text-purple-400" : "text-slate-500"}>
              {reveAutonome ? "ACTIF" : "INACTIF"}
            </span>
          </div>

          {/* BOUTON PARAMÈTRES RÉACTIVÉ */}
          <button
            onClick={onOpenTokenSettings}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-400 p-1.5 rounded-md transition-all flex items-center justify-center cursor-pointer ml-auto"
            title="Ajuster les tokens et constantes"
          >
            ⚙️
          </button>
        </div>

      </div>
    </header>
  );
};
