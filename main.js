/* =========================================================
   Digital Feng Shui — site JavaScript
   Loaded once, site-wide, from Site settings → Footer:
   <script src="https://cdn.jsdelivr.net/gh/rimbodesigns/dfs-scripts@vX.Y.Z/main.min.js"></script>
   (no defer — see "Run" at the bottom for timing; jsDelivr builds
   main.min.js from this file automatically)

   Each section below is one former Slater script, wrapped in its own
   function so names can't clash. The router at the bottom decides
   which sections run on which page.
   ========================================================= */

(function () {

  // =========================================================
  // SETTINGS
  // =========================================================

  // Countdown for every [data-timer] element on the site
  var COUNTDOWN_DEADLINE = '2026/10/15 00:00';

  // =========================================================
  // SHARED HELPERS — used by more than one section
  // =========================================================

  // Runs fn once Memberstack has loaded (checks every 100ms, gives up after 5s).
  function whenMemberstackReady(fn) {
    var tries = 0;
    (function check() {
      if (window.$memberstackDom) return fn();
      if (++tries < 50) setTimeout(check, 100);
      else console.warn('Memberstack never loaded');
    })();
  }

  // Rolls the three number wheels inside [data-progress-numbers="<course>"] to a percentage.
  function animateProgressNumbers(courseName, percent, duration) {
    const container = document.querySelector(`[data-progress-numbers="${courseName}"]`);
    if (!container) return;
    const wrap = (group) => container.querySelector(
      `.loading__number-group.is--${group} .loading__number-wrap`);

    // Index of the digit to show in each wheel
    // (wheel 1 has 2 items: empty / "1"; wheels 2 and 3 have 11 items: 0–9 + final "0")
    let first = 0,
      second = 0,
      third = percent; // 0–9%: empty, empty, ones
    if (percent === 100) {
      first = 1;
      second = 10;
      third = 10;
    } else if (percent >= 10) {
      second = Math.floor(percent / 10);
      third = percent % 10;
    }

    const steps = [
      [wrap('first'), first * -50],
      [wrap('second'), second * -(100 / 11)],
      [wrap('third'), third * -(100 / 11)]
    ];
    steps.forEach(([el, yPercent]) => {
      if (el) gsap.to(el, { yPercent, duration, ease: 'power2.out' });
    });
  }

  // Slide-up panel with curved caps (.onboarding-overlay). Used by the
  // course onboarding and the feedback form.
  const OVERLAY_DURATION = 1.4;

  function overlayCoverIn(o) {
    document.querySelectorAll('video').forEach(v => {
      try { v.pause(); } catch (_) {}
    });
    gsap.set(o.panel, { yPercent: 0, y: '30vw' });
    gsap.set(o.capTop, { scaleY: 1 });
    gsap.set(o.capBottom, { scaleY: 1 });
    if (o.content) gsap.set(o.content, { autoAlpha: 0, y: 20 });
    o.overlay.style.display = 'block';
    // Let the wheel/touch scroll the overlay itself (Lenis would otherwise take it)
    o.overlay.setAttribute('data-lenis-prevent', '');
    if (o.lockScroll) document.body.style.overflow = 'hidden';

    const tl = gsap.timeline()
      .to(o.panel, { yPercent: -100, y: 0, duration: OVERLAY_DURATION, ease: 'power2.inOut' }, 0)
      .to(o.capTop, { scaleY: 0.35, duration: OVERLAY_DURATION, ease: 'none' }, 0);
    if (o.content) {
      tl.to(o.content, { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power2.out' },
        OVERLAY_DURATION * 0.75);
    }
    return tl;
  }

  // =========================================================
  // CHOICE FIELDS — form pieces built in the Designer, wired up by attributes
  //
  // 1. Collapsible "pick one" field
  //   [data-choice]                 the field group
  //     [data-choice-toggle]        looks like an input; click to open/close
  //       [data-choice-value]       shows "Choose one", then the picked option
  //       [data-choice-arrow]       flips when open
  //     [data-choice-panel]         slides open; holds normal Osmo radio buttons
  //
  // 2. Panel that opens for one answer
  //   [data-choice-reveal="Plan"]   opens while the radio/checkbox with value
  //                                 "Plan" (in the same field group) is picked.
  //                                 Also for "Something else" + a text field.
  //
  // 3. Day picker
  //   [data-choice-dates="next-week"] on a radio group with ONE radio button in
  //                                 it: it becomes Mon–Sun of next week
  //                                 (value = the date, e.g. 2026-10-12).
  //                                 Text goes into .choice_day-name / .choice_day-number
  //
  // 4. Type-your-own answer
  //   input[data-choice-other]      a text field inside a radio group, as one more
  //                                 option: clicking into it switches the buttons off,
  //                                 picking a button dims it. Only the active one is
  //                                 sent; the text as "<group name>-other".
  //
  // Required? Put data-validate on the field group (Osmo form validation).
  // =========================================================

  // Lenis caches the page height, so tell it when something grows or shrinks
  function relayoutScroll() {
    if (window.lenis && typeof window.lenis.resize === 'function') window.lenis.resize();
  }

  // Webflow's API can only set data-name on radios; the browser groups radios
  // by name. Copy data-name over so one answer per question can be picked.
  function syncRadioNames(root) {
    root.querySelectorAll('input[type="radio"][data-name]').forEach(function (input) {
      if (input.name !== input.dataset.name) input.name = input.dataset.name;
    });
    // Webflow's Form Label outputs for="", which points at nothing and stops a
    // click on the label from picking the option inside it
    root.querySelectorAll('label[for=""]').forEach(function (label) {
      label.removeAttribute('for');
    });
  }

  function dfsChoiceDates() {
    const DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pad = (n) => (n < 10 ? '0' : '') + n;

    document.querySelectorAll('[data-choice-dates="next-week"]').forEach(function (group) {
      const firstInput = group.querySelector('input[type="radio"]');
      const template = firstInput && firstInput.closest('label');
      if (!template || group.__datesReady) return;
      group.__datesReady = true;

      // Monday of next week (also when today is a Monday)
      const monday = new Date();
      monday.setHours(0, 0, 0, 0);
      monday.setDate(monday.getDate() + (((8 - monday.getDay()) % 7) || 7));

      for (let i = 0; i < 7; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);
        const iso = day.getFullYear() + '-' + pad(day.getMonth() + 1) + '-' + pad(day.getDate());

        const tile = template.cloneNode(true);
        const input = tile.querySelector('input[type="radio"]');
        input.value = iso;
        input.id = (input.dataset.name || 'day') + '-' + iso;
        input.checked = false;
        tile.dataset.choiceLabel = DAY[day.getDay()] + ' ' + day.getDate() + ' ' + MONTH[day.getMonth()];

        // Day name + number go into the template's own elements (styled in the Designer)
        const label = tile.querySelector('.radiocheck-label, span') || tile;
        const nameEl = tile.querySelector('.choice_day-name');
        const numberEl = tile.querySelector('.choice_day-number');
        if (nameEl && numberEl) {
          nameEl.textContent = DAY[day.getDay()];
          numberEl.textContent = day.getDate();
        } else {
          label.textContent = DAY[day.getDay()] + ' ' + day.getDate();
        }
        label.setAttribute('for', input.id);

        template.parentNode.insertBefore(tile, template);
      }
      template.remove();
    });
  }

  function dfsChoiceFields() {
    // 1. Collapsible "pick one" fields
    document.querySelectorAll('[data-choice]').forEach(function (field) {
      const toggle = field.querySelector('[data-choice-toggle]');
      const panel = field.querySelector('[data-choice-panel]');
      const value = field.querySelector('[data-choice-value]');
      if (!toggle || !panel || field.__choiceReady) return;
      field.__choiceReady = true;

      const placeholder = value ? value.textContent : '';
      let open = false;

      function setOpen(next) {
        if (next === open) return;
        open = next;
        field.classList.toggle('is-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        gsap.to(panel, {
          height: open ? 'auto' : 0,
          duration: open ? 0.45 : 0.35,
          ease: open ? 'power2.out' : 'power2.inOut',
          onComplete: relayoutScroll
        });
      }

      toggle.addEventListener('click', function () { setOpen(!open); });
      toggle.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); }
        if (e.key === 'Escape') setOpen(false);
      });

      // Picking an option: show it in the field, then close
      panel.addEventListener('change', function (e) {
        const input = e.target;
        if (!input.matches('input[type="radio"]') || !input.checked) return;
        const label = input.closest('label');
        const text = label ? (label.dataset.choiceLabel || label.textContent.trim()) : input.value;
        if (value) value.textContent = text || placeholder;
        field.classList.add('is-filled');
        setTimeout(function () { setOpen(false); }, 200);
      });

      // Focus landing on an option (keyboard, or the form pointing at a missing
      // answer) opens the panel, so the option is visible
      panel.addEventListener('focusin', function () { setOpen(true); });

      // Clicking anywhere else closes it
      document.addEventListener('click', function (e) {
        if (open && !field.contains(e.target)) setOpen(false);
      });
    });

    // 2. Panels that open for one answer (e.g. "Plan" → pick a day)
    document.querySelectorAll('[data-choice-reveal]').forEach(function (reveal) {
      if (reveal.__revealReady) return;
      reveal.__revealReady = true;

      const answer = reveal.getAttribute('data-choice-reveal');
      const group = reveal.closest('[data-validate]') || reveal.parentElement;
      let open = false;

      function setOpen(next) {
        if (next === open) return;
        open = next;
        reveal.classList.toggle('is-open', open);
        if (open) {
          reveal.style.display = 'block';
          gsap.fromTo(reveal, { height: 0 }, {
            height: 'auto', duration: 0.5, ease: 'power2.out', onComplete: relayoutScroll
          });
        } else {
          // Leaving this answer: forget what was picked or typed inside the panel
          reveal.querySelectorAll('input:checked').forEach(function (i) { i.checked = false; });
          reveal.querySelectorAll('input[type="text"], input:not([type]), textarea').forEach(function (i) { i.value = ''; });
          gsap.to(reveal, {
            height: 0, duration: 0.35, ease: 'power2.inOut',
            onComplete: function () {
              reveal.style.display = 'none';
              // Clear red/green states once hidden, so reopening starts fresh
              reveal.querySelectorAll('[data-validate]').forEach(function (g) {
                g.classList.remove('is--error', 'is--success', 'is--filled');
              });
              relayoutScroll();
            }
          });
        }
      }

      group.addEventListener('change', function (e) {
        const input = e.target;
        if (!input.matches('input[type="radio"], input[type="checkbox"]') || reveal.contains(input)) return;
        // Open while the answer is picked (works for radios and checkboxes)
        const picked = Array.prototype.some.call(group.querySelectorAll('input:checked'), function (i) {
          return i.value === answer && !reveal.contains(i);
        });
        setOpen(picked);
        // Typing field? Put the cursor in it
        if (picked) {
          const field = reveal.querySelector('input[type="text"], textarea');
          if (field) setTimeout(function () { field.focus({ preventScroll: true }); }, 300);
        }
      });
    });

    // 4. Type-your-own answer, one answer at a time: clicking into the field (or typing)
    //    switches the buttons off; picking a button switches the field off. Its text stays,
    //    dimmed (.is-inactive), and isn't sent. The active field is .is-picked and its
    //    text is sent as "<group name>-other" (e.g. problems-other).
    document.querySelectorAll('input[data-choice-other]').forEach(function (field) {
      const group = field.closest('[data-radiocheck-group]');
      const option = group && group.querySelector('input[type="radio"]');
      if (!option || field.__otherReady) return;
      field.__otherReady = true;
      const name = option.name + '-other';
      field.removeAttribute('name'); // only sent while it's the answer

      // A hidden, unnamed radio tells the form validation "answered" when the text is the answer
      const answered = document.createElement('input');
      answered.type = 'radio';
      answered.hidden = true;
      answered.tabIndex = -1;
      field.insertAdjacentElement('afterend', answered);

      let active = false;

      function update() {
        const hasText = field.value.trim() !== '';
        field.classList.toggle('is-picked', active);
        field.classList.toggle('is-inactive', !active && hasText);
        if (active) field.name = name; else field.removeAttribute('name');
        const isAnswer = active && hasText;
        if (answered.checked !== isAnswer) {
          answered.checked = isAnswer;
          answered.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      function activate() {
        if (!active) {
          active = true;
          // Quietly, so the question doesn't flash red before anything is typed
          group.querySelectorAll('input[type="radio"]:checked:not([hidden])').forEach(function (r) {
            r.checked = false;
          });
        }
        update();
      }

      field.addEventListener('click', activate);
      field.addEventListener('input', activate);
      group.addEventListener('change', function (e) {
        if (e.target === answered || !e.target.checked) return;
        active = false; // a button was picked
        update();
      });
    });
  }

  // =========================================================
  // GLOBAL — every page
  // (was Slater GLOBAL.js)
  // =========================================================
  function dfsGlobal() {
    // single interval timer (updates all [data-timer] elements)
    (function () {
      const deadline = COUNTDOWN_DEADLINE;
      const elTimers = Array.from(document.querySelectorAll('[data-timer]'));

      function pad(num, size = 2) {
        let s = "0" + Math.abs(num);
        return s.substr(s.length - size);
      }

      function parseDate(date) {
        const parsed = Date.parse(date);
        if (!isNaN(parsed)) return parsed;
        return Date.parse(date.replace(/-/g, '/').replace(/[a-z]+/gi, ' '));
      }

      function getTimeRemaining(endtimeMs) {
        const total = endtimeMs - Date.now();
        const seconds = Math.floor((total / 1000) % 60);
        const minutes = Math.floor((total / 1000 / 60) % 60);
        const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
        const days = Math.floor(total / (1000 * 60 * 60 * 24));
        return { total, days, hours, minutes, seconds };
      }

      const endMs = parseDate(deadline);
      if (elTimers.length === 0) return;

      // cache nodes to avoid querying every tick
      const cached = elTimers.map(el => ({
        el,
        days: el.querySelector('[data-days]'),
        hours: el.querySelector('[data-hours]'),
        minutes: el.querySelector('[data-minutes]'),
        seconds: el.querySelector('[data-seconds]')
      }));

      const tick = () => {
        const t = getTimeRemaining(endMs);
        if (t.total <= 0) {
          cached.forEach(c => {
            if (c.days) c.days.textContent = '00';
            if (c.hours) c.hours.textContent = '00';
            if (c.minutes) c.minutes.textContent = '00';
            if (c.seconds) c.seconds.textContent = '00';
          });
          clearInterval(intervalId);
          return;
        }
        cached.forEach(c => {
          if (c.days) c.days.textContent = pad(t.days);
          if (c.hours) c.hours.textContent = pad(t.hours);
          if (c.minutes) c.minutes.textContent = pad(t.minutes);
          if (c.seconds) c.seconds.textContent = pad(t.seconds);
        });
      };

      tick(); // initial render
      const intervalId = setInterval(tick, 1000);
    })();

    // ---- TEXT REVEAL (Osmo) ----
    const splitConfig = {
      lines: { duration: 0.8, stagger: 0.08 },
      words: { duration: 0.6, stagger: 0.06 },
      chars: { duration: 0.4, stagger: 0.01 }
    }

    async function initMaskTextScrollReveal() {
      document.querySelectorAll('[data-split="heading"]').forEach(heading => {
        // Find the split type, the default is 'lines'
        const type = heading.dataset.splitReveal || 'lines'
        const typesToSplit =
          type === 'lines' ? ['lines'] :
          type === 'words' ? ['lines', 'words'] : ['lines', 'words', 'chars']

        const offset = parseFloat(heading.dataset.splitDelay) || 0
        const startPct = 80 - (offset * 25)

        // Split the text
        SplitText.create(heading, {
          type: typesToSplit.join(', '), // split into required elements
          mask: 'lines', // wrap each line in an overflow:hidden div
          autoSplit: true,
          linesClass: 'line',
          wordsClass: 'word',
          charsClass: 'letter',
          onSplit: function (instance) {
            const targets = instance[type] // Register animation targets
            const config = splitConfig[
              type] // Find matching duration and stagger from our splitConfig
            return gsap.from(targets, {
              yPercent: 110,
              duration: config.duration,
              stagger: config.stagger,
              ease: 'expo.out',
              scrollTrigger: {
                trigger: heading,
                start: `clamp(top ${startPct}%)`,
                scrub: true
                // once: true
              }
            });
          }
        })
      })
    }
    initMaskTextScrollReveal()

    //360

    document.querySelectorAll("[rotate360], [rotate360_F]").forEach(el => {
      const duration = parseFloat(el.getAttribute("rotate360")) || 12;
      const forward = !el.hasAttribute("rotate360_F");
      gsap.to(el, {
        rotation: forward ? 360 : -360,
        repeat: -1,
        ease: "none",
        duration,
        transformOrigin: "center center"
      });
    });

    // Logo: the Keeper, like the Rhythms app's menu bar icon. Every 4.4s the outer ring turns an eighth
    // and the inner star turns an eighth the other way, on the Osmo button curve. The star has eight-fold
    // symmetry, so after every tick it is the plain mark again. The embed is one even-odd path; the inner
    // star is split off here into a mask, so the Webflow embed stays as it is. The ring path turns, not the
    // wrapper: a turn of the wrapper would carry the mask (and the inner star) along with it.
    const logos = document.querySelectorAll("#LOGO_ICON, #LOGO_ICON_2");
    if (logos.length) {
      const ns = "http://www.w3.org/2000/svg";
      const rings = [], inners = [], plain = [];
      logos.forEach((logo, i) => {
        const path = logo.querySelector("svg > path");
        const d = path && path.getAttribute("d");
        const cut = d ? d.indexOf("ZM") : -1;
        if (cut < 0) { plain.push(logo); return; }
        const svg = path.ownerSVGElement;
        const box = svg.viewBox.baseVal;
        const mask = document.createElementNS(ns, "mask");
        mask.id = "dfs-logo-hole-" + i;
        const keep = document.createElementNS(ns, "rect");
        keep.setAttribute("width", box.width);
        keep.setAttribute("height", box.height);
        keep.setAttribute("fill", "#fff");
        const inner = document.createElementNS(ns, "path");
        inner.setAttribute("d", "M" + d.slice(cut + 2));
        inner.setAttribute("fill", "#000");
        // The mask is luminance: whatever recolours the logo's paths (night mode) must not touch these two.
        keep.style.setProperty("fill", "#fff", "important");
        inner.style.setProperty("fill", "#000", "important");
        mask.append(keep, inner);
        const defs = document.createElementNS(ns, "defs");
        defs.append(mask);
        const group = document.createElementNS(ns, "g");
        group.setAttribute("mask", "url(#" + mask.id + ")");
        path.setAttribute("d", d.slice(0, cut + 1));
        path.removeAttribute("fill-rule");
        svg.insertBefore(defs, path);
        group.append(path);
        svg.append(group);
        rings.push(path);
        inners.push(inner);
      });
      const ease = window.CustomEase ? CustomEase.create("dfsKeeper", "0.625,0.05,0,1") : "power2.inOut";
      let angle = 0;
      setInterval(() => {
        angle += 45;
        gsap.to(rings, { rotation: angle, duration: 0.6, ease, transformOrigin: "50% 50%" });
        gsap.to(inners, { rotation: -angle, duration: 0.6, ease, transformOrigin: "50% 50%" });
        if (plain.length) gsap.to(plain, { rotation: angle, duration: 0.6, ease, transformOrigin: "center center" });
      }, 4400);
    }

    // ---- PARALLAX ----

    function initGlobalParallax() {
      const mm = gsap.matchMedia()

      mm.add(
        {
          isMobile: "(max-width:479px)",
          isMobileLandscape: "(max-width:767px)",
          isTablet: "(max-width:991px)",
          isDesktop: "(min-width:992px)"
        },
        (context) => {
          const { isMobile, isMobileLandscape, isTablet } = context.conditions

          const ctx = gsap.context(() => {
            document.querySelectorAll('[data-parallax="trigger"]').forEach((trigger) => {
              // Check if this trigger has to be disabled on smaller breakpoints
              const disable = trigger.getAttribute("data-parallax-disable")
              if (
                (disable === "mobile" && isMobile) ||
                (disable === "mobileLandscape" && isMobileLandscape) ||
                (disable === "tablet" && isTablet)
              ) {
                return
              }

              // Optional: you can target an element inside a trigger if necessary
              const target = trigger.querySelector('[data-parallax="target"]') || trigger

              // Get the direction value to decide between xPercent or yPercent tween
              const direction = trigger.getAttribute("data-parallax-direction") || "vertical"
              const prop = direction === "horizontal" ? "xPercent" : "yPercent"

              // Get the scrub value, our default is 'true' because that feels nice with Lenis
              const scrubAttr = trigger.getAttribute("data-parallax-scrub")
              const scrub = scrubAttr ? parseFloat(scrubAttr) : true

              // Get the start position in %
              const startAttr = trigger.getAttribute("data-parallax-start")
              const startVal = startAttr !== null ? parseFloat(startAttr) : 20

              // Get the end position in %
              const endAttr = trigger.getAttribute("data-parallax-end")
              const endVal = endAttr !== null ? parseFloat(endAttr) : -20

              // Get the start value of the ScrollTrigger
              const scrollStartRaw = trigger.getAttribute("data-parallax-scroll-start") ||
                "top bottom"
              const scrollStart = `clamp(${scrollStartRaw})`

              // Get the end value of the ScrollTrigger
              const scrollEndRaw = trigger.getAttribute("data-parallax-scroll-end") ||
                "bottom top"
              const scrollEnd = `clamp(${scrollEndRaw})`

              gsap.fromTo(
                target, {
                  [prop]: startVal
                },
                {
                  [prop]: endVal,
                  ease: "none",
                  scrollTrigger: {
                    trigger,
                    start: scrollStart,
                    end: scrollEnd,
                    scrub,
                  },
                }
              )
            })
          })

          return () => ctx.revert()
        }
      )
    }
    initGlobalParallax()

    // button

    function initButtonCharacterStagger() {
      const offsetIncrement = 0.01; // Transition offset increment in seconds
      const buttons = document.querySelectorAll('[data-button-animate-chars]');

      buttons.forEach(button => {
        const text = button.textContent; // Get the button's text content
        button.innerHTML = ''; // Clear the original content

        [...text].forEach((char, index) => {
          const span = document.createElement('span');
          span.textContent = char;
          span.style.transitionDelay = `${index * offsetIncrement}s`;

          // Handle spaces explicitly
          if (char === ' ') {
            span.style.whiteSpace = 'pre'; // Preserve space width
          }

          button.appendChild(span);
        });
      });
    }

    initButtonCharacterStagger();

    // Page scroll progress bar (only on pages that have one)
    if (document.getElementById("progress_bar")) {
      gsap.to("#progress_bar", {
        width: "85%",
        ease: "none",
        scrollTrigger: {
          trigger: "body",
          start: "top top",
          end: "bottom bottom",
          scrub: true
        }
      });
    }

    // ---- FAQ ACCORDION ----

    function initAccordionCSS() {
      document.querySelectorAll('[data-accordion-css-init]').forEach((accordion) => {
        const closeSiblings = accordion.getAttribute('data-accordion-close-siblings') === 'true';

        accordion.addEventListener('click', (event) => {
          const toggle = event.target.closest('[data-accordion-toggle]');
          if (!toggle) return; // Exit if the clicked element is not a toggle

          const singleAccordion = toggle.closest('[data-accordion-status]');
          if (!singleAccordion) return; // Exit if no accordion container is found

          const isActive = singleAccordion.getAttribute('data-accordion-status') === 'active';
          singleAccordion.setAttribute('data-accordion-status', isActive ? 'not-active' :
            'active');

          // When [data-accordion-close-siblings="true"]
          if (closeSiblings && !isActive) {
            accordion.querySelectorAll('[data-accordion-status="active"]').forEach((
              sibling) => {
              if (sibling !== singleAccordion) sibling.setAttribute('data-accordion-status',
                'not-active');
            });
          }
        });
      });
    }

    initAccordionCSS();
  }

  // =========================================================
  // HOME — home + /course sales page
  // (was Slater HOME.js)
  // =========================================================
  function dfsHome() {
    /* =========================================================
       Digital Feng Shui — homepage GSAP script (v7)
       ---------------------------------------------------------
       [data-logo-spin]: ONE full turn, then pause, repeating
       every ~5s (not a continuous spin).
       Two knobs:
         duration    = how fast the single turn is
         repeatDelay = how long it waits between turns
       (duration 1 + repeatDelay 4 = one turn every 5s)

       No float/bounce on any logo. Course Overview: single toArray.
       Requires: gsap + ScrollTrigger registered before this runs.
       ========================================================= */

    // // --- logo spin (one turn every ~5s) -------------------------------
    // gsap.utils.toArray('[data-logo-spin]').forEach(logo => {
    //   gsap.to(logo, {
    //     rotation: 360,
    //     transformOrigin: "50% 50%",
    //     duration: 1,
    //     ease: "power1.inOut",
    //     repeat: -1,
    //     repeatDelay: 4
    //   });
    // });

    // DFS — Get Started popup
    (function () {
      var popup = document.querySelector('[get-started], .get_started_container');
      if (!popup || typeof gsap === 'undefined') return;

      gsap.set(popup, { clearProps: 'transform' });
      gsap.set(popup, { y: 0, yPercent: 100 });

      var isOpen = false;

      function open() {
        if (isOpen) return;
        isOpen = true;
        gsap.to(popup, { y: 0, yPercent: 0, duration: 0.6, ease: 'power2.out', overwrite: 'auto' });
      }

      function close() {
        if (!isOpen) return;
        isOpen = false;
        gsap.to(popup, { y: 0, yPercent: 100, duration: 0.6, ease: 'power2.in', overwrite: 'auto' });
      }

      document.addEventListener('click', function (e) {
        if (e.target.closest('[start-popup]')) {
          e.preventDefault();
          open();
          return;
        }
        if (e.target.closest('[close_btn], .close_btn')) {
          e.preventDefault();
          close();
        }
      }, true);

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') close();
      });

      window.dfsPopup = { open: open, close: close };
    })();

    // DFS — submit to Webflow, then go to Stripe with the email prefilled
    (function () {
      var form = document.querySelector('.is-signup_xp');
      if (!form) return;

      // Stripe link per price-test group (set by the price test script in localStorage 'dfs_pg'),
      // so the checkout shows the same price the page showed: a = $67, b = $47, c = $97
      var STRIPE_URLS = {
        a: 'https://buy.stripe.com/5kQbIUaGJ6JdcZE2BddjO01',
        b: 'https://buy.stripe.com/14A7sE1694B50cSejVdjO02',
        c: 'https://buy.stripe.com/bJe6oA5mpffJ4t8fnZdjO03'
      };
      // Abandoned-checkout reminders (Cloudflare worker dfs-cart)
      var CART_URL = 'https://dfs-cart.thomas-aukema.workers.dev/start';

      form.addEventListener('submit', function () {
        var input = form.querySelector('input[type="email"]');
        var email = input ? input.value.trim() : '';
        if (!email) return;

        var group = 'a';
        try { group = localStorage.getItem('dfs_pg') || 'a'; } catch (e) {}
        var stripeUrl = STRIPE_URLS[group] || STRIPE_URLS.a;

        // Unique reference so the payment can be matched to this checkout
        var ref = 'dfs-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,
          10);
        try {
          navigator.sendBeacon(CART_URL, JSON.stringify({
            ref: ref,
            email: email,
            link: stripeUrl
          }));
        } catch (e) {}

        // The success state appears after Webflow handles the submit,
        // so look for the icon once it exists
        setTimeout(function () {
          var spinIcon = document.getElementById('spin_this');
          if (spinIcon) {
            gsap.to(spinIcon, {
              rotation: -360,
              duration: 1,
              ease: 'none',
              repeat: -1,
              transformOrigin: '50% 50%'
            });
          }
        }, 100);

        setTimeout(function () {
          window.location.href = stripeUrl +
            '?client_reference_id=' + encodeURIComponent(ref) +
            '&prefilled_email=' + encodeURIComponent(email);
        }, 1200);
      }, true);
    })();

    // --- tiny helpers -------------------------------------------------
    const q = (sel, root = document) => root.querySelector(sel);
    const qa = (sel, root = document) => root.querySelectorAll(sel);

    // Loop/float a single element by selector, only if it exists.
    function floatEl(sel, vars) {
      const el = q(sel);
      if (el) gsap.to(el, vars);
    }

    // --- Meet rimbo ---------------------------------------------------
    floatEl("#rimbo_img", {
      y: -12,
      duration: 3,
      ease: "sine.inOut",
      yoyo: true,
      repeat: -1
    });

    // --- POWER BAR 1 --------------------------------------------------
    const powerBar1 = q('[power_bar="1"]');
    if (powerBar1) {
      const pb1_bars1to4 = powerBar1.querySelectorAll(
        '.e_bar[e_number="1"], .e_bar[e_number="2"], .e_bar[e_number="3"], .e_bar[e_number="4"]'
      );
      const pb1_bar5 = powerBar1.querySelector('.e_bar[e_number="5"]');

      const tl_pb1 = gsap.timeline({
        scrollTrigger: { trigger: powerBar1, start: "top 80%", end: "top 40%" }
      });

      tl_pb1.to(pb1_bars1to4, {
        backgroundColor: "#0297DB",
        stagger: 0.2,
        ease: "power2.out"
      });

      if (pb1_bar5) {
        const pb1_pulse = gsap.to(pb1_bar5, {
          opacity: 1,
          backgroundColor: "#0297DB",
          repeat: -1,
          yoyo: true,
          duration: 0.8,
          ease: "power1.inOut",
          paused: true
        });
        tl_pb1.add(() => pb1_pulse.play());
      }
    }

    // --- POWER BAR 2 --------------------------------------------------
    const powerBar2 = q('[power_bar="2"]');
    if (powerBar2) {
      const pb2_bars1to15 = powerBar2.querySelectorAll(`
        .e_bar[e_number="1"],
        .e_bar[e_number="2"],
        .e_bar[e_number="3"],
        .e_bar[e_number="4"],
        .e_bar[e_number="5"],
        .e_bar[e_number="6"],
        .e_bar[e_number="7"],
        .e_bar[e_number="8"],
        .e_bar[e_number="9"],
        .e_bar[e_number="10"],
        .e_bar[e_number="12"],
        .e_bar[e_number="13"],
        .e_bar[e_number="14"],
        .e_bar[e_number="15"]
      `);
      const pb2_bars16to17 = powerBar2.querySelectorAll(
        '.e_bar[e_number="16"], .e_bar[e_number="17"]'
      );

      const tl_pb2 = gsap.timeline({
        scrollTrigger: { trigger: powerBar2, start: "top 80%", end: "top 40%" }
      });

      tl_pb2.to(pb2_bars1to15, {
        backgroundColor: "#0297DB",
        stagger: 0.15,
        ease: "power2.out"
      });

      if (pb2_bars16to17.length) {
        const pb2_pulse = gsap.to(pb2_bars16to17, {
          opacity: 1,
          backgroundColor: "#0297DB",
          repeat: -1,
          yoyo: true,
          duration: 0.8,
          stagger: 0.1,
          ease: "power1.inOut",
          paused: true
        });
        tl_pb2.add(() => pb2_pulse.play());
      }
    }

    // --- COURSE OVERVIEW ----------------------------------------------
    const courseOverview = q("#Course_Overview");
    if (courseOverview) {
      // Query the items once, derive the inner wraps from that.
      const items = gsap.utils.toArray("#Course_Overview .course_item");

      const ciWraps = items
        .map(item => item.querySelector(".ci_wrap"))
        .filter(Boolean);

      if (ciWraps.length) {
        gsap.from(ciWraps, {
          y: 60,
          x: 33,
          rotation: -10,
          opacity: 0,
          ease: "power2.out",
          stagger: 0.1,
          duration: 1,
          scrollTrigger: {
            trigger: "#Course_Overview",
            start: "top 60%"
          }
        });
      }

      // Hover animation (on each course_item)
      items.forEach((item) => {
        let subtleJiggle = gsap.timeline({ paused: true, repeat: -1, yoyo: true })
          .to(item, { rotation: 0.2, x: 1, y: -1, duration: 0.2, ease: "sine.inOut" })
          .to(item, { rotation: -0.2, x: -1, y: 1, duration: 0.2, ease: "sine.inOut" });

        item.addEventListener("mouseenter", () => {
          gsap.to(item, { scale: 1.1, duration: 0.3, ease: "power2.out" });
          subtleJiggle.play();
        });
        item.addEventListener("mouseleave", () => {
          gsap.to(item, {
            scale: 1,
            rotation: 0,
            x: 0,
            y: 0,
            duration: 0.4,
            ease: "power2.inOut"
          });
          subtleJiggle.pause(0);
        });
      });
    }

    // --- TESTIMONIAL --------------------------------------------------
    qa('[data-testimonial]').forEach((section, idx) => {
      let currentTState = null;
      const T1 = section.querySelector('[data-t="1"]');
      const T2 = section.querySelector('[data-t="2"]');
      const T3 = section.querySelector('[data-t="3"]');
      const btnT1 = section.querySelector('[data-btn-t="1"]');
      const btnT2 = section.querySelector('[data-btn-t="2"]');
      const btnT3 = section.querySelector('[data-btn-t="3"]');
      const wrapT1 = section.querySelector('[data-wrap-t="1"]');
      const wrapT2 = section.querySelector('[data-wrap-t="2"]');
      const wrapT3 = section.querySelector('[data-wrap-t="3"]');
      const progressBar =
        section.querySelector('[data-progress]') ||
        section.querySelector('[progress_bar_t]') ||
        section.querySelector('#Progress_bar_T');

      if (!T1 || !T2 || !T3 || !btnT1 || !btnT2 || !btnT3 ||
        !wrapT1 || !wrapT2 || !wrapT3 || !progressBar) {
        console.warn('Missing testimonial parts in section', idx);
        return;
      }

      const slides = [T1, T2, T3];
      const btns = [btnT1, btnT2, btnT3];

      // --- initial state: hard set, geen fade/flits bij load ---
      gsap.set([T2, T3], { autoAlpha: 0, pointerEvents: "none" });
      gsap.set(T1, { autoAlpha: 1, pointerEvents: "auto" });
      section.querySelectorAll(".t-btn").forEach((b) => b.classList.remove("is-active"));
      btnT1.classList.add("is-active");
      currentTState = 1;

      // --- line reveal: oude regels schuiven omhoog weg, nieuwe komen van onder ---
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const imgHidden = 'inset(50% 50% 50% 50%)';
      const imgVisible = 'inset(0% 0% 0% 0%)';
      let isAnimating = false;

      const parts = slides.map((slide, i) => {
        const part = { lines: [], image: slide.querySelector('.testimonial_profile-image') };
        if (reduceMotion || typeof SplitText === 'undefined') return part;
        const targets = slide.querySelectorAll('.testimonial_quote, .testimonial_name');
        const splits = [];
        targets.forEach((el) => {
          // SplitText can't find lines in a flex/grid box: split an inner block instead
          if (/flex|grid/.test(getComputedStyle(el).display)) {
            const inner = document.createElement('div');
            inner.style.width = '100%';
            while (el.firstChild) inner.appendChild(el.firstChild);
            el.appendChild(inner);
            el = inner;
          }
          splits.push(SplitText.create(el, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'text-line',
          autoSplit: true,
          onSplit(self) {
            // autoSplit re-splits on resize/font load: gather fresh lines each time
            part.lines = splits.concat(self).filter((sp, k, a) => sp && a.indexOf(sp) === k).flatMap((sp) => sp.lines);
            const active = i === currentTState - 1;
            if (!isAnimating) gsap.set(self.lines, { yPercent: active ? 0 : 110 });
          }
        }));
        });
        part.lines = splits.flatMap((sp) => sp.lines);
        if (part.image) gsap.set(part.image, { clipPath: i === 0 ? imgVisible : imgHidden });
        return part;
      });

      function goToState(n) {
        if (currentTState === n || isAnimating) return;
        const from = currentTState - 1;
        const to = n - 1;
        const out = slides[from];
        const inc = slides[to];
        isAnimating = true;

        section.querySelectorAll(".t-btn").forEach((b) => b.classList.remove("is-active"));
        btns[to].classList.add("is-active");
        currentTState = n;
        resetProgress();

        const done = () => {
          gsap.set(out, { autoAlpha: 0, pointerEvents: "none" });
          gsap.set(inc, { pointerEvents: "auto" });
          isAnimating = false;
        };

        if (reduceMotion || !parts[to].lines.length) {
          gsap.to(out, { autoAlpha: 0, duration: 0.4, ease: "power2" });
          gsap.fromTo(inc, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, ease: "power2", onComplete: done });
          return;
        }

        gsap.set(inc, { autoAlpha: 1 });
        gsap.set(parts[to].lines, { yPercent: 110 });

        const tl = gsap.timeline({ onComplete: done });
        tl.to(parts[from].lines, { yPercent: -110, duration: 0.6, ease: "power4.inOut", stagger: { amount: 0.25 } }, 0);
        // fromTo with both values spelled out: the browser shortens inset(50% 50% 50% 50%) to inset(50%), which GSAP can't tween from
        if (parts[from].image) tl.fromTo(parts[from].image, { clipPath: imgVisible }, { clipPath: imgHidden, duration: 0.6, ease: "power4.inOut" }, 0);
        tl.to(parts[to].lines, { yPercent: 0, duration: 0.7, ease: "power4.inOut", stagger: { amount: 0.4 } }, ">-=0.3");
        if (parts[to].image) tl.fromTo(parts[to].image, { clipPath: imgHidden }, { clipPath: imgVisible, duration: 0.75, ease: "power4.inOut", immediateRender: true }, "<");
      }

      wrapT1.addEventListener("click", () => goToState(1));
      wrapT2.addEventListener("click", () => goToState(2));
      wrapT3.addEventListener("click", () => goToState(3));

      function startProgressLoop() {
        gsap.set(progressBar, { x: "-100%" });
        gsap.to(progressBar, {
          x: "0%",
          duration: 12,
          ease: "none",
          onComplete: () => goToState(currentTState === 3 ? 1 : currentTState + 1)
        });
      }

      function resetProgress() {
        gsap.killTweensOf(progressBar);
        startProgressLoop();
      }

      // één keer starten — niet dubbel
      startProgressLoop();
    });

    // --- nice blue line animation -------------------------------------
    qa('[data-line-container]').forEach((container) => {
      const line = container.querySelector('[data-bleu-line]');
      if (!line) return;
      const containerWidth = container.offsetWidth;

      gsap.set(line, { x: "-2rem", scaleX: 0.2, transformOrigin: "left center" });
      gsap.timeline({ repeat: -1, repeatDelay: 0.2 })
        .to(line, { duration: 0.3, ease: "power1.in" })
        .to(line, { x: containerWidth + 160, scaleX: 1.4, duration: 4.4, ease: "power2.inOut" })
        .to(line, { duration: 0.3, ease: "power1.out" })
        .add(() => { gsap.set(line, { x: "-2rem", scaleX: 0.2 }); });
    });

    // --- dino stuff ---------------------------------------------------
    floatEl("#dino", {
      xPercent: -2,
      rotation: -6,
      duration: 1,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
      transformOrigin: "center"
    });
    floatEl("#hourglass", {
      rotation: 360,
      transformOrigin: "50% 50%",
      repeat: -1,
      ease: "linear",
      duration: 3
    });
    floatEl("#hourglass", {
      xPercent: -4,
      duration: 1,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
      transformOrigin: "center"
    });
    floatEl("#ERROR", {
      opacity: 1,
      xPercent: -4,
      rotation: -2,
      scale: 1.2,
      duration: 1,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    });
    floatEl("#ERROR2", {
      opacity: 1,
      xPercent: 2,
      rotation: 2,
      scale: 1.4,
      duration: 2,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    });
    floatEl("#ERROR3", {
      opacity: 1,
      xPercent: 6,
      rotation: -2,
      scale: 1.8,
      duration: 2.2,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true
    });

    function initCSSMarquee() {
      const defaultSpeed = 60; // fallback when no attribute is set
      const marquees = qa('[data-css-marquee]');
      if (!marquees.length) return;

      // Copy the list until it fills the widest screen the marquee may stretch to
      // (one copy was too short on very wide screens, so its end came into view)
      marquees.forEach(marquee => {
        const originals = [...marquee.querySelectorAll('[data-css-marquee-list]')];
        const listWidth = originals.reduce((w, list) => w + list.offsetWidth, 0);
        const wide = Math.max(marquee.offsetWidth, window.screen ? screen.width : 0);
        const copies = listWidth ? Math.max(1, Math.ceil(wide / listWidth)) : 1;
        for (let i = 0; i < copies; i++) {
          originals.forEach(list => {
            const duplicate = list.cloneNode(true);
            duplicate.setAttribute('aria-hidden', 'true');
            marquee.appendChild(duplicate);
          });
        }
      });

      // Pause/run based on whether the marquee is in view
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          entry.target.querySelectorAll('[data-css-marquee-list]').forEach(list =>
            list.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused'
          );
        });
      }, { threshold: 0 });

      // Set duration from width + per-marquee speed, then observe.
      // Measure every list first and only then write styles, so the browser
      // lays out the page once instead of once per list.
      const lists = [];
      marquees.forEach(marquee => {
        const pixelsPerSecond =
          parseFloat(marquee.getAttribute('data-css-marquee-speed')) || defaultSpeed;
        marquee.querySelectorAll('[data-css-marquee-list]').forEach(list => {
          lists.push([list, list.offsetWidth / pixelsPerSecond]);
        });
      });
      lists.forEach(([list, seconds]) => {
        list.style.animationDuration = seconds + 's';
        list.style.animationPlayState = 'paused';
      });
      marquees.forEach(marquee => observer.observe(marquee));
    }
    initCSSMarquee();

    // Hero members row: the avatars in view tumble in once (like the InnerGym hero),
    // then the marquee keeps carrying them left. Add data-marquee-intro to the marquee.
    qa('[data-marquee-intro]').forEach(marquee => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const right = marquee.getBoundingClientRect().right;
      const inView = [...qa('[data-css-marquee-list] > *', marquee)]
        .filter(el => el.getBoundingClientRect().left < right);
      gsap.from(inView, {
        opacity: 0, yPercent: 40, xPercent: 30, rotate: 30,
        duration: 0.9, ease: 'expo.out', stagger: 0.1, delay: 0.5
      });
    });

    // --- globe --------------------------------------------------------
    function initAcceleratingGlobe() {
      qa('[data-accelerating-globe]').forEach(function (globe) {
        const circles = globe.querySelectorAll('[data-accelerating-globe-circle]');
        if (circles.length < 8) return; // needs at least 8

        const tl = gsap.timeline({
          repeat: -1,
          defaults: { duration: 1, ease: "none" }
        });

        const widths = [
          ["50%", "37.5%"],
          ["37.5%", "25%"],
          ["25%", "12.5%"],
          ["calc(12.5% + 1px)", "calc(0% + 1px)"],
          ["calc(0% + 1px)", "calc(12.5% + 1px)"],
          ["12.5%", "25%"],
          ["25%", "37.5%"],
          ["37.5%", "50%"]
        ];

        circles.forEach((el, i) => {
          const [fromW, toW] = widths[i];
          tl.fromTo(el, { width: fromW }, { width: toW }, i === 0 ? 0 : "<");
        });

        let lastY = window.scrollY;
        let lastT = performance.now();
        let stopTimeout;

        function onScroll() {
          const now = performance.now();
          const dy = window.scrollY - lastY;
          const dt = now - lastT;
          lastY = window.scrollY;
          lastT = now;

          const velocity = dt > 0 ? (dy / dt) * 1000 : 0; // px/s
          const boost = Math.abs(velocity * 0.005);
          const targetScale = boost + 1;
          tl.timeScale(targetScale);

          clearTimeout(stopTimeout);
          stopTimeout = setTimeout(() => {
            gsap.to(tl, {
              timeScale: 1,
              duration: 0.6,
              ease: "power2.out",
              overwrite: true
            });
          }, 100);
        }

        window.addEventListener("scroll", onScroll, { passive: true });
      });
    }
    initAcceleratingGlobe();

    // DFS block assembly
    // Host: any element with the custom attribute  data-dfs-blocks
    // Look is controlled by CSS on the host div:
    //   --blk-tone, --blk-radius, --blk-gap, --blk-shadow
    // Optional attributes on the host:
    //   data-merge="#4696E2"   colour the pieces settle to (default: same as --blk-tone)
    //   data-bleed="1.15"      how far the scatter spills past the panel (1 = stays inside)
    (function () {
      'use strict';
      // 5 rows x 8 cols, tiled by 10 tetrominoes
      var PIECES = [
        [
          [0, 0],
          [0, 1],
          [1, 1],
          [1, 2]
        ],
        [
          [0, 2],
          [0, 3],
          [0, 4],
          [0, 5]
        ],
        [
          [0, 6],
          [0, 7],
          [1, 6],
          [1, 7]
        ],
        [
          [1, 3],
          [1, 4],
          [1, 5],
          [2, 5]
        ],
        [
          [1, 0],
          [2, 0],
          [3, 0],
          [3, 1]
        ],
        [
          [2, 1],
          [2, 2],
          [3, 2],
          [3, 3]
        ],
        [
          [2, 3],
          [2, 4],
          [3, 4],
          [3, 5]
        ],
        [
          [2, 6],
          [2, 7],
          [3, 7],
          [4, 7]
        ],
        [
          [3, 6],
          [4, 6],
          [4, 5],
          [4, 4]
        ],
        [
          [4, 0],
          [4, 1],
          [4, 2],
          [4, 3]
        ]
      ];
      // Per-piece lightness, so they start mismatched and resolve to one tone
      var TONE_STEPS = [1.16, 0.84, 1.06, 0.75, 0.95, 1.11, 0.88, 1.00, 0.80, 1.08];
      var COLS = 8,
        ROWS = 5,
        MAX_CELL = 46,
        MIN_CELL = 14;
      // Glow once the pieces come together. 0 = off.
      var GLOW_HOLD = 0.55; // steady glow while assembled
      var GLOW_FLASH = 0.45; // extra burst at the moment they merge
      var GLOW_SIZE = 0.55; // blur radius as a fraction of one block
      // Colour the pieces settle to once assembled. Set to null to keep the base tone.
      var MERGE_TONE = '#4696E2';
      // Pixel-stepped corners instead of a CSS radius.
      var CORNER_STEPS = 2; // steps cut from each corner (0 = plain square)
      var CORNER_UNIT = 0.06; // size of one step, as a fraction of the block
      // Builds a clip-path with staircase corners for a square of side s
      function pixelCorners(s, steps, u) {
        if (!steps || u < 1) return 'none';
        var p = [],
          i;
        p.push([steps * u, 0]);
        p.push([s - steps * u, 0]);
        for (i = 1; i <= steps; i++) {
          p.push([s - (steps - i + 1) * u, i * u]);
          p.push([s - (steps - i) * u, i * u]);
        }
        p.push([s, s - steps * u]);
        for (i = 1; i <= steps; i++) {
          p.push([s - i * u, s - (steps - i + 1) * u]);
          p.push([s - i * u, s - (steps - i) * u]);
        }
        p.push([steps * u, s]);
        for (i = 1; i <= steps; i++) {
          p.push([(steps - i + 1) * u, s - i * u]);
          p.push([(steps - i) * u, s - i * u]);
        }
        p.push([0, steps * u]);
        for (i = steps; i >= 1; i--) {
          p.push([(steps - i) * u, i * u]);
          p.push([(steps - i + 1) * u, i * u]);
        }
        return 'polygon(' + p.map(function (q) {
          return q[0].toFixed(1) + 'px ' + q[1].toFixed(1) + 'px';
        }).join(',') + ')';
      }
      var T = { drift: 3000, gather: 2100, merge: 1100, hold: 3200, out: 900, back: 900 };
      var CYCLE = T.drift + T.gather + T.merge + T.hold + T.out + T.back;

      function easeInOut(x) { return 0.5 - 0.5 * Math.cos(Math.PI * x); }

      function toRGB(str) {
        var m = String(str).trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (m) {
          var h = m[1];
          if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
          return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6),
            16)];
        }
        m = String(str).match(/rgba?\(([^)]+)\)/i);
        if (m) { var p = m[1].split(',').map(parseFloat); return [p[0] | 0, p[1] | 0, p[2] | 0]; }
        return [185, 175, 155];
      }

      function shade(rgb, f) {
        return rgb.map(function (v) { return Math.max(0, Math.min(255, Math.round(v * f))); });
      }

      function seeded(n) {
        var s = n;
        return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
      }
      // Keeps a rotation in the -180..180 range. Safe to call only while the piece
      // is drawn at full angle (loose = 1), where a 360 shift looks identical.
      function wrapAngle(a) {
        a = (a + 180) % 360;
        if (a < 0) a += 360;
        return a - 180;
      }

      function mount(host) {
        if (host.dataset.dfsBlocksReady) return;
        host.dataset.dfsBlocksReady = '1';
        var cs = getComputedStyle(host);
        if (cs.position === 'static') host.style.position = 'relative';
        var baseRGB = toRGB(cs.getPropertyValue('--blk-tone') || '#B9AF9B');
        var mergeSrc = host.getAttribute('data-merge') || MERGE_TONE;
        var mergeRGB = mergeSrc ? toRGB(mergeSrc) : baseRGB;
        var gap = parseFloat(cs.getPropertyValue('--blk-gap')) || 3;
        var shadow = (cs.getPropertyValue('--blk-shadow') || '').trim() ||
          '0 3px 5px rgba(0,0,0,.16)';
        var bleed = parseFloat(host.getAttribute('data-bleed')) || 1.15;
        var layer = document.createElement('div');
        layer.className = 'dfs-blk-layer';
        host.appendChild(layer);
        var rnd = seeded(1277);
        var pieces = PIECES.map(function (cells, i) {
          var minR = 99,
            minC = 99,
            maxR = -1,
            maxC = -1;
          cells.forEach(function (q) {
            minR = Math.min(minR, q[0]);
            minC = Math.min(minC, q[1]);
            maxR = Math.max(maxR, q[0]);
            maxC = Math.max(maxC, q[1]);
          });
          var el = document.createElement('div');
          el.className = 'dfs-blk-piece';
          var squares = cells.map(function () {
            var s = document.createElement('div');
            s.className = 'dfs-blk-cell';
            el.appendChild(s);
            return s;
          });
          layer.appendChild(el);
          var theta = (i / PIECES.length) * Math.PI * 2 + rnd() * 0.5;
          return {
            el: el,
            squares: squares,
            cells: cells,
            minR: minR,
            minC: minC,
            maxR: maxR,
            maxC: maxC,
            from: shade(baseRGB, TONE_STEPS[i % TONE_STEPS.length]),
            theta: theta,
            radius: 0.82 + rnd() * 0.28,
            wobbleAmp: 0.05 + rnd() * 0.03,
            wobbleX: 0.05 + rnd() * 0.03,
            wobbleY: 0.065 + rnd() * 0.03,
            phaseX: rnd() * 6.28,
            phaseY: rnd() * 6.28,
            spin: (rnd() < 0.5 ? -1 : 1) * (8 + rnd() * 46),
            angle: rnd() * 360,
            driftX: rnd() * 6.28,
            driftY: rnd() * 6.28,
            homeX: 0,
            homeY: 0
          };
        });
        var W = 0,
          H = 0,
          cellPx = 0;

        function layout() {
          W = host.clientWidth;
          H = host.clientHeight;
          if (!W || !H) return false;
          var cell = Math.max(MIN_CELL, Math.min(W * 0.92 / COLS, H * 0.72 / ROWS, MAX_CELL));
          cellPx = cell;
          var ox = (W - cell * COLS) / 2,
            oy = (H - cell * ROWS) / 2;
          var side = cell - gap * 2;
          var clip = pixelCorners(side, CORNER_STEPS, Math.max(1, Math.round(side * CORNER_UNIT)));
          pieces.forEach(function (p) {
            p.el.style.left = (ox + p.minC * cell) + 'px';
            p.el.style.top = (oy + p.minR * cell) + 'px';
            p.el.style.width = ((p.maxC - p.minC + 1) * cell) + 'px';
            p.el.style.height = ((p.maxR - p.minR + 1) * cell) + 'px';
            p.cells.forEach(function (q, j) {
              var s = p.squares[j];
              s.style.left = ((q[1] - p.minC) * cell + gap) + 'px';
              s.style.top = ((q[0] - p.minR) * cell + gap) + 'px';
              s.style.width = side + 'px';
              s.style.height = side + 'px';
              s.style.borderRadius = '0';
              s.style.clipPath = clip;
            });
            // Scatter ring. X = how far sideways, Y = how far up/down, as a fraction of the panel.
            p.homeX = Math.cos(p.theta) * W * 0.24 * p.radius * bleed;
            p.homeY = Math.sin(p.theta) * H * 0.52 * p.radius * bleed;
          });
          return true;
        }

        function paint(gather, merge) {
          var loose = 1 - gather;
          pieces.forEach(function (p) {
            var dx = p.homeX + Math.sin(p.driftX + p.phaseX) * W * p.wobbleAmp * 0.5;
            var dy = p.homeY + Math.cos(p.driftY + p.phaseY) * H * p.wobbleAmp * 0.5;
            p.el.style.transform =
              'translate(' + (dx * loose).toFixed(2) + 'px,' + (dy * loose).toFixed(2) + 'px)' +
              ' rotate(' + (p.angle * loose).toFixed(2) + 'deg)';
            p.el.style.filter = gather > 0.85 ? 'drop-shadow(' + shadow + ')' : 'none';
            var c = 'rgb(' +
              Math.round(p.from[0] + (mergeRGB[0] - p.from[0]) * merge) + ',' +
              Math.round(p.from[1] + (mergeRGB[1] - p.from[1]) * merge) + ',' +
              Math.round(p.from[2] + (mergeRGB[2] - p.from[2]) * merge) + ')';
            p.squares.forEach(function (s) { s.style.background = c; });
          });
        }

        function renderStatic() {
          if (layout()) {
            layer.style.opacity = '1';
            paint(1, 1);
          }
        }
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          renderStatic();
          if (window.ResizeObserver) new ResizeObserver(renderStatic).observe(host);
          return;
        }
        var clock = 0,
          last = 0,
          raf = null,
          visible = false;

        function frame(now) {
          var dt = last ? Math.min(64, now - last) : 16;
          last = now;
          clock += dt;
          var m = clock % CYCLE,
            gather, merge, opacity;
          var a = T.drift,
            b = a + T.gather,
            c = b + T.merge,
            d = c + T.hold,
            e = d + T.out;
          if (m < a) {
            gather = 0;
            merge = 0;
            opacity = 1;
          }
          else if (m < b) {
            gather = easeInOut((m - a) / T.gather);
            merge = 0;
            opacity = 1;
          }
          else if (m < c) {
            gather = 1;
            merge = easeInOut((m - b) / T.merge);
            opacity = 1;
          }
          else if (m < d) {
            gather = 1;
            merge = 1;
            opacity = 1;
          }
          else if (m < e) {
            gather = 1;
            merge = 1;
            opacity = 1 - easeInOut((m - d) / T.out);
          }
          else {
            gather = 0;
            merge = 0;
            opacity = easeInOut((m - e) / T.back);
          }
          var sec = dt / 1000,
            loose = 1 - gather;
          pieces.forEach(function (p) {
            p.angle += p.spin * sec * loose;
            // Only wrap while fully loose: rotation is drawn as angle * loose, so an
            // unwrapped angle would force the piece to unwind everything it has ever
            // spun during the gather, and that unwind gets faster the longer the page
            // stays open.
            if (loose > 0.999) p.angle = wrapAngle(p.angle);
            p.driftX += p.wobbleX * sec * 6.28 * loose;
            p.driftY += p.wobbleY * sec * 6.28 * loose;
          });
          layer.style.opacity = opacity.toFixed(3);
          paint(gather, merge);
          raf = requestAnimationFrame(frame);
        }

        function start() {
          if (!raf) {
            last = 0;
            raf = requestAnimationFrame(frame);
          }
        }

        function stop() {
          if (raf) {
            cancelAnimationFrame(raf);
            raf = null;
          }
        }
        if (!layout()) requestAnimationFrame(layout);
        if (window.ResizeObserver) new ResizeObserver(layout).observe(host);
        else window.addEventListener('resize', layout);
        if ('IntersectionObserver' in window) {
          new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            if (visible) { start(); } else { stop(); }
          }, { threshold: 0.05 }).observe(host);
        } else {
          start();
        }
        document.addEventListener('visibilitychange', function () {
          if (document.hidden) { stop(); } else if (visible) { start(); }
        });
      }
      document.querySelectorAll('[data-dfs-blocks]').forEach(mount);
    })();
  }

  // =========================================================
  // COURSE PLAYER — /courses/fundamentals
  // (was Slater Course.js)
  // =========================================================
  function dfsCourse() {
    const hamburger = document.querySelector('.bold-nav-full__hamburger');
    const menuWrap = document.querySelector('.absoulte_menu_wrap');
    const menuToggle = document.querySelector('.Menu_toggle');
    let isOpen = false;
    let heightUpdateTimeout = null;
    let preferredSpeed = 1;

    // Breakpoint for mobile/tablet
    const MOBILE_BREAKPOINT = 768;

    // Function to check if we're on mobile/tablet
    function isMobileView() {
      return window.innerWidth <= MOBILE_BREAKPOINT;
    }

    // Function to close the menu
    function closeMenu() {
      gsap.to(menuWrap, {
        minHeight: 0,
        duration: 0.4,
        ease: 'power2.inOut'
      });

      isOpen = false;
      document.body.classList.remove('menu-open');
    }

    // Function to update menu height when content changes
    function updateMenuHeight() {
      if (!menuWrap || !isOpen) return;

      // Get current height
      const currentHeight = menuWrap.offsetHeight;

      // Temporarily remove minHeight to measure natural height
      menuWrap.style.minHeight = 'none';
      const newHeight = menuWrap.scrollHeight;

      // Set back to current before animating
      menuWrap.style.minHeight = currentHeight + 'px';

      // Animate to new height
      gsap.to(menuWrap, {
        minHeight: newHeight,
        duration: 0.3,
        ease: 'power2.out'
      });
    }

    // Function to open the menu
    function openMenu() {
      // First, set to auto to get the natural height
      gsap.set(menuWrap, { minHeight: 'auto' });
      // Get the calculated height
      const fullHeight = menuWrap.scrollHeight;
      // Reset to 0
      gsap.set(menuWrap, { minHeight: 0 });
      // Now animate to the calculated height
      gsap.to(menuWrap, {
        minHeight: fullHeight,
        duration: 0.5,
        ease: 'power2.out'
      });

      isOpen = true;
      document.body.classList.add('menu-open');
    }

    // Function to toggle menu
    function toggleMenu() {
      if (!isOpen) {
        openMenu();
      } else {
        closeMenu();
      }
    }

    // Hamburger click handler
    if (hamburger && menuWrap) {
      hamburger.addEventListener('click', toggleMenu);

      // Listen for accordion clicks inside the menu (but not on the hamburger)
      menuWrap.addEventListener('click', (e) => {
        // Ignore if clicking the hamburger itself
        if (e.target.closest('.bold-nav-full__hamburger')) return;

        const accordionTrigger = e.target.closest('.course_module');
        if (accordionTrigger) {
          // Clear any pending update
          if (heightUpdateTimeout) clearTimeout(heightUpdateTimeout);
          // Wait for accordion animation to finish, then update
          heightUpdateTimeout = setTimeout(updateMenuHeight, 350);
        }
      });
    }

    // Also support .Menu_toggle for mobile/tablet
    if (menuToggle && menuWrap) {
      menuToggle.addEventListener('click', toggleMenu);
    }

    // ---- WATER HORSE (hydration reminder) ----
    gsap.registerPlugin(SplitText, CustomEase);

    CustomEase.create("elastic",
      "M0,0 C0.0127,0.0956 0.0562,0.434 0.076,0.5737 C0.0958,0.7134 0.1077,0.7761 0.1187,0.8382 C0.1297,0.9003 0.1341,0.9145 0.1419,0.9463 C0.1497,0.9781 0.1574,1.0055 0.1654,1.0292 C0.1734,1.0529 0.1814,1.0725 0.1897,1.0886 C0.198,1.1047 0.2086,1.1177 0.2153,1.1258 C0.222,1.1339 0.2248,1.1342 0.2297,1.137 C0.2346,1.1398 0.2396,1.1415 0.2448,1.1424 C0.25,1.1433 0.2554,1.1433 0.261,1.1423 C0.2666,1.1413 0.2704,1.1409 0.2786,1.1366 C0.2868,1.1323 0.2922,1.1308 0.3101,1.1165 C0.328,1.1022 0.3669,1.0665 0.3862,1.0507 C0.4055,1.0349 0.4118,1.0304 0.4257,1.0219 C0.4397,1.0134 0.4548,1.0053 0.4699,0.9995 C0.485,0.9937 0.4967,0.9898 0.5163,0.9872 C0.5359,0.9846 0.5383,0.9819 0.5877,0.9842 C0.6371,0.9865 0.7439,0.9985 0.8126,1.0011 C0.8813,1.0037 0.9688,1.0002 1,1"
    );

    // ---- HYDRATION TIMER ----
    const HYDRATION_INTERVAL = 30 * 60 * 1000; // 30 min — for testing use 20 * 1000
    let hydrationEligible = false;
    let hydrationTimer = null;

    function startHydrationTimer() {
      clearTimeout(hydrationTimer);
      hydrationEligible = false;
      hydrationTimer = setTimeout(() => {
        hydrationEligible = true;
      }, HYDRATION_INTERVAL);
    }

    startHydrationTimer();

    document.fonts.ready.then(() => {
      const wrap = document.querySelector('[data-hydration="component"]');
      if (!wrap) return;

      const horse = wrap.querySelector('[data-hydration="horse"]');
      const text = wrap.querySelector('[data-hydration="text"]');
      const reset = wrap.querySelector('[data-hydration="reset"]');

      let tlIn, tlOut, words, idle;

      function startIdle() {
        stopIdle();
        idle = gsap.timeline({ repeat: -1, yoyo: true })
          .to(horse, {
            y: -4,
            rotation: 2,
            duration: 1.8,
            ease: 'sine.inOut',
            transformOrigin: '50% 60%'
          })
          .to(horse, {
            y: 0,
            rotation: -1,
            duration: 2.2,
            ease: 'sine.inOut'
          });
      }

      function stopIdle() {
        if (idle) {
          idle.kill();
          idle = null;
        }
        gsap.set(horse, { y: 0, rotation: 0 });
      }

      SplitText.create(text, {
        type: 'lines, words',
        mask: 'lines',
        autoSplit: true,
        onSplit(instance) {
          words = instance.words;

          tlIn = gsap.timeline({ paused: true, onComplete: startIdle })
            .set(wrap, { visibility: 'visible' })
            .from(horse, {
              yPercent: 110,
              duration: 1,
              ease: 'elastic'
            })
            .from(words, {
              yPercent: 110,
              duration: 0.9,
              stagger: 0.06,
              ease: 'elastic'
            }, '-=0.7')
            .from(reset, {
              yPercent: 110,
              duration: 0.9,
              ease: 'elastic'
            }, '-=0.75');

          return tlIn;
        }
      });

      function playExit() {
        if (!words) return;
        if (tlOut && tlOut.isActive()) return;

        stopIdle();

        tlOut = gsap.timeline({
            onComplete() {
              gsap.set(wrap, { visibility: 'hidden' });
              startHydrationTimer(); // next cycle begins on dismissal
            }
          })
          .fromTo(reset, { rotation: 0 }, {
            rotation: -720,
            duration: 1,
            ease: 'power2.inOut',
            transformOrigin: '50% 50%'
          }, 0)
          .to(horse, {
            yPercent: 110,
            duration: 0.5,
            ease: 'power2.in'
          }, 0)
          .to(words, {
            yPercent: 110,
            duration: 0.4,
            stagger: 0.04,
            ease: 'power2.in'
          }, 0.25)
          .to(reset, {
            yPercent: 110,
            duration: 0.4,
            ease: 'power2.in'
          }, 1);
      }

      document.addEventListener('click', (e) => {
        if (!tlIn) return;

        // SHOW — only when the 30-min cycle has elapsed
        if (e.target.closest('[data-hydration-trigger]')) {
          if (!hydrationEligible) return;
          hydrationEligible = false;
          if (tlOut) tlOut.kill();
          stopIdle();
          gsap.set(reset, { rotation: 0 });
          gsap.set([horse, reset], { yPercent: 110 });
          if (words) gsap.set(words, { yPercent: 110 });
          tlIn.timeScale(0.5).restart();
          return;
        }

        // HIDE — click anywhere on the component
        if (e.target.closest('[data-hydration="component"]')) {
          playExit();
        }
      }, true);
    });

    // ==============================================
    // AUTO-DETECT COURSE FROM URL
    // e.g., /courses/fundamentals → "fundamentals"
    const currentCourse = window.location.pathname.split('/courses/')[1]?.split('/')[0] ||
      'fundamentals';
    const lessons = [
      { id: "lesson-0.1", complete: false },
      { id: "lesson-0.2", complete: false },
      { id: "lesson-1.1", complete: false },
      { id: "lesson-1.2", complete: false },
      { id: "lesson-1.3", complete: false },
      { id: "lesson-1.4", complete: false },
      { id: "lesson-2.1", complete: false },
      { id: "lesson-2.2", complete: false },
      { id: "lesson-3.1", complete: false },
      { id: "lesson-3.2", complete: false },
      { id: "lesson-3.3", complete: false },
      { id: "lesson-4.1", complete: false },
      { id: "lesson-4.2", complete: false },
      { id: "lesson-4.3", complete: false },
      { id: "lesson-4.4", complete: false },
      { id: "lesson-4.5", complete: false }, // bonus: Browser Alternatives
      { id: "lesson-5.1", complete: false },
      { id: "lesson-5.2", complete: false },
      { id: "lesson-5.3", complete: false },
      { id: "lesson-5.4", complete: false },
      { id: "lesson-5.5", complete: false },
      { id: "lesson-5.6", complete: false },
      { id: "lesson-6.1", complete: false },
      { id: "lesson-6.2", complete: false },
      { id: "lesson-6.3", complete: false },
      { id: "lesson-6.4", complete: false },
      { id: "lesson-7.1", complete: false },
      { id: "lesson-7.2", complete: false },
      { id: "lesson-7.3", complete: false },
      { id: "lesson-7.4", complete: false },
      { id: "lesson-7.5", complete: false },
      { id: "lesson-8.1", complete: false },
      { id: "lesson-8.2", complete: false },
      { id: "lesson-8.3", complete: false },
      { id: "lesson-8.4", complete: false }
    ];
    // PROGRESS FUNCTION
    const progressBar = document.querySelector(".progress_juice");
    const completeButtons = document.querySelectorAll("[data-action='complete-lesson']");
    // Initial bar state
    if (progressBar) {
      gsap.set(progressBar, { xPercent: -100 });
    }
    // COMPLETE BUTTONS (marks complete and goes to next)
    completeButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        let lessonId = btn.getAttribute('data-lesson-id');
        if (!lessonId) {
          const activeLesson = document.querySelector('.c_item.is-active');
          lessonId = activeLesson?.id;
        }
        if (lessonId) {
          markLessonComplete(lessonId);
          goToNextLesson(lessonId);
        }
      });
    });
    // TOGGLE BUTTONS (toggle complete/incomplete)
    const toggleButtons = document.querySelectorAll("[data-action='toggle-lesson']");
    toggleButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        let lessonId = btn.getAttribute('data-lesson-id');
        if (!lessonId) {
          const closestItem = btn.closest('.c_item');
          lessonId = closestItem?.id;
        }
        if (lessonId) {
          toggleLessonComplete(lessonId);
        }
      });
    });
    // PREVIOUS BUTTON (navigate to previous lesson)
    const previousButton = document.getElementById("previous");
    if (previousButton) {
      previousButton.addEventListener("click", (e) => {
        e.stopPropagation();
        const activeLesson = document.querySelector('.c_item.is-active');
        if (activeLesson) {
          goToPreviousLesson(activeLesson.id);
        }
      });
    }

    function markLessonComplete(lessonId) {
      const lesson = lessons.find(l => l.id === lessonId);
      if (!lesson) return;
      // Only mark as complete (doesn't toggle)
      if (!lesson.complete) {
        lesson.complete = true;
        updateLessonUI(lessonId, true);
        updateProgress();
      }
    }

    function goToNextLesson(currentLessonId) {
      const currentIndex = lessons.findIndex(l => l.id === currentLessonId);
      if (currentIndex === -1 || currentIndex >= lessons.length - 1) return;
      const nextLesson = lessons[currentIndex + 1];
      const nextLessonElement = document.getElementById(nextLesson.id);
      if (!nextLessonElement) return;
      nextLessonElement.click();
    }

    function goToPreviousLesson(currentLessonId) {
      const currentIndex = lessons.findIndex(l => l.id === currentLessonId);
      if (currentIndex === -1 || currentIndex <= 0) return;
      const previousLesson = lessons[currentIndex - 1];
      const previousLessonElement = document.getElementById(previousLesson.id);
      if (!previousLessonElement) return;
      previousLessonElement.click();
    }

    function toggleLessonComplete(lessonId) {
      const lesson = lessons.find(l => l.id === lessonId);
      if (!lesson) return;
      lesson.complete = !lesson.complete;
      updateLessonUI(lessonId, lesson.complete);
      updateProgress();
    }

    function updateLessonUI(lessonId, isComplete) {
      const lessonItem = document.getElementById(lessonId);
      if (!lessonItem) return;
      const checkFill = lessonItem.querySelector(".check_fill");
      if (checkFill) {
        if (isComplete) {
          checkFill.classList.add("is-complete");
        } else {
          checkFill.classList.remove("is-complete");
        }
      }
    }

    function updateProgress(isPageLoad = false) {
      const completed = lessons.filter(l => l.complete).length;
      const total = lessons.length;
      const percent = Math.round((completed / total) * 100);
      // Slower animation on page load, faster on lesson complete
      const duration = isPageLoad ? 1.2 : 0.6;
      // Animate number wheels
      animateProgressNumbers(currentCourse, percent, duration);
      // Animate progress bar
      if (progressBar) {
        gsap.to(progressBar, {
          xPercent: percent - 100,
          duration: duration,
          ease: "power2.out"
        });
      }
      // Save progress to Memberstack whenever it changes (but not on page load)
      if (!isPageLoad) {
        saveMemberProgress();
      }
    }
    // INITIAL STATE - Load first incomplete lesson
    function setInitialState() {
      document.querySelectorAll('.c_item').forEach(el => el.classList.remove('is-active'));
      document.querySelectorAll('.course_module').forEach(el => el.classList.remove('is-active'));
      document.querySelectorAll('.course_content').forEach(el => el.classList.remove(
        'is-active'));
      // Find first incomplete lesson
      const firstIncompleteLesson = lessons.find(l => !l.complete);
      // If all complete, use last lesson; otherwise use first incomplete
      const targetLesson = firstIncompleteLesson || lessons[lessons.length - 1];
      const targetLessonElement = document.getElementById(targetLesson.id);
      if (!targetLessonElement) return;
      // Activate the lesson
      targetLessonElement.classList.add('is-active');
      // Activate corresponding module
      const module = targetLessonElement.closest('.accordion-css__item')?.querySelector(
        '.course_module');
      if (module) module.classList.add('is-active');
      // Use existing switchLessonContent function
      switchLessonContent(targetLessonElement);
    }
    // LESSON NAVIGATION
    function switchLessonContent(item) {
      // ---- CLOSE MENU ON MOBILE/TABLET ----
      if (isMobileView() && isOpen) {
        closeMenu();
      }

      const videoSrc = item.getAttribute('data-video-src');
      const textId = item.getAttribute('data-text-id');
      const placeholderSrc = item.getAttribute('data-placeholder');
      // ---- CLOSE FINISH LINK BLOCK ----
      if (finishLinkBlock) {
        finishLinkBlock.style.display = 'none';
      }
      // ---- RESET VIDEO PROGRESS BAR ----
      const oldPlayer = document.getElementById('video-player');
      if (oldPlayer) {
        const progressBar = oldPlayer.querySelector('[data-player-progress]');
        const handle = oldPlayer.querySelector('[data-player-timeline-handle]');
        const timeProgressEls = oldPlayer.querySelectorAll('[data-player-time-progress]');
        if (progressBar) {
          progressBar.style.transform = 'translateX(-100%)';
        }
        if (handle) {
          handle.style.left = '0%';
        }
        if (timeProgressEls.length) {
          timeProgressEls.forEach(function (el) {
            el.textContent = '00:00';
          });
        }
      }
      // ---- TEXT SWITCH ----
      document.querySelectorAll('.course_content').forEach(el => {
        el.classList.remove('is-active');
      });
      const activeText = document.getElementById(textId);
      if (activeText) {
        activeText.classList.add('is-active');
      }
      // ---- PLACEHOLDER SWITCH ----
      const placeholder = document.getElementById('placeholder_img');
      if (placeholder) {
        if (placeholderSrc) {
          placeholder.removeAttribute('srcset'); // Remove srcset so src takes priority
          placeholder.setAttribute('src', placeholderSrc);
        } else {
          console.warn(`No data-placeholder attribute found for ${item.id}`);
        }
      }
      // ---- FULL VIDEO PLAYER RESET ----
      if (!oldPlayer || !videoSrc) return;
      const newPlayer = oldPlayer.cloneNode(true);
      // Reset required attributes
      newPlayer.setAttribute('data-player-src', videoSrc);
      newPlayer.setAttribute('data-player-activated', 'false');
      newPlayer.setAttribute('data-player-status', 'idle');
      // Shut the old player down (its video stream + page-level listeners),
      // otherwise every lesson switch leaves one running in the background
      if (oldPlayer._hls) { try { oldPlayer._hls.destroy(); } catch (_) {} oldPlayer._hls = null; }
      (oldPlayer._cleanup || []).forEach(fn => fn());
      // Replace the old player in DOM
      oldPlayer.parentNode.replaceChild(newPlayer, oldPlayer);
      // Reinitialize Bunny player
      initBunnyPlayer();
    }

    function setupCourseItemClicks() {
      document.querySelectorAll('.c_item').forEach(item => {
        item.addEventListener('click', () => {
          // Check if this lesson is already active
          if (item.classList.contains('is-active')) {
            return; // Don't reload if already active
          }
          // --- Close menu on mobile/tablet ---
          if (isMobileView() && isOpen) {
            closeMenu();
          }
          // --- Update active lesson ---
          document.querySelectorAll('.c_item').forEach(el => el.classList.remove(
            'is-active'));
          item.classList.add('is-active');
          // --- Update active module ---
          document.querySelectorAll('.course_module').forEach(mod => mod.classList.remove(
            'is-active'));
          const module = item.closest('.accordion-css__item')?.querySelector(
            '.course_module');
          if (module) module.classList.add('is-active');
          // --- Update accordion status attributes ---
          updateAccordionStatus();
          // --- Switch content + video ---
          switchLessonContent(item);
        });
      });
    }
    // Function to update accordion status based on active module
    function updateAccordionStatus() {
      // First, set all accordion items to not-active
      document.querySelectorAll('.accordion-css__item').forEach(accordionItem => {
        accordionItem.setAttribute('data-accordion-status', 'not-active');
      });
      // Then find the active module and set its parent accordion item to active
      const activeModule = document.querySelector('.course_module.is-active');
      if (activeModule) {
        const accordionItem = activeModule.closest('.accordion-css__item');
        if (accordionItem) {
          accordionItem.setAttribute('data-accordion-status', 'active');
        }
      }
    }
    // Init on page load (short pause, then wait until Memberstack is actually there)
    setTimeout(() => whenMemberstackReady(async () => {
      // Remove srcset immediately so placeholder images work correctly
      const placeholder = document.getElementById('placeholder_img');
      if (placeholder) {
        placeholder.removeAttribute('srcset');
      }
      // Load member progress first (before setting initial state)
      await loadMemberProgress();
      setInitialState();
      setupCourseItemClicks();
      updateAccordionStatus(); // Set initial accordion status
    }), 200);
    // Function to load member's progress from Memberstack
    async function loadMemberProgress() {
      try {
        const memberData = await window.$memberstackDom.getMemberJSON();
        // Check if member has saved progress for this course
        if (memberData && memberData.data && memberData.data.courses && memberData.data.courses[
            currentCourse]) {
          const savedLessons = memberData.data.courses[currentCourse].lessons;
          // Update our lessons array with saved progress
          savedLessons.forEach(savedLesson => {
            const lesson = lessons.find(l => l.id === savedLesson.id);
            if (lesson) {
              lesson.complete = savedLesson.complete;
            }
          });
          // Update UI to reflect loaded progress
          lessons.forEach(lesson => {
            updateLessonUI(lesson.id, lesson.complete);
          });
          updateProgress(true); // true = page load, slower animation
        }
        // (no saved progress yet → keep the defaults)
      } catch (error) {
        console.error('❌ Error loading member data:', error);
      }
    }
    // Function to save progress to Memberstack
    async function saveMemberProgress() {
      try {
        // First get existing data to preserve other courses
        const memberData = await window.$memberstackDom.getMemberJSON();
        const existingCourses = (memberData && memberData.data && memberData.data.courses) || {};
        // Update only the current course
        const updatedCourses = {
          ...existingCourses,
          [currentCourse]: {
            lessons: lessons
          }
        };
        await window.$memberstackDom.updateMemberJSON({
          json: {
            courses: updatedCourses
          }
        });
      } catch (error) {
        console.error('❌ Error saving progress:', error);
      }
    }
    // ---- VIDEO PLAYER ----
    // Get the finish link block element (available globally)
    var finishLinkBlock = document.getElementById('finish_video');
    // Add click listener to close the finish link block
    if (finishLinkBlock) {
      finishLinkBlock.addEventListener('click', function () {
        finishLinkBlock.style.display = 'none';
      });
    }

    function initBunnyPlayer() {
      document.querySelectorAll('[data-bunny-player-init]').forEach(function (player) {
        var src = player.getAttribute('data-player-src');
        if (!src) return;
        var video = player.querySelector('video');
        if (!video) return;
        try { video.pause(); } catch (_) {}
        try {
          video.removeAttribute('src');
          video.load();
        } catch (_) {}
        // Page-level listeners are registered through listen(), so the course
        // can remove them when it swaps this player out for the next lesson
        player._cleanup = [];

        function listen(target, type, fn) {
          target.addEventListener(type, fn);
          player._cleanup.push(() => target.removeEventListener(type, fn));
        }
        // Attribute helpers
        function setStatus(s) {
          if (player.getAttribute('data-player-status') !== s) {
            player.setAttribute('data-player-status', s);
          }
        }

        function setMutedState(v) {
          video.muted = !!v;
          player.setAttribute('data-player-muted', video.muted ? 'true' : 'false');
        }

        function setFsAttr(v) {
          player.setAttribute('data-player-fullscreen', v ? 'true' : 'false');
        }

        function setActivated(v) {
          player.setAttribute('data-player-activated', v ? 'true' : 'false');
        }
        if (!player.hasAttribute('data-player-activated')) setActivated(false);
        // Elements
        var timeline = player.querySelector('[data-player-timeline]');
        var progressBar = player.querySelector('[data-player-progress]');
        var bufferedBar = player.querySelector('[data-player-buffered]');
        var handle = player.querySelector('[data-player-timeline-handle]');
        var timeDurationEls = player.querySelectorAll('[data-player-time-duration]');
        var timeProgressEls = player.querySelectorAll('[data-player-time-progress]');
        // Flags
        var updateSize = player.getAttribute(
          'data-player-update-size'); // "true" | "cover" | null
        var lazyMode = player.getAttribute('data-player-lazy'); // "true" | "meta" | null
        var isLazyTrue = lazyMode === 'true';
        var isLazyMeta = lazyMode === 'meta';
        var autoplay = player.getAttribute('data-player-autoplay') === 'true';
        var initialMuted = player.getAttribute('data-player-muted') === 'true';
        // Used to suppress 'ready' flicker when user just pressed play in lazy modes
        var pendingPlay = false;
        // Autoplay forces muted; IO will trigger "fake click"
        if (autoplay) {
          setMutedState(true);
          video.loop = true;
        } else { setMutedState(initialMuted); }
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.playsInline = true;
        if (typeof video.disableRemotePlayback !== 'undefined') video.disableRemotePlayback =
          true;
        if (autoplay) video.autoplay = false;
        var isSafariNative = !!video.canPlayType('application/vnd.apple.mpegurl');
        var canUseHlsJs = !!(window.Hls && Hls.isSupported()) && !isSafariNative;
        // Minimal ratio fetch when requested (and not already handled by lazy meta)
        if (updateSize === 'true' && !isLazyMeta) {
          if (isLazyTrue) {
            // Do nothing: no fetch, no <video> touch when lazy=true
          } else {
            var prev = video.preload;
            video.preload = 'metadata';
            var onMeta2 = function () {
              setBeforeRatio(player, updateSize, video.videoWidth, video.videoHeight);
              video.removeEventListener('loadedmetadata', onMeta2);
              video.preload = prev || '';
            };
            video.addEventListener('loadedmetadata', onMeta2, { once: true });
            video.src = src;
          }
        }
        //  Lazy meta fetch (duration + aspect) without attaching playback
        function fetchMetaOnce() {
          getSourceMeta(src, canUseHlsJs).then(function (meta) {
            if (meta.width && meta.height) setBeforeRatio(player, updateSize, meta.width,
              meta
              .height);
            if (timeDurationEls.length && isFinite(meta.duration) && meta.duration > 0) {
              setText(timeDurationEls, formatTime(meta.duration));
            }
            readyIfIdle(player, pendingPlay);
          });
        }
        // Attach media only once (for actual playback)
        var isAttached = false;
        var userInteracted = false;
        var lastPauseBy = '';

        function attachMediaOnce() {
          if (isAttached) return;
          isAttached = true;
          if (player._hls) { try { player._hls.destroy(); } catch (_) {} player._hls = null; }
          if (isSafariNative) {
            video.preload = (isLazyTrue || isLazyMeta) ? 'auto' : video.preload;
            video.src = src;
            video.addEventListener('loadedmetadata', function () {
              readyIfIdle(player, pendingPlay);
              if (updateSize === 'true') setBeforeRatio(player, updateSize, video
                .videoWidth,
                video.videoHeight);
              if (timeDurationEls.length) setText(timeDurationEls, formatTime(video
                .duration));
            }, { once: true });
          } else if (canUseHlsJs) {
            var hls = new Hls({ maxBufferLength: 10 });
            hls.attachMedia(video);
            hls.on(Hls.Events.MEDIA_ATTACHED, function () { hls.loadSource(src); });
            hls.on(Hls.Events.MANIFEST_PARSED, function () {
              readyIfIdle(player, pendingPlay);
              if (updateSize === 'true') {
                var lvls = hls.levels || [];
                var best = bestLevel(lvls);
                if (best && best.width && best.height) setBeforeRatio(player, updateSize,
                  best
                  .width, best.height);
              }
            });
            hls.on(Hls.Events.LEVEL_LOADED, function (e, data) {
              if (data && data.details && isFinite(data.details.totalduration)) {
                if (timeDurationEls.length) setText(timeDurationEls, formatTime(data
                  .details
                  .totalduration));
              }
            });
            player._hls = hls;
          } else {
            video.src = src;
          }
        }
        // Initialize based on lazy mode
        if (isLazyMeta) {
          fetchMetaOnce();
          video.preload = 'none';
        } else if (isLazyTrue) {
          video.preload = 'none';
        } else {
          attachMediaOnce();
        }
        // Toggle play/pause
        function togglePlay() {
          userInteracted = true;
          if (video.paused || video.ended) {
            if ((isLazyTrue || isLazyMeta) && !isAttached) attachMediaOnce();
            pendingPlay = true;
            lastPauseBy = '';
            setStatus('loading');
            safePlay(video);
          } else {
            lastPauseBy = 'manual';
            video.pause();
          }
        }
        // Toggle mute
        function toggleMute() {
          video.muted = !video.muted;
          player.setAttribute('data-player-muted', video.muted ? 'true' : 'false');
        }

        // Playback speed
        var speeds = [1, 1.2, 1.5, 2];
        var speedIndex = Math.max(0, speeds.indexOf(preferredSpeed));

        function applySpeed() {
          video.playbackRate = speeds[speedIndex];
          var newText = speeds[speedIndex].toFixed(1) + 'x'; // toFixed(1) → "1.0x", "2.0x"
          var labels = player.querySelectorAll('[data-player-speed-label]');
          labels.forEach(function (el) {
            gsap.to(el, {
              opacity: 0,
              duration: 0.12,
              ease: 'power1.in',
              onComplete: function () {
                el.textContent = newText;
                gsap.to(el, { opacity: 1, duration: 0.12, ease: 'power1.out' });
              }
            });
          });
          player.setAttribute('data-player-speed', speeds[speedIndex]);
        }

        function cycleSpeed() {
          speedIndex = (speedIndex + 1) % speeds.length;
          preferredSpeed = speeds[speedIndex]; // remember across lessons
          applySpeed();
        }

        applySpeed();

        // Fullscreen helpers
        function isFsActive() {
          return !!(document.fullscreenElement || document.webkitFullscreenElement);
        }

        function enterFullscreen() {
          if (player.requestFullscreen) return player.requestFullscreen();
          if (video.requestFullscreen) return video.requestFullscreen();
          if (video.webkitSupportsFullscreen && typeof video.webkitEnterFullscreen ===
            'function')
            return video.webkitEnterFullscreen();
        }

        function exitFullscreen() {
          if (document.exitFullscreen) return document.exitFullscreen();
          if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
          if (video.webkitDisplayingFullscreen && typeof video.webkitExitFullscreen ===
            'function')
            return video.webkitExitFullscreen();
        }

        function toggleFullscreen() {
          if (isFsActive() || video.webkitDisplayingFullscreen)
            exitFullscreen();
          else enterFullscreen();
        }
        function onFsChange() { setFsAttr(isFsActive()); }
        listen(document, 'fullscreenchange', onFsChange);
        listen(document, 'webkitfullscreenchange', onFsChange);
        video.addEventListener('webkitbeginfullscreen', function () { setFsAttr(true); });
        video.addEventListener('webkitendfullscreen', function () { setFsAttr(false); });
        // Controls (delegated)
        player.addEventListener('click', function (e) {
          var btn = e.target.closest('[data-player-control]');
          if (!btn || !player.contains(btn)) return;
          var type = btn.getAttribute('data-player-control');
          if (type === 'play' || type === 'pause' || type === 'playpause') togglePlay();
          else if (type === 'mute') toggleMute();
          else if (type === 'fullscreen') toggleFullscreen();
          else if (type === 'speed') cycleSpeed();
        });
        // Time text (not in rAF)
        function updateTimeTexts() {
          if (timeDurationEls.length) setText(timeDurationEls, formatTime(video.duration));
          if (timeProgressEls.length) setText(timeProgressEls, formatTime(video.currentTime));
        }
        video.addEventListener('timeupdate', updateTimeTexts);
        video.addEventListener('loadedmetadata', function () {
          updateTimeTexts();
          maybeSetRatioFromVideo(player, updateSize, video);
        });
        video.addEventListener('loadeddata', function () {
          maybeSetRatioFromVideo(player,
            updateSize, video);
        });
        video.addEventListener('playing', function () {
          maybeSetRatioFromVideo(player, updateSize,
            video);
        });
        video.addEventListener('durationchange', updateTimeTexts);
        // Check if video has finished and show finish link block
        function checkVideoFinished() {
          if (finishLinkBlock && video.duration > 0) {
            // Check if current time is at or very close to duration (within 0.5 seconds)
            if (video.currentTime >= video.duration - 0.5) {
              // Smooth fade in with GSAP after a small delay
              gsap.to(finishLinkBlock, {
                display: 'flex',
                opacity: 1,
                duration: 0.5,
                delay: 0.3,
                ease: 'power2.out'
              });
            }
          }
        }
        // Listen for timeupdate to check if video finished
        video.addEventListener('timeupdate', checkVideoFinished);
        // Also show on 'ended' event for reliability
        video.addEventListener('ended', function () {
          if (finishLinkBlock) {
            // Smooth fade in with GSAP after a small delay
            gsap.to(finishLinkBlock, {
              display: 'flex',
              opacity: 1,
              duration: 0.5,
              delay: 0.3,
              ease: 'power2.out'
            });
          }
        });
        // Hide finish link block when video starts playing again
        video.addEventListener('play', function () {
          if (finishLinkBlock && video.currentTime < video.duration - 0.5) {
            gsap.to(finishLinkBlock, {
              opacity: 0,
              duration: 0.3,
              ease: 'power2.in',
              onComplete: function () {
                finishLinkBlock.style.display = 'none';
              }
            });
          }
        });
        // rAF visuals (progress + handle only)
        var rafId;

        function updateProgressVisuals() {
          if (!video.duration) return;
          var playedPct = (video.currentTime / video.duration) * 100;
          if (progressBar) progressBar.style.transform = 'translateX(' + (-100 + playedPct) +
            '%)';
          if (handle) handle.style.left = playedPct + '%';
        }

        function loop() {
          updateProgressVisuals();
          if (!video.paused && !video.ended) rafId = requestAnimationFrame(loop);
        }
        // Buffered bar (not in rAF)
        function updateBufferedBar() {
          if (!bufferedBar || !video.duration || !video.buffered.length) return;
          var end = video.buffered.end(video.buffered.length - 1);
          var buffPct = (end / video.duration) * 100;
          bufferedBar.style.transform = 'translateX(' + (-100 + buffPct) + '%)';
        }
        video.addEventListener('progress', updateBufferedBar);
        video.addEventListener('loadedmetadata', updateBufferedBar);
        video.addEventListener('durationchange', updateBufferedBar);
        // Media event wiring
        video.addEventListener('play', function () {
          setActivated(true);
          cancelAnimationFrame(rafId);
          loop();
          setStatus('playing');
        });
        video.addEventListener('playing', function () {
          pendingPlay = false;
          setStatus('playing');
        });
        video.addEventListener('pause', function () {
          pendingPlay = false;
          cancelAnimationFrame(rafId);
          updateProgressVisuals();
          setStatus('paused');
        });
        video.addEventListener('waiting', function () { setStatus('loading'); });
        video.addEventListener('canplay', function () { readyIfIdle(player, pendingPlay); });
        video.addEventListener('canplay', applySpeed);
        video.addEventListener('ended', function () {
          pendingPlay = false;
          cancelAnimationFrame(rafId);
          updateProgressVisuals();
          setStatus('paused');
          setActivated(false);
        });
        // Scrubbing (pointer events)
        if (timeline) {
          var dragging = false,
            wasPlaying = false,
            targetTime = 0,
            lastSeekTs = 0,
            seekThrottle = 180,
            rect = null;
          listen(window, 'resize', function () { if (!dragging) rect = null; });

          function getFractionFromX(x) {
            if (!rect) rect = timeline.getBoundingClientRect();
            var f = (x - rect.left) / rect.width;
            if (f < 0) f = 0;
            if (f > 1) f = 1;
            return f;
          }

          function previewAtFraction(f) {
            if (!video.duration) return;
            var pct = f * 100;
            if (progressBar) progressBar.style.transform = 'translateX(' + (-100 + pct) +
              '%)';
            if (handle) handle.style.left = pct + '%';
            if (timeProgressEls.length) setText(timeProgressEls, formatTime(f * video
              .duration));
          }

          function maybeSeek(now) {
            if (!video.duration) return;
            if ((now - lastSeekTs) < seekThrottle) return;
            lastSeekTs = now;
            video.currentTime = targetTime;
          }

          function onPointerDown(e) {
            if (!video.duration) return;
            // If video has ended, auto-play on timeline click
            var videoHasEnded = video.ended;
            dragging = true;
            wasPlaying = !video.paused && !video.ended;
            if (wasPlaying) video.pause();
            player.setAttribute('data-timeline-drag', 'true');
            rect = timeline.getBoundingClientRect();
            var f = getFractionFromX(e.clientX);
            targetTime = f * video.duration;
            previewAtFraction(f);
            maybeSeek(performance.now());
            timeline.setPointerCapture && timeline.setPointerCapture(e.pointerId);
            window.addEventListener('pointermove', onPointerMove, { passive: false });
            window.addEventListener('pointerup', onPointerUp, { passive: true });
            // Store if video was ended when drag started
            timeline._videoWasEnded = videoHasEnded;
            e.preventDefault();
          }

          function onPointerMove(e) {
            if (!dragging) return;
            var f = getFractionFromX(e.clientX);
            targetTime = f * video.duration;
            previewAtFraction(f);
            maybeSeek(performance.now());
            e.preventDefault();
          }

          function onPointerUp() {
            if (!dragging) return;
            var shouldAutoPlay = timeline._videoWasEnded;
            dragging = false;
            player.setAttribute('data-timeline-drag', 'false');
            rect = null;
            video.currentTime = targetTime;
            // Auto-play if video was ended when drag started
            if (shouldAutoPlay) {
              safePlay(video);
            } else if (wasPlaying) {
              safePlay(video);
            } else {
              updateProgressVisuals();
              updateTimeTexts();
            }
            timeline._videoWasEnded = false;
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
          }
          timeline.addEventListener('pointerdown', onPointerDown, { passive: false });
          if (handle) handle.addEventListener('pointerdown',
            onPointerDown, { passive: false });
        }
        // Hover/idle detection (pointer-based)
        var hoverTimer;
        var hoverHideDelay = 3000;

        function setHover(state) {
          if (player.getAttribute('data-player-hover') !== state) {
            player.setAttribute('data-player-hover', state);
          }
        }

        function scheduleHide() {
          clearTimeout(hoverTimer);
          hoverTimer = setTimeout(function () { setHover('idle'); }, hoverHideDelay);
        }

        function wakeControls() {
          setHover('active');
          scheduleHide();
        }
        player.addEventListener('pointerdown', wakeControls);
        listen(document, 'fullscreenchange', wakeControls);
        listen(document, 'webkitfullscreenchange', wakeControls);
        var trackingMove = false;
        player._cleanup.push(() => window.removeEventListener('pointermove', onPointerMoveGlobal));

        function onPointerMoveGlobal(e) {
          var r = player.getBoundingClientRect();
          if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e
            .clientY <= r
            .bottom) wakeControls();
        }
        player.addEventListener('pointerenter', function () {
          wakeControls();
          if (!trackingMove) {
            trackingMove = true;
            window.addEventListener('pointermove',
              onPointerMoveGlobal, { passive: true });
          }
        });
        player.addEventListener('pointerleave', function () {
          setHover('idle');
          clearTimeout(hoverTimer);
          if (trackingMove) {
            trackingMove = false;
            window.removeEventListener('pointermove', onPointerMoveGlobal);
          }
        });
        // In-view auto play/pause (only when autoplay is true)
        if (autoplay) {
          var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
              var inView = entry.isIntersecting && entry.intersectionRatio > 0;
              if (inView) {
                if ((isLazyTrue || isLazyMeta) && !isAttached) attachMediaOnce();
                if ((lastPauseBy === 'io') || (video.paused && lastPauseBy !==
                    'manual')) {
                  setStatus('loading');
                  if (video.paused) togglePlay();
                  lastPauseBy = '';
                }
              } else {
                if (!video.paused && !video.ended) {
                  lastPauseBy = 'io';
                  video.pause();
                }
              }
            });
          }, { threshold: 0.1 });
          io.observe(player);
          player._cleanup.push(() => io.disconnect());
        }
      });
      // Helper: time/text/meta/ratio utilities
      function pad2(n) { return (n < 10 ? '0' : '') + n; }

      function formatTime(sec) {
        if (!isFinite(sec) || sec < 0) return '00:00';
        var s = Math.floor(sec),
          h = Math.floor(s / 3600),
          m = Math.floor((s % 3600) / 60),
          r = s % 60;
        return h > 0 ? (h + ':' + pad2(m) + ':' + pad2(r)) : (pad2(m) + ':' + pad2(r));
      }

      function setText(nodes, text) { nodes.forEach(function (n) { n.textContent = text; }); }
      // Helper: Choose best HLS level by resolution --- */
      function bestLevel(levels) {
        if (!levels || !levels.length) return null;
        return levels.reduce(function (a, b) {
            return ((b.width || 0) > (a.width || 0)) ? b :
              a;
          },
          levels[0]);
      }
      // Helper: Safe programmatic play
      function safePlay(video) {
        var p = video.play();
        if (p && typeof p.then === 'function') p.catch(function () {});
      }
      // Helper: Ready status guard
      function readyIfIdle(player, pendingPlay) {
        if (!pendingPlay &&
          player.getAttribute('data-player-activated') !== 'true' &&
          player.getAttribute('data-player-status') === 'idle') {
          player.setAttribute('data-player-status', 'ready');
        }
      }
      // Helper: Ratio Setter
      function setBeforeRatio(player, updateSize, w, h) {
        if (updateSize !== 'true' || !w || !h) return;
        var before = player.querySelector('[data-player-before]');
        if (!before) return;
        before.style.paddingTop = (h / w * 100) + '%';
      }

      function maybeSetRatioFromVideo(player, updateSize, video) {
        if (updateSize !== 'true') return;
        var before = player.querySelector('[data-player-before]');
        if (!before) return;
        var hasPad = before.style.paddingTop && before.style.paddingTop !== '0%';
        if (!hasPad && video.videoWidth && video.videoHeight) {
          setBeforeRatio(player, updateSize, video.videoWidth, video.videoHeight);
        }
      }
      // Helper: simple URL resolver
      function resolveUrl(base, rel) {
        try { return new URL(rel, base).toString(); } catch (_) { return rel; }
      }
      // Helper: Unified meta fetch (hls.js or native fetch)
      function getSourceMeta(src, useHlsJs) {
        return new Promise(function (resolve) {
          if (useHlsJs && window.Hls && Hls.isSupported()) {
            try {
              var tmp = new Hls();
              var out = { width: 0, height: 0, duration: NaN };
              var haveLvls = false,
                haveDur = false;
              tmp.on(Hls.Events.MANIFEST_PARSED, function (e, data) {
                var lvls = (data && data.levels) || tmp.levels || [];
                var best = bestLevel(lvls);
                if (best && best.width && best.height) {
                  out.width = best.width;
                  out.height = best.height;
                  haveLvls = true;
                }
              });
              tmp.on(Hls.Events.LEVEL_LOADED, function (e, data) {
                if (data && data.details && isFinite(data.details.totalduration)) {
                  out.duration = data.details.totalduration;
                  haveDur = true;
                }
              });
              tmp.on(Hls.Events.ERROR, function () {
                try { tmp.destroy(); } catch (_) {}
                resolve(out);
              });
              tmp.on(Hls.Events.LEVEL_LOADED, function () {
                try { tmp.destroy(); } catch (_) {}
                resolve(out);
              });
              tmp.loadSource(src);
              return;
            } catch (_) {
              resolve({ width: 0, height: 0, duration: NaN });
              return;
            }
          }

          function parseMaster(masterText) {
            var lines = masterText.split(/\r?\n/);
            var bestW = 0,
              bestH = 0,
              firstMedia = null,
              lastInf = null;
            for (var i = 0; i < lines.length; i++) {
              var line = lines[i];
              if (line.indexOf('#EXT-X-STREAM-INF:') === 0) {
                lastInf = line;
              } else if (lastInf && line && line[0] !== '#') {
                if (!firstMedia) firstMedia = line.trim();
                var m = /RESOLUTION=(\d+)x(\d+)/.exec(lastInf);
                if (m) {
                  var w = parseInt(m[1], 10),
                    h = parseInt(m[2], 10);
                  if (w > bestW) {
                    bestW = w;
                    bestH = h;
                  }
                }
                lastInf = null;
              }
            }
            return { bestW: bestW, bestH: bestH, media: firstMedia };
          }

          function sumDuration(mediaText) {
            var dur = 0,
              re = /#EXTINF:([\d.]+)/g,
              m;
            while ((m = re.exec(mediaText))) dur += parseFloat(m[1]);
            return dur;
          }
          fetch(src, { credentials: 'omit', cache: 'no-store' }).then(function (r) {
            if (!r.ok) throw new Error('master');
            return r.text();
          }).then(function (master) {
            var info = parseMaster(master);
            if (!info.media) {
              resolve({
                width: info.bestW || 0,
                height: info.bestH || 0,
                duration: NaN
              });
              return;
            }
            var mediaUrl = resolveUrl(src, info.media);
            return fetch(mediaUrl, { credentials: 'omit', cache: 'no-store' }).then(
              function (
                r) {
                if (!r.ok) throw new Error('media');
                return r.text();
              }).then(function (mediaText) {
              resolve({
                width: info.bestW || 0,
                height: info.bestH || 0,
                duration: sumDuration(mediaText)
              });
            });
          }).catch(function () { resolve({ width: 0, height: 0, duration: NaN }); });
        });
      }
    }
    initBunnyPlayer();

    // ONBOARDING
    (function () {
      const overlay = document.querySelector(".onboarding-overlay");
      const panel = overlay?.querySelector(".transition-panel");
      const capTop = overlay?.querySelector(".panel-cap-top");
      const capBottom = overlay?.querySelector(".panel-cap-bottom");
      const form = overlay?.querySelector(".onboarding-form");
      const formEl = overlay?.querySelector("form");
      const submitBtn = formEl?.querySelector("[data-submit]");
      if (!overlay || !panel) return console.warn("onboarding: missing element");

      const DURATION = OVERLAY_DURATION;
      const HOOK = "https://hook.eu1.make.com/qhe2n9ssb9vogd73tssm6zg71wwyphc2";

      let submitting = false;

      function coverIn() {
        return overlayCoverIn({ overlay, panel, capTop, capBottom, content: form, lockScroll: true });
      }

      function coverOut() {
        return gsap.timeline({
            onComplete: () => {
              overlay.style.display = "none";
              document.body.style.overflow = "";
            }
          })
          .to(form, { autoAlpha: 0, y: -20, duration: 0.4, ease: "power2.in" }, 0)
          .to(panel, { yPercent: -200, y: "-25vw", duration: DURATION, ease: "power2.inOut" }, 0.4)
          .to(capBottom, { scaleY: 0.35, duration: DURATION, ease: "none" }, 0.4);
      }

      // Every visible question answered (the form validation marks what's missing)
      function isFormValid() {
        if (formEl.__dfsValidate) return formEl.__dfsValidate();
        const name = formEl.querySelector('[name="name"]')?.value.trim() || "";
        const picked = (n) => formEl.querySelectorAll(`[name="${n}"]:checked`).length > 0;
        return name.length >= 2 && picked("problems") && picked("planning") && picked("Nudge");
      }

      function readAnswers() {
        // Button answers send their label; the type-your-own answer sends what was typed
        const problems = [...formEl.querySelectorAll('[name="problems"]:checked')]
          .map(i => i.closest(".radiocheck-field")?.textContent.trim() || i.value);
        const getChecked = (n) => [...formEl.querySelectorAll(`[name="${n}"]:checked`)].map(i => i
          .value);
        const planning = getChecked("planning")[0] || "";
        return {
          firstName: formEl.querySelector('[name="name"]')?.value.trim() || "",
          work: getChecked("work")[0] || "",
          problems: problems.join(", "),
          problemsOther: formEl.querySelector('[name="problems-other"]')?.value.trim() || "",
          planning: planning,
          startDay: planning === "Plan" ? (getChecked("start-day")[0] || "") : "",
          nudge: getChecked("Nudge")[0] || "",
        };
      }

      async function save(data) {
        const res = await window.$memberstackDom.updateMember({
          customFields: {
            "first-name": data.firstName,
            "onboarded": "true",
            "problems": data.problems,
            "planning": data.planning,
            "nudge": data.nudge
          }
        });

        const member = res?.data || {};

        // New fields go separately: if they're not set up in Memberstack yet,
        // the answers above (and "onboarded") are still saved
        try {
          await window.$memberstackDom.updateMember({
            customFields: { "work": data.work, "start-day": data.startDay, "problems-other": data.problemsOther }
          });
        } catch (err) {
          console.warn("onboarding: work/start-day not saved in Memberstack", err);
        }

        document.querySelectorAll('[data-ms-content="first-name"], [data-ms-member="first-name"]')
          .forEach(el => { el.textContent = data.firstName; });

        try {
          await fetch(HOOK, {
            method: "POST",
            body: new URLSearchParams({
              formType: "onboarding",
              memberId: member.id || "",
              email: member.auth?.email || "",
              firstName: data.firstName,
              work: data.work,
              problems: data.problems,
              problemsOther: data.problemsOther,
              planning: data.planning,
              startDay: data.startDay,
              nudge: data.nudge
            })
          });
        } catch (err) {
          console.error("onboarding webhook failed", err);
        }
      }

      submitBtn?.addEventListener("click", async (e) => {
        e.preventDefault();
        if (submitting) return;
        submitting = true;

        await new Promise(r => setTimeout(r, 0));

        if (!isFormValid()) {
          submitting = false;
          return;
        }

        const data = readAnswers();
        coverOut();
        try {
          await save(data);
        } catch (err) {
          console.error("onboarding save failed", err);
          submitting = false;
        }
      });

      async function gate() {
        try {
          for (let i = 0; i < 50 && !window.$memberstackDom; i++) {
            await new Promise(r => setTimeout(r, 100));
          }
          if (!window.$memberstackDom) return console.warn("onboarding: memberstack never loaded");

          const member = await window.$memberstackDom.getCurrentMember();
          const fields = member?.data?.customFields || {};

          if (fields["onboarded"] !== "true") {
            setTimeout(coverIn, 200);
          }
        } catch (err) {
          console.error("onboarding gate failed", err);
        }
      }

      document.querySelector("[test-button]")?.addEventListener("click", coverIn);
      gate();
      window.dfsOnboarding = { coverIn, coverOut };
    })();
  }

  // =========================================================
  // DASHBOARD — /dashboard
  // (was Slater dash_board.js)
  // =========================================================
  function dfsDashboard() {
    // DASHBOARD - Load progress for all courses
    async function loadDashboardProgress() {
      try {
        const memberData = await window.$memberstackDom.getMemberJSON();

        if (memberData && memberData.data && memberData.data.courses) {
          const courses = memberData.data.courses;

          // Update progress for courses that have saved data
          Object.keys(courses).forEach(courseName => {
            const courseData = courses[courseName];
            if (!courseData.lessons) return;

            const lessons = courseData.lessons;
            const completed = lessons.filter(l => l.complete).length;
            const total = lessons.length;
            const percent = Math.round((completed / total) * 100);

            // Animate progress bar with GSAP
            const progressBar = document.querySelector(`[progress_bar="${courseName}"]`);
            if (progressBar) {
              gsap.to(progressBar, {
                width: percent + '%',
                duration: 1.5,
                ease: 'power2.out'
              });
            }

            // Animate number wheels
            animateProgressNumbers(courseName, percent, 1.5);
          });
        }
      } catch (error) {
        console.error('Error loading dashboard progress:', error);
      }
    }

    // Run when page loads (as soon as Memberstack is there)
    whenMemberstackReady(loadDashboardProgress);

    // CARD HOVER ANIMATIONS (your existing code)
    const cards = document.querySelectorAll('[course_card]');
    cards.forEach(card => {
      const topPart = card.querySelector('[top-card]');
      const button = card.querySelector('[cc_btn]');
      const arrowBox = card.querySelector('[cc_arwbox]');
      const arrowIcon = card.querySelector('.cr_arrow');
      if (!arrowBox) return;
      // Courses that aren't open yet don't light up on hover
      if (arrowBox.classList.contains('is-inactive') || card.querySelector('.coming_soon')) return;

      // Colours come from the brand variables at hover time, so they follow day/night
      // mode; after hover the inline colours are cleared again (otherwise a colour from
      // the other mode could stick to the box).
      const brand = (name, fallback) =>
        getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
      const tl = gsap.timeline({
        paused: true,
        onReverseComplete: () => gsap.set([arrowBox, arrowIcon].filter(Boolean),
          { clearProps: 'backgroundColor,color' })
      });

      function build() {
        tl.clear();
        // 1. Animate the Box: Background
        tl.to(arrowBox, {
          backgroundColor: brand('--brand-colors--light-bleu', '#EDF5F9'),
          duration: 0.4,
          ease: "power2.out"
        }, 0);
        // 2. Animate the Arrow: Color and Juggle
        if (arrowIcon) {
          tl.to(arrowIcon, {
            color: brand('--brand-colors--blue', '#0297DB'),
            rotation: -45,
            transformOrigin: "50% 50%",
            duration: 0.4,
            ease: "back.out(2)",
          }, 0);
        }
      }

      // Hover Functions
      const playAnim = () => { if (tl.progress() === 0) build(); tl.play(); };
      const reverseAnim = () => tl.reverse();

      // Listeners
      if (topPart) {
        topPart.addEventListener('mouseenter', playAnim);
        topPart.addEventListener('mouseleave', reverseAnim);
        topPart.style.cursor = 'pointer';
      }
      if (button) {
        button.addEventListener('mouseenter', playAnim);
        button.addEventListener('mouseleave', reverseAnim);
      }
    });

    // ---- TAB SWITCHING ----
    function initDashboardTabs() {
      // Define your tabs
      const tabs = {
        'Courses': 'courses',
        'my account': 'accountd',
        'Orders': 'orders',
        'tools': 'tools'
      };
      // Set initial state - show courses, hide everything else
      // (a missing tab section is skipped instead of breaking the whole menu)
      Object.values(tabs).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === 'courses' ? 'flex' : 'none';
      });

      // Get all menu items
      const menuItems = document.querySelectorAll('.menu_item');

      menuItems.forEach(item => {
        item.addEventListener('click', function (e) {
          e.preventDefault();

          const tabName = (this.querySelector('.menu_txt')?.textContent || '').trim();
          const targetId = tabs[tabName];

          // If this tab isn't set up yet, ignore
          if (!targetId) return;

          // Remove is-active from all menu items
          menuItems.forEach(mi => mi.classList.remove('is-active'));

          // Add is-active to clicked item
          this.classList.add('is-active');

          // Hide all tab content
          Object.values(tabs).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
          });

          // Show the target tab
          const targetEl = document.getElementById(targetId);
          if (targetEl) {
            targetEl.style.display = 'flex';

            // Re-run animations if switching to courses
            if (targetId === 'courses') {
              loadDashboardProgress();
            }
          }
        });
      });
    }

    // Initialize tabs when DOM is ready
    initDashboardTabs();
  }

  // =========================================================
  // FEEDBACK — /feedback + course-completion form
  // (was Slater FEEDBACK.js)
  // =========================================================
  function dfsFeedback() {
    // DFS · Feedback page — NPS branching + form validation
    // Page-local copy. The global form-validation script must NOT load on this page.
    //
    // Attributes:
    //   data-form-validate      on the form wrapper (once)
    //   data-validate           on every form-field-group
    //   data-radiocheck-group   on the radio/checkbox group inside a field group
    //   data-nps-group          on the 1–10 scale's radio group
    //   data-nps-branch         "promoter" | "passive" | "detractor" (comma-separated ok)
    //   data-nps-min / -max     custom range instead of a named branch
    //   data-nps-display        override the default display mode for one element

    (function () {

      /* ---------------------------------------------------------------
         1. NPS BRANCHING
         --------------------------------------------------------------- */

      var DISPLAY_MODE = 'flex'; // default; override per element with data-nps-display
      var DURATION = 650; // ms — baseline for a ~400px tall branch
      var EASING = 'cubic-bezier(0.33, 0, 0.2, 1)';
      var SLIDE = 12; // px the content lifts from

      var RANGES = {
        promoter: [8, 10],
        passive: [6, 7],
        detractor: [1, 5]
      };

      var reduceMotion = window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Lenis caches the document height, so it has to be told when the page
      // grows or shrinks — otherwise you can't scroll to newly revealed content.
      function refreshScroll() {
        var l = window.lenis || window.Lenis || window.smoothScroll ||
          (window.dfs && window.dfs.lenis);

        if (l && typeof l.resize === 'function') {
          l.resize();
          return;
        }

        // Fallback: a resize event makes most smooth-scroll libraries remeasure.
        window.dispatchEvent(new Event('resize'));
      }

      function initNpsBranching() {
        var group = document.querySelector('[data-nps-group]');
        if (!group) return;

        var branches = Array.prototype.slice.call(
          document.querySelectorAll('[data-nps-branch], [data-nps-min], [data-nps-max]')
        );
        if (!branches.length) return;

        branches.forEach(function (el) {
          var min = el.getAttribute('data-nps-min');
          var max = el.getAttribute('data-nps-max');

          if (min !== null || max !== null) {
            el._npsRanges = [
              [
                min !== null ? parseInt(min, 10) : 0,
                max !== null ? parseInt(max, 10) : 10
              ]
            ];
          } else {
            el._npsRanges = (el.getAttribute('data-nps-branch') || '')
              .split(',')
              .map(function (name) { return RANGES[name.trim()]; })
              .filter(Boolean);
          }

          el._npsMode = el.getAttribute('data-nps-display') || DISPLAY_MODE;
          el._npsOpen = false;
          el.style.display = 'none';
        });

        function clearTimer(el) {
          if (el._npsTimer) {
            clearTimeout(el._npsTimer);
            el._npsTimer = null;
          }
          if (el._npsEnd) {
            el.removeEventListener('transitionend', el._npsEnd);
            el._npsEnd = null;
          }
          if (el._npsTick) {
            cancelAnimationFrame(el._npsTick);
            el._npsTick = null;
          }
        }

        function resetStyles(el) {
          el.style.transition = '';
          el.style.height = '';
          el.style.opacity = '';
          el.style.transform = '';
          el.style.overflow = '';
        }

        // Duration scales with distance so tall and short branches feel the same.
        function durationFor(px) {
          var d = DURATION * Math.sqrt(px / 400);
          return Math.max(400, Math.min(1100, d));
        }

        // Keep the scroll length in sync while the height is actually changing.
        function trackWhileAnimating(el, ms) {
          var start = Date.now();

          function tick() {
            refreshScroll();
            if (Date.now() - start < ms + 100) {
              el._npsTick = requestAnimationFrame(tick);
            } else {
              el._npsTick = null;
            }
          }

          el._npsTick = requestAnimationFrame(tick);
        }

        // Cleanup runs once — on transitionend, or on the fallback timer.
        function onSettled(el, ms, fn) {
          var done = false;

          function finish(e) {
            if (e && e.target !== el) return; // ignore children
            if (e && e.propertyName !== 'height') return; // only the height tween
            if (done) return;
            done = true;
            clearTimer(el);
            fn();
            refreshScroll();
          }

          el._npsEnd = finish;
          el.addEventListener('transitionend', finish);
          el._npsTimer = setTimeout(function () { finish(null); }, ms + 80);
        }

        function openBranch(el) {
          clearTimer(el);
          el.style.display = el._npsMode;

          if (reduceMotion) {
            resetStyles(el);
            refreshScroll();
            return;
          }

          // Fade-only elements (the submit button) skip the height tween.
          if (el.hasAttribute('data-nps-fade')) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(' + SLIDE + 'px)';
            void el.offsetHeight;
            el.style.transition = 'opacity 400ms ' + EASING +
              ', transform 400ms ' + EASING;
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
            refreshScroll();
            return;
          }

          resetStyles(el);

          // Force layout before measuring, so the first open gets a real height.
          void el.offsetHeight;
          var target = el.scrollHeight;
          var ms = durationFor(target);

          el.style.overflow = 'hidden';
          el.style.height = '0px';
          el.style.opacity = '0';
          el.style.transform = 'translateY(' + SLIDE + 'px)';

          void el.offsetHeight;

          el.style.transition = 'height ' + ms + 'ms ' + EASING +
            ', opacity ' + ms + 'ms ' + EASING +
            ', transform ' + ms + 'ms ' + EASING;
          el.style.height = target + 'px';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';

          trackWhileAnimating(el, ms);

          onSettled(el, ms, function () {
            resetStyles(el);
          });
        }

        function closeBranch(el, instant) {
          clearTimer(el);

          if (reduceMotion || instant) {
            resetStyles(el);
            el.style.display = 'none';
            refreshScroll();
            return;
          }

          if (el.hasAttribute('data-nps-fade')) {
            resetStyles(el);
            el.style.display = 'none';
            refreshScroll();
            return;
          }

          var start = el.scrollHeight;
          var ms = durationFor(start);

          el.style.overflow = 'hidden';
          el.style.height = start + 'px';
          el.style.opacity = '1';
          el.style.transform = 'translateY(0)';

          void el.offsetHeight;

          el.style.transition = 'height ' + ms + 'ms ' + EASING +
            ', opacity ' + ms + 'ms ' + EASING +
            ', transform ' + ms + 'ms ' + EASING;
          el.style.height = '0px';
          el.style.opacity = '0';
          el.style.transform = 'translateY(' + SLIDE + 'px)';

          trackWhileAnimating(el, ms);

          onSettled(el, ms, function () {
            resetStyles(el);
            el.style.display = 'none';
          });
        }

        function setBranch(el, open) {
          if (el._npsOpen === open) return;
          el._npsOpen = open;

          if (open) {
            openBranch(el);
          } else {
            closeBranch(el);

            var groups = el.querySelectorAll('[data-validate]');
            Array.prototype.forEach.call(groups, function (g) {
              g.classList.remove('is--error', 'is--success', 'is--filled');
            });
          }
        }

        function getScore() {
          var checked = group.querySelector('input[type="radio"]:checked');
          if (!checked) return null;

          var raw = checked.value || '';
          var n = parseInt(String(raw).replace(/[^0-9-]/g, ''), 10);
          return isNaN(n) ? null : n;
        }

        function update() {
          var score = getScore();

          branches.forEach(function (el) {
            var hit = score !== null && el._npsRanges.some(function (r) {
              return score >= r[0] && score <= r[1];
            });

            setBranch(el, hit);
          });
        }

        group.addEventListener('change', update);
        group.addEventListener('click', function () { setTimeout(update, 0); });

        update();
      }

      /* ---------------------------------------------------------------
         2. FORM VALIDATION
         Local copy. Changes from the global version:
           · hidden field groups are skipped, so closed branches don't block submit
           · validateAll is exposed on the form element as __dfsValidate, so the
             overlay script can call it directly instead of firing a submit event
         --------------------------------------------------------------- */

      var SPAM_THRESHOLD = 3000; // ms since load before a submit is accepted

      function initFormValidation() {
        var forms = document.querySelectorAll('[data-form-validate]');

        Array.prototype.forEach.call(forms, function (formContainer) {
          if (formContainer.__validationInitialized) return;
          formContainer.__validationInitialized = true;

          var form = formContainer.querySelector('form');
          if (!form) return;

          var startTime = new Date().getTime();
          var validateFields = form.querySelectorAll('[data-validate]');
          var realSubmitInput = form.querySelector('input[type="submit"]');
          if (!realSubmitInput) return;

          function isSpam() {
            return (new Date().getTime() - startTime) < SPAM_THRESHOLD;
          }

          // Skip anything inside a closed branch.
          function isHidden(el) {
            return !el.offsetParent && getComputedStyle(el).position !== 'fixed';
          }

          // Disable select options with invalid values on page load.
          Array.prototype.forEach.call(validateFields, function (fieldGroup) {
            var select = fieldGroup.querySelector('select');
            if (!select) return;

            Array.prototype.forEach.call(select.querySelectorAll('option'), function (
              option) {
              if (option.value === '' || option.value === 'disabled' ||
                option.value === 'null' || option.value === 'false') {
                option.setAttribute('disabled', 'disabled');
              }
            });
          });

          function isValid(fieldGroup) {
            var radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');

            if (radioCheckGroup) {
              var inputs = radioCheckGroup.querySelectorAll(
                'input[type="radio"], input[type="checkbox"]');
              var checkedInputs = radioCheckGroup.querySelectorAll('input:checked');
              var gMin = parseInt(radioCheckGroup.getAttribute('min'), 10) || 1;
              var gMax = parseInt(radioCheckGroup.getAttribute('max'), 10) || inputs.length;

              if (!inputs.length) return true;

              if (inputs[0].type === 'radio') {
                return checkedInputs.length >= 1;
              }
              if (inputs.length === 1) {
                return inputs[0].checked;
              }
              return checkedInputs.length >= gMin && checkedInputs.length <= gMax;
            }

            var input = fieldGroup.querySelector('input, textarea, select');
            if (!input) return false;

            var value = input.value.trim();
            var length = value.length;
            var min = parseInt(input.getAttribute('min'), 10) || 0;
            var max = parseInt(input.getAttribute('max'), 10) || Infinity;
            var valid = true;

            if (input.tagName.toLowerCase() === 'select') {
              if (value === '' || value === 'disabled' ||
                value === 'null' || value === 'false') {
                valid = false;
              }
            } else if (input.type === 'email') {
              valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            } else {
              if (input.hasAttribute('min') && length < min) valid = false;
              if (input.hasAttribute('max') && length > max) valid = false;
            }

            return valid;
          }

          function updateFieldStatus(fieldGroup) {
            if (isHidden(fieldGroup)) {
              fieldGroup.classList.remove('is--error', 'is--success', 'is--filled');
              return;
            }

            var radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');
            var valid = isValid(fieldGroup);

            if (radioCheckGroup) {
              var inputs = radioCheckGroup.querySelectorAll(
                'input[type="radio"], input[type="checkbox"]');
              var checkedInputs = radioCheckGroup.querySelectorAll('input:checked');

              fieldGroup.classList.toggle('is--filled', checkedInputs.length > 0);

              if (valid) {
                fieldGroup.classList.add('is--success');
                fieldGroup.classList.remove('is--error');
              } else {
                fieldGroup.classList.remove('is--success');
                var started = Array.prototype.some.call(inputs, function (i) {
                  return i.__validationStarted;
                });
                fieldGroup.classList.toggle('is--error', started);
              }
              return;
            }

            var input = fieldGroup.querySelector('input, textarea, select');
            if (!input) return;

            fieldGroup.classList.toggle('is--filled', !!input.value.trim());

            if (valid) {
              fieldGroup.classList.add('is--success');
              fieldGroup.classList.remove('is--error');
            } else {
              fieldGroup.classList.remove('is--success');
              fieldGroup.classList.toggle('is--error', !!input.__validationStarted);
            }
          }

          function validateAll() {
            var allValid = true;
            var firstInvalid = null;

            Array.prototype.forEach.call(validateFields, function (fieldGroup) {
              if (isHidden(fieldGroup)) {
                fieldGroup.classList.remove('is--error', 'is--success', 'is--filled');
                return;
              }

              var input = fieldGroup.querySelector('input, textarea, select');
              var radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');
              if (!input && !radioCheckGroup) return;

              if (input) input.__validationStarted = true;

              if (radioCheckGroup) {
                radioCheckGroup.__validationStarted = true;
                Array.prototype.forEach.call(
                  radioCheckGroup.querySelectorAll(
                    'input[type="radio"], input[type="checkbox"]'),
                  function (i) { i.__validationStarted = true; }
                );
              }

              updateFieldStatus(fieldGroup);

              if (!isValid(fieldGroup)) {
                allValid = false;
                if (!firstInvalid) {
                  firstInvalid = input || radioCheckGroup.querySelector('input');
                }
              }
            });

            if (!allValid && firstInvalid) firstInvalid.focus();
            return allValid;
          }

          // Exposed so the overlay script can validate without firing an event.
          form.__dfsValidate = validateAll;
          form.__dfsIsSpam = isSpam;

          // Live validation listeners.
          Array.prototype.forEach.call(validateFields, function (fieldGroup) {
            var input = fieldGroup.querySelector('input, textarea, select');
            var radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');

            if (radioCheckGroup) {
              var inputs = radioCheckGroup.querySelectorAll(
                'input[type="radio"], input[type="checkbox"]');

              Array.prototype.forEach.call(inputs, function (i) {
                i.__validationStarted = false;

                i.addEventListener('change', function () {
                  requestAnimationFrame(function () {
                    if (!i.__validationStarted) {
                      var checkedCount = radioCheckGroup.querySelectorAll(
                        'input:checked').length;
                      var gMin = parseInt(radioCheckGroup.getAttribute('min'),
                        10) || 1;
                      if (checkedCount >= gMin) i.__validationStarted = true;
                    }
                    if (i.__validationStarted) updateFieldStatus(fieldGroup);
                  });
                });

                i.addEventListener('blur', function () {
                  i.__validationStarted = true;
                  updateFieldStatus(fieldGroup);
                });
              });

              return;
            }

            if (!input) return;

            input.__validationStarted = false;

            if (input.tagName.toLowerCase() === 'select') {
              input.addEventListener('change', function () {
                input.__validationStarted = true;
                updateFieldStatus(fieldGroup);
              });
            } else {
              input.addEventListener('input', function () {
                var length = input.value.trim().length;
                var min = parseInt(input.getAttribute('min'), 10) || 0;
                var max = parseInt(input.getAttribute('max'), 10) || Infinity;

                if (!input.__validationStarted) {
                  if (input.type === 'email') {
                    if (isValid(fieldGroup)) input.__validationStarted = true;
                  } else if ((input.hasAttribute('min') && length >= min) ||
                    (input.hasAttribute('max') && length <= max)) {
                    input.__validationStarted = true;
                  }
                }

                if (input.__validationStarted) updateFieldStatus(fieldGroup);
              });

              input.addEventListener('blur', function () {
                input.__validationStarted = true;
                updateFieldStatus(fieldGroup);
              });
            }
          });

          // Belt and braces: block any native submit that gets this far.
          form.addEventListener('submit', function (e) {
            e.preventDefault();
            e.stopImmediatePropagation();
          }, true);

          form.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          });
        });
      }

      /* ---------------------------------------------------------------
         3. BOOT
         --------------------------------------------------------------- */

      initNpsBranching();
      initFormValidation();

    })();

    // DFS · Feedback page — submit overlay + save
    // Intercepts the submit, validates, slides the panel up, then posts to Make
    // and flags the member as having given feedback.

    (function () {

      var overlay = document.querySelector('.onboarding-overlay');
      var panel = overlay && overlay.querySelector('.transition-panel');
      var capTop = overlay && overlay.querySelector('.panel-cap-top');
      var capBottom = overlay && overlay.querySelector('.panel-cap-bottom');
      var content = overlay && overlay.querySelector('.feedback_success');

      var formEl = document.querySelector('[data-form-validate] form');
      var submitBtn = formEl && formEl.querySelector('input[type="submit"]');

      if (!overlay || !panel || !formEl || !submitBtn) {
        return console.warn('feedback overlay: missing element');
      }

      var HOOK = "https://hook.eu1.make.com/qhe2n9ssb9vogd73tssm6zg71wwyphc2";

      var submitting = false;

      function coverIn() {
        return overlayCoverIn({ overlay, panel, capTop, capBottom, content });
      }

      function readAnswers() {
        var data = {};

        Array.prototype.forEach.call(
          formEl.querySelectorAll('input, textarea, select'),
          function (f) {
            if (!f.name || f.type === 'submit') return;

            if (f.type === 'checkbox' || f.type === 'radio') {
              if (!f.checked) return;
              var label = f.closest('.radiocheck-field');
              // Day picker: send the date itself (2026-10-12), not "Mon 12"
              var val = label && !f.closest('[data-choice-dates]') ? label.textContent.trim() : f.value;
              data[f.name] = data[f.name] ? data[f.name] + ', ' + val : val;
              return;
            }

            var v = f.value.trim();
            if (v) data[f.name] = v;
          }
        );

        return data;
      }

      // promoter / passive / detractor, derived from the score.
      function segmentFor(score) {
        var n = parseInt(score, 10);
        if (isNaN(n)) return '';
        if (n >= 8) return 'Promoters 8-10';
        if (n >= 6) return 'Passives 6-7';
        return 'Detractors 1-5';
      }

      // Other feedback pages (like the Rhythms app) put data-feedback-type="rhythms"
      // on the form wrapper: they post as formType "feedback-rhythms" and don't
      // touch the member's course flag.
      var typeEl = formEl.closest('[data-feedback-type]');
      var feedbackType = typeEl ? typeEl.getAttribute('data-feedback-type') : '';

      // What the app puts in the link: ?v=1.4&from=settings (nothing personal)
      function linkInfo() {
        var p = new URLSearchParams(location.search);
        var info = {};
        [['v', 'appVersion'], ['from', 'appScreen']].forEach(function (k) {
          var v = p.get(k[0]);
          if (v) info[k[1]] = v.slice(0, 40);
        });
        return info;
      }

      async function save(data) {
        var member = {};

        try {
          if (window.$memberstackDom) {
            var res = feedbackType ?
              await window.$memberstackDom.getCurrentMember() :
              await window.$memberstackDom.updateMember({
                customFields: { "feedback-given": "true" }
              });
            member = res?.data || {};
          }
        } catch (err) {
          console.error('feedback: memberstack update failed', err);
        }

        var payload = Object.assign({
          formType: feedbackType ? 'feedback-' + feedbackType : 'feedback',
          memberId: member.id || "",
          email: member.auth?.email || "",
          firstName: member.customFields?.["first-name"] || "",
          segment: segmentFor(data.scale)
        }, feedbackType ? linkInfo() : {}, data);

        try {
          await fetch(HOOK, {
            method: "POST",
            body: new URLSearchParams(payload)
          });
        } catch (err) {
          console.error('feedback webhook failed', err);
        }
      }

      submitBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (submitting) return;

        // Call the validator directly — no synthetic submit event, so
        // Webflow's own handler never hears about this.
        if (formEl.__dfsValidate && !formEl.__dfsValidate()) return;
        if (formEl.__dfsIsSpam && formEl.__dfsIsSpam()) return;

        submitting = true;

        var data = readAnswers();
        coverIn();
        save(data);
      }, true);

    })();
  }

  // =========================================================
  // FORM VALIDATION — auth pages + course
  // (was Slater FORM_CODE.js)
  // =========================================================
  function dfsFormValidation() {
    // Advanced form validation — global
    // Attributes:
    //   data-form-validate      on the form wrapper
    //   data-validate           on every field group
    //   data-radiocheck-group   on the radio/checkbox group inside a field group
    //   data-submit             on a custom submit trigger (optional)

    function initAdvancedFormValidation() {
      const SPAM_THRESHOLD = 2000; // ms since load before a submit is accepted

      const forms = document.querySelectorAll('[data-form-validate]');

      forms.forEach((formContainer) => {
        if (formContainer.__validationInitialized) return;
        formContainer.__validationInitialized = true;

        const form = formContainer.querySelector('form');
        if (!form) return;

        const startTime = new Date().getTime();
        const validateFields = form.querySelectorAll('[data-validate]');
        const dataSubmit = form.querySelector('[data-submit]');
        const realSubmitInput = form.querySelector('input[type="submit"]');
        if (!realSubmitInput) return;

        function isSpam() {
          const currentTime = new Date().getTime();
          return currentTime - startTime < SPAM_THRESHOLD;
        }

        // Disable select options with invalid values on page load
        validateFields.forEach(function (fieldGroup) {
          const select = fieldGroup.querySelector('select');
          if (select) {
            const options = select.querySelectorAll('option');
            options.forEach(function (option) {
              if (
                option.value === '' ||
                option.value === 'disabled' ||
                option.value === 'null' ||
                option.value === 'false'
              ) {
                option.setAttribute('disabled', 'disabled');
              }
            });
          }
        });

        // Skip fields that are hidden (e.g. the day picker while "Right now" is picked)
        function isHidden(el) {
          return !el.offsetParent && getComputedStyle(el).position !== 'fixed';
        }

        function validateAndStartLiveValidationForAll() {
          let allValid = true;
          let firstInvalidField = null;

          validateFields.forEach(function (fieldGroup) {
            if (isHidden(fieldGroup)) {
              fieldGroup.classList.remove('is--error', 'is--success', 'is--filled');
              return;
            }
            const input = fieldGroup.querySelector('input, textarea, select');
            const radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');
            if (!input && !radioCheckGroup) return;

            if (input) input.__validationStarted = true;

            if (radioCheckGroup) {
              radioCheckGroup.__validationStarted = true;
              const inputs = radioCheckGroup.querySelectorAll(
                'input[type="radio"], input[type="checkbox"]'
              );
              inputs.forEach(function (input) {
                input.__validationStarted = true;
              });
            }

            updateFieldStatus(fieldGroup);

            if (!isValid(fieldGroup)) {
              allValid = false;
              if (!firstInvalidField) {
                firstInvalidField = input || radioCheckGroup.querySelector('input');
              }
            }
          });

          if (!allValid && firstInvalidField) {
            firstInvalidField.focus();
          }

          return allValid;
        }

        function isValid(fieldGroup) {
          const radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');

          if (radioCheckGroup) {
            const inputs = radioCheckGroup.querySelectorAll(
              'input[type="radio"], input[type="checkbox"]'
            );
            const checkedInputs = radioCheckGroup.querySelectorAll('input:checked');
            const min = parseInt(radioCheckGroup.getAttribute('min')) || 1;
            const max = parseInt(radioCheckGroup.getAttribute('max')) || inputs.length;
            const checkedCount = checkedInputs.length;

            if (!inputs.length) return true;

            if (inputs[0].type === 'radio') {
              return checkedCount >= 1;
            } else {
              if (inputs.length === 1) {
                return inputs[0].checked;
              } else {
                return checkedCount >= min && checkedCount <= max;
              }
            }
          } else {
            const input = fieldGroup.querySelector('input, textarea, select');
            if (!input) return false;

            let valid = true;
            const min = parseInt(input.getAttribute('min')) || 0;
            const max = parseInt(input.getAttribute('max')) || Infinity;
            const value = input.value.trim();
            const length = value.length;

            if (input.tagName.toLowerCase() === 'select') {
              if (
                value === '' ||
                value === 'disabled' ||
                value === 'null' ||
                value === 'false'
              ) {
                valid = false;
              }
            } else if (input.type === 'email') {
              const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              valid = emailPattern.test(value);
            } else {
              if (input.hasAttribute('min') && length < min) valid = false;
              if (input.hasAttribute('max') && length > max) valid = false;
            }

            return valid;
          }
        }

        function updateFieldStatus(fieldGroup) {
          if (isHidden(fieldGroup)) {
            fieldGroup.classList.remove('is--error', 'is--success', 'is--filled');
            return;
          }
          const radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');

          if (radioCheckGroup) {
            const inputs = radioCheckGroup.querySelectorAll(
              'input[type="radio"], input[type="checkbox"]'
            );
            const checkedInputs = radioCheckGroup.querySelectorAll('input:checked');

            if (checkedInputs.length > 0) {
              fieldGroup.classList.add('is--filled');
            } else {
              fieldGroup.classList.remove('is--filled');
            }

            const valid = isValid(fieldGroup);

            if (valid) {
              fieldGroup.classList.add('is--success');
              fieldGroup.classList.remove('is--error');
            } else {
              fieldGroup.classList.remove('is--success');
              const anyInputValidationStarted = Array.from(inputs).some(
                (input) => input.__validationStarted
              );
              if (anyInputValidationStarted) {
                fieldGroup.classList.add('is--error');
              } else {
                fieldGroup.classList.remove('is--error');
              }
            }
          } else {
            const input = fieldGroup.querySelector('input, textarea, select');
            if (!input) return;

            const value = input.value.trim();

            if (value) {
              fieldGroup.classList.add('is--filled');
            } else {
              fieldGroup.classList.remove('is--filled');
            }

            const valid = isValid(fieldGroup);

            if (valid) {
              fieldGroup.classList.add('is--success');
              fieldGroup.classList.remove('is--error');
            } else {
              fieldGroup.classList.remove('is--success');
              if (input.__validationStarted) {
                fieldGroup.classList.add('is--error');
              } else {
                fieldGroup.classList.remove('is--error');
              }
            }
          }
        }

        validateFields.forEach(function (fieldGroup) {
          const input = fieldGroup.querySelector('input, textarea, select');
          const radioCheckGroup = fieldGroup.querySelector('[data-radiocheck-group]');

          if (radioCheckGroup) {
            const inputs = radioCheckGroup.querySelectorAll(
              'input[type="radio"], input[type="checkbox"]'
            );

            inputs.forEach(function (input) {
              input.__validationStarted = false;

              input.addEventListener('change', function () {
                requestAnimationFrame(function () {
                  if (!input.__validationStarted) {
                    const checkedCount = radioCheckGroup.querySelectorAll(
                      'input:checked'
                    ).length;
                    const min = parseInt(radioCheckGroup.getAttribute('min')) || 1;
                    if (checkedCount >= min) {
                      input.__validationStarted = true;
                    }
                  }
                  if (input.__validationStarted) {
                    updateFieldStatus(fieldGroup);
                  }
                });
              });

              input.addEventListener('blur', function () {
                input.__validationStarted = true;
                updateFieldStatus(fieldGroup);
              });
            });
          } else if (input) {
            input.__validationStarted = false;

            if (input.tagName.toLowerCase() === 'select') {
              input.addEventListener('change', function () {
                input.__validationStarted = true;
                updateFieldStatus(fieldGroup);
              });
            } else {
              input.addEventListener('input', function () {
                const value = input.value.trim();
                const length = value.length;
                const min = parseInt(input.getAttribute('min')) || 0;
                const max = parseInt(input.getAttribute('max')) || Infinity;

                if (!input.__validationStarted) {
                  if (input.type === 'email') {
                    if (isValid(fieldGroup)) input.__validationStarted = true;
                  } else {
                    if (
                      (input.hasAttribute('min') && length >= min) ||
                      (input.hasAttribute('max') && length <= max)
                    ) {
                      input.__validationStarted = true;
                    }
                  }
                }

                if (input.__validationStarted) {
                  updateFieldStatus(fieldGroup);
                }
              });

              input.addEventListener('blur', function () {
                input.__validationStarted = true;
                updateFieldStatus(fieldGroup);
              });
            }
          }
        });

        // Exposed so page scripts (course onboarding) can check the whole form
        form.__dfsValidate = validateAndStartLiveValidationForAll;

        if (dataSubmit) {
          dataSubmit.addEventListener('click', function (e) {
            e.preventDefault();
            if (validateAndStartLiveValidationForAll()) {
              if (isSpam()) return;
              realSubmitInput.click();
            }
          });
        }

        form.addEventListener('submit', function (e) {
          if (!validateAndStartLiveValidationForAll()) {
            e.preventDefault();
            return;
          }
          if (isSpam()) {
            e.preventDefault();
            return;
          }
        });

        form.addEventListener('keydown', function (event) {
          if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
            event.preventDefault();
            if (validateAndStartLiveValidationForAll()) {
              if (isSpam()) return;
              realSubmitInput.click();
            }
          }
        });
      });
    }

    // Run on initial page load
    initAdvancedFormValidation();

    // Run again when DOM changes (for dynamically loaded content) — at most once
    // per frame, however many elements animations add or remove in between
    let recheckQueued = false;
    const observer = new MutationObserver(function (mutations) {
      if (recheckQueued) return;
      if (!mutations.some(m => m.addedNodes.length > 0)) return;
      recheckQueued = true;
      requestAnimationFrame(function () {
        recheckQueued = false;
        initAdvancedFormValidation();
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    // Make the function globally available
    window.initAdvancedFormValidation = initAdvancedFormValidation;
  }

  // =========================================================
  // SIGN-IN spin button — auth pages
  // (was Slater SIGN-IN.js)
  // =========================================================
  function dfsSignIn() {
    //spin effect + refresh
    const spinBtn = document.querySelector('[data-spin="btn"]');
    const spinIcon = document.getElementById("spin_this");
    if (spinBtn && spinIcon) {
      spinBtn.style.cursor = "pointer";
      spinBtn.addEventListener("click", () => {
        gsap.fromTo(spinIcon, { rotation: 0 },
        {
          rotation: -720,
          duration: 1,
          ease: "power2.inOut",
          transformOrigin: "50% 50%"
        });
        setTimeout(() => location.reload(), 1000);
      });
    }
  }

  // =========================================================
  // ONE-SHOT RACE BARS — /one-shot-setup hero
  // The blue "one-shot" bar snaps full, the grey "by hand" bar crawls after it.
  // Finds the bars by their Webflow classes: .oneshot-race > .oneshot-race_bar
  // (.is-macro = the fast one). Rename those classes and this stops running.
  // =========================================================
  function dfsRaceBars() {
    if (typeof gsap === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    document.querySelectorAll('.oneshot-race').forEach(function (race) {
      var fast = race.querySelectorAll('.oneshot-race_bar.is-macro');
      var slow = race.querySelectorAll('.oneshot-race_bar:not(.is-macro)');

      gsap.timeline({
        delay: 0.3,
        scrollTrigger: { trigger: race, start: 'top 90%' }
      })
        .from(fast, { width: 0, duration: 0.35, ease: 'power4.out' })
        .from(slow, { width: 0, duration: 2.6, ease: 'power1.inOut' }, '<');
    });
  }

  // =========================================================
  // RHYTHMS APP DEMO — /rythems-app hero
  // The app window is real HTML in Webflow ([data-rhythms-app]); this makes it play:
  // pick a rhythm, switch it on/off, change days, remove or add what closes,
  // pick a lock. Locked rhythms behave like the real app: removing or switching
  // off is refused ("type to unlock first"), adding stays free.
  // The list of sites + icons comes from the marquee chips further down the page.
  // Exposes window.dfsRhythms.sitesOf(name) for the "Closed by …" toast.
  // =========================================================
  function dfsRhythmsApp() {
    var app = document.querySelector('[data-rhythms-app]');
    if (!app) return;
    var $ = function (s, el) { return (el || app).querySelector(s); };
    var $$ = function (s, el) { return [].slice.call((el || app).querySelectorAll(s)); };
    var gs = window.gsap;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W = 928;

    // Scale the 928px-wide window to whatever width it gets
    var frame = app.parentNode;
    function fit() { app.style.transform = 'scale(' + (frame.clientWidth / W) + ')'; }
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(frame);
    var shot = document.querySelector('.rhythms-window_image');
    if (shot) shot.classList.add('is-replaced');

    // Sites and icons, from the marquee
    var SITES = {};
    var firstList = document.querySelector('.rhythms-marquee_list');
    $$('.rhythms-chip', firstList || document).forEach(function (chip) {
      var name = (chip.querySelector('.rhythms-chip_name') || {}).textContent;
      var img = chip.querySelector('img');
      if (name) SITES[name.trim()] = img ? img.getAttribute('src') : '';
    });
    var GROUPS = {
      social: ['Instagram', 'TikTok', 'Facebook', 'X (Twitter)', 'Reddit'],
      video: ['YouTube', 'Netflix', 'TikTok', 'Twitch'],
      news: ['CNN', 'The New York Times', 'Reddit'],
      shopping: ['Amazon', 'Temu']
    };
    var TIPS = {
      easy: 'Just enough to break the autopilot, while you’re still shaping this rhythm.',
      medium: 'Long enough to notice the reflex before you act on it. Our pick.',
      hard: 'Long enough for the urge to fade before you reach the last line.',
      intense: 'For the rhythms that guard your deepest work. Finish this, and you really meant it.'
    };
    var NOTES = {
      none: 'No lock: switch it off or change it whenever you like.',
      type: 'Removing anything or switching it off takes a typed text first. Adding stays free.',
      sealed: 'Nothing can be removed or switched off until this rhythm ends. Adding stays free.'
    };
    var ALL = [1, 1, 1, 1, 1, 1, 1];
    var H = function (h, m) { return h * 60 + (m || 0); };
    var R = {
      deep: { name: 'Deep work', on: true, days: [1, 1, 1, 1, 1, 0, 0], allDay: false, from: H(9), to: H(12, 30),
        sites: ['Instagram', 'YouTube', 'X (Twitter)', 'Reddit', 'CNN', 'The New York Times'], lock: 'type', effort: 'medium' },
      evenings: { name: 'Evenings', on: true, days: ALL.slice(), allDay: false, from: H(21, 30), to: H(7),
        sites: ['TikTok', 'YouTube', 'Instagram', 'Netflix', 'Reddit'], lock: 'none', effort: 'easy' },
      sundays: { name: 'Slow Sundays', on: true, days: [0, 0, 0, 0, 0, 0, 1], allDay: true, from: H(0), to: H(24),
        sites: ['Slack', 'Amazon', 'Temu'], lock: 'none', effort: 'easy' },
      peace: { name: 'Peace of mind', on: true, days: ALL.slice(), allDay: true, from: H(0), to: H(24),
        sites: ['Adult sites'], lock: 'sealed', effort: 'hard' }
    };
    var NOW = { day: 2, min: H(21, 47) }; // the menu bar says Wed 21:47
    var current = 'deep', newCount = 0;

    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var hm = function (m, sep) { m = m % 1440; return pad(Math.floor(m / 60)) + (sep || ':') + pad(m % 60); };
    var LETTERS = 'MTWTFSS';

    function activeNow(r) {
      if (!r.on) return false;
      if (r.allDay) return !!r.days[NOW.day];
      if (r.to > r.from) return !!r.days[NOW.day] && NOW.min >= r.from && NOW.min < r.to;
      var yesterday = (NOW.day + 6) % 7;
      return (r.days[NOW.day] && NOW.min >= r.from) || (r.days[yesterday] && NOW.min < r.to);
    }
    function meta(r) {
      var every = r.days.every(Boolean);
      if (r.allDay && every) return '<b>ALL DAY, EVERY DAY</b>';
      // Days that are on are dark, days that are off stay faint (like the app)
      var letters = LETTERS.split('').map(function (l, i) { return r.days[i] ? '<b>' + l + '</b>' : l; }).join('');
      return letters + '&nbsp;&nbsp;<b>' + (r.allDay ? 'All day' : hm(r.from) + ' – ' + hm(r.to)) + '</b>';
    }
    function shake(el) {
      if (!gs || reduce) return;
      gs.fromTo(el, { x: 0 }, { x: 0, duration: 0.4, keyframes: { x: [-5, 5, -3, 3, 0] }, ease: 'power2.out' });
    }
    var statusEl = $('[data-app-status]'), statusTimer;
    function status(text, warn) {
      statusEl.textContent = text;
      statusEl.classList.toggle('is-warning', !!warn);
      clearTimeout(statusTimer);
      if (warn) statusTimer = setTimeout(function () { status(statusFor(R[current])); }, 2600);
    }
    function statusFor(r) {
      if (!r.on) return 'OFF';
      return activeNow(r) ? 'ON · CLOSING THINGS RIGHT NOW' : 'ON · WAITING FOR ITS TIME';
    }
    // The real app's rule: loosening a locked rhythm takes a typed text first
    function refused(el, key) {
      var r = R[key || current];
      if (r.lock === 'none') return false;
      shake(el);
      status(r.lock === 'sealed' ? 'SEALED · THIS CAN’T BE LOOSENED NOW' : 'LOCKED · TYPE TO UNLOCK FIRST', true);
      return true;
    }

    // ---------- the list ----------
    var cardsEl = $('[data-app-cards]');
    var cardTpl = $('[data-app-card]');
    function cardFor(key) { return $('[data-app-card="' + key + '"]'); }
    function paintCard(key) {
      var r = R[key], card = cardFor(key);
      if (!card) return;
      $('[data-app-meta]', card).innerHTML = meta(r);
      $('.rhythms-app_card-name', card).textContent = r.name;
      card.classList.toggle('is-off', !r.on);
      $('[data-app-toggle]', card).classList.toggle('is-off', !r.on);
      card.classList.toggle('is-selected', key === current);
    }
    function paintMenu() {
      var items = document.querySelector('.rhythms-menu_items');
      if (!items) return;
      var on = Object.keys(R).filter(function (k) { return activeNow(R[k]); });
      items.innerHTML = '';
      on.forEach(function (k) {
        var r = R[k], line = document.createElement('div');
        line.className = 'rhythms-menu_item';
        line.textContent = r.name + ' · ' + (r.allDay ? (r.days.every(Boolean) ? 'all day, every day' : 'all day') :
          'until ' + (r.to < r.from ? 'tomorrow ' : '') + hm(r.to));
        items.appendChild(line);
      });
      if (!on.length) {
        var none = document.createElement('div');
        none.className = 'rhythms-menu_item';
        none.style.opacity = '.5';
        none.textContent = 'Nothing is closed right now';
        items.appendChild(none);
      }
    }
    function bindCard(card) {
      var key = card.getAttribute('data-app-card');
      card.addEventListener('click', function (e) {
        if (e.target.closest('[data-app-toggle]')) {
          var r = R[key];
          if (r.on && refused(card, key)) { select(key); status(R[key].lock === 'sealed' ? 'SEALED \u00b7 THIS CAN\u2019T BE LOOSENED NOW' : 'LOCKED \u00b7 TYPE TO UNLOCK FIRST', true); return; }
          r.on = !r.on;
          select(key);
          window.dispatchEvent(new Event('dfs-rhythms-change'));
          return;
        }
        select(key);
      });
    }
    $$('[data-app-card]').forEach(bindCard);

    // ---------- the editor ----------
    var chipsEl = $('[data-app-chips]');
    var chipTpl = $('[data-app-template="chip"]');
    var segTpl = $('[data-app-template="seg"]');
    var suggestEl = $('[data-app-suggest]');
    var suggestTpl = $('[data-app-template="suggest"]');

    // The name span: Webflow drops classes without styles, so fall back to "the span that isn't the ✕"
    var nameEl = function (el) { return $('.rhythms-app_chip-name', el) || $('span:not([data-app-remove])', el); };
    function chip(name, fresh) {
      var c = chipTpl.cloneNode(true);
      c.removeAttribute('data-app-template');
      c.setAttribute('data-app-site', name);
      nameEl(c).textContent = name;
      var icon = $('.rhythms-app_chip-icon', c);
      if (SITES[name]) icon.style.backgroundImage = 'url("' + SITES[name] + '")';
      else { icon.textContent = '18+'; icon.style.fontSize = '6px'; icon.style.display = 'flex'; icon.style.alignItems = 'center'; icon.style.justifyContent = 'center'; }
      if (fresh) c.classList.add('is-new');
      return c;
    }
    function paintChips(fresh) {
      $$('[data-app-site]', chipsEl).forEach(function (c) { c.remove(); });
      R[current].sites.forEach(function (n) { chipsEl.appendChild(chip(n, fresh === n)); });
      $$('[data-app-group]').forEach(function (g) {
        var list = GROUPS[g.getAttribute('data-app-group')] || [];
        g.classList.toggle('is-done', list.every(function (n) { return R[current].sites.indexOf(n) > -1; }));
      });
    }
    function paintChart() {
      var r = R[current];
      $$('[data-app-track]').forEach(function (t) { $$('.rhythms-app_chart-seg', t).forEach(function (s) { if (!s.hasAttribute('data-app-template')) s.remove(); }); });
      function seg(day, a, b) {
        var t = $('[data-app-track="' + day + '"]');
        var s = segTpl.cloneNode(true);
        s.removeAttribute('data-app-template');
        s.style.left = (a / 1440 * 100) + '%';
        s.style.width = ((b - a) / 1440 * 100) + '%';
        t.appendChild(s);
      }
      r.days.forEach(function (on, d) {
        if (!on) return;
        if (r.allDay) return seg(d, 0, 1440);
        if (r.to > r.from) return seg(d, r.from, r.to);
        seg(d, r.from, 1440); seg((d + 1) % 7, 0, r.to);
      });
    }
    function paintEditor() {
      var r = R[current];
      $('[data-app-name]').textContent = r.name;
      status(statusFor(r));
      $('[data-app-allday]').classList.toggle('is-off', !r.allDay);
      $('[data-app-when]').classList.toggle('is-dim', r.allDay);
      $$('[data-app-day]').forEach(function (d) { d.classList.toggle('is-on', !!r.days[+d.getAttribute('data-app-day')]); });
      $('[data-app-from]').textContent = hm(r.from, ' : ');
      $('[data-app-to]').textContent = hm(r.to, ' : ');
      $$('[data-app-lock]').forEach(function (l) { l.classList.toggle('is-on', l.getAttribute('data-app-lock') === r.lock); });
      $('[data-app-lock-note]').textContent = NOTES[r.lock];
      $('[data-app-efforts]').classList.toggle('is-hidden', r.lock !== 'type');
      $$('[data-app-effort]').forEach(function (e) { e.classList.toggle('is-on', e.getAttribute('data-app-effort') === r.effort); });
      $('[data-app-tip]').textContent = r.lock === 'type' ? TIPS[r.effort] :
        r.lock === 'sealed' ? 'Seal only what you’re sure about. A sealed rhythm can’t be undone until it ends.' :
        'Start without a lock while you find your rhythm. Add one once it feels right.';
      paintChart();
      paintChips();
    }
    function paintAll() {
      Object.keys(R).forEach(paintCard);
      paintMenu();
    }
    function select(key) {
      var changed = key !== current;
      current = key;
      paintAll();
      paintEditor();
      if (changed && gs && !reduce) {
        gs.fromTo($('.rhythms-app_edit-scroll'), { autoAlpha: 0.2, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'expo.out' });
        $('.rhythms-app_edit-scroll').scrollTop = 0;
      }
    }

    // All day
    $('[data-app-allday]').addEventListener('click', function (e) {
      var r = R[current];
      if (r.allDay && refused(e.currentTarget)) return; // narrowing the hours loosens it
      r.allDay = !r.allDay;
      paintEditor(); paintAll();
    });
    // Days
    $$('[data-app-day]').forEach(function (d) {
      d.addEventListener('click', function () {
        var r = R[current], i = +d.getAttribute('data-app-day');
        if (r.days[i] && refused(d)) return;
        if (r.days[i] && r.days.filter(Boolean).length === 1) { shake(d); return; } // keep at least one day
        r.days[i] = r.days[i] ? 0 : 1;
        paintEditor(); paintAll();
      });
    });
    // Remove a site
    chipsEl.addEventListener('click', function (e) {
      var x = e.target.closest('[data-app-remove]');
      if (!x) return;
      var c = x.closest('[data-app-site]'), name = c.getAttribute('data-app-site');
      if (refused(c)) return;
      R[current].sites = R[current].sites.filter(function (n) { return n !== name; });
      c.classList.add('is-leaving');
      setTimeout(function () { paintChips(); window.dispatchEvent(new Event('dfs-rhythms-change')); }, 200);
    });
    function add(name) {
      var r = R[current];
      if (!name || r.sites.indexOf(name) > -1) return;
      r.sites.push(name);
      paintChips(name);
      window.dispatchEvent(new Event('dfs-rhythms-change'));
    }
    // Groups: adding is always free
    $$('[data-app-group]').forEach(function (g) {
      g.addEventListener('click', function () {
        (GROUPS[g.getAttribute('data-app-group')] || []).forEach(function (n, i) {
          setTimeout(function () { add(n); }, i * 90);
        });
      });
    });
    // Search
    var slot = $('[data-app-search]');
    var input = document.createElement('input');
    input.className = 'rhythms-app_search-input';
    input.type = 'text';
    input.placeholder = slot.getAttribute('data-placeholder') || 'Search';
    input.setAttribute('aria-label', 'Search a website or app');
    input.autocomplete = 'off';
    slot.appendChild(input);
    var picks = [], active = 0;
    function suggest() {
      var q = input.value.trim().toLowerCase();
      $$('.rhythms-app_suggest-item', suggestEl).forEach(function (s) { if (!s.hasAttribute('data-app-template')) s.remove(); });
      picks = !q ? [] : Object.keys(SITES).filter(function (n) {
        return n.toLowerCase().indexOf(q) > -1 && R[current].sites.indexOf(n) < 0;
      }).slice(0, 4);
      active = 0;
      picks.forEach(function (n, i) {
        var s = suggestTpl.cloneNode(true);
        s.removeAttribute('data-app-template');
        s.classList.toggle('is-active', i === 0);
        nameEl(s).textContent = n;
        if (SITES[n]) $('.rhythms-app_chip-icon', s).style.backgroundImage = 'url("' + SITES[n] + '")';
        s.addEventListener('mousedown', function (e) { e.preventDefault(); add(n); input.value = ''; suggest(); });
        suggestEl.appendChild(s);
      });
      suggestEl.classList.toggle('is-open', picks.length > 0);
    }
    input.addEventListener('input', suggest);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); if (picks[active]) { add(picks[active]); input.value = ''; suggest(); } }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        active = (active + (e.key === 'ArrowDown' ? 1 : picks.length - 1)) % Math.max(1, picks.length);
        $$('.rhythms-app_suggest-item:not([data-app-template])', suggestEl).forEach(function (s, i) { s.classList.toggle('is-active', i === active); });
      }
      if (e.key === 'Escape') { input.value = ''; suggest(); input.blur(); }
    });
    input.addEventListener('blur', function () { setTimeout(function () { suggestEl.classList.remove('is-open'); }, 150); });
    // Lock + effort
    var order = { none: 0, type: 1, sealed: 2 };
    $$('[data-app-lock]').forEach(function (l) {
      l.addEventListener('click', function () {
        var r = R[current], next = l.getAttribute('data-app-lock');
        if (order[next] < order[r.lock] && refused(l)) return; // a weaker lock is loosening too
        r.lock = next; paintEditor();
      });
    });
    $$('[data-app-effort]').forEach(function (e) {
      e.addEventListener('click', function () { R[current].effort = e.getAttribute('data-app-effort'); paintEditor(); });
    });
    // New rhythm (adding is free)
    $('[data-app-new]').addEventListener('click', function (e) {
      if ($$('[data-app-card]').length >= 6) { shake(e.currentTarget); return; }
      var key = 'new' + (++newCount);
      R[key] = { name: newCount > 1 ? 'New rhythm ' + newCount : 'New rhythm', on: true, days: [1, 1, 1, 1, 1, 0, 0], allDay: false,
        from: H(14), to: H(17), sites: [], lock: 'none', effort: 'easy' };
      var card = cardTpl.cloneNode(true);
      card.setAttribute('data-app-card', key);
      cardsEl.appendChild(card);
      bindCard(card);
      select(key);
      if (gs && !reduce) gs.from(card, { autoAlpha: 0, y: 10, duration: 0.5, ease: 'expo.out' });
    });
    // Delete
    $('[data-app-delete]').addEventListener('click', function (e) {
      if (refused(e.currentTarget)) return;
      var keys = Object.keys(R);
      if (keys.length <= 1) { shake(e.currentTarget); return; }
      var card = cardFor(current), gone = current;
      delete R[gone];
      var next = Object.keys(R)[0];
      var finish = function () { card.remove(); select(next); window.dispatchEvent(new Event('dfs-rhythms-change')); };
      if (gs && !reduce) gs.to(card, { autoAlpha: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: -9, duration: 0.35, ease: 'power2.in', onComplete: finish });
      else finish();
    });
    // Save: just a nod
    var saved = $('[data-app-saved]');
    $('[data-app-save]').addEventListener('click', function () {
      saved.classList.add('is-shown');
      setTimeout(function () { saved.classList.remove('is-shown'); }, 1600);
    });
    // The moon button switches the site's night mode
    var nightBtn = $('[data-app-night]');
    if (nightBtn) nightBtn.addEventListener('click', function () {
      var real = document.querySelector('.dfs-night-toggle');
      if (real) real.click(); // same as the site's own switch, so the choice is remembered
    });

    window.dfsRhythms = {
      sitesOf: function (name) {
        var k = Object.keys(R).filter(function (k) { return R[k].name === name; })[0];
        return k && R[k].on ? R[k].sites.slice() : [];
      }
    };
    paintAll();
    paintEditor();
  }

  // =========================================================
  // GREETING — "Hi Rim 👋" when we know the member's first name, otherwise just "Hi 👋".
  // Put data-greet-name on the name span. styles.css hides it until a name is found,
  // so a placeholder like {firstName} never shows.
  // =========================================================
  function dfsGreeting() {
    var els = document.querySelectorAll('[data-greet-name]');
    var tries = 0;
    function show(name) {
      els.forEach(function (el) {
        if (!name) return;
        el.textContent = name;
        el.classList.add('is-known');
      });
    }
    (function check() {
      var ms = window.$memberstackDom;
      if (ms && ms.getCurrentMember) {
        ms.getCurrentMember().then(function (res) {
          var f = res && res.data && res.data.customFields;
          show(f && f['first-name'] ? String(f['first-name']).trim() : '');
        }).catch(function () {});
        return;
      }
      if (++tries < 20) setTimeout(check, 250); // Memberstack loads with defer
    })();
  }

  // =========================================================
  // GRID ZIPS — now and then a thin blue line glides down a grid background
  // (same effect as the Rhythms page hero, which has its own copy).
  // Put data-grid-zips on a .grid-background. Give it a selector, e.g.
  // data-grid-zips=".feedback_form", to keep the lines out from behind that element.
  // The line style (.dfs-grid-zip) lives in styles.css.
  // =========================================================
  function dfsGridZips() {
    if (typeof gsap === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var STEP = 32; // the grid's line spacing (2rem)

    document.querySelectorAll('[data-grid-zips]').forEach(function (grid) {
      var sel = grid.getAttribute('data-grid-zips');
      var avoid = sel ? document.querySelector(sel) : null;
      var visible = false, live = 0;
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(grid);

      function zip() {
        setTimeout(zip, 300 + Math.random() * 700);
        if (!visible || document.hidden || live > 6) return;
        var box = grid.getBoundingClientRect(), cols = Math.floor(box.width / STEP);
        var top = Math.max(0, -box.top), bottom = Math.min(box.height, window.innerHeight - box.top);
        var length = 56 + Math.random() * 120, travel = 140 + Math.random() * 300;
        if (cols < 2 || bottom - top < length + travel) return;
        var x = (1 + Math.floor(Math.random() * (cols - 1))) * STEP;
        var y = top + Math.random() * (bottom - top - length - travel);
        if (avoid) {
          var a = avoid.getBoundingClientRect();
          if (x > a.left - box.left && x < a.right - box.left &&
            y + length + travel > a.top - box.top && y < a.bottom - box.top) return;
        }
        var line = document.createElement('span');
        line.className = 'dfs-grid-zip';
        line.style.left = x + 'px';
        line.style.top = y + 'px';
        line.style.height = length + 'px';
        grid.appendChild(line); live++;
        gsap.fromTo(line, { y: 0, autoAlpha: 0 }, {
          y: travel, duration: 1.4 + Math.random() * 1.2, ease: 'power1.inOut',
          keyframes: { autoAlpha: [0, 1, 1, 0] },
          onComplete: function () { line.remove(); live--; }
        });
      }
      setTimeout(zip, 400);
    });
  }

  // =========================================================
  // ONE-SHOT TIME BARS — /one-shot-setup table
  // Each "by hand" cell has a bar: .oneshot-compare_bar > .oneshot-compare_bar-fill.
  // Its length comes from the minutes in the cell's text (~15 min = the longest = full),
  // so changing a time in Webflow changes the bar too. The bars grow in on scroll.
  // =========================================================
  function dfsTimeBars() {
    document.querySelectorAll('.oneshot-compare_table').forEach(function (table) {
      var rows = [].slice.call(table.querySelectorAll('.oneshot-compare_bar')).map(function (bar) {
        var m = (bar.parentNode.textContent || '').match(/(\d+(?:[.,]\d+)?)/);
        return { fill: bar.querySelector('.oneshot-compare_bar-fill'), min: m ? parseFloat(m[1].replace(',', '.')) : 0 };
      }).filter(function (r) { return r.fill; });
      var max = Math.max.apply(null, rows.map(function (r) { return r.min; }).concat(1));
      rows.forEach(function (r) { r.fill.style.width = (r.min / max * 100) + '%'; });

      if (typeof gsap === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.from(rows.map(function (r) { return r.fill; }), {
        width: 0,
        duration: 1.1,
        ease: 'power2.out',
        stagger: 0.08,
        scrollTrigger: typeof ScrollTrigger !== 'undefined' ? { trigger: table, start: 'top 80%' } : undefined
      });
    });
  }

  // =========================================================
  // PIXEL REVEAL — an image "loads" like pixel art: coarse blocks first, then sharp.
  // Put data-pixel-reveal on the wrapper of an <img>. Anything inside it marked
  // data-pixel-reveal-after (like a label) pops in once the image is sharp.
  // styles.css hides the image until this runs (and shows it anyway after 3s).
  // =========================================================
  function dfsPixelReveal() {
    document.querySelectorAll('[data-pixel-reveal]').forEach(function (wrap) {
      var img = wrap.querySelector('img');
      var after = wrap.querySelectorAll('[data-pixel-reveal-after]');
      if (!img) return;

      function show() {
        if (typeof gsap === 'undefined') return wrap.classList.add('is-sharp', 'is-revealed');
        gsap.set(after, { autoAlpha: 0, y: 12 });
        wrap.classList.add('is-sharp', 'is-revealed');
        gsap.to(after, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'back.out(2)' });
        // One small key press
        gsap.fromTo(wrap, { scale: 1 }, { scale: 0.985, duration: 0.09, yoyo: true, repeat: 1, ease: 'power2.inOut' });
      }

      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return show();

      function run() {
        var w = img.clientWidth, h = img.clientHeight;
        if (!w || !h || !img.naturalWidth) return show();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.setAttribute('aria-hidden', 'true');
        canvas.style.cssText = 'position:absolute;left:' + img.offsetLeft + 'px;top:' + img.offsetTop +
          'px;width:' + w + 'px;height:' + h + 'px;pointer-events:none;z-index:1';
        wrap.appendChild(canvas);
        var ctx = canvas.getContext('2d');
        var small = document.createElement('canvas');
        var sctx = small.getContext('2d');

        // Blocks across the width, from chunky to fine
        var steps = [5, 9, 16, 28, 48, 90];
        var i = 0;
        (function draw() {
          var cols = steps[i];
          var rows = Math.max(1, Math.round(cols * h / w));
          small.width = cols; small.height = rows;
          sctx.imageSmoothingEnabled = true;
          sctx.drawImage(img, 0, 0, cols, rows);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(small, 0, 0, canvas.width, canvas.height);
          i++;
          if (i < steps.length) return setTimeout(draw, i < 3 ? 160 : 110);
          // Last step: the sharp photo appears under the blocks, the blocks fade away
          wrap.classList.add('is-sharp');
          canvas.style.transition = 'opacity .35s ease';
          requestAnimationFrame(function () { canvas.style.opacity = '0'; });
          setTimeout(function () { canvas.remove(); }, 400);
          setTimeout(show, 150);
        })();
      }

      function whenVisible() {
        if (!('IntersectionObserver' in window)) return run();
        var io = new IntersectionObserver(function (entries) {
          if (!entries[0].isIntersecting) return;
          io.disconnect();
          run();
        }, { threshold: 0.25 });
        io.observe(wrap);
      }

      var ready = img.complete && img.naturalWidth ? Promise.resolve() :
        new Promise(function (res) { img.addEventListener('load', res, { once: true }); img.addEventListener('error', res, { once: true }); });
      ready.then(function () { return img.decode ? img.decode().catch(function () {}) : null; })
        .then(whenVisible);
    });
  }

  // =========================================================
  // FLOAT — anything with data-float bobs gently up and down.
  // data-float="12" sets how far it moves (px, default 8).
  // =========================================================
  function dfsFloat() {
    if (typeof gsap === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('[data-float]').forEach(function (el, i) {
      var dist = parseFloat(el.getAttribute('data-float')) || 8;
      gsap.to(el, {
        y: -dist,
        rotation: 0.6,
        duration: 2.8,
        delay: i * 0.4,
        ease: 'sine.inOut',
        yoyo: true,
        repeat: -1
      });
    });
  }

  // Vertical marquee: a column [data-marquee-v] (value = px per second, default 18) holds one
  // [data-marquee-v-list]. The list is copied until it fills the column, then every copy slides
  // up by its own height (CSS keyframes in styles.css). data-marquee-v-direction="down" runs it
  // the other way. Add data-marquee-intro to a column to let the avatars in view pop in once.
  function dfsMarqueeV() {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var cols = Array.prototype.slice.call(document.querySelectorAll('[data-marquee-v]'));
    cols.forEach(function (col) {
      var list = col.querySelector('[data-marquee-v-list]');
      if (!list || !list.offsetHeight) return;
      var copies = Math.max(1, Math.ceil(col.offsetHeight / list.offsetHeight));
      for (var i = 0; i < copies; i++) {
        var copy = list.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        col.appendChild(copy);
      }
      var speed = parseFloat(col.getAttribute('data-marquee-v')) || 18;
      col.querySelectorAll('[data-marquee-v-list]').forEach(function (l) {
        l.style.animationDuration = list.offsetHeight / speed + 's';
      });
      if (col.hasAttribute('data-marquee-intro') && !reduce && typeof gsap !== 'undefined') {
        var box = col.getBoundingClientRect();
        var inView = Array.prototype.slice.call(col.querySelectorAll('[data-marquee-v-list] > *'))
          .filter(function (el) { return el.getBoundingClientRect().top < box.bottom; });
        gsap.from(inView, {
          opacity: 0, scale: 0.6, rotation: col.getAttribute('data-marquee-v-direction') === 'down' ? -20 : 20,
          duration: 0.8, ease: 'expo.out', stagger: 0.08, delay: 0.4
        });
      }
    });
    if (reduce) return;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        entry.target.querySelectorAll('[data-marquee-v-list]').forEach(function (l) {
          l.style.animationPlayState = entry.isIntersecting ? 'running' : 'paused';
        });
      });
    });
    cols.forEach(function (col) { observer.observe(col); });
  }

  // Star rating ([data-stars] on a row of star icons; value = delay in seconds, default 0.9):
  // the stars pop in one by one, and give a little wave when you hover the row.
  function dfsStars() {
    if (typeof gsap === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    document.querySelectorAll('[data-stars]').forEach(function (row) {
      var stars = Array.prototype.slice.call(row.children);
      gsap.from(stars, {
        scale: 0,
        rotation: -45,
        opacity: 0,
        duration: 0.6,
        ease: 'back.out(3)',
        stagger: 0.08,
        delay: parseFloat(row.getAttribute('data-stars')) || 0.9
      });
      var waving = false;
      row.addEventListener('mouseenter', function () {
        if (waving) return;
        waving = true;
        gsap.to(stars, {
          y: -4,
          duration: 0.18,
          ease: 'power2.out',
          stagger: 0.05,
          yoyo: true,
          repeat: 1,
          onComplete: function () { waving = false; }
        });
      });
    });
  }

  // =========================================================
  // PIXEL AVATARS — tiny two-tone heads for members without a photo.
  // Put data-pixel-avatar="any seed" on an element (a name, a member id…) and it
  // gets a 16×16 SVG head; the same seed always gives the same face.
  //   data-pixel-avatar-palette = beige (default) | sand | blue | night
  //   data-pixel-avatar-bg      = "none" for a transparent tile, or any colour
  // The generator below is a copy of avatars/pixel-avatars.js (keep them in sync;
  // avatars/preview.html is the sheet to design on).
  // =========================================================
(function () {
  'use strict';

  var G = 16;

  // ---------- seeded randomness ----------
  function hashSeed(seed) {
    var s = String(seed), h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function mulberry(a) {
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function pick(rand, list) { return list[Math.floor(rand() * list.length)]; }
  function chance(rand, p) { return rand() < p; }

  // ---------- masks ----------
  function mask() { return new Uint8Array(G * G); }
  function inside(x, y) { return x >= 0 && y >= 0 && x < G && y < G; }
  function blob(cx, cy, rx, ry, n, taper) {
    // superellipse: n = 2 round, n = 3 squarer; taper narrows the lower half (chin)
    var m = mask();
    for (var y = 0; y < G; y++) for (var x = 0; x < G; x++) {
      var dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
      if (dy > 0 && taper) dx /= (1 - taper * dy);
      if (Math.pow(Math.abs(dx), n) + Math.pow(Math.abs(dy), n) <= 1) m[y * G + x] = 1;
    }
    return m;
  }
  function rect(x0, y0, x1, y1) {
    var m = mask();
    for (var y = Math.max(0, y0); y <= Math.min(G - 1, y1); y++)
      for (var x = Math.max(0, x0); x <= Math.min(G - 1, x1); x++) m[y * G + x] = 1;
    return m;
  }
  function union() { var m = mask(); for (var a = 0; a < arguments.length; a++) for (var i = 0; i < G * G; i++) if (arguments[a][i]) m[i] = 1; return m; }
  function subtract(a, b) { var m = mask(); for (var i = 0; i < G * G; i++) m[i] = a[i] && !b[i] ? 1 : 0; return m; }
  function intersect(a, b) { var m = mask(); for (var i = 0; i < G * G; i++) m[i] = a[i] && b[i] ? 1 : 0; return m; }
  function where(fn) { var m = mask(); for (var y = 0; y < G; y++) for (var x = 0; x < G; x++) if (fn(x, y)) m[y * G + x] = 1; return m; }
  function dilate(a, n) {
    var m = a;
    for (var k = 0; k < (n || 1); k++) {
      var o = mask();
      for (var y = 0; y < G; y++) for (var x = 0; x < G; x++) {
        var i = y * G + x;
        if (m[i] || (x > 0 && m[i - 1]) || (x < G - 1 && m[i + 1]) || (y > 0 && m[i - G]) || (y < G - 1 && m[i + G])) o[i] = 1;
      }
      m = o;
    }
    return m;
  }
  function erode(a) {
    var o = mask();
    for (var y = 1; y < G - 1; y++) for (var x = 1; x < G - 1; x++) {
      var i = y * G + x;
      if (a[i] && a[i - 1] && a[i + 1] && a[i - G] && a[i + G]) o[i] = 1;
    }
    return o;
  }
  function edge(a) { return subtract(a, erode(a)); }
  function topRow(a) { for (var y = 0; y < G; y++) for (var x = 0; x < G; x++) if (a[y * G + x]) return y; return G; }

  function Canvas() { this.t = new Int8Array(G * G).fill(-1); }
  Canvas.prototype.paint = function (m, tone) { for (var i = 0; i < G * G; i++) if (m[i]) this.t[i] = tone; };
  Canvas.prototype.set = function (x, y, tone) { if (inside(x, y)) this.t[y * G + x] = tone; };
  Canvas.prototype.hline = function (x0, x1, y, tone) { for (var x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, tone); };
  Canvas.prototype.vline = function (x, y0, y1, tone) { for (var y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, tone); };

  // ---------- the head ----------
  function portrait(seed) {
    var rand = mulberry(hashSeed(seed));
    var c = new Canvas();
    var INK = 0, LIGHT = 1, WHITE = 2;
    var f = chance(rand, 0.5) ? 1 : -1;                     // hair sweeps this way; the ear sits on the other side
    var look = chance(rand, 0.5) ? 1 : -1;                  // where the eyes look
    var dark = false;                                        // (all-dark faces looked like balaclavas; dropped)
    var face = dark ? INK : LIGHT, ink = dark ? LIGHT : INK;
    var shape = pick(rand, ['round', 'round', 'square', 'square', 'tall', 'wide', 'chin']);
    var hair = pick(rand, ['cap', 'cap', 'cap', 'swept', 'swept', 'quiff', 'quiff', 'spiky', 'bun', 'bangs', 'curly', 'long', 'bowl', 'afro', 'bald', 'bald']);
    var eyes = pick(rand, ['pair', 'pair', 'pair', 'pair', 'pair', 'pair', 'closed']);
    var nose = pick(rand, ['none', 'dot', 'dot', 'L']);
    var mouth = pick(rand, ['smile', 'smile', 'smile', 'small', 'line', 'grin', 'frown', 'open', 'smirk']);
    var beard = pick(rand, ['none', 'none', 'none', 'none', 'none', 'none', 'beard', 'goatee', 'moustache']);
    if (beard !== 'none' && (hair === 'afro' || hair === 'long' || hair === 'bowl' || hair === 'bangs')) beard = 'none';
    var glasses = chance(rand, 0.08);
    var ear = chance(rand, 0.7);
    var parting = chance(rand, 0.3), peak = chance(rand, 0.3);

    // head geometry: about 10-11 cells wide and 11-12 tall, leaving 2-3 rows for hair above
    var cx = 8, cy = 9;
    var rx = 5, ry = 5.6, n = 2.4, taper = 0;
    if (shape === 'square') { n = 2.7; rx = 5; ry = 5.4; }
    if (shape === 'tall') { rx = 4.6; ry = 6; }
    if (shape === 'wide') { rx = 5.5; ry = 5.3; n = 2.5; }
    if (shape === 'chin') { rx = 5.2; ry = 5.8; taper = 0.25; }
    var head = blob(cx, cy, rx, ry, n, taper);
    var ey = 8, my = 12;                                     // eye row, mouth row
    var exL = 5, exR = 9;                                    // each eye is two cells: x and x + 1
    var hb = pick(rand, [4, 5, 5, 6]);                       // hairline row at the centre
    if (beard === 'beard' && hb > 5) hb = 5;
    if (glasses && hb > 4) hb = 4;                           // a row of face between hair and glasses
    function hairline(x) {
      var d = (x + 0.5 - cx) / rx - f * 0.25;
      return Math.min(ey - 2, hb + Math.round(d * d * 2) + (peak && (x === cx || x === cx - 1) ? 1 : 0));
    }

    // --- face + outline ---
    c.paint(head, face);
    var earM = mask(), earX = f > 0 ? Math.floor(cx - rx + 0.5) - 1 : Math.ceil(cx + rx - 0.5);
    if (ear) { earM = rect(earX - (f > 0 ? 1 : 0), ey - 1, earX + (f > 0 ? 0 : 1), ey + 1); c.paint(earM, face); }
    if (!dark) { c.paint(edge(union(head, earM)), ink); if (ear) c.set(earX, ey, face); }
    else if (ear) c.paint(earM, LIGHT);

    // --- eyes: a dark dot and a white dot side by side, both looking the same way ---
    function eye(x) {
      if (eyes === 'closed') { c.hline(x, x + 1, ey, ink); return; }
      var pupil = look < 0 ? x : x + 1, shine = look < 0 ? x + 1 : x;
      c.set(pupil, ey, dark ? LIGHT : INK);
      c.set(shine, ey, WHITE);
    }
    eye(exL); eye(exR);
    // --- nose ---
    var nx = f > 0 ? 8 : 7;
    if (!dark && nose === 'dot') c.set(nx, ey + 2, ink);
    if (!dark && nose === 'L') { c.vline(nx, ey + 1, ey + 2, ink); c.set(nx + f, ey + 2, ink); }
    // --- mouth ---
    var mx = f > 0 ? 8 : 7;                                  // three cells, a little toward the facing side
    if (mouth === 'smile') { c.hline(mx - 1, mx + 1, my, ink); c.set(mx - 2, my - 1, ink); c.set(mx + 2, my - 1, ink); }
    if (mouth === 'frown') { c.hline(mx - 1, mx + 1, my, ink); c.set(mx - 2, my + 1, ink); c.set(mx + 2, my + 1, ink); }
    if (mouth === 'small') c.hline(mx, mx + (f > 0 ? -1 : 1), my, ink);
    if (mouth === 'line') c.hline(mx - 1, mx + 1, my, ink);
    if (mouth === 'smirk') { c.hline(mx - 1, mx + 1, my, ink); c.set(mx + 2 * f, my - 1, ink); }
    if (mouth === 'open') c.vline(mx, my - 1, my, ink);                                  // a small 'o'
    if (mouth === 'grin') { c.hline(mx - 2, mx + 2, my - 1, ink); c.set(mx - 2, my, ink); c.set(mx + 2, my, ink); c.hline(mx - 1, mx + 1, my, face); c.hline(mx - 1, mx + 1, my + 1, ink); }
    // --- facial hair (light faces only; on a dark face it would vanish) ---
    if (!dark && beard === 'moustache') c.hline(mx - 1, mx + 1, my - 1, ink);
    if (!dark && beard === 'goatee') { c.hline(mx - 1, mx + 1, my - 1, ink); c.paint(intersect(head, rect(mx, my + 1, mx + 1, my + 3)), ink); }
    if (!dark && beard === 'beard') {
      c.paint(intersect(head, where(function (x, y) { return y >= my; })), ink);
      c.hline(mx - 1, mx + 1, my, face);                      // the mouth stays open in the beard
    }
    // --- glasses: a ring around each eye pair ---
    if (glasses) [exL, exR].forEach(function (x) { c.hline(x, x + 1, ey - 1, ink); c.hline(x, x + 1, ey + 1, ink); c.set(x - 1, ey, ink); c.set(x + 2, ey, ink); });

    // --- hair: hugs the face at the sides, bulges only on top ---
    var cap = union(intersect(head, where(function (x, y) { return y < hairline(x); })),
      intersect(dilate(head), where(function (x, y) { return y < hb - 1; })));
    var far = function (x) { return (x + 0.5 - cx) * -f; };  // distance toward the far side
    var hm = mask();
    if (hair === 'cap') hm = cap;
    if (hair === 'bowl') hm = union(cap, intersect(head, where(function (x, y) { return y < hb + 1 || (y < ey - 1 && Math.abs(x + 0.5 - cx) > rx - 1.3); })));
    if (hair === 'swept') hm = union(cap, intersect(head, where(function (x, y) { return far(x) > -1 && y < Math.min(ey - 1, hb + 1 + far(x) * 0.5); })));
    if (hair === 'bangs') hm = union(cap, intersect(head, where(function (x, y) { return far(x) > 1 && y <= ey && y < hb + 1 + far(x) * 1.2; })));
    if (hair === 'quiff') hm = union(cap, blob(cx + f * 2.5, hb - 2.5, 3.5, 2.5, 2, 0));
    if (hair === 'bun') hm = union(cap, rect(cx - f * 4 - 1, hb - 3, cx - f * 4 + 1, hb - 1));
    if (hair === 'spiky') {
      hm = cap; var top = topRow(cap);
      [cx - 4, cx - 2, cx, cx + 2].forEach(function (x, i) { var sx = x + (f > 0 ? 1 : 0); hm = union(hm, rect(sx, top - 1 - (i % 2), sx, top)); });
    }
    if (hair === 'curly') hm = union(cap, intersect(dilate(cap), where(function (x, y) { return ((x >> 1) & 1) === 0 && y < hb - 1; })));
    if (hair === 'afro') hm = subtract(intersect(dilate(head), where(function (x, y) { return y >= 0 && y < ey; })), intersect(head, where(function (x, y) { return y >= hairline(x) + 1; })));
    if (hair === 'long') hm = union(cap, where(function (x, y) { return y >= hb && y < cy + ry - 1 && (x === Math.floor(cx - rx + 0.5) - 1 || x === Math.ceil(cx + rx - 0.5)); }));
    if (parting && (hair === 'cap' || hair === 'swept' || hair === 'bowl')) hm = subtract(hm, rect(cx - f * 2, hb - 3, cx - f * 2, hb));
    if (hair !== 'bald') c.paint(hm, INK);
    return { tones: c.t };
  }

  var PALETTES = {
    beige: { bg: '#b9af9b', ink: '#3d3a35', light: '#f3ece0', white: '#ffffff' },
    sand: { bg: '#dfd5c9', ink: '#3d3a35', light: '#f6f0e4', white: '#ffffff' },
    blue: { bg: '#0297db', ink: '#143a5e', light: '#e4f3fb', white: '#ffffff' },
    night: { bg: '#172138', ink: '#0e1628', light: '#8fd3ff', white: '#ffffff' },
    green: { bg: '#8cbf6c', ink: '#122a1e', light: '#d4e8b8', white: '#f4fbe6' }
  };

  function cells(seed) { return portrait(seed); }

  function svg(seed, opts) {
    opts = opts || {};
    var pal = (typeof opts.palette === 'object' && opts.palette) || PALETTES[opts.palette] || PALETTES.beige;
    var p = portrait(seed);
    var bg = opts.background === undefined ? pal.bg : opts.background;
    var tone = [pal.ink, pal.light, pal.white || '#ffffff'];
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + G + ' ' + G + '" shape-rendering="crispEdges" role="img" aria-label="pixel avatar">';
    if (bg) s += '<rect width="' + G + '" height="' + G + '" fill="' + bg + '"/>';
    for (var y = 0; y < G; y++) {
      var x = 0;
      while (x < G) {
        var t = p.tones[y * G + x];
        if (t < 0) { x++; continue; }
        var w = 1;
        while (x + w < G && p.tones[y * G + x + w] === t) w++;
        s += '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="1" fill="' + tone[t] + '"/>';
        x += w;
      }
    }
    return s + '</svg>';
  }

  window.dfsPixelAvatar = { svg: svg, cells: cells, palettes: PALETTES, grid: G };
})();

  function dfsPixelAvatars() {
    document.querySelectorAll('[data-pixel-avatar]').forEach(function (el, i) {
      if (el.querySelector('svg')) return;
      var seed = el.getAttribute('data-pixel-avatar') || ('member-' + i);
      var opts = { palette: el.getAttribute('data-pixel-avatar-palette') || 'beige' };
      var bg = el.getAttribute('data-pixel-avatar-bg');
      if (bg === 'none') opts.background = '';
      else if (bg) opts.background = bg;
      el.innerHTML = window.dfsPixelAvatar.svg(seed, opts);
      var svg = el.firstChild;
      svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%'); svg.setAttribute('aria-hidden', 'true');
      svg.style.display = 'block';
    });
  }

  // =========================================================
  // Run
  // Page sections run straight away, like the old Slater page scripts did.
  // Global + Home wait for the whole page, like their old "defer" tags.
  // =========================================================
  var path = location.pathname.replace(/\/+$/, '') || '/';

  // Form pieces first, so the form validation below sees the final radio buttons
  syncRadioNames(document);
  dfsChoiceDates();
  dfsChoiceFields();

  var AUTH_PAGES = ['/login', '/sign-up', '/create-account', '/create-account-2',
    '/forgot-password', '/reset-password'];

  if (path === '/courses/fundamentals') {
    dfsCourse();
    dfsFormValidation();
  } else if (path === '/dashboard') {
    dfsDashboard();
  } else if (path === '/feedback' || path.indexOf('/feedback/') === 0) {
    // /feedback/fundamentals (course), /feedback/rythems (the Rhythms app), ...
    dfsFeedback();
  } else if (path === '/onbaording-test') {
    // Order matters: Feedback sets up the form first, so Form validation skips it.
    dfsFeedback();
    dfsFormValidation();
  } else if (AUTH_PAGES.indexOf(path) > -1) {
    dfsFormValidation();
    dfsSignIn();
  }

  function onPageReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  onPageReady(function () {
    dfsGlobal();
    if (document.querySelector('.oneshot-race')) dfsRaceBars();
    if (document.querySelector('[data-pixel-reveal]')) dfsPixelReveal();
    if (document.querySelector('[data-float]')) dfsFloat();
    if (document.querySelector('[data-stars]')) dfsStars();
    if (document.querySelector('[data-pixel-avatar]')) dfsPixelAvatars();   // before the marquee clones the lists
    if (document.querySelector('[data-marquee-v]')) dfsMarqueeV();
    if (document.querySelector('.oneshot-compare_bar')) dfsTimeBars();
    if (document.querySelector('[data-grid-zips]')) dfsGridZips();
    if (document.querySelector('[data-greet-name]')) dfsGreeting();
    if (document.querySelector('[data-rhythms-app]')) dfsRhythmsApp();
    if (path === '/' || path === '/course' || path === '/test-zone') dfsHome();
  });

})();
