/**
 * RATISS CORE ARCHITECTURE - CONTEXT ORCHESTRATOR
 * MODULE : DYNAMIC TOKEN SWITCHER v1.0
 */

export type TokenProfile = 'BASIC' | 'MEDIUM' | 'MAX_RESOURCE';

interface ModelConfig {
  maxOutputTokens: number;
  temperature: number;
}

export class RatissTokenSwitcher {
  
  /**
   * Analyse l'intention et la complexité de l'input pour déterminer le profil de tokens
   */
  public static evaluerProfilInput(input: string | undefined | null): TokenProfile {
    if (!input) return 'BASIC';
    const texte = input.toLowerCase().trim();

    // 1. Détection des requêtes complexes (Calculs, Code lourd, Théories)
    const motsClesMax = [
      'calcul', 'quantique', 'théorie', 'algorithme', 'pipeline', 
      'complet', 'architecture', 'structure', 'implémentation', 'base de données',
      'développement', 'backend', 'frontend', 'supabase'
    ];
    
    // 2. Détection des requêtes basiques (Salutations, réponses courtes)
    const motsClesBasic = [
      'salut', 'bonjour', 'ça va', 'test', 'ok', 'merci', 'hello'
    ];

    // Si l'input contient un mot-clé hautement technique ou est très long
    if (motsClesMax.some(mot => texte.includes(mot)) || texte.length > 300) {
      return 'MAX_RESOURCE'; // Profil 8000 tokens
    }

    // Si c'est une salutation simple ou un texte très court (moins de 4 mots)
    if (motsClesBasic.some(mot => texte.includes(mot)) || texte.split(/\s+/).length <= 4) {
      return 'BASIC'; // Profil 200 tokens par défaut
    }

    // Par défaut, pour les questions intermédiaires
    return 'MEDIUM'; // Profil 1000 tokens
  }

  /**
   * Renvoie les constantes de génération adaptées au profil
   */
  public static obtenirConfigurationGeneration(input: string | undefined | null): ModelConfig {
    const profil = this.evaluerProfilInput(input);

    switch (profil) {
      case 'BASIC':
        return {
          maxOutputTokens: 200, // Strict minimum pour les salutations et réponses fluides
          temperature: 0.2     // Très factuel, évite les dérives pseudo-techniques
        };
      case 'MEDIUM':
        return {
          maxOutputTokens: 1000, // Pour les explications et analyses standards
          temperature: 0.4
        };
      case 'MAX_RESOURCE':
        return {
          maxOutputTokens: 8000, // Pleine puissance pour le code et les gros calculs
          temperature: 0.5       // Légère flexibilité pour la résolution de problèmes complexes
        };
      default:
        return {
          maxOutputTokens: 1000,
          temperature: 0.4
        };
    }
  }
}
