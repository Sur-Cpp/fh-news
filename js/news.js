// news.js
import { parseFormattedText, toDirectImageUrl, parseImageSpec } from "./utils.js";

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
      <div class="news-section" style="border-left:4px solid ${borderColor}; padding: 12px; margin-bottom:18px;">
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
          if (!Number.isNaN(w)) {
            if (w > 0 && w <= 100) {
              inlineStyles = inlineStyles.filter(s => !s.startsWith("max-width"));
              inlineStyles.push(`max-width:${w}%`);
            } else if (w > 100) {
              inlineStyles = inlineStyles.filter(s => !s.startsWith("max-width"));
              inlineStyles.push(`width:${w}px`);
            }
          }
        }
        if (spec.height) {
          const h = Number(spec.height);
          if (!Number.isNaN(h)) {
            if (h > 0 && h <= 100) {
              inlineStyles.push(`max-height:${h}%`);
            } else if (h > 100) {
              inlineStyles.push(`height:${h}px`);
            }
          }
        }
        const styleAttr = inlineStyles.join("; ");

        const dataW = spec.width ? escapeAttr(spec.width) : "";
        const dataH = spec.height ? escapeAttr(spec.height) : "";

        cardHtml += `<img
          src="${escapeAttr(imageUrl)}"
          alt="${escapeAttr(spec.alt || `News Image ${idx + 1}`)}"
          class="news-image img-fluid rounded mb-2"
          style="${styleAttr}"
          data-image-src="${escapeAttr(imageUrl)}"
          data-image-width="${dataW}"
          data-image-height="${dataH}"
          onclick="openImageViewer(event)"
          onerror="this.style.display='none'">`;
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
    <div class="no-content text-center py-4">
      <i class="fas fa-newspaper fa-2x" style="color:#6c757d;"></i>
      <h3 style="margin-top:12px;">No Content Available</h3>
      <p>No news content found for <strong>${escapeHtml(selectedDate)}</strong></p>
      <p class="text-muted">Please select another date or check back later.</p>
      <div style="margin-top:16px;">
        <button class="btn btn-primary" onclick="window.goToLatestNews && window.goToLatestNews()">Go to latest news</button>
        <button class="btn btn-outline-secondary ms-2" onclick="document.getElementById('datePicker') && document.getElementById('datePicker').focus()">Pick another date</button>
      </div>
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
  const w = imgEl.getAttribute("data-image-width");
  const h = imgEl.getAttribute("data-image-height");

  ensureImageViewerExists();
  const viewer = document.getElementById("newsImageViewer");
  const viewerImg = document.getElementById("viewerImg");
  const viewerCaption = document.getElementById("viewerCaption");
  viewerImg.src = src;

  let captionHtml = "";
  if (/^https?:\/\//i.test(src)) {
    captionHtml += `<a href="${escapeAttr(src)}" target="_blank" rel="noopener noreferrer" style="color:#fff;text-decoration:underline">${escapeHtml(src)}</a>`;
  }
  if (w || h) {
    const dims = `${w || "?"} x ${h || "?"}`;
    captionHtml += `<div style="margin-top:6px; font-size:13px; color:#ddd">Dimensions: ${escapeHtml(dims)}</div>`;
  }
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
