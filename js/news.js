import { parseFormattedText, toDirectImageUrl } from "./utils.js";

export let currentNewsData = null;

export async function loadNewsContent(url) {
  const newsContent = document.getElementById("newsContent");
  try {
    newsContent.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p class="mt-3">Loading news content...</p>
      </div>`;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const newsData = await response.json();
    currentNewsData = newsData;
    renderNewsContent(newsData);
  } catch (err) {
    renderNoContent();
  }
}

export function renderNewsContent(data) {
  const newsContent = document.getElementById("newsContent");
  if (!newsContent) return;
  newsContent.innerHTML = "";
  const sections = data.news || [];
  sections.forEach((section) => {
    const borderColor = section.borderColor || "#007bff";
    let cardHtml = `
      <div class="news-section" style="border-left:4px solid ${borderColor}">
        <h1 class="news-heading" style="color:${borderColor}; border-bottom:2px solid ${borderColor};">
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
        const imageUrl = toDirectImageUrl(imgSrc);
        cardHtml += `<img src="${escapeAttr(imageUrl)}" alt="News Image ${
          idx + 1
        }" class="news-image img-fluid rounded mb-2" style="max-width:90%; cursor:zoom-in" data-image-src="${escapeAttr(
          imageUrl
        )}" onclick="openImageViewer(event)" onerror="this.style.display='none'">`;
      });
      cardHtml += `</div>`;
    }

    if (section.text) {
      Object.values(section.text).forEach((paragraph) => {
        if (paragraph === undefined || paragraph === null) return;
        const raw = String(paragraph);
        if (!raw.trim()) return;
        let formatted = parseFormattedText(raw);
        formatted = formatted.replace(/<br\s*\/?>/gi, "<br>");
        formatted = formatted.replace(
          /<hr\s*\/?>/gi,
          `<hr style="height:4px;background:${borderColor};border:none">`
        );
        const startsWithHeading = /^\s*<h[1-6][\s\S]*?>/i.test(formatted);
        if (startsWithHeading) {
          cardHtml += formatted;
        } else {
          cardHtml += `<p class="news-paragraph">${formatted}</p>`;
        }
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
    <div class="no-content">
      <i class="fas fa-newspaper"></i>
      <h3>No Content Available</h3>
      <p>No news content found for ${escapeHtml(selectedDate)}</p>
      <p class="text-muted">Please select another date or check back later.</p>
    </div>`;
}

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
      <img id="viewerImg" src="" alt="" style="max-width:100%; max-height:calc(100vh - 160px); border-radius:8px; box-shadow:0 10px 40px rgba(0,0,0,0.6);">
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
  ensureImageViewerExists();
  const viewer = document.getElementById("newsImageViewer");
  const viewerImg = document.getElementById("viewerImg");
  const viewerCaption = document.getElementById("viewerCaption");
  viewerImg.src = src;
  if (/^https?:\/\//i.test(src)) {
    viewerCaption.innerHTML = `<a href="${escapeAttr(
      src
    )}" target="_blank" rel="noopener noreferrer" style="color:#fff;text-decoration:underline">${escapeHtml(
      src
    )}</a>`;
  } else {
    viewerCaption.innerHTML = "";
  }
  viewer.style.display = "flex";
}

export function closeImageViewer() {
  const viewer = document.getElementById("newsImageViewer");
  if (!viewer) return;
  viewer.style.display = "none";
  const viewerImg = document.getElementById("viewerImg");
  if (viewerImg) viewerImg.src = "";
}

/* small escaping helpers (for building HTML) */
function escapeHtml(s) {
  if (!s && s !== 0) return "";
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[
        c
      ])
  );
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}
