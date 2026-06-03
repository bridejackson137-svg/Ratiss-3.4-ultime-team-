/**
 * RATISS FUSION CORE - CORE ORCHESTRATEUR v5.6
 * Gestionnaire de bascule automatique à tolérance de panne (Failover)
 */

import { executerDeviationQwen } from "./apiVaultRouter";

interface RequestPayload {
  prompt: string;
}

export async function executerRequeteSysteme(
  payload: RequestPayload, 
  API_KEYS: Record<string, string>
): Promise<string> {
  
  // Cartographie ordonnée de ton réseau d'ApiVault (Priorités 1 à 5)
  const reseauNoeuds = [
    { 
      id: 'QWE', 
      name: 'Qwen 3.7 (OpenAI Compatible)',
      executer: async () => executerDeviationQwen(payload, API_KEYS['QWEN_API_KEY']) 
    },
    { 
      id: 'OPE', 
      name: 'OpenAI GPT-4o',
      executer: async () => { throw new Error("Simulation : OpenAI en Standby."); } 
    },
    { 
      id: 'GRO', 
      name: 'Groq LLaMA-3',
      executer: async () => { throw new Error("Simulation : Groq Limite de requêtes atteinte."); } 
    },
    { 
      id: 'GOO', 
      name: 'Google Gemini 3.5',
      executer: async () => { throw new Error("Simulation : Gemini hors ligne ou quotas épuisés."); } 
    },
    { 
      id: 'WAV', 
      name: 'Wavespeed GPT-4o',
      executer: async () => {
        // Nœud de secours ultime si tout le reste a échoué
        return JSON.stringify({
          pensees: "Secours final activé suite à défaillance en cascade.",
          action: "Affichage Fallback Statique",
          reponse: "Le système RATISS a basculé sur son canal de réserve Wavespeed. Votre requête est traitée en mode dégradé.",
          statut: "ALIGNE_SECOURS"
        });
      }
    }
  ];

  // Boucle de routage instantané à tolérance de panne
  for (const noeud of reseauNoeuds) {
    try {
      console.log(`[FUSION CORE] Évaluation du canal : [${noeud.id}] - ${noeud.name}`);
      
      // Exécution de l'appel API du nœud en cours
      const resultatBrut = await noeud.executer();
      
      // ----------------------------------------------------------------------
      // SÉCURITÉ ET INTERCEPTION : LE BOUCLIER ANTI-BUG DE RATISS
      // ----------------------------------------------------------------------
      
      // Détection 1 : Si le serveur a renvoyé un message textuel d'erreur de token
      if (
        resultatBrut.includes("Le flux de données a été interrompu") || 
        resultatBrut.includes("augmenter le paramètre max_tokens") ||
        resultatBrut.includes("V5.0 PROTOCOL")
      ) {
        throw new Error(`Trame corrompue détectée (coupure de tokens serveur) sur le nœud [${noeud.id}].`);
      }

      // Détection 2 : Validation structurelle du JSON. Si le JSON est incomplet, JSON.parse va lever une erreur
      const verificationStructurelle = JSON.parse(resultatBrut);
      
      // Détection 3 : Validation des clés obligatoires du protocole RATISS
      if (!verificationStructurelle.reponse || !verificationStructurelle.statut) {
        throw new Error(`Structure de données non conforme aux exigences RATISS sur le nœud [${noeud.id}].`);
      }

      // Si le flux passe toutes les barrières avec succès :
      console.log(`[FUSION CORE] Connexion établie. Canal [${noeud.id}] validé et verrouillé.`);
      return resultatBrut;

    } catch (error: any) {
      // En cas d'échec, le catch intercepte l'erreur, l'affiche dans les logs de développement,
      // et laisse la boucle for passer DIRECTEMENT au nœud suivant (Switch automatique)
      console.warn(`[FUSION CORE WARNING] Défaillance sur le canal [${noeud.id}] : ${error.message}`);
      console.log(`[FUSION CORE] Déviation immédiate vers la priorité suivante...`);
    }
  }

  // Si la boucle se termine sans qu'aucun return n'ait été exécuté, crash de sécurité général
  throw new Error("[FUSION CORE CRITICAL] Effondrement total du réseau ApiVault. Aucun nœud n'est fonctionnel.");
}
