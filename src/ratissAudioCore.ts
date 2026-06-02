/**
 * RATISS AUDIO CORE - VERSION PRIVILÉGIÉE STABLE v4.0
 * EXÉCUTION EXCLUSIVE DE LA VOIX FÉMININE SANS SÉLECTEUR
 */

let instanceAudioEnCours: HTMLAudioElement | null = null;

/**
 * Supprime le markdown, les sauts de ligne et nettoie les caractères techniques 
 * pour garantir une prononciation fluide par la voix.
 */
function normaliserTextePourAudio(texte: string): string {
  return texte
    .replace(/[#*`$_]/g, "")         // Enlève le markdown et le LaTeX
    .replace(/[\n\r]+/g, " ")        // Remplace les sauts de ligne par des espaces
    .replace(/concept\s*:\s*/gi, "") // Nettoie le jargon d'indexation visuel
    .trim();
}

/**
 * Arrête net l'audio en cours en mémoire pour empêcher tout doublon ou écho
 */
export function ArreterAbsolumentToutAudio(): void {
  if (instanceAudioEnCours) {
    instanceAudioEnCours.pause();
    instanceAudioEnCours.currentTime = 0;
    instanceAudioEnCours = null;
    console.log("[RATISS AUDIO] Canal vocal réinitialisé.");
  }
}

/**
 * Exécute exclusivement la voix féminine stable (Anciennement TTS 2)
 */
export async function gererFluxAudioUnique(texteBrut: string): Promise<void> {
  const textePropre = normaliserTextePourAudio(texteBrut);

  // Sécurité anti-superposition : extinction immédiate du thread précédent
  ArreterAbsolumentToutAudio();

  console.log("[RATISS AUDIO] Éxécution exclusive sur le canal vocal stable féminin.");
  
  try {
    const response = await fetch(`/api/cognitive/tts?text=${encodeURIComponent(textePropre)}&voice=Gilles-High&speed=0.88`);
    if (!response.ok) throw new Error("Erreur TTS");
    
    const blob = await response.blob();
    const audio = new Audio(URL.createObjectURL(blob));
    instanceAudioEnCours = audio;
    
    return new Promise((resolve) => {
      audio.onended = () => {
        instanceAudioEnCours = null;
        resolve();
      };
      audio.onerror = () => {
        instanceAudioEnCours = null;
        resolve();
      };
      audio.play().catch(() => resolve());
    });
  } catch (error) {
    console.error("[RATISS AUDIO CRITICAL] Échec de la liaison avec le serveur vocal.", error);
  }
}
