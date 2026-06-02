import React, { useState } from 'react';
import { supabase } from '../supabase';

interface SecurityPortalProps {
  onAuthSuccess: (userId: string) => void;
}

export const SecurityPortal: React.FC<SecurityPortalProps> = ({ onAuthSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'login' | 'about'>('login');
  const [isSignUp, setIsSignUp] = useState(false); // Gère la bascule Connexion / Inscription

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (isSignUp) {
        // --- MODE INSCRIPTION AUTOMATIQUE ---
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (data?.user) {
          setSuccessMessage("Compte opérateur créé ! Connectez-vous dès maintenant.");
          setIsSignUp(false); // Repasse automatiquement sur l'écran de connexion
        }
      } else {
        // --- MODE CONNEXION STANDARD ---
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        if (data?.user) {
          console.log("[PORTAL] Authentification validée. Clés RLS déverrouillées.");
          onAuthSuccess(data.user.id);
        }
      }
    } catch (err: any) {
      setError(err.message || "Échec de l'opération système.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 font-mono selection:bg-cyan-500 selection:text-slate-950">
      
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[550px]">
        
        {/* Panneau de Gauche : Menu */}
        <div className="md:col-span-4 bg-slate-950 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-3 h-3 rounded-full bg-cyan-500 animate-pulse"></span>
              <h1 className="text-xl font-bold tracking-wider text-cyan-400">RATISS v4</h1>
            </div>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-8">Fusion Architecture</p>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { setActiveTab('login'); setError(null); setSuccessMessage(null); }}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${
                  activeTab === 'login' 
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                🔒 {isSignUp ? "📝 Inscription Système" : "🔒 Terminal de Sécurité"}
              </button>
              <button
                onClick={() => setActiveTab('about')}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-all ${
                  activeTab === 'about' 
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700' 
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                🧠 À propos du Système
              </button>
            </div>
          </div>

          <div className="text-[10px] text-slate-600 border-t border-slate-900 pt-4">
            <p>Opérateur : Jonathan</p>
            <p>Statut Noyau : Sécurisé (RLS Actif)</p>
          </div>
        </div>

        {/* Panneau de Droite : Contenu Dynamique */}
        <div className="md:col-span-8 p-8 flex flex-col justify-center bg-slate-900/50">
          
          {activeTab === 'login' && (
            <div className="w-full max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-2 text-slate-100">
                {isSignUp ? "Création de Compte" : "Connexion Système"}
              </h2>
              <p className="text-xs text-slate-400 mb-6">
                {isSignUp 
                  ? "Enregistrez un nouvel identifiant pour générer vos accès PostgreSQL RLS." 
                  : "Entrez vos accès pour initialiser la liaison de données Supabase."}
              </p>

              {error && (
                <div className="bg-red-950/40 border border-red-800 text-red-400 px-4 py-3 rounded-lg text-xs mb-4">
                  ⚠️ {error}
                </div>
              )}

              {successMessage && (
                <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-400 px-4 py-3 rounded-lg text-xs mb-4">
                  ✅ {successMessage}
                </div>
              )}

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Adresse Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="architecte@ratiss.io"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 mb-1">Mot de passe</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="border-2 border-slate-950 border-t-transparent rounded-full w-4 h-4 animate-spin"></span>
                  ) : (
                    isSignUp ? "Générer les Accès Credential" : "Initialiser le Flux Matrix"
                  )}
                </button>
              </form>

              {/* Zone de Bascule Connexion / Inscription */}
              <div className="mt-6 text-center border-t border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-cyan-500 hover:text-cyan-400 underline decoration-dotted transition-colors"
                >
                  {isSignUp 
                    ? "Déjà un compte ? Se connecter au terminal" 
                    : "Pas encore de compte ? S'inscrire pour auto-créer les accès"}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="prose prose-invert max-w-none text-slate-300 space-y-4">
              <h2 className="text-2xl font-bold text-cyan-400 mb-2">À Propos de RATISS 4 Fusion</h2>
              <p className="text-sm leading-relaxed">
                <strong>RATISS</strong> est un environnement cognitif modulaire expérimental conçu pour optimiser la fiabilité applicative et éliminer les dérives sémantiques.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4 text-xs">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <h4 className="text-cyan-400 font-bold mb-1">🧠 Noyau Vectoriel 768D</h4>
                  <p className="text-slate-400">Persistance avancée des données et alignement des contextes.</p>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                  <h4 className="text-cyan-400 font-bold mb-1">🛡️ Sécurité Isolée</h4>
                  <p className="text-slate-400">Verrous RLS natifs via le tunnel PostgreSQL Supabase.</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
