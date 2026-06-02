import React, { useState, useEffect } from 'react';
import { HeaderFusion } from './HeaderFusion';
import { CognitiveSector, Neuromodulator, SimulatedWorld, HallucinationState, ApiProvider, ConsoleEntry, JargonTerm } from '../types';
import { BrainVisualizer } from './BrainVisualizer';
import MoteurSynthese from './MoteurSynthese';
import { Console } from './Console';
import { extraireEtParserJsonRatiss } from './RatissSafeParser';
import { SimulatedWorlds } from './SimulatedWorlds';
import { HallucinationMonitor } from './HallucinationMonitor';
import { SectorsControl } from './SectorsControl';
import { NeuromodulatorsGauges } from './NeuromodulatorsGauges';
import { ApiVault } from './ApiVault';
import ArchiveSingularites from './ArchiveSingularites';
import { Brain, Waves, Compass } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../supabase';

interface MainDashboardProps {
  userId: string | null;
}

let lastId = 0;
function generateUniqueId(prefix: string = 'msg'): string {
  lastId += 1;
  return `${prefix}-${Date.now()}-${lastId}-${Math.random().toString(36).substring(2, 6)}`;
}

export const MainDashboard: React.FC<MainDashboardProps> = ({ userId }) => {
  // 1. Initial State for Cognitive Sectors (Opacities locked initially at 0.50 by Rigueur Filter)
  const [sectors, setSectors] = useState<CognitiveSector[]>([
    { id: 'physique', name: 'Physique', codename: 'PHY', opacity: 0.50, description: 'Modélisation des équations physiques fondamentales', color: 'bg-red-500' },
    { id: 'philosophie', name: 'Philosophie', codename: 'PHL', opacity: 0.50, description: 'Filtre téléologique et thèses de sémantique formelle', color: 'bg-indigo-500' },
    { id: 'technologie', name: 'Technologie', codename: 'TEC', opacity: 0.50, description: 'Vecteurs d\'ingénierie et automatisation technique', color: 'bg-blue-500' },
    { id: 'biologie', name: 'Biologie', codename: 'BIO', opacity: 0.50, description: 'Simulations d\'enzymes et feedback neuromimétiques', color: 'bg-emerald-500' },
    { id: 'sciences_sociales', name: 'Sciences Soc.', codename: 'SOC', opacity: 0.50, description: 'Dynamiques anthropologiques et émergences comportementales', color: 'bg-amber-500' },
    { id: 'arts', name: 'Arts & Design', codename: 'ART', opacity: 0.50, description: 'Abstraction esthétique et harmonie des shaders graphiques', color: 'bg-pink-500' },
    { id: 'metacognition', name: 'Métacognition', codename: 'MTC', opacity: 0.50, description: 'Auto-évaluation constante et boucle de rétroaction', color: 'bg-purple-500' },
  ]);

  // Rigour Lock state (strictly matches horizontal lock at 0.50 limit in table_secteurs_cognitifs)
  const [rigourLock, setRigourLock] = useState<boolean>(true);

  // 2. Initial State for Neuromodulators
  const [neuromodulators, setNeuromodulators] = useState<Neuromodulator[]>([
    { id: 'dopamine', name: 'Dopamine', value: 0.55, color: '#ef4444', description: 'Favorise le chaos explorationnel et la créativité divergente', role: 'Exploration' },
    { id: 'serotonin', name: 'Sérotonine', value: 0.60, color: '#3b82f6', description: 'Assure la stabilité des poids synaptiques de sédimentation', role: 'Poids du noyau' },
    { id: 'noradrenaline', name: 'Noradrénaline', value: 0.45, color: '#10b981', description: 'Régule le seuil d\'alerte quantique et la densité réseau', role: 'Vigilance' },
    { id: 'acetylcholine', name: 'Acétylcholine', value: 0.50, color: '#eab308', description: 'Incite la concentration analytique et la profondeur du signal', role: 'Attention' },
  ]);

  // Dynamic visual biological fluctuations ticker
  const [ticker, setTicker] = useState(0);

  useEffect(() => {
    const int = setInterval(() => setTicker(t => t+1), 500);
    return () => clearInterval(int);
  }, []);

  // 3. Initial State for Worlds
  const [worlds, setWorlds] = useState<SimulatedWorld[]>([
    { id: 'terre', name: 'Terre', gravity: 0.30, speed: 0.45, chaos: 0.15, description: 'Environnement physique de référence stable', colorPalette: { bg: 'neutral-950', primary: 'indigo-500', glow: 'rgba(99,102,241,0.2)' } },
    { id: 'micro_gravite', name: 'Micro-gravité', gravity: 0.05, speed: 0.25, chaos: 0.20, description: 'Interdépendance faible, flottabilité des clusters', colorPalette: { bg: 'zinc-950', primary: 'blue-500', glow: 'rgba(59,130,246,0.2)' } },
    { id: 'chaos_quantique', name: 'Chaos', gravity: 0.75, speed: 0.90, chaos: 1.00, description: 'Fibrillation constante des repères sémantiques', colorPalette: { bg: 'stone-950', primary: 'red-500', glow: 'rgba(239,68,68,0.2)' } },
    { id: 'vide_absolu', name: 'Vide Absolu', gravity: 0.00, speed: 0.10, chaos: 0.02, description: 'Absence d\'inertie, transfert linéaire pur', colorPalette: { bg: 'slate-950', primary: 'slate-500', glow: 'rgba(100,116,139,0.2)' } },
    { id: 'simulation_limite', name: 'Sim. Limite', gravity: 0.90, speed: 0.70, chaos: 0.60, description: 'Attraction sémantique critique extrême', colorPalette: { bg: 'neutral-950', primary: 'yellow-500', glow: 'rgba(234,179,8,0.2)' } },
    { id: 'hyper_vitesse', name: 'Hyper-V', gravity: 0.45, speed: 1.00, chaos: 0.30, description: 'Vitesse de rotation vectorielle maximale', colorPalette: { bg: 'neutral-950', primary: 'emerald-500', glow: 'rgba(16,185,129,0.2)' } },
  ]);
  const [activeWorldId, setActiveWorldId] = useState<string>('terre');

  // 4. Hallucination Cycle State
  const [hallucinating, setHallucinating] = useState<HallucinationState>({
    isActive: false,
    delta: 0.30,
    distortion: 0.20,
    frequency: 1.5,
    noiseWave: [],
  });

  const [lastCollision, setLastCollision] = useState<{
    secteurs: string;
    concept: string;
    logique: string;
    application: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('ratiss_last_collision');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // 5. API Vault security list
  const [apiProviders, setApiProviders] = useState<ApiProvider[]>([
    { id: 'gemini', name: 'Google Gemini 3.5', priority: 1, status: 'active', quota: '450/1500 req', latency: '240ms' },
    { id: 'openai', name: 'OpenAI GPT-4o', priority: 2, status: 'active', quota: '25/1000 req', latency: '350ms' },
    { id: 'groq', name: 'Groq LLaMA-3', priority: 3, status: 'active', quota: 'Unlimited', latency: '40ms' },
    { id: 'claude', name: 'Anthropic Claude 3.5', priority: 4, status: 'active', quota: '120/500 req', latency: '420ms' },
    { id: 'wavespeed', name: 'Wavespeed GPT-4o', priority: 5, status: 'active', quota: 'Unlimited', latency: '200ms' },
  ]);

  // API Vault keys state
  const [vaultKeys, setVaultKeys] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('ratiss_vault_keys');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleUpdateVaultKey = (providerId: string, key: string) => {
    setVaultKeys(prev => {
      const next = { ...prev, [providerId]: key };
      localStorage.setItem('ratiss_vault_keys', JSON.stringify(next));
      return next;
    });
  };

  // Track the currently active routed channel, calculated at send time
  const [activeRoutedId, setActiveRoutedId] = useState<string | null>('gemini');

  // Store user calculations / lock selections for custom provider models
  const [selectedModels, setSelectedModels] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('ratiss_selected_models');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const handleSelectModel = (providerId: string, modelId: string) => {
    setSelectedModels(prev => {
      const next = { ...prev, [providerId]: modelId };
      localStorage.setItem('ratiss_selected_models', JSON.stringify(next));
      return next;
    });
  };

  // RATISS Paramètres et presets de tokens
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [isApplyingPreset, setIsApplyingPreset] = useState<boolean>(false);
  const [tokenMode, setTokenMode] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [tokenPreset, setTokenPreset] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ratiss_token_preset');
      return saved ? parseInt(saved, 10) : 1000;
    } catch {
      return 1000;
    }
  });

  const handleUpdateTokenPreset = (preset: number) => {
    setTokenPreset(preset);
    try {
      localStorage.setItem('ratiss_token_preset', preset.toString());
    } catch {}
    
    const presetLabel = preset === 200 ? 'MARGE (200)' : preset === 1000 ? 'MOYEN (1000)' : 'MAXIMUM (8000)';
    setConsoleEntries(prev => [
      ...prev,
      {
        id: generateUniqueId('cfg-token'),
        timestamp: new Date().toLocaleTimeString(),
        text: `[PARAMÈTRE] Seuil de jetons présélectionné : ${presetLabel}. Cliquez sur "APPLIQUER LA CONFIGURATION" pour calibrer le moteur.`,
        type: 'system',
      }
    ]);
  };

  const handleApplyTokenPreset = async () => {
    setIsApplyingPreset(true);
    try {
      const response = await fetch("/api/cognitive/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_output_tokens: tokenPreset })
      });
      const data = await response.json();
      if (data.success) {
        setConsoleEntries(prev => [
          ...prev,
          {
            id: generateUniqueId('cfg-apply-success'),
            timestamp: new Date().toLocaleTimeString(),
            text: `[SYS] [CONFIG] Max output tokens successfully mutated to: ${tokenPreset}`,
            type: 'system',
          }
        ]);
      } else {
        throw new Error(data.error || "Erreur de calibrage");
      }
    } catch (err: any) {
      setConsoleEntries(prev => [
        ...prev,
        {
          id: generateUniqueId('cfg-apply-err'),
          timestamp: new Date().toLocaleTimeString(),
          text: `[ERREUR CONFIG] Échec du couplage de jetons : ${err.message}`,
          type: 'error',
        }
      ]);
    } finally {
      setIsApplyingPreset(false);
    }
  };

  const [isVaultAlarm, setIsVaultAlarm] = useState<boolean>(false);

  const [jargonTerms, setJargonTerms] = useState<JargonTerm[]>([
    { concept: 'physique', jargon: 'physis', timestamp: 'Initial' },
    { concept: 'esprit', jargon: 'noos', timestamp: 'Initial' },
    { concept: 'chaotique', jargon: 'dopaminergique', timestamp: 'Initial' },
    { concept: 'attention', jargon: 'acetyl_focus', timestamp: 'Initial' },
  ]);

  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([
    { id: '1', timestamp: '20:01:00', text: '[INFO] Initialisation du simulateur cognitif RATISS 4 FUSION...', type: 'system' },
    { id: '2', timestamp: '20:01:01', text: '[INFO] Cartographie SQL vectorielle à 768 dimensions stabilisée.', type: 'system' },
    { id: '3', timestamp: '20:01:01', text: '[INFO] Connexion au ApiVault de secours établie avec succès.', type: 'system' },
    { id: '4', timestamp: '20:01:02', text: '[RATISS 4 FUSION CORE] Noyaux en attente. Introduisez un concept ou sédimentez du jargon : concept(:)jargon', type: 'system' },
  ]);

  const [isPending, setIsPending] = useState(false);
  const activeWorld = worlds.find(w => w.id === activeWorldId) || worlds[0];

  const [lastSedimentedSectorId, setLastSedimentedSectorId] = useState<string | null>(null);
  const [pulseTrigger, setPulseTrigger] = useState<number>(0);



  useEffect(() => {
    (window as any).__ratissStopAllSpeech = () => {
      window.speechSynthesis.cancel();
      if ((window as any).__activeAudio) {
        try {
          (window as any).__activeAudio.pause();
          (window as any).__activeAudio.src = "";
        } catch (e) {}
        (window as any).__activeAudio = null;
      }
      window.dispatchEvent(new CustomEvent('app-speech-stop', { detail: { sourceId: null } }));
    };
  }, []);

  const oscillatedNeuromodulators = neuromodulators.map((nm, idx) => {
    const drift = Math.sin((ticker * 0.18) + (idx * 2.2)) * 0.0125;
    const finalVal = Math.max(0.01, Math.min(1.0, nm.value + drift));
    return { ...nm, value: finalVal };
  });

  const currentDopamine = oscillatedNeuromodulators.find(n => n.id === 'dopamine')?.value || 0.55;
  const currentSerotonin = oscillatedNeuromodulators.find(n => n.id === 'serotonin')?.value || 0.60;

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const neuromodulationChannel = supabase
      .channel('table_neuromodulation_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_neuromodulation' }, (payload) => {
        const data = payload.new as any;
        if (data) {
          setNeuromodulators((prev) =>
            prev.map((nm) => (data[nm.id] !== undefined ? { ...nm, value: parseFloat(data[nm.id]) } : nm))
          );
        }
      })
      .subscribe();

    const sectorsChannel = supabase
      .channel('table_secteurs_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_secteurs_cognitifs' }, (payload) => {
        const data = payload.new as any;
        if (data && data.id) {
          setSectors((prev) =>
            prev.map((sec) => (sec.id === data.id ? { ...sec, opacity: parseFloat(data.opacity) } : sec))
          );
        }
      })
      .subscribe();

    const dreamChannel = supabase
      .channel('table_hallucinations_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_hallucinations' }, (payload) => {
        const data = payload.new as any;
        if (data) {
          setHallucinating((prev) => ({
            ...prev,
            isActive: data.is_active ?? prev.isActive,
            delta: data.delta ?? prev.delta,
            distortion: data.distortion ?? prev.distortion,
          }));
        }
      })
      .subscribe();

    const jargonChannel = supabase
      .channel('table_jargon_sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'table_jargon' }, (payload) => {
        const data = payload.new as any;
        if (data && data.concept && data.jargon) {
          handleAddJargonBinding(data.concept, data.jargon);
        }
      })
      .subscribe();

    const vaultChannel = supabase
      .channel('table_vault_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_api_vault' }, (payload) => {
        const data = payload.new as any;
        if (data && data.id) {
          setApiProviders((prev) =>
            prev.map((p) => (p.id === data.id ? { ...p, status: data.status ?? p.status, priority: data.priority ?? p.priority } : p))
          );
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(neuromodulationChannel);
      supabase.removeChannel(sectorsChannel);
      supabase.removeChannel(dreamChannel);
      supabase.removeChannel(jargonChannel);
      supabase.removeChannel(vaultChannel);
    };
  }, []);

  const handleUpdateSectorOpacity = (id: string, opacity: number) => {
    setSectors(prev =>
      prev.map(sec => {
        if (sec.id === id) {
          let targetOp = opacity;
          if (rigourLock && targetOp > 0.50) targetOp = 0.50;
          return { ...sec, opacity: targetOp };
        }
        return sec;
      })
    );
  };

  const handleToggleRigourLock = () => {
    const nextLockState = !rigourLock;
    setRigourLock(nextLockState);
    if (nextLockState) setSectors(prev => prev.map(sec => (sec.opacity > 0.50 ? { ...sec, opacity: 0.50 } : sec)));
  };

  const handleUpdateNeuromodulator = (id: string, value: number) => {
    setNeuromodulators(prev =>
      prev.map(neuro => {
        if (neuro.id === id) {
          if (id === 'dopamine') onUpdateWorldConstants(activeWorldId, { chaos: Math.max(0.01, value * 1.1) });
          return { ...neuro, value };
        }
        return neuro;
      })
    );
  };

  const handleSwitchWorld = (id: string) => {
    setActiveWorldId(id);
    const selected = worlds.find(w => w.id === id);
    if (!selected) return;
    if (id === 'chaos_quantique') {
      setNeuromodulators(prev => prev.map(nm => (nm.id === 'dopamine' ? { ...nm, value: 0.95 } : nm)));
    } else if (id === 'vide_absolu') {
      setNeuromodulators(prev => prev.map(nm => (nm.id === 'dopamine' ? { ...nm, value: 0.15 } : nm)));
    }
  };

  const onUpdateWorldConstants = (worldId: string, constants: Partial<SimulatedWorld>) => {
    setWorlds(prev => prev.map(w => (w.id === worldId ? { ...w, ...constants } : w)));
  };

  const handleTriggerCollision = async () => {
    setIsPending(true);
    let savedKeys: Record<string, string> = {};
    try {
      const savedKeysRaw = localStorage.getItem('ratiss_vault_keys');
      if (savedKeysRaw) savedKeys = JSON.parse(savedKeysRaw);
    } catch {}

    const sortedOrder = [...apiProviders].sort((a, b) => a.priority - b.priority);
    const activeCandidate = sortedOrder.find(p => p.status !== 'error') || sortedOrder[0];
    const providerId = activeCandidate?.id || 'gemini';
    const candidateApiKey = savedKeys[providerId] || "";

    try {
      const response = await fetch('/api/cognitive/collision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jargonTerms, activeProviderId: providerId, apiKey: candidateApiKey, selectedModel: selectedModels[providerId] || "" }),
      });

      const resData = await response.json();
      if (resData.success) {
        const resultObj = { secteurs: resData.secteurs, concept: resData.concept, logique: resData.logique, application: resData.application };
        setLastCollision(resultObj);
        localStorage.setItem('ratiss_last_collision', JSON.stringify(resultObj));
        const sigma = parseFloat(((1 - hallucinating.delta * 0.45)).toFixed(2));
        
        if (isSupabaseConfigured && supabase) {
          await supabase.from('table_hallucinations').insert({
            user_id: userId,
            is_active: true,
            delta: hallucinating.delta,
            distortion: hallucinating.distortion,
            secteurs_impactes: resData.secteurs,
            concept_hybride: resData.concept,
            logique: resData.logique,
            application_2026: resData.application,
            is_stable: sigma >= 0.72,
            score_coherence: Math.round(sigma * 100)
          });
        }
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsPending(false);
    }
  };

  const handleToggleHallucination = (target: boolean) => {
    setHallucinating(prev => ({ ...prev, isActive: target }));
    if (target) setTimeout(() => handleTriggerCollision(), 500);
  };

  const handleUpdateHallucinationValues = (delta: number, distortion: number) => {
    setHallucinating(prev => ({ ...prev, delta, distortion }));
  };

  const handleAddJargonBinding = (concept: string, jargon: string) => {
    const conceptCleaned = concept.toLowerCase().trim();
    const matchedSector = sectors.find(s => s.id === conceptCleaned || s.name.toLowerCase() === conceptCleaned || s.codename.toLowerCase() === conceptCleaned);
    const sourceSectorId = matchedSector ? matchedSector.id : 'philosophie';
    setLastSedimentedSectorId(sourceSectorId);
    setPulseTrigger(prev => prev + 1);
    setJargonTerms(prev => [{ concept, jargon, timestamp: new Date().toLocaleTimeString() }, ...prev]);
  };

  const handleUpdateApiPriority = (id: string, newPriority: number) => {
    setApiProviders(prev => prev.map(p => p.id === id ? { ...p, priority: newPriority } : p));
  };

  const handleUpdateApiStatus = (id: string, status: 'active' | 'switching' | 'error') => {
    setApiProviders(prev => prev.map(p => (p.id === id ? { ...p, status } : p)));
  };

  const handleTriggerFallbackDemo = () => {
    setIsVaultAlarm(true);
    const currentOrder = [...apiProviders].sort((a, b) => a.priority - b.priority);
    const activeProv = currentOrder.find(p => p.status !== 'error') || currentOrder[0];
    setApiProviders(prev => prev.map(p => (p.id === activeProv.id ? { ...p, status: 'error' } : p)));
    setTimeout(() => setIsVaultAlarm(false), 1500);
  };

  const handleSendPrompt = async (text: string) => {
    setIsPending(true);
    const userMsgId = generateUniqueId('usr');
    setConsoleEntries(prev => [...prev, { id: userMsgId, timestamp: new Date().toLocaleTimeString(), text, type: 'input' }]);

    let savedKeys: Record<string, string> = {};
    try {
      const savedKeysRaw = localStorage.getItem('ratiss_vault_keys');
      if (savedKeysRaw) savedKeys = JSON.parse(savedKeysRaw);
    } catch {}

    const currentOrder = [...apiProviders].sort((a, b) => a.priority - b.priority);
    const activeCandidate = currentOrder.find(p => p.status !== 'error') || currentOrder[0];
    const providerId = activeCandidate.id;
    setActiveRoutedId(providerId);

    try {
      const response = await fetch('/api/cognitive/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          neuromodulators: { dopamine: currentDopamine, serotonin: currentSerotonin },
          world: activeWorld,
          hallucinating,
          activeProviderId: providerId,
          apiKey: savedKeys[providerId] || "",
          selectedModel: selectedModels[providerId] || "",
          max_tokens: tokenMode === 'MANUAL' ? tokenPreset : null,
          isManualTokenOverride: tokenMode === 'MANUAL'
        }),
      });
      const data = await response.json();
      
      let finalResponse = data.text || 'Flux cognitif stabilisé.';
      let action = '';
      let pensees = '';

      try {
        const parsed = extraireEtParserJsonRatiss(finalResponse);

        if (parsed && typeof parsed === 'object') {
          if (parsed.reponse) finalResponse = parsed.reponse;
          action = parsed.action || '';
          pensees = parsed.pensees || '';
        }
      } catch (jsonErr) {
        // Fallback sur le texte brut si le parsing échoue
      }

      setConsoleEntries(prev => [...prev, { 
        id: generateUniqueId('resp'), 
        timestamp: new Date().toLocaleTimeString(), 
        text: finalResponse, 
        type: 'response',
        action: action,
        pensees: pensees
      }]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsPending(false);
    }
  };

  const getDominantChemicalAmbiance = () => {
    if (currentDopamine > 0.68) return 'border-red-900/60 shadow-[0_0_90px_rgba(239,68,68,0.12)] bg-neutral-950/90';
    if (currentSerotonin > 0.65) return 'border-blue-900/40 shadow-[0_0_80px_rgba(59,130,246,0.08)] bg-neutral-950/90';
    return 'border-neutral-900 shadow-xl';
  };

  return (
    <div className={`min-h-screen bg-neutral-950 text-neutral-100 flex flex-col transition-all duration-300 ${getDominantChemicalAmbiance()}`}>
      <div className="fixed inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.22)_50%)] bg-[length:100%_4px] pointer-events-none z-50 opacity-50"></div>
      <HeaderFusion 
        supabaseConnected={isSupabaseConfigured} 
        currentWorld={activeWorld.name} 
        reveAutonome={hallucinating.isActive} 
        onOpenTokenSettings={() => setShowSettings(true)} 
      />

      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
        <div className="lg:col-span-8 flex flex-col gap-5 h-full">
          <div className="h-[460px] md:h-[500px] w-full">
            <BrainVisualizer sectors={sectors} neuromodulators={oscillatedNeuromodulators} activeWorld={activeWorld} isHallucinating={hallucinating.isActive} delta={hallucinating.delta} lastSedimentedSectorId={lastSedimentedSectorId} pulseTrigger={pulseTrigger} rigourLock={rigourLock} />
          </div>

          <MoteurSynthese 
            activeProviderId={activeRoutedId || 'gemini'} 
            apiKey={vaultKeys[activeRoutedId || 'gemini'] || ''}
            selectedModel={selectedModels[activeRoutedId || 'gemini'] || ''}
          />
          <Console entries={consoleEntries} jargonTerms={jargonTerms} onSendData={handleSendPrompt} onAddJargon={handleAddJargonBinding} isPending={isPending} isHallucinating={hallucinating.isActive} />
        </div>
        <div className="lg:col-span-4 flex flex-col gap-5 overflow-y-auto">
          <NeuromodulatorsGauges neuromodulators={oscillatedNeuromodulators} onUpdateValue={handleUpdateNeuromodulator} />
          <SectorsControl sectors={sectors} onUpdateOpacity={handleUpdateSectorOpacity} rigourLock={rigourLock} onToggleLock={handleToggleRigourLock} />
          <SimulatedWorlds worlds={worlds} activeWorldId={activeWorldId} onSelectWorld={handleSwitchWorld} onUpdateWorldConstants={onUpdateWorldConstants} />
          <HallucinationMonitor state={hallucinating} onToggleHallucination={handleToggleHallucination} onUpdateValues={handleUpdateHallucinationValues} onTriggerCollision={handleTriggerCollision} lastCollision={lastCollision} isPending={isPending} />
          <ArchiveSingularites />
          <ApiVault 
            providers={apiProviders} 
            onUpdatePriority={handleUpdateApiPriority} 
            onUpdateStatus={handleUpdateApiStatus} 
            isVaultAlarm={isVaultAlarm} 
            onTriggerFallbackDemo={handleTriggerFallbackDemo} 
            activeRoutedId={activeRoutedId} 
            selectedModels={selectedModels} 
            onSelectModel={handleSelectModel}
            vaultKeys={vaultKeys}
            onUpdateVaultKey={handleUpdateVaultKey}
          />
        </div>
      </main>

      <footer className="border-t border-neutral-900 bg-neutral-950 p-3.5 text-center text-[9px] font-mono text-neutral-600">
        RATISS © 4 FUSION CORE | USER_ID: {userId}
      </footer>

      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Ajustement des Jetons (Tokens)</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 flex flex-col gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-slate-400 uppercase tracking-widest">Configuration de Sortie</label>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tokenMode === 'AUTO' ? 'bg-cyan-500/20 text-cyan-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {tokenMode === 'AUTO' ? 'ORCHESTRATION ACTIVE' : 'MODE MANUEL'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                  <button
                    onClick={() => {
                      setTokenMode('AUTO');
                      setShowSettings(false);
                    }}
                    className={`py-2 rounded border text-[10px] font-bold transition-all ${
                      tokenMode === 'AUTO' 
                        ? 'bg-cyan-500 border-cyan-400 text-white shadow-lg shadow-cyan-900/40' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                    }`}
                  >
                    SYNC AUTO
                  </button>
                  {[200, 1000, 8000].map(val => (
                    <button
                      key={val}
                      onClick={() => {
                        setTokenPreset(val);
                        setTokenMode('MANUAL');
                      }}
                      className={`py-2 rounded border text-[10px] font-bold transition-all ${
                        tokenMode === 'MANUAL' && tokenPreset === val 
                          ? 'bg-amber-600 border-amber-500 text-white' 
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                      }`}
                    >
                      {val === 200 ? 'MIN' : val === 1000 ? 'MED' : 'MAX'}<br/>({val})
                    </button>
                  ))}
                </div>
              </div>
              
              {tokenMode === 'MANUAL' && (
                <button
                  onClick={handleApplyTokenPreset}
                  disabled={isApplyingPreset}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-amber-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isApplyingPreset ? 'CALIBRAGE MANUEL...' : 'VERROUILLER LES CONSTANTES'}
                </button>
              )}

              {tokenMode === 'AUTO' && (
                <p className="text-[10px] text-slate-500 italic text-center">
                  En mode AUTO, RATISS analyse ton message pour ajuster les ressources (200 à 8000 tokens).
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
