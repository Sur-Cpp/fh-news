/* ═══════════════════════════════════════
   nav.js — Navigation & filter tabs
   ═══════════════════════════════════════ */

(function ($) {
  "use strict";

  window.NR = window.NR || {};

  function openMobileNav() {
    $("#navHamburger").addClass("open").attr("aria-expanded", "true");
    $("#mobileNav").addClass("open").attr("aria-hidden", "false");
  }

  function closeMobileNav() {
    $("#navHamburger").removeClass("open").attr("aria-expanded", "false");
    $("#mobileNav").removeClass("open").attr("aria-hidden", "true");
  }

  function bindNav(setFilter) {
    // desktop nav
    $(document).on("click", ".nav-item", function (e) {
      e.preventDefault();
      const f = $(this).data("filter").toString();
      // sync mobile
      $(".mnav-item").removeClass("active");
      $(`.mnav-item[data-filter="${f}"]`).addClass("active");
      setFilter(f);
    });

    // mobile nav
    $(document).on("click", ".mnav-item", function (e) {
      e.preventDefault();
      const f = $(this).data("filter").toString();
      $(".nav-item").removeClass("active");
      $(`.nav-item[data-filter="${f}"]`).addClass("active");
      setFilter(f);
      closeMobileNav();
    });

    // hamburger
    $("#navHamburger").on("click", function () {
      $(this).hasClass("open") ? closeMobileNav() : openMobileNav();
    });

    // close mobile nav on outside click
    $(document).on("click", function (e) {
      if (!$(e.target).closest(".site-header").length) closeMobileNav();
    });
  }

  function setActiveNav(f) {
    $(".nav-item").removeClass("active");
    $(`.nav-item[data-filter="${f}"]`).addClass("active");
  }

  // kinda gimicky ik but this is way better than the 10 line monsotrsity we f'ing had. - sur
  $(document).on("click", ".see-all-btn", function (e) {
    // console.log("Button clicked!", e);
    const filterValue = $(this).data("filter");
    //    console.log(filterValue);

    $(`a[data-filter="${filterValue}"]`).click();
  });

  window.NR.bindNav = bindNav;
  window.NR.setActiveNav = setActiveNav;
  window.NR.closeMobileNav = closeMobileNav;
})(jQuery);
