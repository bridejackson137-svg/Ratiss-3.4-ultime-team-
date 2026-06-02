/**
 * RATISS ARCHITECTURE - SECURE PARSING KERNEL v5.2
 * Extrait et valide le JSON au milieu de n'importe quel texte parasite
 */

export function extraireEtParserJsonRatiss(chaineBrute: string): any {
  try {
    // 1. Recherche de la toute première accolade ouvrante et de la dernière fermante
    const premierIndex = chaineBrute.indexOf('{');
    const dernierIndex = chaineBrute.lastIndexOf('}');

    if (premierIndex === -1 || dernierIndex === -1) {
      throw new Error("Aucune structure JSON valide détectée dans le flux.");
    }

    // 2. Extraction chirurgicale du bloc JSON uniquement
    const jsonPropre = chaineBrute.substring(premierIndex, dernierIndex + 1);

    // 3. Parsing de sécurité
    return JSON.parse(jsonPropre);

  } catch (erreur) {
    console.error("[RATISS PARSER CRITICAL] Échec du nettoyage sémantique. Génération d'un payload de secours.", erreur);
    
    // BACKUP PROTOCOLE : Si tout a foiré, on fabrique un JSON sain à la volée pour éviter le crash visuel
    return {
      pensees: "Rupture de formatage détectée, activation du protocole de secours.",
      action: "Restauration Système",
      reponse: chaineBrute, // On balance le texte brut ici pour qu'il soit au moins lisible
      statut: "DÉGRADÉ"
    };
  }
}
