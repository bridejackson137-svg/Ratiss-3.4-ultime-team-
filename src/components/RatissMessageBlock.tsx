import React, { useState, useEffect } from 'react';
import { gererFluxAudioUnique, ArreterAbsolumentToutAudio } from '../ratissAudioCore';

interface RatissPayload {
  pensees: string;
  action: string;
  reponse: string;
  statut: string;
}

export const RatissMessageBlock: React.FC<{ rawJson: string }> = ({ rawJson }) => {
  const [data, setData] = useState<RatissPayload | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  useEffect(() => {
    // Désarmement de l'audio dès qu'un nouveau message s'affiche pour stopper les échos de l'ancien chat
    ArreterAbsolumentToutAudio();
    setIsPlaying(false);

    try {
      // FILTRE CHIRURGICAL : Isoler uniquement l'objet JSON au milieu du texte parasite
      const premierIndex = rawJson.indexOf('{');
      const dernierIndex = rawJson.lastIndexOf('}');

      if (premierIndex !== -1 && dernierIndex !== -1) {
        const jsonPropre = rawJson.substring(premierIndex, dernierIndex + 1);
        setData(JSON.parse(jsonPropre));
      } else {
        throw new Error("Payload corrompu");
      }
    } catch (e) {
      console.warn("[RATISS PARSER] Structure non standard, repli sur texte brute.");
      setData({
        pensees: "Analyse brute",
        action: "Affichage Texte",
        reponse: rawJson, // Sécurité : affiche la chaîne brute si le JSON est complètement cassé
        statut: "DÉGRADÉ"
      });
    }
  }, [rawJson]);

  const handleActionAudio = async () => {
    if (!data) return;

    if (isPlaying) {
      ArreterAbsolumentToutAudio();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      // Exécution de la fonction d'écoute propre
      await gererFluxAudioUnique(data.reponse);
      setIsPlaying(false);
    }
  };

  if (!data) return null;

  return (
    <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl font-mono text-white max-w-xl shadow-md">
      {/* En-tête technique */}
      <div className="flex justify-between items-center text-[10px] text-gray-500 mb-3 uppercase tracking-wider">
        <span>⚙️ {data.action}</span>
        <span className={data.statut === 'DÉGRADÉ' ? 'text-red-400' : 'text-green-400'}>
          ● {data.statut}
        </span>
      </div>

      {/* Corps du message RATISS */}
      <div className="text-sm text-gray-200 leading-relaxed mb-4 whitespace-pre-line">
        {data.reponse}
      </div>

      {/* Contrôle de lecture manuel et unique */}
      <button
        onClick={handleActionAudio}
        className={`w-full py-2 rounded text-xs font-bold uppercase tracking-widest border transition-all duration-150 ${
          isPlaying 
            ? 'bg-red-950/40 border-red-800 text-red-400' 
            : 'bg-blue-950/40 border-blue-800 text-blue-400 hover:bg-blue-900/40'
        }`}
      >
        {isPlaying ? '🛑 ARRÊTER LA VOIX' : '🔊 ÉCOUTER LE RAPPORT'}
      </button>
    </div>
  );
};
