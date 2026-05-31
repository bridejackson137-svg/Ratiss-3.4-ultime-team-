import os
import sys
import unittest
import numpy as np

# Ajout du répertoire racine au sys.path pour les imports des modules locaux
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.poincare_space import _safe_norm
from pillar2.ai_node import AINode


class TestRATISSPredictiveRouting(unittest.TestCase):
    """
    Validation unitaire pour RATISS (v3.4) - Point 3 :
    Optimisation du Routage Prédictif Non Euclidien par produit de convolution géométrique.
    """

    def setUp(self):
        # On simule un orchestrateur minimal
        class DummyOrchestrator:
            def __init__(self):
                self.current_index = 1
                self.providers = {i: {"name": f"API_{i}", "active": True} for i in range(1, 6)}

        self.orchestrator = DummyOrchestrator()
        self.ai_node = AINode(orchestrator=self.orchestrator)
        
        # Reproductibilité numérique
        np.random.seed(999)

    def test_static_routing_prediction(self):
        """Vérifie que le routeur attribue un fournisseur valide pour divers embeddings d'entrée."""
        dim = 768
        
        # Test 1 : Requête aléatoire 1
        query_v1 = np.random.randn(dim) * 0.5
        best_id1 = self.ai_node.predict_best_provider(query_v1)
        
        # L'ID retourné doit faire partie des 5 fournisseurs valides [1, 2, 3, 4, 5]
        self.assertIn(best_id1, [1, 2, 3, 4, 5], "Le fournisseur calculé doit être entre 1 et 5.")
        
        # L'index de l'orchestrateur doit également être synchronisé
        self.assertEqual(self.orchestrator.current_index, best_id1, "L'orchestrateur doit se synchroniser avec l'index prédit.")

    def test_dynamic_barycenter_routing_shift(self):
        """
        Prouve que la sédimentation d'un concept influence de manière dynamique
        les scores de routage d'une même requête en déplaçant le barycentre d'un secteur.
        """
        dim = 768
        query_test = np.random.randn(dim) * 0.4
        
        # 1. Calcul initial des scores pour la requête sans concepts dynamiques actifs
        best_id_before, _, scores_before = self.ai_node.router.predict_best_provider(query_test)
        
        # 2. Ajout dynamique d'un concept extrêmement lourd et polarisé dans "philosophie"
        # On simule un concept philo très fort pour déplacer le barycentre vers un point spécifique
        polarized_concept = np.random.randn(dim) * 3.0
        self.ai_node.register_concept_to_ratiss(
            concept_name="Super-Ethique-Hegel",
            raw_vector_768d=polarized_concept,
            sector="philosophie"
        )
        
        # Obtenir les barycentres réels (qui incluront désormais "philosophie")
        dynamic_barycenters = {
            "philosophie": self.ai_node.calculate_sector_barycenter("philosophie")
        }
        
        # 3. Recalcul des scores de routage avec l'empreinte sédimentaire dynamique
        best_id_after, _, scores_after = self.ai_node.router.predict_best_provider(
            query_embedding_768d=query_test,
            dynamic_barycenters=dynamic_barycenters
        )
        
        # Afin de valider la réactivité de la topologie, le dictionnaire de score après sédimentation
        # doit avoir changé par rapport au dictionnaire initial.
        for provider_id in [1, 2, 3, 4, 5]:
            self.assertNotEqual(
                scores_before[provider_id],
                scores_after[provider_id],
                f"Le score de routage du fournisseur {provider_id} doit réagir élastiquement à la sédimentation."
            )
            
        print(f"\n[TEST Routage] ID Avant Sédimentation : {best_id_before} -> Après : {best_id_after}")
        print("✓ Succès : Le routage prédictif réagit de façon élastique et dynamique à la sédimentation des secteurs.")


if __name__ == "__main__":
    unittest.main()
