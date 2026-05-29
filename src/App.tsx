import { useState, useEffect, useRef } from 'react';
import { CognitiveSector, Neuromodulator, SimulatedWorld, HallucinationState, ApiProvider, ConsoleEntry, JargonTerm } from './types';
import { BrainVisualizer } from './components/BrainVisualizer';
import MoteurSynthese from './components/MoteurSynthese';
import { Console } from './components/Console';
import { SimulatedWorlds } from './components/SimulatedWorlds';
import { HallucinationMonitor } from './components/HallucinationMonitor';
import { SectorsControl } from './components/SectorsControl';
import { NeuromodulatorsGauges } from './components/NeuromodulatorsGauges';
import { ApiVault } from './components/ApiVault';
import ArchiveSingularites from './components/ArchiveSingularites';
import { Brain, Waves, Compass, Zap } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './supabase';

let lastId = 0;
function generateUniqueId(prefix: string = 'msg'): string {
  lastId += 1;
  return `${prefix}-${Date.now()}-${lastId}-${Math.random().toString(36).substring(2, 6)}`;
}

export default function App() {
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

  // 3. Initial State for Worlds
  const [worlds, setWorlds] = useState<SimulatedWorld[]>([
    { id: 'terre', name: 'Terre', gravity: 0.35, speed: 0.45, chaos: 0.15, description: 'Environnement physique de référence stable', colorPalette: { bg: 'neutral-950', primary: 'indigo-500', glow: 'rgba(99,102,241,0.2)' } },
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
  ]);

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

  // API alarm state (switches automatically on Gemini malfunction)
  const [isVaultAlarm, setIsVaultAlarm] = useState<boolean>(false);

  // 6. Jargon Terms lexical sédimentés
  const [jargonTerms, setJargonTerms] = useState<JargonTerm[]>([
    { concept: 'physique', jargon: 'physis', timestamp: 'Initial' },
    { concept: 'esprit', jargon: 'noos', timestamp: 'Initial' },
    { concept: 'chaotique', jargon: 'dopaminergique', timestamp: 'Initial' },
    { concept: 'attention', jargon: 'acetyl_focus', timestamp: 'Initial' },
  ]);

  // 7. Console history bootstrap
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([
    { id: '1', timestamp: '20:01:00', text: '[INFO] Initialisation du simulateur cognitif RATISS v3.4...', type: 'system' },
    { id: '2', timestamp: '20:01:01', text: '[INFO] Cartographie SQL vectorielle à 768 dimensions stabilisée.', type: 'system' },
    { id: '3', timestamp: '20:01:01', text: '[INFO] Connexion au ApiVault de secours établie avec succès.', type: 'system' },
    { id: '4', timestamp: '20:01:02', text: '[RATISS v3.4 CORE] Noyaux en attente. Introduisez un concept ou sédimentez du jargon : concept(:)jargon', type: 'system' },
  ]);

  const [isPending, setIsPending] = useState(false);
  const activeWorld = worlds.find(w => w.id === activeWorldId) || worlds[0];

  // Sedimentation shockwaves triggers for BrainVisualizer
  const [lastSedimentedSectorId, setLastSedimentedSectorId] = useState<string | null>(null);
  const [pulseTrigger, setPulseTrigger] = useState<number>(0);

  // Biological microcheck tick simulation loop for fluctuating (+/- 1% background oscillation noise)
  useEffect(() => {
    const interval = setInterval(() => {
      setTicker(t => t + 1);
    }, 125);
    return () => clearInterval(interval);
  }, []);

  // Compute actual oscillated displayed neuromodulators (+/- 1% noise) around target base neuromodulators.
  const oscillatedNeuromodulators = neuromodulators.map((nm, idx) => {
    const drift = Math.sin((ticker * 0.18) + (idx * 2.2)) * 0.0125;
    // ensure within secure 0.01 - 1.0 bounds
    const finalVal = Math.max(0.01, Math.min(1.0, nm.value + drift));
    return {
      ...nm,
      value: finalVal,
    };
  });

  // Extract displaying dopamine and serotonin for chemical body effects
  const currentDopamine = oscillatedNeuromodulators.find(n => n.id === 'dopamine')?.value || 0.55;
  const currentSerotonin = oscillatedNeuromodulators.find(n => n.id === 'serotonin')?.value || 0.60;

  // Supabase Real-Time WS/Subscription sync listeners connector
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    const neuromodulationChannel = supabase
      .channel('table_neuromodulation_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_neuromodulation' }, (payload) => {
        console.log('[SUPABASE REALTIME] Updates on table_neuromodulation:', payload);
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
        console.log('[SUPABASE REALTIME] Updates on table_secteurs_cognitifs:', payload);
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
        console.log('[SUPABASE REALTIME] Updates on table_hallucinations:', payload);
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
        console.log('[SUPABASE REALTIME] Insert on table_jargon:', payload);
        const data = payload.new as any;
        if (data && data.concept && data.jargon) {
          handleAddJargonBinding(data.concept, data.jargon);
        }
      })
      .subscribe();

    const vaultChannel = supabase
      .channel('table_vault_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_api_vault' }, (payload) => {
        console.log('[SUPABASE REALTIME] Updates on table_api_vault:', payload);
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

  // Closed loop / automated dream monologue periodically
  useEffect(() => {
    if (!hallucinating.isActive) return;

    const interval = setInterval(() => {
      setHallucinating(prev => {
        const dDrift = Math.max(0.1, Math.min(0.95, prev.delta + (Math.random() * 0.14 - 0.07)));
        const dDist = Math.max(0.1, Math.min(0.95, prev.distortion + (Math.random() * 0.10 - 0.05)));
        return { ...prev, delta: dDrift, distortion: dDist };
      });

      if (Math.random() < 0.25) {
        const dreamPhrases = [
          "[MODE RÊVE] Ondulation active de la matrice DECONSTR_MATRICE_REPR_768D.",
          "[MODE RÊVE] Les synapses transversales s'entrechoquent en boucle d'auto-reflexion.",
          "[MODE RÊVE] Delta drift sémantique critique : Arts & Spacialité s'harmonisent en micro-gravité.",
          "[MODE RÊVE] Sédimentation close : Sérotonine stabilisant l'inertie lente du réseau.",
          "[MODE RÊVE] Signal en boucle fermée. Déconnexion complète des entrées directes.",
        ];
        const randomPhrase = dreamPhrases[Math.floor(Math.random() * dreamPhrases.length)];
        setConsoleEntries(prev => [
          ...prev,
          {
            id: generateUniqueId('dream'),
            timestamp: new Date().toLocaleTimeString(),
            text: randomPhrase,
            type: 'system',
          }
        ]);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [hallucinating.isActive]);

  // Handle Sector opacities values (locks at 0.50 maximum if rigourLock is enclenched)
  const handleUpdateSectorOpacity = (id: string, opacity: number) => {
    setSectors(prev =>
      prev.map(sec => {
        if (sec.id === id) {
          let targetOp = opacity;
          if (rigourLock && targetOp > 0.50) {
            targetOp = 0.50;
          }
          return { ...sec, opacity: targetOp };
        }
        return sec;
      })
    );
  };

  // Toggle rigour lock state
  const handleToggleRigourLock = () => {
    const nextLockState = !rigourLock;
    setRigourLock(nextLockState);

    // If clamping limit, push any values currently greater than 0.50 back to 0.50
    if (nextLockState) {
      setSectors(prev =>
        prev.map(sec => (sec.opacity > 0.50 ? { ...sec, opacity: 0.50 } : sec))
      );
    }

    setConsoleEntries(prev => [
      ...prev,
      {
        id: generateUniqueId('lock'),
        timestamp: new Date().toLocaleTimeString(),
        text: nextLockState
          ? '[REGIME RIGUEUR] Filtre sémantique verouillé à 0.50. Nettoyage et discipline des flux d\'énergie réguliers activés.'
          : '[REGIME TOTAL DEBRIDÉ] Filtre sémantique révoqué. Intensité lumineuse sédimentée à 100%. Activité synaptique maximale.',
        type: 'system',
      }
    ]);
  };

  // Handle Neuromodulators edits
  const handleUpdateNeuromodulator = (id: string, value: number) => {
    setNeuromodulators(prev =>
      prev.map(neuro => {
        if (neuro.id === id) {
          if (id === 'dopamine') {
            onUpdateWorldConstants(activeWorldId, { chaos: Math.max(0.01, value * 1.1) });
          }
          return { ...neuro, value };
        }
        return neuro;
      })
    );
  };

  // Handle World switching with drastic visual properties modifications
  const handleSwitchWorld = (id: string) => {
    setActiveWorldId(id);
    const selected = worlds.find(w => w.id === id);
    if (!selected) return;

    // Drastic custom simulation tuning matching specific worlds:
    if (id === 'chaos_quantique') {
      // Explode dopamine and chaos constants!
      setNeuromodulators(prev =>
        prev.map(nm => (nm.id === 'dopamine' ? { ...nm, value: 0.95 } : nm))
      );
    } else if (id === 'vide_absolu') {
      // Reduce dopamine, set slow inert speed
      setNeuromodulators(prev =>
        prev.map(nm => (nm.id === 'dopamine' ? { ...nm, value: 0.15 } : nm))
      );
    }

    setConsoleEntries(prev => [
      ...prev,
      {
        id: generateUniqueId('world'),
        timestamp: new Date().toLocaleTimeString(),
        text: `Commutation physique : MONDE [${selected.name.toUpperCase()}] engagé. G=${selected.gravity.toFixed(2)}G | SPEED=${selected.speed.toFixed(2)}x | NOISE=${(selected.chaos*100).toFixed(0)}%`,
        type: 'system',
      }
    ]);
  };

  const onUpdateWorldConstants = (worldId: string, constants: Partial<SimulatedWorld>) => {
    setWorlds(prev =>
      prev.map(w => (w.id === worldId ? { ...w, ...constants } : w))
    );
  };

  const handleTriggerCollision = async () => {
    setIsPending(true);
    
    let savedKeys: Record<string, string> = {};
    try {
      const savedKeysRaw = localStorage.getItem('ratiss_vault_keys');
      if (savedKeysRaw) {
        savedKeys = JSON.parse(savedKeysRaw);
      }
    } catch {}

    const sortedOrder = [...apiProviders].sort((a, b) => a.priority - b.priority);
    const activeCandidate = sortedOrder.find(p => p.status !== 'error') || sortedOrder[0];
    const providerId = activeCandidate?.id || 'gemini';
    const providerName = activeCandidate?.name || 'Google Gemini';
    const candidateApiKey = savedKeys[providerId] || "";

    setConsoleEntries(prev => [
      ...prev,
      {
        id: generateUniqueId('coll-init'),
        timestamp: new Date().toLocaleTimeString(),
        text: `[CLOSED MODE COLLISION] Déclenchement du moteur de collision sémantique forcée (Attracteur 768D) via ${providerName}...`,
        type: 'system',
      }
    ]);

    try {
      const response = await fetch('/api/cognitive/collision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jargonTerms,
          activeProviderId: providerId,
          apiKey: candidateApiKey,
          selectedModel: selectedModels[providerId] || "",
        }),
      });

      if (!response.ok) {
        throw new Error(`Erreur réseau HTTP ${response.status}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const textResponse = await response.text();
        if (textResponse.trim().startsWith('<!DOCTYPE') || textResponse.trim().startsWith('<html')) {
          throw new Error("L'architecture de collision est en cours de déploiement ou de compilation du serveur. Veuillez patienter 5 à 10 secondes puis ré-essayer.");
        }
        throw new Error(`Réponse inattendue (non-JSON) : ${contentType}`);
      }

      const resData = await response.json();
      if (resData.success) {
        const resultObj = {
          secteurs: resData.secteurs,
          concept: resData.concept,
          logique: resData.logique,
          application: resData.application,
        };
        
        setLastCollision(resultObj);
        localStorage.setItem('ratiss_last_collision', JSON.stringify(resultObj));

        // Lucidity Filter constants (sigma)
        // High stability if delta drift is low
        const sigma = parseFloat(((1 - hallucinating.delta * 0.45)).toFixed(2));
        const distortionPercent = Math.round(hallucinating.distortion * 100);
        const listSecteurs = resData.secteurs.split(/⚡|\[|\]/).map((s: string) => s.trim()).filter((s: string) => s && !s.includes('S'));

        // Save immediately to local archive array
        try {
          const freshLocal = {
            id: 'local_' + Date.now(),
            created_at: new Date().toISOString(),
            secteurs_impactes: resData.secteurs,
            concept_hybride: resData.concept,
            logique: resData.logique,
            application_2026: resData.application,
            score_coherence: Math.round(sigma * 100),
            is_stable: sigma >= 0.72
          };
          const existingRaw = localStorage.getItem('ratiss_archive_singularites');
          const existingList = existingRaw ? JSON.parse(existingRaw) : [];
          existingList.unshift(freshLocal);
          localStorage.setItem('ratiss_archive_singularites', JSON.stringify(existingList));
          
          window.dispatchEvent(new Event('storage_archive_update'));
          window.dispatchEvent(new Event('storage'));
        } catch (err) {
          console.warn("Could not write to local archive storage in App.tsx", err);
        }

        setConsoleEntries(prev => [
          ...prev,
          {
            id: generateUniqueId('coll-res'),
            timestamp: new Date().toLocaleTimeString(),
            text: `[COLLISION AUTOMATIQUE 76ERS-D]\n⚡ Secteurs Impactés : ${resData.secteurs}\n✨ Concept Hybride : ${resData.concept}\n📖 Logique (:) : ${resData.logique}\n⚙️ Application 2026 : ${resData.application}`,
            type: 'response',
          }
        ]);

        // Integration et Transfert Automatique (LABO_EMERGENCE)
        if (isSupabaseConfigured && supabase) {
          try {
            // 1. Initial log in table_hallucinations
            await supabase.from('table_hallucinations').insert({
              is_active: true,
              delta: hallucinating.delta,
              distortion: hallucinating.distortion,
              secteurs_impactes: resData.secteurs,
              concept_hybride: resData.concept,
              logique: resData.logique,
              application_2026: resData.application,
              is_stable: sigma >= 0.72,
              score_coherence: Math.round(sigma * 100),
              title_or_tag: "[COLLISION AUTOMATIQUE 76ERS-D]"
            });

            // 2. Transfert vers le Tableau de Bord (LABO_EMERGENCE) if stable
            if (sigma >= 0.72) {
              const texteImminent = `
🔬 UNIQUE CONCEPT HYBRIDE : ${resData.concept.toUpperCase()}
⚡ COUPLAGE DES SECTEURS : ${resData.secteurs}
📈 CONSTANTES : Sigma = ${sigma} | Distorsion = ${distortionPercent}%

📖 LOGIQUE (:) : 
${resData.logique}

⚙️ APPLICATION INSTANTANÉE (2026) :
${resData.application} (Déploiement via infra RATISS v3.4).
`.trim();

              await supabase.from('LABO_EMERGENCE').insert([{
                titre: resData.concept,
                bloc_textuel: texteImminent,
                coherence_score: sigma,
                timestamp: new Date().toISOString(),
                tags_secteurs: listSecteurs.length > 0 ? listSecteurs : [resData.secteurs]
              }]);

              setConsoleEntries(prev => [
                ...prev,
                {
                  id: generateUniqueId('transfer'),
                  timestamp: new Date().toLocaleTimeString(),
                  text: `[SYS] [PROFIL LUCIDE] Transfert réussi pour : ${resData.concept} (Sigma: ${sigma}) -> LABO_EMERGENCE`,
                  type: 'system',
                }
              ]);
            } else {
              setConsoleEntries(prev => [
                ...prev,
                {
                  id: generateUniqueId('sigma-rev'),
                  timestamp: new Date().toLocaleTimeString(),
                  text: `[SYS] Inertie sémantique insuffisante (${sigma}). Rejet du transfert vers LABO_EMERGENCE.`,
                  type: 'system',
                }
              ]);
            }
          } catch (supErr: any) {
            console.warn("Transfert error:", supErr.message);
          }
        }
      } else {
        throw new Error(resData.error || "La collision sémantique n'a rien produit.");
      }
    } catch (error: any) {
      console.warn("Semantic collision error:", error);
      setConsoleEntries(prev => [
        ...prev,
        {
          id: generateUniqueId('coll-err'),
          timestamp: new Date().toLocaleTimeString(),
          text: `[DIVERGENCE COLLISION] Impossible d'achever la collision : ${error.message}`,
          type: 'error',
        }
      ]);
    } finally {
      setIsPending(false);
    }
  };

  const handleToggleHallucination = (target: boolean) => {
    setHallucinating(prev => ({ ...prev, isActive: target }));
    setConsoleEntries(prev => [
      ...prev,
      {
        id: generateUniqueId('hallucination'),
        timestamp: new Date().toLocaleTimeString(),
        text: target
          ? '[CYCLE FERMÉ] Déconnexion synaptique de l\'input direct. Lancement de l\'ondulation DECONSTR_MATRICE_REPR_768D (Mode Rêve).'
          : '[SYSTEM] Rétablissement du canal d\'input sémantique. Sortie du Mode Rêve.',
        type: 'system',
      }
    ]);
    
    if (target) {
      setTimeout(() => {
        handleTriggerCollision();
      }, 500);
    }
  };

  const handleUpdateHallucinationValues = (delta: number, distortion: number) => {
    setHallucinating(prev => ({ ...prev, delta, distortion }));
  };

  // Manual & Realtime Jargon binding sedimentation with Canvas shockwave propagation trigger
  const handleAddJargonBinding = (concept: string, jargon: string) => {
    const conceptCleaned = concept.toLowerCase().trim();
    
    // Auto-detect matching sector to shoot concentric ripple wave from
    const matchedSector = sectors.find(
      s => s.id === conceptCleaned || s.name.toLowerCase() === conceptCleaned || s.codename.toLowerCase() === conceptCleaned
    );

    const sourceSectorId = matchedSector ? matchedSector.id : 'philosophie';

    // Spark concentric canvas ripple
    setLastSedimentedSectorId(sourceSectorId);
    setPulseTrigger(prev => prev + 1);

    const newTerm: JargonTerm = {
      concept,
      jargon,
      timestamp: new Date().toLocaleTimeString(),
    };
    
    setJargonTerms(prev => [newTerm, ...prev]);

    setConsoleEntries(prev => [
      ...prev,
      {
        id: generateUniqueId('sed'),
        timestamp: new Date().toLocaleTimeString(),
        text: `[SÉDIMENTATION RÉUSSIE] Apprentissage : '${concept}' lié à la clé sémantique '${jargon}'. Impulsion lumineuse en cours vers MÉTACOGNITION...`,
        type: 'sedimentation',
      }
    ]);
  };

  const handleUpdateApiPriority = (id: string, newPriority: number) => {
    setApiProviders(prev => {
      const targetProvider = prev.find(p => p.id === id);
      if (!targetProvider) return prev;

      setConsoleEntries(c => [
        ...c,
        {
          id: generateUniqueId('cfg'),
          timestamp: new Date().toLocaleTimeString(),
          text: `[RECONFIGURATION] Réallocation de priorité : '${targetProvider.name}' réglé en Priorité ${newPriority}.`,
          type: 'system',
        }
      ]);

      return prev.map(p => p.id === id ? { ...p, priority: newPriority } : p);
    });
  };

  const handleUpdateApiStatus = (id: string, status: 'active' | 'switching' | 'error') => {
    setApiProviders(prev => prev.map(p => (p.id === id ? { ...p, status } : p)));
  };

  // High-fidelity secure automatic API vault simulation of failover switching
  const handleTriggerFallbackDemo = () => {
    setIsVaultAlarm(true);
    
    // Find who is current active routed provider
    const currentOrder = [...apiProviders].sort((a, b) => a.priority - b.priority);
    const activeProv = currentOrder.find(p => p.status !== 'error') || currentOrder[0];

    // Mark the active provider as failing (QUOTA ÉPUISÉ) to trigger failover
    setApiProviders(prev =>
      prev.map(p => (p.id === activeProv.id ? { ...p, status: 'error' } : p))
    );

    setConsoleEntries(prev => [
      ...prev,
      {
        id: generateUniqueId('err'),
        timestamp: new Date().toLocaleTimeString(),
        text: `[SECURE_PANNE] Perte de liaison critique sur '${activeProv.name.toUpperCase()}'. Code 429 (Quota épuisé). Routage d'urgence en cours...`,
        type: 'error',
      }
    ]);

    // Show restore logs after a short latency delay
    setTimeout(() => {
      setIsVaultAlarm(false);
      
      setApiProviders(prev => {
        const updatedOrder = [...prev].sort((a, b) => a.priority - b.priority);
        const nextActive = updatedOrder.find(p => p.status !== 'error');

        setConsoleEntries(c => [
          ...c,
          {
            id: generateUniqueId('sys'),
            timestamp: new Date().toLocaleTimeString(),
            text: nextActive 
              ? `[API VAULT] Basculement à chaud stabilisé vers '${nextActive.name}' (Priorité ${nextActive.priority}) résistant.`
              : `[API VAULT CRITIQUE] Rupture totale détectée. Aucun fournisseur d'accès résistant résiduel dans l'ApiVault.`,
            type: 'system',
          }
        ]);
        return prev;
      });
    }, 1500);
  };

  // Proxy-Gemini / local simulation sender with multi-attempt priority failover routing
  const handleSendPrompt = async (text: string) => {
    setIsPending(true);

    const userMsgId = generateUniqueId('usr');
    setConsoleEntries(prev => {
      if (prev.some(entry => entry.id === userMsgId)) return prev;
      return [
        ...prev,
        { id: userMsgId, timestamp: new Date().toLocaleTimeString(), text, type: 'input' }
      ];
    });

    // Secondary parsing check for manual "concept(:)jargon" in standard text input if they forgot direct anchor
    if (text.includes('(:)')) {
      const parts = text.split('(:)');
      if (parts.length === 2) {
        handleAddJargonBinding(parts[0].trim(), parts[1].trim());
        setIsPending(false);
        return;
      }
    }

    // Load active vault keys
    let savedKeys: Record<string, string> = {};
    try {
      const savedKeysRaw = localStorage.getItem('ratiss_vault_keys');
      if (savedKeysRaw) {
        savedKeys = JSON.parse(savedKeysRaw);
      }
    } catch (e) {
      console.warn("Could not parse ratiss_vault_keys", e);
    }

    let currentProvidersState = [...apiProviders];
    let attemptSucceeded = false;
    let failoverTraceAdded = false;

    // Precalculate initial routing active candidate uniquely index wise
    const initialOrder = [...currentProvidersState].sort((a, b) => a.priority - b.priority);
    const initialCandidate = initialOrder.find(p => p.status !== 'error') || initialOrder[0];
    if (initialCandidate) {
      setActiveRoutedId(initialCandidate.id);
    }

    for (let attempt = 0; attempt < 4; attempt++) {
      const currentOrder = [...currentProvidersState].sort((a, b) => a.priority - b.priority);
      const activeCandidate = currentOrder.find(p => p.status !== 'error');

      if (!activeCandidate) {
        setConsoleEntries(prev => [
          ...prev,
          {
            id: generateUniqueId('err-divergence'),
            timestamp: new Date().toLocaleTimeString(),
            text: `[DIVERGENCE CRITIQUE] RUPTURE TOTALE : Aucun canal ApiVault n'est fonctionnel. Sédimentation bloquée.`,
            type: 'error',
          }
        ]);
        setActiveRoutedId(null);
        break;
      }

      const providerId = activeCandidate.id;
      const providerName = activeCandidate.name;
      setActiveRoutedId(providerId);

      setConsoleEntries(prev => [
        ...prev,
        {
          id: generateUniqueId(`route-${attempt}`),
          timestamp: new Date().toLocaleTimeString(),
          text: `[ROUTAGE FLUX] Routage de la transmission sémantique via '${providerName.toUpperCase()}' (Priorité ${activeCandidate.priority})...`,
          type: 'system',
        }
      ]);

      try {
        const sectorsMap = sectors.reduce((acc, sec) => {
          acc[sec.id] = sec.opacity;
          return acc;
        }, {} as Record<string, number>);

        const candidateApiKey = savedKeys[providerId] || "";

        // Call Express routing proxy
        const response = await fetch('/api/cognitive/prompt', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: text,
            neuromodulators: {
              dopamine: currentDopamine,
              serotonin: currentSerotonin,
              noradrenaline: neuromodulators.find(n => n.id === 'noradrenaline')?.value || 0.5,
              acetylcholine: neuromodulators.find(n => n.id === 'acetylcholine')?.value || 0.5,
            },
            world: activeWorld,
            hallucinating,
            sectorsMap,
            activeProviderName: providerName,
            activeProviderId: providerId,
            apiKey: candidateApiKey,
            selectedModel: selectedModels[providerId] || "",
          }),
        });

        if (!response.ok) {
          throw new Error(`Erreur réseau HTTP ${response.status}`);
        }

        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          const textResponse = await response.text();
          if (textResponse.trim().startsWith('<!DOCTYPE') || textResponse.trim().startsWith('<html')) {
            throw new Error("Le pont d'API du simulateur s'initialise en arrière-plan. Veuillez patienter quelques secondes.");
          }
          throw new Error(`Réponse inattendue (non-JSON) : ${contentType}`);
        }

        const data = await response.json();

        if (data.offline || data.success === false) {
          throw new Error(data.error || data.text || "Échec d'authentification ou quota épuisé.");
        }

        // Output response successfully received
        setConsoleEntries(prev => [
          ...prev,
          {
            id: generateUniqueId(`resp-${attempt}`),
            timestamp: new Date().toLocaleTimeString(),
            text: `[RÉPONSE ${providerId.toUpperCase()}] ${data.text || 'Flux cognitif stabilisé.'}`,
            type: 'response',
          }
        ]);
        attemptSucceeded = true;
        break; // Stop immediately as we successfully got a response!

      } catch (err: any) {
        console.warn(`[FAILOVER ROUTER] Error with provider ${providerName}:`, err);

        // Update the candidate's status to error in our local iteration state and state hooks
        currentProvidersState = currentProvidersState.map(p => p.id === providerId ? { ...p, status: 'error' as const } : p);
        setApiProviders(prev => prev.map(p => p.id === providerId ? { ...p, status: 'error' } : p));

        // Sound visual alarm indicators
        setIsVaultAlarm(true);

        // Advance visual routed helper onto next non-error candidate
        const nextOrder = [...currentProvidersState].sort((a, b) => a.priority - b.priority);
        const nextCandidate = nextOrder.find(p => p.status !== 'error');
        if (nextCandidate) {
          setActiveRoutedId(nextCandidate.id);
        } else {
          setActiveRoutedId(null);
        }

        setConsoleEntries(prev => [
          ...prev,
          {
            id: generateUniqueId(`err-quota-${attempt}`),
            timestamp: new Date().toLocaleTimeString(),
            text: `[ALERTE QUOTA / RUPTURE] Le canal '${providerName.toUpperCase()}' a échoué. Cause: ${err.message}`,
            type: 'error',
          }
        ]);

        failoverTraceAdded = true;
      }
    }

    if (attemptSucceeded) {
      setIsVaultAlarm(false);
      if (failoverTraceAdded) {
        setConsoleEntries(prev => [
          ...prev,
          {
            id: generateUniqueId('vault-recovered'),
            timestamp: new Date().toLocaleTimeString(),
            text: `[API VAULT] Reprise et ré-aiguillage du signal réussis. Liaison restaurée.`,
            type: 'system',
          }
        ]);
      }
    }

    setIsPending(false);
  };

  // Glow ambiance calculations based on chemical balance
  const getDominantChemicalAmbiance = () => {
    if (currentDopamine > 0.68) {
      return 'border-red-900/60 shadow-[0_0_90px_rgba(239,68,68,0.12)] bg-neutral-950/90';
    }
    if (currentSerotonin > 0.65) {
      return 'border-blue-900/40 shadow-[0_0_80px_rgba(59,130,246,0.08)] bg-neutral-950/90';
    }
    return 'border-neutral-900 shadow-xl';
  };

  return (
    <div className={`min-h-screen bg-neutral-950 text-neutral-100 flex flex-col transition-all duration-300 ${getDominantChemicalAmbiance()}`}>
      
      {/* Laser scanlines aesthetic backdrop overlay */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.22)_50%)] bg-[length:100%_4px] pointer-events-none z-50 opacity-50"></div>

      {/* Header element */}
      <header className="border-b border-neutral-905/80 bg-neutral-950/95 p-4 sticky top-0 z-30 flex flex-col md:flex-row items-center justify-between gap-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg flex items-center justify-center border transition-all duration-300 ${
            currentDopamine > 0.68 
              ? 'bg-red-950/60 border-red-500/50 text-red-400 animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.4)]'
              : 'bg-indigo-950/45 border-indigo-900/60 text-indigo-400'
          }`}>
            <Brain size={24} className={currentDopamine > 0.68 ? 'animate-bounce' : 'animate-pulse'} />
          </div>
          <div className="text-left font-mono">
            <h1 className="text-md sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              SIMULATEUR COGNITIF RATISS <span className="text-[10px] bg-indigo-900/60 text-indigo-300 font-bold px-1.5 py-0.5 rounded border border-indigo-800">v3.4_768D</span>
            </h1>
            <p className="text-[10px] text-neutral-500 tracking-tight font-medium uppercase">
              Synaptic Topology • Biometric micro-fluctuations & failover security
            </p>
          </div>
        </div>

        {/* Real-time status badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 font-mono text-[10px] text-neutral-400">
          {isSupabaseConfigured && (
            <div className="flex items-center gap-1.5 bg-emerald-950/20 border border-emerald-800 text-emerald-300 px-2 py-1 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>SUPABASE REALTIME CONNECTED</span>
            </div>
          )}
          <div className="flex items-center gap-1 bg-neutral-900/70 px-2 py-1 rounded border border-neutral-800">
            <Compass size={11} className="text-indigo-400" />
            <span>M_WORLD: <b className="text-white uppercase font-bold">{activeWorld.name}</b></span>
          </div>
          <div className="flex items-center gap-1 bg-neutral-900/70 px-2 py-1 rounded border border-neutral-800">
            <Waves size={11} className="text-purple-400" />
            <span>RÊVE_AUTONOME: <b className={hallucinating.isActive ? 'text-purple-400 font-bold' : 'text-neutral-500'}>{hallucinating.isActive ? 'ACTIF' : 'INACTIF'}</b></span>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 overflow-hidden">
        
        {/* LEFT COMPONENT (Brain visualizer + Lexicon logs Console) */}
        <div className="lg:col-span-8 flex flex-col gap-5 h-full">
          <div className="h-[460px] md:h-[500px] w-full flex-shrink-0">
            <BrainVisualizer
              sectors={sectors}
              neuromodulators={oscillatedNeuromodulators}
              activeWorld={activeWorld}
              isHallucinating={hallucinating.isActive}
              delta={hallucinating.delta}
              lastSedimentedSectorId={lastSedimentedSectorId}
              pulseTrigger={pulseTrigger}
              rigourLock={rigourLock}
            />
          </div>

          <MoteurSynthese 
            activeProviderId={activeRoutedId || 'gemini'} 
            apiKey={(() => {
              try {
                const keys = JSON.parse(localStorage.getItem('ratiss_vault_keys') || '{}');
                return keys[activeRoutedId || 'gemini'] || '';
              } catch { return ''; }
            })()}
            selectedModel={selectedModels[activeRoutedId || 'gemini'] || ''}
          />

          <div className="flex-1">
            <Console
              entries={consoleEntries}
              jargonTerms={jargonTerms}
              onSendData={handleSendPrompt}
              onAddJargon={handleAddJargonBinding}
              isPending={isPending}
              isHallucinating={hallucinating.isActive}
            />
          </div>
        </div>

        {/* RIGHT COLUMN (Control dials & sliders widgets) */}
        <div className="lg:col-span-4 flex flex-col gap-5 overflow-y-auto">
          {/* 1. Bio-levels neuromodulators (with display oscillation values) */}
          <NeuromodulatorsGauges
            neuromodulators={oscillatedNeuromodulators}
            onUpdateValue={handleUpdateNeuromodulator}
          />

          {/* 2. Equalizer opacities vertical sliders */}
          <SectorsControl
            sectors={sectors}
            onUpdateOpacity={handleUpdateSectorOpacity}
            rigourLock={rigourLock}
            onToggleLock={handleToggleRigourLock}
          />

          {/* 3. Simulated environment selection */}
          <SimulatedWorlds
            worlds={worlds}
            activeWorldId={activeWorldId}
            onSelectWorld={handleSwitchWorld}
            onUpdateWorldConstants={onUpdateWorldConstants}
          />

          {/* 4. Dream mode Delta / Distortion controllers */}
          <HallucinationMonitor
            state={hallucinating}
            onToggleHallucination={handleToggleHallucination}
            onUpdateValues={handleUpdateHallucinationValues}
            onTriggerCollision={handleTriggerCollision}
            lastCollision={lastCollision}
            isPending={isPending}
          />

          {/* L'Archive des Singularités (Rêves Lucides) */}
          <ArchiveSingularites />

          {/* 5. Safe API failover vault */}
          <ApiVault
            providers={apiProviders}
            onUpdatePriority={handleUpdateApiPriority}
            onUpdateStatus={handleUpdateApiStatus}
            isVaultAlarm={isVaultAlarm}
            onTriggerFallbackDemo={handleTriggerFallbackDemo}
            activeRoutedId={activeRoutedId}
            selectedModels={selectedModels}
            onSelectModel={handleSelectModel}
          />
        </div>
      </main>

      {/* Regulatory footer info */}
      <footer className="border-t border-neutral-900/60 bg-neutral-950 p-3.5 text-center text-[9px] font-mono text-neutral-600 select-none flex flex-col sm:flex-row items-center justify-between px-6 gap-2">
        <span>MODE BIO-COGNITIF COORDONNÉ RATISS © v3.4 CORE - ARCHITECTURE INTÉGRALE TEMPS-RÉEL RE-BRANCHÉE</span>
        <span>LATENCE SYSTEME: 1.1ms | TOPOLOGIE_CONST: 768-D CORE | SECURISÉ SEC_API_KEY</span>
      </footer>
    </div>
  );
}
