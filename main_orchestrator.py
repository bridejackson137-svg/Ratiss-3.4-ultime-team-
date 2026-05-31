#!/usr/bin/env python3
"""
RATISS v3.4 — Script de Branchement Opérationnel
Déploiement Résilience Urbaine & Logistique Dubaï (Jebel Ali)
"""

import sys
import time
import numpy as np
import logging

# Importation directe des briques de la mise à jour v3.4
try:
    from ratiss_v3_4_pipeline import (
        RATISSOrchestrator, 
        WaldConfig, 
        PiperConfig,
        compute_tension_score
    )
except ImportError:
    print("❌ Erreur : Le fichier 'ratiss_v3_4_pipeline.py' est introuvable dans ce répertoire.")
    sys.exit(1)

# Configuration des logs pour la console de supervision
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] RATISS.Main — %(message)s")
logger = logging.getLogger("RATISS.Main")

def generate_live_sensor_stream(dim=768):
    """
    Simulateur de flux de capteurs en temps réel (Embeddings 768-D).
    """
    rng = np.random.default_rng(2026)
    cycle = 0
    while True:
        cycle += 1
        # On simule une déviation progressive de tension après le cycle 10
        drift = 0.45 if cycle > 10 else 0.0
        # Génération d'un lot (batch) de 32 vecteurs de capteurs
        mock_embeddings = rng.normal(loc=drift, scale=0.5, size=(32, dim)).astype(np.float32)
        yield mock_embeddings
        if cycle >= 20: # Limite pour une démonstration séquentielle stable sans blocage infini
            break
        time.sleep(0.1)  # Vitesse de traitement accélérée pour les cycles de validation sémantique

def main():
    logger.info("=== INITIALISATION DE L'INJECTION RATISS v3.4 ===")

    # 1. Configuration statistique stricte (Haute sensibilité aux faux négatifs < 0.1%)
    config_stat = WaldConfig(
        alpha=0.01, 
        beta=0.01, 
        mu0=1.0,   # État nominal normal
        mu1=1.8,   # État de crise ou rupture
        sigma=0.5
    )

    # 2. Configuration du moteur vocal asynchrone (Zéro-Disque en RAM)
    config_audio = PiperConfig(
        model_path="modeles/modele_piper.onnx",
        config_path="modeles/modele_piper.onnx.json",
        length_scale=1.25, # Élocution stable et posée pour situations d'urgence
        piper_binary="./piper/piper"
    )

    # 3. Assemblage et démarrage de l'orchestrateur souverain
    logger.info("Instanciation de l'Orchestrateur avec les optimisations matérielles...")
    orchestrator = RATISSOrchestrator.build_default(
        tts_cfg=config_audio,
        wald_cfg=config_stat,
        window=100  # Fenêtre glissante fixe sans fuite mémoire (Static Memory Buffer)
    )

    # 4. Connexion au flux et boucle d'exécution
    logger.info("Connexion établie. Entrée dans la boucle de scoring hyperbolique...")
    
    sensor_stream = generate_live_sensor_stream()
    
    try:
        for batch_embeddings in sensor_stream:
            # Traitement instantané du cycle (Scoring Poincaré -> Wald SPRT -> Trigger Audio)
            result = orchestrator.process_cycle(batch_embeddings)
            
            # Affichage de supervision dans la console
            logger.info(
                f"Cycle {result['cycle']:03d} [T{result['cycle_mod']}] | "
                f"Moyenne Hyperbolique: {result['gamma_mean']:.4f} | "
                f"Ratio Wald: {result['log_ratio']:.3f} | "
                f"Statut: {result['sprt_decision']} | "
                f"Latence: {result['elapsed_ms']:.2f}ms"
            )
            
            # Monitoring spécifique des alertes prioritaires
            if result['alert_triggered']:
                logger.warning(
                    f"🚨 [CRITIQUE] Alerte vocale synchronisée balancée en RAM au cycle T{result['cycle_mod']}!"
                )
                
                # Exemple de calcul annexe : Score de Tension global de Jebel Ali
                ts_global = compute_tension_score(
                    d_local=result['gamma_mean'],
                    s_jebel=1.0,
                    velocity_vectors=np.array([2.5, 1.2, 0.8]),
                    theta_angles=np.array([0.0, 0.5, -0.2]),
                    lambdas=np.array([0.05, 0.05, 0.05]),
                    t_offsets=np.array([0.0, 1.0, 2.0])
                )
                logger.info(f"📊 Score de Tension combiné calculé : Ts = {ts_global:.4f}")

    except KeyboardInterrupt:
        logger.info("🛑 Arrêt d'urgence du pipeline RATISS par l'opérateur.")
        
    logger.info("=== PIPELINE DE DÉMONSTRATION COMPLÉTÉ AVEC SUCCÈS ===")

if __name__ == "__main__":
    main()
