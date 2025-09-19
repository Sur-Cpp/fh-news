// js/factions.js - Full replacement
const DATA_PATH = "../groups/factions.json";
const $ = (sel, ctx = document) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx = document) =>
  Array.from((ctx || document).querySelectorAll(sel));
const escapeHtml = (s) =>
  s == null
    ? ""
    : String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

function normalizeType(t) {
  if (!t) return "community";
  t = String(t).toLowerCase();
  if (["site", "web", "website"].includes(t)) return "site";
  if (["server", "servers"].includes(t)) return "site";
  if (["community", "communities"].includes(t)) return "community";
  if (
    [
      "faction",
      "factions",
      "trade",
      "military",
      "research",
      "exploration",
      "diplomatic",
    ].includes(t)
  )
    return "faction";
  return "community";
}

async function fetchFactions() {
  try {
    const r = await fetch(DATA_PATH, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const data = await r.json();
    if (!Array.isArray(data)) throw new Error("Invalid JSON");
    return data.map((d) => ({
      id: d.id,
      name: d.name,
      owner: d.owner || "",
      type: normalizeType(d.type),
      originalType: d.type || "",
      logo: d.logo || "",
      banner: d.banner || d.logo || "",
      // IMPORTANT: additional images should be stored in `images`. Do NOT fallback to banner here.
      images: Array.isArray(d.images) && d.images.length ? d.images : [],
      description: d.description || "",
      members: Number(d.members || 0),
      founded: d.founded || "",
      tags: Array.isArray(d.tags) ? d.tags : [],
      invite: d.invite || "",
      server_id: d.server_id || d.serverId || d.server || "",
      verified: !!d.verified,
    }));
  } catch (e) {
    console.error("fetchFactions:", e);
    return null;
  }
}

function buildTags(tags = []) {
  return (tags || [])
    .map((t) => `<span class="faction-tag">${escapeHtml(t)}</span>`)
    .join(" ");
}

/* prefer showing original textual type if present */
function typeLabel(originalType, normalizedType) {
  if (originalType && String(originalType).trim() !== "")
    return escapeHtml(originalType);
  const t = String(normalizedType || "").toLowerCase();
  if (t === "site") return "Site";
  if (t === "faction") return "Faction";
  return "Community";
}

/* helper: discord owner chip markup */
function discordChipHtml(owner) {
  const ownerText = escapeHtml(owner || "—");
  return `<span class="discord-chip" title="Discord: ${ownerText}"><i class="fab fa-discord" aria-hidden="true"></i><span class="discord-username">${ownerText}</span></span>`;
}

/* small type chip for cards */
function typeChipSmallHtml(originalType, normalizedType) {
  return `<span class="type-chip type-chip--small">${typeLabel(
    originalType,
    normalizedType
  )}</span>`;
}

/* --- Grid / Card --- */
function createCardHtml(f) {
  const tags = buildTags(f.tags);
  const typeChip = typeChipSmallHtml(f.originalType, f.type);

  return `
    <article class="faction-card" data-id="${escapeHtml(
      f.id
    )}" tabindex="0" aria-labelledby="f-name-${f.id}">
      ${
        f.logo
          ? `<img class="faction-logo" src="${escapeHtml(
              f.logo
            )}" alt="${escapeHtml(
              f.name
            )} logo" onerror="this.style.display='none'">`
          : ""
      }
      <div class="card-header-area">
        <div class="card-title-row">
          <div class="title-left">
            <h3 id="f-name-${f.id}" class="faction-name">${escapeHtml(
    f.name
  )}</h3>
            <!-- type chip moved below owner/tags to keep title row cleaner -->
          </div>
          ${
            f.verified
              ? `<div class="verified-badge"><i class="fas fa-check-circle" aria-hidden="true"></i> Verified</div>`
              : ""
          }
        </div>

        <!-- owner shown as Discord chip -->
        <div class="faction-owner">${discordChipHtml(f.owner)}</div>

        <!-- Type chip now appears inline with tags (same row) -->
        <div class="faction-tags-row">
          ${typeChip}
          ${tags}
        </div>
      </div>

      <p class="faction-description">${escapeHtml(f.description)}</p>

      <div class="faction-stats" role="list">
        <div class="stat-item"><span class="stat-number">${Number(
          f.members
        ).toLocaleString()}</span><span class="stat-label">Members</span></div>
        <div class="stat-item"><span class="stat-number">${escapeHtml(
          f.founded
        )}</span><span class="stat-label">Founded</span></div>
      </div>

      <div class="faction-footer">
        ${
          f.invite
            ? `<a class="join-btn" href="${escapeHtml(
                f.invite
              )}" target="_blank" rel="noopener noreferrer"><i class="fas fa-sign-in-alt"></i> Join</a>`
            : `<a class="join-btn" href="#" onclick="event.preventDefault();" title="No invite">Join</a>`
        }
        <div class="server-id">ID: ${escapeHtml(f.server_id || "—")}</div>
      </div>
    </article>
  `;
}

function renderGrid(list) {
  const grid = $("#factionGrid"),
    no = $("#noResults");
  if (!grid) return;
  if (!Array.isArray(list) || list.length === 0) {
    grid.innerHTML = "";
    if (no) no.classList.remove("d-none");
    return;
  }
  if (no) no.classList.add("d-none");
  grid.innerHTML = list.map(createCardHtml).join("");
  attachCardHandlers();
}

function attachCardHandlers() {
  const grid = $("#factionGrid");
  if (!grid) return;
  grid.onclick = (e) => {
    const card = e.target.closest(".faction-card");
    if (!card) return;
    if (e.target.closest(".join-btn")) return;
    openDetail(card.dataset.id);
  };
  grid.onkeydown = (e) => {
    if (e.key === "Enter") {
      const card = e.target.closest && e.target.closest(".faction-card");
      if (card) openDetail(card.dataset.id);
    }
  };
}

/* --- Sidebar stats for detail --- */
function renderSidebarStats(f) {
  return `
  <div class="sidebar-section">
    <h5><i class="fas fa-chart-bar" aria-hidden="true"></i> Statistics</h5>
    <div class="stat-row">
      <i class="fas fa-users" aria-hidden="true"></i>
      <span class="stat-label">Members</span>
      <span class="stat-value">${Number(f.members).toLocaleString()}</span>
    </div>
    <div class="stat-row">
      <i class="fas fa-calendar-alt" aria-hidden="true"></i>
      <span class="stat-label">Founded</span>
      <span class="stat-value">${escapeHtml(f.founded || "—")}</span>
    </div>
    ${
      f.server_id
        ? `
    <div class="stat-row">
      <i class="fas fa-server" aria-hidden="true"></i>
      <span class="stat-label">Server ID</span>
      <span class="stat-value server-id">${escapeHtml(f.server_id)}</span>
    </div>
    `
        : ""
    }
  </div>`;
}

/* --- Detail HTML: About moved above the carousel; carousel shows only additional images (not banner) --- */
function buildDetailHtml(f) {
  const tags = buildTags(f.tags);

  // Use only additional images here. Banner stays separate.
  const images = Array.isArray(f.images) && f.images.length ? f.images : [];

  const slides = images
    .map(
      (src, i) => `
        <div class="carousel-slide" data-index="${i}" ${
        i === 0 ? `aria-hidden="false"` : `aria-hidden="true"`
      }>
          <img class="carousel-img" src="${escapeHtml(src)}" alt="${escapeHtml(
        f.name
      )} image ${i + 1}" onerror="this.style.display='none'">
        </div>`
    )
    .join("");

  const inviteBlock = f.invite
    ? `<a class="btn btn-lg join-btn" href="${escapeHtml(
        f.invite
      )}" target="_blank" rel="noopener noreferrer">
          <i class="fas fa-sign-in-alt"></i> Join Server
        </a>
       <button id="copyInviteBtn" class="btn btn-outline-secondary btn-lg ms-2">
         Copy Invite
       </button>`
    : `<button class="btn btn-lg join-btn" disabled>No invite available</button>`;

  const openSiteBtnHtml = `<button id="openSiteBtn" class="btn btn-outline-secondary w-100 mt-2"><i class="fas fa-link" aria-hidden="true"></i> Open on site</button>`;

  const aboutContent = f.description
    ? `<p class="faction-description">${escapeHtml(f.description)}</p>`
    : `<p class="muted">No additional information available for this ${escapeHtml(
        f.originalType || f.type
      )}.</p>`;

  return `
    <article class="detail-article" aria-live="polite">

      <!-- Top section with name, owner, type, tags, verification -->
      <div class="detail-top-meta">
        ${
          f.verified
            ? `<div class="verified-badge"><i class="fas fa-check-circle" aria-hidden="true"></i> Verified</div>`
            : ""
        }

        ${
          f.logo
            ? `<img class="faction-logo" src="${escapeHtml(
                f.logo
              )}" alt="${escapeHtml(
                f.name
              )} logo" onerror="this.style.display='none'">`
            : ""
        }

        <h2 class="faction-name">${escapeHtml(f.name)}</h2>

        <!-- owner shown as Discord chip -->
        <div class="faction-owner muted" style="margin-top:6px">${discordChipHtml(
          f.owner
        )}</div>

        <div class="meta-row" style="margin: 0.5em 0em">
          <span class="type-chip">${typeLabel(f.originalType, f.type)}</span>
          <span class="ms-2">${tags}</span>
        </div>
      </div>

      <!-- Banner comes AFTER metadata -->
      ${
        f.banner
          ? `<img class="main-banner" src="${escapeHtml(
              f.banner
            )}" alt="${escapeHtml(
              f.name
            )} banner" onerror="this.style.display='none'">`
          : ""
      }

      <div class="detail-top">
        <div class="detail-main">
          <!-- ABOUT on top (above the additional images) -->
          <div class="detail-body">
            <div class="detail-section">
              <h4><i class="fas fa-info-circle" aria-hidden="true"></i> About</h4>
              ${aboutContent}
            </div>
          </div>

          <!-- Gallery (additional images only) -->
          ${
            images.length > 0
              ? `
              <div class="carousel" tabindex="0" role="region" aria-label="${escapeHtml(
                f.name
              )} images">
                <div class="carousel-track">${slides}</div>
                ${
                  images.length > 1
                    ? `
                      <button class="carousel-prev" aria-label="Previous"><i class="fas fa-chevron-left" aria-hidden="true"></i></button>
                      <button class="carousel-next" aria-label="Next"><i class="fas fa-chevron-right" aria-hidden="true"></i></button>`
                    : ""
                }
                <div class="carousel-dots"></div>
              </div>`
              : ""
          }
        </div>

        <!-- Sidebar -->
        <aside class="detail-side">
          <div class="card-side">
            <div>${inviteBlock}</div>
            <div style="margin-top:8px">${openSiteBtnHtml}</div>
            <div class="mt-3">${renderSidebarStats(f)}</div>
          </div>
        </aside>
      </div>
    </article>
  `;
}

/* --- open/close + carousel wiring + image click behavior (open in new tab) --- */
function openDetail(id) {
  const item = allData.find((x) => String(x.id) === String(id));
  if (!item) return;
  const detailContent = $("#detailContent");
  if (!detailContent) return;
  detailContent.innerHTML = buildDetailHtml(item);

  $("#factionsList").classList.add("d-none");
  $("#factionDetail").classList.remove("d-none");

  // copy invite button
  const copyBtn = $("#copyInviteBtn");
  if (copyBtn) {
    copyBtn.onclick = async (e) => {
      e.preventDefault();
      if (navigator.clipboard && item.invite) {
        try {
          await navigator.clipboard.writeText(item.invite);
          copyBtn.textContent = "Copied!";
          setTimeout(() => (copyBtn.textContent = "Copy Invite"), 1400);
        } catch (err) {
          console.error(err);
        }
      }
    };
  }

  // Open on site (deep link) button wiring
  const openSiteBtn = $("#openSiteBtn");
  if (openSiteBtn) {
    openSiteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const url = `${window.location.origin}${
        window.location.pathname.split("?")[0]
      }?id=${encodeURIComponent(String(item.id))}`;
      window.open(url, "_blank", "noopener");
    });
  }

  // initialize carousel interaction
  initDetailCarousel();

  // image click: open in new tab
  const imgs = detailContent.querySelectorAll(".carousel-img, .main-banner");
  imgs.forEach((img) => {
    img.style.cursor = "zoom-in";
    img.addEventListener("click", (e) => {
      const src = e.currentTarget.getAttribute("src");
      if (!src) return;
      window.open(src, "_blank", "noopener");
    });
  });

  const cur = history.state;
  if (!cur || cur.view !== "detail" || String(cur.id) !== String(id)) {
    history.pushState(
      { view: "detail", id: String(id) },
      "",
      `?id=${encodeURIComponent(id)}`
    );
  }
}

function closeDetail(pushState = true) {
  $("#factionDetail").classList.add("d-none");
  $("#factionsList").classList.remove("d-none");
  const search = $("#searchInput");
  if (search) search.focus();
  if (pushState)
    history.pushState({ view: "list" }, "", window.location.pathname);
}

/* Carousel implementation */
function initDetailCarousel() {
  const carousel = $("#detailContent .carousel");
  if (!carousel) return;
  const track = carousel.querySelector(".carousel-track");
  const slides = Array.from(track.querySelectorAll(".carousel-slide"));
  const prev = carousel.querySelector(".carousel-prev");
  const next = carousel.querySelector(".carousel-next");
  const dots = carousel.querySelector(".carousel-dots");
  let idx = 0;
  const len = slides.length;

  // dots
  if (dots) {
    dots.innerHTML = "";
    slides.forEach((s, i) => {
      const btn = document.createElement("button");
      btn.className = "carousel-dot";
      btn.type = "button";
      btn.dataset.index = String(i);
      btn.setAttribute("aria-label", `Go to image ${i + 1}`);
      if (i === 0) btn.classList.add("active");
      dots.appendChild(btn);
    });
  }

  function update() {
    slides.forEach((s, i) => {
      const hidden = i !== idx;
      s.style.opacity = hidden ? "0" : "1";
      s.style.pointerEvents = hidden ? "none" : "auto";
      s.setAttribute("aria-hidden", String(hidden));
    });
    if (dots) {
      Array.from(dots.children).forEach((d) =>
        d.classList.toggle("active", Number(d.dataset.index) === idx)
      );
    }
  }
  function go(delta) {
    idx = (idx + delta + len) % len;
    update();
  }

  prev &&
    prev.addEventListener("click", (e) => {
      e.preventDefault();
      go(-1);
    });
  next &&
    next.addEventListener("click", (e) => {
      e.preventDefault();
      go(1);
    });
  if (dots) {
    dots.addEventListener("click", (e) => {
      const b = e.target.closest(".carousel-dot");
      if (!b) return;
      idx = Number(b.dataset.index);
      update();
    });
  }
  carousel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });

  update();
}

/* --- search/filter/history/deep-linking (unchanged) --- */
function filterAndRender(all, qtxt, filter) {
  const q = String(qtxt || "")
    .trim()
    .toLowerCase();
  const filtered = all.filter((f) => {
    if (filter && filter !== "all" && f.type !== filter) return false;
    if (!q) return true;
    return (
      (f.name || "").toLowerCase().includes(q) ||
      (f.owner || "").toLowerCase().includes(q) ||
      (f.tags || []).join(" ").toLowerCase().includes(q) ||
      (f.description || "").toLowerCase().includes(q)
    );
  });
  renderGrid(filtered);
}

/* Banner overlay syncing with theme and listening for theme changes. */
function updateBannerOverlay() {
  const theme =
    document.documentElement.getAttribute("data-bs-theme") || "light";
  const overlay =
    theme === "dark"
      ? "linear-gradient(to bottom, rgba(0,0,0,0.36), rgba(0,0,0,0.28))"
      : "linear-gradient(to bottom, rgba(255,255,255,0.30), rgba(255,255,255,0.18))";
  document.documentElement.style.setProperty("--banner-overlay", overlay);
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    navbar.classList.toggle("navbar-dark", theme === "dark");
    navbar.classList.toggle("bg-dark", theme === "dark");
    navbar.classList.toggle("navbar-light", theme === "light");
    navbar.classList.toggle("bg-light", theme === "light");
  }
}

new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.attributeName === "data-bs-theme") {
      updateBannerOverlay();
      break;
    }
  }
}).observe(document.documentElement, { attributes: true });

function setupFallbackThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;
  const saved = localStorage.getItem("theme");
  const current =
    document.documentElement.getAttribute("data-bs-theme") || saved || "light";
  document.documentElement.setAttribute("data-bs-theme", current);
  toggle.checked = current === "dark";
  updateBannerOverlay();

  toggle.addEventListener("change", () => {
    const next = toggle.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-bs-theme", next);
    localStorage.setItem("theme", next);
    updateBannerOverlay();
  });
}

/* --- main init --- */
let allData = [];
async function init() {
  updateBannerOverlay();
  setupFallbackThemeToggle();

  const now = new Date();
  const cd = $("#currentDate");
  if (cd)
    cd.textContent = now.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  const dp = $("#datePicker");
  if (dp) dp.value = now.toISOString().slice(0, 10);

  const data = await fetchFactions();
  if (!data) {
    renderGrid([]);
    return;
  }
  allData = data.sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));
  renderGrid(allData);

  // filters
  const filterButtons = $$(".filter-btn");
  filterButtons.forEach((btn) =>
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filterAndRender(
        allData,
        $("#searchInput").value,
        btn.dataset.filter || "all"
      );
    })
  );

  // search
  const search = $("#searchInput");
  if (search)
    search.addEventListener("input", () => {
      const active = $(".filter-btn.active");
      const filter = active ? active.dataset.filter : "all";
      filterAndRender(allData, search.value, filter);
    });

  // reset
  const reset = $("#resetBtn");
  if (reset)
    reset.addEventListener("click", () => {
      $("#searchInput").value = "";
      filterButtons.forEach((b) => b.classList.remove("active"));
      filterButtons[0] && filterButtons[0].classList.add("active");
      renderGrid(allData);
    });

  // back button
  const backBtn = $("#backBtn");
  if (backBtn) backBtn.addEventListener("click", () => closeDetail());

  // history popstate
  window.addEventListener("popstate", (ev) => {
    const st = ev.state;
    if (!st) {
      closeDetail(false);
      return;
    }
    if (st.view === "detail" && st.id) openDetail(st.id);
    if (st.view === "list") closeDetail(false);
  });

  // deep link support
  const params = new URLSearchParams(window.location.search);
  const idParam = params.get("id");
  if (idParam) {
    history.replaceState(
      { view: "detail", id: String(idParam) },
      "",
      `?id=${encodeURIComponent(idParam)}`
    );
    openDetail(idParam);
  } else history.replaceState({ view: "list" }, "", window.location.pathname);

  // footer year
  const cy = $("#currentYear");
  if (cy) cy.textContent = new Date().getFullYear();
}

document.addEventListener("DOMContentLoaded", init);
