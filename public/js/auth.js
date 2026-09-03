/* ==========================================================================
   AUTH — connexion / déconnexion du dashboard via Supabase Auth
   ========================================================================== */

const Auth = (function () {
  function client() { return window.supabaseClient; }

  async function getSession() {
    const { data, error } = await client().auth.getSession();
    if (error) { console.error(error); return null; }
    return data.session || null;
  }

  async function signIn(email, password) {
    const { data, error } = await client().auth.signInWithPassword({ email, password });
    if (error) throw new Error(translateAuthError(error));
    return data.session;
  }

  async function signOut() {
    const { error } = await client().auth.signOut();
    if (error) throw new Error(error.message);
  }

  function onChange(callback) {
    client().auth.onAuthStateChange((_event, session) => callback(session));
  }

  function translateAuthError(error) {
    const msg = (error && error.message) || "";
    if (/invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect.";
    if (/email not confirmed/i.test(msg)) return "Ce compte doit d'abord être confirmé (voir vos emails).";
    return msg || "Connexion impossible.";
  }

  return { getSession, signIn, signOut, onChange };
})();

window.Auth = Auth;
