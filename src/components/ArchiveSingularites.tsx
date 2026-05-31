import React, { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../supabase';
import { Zap, Sparkles, Copy, RefreshCw, Trash2, ShieldCheck, Check } from 'lucide-react';

interface ReveLucide {
  id: string;
  created_at?: string;
  timestamp?: string;
  secteurs_impactes?: string;
  secteurs?: string;
  concept_hybride?: string;
  concept?: string;
  titre?: string;
  logique?: string;
  application_2026?: string;
  application?: string;
  score_coherence?: number;
  coherence_score?: number;
  delta?: number;
  is_stable?: boolean;
  bloc_textuel?: string;
  tags_secteurs?: string[];
}

export default function ArchiveSingularites() {
  const [revesLucides, setRevesLucides] = useState<ReveLucide[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeSpeechId, setActiveSpeechId] = useState<string | null>(null);
  const [isSpeechPaused, setIsSpeechPaused] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
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
      if (detail && detail.sourceId !== activeSpeechIdRef.current) {
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

  const calibrerEtEpurerTexte = (text: string): string => {
    // Standard saved singularite archives, direct non-greeting calibration
    let cleanText = text;

    cleanText = cleanText.replace(/(en tant qu'intelligence artificielle|je suis le système ratiss|en utilisant l'IA de gemini)/gi, "");
    cleanText = cleanText.replace(/^(réponse gemini\s*[:\-]*|calcul matriciel\s*[:\-]*|intention\s*[:\-]*|indexation\s*[:\-]*|réponse\s*[:\-]*|auteur\s*[:\-]*)/gi, "");

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

  const handleToggleArchivePause = () => {
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

  const handleTTS = (reve: ReveLucide) => {
    // Si l'objet cliqué est déjà en cours de lecture, on l'arrête inconditionnellement
    if (activeSpeechId === reve.id) {
      if (activeSpeechCancelRef.current) {
        activeSpeechCancelRef.current();
        activeSpeechCancelRef.current = null;
      }
      setActiveSpeechId(null);
      setIsSpeechPaused(false);
      return;
    }

    // Arrêter toute lecture active globale avant d'en lancer une nouvelle
    if ((window as any).__activeAudio) {
      try {
        (window as any).__activeAudio.pause();
        (window as any).__activeAudio.src = "";
      } catch (e) {}
      (window as any).__activeAudio = null;
    }
    if (activeSpeechCancelRef.current) {
      activeSpeechCancelRef.current();
      activeSpeechCancelRef.current = null;
    }
    setIsSpeechPaused(false);

    // Déclencher l'événement d'arrêt global pour synchroniser les autres composants
    window.dispatchEvent(new CustomEvent('app-speech-stop', { detail: { sourceId: reve.id } }));

    const titre = reve.titre || reve.concept_hybride || reve.concept || 'Concept stabilisé';
    const logique = reve.logique || '';
    const application = reve.application || reve.application_2026 || '';

    // Only focus on title + logic + application (no technical system metadata)
    const rawText = `${titre}. ${logique}. Application : ${application}`;
    const cleanedText = calibrerEtEpurerTexte(rawText);

    // Encodage
    const encodedText = encodeURIComponent(cleanedText);
    const audioUrl = `/api/cognitive/tts?text=${encodedText}`;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    (window as any).__activeAudio = audio;
    setActiveSpeechId(reve.id);
    setIsSpeechPaused(false);

    let cancelled = false;
    activeSpeechCancelRef.current = () => {
      cancelled = true;
      try {
        audio.pause();
        audio.src = ""; // Coupe instantanément le chargement réseau
      } catch (e) {}
      window.speechSynthesis.cancel();
      if ((window as any).__activeAudio === audio) {
        (window as any).__activeAudio = null;
      }
      setIsSpeechPaused(false);
    };

    audio.play().catch(err => {
      if (cancelled) return;
      if (err.name === 'AbortError') {
        return;
      }
      console.warn("Local TTS play error, fallback to browser speechSynthesis", err);
      activerVoixNavigateur();
    });

    audio.onended = () => {
      if (cancelled) return;
      setActiveSpeechId(null);
      setIsSpeechPaused(false);
      if (activeSpeechCancelRef.current === activerCancellationTTS) {
        activeSpeechCancelRef.current = null;
      }
    };

    audio.onerror = () => {
      if (cancelled) return;
      console.warn("audio.onerror fired: invoking fallback browser speechSynthesis");
      activerVoixNavigateur();
    };

    const activerCancellationTTS = () => {
      cancelled = true;
      try {
        audio.pause();
        audio.src = "";
      } catch (e) {}
      window.speechSynthesis.cancel();
      if ((window as any).__activeAudio === audio) {
        (window as any).__activeAudio = null;
      }
      setIsSpeechPaused(false);
    };
    activeSpeechCancelRef.current = activerCancellationTTS;

    function activerVoixNavigateur() {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.lang = 'fr-FR';
        utterance.rate = 1.05;
        utterance.pitch = 0.85;

        utterance.onend = () => {
          if (cancelled) return;
          setActiveSpeechId(null);
          setIsSpeechPaused(false);
          if (activeSpeechCancelRef.current === activerCancellationBrowser) {
            activeSpeechCancelRef.current = null;
          }
        };

        utterance.onerror = () => {
          if (cancelled) return;
          setActiveSpeechId(null);
          setIsSpeechPaused(false);
          if (activeSpeechCancelRef.current === activerCancellationBrowser) {
            activeSpeechCancelRef.current = null;
          }
        };

        const activerCancellationBrowser = () => {
          cancelled = true;
          window.speechSynthesis.cancel();
          setIsSpeechPaused(false);
        };
        activeSpeechCancelRef.current = activerCancellationBrowser;

        window.speechSynthesis.speak(utterance);
      } catch (synthErr) {
        if (!cancelled) {
          setActiveSpeechId(null);
          setIsSpeechPaused(false);
        }
      }
    }
  };

  // Load from both Local Cache and Supabase if active
  const fetchStableDreams = async () => {
    setLoading(true);
    setErrorInfo(null);
    let loadedData: ReveLucide[] = [];

    // 1. Try loading from LocalStorage first (as a reliable source/fallback)
    try {
      const localSaved = localStorage.getItem('ratiss_archive_singularites');
      if (localSaved) {
        loadedData = JSON.parse(localSaved);
      }
    } catch (e) {
      console.warn("Could not read local archive storage:", e);
    }

    // 2. Fetch from Supabase if configured
    if (isSupabaseConfigured && supabase) {
      try {
        // Safe tiered query: LABO_EMERGENCE first (quality vault) then table_hallucinations (raw archive)
        const [laboRes, halluRes] = await Promise.all([
          supabase.from('LABO_EMERGENCE').select('*').order('timestamp', { ascending: false }),
          supabase.from('table_hallucinations').select('*').eq('is_stable', true).order('created_at', { ascending: false })
        ]);

        let mergedRemote: ReveLucide[] = [];
        
        if (laboRes.data) {
          mergedRemote = [...laboRes.data.map(item => ({
            ...item,
            id: 'labo_' + item.id,
            created_at: item.timestamp,
            titre: item.titre,
            score_coherence: item.coherence_score * 100,
            secteurs: Array.isArray(item.tags_secteurs) ? item.tags_secteurs.join(' ⚡ ') : item.tags_secteurs
          }))];
        }

        if (halluRes.data) {
          halluRes.data.forEach((h: any) => {
            const alreadyInLabo = mergedRemote.some(l => l.titre === h.concept_hybride);
            if (!alreadyInLabo) {
              mergedRemote.push(h);
            }
          });
        }

        if (mergedRemote.length > 0) {
          // Normalize and merge with local cached items (avoiding duplicates)
          const merged = [...mergedRemote];
          loadedData.forEach(localItem => {
            const exists = merged.some(remoteItem => 
              (remoteItem.concept_hybride === localItem.concept_hybride && remoteItem.logique === localItem.logique) ||
              remoteItem.id === localItem.id
            );
            if (!exists) {
              merged.push(localItem);
            }
          });
          loadedData = merged;
        }
      } catch (err: any) {
        console.warn("[ARCHIVE SUPABASE ERROR] Fallback to local cache only:", err.message);
        setErrorInfo(`Mode local actif. Connexion Supabase en cours...`);
      }
    }

    // Sort by chronological order (descending)
    loadedData.sort((a, b) => {
      const dateA = a.created_at || a.timestamp ? new Date(a.created_at || a.timestamp || 0).getTime() : 0;
      const dateB = b.created_at || b.timestamp ? new Date(b.created_at || b.timestamp || 0).getTime() : 0;
      return dateB - dateA;
    });

    setRevesLucides(loadedData);
    setLoading(false);
  };

  useEffect(() => {
    fetchStableDreams();

    // Listen to real-time additions if Supabase is alive
    if (isSupabaseConfigured && supabase) {
      const halluSub = supabase
        .channel('archive_hallu_live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'table_hallucinations' }, (payload) => {
          const newReve = payload.new as ReveLucide;
          if (newReve && (newReve.is_stable || (newReve.score_coherence && newReve.score_coherence > 72))) {
            setRevesLucides(prev => {
              const alreadyExists = prev.some(item => item.id === newReve.id || (item.concept_hybride === newReve.concept_hybride && item.logique === newReve.logique));
              if (alreadyExists) return prev;
              return [newReve, ...prev];
            });
          }
        })
        .subscribe();

      const laboSub = supabase
        .channel('archive_labo_live')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'LABO_EMERGENCE' }, (payload) => {
          const newLabo = payload.new as any;
          if (newLabo) {
            const formatted = {
              ...newLabo,
              id: 'labo_' + newLabo.id,
              created_at: newLabo.timestamp,
              titre: newLabo.titre,
              score_coherence: newLabo.coherence_score * 100,
              secteurs: Array.isArray(newLabo.tags_secteurs) ? newLabo.tags_secteurs.join(' ⚡ ') : newLabo.tags_secteurs
            };
            setRevesLucides(prev => {
              const cleaned = prev.filter(p => !p.id.startsWith('local_') || p.concept_hybride !== formatted.titre);
              return [formatted, ...cleaned];
            });
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(halluSub);
        supabase.removeChannel(laboSub);
      };
    }
  }, []);

  // Listen to local storage trigger notifications from other components
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ratiss_last_collision' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          // Only add if not already present
          setRevesLucides(prev => {
            const exists = prev.some(item => item.concept_hybride === parsed.concept || item.titre === parsed.concept);
            if (exists) return prev;

            const formatted: ReveLucide = {
              id: 'local_' + Date.now(),
              created_at: new Date().toISOString(),
              secteurs_impactes: parsed.secteurs,
              concept_hybride: parsed.concept,
              logique: parsed.logique,
              application_2026: parsed.application,
              score_coherence: 84, // Collision defaults to high coherence
              is_stable: true
            };
            
            const updated = [formatted, ...prev];
            localStorage.setItem('ratiss_archive_singularites', JSON.stringify(updated.filter(u => u.id.startsWith('local_'))));
            return updated;
          });
        } catch {}
      }
    };
    const handleCustomUpdate = () => {
      fetchStableDreams();
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('storage_archive_update', handleCustomUpdate);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('storage_archive_update', handleCustomUpdate);
    };
  }, []);

  const copyToClipboard = (reve: ReveLucide) => {
    if (reve.bloc_textuel) {
      navigator.clipboard.writeText(reve.bloc_textuel);
    } else {
      const sectors = reve.secteurs || reve.secteurs_impactes || '';
      const titre = reve.titre || reve.concept_hybride || reve.concept || 'Concept Hybride';
      const logique = reve.logique || '';
      const application = reve.application || reve.application_2026 || '';

      const textToCopy = `[SINGULARITÉ] ${sectors}\n\nTITRE: ${titre.toUpperCase()}\n\nLOGIQUE TOPOLOGIQUE:\n${logique}\n\nAPPLICATION CONCRÈTE (2026):\n${application}`;
      navigator.clipboard.writeText(textToCopy);
    }
    
    setCopiedId(reve.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearLocalArchive = () => {
    if (window.confirm("Voulez-vous purger l'archive des singularités locales ?")) {
      localStorage.removeItem('ratiss_archive_singularites');
      localStorage.removeItem('ratiss_last_collision');
      setRevesLucides(prev => prev.filter(r => !r.id.startsWith('local_')));
    }
  };

  return (
    <div id="archive-singularites" className="bg-neutral-950 border border-purple-900/60 rounded-xl p-4 font-mono shadow-2xl flex flex-col gap-3 text-xs relative overflow-hidden">
      {/* Visual neon light decor header block */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-indigo-600/5 rounded-full blur-2xl pointer-events-none" />

      {/* Header element */}
      <div className="flex justify-between items-center border-b border-neutral-900 pb-2.5">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-purple-400 animate-pulse" />
          <span className="font-bold tracking-wider uppercase text-xs text-purple-400">
            👁️ ARCHIVE DES SINGULARITÉS (Rêves Lucides)
          </span>
        </div>
        <div className="flex items-center gap-2">
          {revesLucides.some(r => r.id.startsWith('local_')) && (
            <button
              onClick={clearLocalArchive}
              title="Purger l'archive locale"
              className="p-1 text-neutral-600 hover:text-red-400 rounded transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
          <button
            onClick={fetchStableDreams}
            disabled={loading}
            className="p-1.5 text-neutral-500 hover:text-purple-400 border border-neutral-900 hover:border-purple-950/60 rounded bg-neutral-900/10 disabled:opacity-40 transition-colors"
          >
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center bg-neutral-900/40 p-2.5 rounded border border-neutral-900">
        <div>
          <p className="text-[10px] text-neutral-400 font-bold block mb-0.5">FILTRE DE LUCIDITÉ (Moteur 768-D)</p>
          <span className="text-[9px] text-neutral-500 leading-tight block">
            Seules les collisions stables (<span className="text-purple-400 font-semibold">$\sigma$ &gt; 72%</span>) s'inscrivent dans cette mémoire close.
          </span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold bg-emerald-950/20 border border-emerald-900 px-1.5 py-0.5 rounded">
          <ShieldCheck size={10} />
          <span>ACTIF</span>
        </div>
      </div>

      {errorInfo && (
        <div className="text-[9px] text-neutral-400 p-1.5 bg-neutral-900/30 rounded border border-neutral-900 italic text-center">
          {errorInfo}
        </div>
      )}

      {/* Main scrolling space */}
      <div className="space-y-3 max-h-96 overflow-y-auto pr-1 customize-scrollbar">
        {revesLucides.length === 0 ? (
          <div className="text-[10px] text-neutral-500 italic text-center py-6 bg-neutral-900/10 rounded border border-neutral-900/50">
            Aucun concept stabilisé dans l'archive. Activez le Mode Rêve pour enclencher une collision sémantique forcée.
          </div>
        ) : (
          revesLucides.map((reve) => {
            const sectors = reve.secteurs || reve.secteurs_impactes || '';
            const titre = reve.titre || reve.concept_hybride || reve.concept || 'Concept stabilisé';
            const logique = reve.logique || '';
            const application = reve.application || reve.application_2026 || '';
            const rawDate = reve.created_at || reve.timestamp;
            const timeStr = rawDate 
              ? new Date(rawDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : new Date().toLocaleTimeString();

            // Calculate mock coherence or display actual
            const rawCoherence = reve.score_coherence || reve.coherence_score;
            const coherence = rawCoherence || (reve.delta !== undefined ? Math.round((1 - parseFloat(reve.delta as any)) * 100) : 78);

            return (
              <div key={reve.id} className="bg-black p-3 rounded-lg border border-neutral-900 hover:border-purple-900/40 relative group transition-all duration-300">
                {/* ACTIONS CONTAINER */}
                <div className="absolute top-2.5 right-2 flex items-center gap-1.5 z-10">
                  <button
                    onClick={() => handleTTS(reve)}
                    className={`px-2 py-1 rounded text-[9px] flex items-center gap-1 transition-all duration-200 cursor-pointer border shadow-sm ${
                      activeSpeechId === reve.id
                        ? 'bg-red-950/80 border-red-500 text-red-400 animate-pulse font-black'
                        : 'bg-purple-950/40 border-purple-900/60 text-purple-300 hover:bg-purple-900/50'
                    }`}
                  >
                    {activeSpeechId === reve.id ? '⏹ STOP AUDIO' : '🔊 RÉSUMÉ AUDIO'}
                  </button>
                  {activeSpeechId === reve.id && (
                    <button
                      onClick={() => handleToggleArchivePause()}
                      className="px-2 py-1 rounded text-[9px] flex items-center gap-1 transition-all duration-200 cursor-pointer border shadow-sm bg-amber-950/80 border-amber-500/50 text-amber-400 hover:bg-amber-900/60"
                    >
                      {isSpeechPaused ? '▶️ REPRENDRE' : '⏸ PAUSE'}
                    </button>
                  )}

                  <button 
                    onClick={() => copyToClipboard(reve)}
                    className="px-2 py-1 rounded bg-purple-950/40 hover:bg-purple-900/50 border border-purple-900/60 hover:border-purple-500/50 text-[9px] text-purple-300 flex items-center gap-1 transition-all duration-200 cursor-pointer shadow-sm"
                  >
                    {copiedId === reve.id ? (
                      <>
                        <Check size={10} className="text-emerald-400" />
                        <span>Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy size={9} />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Sub-header detailing origin sector & date */}
                <div className="text-[9px] text-neutral-500 mb-1 flex flex-wrap items-center gap-1.5 font-bold">
                  <span className="text-neutral-400">{timeStr}</span>
                  <span className="text-neutral-600">•</span>
                  <span className="text-purple-400/80">{sectors}</span>
                  <span className="text-neutral-600">•</span>
                  <span className="text-amber-400/70">Coherence: {coherence}%</span>
                </div>

                {/* Title */}
                <h4 className="text-[11.5px] font-bold text-neutral-100 tracking-tight uppercase border-l-2 border-purple-500 pl-2 py-0.5 mt-1">
                  {titre}
                </h4>

                {/* Description logic */}
                <p className="text-[10px] text-neutral-300 mt-2 leading-relaxed italic">
                  {logique}
                </p>

                {/* 2026 Application */}
                {application && (
                  <div className="mt-2.5 pt-2 border-t border-neutral-900/60">
                    <span className="text-[8px] text-neutral-500 uppercase font-black block tracking-wider">Application d'impact 2026 :</span>
                    <p className="text-amber-400 text-[9.5px] font-semibold tracking-tight leading-relaxed mt-0.5">
                      {application}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
