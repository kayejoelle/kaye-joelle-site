/* ==========================================================================
   SHARED — fonctions utilitaires communes au site public ET au tableau de
   bord. Ce fichier doit être chargé AVANT site.js et AVANT admin.js sur
   toute page qui les utilise (les deux pages du projet le font).
   ========================================================================== */

function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * N'autorise que les URLs http(s) (ou les data: URI d'image, inoffensives)
 * comme source d'image/vidéo. Bloque explicitement javascript:, data:text/html
 * et autres schémas potentiellement exécutables, quelle que soit leur origine
 * (protection en profondeur, en plus de l'échappement HTML systématique).
 */
function isSafeMediaUrl(url) {
  if (!url) return false;
  const trimmed = String(url).trim();
  if (/^https:\/\//i.test(trimmed)) return true;
  if (/^http:\/\//i.test(trimmed)) return true;
  if (/^data:image\//i.test(trimmed)) return true;
  return false;
}

/**
 * Insère des paramètres de transformation Cloudinary (format automatique,
 * qualité automatique, largeur plafonnée) dans une URL Cloudinary, pour ne
 * jamais charger une image/vidéo plus lourde que nécessaire à l'affichage.
 * Les URLs qui ne viennent pas de Cloudinary (lien externe collé à la main)
 * sont retournées telles quelles, sans y toucher. Rejette (chaîne vide)
 * toute URL dont le schéma n'est pas sûr (voir isSafeMediaUrl).
 */
function cldOptimize(url, width) {
  if (!isSafeMediaUrl(url)) return "";
  if (url.indexOf("res.cloudinary.com") === -1) return url;
  if (url.indexOf("/upload/f_auto") !== -1) return url; // déjà optimisée
  const params = "f_auto,q_auto,c_limit,w_" + (width || 1200);
  return url.replace("/upload/", "/upload/" + params + "/");
}

/**
 * Ferme la visionneuse plein écran (#lightbox). Utilisée à la fois par le
 * site public (portfolio, vidéos) et par l'aperçu média du tableau de bord.
 */
function closeLightbox() {
  const lb = document.getElementById("lightbox");
  const media = document.getElementById("lightbox-media");
  if (!lb) return;
  lb.classList.add("hidden");
  lb.classList.remove("admin-preview-open");
  if (media) media.innerHTML = ""; // stoppe la lecture vidéo
  document.body.style.overflow = "";
}