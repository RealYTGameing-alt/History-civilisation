/* ==========================================================================
   Cradles of Civilization — behavior
   1. Pointer-mode detection (mouse vs touch/smartboard)
   2. Scroll-triggered fade-ins
   3. Scroll-spy wayfinder + reading-progress spine + parallax (shared rAF loop)
   4. Mobile menu toggle
   5. Back-to-top button
   6. Fact-strip count-up animation
   7. Control panel — font scale / high contrast / fullscreen
   8. Hero cursor spotlight
   9. Lightbox for enlarged artifact images
   10. Quiz
   All scroll/pointer work is throttled with requestAnimationFrame so it
   never fights the browser paint cycle — no jank on low-power classroom PCs
   or shared smartboard displays.
   ========================================================================== */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 1. Pointer-mode detection (smartboard / touch support) ---------- */
  var pointerMQ = window.matchMedia("(pointer: coarse)");
  var isCoarsePointer = pointerMQ.matches;

  function applyPointerMode(mq) {
    isCoarsePointer = mq.matches;
    document.documentElement.classList.toggle("touch-mode", isCoarsePointer);
  }
  applyPointerMode(pointerMQ);
  if (pointerMQ.addEventListener) {
    pointerMQ.addEventListener("change", applyPointerMode);
  } else if (pointerMQ.addListener) {
    // Safari < 14 / older WebKit on interactive whiteboards
    pointerMQ.addListener(applyPointerMode);
  }

  /* ---------- 2. Fade-in on scroll ---------- */
  var fadeEls = document.querySelectorAll(".fade-up");

  if (prefersReduced || !("IntersectionObserver" in window)) {
    fadeEls.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    fadeEls.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 3. Scroll-spy + progress spine + parallax ---------- */
  var sections = Array.prototype.slice.call(document.querySelectorAll("section[id]"));
  var dots = document.querySelectorAll(".way-dot");
  var spineFill = document.getElementById("spineFill");
  var parallaxEls = document.querySelectorAll(".parallax-img, .hero-bg img");

  var ticking = false;

  function updateParallax() {
    if (prefersReduced || !parallaxEls.length) return;
    var vh = window.innerHeight;
    parallaxEls.forEach(function (el) {
      var rect = el.getBoundingClientRect();
      var centerOffset = (rect.top + rect.height / 2) - vh / 2;
      var shift = Math.max(-40, Math.min(40, centerOffset * 0.06));
      el.style.setProperty("--parallax-y", shift.toFixed(1) + "px");
    });
  }

  function updateOnScroll() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    if (spineFill) spineFill.style.height = progress + "%";

    var current = sections[0] && sections[0].id;
    var viewportMid = scrollTop + window.innerHeight * 0.35;
    for (var i = 0; i < sections.length; i++) {
      if (sections[i].offsetTop <= viewportMid) current = sections[i].id;
    }
    dots.forEach(function (dot) {
      dot.classList.toggle("active", dot.dataset.target === current);
    });

    updateParallax();

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
  updateOnScroll();

  /* ---------- 4. Mobile menu ---------- */
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

  /* ---------- 5. Back to top ---------- */
  var backToTop = document.getElementById("backToTop");
  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: prefersReduced ? "auto" : "smooth" });
    });
  }

  /* ---------- 6. Fact-strip count-up ---------- */
  function formatFact(el, value) {
    var prefix = el.dataset.prefix || "";
    var suffix = el.dataset.suffix || "";
    return prefix + value.toLocaleString("en-US") + suffix;
  }

  function animateFact(el) {
    var target = parseInt(el.dataset.count, 10) || 0;
    var duration = 1400;
    var start = null;

    function step(ts) {
      if (start === null) start = ts;
      var progress = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent = formatFact(el, Math.round(target * eased));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        el.textContent = formatFact(el, target);
      }
    }
    window.requestAnimationFrame(step);
  }

  function initFactCounters() {
    var facts = document.querySelectorAll(".fact-num[data-count]");
    if (!facts.length) return;

    if (prefersReduced || !("IntersectionObserver" in window)) {
      facts.forEach(function (el) {
        el.textContent = formatFact(el, parseInt(el.dataset.count, 10) || 0);
      });
      return;
    }

    var factObs = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateFact(entry.target);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    facts.forEach(function (el) { factObs.observe(el); });
  }

  /* ---------- 7. Control panel — font scale / contrast / fullscreen ---------- */
  function initControlPanel() {
    var root = document.documentElement;
    var fontDec = document.getElementById("fontDec");
    var fontInc = document.getElementById("fontInc");
    var contrastToggle = document.getElementById("contrastToggle");
    var fullscreenToggle = document.getElementById("fullscreenToggle");

    var scaleSteps = [0.85, 0.925, 1, 1.1, 1.2, 1.3, 1.4];
    var scaleIndex = 2; // 1.0

    function applyScale() {
      root.style.setProperty("--text-scale", scaleSteps[scaleIndex]);
      if (fontDec) fontDec.disabled = scaleIndex === 0;
      if (fontInc) fontInc.disabled = scaleIndex === scaleSteps.length - 1;
    }

    if (fontDec) {
      fontDec.addEventListener("click", function () {
        scaleIndex = Math.max(0, scaleIndex - 1);
        applyScale();
      });
    }
    if (fontInc) {
      fontInc.addEventListener("click", function () {
        scaleIndex = Math.min(scaleSteps.length - 1, scaleIndex + 1);
        applyScale();
      });
    }
    applyScale();

    if (contrastToggle) {
      contrastToggle.addEventListener("click", function () {
        var isOn = document.body.classList.toggle("contrast-mode");
        contrastToggle.setAttribute("aria-pressed", isOn ? "true" : "false");
      });
    }

    if (fullscreenToggle) {
      fullscreenToggle.addEventListener("click", function () {
        var el = document.documentElement;
        if (!document.fullscreenElement && !document.webkitFullscreenElement) {
          var req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
          if (req) req.call(el);
        } else {
          var exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
          if (exit) exit.call(document);
        }
      });

      function syncFullscreenState() {
        var isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
        fullscreenToggle.setAttribute("aria-pressed", isFs ? "true" : "false");
      }
      document.addEventListener("fullscreenchange", syncFullscreenState);
      document.addEventListener("webkitfullscreenchange", syncFullscreenState);
    }
  }

  /* ---------- 8. Hero cursor spotlight ---------- */
  function initHeroSpotlight() {
    var hero = document.getElementById("hero");
    var spotlight = document.getElementById("heroSpotlight");
    if (!hero || !spotlight) return;

    hero.addEventListener(
      "pointermove",
      function (e) {
        if (prefersReduced || isCoarsePointer) return;
        var rect = hero.getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width) * 100;
        var y = ((e.clientY - rect.top) / rect.height) * 100;
        spotlight.style.setProperty("--mx", x + "%");
        spotlight.style.setProperty("--my", y + "%");
      },
      { passive: true }
    );
  }

  /* ---------- 9. Lightbox ---------- */
  function initLightbox() {
    var lightbox = document.getElementById("lightbox");
    var lightboxImg = document.getElementById("lightboxImg");
    var lightboxCaption = document.getElementById("lightboxCaption");
    var closeBtn = document.getElementById("lightboxClose");
    if (!lightbox || !lightboxImg) return;

    var lastFocused = null;

    function openFromFigure(figure) {
      var img = figure.querySelector("img");
      var caption = figure.querySelector("figcaption");
      if (!img) return;
      lastFocused = document.activeElement;
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt || "";
      lightboxCaption.textContent = caption ? caption.textContent : "";
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.style.overflow = "hidden";
      if (closeBtn) closeBtn.focus();
    }

    function closeLightbox() {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      lightboxImg.src = "";
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    document.querySelectorAll(".civ-image").forEach(function (fig) {
      fig.addEventListener("click", function () { openFromFigure(fig); });
      fig.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          openFromFigure(fig);
        }
      });
    });

    if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
    lightbox.addEventListener("click", function (e) {
      if (e.target === lightbox) closeLightbox();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lightbox.classList.contains("open")) closeLightbox();
    });
  }

  /* ---------- 10. Quiz ---------- */
  var civColors = { egypt: "#c9a227", meso: "#d38257", china: "#d1585f" };

  var quizData = [
    {
      civ: "egypt", civLabel: "Egypt",
      question: "What made large-scale farming possible in Ancient Egypt?",
      options: ["Deep wells dug across the desert", "The Nile's yearly flood depositing fertile silt", "Irrigation canals copied from Mesopotamia", "Seasonal rainfall across the Nile valley"],
      correct: 1,
      explanation: "Every summer the Nile flooded and left behind fertile black silt, letting farmers grow surplus grain in a strip of desert — the foundation of Egyptian civilization."
    },
    {
      civ: "egypt", civLabel: "Egypt",
      question: "Who is credited with uniting Upper and Lower Egypt around 3100 BCE?",
      options: ["Khufu", "Ramesses II", "King Narmer", "Cleopatra VII"],
      correct: 2,
      explanation: "King Narmer united the farming villages of Upper and Lower Egypt into one kingdom, wearing both the White and Red crowns."
    },
    {
      civ: "egypt", civLabel: "Egypt",
      question: "The Great Pyramid of Giza was built around 2560 BCE for which pharaoh?",
      options: ["Tutankhamun", "Khufu", "Akhenaten", "Thutmose III"],
      correct: 1,
      explanation: "The Great Pyramid was raised for Khufu and remained the tallest human-made structure on Earth for almost 3,800 years."
    },
    {
      civ: "meso", civLabel: "Mesopotamia",
      question: "The word \"Mesopotamia\" comes from Greek and means what?",
      options: ["Land of two kings", "Between the rivers", "City of clay", "Cradle of the gods"],
      correct: 1,
      explanation: "\"Mesopotamia\" is Greek for \"between the rivers\" — the Tigris and Euphrates that fed the region."
    },
    {
      civ: "meso", civLabel: "Mesopotamia",
      question: "Which writing system did Sumerian accountants invent around 3200 BCE?",
      options: ["Hieroglyphs", "Oracle bone script", "Cuneiform", "Linear B"],
      correct: 2,
      explanation: "Sumerians pressed reed styluses into wet clay to create cuneiform, the earliest writing system yet discovered."
    },
    {
      civ: "meso", civLabel: "Mesopotamia",
      question: "About how many laws are carved into Hammurabi's Code?",
      options: ["12", "100", "282", "1,000"],
      correct: 2,
      explanation: "Hammurabi's Code, carved around 1754 BCE, contains 282 rulings covering everything from wages to a doctor's responsibilities."
    },
    {
      civ: "meso", civLabel: "Mesopotamia",
      question: "The Babylonian base-60 number system still survives today in what?",
      options: ["Currency denominations", "Minutes, hours, and degrees in a circle", "The calendar's 12 months", "Musical scales"],
      correct: 1,
      explanation: "We still divide hours into 60 minutes and circles into 360 degrees thanks to Babylonian base-60 mathematics."
    },
    {
      civ: "china", civLabel: "China",
      question: "What belief held that a just ruler governed with heaven's blessing — and a corrupt one could be overthrown?",
      options: ["The Silk Road Doctrine", "The Mandate of Heaven", "The Analects", "The Warring Code"],
      correct: 1,
      explanation: "The Mandate of Heaven explained, and justified, every change of dynasty across thousands of years of Chinese history."
    },
    {
      civ: "china", civLabel: "China",
      question: "Who declared himself China's First Emperor in 221 BCE?",
      options: ["Confucius", "Qin Shi Huang", "Han Wudi", "Sun Tzu"],
      correct: 1,
      explanation: "Qin Shi Huang unified China's rival kingdoms, script, currency, and weights, and connected older walls into the Great Wall."
    },
    {
      civ: "china", civLabel: "China",
      question: "The earliest confirmed Chinese writing was found scratched onto what?",
      options: ["Silk scrolls", "Bronze coins", "Ox bones and turtle shells", "Bamboo tablets"],
      correct: 2,
      explanation: "The Shang dynasty left behind oracle bones — ox bones and turtle shells inscribed with questions and read by cracking them over fire."
    }
  ];

  function initQuiz() {
    var quizCard = document.getElementById("quizCard");
    if (!quizCard) return;

    var currentQuestion = 0;
    var score = 0;
    var answered = false;

    function renderStart() {
      currentQuestion = 0;
      score = 0;
      quizCard.innerHTML =
        '<div class="quiz-start">' +
          '<span class="quiz-tag" style="color:var(--gold);">10 questions</span>' +
          '<h3 class="quiz-question" style="margin-top:0.8rem;">Ready to test your knowledge of the ancient world?</h3>' +
          '<p style="color:var(--muted); max-width:32rem; margin:0 auto;">Egypt, Mesopotamia, and China — ten questions pulled straight from the halls you just walked through.</p>' +
          '<button type="button" class="quiz-start-btn" id="quizStartBtn">Start the quiz</button>' +
        "</div>";
      var startBtn = document.getElementById("quizStartBtn");
      if (startBtn) startBtn.addEventListener("click", renderQuestion);
    }

    function renderQuestion() {
      answered = false;
      var q = quizData[currentQuestion];
      var pct = Math.round((currentQuestion / quizData.length) * 100);
      var color = civColors[q.civ] || "var(--gold)";

      var html = "";
      html += '<div class="quiz-progress">';
      html += '<div class="quiz-progress-track"><div class="quiz-progress-fill" style="width:' + pct + '%;"></div></div>';
      html += '<span class="quiz-progress-label">Question ' + (currentQuestion + 1) + " of " + quizData.length + "</span>";
      html += "</div>";
      html += '<span class="quiz-tag" style="color:' + color + ';">' + q.civLabel + "</span>";
      html += '<h3 class="quiz-question">' + q.question + "</h3>";
      html += '<ul class="quiz-options" id="quizOptions">';
      q.options.forEach(function (opt, i) {
        var letter = String.fromCharCode(65 + i);
        html += '<li><button type="button" class="quiz-option" data-index="' + i + '">' +
          '<span class="opt-letter">' + letter + "</span><span>" + opt + "</span></button></li>";
      });
      html += "</ul>";
      html += '<div id="quizFeedbackSlot"></div>';
      html += '<div class="quiz-nav"><button type="button" class="quiz-next" id="quizNextBtn">' +
        (currentQuestion === quizData.length - 1 ? "See results" : "Next question") +
        ' <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M1 8h13M8 1l6 7-6 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>';

      quizCard.innerHTML = html;

      quizCard.querySelectorAll(".quiz-option").forEach(function (btn) {
        btn.addEventListener("click", function () {
          handleAnswer(parseInt(btn.dataset.index, 10));
        });
      });

      var nextBtn = document.getElementById("quizNextBtn");
      if (nextBtn) {
        nextBtn.addEventListener("click", function () {
          if (currentQuestion < quizData.length - 1) {
            currentQuestion++;
            renderQuestion();
          } else {
            renderResults();
          }
        });
      }
    }

    function handleAnswer(selectedIndex) {
      if (answered) return;
      answered = true;
      var q = quizData[currentQuestion];
      var isCorrect = selectedIndex === q.correct;
      if (isCorrect) score++;

      quizCard.querySelectorAll(".quiz-option").forEach(function (btn, i) {
        btn.disabled = true;
        if (i === selectedIndex && i === q.correct) {
          btn.classList.add("correct");
        } else if (i === selectedIndex) {
          btn.classList.add("incorrect");
        } else if (i === q.correct) {
          btn.classList.add("reveal-correct");
        } else {
          btn.classList.add("dim");
        }
      });

      var slot = document.getElementById("quizFeedbackSlot");
      if (slot) {
        slot.innerHTML =
          '<div class="quiz-feedback ' + (isCorrect ? "correct" : "incorrect") + '">' +
            '<span class="quiz-feedback-icon">' + (isCorrect ? "✓" : "✕") + "</span>" +
            '<span class="quiz-feedback-text"><strong>' + (isCorrect ? "Correct" : "Not quite") + "</strong>" + q.explanation + "</span>" +
          "</div>";
      }

      var nextBtn = document.getElementById("quizNextBtn");
      if (nextBtn) nextBtn.classList.add("show");
    }

    function renderResults() {
      var total = quizData.length;
      var pct = Math.round((score / total) * 100);
      var verdict, sub;

      if (pct === 100) { verdict = "Perfect score"; sub = "You've clearly walked every hall in this gallery — and remembered it."; }
      else if (pct >= 80) { verdict = "Excellent"; sub = "A sharp grasp of three civilizations that never even met."; }
      else if (pct >= 60) { verdict = "Solid effort"; sub = "You know the major landmarks — a second walkthrough will fill in the rest."; }
      else if (pct >= 40) { verdict = "Good start"; sub = "A few of the halls are worth revisiting before your next visit."; }
      else { verdict = "Worth a second look"; sub = "Head back through the exhibition — these are the stories worth remembering."; }

      var html = "";
      html += '<div class="quiz-results">';
      html += '<div class="quiz-score-ring" style="--pct:' + pct + ';"><div class="quiz-score-ring-inner">' +
        '<span class="quiz-score-num">' + score + '</span><span class="quiz-score-den">of ' + total + "</span></div></div>";
      html += '<h3 class="quiz-verdict">' + verdict + "</h3>";
      html += '<p class="quiz-verdict-sub">' + sub + "</p>";
      if (pct >= 80 && !prefersReduced) {
        html += '<div class="quiz-confetti" id="quizConfetti"></div>';
      }
      html += '<div class="quiz-retry-row">';
      html += '<button type="button" class="quiz-retry-btn primary" id="quizRetryBtn">Try again</button>';
      html += '<a href="#compare" class="quiz-retry-btn">Revisit the exhibition</a>';
      html += "</div></div>";

      quizCard.innerHTML = html;

      var retryBtn = document.getElementById("quizRetryBtn");
      if (retryBtn) retryBtn.addEventListener("click", renderStart);

      if (pct >= 80 && !prefersReduced) launchConfetti();
    }

    function launchConfetti() {
      var container = document.getElementById("quizConfetti");
      if (!container) return;
      var colors = ["#c9a227", "#4f9d73", "#d1585f", "#d38257", "#ece4d3"];
      for (var i = 0; i < 24; i++) {
        var span = document.createElement("span");
        span.style.setProperty("--dx", (Math.random() * 220 - 110).toFixed(0) + "px");
        span.style.setProperty("--rot", (Math.random() * 360).toFixed(0) + "deg");
        span.style.left = 45 + Math.random() * 10 + "%";
        span.style.background = colors[i % colors.length];
        span.style.animationDelay = (Math.random() * 0.3).toFixed(2) + "s";
        container.appendChild(span);
      }
      setTimeout(function () { if (container) container.innerHTML = ""; }, 2200);
    }

    renderStart();
  }

  /* ---------- Init everything ---------- */
  initFactCounters();
  initControlPanel();
  initHeroSpotlight();
  initLightbox();
  initQuiz();
})();