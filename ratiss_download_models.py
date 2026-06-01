#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Module d'Infiltration et Téléchargement Automatique pour RATISS v3.4
Récupère à distance le modèle haute fidélité fr_FR-upmc-high depuis le dépôt officiel.
"""

import os
import urllib.request
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("RATISS_Downloader")

# Configuration des cibles et des liens d'indexation
TARGET_DIR = "./modeles"
FILES_TO_DOWNLOAD = {
    "fr_FR-upmc-high.onnx": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/upmc/high/fr_FR-upmc-high.onnx",
    "fr_FR-upmc-high.onnx.json": "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/upmc/high/fr_FR-upmc-high.onnx.json"
}

def initialiser_et_telecharger():
    # 1. Création du dossier de stockage s'il n'existe pas
    if not os.path.exists(TARGET_DIR):
        os.makedirs(TARGET_DIR)
        log.info(f"Création du répertoire de stockage : {TARGET_DIR}")

    # 2. Boucle de téléchargement sécurisée
    for filename, url in FILES_TO_DOWNLOAD.items():
        destination_path = os.path.join(TARGET_DIR, filename)
        
        if os.path.exists(destination_path):
            log.info(f"[OK] Le fichier {filename} est déjà présent localement. Téléchargement ignoré.")
        else:
            log.info(f"[TELECHARGEMENT] Récupération de {filename} à distance...")
            log.info(f"Source : {url}")
            try:
                # Bloc de progression ou de téléchargement direct standard
                urllib.request.urlretrieve(url, destination_path)
                log.info(f"[SUCCÈS] {filename} infiltré et enregistré avec succès dans {TARGET_DIR}.")
            except Exception as e:
                log.error(f"[ERREUR] Échec du téléchargement pour {filename} : {e}")
                if os.path.exists(destination_path):
                    os.remove(destination_path) # Nettoyage si fichier corrompu

if __name__ == "__main__":
    log.info("=== SÉQUENCE DE TÉLÉCHARGEMENT DU MOTEUR TTS HAUTE FIDÉLITÉ (120 Mo) ===")
    initialiser_et_telecharger()
    log.info("=== CONFIGURATION DES FICHIERS TERMINÉE ===")
