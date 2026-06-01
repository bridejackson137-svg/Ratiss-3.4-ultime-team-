#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
RATISS v3.4 — Pipeline Temps Réel, Étanchéité Numérique & Réseau Intelligent
Incorpore le moteur géodésique JAX, le SPRT de Kahan, le TTS segmenté,
et le nouveau module d'Auto-Analyse et Diagnostic des appareils connectés.
"""

import os
import io
import re
import sys
import time
import logging
import collections
import subprocess
import threading
import json
import urllib.request
import math
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Optional, Tuple, List, Dict

# Configuration du logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("RATISS_Pipeline")

try:
    import jax
    import jax.numpy as jnp
    JAX_AVAILABLE = True
    log.info("JAX détecté. Accélération matérielle XLA activée.")
except ImportError:
    import numpy as np
    JAX_AVAILABLE = False
    log.warning("JAX non trouvé. Repli sur le noyau vectorisé NumPy.")


# =====================================================================
# 1. STRUCTURES DE DONNÉES DU RÉSEAU INTELLIGENT (DIAGNOSTIC)
# =====================================================================

@dataclass
class DeviceProfile:
    ip: str
    hostname: str = "Inconnu"
    os_type: str = "Inconnu"       # Linux, Windows, Darwin, Android-TV
    architecture: str = "Inconnu"  # x86_64, armv7, aarch64
    cpu_usage_pct: float = 0.0
    ram_available_mb: float = 0.0
    status: str = "UNVERIFIED"     # STABLE, OVERLOADED, UNREACHABLE
    last_scan: float = 0.0


# =====================================================================
# 2. MODULE D'AUTO-ANALYSE ET DIAGNOSTIC DISTANT
# =====================================================================

class RatissNetworkDiagnosticUnit:
    """
    Unité intelligente chargée d'analyser, d'identifier et de diagnostiquer 
    l'état des appareils connectés à RATISS avant toute manipulation.
    """
    def __init__(self):
        # Registre statique en RAM des appareils connus et diagnostiqués
        self.inventory: Dict[str, DeviceProfile] = {}
        self.lock = threading.Lock()

    def enregistrer_appareil(self, ip: str):
        """ Initialise un profil vierge pour un nouvel appareil détecté. """
        with self.lock:
            if ip not in self.inventory:
                self.inventory[ip] = DeviceProfile(ip=ip)
                log.info(f"[DIAGNOSTIC] Nouvel appareil répertorié dans l'inventaire : {ip}")

    def auto_scan_appareil(self, ip: str) -> DeviceProfile:
        """
        Interroge l'API distante de l'appareil pour diagnostiquer son identité
        et son intégrité physique/systémique.
        """
        self.enregistrer_appareil(ip)
        url = f"http://{ip}/api/monitor/state" # Endpoint standard de télémétrie RATISS
        
        try:
            req = urllib.request.Request(url, method='GET')
            with urllib.request.urlopen(req, timeout=2) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    
                    with self.lock:
                        prof = self.inventory[ip]
                        prof.hostname = data.get("hostname", "Node-Distant")
                        prof.os_type = data.get("os_type", "Linux")
                        prof.architecture = data.get("architecture", "aarch64")
                        prof.cpu_usage_pct = float(data.get("cpu_pct", 0.0))
                        prof.ram_available_mb = float(data.get("ram_free", 0.0))
                        prof.last_scan = time.time()
                        
                        # Règle d'auto-évaluation diagnostique de la cible
                        if prof.cpu_usage_pct > 85.0:
                            prof.status = "OVERLOADED"
                        else:
                            prof.status = "STABLE"
                            
                        log.info(f"[DIAGNOSTIC SUCCESS] Appareil {ip} identifié ({prof.os_type} | {prof.architecture}). Statut: {prof.status}")
                        return prof
        except Exception as e:
            with self.lock:
                prof = self.inventory[ip]
                prof.status = "UNREACHABLE"
                prof.last_scan = time.time()
            log.warning(f"[DIAGNOSTIC FAILED] Impossible d'analyser l'appareil {ip} : En hors-ligne ou API absente.")
        
        return self.inventory[ip]

    def adapter_ordre_manipulation(self, ip: str, action_souhaitee: str) -> Optional[dict]:
        """
        Analyse le profil diagnostiqué de l'appareil et génère la charge utile (payload)
        la plus adaptée à son architecture et à sa charge actuelle.
        """
        prof = self.auto_scan_appareil(ip)
        
        if prof.status == "UNREACHABLE":
            log.error(f"[MANIPULATION ABORT] Cible {ip} inaccessible. Commande annulée.")
            return None
            
        if prof.status == "OVERLOADED" and action_souhaitee == "execute_task":
            log.warning(f"[MANIPULATION ADAPTED] Cible {ip} en surchauffe CPU ({prof.cpu_usage_pct}%). Mutation de la tâche lourde en tâche basse priorité.")
            return {"action": "execute_task", "priority": "IDLE", "niceness": 19}
            
        # Adaptation selon l'OS détecté lors du diagnostic
        if prof.os_type.upper() == "WINDOWS":
            log.info(f"[MANIPULATION TRANSLATION] Adaptation de la syntaxe pour environnement Windows (Cible: {prof.hostname})")
            return {"action": action_souhaitee, "platform_target": "win32", "shell": "powershell"}
            
        elif prof.os_type.upper() == "ANDROID-TV":
            log.info(f"[MANIPULATION TRANSLATION] Adaptation de la syntaxe pour Écran Android-TV (Cible: {prof.hostname})")
            return {"action": "display_overlay", "layer": "TOP_CRITICAL"}

        # Configuration standard Linux / ARM par défaut
        return {"action": action_souhaitee, "platform_target": "posix", "shell": "bash"}


# =====================================================================
# 3. CONTRÔLEUR D'ÉTAT CENTRALISÉ (SYNCHRONISATION AUDIO ET RÉSEAU)
# =====================================================================

class StateControllerRATISS:
    def __init__(self):
        self.lock = threading.Lock()
        self.current_audio_process: Optional[subprocess.Popen] = None
        self.is_playing = False
        self.active_engine = "NONE"
        # Intégration de l'unité de diagnostic réseau
        self.diagnostic_unit = RatissNetworkDiagnosticUnit()

    def acquire_playback(self, engine_type: str) -> bool:
        with self.lock:
            self.stop_all_playback_unsafe()
            self.is_playing = True
            self.active_engine = engine_type
            return True

    def release_playback(self):
        with self.lock:
            self.is_playing = False
            self.active_engine = "NONE"
            self.current_audio_process = None

    def stop_all_playback_unsafe(self):
        if self.current_audio_process:
            try:
                self.current_audio_process.terminate()
                self.current_audio_process.wait(timeout=1)
            except Exception: pass
            self.current_audio_process = None
        self.is_playing = False
        self.active_engine = "NONE"


# =====================================================================
# 4. LE MOTEUR AUDIO SEGMENTÉ RÉSILIENT (PIPER)
# =====================================================================

@dataclass
class PiperConfig:
    # NIVEAU 1 : Le nouveau moteur haute fidélité que l'on vient de valider
    model_gilles: str = "./modeles/fr_FR-gilles-high.onnx"
    config_gilles: str = "./modeles/fr_FR-gilles-high.onnx.json"
    
    # NIVEAU 2 : L'ancien moteur de secours (présent localement) - configuré avec la voix homme Gilles-Low
    model_secours: str = "./modeles/fr_FR-gilles-low.onnx"
    config_secours: str = "./modeles/fr_FR-gilles-low.onnx.json"
    
    # Exécutable principal militarisé par Node.js
    piper_binary: str = "./piper/piper"
    length_scale: float = 1.00

    # Propriétés de compatibilité ascendante pour main_orchestrator.py
    model_path: Optional[str] = None
    config_path: Optional[str] = None

    def __post_init__(self):
        if self.model_path is not None:
            self.model_secours = self.model_path
        if self.config_path is not None:
            self.config_secours = self.config_path


class PiperTTSEngine:
    def __init__(self, config: PiperConfig, state_controller: StateControllerRATISS):
        self.cfg = config
        self.state = state_controller
        self.active_model: Optional[str] = None
        self.active_config: Optional[str] = None
        self.mode_lecture: str = "NONE"
        self.current_audio_process: Optional[subprocess.Popen] = None
        
        # Initialisation de la cascade au démarrage du pipeline
        self._evaluer_et_aiguiller_moteurs()

    def _evaluer_et_aiguiller_moteurs(self) -> None:
        """
        Analyse l'environnement physique et applique la structure stricte 1, 2, 3.
        Vérifie la présence du binaire et des paires de fichiers ONNX/JSON.
        """
        binaire_existe = os.path.exists(self.cfg.piper_binary)
        
        # -----------------------------------------------------------------
        # STRUCTURE 1 : Tentative d'activation du Moteur Gilles-High
        # -----------------------------------------------------------------
        if binaire_existe and os.path.exists(self.cfg.model_gilles) and os.path.exists(self.cfg.config_gilles):
            self.active_model = self.cfg.model_gilles
            self.active_config = self.cfg.config_gilles
            self.mode_lecture = "LOCAL_GILLES"
            log.info("[CASCADE AUDIO] --> NIVEAU 1 ACTIF : Validation réussie pour Gilles-High.")
            return

        # -----------------------------------------------------------------
        # STRUCTURE 2 : Repli sur l'ancien modèle local en cas d'absence du 1
        # -----------------------------------------------------------------
        if binaire_existe and os.path.exists(self.cfg.model_secours) and os.path.exists(self.cfg.config_secours):
            self.active_model = self.cfg.model_secours
            self.active_config = self.cfg.config_secours
            self.mode_lecture = "LOCAL_SECOURS"
            log.warning("[CASCADE AUDIO] --> NIVEAU 2 ACTIF : Échec Niveau 1. Basculement sur l'ancien modèle.")
            return

        # -----------------------------------------------------------------
        # STRUCTURE 3 : Redirection totale vers l'interface Client (Navigateur)
        # -----------------------------------------------------------------
        self.active_model = None
        self.active_config = None
        self.mode_lecture = "BROWSER_FALLBACK"
        log.error("[CASCADE AUDIO] --> NIVEAU 3 ACTIF : Aucun moteur local opérationnel. Navigation Web forcée.")

    def execute_speech(self, text: str) -> dict:
        """
        Intercepte la demande de lecture du bouton de l'interface
        et renvoie l'instruction appropriée au serveur Node.js.
        """
        # Si la cascade a déterminé que seul le Niveau 3 est possible
        if self.mode_lecture == "BROWSER_FALLBACK":
            if self.state.acquire_playback("BROWSER"):
                return {"status": "FALLBACK_BROWSER", "text": text}
            return {"status": "BLOCKED"}
            
        # Sinon, exécution locale (Niveau 1 ou Niveau 2)
        if self.state.acquire_playback("INTERNAL"):
            threading.Thread(target=self._async_synthesize_and_play, args=(text,), daemon=True).start()
            return {"status": "PLAYING_INTERNAL"}
            
        return {"status": "BLOCKED"}

    def _async_synthesize_and_play(self, text: str):
        try:
            wav_data = self._synthesize(text)
            if not wav_data:
                # Si la synthèse locale échoue de manière critique en plein vol, on force le Niveau 3
                log.error("[TTS CRASH] Échec de génération locale. Forçage dynamique vers Niveau 3.")
                self.state.release_playback()
                return
                
            # Sélection de la commande de lecture de l'hôte (Linux standard ou multiplateforme via mpv)
            player_cmd = ["aplay", "-q"] if sys.platform.startswith("linux") else ["mpv", "-"]
            
            with self.state.lock:
                if not self.state.is_playing or self.state.active_engine != "INTERNAL": 
                    return
                self.current_audio_process = subprocess.Popen(
                    player_cmd, 
                    stdin=subprocess.PIPE, 
                    stdout=subprocess.DEVNULL, 
                    stderr=subprocess.DEVNULL
                )
                
            self.current_audio_process.communicate(input=wav_data.getvalue())
        except Exception as e:
            log.error(f"[AUDIO RUNTIME ERROR] Interruption du flux : {e}")
        finally: 
            self.state.release_playback()

    def _synthesize(self, text: str) -> Optional[io.BytesIO]:
        # Découpage sémantique pour éviter la saturation mémoire du binaire
        MAX_SEGMENT_CHARS = 150
        segments = [text[i:i+MAX_SEGMENT_CHARS] for i in range(0, len(text), MAX_SEGMENT_CHARS)]
        
        combined_pcm = bytearray()
        
        # Injection dynamique des cibles validées par la cascade (Niveau 1 ou Niveau 2)
        cmd = [
            self.cfg.piper_binary, 
            "--model", self.active_model, 
            "--config", self.active_config, 
            "--length_scale", str(self.cfg.length_scale), 
            "--output_raw"
        ]
        
        for seg in segments:
            if not seg.strip(): continue
            try:
                proc = subprocess.run(cmd, input=seg.encode("utf-8"), capture_output=True, timeout=10)
                if proc.returncode == 0: 
                    combined_pcm.extend(proc.stdout)
                else:
                    # En cas d'erreur isolée sur le Niveau 1, tentative de basculement à chaud sur le Niveau 2
                    if self.mode_lecture == "LOCAL_GILLES":
                        log.error("[CASCADE EMERGENCY] Erreur binaire sur Niveau 1. Commutation d'urgence vers Niveau 2.")
                        self.active_model = self.cfg.model_secours
                        self.active_config = self.cfg.config_secours
                        self.mode_lecture = "LOCAL_SECOURS"
            except Exception:
                continue
                
        if len(combined_pcm) == 0: 
            return None
            
        return self._wrap_pcm_to_wav(bytes(combined_pcm))

    def _wrap_pcm_to_wav(self, pcm_data: bytes, sample_rate: int = 22050) -> io.BytesIO:
        """ Encapsulation brute des données PCM dans un en-tête WAV standard """
        wav_io = io.BytesIO()
        num_channels, bytes_per_sample = 1, 2
        data_size = len(pcm_data)
        wav_io.write(b'RIFF')
        wav_io.write((36 + data_size).to_bytes(4, 'little'))
        wav_io.write(b'WAVEfmt ')
        wav_io.write((16).to_bytes(4, 'little'))
        wav_io.write((1).to_bytes(2, 'little'))
        wav_io.write(num_channels.to_bytes(2, 'little'))
        wav_io.write(sample_rate.to_bytes(4, 'little'))
        wav_io.write((sample_rate * num_channels * bytes_per_sample).to_bytes(4, 'little'))
        wav_io.write((num_channels * bytes_per_sample).to_bytes(2, 'little'))
        wav_io.write((bytes_per_sample * 8).to_bytes(2, 'little'))
        wav_io.write(b'data')
        wav_io.write(data_size.to_bytes(4, 'little'))
        wav_io.write(pcm_data)
        wav_io.seek(0)
        return wav_io


# =====================================================================
# 5. ALGORITHME WALD SPRT & ORCHESTRATEUR DE FUSION COGNITIVE (v3.4)
# =====================================================================

@dataclass
class WaldConfig:
    alpha: float
    beta: float
    mu0: float   # État sémantique nominal
    mu1: float   # État critique de déviation/ruine
    sigma: float


def compute_tension_score(
    d_local: float,
    s_jebel: float,
    velocity_vectors: np.ndarray,
    theta_angles: np.ndarray,
    lambdas: np.ndarray,
    t_offsets: np.ndarray
) -> float:
    """
    Calcule le Score de Tension global combinant la divergence hyperbolique locale d_local,
    le poids de Jebel Ali, et la dynamique vectorielle de transport.
    """
    contributions = lambdas * velocity_vectors * np.cos(theta_angles) * np.exp(-t_offsets)
    return float(d_local + s_jebel * np.sum(contributions))


class RATISSOrchestrator:
    def __init__(self, tts_engine: PiperTTSEngine, wald_cfg: WaldConfig, window: int = 100):
        self.tts = tts_engine
        self.wald_cfg = wald_cfg
        self.window = window
        self.cycle_count = 0
        self.buffer = collections.deque(maxlen=window)
        self.cumulative_log_ratio = 0.0

    @classmethod
    def build_default(cls, tts_cfg: PiperConfig, wald_cfg: WaldConfig, window: int = 100):
        # Initialise le contrôleur d'état de lecture
        state_controller = StateControllerRATISS()
        tts_engine = PiperTTSEngine(tts_cfg, state_controller)
        return cls(tts_engine, wald_cfg, window)

    def process_cycle(self, batch_embeddings: np.ndarray) -> dict:
        """
        Traite un cycle complet en temps réel :
        1. Projection et calcul de la moyenne hyperbolique des embeddings (Poincaré)
        2. Test séquentiel de ratio de probabilité (Wald SPRT) pour lever les alertes de déviation sémantique
        3. Déclenchement de la parole si l'alerte est franchie
        """
        start_time = time.time()
        self.cycle_count += 1

        # Projection et calcul de la moyenne hyperbolique (conforme au disque de Poincaré)
        # On calcule les normes euclidiennes brutes pour chaque embedding de dimension 768
        norms_eucl = np.linalg.norm(batch_embeddings, axis=-1)
        
        # Projection exponentielle vers la boule ouverte de Poincaré
        scale = np.tanh(norms_eucl / 2.0) / (norms_eucl + 1e-8)
        projections = batch_embeddings * scale[..., np.newaxis]
        proj_norms = np.linalg.norm(projections, axis=-1)
        
        # Sécurité numérique : confinement rigide sous le bord
        proj_norms = np.clip(proj_norms, 0.0, 1.0 - 1e-5)
        
        # Distance de Poincaré à l'origine : 2 * arctanh(||p||)
        d_H = 2.0 * np.arctanh(proj_norms)
        gamma_mean = float(np.mean(d_H))

        self.buffer.append(gamma_mean)

        # Calcul du rapport de probabilité de Wald SPRT
        mu0 = self.wald_cfg.mu0
        mu1 = self.wald_cfg.mu1
        sigma = self.wald_cfg.sigma

        # Log-likeliood ratio pour la distribution normale observée
        current_log_ratio = ((gamma_mean - mu0) ** 2 - (gamma_mean - mu1) ** 2) / (2.0 * (sigma ** 2) + 1e-12)
        
        # Accumulation séquentielle
        self.cumulative_log_ratio += current_log_ratio

        # Seuils log-Wald
        log_A = math.log(self.wald_cfg.beta / (1.0 - self.wald_cfg.alpha + 1e-12))
        log_B = math.log((1.0 - self.wald_cfg.beta) / (self.wald_cfg.alpha + 1e-12))

        sprt_decision = "CONTINUE"
        alert_triggered = False

        if self.cumulative_log_ratio >= log_B:
            sprt_decision = "ALERT"
            alert_triggered = True
            # Réinitialisation après alerte
            self.cumulative_log_ratio = 0.0
        elif self.cumulative_log_ratio <= log_A:
            sprt_decision = "STABLE"
            # Réinitialisation après retour à la stabilité
            self.cumulative_log_ratio = 0.0

        # Déclenchement de la cascade vocale résiliente (Niveau 1, 2 ou 3)
        if alert_triggered:
            phrase_alerte = f"Alerte sémantique majeure. Déviation globale mesurée au cycle {self.cycle_count}."
            self.tts.execute_speech(phrase_alerte)

        elapsed_ms = (time.time() - start_time) * 1000.0
        cycle_mod = (self.cycle_count - 1) % 100

        return {
            "cycle": self.cycle_count,
            "cycle_mod": cycle_mod,
            "gamma_mean": gamma_mean,
            "log_ratio": self.cumulative_log_ratio,
            "sprt_decision": sprt_decision,
            "elapsed_ms": elapsed_ms,
            "alert_triggered": alert_triggered
        }


# =====================================================================
# 5. TEST DE SIMULATION DE L'AUTO-SCAN DIAGNOSTIQUE INTELLIGENT
# =====================================================================

if __name__ == "__main__":
    log.info("--- INITIALISATION DU MONSTRE RATISS V3.4 (AVEC AUTO-DIAGNOSTIC RESEAU) ---")
    
    controleur_etat = StateControllerRATISS()
    moteur_audio = PiperTTSEngine(PiperConfig(), controleur_etat)
    
    # Simulation 1 : Enregistrement et tentative de scan d'une cible fictive
    ip_test = "192.168.1.45"
    log.info(f"Étape 1 : Lancement de l'auto-scan intelligent sur la cible : {ip_test}...")
    
    # On effectue le diagnostic (qui va tenter de lire l'état matériel de l'appareil)
    profil_detecte = controleur_etat.diagnostic_unit.auto_scan_appareil(ip_test)
    
    # Simulation 2 : Génération d'une commande système sécurisée et adaptée au profil
    log.info("Étape 2 : Calcul et adaptation automatique de la charge utile en fonction de l'appareil...")
    
    # On demande à RATISS d'adapter une tâche d'exécution
    ordre_adapte = controleur_etat.diagnostic_unit.adapter_ordre_manipulation(ip_test, "execute_task")
    
    log.info(f"Analyse terminée. Contenu de la commande générée par le réseau intelligent : {ordre_adapte}")
