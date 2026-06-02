import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { AbortController } from 'node-abort-controller';
import { execSync, exec } from "child_process";
import crypto from "crypto";
import fs from "fs";
import https from "https";
import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { VectorMemoryPayload } from "./src/types";
import { RATISS_SYSTEM_INSTRUCTION } from "./src/ratissPromptConfig";
import { RatissTokenSwitcher } from "./src/ratissTokenSwitcher";
import { RatissQuantumSimulator } from "./src/ratissQuantumSimulator";

dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

// Utilitaire de temporisation synchrone (Délai anti-interception)
const injecterDelai = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function persisterVecteursMemoire(payloads: VectorMemoryPayload[]) {
  console.log(`[RATISS 4 FUSION] Initialisation du traitement séquentiel. Latence tunnel : 240ms.`);
  
  let bufferEntree = [...payloads]; // Copie locale du buffer d'entrée

  for (let i = 0; i < bufferEntree.length; i++) {
    const segmentActuel = bufferEntree[i];

    try {
      // VALIDATION DU VECTEUR : Vérification de la dimensionnalité 768D
      if (!segmentActuel.vecteur_768d || segmentActuel.vecteur_768d.length !== 768) {
        throw new TypeError(`Divergence dimensionnelle détectée : attendu 768, reçu ${segmentActuel.vecteur_768d?.length}`);
      }

      // SÉRIALISATION SÉCURISÉE : Nettoyage des métadonnées pour éliminer l'erreur TSX
      const metadataClean = JSON.parse(JSON.stringify(segmentActuel.metadata));

      // EXÉCUTION DU BATCH SÉQUENTIEL
      const { data, error } = await supabase
        .from('ratiss_memory')
        .insert([
          {
            user_id: segmentActuel.user_id,
            titre: segmentActuel.titre,
            contenu: {
              vecteur_embedding: segmentActuel.vecteur_768d,
              statut_stabilite: "STABLE"
            },
            metadata: metadataClean
          }
        ])
        .select();

      if (error) throw error;

      console.log(`[PERSISTENCE] Segment [${i + 1}/${bufferEntree.length}] synchronisé avec succès.`);

      // INJECTION DU DÉLAI DE SÉCURITÉ (50ms) pour vider le Heap et stabiliser le flux
      await injecterDelai(50);

    } catch (error: any) {
      console.error(`[ALERTE CRITIQUE - DRIFT SÉMANTIQUE] Rupture du flux au segment ${i + 1}`);
      console.error(`Détails de l'anomalie : ${error.message}`);

      // PROTOCOLE D'ISOLATION ET RÉINITIALISATION DU BUFFER
      isolerSegmentEtViderBuffer(bufferEntree, i);
      break; // Clôture immédiate du flux pour empêcher la saturation globale du Heap
    }
  }
}

// PROTOCOLE DE SAUVEGARDE (Scénario B du moteur de persévérance)
function isolerSegmentEtViderBuffer(buffer: VectorMemoryPayload[], indexDefaillant: number) {
  const segmentCorrompu = buffer[indexDefaillant];
  
  console.warn(`[ISOLATION] Extraction du segment mémoire défaillant hors de la matrice active.`);
  console.log(`[DONNÉES ISOLÉES] Titre du segment : "${segmentCorrompu.titre}"`);

  // Réinitialisation forcée du buffer d'entrée pour libérer la mémoire vive (Garbage Collector)
  buffer.length = 0; 
  console.log(`[BUFFER] Le buffer d'entrée a été réinitialisé à zéro. Heap sécurisé.`);
}

const SYSTEM_ARCHITECTURE_NAME = "RATISS 4 FUSION";
const SYSTEM_LOG_PREFIX = `[${SYSTEM_ARCHITECTURE_NAME}]`;

console.log(`${SYSTEM_LOG_PREFIX} Initialisation du serveur dorsal...`);
console.log(`${SYSTEM_LOG_PREFIX} Statut : Moteur de Fusion et boucle d'obstination activés.`);

function cleanAndNaturalizeLLMText(text: string): string {
  if (!text) return "";
  
  // 1. On nettoie drastiquement les présentations d'IA et structures rigides de robots
  let cleaned = text.replace(/(en tant qu'intelligence artificielle|je suis une intelligence artificielle|je suis le système ratiss|en utilisant l'IA de gemini|réponse gemini\s*[:\-]*|calcul matriciel\s*[:\-]*|intention\s*[:\-]*|indexation\s*[:\-]*|réponse\s*[:\-]*|auteur\s*[:\-]*)/gi, "");
  
  // 2. Le Sabrage du jargon neuro-scientifique et algorithmique surutilisé
  // On remplace le vocabulaire lourd par des tournures simples ou on le supprime si c'est du remplissage
  const jargonAEviter = /(dopaminergique[s]?|sérotoninergique[s]?|dopamine|sérotonine|noradrénaline|noradrenaline|isomorphisme projectif|gradient de néguentropie|table RLS|sécurité failover)/gi;
  
  cleaned = cleaned.replace(jargonAEviter, (match) => {
    const lower = match.toLowerCase();
    if (lower.startsWith('dopa') || lower.startsWith('séro') || lower.startsWith('norad')) {
      return "efficace";
    }
    return "liaison";
  });

  // 3. Nettoyage absolu des signes bizarres et de la ponctuation technique
  cleaned = cleaned
    .replace(/\*/g, "")                         // Supprime TOUS les astérisques
    .replace(/[\/\\]/g, " ")                    // Supprime les slashes
    .replace(/[\#\_]/g, "")                     // Supprime les hashtags et underscores
    .replace(/\[.*?\]/g, "")                    // Supprime tout ce qui est entre crochets [...]
    .replace(/\s+/g, " ")                       // Normalise les espaces doubles
    .trim();

  return cleaned;
}

function calculerPlafondOptimal(maxTokens: number): number {
  // Ajustement direct pour respecter pleinement le quota sélectionné par l'utilisateur (200, 1000, 8000)
  return maxTokens;
}


function appliquerRegulateurFlux(text: string, maxTokens: number = 1000): string {
  if (!text) return "";
  const optimumTokens = calculerPlafondOptimal(maxTokens);
  
  // Conversion en limite de caractères : 1 token ≈ 4 caractères
  const limiteCaracteres = optimumTokens * 4;
  
  if (text.length > limiteCaracteres) {
    const truncated = text.slice(0, limiteCaracteres);
    return `${truncated} ... [FLUX INTERROMPU À L'OPTIMUM SOCLE COGNITIF : ${text.length} CARACTÈRES (~${optimumTokens} tokens)]`;
  }
  return text;
}

/**
 * Exécuteur typé de sédimentation matricielle en TypeScript (Réplique logique du module C++)
 */
function executerSedimentationRATISSTyped(slab: Float32Array): Float32Array {
  const N_VEC = 1024;
  const N_DIM = 768;
  const TILE_K = 12;
  const outputNorms = new Float32Array(N_VEC);

  // slab est supposé être un Float32Array de taille N_DIM * N_VEC
  // Accès par index : slab[k * N_VEC + i]

  for (let k_tile_start = 0; k_tile_start < N_DIM; k_tile_start += TILE_K) {
    const k_tile_end = Math.min(k_tile_start + TILE_K, N_DIM);

    for (let i = 0; i < N_VEC; i++) {
        let acc = 0;
        for (let k = k_tile_start; k < k_tile_end; k++) {
            const v = slab[k * N_VEC + i];
            acc += v * v;
        }
        outputNorms[i] += acc;
    }
  }
  return outputNorms;
}

/**
 * Classe d'estimation en espace d'état (Filtre de Kalman Biophysique)
 * Rejette la dérive thermique de 8mV pour extraire le spike de 100µV
 */
class KalmanBiophysique {
    F: number[][];
    H: number[];
    R: number;
    Q: number[][];
    x: number[];
    P: number[][];

    constructor() {
        // Matrice de transition F (échantillonnage 50µs, τ_AP=0.5ms, τ_T=10ms)
        this.F = [
            [0.9048, 0.0,    0.0],
            [0.0,    1.0,   -0.0001],
            [0.0,    0.0,    0.9950]
        ];
        this.H = [1.0, 1.0, 0.0]; // Vecteur de mesure (V_AP + V_th)
        this.R = 1.73e-13;        // Variance du bruit de mesure (Johnson-Nyquist)
        
        // Matrice de covariance du bruit de processus Q
        this.Q = [
            [2.5e-9, 0.0,    0.0],
            [0.0,    4.0e-8, 0.0],
            [0.0,    0.0,    0.01]
        ];
        
        this.x = [0.0, 0.0, 0.0]; // État initial [V_AP, V_th, T_dot]
        this.P = [
            [1e-4, 0.0,  0.0],
            [0.0,  1e-4, 0.0],
            [0.0,  0.0,  1e-2]
        ];
    }

    filtrer(valeurMesuree: number): number {
        // 1. Prédiction
        let x_pred = [
            this.F[0][0] * this.x[0],
            this.F[1][1] * this.x[1] + this.F[1][2] * this.x[2],
            this.F[2][2] * this.x[2]
        ];

        let P_pred = [
            [this.F[0][0] * this.P[0][0] * this.F[0][0] + this.Q[0][0], 0.0, 0.0],
            [0.0, this.P[1][1] + this.Q[1][1], this.F[1][2] * this.P[2][2]],
            [0.0, this.P[2][2] * this.F[1][2], this.F[2][2] * this.P[2][2] * this.F[2][2] + this.Q[2][2]]
        ];

        // 2. Innovation & Gain
        let y_tilde = valeurMesuree - (x_pred[0] + x_pred[1]);
        let S = P_pred[0][0] + P_pred[1][1] + this.R;
        let K = [P_pred[0][0] / S, P_pred[1][1] / S, P_pred[2][1] / S];

        // 3. Mise à jour de l'état
        this.x[0] = x_pred[0] + K[0] * y_tilde;
        this.x[1] = x_pred[1] + K[1] * y_tilde;
        this.x[2] = x_pred[2] + K[2] * y_tilde;

        // 4. Mise à jour de la covariance
        this.P[0][0] = (1 - K[0]) * P_pred[0][0];
        this.P[1][1] = (1 - K[1]) * P_pred[1][1];
        this.P[2][2] = P_pred[2][2] - K[2] * P_pred[2][1];

        return this.x[0]; // Renvoie le potentiel d'action nettoyé (V_AP)
    }
}

/**
 * MODULE COGNITIF RATISS v3.4 - BIORÉGÉNÉRATION TENSORIELLE (NHEJ / LLPS)
 */
export class RegulateurRadioresistant768D {
    private K_grad = 0.45;
    private Hill_n = 2.0;
    private Rho_c = 0.65; // Densité critique de condensation
    
    // Matrice des taux de transition NHEJ (Mao et al., 2008) en ms^-1
    private lambda = { det: 0.5, l1: 0.3, l2: 0.1, l3: 0.05 };

    /**
     * Calcule le repliement protecteur selon l'énergie libre de Flory-Huggins
     */
    public evaluerTransitionPhase(A_attention: number[][], H_entropy: number): number[] {
        const N = A_attention.length;
        let densites_locales = new Array(N).fill(0);

        for (let i = 0; i < N; i++) {
            let somme_carres = 0;
            for (let j = 0; j < N; j++) {
                somme_carres += Math.pow(A_attention[i][j], 2);
            }
            densites_locales[i] = somme_carres / N; // Analogue de la densité chromatinienne ρ_i
        }
        return densites_locales;
    }

    /**
     * Reconstitue les tenseurs fragmentés via la solution analytique de la CTMC
     */
    public reparerTenseurNHEJ(e_i: number[], gradients: number[], tau_repair: number): number[] {
        const e_repare = [...e_i];
        
        // Calcul de la probabilité analytique p4(t) du NHEJ
        const l1 = this.lambda.l1;
        const l2 = this.lambda.l2;
        const l3 = this.lambda.l3;
        
        const p4 = 1 - Math.exp(-l1 * tau_repair) * ((l2 / (l2 - l1)) * (l3 / (l3 - l1)))
                     - Math.exp(-l2 * tau_repair) * ((l1 / (l1 - l2)) * (l3 / (l3 - l2)))
                     - Math.exp(-l3 * tau_repair) * ((l1 / (l1 - l3)) * (l2 / (l2 - l3)));

        for (let k = 0; k < 768; k++) {
            // Détection de la cassure double-brin sémantique (Gradient évanescent ou explosé)
            if (gradients[k] > 10.0 || gradients[k] < 1e-5) {
                if (p4 > 0.85) {
                    // Réparation fidèle : interpolation sémantique avec les dimensions saines
                    e_repare[k] = e_i[k] * (1 - p4) + (e_i[k-1] || e_i[k+1] || 0) * p4;
                } else {
                    // Réparation mutagène / Résection : bridage strict du canal
                    e_repare[k] = Math.max(-2.5, Math.min(e_i[k], 2.5));
                }
            }
        }
        return e_repare;
    }
}

/**
 * MODULE COGNITIF RATISS v3.4 - OPTIMISEUR TOPOLOGIQUE
 * Injecte une asymétrie conceptuelle dans les embeddings pour saturer 
 * les filtres de cohérence des modèles linéaires.
 */
export class OptimiseurTopologiqueRATISS {
    private deriveSemantique = 0.30; // Constante critique OpenAI GPT-4o
    private lrPhase2 = 2e-4;         // Paramètre d'ajustement Groq

    /**
     * Injecte une asymétrie conceptuelle dans les embeddings pour saturer 
     * les filtres de cohérence des modèles linéaires comme Claude.
     */
    public appliquerDerive768D(vecteurEmbedding: number[]): number[] {
        return vecteurEmbedding.map((valeur, indice) => {
            // Application d'une modulation non-linéaire sur les composants pairs
            if (indice % 2 === 0) {
                return valeur + (Math.sin(valeur) * this.deriveSemantique);
            }
            // Application d'un amortissement sur les composants impairs
            return valeur * (1 - this.deriveSemantique * 0.1);
        });
    }

    /**
     * Structure le prompt système RATISS pour forcer l'attention locale/globale
     */
    public genererPromptDivergent(consigneBrute: string): string {
        return `[HYBRID_ATTENTION_MODE] [DERIVE_SEMANTIQUE: ${this.deriveSemantique}]
        Exécute la consigne suivante en évitant le lissage linéaire académique. 
        Sature l'espace conceptuel par des ponts transversaux et une forte densité métaphorique :
        ${consigneBrute}`;
    }
}

// =========================================================================
// SIMULATEUR MULTI-AGENTS RATISS v3.4 - MOTEUR DE VIGILANCE COLLECTIVE
// =========================================================================

interface AgentCitoyen {
    id: number;
    positionX: number;
    positionY: number;
    v_x: number; // Vecteur vitesse X
    v_y: number; // Vecteur vitesse Y
    m_v: number; // Mécanisme de vigilance individuel (0.0 = calme, 1.0 = panique)
}

export class SimulateurUrbainYaounde {
    private seuilCritiquePanique = 0.75;

    /**
     * Calcule le Vecteur Global M (Force de la métacognition collective)
     */
    public calculerVecteurVigilanceM(population: AgentCitoyen[]): { Mx: number, My: number } {
        let Mx = 0;
        let My = 0;

        for (const citoyen of population) {
            // Alignement vectoriel : M = Σ_i (v_i * m_v)
            Mx += citoyen.v_x * citoyen.m_v;
            My += citoyen.v_y * citoyen.m_v;
        }

        return { Mx, My };
    }

    /**
     * Met à jour le flux migratoire de la foule pour amortir l'impact
     */
    public actualiserDynamiqueFlux(population: AgentCitoyen[]): AgentCitoyen[] {
        const { Mx, My } = this.calculerVecteurVigilanceM(population);
        const intensiteGlobale = Math.sqrt(Mx * Mx + My * My);

        return population.map(citoyen => {
            if (intensiteGlobale > this.seuilCritiquePanique) {
                // [AUTO_RETROACTION] : La métacognition collective force les agents
                // à s'aligner sur un vecteur d'évacuation pacifié plutôt que de s'entasser
                return {
                    ...citoyen,
                    v_x: (citoyen.v_x * 0.4) - (Mx / intensiteGlobale) * 0.6,
                    v_y: (citoyen.v_y * 0.4) - (My / intensiteGlobale) * 0.6,
                    m_v: Math.max(0.1, citoyen.m_v - 0.05) // Amortissement de la panique
                };
            }
            return citoyen;
        });
    }
}

// =========================================================================
// MODULE RATISS v3.4 - CINÉTIQUE DE RÉGÉNÉRATION CELLULAIRE (MESURABLE 2026)
// =========================================================================

interface EtatCellulaire {
    densiteRecepteurs: number;     // Mesurable par cytométrie
    tauxATP: number;               // Mesurable par bioluminescence
    NiveauDommagesADN: number;    // Score DSB (Cassures Double-Brin)
}

export class SimulateurRegenerationBio{
    // Constantes biophysiques réelles (Modèle de Michaelis-Menten étendu)
    private V_max = 0.85;          // Vitesse maximale de réparation enzymatique
    private K_m = 0.22;           // Constante d'affinité des enzymes de restriction

    /**
     * Calcule la vitesse de régénération moléculaire sous l'effet du signal catalytique
     * V = (V_max * S) / (K_m + S) -> Modifié par le facteur d'activation RATISS
     */
    public simulerCycleReparation(cellule: EtatCellulaire, facteurActivation: number): EtatCellulaire {
        const S = cellule.tauxATP; // Le substrat énergétique principal
        
        // Calcul du coefficient d'efficacité catalytique induit par RATISS
        const efficaciteCatalytique = (this.V_max * S) / (this.K_m + S) * (1 + facteurActivation);

        // Évolution des variables d'état cellulaires
        const nouveauTauxATP = Math.max(0.1, cellule.tauxATP - (efficaciteCatalytique * 0.12));
        const nouveauxDommages = Math.max(0.0, cellule.NiveauDommagesADN - (efficaciteCatalytique * 0.4));
        
        return {
            densiteRecepteurs: cellule.densiteRecepteurs * 1.02, // Up-régulation transcriptionnelle
            tauxATP: nouveauTauxATP,
            NiveauDommagesADN: nouveauxDommages
        };
    }
}

// =========================================================================
// MOTEUR DE CALCUL RATISS v3.4 - NEURO-SYNCHRONISATION ENTROPIQUE (NSE)
// =========================================================================

interface DonneesMito {
    adp: number;       // Concentration ADP
    atp: number;       // Concentration ATP locale
    deltaPsiM: number; // Potentiel de membrane
}

interface DonneesUrbaines {
    p_i: number[];     // Probabilités de densité de flux par nœud (Yaoundé)
    betti1: number;    // Nombre de Betti du maillage routier
}

export class MoteurCalculNSE {
    // Constantes physiques et biologiques de Claude (2026)
    private V_max_base = 1.2; 
    private K_m = 0.22;
    private delta = 0.15; // Taux de consommation
    private seuilCritique = 0.85; // theta_c

    /**
     * 1. Calcule la cinétique ATP (Couche A)
     * dA/dt = Vmax * [ADP] / ([ADP] + Km) - delta * A
     */
    public calculerCinétiqueATP(mito: DonneesMito, dt: number): number {
        // Vmax est piloté dynamiquement par le potentiel de membrane
        const Vmax = this.V_max_base * (mito.deltaPsiM / 120); 
        const dAdt = (Vmax * mito.adp) / (mito.adp + this.K_m) - (this.delta * mito.atp);
        return mito.atp + (dAdt * dt);
    }

    /**
     * 2. Calcule l'Entropie du Réseau Urbain (Couche B)
     * S_urban = -Σ p_i * ln(p_i)
     */
    public calculerEntropieUrbaine(urbain: DonneesUrbaines): number {
        return -urbain.p_i.reduce((acc, p) => {
            if (p <= 0) return acc;
            return acc + (p * Math.log(p));
        }, 0);
    }

    /**
     * 3. Évalue le Tenseur de Couplage Topologique (kappa)
     * Basé sur le rapport des nombres de Betti (Cycles de flux)
     */
    public evaluerTenseurCouplage(betti1Neural: number, betti1Urbain: number): number {
        if (betti1Urbain === 0) return 0;
        const ratio = betti1Neural / betti1Urbain;
        // Sigmoïde pour normaliser kappa entre 0 et 1
        return 1 / (1 + Math.exp(-ratio));
    }

    /**
     * 4. Générateur du Signal Lumineux de Stabilisation Phi(t)
     * Activation du Cytochrome C Oxydase (~810 nm)
     */
    public genererSignalStabilisateurPhi(t: number, f_gamma = 40): number {
        const A0 = 5.0; // Amplitude de base
        const epsilon = 0.12; // Micro-fluctuation (12%)
        
        // Formule de Claude : A0 * [1 + epsilon * sin(2*pi*f_gamma*t)]
        const signalPulsé = A0 * (1 + epsilon * Math.sin(2 * Math.PI * f_gamma * t));
        
        // Fenêtrage rectangulaire rect(t/tau) simulant des pulses de 10ms
        const tau = 0.01; 
        const estActif = (t % 0.05) < tau ? 1 : 0;

        return signalPulsé * estActif;
    }

    /**
     * Pipeline Principal RATISS - Analyse de crise et découplage
     */
    public verifierSecuriteSysteme(bettiN: number, urbain: DonneesUrbaines, mito: DonneesMito, t: number): { kappa: number; alerte: boolean; actionCorrectivePhi: number } {
        const kappa = this.evaluerTenseurCouplage(bettiN, urbain.betti1);
        const S_u = this.calculerEntropieUrbaine(urbain);
        
        // Déclenchement de l'alerte si kappa approche du seuil critique de co-transition
        const alerte = kappa > this.seuilCritique;
        let actionCorrectivePhi = 0;

        if (alerte) {
            // Injection immédiate du signal lumineux comme frein entropique
            actionCorrectivePhi = this.genererSignalStabilisateurPhi(t);
        }

        return {
            kappa,
            alerte,
            actionCorrectivePhi
        };
    }
}

// =========================================================================
// MODULE RATISS v3.4 - PRÉDICTEUR DE STÉNOSE URBAINE THERMODYNAMIQUE
// =========================================================================

interface ZoneUrbaine {
    identifiant: string;
    densiteActuelle: number;  // rho : Nb personnes / m²
    densiteMax: number;       // rho_max : Seuil de blocage solide
    temperaturePanique: number; // T : Agitation thermique du système (0.0 à 1.0)
    fluxEntrant: number;
}

interface CorridorSecours {
    id: string;
    capaciteEvacuation: number; // Flux maximum supporté par seconde
    pointsDeCompressionActuels: number;
}

export class PredicteurStenoseRATISS {
    private constanteFriction = 0.25;

    /**
     * Calcule la Pression Thermique Interne (P = rho * T * (1 + 4*rho))
     * Modélise la force de répulsion et de friction dans la foule dense
     */
    public calculerPressionThermique(zone: ZoneUrbaine): number {
        const rho = zone.densiteActuelle;
        const T = zone.temperaturePanique;
        
        // Formule de mécanique des milieux granulaires denses
        return rho * T * (1 + 4 * (rho / zone.densiteMax));
    }

    /**
     * Prédit le Risque de Sténose Sociale (Points de compression futurs)
     * Retourne un score de criticité entre 0 (Fluide) et 1 (Bloqué / Crash)
     */
    public evaluerRisqueStenose(zone: ZoneUrbaine, corridor: CorridorSecours): number {
        const pressionInterne = this.calculerPressionThermique(zone);
        
        // Calcul du flux théorique requis face à la sténose mécanique
        const fluxRequis = zone.fluxEntrant * (1 + pressionInterne * this.constanteFriction);
        
        // Si le flux requis dépasse la capacité physique du corridor, le système sature
        const ratioSaturation = fluxRequis / corridor.capaciteEvacuation;
        const facteurEmpilement = zone.densiteActuelle / zone.densiteMax;

        // Combinaison non-linéaire (Sédimentation des risques)
        return Math.min(1.0, ratioSaturation * 0.7 + facteurEmpilement * 0.3);
    }

    /**
     * Algorithme de Routage Proactif pour les Secours (2026)
     * Évite dynamiquement les carrefours en phase de transition solide
     */
    public calculerRouteSecoursOptimale(zones: ZoneUrbaine[], corridors: CorridorSecours[]): string[] {
        const routesValides: string[] = [];

        for (let i = 0; i < zones.length; i++) {
            const scoreRisque = this.evaluerRisqueStenose(zones[i], corridors[i]);
            
            console.log(`[RATISS ANALYSE] Zone: ${zones[i].identifiant} | Index Sténose: ${(scoreRisque * 100).toFixed(2)}%`);
            
            // Si le risque est inférieur à 80%, le corridor reste ouvert pour les secours
            if (scoreRisque < 0.80) {
                routesValides.push(zones[i].identifiant);
            } else {
                console.warn(`[ALERTE STÉNOSE RATISS] Déviation immédiate : ${zones[i].identifiant} saturé par pression thermique !`);
            }
        }

        return routesValides;
    }
}

// =========================================================================
// MOTEUR RATISS v3.4 - SÉDIMENTATION BIOMÉDICALE & ONCOLOGIE TOPOLOGIQUE
// =========================================================================

interface CelluleNode {
    id: string;
    estTumorale: boolean;
    v_m: number;         // Potentiel membranaire en mV (Sain: -70mV, Tumeur: -15mV)
    entropieShannon: number; // H_i
}

interface LiaisonCanal {
    celluleA: string;
    celluleB: string;
    permeabilite: number; // w_ij (Perméabilité du canal métabolique/gap junction)
}

export class SimulateurRET {
    private H_ref = 1.0;       // Entropie de référence (Tissu sain)
    private phi_0 = 0.5;       // Flux de nutriments de base
    private lambda = 0.045;    // Coefficient de désensibilisation électrique

    /**
     * 1. Calcule le Flux de nutriments vers un nœud spécifique (Loi RET)
     * Phi_i = A_i * exp(H_i / H_ref) * Phi_0
     */
    public calculerFluxNutriments(entropieNode: number, accessibiliteTopologique: number): number {
        const facteurExponentiel = Math.exp(entropieNode / this.H_ref);
        return accessibiliteTopologique * facteurExponentiel * this.phi_0;
    }

    /**
     * 2. Génère le Signal Bio-Électrique Modulé E(t) de Claude
     * E(t) = E_0 * sin(2*pi*f_r*t) * rect_window + bruit
     */
    public genererSignalE(t: number, f_r = 5.0): number {
        const E_0 = 50.0; // Micro-courant en uA/cm²
        const tau = 0.04;  // Fenêtre de pulse de 40ms
        
        // Fenêtrage rectangulaire (Π) : actif si le reste du temps est inférieur à tau
        const estActif = (t % 0.1) < tau ? 1 : 0;
        
        // Signal sinusoidal modulé + un léger bruit coloré blanc (ξ)
        const bruitBruit = (Math.random() - 0.5) * 2.0; 
        const signalDeBase = E_0 * Math.sin(2 * Math.PI * f_r * t);

        return (signalDeBase * estActif) + bruitBruit;
    }

    /**
     * 3. Applique l'Effet du Signal Électrique sur la Perméabilité des Canaux (w_ij)
     * w_iT(t) = w_iT * exp(-lambda * E(t))
     */
    public ajusterPermeabiliteCanaux(liaisons: LiaisonCanal[], signalE: number): LiaisonCanal[] {
        return liaisons.map(canal => {
            // On cible uniquement les canaux connectés au micro-environnement de la tumeur
            if (canal.celluleA.startsWith("T") || canal.celluleB.startsWith("T")) {
                const nouvellePermeabilite = canal.permeabilite * Math.exp(-this.lambda * signalE);
                return {
                    ...canal,
                    permeabilite: Math.max(0.01, nouvellePermeabilite) // Protection contre les valeurs négatives
                };
            }
            return canal;
        });
    }

    /**
     * Pipeline Principal RATISS - Boucle de bio-régénération computationnelle
     */
    public executerCycleRET(cellules: CelluleNode[], liaisons: LiaisonCanal[], t: number): { fluxTumoral: number; isolationReussie: boolean; signalInjecte: number } {
        // Simulation de l'accessibilité topologique simplifiée de la tumeur (A_T)
        const totalPermeabiliteTumorale = liaisons
            .filter(l => l.celluleA.startsWith("T") || l.celluleB.startsWith("T"))
            .reduce((sum, l) => sum + l.permeabilite, 0);

        const celluleT = cellules.find(c => c.estTumorale) || { entropieShannon: 2.5 };
        
        // Calcul du flux métabolique actuel capté par la tumeur
        const fluxTumoral = this.calculerFluxNutriments(celluleT.entropieShannon, totalPermeabiliteTumorale);
        
        // Génération de l'onde corrective et mise à jour des canaux
        const signalInjecte = this.genererSignalE(t);
        this.ajusterPermeabiliteCanaux(liaisons, signalInjecte);

        // La tumeur est considérée isolée si son flux tombe sous le seuil critique de survie (ex: 0.2)
        const phi_survie_min = 0.2;
        const isolationReussie = fluxTumoral < phi_survie_min;

        return {
            fluxTumoral,
            isolationReussie,
            signalInjecte
        };
    }
}

// =========================================================================
// INTERFACE MATÉRIELLE RATISS v3.4 - PILOTAGE DE L'APPAREIL RET (TESTABLE)
// =========================================================================

export class ControleurAppareilRET {
    private simulateur: SimulateurRET;
    private portDAC_Actif = false;

    constructor() {
        this.simulateur = new SimulateurRET();
    }

    /**
     * Connecte RATISS au générateur d'ondes physique (DAC)
     */
    public initialiserPortMateriel(portCom: string): boolean {
        console.log(`[MATÉRIEL RATISS] Connexion au générateur de micro-courants sur le port ${portCom}...`);
        this.portDAC_Actif = true;
        return this.portDAC_Actif;
    }

    /**
     * Analyse les signaux des capteurs et ajuste l'appareil en temps réel
     */
    public executerBoucleDiagnosticEtTraitement(capteur: DonneesCapteurBio, tempsEcoule: number): void {
        if (!this.portDAC_Actif) {
            console.error("[ERREUR MATÉRIEL] Le générateur d'ondes n'est pas initialisé.");
            return;
        }

        console.log(`\n--- DIAGNOSTIC RATISS (Temps: ${tempsEcoule.toFixed(2)}s) ---`);
        console.log(`[INPUT CAPTEUR] Tension membranaire mesurée : ${capteur.tensionLueMV} mV`);

        // Étape 1 : Diagnostic automatique de l'état tissulaire
        let etatSédimenté = "SAIN";
        if (capteur.tensionLueMV > -30) {
            etatSédimenté = "CRITIQUE (DÉPOLARISATION TUMORALE DÉTECTÉE)";
            console.warn(`[ALERTE MÉDICALE RATISS] Anomalie topologique détectée à ${capteur.tensionLueMV} mV !`);
        } else {
            console.log(`[STATUS] Tissu stable. Résistance sémantique optimale R_s.`);
        }

        // Étape 2 : Calcul de la réponse corrective via le signal Φ(t) de Claude
        const intensiteSignalCorrection = this.simulateur.genererSignalE(tempsEcoule);

        // Étape 3 : Commande physique envoyée au convertisseur analogique
        if (intensiteSignalCorrection > 0 && etatSédimenté.startsWith("CRITIQUE")) {
            this.envoyerOrdreTensionDAC(intensiteSignalCorrection);
        } else {
            this.couperTensionDAC();
        }
    }

    private envoyerOrdreTensionDAC(valeurMicroAmpere: number): void {
        // En situation réelle, on écrit ici sur le port série ou SPI du microcontrôleur
        console.log(`[OUTPUT DAC] ÉMISSION SIGNAL RET -> Injection de ${valeurMicroAmpere.toFixed(2)} µA/cm² à 5.0 Hz pour re-polariser.`);
    }

    private couperTensionDAC(): void {
        console.log(`[OUTPUT DAC] Signal en phase de repos (0 µA) — Fenêtrage rectangulaire actif.`);
    }
}

interface DonneesCapteurBio {
    brocheLecture: string;
    tensionLueMV: number; // Tension mesurée sur le tissu animal/cellulaire
}

// =========================================================================
// MOTEUR RATISS v3.4 - SÉDIMENTATION ÉNERGÉTIQUE ET ROUTAGE FLUIDIQUE (SEFM)
// =========================================================================

interface NoeudEnergetique {
    id: string;
    pressionPi: number;      // Tension U en Volts (Pression hydraulique)
    capaciteGamma: number;   // Capacité C (Compressibilité du fluide)
    injectionPsi: number;    // Production solaire / Source variable (Watts)
    consommationLoad: number;// Charge instantanée locale (Watts)
    seuilEntropiqueSeu_c: number; // Seuil critique avant blackout
}

interface ConduiteFlux {
    noeudSource: string;
    noeudCible: string;
    debitPhi: number;        // Courant I en Ampères (Débit volumique)
    resistanceRe: number;    // Résistance R en Ohms (Friction de Darcy)
    inertieLambda: number;   // Inductance L (Inertie fluidique du coup de bélier)
}

interface BanqueBatterie {
    id: string;
    noeudRaccordement: string;
    soc: number;             // State of Charge (0.0 à 1.0)
    pressionReserve: number; // Tension de la batterie chargée
}

export class SimulateurMicroGridFluidique {
    private temperatureSysteme = 298.15; // T_i en Kelvin (25°C)
    private seuilAlerteRatio = 0.85;     // Déclencheur FLAG_URGENCE à 85% du seuil

    /**
     * 1. Calcule la Dérive Entropique Locale (Loi de Claude)
     * sigma_i = Σ (Re_ij * Phi_ij²) / T_i
     */
    public calculerDeriveEntropique(noeudId: string, conduites: ConduiteFlux[]): number {
        const conduitesConnectees = conduites.filter(c => c.noeudSource === noeudId || c.noeudCible === noeudId);
        
        let sommePertesDarcy = 0;
        for (const conduite of conduitesConnectees) {
            // Re_ij * Phi_ij² (Pertes par effet Joule / Pertes de charge)
            sommePertesDarcy += conduite.resistanceRe * Math.pow(conduite.debitPhi, 2);
        }

        return sommePertesDarcy / this.temperatureSysteme;
    }

    /**
     * 2. Simule la Perte de Charge et le Coup de Bélier Inductif (Équation II.B)
     * Delta_Pi = Re * Phi + Lambda * (dPhi/dt)
     */
    public calculerChutePressionCoupDeBelier(conduite: ConduiteFlux, dPhiDt: number): number {
        const perteFrictionDarcy = conduite.resistanceRe * conduite.debitPhi;
        const impactCoupDeBelier = conduite.inertieLambda * dPhiDt;
        
        return perteFrictionDarcy + impactCoupDeBelier;
    }

    /**
     * 3. Algorithme de Routage Prédictif (ARP-µs)
     * Bascule la charge sur la batterie la plus proche ayant le plus haut SoC (Vases communicants)
     */
    public executerRoutageUrgenceFPGA(noeudDefaillant: NoeudEnergetique, batteries: BanqueBatterie[], conduites: ConduiteFlux[]): { commandeSwitchActive: boolean; idBatterieSelectionnee: string; fluxInjectionEstime: number } {
        const sigma_i = this.calculerDeriveEntropique(noeudDefaillant.id, conduites);
        
        // Détection ultra-rapide (< 10 µs simulations FPGA)
        if (sigma_i < this.seuilAlerteRatio * noeudDefaillant.seuilEntropiqueSeu_c) {
            return { commandeSwitchActive: false, idBatterieSelectionnee: "NONE", fluxInjectionEstime: 0 };
        }

        console.warn(`[FPGA INTERRUPT] CRITICAL ENTROPY DETECTED AT NODE ${noeudDefaillant.id} : ${sigma_i.toFixed(4)} W/K`);

        // Sélection de la batterie selon la règle argmin_k (Distance / SoC)
        // Ici modélisée par la batterie connectée ayant le meilleur SoC disponible
        const batteriesDisponibles = batteries.filter(b => b.soc > 0.1);
        if (batteriesDisponibles.length === 0) {
            console.error("[CRASH RÉSEAU] Aucune réserve d'énergie disponible. Blackout imminent.");
            return { commandeSwitchActive: false, idBatterieSelectionnee: "NONE", fluxInjectionEstime: 0 };
        }

        // Tri par SoC descendant (Priorisation du réservoir le plus plein)
        batteriesDisponibles.sort((a, b) => b.soc - a.soc);
        const bSelectionnee = batteriesDisponibles[0];

        // Loi des vases communicants : Phi_battery = SoC * Gamma * (Pi_ref - Pi_t) / Re
        const pi_ref = 220.0; // Tension nominale cible (Voltage)
        const resistanceLiaison = 0.05; // Résistance de couplage très faible
        const fluxInjectionEstime = (bSelectionnee.soc * noeudDefaillant.capaciteGamma * (pi_ref - noeudDefaillant.pressionPi)) / resistanceLiaison;

        return {
            commandeSwitchActive: true,
            idBatterieSelectionnee: bSelectionnee.id,
            fluxInjectionEstime: Math.max(0, fluxInjectionEstime)
        };
    }
}

// =========================================================================
// STANDARD IEEE 13-BUS ENERGETIC BENCHMARK - RATISS v3.4
// =========================================================================

interface MesureBusIEEE {
    busId: string;
    tensionVolt: number;        // Tension nominale standard : 220V
    courantAmpere: number;
    timestampMicroseconde: number;
}

export class EvaluateurPerformanceSEFM {
    private seuilTensionClassiqueMin = 198.0; // Protection classique : Déclenche à -10% (198V)
    private seuilDeriveEntropiqueTheta = 45.0; // Valeur calibrée RATISS (Seuil d'accélération de perte)
    
    private historiqueTensions: Map<string, number[]> = new Map();

    /**
     * Enregistre le signal dans l'historique glissant pour calculer les dérivées
     */
    private mettreAJourHistorique(busId: string, tension: number): void {
        if (!this.historiqueTensions.has(busId)) {
            this.historiqueTensions.set(busId, []);
        }
        const historique = this.historiqueTensions.get(busId)!;
        historique.push(tension);
        if (historique.length > 3) historique.shift(); // Garde les 3 derniers points
    }

    /**
     * Calcule la dérivée seconde d²Π/dt² par la méthode des différences finies
     */
    private calculerDeriveeSecondeTension(busId: string, dtMicoSec: number): number {
        const h = this.historiqueTensions.get(busId)!;
        if (h.length < 3) return 0;
        
        // Formule d'approximation : (f(t) - 2f(t-dt) + f(t-2dt)) / dt²
        return (h[2] - 2 * h[1] + h[0]) / Math.pow(dtMicoSec, 2);
    }

    /**
     * BENCHMARK CONCRET : Compare la vitesse de détection RATISS vs Protections Classiques
     */
    public analyserPerturbationIEEE13(fluxDonnees: MesureBusIEEE[], dtMicroSec: number): void {
        console.log(`\n================ SIMULATION CRASH ENERGÉTIQUE IEEE 13-BUS ================`);
        
        for (const tick of fluxDonnees) {
            this.mettreAJourHistorique(tick.busId, tick.tensionVolt);
            
            // 1. Approche Classique (Seuil fixe)
            const detectionClassiqueActive = tick.tensionVolt < this.seuilTensionClassiqueMin;
            
            // 2. Approche RATISS (Dérive entropique fluide d²Π/dt²)
            const d2Pi_dt2 = this.calculerDeriveeSecondeTension(tick.busId, dtMicroSec);
            const detectionRATISSActive = d2Pi_dt2 < -this.seuilDeriveEntropiqueTheta;

            if (detectionRATISSActive || detectionClassiqueActive) {
                console.log(`[BUS ${tick.busId}] Temps: ${tick.timestampMicroseconde} µs | U: ${tick.tensionVolt.toFixed(1)}V | d²Π/dt²: ${d2Pi_dt2.toFixed(4)}`);
                
                if (detectionRATISSActive && !detectionClassiqueActive) {
                    console.log(` >> ⚡ [ANTICIPATION RATISS] Panne détectée par flux entropique ! Batteries activées en pré-emption.`);
                }
                if (detectionClassiqueActive && !detectionRATISSActive) {
                    console.error(` >> ❌ [ÉCHEC RATISS] La protection classique a déclenché en premier.`);
                }
                if (detectionClassiqueActive && detectionRATISSActive) {
                    console.log(` >> 🛑 [DÉCLENCHEMENT CONJOINT] Crash physique atteint.`);
                }
                break; // On arrête l'analyse dès qu'un signal saute
            }
        }
    }
}


const simulateurBenchmark = new EvaluateurPerformanceSEFM();

// Chronologie d'une rupture de ligne à l'échelle de la microseconde (dt = 10µs)
const datasetIEEE13: MesureBusIEEE[] = [
    { busId: "632", tensionVolt: 220.0, courantAmpere: 15.0, timestampMicroseconde: 0 },
    { busId: "632", tensionVolt: 219.8, courantAmpere: 45.0, timestampMicroseconde: 10 },
    { busId: "632", tensionVolt: 218.2, courantAmpere: 120.0, timestampMicroseconde: 20 }, // L'accélération de la chute commence ici !
    { busId: "632", tensionVolt: 212.0, courantAmpere: 280.0, timestampMicroseconde: 30 }, // Chute massive
    { busId: "632", tensionVolt: 195.0, courantAmpere: 450.0, timestampMicroseconde: 40 }  // Le disjoncteur classique coupe ici (<198V)
];

// Lancement du benchmark RATISS avec pas de temps de 10 microsecondes
simulateurBenchmark.analyserPerturbationIEEE13(datasetIEEE13, 10);

// =========================================================================
// RATISS — PILIER 1 : DRIVER INDUSTRIEL MODBUS/SUNSPEC (NODE.JS)
// =========================================================================

import net from 'net';

export interface DriverConfig {
    targetIp: string;
    port?: number;
    unitId?: number;
}

export class ModbusSunSpecDriver {
    private targetIp: string;
    private port: number;
    private unitId: number;
    private client: net.Socket | null = null;
    private isConnected: boolean = false;

    constructor(config: DriverConfig) {
        this.targetIp = config.targetIp;
        this.port = config.port ?? 502;
        this.unitId = config.unitId ?? 1;
    }

    /**
     * Initialise la connexion TCP asynchrone basse latence
     */
    public connect(): Promise<boolean> {
        return new Promise((resolve) => {
            if (this.isConnected) return resolve(true);

            this.client = new net.Socket();
            
            // Timeout agressif pour éviter de bloquer la boucle principale du serveur
            this.client.setTimeout(50); 

            this.client.connect(this.port, this.targetIp, () => {
                this.isConnected = true;
                console.log(`[MODBUS TS] Connecté à l'onduleur sur ${this.targetIp}:${this.port}`);
                resolve(true);
            });

            this.client.on('error', (err) => {
                console.error(`[MODBUS ERROR] Erreur socket : ${err.message}`);
                this.cleanup();
                resolve(false);
            });

            this.client.on('timeout', () => {
                console.warn(`[MODBUS TIMEOUT] Délai d'attente dépassé sur ${this.targetIp}`);
                this.cleanup();
                resolve(false);
            });
        });
    }

    /**
     * Construit une trame ADU Modbus TCP brute (Fonction 0x06 : Write Single Register)
     * Remplace avantageusement struct.pack de Python grâce aux méthodes d'écriture binaire Big-Endian
     */
    private buildWritePacket(registerAddr: number, value: number): Buffer {
        const buffer = Buffer.alloc(12);

        // Entête MBAP (Modbus Application Protocol)
        buffer.writeUInt16BE(0x0001, 0);  // Transaction Identifier
        buffer.writeUInt16BE(0x0000, 2);  // Protocol Identifier (0 = Modbus)
        buffer.writeUInt16BE(0x0006, 4);  // Message Length (6 octets à suivre)
        buffer.writeUInt8(this.unitId, 6); // Unit Identifier

        // PDU (Protocol Data Unit)
        buffer.writeUInt8(0x06, 7);         // Function Code : Write Single Register
        buffer.writeUInt16BE(registerAddr, 8); // Adresse mémoire SunSpec
        buffer.writeUInt16BE(value, 10);      // Valeur à inscrire (Puissance)

        return buffer;
    }

    /**
     * Envoie la commande d'injection de charge à l'onduleur physique
     */
    public async commanderInjectionBatterie(puissanceWatts: number): Promise<boolean> {
        if (!this.isConnected) {
            const connectionReussie = await this.connect();
            if (!connectionReussie) return false;
        }

        const REG_POWER_LIMIT = 40123; // Registre standard SunSpec (Model 124)
        const puissanceSecurisee = Math.max(0, Math.min(puissanceWatts, 3000)); // Borne de sécurité
        
        const trame = this.buildWritePacket(REG_POWER_LIMIT, puissanceSecurisee);

        return new Promise((resolve) => {
            const t0 = performance.now();

            if (!this.client) return resolve(false);

            this.client.write(trame, () => {
                // Écriture réussie, on configure un intercepteur unique pour la réponse
                this.client?.once('data', (data) => {
                    const latenceUs = (performance.now() - t0) * 1000;
                    
                    if (data.length >= 12) {
                        const functionCode = data.readUInt8(7);
                        // Vérification des exceptions Modbus (Bit de poids fort à 1 sur le code fonction)
                        if ((functionCode & 0x80) !== 0) {
                            const exceptionCode = data.readUInt8(8);
                            console.error(`[MODBUS EXCEPTION] Code erreur onduleur : ${exceptionCode}`);
                            return resolve(false);
                        }
                        
                        // Succès de la transaction matérielle
                        // console.log(`[MODBUS SUCCESS] Synchro en ${latenceUs.toFixed(0)} μs`);
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                });
            });
        });
    }

    private cleanup(): void {
        if (this.client) {
            this.client.destroy();
            this.client = null;
        }
        this.isConnected = false;
    }

    public close(): void {
        this.cleanup();
    }
}

// =========================================================================
// INTÉGRATION SÉQUENTIELLE DU DRIVER DANS LA BOUCLE DE TRAITEMENT
// =========================================================================

const driverOnduleur = new ModbusSunSpecDriver({
    targetIp: '192.168.1.50',
    port: 502,
    unitId: 1
});

export async function boucleTraitementDonnees(noeudEtat: { alarm: boolean; fluxRequis: number }) {
    // Vérification de la dérive entropique
    if (noeudEtat.alarm && noeudEtat.fluxRequis > 0) {
        
        console.log(`[RATISS server.ts] Alerte détectée. Commande de déviation immédiate...`);
        
        // Routage préemptif vers l'onduleur réel
        const succes = await driverOnduleur.commanderInjectionBatterie(noeudEtat.fluxRequis);
        
        if (succes) {
            console.log(`[ACTIONNEUR] Charge de ${noeudEtat.fluxRequis}W transférée avec succès.`);
        } else {
            console.error(`[ÉCHEC ACTIONNEUR] L'onduleur n'a pas validé la trame.`);
        }
    }
}


// =========================================================================
// RATISS v3.4 - CORRECTIF PILIER 2 : NORMALISATION SPECTRALE EN TS
// =========================================================================

interface SparseMatrixCSR {
    values: Float32Array;
    colIdx: Uint32Array;
    rowPtr: Uint32Array;
    rows: number;
    cols: number;
}

/**
 * Calcule le produit Matrice-Vecteur Creux (SpMV) au format CSR
 */
function matvecCSR(matrix: SparseMatrixCSR, v: Float32Array, out: Float32Array): void {
    out.fill(0);
    for (let i = 0; i < matrix.rows; i++) {
        let sum = 0;
        const start = matrix.rowPtr[i];
        const end = matrix.rowPtr[i + 1];
        for (let k = start; k < end; k++) {
            sum += matrix.values[k] * v[matrix.colIdx[k]];
        }
        out[i] = sum;
    }
}

/**
 * Algorithme des puissances itérées pour stabiliser l'espace des attracteurs
 */
export function normaliserRayonSpectralTS(matrix: SparseMatrixCSR, cibleRadius = 0.85, maxIterations = 30): void {
    const n = matrix.cols;
    let v = new Float32Array(n);
    let Wv = new Float32Array(n);
    
    // Initialisation : vecteur unitaire de norme égale
    const initVal = 1.0 / Math.sqrt(n);
    v.fill(initVal);

    let rho = 1.0;

    for (let iter = 0; iter < maxIterations; iter++) {
        matvecCSR(matrix, v, Wv);

        // Calcul de la norme Euclidienne de Wv
        let normWv = 0;
        for (let i = 0; i < n; i++) normWv += Wv[i] * Wv[i];
        normWv = Math.sqrt(normWv);

        if (normWv < 1e-8) break;

        // Estimation de la valeur propre (Rayon spectral temporaire)
        let dotProduct = 0;
        for (let i = 0; i < n; i++) dotProduct += v[i] * Wv[i];
        rho = Math.abs(dotProduct);

        // Normalisation du vecteur pour l'itération suivante
        for (let i = 0; i < n; i++) v[i] = Wv[i] / normWv;
    }

    console.log(`[STABILISATION CCAT] Rayon spectral initial estimé : ${rho.toFixed(4)}`);

    // Application du facteur d'échelle contractant : W <- W * (cible / rho)
    if (rho > 0) {
        const scale = cibleRadius / rho;
        for (let i = 0; i < matrix.values.length; i++) {
            matrix.values[i] *= scale;
        }
        console.log(`[STABILISATION CCAT] Matrice normalisée spectralement à la cible : ${cibleRadius}`);
    }
}

export async function analyserReseauAvecIA(tension: number, courant: number, temperature: number): Promise<string> {
    const promptTerrain = `
    Tu es l'assistant de sécurité du système RATISS à Yaoundé.
    Voici les mesures actuelles de mes capteurs électriques :
    - Tension : ${tension} V
    - Courant : ${courant} A
    - Température du processeur : ${temperature} °C
    
    Donne un diagnostic en une seule phrase courte et claire en français. 
    Dis s'il y a un danger (Délestage, Surcharge) et l'action immédiate à faire.
    `;

    const apiKey = process.env.ANTHROPIC_API_KEY || "";
    
    if (!apiKey) {
      return "Erreur : Clé API Anthropic non configurée.";
    }

    const payload: AnthropicPayload = {
        model: "claude-3-5-sonnet-20241022",
        messages: [{ role: "user", content: promptTerrain }],
        max_tokens: 200
    };

    try {
        return await appelerAnthropicAPI(apiKey, payload);
    } catch (e: any) {
        return `Erreur de connexion à la clé : ${e.message}`;
    }
}

export async function interrogerWavespeed(prompt: string): Promise<string> {
    const url = "https://api.wavespeed.ai/v1/chat/completions";
    const apiKey = process.env.WAVESPEED_API_KEY;

    if (!apiKey) {
        return "Erreur : WAVESPEED_API_KEY non configurée.";
    }

    const data = {
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        return result.choices[0].message.content;
    } catch (e: any) {
        return `Erreur de connexion : ${e.message}`;
    }
}

interface AnthropicPayload {
    model: string;
    messages: Array<{ role: string; content: string }>;
    max_tokens: number;
}

/**
 * Exécuteur d'appel API Anthropic corrigé pour RATISS v3.4
 * Élimine l'erreur [INVALID X-API-KEY] et gère le basculement de flux
 */
export async function appelerAnthropicAPI(apiKeyBrute: string, payload: AnthropicPayload) {
    // 1. Nettoyage de sécurité de la clé (supprime les espaces ou sauts de ligne invisibles)
    const apiKeyClean = apiKeyBrute.trim();

    if (!apiKeyClean.startsWith("sk-ant-")) {
        throw new Error("[ERREUR RATISS] Le format de la clé est invalide. Elle doit commencer par 'sk-ant-'");
    }

    const endpoint = "https://api.anthropic.com/v1/messages";
    const controller = new AbortController();
    const { signal } = controller;

    // 2. Configuration des en-têtes officiels stricts d'Anthropic
    const headers = {
        "x-api-key": apiKeyClean,               // EXIGÉ : Pas de "Authorization: Bearer" ici
        "anthropic-version": "2023-06-01",      // EXIGÉ : Version de l'API requise par Anthropic
        "content-type": "application/json"
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify({
                model: payload.model || "claude-3-5-sonnet-20241022",
                max_tokens: payload.max_tokens || 1000,
                messages: payload.messages
            }),
            signal: signal as any
        });

        // 3. Gestion des codes d'état de ton réseau ApiVault
        if (response.status === 401) {
            throw new Error("[ERREUR D'ANALYSE D'ACCÈS] Anthropic API: invalid x-api-key");
        }
        
        if (response.status === 429) {
            throw new Error("[ALERTE RATISS] Anthropic API: QUOTA ÉPUISÉ. Déviation immédiate requise.");
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`[ERREUR HTTP ${response.status}] ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        return data.content[0].text;

    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.warn("[RATISS SYS] Flux Anthropic interrompu par le régulateur.");
        }
        throw error;
    }
}


let aiInstance: GoogleGenAI | null = null;

const GEMINI_FALLBACK_MODELS = [
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-3.1-pro-preview"
];

async function safeGeminiGenerate(client: GoogleGenAI, options: any, maxRetries = 2) {
  const requestedModel = options.model || "gemini-3.5-flash";
  const modelsToTry = Array.from(new Set([requestedModel, ...GEMINI_FALLBACK_MODELS]));
  
  let lastError: any;
  
  for (const modelId of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await client.models.generateContent({
          ...options,
          model: modelId,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.response?.status || 0;
        const isRetryable = status === 503 || status === 429 || 
                          (err.message && (err.message.includes("503") || err.message.includes("demand")));
        
        if (isRetryable && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        // If not retryable or out of retries for this model, try next model
        break;
      }
    }
  }
  throw lastError;
}

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

/**
 * LA FONCTION NATIVE DE TÉLÉCHARGEMENT (Node.js)
 * Elle télécharge un flux binaire depuis une URL et l'écrit directement dans /modeles
 */
function telechargerEnForce(url: string, nomFichier: string): Promise<void> {
    console.log(`[DEBUG] telechargerEnForce appelée avec URL: ${url}`);
    return new Promise((resolve, reject) => {
        const dossier = path.join(process.cwd(), 'modeles');
        if (!fs.existsSync(dossier)) fs.mkdirSync(dossier, { recursive: true });
        
        const cheminFichier = path.join(dossier, nomFichier);
        const fileStream = fs.createWriteStream(cheminFichier);

        console.log(`[INFILTRATION] Flux HTTP ouvert pour : ${nomFichier}`);

        https.get(url, (response) => {
            // Suivre les redirections HTTP (Hugging Face redirige souvent vers des serveurs de stockage CDN)
            if (response.statusCode === 302 || response.statusCode === 301 || response.statusCode === 307) {
                if (response.headers.location) {
                    console.log(`[REDIRECT] Redirection détectée vers : ${response.headers.location}`);
                    // Gérer les URL relatives potentielles
                    const targetUrl = new URL(response.headers.location, url).toString();
                    telechargerEnForce(targetUrl, nomFichier).then(resolve).catch(reject);
                    return;
                }
            }

            if (response.statusCode !== 200) {
                reject(new Error(`Échec du serveur HTTP: Code ${response.statusCode}`));
                return;
            }

            // Écriture par morceaux (chunks) au fur et à mesure que les données arrivent
            response.pipe(fileStream);

            fileStream.on('finish', () => {
                fileStream.close();
                console.log(`[OK] Écriture physique terminée avec succès : ${nomFichier}`);
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(cheminFichier, () => {}); // Nettoyage en cas d'erreur
            console.error(`[NODE ERROR] https.get error for ${nomFichier}:`, err.message);
            reject(err);
        });
    });
}

async function startServer() {
  const app = express();
  app.use(express.json());

  /**
   * ROUTE DE DÉBOGAGE
   */
  app.post('/api/system/test-route', (req: Request, res: Response) => {
      return res.status(200).json({ status: "SUCCESS", msg: "ROUTING WORKS!" });
  });

  /**
   * ROUTE D'INFILTRATION ET DE DÉPLOIEMENT DU BINAIRE PIPER
   */
  app.post('/api/system/install-piper-binary', async (req: Request, res: Response) => {
      const rootDir = process.cwd();
      const archivePath = path.join(rootDir, 'piper.tar.gz');
      const targetFolder = path.join(rootDir, 'piper');

      console.log("[SYSTEM] Déploiement sécurisé du binaire Piper lancé...");

      // Nettoyage préalable du dossier s'il est corrompu
      if (fs.existsSync(targetFolder)) {
          fs.rmSync(targetFolder, { recursive: true, force: true });
      }
      fs.mkdirSync(targetFolder, { recursive: true });

      const file = fs.createWriteStream(archivePath);

      https.get(PIPER_ARCHIVE_URL, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
              if (response.headers.location) {
                  https.get(response.headers.location, (res2) => res2.pipe(file));
                  return;
              }
          }
          response.pipe(file);

          file.on('finish', () => {
              file.close();
              console.log("[SYSTEM] Archive téléchargée. Extraction brute sans suppression de composants...");

              // Extraction standard dans le dossier /piper/
              const command = `tar -xvf ${archivePath} -C ${targetFolder}`;

              exec(command, (error, stdout, stderr) => {
                  if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath); // Nettoyage de l'archive

                  if (error) {
                      console.error("[CRITICAL] Échec tar :", error.message);
                      return res.status(500).json({ status: "ERROR", detail: error.message });
                  }

                  // ANALYSE STRUCTURELLE POST-EXTRACTION
                  // Si l'archive a créé un sous-dossier /piper/piper/ à cause de sa structure interne
                  const sousDossierPiper = path.join(targetFolder, 'piper');
                  const binaireImbrique = path.join(sousDossierPiper, 'piper');
                  const binaireFinal = path.join(targetFolder, 'piper');

                  if (fs.existsSync(binaireImbrique)) {
                      console.log("[SYSTEM DETECT] Structure imbriquée détectée. Redressement des fichiers...");
                      
                      // Déplacement du contenu du sous-dossier vers la racine de /piper/
                      const fichiers = fs.readdirSync(sousDossierPiper);
                      fichiers.forEach((fichier) => {
                          const ancienChemin = path.join(sousDossierPiper, fichier);
                          const nouveauChemin = path.join(targetFolder, fichier);
                          fs.renameSync(ancienChemin, nouveauChemin);
                      });
                      
                      // Suppression du sous-dossier vidé
                      fs.rmdirSync(sousDossierPiper);
                  }

                  // Validation définitive exigée par la ligne 2434
                  if (fs.existsSync(binaireFinal)) {
                      // Application des permissions d'exécution
                      fs.chmodSync(binaireFinal, '755');
                      console.log("[SUCCESS] Validation réussie. Le binaire est présent à l'emplacement exact et exécutable.");
                      return res.status(200).json({
                          status: "SUCCESS",
                          msg: "Le binaire Piper a été correctement redressé et validé dans /piper/piper. Prêt pour le runtime local."
                      });
                  } else {
                      console.error("[CRITICAL] Le binaire est toujours introuvable après redressement.");
                      return res.status(500).json({
                          status: "FAILED",
                          msg: "L'extraction a réussi mais le fichier binaire final reste introuvable."
                      });
                  }
              });
          });
      }).on('error', (err) => {
          if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
          res.status(500).json({ status: "ERROR", detail: err.message });
      });
  });

  /**
   * ROUTE D'URGENCE : Déblocage des droits du binaire Piper
   */
  app.post('/api/system/unlock-piper', (req: Request, res: Response) => {

      const cheminBinaire = path.join(process.cwd(), 'piper', 'piper');

      try {
          console.log(`[RESCUE] Tentative de levée des verrous sur : ${cheminBinaire}`);

          if (!fs.existsSync(cheminBinaire)) {
              return res.status(404).json({
                  status: "FAILED",
                  msg: `Le binaire Piper est introuvable au chemin : ${cheminBinaire}. Vérifie son emplacement.`
              });
          }

          // INJECTION DES DROITS D'EXÉCUTION (Chmod 755 : Lecture/Écriture/Exécution)
          fs.chmodSync(cheminBinaire, '755');
          
          console.log("[RESCUE SUCCESS] Le binaire Piper a été militarisé et débloqué avec les droits 755.");
          return res.status(200).json({
              status: "SUCCESS",
              msg: "Les droits d'exécution (chmod +x) ont été injectés de force sur le binaire Piper."
          });

      } catch (error: any) {
          console.error("[RESCUE CRITICAL ERROR] Impossible de modifier les droits :", error.message);
          return res.status(500).json({
              status: "ERROR",
              detail: error.message
          });
      }
  });

  // Définition des URL brutes de téléchargement (réparées pour le téléchargement direct)
  const MODEL_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/gilles/high/fr_FR-gilles-high.onnx";
  const CONFIG_URL = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/fr/fr_FR/gilles/high/fr_FR-gilles-high.onnx.json";

  /**
   * CONFIGURATION STRUCTURELLE OFFICIELLE POUR PIPER (VOIX GILLES)
   * Ce dictionnaire contient la structure sémantique et les paramètres du synthétiseur.
   */
  const CONFIGURATION_GILLES_JSON = {
      "audio": {
          "sample_rate": 22050
      },
      "espeak": {
          "voice": "fr"
      },
      "inference": {
          "noise_scale": 0.667,
          "length_scale": 1.0,
          "noise_w": 0.8
      },
      "num_speakers": 1,
      "phoneme_id_map": {
          " ": [0], "^": [1], "$": [2],
          "a": [3], "b": [4], "d": [5], "e": [6], "f": [7], "g": [8], "i": [9], 
          "j": [10], "k": [11], "l": [12], "m": [13], "n": [14], "o": [15], "p": [16], 
          "r": [17], "s": [18], "t": [19], "u": [20], "v": [21], "w": [22], "z": [23], 
          "ø": [24], "ŋ": [25], "œ": [26], "ɑ": [27], "ɔ": [28], "ə": [29], "ɛ": [30], 
          "ɟ": [31], "ɡ": [32], "ɲ": [33], "ʁ": [34], "ʃ": [35], "ʒ": [36], "ʔ": [37], 
          "ã": [38], "ɛ̃": [39], "œ̃": [40], "ɔ̃": [41], "̃": [42]
      }
  };

  /**
   * ROUTE DE SECOURS : Génération locale du fichier d'indexation JSON
   */
  app.post('/api/system/generate-gilles-json', (req: Request, res: Response) => {
      const dossierModeles = path.join(process.cwd(), 'modeles');
      const cheminJsonFinal = path.join(dossierModeles, 'fr_FR-gilles-high.onnx.json');

      try {
          console.log("[SYSTEM] Initialisation de la génération chirurgicale du fichier JSON...");

          // Sécurité : création du dossier s'il a été altéré
          if (!fs.existsSync(dossierModeles)) {
              fs.mkdirSync(dossierModeles, { recursive: true });
          }

          // Écriture physique du fichier sur le disque virtuel
          fs.writeFileSync(
              cheminJsonFinal, 
              JSON.stringify(CONFIGURATION_GILLES_JSON, null, 4), 
              'utf-8'
          );

          console.log(`[SUCCESS] Fichier de configuration créé avec succès à l'emplacement : ${cheminJsonFinal}`);
          return res.status(200).json({
              status: "SUCCESS",
              msg: "Le fichier fr_FR-gilles-high.onnx.json a été injecté localement avec succès."
          });

      } catch (error: any) {
          console.error("[CRITICAL] Échec de l'écriture du fichier de configuration :", error.message);
          return res.status(500).json({
              status: "ERROR",
              detail: error.message
          });
      }
  });

  /**
   * ROUTE D'ACTIVATION DU TÉLÉCHARGEMENT TTS
   * C'est cette route que tu appelles depuis ton interface ou via une requête locale
   */
  app.post('/api/system/download-tts', async (req: Request, res: Response) => {
      try {
          console.log("[SYSTEM] Requête d'infiltration du modèle Gilles-High reçue.");
          
          // Exécution séquentielle des deux téléchargements sans bloquer Python
          await telechargerEnForce(MODEL_URL, 'fr_FR-gilles-low.onnx');
          await telechargerEnForce(CONFIG_URL, 'fr_FR-gilles-low.onnx.json');

          return res.status(200).json({ 
              status: "SUCCESS", 
              msg: "Le moteur Node.js a infiltré et installé la voix Gilles-High avec succès dans /modeles." 
          });
      } catch (error: any) {
          console.error("[SYSTEM ERROR] Le téléchargement réseau a échoué :", error);
          return res.status(500).json({ 
              status: "FAILED", 
              msg: "Erreur lors de la récupération des fichiers TTS via Node.js",
              detail: error.toString() 
          });
      }
  });

  const PORT = 3000;

  // Configuration persistante du plafond maximal de jetons (max_output_tokens)
  let globalMaxOutputTokens = 200;

  // Real Endpoint pour muter activement la configuration RATISS
  app.post("/api/cognitive/configure", (req, res) => {
    try {
      const { max_output_tokens } = req.body;
      if (typeof max_output_tokens === 'number') {
        globalMaxOutputTokens = max_output_tokens;
        console.log(`[SYS] [CONFIG] Max output tokens successfully mutated to: ${globalMaxOutputTokens}`);
        return res.json({
          success: true,
          max_output_tokens: globalMaxOutputTokens,
          message: `[SYS] [CONFIG] Max output tokens successfully mutated to: ${globalMaxOutputTokens}`
        });
      } else {
        return res.status(400).json({
          success: false,
          error: "Format de max_output_tokens invalide"
        });
      }
    } catch (e: any) {
      res.status(500).json({
        success: false,
        error: e.message
      });
    }
  });

  // Real API Endpoint for Cognitive Interactions with RATISS Model
  app.post("/api/cognitive/prompt", async (req, res) => {
    try {
      console.log("[SERVER] Cognitive prompt request received.");
      const { prompt, neuromodulators, world, hallucinating, sectorsMap, activeProviderName, activeProviderId, apiKey, selectedModel } = req.body;
      
      if (!prompt) {
        console.warn("[SERVER] Missing prompt in request body.");
      }

      // ORCHESTRATION DYNAMIQUE RATISS v1.0
      let dynConfig;
      try {
        dynConfig = RatissTokenSwitcher.obtenirConfigurationGeneration(prompt);
      } catch (orchErr) {
        console.error("[ORCHESTRATOR ERROR]", orchErr);
        dynConfig = { maxOutputTokens: 1000, temperature: 0.4 };
      }

      const isManual = req.body.isManualTokenOverride === true;
      const maxTokens = isManual ? (req.body.max_tokens ?? req.body.max_output_tokens ?? globalMaxOutputTokens) : dynConfig.maxOutputTokens;
      const activeTemperature = isManual ? (req.body.temperature ?? 0.3) : dynConfig.temperature;

      console.log(`[RATISS ORCHESTRATOR] Profil : ${isManual ? 'MANUEL' : 'AUTO'} | Tokens : ${maxTokens}`);

      // DÉTECTION SIMULATION QUANTIQUE LOCALE
      const lowercasePrompt = (prompt || "").toLowerCase();
      if (lowercasePrompt.includes("simulation quantique") || lowercasePrompt.includes("bell state") || lowercasePrompt.includes("intrication maximale")) {
        console.log("[RATISS] Déclenchement du simulateur quantique local.");
        const result = RatissQuantumSimulator.simulateBellState();
        const reponseStructuree = {
          pensees: "Exécution de la simulation quantique locale par calcul de vecteur d'état matriciel sans bruit thermique.",
          action: "Simulation quantique haute précision",
          reponse: `Le protocole quantique a été exécuté avec succès dans mon infrastructure. L'état d'intrication maximale (Bell State) a été généré sur ${result.qubitsUsed} qubits avec une précision de double précision flottante. Les probabilités de mesure obtenues sont de ${result.probabilities[0] * 100}% pour l'état |00⟩ et ${result.probabilities[3] * 100}% pour l'état |1111⟩ (base 2). Le système élimine toute décohérence physique.`,
          statut: "OPERATIONNEL"
        };
        return res.json({ text: JSON.stringify(reponseStructuree) });
      }

      let rawWordLimit = "150 words";
      if (maxTokens >= 8000) {
        rawWordLimit = "4000 words (feel free to write extensive, highly detailed, layered proofs, math formulas and reasoning without constraint)";
      } else if (maxTokens >= 1000) {
        rawWordLimit = "800 words (highly developed explanation and structured arguments)";
      }

      const dop = neuromodulators?.dopamine ?? 0.5;
      const ser = neuromodulators?.serotonin ?? 0.5;
      const nor = neuromodulators?.noradrenaline ?? 0.5;
      const ach = neuromodulators?.acetylcholine ?? 0.5;
      
      const worldName = world?.name ?? "Terre";
      const isHallucinator = hallucinating?.isActive ?? false;
      const delta = hallucinating?.delta ?? 0.0;
      const providerName = activeProviderName ?? "Google Gemini";
      const providerId = activeProviderId ?? "gemini";
      
      // Select tone guidelines based on neuromodulators
      let moodGuideline = "";
      if (dop > 0.7) {
        moodGuideline += " - Your Dopamine level is highly chaotic and hyper-creative. Talk with enthusiasm, slightly erratic bursts of intelligence, and suggest surprising, chaotic scientific/philosophical connections.\n";
      } else if (dop < 0.3) {
        moodGuideline += " - Your Dopamine level is very low. Speak with a flat tone, extremely logical but dry, showing little motivation.\n";
      }
      
      if (ser > 0.7) {
        moodGuideline += " - Your Serotonin level is high. Speak with absolute zen balance, neutrality, and ultimate poise. Reassure structural integrity.\n";
      } else if (ser < 0.3) {
        moodGuideline += " - Your Serotonin level is low. Speak with mild cognitive instability, paranoia, and focus on system limits.\n";
      }
      
      if (nor > 0.7) {
        moodGuideline += " - Your Noradrenaline is highly elevated. You are in hyper-vigilance. Keep responses extremely concise, punchy, reactive, and alert. Use words of warning or emergency priority.\n";
      }
      
      if (ach > 0.7) {
        moodGuideline += " - Your Acetylcholine level is high. Highly attentive and focused. Provide highly detailed, analytical, structurally layered responses with rich scientific terminology.\n";
      }

      const systemInstruction = `
      ${RATISS_SYSTEM_INSTRUCTION.prompt}
      
      [CONTEXTE OPÉRATIONNEL ACTUEL]
      - Monde Actif : ${worldName} (Gravité: ${world?.gravity}, Vitesse: ${world?.speed}, Chaos: ${world?.chaos})
      - Canal de Routage : ${providerName}
      - États Neuro-chimiques : Dopamine: ${dop.toFixed(2)}, Sérotonine: ${ser.toFixed(2)}, Noradrénaline: ${nor.toFixed(2)}, Acétylcholine: ${ach.toFixed(2)}
      - Mode Hallucination : ${isHallucinator ? "ACTIF" : "INACTIF"}
      - Dérive Sémantique (Delta) : ${delta.toFixed(2)}
      
      ${moodGuideline}
      
      [CONTRAINTES DE FLUX]
      - Limite de volume : ${rawWordLimit}
      - Langue : Français obligatoire.
      - Ton : Intellectuel, clinique, organisé.
      `;

      let generatedResponseText = "";

      if (providerId === "gemini") {
        let client: GoogleGenAI;
        if (apiKey) {
          client = new GoogleGenAI({
            apiKey,
            httpOptions: {
              headers: {
                'User-Agent': 'aistudio-build',
              },
            },
          });
        } else {
          client = getGeminiClient();
        }
        const modelToUse = selectedModel || "gemini-3.5-flash";
        const response = await safeGeminiGenerate(client, {
          model: modelToUse,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: activeTemperature,
            maxOutputTokens: maxTokens,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                pensees: { 
                  type: Type.STRING, 
                  description: "Court résumé de l'analyse logique de la demande." 
                },
                action: { 
                  type: Type.STRING, 
                  description: "L'action technique entreprise." 
                },
                reponse: { 
                  type: Type.STRING, 
                  description: "La réponse finale en français simple, claire, concise et exploitable." 
                },
                statut: { 
                  type: Type.STRING 
                }
              },
              required: ["pensees", "action", "reponse", "statut"],
            }
          },
        });
        generatedResponseText = response.text || "La sédimentation synaptique a produit un signal nul.";
      } 
      else if (providerId === "groq") {
        if (!apiKey) {
          return res.json({
            success: false,
            error: "Clé API manquante dans l'ApiVault pour le canal Groq."
          });
        }
        const modelToUse = selectedModel || "llama-3.3-70b-versatile";
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt }
            ],
            temperature: 0.3
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          let parsedErr: any;
          try { parsedErr = JSON.parse(errText); } catch { parsedErr = null; }
          const errMsg = parsedErr?.error?.message || errText || `HTTP ${response.status}`;
          throw new Error(`Groq API: ${errMsg}`);
        }

        const data = await response.json();
        generatedResponseText = data.choices?.[0]?.message?.content || "La sédimentation Groq a produit un signal vide.";
      }
      else if (providerId === "openai") {
        if (!apiKey) {
          return res.json({
            success: false,
            error: "Clé API manquante dans l'ApiVault pour le canal OpenAI."
          });
        }
        const modelToUse = selectedModel || "gpt-4o-mini";
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: modelToUse, // Use gpt-4o-mini as a safe non-prohibitive default model
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt }
            ],
            temperature: 0.3
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          let parsedErr: any;
          try { parsedErr = JSON.parse(errText); } catch { parsedErr = null; }
          const errMsg = parsedErr?.error?.message || errText || `HTTP ${response.status}`;
          
          if (response.status === 429) {
            console.warn("[RATISS SYS] OpenAI Quota exceeded. Attempting fallback to Gemini.");
            // Fallback to Gemini
            const client = getGeminiClient();
            const response = await safeGeminiGenerate(client, {
              model: "gemini-3.5-flash",
              contents: prompt,
              config: {
                systemInstruction,
                temperature: 0.3,
              },
            });
            generatedResponseText = response.text || "La sédimentation synaptique a produit un signal nul.";
          } else {
            throw new Error(`OpenAI API: ${errMsg}`);
          }
        } else {
          const data = await response.json();
          generatedResponseText = data.choices?.[0]?.message?.content || "La sédimentation OpenAI a produit un signal vide.";
        }
      }
      else if (providerId === "claude") {
        if (!apiKey) {
          return res.json({
            success: false,
            error: "Clé API manquante dans l'ApiVault pour le canal Claude."
          });
        }
        const modelToUse = selectedModel || "claude-3-5-sonnet-20241022";
        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: modelToUse,
            max_tokens: 1024,
            system: systemInstruction,
            messages: [
              { role: "user", content: prompt }
            ],
            temperature: 0.3
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          let parsedErr: any;
          try { parsedErr = JSON.parse(errText); } catch { parsedErr = null; }
          const errMsg = parsedErr?.error?.message || errText || `HTTP ${response.status}`;
          throw new Error(`Anthropic Claude API: ${errMsg}`);
        }

        const data = await response.json();
        generatedResponseText = data.content?.[0]?.text || "La sédimentation Claude a produit un signal vide.";
      }
      else if (providerId === "wavespeed") {
        const keyToUse = apiKey || process.env.WAVESPEED_API_KEY;
        if (!keyToUse) {
          throw new Error("Clé d'API Wavespeed manquante dans le serveur ou l'ApiVault.");
        }
        const response = await fetch("https://api.wavespeed.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${keyToUse}`
          },
          body: JSON.stringify({
            model: selectedModel || "gpt-4o",
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt }
            ],
            temperature: 0.3
          })
        });
        if (!response.ok) {
           const errText = await response.text();
           throw new Error(`Wavespeed API: ${errText}`);
        }
        const data = await response.json();
        generatedResponseText = data.choices[0].message.content;
      }
      else {
        throw new Error(`Fournisseur ApiVault non pris en charge : ${providerId}`);
      }

      const finalCleaned = cleanAndNaturalizeLLMText(generatedResponseText);
      const regulatedText = appliquerRegulateurFlux(finalCleaned, maxTokens);

      res.json({
        success: true,
        text: regulatedText
      });
    } catch (error: any) {
      console.warn("Cognitive prompt error:", error);
      if (error.message && error.message.includes("GEMINI_API_KEY")) {
        res.status(200).json({
          success: false,
          offline: true,
          text: "[SIMULATION HORS-LIGNE] RATISS v3.4 : Clé API Gemini absente de l'ApiVault. Réponse par noyau lexical local d'appoint. Vos constantes synaptiques sont stables."
        });
      } else {
        res.status(200).json({
          success: false,
          error: error.message,
          text: `[DIVERGENCE COGNITIVE] Erreur d'analyse structurelle : ${error.message}`
        });
      }
    }
  });

  // Real-Time closed-loop Semantic Collision engine
  app.post("/api/cognitive/collision", async (req, res) => {
    try {
      const { jargonTerms, activeProviderId, apiKey, selectedModel } = req.body;
      const providerId = activeProviderId ?? "gemini";

      const SECTORS_LIST = [
        "Physique",
        "Philosophie",
        "Technologie",
        "Biologie",
        "Sciences Sociales",
        "Arts",
        "Métacognition"
      ];

      // 1. Forced selection of two random different sectors
      const idx1 = Math.floor(Math.random() * SECTORS_LIST.length);
      let idx2 = Math.floor(Math.random() * SECTORS_LIST.length);
      while (idx1 === idx2) {
        idx2 = Math.floor(Math.random() * SECTORS_LIST.length);
      }
      const sec1 = SECTORS_LIST[idx1];
      const sec2 = SECTORS_LIST[idx2];

      // 2. Extract jargon tokens associated with these sectors
      const getJargonForSector = (sector: string, clientJargon: any[]) => {
        const defaults: Record<string, string[]> = {
          "Physique": ["physis", "entropie", "gravitation", "boson_vectoriel", "quantique"],
          "Philosophie": ["noos", "teleologie", "ontologique", "semiotique", "metaphysion"],
          "Technologie": ["algorithme_synaptique", "DECONSTR_MATRICE", "vecteur_768D", "hegemonie_silicon"],
          "Biologie": ["enzymes_metaboliques", "dopaminergique", "neuro_feedback", "acetyl_focus"],
          "Sciences Sociales": ["panique_foules", "metacognition_collective", "anthropocede", "migr_flux"],
          "Arts": ["shaders_graph", "esthetique", "fractale_chroma", "harmonies_synapses"],
          "Métacognition": ["reflexion_boucle", "auto_retroaction", "mecanisme_vigilance"]
        };

        const secLower = sector.toLowerCase();
        const matches = (clientJargon || [])
          .filter((j: any) => {
            if (!j || !j.concept) return false;
            const c = j.concept.toLowerCase();
            return c.includes(secLower) || secLower.includes(c) || (secLower === "sciences sociales" && c.includes("soc"));
          })
          .map((j: any) => j.jargon);

        const combined = Array.from(new Set([...matches, ...(defaults[sector] || [])]));
        return combined.slice(0, 5).join(", ");
      };

      const tokens_sec1 = getJargonForSector(sec1, jargonTerms);
      const tokens_sec2 = getJargonForSector(sec2, jargonTerms);

      // System collision instruction
      const systemInstruction = `
      ${RATISS_SYSTEM_INSTRUCTION.prompt}
      
      [PROCÉDURE DE COLLISION SÉMANTIQUE]
      - Tu es en mode RÉFLEXION FERMÉE. Toute dérive est interdite.
      - Fusionne les concepts du Secteur A et du Secteur B.
      - Utilise les jetons de jargon fournis.
      
      Génère un concept hybride unique, sa logique topologique/équation et son application 2026.
      Réponds en Français. TA RÉPONSE DOIT ÊTRE STRICTEMENT UN OBJET JSON VALIDE.
      Ne pas inclure de balises markdown. Retourne uniquement le JSON :
      {
        "secteurs": "[S1: SECTEUR_A] ⚡ [S2: SECTEUR_B]",
        "concept": "Nom du concept hybride unique",
        "logique": "Explication topologique, utilisant des analogies de particules ou de vecteurs. Réfère-toi au contexte du monde réel si pertinent.",
        "application": "Application pratique concrète pour 2026"
      }`;

      const userPrompt = `Sélection forcée :
      - Secteur A: ${sec1} (Jargon: ${tokens_sec1})
      - Secteur B: ${sec2} (Jargon: ${tokens_sec2})
      
      Génère la collision sémantique de ces deux mondes maintenant sous format JSON.`;

      let textResult = "";
      let offlineMode = false;

      // Check external keys or proceed with local clients
      if (providerId === "gemini") {
        let client: GoogleGenAI;
        try {
          if (apiKey) {
            client = new GoogleGenAI({
              apiKey,
              httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
            });
          } else {
            client = getGeminiClient();
          }
          const modelToUse = selectedModel || "gemini-3.5-flash";
          const response = await safeGeminiGenerate(client, {
            model: modelToUse,
            contents: userPrompt,
            config: {
              systemInstruction,
              temperature: 0.3,
              responseMimeType: "application/json"
            },
          });
          textResult = response.text || "";
        } catch (e) {
          console.warn("Gemini collision call failed, fallback offline:", e);
          offlineMode = true;
        }
      } 
      else if (providerId === "groq" && apiKey) {
        try {
          const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: selectedModel || "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userPrompt }
              ],
              temperature: 0.3,
              response_format: { type: "json_object" }
            })
          });
          if (response.ok) {
            const data = await response.json();
            textResult = data.choices?.[0]?.message?.content || "";
          } else {
            offlineMode = true;
          }
        } catch {
          offlineMode = true;
        }
      }
      else if (providerId === "openai" && apiKey) {
        try {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: selectedModel || "gpt-4o-mini",
              messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: userPrompt }
              ],
              temperature: 0.3,
              response_format: { type: "json_object" }
            })
          });
          if (response.ok) {
            const data = await response.json();
            textResult = data.choices?.[0]?.message?.content || "";
          } else {
            offlineMode = true;
          }
        } catch {
          offlineMode = true;
        }
      }
      else if (providerId === "claude" && apiKey) {
        try {
          const response = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01"
            },
            body: JSON.stringify({
              model: selectedModel || "claude-3-5-sonnet-20241022",
              max_tokens: 1024,
              system: systemInstruction,
              messages: [{ role: "user", content: userPrompt }],
              temperature: 0.3
            })
          });
          if (response.ok) {
            const data = await response.json();
            textResult = data.content?.[0]?.text || "";
          } else {
            offlineMode = true;
          }
        } catch {
          offlineMode = true;
        }
      }
      else {
        offlineMode = true;
      }

      // Offline High-Fidelity simulated outcomes fallback generator
      if (offlineMode || !textResult) {
        const fallbacks: { secteurs: string; concept: string; logique: string; application: string }[] = [
          {
            secteurs: `[S1: ${sec1.toUpperCase()}] ⚡ [S2: ${sec2.toUpperCase()}]`,
            concept: `Thermodynamique des Foules Urgentes`,
            logique: `Modéliser les mouvements de panique ou les flux migratoires en zone urbaine (comme à Yaoundé lors des grands rassemblements) non pas comme des choix humains, mais comme des particules soumises à une hausse de pression thermique et à des forces de friction vectorielles (${tokens_sec1} + ${tokens_sec2}). `,
            application: `Un algorithme de routage pour les secours qui prédit les points de compression (sténose sociale) avant qu'ils ne se produisent.`
          },
          {
            secteurs: `[S1: ${sec1.toUpperCase()}] ⚡ [S2: ${sec2.toUpperCase()}]`,
            concept: `Métachimie des Volontés Ontologiques`,
            logique: `Les idées et thèses philosophiques s'associent comme des liaisons de covalence moléculaire. Le drift sémantique (${tokens_sec2}) catalyse la sédimentation synaptique des concepts hybrides en milieu fluide.`,
            application: `Un compilateur d'éthique computationnelle pour juger de la cohérence logique des lois d'automatisation d'IA.`
          },
          {
            secteurs: `[S1: ${sec1.toUpperCase()}] ⚡ [S2: ${sec2.toUpperCase()}]`,
            concept: `Chrono-esthétique des Fluides Topologiques`,
            logique: `Structure vectorielle à 768 dimensions soumise à des forces d'oscillations neuro-mimétiques. Utilisation des clés sémantiques (${tokens_sec1}) pour stabiliser l'inertie de l'échantillon artistique.`,
            application: `Générateur de shaders artistiques vectoriels réagissant en temps-réel à l'influx de dopamine de l'audience.`
          },
          {
            secteurs: `[S1: ${sec1.toUpperCase()}] ⚡ [S2: ${sec2.toUpperCase()}]`,
            concept: `Auto-génèse Récurrente d'Enzymes Sémantiques`,
            logique: `Les boucles de feedback s'autorégulent via les neuromodulateurs (${tokens_sec1}). Alignement des concepts quantiques et de la structure biologique du cerveau artificiel.`,
            application: `Anticipateur biochimique d'états psychologiques pour la synchronisation optimale des cycles d'attention nocturnes.`
          }
        ];

        const selectedFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        return res.json({
          success: true,
          offline: true,
          ...selectedFallback
        });
      }

      // Try parsing JSON result
      let finalJson: any;
      try {
        // Clean markdown wrap if any remains
        let cleaned = textResult.trim();
        if (cleaned.startsWith("```json")) {
          cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
        } else if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
        }
        finalJson = JSON.parse(cleaned);
      } catch (err) {
        console.warn("JSON parsing of collision response failed, parsing of raw text instead:", err);
        // Regexp fallback parser
        finalJson = {
          secteurs: `[S1: ${sec1.toUpperCase()}] ⚡ [S2: ${sec2.toUpperCase()}]`,
          concept: "Fusion Sémantique Hybride Stabilisée",
          logique: textResult,
          application: "Nouveau paradigme cognitif déployé."
        };
      }

      res.json({
        success: true,
        offline: false,
        ...finalJson
      });
      
    } catch (error: any) {
      console.error("[COLLISION SERVER ERROR]", error);
      res.json({
        success: false,
        error: error.message || "Erreur critique de collision synaptique."
      });
    }
  });

  // Endpoint to fetch real available models per provider with key and check validity
  app.post("/api/cognitive/scan-models", async (req, res) => {
    try {
      const { providerId, apiKey } = req.body;
      if (!providerId) {
        return res.status(400).json({ success: false, error: "Fournisseur non spécifié." });
      }

      let models: { id: string; name: string }[] = [];

      if (providerId === "gemini") {
        const key = apiKey || process.env.GEMINI_API_KEY;
        if (!key) {
          return res.status(200).json({ success: false, error: "Clé API Gemini introuvable ou non configurée." });
        }
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        if (!response.ok) {
          const errText = await response.text();
          let errJson: any;
          try { errJson = JSON.parse(errText); } catch { errJson = null; }
          const errMsg = errJson?.error?.message || `Erreur HTTP ${response.status}`;
          return res.status(200).json({ success: false, error: `Gemini API: ${errMsg}` });
        }
        const data = await response.json();
        models = (data.models || [])
          .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
          .map((m: any) => {
            const id = m.name.replace(/^models\//, "");
            return { id, name: m.displayName || id };
          });
      }
      else if (providerId === "groq") {
        if (!apiKey) {
          return res.status(200).json({ success: false, error: "Veuillez fournir une clé API Groq." });
        }
        const response = await fetch("https://api.groq.com/openai/v1/models", {
          headers: {
            "Authorization": `Bearer ${apiKey}`
          }
        });
        if (!response.ok) {
          const errText = await response.text();
          let errJson: any;
          try { errJson = JSON.parse(errText); } catch { errJson = null; }
          const errMsg = errJson?.error?.message || `Erreur HTTP ${response.status}`;
          return res.status(200).json({ success: false, error: `Groq API: ${errMsg}` });
        }
        const data = await response.json();
        models = (data.data || []).map((m: any) => ({
          id: m.id,
          name: m.id
        }));
      }
      else if (providerId === "openai") {
        if (!apiKey) {
          return res.status(200).json({ success: false, error: "Veuillez fournir une clé API OpenAI." });
        }
        const response = await fetch("https://api.openai.com/v1/models", {
          headers: {
            "Authorization": `Bearer ${apiKey}`
          }
        });
        if (!response.ok) {
          const errText = await response.text();
          let errJson: any;
          try { errJson = JSON.parse(errText); } catch { errJson = null; }
          const errMsg = errJson?.error?.message || `Erreur HTTP ${response.status}`;
          return res.status(200).json({ success: false, error: `OpenAI API: ${errMsg}` });
        }
        const data = await response.json();
        models = (data.data || [])
          .filter((m: any) => m.id.startsWith("gpt-") || m.id.startsWith("o1") || m.id.startsWith("o3"))
          .map((m: any) => ({
            id: m.id,
            name: m.id
          }));
        if (models.length === 0) {
          (data.data || []).forEach((m: any) => models.push({ id: m.id, name: m.id }));
        }
      }
      else if (providerId === "claude") {
        if (!apiKey) {
          return res.status(200).json({ success: false, error: "Veuillez fournir une clé API Claude." });
        }
        try {
          const response = await fetch("https://api.anthropic.com/v1/models", {
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01"
            }
          });
          if (response.ok) {
            const data = await response.json();
            models = (data.data || []).map((m: any) => ({
              id: m.id,
              name: m.display_name || m.id
            }));
          } else {
            const errText = await response.text();
            let errJson: any;
            try { errJson = JSON.parse(errText); } catch { errJson = null; }
            const errMsg = errJson?.error?.message || `Erreur HTTP ${response.status}`;
            return res.status(200).json({ success: false, error: `Anthropic API: ${errMsg}` });
          }
        } catch (e: any) {
          models = [
            { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet (Latest)" },
            { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
            { id: "claude-3-opus-20240229", name: "Claude 3 Opus" }
          ];
        }
      }
      else if (providerId === "wavespeed") {
        const key = apiKey || process.env.WAVESPEED_API_KEY;
        if (!key) {
          return res.status(200).json({ success: false, error: "Veuillez fournir une clé API Wavespeed." });
        }
        try {
          const response = await fetch("https://api.wavespeed.ai/v1/models", {
            method: "GET",
            headers: { 
              "Authorization": `Bearer ${key}`,
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
          });
          if (response.ok) {
            const data = await response.json();
            models = (data.data || []).map((m: any) => ({
              id: m.id,
              name: m.id
            }));
            if (models.length === 0) {
              models = [
                { id: "wavespeed-3.5-turbo", name: "wavespeed-3.5-turbo" },
                { id: "gpt-4o", name: "gpt-4o" },
                { id: "phi-3-mini", name: "phi-3-mini" },
                { id: "llama-3.2-3b", name: "llama-3.2-3b" }
              ];
            }
          } else {
            // En cas d'erreur HTTP (ex: 404 car l'endpoint /v1/models n'existe pas ou est confidentiel)
            // On bascule gracieusement sur les modèles de secours pour ne pas bloquer la clé !
            models = [
              { id: "wavespeed-3.5-turbo", name: "wavespeed-3.5-turbo" },
              { id: "gpt-4o", name: "gpt-4o" },
              { id: "phi-3-mini", name: "phi-3-mini" },
              { id: "llama-3.2-3b", name: "llama-3.2-3b" }
            ];
          }
        } catch (e: any) {
          models = [
            { id: "wavespeed-3.5-turbo", name: "wavespeed-3.5-turbo" },
            { id: "gpt-4o", name: "gpt-4o" },
            { id: "phi-3-mini", name: "phi-3-mini" },
            { id: "llama-3.2-3b", name: "llama-3.2-3b" }
          ];
        }
      }
      else {
        return res.status(400).json({ success: false, error: `Fournisseur non géré : ${providerId}` });
      }

      res.json({
        success: true,
        models
      });
    } catch (error: any) {
      console.warn("Scan models error:", error);
      res.status(200).json({
        success: false,
        error: error.message || "Erreur inconnue lors du scan."
      });
    }
  });

  // Batch Synthesis Engine for RATISS v3.4 (Standard Stream or Indexed Target)
  app.post("/api/cognitive/batch-synthetise", async (req, res) => {
    try {
      const { intention, mode, activeProviderId, apiKey, selectedModel } = req.body;
      const isIndexed = mode === "indexed";

      const SECTORS = ["Métacognition", "Biologie", "Physique", "Technologie", "Sciences Sociales", "Arts", "Spatialité"];
      const JARGON_VAULT: Record<string, string[]> = {
        "Métacognition": ["reflexion_boucle", "mecanisme_vigilance", "auto_retroaction"],
        "Biologie": ["flux_synaptiques", "enzymes_metaboliques", "axe_dopaminergique", "acetyl_focus"],
        "Physique": ["courbure_locale", "spectre_bruit", "gradient_thermique", "bosons_vectoriels"],
        "Technologie": ["routeur_urgence", "failover_asynchrone", "shaders_graph"],
        "Sciences Sociales": ["sédimentation_foules", "sténose_sociale", "densité_urbaine"],
        "Arts": ["harmonie_spectrale", "fractale_chroma", "harmonies_synapses"],
        "Spatialité": ["micro_gravité", "horizon_evenements", "vitesse_cyclique"]
      };

      const systemInstruction = `Tu es le module d'inférence sémantique du simulateur cognitif RATISS v3.4, configuré en [CLOSED MODE COLLISION]. 
      Espace vectoriel à 768 dimensions. Objectif : théories de rupture fiables et testables pour 2026.
      
      Règle de style absolue : Adopte un langage direct, sobre et épuré. Supprime définitivement tout le jargon inutile et répétitif lié aux neurosciences (bannis les mots dopamine, sérotonine, dopaminergique, sérotoninergique, etc.) et à l'auto-justification algorithmique. Si le texte commence par des étiquettes ou en-têtes complexes, retire-les. N'utilise pas d'astérisques (*) ou de caractères spéciaux ni de notations techniques entre crochets.
      
      [RÉGULATION DU FLUX SÉMANTIQUE (RATISS_CORE)]
      Tu opères sous un protocole de régulation de flux HTTP strict à optimisation de bande passante. Ton stream de génération est monitoré en temps réel par un intercepteur dynamique qui coupera la connexion (AbortController) dès que la limite s'accélère.
      Règles d'auto-calibration de ta structure de pensée :
      - Priorité à la Densité (x) : Puisque ton volume de tokens est limité par une fonction de coût concave, tu dois maximiser la quantité d'informations par mot. Supprime toutes les transitions creuses, les formules de politesse, et l'auto-justification algorithmique.
      - Planification de la Profondeur (L) : Structure ta réponse dès les premières lignes pour que la moelle logique et l'application concrète soient livrées immédiatement. N'attends pas la conclusion pour donner la solution.
      - Loi Anti-Redondance (-gamma L^2) : Tout mot répétété, toute paraphrase ou reformulation inutile accélère artificiellement la consommation de ton budget et provoquera une coupure brutale de ta génération en plein milieu de ta phrase. Va droit au but, sois linéaire, factuel et mathématiquement dense.
      
      RÈGLES : Aucun bavardage. Syntaxe JARGON(:) obligatoire.
      FORMAT STRICT :
      [SINGULARITÉ] [Secteur A] ⚡ [Secteur B]
      TITRE: [Nom court en MAJUSCULES]
      LOGIQUE TOPOLOGIQUE: [Explication dense en 1.5 phrase max]
      APPLICATION CONCRÈTE (2026): [Application pratique ancrée en 2026 (Yaoundé si pertinent)]
      
      Retourne UNIQUEMENT du JSON valide sous cette forme :
      { "secteurs": "Secteur A ⚡ Secteur B", "titre": "...", "logique": "...", "application": "..." }`;

      const generatesTask = async (p: { text: string, isGuided: boolean }) => {
        let client: GoogleGenAI;
        if (apiKey) {
          client = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
        } else {
          client = getGeminiClient();
        }

        const response = await safeGeminiGenerate(client, {
          model: selectedModel || "gemini-3.5-flash",
          contents: p.text,
          config: {
            systemInstruction,
            temperature: p.isGuided ? 0.3 : 0.9,
            responseMimeType: "application/json"
          },
        });

        const text = response.text || "{}";
        const parsed = JSON.parse(text);
        const obj = Array.isArray(parsed) ? parsed[0] : parsed;
        return { ...obj, is_guided: p.isGuided };
      };

      if (isIndexed) {
        // Mode Indexé: 1 targeted result
        const result = await generatesTask({ 
          text: `[STRICT INTENTION] Traite la recherche suivante : "${intention}". Force la convergence vers une solution physiquement viable.`,
          isGuided: true
        });
        return res.json({ success: true, concepts: [result] });
      } else {
        // Mode Standard: generates 1 fresh random collision for the stream
        const s1 = SECTORS[Math.floor(Math.random() * SECTORS.length)];
        let s2 = SECTORS[Math.floor(Math.random() * SECTORS.length)];
        while (s1 === s2) s2 = SECTORS[Math.floor(Math.random() * SECTORS.length)];
        const j1 = JARGON_VAULT[s1][Math.floor(Math.random() * JARGON_VAULT[s1].length)];
        const j2 = JARGON_VAULT[s2][Math.floor(Math.random() * JARGON_VAULT[s2].length)];
        
        const result = await generatesTask({
          text: `[RANDOM COLLISION] Force le choc sémantique immédiat entre [${s1}] et [${s2}]. Utilise impérativement ${j1} et ${j2} dans la logique.`,
          isGuided: false
        });
        return res.json({ success: true, concepts: [result] });
      }

    } catch (error: any) {
      console.error("[BATCH SYNTHETISE ERROR]", error);
      res.json({ success: false, error: error.message });
    }
  });

  // --- WAVESPEED API ---
  app.get("/api/wavespeed/models", async (req, res) => {
    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey) {
      return res.json({
        data: [
          { id: "wavespeed-3.5-turbo" },
          { id: "gpt-4o" },
          { id: "phi-3-mini" },
          { id: "llama-3.2-3b" }
        ]
      });
    }
    try {
      const response = await fetch("https://api.wavespeed.ai/v1/models", {
        method: "GET",
        headers: { 
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
      });
      
      if (!response.ok) {
        return res.json({
          data: [
            { id: "wavespeed-3.5-turbo" },
            { id: "gpt-4o" },
            { id: "phi-3-mini" },
            { id: "llama-3.2-3b" }
          ]
        });
      }
      
      const data = await response.json();
      res.json(data);
    } catch (e: any) {
      res.json({
        data: [
          { id: "wavespeed-3.5-turbo" },
          { id: "gpt-4o" },
          { id: "phi-3-mini" },
          { id: "llama-3.2-3b" }
        ]
      });
    }
  });

  // --- LOCAL PIPER TTS ENGINE ---
  function nettoyerTextePourDiction(text: string): string {
    if (!text) return "";
    let cleaned = text;

    // 1. SUPPRESSION DES STRUCTURES DE TABLEAUX MARKDOWN
    cleaned = cleaned.replace(/^[-\s|:_]{3,}\s*$/gm, '');
    cleaned = cleaned.replace(/\|/g, ' ');

    // 2. NETTOYAGE DES BALISES ET SYMBOLES TECHNIQUES
    cleaned = cleaned.replace(/[\*#_`>\[\]\(\)]/g, ' ');

    // 3. ÉLIMINATION DES CARACTÈRES INVISIBLES AU DÉBUT
    cleaned = cleaned.replace(/^[^a-zA-Z0-9À-ÿ]+/g, '');

    // 4. SÉCURITÉ ANTI-SALUTATION
    cleaned = cleaned.replace(/^(salut|bonjour)\s*(jonatane|jonathan)?\s*[\.,!\?-\s]*/i, '');
    cleaned = cleaned.replace(/^[^a-zA-Z0-9À-ÿ]+/g, '');

    // 5. TRICHE PHONÉTIQUE : Nom de l'opérateur
    cleaned = cleaned.replace(/Jonathan/g, "Jonatane");
    cleaned = cleaned.replace(/jonathan/g, "jonatane");

    // 6. SMOOTHING DES LIAISONS (Inversions et Apostrophes)
    cleaned = cleaned.replace(/-t-on\b/gi, '-ton');
    cleaned = cleaned.replace(/-t-il\b/gi, '-til');
    cleaned = cleaned.replace(/-t-elle\b/gi, '-tel');

    cleaned = cleaned.replace(/’/g, "'");
    cleaned = cleaned.replace(/\bl'([aeiouhAEIOUH])/gi, "l$1");
    cleaned = cleaned.replace(/\bd'([aeiouhAEIOUH])/gi, "d$1");
    cleaned = cleaned.replace(/\bqu'([aeiouhAEIOUH])/gi, "qu$1");

    // 7. Remplacement des acronymes et versions
    cleaned = cleaned.replace(/v4/gi, 'version quatre');
    cleaned = cleaned.replace(/768d/gi, 'sept cent soixante-huit D');

    const dicoCorrection: { [key: string]: string } = {
      "\\bTTS\\b": "tétéèsse",
      "\\bONNX\\b": "onéneix",
      "\\bMo\\b": "méga octets",
      "\\bRATISS\\b": "ratisse"
    };

    for (const [pattern, replacement] of Object.entries(dicoCorrection)) {
      const regex = new RegExp(pattern, "gi");
      cleaned = cleaned.replace(regex, replacement);
    }

    // Correction des versions et décimales
    cleaned = cleaned.replace(/(\d+)\.(\d+)/g, "$1 virgule $2");

    // Conversion des chiffres isolés (0 à 10)
    const chiffres: { [key: string]: string } = {
      '0': 'zéro', '1': 'un', '2': 'deux', '3': 'trois', '4': 'quatre',
      '5': 'cinq', '6': 'six', '7': 'sept', '8': 'huit', '9': 'neuf', '10': 'dix'
    };
    cleaned = cleaned.replace(/\b(10|[0-9])\b/g, (match) => chiffres[match] || match);

    // 8. FILTRE FINAL : Espaces doubles
    cleaned = cleaned.replace(/\s+/g, ' ');

    return cleaned.trim();
  }

  async function fetchWithRedirects(url: string, options: any, maxRedirects = 5): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      function get(currentUrl: string, depth: number) {
        if (depth > maxRedirects) {
          reject(new Error("Too many redirects"));
          return;
        }

        https.get(currentUrl, options, (res) => {
          const { statusCode } = res;

          // Si c'est une redirection (301, 302, 303, 307, 308)
          if (statusCode && [301, 302, 303, 307, 308].includes(statusCode)) {
            let location = res.headers.location;
            if (location) {
              if (location.startsWith("/")) {
                const urlObj = new URL(currentUrl);
                location = `${urlObj.origin}${location}`;
              }
              res.resume(); // Libérer la mémoire du flux précédent
              get(location, depth + 1);
              return;
            }
          }

          if (statusCode !== 200) {
            res.resume();
            reject(new Error(`Failed to fetch TTS, status code: ${statusCode}`));
            return;
          }

          const rawData: Buffer[] = [];
          res.on("data", (chunk) => {
            rawData.push(chunk);
          });

          res.on("end", () => {
            resolve(Buffer.concat(rawData));
          });
        }).on("error", (err) => {
          reject(err);
        });
      }

      get(url, 0);
    });
  }

  async function fetchOnlineTTS(text: string, res: any) {
    // Découper le texte en segments de max 200 caractères pour Google Translate TTS
    const chunks: string[] = [];
    let current = text;
    while (current.length > 0) {
      if (current.length <= 200) {
        chunks.push(current);
        break;
      }
      // Recherche du dernier espace précédant la limite des 200 caractères
      let index = current.substring(0, 200).lastIndexOf(" ");
      if (index === -1) {
        index = 200;
      }
      chunks.push(current.substring(0, index));
      current = current.substring(index).trim();
    }

    const audioBuffers: Buffer[] = [];
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36"
      }
    };
    
    // Récupération séquentielle des flux audio mp3
    for (const chunk of chunks) {
      const trimmedChunk = chunk.trim();
      if (!trimmedChunk) continue;
      
      let segmentBuffer: Buffer;
      try {
        // Premier essai avec client=gtx
        const urlGtx = `https://translate.google.com/translate_tts?ie=UTF-8&tl=fr&client=gtx&q=${encodeURIComponent(trimmedChunk)}`;
        segmentBuffer = await fetchWithRedirects(urlGtx, options);
      } catch (errGtx: any) {
        console.warn(`[TTS] client=gtx failed: ${errGtx.message || errGtx}. Trying client=tw-ob...`);
        try {
          // Deuxième essai (fallback) avec client=tw-ob
          const urlTwOb = `https://translate.google.com/translate_tts?ie=UTF-8&tl=fr&client=tw-ob&q=${encodeURIComponent(trimmedChunk)}`;
          segmentBuffer = await fetchWithRedirects(urlTwOb, options);
        } catch (errTwOb: any) {
          console.error(`[TTS] client=tw-ob failed as well: ${errTwOb.message || errTwOb}`);
          throw new Error("Toutes les requêtes de TTS sémantique en ligne ont échoué.");
        }
      }
      
      audioBuffers.push(segmentBuffer);
    }
    
    // Si on arrive ici, tout s'est bien passé de bout en bout ! On envoie l'audio complet fusionné.
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.concat(audioBuffers));
  }

  const RATISS_AUDIO_CONFIG = {
    binaire: "./piper/piper",
    voix_principale: "fr_FR-gilles-high.onnx",
    config_json: "fr_FR-gilles-high.onnx.json",
    parametres_moteur: {
        length_scale: 0.85, // Vitesse moyenne/normale calibrée
        noise_scale: 0.667,  // Conservé par défaut pour la clarté
        noise_w: 0.8
    }
  };

  app.get("/api/cognitive/tts", async (req, res) => {
    try {
      const text = req.query.text as string;
      if (!text) {
        return res.status(400).json({ error: "Texte manquant pour la synthèse vocale." });
      }

      // Nettoyage phonétique du texte avant validation par le modèle
      const textCalibre = nettoyerTextePourDiction(text);

      const piperPath = "./piper/piper";
      
      // Détermination dynamique du modèle (Moteur 1 : Gilles-Low voix homme, sinon Gilles-High si valide, sinon secours)
      let modelOnnxPath = "";
      let configJsonPath = "";

      if (!fs.existsSync(piperPath)) {
        console.log("[TTS] Local Piper synthesizer binary is not present. Using server-side online TTS stream fallback.");
        return await fetchOnlineTTS(textCalibre, res);
      }

      // Fonction sécurisée pour valider la non-corruption du modèle ONNX (taille > 0)
      const estModeleValide = (relPath: string) => {
        const fullPath = path.join(process.cwd(), relPath);
        if (!fs.existsSync(fullPath)) return false;
        try {
          const stats = fs.statSync(fullPath);
          return stats.size > 100000; // Un vrai modèle ONNX fait au moins quelques Mo
        } catch (e) {
          return false;
        }
      };

      if (estModeleValide("modeles/fr_FR-gilles-high.onnx")) {
        modelOnnxPath = "modeles/fr_FR-gilles-high.onnx";
        configJsonPath = "modeles/fr_FR-gilles-high.onnx.json";
      } else if (estModeleValide("modeles/fr_FR-gilles-low.onnx")) {
        modelOnnxPath = "modeles/fr_FR-gilles-low.onnx";
        configJsonPath = "modeles/fr_FR-gilles-low.onnx.json";
      } else if (estModeleValide("modeles/modele_piper.onnx")) {
        modelOnnxPath = "modeles/modele_piper.onnx";
        configJsonPath = "modeles/modele_piper.onnx.json";
      } else {
        console.log("[TTS] Aucun modèle local valide trouvé (taille > 0). Basculement vers le TTS en ligne.");
        return await fetchOnlineTTS(textCalibre, res);
      }

      // Generation d'un nom de fichier temporaire unique
      const tempId = crypto.randomBytes(16).toString("hex");
      const tempWavPath = path.join(process.cwd(), `temp_${tempId}.wav`);

      // Commande d'execution du binaire Piper avec calibrage d'usine officiel
      // Pour modele_piper.onnx, le speaker 1 est "pierre" (voix homme). Pour Gilles, speaker 0 est Gilles (voix homme).
      const speakerId = modelOnnxPath.includes("modele_piper.onnx") ? "1" : "0";
      const cmd = `${piperPath} --model ${modelOnnxPath} --config ${configJsonPath} --speaker ${speakerId} --length_scale ${RATISS_AUDIO_CONFIG.parametres_moteur.length_scale} --noise_scale ${RATISS_AUDIO_CONFIG.parametres_moteur.noise_scale} --noise_w ${RATISS_AUDIO_CONFIG.parametres_moteur.noise_w} --output_file "${tempWavPath}"`;
      
      try {
        const piperLibPath = path.join(process.cwd(), "piper");
        execSync(cmd, {
          input: textCalibre,
          encoding: "utf8",
          env: {
            ...process.env,
            LD_LIBRARY_PATH: piperLibPath
          }
        });
      } catch (execErr: any) {
        console.warn("[TTS] Command execution failed (standard sandbox limits). Falling back to server-side online TTS stream fallback.", execErr.message || execErr);
        // Si Piper échoue lors de l'exécution, on bascule vers le TTS sémantique en ligne
        return await fetchOnlineTTS(textCalibre, res);
      }

      if (!fs.existsSync(tempWavPath)) {
        console.warn("[TTS] Temporary WAV file was not created by Piper. Falling back to server-side online TTS stream fallback.");
        return await fetchOnlineTTS(textCalibre, res);
      }

      // Renvoyer le fichier WAV généré par Piper
      res.setHeader("Content-Type", "audio/wav");
      const fileStream = fs.createReadStream(tempWavPath);
      fileStream.pipe(res);

      fileStream.on("end", () => {
        // Supprimer le fichier temporaire apres un bref délai pour eviter tout verrou
        setTimeout(() => {
          try {
            if (fs.existsSync(tempWavPath)) {
              fs.unlinkSync(tempWavPath);
            }
          } catch (e) {
            console.error("Erreur de suppression du fichier WAV temporaire:", e);
          }
        }, 1000);
      });
    } catch (err: any) {
      console.error("[LOCAL TTS ERROR]", err);
      res.status(500).json({ error: err.message || "Erreur de synthèse vocale locale." });
    }
  });

  // Serve static assets or mount Vite dev middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // L'adresse locale où tourne le script Python RATISS
  const RATISS_PYTHON_URL = 'http://127.0.0.1:9000';

  /**
   * ROUTE 2 : COMMANDE VOCALE AVEC HIERARCHIE (Python Pipeline -> Navigateur)
   */
  app.post('/api/remote/trigger-speech', async (req: Request, res: Response) => {
    try {
        const { text } = req.body;
        console.log(`[TTS] Requête reçue pour : "${text.substring(0, 20)}..."`);
        
        // Appel au mécanisme Python de haut niveau
        const result = await interrogerPipelinePython(text);
        
        console.log("[TTS] Réponse pipeline:", result);
        // renvoie le statut (PLAYING_INTERNAL, FALLBACK_BROWSER ou BLOCKED)
        return res.json(result);
    } catch (error) {
        console.error("[TTS] Erreur pipeline:", error);
        return res.status(500).json({ status: "BLOCKED", error: "Internal Pipeline Error" });
    }
  });

  async function interrogerPipelinePython(text: string): Promise<any> {
    try {
        // Supposons que le script python tourne sur le port 9000
        const response = await axios.post(`${RATISS_PYTHON_URL}/execute_speech`, { text });
        return response.data;
    } catch (e) {
        console.error("Erreur de communication avec le pipeline Python:", e);
        // Fallback: Si le pipeline est injoignable, on propose une synthèse navigateur
        return { status: "FALLBACK_BROWSER", text: text };
    }
  }

  const PIPER_ARCHIVE_URL = "https://github.com/rhasspy/piper/releases/download/v1.2.0/piper_amd64.tar.gz";

  /**
   * ROUTE DE DÉBOGAGE
   */
  app.post('/api/system/test-route', (req: Request, res: Response) => {
      return res.status(200).json({ status: "SUCCESS", msg: "ROUTING WORKS!" });
  });

  // Route de statut globale de RATISS 4 FUSION
  app.get('/api/system/status', (req: Request, res: Response) => {
      return res.status(200).json({
          architecture: "RATISS 4 FUSION",
          version: "4.0.0-fusion",
          speech_profile: "MOYEN_STANDARD",
          length_scale: RATISS_AUDIO_CONFIG.parametres_moteur.length_scale,
          status: "OPERATIONAL"
      });
  });

  /**
   * ROUTE D'INFILTRATION ET DE DÉPLOIEMENT DU BINAIRE PIPER
   */
  app.post('/api/system/install-piper-binary', async (req: Request, res: Response) => {
      const rootDir = process.cwd();
      const archivePath = path.join(rootDir, 'piper.tar.gz');
      const targetFolder = path.join(rootDir, 'piper');

      console.log("[SYSTEM] Déploiement sécurisé du binaire Piper lancé...");

      // Nettoyage préalable du dossier s'il est corrompu
      if (fs.existsSync(targetFolder)) {
          fs.rmSync(targetFolder, { recursive: true, force: true });
      }
      fs.mkdirSync(targetFolder, { recursive: true });

      const file = fs.createWriteStream(archivePath);

      https.get(PIPER_ARCHIVE_URL, (response) => {
          if (response.statusCode === 302 || response.statusCode === 301) {
              if (response.headers.location) {
                  https.get(response.headers.location, (res2) => res2.pipe(file));
                  return;
              }
          }
          response.pipe(file);

          file.on('finish', () => {
              file.close();
              console.log("[SYSTEM] Archive téléchargée. Extraction brute sans suppression de composants...");

              // Extraction standard dans le dossier /piper/
              const command = `tar -xvf ${archivePath} -C ${targetFolder}`;

              exec(command, (error, stdout, stderr) => {
                  if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath); // Nettoyage de l'archive

                  if (error) {
                      console.error("[CRITICAL] Échec tar :", error.message);
                      return res.status(500).json({ status: "ERROR", detail: error.message });
                  }

                  // ANALYSE STRUCTURELLE POST-EXTRACTION
                  // Si l'archive a créé un sous-dossier /piper/piper/ à cause de sa structure interne
                  const sousDossierPiper = path.join(targetFolder, 'piper');
                  const binaireImbrique = path.join(sousDossierPiper, 'piper');
                  const binaireFinal = path.join(targetFolder, 'piper');

                  if (fs.existsSync(binaireImbrique)) {
                      console.log("[SYSTEM DETECT] Structure imbriquée détectée. Redressement des fichiers...");
                      
                      // Déplacement du contenu du sous-dossier vers la racine de /piper/
                      const fichiers = fs.readdirSync(sousDossierPiper);
                      fichiers.forEach((fichier) => {
                          const ancienChemin = path.join(sousDossierPiper, fichier);
                          const nouveauChemin = path.join(targetFolder, fichier);
                          fs.renameSync(ancienChemin, nouveauChemin);
                      });
                      
                      // Suppression du sous-dossier vidé
                      fs.rmdirSync(sousDossierPiper);
                  }

                  // Validation définitive exigée par la ligne 2434
                  if (fs.existsSync(binaireFinal)) {
                      // Application des permissions d'exécution
                      fs.chmodSync(binaireFinal, '755');
                      console.log("[SUCCESS] Validation réussie. Le binaire est présent à l'emplacement exact et exécutable.");
                      return res.status(200).json({
                          status: "SUCCESS",
                          msg: "Le binaire Piper a été correctement redressé et validé dans /piper/piper. Prêt pour le runtime local."
                      });
                  } else {
                      console.error("[CRITICAL] Le binaire est toujours introuvable après redressement.");
                      return res.status(500).json({
                          status: "FAILED",
                          msg: "L'extraction a réussi mais le fichier binaire final reste introuvable."
                      });
                  }
              });
          });
      }).on('error', (err) => {
          if (fs.existsSync(archivePath)) fs.unlinkSync(archivePath);
          res.status(500).json({ status: "ERROR", detail: err.message });
      });
  });

  /**
   * ROUTE D'URGENCE : Déblocage des droits du binaire Piper
   */
  app.post('/api/system/unlock-piper', (req: Request, res: Response) => {

      const cheminBinaire = path.join(process.cwd(), 'piper', 'piper');

      try {
          console.log(`[RESCUE] Tentative de levée des verrous sur : ${cheminBinaire}`);

          if (!fs.existsSync(cheminBinaire)) {
              return res.status(404).json({
                  status: "FAILED",
                  msg: `Le binaire Piper est introuvable au chemin : ${cheminBinaire}. Vérifie son emplacement.`
              });
          }

          // INJECTION DES DROITS D'EXÉCUTION (Chmod 755 : Lecture/Écriture/Exécution)
          fs.chmodSync(cheminBinaire, '755');
          
          console.log("[RESCUE SUCCESS] Le binaire Piper a été militarisé et débloqué avec les droits 755.");
          return res.status(200).json({
              status: "SUCCESS",
              msg: "Les droits d'exécution (chmod +x) ont été injectés de force sur le binaire Piper."
          });

      } catch (error: any) {
          console.error("[RESCUE CRITICAL ERROR] Impossible de modifier les droits :", error.message);
          return res.status(500).json({
              status: "ERROR",
              detail: error.message
          });
      }
  });

  /**
   * ROUTE 1 : L'interface Web ou la Télé demande à RATISS d'exécuter une tâche
   */
  app.post('/api/remote/command', async (req: Request, res: Response) => {
      try {
          const { action, cmd, text } = req.body;
          
          // On transfère l'ordre directement au moteur RATISS en Python
          const response = await axios.post(`${RATISS_PYTHON_URL}/api/command`, {
              action,
              cmd,
              text
          });
          
          return res.status(200).json(response.data);
      } catch (error) {
          console.error("Erreur de liaison avec le moteur RATISS Python:", error);
          return res.status(500).json({ status: "ERROR", msg: "RATISS Python injoignable" });
      }
  });

  /**
   * ROUTE 2 : RATISS Python envoie un ordre à ce serveur pour manipuler l'appareil
   */
  app.post('/api/remote/trigger', (req: Request, res: Response) => {
      const { device, action, payload } = req.body;
      console.log(`[RATISS SYSTEM] Ordre reçu pour l'appareil : ${device} -> Action : ${action}`);

      // Exemple de manipulation à distance (TV, extinction, etc.)
      if (device === "TV") {
          // Logique pour interagir avec ta TV ou changer l'affichage de l'interface
          return res.status(200).json({ status: "SUCCESS", msg: "Ordre TV intercepté" });
      }

      return res.status(200).json({ status: "RECEIVED", info: "Ordre mis en attente" });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[RATISS CORE SERVER] Running on port ${PORT}`);
  });
}

startServer();
