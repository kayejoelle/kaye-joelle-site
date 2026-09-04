/* ==========================================================================
   /api/send-contact-email — envoie un email de notification à chaque
   message reçu via le formulaire de contact du site.
   ==========================================================================
   Utilise Resend (resend.com) : offre gratuite largement suffisante pour un
   formulaire de contact (100 emails/jour). Fonctionne dès la création du
   compte, sans configuration de domaine — Resend fournit une adresse
   d'envoi de test (onboarding@resend.dev) utilisable immédiatement pour
   ENVOYER des notifications (vous pourrez brancher un domaine plus tard
   si vous voulez une adresse d'expéditeur personnalisée).

   Variables d'environnement requises (Vercel → Project Settings →
   Environment Variables) :
     RESEND_API_KEY     (Resend → API Keys → créer une clé)
     CONTACT_TO_EMAIL     (optionnel — sinon kayejoelle.pro@gmail.com par défaut)
   ========================================================================== */

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const TO_EMAIL = process.env.CONTACT_TO_EMAIL || "kayejoelle.pro@gmail.com";

  if (!RESEND_API_KEY) {
    res.status(500).json({ error: "Configuration serveur incomplète : variable RESEND_API_KEY manquante." });
    return;
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    const name = (body && body.name || "").toString().trim().slice(0, 200);
    const email = (body && body.email || "").toString().trim().slice(0, 200);
    const company = (body && body.company || "").toString().trim().slice(0, 200);
    const message = (body && body.message || "").toString().trim().slice(0, 5000);

    if (!name || !email || !message) {
      res.status(400).json({ error: "Nom, email et message sont requis." });
      return;
    }

    const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const htmlBody =
      '<div style="font-family: sans-serif; font-size: 15px; color: #241812;">' +
      '<h2 style="margin-bottom: 4px;">Nouveau message depuis le site</h2>' +
      '<p><strong>Nom :</strong> ' + escapeHtml(name) + '</p>' +
      '<p><strong>Email :</strong> ' + escapeHtml(email) + '</p>' +
      (company ? '<p><strong>Établissement / Marque :</strong> ' + escapeHtml(company) + '</p>' : '') +
      '<p><strong>Message :</strong></p>' +
      '<p style="white-space: pre-wrap; border-left: 3px solid #B9975B; padding-left: 12px;">' + escapeHtml(message) + '</p>' +
      '</div>';

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: "Site Kaye Joëlle Creator <onboarding@resend.dev>",
        to: [TO_EMAIL],
        reply_to: email,
        subject: "Nouveau message de " + name + (company ? " (" + company + ")" : ""),
        html: htmlBody,
      }),
    });

    const resendData = await resendRes.json().catch(() => ({}));
    if (!resendRes.ok) {
      res.status(502).json({ error: "Resend a refusé l'envoi.", details: resendData });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("send-contact-email error:", err);
    res.status(500).json({ error: err.message || "Erreur serveur inattendue." });
  }
};