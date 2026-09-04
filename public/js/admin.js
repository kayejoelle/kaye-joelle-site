/* ==========================================================================
   ADMIN — tableau de bord. Protégé par Supabase Auth ; toutes les
   modifications sont écrites immédiatement dans Supabase (persistant,
   partagé par tous les visiteurs) et confirmées avant d'afficher "Enregistré".

   NOTE TECHNIQUE (v2) : tous les boutons dynamiques (modifier / supprimer /
   utiliser / aperçu) utilisent maintenant des attributs data-action / data-id
   + un écouteur d'événement délégué par liste, au lieu d'attributs onclick
   générés à la volée. C'est ce qui corrige les boutons qui ne répondaient
   plus (un mélange de guillemets dans le HTML généré cassait le onclick).
   ========================================================================== */

let adminState = {
  session: null,
  tab: "general",
  content: {},
  projects: [],
  videos: [],
  testimonials: [],
  collabs: [],
  media: [],
  editingProjectId: null,
  editingVideoId: null,
  editingTestimonialId: null,
  // cible en attente quand on ouvre la médiathèque depuis un "picker"
  mediaPickTarget: null,
};

/* ------------------------------------------------------------------ */
/* Ouverture / fermeture du panneau + garde d'authentification          */
/* ------------------------------------------------------------------ */

async function openAdmin() {
  document.getElementById("admin-panel").classList.remove("hidden");
  adminState.session = await Auth.getSession();
  if (!adminState.session) {
    renderLoginScreen();
  } else {
    await bootDashboard();
  }
}

function closeAdmin() {
  document.getElementById("admin-panel").classList.add("hidden");
}

Auth.onChange((session) => {
  adminState.session = session;
  const panelOpen = !document.getElementById("admin-panel").classList.contains("hidden");
  if (panelOpen && !session) renderLoginScreen();
});

function renderLoginScreen() {
  const drawer = document.getElementById("admin-drawer");
  drawer.innerHTML =
    '<div class="admin-head"><h3>Connexion</h3><button onclick="closeAdmin()" aria-label="Fermer">✕</button></div>' +
    '<form id="admin-login-form" class="admin-login-form">' +
      '<p class="admin-note">Connectez-vous pour gérer le contenu du site.</p>' +
      '<label class="admin-label">Email</label>' +
      '<input class="admin-input" type="email" id="login-email" required autocomplete="username">' +
      '<label class="admin-label">Mot de passe</label>' +
      '<input class="admin-input" type="password" id="login-password" required autocomplete="current-password">' +
      '<p id="login-error" class="admin-error hidden"></p>' +
      '<div class="form-buttons">' +
        '<button type="submit" class="btn-solid btn-small" id="login-submit-btn">Se connecter</button>' +
      '</div>' +
    '</form>';
  document.getElementById("admin-login-form").addEventListener("submit", handleLoginSubmit);
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const btn = document.getElementById("login-submit-btn");
  const errEl = document.getElementById("login-error");
  errEl.classList.add("hidden");
  btn.disabled = true; btn.textContent = "Connexion…";
  try {
    adminState.session = await Auth.signIn(email, password);
    await bootDashboard();
  } catch (err) {
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  } finally {
    btn.disabled = false; btn.textContent = "Se connecter";
  }
}

async function handleLogout() {
  await Auth.signOut();
  adminState.session = null;
  renderLoginScreen();
}

/* ------------------------------------------------------------------ */
/* Chargement du dashboard                                              */
/* ------------------------------------------------------------------ */

function dashboardShellHtml() {
  return document.getElementById("admin-dashboard-template").innerHTML;
}

async function bootDashboard() {
  const drawer = document.getElementById("admin-drawer");
  drawer.innerHTML = dashboardShellHtml();
  wireStaticAdminHandlers();
  bindProjectFormOnce();
  bindVideoFormOnce();
  bindTestimonialFormOnce();
  bindCollabFormOnce();
  bindMediaDropzoneOnce();
  document.getElementById("save-general-btn").addEventListener("click", saveSiteContent);
  await refreshAllAdminData();
  setAdminTab("general");
}

async function refreshAllAdminData() {
  try {
    const [content, projects, videos, testimonials, collabs, media] = await Promise.all([
      DB.getAllSiteContent(), DB.Projects.list(), DB.Videos.list(),
      DB.Testimonials.list(), DB.Collabs.list(), DB.listMedia(),
    ]);
    adminState.content = content;
    adminState.projects = projects;
    adminState.videos = videos;
    adminState.testimonials = testimonials;
    adminState.collabs = collabs;
    adminState.media = media;
    renderAllAdminTabs();
  } catch (err) {
    console.error(err);
    showAdminError("Impossible de charger les données du dashboard : " + err.message);
  }
}

/** Recharge uniquement une entité + son onglet (plus rapide qu'un refresh complet). */
async function refreshEntity(name) {
  if (name === "projects") { adminState.projects = await DB.Projects.list(); renderProjectsTab(); }
  else if (name === "videos") { adminState.videos = await DB.Videos.list(); renderVideosTab(); }
  else if (name === "testimonials") { adminState.testimonials = await DB.Testimonials.list(); renderTestimonialsTab(); }
  else if (name === "collabs") { adminState.collabs = await DB.Collabs.list(); renderCollabsTab(); }
  else if (name === "media") { adminState.media = await DB.listMedia(); renderMediaTab(); }
}

function renderAllAdminTabs() {
  renderGeneralTab();
  renderProjectsTab();
  renderMediaTab();
  renderVideosTab();
  renderTestimonialsTab();
  renderCollabsTab();
}

function wireStaticAdminHandlers() {
  document.getElementById("admin-logout-btn").addEventListener("click", handleLogout);
  document.querySelectorAll(".admin-tab").forEach((btn) => {
    btn.addEventListener("click", () => setAdminTab(btn.dataset.tab));
  });
}

function setAdminTab(tab) {
  adminState.tab = tab;
  document.querySelectorAll(".admin-tab").forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === tab));
  document.querySelectorAll(".admin-tab-panel").forEach((panel) => panel.classList.toggle("hidden", panel.dataset.tab !== tab));
}

/* ------------------------------------------------------------------ */
/* État visuel : chargement / succès / erreur sur un bouton              */
/* ------------------------------------------------------------------ */

function setBusy(btn, busyLabel) {
  if (!btn) return () => {};
  const original = btn.dataset.originalLabel || btn.textContent;
  btn.disabled = true;
  btn.dataset.originalLabel = original;
  btn.textContent = busyLabel || "Enregistrement…";
  return (finalLabel, isError) => {
    btn.disabled = false;
    btn.textContent = finalLabel || original;
    if (isError) { btn.classList.add("btn-error-flash"); setTimeout(() => btn.classList.remove("btn-error-flash"), 1200); }
  };
}

function showToast(message, isError) {
  let el = document.getElementById("admin-toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "admin-toast";
    document.getElementById("admin-drawer").appendChild(el);
  }
  el.textContent = message;
  el.className = "admin-toast" + (isError ? " admin-toast-error" : "") + " visible";
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("visible"), 3200);
}

function showAdminError(message) {
  const el = document.getElementById("upload-errors");
  if (!el) { alert(message); return; }
  el.textContent = message;
  el.classList.remove("hidden");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add("hidden"), 7000);
}

/* ------------------------------------------------------------------ */
/* Aperçu plein écran (réutilise la lightbox publique)                  */
/* ------------------------------------------------------------------ */

function previewMedia(url, isVideo, title) {
  if (!url) { showToast("Aucun fichier à prévisualiser pour cet élément.", true); return; }
  const lb = document.getElementById("lightbox");
  const media = document.getElementById("lightbox-media");
  const category = document.getElementById("lightbox-category");
  const titleEl = document.getElementById("lightbox-title");
  const desc = document.getElementById("lightbox-desc");
  const novideo = document.getElementById("lightbox-novideo");
  if (!lb || !media) return;

  category.textContent = "Aperçu (dashboard)";
  titleEl.textContent = title || "";
  desc.classList.add("hidden");
  novideo.classList.add("hidden");
  media.innerHTML = isVideo
    ? '<video src="' + escapeHtml(url) + '" controls autoplay playsinline></video>'
    : '<img src="' + escapeHtml(url) + '" alt="">';

  lb.classList.remove("hidden");
  lb.classList.add("admin-preview-open");
  document.body.style.overflow = "hidden";
}

/* ======================================================================
   ONGLET GÉNÉRAL — textes du site
   ====================================================================== */

const GENERAL_FIELD_IDS = [
  "heroEyebrow", "heroName", "heroTagline",
  "introEyebrow", "introHeading", "introBody",
  "videosEyebrow", "videosHeading",
  "statHeadline", "statBody", "statRole",
  "aboutQuote", "aboutBody1", "aboutBody2",
  "stat2Headline", "stat2Body", "stat2Role",
  "contactHeadline", "contactEmail", "contactInstagram",
  "footerName", "footerCopyright",
];

function renderGeneralTab() {
  const c = adminState.content;
  GENERAL_FIELD_IDS.forEach((key) => {
    const el = document.getElementById("draft-" + key);
    if (el) el.value = c[key] || "";
  });
  const statEnabled = document.getElementById("draft-statEnabled");
  if (statEnabled) statEnabled.checked = c.statEnabled !== "false";
  const stat2Enabled = document.getElementById("draft-stat2Enabled");
  if (stat2Enabled) stat2Enabled.checked = c.stat2Enabled !== "false";
  const introTall = document.getElementById("draft-introTall");
  if (introTall) introTall.checked = c.introTall === "true";

  renderMediaPicker("intro-image-picker", {
    imageValue: c.introImageUrl || "", videoValue: c.introVideoUrl || "",
    onImageChange: (url) => { adminState.content.introImageUrl = url; },
    onVideoChange: (url) => { adminState.content.introVideoUrl = url; },
    withVideo: true,
  });
  renderMediaPicker("about-image-picker", {
    imageValue: c.aboutImageUrl || "", videoValue: c.aboutVideoUrl || "",
    onImageChange: (url) => { adminState.content.aboutImageUrl = url; },
    onVideoChange: (url) => { adminState.content.aboutVideoUrl = url; },
    withVideo: true,
  });
}

async function saveSiteContent() {
  const btn = document.getElementById("save-general-btn");
  const done = setBusy(btn, "Enregistrement…");
  try {
    const entries = {};
    GENERAL_FIELD_IDS.forEach((key) => {
      const el = document.getElementById("draft-" + key);
      if (el) entries[key] = el.value;
    });
    entries.statEnabled = document.getElementById("draft-statEnabled").checked ? "true" : "false";
    entries.stat2Enabled = document.getElementById("draft-stat2Enabled").checked ? "true" : "false";
    entries.introTall = document.getElementById("draft-introTall").checked ? "true" : "false";
    entries.introImageUrl = adminState.content.introImageUrl || "";
    entries.introVideoUrl = adminState.content.introVideoUrl || "";
    entries.aboutImageUrl = adminState.content.aboutImageUrl || "";
    entries.aboutVideoUrl = adminState.content.aboutVideoUrl || "";

    await DB.saveSiteContent(entries);
    adminState.content = Object.assign({}, adminState.content, entries);
    done("✓ Enregistré");
    showToast("Textes du site enregistrés.");
  } catch (err) {
    console.error(err);
    done("Réessayer", true);
    showAdminError("Échec de l'enregistrement : " + err.message);
  }
}

function deleteStatBlock() {
  ["statHeadline", "statBody", "statRole"].forEach((k) => {
    const el = document.getElementById("draft-" + k);
    if (el) el.value = "";
  });
  showToast("Bloc vidé — cliquez sur « Enregistrer » pour confirmer.");
}
function deleteStat2Block() {
  ["stat2Headline", "stat2Body", "stat2Role"].forEach((k) => {
    const el = document.getElementById("draft-" + k);
    if (el) el.value = "";
  });
  showToast("Bloc vidé — cliquez sur « Enregistrer » pour confirmer.");
}

/* ======================================================================
   MÉDIA PICKER — composant réutilisable (upload / URL / médiathèque)
   ====================================================================== */

let pickerCounter = 0;

/**
 * options: { imageValue, videoValue, onImageChange, onVideoChange, withVideo }
 * Si withVideo=false, gère uniquement une image.
 */
function renderMediaPicker(containerId, options) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const uid = "picker" + (++pickerCounter);

  container.innerHTML =
    '<div class="dropzone compact" id="' + uid + '-dz">' +
      '<div>📤</div><p>Glissez une photo' + (options.withVideo ? ' (ou vidéo)' : '') + ' ici, ou cliquez</p>' +
      '<input type="file" accept="' + (options.withVideo ? 'image/*,video/*' : 'image/*') + '" id="' + uid + '-input">' +
    '</div>' +
    '<div class="picker-progress hidden" id="' + uid + '-progress"><div class="picker-progress-fill" style="width:0%"></div></div>' +
    '<p class="picker-or">— ou —</p>' +
    '<input class="admin-input" id="' + uid + '-url" placeholder="Coller une URL d\'image externe" value="' + escapeHtml(options.imageValue || "") + '">' +
    (options.withVideo
      ? '<input class="admin-input" id="' + uid + '-video-url" placeholder="Coller un lien vidéo direct (mp4…)" value="' + escapeHtml(options.videoValue || "") + '" style="margin-top:0.5rem;">'
      : '') +
    '<button type="button" class="picker-browse-link" id="' + uid + '-browse">Parcourir la médiathèque (' + adminState.media.length + ')</button>' +
    '<div class="picker-preview" id="' + uid + '-preview"></div>';

  renderPickerPreview(uid, options.imageValue, options.videoValue);

  const urlInput = document.getElementById(uid + "-url");
  urlInput.addEventListener("input", () => {
    options.onImageChange(urlInput.value.trim());
    renderPickerPreview(uid, urlInput.value.trim(), options.withVideo ? document.getElementById(uid + "-video-url").value.trim() : "");
  });

  if (options.withVideo) {
    const videoUrlInput = document.getElementById(uid + "-video-url");
    videoUrlInput.addEventListener("input", () => {
      options.onVideoChange(videoUrlInput.value.trim());
      renderPickerPreview(uid, urlInput.value.trim(), videoUrlInput.value.trim());
    });
  }

  document.getElementById(uid + "-browse").addEventListener("click", () => {
    openMediaPickerFromField(uid, !!options.withVideo);
  });

  wireDropzone(uid + "-dz", uid + "-input", async (files) => {
    const file = files[0];
    if (!file) return;
    const progressWrap = document.getElementById(uid + "-progress");
    const progressFill = progressWrap.querySelector(".picker-progress-fill");
    progressWrap.classList.remove("hidden");
    try {
      const result = await uploadToCloudinary(file, (pct) => { progressFill.style.width = pct + "%"; });
      await DB.addMediaFromUpload(result, file.name);
      adminState.media = await DB.listMedia();
      if (result.resourceType === "video" && options.withVideo) {
        document.getElementById(uid + "-video-url").value = result.url;
        options.onVideoChange(result.url);
      } else {
        urlInput.value = result.url;
        options.onImageChange(result.url);
      }
      renderPickerPreview(uid, urlInput.value, options.withVideo ? document.getElementById(uid + "-video-url").value : "");
      showToast("Fichier importé et enregistré.");
    } catch (err) {
      console.error(err);
      showAdminError(err.message);
    } finally {
      progressWrap.classList.add("hidden");
      progressFill.style.width = "0%";
    }
  });
}

function renderPickerPreview(uid, imageUrl, videoUrl) {
  const el = document.getElementById(uid + "-preview");
  if (!el) return;
  if (videoUrl) el.innerHTML = '<video src="' + escapeHtml(videoUrl) + '" muted loop autoplay playsinline></video>';
  else if (imageUrl) el.innerHTML = '<img src="' + escapeHtml(imageUrl) + '" alt="">';
  else el.innerHTML = "";
}

function wireDropzone(dzId, inputId, onFiles) {
  const dz = document.getElementById(dzId);
  const input = document.getElementById(inputId);
  if (!dz || !input) return;
  input.addEventListener("change", () => { if (input.files.length) onFiles(Array.from(input.files)); input.value = ""; });
  dz.addEventListener("click", (e) => { if (e.target !== input) input.click(); });
  ["dragenter", "dragover"].forEach((evt) => dz.addEventListener(evt, (e) => { e.preventDefault(); dz.classList.add("drag-over"); }));
  ["dragleave", "drop"].forEach((evt) => dz.addEventListener(evt, (e) => { e.preventDefault(); dz.classList.remove("drag-over"); }));
  dz.addEventListener("drop", (e) => {
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) onFiles(files);
  });
}

/** Ouvre l'onglet Médiathèque en mode "sélection" pour remplir un picker donné. */
function openMediaPickerFromField(pickerUid, withVideo) {
  adminState.mediaPickTarget = { pickerUid, withVideo };
  setAdminTab("media");
  showToast("Cliquez sur « Utiliser » sur un média pour le sélectionner.");
}

function useMediaInPendingTarget(mediaId) {
  const target = adminState.mediaPickTarget;
  const mediaItem = adminState.media.find((m) => m.id === mediaId);
  if (!mediaItem) return;
  if (!target) {
    // Pas de picker en attente : on copie simplement l'URL dans le presse-papiers si possible.
    showToast("Ouvrez d'abord « Parcourir la médiathèque » depuis un champ pour associer ce média.");
    return;
  }
  const isVideo = mediaItem.type === "video";
  let filledInput = null;
  if (isVideo && target.withVideo) {
    filledInput = document.getElementById(target.pickerUid + "-video-url");
  } else if (!isVideo) {
    filledInput = document.getElementById(target.pickerUid + "-url");
  } else {
    showToast("Ce champ n'accepte pas de vidéo.", true);
    return;
  }
  if (filledInput) {
    filledInput.value = mediaItem.url;
    filledInput.dispatchEvent(new Event("input"));
    const parentPanel = filledInput.closest(".admin-tab-panel[data-tab]");
    if (parentPanel) setAdminTab(parentPanel.dataset.tab);
  }
  adminState.mediaPickTarget = null;
  showToast("Média sélectionné.");
}

/* ======================================================================
   ONGLET PORTFOLIO (projects)
   ====================================================================== */

const PROJECT_CATEGORIES = ["Hôtels & Resorts", "Spas & Wellness", "Restaurants & Gastronomie", "Travel & Experiences", "Lifestyle"];

let projectDraftImageUrl = "";
let projectDraftVideoUrl = "";

function renderProjectsTab() {
  document.getElementById("project-category-select").innerHTML =
    PROJECT_CATEGORIES.map((c) => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join("");

  renderMediaPicker("project-image-picker", {
    imageValue: projectDraftImageUrl, videoValue: projectDraftVideoUrl, withVideo: true,
    onImageChange: (u) => { projectDraftImageUrl = u; },
    onVideoChange: (u) => { projectDraftVideoUrl = u; },
  });

  document.getElementById("projects-count").textContent = adminState.projects.length + " projet" + (adminState.projects.length > 1 ? "s" : "");
  const list = document.getElementById("projects-list");
  list.innerHTML = adminState.projects.map((p) =>
    '<div class="item-row" draggable="true" data-id="' + escapeHtml(p.id) + '">' +
      '<span class="drag-handle" title="Glisser pour réordonner">⠿</span>' +
      (p.image_url ? '<img class="item-row-thumb" src="' + escapeHtml(p.image_url) + '" alt="">' : '<div class="item-row-thumb no-poster">📷</div>') +
      '<div class="item-info"><p class="name">' + escapeHtml(p.title || "(Sans titre)") + '</p><p class="meta">' + escapeHtml(p.category || "") +
        (p.video_url ? ' <span class="badge">Vidéo</span>' : '') + '</p></div>' +
      '<button class="row-action" data-action="preview" data-id="' + escapeHtml(p.id) + '" aria-label="Aperçu">👁</button>' +
      '<button class="row-action" data-action="edit" data-id="' + escapeHtml(p.id) + '" aria-label="Modifier">✎</button>' +
      '<button class="row-action" data-action="delete" data-id="' + escapeHtml(p.id) + '" aria-label="Supprimer">🗑</button>' +
    '</div>'
  ).join("");

  list.addEventListener("click", handleProjectsListClick);
  makeDraggableList(list, async (orderedIds) => {
    try { await DB.Projects.reorder(orderedIds); adminState.projects = await DB.Projects.list(); showToast("Ordre mis à jour."); }
    catch (err) { showAdminError(err.message); await refreshEntity("projects"); }
  });
}

function handleProjectsListClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if (action === "edit") editProject(id);
  else if (action === "delete") deleteProject(id);
  else if (action === "preview") {
    const p = adminState.projects.find((x) => x.id === id);
    if (!p) return;
    if (p.video_url) previewMedia(p.video_url, true, p.title);
    else previewMedia(p.image_url, false, p.title);
  }
}

function bindProjectFormOnce() {
  const form = document.getElementById("project-form");
  if (!form || form._wired) return;
  form._wired = true;
  form.addEventListener("submit", handleProjectSubmit);
  document.getElementById("project-cancel-btn").addEventListener("click", resetProjectForm);
}

async function handleProjectSubmit(e) {
  e.preventDefault();
  const title = document.getElementById("project-title-input").value.trim();
  const category = document.getElementById("project-category-select").value;
  const description = document.getElementById("project-description-input").value.trim();
  const tall = document.getElementById("project-tall-checkbox").checked;
  const errEl = document.getElementById("project-form-error");
  errEl.classList.add("hidden");

  if (!title || !projectDraftImageUrl) {
    errEl.textContent = "Un titre et une image sont requis.";
    errEl.classList.remove("hidden");
    return;
  }

  const btn = document.getElementById("project-submit-btn");
  const done = setBusy(btn, adminState.editingProjectId ? "Modification…" : "Ajout…");
  try {
    const fields = { title, category, description, tall, image_url: projectDraftImageUrl, video_url: projectDraftVideoUrl };
    if (adminState.editingProjectId) {
      await DB.Projects.update(adminState.editingProjectId, fields);
    } else {
      fields.sort_order = adminState.projects.length;
      await DB.Projects.create(fields);
    }
    await refreshEntity("projects");
    resetProjectForm();
    done("✓ Fait");
    showToast("Projet enregistré.");
  } catch (err) {
    console.error(err);
    done(adminState.editingProjectId ? "Modifier" : "＋ Ajouter", true);
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  }
}

function editProject(id) {
  const p = adminState.projects.find((x) => x.id === id);
  if (!p) return;
  adminState.editingProjectId = id;
  document.getElementById("project-title-input").value = p.title || "";
  document.getElementById("project-category-select").value = p.category || "";
  document.getElementById("project-description-input").value = p.description || "";
  document.getElementById("project-tall-checkbox").checked = !!p.tall;
  projectDraftImageUrl = p.image_url || "";
  projectDraftVideoUrl = p.video_url || "";
  renderMediaPicker("project-image-picker", {
    imageValue: projectDraftImageUrl, videoValue: projectDraftVideoUrl, withVideo: true,
    onImageChange: (u) => { projectDraftImageUrl = u; },
    onVideoChange: (u) => { projectDraftVideoUrl = u; },
  });
  document.getElementById("project-form-title").textContent = "Modifier le projet";
  document.getElementById("project-submit-btn").textContent = "Modifier";
  document.getElementById("project-cancel-btn").classList.remove("hidden");
  document.getElementById("project-title-input").scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetProjectForm() {
  adminState.editingProjectId = null;
  document.getElementById("project-title-input").value = "";
  document.getElementById("project-description-input").value = "";
  document.getElementById("project-tall-checkbox").checked = false;
  projectDraftImageUrl = ""; projectDraftVideoUrl = "";
  renderMediaPicker("project-image-picker", {
    imageValue: "", videoValue: "", withVideo: true,
    onImageChange: (u) => { projectDraftImageUrl = u; },
    onVideoChange: (u) => { projectDraftVideoUrl = u; },
  });
  document.getElementById("project-form-title").textContent = "Ajouter un projet";
  document.getElementById("project-submit-btn").textContent = "＋ Ajouter";
  document.getElementById("project-cancel-btn").classList.add("hidden");
  document.getElementById("project-form-error").classList.add("hidden");
}

async function deleteProject(id) {
  if (!confirm("Supprimer ce projet du portfolio ? Cette action est définitive.")) return;
  try {
    await DB.Projects.remove(id);
    await refreshEntity("projects");
    if (adminState.editingProjectId === id) resetProjectForm();
    showToast("Projet supprimé.");
  } catch (err) {
    showAdminError(err.message);
  }
}

/* ======================================================================
   ONGLET MÉDIATHÈQUE
   ====================================================================== */

function renderMediaTab() {
  document.getElementById("tab-btn-media").textContent = "🖼 Médiathèque (" + adminState.media.length + ")";
  const grid = document.getElementById("media-grid");
  const empty = document.getElementById("media-empty");

  if (!adminState.media.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    grid.innerHTML = adminState.media.map((m) =>
      '<div class="media-thumb" draggable="true" data-id="' + escapeHtml(m.id) + '">' +
        (m.type === "video"
          ? '<video src="' + escapeHtml(m.url) + '" muted></video>'
          : '<img src="' + escapeHtml(m.url) + '" alt="' + escapeHtml(m.filename || "") + '">') +
        '<div class="media-overlay">' +
          '<button class="use-btn" data-action="use" data-id="' + escapeHtml(m.id) + '">Utiliser</button>' +
        '</div>' +
        '<button class="del-btn" data-action="delete" data-id="' + escapeHtml(m.id) + '" aria-label="Supprimer"><span style="color:white; font-size:11px;">🗑</span></button>' +
      '</div>'
    ).join("");

    grid.addEventListener("click", handleMediaGridClick);
    makeDraggableList(grid, async (orderedIds) => {
      try { await DB.reorderMedia(orderedIds); adminState.media = await DB.listMedia(); }
      catch (err) { showAdminError(err.message); await refreshEntity("media"); }
    });
  }
}

function handleMediaGridClick(e) {
  const btn = e.target.closest("[data-action]");
  if (btn) {
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === "use") useMediaInPendingTarget(id);
    else if (action === "delete") deleteMediaItem(id);
    return;
  }
  // clic sur la vignette elle-même (hors boutons) → aperçu
  const thumb = e.target.closest(".media-thumb");
  if (thumb) {
    const m = adminState.media.find((x) => x.id === thumb.dataset.id);
    if (m) previewMedia(m.url, m.type === "video", m.filename);
  }
}

function bindMediaDropzoneOnce() {
  wireDropzone("media-dropzone", "media-file-input", handleMediaUpload);
}

async function handleMediaUpload(files) {
  const uploadingEl = document.getElementById("media-uploading");
  uploadingEl.classList.remove("hidden");
  const errors = [];
  for (const file of files) {
    try {
      const result = await uploadToCloudinary(file);
      await DB.addMediaFromUpload(result, file.name);
    } catch (err) {
      errors.push(err.message);
    }
  }
  await refreshEntity("media");
  uploadingEl.classList.add("hidden");
  if (errors.length) showAdminError(errors.join(" "));
  else showToast(files.length > 1 ? "Fichiers importés." : "Fichier importé.");
}

async function deleteMediaItem(id) {
  if (!confirm("Supprimer ce média de la médiathèque ? (Le fichier restera sur Cloudinary mais ne sera plus proposé ici.)")) return;
  try {
    await DB.deleteMedia(id);
    await refreshEntity("media");
    showToast("Média supprimé de la médiathèque.");
  } catch (err) {
    showAdminError(err.message);
  }
}

/* ======================================================================
   ONGLET VIDÉOS (reel_videos)
   ====================================================================== */

let videoDraftPosterUrl = "";
let videoDraftVideoUrl = "";

function renderVideosTab() {
  document.getElementById("tab-btn-videos").textContent = "🎬 Vidéos (" + adminState.videos.length + ")";

  renderMediaPicker("video-poster-picker", {
    imageValue: videoDraftPosterUrl, withVideo: false,
    onImageChange: (u) => { videoDraftPosterUrl = u; },
  });
  renderVideoFilePicker();

  const list = document.getElementById("videos-list");
  list.innerHTML = adminState.videos.map((v) =>
    '<div class="item-row" draggable="true" data-id="' + escapeHtml(v.id) + '">' +
      '<span class="drag-handle" title="Glisser pour réordonner">⠿</span>' +
      (v.poster_url
        ? '<img class="item-row-thumb" src="' + escapeHtml(v.poster_url) + '" alt="">'
        : (v.video_url
            ? '<video class="item-row-thumb" src="' + escapeHtml(v.video_url) + '" muted></video>'
            : '<div class="item-row-thumb no-poster">🎬</div>')) +
      '<div class="item-info"><p class="name">' + escapeHtml(v.title || "(Sans titre)") + '</p>' +
        '<span class="badge">' + (v.video_url ? "Vidéo enregistrée" : "Aucune vidéo") + '</span></div>' +
      '<button class="row-action" data-action="preview" data-id="' + escapeHtml(v.id) + '" aria-label="Aperçu">👁</button>' +
      '<button class="row-action" data-action="edit" data-id="' + escapeHtml(v.id) + '" aria-label="Modifier">✎</button>' +
      '<button class="row-action" data-action="delete" data-id="' + escapeHtml(v.id) + '" aria-label="Supprimer">🗑</button>' +
    '</div>'
  ).join("");

  list.addEventListener("click", handleVideosListClick);
  makeDraggableList(list, async (orderedIds) => {
    try { await DB.Videos.reorder(orderedIds); adminState.videos = await DB.Videos.list(); showToast("Ordre mis à jour."); }
    catch (err) { showAdminError(err.message); await refreshEntity("videos"); }
  });
}

function handleVideosListClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if (action === "edit") editVideoItem(id);
  else if (action === "delete") deleteVideoItem(id);
  else if (action === "preview") {
    const v = adminState.videos.find((x) => x.id === id);
    if (!v) return;
    if (v.video_url) previewMedia(v.video_url, true, v.title);
    else if (v.poster_url) previewMedia(v.poster_url, false, v.title);
    else showToast("Aucun fichier à prévisualiser pour cette vidéo.", true);
  }
}

function renderVideoFilePicker() {
  const container = document.getElementById("video-file-picker");
  container.innerHTML =
    '<div class="dropzone compact" id="videoFileDz"><div>🎬</div><p>Glissez un fichier vidéo ici, ou cliquez</p><input type="file" accept="video/*" id="videoFileInput"></div>' +
    '<div class="picker-progress hidden" id="videoFileProgress"><div class="picker-progress-fill" style="width:0%"></div></div>' +
    '<p class="picker-or">— ou —</p>' +
    '<input class="admin-input" id="videoFileUrlInput" placeholder="Coller un lien vidéo direct (mp4, Vimeo…)" value="' + escapeHtml(videoDraftVideoUrl) + '">' +
    '<div class="picker-preview" id="videoFilePreview"></div>';

  renderVideoFilePreview();

  document.getElementById("videoFileUrlInput").addEventListener("input", (e) => {
    videoDraftVideoUrl = e.target.value.trim();
    renderVideoFilePreview();
  });
  wireDropzone("videoFileDz", "videoFileInput", async (files) => {
    const file = files[0];
    if (!file) return;
    const progressWrap = document.getElementById("videoFileProgress");
    const progressFill = progressWrap.querySelector(".picker-progress-fill");
    progressWrap.classList.remove("hidden");
    try {
      const result = await uploadToCloudinary(file, (pct) => { progressFill.style.width = pct + "%"; });
      await DB.addMediaFromUpload(result, file.name);
      adminState.media = await DB.listMedia();
      videoDraftVideoUrl = result.url;
      document.getElementById("videoFileUrlInput").value = result.url;
      renderVideoFilePreview();
      showToast("Vidéo importée.");
    } catch (err) {
      showAdminError(err.message);
    } finally {
      progressWrap.classList.add("hidden");
      progressFill.style.width = "0%";
    }
  });
}

function renderVideoFilePreview() {
  const el = document.getElementById("videoFilePreview");
  if (!el) return;
  el.innerHTML = videoDraftVideoUrl
    ? '<video src="' + escapeHtml(videoDraftVideoUrl) + '" muted loop autoplay playsinline></video>'
    : "";
}

function bindVideoFormOnce() {
  const form = document.getElementById("video-form");
  if (!form || form._wired) return;
  form._wired = true;
  form.addEventListener("submit", handleVideoSubmit);
  document.getElementById("video-cancel-btn").addEventListener("click", resetVideoForm);
}

async function handleVideoSubmit(e) {
  e.preventDefault();
  const title = document.getElementById("video-title-input").value.trim();
  const errEl = document.getElementById("video-form-error");
  errEl.classList.add("hidden");

  if (!videoDraftVideoUrl && !videoDraftPosterUrl) {
    errEl.textContent = "Ajoutez au moins une vidéo ou une image de couverture.";
    errEl.classList.remove("hidden");
    return;
  }

  const btn = document.getElementById("video-submit-btn");
  const done = setBusy(btn, adminState.editingVideoId ? "Modification…" : "Ajout…");
  try {
    const fields = { title, poster_url: videoDraftPosterUrl, video_url: videoDraftVideoUrl };
    if (adminState.editingVideoId) {
      await DB.Videos.update(adminState.editingVideoId, fields);
    } else {
      fields.sort_order = adminState.videos.length;
      await DB.Videos.create(fields);
    }
    await refreshEntity("videos");
    resetVideoForm();
    done("✓ Fait");
    showToast("Vidéo enregistrée.");
  } catch (err) {
    console.error(err);
    done(adminState.editingVideoId ? "Modifier" : "＋ Ajouter", true);
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  }
}

function editVideoItem(id) {
  const v = adminState.videos.find((x) => x.id === id);
  if (!v) return;
  adminState.editingVideoId = id;
  document.getElementById("video-title-input").value = v.title || "";
  videoDraftPosterUrl = v.poster_url || "";
  videoDraftVideoUrl = v.video_url || "";
  renderVideosTab();
  document.getElementById("video-form-title").textContent = "Modifier la vidéo";
  document.getElementById("video-submit-btn").textContent = "Modifier";
  document.getElementById("video-cancel-btn").classList.remove("hidden");
  document.getElementById("video-title-input").scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetVideoForm() {
  adminState.editingVideoId = null;
  document.getElementById("video-title-input").value = "";
  videoDraftPosterUrl = ""; videoDraftVideoUrl = "";
  renderVideosTab();
  document.getElementById("video-form-title").textContent = "Ajouter une vidéo";
  document.getElementById("video-submit-btn").textContent = "＋ Ajouter";
  document.getElementById("video-cancel-btn").classList.add("hidden");
  document.getElementById("video-form-error").classList.add("hidden");
}

async function deleteVideoItem(id) {
  if (!confirm("Supprimer cette vidéo ? Cette action est définitive.")) return;
  try {
    await DB.Videos.remove(id);
    await refreshEntity("videos");
    if (adminState.editingVideoId === id) resetVideoForm();
    showToast("Vidéo supprimée.");
  } catch (err) {
    showAdminError(err.message);
  }
}

/* ======================================================================
   ONGLET TÉMOIGNAGES
   ====================================================================== */

function bindTestimonialFormOnce() {
  const form = document.getElementById("testimonial-form");
  if (!form || form._wired) return;
  form._wired = true;
  form.addEventListener("submit", handleTestimonialSubmit);
  document.getElementById("testimonial-cancel-btn").addEventListener("click", resetTestimonialForm);
}

function renderTestimonialsTab() {
  document.getElementById("testimonials-count").textContent = adminState.testimonials.length + " témoignage" + (adminState.testimonials.length > 1 ? "s" : "");
  const list = document.getElementById("testimonials-list");
  list.innerHTML = adminState.testimonials.map((t) =>
    '<div class="item-row" style="align-items:flex-start;" draggable="true" data-id="' + escapeHtml(t.id) + '">' +
      '<span class="drag-handle" title="Glisser pour réordonner">⠿</span>' +
      '<div class="item-info"><p style="font-size:0.78rem; font-style:italic; opacity:0.8; margin:0;">« ' + escapeHtml(t.quote) + ' »</p>' +
        '<p class="meta" style="margin-top:4px;">' + escapeHtml([t.name, t.org].filter(Boolean).join(" — ")) + '</p></div>' +
      '<button class="row-action" data-action="edit" data-id="' + escapeHtml(t.id) + '" aria-label="Modifier">✎</button>' +
      '<button class="row-action" data-action="delete" data-id="' + escapeHtml(t.id) + '" aria-label="Supprimer">🗑</button>' +
    '</div>'
  ).join("");

  list.addEventListener("click", handleTestimonialsListClick);
  makeDraggableList(list, async (orderedIds) => {
    try { await DB.Testimonials.reorder(orderedIds); adminState.testimonials = await DB.Testimonials.list(); showToast("Ordre mis à jour."); }
    catch (err) { showAdminError(err.message); await refreshEntity("testimonials"); }
  });
}

function handleTestimonialsListClick(e) {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const action = btn.dataset.action;
  if (action === "edit") editTestimonialItem(id);
  else if (action === "delete") deleteTestimonialItem(id);
}

async function handleTestimonialSubmit(e) {
  e.preventDefault();
  const quote = document.getElementById("testimonial-quote-input").value.trim();
  const name = document.getElementById("testimonial-name-input").value.trim();
  const org = document.getElementById("testimonial-org-input").value.trim();
  const errEl = document.getElementById("testimonial-form-error");
  errEl.classList.add("hidden");
  if (!quote) { errEl.textContent = "La citation est requise."; errEl.classList.remove("hidden"); return; }

  const btn = document.getElementById("testimonial-submit-btn");
  const done = setBusy(btn, adminState.editingTestimonialId ? "Modification…" : "Ajout…");
  try {
    const fields = { quote, name, org };
    if (adminState.editingTestimonialId) {
      await DB.Testimonials.update(adminState.editingTestimonialId, fields);
    } else {
      fields.sort_order = adminState.testimonials.length;
      await DB.Testimonials.create(fields);
    }
    await refreshEntity("testimonials");
    resetTestimonialForm();
    done("✓ Fait");
    showToast("Témoignage enregistré.");
  } catch (err) {
    console.error(err);
    done(adminState.editingTestimonialId ? "Modifier" : "＋ Ajouter", true);
    errEl.textContent = err.message;
    errEl.classList.remove("hidden");
  }
}

function editTestimonialItem(id) {
  const t = adminState.testimonials.find((x) => x.id === id);
  if (!t) return;
  adminState.editingTestimonialId = id;
  document.getElementById("testimonial-quote-input").value = t.quote || "";
  document.getElementById("testimonial-name-input").value = t.name || "";
  document.getElementById("testimonial-org-input").value = t.org || "";
  document.getElementById("testimonial-form-title").textContent = "Modifier le témoignage";
  document.getElementById("testimonial-submit-btn").textContent = "Modifier";
  document.getElementById("testimonial-cancel-btn").classList.remove("hidden");
  document.getElementById("testimonial-quote-input").scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetTestimonialForm() {
  adminState.editingTestimonialId = null;
  document.getElementById("testimonial-quote-input").value = "";
  document.getElementById("testimonial-name-input").value = "";
  document.getElementById("testimonial-org-input").value = "";
  document.getElementById("testimonial-form-title").textContent = "Ajouter un témoignage";
  document.getElementById("testimonial-submit-btn").textContent = "＋ Ajouter";
  document.getElementById("testimonial-cancel-btn").classList.add("hidden");
  document.getElementById("testimonial-form-error").classList.add("hidden");
}

async function deleteTestimonialItem(id) {
  if (!confirm("Supprimer ce témoignage ?")) return;
  try {
    await DB.Testimonials.remove(id);
    await refreshEntity("testimonials");
    if (adminState.editingTestimonialId === id) resetTestimonialForm();
    showToast("Témoignage supprimé.");
  } catch (err) {
    showAdminError(err.message);
  }
}

/* ======================================================================
   ONGLET COLLABORATIONS
   ====================================================================== */

function bindCollabFormOnce() {
  const form = document.getElementById("collab-form");
  if (!form || form._wired) return;
  form._wired = true;
  form.addEventListener("submit", handleCollabSubmit);
  document.getElementById("collabs-enabled-checkbox").addEventListener("change", handleToggleCollabsEnabled);
}

function renderCollabsTab() {
  document.getElementById("collabs-enabled-checkbox").checked = adminState.content.collabsEnabled === "true";
  const wrap = document.getElementById("collabs-tags");
  const empty = document.getElementById("collabs-empty");
  if (!adminState.collabs.length) {
    wrap.innerHTML = "";
    empty.classList.remove("hidden");
  } else {
    empty.classList.add("hidden");
    wrap.innerHTML = adminState.collabs.map((c) =>
      '<span class="tag-pill" draggable="true" data-id="' + escapeHtml(c.id) + '">' + escapeHtml(c.name) +
      '<button type="button" data-action="remove" data-id="' + escapeHtml(c.id) + '" aria-label="Retirer ' + escapeHtml(c.name) + '">✕</button></span>'
    ).join("");

    wrap.addEventListener("click", handleCollabsTagsClick);
    makeDraggableList(wrap, async (orderedIds) => {
      try { await DB.Collabs.reorder(orderedIds); adminState.collabs = await DB.Collabs.list(); }
      catch (err) { showAdminError(err.message); await refreshEntity("collabs"); }
    }, { inline: true });
  }
}

function handleCollabsTagsClick(e) {
  const btn = e.target.closest("[data-action='remove']");
  if (!btn) return;
  removeCollabItem(btn.dataset.id);
}

async function handleCollabSubmit(e) {
  e.preventDefault();
  const input = document.getElementById("collab-name-input");
  const name = input.value.trim();
  if (!name) return;
  try {
    await DB.Collabs.create({ name, sort_order: adminState.collabs.length });
    await refreshEntity("collabs");
    input.value = "";
    showToast("Collaboration ajoutée.");
  } catch (err) {
    showAdminError(err.message);
  }
}

async function removeCollabItem(id) {
  try {
    await DB.Collabs.remove(id);
    await refreshEntity("collabs");
    showToast("Collaboration retirée.");
  } catch (err) {
    showAdminError(err.message);
  }
}

async function handleToggleCollabsEnabled(e) {
  const checked = e.target.checked;
  try {
    await DB.saveSiteContent({ collabsEnabled: checked ? "true" : "false" });
    adminState.content.collabsEnabled = checked ? "true" : "false";
    showToast("Préférence enregistrée.");
  } catch (err) {
    e.target.checked = !checked;
    showAdminError(err.message);
  }
}

/* ======================================================================
   DRAG & DROP — réordonnancement générique (listes verticales ou grilles)
   ====================================================================== */

function makeDraggableList(container, onReorder, opts) {
  if (!container) return;
  let draggingEl = null;

  container.querySelectorAll("[draggable=true]").forEach((el) => {
    el.addEventListener("dragstart", () => {
      draggingEl = el;
      setTimeout(() => el.classList.add("dragging"), 0);
    });
    el.addEventListener("dragend", () => {
      el.classList.remove("dragging");
      draggingEl = null;
      const orderedIds = Array.from(container.children).map((c) => c.dataset.id);
      onReorder(orderedIds);
    });
  });

  container.addEventListener("dragover", (e) => {
    e.preventDefault();
    if (!draggingEl) return;
    const after = getDragAfterElement(container, e.clientX, e.clientY, opts && opts.inline);
    if (after == null) container.appendChild(draggingEl);
    else container.insertBefore(draggingEl, after);
  });
}

function getDragAfterElement(container, x, y, inline) {
  const els = Array.from(container.querySelectorAll("[draggable=true]:not(.dragging)"));
  let closest = { offset: -Infinity, element: null };
  els.forEach((child) => {
    const box = child.getBoundingClientRect();
    const offset = inline
      ? x - box.left - box.width / 2
      : y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) closest = { offset, element: child };
  });
  return closest.element;
}

/* ------------------------------------------------------------------ */
/* Utilitaires                                                          */
/* ------------------------------------------------------------------ */

function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}