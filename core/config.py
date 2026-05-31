"""
config.py
═══════════════════════════════════════════════════════════════════════
RATISS — Global Configuration & Parameter Management (v3.4)
═══════════════════════════════════════════════════════════════════════
Defines token presets and global settings for all routed APIs,
preventing truncation under high-density semantic fusion.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Dict


@dataclass
class RATISSConfig:
    """
    Conteneur de configuration global de RATISS v3.4.
    Contient les limites de jetons (Token Presets) nécessaires pour chaque échelon 
    de fusion cognitive.
    """
    # 1. Presets de jetons nominaux du système
    token_presets: Dict[str, int] = field(default_factory=lambda: {
        "DEFAULT": 200,     # "MARGE" : Quick routing & light reflex loops
        "MEDIUM": 1000,    # "MOYEN" : Multi-sector sedimentation calculation
        "MAXIMUM": 8000    # "MAXIMUM" : Deep quantum & mathematical reasoning proofs
    })
    
    # 2. Assignation automatique des alias francophones conformément aux spécifications
    alias_map: Dict[str, str] = field(default_factory=lambda: {
        "marge": "DEFAULT",
        "default": "DEFAULT",
        "moyen": "MEDIUM",
        "medium": "MEDIUM",
        "maximum": "MAXIMUM"
    })
    
    # Paramètres de courbure et géométrie globale
    default_curvature: float = 1.0
    dim_embeddings: int = 768

    def get_max_tokens(self, preset_name: str) -> int:
        """
        Résout le nombre de tokens maximal associé au preset ou alias spécifié.
        Retourne la valeur du preset DEFAULT en cas d'absence.
        """
        clean_key = str(preset_name).lower().strip()
        resolved_key = self.alias_map.get(clean_key, "DEFAULT")
        return self.token_presets[resolved_key]
