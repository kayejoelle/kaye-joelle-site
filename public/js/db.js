/* ==========================================================================
   DB — couche d'accès aux données (Supabase). Toutes les fonctions
   retournent une Promise, lancent une erreur explicite en cas d'échec, et
   renvoient les lignes réellement écrites (confirmation de persistance)
   plutôt que de supposer que ça a fonctionné.
   ========================================================================== */

const DB = (function () {
  function client() { return window.supabaseClient; }

  function throwIfError(error, context) {
    if (error) {
      console.error(context, error);
      throw new Error((context ? context + " — " : "") + (error.message || "Erreur inconnue."));
    }
  }

  /* ------------------------------------------------------------------ */
  /* site_content                                                        */
  /* ------------------------------------------------------------------ */

  async function getAllSiteContent() {
    const { data, error } = await client().from("site_content").select("key, value");
    throwIfError(error, "Chargement des textes du site");
    const map = {};
    (data || []).forEach((row) => { map[row.key] = row.value; });
    return map;
  }

  /** entries: { key: value, ... } — upsert en une seule requête */
  async function saveSiteContent(entries) {
    const rows = Object.keys(entries).map((key) => ({ key, value: String(entries[key] ?? "") }));
    if (!rows.length) return [];
    const { data, error } = await client().from("site_content").upsert(rows, { onConflict: "key" }).select();
    throwIfError(error, "Enregistrement des textes du site");
    if (!data || data.length !== rows.length) {
      throw new Error("Enregistrement incomplet : merci de réessayer.");
    }
    return data;
  }

  /* ------------------------------------------------------------------ */
  /* Générique : fabrique les fonctions CRUD + réordonnancement pour une  */
  /* table simple (projects, reel_videos, testimonials, collaborations)  */
  /* ------------------------------------------------------------------ */

  function makeOrderedTableApi(table, label) {
    return {
      async list() {
        const { data, error } = await client().from(table).select("*").order("sort_order", { ascending: true });
        throwIfError(error, "Chargement — " + label);
        return data || [];
      },

      async create(fields) {
        const { data, error } = await client().from(table).insert(fields).select().single();
        throwIfError(error, "Ajout — " + label);
        if (!data) throw new Error("L'ajout n'a pas pu être confirmé (" + label + ").");
        return data;
      },

      async update(id, fields) {
        const { data, error } = await client().from(table).update(fields).eq("id", id).select().single();
        throwIfError(error, "Modification — " + label);
        if (!data) throw new Error("La modification n'a pas pu être confirmée (" + label + ").");
        return data;
      },

      async remove(id) {
        const { error } = await client().from(table).delete().eq("id", id);
        throwIfError(error, "Suppression — " + label);
        return true;
      },

      /** orderedIds: tableau d'ids dans le nouvel ordre souhaité */
      async reorder(orderedIds) {
        const updates = orderedIds.map((id, index) =>
          client().from(table).update({ sort_order: index }).eq("id", id)
        );
        const results = await Promise.all(updates);
        const failed = results.find((r) => r.error);
        if (failed) throwIfError(failed.error, "Réorganisation — " + label);
        return true;
      },
    };
  }

  const Projects = makeOrderedTableApi("projects", "portfolio");
  const Videos = makeOrderedTableApi("reel_videos", "vidéos verticales");
  const Testimonials = makeOrderedTableApi("testimonials", "témoignages");
  const Collabs = makeOrderedTableApi("collaborations", "collaborations");

  /* ------------------------------------------------------------------ */
  /* media_library                                                       */
  /* ------------------------------------------------------------------ */

  async function listMedia() {
    const { data, error } = await client().from("media_library").select("*").order("sort_order", { ascending: true });
    throwIfError(error, "Chargement de la médiathèque");
    return data || [];
  }

  /** Insère un média ; si le public_id existe déjà (même fichier), renvoie l'existant sans doublon. */
  async function addMediaFromUpload(uploadResult, filename) {
    const { data: existing, error: findErr } = await client()
      .from("media_library").select("*").eq("public_id", uploadResult.publicId).maybeSingle();
    throwIfError(findErr, "Vérification de doublon — médiathèque");
    if (existing) return existing;

    const { count } = await client().from("media_library").select("id", { count: "exact", head: true });

    const { data, error } = await client().from("media_library").insert({
      type: uploadResult.resourceType === "video" ? "video" : "image",
      url: uploadResult.url,
      public_id: uploadResult.publicId,
      filename: filename || "",
      bytes: uploadResult.bytes || 0,
      width: uploadResult.width || null,
      height: uploadResult.height || null,
      sort_order: count || 0,
    }).select().single();
    throwIfError(error, "Ajout à la médiathèque");
    if (!data) throw new Error("L'ajout à la médiathèque n'a pas pu être confirmé.");
    return data;
  }

  async function deleteMedia(id) {
    const { error } = await client().from("media_library").delete().eq("id", id);
    throwIfError(error, "Suppression — médiathèque");
    return true;
  }

  async function reorderMedia(orderedIds) {
    const updates = orderedIds.map((id, index) =>
      client().from("media_library").update({ sort_order: index }).eq("id", id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r) => r.error);
    if (failed) throwIfError(failed.error, "Réorganisation — médiathèque");
    return true;
  }

  /* ------------------------------------------------------------------ */
  /* contact_messages                                                     */
  /* ------------------------------------------------------------------ */

  async function sendContactMessage(fields) {
    const { data, error } = await client().from("contact_messages").insert(fields).select().single();
    throwIfError(error, "Envoi du message");
    if (!data) throw new Error("L'envoi n'a pas pu être confirmé.");
    return data;
  }

  async function listContactMessages() {
    const { data, error } = await client().from("contact_messages").select("*").order("created_at", { ascending: false });
    throwIfError(error, "Chargement des messages");
    return data || [];
  }

  async function markMessageRead(id, read) {
    const { error } = await client().from("contact_messages").update({ read }).eq("id", id);
    throwIfError(error, "Mise à jour du message");
    return true;
  }

  return {
    getAllSiteContent, saveSiteContent,
    Projects, Videos, Testimonials, Collabs,
    listMedia, addMediaFromUpload, deleteMedia, reorderMedia,
    sendContactMessage, listContactMessages, markMessageRead,
  };
})();

window.DB = DB;
