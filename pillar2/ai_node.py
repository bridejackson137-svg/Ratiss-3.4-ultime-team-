"""
ai_node.py
═══════════════════════════════════════════════════════════════════════
RATISS — Pillar 2: AI Execution Node (Unified Semantic Memory)
═══════════════════════════════════════════════════════════════════════
Implements Point 2: Inter-Sectoral Fusion via Dynamic Sedimentation.
Integrates the 768-dimensional hyperbolic Poincaré Disk model to allow
real-time, cross-sectoral warping of the semantic distance matrix
and dynamic routing weightings.
"""
from __future__ import annotations
import numpy as np
from typing import Dict, List, Optional, Tuple, Set
from core.poincare_space import (
    PoincareSemanticSpace,
    ConceptEntry,
    mobius_add,
    frechet_mean,
    poincare_distance_batch,
    _clamp_to_ball,
    _DTYPE
)
from core.predictive_routing import PredictiveRouter
from core.config import RATISSConfig

class AINode:
    """
    Le Node d'exécution cognitif principal pour RATISS v3.4.
    Fait converger les 7 secteurs opérationnels de RATISS au sein d'une seule 
    structure de mémoire unifiée non euclidienne. Gère la sédimentation sémantique 
    en temps réel par déformation géométrique des sous-espaces via Möbius addition.
    """
    def __init__(self, orchestrator=None):
        self.orchestrator = orchestrator
        
        # Initialisation de la structure globale de configuration
        self.config = RATISSConfig()
        
        # Limite de jetons de sortie maximale configurée persistante (par défaut: 200)
        self.max_output_tokens = 200
        
        # Initialisation de la structure non euclidienne principale (Dimension 768)
        self.hyperbolic_space = PoincareSemanticSpace(dim=768, curvature=self.config.default_curvature)
        
        # Initialisation du module d'optimisation prédictive du routage API
        self.router = PredictiveRouter(curvature=self.hyperbolic_space.curvature)
        
        # Définition stricte des 7 secteurs opérationnels de RATISS
        self.sectors: Set[str] = {
            "physique",          # Physical Sciences
            "philosophie",       # Philosophical & Epistemological
            "technologie",       # Core Technologies & Engineering
            "biologie",          # Biological & Neuromodulator Systems
            "sciences_sociales", # Social Systems
            "arts",              # Creative & Metaphoric
            "metacognition"      # Self-monitoring & Routing Layers
        }
        
        # Matrice d'influence inter-sectorielle (Couplage sédimentaire direct)
        # Chaque entrée définit le poids de rigidité ou de déviation sémantique S -> T
        # Par exemple: "philosophie" influence directement "technologie" (poids de 0.35)
        self.sedimentation_weights: Dict[str, Dict[str, float]] = {
            "philosophie": {
                "technologie": 0.35,
                "sciences_sociales": 0.25,
                "metacognition": 0.30
            },
            "physique": {
                "technologie": 0.40,
                "biologie": 0.20
            },
            "biologie": {
                "metacognition": 0.25,
                "physique": 0.15
            },
            "technologie": {
                "metacognition": 0.30,
                "arts": 0.15
            },
            "sciences_sociales": {
                "philosophie": 0.20,
                "arts": 0.25
            },
            "arts": {
                "philosophie": 0.15,
                "technologie": 0.10
            },
            "metacognition": {
                "technologie": 0.25,
                "philosophie": 0.20
            }
        }
        
        # Historique d'activation à court terme pour stabiliser le gradient temporel (Sedimentation Decay)
        self.active_concepts_by_sector: Dict[str, List[str]] = {s: [] for s in self.sectors}
        self.max_history_size = 10

    def register_concept_to_ratiss(
        self, 
        concept_name: str, 
        raw_vector_768d: np.ndarray, 
        sector: str = "philosophie",
        metadata: Optional[dict] = None
    ) -> ConceptEntry:
        """
        Normalise le vecteur euclidien original (768D) pour éviter l'entassement 
        sur les bords du disque (||p|| ≈ 0.9999), l'injecte dans le Poincaré 
        Disk et l'affecte à son secteur d'activité.
        """
        clean_sector = str(sector).lower().strip()
        if clean_sector not in self.sectors:
            raise ValueError(f"Secteur RATISS d'origine invalide : '{sector}'")
            
        raw_vector_768d = np.asarray(raw_vector_768d, dtype=_DTYPE)
        norm = np.linalg.norm(raw_vector_768d)
        
        if norm > 0:
            # Compression stricte vers la zone tempérée de la boule de Poincaré (R ≈ 0.5)
            normalized_vector = (raw_vector_768d / norm) * 0.5
        else:
            normalized_vector = raw_vector_768d
            
        full_metadata = metadata or {}
        full_metadata["sector"] = clean_sector
        
        # Injection géométrique
        entry = self.hyperbolic_space.add(
            name=concept_name,
            vector=normalized_vector,
            metadata=full_metadata,
            overwrite=True
        )
        
        # Enregistrement dans les sédiments actifs du secteur
        history = self.active_concepts_by_sector[clean_sector]
        if concept_name in history:
            history.remove(concept_name)
        history.append(concept_name)
        if len(history) > self.max_history_size:
            history.pop(0)
            
        return entry

    def calculate_sector_barycenter(self, sector: str) -> Optional[np.ndarray]:
        """
        Calcule le barycentre de Fréchet du secteur donné en utilisant 
        l'optimisation riemannienne sur la boule de Poincaré.
        """
        clean_sector = str(sector).lower().strip()
        history = self.active_concepts_by_sector.get(clean_sector, [])
        
        # Filtre les concepts effectivement présents dans l'espace principal
        active_points = []
        for name in history:
            if name in self.hyperbolic_space._concepts:
                active_points.append(self.hyperbolic_space._concepts[name].hyperbolic)
                
        if not active_points:
            return None
            
        # Résolution du barycentre hyperbolique de Fréchet
        points_array = np.stack(active_points, axis=0)
        return frechet_mean(points_array, curvature=self.hyperbolic_space.curvature)

    def warp_vector_by_sedimentation(
        self, 
        vector_poincare: np.ndarray, 
        target_sector: str
    ) -> np.ndarray:
        """
        Fait subir une torsion géométrique (fusion sémantique par sédimentation) 
        à un vecteur de la boule de Poincaré selon l'influence des autres secteurs.
        
        La translation de Möbius est appliquée de manière accumulée :
        V_fused = V_original ⊕_c ∑ (W_s_t * Barycentre_s)
        """
        target_sector = str(target_sector).lower().strip()
        vector_poincare = np.asarray(vector_poincare, dtype=_DTYPE)
        
        # Calcul du vecteur de déformation global combiné (biais de sédimentation)
        deformation_vect = np.zeros_like(vector_poincare)
        curvature = self.hyperbolic_space.curvature
        
        # Parcours de tous les secteurs potentiellement influents sur la cible
        for source_sector, targets in self.sedimentation_weights.items():
            if target_sector in targets:
                weight = targets[target_sector]
                barycenter = self.calculate_sector_barycenter(source_sector)
                if barycenter is not None:
                    # Contribution homothétique proportionnelle au poids de couplage
                    deformation_vect += weight * barycenter
                    
        # Si aucune force de couplage n'est active, retourner le vecteur d'origine intact
        if np.allclose(deformation_vect, 0.0):
            return vector_poincare
            
        # Restreindre le biais sédimentaire à l'intérieur de la boule ouverte de Poincaré
        deformation_vect = _clamp_to_ball(deformation_vect, curvature)
        
        # Application de la transformation non euclidienne (Addition de Möbius)
        return mobius_add(vector_poincare, deformation_vect, curvature)

    def compute_routing_weightings(
        self, 
        target_sector: str, 
        query_vector_euclidean: np.ndarray,
        k: int = 5
    ) -> List[Tuple[str, float]]:
        """
        Vectorise la recherche de proximité hyperbolique sous l'effet de la 
        torsion sédimentaire. Permet un ajustement dynamique du routage des tâches (failover, etc.).
        
        Returns:
            Liste de tuples (nom_du_concept, poids_de_probabilité_associé)
        """
        target_sector = str(target_sector).lower().strip()
        query_vector_euclidean = np.asarray(query_vector_euclidean, dtype=_DTYPE)
        
        # Étape 1 : Projection initiale du vecteur de requête dans la boule standard de Poincaré
        query_p = self.hyperbolic_space.hyperbolic_space_projection_fallback(query_vector_euclidean) if hasattr(self.hyperbolic_space, 'hyperbolic_space_projection_fallback') else \
                  self.hyperbolic_space.add("temp_query", query_vector_euclidean, overwrite=True).hyperbolic
                  
        # Supprime la requête temporaire si elle est enregistrée dans l'espace principal
        if "temp_query" in self.hyperbolic_space._concepts:
            self.hyperbolic_space._concepts.pop("temp_query", None)
            self.hyperbolic_space._dirty = True
            
        # Étape 2 : Distorsion spatiale par sédimentation des secteurs parents
        warped_query = self.warp_vector_by_sedimentation(query_p, target_sector)
        
        # Étape 3 : Calcul des distances déformées par rapport à tous les concepts
        self.hyperbolic_space._rebuild_matrix()
        if len(self.hyperbolic_space._names) == 0:
            return []
            
        # Collecte des coordonnées cibles de l'espace sémantique complet
        matrix = self.hyperbolic_space._matrix
        curvature = self.hyperbolic_space.curvature
        
        # Calcul vectorisé global de la distance de Poincaré distordue
        distances = poincare_distance_batch(warped_query, matrix, curvature)
        
        # Étape 4 : Conversion des distances hyperboliques en poids de probabilités logistiques
        # Plus un concept est proche dans l'espace fusionné, plus il attire la requête
        results = []
        for idx, dist in enumerate(distances):
            concept_name = self.hyperbolic_space._names[idx]
            concept_sector = self.hyperbolic_space._concepts[concept_name].metadata.get("sector", "")
            
            # Plus grand score d'attraction pour les concepts du même secteur ou proches sémantiquement
            attraction_score = float(np.exp(-dist))
            results.append((concept_name, attraction_score))
            
        # Tri descendant par affinité sémantique
        results.sort(key=lambda x: x[1], reverse=True)
        return results[:k]

    def predict_best_provider(self, query_embedding_768d: np.ndarray) -> int:
        """
        Calcule de manière dynamique le meilleur fournisseur d'API qualifié
        pour traiter la requête à l'aide de l'optimisateur géométrique.
        Met également à jour dynamiquement l'index de l'orchestrateur.
        """
        # Obtenir les barycentres dynamiques réels de tous les secteurs actifs
        dynamic_barycenters = {}
        for sector in self.sectors:
            dynamic_barycenters[sector] = self.calculate_sector_barycenter(sector)
            
        # Résolution de la décision de routage prédictif
        best_id, name, scores = self.router.predict_best_provider(
            query_embedding_768d=query_embedding_768d,
            dynamic_barycenters=dynamic_barycenters
        )
        
        # Mise à jour de l'orchestrateur de secours si configuré
        if self.orchestrator is not None:
            if hasattr(self.orchestrator, 'current_index'):
                self.orchestrator.current_index = best_id
                
        return best_id

    def execute_payload_compilation(self, provider_id: int, prompt: str, preset: str = "DEFAULT") -> dict:
        """
        Compile le payload d'exécution pré-configuré avec la configuration résolue de tokens
        pour être transmis au fournisseur d'API choisi.
        """
        # Résolution de la valeur via la configuration globale de presets
        resolved_tokens = self.config.get_max_tokens(preset)
        
        # Mutation de notre état interne persistent conforme aux spécifications
        self.max_output_tokens = resolved_tokens
        print(f"[SYS] [CONFIG] Max output tokens successfully mutated to: {self.max_output_tokens}")
        
        from core.nano_bridge import NanoBridgeCompilateur

        # Récupération du tenseur stabilisé par ton super-raisonnement
        # norm_v = torch.norm(best_node).item()
        # compilateur = NanoBridgeCompilateur()
        # specs = compilateur.compiler_metriques_physiques(delta_dispersion=0.30, norm_vecteur=norm_v)
        # print(compilateur.generer_rapport_laboratoire(specs))

        return {
            "prompt": prompt,
            "provider_id": provider_id,
            "max_output_tokens": self.max_output_tokens,
            "max_tokens": self.max_output_tokens,  # pour compatibilité ascendante v3.4
            "preset_applied": preset
        }

