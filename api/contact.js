/* ==========================================================================
   /api/contact — point d'entrée UNIQUE et sécurisé pour le formulaire de
   contact. Remplace l'ancien schéma (insertion directe depuis le navigateur
   + fonction d'email séparée) par un seul passage côté serveur.

   ==========================================================================
   PROTECTIONS MISES EN PLACE :

   1. Honeypot : un champ caché ("website") que seuls les robots remplissent.
      Si rempli, on répond succès sans rien faire (on ne prévient pas le bot).
   2. Validation stricte de chaque champ (présence, longueur, format email).
   3. Sanitisation : toute balise HTML/script est retirée de chaque champ
      AVANT stockage en base et AVANT insertion dans l'email — impossible
      d'injecter du code exécutable (XSS) via le formulaire.
   4. Aucune injection SQL possible : on n'écrit jamais de SQL brut, toutes
      les requêtes passent par l'API REST de Supabase (PostgREST), qui
      paramètre nativement chaque valeur.
   5. Limitation de fréquence (anti-spam) : on consulte l'historique des
      messages déjà enregistrés pour la même adresse IP ou le même email
      sur les 10 dernières minutes ; au-delà de 3 messages, la requête est
      refusée (429).
   6. Écriture en base réservée au serveur : utilise la clé secrète
      "service_role" (jamais exposée au navigateur), après que la policy
      RLS d'insertion publique a été retirée (voir
      supabase/secure_contact_messages.sql). Un bot ne peut donc plus
      écrire dans la table en contournant ce fichier.

   Variables d'environnement requises (Vercel → Project Settings →
   Environment Variables) :
     SUPABASE_URL                (déjà utilisée par /api/delete-asset)
     SUPABASE_SERVICE_ROLE_KEY    (NOUVELLE — Supabase → Settings → API →
                                    section "service_role", clé SECRÈTE,
                                    à ne JAMAIS mettre dans le code public)
     RESEND_API_KEY                (déjà utilisée précédemment)
     CONTACT_TO_EMAIL               (optionnel, sinon kayejoelle.pro@gmail.com)
   ========================================================================== */

const MAX_MESSAGES_PER_WINDOW = 3;
const RATE_LIMIT_WINDOW_MINUTES = 10;

function getClientIp(req) {
  const fwd = req.headers["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return (req.socket && req.socket.remoteAddress) || "unknown";
}

/** Retire toute balise HTML/script et les caractères de contrôle dangereux. */
function sanitizeText(input, maxLength) {
  let value = String(input == null ? "" : input);
  // Retire les octets nuls et caractères de contrôle (sauf saut de ligne/tabulation).
  value = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  // Retire TOUTES les balises HTML (donc <script>, <img onerror=...>, etc. disparaissent).
  value = value.replace(/<[^>]*>/g, "");
  // Neutralise les protocoles potentiellement exécutables restants (ex: "javascript:").
  value = value.replace(/javascript\s*:/gi, "");
  value = value.trim();
  if (maxLength && value.length > maxLength) value = value.slice(0, maxLength);
  return value;
}

function isValidEmail(email) {
  // Volontairement simple et strict : suffisant pour rejeter les formats invalides
  // sans faux positifs excessifs sur des adresses légitimes.
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(email) && email.length <= 254;
}

function escapeHtmlForEmail(str) {
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const TO_EMAIL = process.env.CONTACT_TO_EMAIL || "kayejoelle.pro@gmail.com";

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
    res.status(500).json({
      error: "Configuration serveur incomplète (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY ou RESEND_API_KEY manquant).",
    });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    // ---- 1. Honeypot -----------------------------------------------------
    // Champ caché côté site, invisible et inatteignable pour un humain.
    // Un bot qui remplit tous les champs automatiquement le remplira aussi.
    const honeypot = (body.website || "").toString().trim();
    if (honeypot) {
      // On répond succès sans rien faire, pour ne pas indiquer au bot qu'il a été détecté.
      res.status(200).json({ ok: true });
      return;
    }

    // ---- 2. Validation + 3. Sanitisation ----------------------------------
    const name = sanitizeText(body.name, 200);
    const email = sanitizeText(body.email, 254);
    const company = sanitizeText(body.company, 200);
    const message = sanitizeText(body.message, 5000);

    if (name.length < 2) { res.status(400).json({ error: "Le nom est requis (2 caractères minimum)." }); return; }
    if (!isValidEmail(email)) { res.status(400).json({ error: "Adresse email invalide." }); return; }
    if (message.length < 10) { res.status(400).json({ error: "Le message est trop court (10 caractères minimum)." }); return; }

    const ip = getClientIp(req);
    const userAgent = sanitizeText(req.headers["user-agent"] || "", 300);

    // ---- 5. Limitation de fréquence (anti-spam) ---------------------------
    const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000).toISOString();
    const filter =
      "or=(" + "ip_address.eq." + encodeURIComponent(ip) + ",email.eq." + encodeURIComponent(email) + ")" +
      "&created_at=gte." + encodeURIComponent(windowStart) +
      "&select=id&limit=" + (MAX_MESSAGES_PER_WINDOW + 1);

    const rateCheckRes = await fetch(SUPABASE_URL + "/rest/v1/contact_messages?" + filter, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    if (rateCheckRes.ok) {
      const recent = await rateCheckRes.json().catch(() => []);
      if (Array.isArray(recent) && recent.length >= MAX_MESSAGES_PER_WINDOW) {
        res.status(429).json({ error: "Trop de messages envoyés récemment. Merci de réessayer dans quelques minutes." });
        return;
      }
    }
    // Si la vérification anti-spam échoue techniquement, on ne bloque pas
    // l'envoi légitime pour autant — on continue normalement.

    // ---- 4. & 6. Écriture en base (paramétrée, via service_role) ----------
    const insertRes = await fetch(SUPABASE_URL + "/rest/v1/contact_messages", {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: "Bearer " + SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        name, email, company, message,
        ip_address: ip, user_agent: userAgent,
      }),
    });

    if (!insertRes.ok) {
      const details = await insertRes.json().catch(() => ({}));
      console.error("contact_messages insert failed:", details);
      res.status(502).json({ error: "Le message n'a pas pu être enregistré." });
      return;
    }

    // ---- Notification email (best-effort, ne bloque pas la réponse) -------
    try {
      const htmlBody =
        '<div style="font-family: sans-serif; font-size: 15px; color: #241812;">' +
        '<h2 style="margin-bottom: 4px;">Nouveau message depuis le site</h2>' +
        '<p><strong>Nom :</strong> ' + escapeHtmlForEmail(name) + '</p>' +
        '<p><strong>Email :</strong> ' + escapeHtmlForEmail(email) + '</p>' +
        (company ? '<p><strong>Établissement / Marque :</strong> ' + escapeHtmlForEmail(company) + '</p>' : '') +
        '<p><strong>Message :</strong></p>' +
        '<p style="white-space: pre-wrap; border-left: 3px solid #B9975B; padding-left: 12px;">' + escapeHtmlForEmail(message) + '</p>' +
        '</div>';

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + RESEND_API_KEY },
        body: JSON.stringify({
          from: "Site Kaye Joëlle Creator <onboarding@resend.dev>",
          to: [TO_EMAIL],
          reply_to: email,
          subject: "Nouveau message de " + name + (company ? " (" + company + ")" : ""),
          html: htmlBody,
        }),
      });
    } catch (emailErr) {
      console.warn("Email de notification non envoyé :", emailErr);
      // Le message est déjà enregistré en base ; on ne fait pas échouer la requête pour autant.
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("contact endpoint error:", err);
    res.status(500).json({ error: "Erreur serveur inattendue." });
  }
};