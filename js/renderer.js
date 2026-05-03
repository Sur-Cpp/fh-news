/* ═══════════════════════════════════════
   renderer.js — Card & section rendering
   ═══════════════════════════════════════ */
(function ($) {
  "use strict";

  window.NR = window.NR || {};

  const NEW_HOURS = 48;

  const TIER = {
    1: { name: "Breaking", tag: "t-breaking" },
    4: { name: "Event", tag: "t-events" },
    2: { name: "Weekly", tag: "t-dispatch" },
    3: { name: "Spotlight", tag: "t-spotlight" },
  };

  // Max items shown per section when in 'all' / 'latest' view
  const ALL_VIEW_LIMITS = {
    breaking: { rail: 4 }, // 1 hero + up to 4 rail cards
    events: { rail: 4 },
    dispatch: 3, // grid cards
    spotlight: 2, // grid cards
  };

  /* ── Helpers ── */
  function esc(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fmtDate(iso) {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch (_) {
      return iso;
    }
  }

  function isNew(n) {
    if (!n.published) return false;
    return (Date.now() - new Date(n.published)) / 36e5 <= NEW_HOURS;
  }

  function newBadge(n, small) {
    if (!isNew(n)) return "";
    return small
      ? `<span class="card-new-badge">New</span>`
      : `<span class="new-badge">New</span>`;
  }

  function tierColor(type) {
    const map = {
      1: "var(--breaking)",
      4: "var(--events)",
      2: "var(--dispatch)",
      3: "var(--spotlight)",
    };
    return map[type] || "var(--blue)";
  }

  /* ── See-all button HTML ── */
  function seeAllBtn(filterValue, label) {
    return `<button class="see-all-btn" data-filter="${esc(filterValue)}">
      ${esc(label)} <span class="see-all-arrow">→</span>
    </button>`;
  }

  /* ── Inline markdown (safe — runs after escaping) ── */
  function md(text) {
    if (!text) return "";
    let t = esc(text);
    t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    t = t.replace(/\*(.+?)\*/g, "<em>$1</em>");
    t = t.replace(/__(.+?)__/g, "<u>$1</u>");
    t = t.replace(/~~(.+?)~~/g, "<s>$1</s>");
    t = t.replace(/`(.+?)`/g, "<code>$1</code>");
    t = t.replace(/\n/g, "<br>");
    return t;
  }

  /* ── Article body blocks ── */
  function renderBody(blocks) {
    return (blocks || [])
      .map((b) => {
        let html = "";

        switch (b.tag) {
          case "h2":
            html = `<h2>${md(b.content)}</h2>`;
            break;
          case "h3":
            html = `<h3>${md(b.content)}</h3>`;
            break;
          case "p":
            html = `<p>${md(b.content)}</p>`;
            break;
          case "divider":
            html = `<hr>`;
            break;
          case "list": {
            const tag = b.style === "ol" ? "ol" : "ul";
            const items = (b.items || [])
              .map((i) => `<li>${md(i)}</li>`)
              .join("");
            html = `<${tag}>${items}</${tag}>`;
            break;
          }
          case "quote":
            html = `<div class="art-blockquote">
              <p>${md(b.content)}</p>
              ${b.attribution ? `<cite>— ${esc(b.attribution)}</cite>` : ""}
            </div>`;
            break;
          case "link":
            html = `<a class="art-link-btn" href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">${esc(b.label)}</a>`;
            break;
          case "image": {
            const rawSrc = b.src || "";
            const pipIdx = rawSrc.indexOf("|");
            let src,
              sizeStyle = "";

            if (pipIdx !== -1) {
              src = rawSrc.slice(0, pipIdx).trim();
              const sizeRaw = rawSrc.slice(pipIdx + 1).trim();
              if (/^\d+$/.test(sizeRaw)) {
                sizeStyle = `width:${sizeRaw}px`;
              } else if (/^\d+(\.\d+)?(%|px|vw|rem|em)$/.test(sizeRaw)) {
                sizeStyle = `width:${sizeRaw}`;
              }
            } else {
              src = rawSrc;
            }

            const alt = esc(b.alt || "");
            const sizeAttr = sizeStyle
              ? `class="art-img-sized" style="${sizeStyle}"`
              : ``;
            html = `<img src="${esc(src)}" alt="${alt}" ${sizeAttr} onerror="this.style.display='none'">`;
            break;
          }
          case "section-break": {
            if (b.type === "corrupted") {
              html = `<div class="fhn-divider corrupted">
                <div class="fhn-divider-half left">
                  <div class="fhn-divider-top"></div>
                  <div class="fhn-divider-tape"><div class="fhn-divider-track">${'<span>· [ DATA EXPUNGED ] ·</span><span class="sep">· UNKNOWN ·</span>'.repeat(16)}</div></div>
                  <div class="fhn-divider-bot"></div>
                </div>
                <div class="fhn-divider-half right">
                  <div class="fhn-divider-top"></div>
                  <div class="fhn-divider-tape"><div class="fhn-divider-track">${'<span>· [ DATA EXPUNGED ] ·</span><span class="sep">· UNKNOWN ·</span>'.repeat(16)}</div></div>
                  <div class="fhn-divider-bot"></div>
                </div>
              </div>`;
            } else if (b.type === "caution") {
              html = `<div class="fhn-divider caution">
                 <div class="fhn-divider-top"></div>
                  <div class="fhn-divider-tape">
                    <div class="fhn-divider-track">
                        ${'<span>· CAUTION ·</span><span class="sep">·</span><span>RESTRICTED AREA</span><span class="sep">·</span>'.repeat(8)}
                    </div>
                  </div>
                <div class="fhn-divider-bot"></div>
              </div>`;
            } else {
              html = `<div class="fhn-divider">
                 <div class="fhn-divider-top"></div>
                  <div class="fhn-divider-tape">
                    <div class="fhn-divider-track">
                        ${'<span><img src="./assets/news-logo.png" id="m_logo"></span><span class="sep">·</span><span>Faction Hub News</span><span class="sep">·</span>'.repeat(16)}
                    </div>
                  </div>
                <div class="fhn-divider-bot"></div>
              </div>`;
            }
            break;
          }
          default:
            html = "";
        }

        // Apply background coloring via CSS wrapper
        if (b.bg && b.bg !== "default") {
          let colorStr = esc(b.bg);

          // Map legacy word colors to solid hexes so the opacity rules in styles.css can handle the transparency cleanly.
          if (!colorStr.startsWith("#")) {
            const legacyColors = {
              red: "#dc2626",
              blue: "#2563eb",
              green: "#059669",
              purple: "#7c3aed",
            };
            colorStr = legacyColors[colorStr] || colorStr;
          }

          html = `<div class="art-block-bg" style="--block-bg-color: ${colorStr};">${html}</div>`;
        }

        return html;
      })
      .join("\n");
  }

  /* ── renderView ─────────────────────────────────────────
     filter values:
       'all'      — every section, capped to 1 row each
       'latest'   — same pipeline as 'all' but pool is
                    pre-filtered to articles within NEW_HOURS
       'featured' — featured banner only
       '1','4','2','3' — single-tier views (full / paginated)
     'latest' shares 100% of the same rendering code as 'all'.
  ────────────────────────────────────────────────────────── */
  function renderView(filter, allNews) {
    [
      "#secFeatured",
      "#secBreaking",
      "#secEvents",
      "#secDispatch",
      "#secSpotlight",
      "#secSearch",
    ].forEach((s) => $(s).addClass("hidden"));

    $("body").removeClass("events-mode");

    // 'latest' pre-filters the pool then falls through as 'all'
    const pool =
      filter === "latest" ? allNews.filter((n) => isNew(n)) : allNews;
    const logical = filter === "latest" ? "all" : filter;
    const isAllView = logical === "all";
    const want = (t) => logical === "all" || logical === String(t);

    if (filter === "4") {
      $("body").addClass("events-mode");
    }

    const featured = pool.filter((n) => n.featured);
    const breaking = pool.filter((n) => n.type === 1);
    const events = pool.filter((n) => n.type === 4);
    const dispatch = pool.filter((n) => n.type === 2);
    const spotlight = pool.filter((n) => n.type === 3);

    if ((logical === "all" || logical === "featured") && featured.length) {
      renderFeatured(featured[0]);
      $("#secFeatured").removeClass("hidden");
    }
    if (want(1) && breaking.length) {
      renderBreaking(breaking, isAllView);
      $("#secBreaking").removeClass("hidden");
    }
    if (want(4) && events.length) {
      renderEvents(events, isAllView);
      $("#secEvents").removeClass("hidden");
    }
    if (want(2) && dispatch.length) {
      renderDispatch(dispatch, isAllView);
      $("#secDispatch").removeClass("hidden");
    }
    if (want(3) && spotlight.length) {
      renderSpotlight(spotlight, isAllView);
      $("#secSpotlight").removeClass("hidden");
    }
  }

  /* ── Featured banner ── */
  function renderFeatured(n) {
    const tier = TIER[n.type] || { name: "News", tag: "t-breaking" };
    const accent = tierColor(n.type);
    const bgHtml = n.thumbnail
      ? `<div class="featured-bg" style="background-image:url('${esc(n.thumbnail)}')"></div>
         <div class="featured-bg-overlay"></div>`
      : "";
    const imgHtml = n.thumbnail
      ? `<img class="featured-img" src="${esc(n.thumbnail)}" alt="" onerror="this.style.display='none'">`
      : "";

    $("#featuredSlot").html(`
      <div class="featured-banner" data-id="${esc(n.id)}" style="--featured-accent:${accent}">
        ${bgHtml}
        ${imgHtml}
        <div class="featured-body">
          <div class="featured-kicker">${esc(tier.name)} ${newBadge(n)}</div>
          <div class="featured-headline">${esc(n.heading)}</div>
          <div class="featured-summary">${esc(n.summary)}</div>
          <div class="featured-meta">${esc(n.author)} · ${fmtDate(n.published)}</div>
        </div>
      </div>`);
  }

  /* ── Breaking ── */
  function renderBreaking(items, limitToRow) {
    const hero = items[0];
    // In all-view: cap rail to ALL_VIEW_LIMITS.breaking.rail
    const railItems = limitToRow
      ? items.slice(1, 1 + ALL_VIEW_LIMITS.breaking.rail)
      : items.slice(1);
    const hasMore =
      limitToRow && items.length > 1 + ALL_VIEW_LIMITS.breaking.rail;

    const imgHtml = hero.thumbnail
      ? `<img class="breaking-hero-img" src="${esc(hero.thumbnail)}" alt="" onerror="this.style.display='none'">`
      : "";

    $("#breakingHero").html(`
      <div class="breaking-hero-card" data-id="${esc(hero.id)}">
        ${imgHtml}
        <div class="breaking-hero-body">
          <div class="tier-kicker kicker-breaking">Breaking News ${newBadge(hero)}</div>
          <div class="t-headline">${esc(hero.heading)}</div>
          <div class="t-summary">${esc(hero.summary)}</div>
          <div class="t-meta">${esc(hero.author)} · ${fmtDate(hero.published)}</div>
        </div>
      </div>`);

    if (railItems.length) {
      $("#breakingRail")
        .html(
          railItems
            .map(
              (n) => `
        <div class="breaking-rail-card" data-id="${esc(n.id)}">
          <div class="kicker kicker-breaking">Breaking ${newBadge(n, true)}</div>
          <div class="c-headline">${esc(n.heading)}</div>
          <div class="c-summary">${esc(n.summary)}</div>
          <div class="c-meta">${esc(n.author)} · ${fmtDate(n.published)}</div>
        </div>`,
            )
            .join(""),
        )
        .show();
    } else {
      $("#breakingRail").hide();
    }

    // Remove old see-all, add new one if capped
    $("#secBreaking .see-all-btn").remove();
    if (limitToRow && (hasMore || items.length > 1)) {
      $("#secBreaking .sec-eyebrow").append(seeAllBtn("1", "See all Breaking"));
    }

    // Attach paginated load-more only in full view
    if (!limitToRow) {
      // no load-more for breaking (it's hero+rail, handled by full array)
    }
  }

  /* ── Events ── */
  function renderEvents(items, limitToRow) {
    const hero = items[0];
    const railItems = limitToRow
      ? items.slice(1, 1 + ALL_VIEW_LIMITS.events.rail)
      : items.slice(1);
    const hasMore =
      limitToRow && items.length > 1 + ALL_VIEW_LIMITS.events.rail;

    const bgHtml = hero.thumbnail
      ? `<div class="featured-bg" style="background-image:url('${esc(hero.thumbnail)}')"></div>
         <div class="featured-bg-overlay"></div>`
      : "";
    const imgHtml = hero.thumbnail
      ? `<img class="events-hero-img" src="${esc(hero.thumbnail)}" alt="" onerror="this.style.display='none'">`
      : "";

    $("#eventsHero").html(`
      <div class="events-hero-card" data-id="${esc(hero.id)}">
        ${bgHtml}
        ${imgHtml}
        <div class="events-hero-body">
          <div class="e-kicker">Event ${newBadge(hero)}</div>
          <div class="e-headline">${esc(hero.heading)}</div>
          <div class="e-summary">${esc(hero.summary)}</div>
          <div class="e-meta">${esc(hero.author)} · ${fmtDate(hero.published)}</div>
        </div>
      </div>`);

    if (railItems.length) {
      $("#eventsRail")
        .html(
          railItems
            .map(
              (n) => `
        <div class="events-rail-card" data-id="${esc(n.id)}">
          <div class="kicker kicker-events">Event ${newBadge(n, true)}</div>
          <div class="c-headline">${esc(n.heading)}</div>
          <div class="c-summary">${esc(n.summary)}</div>
          <div class="c-meta">${esc(n.author)} · ${fmtDate(n.published)}</div>
        </div>`,
            )
            .join(""),
        )
        .show();
    } else {
      $("#eventsRail").hide();
    }

    $("#secEvents .see-all-btn").remove();
    if (limitToRow && (hasMore || items.length > 1)) {
      $("#secEvents .sec-eyebrow").append(seeAllBtn("4", "See all Events"));
    }
  }

  /* ── Weekly (Dispatch) — paginated in full view, capped in all-view ── */
  function renderDispatch(items, limitToRow) {
    $("#secDispatch .see-all-btn").remove();

    if (limitToRow) {
      const capped = items.slice(0, ALL_VIEW_LIMITS.dispatch);
      const html = capped.map((n) => dispatchCardHtml(n)).join("");
      $("#dispatchGrid").html(html);
      $("#dispatchMore").remove();

      if (items.length > ALL_VIEW_LIMITS.dispatch) {
        $("#secDispatch .sec-eyebrow").append(seeAllBtn("2", "See all Weekly"));
      }
      return;
    }

    const loader = window.NR.loader;
    loader.initPage("dispatch", items);
    _renderDispatchPage();
  }

  function _renderDispatchPage() {
    const loader = window.NR.loader;
    const { items, hasMore } = loader.getPage("dispatch");
    const html = items.map((n) => dispatchCardHtml(n)).join("");
    $("#dispatchGrid").html(html);
    _renderLoadMore("#dispatchMore", hasMore, function () {
      loader.nextPage("dispatch");
      _renderDispatchPage();
    });
  }

  /* ── Spotlight — paginated in full view, capped in all-view ── */
  function renderSpotlight(items, limitToRow) {
    $("#secSpotlight .see-all-btn").remove();

    if (limitToRow) {
      const capped = items.slice(0, ALL_VIEW_LIMITS.spotlight);
      const html = capped.map((n) => spotlightCardHtml(n)).join("");
      $("#spotlightGrid").html(html);
      $("#spotlightMore").remove();

      if (items.length > ALL_VIEW_LIMITS.spotlight) {
        $("#secSpotlight .sec-eyebrow").append(
          seeAllBtn("3", "See all Spotlight"),
        );
      }
      return;
    }

    const loader = window.NR.loader;
    loader.initPage("spotlight", items);
    _renderSpotlightPage();
  }

  function _renderSpotlightPage() {
    const loader = window.NR.loader;
    const { items, hasMore } = loader.getPage("spotlight");
    const html = items.map((n) => spotlightCardHtml(n)).join("");
    $("#spotlightGrid").html(html);
    _renderLoadMore("#spotlightMore", hasMore, function () {
      loader.nextPage("spotlight");
      _renderSpotlightPage();
    });
  }

  function spotlightCardHtml(n) {
    return `
      <div class="spotlight-card" data-id="${esc(n.id)}">
        ${n.thumbnail ? `<img class="spotlight-card-thumb" src="${esc(n.thumbnail)}" alt="" onerror="this.remove()">` : ""}
        <div class="spotlight-card-body">
          <div class="sp-kicker">Spotlight ${newBadge(n, true)}</div>
          <div class="sp-headline">${esc(n.heading)}</div>
          <div class="sp-summary">${esc(n.summary)}</div>
          <div class="sp-meta">${esc(n.author)} · ${fmtDate(n.published)}</div>
        </div>
      </div>`;
  }

  /* ── Search results — paginated ── */
  function renderSearchResults(results) {
    const loader = window.NR.loader;
    if (!results.length) {
      $("#searchGrid").html("");
      $("#searchEmpty").removeClass("hidden");
      loader.initPage("search", []);
      return;
    }
    $("#searchEmpty").addClass("hidden");
    loader.initPage("search", results);
    _renderSearchPage();
  }

  function _renderSearchPage() {
    const loader = window.NR.loader;
    const { items, hasMore } = loader.getPage("search");
    const html = items
      .map(
        (n) => `
      <div class="dispatch-card" data-id="${esc(n.id)}" style="border-top-color:${tierColor(n.type)}">
        ${n.thumbnail ? `<img class="dispatch-card-thumb" src="${esc(n.thumbnail)}" alt="" onerror="this.remove()">` : ""}
        <div class="d-kicker" style="color:${tierColor(n.type)}">${esc(TIER[n.type]?.name || "News")} ${newBadge(n, true)}</div>
        <div class="d-headline">${esc(n.heading)}</div>
        <div class="d-summary">${esc(n.summary)}</div>
        <div class="d-meta"><span>${esc(n.author)}</span><span>${fmtDate(n.published)}</span></div>
      </div>`,
      )
      .join("");
    $("#searchGrid").html(html);
    _renderLoadMore("#searchMore", hasMore, function () {
      loader.nextPage("search");
      _renderSearchPage();
    });
  }

  /* ── Shared card html ── */
  function dispatchCardHtml(n) {
    return `
      <div class="dispatch-card" data-id="${esc(n.id)}">
        ${n.thumbnail ? `<img class="dispatch-card-thumb" src="${esc(n.thumbnail)}" alt="" onerror="this.remove()">` : ""}
        <div class="d-kicker">Weekly ${newBadge(n, true)}</div>
        <div class="d-headline">${esc(n.heading)}</div>
        <div class="d-summary">${esc(n.summary)}</div>
        <div class="d-meta"><span>${esc(n.author)}</span><span>${fmtDate(n.published)}</span></div>
      </div>`;
  }

  /* ── Load More button renderer ── */
  function _renderLoadMore(sel, hasMore, onClick) {
    $(sel).remove();
    if (!hasMore) return;
    const btn = $(
      `<button class="load-more-btn" id="${sel.slice(1)}">Load more</button>`,
    );
    btn.on("click", onClick);
    const gridMap = {
      "#dispatchMore": "#dispatchGrid",
      "#spotlightMore": "#spotlightGrid",
      "#searchMore": "#searchGrid",
    };
    $(gridMap[sel]).after(btn);
  }

  // expose
  window.NR.TIER = TIER;
  window.NR.esc = esc;
  window.NR.fmtDate = fmtDate;
  window.NR.md = md;
  window.NR.isNew = isNew;
  window.NR.newBadge = newBadge;
  window.NR.tierColor = tierColor;
  window.NR.renderBody = renderBody;
  window.NR.renderView = renderView;
  window.NR.renderSearchResults = renderSearchResults;
  window.NR.dispatchCardHtml = dispatchCardHtml;
})(jQuery);
