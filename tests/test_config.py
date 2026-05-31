import os
import sys
import unittest

# Ajout du répertoire racine au sys.path pour les imports des modules locaux
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.config import RATISSConfig
from pillar2.ai_node import AINode


class TestRATISSConfigAndTokenInjection(unittest.TestCase):
    """
    Validation unitaire pour RATISS (v3.4) - Point 1, 2, 3 et Config globale (Limiters).
    """

    def setUp(self):
        self.node = AINode()

    def test_config_presets(self):
        """Vérifie que les résolutions de configuration de configurations de tokens fonctionnent nominalement."""
        config = RATISSConfig()
        
        # Test des valeurs par défaut
        self.assertEqual(config.get_max_tokens("DEFAULT"), 200)
        self.assertEqual(config.get_max_tokens("MEDIUM"), 1000)
        self.assertEqual(config.get_max_tokens("MAXIMUM"), 8000)

        # Test des alias
        self.assertEqual(config.get_max_tokens("marge"), 200)
        self.assertEqual(config.get_max_tokens("moyen"), 1000)
        self.assertEqual(config.get_max_tokens("maximum"), 8000)

        # Résolution de secours en cas d'alias inconnu
        self.assertEqual(config.get_max_tokens("QuantumUltraExtrême"), 200)

    def test_payload_compilation_injection(self):
        """Vérifie que l'injection dynamique des tokens configurés se déroule sans accroc."""
        # On calcule le payload pour une analyse de sédimentation (MEDIUM)
        payload = self.node.execute_payload_compilation(
            provider_id=5, # Wavespeed
            prompt="Analyse de sédimentation sémantique non euclidienne...",
            preset="moyen"
        )
        
        self.assertEqual(payload["provider_id"], 5)
        self.assertEqual(payload["max_tokens"], 1000)
        self.assertEqual(payload["max_output_tokens"], 1000)
        self.assertEqual(self.node.max_output_tokens, 1000)
        self.assertEqual(payload["preset_applied"], "moyen")
        self.assertIn("prompt", payload)


if __name__ == "__main__":
    unittest.main()
