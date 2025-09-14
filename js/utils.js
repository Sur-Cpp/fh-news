// utils.js
export function formatDateISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISOFromFilename(fname) {
  const m = String(fname).match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

export function toDirectImageUrl(url) {
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

export function parseImageSpec(input) {
  if (!input) return { src: "", width: null, height: null, alt: null };
  if (typeof input === "object") {
    const srcRaw = input.src || input.url || input.image || "";
    const src = toDirectImageUrl(String(srcRaw || ""));
    const width = Number.isFinite(Number(input.width)) ? Number(input.width) : null;
    const height = Number.isFinite(Number(input.height)) ? Number(input.height) : null;
    const alt = input.alt ? String(input.alt) : null;
    return { src, width, height, alt };
  }

  if (typeof input === "string") {
    const parts = input.split("|").map((p) => p.trim());
    const urlPart = parts[0] || "";
    let width = null;
    let height = null;
    if (parts[1]) {
      const m = parts[1].match(/^(\d+)(?:x(\d+))?$/);
      if (m) {
        width = m[1] ? Number(m[1]) : null;
        height = m[2] ? Number(m[2]) : null;
      }
    }
    const src = toDirectImageUrl(urlPart);
    return { src, width, height, alt: null };
  }

  return { src: String(input), width: null, height: null, alt: null };
}

export function parseFormattedText(text) {
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
      if (/^<a\s/i.test(match) && /href=/.test(match)) return match;
      if (/^<\/a>/i.test(match)) return "</a>";
      return "";
    }

    if (/^<\//.test(match)) return `</${tag}>`;
    return `<${tag}>`;
  });

  return sanitized;
}
