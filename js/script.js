/* ==========================================================================
   Cradles of Civilization — behavior
   - Scroll-triggered fade-ins (IntersectionObserver, unobserves after firing)
   - Scroll-spy wayfinder + reading-progress spine (rAF-throttled, passive)
   - Mobile menu toggle
   - Back-to-top button
   All scroll work is throttled with requestAnimationFrame so it never
   fights the browser's paint cycle -> no jank on low-power classroom PCs.
   ========================================================================== */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Fade-in on scroll ---------- */
  var fadeEls = document.querySelectorAll(".fade-up");

  if (prefersReduced || !("IntersectionObserver" in window)) {
    // No motion preference / no support: just show everything immediately.
    fadeEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target); // fire once, then stop watching -> saves cycles
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    fadeEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 2. Scroll-spy + progress spine ---------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll("section[id]"));
  var dots = document.querySelectorAll(".way-dot");
  var spineFill = document.getElementById("spineFill");

  var ticking = false;

  function updateOnScroll() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (spineFill) spineFill.style.height = progress + "%";

    // Which section is currently most in view?
    var current = sections[0] && sections[0].id;
    var viewportMid = scrollTop + window.innerHeight * 0.35;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop <= viewportMid) current = sections[i].id;
    }
    dots.forEach(function (dot) {
      dot.classList.toggle("active", dot.dataset.target === current);
    });

    ticking = false;
  }

  window.addEventListener(
    "scroll",
    function () {
      if (!ticking) {
        window.requestAnimationFrame(updateOnScroll);
        ticking = true;
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", updateOnScroll, { passive: true });
  updateOnScroll(); // set initial state on load

  /* ---------- 3. Mobile menu ---------- */
  var menuToggle = document.getElementById("menuToggle");
  var mobileMenu = document.getElementById("mobileMenu");

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", function () {
      var isOpen = mobileMenu.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileMenu.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------- 4. Back to top ---------- */
  var backToTop = document.getElementById("backToTop");
  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
    });
  }
})();
