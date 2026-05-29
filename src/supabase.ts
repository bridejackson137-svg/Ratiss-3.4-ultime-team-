import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-supabase-project.supabase.co');

// Initialize only if keys are present
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!isSupabaseConfigured) {
  console.log(
    '%c[RATISS SYSTEM INFO] Supabase non configuré. Le simulateur v3.4 utilise son moteur local de sédimentation synaptique et sa simulation temps-réel bio-oscillatoire par défaut.',
    'color: #818cf8; font-weight: bold; background: #0c0a09; padding: 4px; border-radius: 4px;'
  );
} else {
  console.log(
    '%c[RATISS SUPABASE CONNECTED] Connexion temps-réel Supabase initialisée pour RATISS v3.4.',
    'color: #10b981; font-weight: bold; background: #0c0a09; padding: 4px; border-radius: 4px;'
  );
}
