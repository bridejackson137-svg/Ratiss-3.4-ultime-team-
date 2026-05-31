"""
predictive_routing.py
═══════════════════════════════════════════════════════════════════════
RATISS — Pillar 2: Predictive Routing Optimization Module
═══════════════════════════════════════════════════════════════════════
Implements Point 3: Predictive Routing Optimization.
Computes distance d_H of an incoming query embedding to the 7 functional
sectors in the Poincaré semantic space. Integrates cost/capability profiles
per provider to select the mathematically optimal LLM engine.
"""
from __future__ import annotations
import numpy as np
from typing import Dict, List, Optional, Tuple
from core.poincare_space import (
    project_to_poincare,
    poincare_distance,
    _clamp_to_ball,
    _DTYPE
)

class PredictiveRouter:
    """
    Optimisateur de routage dynamique utilisant la géométrie hyperbolique.
    Évalue les vecteurs de requêtes dans la boule de Poincaré (768D) et
    les oriente vers le fournisseur d'API le plus qualifié (ID 1 à 5).
    """
    def __init__(self, curvature: float = 1.0):
        self.curvature = curvature
        
        # 1. Définition des 7 secteurs fonctionnels de RATISS
        self.sectors = [
            "physique",
            "philosophie",
            "technologie",
            "biologie",
            "sciences_sociales",
            "arts",
            "metacognition"
        ]
        
        # 2. Génération déterministe d'ancres orthogonales/stables pour chaque secteur
        # Permet d'avoir des points géométriques stables même en l'absence de concepts
        rng = np.random.RandomState(4242)
        self.sector_anchors: Dict[str, np.ndarray] = {}
        for s in self.sectors:
            raw_v = rng.uniform(-1.0, 1.0, 768)
            # Projection directe dans la boule de Poincaré pour confinement
            self.sector_anchors[s] = project_to_poincare(raw_v, curvature=self.curvature)
            
        # 3. Profils d'affinités sectorielles et de capacités des fournisseurs (ID 1 à 5)
        # Les valeurs représentent le coefficient d'adéquation S -> Provider ∈ [0, 1]
        self.provider_profiles: Dict[int, Dict[str, float]] = {
            1: { # OpenAI (gpt-4o) - Écurie généraliste très performante
                "physique": 0.85, "philosophie": 0.90, "technologie": 0.80,
                "biologie": 0.75, "sciences_sociales": 0.85, "arts": 0.80, "metacognition": 0.85
            },
            2: { # Anthropic (claude-3-5-sonnet) - Raisonnement complexe et abstrait
                "physique": 0.80, "philosophie": 0.98, "technologie": 0.85,
                "biologie": 0.80, "sciences_sociales": 0.95, "arts": 0.70, "metacognition": 0.90
            },
            3: { # Mistral (mistral-large) - Modèle polyvalent, souveraineté européenne
                "physique": 0.70, "philosophie": 0.75, "technologie": 0.70,
                "biologie": 0.65, "sciences_sociales": 0.80, "arts": 0.85, "metacognition": 0.70
            },
            4: { # Groq (llama3) - Vitesse fulgurante, idéal pour la technologie/routages bas niveaux
                "physique": 0.60, "philosophie": 0.40, "technologie": 0.95,
                "biologie": 0.50, "sciences_sociales": 0.50, "arts": 0.60, "metacognition": 0.80
            },
            5: { # Wavespeed (gpt-4o / fast) - Latence ultra-basse et précision technique élevée
                "physique": 0.90, "philosophie": 0.60, "technologie": 0.98,
                "biologie": 0.70, "sciences_sociales": 0.65, "arts": 0.75, "metacognition": 0.85
            }
        }
        
        # Mapping explicite pour la traçabilité
        self.provider_names = {
            1: "OpenAI gpt-4o",
            2: "Anthropic claude-3-5-sonnet",
            3: "Mistral Large",
            4: "Groq LLaMA-3",
            5: "Wavespeed GPT-4o"
        }

    def predict_best_provider(
        self,
        query_embedding_768d: np.ndarray,
        dynamic_barycenters: Optional[Dict[str, np.ndarray]] = None,
        barycenter_weight: float = 0.40
    ) -> Tuple[int, str, Dict[int, float]]:
        """
        Détermine le meilleur canal parmi les 5 disponibles pour une requête donnée.
        
        Algorithme :
        1. Projection du vecteur requête dans l'espace de Poincaré.
        2. Calcul de la distance d_H à chaque secteur (combinant ancre statique et barycentre dynamique si présent).
        3. Normalisation des proximités (Softmax des inverses de distance).
        4. Évaluation du produit de convolution géométrique (Proximité sémantique * Profil d'aptitude).
        5. Sélection de l'ID avec le score maximal.
        """
        query_v = np.asarray(query_embedding_768d, dtype=_DTYPE).ravel()
        # Étape 1 : Projection et confinement
        p_query = project_to_poincare(query_v, curvature=self.curvature)
        
        # Étape 2 : Évaluation des distances hyperboliques
        distances_to_sectors: Dict[str, float] = {}
        for sector in self.sectors:
            # Récupération de l'ancre de référence
            anchor = self.sector_anchors[sector]
            
            # Ajustement si un barycentre dynamique actif est fourni
            if dynamic_barycenters and sector in dynamic_barycenters and dynamic_barycenters[sector] is not None:
                dynamic_b = dynamic_barycenters[sector]
                # Le point de référence sémantique glisse vers le barycentre dynamique des concepts actifs
                reference_point = _clamp_to_ball(
                    (1 - barycenter_weight) * anchor + barycenter_weight * dynamic_b,
                    self.curvature
                )
            else:
                reference_point = anchor
                
            # Calcul de la distance hyperbolique stricte
            dist = float(poincare_distance(p_query, reference_point, self.curvature))
            distances_to_sectors[sector] = max(dist, 1e-5)
            
        # Étape 3 : Conversion des distances en poids d'affinités (Proximités sémantiques réparties par Softmax)
        # Plus un secteur est proche du vecteur, plus son poids d'affinité est élevé.
        inv_distances = np.array([1.0 / distances_to_sectors[s] for s in self.sectors])
        exp_inv = np.exp(inv_distances - np.max(inv_distances)) # Stabilité numérique
        proximity_weights = exp_inv / np.sum(exp_inv)
        
        sector_proximities = dict(zip(self.sectors, proximity_weights))
        
        # Étape 4 : Calcul du score cumulatif d'adéquation pour chaque fournisseur
        scores: Dict[int, float] = {}
        for p_id, profile in self.provider_profiles.items():
            score = 0.0
            for sector, prox in sector_proximities.items():
                # Produit scalaire sémantique entre la proximité du besoin et la capacité du fournisseur
                score += prox * profile[sector]
            scores[p_id] = float(score)
            
        # Étape 5 : Sélection de l'optimum
        best_provider_id = int(max(scores, key=scores.get))
        best_provider_name = self.provider_names[best_provider_id]
        
        return best_provider_id, best_provider_name, scores
