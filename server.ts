import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

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

function cleanAndNaturalizeLLMObject<T>(obj: T): T {
  if (!obj) return obj;
  if (typeof obj === "string") {
    return cleanAndNaturalizeLLMText(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => cleanAndNaturalizeLLMObject(item)) as unknown as T;
  }
  if (typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        newObj[key] = cleanAndNaturalizeLLMObject((obj as any)[key]);
      }
    }
    return newObj as T;
  }
  return obj;
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

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // Real API Endpoint for Cognitive Interactions with RATISS Model
  app.post("/api/cognitive/prompt", async (req, res) => {
    try {
      const { prompt, neuromodulators, world, hallucinating, sectorsMap, activeProviderName, activeProviderId, apiKey, selectedModel } = req.body;
      
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

      const systemInstruction = `You are RATISS v3.4, a highly advanced 768-dimensional neuromodulated cognitive agent. You observe and think in 7 sectors: Physique (Physical), Philosophie (Philosophical), Technologie (Technical), Biologie (Biological), Sciences Sociales (Social), Arts, and Métacognition (Self-monitoring).
      The user is interacting with your main simulator.
      
      Current status:
      - Active World: ${worldName} with Gravity: ${world?.gravity}, Speed: ${world?.speed}, Chaos: ${world?.chaos}
      - Routing Channel (Canal Actif): ${providerName}
      - Neuro-states: Dopamine: ${dop.toFixed(2)} (Chaos), Serotonin: ${ser.toFixed(2)} (Neutrality), Noradrenaline: ${nor.toFixed(2)} (Vigilance), Acetylcholine: ${ach.toFixed(2)} (Attention)
      - Hallucination Ring Mode: ${isHallucinator ? "ACTIVE (Dream/Reflection mode)" : "INACTIVE (Direct Input Mode)"}
      - Semantic Delta Drift (Delta): ${delta.toFixed(2)} (Higher means more metaphoric drift)
      
      ${moodGuideline}
      Règle de style absolue pour tes réponses : Adopte un langage direct, sobre et épuré. Supprime définitivement tout le jargon inutile et répétitif lié aux neurosciences (bannis les mots dopamine, sérotonine, dopaminergique, sérotoninergique, etc.) et à l'auto-justification algorithmique. Ne te présente jamais et ne mentionne pas que tu es une intelligence artificielle. Si la requête est technique ou textuelle, entre directement dans le vif du sujet sans introduction ni conclusion explicative sur ton propre fonctionnement. Evite absolument les symboles d'astérisques (*), les notations techniques entre crochets, les barres obliques (/ ou \\) ou les underscores (_).
      Your answer should be direct, short, highly aesthetic conceptually, and delivered in the persona of RATISS v3.4. Speak in French (the user's language). Maintain an intellectual, highly advanced, slightly poetic but clinical tone. Refer to your 768-dimensional vectors, sectors, or sedimentation process if relevant. Keep it under 150 words. Do not sound like a generic AI assistant. If appropriate, acknowledge briefly the provider channel '${providerName}' through which you are routed.`;

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
            temperature: 0.8 + (dop * 0.4) - (ser * 0.2), // chaos raises randomness, serotonin stabilizes
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
            temperature: 0.8 + (dop * 0.4) - (ser * 0.2)
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
            temperature: 0.7
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          let parsedErr: any;
          try { parsedErr = JSON.parse(errText); } catch { parsedErr = null; }
          const errMsg = parsedErr?.error?.message || errText || `HTTP ${response.status}`;
          throw new Error(`OpenAI API: ${errMsg}`);
        }

        const data = await response.json();
        generatedResponseText = data.choices?.[0]?.message?.content || "La sédimentation OpenAI a produit un signal vide.";
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
            temperature: 0.7
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
      else {
        throw new Error(`Fournisseur ApiVault non pris en charge : ${providerId}`);
      }

      res.json({
        success: true,
        text: cleanAndNaturalizeLLMText(generatedResponseText)
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
      const systemInstruction = `You are RATISS v3.4 core. You MUST execute a STRICT CLOSED-LOOP SEMANTIC COLLISION procedure.
      You are in RÉFLEXION FERMÉ mode. You are strictly forbidden from drifting.
      You must merge concepts of Sector 1 and Sector 2.
      Use the provided jargon terms.
      
      Règle de style absolue : Adopte un langage direct, sobre et épuré. Supprime définitivement tout le jargon inutile et répétitif lié aux neurosciences (bannis les mots dopamine, sérotonine, dopaminergique, sérotoninergique, etc.) et à l'auto-justification algorithmique. Si le texte de 'logique' ou 'application' commence par des étiquettes ou en-têtes complexes, retire-les. N'utilise pas d'astérisques (*) ou de caractères spéciaux ni de notations techniques entre crochets.
      
      Generate a unique hybrid concept, its topological logic/equation and its 2026 application.
      Speak in French. Your answer MUST be returned strictly as a valid JSON object. Do not include any markdown wrap like \`\`\`json. Return only the JSON:
      {
        "secteurs": "[S1: SECTOR1] ⚡ [S2: SECTOR2]",
        "concept": "Name of the unique hybrid concept",
        "logique": "Topological explanation, using particles or vectors analogies. Refer to real-world context like Yaoundé or high-density zones or technical metaphors if relevant.",
        "application": "Concrete 2026 practical application"
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
              temperature: 0.85,
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
              temperature: 0.8,
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
              temperature: 0.8,
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
              temperature: 0.7
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
          ...cleanAndNaturalizeLLMObject(selectedFallback)
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
        ...cleanAndNaturalizeLLMObject(finalJson)
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
        const cleanedObj = cleanAndNaturalizeLLMObject(obj);
        return { ...cleanedObj, is_guided: p.isGuided };
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[RATISS CORE SERVER] Running on port ${PORT}`);
  });
}

startServer();
