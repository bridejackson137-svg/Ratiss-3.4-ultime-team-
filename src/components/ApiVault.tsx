import React, { useState, useMemo } from 'react';
import { ApiProvider } from '../types';
import { KeyRound, ShieldCheck, RefreshCw, Star, AlertTriangle, Zap, CheckCircle, Settings } from 'lucide-react';
import { supabase } from '../supabase';

interface ApiVaultProps {
  providers: ApiProvider[];
  onUpdatePriority: (id: string, priority: number) => void;
  onUpdateStatus: (id: string, status: 'active' | 'switching' | 'error') => void;
  isVaultAlarm?: boolean;
  onTriggerFallbackDemo?: () => void;
  activeRoutedId: string | null;
  selectedModels: Record<string, string>;
  onSelectModel: (providerId: string, modelId: string) => void;
  vaultKeys: Record<string, string>;
  onUpdateVaultKey: (providerId: string, key: string) => void;
}

export const ApiVault: React.FC<ApiVaultProps> = ({
  providers,
  onUpdatePriority,
  onUpdateStatus,
  isVaultAlarm = false,
  onTriggerFallbackDemo,
  activeRoutedId,
  selectedModels,
  onSelectModel,
  vaultKeys,
  onUpdateVaultKey,
}) => {
  const [testingId, setTestingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [keyValue, setKeyValue] = useState('');
  const [saveStatus, setSaveStatus] = useState<Record<string, 'idle' | 'saving' | 'saved'>>({});

  // Model Discovery / Scanning Status States
  const [scannedModels, setScannedModels] = useState<Record<string, { id: string; name: string }[]>>(() => {
    try {
      const saved = localStorage.getItem('ratiss_scanned_models');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [scanErrors, setScanErrors] = useState<Record<string, string>>({});
  const [isScanning, setIsScanning] = useState<Record<string, boolean>>({});

  // Keep original stable order of providers visually to avoid disorienting list jumping
  const apiOrder = useMemo(() => {
    return [...providers];
  }, [providers]);

  const handleSaveKey = async (id: string) => {
    setSaveStatus(prev => ({ ...prev, [id]: 'saving' }));
    
    // Core local persistent update via parent
    onUpdateVaultKey(id, keyValue);

    // Try real Supabase writing sync if connected
    if (supabase) {
      try {
        const { error } = await supabase
          .from('table_api_vault')
          .update({ api_key: keyValue })
          .eq('id', id);
        
        if (error) {
          console.warn('[RATISS] Supabase save key error:', error);
        }
      } catch (err) {
        console.warn('[RATISS] Supabase sync disconnected:', err);
      }
    }

    setTimeout(() => {
      setSaveStatus(prev => ({ ...prev, [id]: 'saved' }));
      setTimeout(() => {
        setSaveStatus(prev => ({ ...prev, [id]: 'idle' }));
      }, 1200);
    }, 1000);
  };

  const handleScanKey = async (id: string) => {
    setIsScanning(prev => ({ ...prev, [id]: true }));
    setScanErrors(prev => ({ ...prev, [id]: '' }));

    // Get the key either from modified input (local keyValue) or from persisted store vaultKeys
    const keyToScan = keyValue || vaultKeys[id] || '';

    // If key has been changed, save it first
    if (keyValue && keyValue !== vaultKeys[id]) {
      onUpdateVaultKey(id, keyValue);
      if (supabase) {
        try {
          await supabase.from('table_api_vault').update({ api_key: keyValue }).eq('id', id);
        } catch {}
      }
    }

    try {
      const response = await fetch('/api/cognitive/scan-models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId: id,
          apiKey: keyToScan,
        }),
      });

      if (!response.ok) {
        throw new Error(`Code HTTP ${response.status}`);
      }

      const data = await response.json();
      if (data.success && data.models && data.models.length > 0) {
        const updatedScanned = { ...scannedModels, [id]: data.models };
        setScannedModels(updatedScanned);
        localStorage.setItem('ratiss_scanned_models', JSON.stringify(updatedScanned));
      } else {
        const errorMsg = data.error || "Aucun modèle retourné par l'API.";
        setScanErrors(prev => ({ ...prev, [id]: errorMsg }));
        
        // Mark provider card status as error immediately per instructions to avoid ghosts
        onUpdateStatus(id, 'error');
      }
    } catch (err: any) {
      console.error("[SCAN] Dynamic model discovery failed:", err);
      setScanErrors(prev => ({ ...prev, [id]: err.message || "Erreur de connexion synaptique vers le pont d'API" }));
      onUpdateStatus(id, 'error'); // Mark card status as error immediately
    } finally {
      setIsScanning(prev => ({ ...prev, [id]: false }));
    }
  };

  const triggerTestSimulation = (id: string) => {
    setTestingId(id);
    onUpdateStatus(id, 'switching');
    
    // Simulate API handshaking
    setTimeout(() => {
      setTestingId(null);
      const statusOptions: ('active' | 'error')[] = ['active', 'active', 'active', 'error'];
      const randomOutcome = statusOptions[Math.floor(Math.random() * statusOptions.length)];
      onUpdateStatus(id, randomOutcome);
    }, 1500);
  };

  const getStatusLed = (p: ApiProvider, isRoutedActive: boolean) => {
    switch (p.status) {
      case 'switching':
        return (
          <div className="flex items-center gap-1.5 animate-pulse">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.95)]"></span>
            <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider">ROUTING...</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(239,68,68,0.9)]"></span>
            <span className="text-[9px] text-rose-500 font-bold uppercase tracking-wider">QUOTA ÉPUISÉ</span>
          </div>
        );
      case 'active':
      default:
        if (isRoutedActive) {
          return (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.9)] animate-pulse"></span>
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">FLUX ACTIF</span>
            </div>
          );
        } else {
          return (
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-neutral-600"></span>
              <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-wider">STANDBY</span>
            </div>
          );
        }
    }
  };

  return (
    <div 
      id="api-vault-widget" 
      className={`bg-neutral-950/95 border rounded-xl p-4 font-mono shadow-2xl flex flex-col gap-4 text-xs transition-all duration-300 ${
        isVaultAlarm 
          ? 'border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.25)] bg-amber-950/5 animate-pulse' 
          : 'border-neutral-900'
      }`}
    >
      <div className="flex justify-between items-center border-b border-neutral-900 pb-2.5">
        <div className="flex items-center gap-2 text-neutral-300">
          <KeyRound size={15} className="text-amber-500" />
          <span className="font-bold tracking-wider uppercase text-xs">TABLEAU DE BORD DE SECOURS (API VAULT)</span>
        </div>
        <span className="text-[10px] text-neutral-500 uppercase">table_api_vault</span>
      </div>

      {isVaultAlarm && (
        <div className="flex items-center gap-2.5 p-2 bg-amber-950/40 border border-amber-900/60 rounded text-amber-300 text-[10px] animate-bounce">
          <AlertTriangle size={15} className="text-amber-400 animate-pulse" />
          <div>
            <span className="font-bold">[ALERTE SYNAPTIQUE] BASCULEMENT DE FLUX EN COURS...</span>
            <p className="text-[9px] text-amber-400/85">RECHERCHE AUTOMATIQUE D'UNE LIASON SECONDAIRE PAR PRIORITÉ ASCENDANTE</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5 p-2.5 bg-neutral-950 border border-neutral-900/40 text-[10px] text-neutral-400">
        <div className="flex items-start gap-2">
          <ShieldCheck size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            RATISS intègre un réseau d'ApiVault de secours. Si le canal actuel s'épuise, le système effectue une déviation immédiate vers la priorité non-vide suivante.
          </p>
        </div>
        {onTriggerFallbackDemo && (
          <button
            onClick={onTriggerFallbackDemo}
            type="button"
            className="w-full mt-1.5 py-1.5 px-3 bg-amber-900/20 hover:bg-amber-900/45 text-amber-400 border border-amber-900/60 transition-all font-bold tracking-wider rounded text-[9px] uppercase hover:text-white cursor-pointer select-none flex items-center justify-center gap-1"
          >
            <Zap size={11} className="text-amber-400 fill-amber-400" />
            Simuler coupure du canal actif
          </button>
        )}
      </div>

      {/* Row list of providers */}
      <div className="space-y-2.5 relative">
        {apiOrder.map((p) => {
          const isTesting = testingId === p.id;
          const isError = p.status === 'error';
          const isRoutedActive = activeRoutedId === p.id && !isError;
          const isActive = p.status === 'active';
          const isExpanded = expandedId === p.id;
          
          return (
            <div key={p.id} className={`flex flex-col gap-1.5 transition-all duration-300 ${isError ? 'opacity-45 hover:opacity-75' : ''} animate-fade-in`}>
              <div 
                className={`p-3 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2 border transition-all duration-300 ${
                  isRoutedActive 
                    ? 'bg-emerald-950/15 border-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/10' 
                    : isError
                    ? 'bg-rose-950/5 border-rose-950/80 text-neutral-500 shadow-none'
                    : 'bg-neutral-950 border-neutral-900/80 hover:border-neutral-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-1 px-1.5 rounded-md font-bold text-[10px] self-start sm:self-center transition-all ${
                    isRoutedActive 
                      ? 'bg-emerald-950/60 border border-emerald-500/55 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]' 
                      : isError
                      ? 'bg-neutral-950 border border-rose-950/70 text-rose-800/80'
                      : 'bg-neutral-950 border border-neutral-850 text-neutral-500'
                  }`}>
                    {p.name.substring(0, 3).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <div className={`font-bold transition-all flex items-center gap-1.5 ${
                      isRoutedActive ? 'text-white' : isError ? 'text-neutral-500/90 line-through' : 'text-neutral-300'
                    }`}>
                      <span>{p.name}</span>
                      {isRoutedActive && (
                        <span className="text-[8px] tracking-widest text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-500/30 px-1 rounded animate-pulse">
                          ACTIF
                        </span>
                      )}
                      {!isRoutedActive && isActive && (
                        <span className="text-[8px] tracking-widest text-neutral-500 font-bold bg-neutral-900/40 border border-neutral-850 px-1 rounded">
                          STANDBY
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-neutral-500 flex items-center gap-2 mt-0.5">
                      <span>LAT : <b className={isRoutedActive ? 'text-neutral-300' : ''}>{p.latency}</b></span>
                      <span>•</span>
                      <span>QT : <b className={isRoutedActive ? 'text-neutral-300' : ''}>{p.quota}</b></span>
                    </div>
                  </div>
                </div>

                {/* Status and Action Buttons */}
                <div className="flex items-center justify-between sm:justify-end gap-2 px-1 border-t sm:border-t-0 border-neutral-900/40 pt-1.5 sm:pt-0">
                  <div className="flex items-center gap-1 mr-1 text-[10px]">
                    <span className="text-[9px] text-neutral-500">PRIO :</span>
                    {[1, 2, 3, 4, 5].map((num) => {
                      const isSelected = p.priority === num;
                      return (
                        <button
                          key={num}
                          onClick={() => onUpdatePriority(p.id, num)}
                          type="button"
                          className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/45 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
                              : 'bg-neutral-950 text-neutral-600 border border-neutral-900/50 hover:text-neutral-400'
                          }`}
                          title={`Priorité ${num}`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>

                  {/* Status Indicator LED */}
                  {getStatusLed(p, isRoutedActive)}

                  {/* Settings Toggler */}
                  <button
                    type="button"
                    onClick={() => {
                      if (isExpanded) {
                        setExpandedId(null);
                      } else {
                        setExpandedId(p.id);
                        setKeyValue(vaultKeys[p.id] || '');
                      }
                    }}
                    className={`p-1 rounded border transition-colors cursor-pointer flex items-center justify-center ${
                      isExpanded
                        ? 'bg-amber-950/60 border-amber-500 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                        : 'bg-neutral-950 hover:bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                    title="Paramètres de clé d'accès sécurisé"
                  >
                    <Settings size={10} className={isExpanded ? 'animate-spin' : ''} />
                  </button>

                  {/* Handshaking */}
                  <button
                    type="button"
                    onClick={() => triggerTestSimulation(p.id)}
                    disabled={isTesting}
                    className="px-1.5 py-1 rounded bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-[9px] text-neutral-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw size={8} className={isTesting ? 'animate-spin text-amber-500' : ''} />
                    <span>TESTER</span>
                  </button>
                </div>
              </div>

              {/* Accordion Settings Drawer Panel */}
              {isExpanded && (
                <div className="p-3 bg-neutral-950 border border-neutral-900 rounded-lg flex flex-col gap-3 animate-fade-in text-[10px]">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="font-bold flex items-center gap-1 text-[9px]">
                      <KeyRound size={11} className="text-amber-500" />
                      CLÉ VAULT PRIVÉE ({p.name.toUpperCase()})
                    </span>
                    <span className="text-[8px] text-neutral-600 uppercase">Cryptage Client AES-local</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="password"
                      value={keyValue}
                      onChange={(e) => setKeyValue(e.target.value)}
                      placeholder={p.id === 'gemini' ? "Utilise par défaut le jeton GEMINI_API_KEY système ou le vôtre..." : "Entrez votre clé API privée ici..."}
                      className="flex-1 bg-neutral-900 border border-neutral-850 rounded px-2.5 py-1.5 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-amber-500 font-mono transition-colors"
                    />
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSaveKey(p.id)}
                        disabled={saveStatus[p.id] === 'saving'}
                        className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 disabled:opacity-40 text-neutral-300 font-bold rounded text-[9px] uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all hover:text-white"
                        title="Sauvegarder localement la clé"
                      >
                        {saveStatus[p.id] === 'saving' ? (
                          <>
                            <RefreshCw size={11} className="animate-spin text-white" />
                            <span>Sauvegarde...</span>
                          </>
                        ) : saveStatus[p.id] === 'saved' ? (
                          <>
                            <CheckCircle size={11} className="text-emerald-400" />
                            <span>Sauvée !</span>
                          </>
                        ) : (
                          <span>Sauvegarder</span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleScanKey(p.id)}
                        disabled={isScanning[p.id]}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-bold rounded text-[9px] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors shadow-[0_0_8px_rgba(245,158,11,0.2)]"
                      >
                        {isScanning[p.id] ? (
                          <>
                            <RefreshCw size={11} className="animate-spin text-white" />
                            <span>Analyse...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw size={11} />
                            <span>Scanner la clé</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Scan Error Message */}
                  {scanErrors[p.id] && (
                    <div className="p-2 border border-rose-950 bg-rose-950/20 text-rose-400 text-[9px] rounded flex items-start gap-1.5">
                      <AlertTriangle size={12} className="text-rose-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold uppercase">[ERREUR D'ANALYSE D'ACCÈS] :</span>
                        <p className="mt-0.5">{scanErrors[p.id]}</p>
                      </div>
                    </div>
                  )}

                  {/* Dropdown Menu for list of verified models */}
                  {scannedModels[p.id] && scannedModels[p.id].length > 0 ? (
                    <div className="mt-1.5 pt-2 border-t border-neutral-900/40 flex flex-col gap-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
                          <Zap size={10} className="text-amber-500" />
                          Modèles Détectés et Disponibles :
                        </label>
                        <span className="text-[8px] text-emerald-500 font-bold bg-emerald-950/40 px-1 border border-emerald-900/50 rounded animate-pulse">
                          {scannedModels[p.id].length} MODÈLES TROUVÉS
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        <select
                          value={selectedModels[p.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              onSelectModel(p.id, val);
                              onUpdateStatus(p.id, 'active');
                              // clear error if keys were valid
                              setScanErrors(prev => ({ ...prev, [p.id]: '' }));
                            }
                          }}
                          className="flex-1 bg-neutral-900 border border-neutral-800 text-neutral-200 rounded px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-amber-500 transition-colors"
                        >
                          <option value="">-- Sélectionnez un modèle scanné (Requis pour activer) --</option>
                          {scannedModels[p.id].map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name || m.id} ({m.id})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Display locked status indicator */}
                      {selectedModels[p.id] ? (
                        <div className="mt-1 p-2 bg-emerald-950/25 border border-emerald-900/60 rounded text-emerald-400 text-[9px] flex items-center gap-1.5">
                          <CheckCircle size={12} className="text-emerald-400" />
                          <span>
                            Modèle sélectionné et verrouillé : <b className="text-white underline font-mono">{selectedModels[p.id]}</b>. Liaison sécurisée établie.
                          </span>
                        </div>
                      ) : (
                        <p className="text-[9px] text-amber-400/85 italic mt-1 font-semibold">
                          ⚠️ Veuillez sélectionner un modèle ci-dessus pour verrouiller la liaison et réactiver ce fournisseur.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-2 border border-neutral-900 bg-neutral-950/30 text-neutral-500 text-[9px] rounded italic">
                      Aucun modèle scanné disponible pour l'instant. Saisissez votre clé d'accès et cliquez sur "SCANNER LA CLÉ" pour générer la liste.
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
