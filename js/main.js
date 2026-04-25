/* ═══════════════════════════════════════
   main.js — Entry point
   Uses loader.js for manifest + lazy article fetch
   ═══════════════════════════════════════ */
(function ($) {
  "use strict";

  let allNews = [];
  let activeFilter = "all";
  let activeDateFilter = null;

  // Flatpickr instance
  let fp;

  const $input = $("#dateFilterInput");
  const $label = $("#dateFilterLabel");
  const $clear = $("#dateFilterClear");
  const $wrap = $("#dateFilterWrap");
  const $btn = $("#dateFilterBtn");

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

    const url = new URL(window.location.href);

    // map numeric filters back to category names if needed
    const catMapReverse = {
      1: "breaking-news",
      2: "weekly",
      3: "spotlight",
      4: "events",
    };

    const categoryValue = catMapReverse[f];

    if (categoryValue) {
      url.searchParams.set("category", categoryValue);
    } else {
      url.searchParams.delete("category");
    }

    window.history.pushState({}, "", url);
  }

  /* ── Shared date formatter ── */
  function formatISODate(dateStr) {
    const d = new Date(dateStr);
    if (isNaN(d)) return null;

    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatLabel(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function setUI(dateStr) {
    if (dateStr) {
      $label.text(formatLabel(dateStr)).removeClass("hidden");
      $clear.removeClass("hidden");
      $wrap.addClass("has-date");
    } else {
      $label.text("").addClass("hidden");
      $clear.addClass("hidden");
      $wrap.removeClass("has-date");
    }
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

  function initDatePicker() {
    fp = flatpickr("#dateFilterInput", {
      dateFormat: "Y-m-d",
      disableMobile: true,

      onChange: function (selectedDates, dateStr) {
        activeDateFilter = dateStr || null;

        const url = new URL(window.location.href);

        if (dateStr) {
          url.searchParams.set("date", dateStr);
        } else {
          url.searchParams.delete("date");
        }

        // ✅ NO reload
        window.history.pushState({}, "", url);

        setUI(dateStr);
        doRenderView(activeFilter);
      },
    });

    // restore state from URL
    const params = new URLSearchParams(window.location.search);
    if (params.has("date")) {
      const date = params.get("date");
      activeDateFilter = date;
      fp.setDate(date, true);
      setUI(date);
    }
  }

  /* ── Date filter UI wiring ── */
  function bindDateFilter() {
    $btn.on("click", function () {
      if (fp) fp.open();
    });

    $clear.on("click", function (e) {
      e.stopPropagation();

      if (fp) fp.clear();

      activeDateFilter = null;

      const url = new URL(window.location.href);
      url.searchParams.delete("date");
      window.location.href = url.toString();
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

        initDatePicker(); // ✅ IMPORTANT: after allNews exists
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
