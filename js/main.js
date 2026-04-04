/* ═══════════════════════════════════════
   main.js — Entry point
   Uses loader.js for manifest + lazy article fetch
   ═══════════════════════════════════════ */
(function ($) {
  "use strict";

  let allNews = [];
  let activeFilter = "all";

  function getAllNews() {
    return allNews;
  }
  function getActiveFilter() {
    return activeFilter;
  }

  function setFilter(f) {
    activeFilter = f;
    window.NR.setActiveNav(f);
    window.NR.hideSearch(getActiveFilter, doRenderView);
    window.NR.loader.resetPages();
    doRenderView(f);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function doRenderView(f) {
    window.NR.renderView(f, allNews);
    // After rendering visible cards, prefetch bodies of
    // the first few articles so opening them feels instant
    const visible = allNews.slice(0, 5).map((n) => n.id);
    window.NR.loader.prefetch(visible);
  }

  function renderDate() {
    $("#hDate").text(
      new Date().toLocaleDateString(undefined, {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    );
  }

  function boot() {
    window.NR.loader
      .fetchManifest()
      .done(function (data) {
        $("#stateLoading").addClass("hidden");

        const siteName = data.site.name;
        $("#siteWordmark, #footerName").text(siteName);
        $("title").text(siteName);

        allNews = (data.articles || []).sort(
          (a, b) => new Date(b.published) - new Date(a.published),
        );

        // Deep-link check first — still render feed behind it
        window.NR.checkDeepLink(allNews);
        doRenderView("all");

        // Set up lazy-load observer after first render
        window.NR.initLazyLoad();
      })
      .fail(function () {
        $("#stateLoading").addClass("hidden");
        $("#stateError").removeClass("hidden");
      });
  }

  $(function () {
    window.NR.initTheme();
    renderDate();
    window.NR.bindNav(setFilter);
    window.NR.bindSearch(getAllNews, getActiveFilter, function (f) {
      window.NR.loader.resetPages();
      window.NR.renderView(f, allNews);
    });
    window.NR.bindArticle(getAllNews);
    boot();
  });
})(jQuery);
