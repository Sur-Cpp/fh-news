// news.js

import {
  parseFormattedText,
  toDirectImageUrl,
  parseImageSpec,
} from "./utils.js";

export let currentNewsData = null;
export let currentNewsDate = null;

function getActiveDatePicker() {
  const pickers = document.querySelectorAll(".date-picker");
  for (const el of pickers) {
    if (el.offsetParent !== null) return el;
  }
  return null;
}

function selectActiveDatePicker() {
  const el = getActiveDatePicker();
  if (!el) return;

  if (typeof el.showPicker === "function") {
    el.showPicker();
  } else {
    el.focus();
  }
}

//* Fuck you ESMODULE with your stupid scope issues
window.selectActiveDatePicker = selectActiveDatePicker;

//* fetch json from ../data/
async function fetchJsonFromData(basename) {
  const tryUrl = `../data/${basename}`;
  const res = await fetch(tryUrl, { cache: "no-store" });
  if (!res.ok)
    throw new Error(`Failed to load ${tryUrl} (status ${res.status})`);
  const data = await res.json();
  return { json: data, url: tryUrl };
}

//* add ?date= in URL
function updateURLWithDate(date, replace = true) {
  if (!date) return;
  const pathname = window.location.pathname || "/";
  const hash = window.location.hash || "";
  const search = new URLSearchParams(window.location.search);
  search.set("date", String(date));
  const searchStr = search.toString();
  const newUrl = pathname + (searchStr ? "?" + searchStr : "") + hash;
  try {
    if (replace) window.history.replaceState({}, "", newUrl);
    else window.history.pushState({}, "", newUrl);
  } catch (e) {
    console.warn("history API unavailable, couldn't update URL with date", e);
  }
}

//* Loading circle icon
function loadingHtml() {
  return `
    <div class="text-center py-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-3">Loading news content...</p>
    </div>`;
}

//* Main loader by date (loads ../data/news-<date>.json)

export async function loadNewsByDate(date, opts = { replaceUrl: true }) {
  if (!date) throw new Error("date required");
  const basename = `news-${String(date)}.json`;
  const newsContent = document.getElementById("newsContent");
  if (newsContent) newsContent.innerHTML = loadingHtml();

  try {
    const { json: newsData } = await fetchJsonFromData(basename);
    currentNewsData = newsData;
    currentNewsDate = newsData.date || date;
    updateURLWithDate(currentNewsDate, opts.replaceUrl !== false);
    renderNewsContent(newsData);
    return newsData;
  } catch (err) {
    renderNoContent();
    throw err;
  }
}

//* load latest news
export async function loadLatestNews(opts = { replaceUrl: true }) {
  if (
    typeof window.goToLatestNews === "function" &&
    window.goToLatestNews !== loadLatestNews
  ) {
    try {
      return await window.goToLatestNews();
    } catch (e) {
      console.warn("external goToLatestNews threw, cannot load latest", e);
      renderNoContent();
      return null;
    }
  }

  console.warn("window.goToLatestNews is not defined; cannot load latest news");
  renderNoContent();
  return null;
}

//* load current news
export async function loadNewsContent(
  url,
  date = null,
  opts = { replaceUrl: true }
) {
  const newsContent = document.getElementById("newsContent");
  if (newsContent) newsContent.innerHTML = loadingHtml();

  const m = url && url.match(/news-([0-9]{4}-[0-9]{2}-[0-9]{2})\.json/);
  if (m) return await loadNewsByDate(m[1], opts);

  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const newsData = await res.json();
    currentNewsData = newsData;
    if (!date && newsData.date) date = newsData.date;
    currentNewsDate = date;
    if (currentNewsDate)
      updateURLWithDate(currentNewsDate, opts.replaceUrl !== false);
    renderNewsContent(newsData);
    return newsData;
  } catch (err) {
    renderNoContent();
    throw err;
  }
}

//* Load Next news
export async function goToNextNews() {
  if (!currentNewsData) return console.warn("No current news loaded");
  const next =
    currentNewsData.nextDate ||
    (currentNewsData.navigation && currentNewsData.navigation.next) ||
    null;
  if (next) return loadNewsByDate(next, { replaceUrl: false });
  console.warn("No nextDate found in current news data");
}

export async function goToPrevNews() {
  if (!currentNewsData) return console.warn("No current news loaded");
  const prev =
    currentNewsData.prevDate ||
    (currentNewsData.navigation && currentNewsData.navigation.prev) ||
    null;
  if (prev) return loadNewsByDate(prev, { replaceUrl: false });
  console.warn("No prevDate found in current news data");
}

//* Loading date lofic
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const date = params.get("date");

  if (date) {
    loadNewsByDate(date).catch((e) =>
      console.warn("requested date failed to load", e)
    );
  } else {
    if (
      typeof window.goToLatestNews === "function" &&
      window.goToLatestNews !== loadLatestNews
    ) {
      try {
        window.goToLatestNews();
      } catch (e) {
        console.warn("fallback", e);
        renderNoContent();
      }
    } else {
      console.warn("no goToLatestNews function; cannot load latest");
      renderNoContent();
    }
  }
});

//*UI rendering logic
export function renderNewsContent(data) {
  const newsContent = document.getElementById("newsContent");
  if (!newsContent) return;
  newsContent.innerHTML = "";
  const sections = data.news || [];

  sections.forEach((section) => {
    const borderColor = section.borderColor || "#007bff";
    let cardHtml = `
      <div class="news-section" style="border-left:4px solid ${borderColor}; padding:12px; margin-bottom:18px;">
        <h1 class="news-heading" style="color:${borderColor}; border-bottom:2px solid ${borderColor}; padding-bottom:6px; margin-bottom:12px;">
          ${escapeHtml(section.heading || "")}
        </h1>
    `;

    const imgs = Array.isArray(section.images)
      ? section.images
      : typeof section.images === "string" && section.images.trim()
      ? [section.images]
      : [];

    if (imgs.length) {
      cardHtml += `<div class="d-flex flex-column align-items-center mb-3">`;
      imgs.forEach((imgSrc, idx) => {
        const spec = parseImageSpec(imgSrc);
        const imageUrl = spec.src || "";
        let inlineStyles = ["cursor:zoom-in", "max-width:90%"];
        if (spec.width) {
          const w = Number(spec.width);
          if (!Number.isNaN(w))
            inlineStyles = w > 100 ? [`width:${w}px`] : [`max-width:${w}%`];
        }
        if (spec.height) {
          const h = Number(spec.height);
          if (!Number.isNaN(h))
            inlineStyles.push(h > 100 ? `height:${h}px` : `max-height:${h}%`);
        }
        const styleAttr = inlineStyles.join("; ");
        const dataW = spec.width ? escapeAttr(spec.width) : "";
        const dataH = spec.height ? escapeAttr(spec.height) : "";
        cardHtml += `<img src="${escapeAttr(imageUrl)}" alt="${escapeAttr(
          spec.alt || `News Image ${idx + 1}`
        )}" class="news-image img-fluid rounded mb-2" style="${styleAttr}" data-image-src="${escapeAttr(
          imageUrl
        )}" data-image-width="${dataW}" data-image-height="${dataH}" onclick="openImageViewer(event)" onerror="this.style.display='none'">`;
      });
      cardHtml += `</div>`;
    }

    if (section.text) {
      Object.values(section.text).forEach((paragraph) => {
        if (!paragraph && paragraph !== 0) return;
        let formatted = parseFormattedText(String(paragraph));
        formatted = formatted
          .replace(/<br\s*\/?>(?:\s*)/gi, "<br>")
          .replace(
            /<hr\s*\/?>(?:\s*)/gi,
            `<hr style="height:4px;background:${borderColor};border:none">`
          );
        const startsWithHeading = /^\s*<h[1-6][\s\S]*?>/i.test(formatted);
        cardHtml += startsWithHeading
          ? formatted
          : `<p class="news-paragraph">${formatted}</p>`;
      });
    }

    cardHtml += `<div class="mt-4"><small class="text-muted">Section: ${escapeHtml(
      section.section || ""
    )}</small></div></div>`;
    newsContent.insertAdjacentHTML("beforeend", cardHtml);
  });

  ensureImageViewerExists();
}

export function renderNoContent() {
  const newsContent = document.getElementById("newsContent");
  if (!newsContent) return;
  const selectedDate = document.getElementById("datePicker")
    ? document.getElementById("datePicker").value
    : "";
  newsContent.innerHTML = `
    <div class="no-content text-center py-4">
      <i class="fas fa-newspaper fa-2x" style="color:#6c757d;"></i>
      <h3 style="margin-top:12px;">No Content Available</h3>
      <p>No news content found for <strong>${escapeHtml(
        selectedDate
      )}</strong></p>
      <p class="text-muted">Please select another date or check back later.</p>
      <div style="margin-top:16px;">
        <button class="btn btn-primary" onclick="window.goToLatestNews && window.goToLatestNews()">Go to latest news</button>
        <button class="btn btn-outline-secondary ms-2" onclick="selectActiveDatePicker()">Pick another date</button>
      </div>
    </div>`;
}

//*Image viewer
export function ensureImageViewerExists() {
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
      <img id="viewerImg" src="" alt="" style="max-width:100%; max-height:calc(100vh-160px); border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.6);">
      <div id="viewerCaption" style="color:#fff; margin-top:10px;"></div>
    </div>`;
  document.body.appendChild(viewer);
  viewer.addEventListener("click", (e) => {
    if (e.target.id === "newsImageViewer") closeImageViewer();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeImageViewer();
  });
}

export function openImageViewer(event) {
  const imgEl = event.currentTarget || event.target;
  const src = imgEl.getAttribute("data-image-src") || imgEl.src;
  const w = imgEl.getAttribute("data-image-width");
  const h = imgEl.getAttribute("data-image-height");

  ensureImageViewerExists();
  const viewer = document.getElementById("newsImageViewer");
  const viewerImg = document.getElementById("viewerImg");
  const viewerCaption = document.getElementById("viewerCaption");
  viewerImg.src = src;

  let captionHtml = "";
  if (/^https?:\/\//i.test(src))
    captionHtml += `<a href="${escapeAttr(
      src
    )}" target="_blank" rel="noopener noreferrer" style="color:#fff;text-decoration:underline">${escapeHtml(
      src
    )}</a>`;
  if (w || h)
    captionHtml += `<div style="margin-top:6px;font-size:13px;color:#ddd">Dimensions: ${escapeHtml(
      w || "?"
    )} x ${escapeHtml(h || "?")}</div>`;
  viewerCaption.innerHTML = captionHtml;
  viewer.style.display = "flex";
}

export function closeImageViewer() {
  const viewer = document.getElementById("newsImageViewer");
  if (!viewer) return;
  viewer.style.display = "none";
  const viewerImg = document.getElementById("viewerImg");
  if (viewerImg) viewerImg.src = "";
}

function escapeHtml(s) {
  if (!s && s !== 0) return "";
  return String(s).replace(
    /[&<>\"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
