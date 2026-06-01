import React, { useRef, useEffect, useState } from 'react';
import { HallucinationState } from '../types';
import { Activity, Radio, Moon, Zap, Sparkles } from 'lucide-react';

interface HallucinationMonitorProps {
  state: HallucinationState;
  onToggleHallucination: (active: boolean) => void;
  onUpdateValues: (delta: number, distortion: number) => void;
  onTriggerCollision?: () => void;
  lastCollision?: {
    secteurs: string;
    concept: string;
    logique: string;
    application: string;
  } | null;
  isPending?: boolean;
}

export const HallucinationMonitor: React.FC<HallucinationMonitorProps> = ({
  state,
  onToggleHallucination,
  onUpdateValues,
  onTriggerCollision,
  lastCollision,
  isPending = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSpeech, setActiveSpeech] = useState<boolean>(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState<boolean>(false);
  const activeSpeechRef = useRef<boolean>(false);
  const activeSpeechCancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    activeSpeechRef.current = activeSpeech;
  }, [activeSpeech]);

  // Stop active speech on unmount and listen to global stop events
  useEffect(() => {
    const handleGlobalSpeechStop = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      // Arrêter tout si sourceId est null (via __ratissStopAllSpeech) ou si différent
      if (detail && (detail.sourceId === null || detail.sourceId !== 'hallucination-collision')) {
        if (activeSpeechCancelRef.current) {
          activeSpeechCancelRef.current();
          activeSpeechCancelRef.current = null;
        }
        setIsSpeechPaused(false);
        setActiveSpeech(false);
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

  // Cancel speaking when collision changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis.cancel();
    setActiveSpeech(false);
  }, [lastCollision]);

  const calibrerEtEpurerTexte = (text: string): string => {
    // Hallucinations are background dynamic drift alerts, default to standard non-salutation mode
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

  const handleToggleHallucinationPause = () => {
    if (!activeSpeech) return;
    
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

  const handleTTS = () => {
    if (!lastCollision) return;

    if (activeSpeech) {
      if (activeSpeechCancelRef.current) {
        activeSpeechCancelRef.current();
        activeSpeechCancelRef.current = null;
      }
      setActiveSpeech(false);
      setIsSpeechPaused(false);
      return;
    }

    // Arrêter toute lecture active globale via fonction centralisée
    if ((window as any).__ratissStopAllSpeech) {
      (window as any).__ratissStopAllSpeech();
    }

    // Déclencher l'événement d'arrêt global pour synchroniser les autres composants
    window.dispatchEvent(new CustomEvent('app-speech-stop', { detail: { sourceId: 'hallucination-collision' } }));

    // Focus only on Concept + Logic + Application
    const rawText = `${lastCollision.concept}. ${lastCollision.logique}. Application : ${lastCollision.application}`;
    const cleanedText = calibrerEtEpurerTexte(rawText);

    // Encodage
    const encodedText = encodeURIComponent(cleanedText);
    const audioUrl = `/api/cognitive/tts?text=${encodedText}`;

    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    (window as any).__activeAudio = audio;
    setActiveSpeech(true);
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

    let isPlayingLocally = false;
    let localAudioSuccess = false;

    audio.onplay = () => {
      localAudioSuccess = true;
    };
    audio.onplaying = () => {
      isPlayingLocally = true;
      localAudioSuccess = true;
    };
    audio.ontimeupdate = () => {
      if (audio.currentTime > 0) {
        localAudioSuccess = true;
      }
    };

    audio.play()
      .then(() => {
        isPlayingLocally = true;
        localAudioSuccess = true;
      })
      .catch(err => {
        if (cancelled) return;
        if (err.name === 'AbortError') {
          return;
        }
        if (isPlayingLocally || localAudioSuccess || audio.currentTime > 0) return;
        console.warn("Local TTS play error, fallback to browser speechSynthesis", err);
        activerVoixNavigateur();
      });

    audio.onended = () => {
      if (cancelled) return;
      setActiveSpeech(false);
      setIsSpeechPaused(false);
      if (activeSpeechCancelRef.current === activerCancellationTTS) {
        activeSpeechCancelRef.current = null;
      }
    };

    audio.onerror = () => {
      if (cancelled) return;
      if (isPlayingLocally || localAudioSuccess || audio.currentTime > 0) {
        // Ignorer les erreurs non-fatales de fin de de flux WAV pour éviter le redoublement
        return;
      }
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
      // SÉCURITÉ DE ROTATION : Libérer définitivement l'audio local
      cancelled = true;
      try {
        audio.pause();
        audio.src = "";
        audio.onended = null;
        audio.onerror = null;
        audio.onplaying = null;
        audio.onplay = null;
        audio.ontimeupdate = null;
      } catch (e) {}

      let browserCancelled = false;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanedText);
        utterance.lang = 'fr-FR';
        utterance.rate = 1.05;
        utterance.pitch = 0.85;

        utterance.onend = () => {
          if (browserCancelled) return;
          setActiveSpeech(false);
          setIsSpeechPaused(false);
          if (activeSpeechCancelRef.current === activerCancellationBrowser) {
            activeSpeechCancelRef.current = null;
          }
        };

        utterance.onerror = () => {
          if (browserCancelled) return;
          setActiveSpeech(false);
          setIsSpeechPaused(false);
          if (activeSpeechCancelRef.current === activerCancellationBrowser) {
            activeSpeechCancelRef.current = null;
          }
        };

        const activerCancellationBrowser = () => {
          browserCancelled = true;
          window.speechSynthesis.cancel();
          setIsSpeechPaused(false);
        };
        activeSpeechCancelRef.current = activerCancellationBrowser;

        window.speechSynthesis.speak(utterance);
      } catch (synthErr) {
        if (!browserCancelled) {
          setActiveSpeech(false);
          setIsSpeechPaused(false);
        }
      }
    }
  };

  // Animate dynamic waveform on Canvas to represent Delta Semantic Drift
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 300;
      canvas.height = 75;
    };
    resize();
    window.addEventListener('resize', resize);

    const draw = () => {
      tick++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const amp = state.isActive ? 20 * state.distortion : 5;
      const freq = state.isActive ? 0.08 * (1 + state.delta) : 0.03;
      const speed = state.isActive ? 0.12 : 0.04;

      // Draw background grid lines
      ctx.strokeStyle = 'rgba(38, 38, 38, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Main wave
      ctx.beginPath();
      ctx.lineWidth = 1.5;
      if (state.isActive) {
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.85)'; // Purple alert for dream
      } else {
        ctx.strokeStyle = 'rgba(75, 85, 99, 0.4)';
      }

      for (let x = 0; x < canvas.width; x++) {
        // Construct wave with minor chaos / delta drift noise overlay
        const noise = Math.sin(x * 0.1 + tick * 0.2) * (state.delta * 4);
        const y = canvas.height / 2 + Math.sin(x * freq - tick * speed) * amp + noise;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Secondary out-of-phase wave for multi-axis vector visualization
      if (state.isActive) {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(236, 72, 153, 0.35)'; // Pink secondary
        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + Math.cos(x * (freq * 0.8) + tick * (speed * 1.1)) * (amp * 0.7);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [state]);

  return (
    <div className="bg-neutral-950/90 border border-neutral-900 rounded-xl p-4 font-mono shadow-2xl flex flex-col gap-3 text-xs">
      <div className="flex justify-between items-center border-b border-neutral-900 pb-2.5">
        <div className="flex items-center gap-2 text-neutral-300">
          <Moon size={15} className="text-purple-400" />
          <span className="font-bold tracking-wider uppercase text-xs">CYCLE DE RÉFLEXION FERMÉ</span>
        </div>
        <span className="text-[10px] text-neutral-500 uppercase">table_hallucinations</span>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-neutral-900/40 p-3 rounded border border-neutral-900">
        <div>
          <span className="text-[11px] font-bold text-neutral-200 block uppercase">Mode Hallucinatoire</span>
          <p className="text-[9px] text-neutral-500 leading-tight">
            Force le système à couper les inputs normaux pour rêver et fusionner la sémantique.
          </p>
        </div>
        <button
          onClick={() => onToggleHallucination(!state.isActive)}
          className={`px-3 py-1.5 rounded text-[10px] font-semibold tracking-wider uppercase transition-all duration-300 cursor-pointer border ${
            state.isActive
              ? 'bg-purple-900/50 hover:bg-purple-800/45 text-purple-300 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
              : 'bg-neutral-950 text-neutral-500 hover:text-neutral-400 hover:border-neutral-800 border-neutral-900'
          }`}
        >
          {state.isActive ? 'ACTIF : FUSION' : 'INACTIF : VEILLE'}
        </button>
      </div>

      {/* Waveforms visual display */}
      <div className="relative bg-neutral-950 rounded border border-neutral-900 overflow-hidden h-[75px]">
        <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
        <div className="absolute top-1 left-2 text-[8px] text-neutral-600 font-bold uppercase pointer-events-none">
          DÉCONSTR_MATRICE_REPRÉ_768D
        </div>
      </div>

      {/* Interactive Sliders for Delta & Distortion when Active */}
      <div className="space-y-3">
        {/* Drift Delta Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span className="flex items-center gap-1">
              <Activity size={10} className="text-purple-400" />
              DÉRIVE SÉMANTIQUE (DELTA DRIFT)
            </span>
            <span className="font-semibold text-purple-400">{(state.delta * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.01"
            value={state.delta}
            onChange={(e) => onUpdateValues(parseFloat(e.target.value), state.distortion)}
            className="w-full h-1 bg-neutral-950 rounded-lg cursor-pointer accent-purple-500"
          />
          <span className="text-[8px] text-neutral-600 block leading-none">
            La sémantique s'éloigne de son centre d'attraction nominal.
          </span>
        </div>

        {/* Distortion Rate Slider */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-neutral-400">
            <span className="flex items-center gap-1">
              <Radio size={10} className="text-pink-400" />
              TAUX DE DISTORSION COGNITIVE
            </span>
            <span className="font-semibold text-pink-400">{(state.distortion * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.01"
            value={state.distortion}
            onChange={(e) => onUpdateValues(state.delta, parseFloat(e.target.value))}
            className="w-full h-1 bg-neutral-950 rounded-lg cursor-pointer accent-pink-500"
          />
          <span className="text-[8px] text-neutral-600 block leading-none">
            Degré de distorsion appliqués aux vecteurs syntactiques.
          </span>
        </div>
      </div>

      {state.isActive && (
        <div className="mt-2 pt-3 border-t border-neutral-900 flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-[10px] text-purple-400 font-bold uppercase">
            <span className="flex items-center gap-1 text-[11px]">
              <Zap size={12} className="text-purple-400 animate-pulse" />
              MOTEUR DE COLLISION [FERMÉ]
            </span>
            <button
              onClick={onTriggerCollision}
              disabled={isPending}
              className="text-[9px] bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-800 disabled:opacity-40 rounded px-2 py-0.5 cursor-pointer flex items-center gap-1 transition-all"
            >
              {isPending ? <Sparkles size={10} className="animate-spin text-purple-400" /> : <Zap size={10} />}
              COLLISIONNER
            </button>
          </div>

          {lastCollision ? (
            <div className="bg-neutral-900/30 p-3 rounded border border-purple-900/30 space-y-2.5 text-[11px] leading-relaxed relative overflow-hidden">
              <div className="absolute top-0 right-0 w-16 h-16 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="absolute top-2.5 right-2.5 flex gap-1 items-center z-10">
                <button
                  onClick={handleTTS}
                  className={`px-2 py-0.5 rounded text-[8.5px] font-bold tracking-wider transition-all border ${
                    activeSpeech
                      ? 'bg-red-950/80 border-red-500 text-red-400 animate-pulse font-black'
                      : 'bg-purple-950/40 border-purple-900 text-purple-400 hover:bg-purple-900/40'
                  }`}
                >
                  {activeSpeech ? '⏹ STOP AUDIO' : '🔊 RÉSUMÉ AUDIO'}
                </button>
                {activeSpeech && (
                  <button
                    onClick={() => handleToggleHallucinationPause()}
                    className="px-2 py-0.5 rounded text-[8.5px] font-bold tracking-wider transition-all border bg-amber-950/80 border-amber-500/50 text-amber-400 hover:bg-amber-900/60"
                  >
                    {isSpeechPaused ? '▶️ REPRENDRE' : '⏸ PAUSE'}
                  </button>
                )}
              </div>

              <div className="pr-20">
                <span className="text-[8px] text-neutral-500 block uppercase font-bold tracking-wider">Secteurs Impactés</span>
                <span className="text-purple-400 font-bold text-[10.5px]">
                  {lastCollision.secteurs}
                </span>
              </div>

              <div>
                <span className="text-[8px] text-neutral-500 block uppercase font-bold tracking-wider">Concept Hybride</span>
                <span className="text-neutral-100 font-extrabold tracking-tight text-[11.5px] uppercase block mt-0.5">
                  {lastCollision.concept}
                </span>
              </div>

              <div>
                <span className="text-[8px] text-neutral-500 block uppercase font-bold tracking-wider">Logique (:)</span>
                <p className="text-neutral-300 text-[10px] leading-relaxed mt-0.5">
                  {lastCollision.logique}
                </p>
              </div>

              <div>
                <span className="text-[8px] text-neutral-500 block uppercase font-bold tracking-wider">Application 2026</span>
                <p className="text-amber-400 font-medium text-[10px] leading-relaxed border-l-2 border-amber-500/40 pl-2 mt-0.5">
                  {lastCollision.application}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-[10px] text-neutral-500 italic text-center p-3 bg-neutral-900/10 rounded border border-neutral-900">
              Génération de la collision sémantique en cours...
            </div>
          )}
        </div>
      )}
    </div>
  );
};
