// js/factions.js - Full replacement
import { initializeTheme } from "./theme.js";

const CACHE_KEY = "discord_cache";
const CACHE_DURATION = 10 * 60 * 1000; //10 min
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

//Apart of Beta discord function
function saveToCache(data) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    timestamp: Date.now(),
    data: data
  }));
}

/* small type chip for cards */
function typeChipSmallHtml(originalType, normalizedType) {
  return `<span class="type-chip type-chip--small">${typeLabel(
    originalType,
    normalizedType
  )}</span>`;
}

/* --- invite-code extractor --- */
function extractInviteCode(invite) {
  if (!invite) return null;
  try {
    const s = String(invite).trim();
    // Primary: .gg/ or /invite/
    const m = s.match(/(?:\.gg\/|\/invite\/)([A-Za-z0-9-_]+)/i);
    if (m && m[1]) return m[1];
    // If the input is likely the code itself (simple letters/numbers/hyphen/underscore)
    const simple = s.match(/^([A-Za-z0-9-_]{2,})$/);
    if (simple) return simple[1];
    // Fallback: last path segment (strip query/hash)
    const parts = s.split("/").filter(Boolean);
    if (parts.length) {
      const last = parts.pop();
      if (last) {
        const code = last.split(/[?#]/)[0];
        if (code && /[A-Za-z0-9-_]+/.test(code)) return code;
      }
    }
  } catch (e) {
    // ignore and return null
  }
  return null;
}

/* --- Start Experiemental functions --- */
async function fetchDiscordData(f) {
  inviteCode = extractInviteCode(f.invite);
  if (!inviteCode) return null
  try {
    res = await fetch(`https://discord.com/api/v10/invites/${inviteCode}?with_counts=true`);

    if (!res.ok) {
      throw new Error(`HTTP Error Arised, use fallback data. ${res.status}`);
    }
    data = res.json;
    memberCount = data.approximate_member_count;
    onlineMemberCount = data.approximate_presence_count;
    return [memberCount, onlineMemberCount]; // Returns both membercount and online members
  } catch(e) {
    // ignore and return null (cause yeah)
  }
  return null;
}

async function getDiscordData(inviteCode) { //USE THIS FUNCTION TO GET DATA, THIS WILL ALSO USE FETCH TO GET NEW DATA
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    const { timestamp, data } = JSON.parse(cached);
    if (Date.now - timestamp < CACHE_DURATION) {
      return data; // using cache if its still valid
    }
  }

  //Fetch new data if expired/not valid
  const freshData = await fetchDiscordData(inviteCode);
  saveToCache(freshData);
  return freshData
}

function display(data) {
  onlineMembers = data[1];
  totalMembers = data[0];
  document.getElementById("memberCount").innertext = //id is a placeholder until we figure out how we're going to implement it
  totalMembers.toLocaleString('en-US');
}

async function loadDiscordData(inviteCode) {
  try {
    const data = await getDiscordData(inviteCode);
    display(data);
  } catch(e) {
    fetchDiscordData(inviteCode);
    console.log(`\nUnknown Error Occurred while loading cached Discord data, fetched Discord data again.\n "${e}" `)
  }
}
/* -- End Experimental functions -- */

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
          </div>
          ${
            f.verified
              ? `<div class="verified-badge"><i class="fas fa-circle-check" aria-hidden="true"></i> Verified</div>`
              : ""
          }
        </div>

        <div class="faction-owner">${discordChipHtml(f.owner)}</div>

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
        <button class="learn-btn" type="button" aria-label="Learn more about ${escapeHtml(
          f.name
        )}"><i class="fa-solid fa-circle-info"></i>Info</button>
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
    // If user clicked the join link, let it behave normally (no detail open)
    if (e.target.closest(".join-btn")) return;

    // If user clicked learn-btn specifically, open that card's detail
    const learn = e.target.closest(".learn-btn");
    if (learn) {
      const card = learn.closest(".faction-card");
      if (card) {
        openDetail(card.dataset.id);
      }
      return;
    }

    // otherwise, clicking anywhere on the card opens detail
    const card = e.target.closest(".faction-card");
    if (!card) return;
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
  //At some point 
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

  // extract the invite code (after .gg/ or /invite/), if possible
  const inviteCode = extractInviteCode(f.invite);
  // if invite exists, show code (if found) or default text; button will copy full invite when clicked
  const openSiteBtnHtml = f.invite
    ? `<button id="openSiteBtn" class="btn btn-outline-secondary w-100 mt-2" data-invite-code="${escapeHtml(
        inviteCode || ""
      )}">${inviteCode ? escapeHtml(inviteCode) : "Open on site"}</button>`
    : `<button id="openSiteBtn" class="btn btn-outline-secondary w-100 mt-2" disabled>No invite</button>`;

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

  // Open on site (now: copy the full invite to clipboard; button shows the invite CODE)
  const openSiteBtn = $("#openSiteBtn");
  if (openSiteBtn) {
    openSiteBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!item.invite || !navigator.clipboard) return;
      try {
        await navigator.clipboard.writeText(item.invite);
        const originalText = openSiteBtn.textContent;
        openSiteBtn.textContent = "Copied!";
        setTimeout(() => (openSiteBtn.textContent = originalText), 1400);
      } catch (err) {
        console.error(err);
      }
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

/* Banner overlay syncing with theme (keeps CSS var and navbar classes updated). */
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

/* Observe data-bs-theme changes so banner overlay + navbar update when theme changes elsewhere */
new MutationObserver((mutations) => {
  for (const m of mutations) {
    if (m.attributeName === "data-bs-theme") {
      updateBannerOverlay();
      break;
    }
  }
}).observe(document.documentElement, { attributes: true });

/* --- main init --- */
let allData = [];
async function init() {
  // ensure overlay matches whichever theme is currently applied
  updateBannerOverlay();

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

document.addEventListener("DOMContentLoaded", () => {
  // initialize central theme handling first so the page picks up the stored theme and toggle wiring
  initializeTheme();
  // then run the page's own initialization
  init();
});
