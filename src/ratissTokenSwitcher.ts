/**
 * RATISS CORE ARCHITECTURE - CONTEXT ORCHESTRATOR
 * MODULE : DYNAMIC TOKEN SWITCHER v1.0
 */

export type TokenProfile = 'BASIC' | 'MEDIUM' | 'HIGH' | 'MAX_RESOURCE' | 'ULTIMATE';

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

    // 0. Détection mode audit vide absolu (mot-clé audit)
    if (texte.includes('audit') || texte.includes('claude') || texte.includes('sensorbuffer')) {
      return 'MAX_RESOURCE';
    }

    // 1. Détection des requêtes complexes (Calculs, Code lourd, Théories)
    const motsClesHigh = [
      'calcul', 'quantique', 'théorie', 'algorithme', 'pipeline', 
      'complet', 'architecture', 'structure', 'implémentation', 'base de données',
      'développement', 'backend', 'frontend', 'supabase'
    ];
    
    // 2. Détection des requêtes basiques (Salutations, réponses courtes)
    const motsClesBasic = [
      'salut', 'bonjour', 'ça va', 'test', 'ok', 'merci', 'hello'
    ];

    // Si requiert 60000 tokens (mode audit)
    if (texte.length > 5000 || texte.includes('audit vide absolu 60000')) {
      return 'ULTIMATE'; 
    }

    // Si requiert 20000 tokens
    if (texte.length > 2000) {
      return 'MAX_RESOURCE'; // Profil 20000 tokens
    }

    // Si l'input contient un mot-clé hautement technique ou est très long
    if (motsClesHigh.some(mot => texte.includes(mot)) || texte.length > 300) {
      return 'HIGH'; // Profil 8000 tokens
    }

    // Si c'est une salutation simple ou un texte très court (moins de 4 mots)
    if (motsClesBasic.some(mot => texte.includes(mot)) || texte.split(/\s+/).length <= 2) {
      return 'BASIC'; // Profil 200 tokens par défaut
    }

    // Par défaut, pour les questions intermédiaires
    return 'MEDIUM'; // Profil 4000 tokens
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
          maxOutputTokens: 4000, // Pour les explications et analyses standards
          temperature: 0.4
        };
      case 'HIGH':
        return {
          maxOutputTokens: 8000, 
          temperature: 0.5       
        };
      case 'MAX_RESOURCE':
        return {
          maxOutputTokens: 20000, 
          temperature: 0.0       
        };
      case 'ULTIMATE':
        return {
          maxOutputTokens: 60000, // Mode vide absolu maximal
          temperature: 0.0       
        };
      default:
        return {
          maxOutputTokens: 4000,
          temperature: 0.4
        };
    }
  }
}
