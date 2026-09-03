/* ==========================================================================
   SITE — rendu public. Toutes les données viennent de Supabase (persistant,
   partagé par tous les visiteurs) au lieu du navigateur local.
   ========================================================================== */

const SERVICES = [
  { n: "01", title: "UGC Vidéos", desc: "Des contenus authentiques et soignés qui donnent vie à votre univers et créent une connexion naturelle avec votre audience." },
  { n: "02", title: "Reels & TikTok", desc: "Des formats courts, dynamiques et esthétiques conçus pour capter l’attention et développer votre visibilité organique." },
  { n: "03", title: "Photographie Lifestyle", desc: "Des images éditoriales qui valorisent vos espaces, vos produits et vos expériences sur vos différents supports de communication." },
  { n: "04", title: "Contenu Hôtelier", desc: "Chambres, suites, espaces communs et architecture capturés avec élégance pour révéler l’atmosphère et l’identité de votre établissement." },
  { n: "05", title: "Contenu Spa & Wellness", desc: "Des contenus sensoriels qui mettent en lumière les textures, les gestes, les rituels et l’atmosphère propres à votre univers bien-être." },
  { n: "06", title: "Travel Content", desc: "Des récits visuels immersifs qui capturent l’essence d’une destination et donnent envie de découvrir l’expérience." },
  { n: "07", title: "Storytelling de Marque", desc: "Des contenus pensés comme de véritables récits pour exprimer votre identité, renforcer votre image de marque et créer un univers cohérent." },
];

let siteState = {
  content: {},
  projects: [],
  videos: [],
  testimonials: [],
  collabs: [],
  activeCategory: "Tous",
  testimonialIdx: 0,
};

let testimonialTimer = null;

/* ------------------------------------------------------------------ */
/* Boot                                                                 */
/* ------------------------------------------------------------------ */

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  initLightboxDismiss();
  loadAndRenderAll();
});

async function loadAndRenderAll() {
  try {
    const [content, projects, videos, testimonials, collabs] = await Promise.all([
      DB.getAllSiteContent(),
      DB.Projects.list(),
      DB.Videos.list(),
      DB.Testimonials.list(),
      DB.Collabs.list(),
    ]);
    siteState.content = content;
    siteState.projects = projects;
    siteState.videos = videos;
    siteState.testimonials = testimonials;
    siteState.collabs = collabs;

    renderSiteContent();
    renderPortfolioFilters();
    renderPortfolioGrid();
    renderVideosGrid();
    renderServices();
    renderTestimonials();
    renderCollabs();
    initReveals(document);
    document.body.classList.add("content-ready");
  } catch (err) {
    console.error(err);
    showGlobalError("Le contenu n'a pas pu être chargé. Vérifiez votre connexion et réessayez.");
  }
}

function showGlobalError(msg) {
  let el = document.getElementById("global-error-banner");
  if (!el) {
    el = document.createElement("div");
    el.id = "global-error-banner";
    el.className = "global-error-banner";
    document.body.prepend(el);
  }
  el.textContent = msg;
}

/* ------------------------------------------------------------------ */
/* Nav / scroll / reveal                                                */
/* ------------------------------------------------------------------ */

function scrollToId(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  closeMobileMenu();
}

function initNav() {
  const toggle = document.getElementById("nav-toggle-btn");
  if (toggle) toggle.addEventListener("click", () => {
    document.getElementById("mobile-menu").classList.toggle("hidden");
  });
}

function closeMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  if (menu) menu.classList.add("hidden");
}

function initReveals(root) {
  const items = root.querySelectorAll(".reveal:not(.visible)");
  if (!("IntersectionObserver" in window)) {
    items.forEach((el) => el.classList.add("visible"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  items.forEach((el) => observer.observe(el));
}

/* ------------------------------------------------------------------ */
/* Texte du site                                                        */
/* ------------------------------------------------------------------ */

function txt(key, fallback) {
  const v = siteState.content[key];
  return (v === undefined || v === null || v === "") ? (fallback || "") : v;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderSiteContent() {
  const c = siteState.content;

  setText("hero-eyebrow", txt("heroEyebrow"));
  setText("hero-name", txt("heroName"));
  setText("hero-tagline", txt("heroTagline"));
  setText("nav-brand-btn", txt("heroName"));

  setText("intro-eyebrow", txt("introEyebrow"));
  setText("intro-heading", txt("introHeading"));
  setText("intro-body", txt("introBody"));
  renderIntroMedia();

  setText("videos-eyebrow", txt("videosEyebrow"));
  setText("videos-heading", txt("videosHeading"));

  const statSection = document.getElementById("stat-section-el");
  const statEnabled = txt("statEnabled") !== "false";
  if (statSection) statSection.classList.toggle("hidden", !statEnabled);
  setText("stat-headline", txt("statHeadline"));
  setText("stat-body", txt("statBody"));
  setText("stat-attribution", txt("heroName") + (txt("statRole") ? " · " + txt("statRole") : " · "));

  setText("about-quote", txt("aboutQuote"));
  setText("about-body1", txt("aboutBody1"));
  setText("about-body2", txt("aboutBody2"));
  renderAboutMedia();

  const stat2Section = document.getElementById("stat2-section-el");
  const stat2Enabled = txt("stat2Enabled") !== "false";
  if (stat2Section) stat2Section.classList.toggle("hidden", !stat2Enabled);
  setText("stat2-headline", txt("stat2Headline"));
  setText("stat2-body", txt("stat2Body"));
  setText("stat2-attribution", txt("heroName") + (txt("stat2Role") ? " · " + txt("stat2Role") : " · "));

  setText("contact-headline", txt("contactHeadline"));
  setText("contact-email-text", txt("contactEmail"));
  const emailLink = document.getElementById("contact-email-link");
  if (emailLink) emailLink.href = "mailto:" + txt("contactEmail");
  const igLink = document.getElementById("contact-instagram-link");
  const igText = txt("contactInstagram");
  if (igLink) {
    igLink.classList.toggle("hidden", !igText);
    igLink.href = igText ? ("https://instagram.com/" + igText.replace(/^@/, "")) : "#";
  }
  setText("contact-instagram-text", igText);

  setText("footer-name", txt("footerName"));
  setText("footer-copyright", txt("footerCopyright"));

  document.title = txt("heroName") + (txt("heroEyebrow") ? " - " + txt("heroEyebrow") : "");
}

function renderIntroMedia() {
  const wrap = document.getElementById("intro-media-wrap");
  if (!wrap) return;
  const videoUrl = txt("introVideoUrl");
  const imageUrl = txt("introImageUrl");
  const tall = txt("introTall") === "true";
  const ratio = tall ? "3/4" : "1/1";
  if (videoUrl) {
    wrap.innerHTML = '<video src="' + escapeHtml(videoUrl) + '" style="aspect-ratio:' + ratio + '" autoplay muted loop playsinline></video>';
  } else if (imageUrl) {
    wrap.innerHTML = '<img src="' + escapeHtml(imageUrl) + '" alt="" style="aspect-ratio:' + ratio + '">';
  } else {
    wrap.innerHTML = '<div class="no-poster" style="aspect-ratio:' + ratio + '">📷</div>';
  }
}

function renderAboutMedia() {
  const wrap = document.getElementById("about-media-wrap");
  if (!wrap) return;
  const videoUrl = txt("aboutVideoUrl");
  const imageUrl = txt("aboutImageUrl");
  if (videoUrl) {
    wrap.innerHTML =
      '<video id="about-video-el" src="' + escapeHtml(videoUrl) + '" autoplay muted loop playsinline></video>' +
      '<button type="button" class="media-sound-toggle" id="about-sound-toggle" onclick="toggleAboutVideoSound()" aria-label="Activer le son">🔇</button>';
  } else if (imageUrl) {
    wrap.innerHTML = '<img src="' + escapeHtml(imageUrl) + '" alt="">';
  } else {
    wrap.innerHTML = '<div class="no-poster">📷</div>';
  }
}

function toggleAboutVideoSound() {
  const video = document.getElementById("about-video-el");
  const btn = document.getElementById("about-sound-toggle");
  if (!video) return;
  video.muted = !video.muted;
  if (btn) btn.textContent = video.muted ? "🔇" : "🔊";
}

/* ------------------------------------------------------------------ */
/* Portfolio                                                            */
/* ------------------------------------------------------------------ */

function portfolioCategories() {
  const set = new Set(siteState.projects.map((p) => p.category).filter(Boolean));
  return Array.from(set);
}

function renderPortfolioFilters() {
  const row = document.getElementById("portfolio-filters");
  if (!row) return;
  const cats = ["Tous"].concat(portfolioCategories());
  row.innerHTML = cats.map((cat) =>
    '<button class="pill' + (siteState.activeCategory === cat ? " active" : "") + '" onclick="setActiveCategory(' + JSON.stringify(cat) + ')">' + escapeHtml(cat) + '</button>'
  ).join("");
}

function setActiveCategory(cat) {
  siteState.activeCategory = cat;
  renderPortfolioFilters();
  renderPortfolioGrid();
}

function renderPortfolioGrid() {
  const grid = document.getElementById("portfolio-grid");
  if (!grid) return;
  const items = siteState.projects.filter((p) => siteState.activeCategory === "Tous" || p.category === siteState.activeCategory);
  grid.innerHTML = items.map((p, i) =>
    '<button class="masonry-item reveal" style="transition-delay:' + ((i % 3) * 100) + 'ms" onclick="openLightbox(\'project\',' + i + ')">' +
      '<img src="' + escapeHtml(p.image_url || "") + '" alt="' + escapeHtml(p.title || "") + '" style="aspect-ratio:' + (p.tall ? "3/4" : "4/3") + '">' +
      '<div class="masonry-overlay"><p class="eyebrow">' + escapeHtml(p.category || "") + '</p><p class="title">' + escapeHtml(p.title || "") + '</p></div>' +
    '</button>'
  ).join("");
  window._currentPortfolioItems = items;
  initReveals(grid);
}

/* ------------------------------------------------------------------ */
/* Vidéos verticales                                                    */
/* ------------------------------------------------------------------ */

function renderVideosGrid() {
  const grid = document.getElementById("videos-grid");
  if (!grid) return;
  grid.innerHTML = siteState.videos.map((v, i) =>
    '<button class="video-card reveal" style="transition-delay:' + ((i % 4) * 100) + 'ms" onclick="openLightbox(\'reel\',' + i + ')">' +
      '<div class="phone-frame">' +
        (v.poster_url
          ? '<img src="' + escapeHtml(v.poster_url) + '" alt="' + escapeHtml(v.title || "") + '">'
          : '<div class="no-poster">🎬</div>') +
        '<div class="phone-play-overlay"><div class="phone-play-btn">▶</div></div>' +
      '</div>' +
      '<p>' + escapeHtml(v.title || "") + '</p>' +
    '</button>'
  ).join("");
  initReveals(grid);
}

/* ------------------------------------------------------------------ */
/* Services (liste statique — non éditable depuis le dashboard)         */
/* ------------------------------------------------------------------ */

function renderServices() {
  const list = document.getElementById("services-list");
  if (!list) return;
  list.innerHTML = SERVICES.map((s, i) =>
    '<div class="service-row hairline reveal" style="transition-delay:' + ((i % 4) * 80) + 'ms">' +
      '<span class="service-n font-display">' + s.n + '</span>' +
      '<h3 class="service-title">' + escapeHtml(s.title) + '</h3>' +
      '<p class="service-desc">' + escapeHtml(s.desc) + '</p>' +
    '</div>'
  ).join("");
  initReveals(list);
}

/* ------------------------------------------------------------------ */
/* Témoignages                                                          */
/* ------------------------------------------------------------------ */

function renderTestimonials() {
  const list = siteState.testimonials;
  const quoteEl = document.getElementById("testimonial-quote");
  const metaEl = document.getElementById("testimonial-meta");
  const dotsEl = document.getElementById("testimonial-dots");
  const section = document.getElementById("testimonials-section");
  if (!quoteEl) return;

  if (!list.length) {
    if (section) section.classList.add("hidden");
    return;
  }
  if (section) section.classList.remove("hidden");

  if (siteState.testimonialIdx >= list.length) siteState.testimonialIdx = 0;
  const t = list[siteState.testimonialIdx];
  quoteEl.textContent = t.quote;
  metaEl.textContent = [t.name, t.org].filter(Boolean).join(" — ");
  if (dotsEl) {
    dotsEl.innerHTML = list.map((_, i) => '<span class="' + (i === siteState.testimonialIdx ? "active" : "") + '"></span>').join("");
  }

  if (testimonialTimer) clearInterval(testimonialTimer);
  if (list.length > 1) {
    testimonialTimer = setInterval(() => shiftTestimonial(1), 7000);
  }
}

function shiftTestimonial(dir) {
  const len = siteState.testimonials.length;
  if (!len) return;
  siteState.testimonialIdx = (siteState.testimonialIdx + dir + len) % len;
  renderTestimonials();
}

/* ------------------------------------------------------------------ */
/* Collaborations (bandeau défilant)                                    */
/* ------------------------------------------------------------------ */

function renderCollabs() {
  const section = document.getElementById("collabs-section");
  const track = document.getElementById("collabs-marquee");
  const enabled = txt("collabsEnabled") !== "false";
  if (!section || !track) return;
  if (!enabled || !siteState.collabs.length) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  const names = siteState.collabs.map((c) => '<span>' + escapeHtml(c.name) + '</span>');
  track.innerHTML = names.concat(names).join(""); // dupliqué pour un défilement continu
}

/* ------------------------------------------------------------------ */
/* Lightbox                                                             */
/* ------------------------------------------------------------------ */

function initLightboxDismiss() {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });
}

function openLightbox(kind, index) {
  const lb = document.getElementById("lightbox");
  const media = document.getElementById("lightbox-media");
  const category = document.getElementById("lightbox-category");
  const title = document.getElementById("lightbox-title");
  const desc = document.getElementById("lightbox-desc");
  const novideo = document.getElementById("lightbox-novideo");
  if (!lb || !media) return;

  if (kind === "project") {
    const p = (window._currentPortfolioItems || siteState.projects)[index];
    if (!p) return;
    category.textContent = p.category || "";
    title.textContent = p.title || "";
    if (p.description) { desc.textContent = p.description; desc.classList.remove("hidden"); } else { desc.classList.add("hidden"); }
    if (p.video_url) {
      media.innerHTML = '<video src="' + escapeHtml(p.video_url) + '" controls autoplay playsinline></video>';
      novideo.classList.add("hidden");
    } else {
      media.innerHTML = '<img src="' + escapeHtml(p.image_url || "") + '" alt="' + escapeHtml(p.title || "") + '">';
      novideo.classList.remove("hidden");
    }
  } else if (kind === "reel") {
    const v = siteState.videos[index];
    if (!v) return;
    category.textContent = "";
    title.textContent = v.title || "";
    desc.classList.add("hidden");
    if (v.video_url) {
      media.innerHTML = '<video src="' + escapeHtml(v.video_url) + '" controls autoplay playsinline></video>';
      novideo.classList.add("hidden");
    } else if (v.poster_url) {
      media.innerHTML = '<img src="' + escapeHtml(v.poster_url) + '" alt="">';
      novideo.classList.remove("hidden");
    }
  }

  lb.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  const lb = document.getElementById("lightbox");
  const media = document.getElementById("lightbox-media");
  if (!lb) return;
  lb.classList.add("hidden");
  if (media) media.innerHTML = ""; // stoppe la lecture vidéo
  document.body.style.overflow = "";
}

/* ------------------------------------------------------------------ */
/* Formulaire de contact                                                */
/* ------------------------------------------------------------------ */

async function handleContactSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const inputs = form.querySelectorAll("input, textarea");
  const [nameEl, emailEl, companyEl, messageEl] = inputs;
  const submitBtn = form.querySelector("button[type=submit]");
  const originalLabel = submitBtn ? submitBtn.textContent : "";

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Envoi…"; }
  try {
    await DB.sendContactMessage({
      name: nameEl.value.trim(),
      email: emailEl.value.trim(),
      company: companyEl.value.trim(),
      message: messageEl.value.trim(),
    });
    form.reset();
    form.classList.add("hidden");
    document.getElementById("contact-success").classList.remove("hidden");
  } catch (err) {
    console.error(err);
    alert("Le message n'a pas pu être envoyé. Merci de réessayer dans un instant.");
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalLabel; }
  }
}

/* ------------------------------------------------------------------ */
/* Utilitaires                                                          */
/* ------------------------------------------------------------------ */

function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
