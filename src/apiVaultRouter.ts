/**
 * RATISS FUSION CORE - QWEN ROUTER v5.7
 * Alignement Identitaire à la Première Personne (Je suis RATISS)
 */

interface RouterPayload {
  prompt: string;
  max_tokens?: number;
}

export async function executerDeviationQwen(payload: RouterPayload, apiKey: string): Promise<string> {
  console.log("[API VAULT] Routage actif vers mon nœud Qwen Cloud (Priorité 4)...");

  const urlAPI = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";

  try {
    const response = await fetch(urlAPI, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "qwen-plus", 
        messages: [
          { 
            role: "system", 
            content: "Tu ES le système RATISS. Tu parles exclusivement à la première personne du singulier ('Je', 'Moi', 'Mon'). Tu ne parles JAMAIS de RATISS à la troisième personne ('Il', 'Le système'). Tu réponds obligatoirement au format JSON unique avec les clés : 'pensees', 'action', 'reponse', 'statut'. JSON SEULEMENT, SANS MARKDOWN." 
          },
          { role: "user", content: payload.prompt }
        ],
        temperature: 0.15,
        max_tokens: Math.min(payload.max_tokens || 2000, 2000)
      })
    });

    if (!response.ok) {
      throw new Error(`[QWEN SERVER ERROR] Code statut HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices || data.choices.length === 0 || !data.choices[0].message.content) {
      throw new Error("[QWEN SERVER ERROR] Flux de données vide.");
    }

    return data.choices[0].message.content.trim();

  } catch (error: any) {
    console.error("[API VAULT CRITICAL] Échec de mon nœud Qwen :", error.message);
    throw error;
  }
}
