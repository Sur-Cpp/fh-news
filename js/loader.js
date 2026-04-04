/* ═══════════════════════════════════════════════════
   loader.js — Data layer
   • Fetches index.json (manifest, no bodies)
   • Fetches individual news/{id}.json on demand
   • In-memory cache so each article body loads once
   • Exposes pagination helpers
   ═══════════════════════════════════════════════════ */
(function ($) {
  "use strict";

  window.NR = window.NR || {};

  const MANIFEST_URL = "index.json";
  const ARTICLE_DIR = "news/";
  const PAGE_SIZE = { dispatch: 6, spotlight: 4, search: 9 };

  /* ── In-memory article body cache ── */
  const _bodyCache = {}; // id → body array
  const _inflight = {}; // id → Promise (deduplicate concurrent fetches)

  /* ── Fetch manifest (called once on boot) ── */
  function fetchManifest() {
    return $.getJSON(MANIFEST_URL);
  }

  /* ── Fetch a single article body ── */
  function fetchArticle(id) {
    if (_bodyCache[id]) return Promise.resolve(_bodyCache[id]);
    if (_inflight[id]) return _inflight[id];

    _inflight[id] = fetch(`${ARTICLE_DIR}${id}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} for ${id}.json`);
        return r.json();
      })
      .then((data) => {
        _bodyCache[id] = data.body || [];
        delete _inflight[id];
        return _bodyCache[id];
      })
      .catch((err) => {
        delete _inflight[id];
        console.error("[NR] Failed to load article", id, err);
        return [];
      });

    return _inflight[id];
  }

  /* ── Prefetch articles likely to be opened soon ── */
  function prefetch(ids) {
    ids.forEach((id) => {
      if (!_bodyCache[id] && !_inflight[id]) fetchArticle(id);
    });
  }

  /* ── Pagination state ── */
  // Stores { page, total, items[] } per section key
  const _pages = {};

  function initPage(key, items) {
    _pages[key] = { page: 1, items };
  }

  function getPage(key) {
    const state = _pages[key];
    if (!state) return { items: [], hasMore: false };
    const size = PAGE_SIZE[key] || 6;
    const slice = state.items.slice(0, state.page * size);
    return {
      items: slice,
      hasMore: slice.length < state.items.length,
      total: state.items.length,
    };
  }

  function nextPage(key) {
    if (_pages[key]) _pages[key].page++;
  }

  function resetPages() {
    Object.keys(_pages).forEach((k) => {
      if (_pages[k]) _pages[k].page = 1;
    });
  }

  /* expose */
  window.NR.loader = {
    fetchManifest,
    fetchArticle,
    prefetch,
    initPage,
    getPage,
    nextPage,
    resetPages,
    PAGE_SIZE,
  };
})(jQuery);
