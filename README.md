<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-531351318.png" />
</div>

# 🧠 RATISS Core Architecture — v4.0.0

Moteur d'orchestration cognitive non-euclidienne conçu pour éliminer la dérive sémantique et confiner le raisonnement des modèles de frontières dans les cas d'usage scientifiques et de haute précision.

---

## 🔬 Fondements Technologiques & Algorithmiques

L'architecture RATISS v4.0 n'utilise pas d'approches d'ingénierie classiques (euclidiennes). Le système résout les problèmes de saturation de contexte et d'hallucinations logiques via :
*   **Projection Hyperbolique :** Cartographie et confinement des trajectoires de raisonnement dans un espace de Poincaré en 768 dimensions.
*   **Verrou Entropique Strict :** Contrôle continu de la cohérence sémantique basé sur la divergence de Kullback-Leibler ($\Delta = 0.30$).
*   **Pipelines Multivariés :** Couplage de filtres de Kalman adaptatifs et de modèles de Markov cachés pour le traitement d'échantillons complexes.

---

## 🚀 Exécution Localement

### **Prérequis**
*   **Node.js** (Version LTS recommandée)
*   Une base de données **PostgreSQL** active (avec l'extension `pgvector` configurée pour la table principale)

### 🛠️ Installation et Initialisation

1. **Installer les dépendances du projet :**
```bash
   npm install
