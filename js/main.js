// js/main.js
import * as news from "./news.js";
import * as nav from "./navigation.js";
import { initializeTheme } from "./theme.js";

nav.setLoader(news.loadNewsContent);

const $ = (sel, ctx = document) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx = document) =>
  Array.from((ctx || document).querySelectorAll(sel));

let lastScrollY = window.scrollY;
const bottomNav = document.querySelector(".bottom-navbar");

window.addEventListener("scroll", () => {
  if (!bottomNav) return;

  if (window.scrollY > lastScrollY) {
    bottomNav.style.transform = "translateY(100%)";
  } else {
    bottomNav.style.transform = "translateY(0)";
  }

  lastScrollY = window.scrollY;
});

function syncDatePickers() {
  const top = document.getElementById("datePicker");
  const bottom = document.getElementById("bottomDatePicker");

  if (!top && !bottom) return;

  const today = new Date().toISOString().slice(0, 10);
  if (top && !top.value) top.value = today;
  if (bottom && !bottom.value) bottom.value = today;

  if (top && bottom) {
    let syncing = false;
    top.addEventListener("change", () => {
      if (syncing) return;
      syncing = true;
      bottom.value = top.value;
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

function syncThemeToggles() {
  const top = document.getElementById("themeToggle");
  const bottom = document.getElementById("themeToggleBottom");

  if (!top && !bottom) return;

  if (top && bottom) {
    bottom.checked = top.checked;

    let syncing = false;

    top.addEventListener("change", () => {
      if (syncing) return;
      syncing = true;
      bottom.checked = top.checked;
      syncing = false;
    });

    bottom.addEventListener("change", () => {
      if (syncing) return;
      if (top.checked === bottom.checked) return;
      syncing = true;
      top.checked = bottom.checked;
      top.dispatchEvent(new Event("change", { bubbles: true }));
      syncing = false;
    });
  } else if (top && !bottom) {
  } else if (!top && bottom) {
    bottom.addEventListener("change", (ev) => {
      const isDark = ev.target.checked;
      const theme = isDark ? "dark" : "light";
      document.documentElement.setAttribute("data-bs-theme", theme);
      try {
        localStorage.setItem("theme", theme);
      } catch (e) {}
    });

    try {
      const saved = localStorage.getItem("theme");
      if (saved) bottom.checked = saved === "dark";
    } catch (e) {}
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  nav
    .fetchNewsManifest()
    .then((m) => {
      if (m && m.length) nav.availableNewsDates = m;
    })
    .catch(() => {
      nav.availableNewsDates = null;
    });

  nav.initializeDatePicker();
  nav.updateCurrentDate();

  initializeTheme();

  syncDatePickers();

  syncThemeToggles();

  const prevBtn = document.getElementById("prevNewsBtn");
  const nextBtn = document.getElementById("nextNewsBtn");
  if (prevBtn) prevBtn.addEventListener("click", () => nav.goToPrevNews());
  if (nextBtn) nextBtn.addEventListener("click", () => nav.goToNextNews());

  window.goToPrevNews = nav.goToPrevNews;
  window.goToNextNews = nav.goToNextNews;
  window.openImageViewer = news.openImageViewer;
  window.closeImageViewer = news.closeImageViewer;
  window.updateCurrentDate = nav.updateCurrentDate;
});
