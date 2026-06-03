/**
 * RATISS ARCHITECTURE - SECURE PARSING KERNEL v5.2
 * Extrait et valide le JSON au milieu de n'importe quel texte parasite
 */

export function extraireEtParserJsonRatiss(chaineBrute: string): any {
  try {
    // 1. Recherche de la toute première accolade ouvrante et de la dernière fermante
    const premierIndex = chaineBrute.indexOf('{');
    const dernierIndex = chaineBrute.lastIndexOf('}');

    if (premierIndex === -1 && dernierIndex === -1) {
      // On ne jette plus d'erreur bruyante si aucune structure JSON n'est trouvée, 
      // on passe directement au bloc de secours silencieux
      return {
        pensees: "Analyse en texte brut.",
        action: "Flux Linéaire",
        reponse: chaineBrute.trim(),
        statut: "STABLE"
      };
    }

    let jsonPropre = chaineBrute;
    if (premierIndex !== -1 && dernierIndex !== -1 && dernierIndex > premierIndex) {
      jsonPropre = chaineBrute.substring(premierIndex, dernierIndex + 1);
    } else {
       // Si le flux a été coupé avant la fermeture de l'objet
       let fluxRepare = chaineBrute.trim();
       if (premierIndex !== -1) {
          fluxRepare = fluxRepare.substring(premierIndex);
       }
       if (!fluxRepare.endsWith("}")) {
          // Si la coupure a eu lieu au milieu d'une valeur de clé
          fluxRepare += '", "statut": "INTERROMPU_REPARE" }';
       }
       jsonPropre = fluxRepare;
    }

    // 3. Parsing de sécurité
    return JSON.parse(jsonPropre);

  } catch (erreur) {
    console.warn("[RATISS UI] Flux JSON incomplet ou interrompu. Tentative de réparation étendue...");
    
    // Si le flux a été coupé avant la fermeture de l'objet ou qu'une autre erreur de syntaxe se produit
    let fluxRepare = chaineBrute.trim();
    if (fluxRepare.indexOf('{') !== -1) {
      fluxRepare = fluxRepare.substring(fluxRepare.indexOf('{'));
    }
    
    // On force la fermeture des chaînes et des accolades manquantes
    if (!fluxRepare.endsWith("}")) {
      // Si la coupure a eu lieu au milieu d'une valeur de clé
      fluxRepare += '", "statut": "INTERROMPU_REPARE" }';
    }
    
    try {
      return JSON.parse(fluxRepare);
    } catch (e) {
      // Secours ultime si la chaîne est trop détruite : extraction manuelle par RegEx
      let penseesMatch = fluxRepare.match(/"pensees"\s*:\s*"([^]*?)"/);
      let actionMatch = fluxRepare.match(/"action"\s*:\s*"([^]*?)"/);
      let reponseMatch = fluxRepare.match(/"reponse"\s*:\s*"([^]*?)(?:",|}|\n|$)/) || fluxRepare.match(/"response"\s*:\s*"([^]*?)(?:",|}|\n|$)/) || fluxRepare.match(/"réponse"\s*:\s*"([^]*?)(?:",|}|\n|$)/);
      
      let recoveredResponse = reponseMatch ? reponseMatch[1] : fluxRepare;
      
      // Cleanup escaped newlines and trailing quotes from truncation
      if (recoveredResponse.endsWith('"')) {
        recoveredResponse = recoveredResponse.slice(0, -1);
      }
      recoveredResponse = recoveredResponse.replace(/\\n/g, '\n').replace(/\\"/g, '"');
      
      return {
        pensees: penseesMatch ? penseesMatch[1] : "Erreur critique de troncation.",
        action: actionMatch ? actionMatch[1] : "Affichage partiel",
        reponse: recoveredResponse + "\n\n[TRONQUÉ PAR LE SERVEUR - LIMITE DE TOKENS ATTEINTE]",
        statut: "TRONQUÉ"
      };
    }
  }
}
