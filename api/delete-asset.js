/* ==========================================================================
   /api/delete-asset — supprime DÉFINITIVEMENT un fichier sur Cloudinary.
   ==========================================================================
   Cette fonction tourne sur le serveur (Vercel), jamais dans le navigateur.
   C'est volontaire : supprimer un fichier Cloudinary nécessite la clé
   secrète du compte, qui ne doit JAMAIS être exposée côté client.

   Variables d'environnement requises (Vercel → Project Settings →
   Environment Variables) :
     SUPABASE_URL              (même valeur que dans public/js/config.js)
     SUPABASE_ANON_KEY          (même valeur que dans public/js/config.js)
     CLOUDINARY_CLOUD_NAME       (ex. "jkaye")
     CLOUDINARY_API_KEY           (Cloudinary → Settings → API Keys)
     CLOUDINARY_API_SECRET         (Cloudinary → Settings → API Keys — SECRET,
                                     à ne jamais mettre ailleurs que dans les
                                     variables d'environnement du serveur)
   ========================================================================== */

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée." });
    return;
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
  const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
  const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    res.status(500).json({
      error: "Configuration serveur incomplète : vérifiez les variables d'environnement Vercel " +
        "(SUPABASE_URL, SUPABASE_ANON_KEY, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).",
    });
    return;
  }

  try {
    // 1. Vérifie que la requête vient bien d'une personne connectée au dashboard.
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      res.status(401).json({ error: "Non authentifié." });
      return;
    }

    const userRes = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { Authorization: "Bearer " + token, apikey: SUPABASE_ANON_KEY },
    });
    if (!userRes.ok) {
      res.status(401).json({ error: "Session invalide ou expirée." });
      return;
    }

    // 2. Valide les paramètres.
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    const publicId = body && body.publicId;
    const resourceType = body && body.resourceType === "video" ? "video" : "image";
    if (!publicId || typeof publicId !== "string") {
      res.status(400).json({ error: "publicId manquant ou invalide." });
      return;
    }

    // 3. Supprime le fichier via l'API Admin Cloudinary (authentification HTTP
    //    Basic avec la clé + le secret — jamais accessible depuis le navigateur).
    const basicAuth = Buffer.from(CLOUDINARY_API_KEY + ":" + CLOUDINARY_API_SECRET).toString("base64");
    const cloudinaryUrl =
      "https://api.cloudinary.com/v1_1/" + encodeURIComponent(CLOUDINARY_CLOUD_NAME) +
      "/resources/" + encodeURIComponent(resourceType) +
      "/upload?public_ids[]=" + encodeURIComponent(publicId);

    const destroyRes = await fetch(cloudinaryUrl, {
      method: "DELETE",
      headers: { Authorization: "Basic " + basicAuth },
    });
    const destroyData = await destroyRes.json().catch(() => ({}));

    if (!destroyRes.ok) {
      res.status(502).json({ error: "Cloudinary a refusé la suppression.", details: destroyData });
      return;
    }

    res.status(200).json({ ok: true, result: destroyData });
  } catch (err) {
    console.error("delete-asset error:", err);
    res.status(500).json({ error: err.message || "Erreur serveur inattendue." });
  }
};