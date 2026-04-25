/* ═══════════════════════════════════════
   search.js — Search drawer & filtering
   ═══════════════════════════════════════ */
(function ($) {
  'use strict';

  window.NR = window.NR || {};

  function bindSearch(getAllNews, getActiveFilter, renderView) {
    $('#btnSearchOpen').on('click', function () {
      const isOpen = $('#searchDrawer').hasClass('open');
      $('#searchDrawer').toggleClass('open');
      if (!isOpen) setTimeout(() => $('#searchInput').focus(), 60);
    });

    $('#btnSearchClose').on('click', () => hideSearch(getActiveFilter, renderView));

    $('#searchInput').on('keydown', function (e) {
      if (e.key === 'Enter') runSearch($(this).val().trim(), getAllNews);
      if (e.key === 'Escape') hideSearch(getActiveFilter, renderView);
    });
  }

  function hideSearch(getActiveFilter, renderView) {
    $('#searchDrawer').removeClass('open');
    $('#searchInput').val('');
    if (!$('#secSearch').hasClass('hidden')) {
      renderView(getActiveFilter());
    }
  }

  function runSearch(q, getAllNews) {
    if (!q) return;
    const lq = q.toLowerCase();
    const allNews = getAllNews();
    const results = allNews.filter(n =>
      n.heading.toLowerCase().includes(lq) ||
      n.summary.toLowerCase().includes(lq) ||
      (n.tags || []).some(t => t.toLowerCase().includes(lq)) ||
      n.author.toLowerCase().includes(lq)
    );

    ['#secFeatured','#secBreaking','#secEvents','#secDispatch','#secSpotlight']
      .forEach(s => $(s).addClass('hidden'));

    $('#secSearch').removeClass('hidden');
    $('#searchMeta').text(`"${q}" — ${results.length} result${results.length !== 1 ? 's' : ''}`);
    window.NR.renderSearchResults(results);
  }

  window.NR.bindSearch = bindSearch;
  window.NR.hideSearch = hideSearch;

}(jQuery));
