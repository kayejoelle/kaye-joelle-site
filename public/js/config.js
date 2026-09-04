/* ==========================================================================
   CONFIGURATION — à remplir avant déploiement
   ==========================================================================
   Toutes ces valeurs sont conçues pour être publiques (elles sont visibles
   dans le code source du navigateur, c'est normal et sans danger) :
     - la clé Supabase "anon" est protégée par les policies RLS définies
       dans supabase/schema.sql (lecture publique, écriture réservée aux
       comptes connectés) ;
     - le "upload preset" Cloudinary non signé n'autorise que l'upload,
       jamais la suppression ni la lecture de votre compte.
   Ne mettez JAMAIS ici : une clé "service_role" Supabase, ni une API
   Secret Cloudinary. Ces deux-là ne doivent exister que côté serveur.
   ========================================================================== */

window.APP_CONFIG = {
  // Dashboard Supabase → Project Settings → API
  SUPABASE_URL: "https://elunxpuovczmjqrgjxfk.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_DTeCfF_1CByMfYGlqIcyYQ_3IiD_7b3",

  // Dashboard Cloudinary → Settings → Upload → Upload presets (mode "Unsigned")
  CLOUDINARY_CLOUD_NAME: "jkaye",
  CLOUDINARY_UPLOAD_PRESET: "VOTRE_PRESET_NON_SIGNE",
};
