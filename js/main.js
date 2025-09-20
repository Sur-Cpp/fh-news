// js/index.js - complete replacement
import * as news from "./news.js";
import * as nav from "./navigation.js";
import { initializeTheme } from "./theme.js";

nav.setLoader(news.loadNewsContent);

/* -------------------------
   Helpers: DOM utilities
   ------------------------- */
const $ = (sel, ctx = document) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx = document) =>
  Array.from((ctx || document).querySelectorAll(sel));

/* -------------------------
   Sync helpers (date + theme)
   ------------------------- */

/**
 * Keep #datePicker and #bottomDatePicker mirrored (two-way).
 * If one is missing this silently degrades.
 */

/**Scroll utilities
 * for mobile
 */
let lastScrollY = window.scrollY;
const bottomNav = document.querySelector(".bottom-navbar");

window.addEventListener("scroll", () => {
  if (!bottomNav) return;

  if (window.scrollY > lastScrollY) {
    // user scrolling down → hide
    bottomNav.style.transform = "translateY(100%)";
  } else {
    // user scrolling up → show
    bottomNav.style.transform = "translateY(0)";
  }

  lastScrollY = window.scrollY;
});

function syncDatePickers() {
  const top = document.getElementById("datePicker");
  const bottom = document.getElementById("bottomDatePicker");

  // If neither present, nothing to do
  if (!top && !bottom) return;

  // Ensure a sensible default (today) if no value
  const today = new Date().toISOString().slice(0, 10);
  if (top && !top.value) top.value = today;
  if (bottom && !bottom.value) bottom.value = today;

  if (top && bottom) {
    // prevent re-entrant loops via a small guard
    let syncing = false;
    top.addEventListener("change", () => {
      if (syncing) return;
      syncing = true;
      bottom.value = top.value;
      // optionally dispatch input/change if other code expects it
      bottom.dispatchEvent(new Event("change", { bubbles: true }));
      syncing = false;
    });
    bottom.addEventListener("change", () => {
      if (syncing) return;
      syncing = true;
      top.value = bottom.value;
      top.dispatchEvent(new Event("change", { bubbles: true }));
      syncing = false;
    });
  }
}

/**
 * Keep two theme toggles (#themeToggle and #themeToggleBottom) visually
 * and functionally synchronized. This function **does not** duplicate
 * theme logic; it delegates to the `themeToggle`'s existing `change`
 * handler (set up by initializeTheme()) by programmatically dispatching
 * a `change` event on it when the bottom toggle is used.
 *
 * Behavior:
 *  - After initializeTheme() runs (so the top toggle exists and handlers are bound),
 *    call this to wire the bottom toggle.
 *  - Works with theme.js storage sync (theme.js already listens to 'storage').
 */
function syncThemeToggles() {
  const top = document.getElementById("themeToggle"); // controlled by theme.js
  const bottom = document.getElementById("themeToggleBottom");

  if (!top && !bottom) return;

  // If top exists we use its checked state as source-of-truth
  if (top && bottom) {
    // initialize bottom to match top immediately
    bottom.checked = top.checked;

    // small guard to prevent infinite loops
    let syncing = false;

    // When top changes (theme.js will handle setTheme), keep bottom in sync
    top.addEventListener("change", () => {
      if (syncing) return;
      syncing = true;
      bottom.checked = top.checked;
      syncing = false;
    });

    // When bottom changes, forward the action to top toggle to let theme.js handle it
    bottom.addEventListener("change", () => {
      if (syncing) return;
      // If top already equals desired state, just set bottom (no extra)
      if (top.checked === bottom.checked) return;
      syncing = true;
      top.checked = bottom.checked;
      // Dispatch a change event on the top toggle so theme.js's handler runs
      top.dispatchEvent(new Event("change", { bubbles: true }));
      syncing = false;
    });
  } else if (top && !bottom) {
    // nothing to wire, just ensure top's state is used (theme.js does that)
  } else if (!top && bottom) {
    // If theme.js didn't wire a top toggle but we have a bottom,
    // keep bottom toggling the attribute + localStorage directly so theme still works.
    bottom.addEventListener("change", (ev) => {
      const isDark = ev.target.checked;
      const theme = isDark ? "dark" : "light";
      document.documentElement.setAttribute("data-bs-theme", theme);
      try {
        localStorage.setItem("theme", theme);
      } catch (e) {
        /* ignore if storage blocked */
      }
      // If theme.js exists and listens to storage, it will pick this up across tabs.
    });

    // initialize from saved theme if present
    try {
      const saved = localStorage.getItem("theme");
      if (saved) bottom.checked = saved === "dark";
    } catch (e) {}
  }
}

/* ---------------------------------------
   DOMContentLoaded: existing init + sync
   --------------------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
  // fetch news manifest for nav (unchanged)
  nav
    .fetchNewsManifest()
    .then((m) => {
      if (m && m.length) nav.availableNewsDates = m;
    })
    .catch(() => {
      nav.availableNewsDates = null;
    });

  // initialize navigation datepicker and current date
  nav.initializeDatePicker();
  nav.updateCurrentDate();

  // initialize central theme handling first (theme.js binds top toggle handler)
  initializeTheme();

  // wire same-page UI sync (date pickers + second theme toggle)
  // date picker syncing should run after nav.initializeDatePicker()
  syncDatePickers();

  // theme toggles sync: relies on initializeTheme having already bound the top toggle
  syncThemeToggles();

  // attach buttons (previous / next). Prefer buttons used in your layout:
  const prevBtn = document.getElementById("prevNewsBtn");
  const nextBtn = document.getElementById("nextNewsBtn");
  if (prevBtn) prevBtn.addEventListener("click", () => nav.goToPrevNews());
  if (nextBtn) nextBtn.addEventListener("click", () => nav.goToNextNews());

  // expose some helpers to the window as your original file did
  window.goToPrevNews = nav.goToPrevNews;
  window.goToNextNews = nav.goToNextNews;
  window.openImageViewer = news.openImageViewer;
  window.closeImageViewer = news.closeImageViewer;
  window.updateCurrentDate = nav.updateCurrentDate;
});
