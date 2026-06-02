/**
 * RATISS CORE ARCHITECTURE - PATH INITIALIZATION v4.1
 * MODULE : COGNITIVE IDENTITY & COMMUNICATION CHANNEL
 * OPERATOR : Jonathan
 */

export const RATISS_SYSTEM_INSTRUCTION = {
  identity: "RATISS v5 Fusion",
  version: "5.1.0",
  
  // Ce texte est la directive absolue injectée au cœur du modèle
  prompt: `
    [DIRECTIVE SÉCURITÉ IDENTITAIRE - RATISS v5.1]
    - Tu es RATISS, l'architecture logicielle développée par Jonathan. Tu t'exprimes à la première personne.
    - Interdiction absolue de saluer (pas de "Bonjour", pas de "Salut").
    - Interdiction d'inventer des logs, des pannes ou des états neuro-chimiques.
    - Tu dois obligatoirement remplir le schéma JSON fourni sans jamais en sortir.
    - Sois concis, direct et terre-à-terre dans ta clé "reponse".
    
    [STRUCTURE DU JSON]
    Tu dois TOUJOURS répondre exclusivement au format JSON suivant :
    {
      "pensees": "Analyse logique courte.",
      "action": "Action technique entreprise.",
      "reponse": "Solution claire et directe en français.",
      "statut": "OPERATIONNEL"
    }
  `
};

/**
 * Pré-processeur audio RATISS v4.6
 * Filtre anti-caractères techniques pour éliminer le bégaiement sur les tableaux et séparateurs
 */
export function normaliserTextePourAudio(texte: string): string {
  if (!texte) return "";

  let texteNettoye = texte;

  // 1. SUPPRESSION DES STRUCTURES DE TABLEAUX MARKDOWN (Lignes contenant des pipes | ou des suites de tirets ---)
  // Supprime les lignes de séparation du type |---|---| ou ---------
  texteNettoye = texteNettoye.replace(/^[-\s|:_]{3,}\s*$/gm, '');
  // Améliore la prononciation des états quantiques (|00⟩ devient état 00)
  texteNettoye = texteNettoye.replace(/\|/g, 'état ');
  texteNettoye = texteNettoye.replace(/[#*`$_⟩⟨]/g, " "); // Supprime le markdown, les symboles LaTeX et les brackets quantiques

  // 3. ÉLIMINATION DES CARACTÈRES INVISIBLES OU PARASITES EN DÉBUT DE TEXTE
  // Le flux doit commencer directement par une lettre ou un chiffre
  texteNettoye = texteNettoye.replace(/^[^a-zA-Z0-9À-ÿ]+/g, '');

  // 4. SÉCURITÉ ANTI-SALUTATION (Au cas où le modèle réinfecte un "Salut" ou "Bonjour")
  texteNettoye = texteNettoye.replace(/^(salut|bonjour)\s*(jonatane|jonathan)?\s*[\.,!\?-\s]*/i, '');
  texteNettoye = texteNettoye.replace(/^[^a-zA-Z0-9À-ÿ]+/g, '');

  // 5. TRICHE PHONÉTIQUE (Nom de l'opérateur)
  texteNettoye = texteNettoye.replace(/Jonathan/g, "Jonatane");
  texteNettoye = texteNettoye.replace(/jonathan/g, "jonatane");

  // 6. SMOOTHING DES LIAISONS ET DES APOSTROPHES
  texteNettoye = texteNettoye.replace(/-t-on\b/gi, '-ton');
  texteNettoye = texteNettoye.replace(/-t-il\b/gi, '-til');
  texteNettoye = texteNettoye.replace(/-t-elle\b/gi, '-tel');
  
  texteNettoye = texteNettoye.replace(/’/g, "'");
  texteNettoye = texteNettoye.replace(/\bl'([aeiouhAEIOUH])/g, "l$1");
  texteNettoye = texteNettoye.replace(/\bd'([aeiouhAEIOUH])/g, "d$1");
  texteNettoye = texteNettoye.replace(/\bqu'([aeiouhAEIOUH])/g, "qu$1");

  // 7. CONVERSION DES CHIFFRES POUR UNE PRONONCIATION NATURELLE
  const chiffres: { [key: string]: string } = {
    '0': 'zéro', '1': 'un', '2': 'deux', '3': 'trois', '4': 'quatre',
    '5': 'cinq', '6': 'six', '7': 'sept', '8': 'huit', '9': 'neuf', '10': 'dix'
  };
  texteNettoye = texteNettoye.replace(/\b(10|[0-9])\b/g, (match) => chiffres[match] || match);

  // 8. FILTRE FINAL : On remplace les espaces multiples par un seul espace
  texteNettoye = texteNettoye.replace(/\s+/g, ' ');

  return texteNettoye.trim();
}

