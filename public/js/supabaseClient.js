/* ==========================================================================
   SUPABASE CLIENT — instance unique partagée par site.js et admin.js
   ========================================================================== */

(function () {
  const cfg = window.APP_CONFIG || {};
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf("VOTRE-PROJET") !== -1) {
    console.warn(
      "[config] Supabase n'est pas configuré : ouvrez public/js/config.js et " +
      "renseignez SUPABASE_URL / SUPABASE_ANON_KEY (voir README.md)."
    );
  }
  window.supabaseClient = window.supabase.createClient(
    cfg.SUPABASE_URL,
    cfg.SUPABASE_ANON_KEY,
    { auth: { persistSession: true, autoRefreshToken: true } }
  );
})();
