// navigation.js
import { formatDateISO, parseISOFromFilename } from "./utils.js";

let loaderFn = null;
export function setLoader(fn) {
  loaderFn = fn;
}

const PROBE_LIMIT_DAYS = 60;
export let availableNewsDates = null;


export function updateCurrentDate(date = null) {
  if (!date) {
    if (availableNewsDates && Array.isArray(availableNewsDates) && availableNewsDates.length) {
      const latestIso = availableNewsDates[0];
      date = new Date(latestIso + "T00:00:00");
    } else {
      date = new Date();
    }
  }

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

export function updateNewsUrl(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const url = `./data/news-${year}-${month}-${day}.json`;
  if (loaderFn) {
    loaderFn(url);
  } else {
    console.error(
      "No loader registered. Call setLoader(loadNewsContent) from main."
    );
  }
}

export function initializeDatePicker() {
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

export async function fetchNewsManifest() {
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
    availableNewsDates = normalized;
    return normalized;
  } catch (e) {
    return null;
  }
}

export async function loadAvailableNews() {
  if (availableNewsDates !== null) return availableNewsDates;
  return fetchNewsManifest();
}

function isoToUrl(iso) {
  return `./data/news-${iso}.json`;
}

export async function goToAdjacentAvailable(delta) {
  const manifest = await loadAvailableNews();
  const dp = document.getElementById("datePicker");
  const currentISO = dp ? dp.value : formatDateISO(new Date());
  if (manifest && Array.isArray(manifest)) {
    const asc = [...manifest].sort(); // ascending
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
    const todayMid = new Date(formatDateISO(new Date()) + "T00:00:00");
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

export async function goToPrevNews() {
  await goToAdjacentAvailable(-1);
  updateNavButtonsState();
}
export async function goToNextNews() {
  await goToAdjacentAvailable(+1);
  updateNavButtonsState();
}

export async function goToLatestNews() {
  const manifest = await loadAvailableNews();
  if (manifest && manifest.length) {
    const latestIso = manifest[0]; // fetchNewsManifest produced reverse-sorted list
    updateCurrentDate(new Date(latestIso + "T00:00:00"));
    updateNavButtonsState();
    return;
  }

  const today = new Date();
  for (let i = 0; i < PROBE_LIMIT_DAYS; i++) {
    const tryDate = new Date();
    tryDate.setDate(today.getDate() - i);
    const url = isoToUrl(formatDateISO(tryDate));
    try {
      const resp = await fetch(url, { method: "HEAD", cache: "no-store" });
      if (resp.ok) {
        updateCurrentDate(tryDate);
        updateNavButtonsState();
        return;
      }
    } catch (e) {
      try {
        const resp2 = await fetch(url, { cache: "no-store" });
        if (resp2.ok) {
          updateCurrentDate(tryDate);
          updateNavButtonsState();
          return;
        }
      } catch (err) {}
    }
  }

  updateNavButtonsState();
}

export function updateNavButtonsState(date = null) {
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

window.goToLatestNews = goToLatestNews;
