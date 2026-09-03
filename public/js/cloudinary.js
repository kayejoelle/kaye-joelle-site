/* ==========================================================================
   CLOUDINARY — upload direct depuis le navigateur (preset non signé)
   ==========================================================================
   Le dashboard admin est déjà protégé par une connexion Supabase Auth, donc
   un upload non signé (sans clé secrète exposée) est un compromis
   raisonnable ici : seules les personnes connectées atteignent ce code.
   ========================================================================== */

/**
 * Upload un fichier (image ou vidéo) vers Cloudinary.
 * @param {File} file
 * @param {(percent:number)=>void} [onProgress]
 * @returns {Promise<{url:string, publicId:string, resourceType:string, bytes:number, format:string, width:number|null, height:number|null}>}
 */
function uploadToCloudinary(file, onProgress) {
  const cfg = window.APP_CONFIG || {};
  const cloud = cfg.CLOUDINARY_CLOUD_NAME;
  const preset = cfg.CLOUDINARY_UPLOAD_PRESET;

  if (!cloud || !preset || preset.indexOf("VOTRE_PRESET") !== -1) {
    return Promise.reject(new Error(
      "Cloudinary n'est pas configuré (public/js/config.js) — voir README.md."
    ));
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    return Promise.reject(new Error(file.name + " : type de fichier non pris en charge (image ou vidéo uniquement)."));
  }

  const endpoint = "https://api.cloudinary.com/v1_1/" + cloud + "/auto/upload";

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", preset);
  // Permet de retrouver facilement les fichiers dans la médiathèque Cloudinary
  form.append("folder", "kaye-joelle-site");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);

    xhr.upload.onprogress = (evt) => {
      if (onProgress && evt.lengthComputable) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };

    xhr.onload = () => {
      let data;
      try { data = JSON.parse(xhr.responseText); } catch (e) { data = null; }

      if (xhr.status >= 200 && xhr.status < 300 && data && data.secure_url) {
        resolve({
          url: data.secure_url,
          publicId: data.public_id,
          resourceType: data.resource_type,
          bytes: data.bytes || file.size,
          format: data.format || "",
          width: data.width || null,
          height: data.height || null,
        });
      } else {
        const msg = (data && data.error && data.error.message) || ("Échec de l'upload (" + xhr.status + ").");
        reject(new Error(file.name + " : " + msg));
      }
    };

    xhr.onerror = () => reject(new Error(file.name + " : erreur réseau pendant l'upload."));
    xhr.send(form);
  });
}

window.uploadToCloudinary = uploadToCloudinary;
