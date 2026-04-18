/* ═══════════════════════════════════════
   main.js — Entry point
   Uses loader.js for manifest + lazy article fetch
   ═══════════════════════════════════════ */
(function ($) {
  "use strict";

  let allNews = [];
  let activeFilter = "all";
  let activeDateFilter = null;

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

  /* ── Shared date formatter ── */
  function formatISODate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return null;

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function doRenderView(f) {
    let filteredNews = allNews;

    if (activeDateFilter) {
      filteredNews = allNews.filter((n) => {
        if (!n.published) return false;

        const formattedDate = formatISODate(n.published);
        return formattedDate === activeDateFilter;
      });
    }

    window.NR.renderView(f, filteredNews);

    const visible = filteredNews.slice(0, 5).map((n) => n.id);
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

  function handleUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get("date");
    const categoryParam = params.get("category");

    if (dateParam) {
      activeDateFilter = dateParam;
    }

    let targetFilter = "all";

    if (categoryParam) {
      const catMap = {
        "breaking-news": "1",
        weekly: "2",
        spotlight: "3",
        events: "4",
      };
      targetFilter = catMap[categoryParam.toLowerCase()] || "all";
    }

    setFilter(targetFilter);
  }

  /* ── Date filter UI wiring ── */
  function bindDateFilter() {
    $("#dateFilterBtn").on("click", function (e) {
      e.stopPropagation();

      const input = document.getElementById("dateFilterInput");
      if (input.showPicker) input.showPicker();
      else input.focus();
    });

    $("#dateFilterInput").on("change", function () {
      activeDateFilter = this.value || null;
      window.NR.loader.resetPages();
      doRenderView(activeFilter);
    });

    $("#dateFilterClear").on("click", function (e) {
      e.stopPropagation();
      activeDateFilter = null;
      $("#dateFilterInput").val("");
      window.NR.loader.resetPages();
      doRenderView(activeFilter);
    });
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

        window.NR.checkDeepLink(allNews);
        handleUrlParams();
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
    bindDateFilter();

    $("#navSearchBtnMobile").on("click", function () {
      $("#btnSearchOpen").click();
    });

    window.NR.bindSearch(getAllNews, getActiveFilter, function (f) {
      window.NR.loader.resetPages();

      let searchPool = allNews;

      if (activeDateFilter) {
        searchPool = allNews.filter((n) => {
          if (!n.published) return false;

          const formattedDate = formatISODate(n.published);
          return formattedDate === activeDateFilter;
        });
      }

      window.NR.renderView(f, searchPool);
    });

    window.NR.bindArticle(getAllNews);
    boot();
  });
})(jQuery);
