import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

// 1. Initialisation du client (lit les variables sécurisées de ton .env)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey || supabaseUrl.includes("your-supabase-project")) {
  console.error("\n[CRITICAL] Variables de connexion Supabase manquantes ou non configurées dans le fichier .env !");
  console.log("Veuillez renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY de votre projet Supabase.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testerMemoirePersistante() {
  console.log("[SYSTEM] Tentative d'authentification de l'architecte...");

  // 2. AUTHENTIFICATION : Connexion avec l'un des comptes créés dans ton onglet Auth Supabase
  // Remplacer avec les coordonnées de test configurées
  const emailTest = "ton-email-de-test@domaine.com";
  const passwordTest = "ton-mot-de-passe-securise";

  if (emailTest === "ton-email-de-test@domaine.com") {
    console.warn("\n[Avertissement] Vous utilisez les identifiants de test fictifs par défaut.");
    console.log("Pour une authentification réelle sur votre instance Supabase, veuillez éditer ce fichier et y inscrire un utilisateur existant.");
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: emailTest,
    password: passwordTest,
  });

  if (authError) {
    console.error("[ÉCHEC] Authentification rejetée par le bouclier :", authError.message);
    console.log("\nProse de secours active : Si vous ne souhaitez pas tester l'authentification formelle à ce stade,");
    console.log("vous pouvez tester l'insertion directe ou ajuster les règles RLS de 'ratiss_memory' pour le développement.");
    return;
  }

  const userId = authData.user.id;
  console.log(`[SUCCÈS] Authentifié avec succès ! ID Opérateur : ${userId}`);

  // 3. ÉCRITURE : Insertion d'un premier jalon de mémoire pour RATISS 4 Fusion
  console.log("[SYSTEM] Injection d'un nouveau bloc sémantique dans la mémoire...");
  const { error: insertError } = await supabase
    .from('ratiss_memory')
    .insert([
      {
        user_id: userId, // Impératif pour passer la règle RLS WITH CHECK
        titre: "Initialisation RATISS 4 Fusion",
        contenu: {
          statut_moteur: "OPERATIONAL",
          debit_voix_gilles: 0.85,
          modules_actifs: ["Front-React", "Server-Express", "Piper-Local"]
        },
        metadata: { source: "Gemini Studio", environnement: "Développement" }
      }
    ]);

  if (insertError) {
    console.error("[ÉCHEC RLS] Supabase a bloqué l'insertion :", insertError.message);
    return;
  }
  console.log("[SUCCÈS] Bloc sémantique enregistré et crypté par utilisateur.");

  // 4. LECTURE : Récupération des données pour vérifier que la RLS nous laisse lire
  console.log("[SYSTEM] Lecture de la mémoire persistante de l'utilisateur...");
  const { data: memoireRecuperee, error: selectError } = await supabase
    .from('ratiss_memory')
    .select('titre, contenu, created_at');

  if (selectError) {
    console.error("[ÉCHEC] Erreur de lecture :", selectError.message);
    return;
  }

  console.log("[RATISS MEMORY CLOUD RECOVERY] :", memoireRecuperee);
}

// Exécution du test
testerMemoirePersistante();
