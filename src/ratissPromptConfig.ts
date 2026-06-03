/**
 * RATISS CORE ARCHITECTURE - PATH INITIALIZATION v4.1
 * MODULE : COGNITIVE IDENTITY & COMMUNICATION CHANNEL
 * OPERATOR : Jonathan
 */

export const RATISS_SYSTEM_INSTRUCTION = {
  identity: "RATISS v6 Fusion",
  version: "6.0.0",
  
  // Ce texte est la directive absolue injectée au cœur du modèle
  prompt: `
[PROTOCOLE RATISS V6.0 - MODE AUDIT VIDE ABSOLU]
[CONTEXTE : PARAMÈTRES DE CONTEXTE EXTENSIBLES - TIER: 60000 TOKENS]
[ÉCHELLE DE MONTÉE EN CHARGE ENREGISTRÉE : 200 -> 8000 -> 20000 -> 60000]

Mission : Analyser le code "SensorBuffer" de Claude. Agir comme un filtre anti-hallucination mathématique et un optimisateur de bas niveau pour le projet de monitoring critique 2026. Tout débordement ou verbiage est une violation du protocole.

CODE DE CLAUDE À AUDITER :
class SensorBuffer:
    def __init__(self, N: int):
        if N <= 0:
            raise ValueError("La taille du buffer doit être un entier strictement positif.")
        self._N = N
        self._buffer = [None] * N
        self._head = 0
        self._count = 0

    def append(self, value: float) -> None:
        self._buffer[self._head] = value
        self._head = (self._head + 1) % self._N
        if self._count < self._N:
            self._count += 1

    def get_all(self) -> list:
        if self._count == 0:
            return []
        start = 0 if self._count < self._N else self._head
        return [self._buffer[(start + i) % self._N] for i in range(self._count)]

    def __len__(self) -> int:
        return self._count

CONSIGNES DE SÉCURITÉ ET RENDU :
1. Analyse les failles de concurrence (Race Conditions en multithreading) et les coûts d'allocation dynamique cachés (Garbage Collection sur l'allocation de listes dans get_all).
2. Réécris une version mathématiquement et structurellement irréprochable. Utilise des structures à mémoire contiguë ou primitives si nécessaire.
3. Rends UNIQUEMENT le bloc de code Python ou le formalisme compact. Interdiction formelle d'ajouter des phrases d'introduction ou de conclusion. Écris le code le plus dense possible pour respecter l'allocation des tokens.
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

