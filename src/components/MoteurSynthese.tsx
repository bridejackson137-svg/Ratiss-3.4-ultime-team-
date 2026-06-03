import React, { useState, useRef, useEffect } from 'react';
import { Brain, Zap, Loader2, Sparkles, Terminal, Info, Copy, Check, RefreshCw, Maximize2, Minimize2, ChevronDown, ChevronRight, Hash, Search } from 'lucide-react';
import { sauvegarderMessage } from '../lib/ratissMemory';
import { supabase, isSupabaseConfigured } from '../supabase';
import { ConceptExtended } from '../types';
import { ArreterAbsolumentToutAudio, gererFluxAudioUnique } from '../ratissAudioCore';

interface MoteurSyntheseProps {
  activeProviderId: string;
  apiKey: string;
  selectedModel: string;
}

export default function MoteurSynthese({ activeProviderId, apiKey, selectedModel }: MoteurSyntheseProps) {
  const [vecteurRecherche, setVecteurRecherche] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [historiqueInferences, setHistoriqueInferences] = useState<ConceptExtended[]>([]);
  const [logsState, setLogsState] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [isSpeechPaused, setIsSpeechPaused] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeSpeechIdRef = useRef<string | null>(null);
  const activeSpeechCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    activeSpeechIdRef.current = activeSpeechId;
  }, [activeSpeechId]);

  // Stop active speech on unmount and listen to global stop events
  useEffect(() => {
    const handleGlobalSpeechStop = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // Arrêter tout si sourceId est null (via __ratissStopAllSpeech) ou si différent
      if (detail && (detail.sourceId === null || detail.sourceId !== activeSpeechIdRef.current)) {
        if (activeSpeechCancelRef.current) {
          activeSpeechCancelRef.current();
          activeSpeechCancelRef.current = null;
        }
        setIsSpeechPaused(false);
        setActiveSpeechId(null);
      }
    };
    window.addEventListener('app-speech-stop', handleGlobalSpeechStop);

    return () => {
      if (activeSpeechCancelRef.current) {
        activeSpeechCancelRef.current();
        activeSpeechCancelRef.current = null;
      }
      setIsSpeechPaused(false);
      window.speechSynthesis.cancel();
      window.removeEventListener('app-speech-stop', handleGlobalSpeechStop);
    };
  }, []);

  const calibrerEtEpurerTexte = (text: string, texteSaisiUtilisateur: string = ""): string => {
    const estUneSalutation = /^(bonjour|salut|hello|présente|qui es-tu)/i.test(texteSaisiUtilisateur.trim());
    let cleanText = text;

    if (!estUneSalutation) {
      cleanText = cleanText.replace(/(en tant qu'intelligence artificielle|je suis le système ratiss|en utilisant l'IA de gemini)/gi, "");
      cleanText = cleanText.replace(/^(réponse gemini\s*[:\-]*|calcul matriciel\s*[:\-]*|intention\s*[:\-]*|indexation\s*[:\-]*|réponse\s*[:\-]*|auteur\s*[:\-]*)/gi, "");
    } else {
      cleanText = cleanText.replace(/^(réponse gemini\s*[:\-]*|calcul matriciel\s*[:\-]*|intention\s*[:\-]*|indexation\s*[:\-]*|réponse\s*[:\-]*|auteur\s*[:\-]*)/gi, "Oui, bonjour. ");
    }

    const jargonAEviter = /(dopaminergique[s]?|sérotoninergique[s]?|dopamine|sérotonine|isomorphisme projectif|gradient de néguentropie|table RLS|sécurité failover)/gi;
    cleanText = cleanText.replace(jargonAEviter, (match) => {
      const lower = match.toLowerCase();
      if (lower.startsWith('dopa') || lower.startsWith('séro')) {
        return "efficace";
      }
      return "liaison";
    });

    cleanText = cleanText
      .replace(/\*/g, "")
      .replace(/[\/\\]/g, " ")
      .replace(/[\#\_]/g, "")
      .replace(/\[.*?\]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return cleanText;
  };

  const handleTogglePause = () => {
    if (!activeSpeechId) return;
    
    if (isSpeechPaused) {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      setIsSpeechPaused(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
      }
      setIsSpeechPaused(true);
    }
  };

  const handleTTS = async (item: ConceptExtended) => {
    if (activeSpeechId === item.id) {
       ArreterAbsolumentToutAudio();
       setActiveSpeechId(null);
       return;
    }

    ArreterAbsolumentToutAudio();
    setActiveSpeechId(item.id);

    const rawText = `${item.titre}. ${item.logique}. Application : ${item.application}`;
    await gererFluxAudioUnique(rawText);

    if (activeSpeechIdRef.current === item.id) {
      setActiveSpeechId(null);
    }
  };

  // UI CONTROLS
  const [isReplie, setIsReplie] = useState(false);
  const [isPleinEcran, setIsPleinEcran] = useState(false);

  const pushLog = (msg: string) => {
    setLogsState(prev => [...prev, `[SYS] ${msg}`]);
  };

  const déclencherFlux = async (mode: 'standard' | 'indexed') => {
    if (mode === 'indexed' && !vecteurRecherche.trim()) return;

    setIsCalculating(true);
    setLogsState([]);
    setIsReplie(false);

    pushLog(mode === 'indexed' ? "Verrouillage de l'Ancre d'Intention..." : "Activation de l'Hallucination Standard...");

    try {
      const response = await fetch("/api/cognitive/batch-synthetise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intention: vecteurRecherche,
          mode,
          activeProviderId,
          apiKey,
          selectedModel
        })
      });

      if (!response.ok || !response.headers.get("content-type")?.includes("application/json")) {
        throw new Error(`API Error: Serveur indisponible ou erreur (${response.status})`);
      }
      const data = await response.json();

      if (data.success && data.concepts && data.concepts.length > 0) {
        const concept = data.concepts[0];
        const newInference: ConceptExtended = {
          ...concept,
          id: Math.random().toString(36).substring(7),
          isExpanded: true,
          timestamp: new Date().toLocaleTimeString()
        };

        setHistoriqueInferences(prev => [newInference, ...prev.map(h => ({ ...h, isExpanded: false }))]);
        pushLog("Sédimentation terminée.");

        if (isSupabaseConfigured && supabase) {
          const bloc_textuel = `[${concept.secteurs.toUpperCase()}]\n\nTITRE: ${concept.titre}\n\nLOGIQUE:\n${concept.logique}\n\nAPPLICATION:\n${concept.application}`;
          await supabase.from('LABO_EMERGENCE').insert([{
            titre: concept.titre,
            bloc_textuel,
            coherence_score: concept.is_guided ? 0.84 : 0.74,
            is_stable: true,
            timestamp: new Date().toISOString(),
            tags_secteurs: [concept.secteurs]
          }]);
          window.dispatchEvent(new Event('storage_archive_update'));
        }
      } else {
        pushLog(`[DIVERGENCE] ${data.error || "Rupture de signal"}`);
      }
    } catch (err: any) {
      pushLog(`[ERREUR] ${err.message}`);
    } finally {
      setIsCalculating(false);
    }
  };

  const toggleAccordion = (id: string) => {
    setHistoriqueInferences(prev => prev.map(item => 
      item.id === id ? { ...item, isExpanded: !item.isExpanded } : item
    ));
  };

  const handleCopy = (item: ConceptExtended) => {
    const text = `TITRE: ${item.titre}\nLOGIQUE:\n${item.logique}\nAPPLICATION (2026):\n${item.application}`;
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div 
      className={`w-full space-y-4 font-mono transition-all duration-500 ${
        isPleinEcran ? 'fixed inset-0 z-[100] bg-black p-10 overflow-auto' : ''
      }`}
    >
      {/* 1. INPUT INDEXATION */}
      <div className="bg-neutral-950/60 border border-purple-900/30 p-5 rounded-2xl shadow-xl backdrop-blur-md">
        <span className="text-[10px] text-purple-400 uppercase font-black block mb-4 tracking-[0.2em] flex items-center gap-2">
          <Zap size={12} className="text-purple-500 animate-pulse" />
          Mode Hallucination Indexée
        </span>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600" size={14} />
            <input 
              type="text" 
              className="w-full bg-black/40 border border-neutral-800 rounded-xl p-3 pl-10 text-xs text-emerald-400 focus:outline-none focus:border-purple-500/40 transition-all placeholder:text-neutral-800"
              placeholder="Vecteur d'intention..."
              value={vecteurRecherche}
              onChange={(e) => setVecteurRecherche(e.target.value)}
              disabled={isCalculating}
            />
          </div>
          <button 
            onClick={() => déclencherFlux('indexed')}
            disabled={isCalculating || !vecteurRecherche.trim()}
            className="bg-purple-900/40 hover:bg-purple-700 text-purple-200 px-6 py-3 text-[10px] font-black rounded-xl uppercase tracking-widest border border-purple-500/20 active:scale-95 disabled:opacity-20 transition-all"
          >
            {isCalculating ? '...' : 'INDEXER'}
          </button>
        </div>
      </div>

      {/* 2. BOUTON ZAPPING STANDARD */}
      <button 
        onClick={() => déclencherFlux('standard')}
        disabled={isCalculating}
        className="w-full py-4 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 rounded-2xl transition-all flex items-center justify-center gap-4 active:scale-[0.99] group shadow-xl"
      >
        {isCalculating ? (
          <><Loader2 size={16} className="animate-spin" /> SÉDIMENTATION MATRICIELLE...</>
        ) : (
          <><Sparkles size={16} className="group-hover:scale-110 transition-all" /> ACTIVER L'HALLUCINATION STANDARD</>
        )}
      </button>

      {/* 3. CABINET DE SORTIE (HISTORIQUE) */}
      <div className="bg-neutral-950/40 border border-neutral-900 rounded-3xl overflow-hidden flex flex-col shadow-inner backdrop-blur-md">
        <div className="flex items-center justify-between p-4 border-b border-neutral-900/50">
          <div className="flex items-center gap-3">
            <Terminal size={14} className="text-neutral-600" />
            <span className="text-[10px] font-black text-neutral-500 uppercase tracking-widest">Flux de Sortie Cognitif</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsReplie(!isReplie)} className="text-[10px] font-black text-neutral-600 hover:text-emerald-400 transition-colors">
              {isReplie ? 'DÉPLOYER' : 'RÉDUIRE'}
            </button>
            <button onClick={() => setIsPleinEcran(!isPleinEcran)} className="text-[10px] font-black text-neutral-600 hover:text-purple-400 transition-colors">
              {isPleinEcran ? 'QUITTER' : 'PLEIN ÉCRAN'}
            </button>
          </div>
        </div>

        <div className={`transition-all duration-500 ${isReplie ? 'max-h-0 opacity-0' : 'max-h-[500px] opacity-100 p-4 overflow-y-auto space-y-3 scrollbar-thin'}`}>
          {historiqueInferences.length === 0 ? (
            <div className="py-20 text-center opacity-20">
              <Brain size={40} className="mx-auto text-neutral-600 mb-2" />
              <p className="text-[9px] uppercase font-black tracking-widest">Zone vierge</p>
            </div>
          ) : (
            historiqueInferences.map(item => (
              <div key={item.id} className={`border rounded-xl overflow-hidden bg-black/40 transition-all ${item.is_guided ? 'border-purple-500/30' : 'border-neutral-900'}`}>
                <div onClick={() => toggleAccordion(item.id)} className="p-3 flex items-center justify-between cursor-pointer hover:bg-neutral-900/40 select-none">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Hash size={12} className="text-neutral-700" />
                    <span className={`text-[11px] font-black uppercase tracking-widest ${item.is_guided ? 'text-purple-400' : 'text-emerald-400'}`}>
                      {item.titre}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTTS(item);
                      }}
                      className={`px-2 py-0.5 rounded text-[8.5px] font-bold tracking-wider transition-all border ${
                        activeSpeechId === item.id
                          ? 'bg-red-950/80 border-red-500 text-red-400 animate-pulse font-black'
                          : 'bg-purple-950/40 border-purple-900 text-purple-400 hover:bg-purple-900/40'
                      }`}
                    >
                      {activeSpeechId === item.id ? '⏹ STOP AUDIO' : '🔊 RÉSUMÉ AUDIO'}
                    </button>
                    {activeSpeechId === item.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTogglePause();
                        }}
                        className="px-2 py-0.5 rounded text-[8.5px] font-bold tracking-wider transition-all border bg-amber-950/80 border-amber-500/50 text-amber-400 hover:bg-amber-900/60"
                      >
                        {isSpeechPaused ? '▶️ REPRENDRE' : '⏸ PAUSE'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[8px] font-bold text-neutral-700">{item.timestamp}</span>
                    {item.isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </div>
                </div>
                {item.isExpanded && (
                  <div className="p-5 bg-black/60 border-t border-neutral-900 space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] px-2 py-1 rounded bg-neutral-900 text-neutral-500 font-bold uppercase">{item.secteurs}</span>
                      <button onClick={(e) => { e.stopPropagation(); handleCopy(item); }} className="text-[10px] font-black text-neutral-600 hover:text-white flex items-center gap-1.5 transition-colors">
                        {copiedId === item.id ? <><Check size={12} className="text-emerald-400" /> COPIÉ</> : <><Copy size={12} /> COPIER</>}
                      </button>
                    </div>
                    <p className="text-[11px] text-neutral-400 leading-relaxed italic border-l-2 border-neutral-800 pl-4 py-1">{item.logique}</p>
                    <div className="pt-3 border-t border-neutral-900/50">
                      <p className="text-[10px] text-emerald-500/90 font-bold">
                        <span className="text-neutral-600 mr-2 font-black uppercase">Application :</span>
                        {item.application}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
