// js/factions.js - updated: theme-safe, banner first, carousel after tags, click opens image in new tab

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
      logo: d.logo || "",
      banner: d.banner || d.logo || "",
      images:
        Array.isArray(d.images) && d.images.length
          ? d.images
          : d.banner
          ? [d.banner]
          : [],
      description: d.description || "",
      members: Number(d.members || 0),
      founded: d.founded || "",
      trust: d.trust ?? d.reputation ?? d.influence ?? d.score ?? "",
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
function typeLabel(t) {
  t = String(t || "").toLowerCase();
  if (t === "site") return "Site";
  if (t === "faction") return "Faction";
  return "Community";
}

/* --- Grid / Card --- */
function createCardHtml(f) {
  const tags = buildTags(f.tags);
  const trust =
    f.trust !== "" && f.trust != null ? escapeHtml(String(f.trust)) : "—";
  return `
    <article class="faction-card" data-id="${escapeHtml(
      f.id
    )}" tabindex="0" aria-labelledby="f-name-${f.id}">
      ${
        f.verified
          ? `<div class="verified-badge"><i class="fas fa-check-circle"></i> Verified</div>`
          : ""
      }
      <div>
        <h3 id="f-name-${f.id}" class="faction-name">${escapeHtml(f.name)}</h3>
        <div class="faction-owner">Owner: ${escapeHtml(f.owner || "—")}</div>
        <div class="faction-tags-row">${tags}</div>
      </div>
      ${
        f.banner
          ? `<img class="faction-banner" src="${escapeHtml(
              f.banner
            )}" alt="${escapeHtml(
              f.name
            )} banner" onerror="this.style.display='none'">`
          : ""
      }
      <p class="faction-description">${escapeHtml(f.description)}</p>
      <div class="faction-stats" role="list">
        <div class="stat-item"><span class="stat-number">${Number(
          f.members
        ).toLocaleString()}</span><span class="stat-label">Members</span></div>
        <div class="stat-item"><span class="stat-number">${escapeHtml(
          f.founded
        )}</span><span class="stat-label">Founded</span></div>
        <div class="stat-item"><span class="stat-number">${trust}</span><span class="stat-label">Trust</span></div>
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

/* --- Detail HTML: Banner first, tags, then carousel --- */
function renderStats(f) {
  return `
  <div class="faction-stats" role="list">
    <div class="stat-item"><span class="stat-number">${Number(
      f.members
    ).toLocaleString()}</span><span class="stat-label">Members</span></div>
    <div class="stat-item"><span class="stat-number">${escapeHtml(
      f.founded
    )}</span><span class="stat-label">Founded</span></div>
    <div class="stat-item"><span class="stat-number">${escapeHtml(
      String(f.trust || "—")
    )}</span><span class="stat-label">Trust</span></div>
  </div>`;
}

function buildDetailHtml(f) {
  const tags = buildTags(f.tags);

  const images =
    Array.isArray(f.images) && f.images.length
      ? f.images
      : f.banner
      ? [f.banner]
      : [];

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
          <i class="fas fa-sign-in-alt"></i> Join
        </a>
       <button id="copyInviteBtn" class="btn btn-outline-secondary btn-lg ms-2">
         Copy Invite
       </button>`
    : `<button class="btn btn-lg join-btn" disabled>No invite</button>`;

  return `
    <article class="detail-article" aria-live="polite">

      <!-- Top section with name, owner, type, tags, verification -->
      <div class="detail-top-meta">
        ${
          f.verified
            ? `<div class="verified-badge"><i class="fas fa-check-circle"></i> Verified</div>`
            : ""
        }
        <h2 class="faction-name">${escapeHtml(f.name)}</h2>
        <div class="faction-owner muted">Owner: ${escapeHtml(
          f.owner || "—"
        )}</div>
        <div class="meta-row">
          <span class="type-chip">${escapeHtml(typeLabel(f.type))}</span>
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

          <!-- Gallery -->
          ${
            images.length > 1 || (images.length === 1 && !f.banner)
              ? `
              <div class="carousel" tabindex="0" role="region" aria-label="${escapeHtml(
                f.name
              )} images">
                <div class="carousel-track">${slides}</div>
                ${
                  images.length > 1
                    ? `
                      <button class="carousel-prev" aria-label="Previous"><i class="fas fa-chevron-left"></i></button>
                      <button class="carousel-next" aria-label="Next"><i class="fas fa-chevron-right"></i></button>`
                    : ""
                }
                <div class="carousel-dots"></div>
              </div>`
              : ""
          }

          <!-- Description -->
          <div class="detail-body">
            ${
              f.description
                ? `<p class="faction-description">${escapeHtml(
                    f.description
                  )}</p>`
                : ""
            }

            <div class="detail-section">
              <h4>Overview</h4>
              <p>Members: <strong>${Number(
                f.members
              ).toLocaleString()}</strong> · Founded: <strong>${escapeHtml(
    f.founded || "—"
  )}</strong></p>
              <p>Trust: <strong>${escapeHtml(
                String(f.trust || "—")
              )}</strong></p>
            </div>

            <div class="detail-section">
              <h4>About</h4>
              <p class="muted">This is placeholder longer content for the detailed view. Add rules, links, or structured info here.</p>
            </div>
          </div>
        </div>

        <!-- Sidebar -->
        <aside class="detail-side">
          <div class="card-side">
            <div>${inviteBlock}</div>
            <div class="mt-3">${renderStats(f)}</div>
            <div class="detail-actions mt-2">
              <a class="btn btn-outline-primary w-100" href="#" id="openServerBtn">Open Server</a>
              <a class="btn btn-secondary w-100" href="#" id="openSiteBtn">Open on site</a>
            </div>
            <div class="mt-3 small muted">
              <strong>Server ID</strong>
              <div class="server-id">${escapeHtml(f.server_id || "—")}</div>
            </div>
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

  // initialize carousel interaction
  initDetailCarousel();

  // image click: open in new tab (user wanted Gyazo — uploading would need API keys; this opens raw image in a tab)
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

  function update() {
    slides.forEach((s, i) => {
      const hidden = i !== idx;
      s.style.opacity = hidden ? "0" : "1";
      s.style.pointerEvents = hidden ? "none" : "auto";
      s.setAttribute("aria-hidden", String(hidden));
    });
    Array.from(dots.children).forEach((d) =>
      d.classList.toggle("active", Number(d.dataset.index) === idx)
    );
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
  dots.addEventListener("click", (e) => {
    const b = e.target.closest(".carousel-dot");
    if (!b) return;
    idx = Number(b.dataset.index);
    update();
  });
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

/* Banner overlay syncing with theme and listening for theme changes.
   This avoids fighting your theme.js: we observe data-bs-theme and react. */
function updateBannerOverlay() {
  const theme =
    document.documentElement.getAttribute("data-bs-theme") || "light";
  const overlay =
    theme === "dark"
      ? "linear-gradient(to bottom, rgba(0,0,0,0.36), rgba(0,0,0,0.28))"
      : "linear-gradient(to bottom, rgba(255,255,255,0.30), rgba(255,255,255,0.18))";
  document.documentElement.style.setProperty("--banner-overlay", overlay);
  // ensure navbar classes match (safe toggle)
  const navbar = document.querySelector(".navbar");
  if (navbar) {
    navbar.classList.toggle("navbar-dark", theme === "dark");
    navbar.classList.toggle("bg-dark", theme === "dark");
    navbar.classList.toggle("navbar-light", theme === "light");
    navbar.classList.toggle("bg-light", theme === "light");
  }
}

/* Observe if another script changes data-bs-theme (e.g. theme.js) */
new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.attributeName === "data-bs-theme") {
      updateBannerOverlay();
      break;
    }
  }
}).observe(document.documentElement, { attributes: true });

/* If theme toggle exists but no other handler provided, toggle attribute and localStorage */
function setupFallbackThemeToggle() {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) return;
  // initialize checkbox from attribute/localStorage
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
