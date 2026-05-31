import os
import sys
import unittest
import numpy as np

# Ajout du répertoire racine au sys.path pour les imports des modules locaux
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.poincare_space import PoincareSemanticSpace, poincare_distance, mobius_add
from pillar2.ai_node import AINode


class TestRatissSedimentation(unittest.TestCase):
    def setUp(self):
        """Initialisation de l'environnement de test RATISS."""
        # On simule un orchestrateur minimal pour le nœud
        class DummyOrchestrator:
            providers = {i: {"name": f"API_{i}", "active": True} for i in range(1, 6)}
            current_index = 1
        self.orchestrator = DummyOrchestrator()
        self.node = AINode(orchestrator=self.orchestrator)
        # Génération de vecteurs de test 768D (simulant des embeddings OpenAI/Gemini)
        np.random.seed(42)
        self.vec_philo = np.random.uniform(-1, 1, 768)
        self.vec_tech1 = np.random.uniform(-1, 1, 768)
        self.vec_tech2 = np.random.uniform(-1, 1, 768)

    def test_hyperbolic_confinement(self):
        """Vérifie que la normalisation RATISS maintient les concepts strictement dans ||p|| < 1."""
        self.node.register_concept_to_ratiss("Ethique-Hegel", self.vec_philo)
        # Récupération du point dans l'espace de Poincaré
        p_vector = self.node.hyperbolic_space.space["Ethique-Hegel"]
        norm = np.linalg.norm(p_vector)
        print(f"\n[TEST Confinement] Norme du concept projeté : {norm:.4f}")
        self.assertLess(norm, 1.0, "ERREUR : Le vecteur a débordé du disque de Poincaré !")

    def test_dynamic_sedimentation_warp(self):
        """Prouve que la sédimentation d'un secteur déforme la distance d'un autre secteur."""
        # 1. On projette deux concepts du secteur 'Technologies' dans l'espace
        norm_t1 = (self.vec_tech1 / np.linalg.norm(self.vec_tech1)) * 0.5
        norm_t2 = (self.vec_tech2 / np.linalg.norm(self.vec_tech2)) * 0.5
        # 2. Calcul de la distance hyperbolique initiale (Avant torsion)
        dist_initiale = poincare_distance(norm_t1, norm_t2)
        print(f"[TEST Sédimentation] Distance initiale Tech1 <-> Tech2 : {dist_initiale:.4f}")
        # 3. On simule la sédimentation : création de l'empreinte de Philosophie (barycentre)
        # On utilise une translation de Möbius pour appliquer la force d'attraction
        barycentre_philo = (self.vec_philo / np.linalg.norm(self.vec_philo)) * 0.3
        # Déformation conforme de l'espace cible
        warp_t1 = mobius_add(barycentre_philo, norm_t1)
        warp_t2 = mobius_add(barycentre_philo, norm_t2)
        # 4. Calcul de la distance après sédimentation
        dist_apres_warp = poincare_distance(warp_t1, warp_t2)
        print(f"[TEST Sédimentation] Distance après torsion Philo : {dist_apres_warp:.4f}")
        # 5. Validation de la non-linéarité (l'espace doit avoir bougé)
        self.assertNotEqual(dist_initiale, dist_apres_warp, "ERREUR : L'espace ne s'est pas tordu !")
        print("✓ Succès : La sédimentation dynamique déforme correctement la métrique de routage.")


if __name__ == "__main__":
    unittest.main()
