let currentNewsUrl = "";
let currentNewsData = null;
let availableNewsDates = null;
const PROBE_LIMIT_DAYS = 60;

function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISOFromFilename(fname) {
  const m = fname.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

function updateCurrentDate(date = new Date()) {
  const options = {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  const display = date.toLocaleDateString("en-US", options);
  const currentDateEl = document.getElementById("currentDate");
  if (currentDateEl) currentDateEl.textContent = display;
  const dp = document.getElementById("datePicker");
  if (dp) dp.value = formatDateISO(date);
  updateNewsUrl(date);
}

function updateNewsUrl(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  currentNewsUrl = `./data/news-${year}-${month}-${day}.json`;
  loadNewsContent(currentNewsUrl);
}

function initializeDatePicker() {
  const datePicker = document.getElementById("datePicker");
  if (!datePicker) return;
  const today = new Date();
  datePicker.value = formatDateISO(today);
  datePicker.addEventListener("change", function () {
    const selectedDate = new Date(this.value + "T00:00:00");
    updateCurrentDate(selectedDate);
    updateNavButtonsState(selectedDate);
  });
}

async function fetchNewsManifest() {
  try {
    const resp = await fetch("./data/news-list.json", { cache: "no-store" });
    if (!resp.ok) throw new Error("No manifest");
    const arr = await resp.json();
    if (!Array.isArray(arr)) return null;
    const normalized = arr
      .map((item) => (item && typeof item === "string" ? item.trim() : ""))
      .map(
        (s) =>
          parseISOFromFilename(s) || (/^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null)
      )
      .filter(Boolean)
      .sort()
      .reverse();
    return normalized;
  } catch (e) {
    return null;
  }
}

async function loadNewsContent(url) {
  const newsContent = document.getElementById("newsContent");
  try {
    newsContent.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-3">Loading news content...</p>
      </div>`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const newsData = await response.json();
    currentNewsData = newsData;
    renderNewsContent(newsData);
    const iso =
      parseISOFromFilename(url) ||
      (document.getElementById("datePicker")
        ? document.getElementById("datePicker").value
        : null);
    if (iso) updateNavButtonsState(new Date(iso + "T00:00:00"));
  } catch (error) {
    renderNoContent();
  }
}

function parseFormattedText(text) {
  if (text === undefined || text === null) return "";

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  const allowedTags = [
    "a",
    "b",
    "i",
    "sub",
    "sup",
    "small",
    "big",
    "ins",
    "del",
    "mark",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "br",
    "hr",
  ];

  text = String(text).replace(/<a\s+([^>]+?)>/gi, (match, attrStr) => {
    const hrefMatch = attrStr.match(/href\s*=\s*(['"])(.*?)\1/i);
    if (!hrefMatch) return "";
    const rawHref = hrefMatch[2].trim();

    if (/^(https?:|\/\/)/i.test(rawHref)) {
      const safe = escapeAttr(rawHref);
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer">`;
    }
    return "";
  });

  const tagRegex = /<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi;

  const sanitized = text.replace(tagRegex, (match, tag) => {
    tag = tag.toLowerCase();
    if (!allowedTags.includes(tag)) return "";

    if (tag === "a") {
      if (/^<a\s/i.test(match) && /href=/.test(match)) {
        return match; // keep safe normalized opening <a>
      }
      if (/^<\/a>/i.test(match)) {
        return "</a>";
      }
      return "";
    }

    if (/^<\//.test(match)) return `</${tag}>`;
    return `<${tag}>`;
  });

  return sanitized;
}

function toDirectImageUrl(url) {
  if (!url || typeof url !== "string") return url;
  let imageUrl = url.trim();
  imageUrl = imageUrl.split("?")[0].replace(/\/+$/, "");
  try {
    if (imageUrl.includes("gyazo.com")) {
      if (
        imageUrl.includes("i.gyazo.com") &&
        /\.(png|jpe?g|gif)$/i.test(imageUrl)
      ) {
        return imageUrl;
      }
      const parts = imageUrl.split("/");
      const id = parts[parts.length - 1];
      return `https://i.gyazo.com/${id}.png`;
    }
  } catch (e) {}
  return imageUrl;
}

function renderNewsContent(data) {
  const newsContent = document.getElementById("newsContent");
  if (!newsContent) return;
  newsContent.innerHTML = "";
  const sections = data.news || [];
  sections.forEach((section) => {
    const borderColor = section.borderColor || "#007bff";
    let cardHtml = `
      <div class="news-section" style="border-left: 4px solid ${borderColor}">
        <h1 class="news-heading" style="color: ${borderColor}; border-bottom: 2px solid ${borderColor};">
          ${section.heading || ""}
        </h1>`;
    const imgs = Array.isArray(section.images)
      ? section.images
      : typeof section.images === "string" && section.images.trim() !== ""
      ? [section.images]
      : [];
    if (imgs.length > 0) {
      cardHtml += `<div class="d-flex flex-column align-items-center mb-3">`;
      imgs.forEach((imgSrc, idx) => {
        let imageUrl = toDirectImageUrl(imgSrc);
        cardHtml += `
          <img src="${imageUrl}" alt="News Image ${idx + 1}"
               class="news-image img-fluid rounded mb-2"
               style="max-width: 90%; cursor: zoom-in;"
               data-image-src="${imageUrl}"
               onclick="openImageViewer(event, '${borderColor}')"
               onerror="this.style.display='none'">`;
      });
      cardHtml += `</div>`;
    }
    if (section.text) {
      Object.values(section.text).forEach((paragraph) => {
        if (paragraph === undefined || paragraph === null) return;
        const raw = paragraph.toString();
        if (raw.trim() === "") return;
        let formatted = parseFormattedText(raw);
        formatted = formatted.replace(/<br\s*\/?>/gi, "<br>");
        formatted = formatted.replace(
          /<hr\s*\/?>/gi,
          `<hr style="border: 0; height: 4px; background:${borderColor};">`
        );
        const startsWithHeading = /^\s*<h[1-6][\s\S]*?>/i.test(formatted);
        if (startsWithHeading) {
          cardHtml += `${formatted}`;
        } else {
          cardHtml += `<p class="news-paragraph">${formatted}</p>`;
        }
      });
    }
    cardHtml += `
        <div class="mt-4">
          <small class="text-muted">Section: ${section.section || ""}</small>
        </div>
      </div>`;
    newsContent.innerHTML += cardHtml;
  });
  ensureImageViewerExists();
}

function renderNoContent() {
  const newsContent = document.getElementById("newsContent");
  const selectedDate = document.getElementById("datePicker")
    ? document.getElementById("datePicker").value
    : "";
  newsContent.innerHTML = `
    <div class="no-content">
      <i class="fas fa-newspaper"></i>
      <h3>No Content Available</h3>
      <p>No news content found for ${selectedDate}</p>
      <p class="text-muted">Please select a different date or check back later.</p>
    </div>`;
}

async function loadAvailableNews() {
  if (availableNewsDates !== null) return availableNewsDates;
  const manifest = await fetchNewsManifest();
  if (manifest && manifest.length) {
    availableNewsDates = manifest;
    return availableNewsDates;
  }
  availableNewsDates = null;
  return null;
}

function isoToUrl(iso) {
  return `./data/news-${iso}.json`;
}

async function goToAdjacentAvailable(delta) {
  const manifest = await loadAvailableNews();
  const dp = document.getElementById("datePicker");
  const currentISO = dp ? dp.value : formatDateISO(new Date());
  if (manifest && Array.isArray(manifest)) {
    const asc = [...manifest].sort();
    const idx = asc.indexOf(currentISO);
    if (idx === -1) {
      asc.push(currentISO);
      asc.sort();
      const pos = asc.indexOf(currentISO);
      const target = asc[pos + delta];
      if (target) {
        updateCurrentDate(new Date(target + "T00:00:00"));
        return;
      }
    } else {
      const target = asc[idx + delta];
      if (target) {
        updateCurrentDate(new Date(target + "T00:00:00"));
        return;
      }
    }
    return;
  }
  let offset = delta;
  for (let i = 0; i < PROBE_LIMIT_DAYS; i++, offset += delta) {
    const tryDate = new Date(currentISO + "T00:00:00");
    tryDate.setDate(tryDate.getDate() + offset);
    const today = new Date();
    const todayMid = new Date(formatDateISO(today) + "T00:00:00");
    if (tryDate > todayMid) break;
    const url = isoToUrl(formatDateISO(tryDate));
    try {
      const resp = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (resp.ok) {
        updateCurrentDate(tryDate);
        return;
      }
    } catch (e) {
      try {
        const resp2 = await fetch(url, { cache: "no-store" });
        if (resp2.ok) {
          updateCurrentDate(tryDate);
          return;
        }
      } catch (err) {}
    }
  }
}

async function goToPrevNews() {
  await goToAdjacentAvailable(-1);
  updateNavButtonsState();
}

async function goToNextNews() {
  await goToAdjacentAvailable(+1);
  updateNavButtonsState();
}

function updateNavButtonsState(date = null) {
  const nextBtn = document.getElementById("nextNewsBtn");
  const prevBtn = document.getElementById("prevNewsBtn");
  const dp = document.getElementById("datePicker");
  const useDate = date
    ? date
    : dp && dp.value
    ? new Date(dp.value + "T00:00:00")
    : new Date();
  const todayMid = new Date(formatDateISO(new Date()) + "T00:00:00");
  const compareDate = new Date(formatDateISO(useDate) + "T00:00:00");
  if (nextBtn) nextBtn.disabled = compareDate >= todayMid;
  if (prevBtn) prevBtn.disabled = false;
}

function ensureImageViewerExists() {
  if (document.getElementById("newsImageViewer")) return;
  const viewer = document.createElement("div");
  viewer.id = "newsImageViewer";
  viewer.style.position = "fixed";
  viewer.style.inset = "0";
  viewer.style.background = "rgba(0,0,0,0.85)";
  viewer.style.display = "none";
  viewer.style.alignItems = "center";
  viewer.style.justifyContent = "center";
  viewer.style.zIndex = "9999";
  viewer.innerHTML = `
    <div id="viewerInner" style="max-width:90%; max-height:90%; text-align:center; position:relative;">
      <img id="viewerImg" src="" alt="" style="max-width:100%; max-height:calc(100vh - 160px); border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.6);">
      <div id="viewerCaption" style="color:#fff; margin-top:10px;"></div>
    </div>`;
  document.body.appendChild(viewer);
  viewer.addEventListener("click", (e) => {
    if (e.target.id === "newsImageViewer") {
      closeImageViewer();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeImageViewer();
  });
}

function openImageViewer(event, borderColor) {
  const imgEl = event.currentTarget || event.target;
  const src = imgEl.getAttribute("data-image-src") || imgEl.src;
  ensureImageViewerExists();
  const viewer = document.getElementById("newsImageViewer");
  const viewerImg = document.getElementById("viewerImg");
  const viewerCaption = document.getElementById("viewerCaption");
  viewerImg.src = src;
  if (/^https?:\/\//i.test(src)) {
    viewerCaption.innerHTML = `<a href="${src}" target="_blank" style="color:#fff; text-decoration:underline;">${src}</a>`;
  } else {
    viewerCaption.innerHTML = "";
  }
  viewer.style.display = "flex";
}

function closeImageViewer() {
  const viewer = document.getElementById("newsImageViewer");
  if (!viewer) return;
  viewer.style.display = "none";
  const viewerImg = document.getElementById("viewerImg");
  if (viewerImg) viewerImg.src = "";
}

function initializeTheme() {
  const themeToggle = document.getElementById("themeToggle");
  const htmlElement = document.documentElement;
  const navbar = document.querySelector(".navbar");
  const savedTheme = localStorage.getItem("theme") || "light";
  function setTheme(theme) {
    if (theme === "dark") {
      htmlElement.setAttribute("data-bs-theme", "dark");
      navbar.classList.remove("navbar-light", "bg-light");
      navbar.classList.add("navbar-dark", "bg-dark");
      if (themeToggle) themeToggle.checked = true;
    } else {
      htmlElement.setAttribute("data-bs-theme", "light");
      navbar.classList.remove("navbar-dark", "bg-dark");
      navbar.classList.add("navbar-light", "bg-light");
      if (themeToggle) themeToggle.checked = false;
    }
    localStorage.setItem("theme", theme);
  }
  setTheme(savedTheme);
  if (themeToggle) {
    themeToggle.addEventListener("change", function () {
      const newTheme = this.checked ? "dark" : "light";
      setTheme(newTheme);
    });
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  fetchNewsManifest()
    .then((m) => {
      if (m && m.length) availableNewsDates = m;
    })
    .catch(() => {
      availableNewsDates = null;
    });
  initializeDatePicker();
  updateCurrentDate();
  initializeTheme();
  const prev = document.getElementById("prevNewsBtn");
  const next = document.getElementById("nextNewsBtn");
  if (prev) prev.addEventListener("click", () => goToPrevNews());
  if (next) next.addEventListener("click", () => goToNextNews());
  updateNavButtonsState(new Date());
});
