import React, { useState, useRef, useEffect } from 'react';
import { ConsoleEntry, JargonTerm } from '../types';
import { Send, Terminal, Anchor, Sparkles, Maximize2, Minimize2 } from 'lucide-react';
import { ArreterAbsolumentToutAudio, gererFluxAudioUnique } from '../ratissAudioCore';

interface ConsoleProps {
  entries: ConsoleEntry[];
  jargonTerms: JargonTerm[];
  onSendData: (text: string) => void;
  onAddJargon: (concept: string, jargon: string) => void;
  isPending: boolean;
  isHallucinating?: boolean;
}

export const Console: React.FC<ConsoleProps> = ({
  entries,
  jargonTerms,
  onSendData,
  onAddJargon,
  isPending,
  isHallucinating = false,
}) => {
  const [educationValue, setEducationValue] = useState('');
  const [discussionValue, setDiscussionValue] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [lastSedimented, setLastSedimented] = useState<{ concept: string; jargon: string } | null>(null);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(false);
  const [activeConsoleSpeechId, setActiveConsoleSpeechId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error("Clipboard copy failed", err);
    });
  };
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeConsoleSpeechIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeConsoleSpeechIdRef.current = activeConsoleSpeechId;
  }, [activeConsoleSpeechId]);

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      ArreterAbsolumentToutAudio();
      setActiveConsoleSpeechId(null);
    };
  }, []);

  const handleConsoleTTS = async (entry: ConsoleEntry) => {
    if (activeConsoleSpeechId === entry.id) {
      ArreterAbsolumentToutAudio();
      setActiveConsoleSpeechId(null);
      return;
    }

    ArreterAbsolumentToutAudio();
    setActiveConsoleSpeechId(entry.id);

    await gererFluxAudioUnique(entry.text);

    // Auto-stop: Reset button state once audio is finished
    if (activeConsoleSpeechIdRef.current === entry.id) {
      setActiveConsoleSpeechId(null);
    }
  };

  // Auto-scroll on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const handleEducationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isHallucinating) return; // Disconnected in dream mode
    if (!educationValue.trim()) return;

    const trimmed = educationValue.trim();

    // Catch anchoring syntax "(:)"
    if (trimmed.includes('(:)')) {
      const parts = trimmed.split('(:)');
      if (parts.length === 2) {
        const concept = parts[0].trim();
        const jargon = parts[1].trim();
        if (concept && jargon) {
          onAddJargon(concept, jargon);
          setLastSedimented({ concept, jargon });
          setShowNotification(true);
          setEducationValue('');
          setTimeout(() => setShowNotification(false), 4500);
          return;
        }
      }
    } else {
      // Suggest template structure in console logs
      onSendData(`[AIDE SÉDIMENTATION] Syntaxe d'ancrage invalide pour '${trimmed}'. Utilisez la structure 'concept(:)jargon'.`);
      setEducationValue('');
    }
  };

  const handleDiscussionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isHallucinating) return; // Disconnected in dream mode
    if (!discussionValue.trim()) return;

    onSendData(discussionValue.trim());
    setDiscussionValue('');
  };

  const matrixString = "DECONSTR_MATRICE_REPR_768D";

  return (
    <div
      id="console-widget"
      className={`font-mono flex flex-col shadow-2xl transition-all duration-300 ${
        isConsoleExpanded
          ? 'fixed inset-0 w-screen h-screen z-[9999] bg-neutral-950/98 p-2.5 sm:p-4'
          : 'relative w-full bg-neutral-950/95 border border-neutral-900 rounded-xl overflow-hidden h-[360px]'
      }`}
    >
      {/* Console Header */}
      <div className="bg-neutral-900/60 px-4 py-3 border-b border-neutral-900 flex justify-between items-center text-sm rounded-t-lg">
        <div className="flex items-center gap-2 text-neutral-300">
          <Terminal size={15} className="text-emerald-500 animate-pulse" />
          <span className="font-bold text-xs tracking-wider uppercase">CONSOLE & SÉDIMENTATION RATISS 4 FUSION</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-neutral-500">
          <span className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${isHallucinating ? 'bg-purple-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`}></span>
            {isHallucinating ? 'DREAM_MODE' : 'SYS_ONLINE'}
          </span>
          <span className="hidden sm:inline">ANCRAGE : <code className="text-indigo-400 bg-neutral-950 px-1 py-0.5 rounded border border-neutral-800">concept(:)jargon</code></span>
          
          {/* Dynamic Expansion Toggle Button */}
          <button
            type="button"
            onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
            className="p-1 px-2 bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 rounded text-neutral-300 hover:text-white transition-all flex items-center justify-center gap-1 cursor-pointer font-bold text-[9px] uppercase tracking-wider"
            title={isConsoleExpanded ? "Réduire la console" : "Agrandir en plein écran"}
          >
            {isConsoleExpanded ? (
              <>
                <Minimize2 size={12} className="text-amber-500 animate-pulse" />
                <span className="text-amber-500 hidden xs:inline">Réduire</span>
              </>
            ) : (
              <>
                <Maximize2 size={12} className="text-emerald-500" />
                <span className="text-emerald-400 hidden xs:inline">Plein Écran</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Sedimentation Alert toast */}
      {showNotification && lastSedimented && (
        <div className="absolute top-14 left-1/2 -to-x-1/2 transform -translate-x-1/2 z-20 bg-emerald-950/95 border-2 border-emerald-500 text-emerald-200 px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-3 backdrop-blur-md">
          <Anchor size={18} className="text-emerald-400 lg:animate-bounce" />
          <div className="text-left">
            <div className="text-xs font-bold uppercase tracking-wider text-emerald-300">[SÉDIMENTATION COGNITIVE]</div>
            <div className="text-[10px] text-emerald-400/90">
              Concept '{lastSedimented.concept}' lié au jargon '{lastSedimented.jargon}' ancré en local & Supabase !
            </div>
          </div>
        </div>
      )}

      {/* Main console content: Left Logs, Right Lexicon */}
      <div className={`flex flex-col md:flex-row overflow-hidden border-b border-neutral-900/60 ${isConsoleExpanded ? 'h-[70vh] flex-[7_7_0%] bg-neutral-950/40' : 'flex-1 h-full'}`}>
        {/* Logs terminal area - stretches to take full 70% support in expanded view */}
        <div className={`flex-1 flex flex-col p-4 overflow-y-auto ${isConsoleExpanded ? 'max-h-[70vh] sm:p-6 gap-3.5 bg-neutral-950/20' : ''}`} ref={scrollRef}>
          <div className="space-y-3 text-xs flex-1">
            {entries.length === 0 ? (
              <div className="text-neutral-600 italic text-[11px] p-2 text-center my-auto">
                Prêt pour l'interfaçage cognitif. Saisissez une requête ou ancrez du jargon...
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry.id} className="leading-relaxed border-l-2 pl-2.5 border-neutral-850">
                  <div className="flex justify-between text-[9px] text-neutral-600 mb-0.5">
                    <span>{entry.timestamp}</span>
                    <span className="uppercase text-neutral-500 font-bold">{entry.type}</span>
                  </div>
                  {entry.type === 'input' && (
                    <div className={`text-emerald-400 font-medium ${isConsoleExpanded ? 'text-xs sm:text-sm' : ''}`}>
                      &gt; {entry.text}
                    </div>
                  )}
                  {entry.type === 'system' && (
                    <div className="text-indigo-400">
                      [SYS] {entry.text}
                    </div>
                  )}
                  {entry.type === 'response' && (
                    <div className="relative group/speech">
                      <div className={`text-neutral-300 bg-neutral-900/30 rounded border border-neutral-950 whitespace-pre-line leading-relaxed select-text shadow-inner transition-all flex flex-col ${isConsoleExpanded ? 'p-4 pr-32 text-xs sm:text-sm bg-neutral-900/50 gap-2 border-neutral-800' : 'p-2 pr-28 text-[11px]'}`}>
                        {entry.pensees && (
                          <div className="text-[10px] text-neutral-500 italic mb-1 border-b border-neutral-800 pb-1">
                            {entry.pensees}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          {entry.action && (
                            <span className="bg-emerald-950/40 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded border border-emerald-800 uppercase tracking-tighter">
                              {entry.action}
                            </span>
                          )}
                          <span className="bg-neutral-800 text-neutral-400 text-[8px] font-bold px-1.5 py-0.5 rounded border border-neutral-700 uppercase tracking-tighter">
                            V5.0 PROTOCOL
                          </span>
                        </div>
                        {entry.text}
                      </div>
                      <div className="absolute top-2.5 right-2 flex gap-1 items-center">
                        <button
                          onClick={() => handleConsoleTTS(entry)}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider transition-all border ${
                            activeConsoleSpeechId === entry.id
                              ? 'bg-red-950/80 border-red-500 text-red-400 animate-pulse font-black'
                              : 'bg-emerald-950/40 border-emerald-900 text-emerald-400 hover:bg-emerald-900/40 opacity-75 group-hover/speech:opacity-100'
                          }`}
                        >
                          {activeConsoleSpeechId === entry.id ? '⏹ STOP AUDIO' : '🔊 RÉSUMÉ AUDIO'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyText(entry.text, entry.id)}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider transition-all border ${
                            copiedId === entry.id
                              ? 'bg-indigo-950 border-indigo-500 text-indigo-300 font-bold animate-pulse'
                              : 'bg-indigo-950/40 border-indigo-900 text-indigo-400 hover:bg-indigo-900/40 opacity-75 group-hover/speech:opacity-100'
                          }`}
                          title="Copier la réponse"
                        >
                          {copiedId === entry.id ? '✓ COPIÉ' : '📋 COPIER'}
                        </button>
                      </div>
                    </div>
                  )}
                  {entry.type === 'sedimentation' && (
                    <div className="text-emerald-400 flex items-center gap-1.5 p-1 px-2 bg-emerald-950/10 border border-emerald-950 rounded">
                      <Anchor size={11} className="text-emerald-400 animate-pulse" />
                      <span>{entry.text}</span>
                    </div>
                  )}
                  {entry.type === 'error' && (
                    <div className="text-rose-400 bg-rose-950/10 p-1.5 border border-rose-950 rounded">
                      [ALERT_SECURE] {entry.text}
                    </div>
                  )}
                </div>
              ))
            )}
            {isPending && (
              <div className="flex items-center gap-2 text-neutral-400 text-[10px] animate-pulse py-1 pl-2">
                <Sparkles size={11} className="text-emerald-400 animate-spin" />
                <span>Interrogation ApiVault / Gemini 3.5 en cours...</span>
              </div>
            )}
          </div>
        </div>

        {/* Jargon Lexicon */}
        <div className={`bg-neutral-900/15 border-t md:border-t-0 md:border-l border-neutral-900 p-3 flex flex-col justify-between overflow-y-auto transition-all ${
          isConsoleExpanded 
            ? 'w-full md:w-64 max-h-[100px] md:max-h-[70vh] border-t border-neutral-900 md:border-t-0' 
            : 'w-full md:w-60 max-h-[140px] md:max-h-none'
        }`}>
          <div>
            <div className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold mb-2 flex items-center justify-between">
              <span>LEXIQUE ({jargonTerms.length})</span>
              <Anchor size={10} className="text-amber-500" />
            </div>
            {jargonTerms.length === 0 ? (
              <div className="text-[10px] text-neutral-600 italic">
                Aucun jargon sédimenté pour le moment.
              </div>
            ) : (
              <div className={`space-y-1 overflow-y-auto pr-1 ${isConsoleExpanded ? 'max-h-[60px] md:max-h-[50vh]' : 'max-h-[160px]'}`}>
                {jargonTerms.map((term, i) => (
                  <div key={i} className="text-[10px] flex items-center justify-between p-1 bg-neutral-950 border border-neutral-950 rounded gap-1">
                    <span className="text-neutral-500 truncate max-w-[85px]" title={term.concept}>
                      {term.concept}
                    </span>
                    <span className="text-neutral-700">&bull;&bull;&gt;</span>
                    <span className="text-emerald-400 font-semibold truncate max-w-[95px]" title={term.jargon}>
                      {term.jargon}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="text-[8px] text-neutral-600 mt-2 border-t border-neutral-900/50 pt-2 hidden md:block">
            RATISS stocke ces structures cognitives dans la mémoire de sédimentation synaptique.
          </div>
        </div>
      </div>

      {/* Input Form or Dream Mode Disconnected display - strictly anchored to the bottom */}
      <div className={`border-t border-neutral-950 bg-neutral-900/20 p-3.5 flex flex-col gap-2.5 ${isConsoleExpanded ? 'mt-auto pb-4 sm:pb-6' : ''}`}>
        {isHallucinating ? (
          <div className="w-full p-3.5 flex flex-col sm:flex-row items-center justify-between bg-purple-950/20 text-purple-400 gap-3 border-l-4 border-purple-500 animate-pulse select-none">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1">
                [ALERT DECONNEXION SYNAPTIQUE] MODE RÊVE ACTIF ::
              </span>
            </div>
            {/* Undulating matrix text */}
            <div className="flex gap-0.5 select-none py-1 overflow-hidden">
              {matrixString.split("").map((char, index) => {
                const sineDelay = Math.sin(index * 0.4) * 0.5 + 0.5;
                return (
                  <span
                    key={index}
                    style={{
                      animationDelay: `${index * 55}ms`,
                      animationDuration: '1.2s',
                      display: 'inline-block'
                    }}
                    className="animate-bounce text-purple-300 font-extrabold text-[13px] tracking-tight text-center shadow-purple-500/20"
                  >
                    {char}
                  </span>
                )
              })}
            </div>
            <div className="text-[8px] bg-purple-900/40 px-1.5 py-0.5 rounded border border-purple-800 uppercase text-purple-300 font-bold">
              Input utilisateur suspendu
            </div>
          </div>
        ) : (
          <>
            {/* BLOC SUPÉRIEUR : ÉDUCATION / ANCRAGE */}
            <form onSubmit={handleEducationSubmit} className="flex gap-2 items-center">
              <div className="text-[9px] font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/50 px-2 py-1 rounded min-w-[85px] text-center select-none font-bold">
                ÉDUCATION
              </div>
              <input
                type="text"
                value={educationValue}
                onChange={(e) => setEducationValue(e.target.value)}
                placeholder="Saisissez votre 'concept(:)jargon' pour ancrage..."
                className="flex-1 bg-neutral-950 border border-neutral-850 rounded px-2.5 py-1.5 text-xs text-indigo-300 placeholder-neutral-700 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 font-mono transition-colors"
                disabled={isPending}
              />
              <button
                type="submit"
                disabled={isPending || !educationValue.trim()}
                className="bg-indigo-950 text-indigo-300 hover:bg-indigo-900/80 disabled:opacity-30 border border-indigo-900/80 font-bold p-1 px-3 text-[10px] rounded transition-all cursor-pointer flex items-center gap-1 h-8"
              >
                <Anchor size={10} />
                <span>Ancrer</span>
              </button>
            </form>

            {/* BLOC INFÉRIEUR : DISCUSSION COURANTE */}
            <form onSubmit={handleDiscussionSubmit} className="flex gap-2 items-center">
              <div className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-1 rounded min-w-[85px] text-center select-none font-bold">
                DISCUSSION
              </div>
              <input
                type="text"
                value={discussionValue}
                onChange={(e) => setDiscussionValue(e.target.value)}
                placeholder="Discuter avec RATISS 4 FUSION..."
                className="flex-1 bg-neutral-950 border border-neutral-850 rounded px-2.5 py-1.5 text-xs text-emerald-300 placeholder-neutral-700 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/10 font-mono transition-colors"
                disabled={isPending}
              />
              <button
                type="submit"
                disabled={isPending || !discussionValue.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white font-bold p-1 px-3 text-[10px] rounded transition-all cursor-pointer flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.2)] h-8"
              >
                <Send size={10} />
                <span>Parler</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};
