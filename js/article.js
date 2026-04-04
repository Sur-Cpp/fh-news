/* ═══════════════════════════════════════
   article.js — Full-screen article view
   • Fetches body on demand via loader.js
   • Deep-link: ?article=slug
   • Share button
   ═══════════════════════════════════════ */
(function ($) {
  "use strict";

  window.NR = window.NR || {};

  /* ── Open article ─────────────────────────────────── */
  function openArticle(n) {
    const { TIER, esc, fmtDate, isNew } = window.NR;
    const tier = TIER[n.type] || { name: "News", tag: "t-dispatch" };

    // Render shell immediately with what we have from the manifest
    $("#artTierTag")
      .text(tier.name)
      .attr("class", "art-tier-tag " + tier.tag);
    isNew(n)
      ? $("#artNewBadge").removeClass("hidden")
      : $("#artNewBadge").addClass("hidden");
    $("#artTitle").text(n.heading);
    $("#artByline").html(
      `<span>${esc(n.author)}</span><span>${fmtDate(n.published)}</span>`,
    );

    // Cover with blur bg
    if (n.thumbnail) {
      $("#artCover")
        .html(
          `
        <div class="art-cover-blur" style="background-image:url('${esc(n.thumbnail)}')"></div>
        <img src="${esc(n.thumbnail)}" alt="${esc(n.heading)}" onerror="$('#artCover').addClass('hidden')">
        <div class="art-cover-fade"></div>
      `,
        )
        .removeClass("hidden");
    } else {
      $("#artCover").addClass("hidden");
    }

    // Show skeleton while body loads
    $("#artBody").html(
      '<div class="art-body-skeleton"><div class="skel-line"></div><div class="skel-line short"></div><div class="skel-line"></div><div class="skel-line med"></div></div>',
    );
    $("#artTagsRow").html("");

    // Reset progress
    $("#artProgressFill").css("width", "0%");
    $("#artProgressLabel").text("");

    // Push URL
    const slug = n.slug || n.id;
    const url = new URL(window.location.href);
    url.searchParams.set("article", slug);
    history.pushState({ articleSlug: slug }, "", url.toString());

    // Show overlay immediately — body fetches in background
    $("#artOverlay").removeClass("hidden").scrollTop(0);
    $("body").css("overflow", "hidden");

    // Fetch body (cached after first load)
    window.NR.loader.fetchArticle(n.id).then(function (body) {
      // Only update if this article is still open
      if ($("#artTitle").text() !== n.heading) return;

      $("#artBody").html(window.NR.renderBody(body));
      $("#artTagsRow").html(
        (n.tags || [])
          .map((t) => `<span class="art-tag">${esc(t)}</span>`)
          .join(""),
      );
    });
  }

  /* ── Close ─────────────────────────────────────────── */
  function closeArticle() {
    $("#artOverlay").addClass("hidden");
    $("body").css("overflow", "");
    const url = new URL(window.location.href);
    url.searchParams.delete("article");
    history.pushState({}, "", url.toString());
  }

  /* ── Share ─────────────────────────────────────────── */
  function shareArticle() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: $("#artTitle").text(), url });
    } else {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          const btn = $("#artShareBtn");
          const orig = btn.html();
          btn.html('<i class="bi bi-check2"></i> Copied!');
          setTimeout(() => btn.html(orig), 2000);
        })
        .catch(() => prompt("Copy this link:", url));
    }
  }

  /* ── Reading progress ───────────────────────────────── */
  function updateProgress() {
    const el = document.getElementById("artOverlay");
    const total = el.scrollHeight - el.clientHeight;
    if (total <= 0) return;
    const pct = Math.min(100, Math.round((el.scrollTop / total) * 100));
    $("#artProgressFill").css("width", pct + "%");
    $("#artProgressLabel").text(pct + "%");
  }

  /* ── Deep-link on page load ─────────────────────────── */
  function checkDeepLink(allNews) {
    const slug = new URLSearchParams(window.location.search).get("article");
    if (!slug) return false;
    const n = allNews.find((a) => a.slug === slug || a.id === slug);
    if (n) {
      openArticle(n);
      return true;
    }
    return false;
  }

  /* ── Lazy load observer ─────────────────────────────── */
  function initLazyLoad() {
    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.dataset.src;
            if (src) {
              img.src = src;
              img.removeAttribute("data-src");
            }
            observer.unobserve(img);
          }
        });
      },
      { rootMargin: "200px" },
    );

    // Observe all images with data-src (lazy)
    document
      .querySelectorAll("img[data-src]")
      .forEach((img) => observer.observe(img));

    // Also observe feed sections for section-level lazy render
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("section-visible");
            sectionObserver.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "100px" },
    );

    document.querySelectorAll(".feed-section:not(.hidden)").forEach((s) => {
      sectionObserver.observe(s);
    });
  }

  /* ── Bind events ─────────────────────────────────────── */
  function bindArticle(getAllNews) {
    $(document).on(
      "click",
      ".featured-banner, .breaking-hero-card, .breaking-rail-card, " +
        ".events-hero-card, .events-rail-card, .dispatch-card, .spotlight-card",
      function () {
        const n = getAllNews().find((a) => a.id == $(this).data("id"));
        if (n) openArticle(n);
      },
    );

    $(document).on("click", "#artBack", closeArticle);
    $(document).on("click", "#artShareBtn", shareArticle);

    window.addEventListener("popstate", function (e) {
      if (!e.state || !e.state.articleSlug) {
        $("#artOverlay").addClass("hidden");
        $("body").css("overflow", "");
      }
    });

    $(document).on("keydown", function (e) {
      if (e.key === "Escape" && !$("#artOverlay").hasClass("hidden"))
        closeArticle();
    });

    document
      .getElementById("artOverlay")
      .addEventListener("scroll", updateProgress, { passive: true });
  }

  window.NR.openArticle = openArticle;
  window.NR.closeArticle = closeArticle;
  window.NR.bindArticle = bindArticle;
  window.NR.checkDeepLink = checkDeepLink;
  window.NR.initLazyLoad = initLazyLoad;
})(jQuery);
