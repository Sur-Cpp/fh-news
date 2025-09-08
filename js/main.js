import * as news from "./news.js";
import * as nav from "./navigation.js";
import { initializeTheme } from "./theme.js";

nav.setLoader(news.loadNewsContent);

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
