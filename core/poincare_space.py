"""
poincare_space.py
═══════════════════════════════════════════════════════════════════════
RATISS — Module de Géométrie Hyperbolique (Modèle du Disque de Poincaré)
═══════════════════════════════════════════════════════════════════════
Implémente le modèle de la boule de Poincaré en dimension n (n=768 par
défaut) avec courbure négative -c.
Géométrie :
Boule : B^n_c = { x ∈ ℝⁿ | c · ‖x‖² < 1 }
Métrique conforme : g_x = (λ_x)² · g_E où λ_x = 2 / (1 - c‖x‖²)
"""
from __future__ import annotations
import numpy as np
from numpy.typing import NDArray
from typing import Dict, List, Optional, Sequence, Tuple, Union
from dataclasses import dataclass, field
import warnings

# ─────────────────────────────────────────────────────────────
# Constantes numériques
# ─────────────────────────────────────────────────────────────
_EPS = 1e-8             # Guard contre division par zéro
_CLAMP_MIN = 1.0 + 1e-7 # Clamp inférieur pour arcosh (argument ≥ 1)
_MAX_NORM = 1.0 - 1e-5  # Norme maximale sur la boule ouverte (‖x‖ < 1)
_DTYPE = np.float64     # Précision double partout

# ═════════════════════════════════════════════════════════════
# I. FONCTIONS PRIMITIVES HYPERBOLIQUES
# ═════════════════════════════════════════════════════════════

def _sq_norm(x: NDArray) -> NDArray:
    """Norme euclidienne au carré sur le dernier axe. Shape (...,)."""
    return np.sum(x * x, axis=-1)

def _safe_norm(x: NDArray) -> NDArray:
    """Norme euclidienne avec guard numérique. Shape (...,)."""
    return np.sqrt(np.maximum(_sq_norm(x), _EPS))

# ─────────────────────────────────────────────────────────────
# 1. Projection euclidien → Poincaré (application exponentielle en 0)
# ─────────────────────────────────────────────────────────────

def project_to_poincare(
    x: NDArray,
    curvature: float = 1.0,
    max_norm: float = _MAX_NORM,
) -> NDArray:
    """
    Projette un ou plusieurs vecteurs euclidiens dans la boule de Poincaré
    via l'application exponentielle en l'origine :
    exp_0(v) = tanh(√c · ‖v‖ / 2) · v / (√c · ‖v‖)
    Garantit ‖résultat‖ < 1 (strictement).
    """
    x = np.asarray(x, dtype=_DTYPE)
    sqrt_c = np.sqrt(curvature)
    norm = _safe_norm(x) # (...,)
    
    # Application exp_0 : tanh compresse ℝ⁺ → [0, 1)
    scale = np.tanh(sqrt_c * norm / 2.0) / (sqrt_c * norm) # (...,)
    p = x * scale[..., np.newaxis]
    
    # Sécurité : clip norme (cas dégénérés à très grande norme)
    p_norm = _safe_norm(p)
    mask = p_norm > max_norm
    if np.any(mask):
        p[mask] = p[mask] * (max_norm / p_norm[mask, np.newaxis])
    return p

def poincare_to_euclidean(
    p: NDArray,
    curvature: float = 1.0,
) -> NDArray:
    """
    Application logarithmique en l'origine (inverse de project_to_poincare) :
    log_0(p) = (2 / √c) · arctanh(√c · ‖p‖) · p / ‖p‖
    """
    p = np.asarray(p, dtype=_DTYPE)
    sqrt_c = np.sqrt(curvature)
    p = _clamp_to_ball(p, curvature)
    norm = _safe_norm(p)
    scale = (2.0 / sqrt_c) * np.arctanh(sqrt_c * norm) / norm
    return p * scale[..., np.newaxis]

def _clamp_to_ball(x: NDArray, curvature: float = 1.0) -> NDArray:
    """Force ‖x‖ < 1/√c avec marge de sécurité. In-place safe."""
    max_norm = _MAX_NORM / np.sqrt(curvature)
    norm = _safe_norm(x) # (...,)
    mask = norm > max_norm
    if np.any(mask):
        x = x.copy()
        x[mask] = x[mask] * (max_norm / norm[mask, np.newaxis])
    return x

# ─────────────────────────────────────────────────────────────
# 2. Distance hyperbolique de Poincaré
# ─────────────────────────────────────────────────────────────

def poincare_distance(
    u: NDArray,
    v: NDArray,
    curvature: float = 1.0,
) -> float | NDArray:
    """
    Distance géodésique hyperbolique entre deux points de B^n_c :
    d_H(u, v) = (2/√c) · arcosh( 1 + 2c·‖u-v‖² / ((1-c‖u‖²)(1-c‖v‖²)) )
    """
    u = np.asarray(u, dtype=_DTYPE)
    v = np.asarray(v, dtype=_DTYPE)
    u = _clamp_to_ball(u, curvature)
    v = _clamp_to_ball(v, curvature)
    c = curvature
    diff_sq = _sq_norm(u - v) # ‖u-v‖²
    u_sq = _sq_norm(u) # ‖u‖²
    v_sq = _sq_norm(v) # ‖v‖²
    denom = np.maximum((1.0 - c * u_sq) * (1.0 - c * v_sq), _EPS)
    
    # Guard : si diff_sq ≈ 0 (points identiques) → retourner 0 directement
    if np.ndim(diff_sq) == 0:
        if diff_sq < _EPS:
            return 0.0
    
    arg = np.clip(1.0 + 2.0 * c * diff_sq / denom, _CLAMP_MIN, None)
    return (2.0 / np.sqrt(c)) * np.arccosh(arg)

def poincare_distance_batch(
    query: NDArray,
    vectors: NDArray,
    curvature: float = 1.0,
) -> NDArray:
    """
    Distance hyperbolique d'un vecteur requête vers N vecteurs simultanément.
    Vectorisation complète NumPy — pas de boucle Python.
    """
    query = np.asarray(query, dtype=_DTYPE)
    vectors = np.asarray(vectors, dtype=_DTYPE)
    query = _clamp_to_ball(query, curvature)
    vectors = _clamp_to_ball(vectors, curvature)
    c = curvature
    
    # Broadcast : (N, d) - (d,) → (N, d)
    diff_sq = np.sum((vectors - query) ** 2, axis=-1) # (N,)
    q_sq = np.dot(query, query) # scalaire
    v_sq = np.sum(vectors ** 2, axis=-1) # (N,)
    denom = np.maximum((1.0 - c * q_sq) * (1.0 - c * v_sq), _EPS)
    arg = np.clip(1.0 + 2.0 * c * diff_sq / denom, _CLAMP_MIN, None)
    result = (2.0 / np.sqrt(c)) * np.arccosh(arg)
    
    # Cas dégénéré : points identiques
    result[diff_sq < _EPS] = 0.0
    return result

# ─────────────────────────────────────────────────────────────
# 3. Addition de Möbius (opération gyrovectorielle fondamentale)
# ─────────────────────────────────────────────────────────────

def mobius_add(
    u: NDArray,
    v: NDArray,
    curvature: float = 1.0,
) -> NDArray:
    """
    Addition de Möbius dans la boule de Poincaré :
    u ⊕_c v = ((1 + 2c⟨u,v⟩ + c‖v‖²)u + (1 - c‖u‖²)v) / (1 + 2c⟨u,v⟩ + c²‖u‖²‖v‖²)
    Généralise la translation dans l'espace hyperbolique.
    """
    u = np.asarray(u, dtype=_DTYPE)
    v = np.asarray(v, dtype=_DTYPE)
    u = _clamp_to_ball(u, curvature)
    v = _clamp_to_ball(v, curvature)
    c = curvature
    
    uv = np.sum(u * v, axis=-1, keepdims=True) # ⟨u,v⟩ (...,1)
    u_sq = _sq_norm(u)[..., np.newaxis] # ‖u‖² (...,1)
    v_sq = _sq_norm(v)[..., np.newaxis] # ‖v‖² (...,1)
    
    num = (1.0 + 2.0 * c * uv + c * v_sq) * u + (1.0 - c * u_sq) * v
    den = np.maximum(1.0 + 2.0 * c * uv + (c**2) * u_sq * v_sq, _EPS)
    return _clamp_to_ball(num / den, curvature)

def frechet_mean(
    points: NDArray,
    curvature: float = 1.0,
    n_iter: int = 50,
    lr: float = 0.1,
) -> NDArray:
    """
    Barycentre de Fréchet dans la boule de Poincaré (algorithme gradient
    Riemannien en O(N·d·n_iter)).
    """
    points = np.asarray(points, dtype=_DTYPE)
    # Initialisation : projection de la moyenne euclidienne
    mu = project_to_poincare(points.mean(axis=0), curvature)
    
    for _ in range(n_iter):
        # Gradient Riemannien : somme des vecteurs log
        logs = np.array([_log_map(mu, p, curvature) for p in points])
        grad = logs.mean(axis=0)
        # Mise à jour via exp map
        mu = _exp_map(mu, lr * grad, curvature)
    return mu

def _exp_map(x: NDArray, v: NDArray, curvature: float = 1.0) -> NDArray:
    """Application exponentielle en x dans la direction v."""
    x = _clamp_to_ball(x, curvature)
    sqrt_c = np.sqrt(curvature)
    x_sq = _sq_norm(x)
    lambda_x = 2.0 / np.maximum(1.0 - curvature * x_sq, _EPS) # facteur conforme
    v_norm = _safe_norm(v)
    tanh_arg = np.tanh(sqrt_c * lambda_x * v_norm / 2.0)
    direction = v / np.maximum(v_norm, _EPS)
    return _clamp_to_ball(
        mobius_add(x, (tanh_arg / sqrt_c) * direction, curvature),
        curvature
    )

def _log_map(x: NDArray, y: NDArray, curvature: float = 1.0) -> NDArray:
    """Application logarithmique en x vers y."""
    x = _clamp_to_ball(x, curvature)
    y = _clamp_to_ball(y, curvature)
    sqrt_c = np.sqrt(curvature)
    x_sq = _sq_norm(x)
    lambda_x = 2.0 / np.maximum(1.0 - curvature * x_sq, _EPS)
    minus_x_plus_y = mobius_add(-x, y, curvature)
    norm_mxy = _safe_norm(minus_x_plus_y)
    scale = (2.0 / (sqrt_c * lambda_x)) * np.arctanh(sqrt_c * norm_mxy)
    return (scale / norm_mxy) * minus_x_plus_y

# ═════════════════════════════════════════════════════════════
# II. CLASSE PRINCIPALE : PoincareSemanticSpace
# ═════════════════════════════════════════════════════════════

@dataclass
class ConceptEntry:
    """Enregistrement interne d'un concept dans l'espace hyperbolique."""
    name: str
    euclidean: NDArray # Vecteur euclidien original (d,)
    hyperbolic: NDArray # Projection Poincaré (d,)
    poincare_norm: float # ‖p‖ ∈ [0, 1) — profondeur hiérarchique
    metadata: dict = field(default_factory=dict)

class PoincareSemanticSpace:
    """
    Espace sémantique hyperbolique pour RATISS.
    Stocke des concepts représentés par des vecteurs euclidiens quelconques,
    les projette dans la boule de Poincaré et expose des primitives de
    proximité hyperbolique et d'analyse hiérarchique.
    Propriété clé :
    ‖concept‖_P ≈ 0 → concept générique / racine de hiérarchie
    ‖concept‖_P ≈ 1 → concept spécifique / feuille
    """
    def __init__(
        self,
        dim: int = 768,
        curvature: float = 1.0,
        max_norm: float = _MAX_NORM,
    ):
        self.dim = dim
        self.curvature = curvature
        self.max_norm = max_norm
        self._concepts: Dict[str, ConceptEntry] = {}
        # Cache matrice pour requêtes batch rapides
        self._matrix: Optional[NDArray] = None # (N, d)
        self._names: List[str] = []
        self._dirty: bool = False # signale rebuild nécessaire

    @property
    def space(self) -> Dict[str, NDArray]:
        """Retourne un dictionnaire liant le nom de chaque concept à ses coordonnées de Poincaré."""
        return {name: entry.hyperbolic for name, entry in self._concepts.items()}

    def _get(self, name: str) -> ConceptEntry:
        if name not in self._concepts:
            raise KeyError(f"Concept '{name}' non trouvé dans l'espace.")
        return self._concepts[name]

    def add(
        self,
        name: str,
        vector: NDArray,
        metadata: Optional[dict] = None,
        *,
        overwrite: bool = False,
    ) -> ConceptEntry:
        """Ajoute un concept en projetant son vecteur euclidien dans la boule."""
        if not overwrite and name in self._concepts:
            raise ValueError(f"Concept '{name}' déjà présent. Utilisez overwrite=True pour remplacer.")
        vector = np.asarray(vector, dtype=_DTYPE).ravel()
        if vector.shape[0] != self.dim:
            raise ValueError(
                f"Dimension attendue {self.dim}, reçu {vector.shape[0]}. Redimensionnez avant insertion."
            )
        hyp = project_to_poincare(vector, self.curvature, self.max_norm)
        entry = ConceptEntry(
            name=name,
            euclidean=vector,
            hyperbolic=hyp,
            poincare_norm=float(np.linalg.norm(hyp)),
            metadata=metadata or {},
        )
        self._concepts[name] = entry
        self._dirty = True
        return entry

    def add_batch(
        self,
        names: Sequence[str],
        vectors: NDArray,
        metadata: Optional[List[dict]] = None,
        *,
        overwrite: bool = False,
    ) -> List[ConceptEntry]:
        """Ajout vectorisé de N concepts en une passe."""
        vectors = np.asarray(vectors, dtype=_DTYPE)
        if vectors.ndim != 2 or vectors.shape != (len(names), self.dim):
            raise ValueError(
                f"Shape attendu ({len(names)}, {self.dim}), reçu {vectors.shape}"
            )
        hyp_matrix = project_to_poincare(vectors, self.curvature, self.max_norm)
        norms = np.linalg.norm(hyp_matrix, axis=1)
        entries = []
        for i, name in enumerate(names):
            if not overwrite and name in self._concepts:
                raise ValueError(f"Concept '{name}' déjà présent.")
            meta = (metadata[i] if metadata else {})
            entry = ConceptEntry(
                name=name,
                euclidean=vectors[i],
                hyperbolic=hyp_matrix[i],
                poincare_norm=float(norms[i]),
                metadata=meta,
            )
            self._concepts[name] = entry
            entries.append(entry)
        self._dirty = True
        return entries

    def _rebuild_matrix(self):
        """Reconstruit la matrice cache si nécessaire (lazy)."""
        if self._dirty or self._matrix is None:
            self._names = list(self._concepts.keys())
            if self._names:
                self._matrix = np.stack(
                    [self._concepts[n].hyperbolic for n in self._names]
                )
            else:
                self._matrix = np.empty((0, self.dim), dtype=_DTYPE)
            self._dirty = False

    def top_k(
        self,
        query: NDArray,
        k: int = 10,
        *,
        project: bool = True,
        exclude: Optional[Sequence[str]] = None,
    ) -> List[Tuple[str, float]]:
        """Retourne les K concepts les plus proches en distance hyperbolique."""
        self._rebuild_matrix()
        if len(self._names) == 0:
            return []
        query = np.asarray(query, dtype=_DTYPE).ravel()
        if query.shape[0] != self.dim:
            raise ValueError(f"Dimension requête {query.shape[0]} ≠ {self.dim}")
        if project:
            query = project_to_poincare(query, self.curvature, self.max_norm)
        else:
            query = _clamp_to_ball(query, self.curvature)
        
        distances = poincare_distance_batch(query, self._matrix, self.curvature)
        exclude_set = set(exclude or [])
        ranked = sorted(
            [(self._names[i], float(distances[i]))
             for i in range(len(self._names))
             if self._names[i] not in exclude_set],
            key=lambda x: x[1],
        )
        return ranked[:k]

    def distance(self, name_a: str, name_b: str) -> float:
        """Distance hyperbolique entre deux concepts déjà stockés."""
        a = self._get(name_a).hyperbolic
        b = self._get(name_b).hyperbolic
        return float(poincare_distance(a, b, self.curvature))

    def similarity(self, name_a: str, name_b: str) -> float:
        """Similarité hyperbolique ∈ (0, 1] : exp(-d_H(a, b))."""
        return float(np.exp(-self.distance(name_a, name_b)))

    def hierarchy_depth(self, name: str) -> float:
        """Profondeur hiérarchique d'un concept ∈ [0, +∞)."""
        p = self._get(name).hyperbolic
        sqrt_c = np.sqrt(self.curvature)
        norm = float(np.linalg.norm(p))
        return float((2.0 / sqrt_c) * np.arctanh(min(sqrt_c * norm, _MAX_NORM)))

    def hierarchy_rank(
        self,
        ascending: bool = True,
    ) -> List[Tuple[str, float]]:
        """Classe tous les concepts par profondeur hiérarchique."""
        return sorted(
            [(n, self.hierarchy_depth(n)) for n in self._concepts],
            key=lambda x: x[1],
            reverse=not ascending
        )
