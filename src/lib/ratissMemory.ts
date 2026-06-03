import { supabase } from '../supabase';

export interface RatissMessage {
  id?: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

/**
 * Récupère l'historique récent des échanges depuis la table ratiss_memory.
 * Les messages sont retournés dans l'ordre chronologique (du plus ancien au plus récent).
 */
export async function recupererContexteChronologique(sessionId: string, limiteMessages: number = 20): Promise<RatissMessage[]> {
  try {
    const response = await fetch(`/api/ratiss/get-messages?sessionId=${encodeURIComponent(sessionId)}&limiteMessages=${limiteMessages}`);
    
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    
    const data = await response.json();
    return data.messages as RatissMessage[];
  } catch (error) {
    console.error('⚠️ Erreur récupération mémoire:', error);
    return [];
  }
}

/**
 * Enregistre un nouveau message dans la table ratiss_memory.
 */
export async function sauvegarderMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<boolean> {
  try {
    const response = await fetch('/api/ratiss/save-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, role, content }),
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        console.error('⚠️ Échec de la sauvegarde du message (détail):', errorData);
        throw new Error('Network response was not ok');
    }
    
    return true;
  } catch (error) {
    console.error('⚠️ Échec de la sauvegarde du message:', error);
    return false;
  }
}
