<div align="center">
  <img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-531351318.png" />
</div>

# 🧠 SIMULATEUR COGNITIF RATISS — v3.4_768D

Moteur d'orchestration cognitive et topologie synaptique conçu pour la recherche de haute précision, intégrant une sécurité Failover avancée et une gestion de flux biométrique.

---

## 🔬 Fondements de l'Architecture

*   **Topologie Constante :** Espace de calcul architecturé en `768-D CORE`.
*   **Réseau ApiVault Résilient :** Gestion d'un cluster de secours multicouches (Google Gemini 3.5, OpenAI GPT-4o, Groq LLaMA-3, Anthropic Claude 3.5, Wavespeed GPT-4o) avec déviation immédiate en cas d'épuisement du canal actif.
*   **Infrastructure de Données :** Couplage temps-réel géré via une architecture `Supabase Realtime Connected`.

---

## 🚀 Exécution Localement

### **Prérequis**
*   **Node.js** (Version LTS)
*   Un projet **Supabase** actif (Base de données relationnelle et Realtime activé)

### 🛠️ Installation et Initialisation

1. **Installer les dépendances :**
```bash
   npm install

Configurer les variables d'environnement :
Créez un fichier .env.local à la racine et configurez vos accès d'infrastructure :

Extrait de code
   NEXT_PUBLIC_SUPABASE_URL=[https://votre-projet.supabase.co](https://votre-projet.supabase.co)
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_publique_ici
Lancer l'application :

Bash
   npm run dev
🛡️ Protocole de Production
Le projet étant dans une phase d'infrastructure souveraine critique, toutes les modifications sur la branche principale sont calculées.

Branches dédiées : Développements isolés via des branches spécifiques avant fusion.

Déploiement en ligne : Configuration optimisée pour un déploiement continu sur Vercel connecté à Supabase.
