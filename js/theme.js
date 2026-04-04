/* ═══════════════════════════════════════
   theme.js — Dark / Light mode
   ═══════════════════════════════════════ */
(function ($) {
  'use strict';

  window.NR = window.NR || {};

  function setTheme(t) {
    $('html').attr('data-theme', t);
    localStorage.setItem('nr-theme', t);
    // Bootstrap Icons: sun for dark mode (switch to light), moon for light mode
    $('#themeBtn').html(
      t === 'dark'
        ? '<i class="bi bi-sun-fill"></i>'
        : '<i class="bi bi-moon-fill"></i>'
    );
    // swap bg image
    $('#siteBg')
      .css('background-image', `url('./assets/${t === 'dark' ? 'dark-bg' : 'light-bg'}.png')`);
  }

  function initTheme() {
    const saved = localStorage.getItem('nr-theme') || 'dark';
    setTheme(saved);
  }

  $(document).on('click', '#themeBtn', function () {
    const next = $('html').attr('data-theme') === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });

  // expose
  window.NR.setTheme  = setTheme;
  window.NR.initTheme = initTheme;

}(jQuery));
