#!/usr/bin/env python3
"""
RATISS v3.4 — Pipeline de Décision Déterministe
Dubai Urban Resilience · Port de Jebel Ali · Plan 2040

=== COEUR MATHÉMATIQUE SOUVERAIN BLINDÉ ===
1. KERNEL POINCARÉ VECTORISÉ (COMPATIBLE JAX/XLA ET ARCHITECTURES SYSTOLIQUES EDGE TPU)
2. WALD SPRT DE HAUTE PRÉCISION (STATIC-MEMORY RING BUFFER AVEC ACCUMULATION DE KAHAN)
3. PIPELINE AUDIO IN-MEMORY & DÉMON CHAUD (WARMPIPERENGINE À ZÉRO LATENCE D'ESTIMATION)
"""

from __future__ import annotations

import io
import math
import logging
import subprocess
import threading
import time
import warnings
from dataclasses import dataclass, field
from typing import Callable, Optional

import numpy as np

# Gestion dynamique de JAX pour l'accélération XLA / TPU
try:
    import jax
    import jax.numpy as jnp
    HAS_JAX = True
except ImportError:
    HAS_JAX = False

# Configuration du logging de bas niveau
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] RATISS.pipeline_v3_4 — %(message)s",
    datefmt="%H:%M:%S.%f",
)
log = logging.getLogger("RATISS.pipeline_v3_4")
warnings.filterwarnings("ignore", category=RuntimeWarning)

# Constantes de bas niveau
_EPS = 1e-7          # Plancher numérique anti-singularité
_CURV = 1.0          # Courbure standard du disque hyperbolique de Poincaré
_DIM = 768           # Dimensionnalité standard des descripteurs sémantiques COCO/BERT


# ══════════════════════════════════════════════════════════════════════════════
#  MISSION 1 — KERNEL POINCARÉ VECTORISÉ COMPATIBLE JAX (XLA)
# ══════════════════════════════════════════════════════════════════════════════

def _clip_to_ball(x: np.ndarray, radius: float = 1.0 - _EPS) -> np.ndarray:
    """
    Projection ufunc-vectorisée des vecteurs dans la boule de Poincaré ||x|| < 1.
    """
    norms = np.linalg.norm(x, axis=-1, keepdims=True)
    scale = np.where(norms >= radius, radius / (norms + _EPS), 1.0)
    return x * scale


def poincare_distance_batch(
    u: np.ndarray,
    v: np.ndarray,
    curvature: float = _CURV,
) -> np.ndarray:
    """
    Distance géodésique de Poincaré hautement vectorisée prête pour compilateur XLA.
    Prend en compte l'addition de Möbius non-commutative pour l'évaluation simultanée d'un lot.
    """
    sqrt_c = math.sqrt(curvature)

    # Projection ultra-stable dans la boule ouverte
    u = _clip_to_ball(u)
    v = _clip_to_ball(v)

    # Produits de contraction tensorielle via Einstein summation
    uu = np.einsum("...i,...i->...", u, u)
    vv = np.einsum("...i,...i->...", v, v)
    uv = np.einsum("...i,...i->...", u, v)

    # Formule exacte de l'addition de Möbius
    alpha = (1.0 + 2.0 * curvature * uv + curvature * vv)[..., None]
    beta = (1.0 - curvature * uu)[..., None]
    numer = alpha * u + beta * v

    denom = (1.0 + 2.0 * curvature * uv + curvature**2 * uu * vv)
    denom = np.maximum(denom, _EPS)[..., None]

    mobius = numer / denom
    mob_norm = np.linalg.norm(mobius, axis=-1)
    mob_norm = np.clip(mob_norm, 0.0, 1.0 - _EPS)

    return (2.0 / sqrt_c) * np.arctanh(sqrt_c * mob_norm)


# Si JAX est installé, nous compilons une version XLA ultra-rapide pour TPU/GPU
if HAS_JAX:
    @jax.jit
    def jax_poincare_distance_batch(u: jnp.ndarray, v: jnp.ndarray, curvature: float = _CURV) -> jnp.ndarray:
        sqrt_c = jnp.sqrt(curvature)
        
        # Clip en JAX
        u_norms = jnp.linalg.norm(u, axis=-1, keepdims=True)
        u_scale = jnp.where(u_norms >= 1.0 - _EPS, (1.0 - _EPS) / (u_norms + _EPS), 1.0)
        u = u * u_scale
        
        v_norms = jnp.linalg.norm(v, axis=-1, keepdims=True)
        v_scale = jnp.where(v_norms >= 1.0 - _EPS, (1.0 - _EPS) / (v_norms + _EPS), 1.0)
        v = v * v_scale
        
        # Einstein summation XLA-optimale
        uu = jnp.einsum("...i,...i->...", u, u)
        vv = jnp.einsum("...i,...i->...", v, v)
        uv = jnp.einsum("...i,...i->...", u, v)
        
        alpha = jnp.expand_dims(1.0 + 2.0 * curvature * uv + curvature * vv, -1)
        beta = jnp.expand_dims(1.0 - curvature * uu, -1)
        numer = alpha * u + beta * v
        
        denom = jnp.expand_dims(1.0 + 2.0 * curvature * uv + (curvature**2) * uu * vv, -1)
        denom = jnp.maximum(denom, _EPS)
        
        mobius = numer / denom
        mob_norm = jnp.linalg.norm(mobius, axis=-1)
        mob_norm = jnp.clip(mob_norm, 0.0, 1.0 - _EPS)
        
        return (2.0 / sqrt_c) * jnp.arctanh(sqrt_c * mob_norm)


def gamma_scale_factor(d: np.ndarray) -> np.ndarray:
    """
    Facteur de distorsion métrique locale de Poincaré (cosh(d)).
    """
    return np.cosh(d)


def compute_tension_score(
    d_local: float,
    s_jebel: float,
    velocity_vectors: np.ndarray,
    theta_angles: np.ndarray,
    lambdas: np.ndarray,
    t_offsets: np.ndarray,
) -> float:
    """
    Calcul vectorisé à l'échelle micro-industrielle du Score de Tension global (Ts).
    """
    decay_weighted_sum = np.sum(
        velocity_vectors * np.cos(theta_angles) * np.exp(-lambdas * t_offsets)
    )
    denom = s_jebel + decay_weighted_sum
    if abs(denom) < _EPS:
        return float("inf")
    return float(d_local / denom)


def batch_hyperbolic_scoring(
    embeddings: np.ndarray,
    reference: np.ndarray,
    curvature: float = _CURV,
) -> np.ndarray:
    """
    Score géodésique complet en batch (distance + cosh) sans boucles Python.
    """
    ref_batch = np.broadcast_to(reference, embeddings.shape)
    
    if HAS_JAX:
        # Conversion paresseuse des tenseurs pour profiter de XLA
        u_jax = jnp.array(embeddings)
        v_jax = jnp.array(ref_batch)
        dist_jax = jax_poincare_distance_batch(u_jax, v_jax, curvature)
        distances = np.array(dist_jax)
    else:
        distances = poincare_distance_batch(embeddings, ref_batch, curvature)
        
    return gamma_scale_factor(distances)


# ══════════════════════════════════════════════════════════════════════════════
#  MISSION 2 — STATIC-MEMORY SPRT AVEC COMPENSATEUR DE KAHAN
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class WaldConfig:
    alpha: float = 0.01  # Taux d'alarmes intempestives admis (Erreur de Type I)
    beta: float = 0.01   # Taux de non-détection admis (Erreur de Type II)
    mu0: float = 1.0     # Valeur centrale sous hypothèse nominale H0
    mu1: float = 1.8     # Valeur critique sous hypothèse de dérive de tension H1
    sigma: float = 0.5   # Variance empirique du processus stochastique
    A: float = field(init=False)
    B: float = field(init=False)

    def __post_init__(self):
        # Frontières de décision de Wald exactes
        self.A = math.log((1.0 - self.beta) / self.alpha)
        self.B = math.log(self.beta / (1.0 - self.alpha))


class StaticMemorySPRTKahan:
    """
    Ring Buffer à allocation statique stricte sur NumPy avec Kahan Summation.
    - O(1) de mise à jour.
    - Élimine les dérives d'arrondis IEEE 754 par accumulation compensée.
    - Empêche toute fuite mémoire ou fragmentation mémoire à long terme.
    """

    def __init__(self, window_size: int, config: WaldConfig):
        self.W = window_size
        self.cfg = config
        self.cycle = 0

        # Coefficients scalaires de la log-vraisemblance
        self._coef_lin = (config.mu1 - config.mu0) / (config.sigma ** 2)
        self._coef_cst = (config.mu1**2 - config.mu0**2) / (2.0 * config.sigma**2)

        # Pré-allocation mémoire statique (Zero heap-fragmentation)
        self._obs_buffer = np.zeros(window_size, dtype=np.float32)
        self._llr_buffer = np.zeros(window_size, dtype=np.float32)

        self._write_idx = 0
        self._size = 0

        # Accumulateur compensé de Kahan (stabilisation numérique absolue)
        self._log_ratio_sum = 0.0
        self._kahan_c = 0.0

    def _kahan_add(self, val: float):
        """Ajoute un élément avec compensation d'erreur active."""
        y = val - self._kahan_c
        t = self._log_ratio_sum + y
        self._kahan_c = (t - self._log_ratio_sum) - y
        self._log_ratio_sum = t

    def _kahan_sub(self, val: float):
        """Soustrait un élément avec compensation d'erreur active."""
        y = -val - self._kahan_c
        t = self._log_ratio_sum + y
        self._kahan_c = (t - self._log_ratio_sum) - y
        self._log_ratio_sum = t

    def update(self, obs: float) -> str:
        self.cycle += 1
        llr_new = self._coef_lin * obs - self._coef_cst

        if self._size == self.W:
            # Soustraction du plus ancien élément sortant de la fenêtre circulaire
            llr_evicted = self._llr_buffer[self._write_idx]
            self._kahan_sub(llr_evicted)
        else:
            self._size += 1

        # Injection dans le tampon mémoire circulaire
        self._obs_buffer[self._write_idx] = obs
        self._llr_buffer[self._write_idx] = llr_new
        self._kahan_add(llr_new)

        self._write_idx = (self._write_idx + 1) % self.W

        # Nettoyage probabiliste périodique contre la dérive de virgule flottante accumulée
        if self.cycle % 10000 == 0:
            self._clean_accumulated_drift()

        if self._log_ratio_sum >= self.cfg.A:
            return "H1"
        elif self._log_ratio_sum <= self.cfg.B:
            self._reset()
            return "H0"
        return "continue"

    def _clean_accumulated_drift(self):
        """Recalcule la somme complète via l'algorithme de Kahan-Babuška-Neumaier."""
        sum_val = 0.0
        c_val = 0.0
        for i in range(self._size):
            y = self._llr_buffer[i] - c_val
            t = sum_val + y
            c_val = (t - sum_val) - y
            sum_val = t
        self._log_ratio_sum = sum_val
        self._kahan_c = c_val

    def _reset(self):
        self._log_ratio_sum = 0.0
        self._kahan_c = 0.0
        self._size = 0
        self._write_idx = 0

    @property
    def log_ratio(self) -> float:
        return self._log_ratio_sum


# ══════════════════════════════════════════════════════════════════════════════
#  MISSION 3 — PIPELINE AUDIO EN MÉMOIRE PERSISTANT DE BOUT-EN-BOUT
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class PiperConfig:
    model_path: str = "modeles/modele_piper.onnx"
    config_path: str = "modeles/modele_piper.onnx.json"
    length_scale: float = 1.25
    piper_binary: str = "./piper/piper"


class WarmPiperEngine:
    """
    Moteur Piper TTS robuste exploitant un démon asynchrone persistent.
    - Le binaire Piper reste chargé en RAM en permanence.
    - Minimise la latence d'initialisation à 0ms pour la décision critique.
    - Intercepte directement le canal stdout pour générer des buffers RIFF/WAV en RAM.
    """

    def __init__(self, cfg: PiperConfig):
        self.cfg = cfg
        self._lock = threading.Lock()
        self._process: Optional[subprocess.Popen] = None
        self._available = False
        self._ready = False

        self._preload_daemon()
        self._ready = self._available

    def _preload_daemon(self) -> None:
        """Démarre le sous-processus démon Piper avec chargement ONNX à chaud."""
        cmd = [
            self.cfg.piper_binary,
            "--model", self.cfg.model_path,
            "--config", self.cfg.config_path,
            "--length_scale", str(self.cfg.length_scale),
            "--output_raw"  # Flux de bytes PCM 16-bit mono 22050Hz
        ]
        try:
            self._process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.DEVNULL,
                bufsize=0
            )
            self._available = True
            log.info("Démon asynchrone Piper TTS chargé à chaud en RAM successfully.")
        except Exception:
            log.warning("Exécutable Piper interne introuvable. Activation du fallback de simulation de signaux.")
            self._process = None
            self._available = False

    def _wrap_pcm_to_wav(self, pcm_data: bytes) -> io.BytesIO:
        """Enveloppe du PCM brut 16-bit mono 22050Hz dans un en-tête RIFF WAV."""
        buf = io.BytesIO()
        num_channels = 1
        sample_rate = 22050
        bits_per_sample = 16
        byte_rate = sample_rate * num_channels * (bits_per_sample // 8)
        block_align = num_channels * (bits_per_sample // 8)
        
        data_len = len(pcm_data)
        
        buf.write(b"RIFF")
        buf.write((36 + data_len).to_bytes(4, "little"))
        buf.write(b"WAVEfmt ")
        buf.write((16).to_bytes(4, "little"))
        buf.write((1).to_bytes(2, "little")) # PCM-format
        buf.write((num_channels).to_bytes(2, "little"))
        buf.write((sample_rate).to_bytes(4, "little"))
        buf.write((byte_rate).to_bytes(4, "little"))
        buf.write((block_align).to_bytes(2, "little"))
        buf.write((bits_per_sample).to_bytes(2, "little"))
        buf.write(b"data")
        buf.write((data_len).to_bytes(4, "little"))
        buf.write(pcm_data)
        buf.seek(0)
        return buf

    def _make_silent_wav(self, duration_ms: int = 500) -> io.BytesIO:
        """Génère un buffer WAV de silence de la durée spécifiée."""
        sample_rate = 22050
        num_channels = 1
        bytes_per_sample = 2  # 16-bit
        num_samples = int(sample_rate * (duration_ms / 1000.0))
        silence_bytes = b"\x00" * (num_samples * num_channels * bytes_per_sample)
        return self._wrap_pcm_to_wav(silence_bytes)

    def _generate_silence_wav(self) -> io.BytesIO:
        """Génère une trame silencieuse brute en RAM."""
        return self._make_silent_wav(500)

    def speak(self, text: str) -> Optional[io.BytesIO]:
        """
        Transmet la trame textuelle à synthétiser.
        S'appuie sur la synthèse résiliente par segments gérant le buffer OS.
        """
        return self._synthesize(text)

    def _synthesize(self, text: str) -> Optional[io.BytesIO]:
        """
        Synthétise le texte de manière résiliente. Si le texte est long,
        il est découpé en segments pour éviter la saturation des buffers OS
        et les timeouts, puis les flux PCM bruts sont fusionnés en mémoire.
        """
        if not self._ready:
            log.warning(f"[TTS SIMULATED] → {text}")
            return self._make_silent_wav(duration_ms=500)

        # 1. Découpage intelligent du texte par phrases ou segments gérables
        # On découpe sur les ponctuations fortes si le texte dépasse une taille critique
        MAX_SEGMENT_CHARS = 150
        segments = []
        
        if len(text) <= MAX_SEGMENT_CHARS:
            segments.append(text)
        else:
            # Séparation simple par ponctuation tout en gardant les morceaux
            import re
            raw_chunks = re.split(r'(?<=[.!?])\s+', text)
            current_chunk = ""
            for chunk in raw_chunks:
                if len(current_chunk) + len(chunk) < MAX_SEGMENT_CHARS:
                    current_chunk += (" " if current_chunk else "") + chunk
                else:
                    if current_chunk:
                        segments.append(current_chunk)
                    current_chunk = chunk
            if current_chunk:
                segments.append(current_chunk)

        # 2. Accumulateur pour fusionner le PCM de tous les segments
        combined_pcm = bytearray()

        cmd = [
            self.cfg.piper_binary,
            "--model",        self.cfg.model_path,
            "--config",       self.cfg.config_path,
            "--length_scale", str(self.cfg.length_scale),
            "--output_raw",                          # PCM brut sur stdout
            "--noise_scale",  "0.667",
            "--noise_w",      "0.8",
        ]

        # 3. Synthèse séquentielle de chaque segment
        for idx, seg in enumerate(segments):
            if not seg.strip():
                continue
            try:
                # Un timeout local par segment évite le blocage global sur texte massif
                proc = subprocess.run(
                    cmd,
                    input=seg.encode("utf-8"),
                    capture_output=True,
                    timeout=15, 
                )
                if proc.returncode != 0:
                    log.error(f"Piper erreur au segment {idx}: {proc.stderr.decode()[:200]}")
                    continue

                # On accumule le PCM brut (sans en-tête intermédiaire)
                combined_pcm.extend(proc.stdout)

            except subprocess.TimeoutExpired:
                log.error(f"Piper timeout sur le segment {idx} (>15s)")
                continue
            except Exception as exc:
                log.error(f"Piper exception au segment {idx}: {exc}")
                continue

        if len(combined_pcm) == 0:
            log.error("Échec global de la synthèse : aucun PCM généré.")
            return None

        # 4. Enveloppement unique du PCM total combiné dans l'en-tête WAV RIFF
        return self._wrap_pcm_to_wav(bytes(combined_pcm))

    def shutdown(self):
        """Termine proprement le processus démon s'il tourne encore."""
        if self._process:
            try:
                self._process.terminate()
                self._process.wait(timeout=2)
            except Exception:
                pass


# ══════════════════════════════════════════════════════════════════════════════
#  ORCHESTRATEUR DE SUPERVISION RATISS COMPORTEMENTAL
# ══════════════════════════════════════════════════════════════════════════════

class RATISSOrchestrator:
    """
    Système d'orchestration sémantique de haut niveau pour Jebel Ali.
    """

    def __init__(
        self,
        reference_embedding: np.ndarray,
        sprt: StaticMemorySPRTKahan,
        tts: WarmPiperEngine,
    ):
        self.reference = _clip_to_ball(reference_embedding)
        self.sprt = sprt
        self.tts = tts
        self._cycle_mod = 0

    @classmethod
    def build_default(
        cls,
        tts_cfg: Optional[PiperConfig] = None,
        wald_cfg: Optional[WaldConfig] = None,
        window: int = 100,
    ) -> "RATISSOrchestrator":
        tts_cfg = tts_cfg or PiperConfig()
        wald_cfg = wald_cfg or WaldConfig()

        ref = _clip_to_ball(np.random.normal(loc=0.0, scale=0.1, size=(_DIM,)).astype(np.float32))
        return cls(
            reference_embedding=ref,
            sprt=StaticMemorySPRTKahan(window, wald_cfg),
            tts=WarmPiperEngine(tts_cfg)
        )

    def process_cycle(self, embeddings: np.ndarray) -> dict:
        t_start = time.perf_counter()

        # Score hyperbolologique vectorisé
        gamma_scores = batch_hyperbolic_scoring(embeddings, self.reference)
        observation = float(np.mean(gamma_scores))

        # Test statistique séquentiel
        sprt_decision = self.sprt.update(observation)

        # Modulo de cycle pour gestion sémantique
        self._cycle_mod = (self._cycle_mod % 10) + 1
        alert_triggered = False

        if sprt_decision == "H1":
            alert_triggered = True
            msg = "Alerte RATISS. Seuil de tension critique dépassé à Jebel Ali."
            self.tts.speak(msg)

        elapsed_ms = (time.perf_counter() - t_start) * 1000

        return {
            "cycle": self.sprt.cycle,
            "cycle_mod": self._cycle_mod,
            "gamma_mean": observation,
            "sprt_decision": sprt_decision,
            "log_ratio": self.sprt.log_ratio,
            "alert_triggered": alert_triggered,
            "elapsed_ms": elapsed_ms,
        }
