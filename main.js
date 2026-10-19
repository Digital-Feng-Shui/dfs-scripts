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
  //   [data-choice-display="flex"]  optional: how it shows when open (default
  //                                 block; flex keeps the class's gap)
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

  // Site-wide: whenever the page itself changes height (the course menu opening a module, a lesson
  // switching, things that only show after login), tell Lenis, at most once a frame. Without this its
  // cached height goes stale and the bottom of the page can't be reached.
  function dfsScrollHeightWatch() {
    if (!('ResizeObserver' in window)) return;
    var queued = false, last = 0;
    var watch = new ResizeObserver(function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        var h = document.documentElement.scrollHeight;
        if (h !== last) { last = h; relayoutScroll(); }
      });
    });
    // body itself can keep a fixed height while its content grows past it (the course page does),
    // so watch the page's own blocks too: body's children and the main wrapper's children.
    watch.observe(document.body);
    [].slice.call(document.body.children).forEach(function (el) { watch.observe(el); });
    [].slice.call(document.querySelectorAll('.page-wrapper > *, .main-wrapper > *')).forEach(function (el) { watch.observe(el); });
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
          reveal.style.display = reveal.getAttribute('data-choice-display') || 'block';
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

      // The timer exists before the first tick: once the deadline has passed, that first tick stops it
      // straight away (it used to stop a timer that didn't exist yet, which threw and ended dfsGlobal).
      let intervalId = null;
      intervalId = setInterval(tick, 1000);
      tick(); // initial render
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
  // demo: /helper-test shows one lesson in the real player. Nothing is read from or saved to the
  // member's progress, there's no onboarding, and the menu is only for show.
  function dfsCourse(opts) {
    const DEMO = !!(opts && opts.demo);
    // V2 (lessonsFromMenu): lesson switches ease in (text block, cards over the player) instead of cutting
    const SMOOTH = !!(opts && opts.lessonsFromMenu) && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let shownStage = null;
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
    const HYDRATION_INTERVAL = 20 * 60 * 1000; // 20 min (was 30 until v1.7.83) — for testing use 20 * 1000
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
    // V2 (/courses/fundamentals-v2): the lesson list comes from the menu itself, so slots can be added
    // in Webflow without touching this file. data-lesson-extra marks a lesson outside the progress bar
    // (optional lessons, Why, Bonus). Progress is saved under courses['fundamentals-v2'], never under 1.0.
    const lessons = (opts && opts.lessonsFromMenu)
      ? Array.from(document.querySelectorAll('.c_item[id^="lesson-"]')).map(el => ({
          id: el.id, complete: false, extra: el.hasAttribute('data-lesson-extra')
        }))
      : [
      { id: "lesson-0.1", complete: false },
      { id: "lesson-0.2", complete: false },
      // extra: an add-on lesson (Tinko). Prev/Next pass through it, but it doesn't count towards
      // the progress bar and the course never opens on it by itself.
      { id: "lesson-0.3", complete: false, extra: true },
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

    // A lesson that's hidden for this member (lesson 0.3 without Tinko: data-tinko-show="owned")
    // is skipped by Previous/Next.
    function isHiddenLesson(el) {
      return el.matches('[data-tinko-show="owned"]') &&
        document.documentElement.getAttribute('data-tinko') !== 'owned';
    }

    function goToNextLesson(currentLessonId) {
      let index = lessons.findIndex(l => l.id === currentLessonId);
      if (index === -1) return;
      while (++index < lessons.length) {
        const el = document.getElementById(lessons[index].id);
        if (el && !isHiddenLesson(el)) return el.click();
      }
    }

    function goToPreviousLesson(currentLessonId) {
      let index = lessons.findIndex(l => l.id === currentLessonId);
      if (index === -1) return;
      while (--index >= 0) {
        const el = document.getElementById(lessons[index].id);
        if (el && !isHiddenLesson(el)) return el.click();
      }
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
      const counted = lessons.filter(l => !l.extra);
      const completed = counted.filter(l => l.complete).length;
      const total = counted.length;
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
      const firstIncompleteLesson = lessons.find(l => !l.complete && !l.extra);
      // If all complete, use last lesson; otherwise use first incomplete
      const targetLesson = firstIncompleteLesson || lessons[lessons.length - 1];
      const targetLessonElement = document.getElementById(DEMO ? (opts.lesson || 'lesson-2.1') : targetLesson.id);
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
    // V2 cards over the player: the card that leaves fades out first, the player fades under the new card
    // (styles.css), then the card's parts rise in one by one and Tinko on it gets a hello (dfsTinkoMascot).
    function stageParts(stage) {
      const parts = [...stage.querySelectorAll('.tinko-stage_tag, .tinko-stage_title, .tinko-stage_text:not([data-tinko-fallback]), ' +
        '.tinko-stage_actions, .tinko-stage_cta, .btn-icon-link, .tinko-stage_link, .v2-card_links > *')];
      return parts.filter(el => !parts.some(other => other !== el && other.contains(el)));
    }

    function switchStageSmooth(next) {
      const old = shownStage;
      shownStage = next;
      document.querySelectorAll('[data-lesson-stage]').forEach(stage => {
        if (stage === next || stage === old) return;
        gsap.killTweensOf(stage);
        gsap.set(stage, { clearProps: 'opacity' });
        stage.classList.remove('is-active');
      });
      if (old && old !== next) {
        gsap.killTweensOf(old);
        gsap.to(old, { opacity: 0, duration: 0.2, ease: 'power1.in', onComplete() {
          old.classList.remove('is-active');
          gsap.set(old, { clearProps: 'opacity' });
        } });
      }
      if (!next || next === old) return;
      const parts = stageParts(next);
      gsap.killTweensOf([next, ...parts]);
      next.classList.add('is-active');
      gsap.fromTo(next, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: old ? 0.15 : 0.08, ease: 'power1.out',
        clearProps: 'opacity' });
      gsap.fromTo(parts, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.55, delay: 0.22, stagger: 0.06,
        ease: 'power3.out', clearProps: 'opacity,transform' });
      next.querySelectorAll('[data-tinko-mascot]').forEach(m => m.dispatchEvent(new CustomEvent('tinko:hello')));
    }

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
        if (SMOOTH) gsap.fromTo(activeText, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, delay: 0.1,
          ease: 'power2.out', clearProps: 'opacity,transform' });
      }
      // ---- STAGE SWITCH ----
      // A lesson without a video can show a panel in the video's place: a Webflow element with
      // data-lesson-stage="<lesson id>" next to the player. It covers the player while its lesson is open.
      let hasStage = false;
      let nextStage = null;
      document.querySelectorAll('[data-lesson-stage]').forEach(stage => {
        if (stage.getAttribute('data-lesson-stage') === item.id) { nextStage = stage; hasStage = true; }
      });
      if (SMOOTH) switchStageSmooth(nextStage);
      else document.querySelectorAll('[data-lesson-stage]').forEach(stage => stage.classList.toggle('is-active', stage === nextStage));
      if (hasStage) {
        const playing = oldPlayer && oldPlayer.querySelector('video');
        if (playing && !playing.paused) playing.pause();
        return;
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
      if (!DEMO) await loadMemberProgress();
      setInitialState();
      if (!DEMO) setupCourseItemClicks();
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
      if (DEMO) return;
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
    // [data-go-lesson="lesson-0.2"] (V2: "Not installed yet? Meet Tinko" on a Tinko step): opens that lesson
    // through its menu row and glides to its install block, if it has one.
    document.addEventListener('click', (e) => {
      const link = e.target.closest && e.target.closest('[data-go-lesson]');
      if (!link) return;
      e.preventDefault();
      const item = document.getElementById(link.getAttribute('data-go-lesson'));
      if (!item) return;
      item.click();
      const target = document.querySelector('[data-tinko-gate]');
      if (!target) return;
      setTimeout(() => {
        if (window.lenis && typeof window.lenis.scrollTo === 'function') window.lenis.scrollTo(target, { offset: -96 });
        else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 80);
    });

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
        // The loading spinner is an SVG animation that spins every frame, even while it's hidden, and
        // that kept the whole page relaying out 60 times a second. It only plays while loading.
        var spinner = player.querySelector('.bunny-player__loading svg');
        function spin(on) {
          if (!spinner || !spinner.pauseAnimations) return;
          if (on) spinner.unpauseAnimations(); else spinner.pauseAnimations();
        }
        spin(player.getAttribute('data-player-status') === 'loading');
        // Attribute helpers
        function setStatus(s) {
          if (player.getAttribute('data-player-status') !== s) {
            player.setAttribute('data-player-status', s);
          }
          spin(s === 'loading');
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
    if (!DEMO) (function () {
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

            // Add-on lessons (lesson 0.3, Tinko) don't count, same as the progress bar in the course
            const lessons = courseData.lessons.filter(l => l.id !== 'lesson-0.3');
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
    // A menu item says which tab it opens with data-dash-tab="courses|tools|account|orders"; without it,
    // its visible text is used (the old way, which broke when a tab was renamed). Each tab has its own
    // #hash, so /dashboard#tools opens Tools straight away (links from emails, the course, Tinko).
    function initDashboardTabs() {
      const tabs = { courses: 'courses', tools: 'tools', account: 'accountd', orders: 'orders' };
      const byText = { 'courses': 'courses', 'my account': 'account', 'account': 'account', 'orders': 'orders', 'tools': 'tools' };
      const menuItems = [].slice.call(document.querySelectorAll('.menu_item'));
      const keyOf = item => item.getAttribute('data-dash-tab') ||
        byText[(item.querySelector('.menu_txt')?.textContent || '').trim().toLowerCase()];

      function open(key, fromClick) {
        if (!tabs[key]) key = 'courses';
        Object.keys(tabs).forEach(k => {
          const el = document.getElementById(tabs[k]);
          if (el) el.style.display = k === key ? 'flex' : 'none';
        });
        // On phones "Orders" lives inside "My account": its menu item is hidden there
        menuItems.forEach(mi => mi.classList.toggle('is-active', keyOf(mi) === key));
        if (key === 'courses') loadDashboardProgress();
        if (fromClick && history.replaceState) history.replaceState(null, '', key === 'courses' ? location.pathname : '#' + key);
      }

      menuItems.forEach(item => {
        item.addEventListener('click', function (e) {
          const key = keyOf(this);
          if (!tabs[key]) return;
          e.preventDefault();
          open(key, true);
        });
      });
      // The tab blocks have ids, so "#tools" also makes the browser jump past the menu: keep the page at the top
      function toTop() {
        window.scrollTo(0, 0);
        if (window.lenis && typeof window.lenis.scrollTo === 'function') window.lenis.scrollTo(0, { immediate: true });
      }
      open((location.hash || '').replace('#', ''));
      if (location.hash) {
        toTop();
        if (document.readyState === 'complete') setTimeout(toTop, 50);
        else window.addEventListener('load', () => setTimeout(toTop, 0), { once: true });
      }
      window.addEventListener('hashchange', () => { open((location.hash || '').replace('#', '')); toTop(); });
    }

    // ---- NAME ----
    // Buyers get their first name from Stripe (Make), but not everyone has one. Without a name the
    // greeting reads "Welcome back" instead of showing the placeholder, and the account row says so.
    function showName() {
      whenMemberstackReady(function () {
        window.$memberstackDom.getCurrentMember().then(function (res) {
          const f = (res && res.data && res.data.customFields) || {};
          const name = f['first-name'] ? String(f['first-name']).trim() : '';
          document.querySelectorAll('[data-ms-member="first-name"]').forEach(function (el) {
            if (name) { el.textContent = name; return; }
            if (el.closest('.toop_dash')) el.style.display = 'none';
            else el.textContent = 'Not set';
          });
          if (!name) document.querySelectorAll('.toop_dash .welcome_txt').forEach(function (el) { el.textContent = 'Welcome back'; });
        }).catch(function () {});
      });
    }
    showName();
    setTimeout(showName, 1500); // Memberstack fills these fields itself too, sometimes after us

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
  // The app window is real HTML in Webflow ([data-rhythms-app]); this makes it behave like the
  // Mac app (dfs-focus: RhythmsView.swift, RhythmEditor.swift, TargetPicker.swift), detail for detail:
  // - the list: lock tile, day letters + hours, switch; with the panel closed, what each one closes
  // - the panel edits a copy: Save keeps it, ✕ drops it, another card opens that one instead
  // - Type to unlock opens greyed out ("Add only" / "Unlock…"); "Unlock…" and switching one off ask
  //   for the typed text right in the panel, the app's own texts; Sealed is shut while it runs;
  //   switching on and adding are always free. One website extra: in add-only mode, what you just
  //   added can go again (it was never part of the saved rhythm).
  // - "All day, every day" folds the times away; Sealed can't be all day, every day
  // Icons come from the marquee chips further down the page; names, domains and the "all at once"
  // groups from the app's Catalog. Exposes window.dfsRhythms.sitesOf(name) for the toast.
  // =========================================================
  function dfsRhythmsApp() {
    var app = document.querySelector('[data-rhythms-app]');
    if (!app) return;
    var $ = function (s, el) { return (el || app).querySelector(s); };
    var $$ = function (s, el) { return [].slice.call((el || app).querySelectorAll(s)); };
    var gs = window.gsap;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var W = 928;
    function make(tag, cls, html) {
      var el = document.createElement(tag);
      if (cls) el.className = cls;
      if (html != null) el.innerHTML = html;
      return el;
    }
    function shake(el) {
      if (!gs || reduce || !el) return;
      gs.fromTo(el, { x: 0 }, { x: 0, duration: 0.4, keyframes: { x: [-5, 5, -3, 3, 0] }, ease: 'power2.out' });
    }
    var copy = function (o) { return JSON.parse(JSON.stringify(o)); };
    var changed = function () { window.dispatchEvent(new Event('dfs-rhythms-change')); };

    // Scale the 928px-wide window to whatever width it gets
    var frame = app.parentNode;
    function fit() { app.style.transform = 'scale(' + (frame.clientWidth / W) + ')'; }
    fit();
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(frame);
    var shot = document.querySelector('.rhythms-window_image');
    if (shot) shot.classList.add('is-replaced');

    // ---------- icons ----------
    var svg = function (w, inner, extra) {
      return '<svg viewBox="0 0 24 24" width="' + w + '" height="' + w + '" fill="none" stroke="currentColor" stroke-width="1.6" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"' + (extra || '') + '>' + inner + '</svg>';
    };
    var pixels = function (rects) {
      return '<svg viewBox="0 0 9 9" width="11.25" height="11.25" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">' +
        rects.map(function (r) { return '<rect x="' + r[0] + '" y="' + r[1] + '" width="' + r[2] + '" height="' + r[3] + '"/>'; }).join('') + '</svg>';
    };
    var lockIcon = function (lock) { var el = $('[data-app-lock="' + lock + '"] .rhythms-app_lock-icon'); return el ? el.innerHTML : ''; };
    var ICON = {
      none: lockIcon('none'), type: lockIcon('type'), sealed: lockIcon('sealed'),
      x: svg(11, '<path d="M6 6l12 12M18 6 6 18"/>'),
      plus: svg(14, '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'),
      added: '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="currentColor"/>' +
        '<path d="M7.5 12.5l3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      check: svg(10, '<path d="M5 12.5l4.5 4.5L19 7.5"/>', ' stroke-width="3.2"'),
      // Settings: eight teeth and a ring, drawn after the app's gearshape symbol
      gear: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round" aria-hidden="true">' +
        '<path d="M10.57 1.14A10.95 10.95 0 0 1 13.43 1.14L14.62 4.18A8.25 8.25 0 0 1 15.68 4.62L18.67 3.31A10.95 10.95 0 0 1 20.69 5.33L19.38 8.32A8.25 8.25 0 0 1 19.82 9.38L22.86 10.57A10.95 10.95 0 0 1 22.86 13.43L19.82 14.62A8.25 8.25 0 0 1 19.38 15.68L20.69 18.67A10.95 10.95 0 0 1 18.67 20.69L15.68 19.38A8.25 8.25 0 0 1 14.62 19.82L13.43 22.86A10.95 10.95 0 0 1 10.57 22.86L9.38 19.82A8.25 8.25 0 0 1 8.32 19.38L5.33 20.69A10.95 10.95 0 0 1 3.31 18.67L4.62 15.68A8.25 8.25 0 0 1 4.18 14.62L1.14 13.43A10.95 10.95 0 0 1 1.14 10.57L4.18 9.38A8.25 8.25 0 0 1 4.62 8.32L3.31 5.33A10.95 10.95 0 0 1 5.33 3.31L8.32 4.62A8.25 8.25 0 0 1 9.38 4.18Z"/>' +
        '<circle cx="12" cy="12" r="3.4"/></svg>',
      // Light and dark mode: the app's pixel moon and sun (PixelIcon, a 9 × 9 grid, same as the site's switch)
      moon: pixels([[3, 0, 4, 1], [1, 1, 4, 1], [1, 2, 3, 1], [0, 3, 3, 3], [1, 6, 3, 1], [1, 7, 4, 1], [3, 8, 4, 1]]),
      sun: pixels([[4, 0, 1, 1], [1, 1, 1, 1], [7, 1, 1, 1], [3, 2, 3, 1], [2, 3, 5, 3], [0, 4, 1, 1], [8, 4, 1, 1],
        [3, 6, 3, 1], [1, 7, 1, 1], [7, 7, 1, 1], [4, 8, 1, 1]]),
      chat: svg(12, '<path d="M4 4.5h10a2 2 0 0 1 2 2V12a2 2 0 0 1-2 2H9l-3.5 3v-3H4a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z"/><path d="M19 9h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1.5v3L15 18h-3a2 2 0 0 1-2-1.6"/>'),
      // The two kinds, after the app's calendar and hourglass symbols
      calendar: svg(13, '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/><path d="M8 13h.01M12 13h.01M16 13h.01M8 16.5h.01M12 16.5h.01M16 16.5h.01" stroke-width="2.2"/>'),
      hourglass: svg(13, '<path d="M6.5 3h11M6.5 21h11M7.5 3v2.5a4.5 4.5 0 0 0 2 3.7L12 11l2.5-1.8a4.5 4.5 0 0 0 2-3.7V3M7.5 21v-2.5a4.5 4.5 0 0 1 2-3.7L12 13l2.5 1.8a4.5 4.5 0 0 1 2 3.7V21"/><path d="M9.5 18.5h5" stroke-width="2"/>'),
      minus: svg(12, '<path d="M6 12h12"/>'),
      add: svg(12, '<path d="M12 6v12M6 12h12"/>'),
      // Rim's pixel heart (BetaCorner), 7 × 6
      heart: '<svg viewBox="0 0 7 6" width="10.5" height="9" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">' +
        '<path d="M1 0h2v1H1zM4 0h2v1H4zM0 1h7v2H0zM1 3h5v1H1zM2 4h3v1H2zM3 5h1v1H3z"/></svg>'
    };
    // Button words whose letters roll up one by one on hover, like the app's RollingText (and the site's buttons)
    function roll(el, text) {
      if (el.getAttribute('data-roll') === text) return;
      el.setAttribute('data-roll', text);
      el.classList.add('has-roll');
      el.innerHTML = '<span class="rhythms-roll" aria-hidden="true">' + text.split('').map(function (c, i) {
        return '<b style="transition-delay:' + (i / 100).toFixed(2) + 's">' + (c === ' ' ? '&nbsp;' : c) + '</b>';
      }).join('') + '</span>';
      el.setAttribute('aria-label', text);
    }

    // ---------- what can be closed ----------
    var ICONS = {};
    $$('.rhythms-chip', document.querySelector('.rhythms-marquee_list') || document).forEach(function (chip) {
      var name = (chip.querySelector('.rhythms-chip_name') || {}).textContent, img = chip.querySelector('img');
      if (name && img) ICONS[name.trim()] = img.getAttribute('src');
    });
    // The app's Catalog: each name and the domain shown under it ('' = only a Mac app)
    var DOMAIN = {
      'Instagram': 'instagram.com', 'Facebook': 'facebook.com', 'TikTok': 'tiktok.com', 'X (Twitter)': 'x.com',
      'Reddit': 'reddit.com', 'LinkedIn': 'linkedin.com', 'Pinterest': 'pinterest.com', 'Snapchat': 'snapchat.com',
      'Threads': 'threads.net', 'Bluesky': 'bsky.app', 'Tumblr': 'tumblr.com',
      'YouTube': 'youtube.com', 'Netflix': 'netflix.com', 'Hulu': 'hulu.com', 'Max': 'max.com', 'Disney+': 'disneyplus.com',
      'Prime Video': 'primevideo.com', 'Peacock': 'peacocktv.com', 'Paramount+': 'paramountplus.com', 'Twitch': 'twitch.tv',
      'CNN': 'cnn.com', 'Fox News': 'foxnews.com', 'The New York Times': 'nytimes.com', 'The Washington Post': 'washingtonpost.com',
      'The Wall Street Journal': 'wsj.com', 'NBC News': 'nbcnews.com', 'CBS News': 'cbsnews.com', 'ABC News': 'abcnews.go.com',
      'NPR': 'npr.org', 'USA Today': 'usatoday.com', 'Yahoo News': 'news.yahoo.com', 'ESPN': 'espn.com',
      'Amazon': 'amazon.com', 'eBay': 'ebay.com', 'Etsy': 'etsy.com', 'Walmart': 'walmart.com', 'Target': 'target.com',
      'Temu': 'temu.com', 'Shein': 'shein.com', 'AliExpress': 'aliexpress.com', 'Best Buy': 'bestbuy.com',
      'WhatsApp': 'web.whatsapp.com', 'Discord': 'discord.com', 'Telegram': 'web.telegram.org', 'Slack': 'app.slack.com',
      'Messenger': 'messenger.com', 'Messages': ''
    };
    var MAC_APP = { 'WhatsApp': 1, 'Discord': 1, 'Telegram': 1, 'Slack': 1, 'Messenger': 1, 'Messages': 1 };
    var GROUPS = {
      social: ['Instagram', 'Facebook', 'TikTok', 'X (Twitter)', 'Reddit', 'LinkedIn', 'Pinterest', 'Snapchat', 'Threads', 'Bluesky', 'Tumblr'],
      video: ['YouTube', 'Netflix', 'Hulu', 'Max', 'Disney+', 'Prime Video', 'Peacock', 'Paramount+', 'Twitch'],
      news: ['CNN', 'Fox News', 'The New York Times', 'The Washington Post', 'The Wall Street Journal', 'NBC News', 'CBS News', 'ABC News', 'NPR', 'USA Today', 'Yahoo News', 'ESPN'],
      shopping: ['Amazon', 'eBay', 'Etsy', 'Walmart', 'Target', 'Temu', 'Shein', 'AliExpress', 'Best Buy'],
      chat: ['WhatsApp', 'Discord', 'Telegram', 'Slack', 'Messenger', 'Messages']
    };
    // "https://www.example.com/page" → "example.com", like Catalog.customDomain
    function customDomain(q) {
      var t = q.toLowerCase().trim().replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
      return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(t) ? t : null;
    }

    // ---------- the rhythms ----------
    // Days run Monday … Sunday. A time with the same start and end is all day.
    var EVERY = [1, 1, 1, 1, 1, 1, 1], WEEKDAYS = [1, 1, 1, 1, 1, 0, 0];
    var H = function (h, m) { return h * 60 + (m || 0); };
    var uid = 0;
    var win = function (days, from, to) { return { id: 'w' + (++uid), days: days.slice(), from: from, to: to }; };
    var blankTimes = function () { return [win(WEEKDAYS, H(9), H(17))]; };
    var saved = {
      deep: { name: 'Deep work', on: true, always: false, windows: [win(WEEKDAYS, H(9), H(12, 30))],
        sites: ['Instagram', 'YouTube', 'X (Twitter)', 'Reddit', 'CNN', 'The New York Times'], adult: false, lock: 'type', effort: 'medium' },
      evenings: { name: 'Evenings', on: true, always: false, windows: [win(EVERY, H(21, 30), H(7))],
        sites: ['TikTok', 'YouTube', 'Instagram', 'Netflix', 'Reddit'], adult: false, lock: 'sealed', effort: 'none' },
      sundays: { name: 'Slow Sundays', on: true, always: false, windows: [win([0, 0, 0, 0, 0, 0, 1], 0, 0)],
        sites: ['Slack', 'Amazon', 'Temu'], adult: false, lock: 'none', effort: 'medium' },
      // All day, every day can't be Sealed (it would never open again), so this one asks for a text
      peace: { name: 'Peace of mind', on: true, always: true, windows: blankTimes(),
        sites: [], adult: true, lock: 'type', effort: 'hard' }
    };
    // An Hourglass: open until its time a day is used, then it rests until midnight (Hourglass.swift)
    saved.shows = { name: 'Shows', on: true, always: false, windows: blankTimes(), limit: 45, days: EVERY.slice(), left: 32 * 60 + 10,
      sites: ['Netflix'], adult: false, lock: 'none', effort: 'medium' };
    var order = ['deep', 'evenings', 'sundays', 'peace', 'shows'];
    var isLimit = function (r) { return r.limit != null; };
    // "45m", "1h", "1h 30m" (Format.duration); a countdown "32:10"
    function duration(m) { var h = Math.floor(m / 60), r = m % 60; return !h ? r + 'm' : r ? h + 'h ' + r + 'm' : h + 'h'; }
    function countdown(sec) { sec = Math.max(0, Math.ceil(sec)); var h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, r = sec % 60;
      return h ? h + ':' + pad(m) + ':' + pad(r) : m + ':' + pad(r); }
    var QUICK = [15, 30, 45, 60, 90, 120];

    var LOCK = {
      none: { title: 'No lock', note: 'Change it whenever you like.',
        tip: 'Start open. Live with this rhythm for a week and you’ll know how firm it needs to be.', efforts: [] },
      type: { title: 'Type to unlock', note: 'Removing anything or switching it off takes a typed text first. Adding stays free.',
        tip: 'Long enough to notice the reflex before you act on it.', efforts: ['easy', 'medium', 'hard', 'intense'], effort: 'medium' },
      sealed: { title: 'Sealed', note: 'Nothing can be loosened while it runs. Around it, you type first.',
        open: 'Nothing can be loosened while it runs. Around it, it’s open.',
        tip: 'For the hours you know you’ll bargain with yourself. Decide once, on a clear day.', efforts: ['none', 'easy', 'medium'], effort: 'none' }
    };
    var EFFORT = {
      none: ['No', 'open'],
      easy: ['Easy', '1 min', 'Just enough to break the autopilot, while you’re still shaping this rhythm.'],
      medium: ['Medium', '2 min', 'Long enough to notice the reflex before you act on it. Our pick.'],
      hard: ['Hard', '3½ min', 'Long enough for the urge to fade before you reach the last line.'],
      intense: ['Intense', '5 min', 'For the rhythms that guard your deepest work. Finish this, and you really meant it.']
    };
    var RANK = ['none', 'easy', 'medium', 'hard', 'intense'];
    // Type to unlock: how long the text is per effort, and the texts themselves (the app's UnlockTexts)
    var CHARS = { easy: 150, medium: 300, hard: 500, intense: 800 };
    var OPENERS = [
      'You made this rhythm on a clear day, for a moment exactly like this one. The version of you that set it knew this feeling would come, and decided in advance.',
      'This urge to open it again is a reflex, not a decision. You trained it one empty moment at a time. Typing this slowly is the first time it gets to be a choice.',
      'Notice what happened just before you came here. A gap, a doubt, a small discomfort. The reach for something to fill it is old wiring. It isn\'t part of you.',
      'Every badge and feed behind this block was placed there by someone paid to take your attention. You closed the door on purpose. Ask who wants it open now.',
      'Distraction rarely arrives as a big event. It\'s a slow drift: one quick look, then another. This text is here to make the drift visible before it carries you off.',
      'You are not lazy and you are not broken. You designed your space to protect what matters, and right now that design is doing exactly what you asked of it.',
      'Most of the pull you feel right now doesn\'t come from you. It comes from an environment built to keep you consuming. You redesigned yours. This is it working.',
      'If you\'re typing this, part of you already knows the answer. This rhythm was never about willpower. It was about not having to decide in the moment.'
    ];
    var MIDDLES = [
      'Attention is water and your space is the channel. When the channel is clear, attention moves in one direction. Open this, and it splits into every direction at once.',
      'An interruption doesn\'t end when you close the tab. Part of your mind stays behind, and coming fully back can take up to twenty minutes. That is the real price of a quick look.',
      'Depth is momentum, and momentum takes time to build. A few minutes somewhere else and you start again from cold, loading everything back in, one piece at a time.',
      'The empty moment you\'re trying to fill is where your mind does its best connecting. Leave it empty for a while. The idea you\'re missing might be waiting on the other side.',
      'Boredom feels like a problem to solve. It\'s usually the door to something better. Everything worth having in this space sits on the other side of the discomfort.',
      'You don\'t have to earn the empty moment. It was always yours. Rest isn\'t stepping away from the work. It\'s part of it.',
      'Focus problems are design problems. You already did the design. The only thing left is to let it work, even when it feels a little uncomfortable.',
      'Small friction compounds. So does small freedom. Each time you let this block stand, the next empty moment gets a little easier to sit with.',
      'A Default runs on settings they never chose. A Flow Architect decides in advance where their attention goes. This block is one of those decisions.',
      'Your attention is already flowing somewhere. The only question is whether you chose where. When you set this rhythm, you did.',
      'A mind that can\'t sit still can\'t go deep. Every quiet moment you let be makes the next one easier. The discomfort only means the old reflex is letting go.',
      'Stillness is where unrelated ideas collide and connect. Fill the space with a feed and that process stays off. The silence has to be real for it to work.',
      'Pushing harder inside a broken system only feeds the loop. You fixed the system instead. Trust it a little longer than feels comfortable.',
      'What\'s behind this block will still be there later. The focus you have right now won\'t wait the same way. Only one of them needs protecting.',
      'The depth you\'re after doesn\'t come from more effort. It opens up in a mind with room to spare. This block is how you keep that room.'
    ];
    var CLOSERS = [
      'So take a breath and look at what you\'re about to undo. If it still feels right, keep typing. If not, close this and go back to what you came here to do.',
      'You can finish this text and open it again. Or you can stop here, close this panel, and give the version of you who set this rhythm the benefit of the doubt.',
      'Nothing bad happens if you keep going. Nothing bad happens if you stop. But only one of those is the choice you designed.',
      'The block will end on its own, right on schedule. Until then, the most useful thing you can do might be nothing at all.',
      'Read it back once. If you still want this, finish the text. If something shifted while you typed, that shift is worth listening to.',
      'This isn\'t a punishment. It\'s a pause between the reflex and the action. Whatever you decide now, decide it on purpose.'
    ];
    var pick = function (list) { return list[Math.floor(Math.random() * list.length)]; };
    // A fresh piece of about `length` characters, ending on a full sentence (UnlockTexts.make)
    function unlockText(length) {
      if (length <= 200) {
        var fit = OPENERS.concat(MIDDLES).filter(function (t) { return t.length >= length * 3 / 4; });
        return pick(fit.length ? fit : OPENERS);
      }
      var parts = [pick(OPENERS)], closer = pick(CLOSERS), pool = MIDDLES.slice();
      for (var i = pool.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
      var total = parts[0].length + 1 + closer.length;
      while (pool.length && Math.abs(total + pool[pool.length - 1].length + 1 - length) < Math.abs(total - length)) {
        var next = pool.pop(); parts.push(next); total += next.length + 1;
      }
      parts.push(closer);
      return parts.join(' ');
    }

    var allDay = function (w) { return w.from === w.to; };
    var isAlways = function (r) { return r.always || r.windows.some(function (w) { return allDay(w) && w.days.every(Boolean); }); };
    var schedule = function (r) { return isLimit(r) ? [] : r.always ? [{ id: 'always', days: EVERY, from: 0, to: 0 }] : r.windows; };
    var closes = function (r) { return r.sites.length > 0 || r.adult; };
    var asksForText = function (r) { return r.lock === 'type' || (r.lock === 'sealed' && r.effort !== 'none'); };

    // ---------- the clock: minutes since Monday 00:00; the menu bar says Wed 21:47 ----------
    var NOW = 2 * 1440 + H(21, 47);
    var LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var clock = function (m) { m = ((m % 1440) + 1440) % 1440; return pad(Math.floor(m / 60)) + ':' + pad(m % 60); };
    var dayOf = function (t) { return Math.floor(t / 1440); };
    function winActive(w, t) {
      var d = dayOf(t) % 7, m = t % 1440, y = (d + 6) % 7;
      if (allDay(w)) return !!w.days[d];
      if (w.to > w.from) return !!w.days[d] && m >= w.from && m < w.to;
      return (!!w.days[d] && m >= w.from) || (!!w.days[y] && m < w.to);
    }
    function winEnd(w, t) {
      var day0 = t - t % 1440;
      if (allDay(w)) return day0 + 1440;
      return day0 + w.to > t ? day0 + w.to : day0 + w.to + 1440;
    }
    var isActive = function (r) { return r.on && closes(r) && schedule(r).some(function (w) { return winActive(w, NOW); }); };
    var frozen = function (r) { return r.lock === 'sealed' && isActive(r); };
    // When it opens again; times that follow on from each other count as one stretch
    function endOf(r) {
      if (!isActive(r) || isAlways(r)) return null;
      var end = NOW;
      for (var i = 0; i < 14; i++) {
        var next = schedule(r).filter(function (w) { return winActive(w, end); })
          .reduce(function (a, w) { return Math.max(a, winEnd(w, end)); }, 0);
        if (next <= end) break;
        end = next;
      }
      return end;
    }
    function moment(t) {
      var gap = dayOf(t) - dayOf(NOW), c = clock(t);
      if (gap === 0) return c;
      if (gap === 1) return c === '00:00' ? 'midnight' : 'tomorrow ' + c;
      return LONG[dayOf(t) % 7] + ' ' + c;
    }
    function at(t) {
      var gap = dayOf(t) - dayOf(NOW), c = clock(t);
      if (gap === 0) return 'at ' + c;
      if (gap === 1) return 'tomorrow at ' + c;
      return LONG[dayOf(t) % 7] + ' at ' + c;
    }
    var until = function (r) { var e = endOf(r); return e == null ? 'all day, every day' : 'until ' + moment(e); };
    function nextStart(r) {
      if (!r.on || !closes(r)) return null;
      var best = null, today = NOW - NOW % 1440;
      schedule(r).forEach(function (w) {
        for (var off = 0; off <= 7; off++) {
          var d0 = today + off * 1440;
          if (!w.days[dayOf(d0) % 7]) continue;
          var start = allDay(w) ? d0 : d0 + w.from;
          if (start > NOW) { if (best == null || start < best) best = start; break; }
        }
      });
      return best;
    }

    // ---------- the panel's parts, found once ----------
    var body = $('.rhythms-app_body');
    var edit = $('.rhythms-app_edit');
    var scroll = $('.rhythms-app_edit-scroll');
    var nameEl = $('[data-app-name]');
    var statusEl = $('[data-app-status]');
    // Group what follows each section label (When, What closes, Lock), so a section can lock as one
    var sec = {}, cur = null;
    [].slice.call(scroll.children).forEach(function (el) {
      if (el.classList.contains('rhythms-app_label')) {
        var t = el.textContent.trim().toLowerCase();
        var key = t.indexOf('when') === 0 ? 'when' : t.indexOf('what') === 0 ? 'what' : 'lock';
        cur = make('div', 'rhythms-app_sec');
        scroll.insertBefore(cur, el);
        sec[key] = cur;
        el.appendChild(make('span', 'rhythms-app_sec-lock', ICON.sealed));
      }
      if (cur) cur.appendChild(el);
    });
    // The lock banner, between the title and the sections
    var banner = make('div', 'rhythms-app_banner',
      '<div class="rhythms-app_banner-icon">' + ICON.sealed + '</div><div class="rhythms-app_banner-body">' +
      '<div class="rhythms-app_banner-title"></div><div class="rhythms-app_banner-text"></div>' +
      '<div class="rhythms-app_banner-actions"><div class="rhythms-app_add-time" data-banner="add" role="button">ADD ONLY</div>' +
      '<div class="rhythms-app_save" data-banner="unlock" role="button">UNLOCK…</div></div></div>');
    scroll.insertBefore(banner, sec.when);
    // Typing to unlock happens right here in the panel, like the app's UnlockView: the two labels
    // under the title, a dashed line, the text and the field to type it in; the footer becomes
    // the count, "Never mind" and "Unlock"
    var tags = make('div', 'rhythms-app_tags', '<span class="rhythms-app_tag">LOCKED</span><span class="rhythms-app_tag is-sand">TYPE TO UNLOCK</span>');
    statusEl.parentNode.insertBefore(tags, statusEl.nextSibling);
    var unlockView = make('div', 'rhythms-app_unlock',
      '<div class="rhythms-app_unlock-line"></div><div class="rhythms-app_unlock-ask">A moment to ask: do I really want this?</div>' +
      '<div class="rhythms-app_unlock-text"></div><div class="rhythms-app_unlock-field"><textarea class="rhythms-app_unlock-area" ' +
      'placeholder="Type the text above…" aria-label="Type the text above" spellcheck="false" autocomplete="off" autocorrect="off" ' +
      'autocapitalize="off" data-gramm="false"></textarea></div>');
    scroll.insertBefore(unlockView, sec.when);
    var unlockTextEl = $('.rhythms-app_unlock-text', unlockView);
    var unlockField = $('.rhythms-app_unlock-field', unlockView);
    var area = $('textarea', unlockView);
    var foot = $('.rhythms-app_foot');
    var unlockFoot = make('div', 'rhythms-app_foot rhythms-app_unlock-foot',
      '<div class="rhythms-app_unlock-count"></div><div class="rhythms-app_add-time" data-unlock="cancel" role="button">NEVER MIND</div>' +
      '<div class="rhythms-app_save" data-unlock="go" role="button">UNLOCK</div>');
    foot.parentNode.insertBefore(unlockFoot, foot.nextSibling);
    var unlockCount = $('.rhythms-app_unlock-count', unlockFoot);
    // The panel's ✕
    var closeBtn = make('div', 'rhythms-app_icon-btn rhythms-app_close', ICON.x);
    closeBtn.setAttribute('role', 'button');
    closeBtn.setAttribute('aria-label', 'Close');
    edit.appendChild(closeBtn);

    // Kind (a new rhythm only): Set hours or Hourglass, as tiles like the lock tiles
    var infoSvg = ($('.rhythms-app_label > svg', sec.when) || {}).outerHTML || '';
    var kindSec = make('div', 'rhythms-app_sec rhythms-app_kind-sec',
      '<div class="rhythms-app_label">KIND</div><div class="rhythms-app_kinds">' +
      [['hours', ICON.calendar, 'Set hours', 'Closed at the times you choose'],
        ['limit', ICON.hourglass, 'Hourglass', 'Open until your time is used, then rests until midnight']].map(function (k) {
        return '<div class="rhythms-app_lock rhythms-app_kind" data-kind="' + k[0] + '" role="button"><div class="rhythms-app_lock-icon">' + k[1] + '</div>' +
          '<div><div class="rhythms-app_kind-title">' + k[2] + '</div><div class="rhythms-app_kind-detail">' + k[3] + '</div></div></div>';
      }).join('') + '</div>');
    scroll.insertBefore(kindSec, sec.when);
    // Hourglass: how much a day (five-minute steps, 5 minutes to 8 hours), a few quick picks, and the days
    var limitSec = make('div', 'rhythms-app_sec rhythms-app_limit-sec',
      '<div class="rhythms-app_label" title="Time counts while one of these apps is in front, or one of these sites is the tab you’re looking at. Away from the Mac, it doesn’t count.">HOURGLASS' + infoSvg + '</div>' +
      '<div class="rhythms-app_box rhythms-app_limit"><div class="rhythms-app_limit-top"><div><div class="rhythms-app_limit-time"></div>' +
      '<div class="rhythms-app_limit-sub">A DAY</div></div><div class="rhythms-app_tools">' +
      '<div class="rhythms-app_icon-btn" data-limit-step="-5" role="button" aria-label="5 minutes less" title="5 minutes less">' + ICON.minus + '</div>' +
      '<div class="rhythms-app_icon-btn" data-limit-step="5" role="button" aria-label="5 minutes more" title="5 minutes more">' + ICON.add + '</div></div></div>' +
      '<div class="rhythms-app_days">' + QUICK.map(function (q) { return '<div class="rhythms-app_day" data-limit-quick="' + q + '">' + duration(q) + '</div>'; }).join('') + '</div>' +
      '<div class="rhythms-app_days">' + ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(function (d, i) { return '<div class="rhythms-app_day" data-limit-day="' + i + '">' + d + '</div>'; }).join('') + '</div></div>');
    scroll.insertBefore(limitSec, sec.when);
    [kindSec, limitSec].forEach(function (el) { $('.rhythms-app_label', el).appendChild(make('span', 'rhythms-app_sec-lock', ICON.sealed)); });
    var whatLabel = $('.rhythms-app_label', sec.what);
    var locksEl = $('.rhythms-app_locks');

    // When: the switch, then the times folded underneath it
    var alldayRow = $('.rhythms-app_allday');
    var alldayToggle = $('[data-app-allday]');
    var chartEl = $('[data-app-chart]');
    var winTpl = $('[data-app-when]');
    var addTime = $('.rhythms-app_add-time', sec.when);
    var fold = make('div', 'rhythms-app_fold');
    sec.when.insertBefore(fold, chartEl);
    var winsEl = make('div', 'rhythms-app_windows');
    var addRow = make('div', 'rhythms-app_add-row');
    var undoHint = make('div', 'rhythms-app_undo', '⌘+Z TO UNDO');
    undoHint.setAttribute('role', 'button');
    var alwaysHintRow = make('div', 'rhythms-app_add-row is-end');
    fold.appendChild(chartEl);
    fold.appendChild(winsEl);
    fold.appendChild(addRow);
    addRow.appendChild(addTime);
    sec.when.appendChild(alwaysHintRow);
    winTpl.parentNode && winTpl.parentNode.removeChild(winTpl);
    winTpl.removeAttribute('data-app-when');
    $$('[data-app-day]', winTpl).forEach(function (d) { d.classList.remove('is-on'); });
    var segTpl = $('[data-app-template="seg"]');

    // What closes: chips, search with results, the groups, adult sites
    var chipsEl = $('[data-app-chips]');
    var chipTpl = $('[data-app-template="chip"]');
    var nameOf = function (el) { return $('.rhythms-app_chip-name', el) || $('span:not([data-app-remove])', el); };
    var searchWrap = $('.rhythms-app_search');
    var suggestEl = $('[data-app-suggest]');
    if (suggestEl) suggestEl.style.display = 'none';
    var resultsEl = make('div', 'rhythms-app_results');
    searchWrap.parentNode.insertBefore(resultsEl, searchWrap.nextSibling);
    var orEl = $('.rhythms-app_or');
    var groupsEl = $('.rhythms-app_groups');
    var shopping = $('[data-app-group="shopping"]');
    if (shopping && !$('[data-app-group="chat"]')) {
      var chatGroup = shopping.cloneNode(true);
      chatGroup.setAttribute('data-app-group', 'chat');
      chatGroup.innerHTML = ICON.chat + '<span>Chat</span>';
      groupsEl.appendChild(chatGroup);
    }
    var adultBox = make('div', 'rhythms-app_adult',
      '<div class="rhythms-app_check">' + ICON.check + '</div><div><div class="rhythms-app_adult-title">Block adult sites</div>' +
      '<div class="rhythms-app_adult-sub"></div></div>');
    adultBox.setAttribute('role', 'checkbox');
    sec.what.appendChild(adultBox);

    // Lock: the tiles, the line under them, the effort chips (Sealed asks about the hours around it), the tip
    var effortsEl = $('[data-app-efforts]');
    var effortEls = $$('[data-app-effort]');
    var effortsLabel = make('div', 'rhythms-app_efforts-label', 'OUTSIDE ITS HOURS, TYPE TO UNLOCK?');
    effortsEl.parentNode.insertBefore(effortsLabel, effortsEl);
    var sealedTile = $('[data-app-lock="sealed"]');

    // The list: a short "what it closes" on each card, shown while the panel is closed
    var cardsEl = $('[data-app-cards]');
    var cardTpl = $('[data-app-card]').cloneNode(true);
    var cardFor = function (key) { return $('[data-app-card="' + key + '"]'); };
    function addStack(card) {
      if ($('.rhythms-app_card-stack', card)) return;
      card.insertBefore(make('div', 'rhythms-app_card-stack'), $('[data-app-toggle]', card));
    }
    $$('[data-app-card]').forEach(addStack);

    // The header, like the app: the pixel moon is a sun at night; Settings is a gear that turns a
    // quarter on hover, like the panel's ✕
    var nightBtn = $('[data-app-night]');
    var settingsBtn = $$('.rhythms-app_icon-btn', $('.rhythms-app_tools'))[1];
    if (settingsBtn) { settingsBtn.innerHTML = ICON.gear; settingsBtn.setAttribute('aria-label', 'Settings'); settingsBtn.setAttribute('role', 'button'); settingsBtn.classList.add('is-turning'); }
    closeBtn.classList.add('is-turning');
    function paintNight() { if (nightBtn) nightBtn.innerHTML = document.documentElement.classList.contains('dfs-night') ? ICON.sun : ICON.moon; }
    paintNight();
    new MutationObserver(paintNight).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    if (nightBtn) nightBtn.addEventListener('click', function () {
      var real = document.querySelector('.dfs-night-toggle');
      if (real) real.click(); // same as the site's own switch, so the choice is remembered
    });

    // ---------- state ----------
    var open = null;          // the rhythm in the panel: a key, 'new', or null when the panel is closed
    var draft = null;         // what the panel edits
    var addOnly = false;      // "Add only" was clicked, for this visit to the panel
    var unlocked = false;     // the text was typed, for this visit to the panel
    var unlocking = null;     // typing to unlock: { mode: 'edit' | 'switch', key, target, mismatch }
    var history = [];         // ⌘Z
    var fresh = [];           // chips that should pop in
    var newCount = 0;
    var ready = false;        // the first panel shows without sliding in
    var inSettings = false;   // Settings is open in the panel

    var original = function () { return open && open !== 'new' ? saved[open] : null; };
    function modes() {
      var s = original();
      var isFrozen = !!s && frozen(s);
      var restricted = !!s && asksForText(s) && !unlocked;
      return { s: s, isNew: !s, isFrozen: isFrozen, restricted: restricted,
        lockedView: isFrozen || (restricted && !addOnly) };
    }
    // True if the change only makes the rhythm stricter (Rhythm.allowsWithoutUnlock)
    function stricter(o, c) {
      // An Hourglass is stricter with less time, the same days or more, and nothing taken out
      if (isLimit(o)) return o.sites.every(function (n) { return c.sites.indexOf(n) > -1; }) && c.limit <= o.limit &&
        o.days.every(function (d, i) { return !d || c.days[i]; }) && c.lock === o.lock &&
        RANK.indexOf(c.effort) >= RANK.indexOf(o.effort) && (c.on || !o.on);
      var same = function (a, b) { return a.from === b.from && a.to === b.to && a.days.join() === b.days.join(); };
      return o.sites.every(function (n) { return c.sites.indexOf(n) > -1; }) &&
        (isAlways(c) || (!isAlways(o) && o.windows.every(function (w) {
          return c.windows.some(function (x) { return x.id === w.id && same(x, w); });
        }))) &&
        c.lock === o.lock && RANK.indexOf(c.effort) >= RANK.indexOf(o.effort) &&
        (c.on || !o.on) && (c.adult || !o.adult);
    }
    function canSave(m) {
      if (isLimit(draft)) return !m.lockedView && !!draft.name.trim() && draft.sites.length > 0 && draft.days.some(Boolean) && (!m.restricted || stricter(m.s, draft));
      var valid = draft.name.trim() && closes(draft) &&
        (draft.always || (draft.windows.length && draft.windows.every(function (w) { return w.days.some(Boolean); })));
      return !m.lockedView && !!valid && (!m.restricted || stricter(m.s, draft));
    }
    // Every change in the panel goes through here, so ⌘Z can step back
    function change(fn) {
      history.push(copy(draft));
      fn();
      paintEditor();
    }

    // ---------- the list ----------
    function meta(r) {
      if (isLimit(r)) {
        var d = duration(r.limit).toUpperCase();
        return r.days.every(Boolean) ? '<i>' + d + ', EVERY DAY</i>'
          : 'MTWTFSS'.split('').map(function (l, i) { return r.days[i] ? '<b>' + l + '</b>' : l; }).join('') + '&nbsp;&nbsp;<i>' + d + ' A DAY</i>';
      }
      if (isAlways(r)) return '<i>ALL DAY, EVERY DAY</i>';
      var w = r.windows[0];
      return 'MTWTFSS'.split('').map(function (l, i) { return w.days[i] ? '<b>' + l + '</b>' : l; }).join('') +
        '&nbsp;&nbsp;<i>' + (allDay(w) ? 'All day' : clock(w.from) + ' – ' + clock(w.to)) + '</i>';
    }
    function stack(r) {
      var apps = r.sites.filter(function (n) { return DOMAIN[n] === ''; }).length, sites = r.sites.length - apps, parts = [];
      if (sites) parts.push(sites + (sites === 1 ? ' site' : ' sites'));
      if (apps) parts.push(apps + (apps === 1 ? ' app' : ' apps'));
      if (r.adult) parts.push('adult sites');
      return parts.join(' · ').toUpperCase();
    }
    function paintCard(key) {
      var r = saved[key], card = cardFor(key);
      if (!card) return;
      var icon = $('.rhythms-app_card-icon', card);
      if (icon.getAttribute('data-lock') !== r.lock) { icon.innerHTML = ICON[r.lock]; icon.setAttribute('data-lock', r.lock); }
      icon.classList.toggle('is-open', r.lock === 'none');
      icon.title = LOCK[r.lock].title;
      $('.rhythms-app_card-name', card).textContent = r.name;
      $('[data-app-meta]', card).innerHTML = meta(r);
      $('.rhythms-app_card-stack', card).textContent = stack(r);
      // An Hourglass: the time left today (TimeLeft), "–" on a day it doesn't count
      var left = $('.rhythms-app_left', card);
      if (isLimit(r) && !left) { left = make('div', 'rhythms-app_left', '<b></b><span></span>'); card.insertBefore(left, $('[data-app-toggle]', card)); }
      if (!isLimit(r) && left) left.remove();
      if (left) {
        var counts = r.on && !!r.days[dayOf(NOW) % 7], spent = counts && r.left <= 0;
        $('b', left).textContent = counts ? countdown(r.left) : '–';
        $('span', left).textContent = spent ? 'RESTING' : counts ? 'LEFT TODAY' : r.on ? 'NOT TODAY' : 'PAUSED';
        left.classList.toggle('is-quiet', !counts || spent);
      }
      var toggle = $('[data-app-toggle]', card);
      toggle.classList.toggle('is-off', !r.on);
      toggle.classList.toggle('is-frozen', frozen(r));
      toggle.title = frozen(r) ? 'Fixed while this rhythm runs' : '';
      card.classList.toggle('is-off', !r.on);
      // Typing to switch one off is a panel of its own: no card is selected for it
      card.classList.toggle('is-selected', key === open && !(unlocking && unlocking.mode === 'switch'));
    }
    function paintMenu() {
      var items = document.querySelector('.rhythms-menu_items');
      if (!items) return;
      var on = order.filter(function (k) { return isActive(saved[k]); });
      items.innerHTML = '';
      var line = function (text) { var el = make('div', 'rhythms-menu_item'); el.textContent = text; items.appendChild(el); };
      on.forEach(function (k) { line(saved[k].name + ' · ' + until(saved[k])); });
      if (on.length) return;
      line('Everything is open');
      var next = null;
      order.forEach(function (k) {
        var t = nextStart(saved[k]);
        if (t != null && (!next || t < next.t)) next = { k: k, t: t };
      });
      if (next) line('Up next: ' + saved[next.k].name + ' ' + at(next.t));
    }
    // With both kinds on the list they sit apart, Set hours first, each under a small blue heading
    var kindLabels = { hours: make('div', 'rhythms-app_kind-label', 'SET HOURS'), limit: make('div', 'rhythms-app_kind-label is-limit', 'HOURGLASS') };
    function paintGroups() {
      var both = order.some(function (k) { return isLimit(saved[k]); }) && order.some(function (k) { return !isLimit(saved[k]); });
      [false, true].forEach(function (limits) {
        var keys = order.filter(function (k) { return isLimit(saved[k]) === limits; });
        var label = kindLabels[limits ? 'limit' : 'hours'];
        if (both && keys.length) cardsEl.appendChild(label); else if (label.parentNode) label.remove();
        keys.forEach(function (k) { var c = cardFor(k); if (c) cardsEl.appendChild(c); });
      });
    }
    function paintList() {
      order.forEach(paintCard);
      paintGroups();
      paintMenu();
    }

    // ---------- the panel ----------
    function chip(name, removable) {
      var c = chipTpl.cloneNode(true);
      c.removeAttribute('data-app-template');
      c.setAttribute('data-app-site', name);
      nameOf(c).textContent = name;
      setIcon($('.rhythms-app_chip-icon', c), name);
      c.classList.toggle('is-fixed', !removable);
      c.title = removable ? 'Remove ' + name : '';
      if (fresh.indexOf(name) > -1) c.classList.add('is-new');
      return c;
    }
    function setIcon(icon, name) {
      if (ICONS[name]) { icon.style.backgroundImage = 'url("' + ICONS[name] + '")'; icon.textContent = ''; icon.classList.remove('is-letter'); }
      else { icon.style.backgroundImage = 'none'; icon.textContent = name.charAt(0).toUpperCase(); icon.classList.add('is-letter'); }
    }
    var removable = function (m, name) { return !m.restricted || (addOnly && m.s.sites.indexOf(name) < 0); };
    function paintChips(m) {
      $$('[data-app-site]', chipsEl).forEach(function (c) { c.remove(); });
      draft.sites.forEach(function (n) { chipsEl.appendChild(chip(n, removable(m, n))); });
      fresh = [];
    }
    function paintChart() {
      $$('[data-app-track]').forEach(function (t) {
        $$('.rhythms-app_chart-seg', t).forEach(function (s) { if (!s.hasAttribute('data-app-template')) s.remove(); });
      });
      var trackW = ($('[data-app-track]') || {}).clientWidth || 0;
      function seg(day, a, b) {
        var t = $('[data-app-track="' + day + '"]');
        var s = segTpl.cloneNode(true);
        s.removeAttribute('data-app-template');
        s.style.left = (a / 1440 * 100) + '%';
        s.style.width = ((b - a) / 1440 * 100) + '%';
        s.style.setProperty('--x', (a / 1440 * trackW) + 'px'); // so the blue flows as one layer across the week
        t.appendChild(s);
      }
      schedule(draft).forEach(function (w) {
        w.days.forEach(function (on, d) {
          if (!on) return;
          if (allDay(w)) return seg(d, 0, 1440);
          if (w.to > w.from) return seg(d, w.from, w.to);
          seg(d, w.from, 1440);
          seg((d + 1) % 7, 0, w.to);
        });
      });
    }
    function paintWindows(m) {
      winsEl.innerHTML = '';
      draft.windows.forEach(function (w) {
        var box = winTpl.cloneNode(true);
        box.setAttribute('data-win', w.id);
        var fixed = m.restricted && !isAlways(m.s) && m.s.windows.some(function (o) { return o.id === w.id; });
        box.classList.toggle('is-fixed', fixed);
        $$('[data-app-day]', box).forEach(function (d) { d.classList.toggle('is-on', !!w.days[+d.getAttribute('data-app-day')]); });
        $('[data-app-from]', box).textContent = clock(w.from).replace(':', ' : ');
        $('[data-app-to]', box).textContent = clock(w.to).replace(':', ' : ');
        var tag = allDay(w) ? 'ALL DAY' : w.to < w.from ? 'ENDS NEXT DAY' : '';
        if (tag) $('.rhythms-app_times', box).appendChild(make('span', 'rhythms-app_tag', tag));
        var days = $('.rhythms-app_days', box);
        if (fixed) days.appendChild(make('span', 'rhythms-app_win-lock', ICON.sealed));
        else if (draft.windows.length > 1) {
          var x = make('span', 'rhythms-app_win-x', ICON.x);
          x.setAttribute('data-win-remove', '');
          x.setAttribute('role', 'button');
          x.title = 'Remove this time';
          days.appendChild(x);
        }
        winsEl.appendChild(box);
      });
    }
    var foldOpen = null;
    function paintFold(instant) {
      var want = !draft.always;
      if (foldOpen === want) return;
      foldOpen = want;
      if (instant || !gs || reduce) {
        if (gs) gs.killTweensOf(fold);
        fold.style.height = want ? '' : '0px';
        fold.style.opacity = want ? '' : '0';
        fold.style.visibility = want ? '' : 'hidden';
        return;
      }
      if (want) gs.fromTo(fold, { height: 0, autoAlpha: 0 }, { height: 'auto', autoAlpha: 1, duration: 0.5, ease: 'power3.inOut', clearProps: 'height,opacity,visibility' });
      else gs.to(fold, { height: 0, autoAlpha: 0, duration: 0.5, ease: 'power3.inOut' });
    }
    var query = '';
    function paintResults(m) {
      var q = query.trim().toLowerCase();
      orEl.style.display = groupsEl.style.display = q ? 'none' : '';
      resultsEl.innerHTML = '';
      resultsEl.style.display = q ? '' : 'none';
      if (!q) return;
      var names = Object.keys(DOMAIN).filter(function (n) {
        return n.toLowerCase().indexOf(q) > -1 || (DOMAIN[n] && DOMAIN[n].indexOf(q) > -1);
      });
      var custom = customDomain(q);
      if (custom && !names.some(function (n) { return DOMAIN[n] === custom; })) names.unshift(custom);
      names = names.slice(0, 8);
      if (!names.length) {
        resultsEl.classList.add('is-empty');
        resultsEl.textContent = 'Nothing found. Type a web address, e.g. example.com';
        return;
      }
      resultsEl.classList.remove('is-empty');
      names.forEach(function (n) {
        var has = draft.sites.indexOf(n) > -1;
        var domain = DOMAIN[n] != null ? DOMAIN[n] : n;
        var row = make('div', 'rhythms-app_result' + (has ? ' is-added' : ''),
          '<div class="rhythms-app_chip-icon"></div><div class="rhythms-app_result-text"><div class="rhythms-app_result-name"></div>' +
          '<div class="rhythms-app_result-sub"></div></div><div class="rhythms-app_result-mark">' + (has ? ICON.added : ICON.plus) + '</div>');
        row.setAttribute('data-result', n);
        $('.rhythms-app_result-name', row).textContent = n;
        $('.rhythms-app_result-sub', row).textContent = domain ? domain + (MAC_APP[n] ? ' + app' : '') : 'App';
        setIcon($('.rhythms-app_chip-icon', row), n);
        resultsEl.appendChild(row);
      });
    }
    function paintLock(m) {
      $$('[data-app-lock]').forEach(function (l) { l.classList.toggle('is-on', l.getAttribute('data-app-lock') === draft.lock); });
      sealedTile.classList.toggle('is-unavailable', !!draft.always);
      sealedTile.title = draft.always ? 'Sealed needs hours to end. Pick times, or type to unlock.' : '';
      $('[data-app-lock-note]').textContent = draft.lock === 'sealed' && draft.effort === 'none' ? LOCK.sealed.open : LOCK[draft.lock].note;
      var list = LOCK[draft.lock].efforts;
      effortsEl.classList.toggle('is-hidden', !list.length);
      effortsLabel.style.display = draft.lock === 'sealed' ? '' : 'none';
      effortEls.forEach(function (e, i) {
        var key = list[i];
        e.style.display = key ? '' : 'none';
        if (!key) return;
        e.setAttribute('data-app-effort', key);
        e.children[0].textContent = EFFORT[key][0];
        e.children[1].textContent = EFFORT[key][1];
        e.classList.toggle('is-on', draft.effort === key);
      });
      $('[data-app-tip]').textContent = asksForText(draft) ? EFFORT[draft.effort][2] : LOCK[draft.lock].tip;
    }
    // Typing to unlock: the text (after a wrong try, the first letter that's off is red), the count or what's off
    function paintUnlock() {
      var u = unlocking;
      unlockView.style.display = tags.style.display = unlockFoot.style.display = u ? '' : 'none';
      foot.style.display = u ? 'none' : '';
      edit.classList.toggle('is-switching', !!u && u.mode === 'switch');
      if (!u) return;
      var t = u.target, i = u.mismatch;
      unlockTextEl.textContent = '';
      if (i == null || i >= t.length) unlockTextEl.textContent = t;
      else {
        unlockTextEl.appendChild(document.createTextNode(t.slice(0, i)));
        unlockTextEl.appendChild(make('span', 'is-wrong')).textContent = t.charAt(i);
        unlockTextEl.appendChild(document.createTextNode(t.slice(i + 1)));
      }
      // As tall as the text, plus a little room for typos, so nothing has to scroll
      unlockField.style.height = (unlockTextEl.offsetHeight + 20) + 'px';
      unlockField.classList.toggle('is-error', i != null);
      unlockCount.classList.toggle('is-error', i != null);
      unlockCount.textContent = i == null ? area.value.length + ' / ' + t.length
        : i >= area.value.length ? 'Not an exact match yet: the text isn\'t finished. Carry on from the red letter.'
        : 'Not an exact match yet. The first letter that\'s off is in red.';
    }
    function paintEditor(instant) {
      var m = modes();
      // Switching off behind a lock: the title says what you're about to do
      var title = unlocking && unlocking.mode === 'switch' ? 'Switch off ' + draft.name : draft.name;
      if (nameEl.textContent !== title) nameEl.textContent = title;
      nameEl.contentEditable = m.lockedView || unlocking ? 'false' : 'true';
      var lim = isLimit(draft);
      statusEl.textContent = m.isNew ? (lim ? 'NEW HOURGLASS' : 'NEW RHYTHM') : '';
      kindSec.style.display = m.isNew && !unlocking ? '' : 'none';
      $$('[data-kind]', kindSec).forEach(function (t) { t.classList.toggle('is-on', (t.getAttribute('data-kind') === 'limit') === lim); });
      limitSec.style.display = lim ? '' : 'none';
      sec.when.style.display = lim ? 'none' : '';
      limitSec.classList.toggle('is-locked', m.lockedView);
      if (lim) {
        $('.rhythms-app_limit-time', limitSec).textContent = duration(draft.limit);
        $$('[data-limit-quick]', limitSec).forEach(function (q) { q.classList.toggle('is-on', +q.getAttribute('data-limit-quick') === draft.limit); });
        $$('[data-limit-day]', limitSec).forEach(function (d) { d.classList.toggle('is-on', !!draft.days[+d.getAttribute('data-limit-day')]); });
        $('[data-limit-step="-5"]', limitSec).classList.toggle('is-disabled', draft.limit <= 5);
        $('[data-limit-step="5"]', limitSec).classList.toggle('is-disabled', draft.limit >= 480);
      }
      // An Hourglass counts its sites down instead of closing them; adult sites aren't something to ration
      whatLabel.firstChild.nodeValue = lim ? 'WHAT COUNTS' : 'WHAT CLOSES';
      adultBox.style.display = lim ? 'none' : '';
      // Sealed needs hours to run in; an Hourglass has none
      sealedTile.style.display = lim ? 'none' : '';
      locksEl.classList.toggle('is-two', lim);
      statusEl.classList.toggle('is-hidden', !m.isNew);
      paintUnlock();

      // The banner: Sealed while it runs, or behind Type to unlock (while typing, the typing takes its place)
      banner.style.display = (m.isFrozen || m.restricted) && !unlocking ? '' : 'none';
      if (m.isFrozen) {
        $('.rhythms-app_banner-title', banner).textContent = 'Sealed';
        $('.rhythms-app_banner-text', banner).textContent = 'Nothing changes ' + until(m.s) + '.';
      } else if (m.restricted) {
        $('.rhythms-app_banner-title', banner).textContent = addOnly ? 'Add-only mode' : LOCK[m.s.lock].title;
        $('.rhythms-app_banner-text', banner).textContent = addOnly
          ? 'Add sites, apps and times. What’s here stays.' : 'Adding is free. Changing it means typing to unlock.';
      }
      $('.rhythms-app_banner-actions', banner).style.display = m.isFrozen ? 'none' : '';
      $('[data-banner="add"]', banner).style.display = addOnly ? 'none' : '';
      var unlockBtn = $('[data-banner="unlock"]', banner);
      unlockBtn.classList.toggle('rhythms-app_add-time', addOnly);
      unlockBtn.classList.toggle('rhythms-app_save', !addOnly);

      sec.when.classList.toggle('is-locked', m.lockedView);
      sec.what.classList.toggle('is-locked', m.lockedView);
      sec.lock.classList.toggle('is-locked', m.restricted || m.isFrozen);

      // When
      alldayToggle.classList.toggle('is-off', !draft.always);
      alldayRow.classList.toggle('is-disabled', m.restricted && (isAlways(m.s) || draft.lock === 'sealed'));
      paintFold(instant);
      paintChart();
      paintWindows(m);
      (draft.always ? alwaysHintRow : addRow).appendChild(undoHint);
      undoHint.style.display = history.length ? '' : 'none';
      alwaysHintRow.style.display = draft.always && history.length ? '' : 'none';

      // What closes
      paintChips(m);
      paintResults(m);
      var lockedAdult = draft.adult && m.restricted && m.s.adult;
      adultBox.classList.toggle('is-on', !!draft.adult);
      adultBox.classList.toggle('is-locked', !!lockedAdult);
      adultBox.setAttribute('aria-checked', draft.adult ? 'true' : 'false');
      $('.rhythms-app_adult-sub', adultBox).textContent = lockedAdult ? 'Unlock to switch this off.' : 'About 20,000 sites, kept out of sight.';

      paintLock(m);

      // Footer
      var del = $('[data-app-delete]'), save = $('[data-app-save]');
      del.style.visibility = m.isNew ? 'hidden' : '';
      del.classList.toggle('is-disabled', m.lockedView || m.restricted);
      roll(save, m.isNew ? 'ADD RHYTHM' : 'SAVE');
      save.classList.toggle('is-disabled', !canSave(m));
    }

    // ---------- opening and closing the panel ----------
    function show(key) {
      var fromClosed = open === null && !inSettings;
      inSettings = false;
      edit.classList.remove('is-settings');
      open = key;
      draft = key === 'new'
        ? { name: '', on: true, always: false, windows: blankTimes(), limit: null, days: EVERY.slice(), left: 0, sites: [], adult: false, lock: 'none', effort: 'medium' }
        : copy(saved[key]);
      addOnly = false; unlocked = false; unlocking = null; history = []; query = ''; input.value = ''; fresh = [];
      body.classList.remove('is-closed');
      paintList();
      foldOpen = null;
      paintEditor(true);
      scroll.scrollTop = 0;
      if (gs && !reduce && ready) {
        if (fromClosed) gs.fromTo(edit, { autoAlpha: 0, x: 24 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: 'expo.out', clearProps: 'transform,opacity,visibility' });
        else gs.fromTo(scroll, { autoAlpha: 0.2, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'expo.out' });
      }
      if (key === 'new') setTimeout(function () { nameEl.focus({ preventScroll: true }); }, 60);
    }
    function close() {
      open = null; draft = null; unlocking = null;
      inSettings = false;
      edit.classList.remove('is-settings');
      if (document.activeElement === area) area.blur();
      body.classList.add('is-closed');
      paintList();
    }

    // ---------- Settings (SettingsView): the menu bar and Light, website blocking, updates, about ----------
    var settingsEl = make('div', 'rhythms-app_settings');
    settingsEl.setAttribute('data-lenis-prevent', '');
    var setRow = function (title, detail, control, cls) {
      return '<div class="rhythms-app_set-row"><div><div class="rhythms-app_set-title">' + title + '</div>' +
        (detail ? '<div class="rhythms-app_set-detail' + (cls ? ' ' + cls : '') + '">' + detail + '</div>' : '') + '</div>' + (control || '') + '</div>';
    };
    var setToggle = function (key, on) { return '<div class="rhythms-app_toggle' + (on ? '' : ' is-off') + '" data-set-toggle="' + key + '" role="switch"><div class="rhythms-app_toggle-knob"></div></div>'; };
    var setButton = function (key, text) { return '<div class="rhythms-app_add-time" data-set="' + key + '" role="button">' + text + '</div>'; };
    var rule = '<div class="rhythms-app_set-rule"></div>';
    var group = function (title, rows, info) {
      return '<div class="rhythms-app_label"' + (info ? ' title="' + info + '"' : '') + '>' + title + (info ? infoSvg : '') + '</div><div class="rhythms-app_box rhythms-app_set-group">' + rows.join(rule) + '</div>';
    };
    settingsEl.innerHTML = '<div class="rhythms-app_edit-name rhythms-app_set-name">Settings</div>' +
      group('MENU BAR', [setRow('Tidy menu bar', '', setButton('arrange', 'ARRANGE')),
        setRow('Light', 'Warms your screen as the day goes', setToggle('light', false))]) +
      group('WEBSITES', [setRow('Website blocking', 'On, in all your browsers', '', 'is-good')],
        'A small helper blocks sites in every browser, without extensions. macOS asks for your password once to set it up.') +
      group('UPDATES', [setRow('Rhythms 0.75', 'Up to date, checked ' + clock(NOW), setButton('check', 'CHECK FOR UPDATES'), 'is-good'),
        setRow('Check automatically', 'Once a day', setToggle('auto', true)),
        setRow('Download updates by itself', 'You still choose when it installs', setToggle('download', true))]) +
      group('ABOUT', [setRow('Rhythms', 'By Digital Feng Shui', '<a class="rhythms-app_set-link" href="/">Website</a>'),
        setRow('Feedback', 'Ideas, bugs, anything', setButton('send', 'SEND'))]);
    edit.appendChild(settingsEl);
    $$('[data-set]', settingsEl).forEach(function (b) { roll(b, b.textContent); });
    function openSettings() {
      var fromClosed = open === null && !inSettings;
      if (document.activeElement === area) area.blur();
      open = null; draft = null; unlocking = null; inSettings = true;
      body.classList.remove('is-closed');
      edit.classList.add('is-settings');
      paintList();
      settingsEl.scrollTop = 0;
      if (gs && !reduce && fromClosed) gs.fromTo(edit, { autoAlpha: 0, x: 24 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: 'expo.out', clearProps: 'transform,opacity,visibility' });
    }
    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    settingsEl.addEventListener('click', function (e) {
      var t = e.target.closest('[data-set-toggle]'), b = e.target.closest('[data-set]');
      if (t) {
        if (t.classList.contains('is-disabled')) { shake(t); return; }
        t.classList.toggle('is-off');
        // Downloading by itself only makes sense while it checks by itself
        if (t.getAttribute('data-set-toggle') === 'auto') $('[data-set-toggle="download"]', settingsEl).classList.toggle('is-disabled', t.classList.contains('is-off'));
        return;
      }
      if (b && b.getAttribute('data-set') === 'check') {
        var detail = b.parentNode.querySelector('.rhythms-app_set-detail');
        detail.textContent = 'Looking for updates…';
        detail.classList.remove('is-good');
        setTimeout(function () { detail.textContent = 'Up to date, checked ' + clock(NOW); detail.classList.add('is-good'); }, 1100);
      }
    });

    // ---------- the list: open a card, or switch it ----------
    function bindCard(card) {
      var key = card.getAttribute('data-app-card');
      card.addEventListener('click', function (e) {
        var toggle = e.target.closest('[data-app-toggle]');
        if (!toggle) { if (open !== key) show(key); return; }
        var r = saved[key];
        if (frozen(r)) { shake(toggle); return; }
        // Switching on is always free; switching off a Type to unlock rhythm costs the text, typed in the panel
        if (r.on && asksForText(r)) {
          if (unlocking && unlocking.mode === 'switch' && open === key) { shake(unlockField); return; }
          show(key);
          startUnlock('switch');
          return;
        }
        r.on = !r.on;
        if (open === key && draft) draft.on = r.on;
        paintList();
        if (open) paintEditor();
        changed();
      });
    }
    $$('[data-app-card]').forEach(bindCard);
    order.forEach(function (k) {
      if (cardFor(k)) return;
      var c = cardTpl.cloneNode(true);
      c.setAttribute('data-app-card', k);
      c.classList.remove('is-selected');
      addStack(c);
      cardsEl.appendChild(c);
      bindCard(c);
    });
    // Under the list: the version and a way to tell us anything (BetaCorner)
    var listEl = $('.rhythms-app_list');
    // The grid's zips (GridZips): a new one every 2 to 4 s, at most three, 40% strong, only while the app is in view
    if (listEl && gs && !reduce) {
      var zips = make('div', 'rhythms-app_zips'), zipLive = 0, zipSeen = false;
      listEl.insertBefore(zips, listEl.firstChild);
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { zipSeen = es[0].isIntersecting; }).observe(app);
      (function zip() {
        setTimeout(zip, 2000 + Math.random() * 2000);
        var w = zips.clientWidth, h = zips.clientHeight;
        if (!zipSeen || document.hidden || zipLive >= 3 || w < 60 || h < 200) return;
        var len = 38 + Math.random() * 58, travel = 96 + Math.random() * 160;
        var line = make('span', 'rhythms-app_zip');
        line.style.left = (26 * (1 + Math.floor(Math.random() * Math.max(1, Math.floor(w / 26) - 1)))) + 'px';
        line.style.top = (Math.random() * Math.max(0, h - len - travel)) + 'px';
        line.style.height = len + 'px';
        zips.appendChild(line); zipLive++;
        gs.fromTo(line, { y: 0, autoAlpha: 0 }, { y: travel, duration: 1.8 + Math.random() * 1.2, ease: 'power1.inOut',
          keyframes: { autoAlpha: [0, 0.4, 0.4, 0] }, onComplete: function () { line.remove(); zipLive--; } });
      })();
    }
    if (listEl) listEl.appendChild(make('div', 'rhythms-app_beta', '<span>BETA V0.75</span><span class="rhythms-app_beta-link">GIVE FEEDBACK' + ICON.heart + '</span>'));
    // Buttons with words roll their letters on hover, like the app
    var newWord = $('[data-app-new] span');
    if (newWord) roll(newWord, newWord.textContent.trim().toUpperCase());
    var addWord = $('span', addTime);
    if (addWord) roll(addWord, addWord.textContent.trim().toUpperCase());
    [$('[data-app-delete]')].concat($$('[data-banner]', banner), $$('[data-unlock]', unlockFoot)).forEach(function (b) { if (b) roll(b, b.textContent.trim()); });

    // ---------- the panel's controls ----------
    closeBtn.addEventListener('click', close);
    nameEl.setAttribute('data-placeholder', 'Give it a name');
    nameEl.setAttribute('spellcheck', 'false');
    nameEl.addEventListener('input', function () {
      draft.name = nameEl.textContent.replace(/\n/g, '');
      var m = modes();
      $('[data-app-save]').classList.toggle('is-disabled', !canSave(m));
    });
    nameEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); } });
    nameEl.addEventListener('paste', function (e) {
      e.preventDefault();
      var text = (e.clipboardData || window.clipboardData).getData('text').replace(/\s+/g, ' ');
      document.execCommand('insertText', false, text);
    });

    banner.addEventListener('click', function (e) {
      var b = e.target.closest('[data-banner]');
      if (!b) return;
      if (b.getAttribute('data-banner') === 'add') { addOnly = true; paintEditor(); return; }
      startUnlock('edit');
    });

    // ---------- typing to unlock ----------
    // 'edit': "Unlock…" in the banner; once typed, the whole rhythm can change until the panel closes.
    // 'switch': the switch on a card; once typed, the rhythm is off and the panel closes.
    function startUnlock(mode) {
      var r = saved[open];
      if (!r) return;
      unlocking = { mode: mode, key: open, target: unlockText(CHARS[r.effort] || CHARS.medium), mismatch: null };
      area.value = '';
      query = ''; input.value = '';
      paintList();
      paintEditor();
      scroll.scrollTop = 0;
      if (gs && !reduce) gs.fromTo(unlockView, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'expo.out', clearProps: 'transform,opacity,visibility' });
      setTimeout(function () { if (unlocking) area.focus({ preventScroll: true }); }, 80);
    }
    function stopUnlock() {
      var u = unlocking;
      if (!u) return;
      if (u.mode === 'switch') { close(); return; }
      unlocking = null;
      if (document.activeElement === area) area.blur();
      paintEditor();
    }
    function tryUnlock() {
      var u = unlocking, typed = area.value;
      if (!u) return;
      if (typed !== u.target) {
        var i = 0;
        while (i < typed.length && i < u.target.length && typed.charAt(i) === u.target.charAt(i)) i++;
        u.mismatch = i;
        paintUnlock();
        shake(unlockField);
        return;
      }
      unlocking = null;
      if (document.activeElement === area) area.blur();
      if (u.mode === 'switch') {
        saved[u.key].on = false;
        close();
        changed();
        return;
      }
      unlocked = true;
      paintEditor();
    }
    // Type it exactly: no pasting, no dropping text in, no new lines
    ['paste', 'drop'].forEach(function (type) { area.addEventListener(type, function (e) { e.preventDefault(); }); });
    area.addEventListener('beforeinput', function (e) {
      if (/^insertFrom(Paste|Drop|Yank)|^insert(LineBreak|Paragraph)$/.test(e.inputType || '')) e.preventDefault();
    });
    area.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') e.preventDefault();
      if (e.key === 'Escape') stopUnlock();
    });
    area.addEventListener('input', function () { if (unlocking) { unlocking.mismatch = null; paintUnlock(); } });
    unlockFoot.addEventListener('click', function (e) {
      var b = e.target.closest('[data-unlock]');
      if (!b) return;
      if (b.getAttribute('data-unlock') === 'cancel') stopUnlock();
      else tryUnlock();
    });

    kindSec.addEventListener('click', function (e) {
      var t = e.target.closest('[data-kind]');
      if (!t) return;
      var lim = t.getAttribute('data-kind') === 'limit';
      if (lim === isLimit(draft)) return;
      change(function () {
        draft.always = false;
        if (lim) {
          draft.limit = 60; draft.days = EVERY.slice(); draft.adult = false;
          if (draft.lock === 'sealed') { draft.lock = 'type'; draft.effort = LOCK.type.effort; }
        } else { draft.limit = null; draft.windows = blankTimes(); }
      });
    });
    limitSec.addEventListener('click', function (e) {
      var step = e.target.closest('[data-limit-step]'), quick = e.target.closest('[data-limit-quick]'), day = e.target.closest('[data-limit-day]');
      if (step) {
        if (step.classList.contains('is-disabled')) return;
        change(function () { draft.limit = Math.min(480, Math.max(5, draft.limit + +step.getAttribute('data-limit-step'))); });
      } else if (quick) change(function () { draft.limit = +quick.getAttribute('data-limit-quick'); });
      else if (day) change(function () { var i = +day.getAttribute('data-limit-day'); draft.days[i] = draft.days[i] ? 0 : 1; });
    });
    alldayRow.addEventListener('click', function () {
      var m = modes();
      if (m.lockedView || alldayRow.classList.contains('is-disabled')) { shake(alldayToggle); return; }
      change(function () {
        draft.always = !draft.always;
        // A rhythm that never ends could never be opened again: Sealed becomes Type to unlock
        if (draft.always && draft.lock === 'sealed') { draft.lock = 'type'; draft.effort = LOCK.type.effort; }
      });
    });
    winsEl.addEventListener('click', function (e) {
      var box = e.target.closest('[data-win]');
      if (!box) return;
      var w = draft.windows.filter(function (x) { return x.id === box.getAttribute('data-win'); })[0];
      if (!w) return;
      if (box.classList.contains('is-fixed')) { shake(box); return; }
      if (e.target.closest('[data-win-remove]')) {
        change(function () { draft.windows = draft.windows.filter(function (x) { return x !== w; }); });
        return;
      }
      var day = e.target.closest('[data-app-day]');
      if (day) change(function () { var i = +day.getAttribute('data-app-day'); w.days[i] = w.days[i] ? 0 : 1; });
    });
    addTime.addEventListener('click', function () {
      change(function () { draft.windows.push(win(EVERY, H(22), H(7))); });
    });
    undoHint.addEventListener('click', function () {
      if (!history.length) return;
      draft = history.pop();
      paintEditor();
    });

    // Chips: a removable chip is one button, like the app
    chipsEl.addEventListener('click', function (e) {
      var c = e.target.closest('[data-app-site]');
      if (!c || c.classList.contains('is-fixed')) return;
      var name = c.getAttribute('data-app-site');
      c.classList.add('is-leaving');
      setTimeout(function () { change(function () { draft.sites = draft.sites.filter(function (n) { return n !== name; }); }); }, 200);
    });
    function add(name) {
      if (!draft || draft.sites.indexOf(name) > -1) return;
      draft.sites.push(name);
      fresh.push(name);
      paintEditor();
    }
    $$('[data-app-group]').forEach(function (g) {
      g.addEventListener('click', function () {
        var list = (GROUPS[g.getAttribute('data-app-group')] || []).filter(function (n) { return draft.sites.indexOf(n) < 0; });
        if (!list.length) return;
        history.push(copy(draft));
        var keep = open;
        list.forEach(function (n, i) { setTimeout(function () { if (open === keep) add(n); }, i * 90); });
      });
    });
    // Search: type "insta" and Instagram is there
    var slot = $('[data-app-search]');
    var input = document.createElement('input');
    input.className = 'rhythms-app_search-input';
    input.type = 'text';
    input.placeholder = slot.getAttribute('data-placeholder') || 'Search a website or app, e.g. insta';
    input.setAttribute('aria-label', 'Search a website or app');
    input.autocomplete = 'off';
    input.spellcheck = false;
    slot.appendChild(input);
    input.addEventListener('input', function () { query = input.value; paintResults(modes()); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; query = ''; paintResults(modes()); input.blur(); }
      if (e.key === 'Enter') { var first = $('[data-result]', resultsEl); if (first) first.click(); }
    });
    resultsEl.addEventListener('click', function (e) {
      var row = e.target.closest('[data-result]');
      if (!row) return;
      var n = row.getAttribute('data-result'), m = modes();
      if (DOMAIN[n] == null) DOMAIN[n] = n; // a web address of its own
      if (draft.sites.indexOf(n) > -1) {
        if (!removable(m, n)) { shake(row); return; }
        change(function () { draft.sites = draft.sites.filter(function (x) { return x !== n; }); });
      } else {
        history.push(copy(draft));
        add(n);
      }
    });
    adultBox.addEventListener('click', function () {
      if (adultBox.classList.contains('is-locked')) { shake(adultBox); return; }
      change(function () { draft.adult = !draft.adult; });
    });
    $$('[data-app-lock]').forEach(function (l) {
      l.addEventListener('click', function () {
        var next = l.getAttribute('data-app-lock');
        if (l.classList.contains('is-unavailable')) { shake(l); return; }
        if (next === draft.lock) return;
        change(function () { draft.lock = next; draft.effort = LOCK[next].effort || 'medium'; });
      });
    });
    effortEls.forEach(function (e) {
      e.addEventListener('click', function () {
        var key = e.getAttribute('data-app-effort');
        if (key !== draft.effort) change(function () { draft.effort = key; });
      });
    });

    // New rhythm: an empty one with one time to shape; it joins the list when added
    $('[data-app-new]').addEventListener('click', function (e) {
      if (order.length >= 6) { shake(e.currentTarget); return; }
      show('new');
    });
    $('[data-app-save]').addEventListener('click', function (e) {
      var m = modes();
      if (!canSave(m)) { shake(e.currentTarget); return; }
      var key = open;
      if (m.isNew) {
        key = 'new' + (++newCount);
        var card = cardTpl.cloneNode(true);
        card.setAttribute('data-app-card', key);
        card.classList.remove('is-selected');
        addStack(card);
        cardsEl.appendChild(card);
        bindCard(card);
        order.push(key);
      }
      var kept = copy(draft);
      if (isLimit(kept)) kept.left = m.isNew ? kept.limit * 60 : Math.max(0, saved[key].left + (kept.limit - saved[key].limit) * 60);
      if (kept.always) kept.windows = blankTimes();
      saved[key] = kept;
      close();
      changed();
      if (gs && !reduce) gs.fromTo(cardFor(key), { backgroundColor: 'rgba(2,151,219,0.08)' }, { backgroundColor: '', duration: 1.2, ease: 'power2.out', clearProps: 'backgroundColor' });
    });
    $('[data-app-delete]').addEventListener('click', function (e) {
      var m = modes();
      if (m.isNew || e.currentTarget.classList.contains('is-disabled')) return;
      var key = open, card = cardFor(key);
      delete saved[key];
      order = order.filter(function (k) { return k !== key; });
      close();
      changed();
      var gone = function () { card.remove(); };
      if (gs && !reduce) gs.to(card, { autoAlpha: 0, height: 0, paddingTop: 0, paddingBottom: 0, marginTop: -9, duration: 0.35, ease: 'power2.in', onComplete: gone });
      else gone();
    });

    // The week's blue flows slowly, like the app's LivingBlue (one layer across all the bars)
    if (gs && !reduce) {
      var flow = { v: 0 }, flowing = null;
      var startFlow = function () {
        var w = ($('[data-app-track]') || {}).clientWidth || 0;
        if (!w || flowing) return;
        chartEl.style.setProperty('--strip', (w * 2) + 'px');
        flowing = gs.to(flow, { v: -w, duration: 9, ease: 'none', repeat: -1,
          onUpdate: function () { chartEl.style.setProperty('--flow', flow.v + 'px'); } });
      };
      if ('IntersectionObserver' in window) new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { startFlow(); if (flowing) flowing.play(); }
        else if (flowing) flowing.pause();
      }).observe(app);
      else startFlow();
    }

    window.dfsRhythms = {
      close: close, show: show, settings: openSettings,
      sitesOf: function (name) {
        var k = order.filter(function (k) { return saved[k].name === name; })[0];
        return k && saved[k].on ? saved[k].sites.slice() : [];
      }
    };
    // Opens on Slow Sundays: no lock, so everything can be tried straight away
    show(saved.sundays ? 'sundays' : order[0]);
    ready = true;
    window.dispatchEvent(new Event('dfs-rhythms-ready'));
  }

  // =========================================================
  // RHYTHMS MARQUEE — /rythems-app "Closes what pulls you away"
  // The label sits above the row; a dashed gate line runs through the middle of it. Chips drift in
  // from the right, open and colourful, and are wiped closed as they cross the line: whatever part of
  // a chip is past it is already grey. Two copies of the row run in step: the open one shows right of
  // the line, a closed copy left of it. The moment a chip's ✕ crosses, it morphs into a lock (GSAP
  // MorphSVG, loaded here) and the line flashes. Click an open chip to close it early; a closed one
  // shakes. Hover slows the row down. The page script clones the lists and runs the CSS marquee; this
  // adds the gate. Without JS the label simply stays on the left.
  // =========================================================
  function dfsRhythmsMarquee() {
    var marquee = document.querySelector('[data-rhythms-marquee]');
    var component = marquee.parentNode;
    var label = component.querySelector('.rhythms-marquee_label');
    var gs = window.gsap;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var X = 'M6.4 4.3 12 9.9l5.6-5.6 2.1 2.1L14.1 12l5.6 5.6-2.1 2.1L12 14.1l-5.6 5.6-2.1-2.1L9.9 12 4.3 6.4z';
    var LOCK = 'M7 10V8a5 5 0 0 1 10 0v2h1.5A1.5 1.5 0 0 1 20 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-8A1.5 1.5 0 0 1 5.5 10zm2.5 0h5V8a2.5 2.5 0 0 0-5 0z';
    var GLYPH = '<svg class="rhythms-chip_glyph" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="' + X + '"/></svg>';
    var locked, gate, twins = [], morph = false, tries = 0, lastPulse = 0;
    var anims = function (layer) {
      return [].slice.call(layer.querySelectorAll('[data-css-marquee-list]')).map(function (l) { return l.getAnimations ? l.getAnimations()[0] : null; });
    };
    var parts = function (chip) {
      if (!chip._x) { chip._x = chip.querySelector('.rhythms-chip_x'); chip._path = chip._x && chip._x.querySelector('path'); }
      return chip;
    };

    // ✕ → lock, in place, with a little pop
    function lockUp(chip, animate) {
      parts(chip);
      if (!chip._path) return;
      if (!animate || reduce || !gs) { chip._path.setAttribute('d', LOCK); return; }
      if (morph) gs.fromTo(chip._path, { morphSVG: X }, { morphSVG: LOCK, duration: 0.35, ease: 'power2.inOut', overwrite: true });
      else chip._path.setAttribute('d', LOCK);
      gs.fromTo(chip._x, { scale: 1 }, { duration: 0.5, keyframes: { scale: [1.35, 1] }, ease: 'power2.out', clearProps: 'transform' });
    }
    function unlock(chip) {
      parts(chip);
      if (gs && chip._path) gs.killTweensOf(chip._path);
      if (chip._path) chip._path.setAttribute('d', X);
    }

    function pulse() {
      var now = Date.now();
      if (!gs || reduce || now - lastPulse < 400) return;
      lastPulse = now;
      gs.fromTo(gate, { opacity: 0.9 }, { opacity: 0.35, duration: 0.8, ease: 'power2.out', overwrite: true });
    }

    // Wait until the page script has cloned the lists, then build the closed copy on top
    function build() {
      if (marquee.querySelectorAll('[data-css-marquee-list]').length < 2 && tries++ < 20) { setTimeout(build, 150); return; }
      [].slice.call(marquee.querySelectorAll('.rhythms-chip_x')).forEach(function (x) { x.innerHTML = GLYPH; });
      locked = marquee.cloneNode(true);
      locked.removeAttribute('data-rhythms-marquee');
      locked.classList.add('is-locked');
      locked.setAttribute('aria-hidden', 'true');
      twins = [].slice.call(locked.querySelectorAll('.rhythms-chip'));
      twins.forEach(function (chip) { chip.classList.add('is-closed'); });
      anims(locked).forEach(function (a) { if (a) a.pause(); });
      component.appendChild(locked);
      // The dashed line can be a Webflow element (so the Designer shows it); otherwise it's made here
      gate = component.querySelector('.rhythms-marquee_gate');
      if (!gate) {
        gate = document.createElement('div');
        gate.className = 'rhythms-marquee_gate';
        component.appendChild(gate);
      }
      component.classList.add('is-gate');
      place();
      if ('ResizeObserver' in window) new ResizeObserver(place).observe(component);
      tick();
      if (!gs) return;
      if ('IntersectionObserver' in window) new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) gs.ticker.add(tick); else gs.ticker.remove(tick);
      }).observe(component);
      else gs.ticker.add(tick);
    }
    // The closed copy covers the open row exactly; the gate runs from under the label through the row
    function place() {
      locked.style.top = marquee.offsetTop + 'px';
      locked.style.left = marquee.offsetLeft + 'px';
      locked.style.width = marquee.offsetWidth + 'px';
      locked.style.height = marquee.offsetHeight + 'px';
      var top = label.offsetTop + label.offsetHeight + 6;
      gate.style.left = Math.round(marquee.offsetLeft + marquee.offsetWidth / 2) + 'px';
      gate.style.top = top + 'px';
      gate.style.height = (marquee.offsetTop + marquee.offsetHeight + 10 - top) + 'px';
    }
    // Every frame: the closed copy takes the open row's place in the loop, and a ✕ that just crossed
    // the line turns into a lock. When the loop jumps a list back, its chips simply take their side's state.
    function tick() {
      var open = anims(marquee), shut = anims(locked);
      shut.forEach(function (a, i) {
        if (!a || !open[i]) return;
        if (a.playState !== 'paused') a.pause();
        a.currentTime = open[i].currentTime;
      });
      var g = gate.getBoundingClientRect().left;
      twins.forEach(function (chip) {
        parts(chip);
        if (!chip._x) return;
        var r = chip._x.getBoundingClientRect(), c = r.left + r.width / 2;
        var jumped = chip._c === undefined || Math.abs(c - chip._c) > 300;
        chip._c = c;
        var past = c < g;
        if (past === chip._past && !jumped) return;
        chip._past = past;
        if (!past) unlock(chip);
        else { lockUp(chip, !jumped); if (!jumped) pulse(); }
      });
      // A chip closed by hand opens again once it's well past the line (out of sight on the open side)
      [].slice.call(marquee.querySelectorAll('.rhythms-chip.is-closed')).forEach(function (chip) {
        if (chip.getBoundingClientRect().right < g - 200) { chip.classList.remove('is-closed'); unlock(chip); }
      });
    }

    // MorphSVG comes from Webflow's GSAP folder, same version as the site's GSAP; without it the ✕ just swaps
    function loadMorph(done) {
      if (!gs) return done();
      if (window.MorphSVGPlugin) { gs.registerPlugin(window.MorphSVGPlugin); morph = true; return done(); }
      var s = document.createElement('script');
      s.src = 'https://cdn.prod.website-files.com/gsap/' + gs.version + '/MorphSVGPlugin.min.js';
      s.onload = function () { if (window.MorphSVGPlugin) { gs.registerPlugin(window.MorphSVGPlugin); morph = true; } done(); };
      s.onerror = done;
      document.head.appendChild(s);
    }
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { loadMorph(function () { setTimeout(build, 0); }); });

    // Click: an open chip closes right away; a closed one (left of the line, or closed by hand) shakes
    function shake(el) {
      if (gs && !reduce) gs.fromTo(el, { x: 0 }, { x: 0, duration: 0.4, keyframes: { x: [-4, 4, -2, 2, 0] }, ease: 'power2.out', clearProps: 'transform' });
    }
    marquee.addEventListener('click', function (e) {
      var chip = e.target.closest('.rhythms-chip');
      if (!chip || !locked) return;
      var twin = twins[[].slice.call(marquee.querySelectorAll('.rhythms-chip')).indexOf(chip)];
      var r = chip.getBoundingClientRect(), g = gate.getBoundingClientRect().left;
      if (r.left + r.width / 2 < g) { if (twin) shake(twin); return; }
      if (chip.classList.contains('is-closed')) { shake(chip); return; }
      chip.classList.add('is-closed');
      lockUp(chip, true);
    });

    // Hover: the row eases down to a crawl, so a chip is easy to catch
    var rate = { v: 1 };
    function ease(to) {
      if (!gs) return;
      gs.to(rate, { v: to, duration: 0.9, ease: 'power2.out', overwrite: true, onUpdate: function () {
        anims(marquee).forEach(function (a) { if (a) a.playbackRate = rate.v; });
      } });
    }
    if (window.matchMedia('(hover: hover)').matches) {
      component.addEventListener('mouseenter', function () { ease(0.2); });
      component.addEventListener('mouseleave', function () { ease(1); });
    }
  }

  // =========================================================
  // HELP MAIL — a mailto link with data-help-mail="<subject>" opens a ready-made email: the subject,
  // a short message, and the email address the visitor already typed on the page (Memberstack's
  // email field), so we know which account it is. Used for "Trouble logging in?" on /login.
  // =========================================================
  function dfsHelpMail() {
    document.querySelectorAll('a[data-help-mail]').forEach(function (link) {
      var to = (link.getAttribute('href') || '').replace(/^mailto:/i, '').split('?')[0] || 'info@digital-fengshui.com';
      function build() {
        var field = document.querySelector('[data-ms-member="email"]') || document.querySelector('input[type="email"]');
        var email = field ? (field.value !== undefined ? field.value : field.textContent).trim() : '';
        var body = link.getAttribute('data-help-body') === 'account'
          ? 'Hi Digital Feng Shui,\n\nMy account email: ' + email + '\nMy question: \n\nThanks!'
          : 'Hi Digital Feng Shui,\n\nI\'m having trouble logging in.\n\nMy account email: ' + email +
            '\nWhat happens: \n\nThanks!';
        link.setAttribute('href', 'mailto:' + to + '?subject=' + encodeURIComponent(link.getAttribute('data-help-mail') || 'Trouble logging in') +
          '&body=' + encodeURIComponent(body));
      }
      build();
      ['mousedown', 'touchstart', 'focus', 'click'].forEach(function (type) { link.addEventListener(type, build, { passive: true }); });
    });
  }

  // =========================================================
  // LOGIN HELP — /login: "Trouble logging in?" ([data-login-help-toggle]) opens a second blue box
  // ([data-login-help]) under the Resend row. It shows the address the code went to
  // ([data-login-help-email]), so a typo is easy to spot, and a "Send us a message" link
  // (data-help-mail, see above). Click again to close. styles.css hides the box until it opens.
  // =========================================================
  function dfsLoginHelp() {
    var box = document.querySelector('[data-login-help]');
    var toggle = document.querySelector('[data-login-help-toggle]');
    if (!box || !toggle) return;
    var gs = window.gsap;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var emailEl = box.querySelector('[data-login-help-email]');
    toggle.setAttribute('role', 'button');
    toggle.setAttribute('aria-expanded', 'false');
    // Opening: the box makes room first, then the text and the link fade in together (nothing is
    // uncovered line by line, so the link doesn't pop in last). Closing goes the other way.
    var inner = box.firstElementChild || box;
    var CLEAR = 'height,padding,margin,opacity,visibility,transform';
    function setOpen(on) {
      toggle.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (gs) gs.killTweensOf([box, inner]);
      if (on) {
        var field = document.querySelector('[data-ms-member="email"]');
        if (emailEl) emailEl.textContent = (field && field.value.trim()) || 'your email';
        box.classList.add('is-open');
        if (!gs || reduce) return;
        var cs = getComputedStyle(box);
        gs.timeline()
          .fromTo(box, { height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0, autoAlpha: 0 },
            { height: 'auto', paddingTop: cs.paddingTop, paddingBottom: cs.paddingBottom, marginBottom: cs.marginBottom, autoAlpha: 1,
              duration: 0.45, ease: 'power3.inOut', clearProps: CLEAR }, 0)
          .fromTo(inner, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out', clearProps: CLEAR }, 0.3);
        return;
      }
      var shut = function () { box.classList.remove('is-open'); if (gs) gs.set([box, inner], { clearProps: CLEAR }); };
      if (!gs || reduce) { shut(); return; }
      gs.timeline({ onComplete: shut })
        .to(inner, { autoAlpha: 0, duration: 0.15, ease: 'power1.out' }, 0)
        .to(box, { height: 0, paddingTop: 0, paddingBottom: 0, marginBottom: 0, autoAlpha: 0, duration: 0.35, ease: 'power3.inOut' }, 0.1);
    }
    toggle.addEventListener('click', function (e) {
      e.preventDefault();
      setOpen(!box.classList.contains('is-open'));
    });
  }

  // =========================================================
  // SQUARE FIELD ICONS — the success / error icons in form fields (.form-field-icon, a Webflow embed)
  // were circles; the outline becomes a square with barely rounded corners, more on-brand. The tick
  // and the exclamation mark inside stay as they are.
  // =========================================================
  function dfsSquareFieldIcons() {
    var SQUARE = 'M4.5 3.5h15a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z';
    document.querySelectorAll('.form-field-icon svg path').forEach(function (path) {
      var d = path.getAttribute('d') || '';
      if (/^M3 12C3 /.test(d) || /^M12 3C16\.971 3 21 7\.029/.test(d)) path.setAttribute('d', SQUARE);
    });
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
  // TINKO ADD-ON — lesson 0.3 in the course (and /helper-test)
  // Sets <html data-tinko="owned|locked">. styles.css then shows the [data-tinko-show="owned"] or
  // [data-tinko-show="locked"] pieces, and blurs the [data-tinko-gate] block (install + connect) with a
  // lock on top while locked; the block's content is made inert so nothing in it can be clicked.
  // Owned = an ACTIVE Memberstack plan from TINKO_PLANS. Without it, everything marked
  // data-tinko-show="owned" is hidden: in the course that's all of lesson 0.3 (menu item, text, stage),
  // and Previous/Next skip it. Preview either state with ?tinko=owned or ?tinko=locked.
  // This only hides the steps on the page: the real check is the dfs-helper worker's licence.
  // [data-tinko-scroll] links glide to the block. [data-tinko-buy] buttons go to TINKO_BUY_URL (a Stripe
  // payment link) with the member's email and id filled in, so the payment lands on the right account;
  // without a link yet they say "Coming soon" for a moment.
  // =========================================================
  var TINKO_PLANS = ['pln_tinko-pj5v09p0'];   // Memberstack plan "Tinko" (added by dfs-cart after a Tinko purchase)
  var TINKO_BUY_URL = '';

  function dfsTinko() {
    var root = document.documentElement;
    var member = null;
    function buyHref() {
      if (!TINKO_BUY_URL) return null;
      var url = new URL(TINKO_BUY_URL);
      var email = member && member.auth && member.auth.email;
      if (email) url.searchParams.set('prefilled_email', email);
      if (member && member.id) url.searchParams.set('client_reference_id', member.id);
      return url.toString();
    }
    // Capture on window: Webflow's own handler for href="#" links would scroll the page to the top.
    window.addEventListener('click', function (event) {
      var button = event.target.closest && event.target.closest('[data-tinko-buy]');
      if (!button) return;
      var href = buyHref();
      if (href) { button.setAttribute('href', href); return; }
      event.preventDefault();
      event.stopPropagation();
      if (button.getAttribute('data-label')) return;
      button.setAttribute('data-label', button.textContent);
      button.textContent = 'Coming soon';
      setTimeout(function () {
        button.textContent = button.getAttribute('data-label');
        button.removeAttribute('data-label');
      }, 2000);
    }, true);
    function set(state) {
      root.setAttribute('data-tinko', state);
      document.querySelectorAll('[data-tinko-gate]').forEach(function (gate) {
        var content = gate.querySelector('.tinko-gate_content') || gate.firstElementChild;
        if (!content) return;
        if (state === 'owned') { content.removeAttribute('inert'); content.removeAttribute('aria-hidden'); }
        else { content.setAttribute('inert', ''); content.setAttribute('aria-hidden', 'true'); }
      });
    }
    var force = new URLSearchParams(location.search).get('tinko');
    if (force === 'owned' || force === 'locked') set(force);
    else {
      set('locked');
      whenMemberstackReady(function () {
        if (!window.$memberstackDom) return;
        window.$memberstackDom.getCurrentMember().then(function (res) {
          member = res && res.data;
          var plans = (member && member.planConnections) || [];
          var owned = plans.some(function (p) {
            return TINKO_PLANS.indexOf(p.planId) > -1 && String(p.status).toUpperCase() === 'ACTIVE';
          });
          set(owned ? 'owned' : 'locked');
        }).catch(function () {});
      });
    }

    // [data-tinko-stage="N"] buttons (the Fundamentals V2 course): open that stage in the app.
    // Tinko open and connected to this member: through the worker, no browser question (dfsTinkoOnline
    // knows beforehand). Otherwise dfshelper://stage/N (Webflow forces https:// onto custom-scheme
    // links, so the link itself is "#"), which the browser asks about once.
    window.addEventListener('click', function (event) {
      var button = event.target.closest && event.target.closest('[data-tinko-stage]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      var stage = button.getAttribute('data-tinko-stage');
      var card = button.closest('[data-lesson-stage]') || document;
      var note = card.querySelector('[data-tinko-fallback]');
      if (note) note.classList.remove('is-shown');
      if (tinkoLink.online) {
        tinkoAsk('open', { stage: Number(stage) }).then(function (j) {
          if (j && j.delivered) return;
          tinkoLink.online = false;
          viaLink();
        });
      } else {
        viaLink();
      }
      function viaLink() {
        window.location.href = 'dfshelper://stage/' + stage;
        if (note) watch(note);
      }
    }, true);

    // A page can't ask the Mac whether Tinko is installed. If the link opened him, this tab loses focus;
    // if nothing happened within 1.5 s, the card's [data-tinko-fallback] line shows (install him in 0.2).
    function watch(note) {
      var left = false;
      function gone() { left = true; }
      window.addEventListener('blur', gone, { once: true });
      document.addEventListener('visibilitychange', gone, { once: true });
      setTimeout(function () {
        window.removeEventListener('blur', gone);
        document.removeEventListener('visibilitychange', gone);
        if (!left && document.hasFocus()) note.classList.add('is-shown');
      }, 1500);
    }

    window.addEventListener('click', function (event) {
      var link = event.target.closest && event.target.closest('[data-tinko-scroll]');
      if (!link) return;
      var target = document.querySelector('[data-tinko-gate]');
      if (!target) return;
      event.preventDefault();
      event.stopPropagation();
      if (window.lenis && typeof window.lenis.scrollTo === 'function') window.lenis.scrollTo(target, { offset: -96 });
      else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, true);
  }

  // =========================================================
  // TINKO, ALIVE — any element with data-tinko-mascot (an <svg> or a box) becomes Tinko from the app.
  // Ported from Thomas + Marko's web version for the bundle page (team repo,
  // dashboard/site-loader/parts/bundle_offer-v3-0.1.0.js), which is itself Rim's Tinko.swift: the 14 x 11
  // cell body as one outline that slowly morphs (11 s), a 1.2° sway (1.85 s), eyes that blink every
  // 2.5–6 s, follow the mouse, a goofy moment every 6–14 s and now and then one of his working gestures.
  // A click (and the first time he comes into view) gives the "bwoop": swell, wobble, big eyes, crossed, home.
  // Body = currentColor, eyes = var(--tinko-eye) (styles.css). Only works while he's on screen.
  // =========================================================
  function dfsTinkoMascot() {
    var CORNERS = [0,4,1,4,1,2,2,2,2,1,4,1,4,0,10,0,10,1,12,1,12,2,13,2,13,3,14,3,14,7,13,7,13,9,12,9,12,10,9,10,9,11,4,11,4,10,2,10,2,9,1,9,1,7,0,7];
    var HOME = [[-1.5, -0.5, 1, 2], [1.5, -0.5, 1, 2]];   // eyes in cells from the body centre: x, y, w, h
    var GOOFS = [[[-4.2, -0.3, 1, 2], [4.2, -0.3, 1, 2]], [[-4.0, 0.8, 1, 2], [3.8, -1.6, 1, 2]], [[-1.8, -0.5, 2.2, 2.2], [1.9, -0.3, 0.9, 1.6]], [[-3.6, -2.2, 1, 2], [3.6, -2.2, 1, 2]], [[-0.7, -0.5, 1, 2], [0.7, -0.5, 1, 2]]];
    var GESTURES = [[[-1.6, -1.4, 1, 2], [1.6, 0.6, 1, 2]], [[-1.3, -0.5, 2, 2], [1.3, -0.5, 2, 2]], [[-1.5, -0.3, 2, 0.4], [1.5, -0.3, 2, 0.4]], [[-3.2, -1.8, 1, 2], [-0.2, -1.8, 1, 2]], [[0.4, 1.2, 1, 2], [3.4, 1.2, 1, 2]], [[-1.6, 0.4, 1, 2], [1.6, -1.2, 1, 2]], [[-1.8, -0.5, 2.2, 2.2], [1.9, -0.3, 0.9, 1.4]], [[-3.6, -0.3, 1, 2], [3.6, -0.3, 1, 2]], [[-0.8, -0.5, 1, 2], [0.8, -0.5, 1, 2]]];
    var EASE = { io: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }, out: function (t) { return 1 - Math.pow(1 - t, 3); }, in: function (t) { return t * t * t; } };
    var NS = 'http://www.w3.org/2000/svg';
    var still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var all = [], mouse = null, raf = 0;

    function path(c) { var o = 'M' + c[0].toFixed(2) + ' ' + c[1].toFixed(2); for (var i = 2; i < c.length; i += 2) o += 'L' + c[i].toFixed(2) + ' ' + c[i + 1].toFixed(2); return o + 'Z'; }
    function deformed() {   // every edge moves along its outward normal by -0.3 to 0.45 cells; the corners follow
      var n = CORNERS.length / 2, off = [], out = [], i;
      for (i = 0; i < n; i++) off.push(-0.3 + Math.random() * 0.75);
      for (i = 0; i < n; i++) {
        var px = CORNERS[2 * i], py = CORNERS[2 * i + 1], qx = px, qy = py, pv = (i + n - 1) % n, nx = (i + 1) % n;
        [[CORNERS[2 * pv], CORNERS[2 * pv + 1], px, py, off[pv]], [px, py, CORNERS[2 * nx], CORNERS[2 * nx + 1], off[i]]].forEach(function (e) {
          var dx = e[2] - e[0], dy = e[3] - e[1], len = Math.max(Math.abs(dx), Math.abs(dy));
          qx += dy / len * e[4]; qy += -dx / len * e[4];
        });
        out.push(qx, qy);
      }
      return out;
    }
    function svgMarkup() {
      var morph = '';
      if (!still) {
        var v = [deformed(), deformed(), deformed(), deformed()].map(path);
        v.push(v[0]);
        morph = '<animate attributeName="d" dur="11s" repeatCount="indefinite" values="' + v.join(';') +
          '" keyTimes="0;.25;.5;.75;1" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1"/>';
      }
      return '<g class="dfs-tinko-sway"><g class="dfs-tinko-body"><path fill="currentColor" d="' + path(CORNERS) + '">' + morph + '</path>' +
        '<rect class="dfs-tinko-eye" x="5" y="4" width="1" height="2"/><rect class="dfs-tinko-eye" x="8" y="4" width="1" height="2"/></g></g>';
    }

    function set(k, l, r, dur, ease) {   // both eyes move with an eased transition
      k.from = [k.now[0].slice(), k.now[1].slice()]; k.to = [l, r]; k.t0 = Date.now(); k.dur = dur * 1000; k.ease = EASE[ease || 'io'];
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function draw(k) {
      for (var j = 0; j < 2; j++) {
        var e = k.now[j];
        k.eyes[j].setAttribute('x', (7 + e[0] - e[2] / 2).toFixed(3)); k.eyes[j].setAttribute('y', (5.5 + e[1] - e[3] / 2).toFixed(3));
        k.eyes[j].setAttribute('width', e[2].toFixed(3)); k.eyes[j].setAttribute('height', e[3].toFixed(3));
      }
    }
    function frame() {
      raf = 0; var busy = false, now = Date.now();
      all.forEach(function (k) {
        if (!k.to) return;
        var t = Math.min(1, (now - k.t0) / k.dur), f = k.ease(t);
        for (var j = 0; j < 2; j++) for (var q = 0; q < 4; q++) k.now[j][q] = k.from[j][q] + (k.to[j][q] - k.from[j][q]) * f;
        draw(k);
        if (t < 1) busy = true; else k.to = null;
      });
      if (busy) raf = requestAnimationFrame(frame);
    }
    function blink(k) {   // eyes close with ease-in, stay shut a moment, open with ease-out
      if (Date.now() < k.nextBlink || k.blinking) return;
      k.blinking = true; k.nextBlink = Date.now() + 2500 + Math.random() * 3500;
      var l = k.to ? k.to[0] : k.now[0].slice(), r = k.to ? k.to[1] : k.now[1].slice();
      set(k, [l[0], l[1] + 0.8, l[2], 0.25], [r[0], r[1] + 0.8, r[2], 0.25], 0.07, 'in');
      setTimeout(function () { set(k, l, r, 0.16, 'out'); k.blinking = false; }, 130);
    }
    function goof(k) {    // the eyes drift far apart, one grows, or both float up; held, then home
      if (Date.now() < k.nextGoof || k.goofing || k.blinking) return;
      k.goofing = true; k.nextGoof = Date.now() + 6000 + Math.random() * 8000;
      var g = GOOFS[Math.floor(Math.random() * GOOFS.length)];
      set(k, g[0].slice(), g[1].slice(), 0.9);
      setTimeout(function () { k.gaze = [0, 0]; set(k, HOME[0].slice(), HOME[1].slice(), 0.7); setTimeout(function () { k.goofing = false; }, 700); }, 1200 + Math.random() * 800);
    }
    function follow(k) {  // the eyes drift towards the mouse, up to about a cell either way
      var b = k.el.getBoundingClientRect(), gx = 0, gy = 0;
      if (mouse) {
        gx = Math.max(-1, Math.min(1, (mouse[0] - (b.left + b.width / 2)) / 220));
        gy = Math.max(-1, Math.min(1, (mouse[1] - (b.top + b.height / 2)) / 220));
      }
      if (Math.abs(gx - k.gaze[0]) <= 0.04 && Math.abs(gy - k.gaze[1]) <= 0.04) return;
      k.gaze = [gx, gy];
      set(k, [HOME[0][0] + gx * 1.8, HOME[0][1] + gy * 1.1, 1, 2], [HOME[1][0] + gx * 1.8, HOME[1][1] + gy * 1.1, 1, 2], 0.25, 'out');
    }
    function bwoop(k) {   // swell 1.22, settle with a wobble, tilt; eyes big, then crossed, then home
      var g = k.el.querySelector('.dfs-tinko-body');
      if (g && g.animate) g.animate([{ transform: 'scale(1) rotate(0)' }, { transform: 'scale(1.22) rotate(6deg)', offset: 0.18 }, { transform: 'scale(.92) rotate(-5deg)', offset: 0.42 }, { transform: 'scale(1.06) rotate(3deg)', offset: 0.62 }, { transform: 'scale(.98) rotate(-1.5deg)', offset: 0.82 }, { transform: 'scale(1) rotate(0)' }], { duration: 700, easing: 'ease-in-out' });
      k.bwoop = true;
      set(k, [-1.4, -0.6, 2.2, 2.2], [1.4, -0.6, 2.2, 2.2], 0.12, 'out');
      setTimeout(function () { set(k, [0.4, -0.3, 1, 2], [-0.4, -1.1, 1, 2], 0.18); }, 280);
      setTimeout(function () { k.gaze = [9, 9]; set(k, HOME[0].slice(), HOME[1].slice(), 0.3); k.bwoop = false; }, 750);
    }
    // "tinko:hello" (the course sends it when a card with him opens): he pops up from below and lands with
    // a squash, eyes shut; they open wide, then he looks at the card's button for a moment, blinks, home.
    function hello(k) {
      var g = k.el.querySelector('.dfs-tinko-body');
      k.helloAt = Date.now(); k.met = true; k.bwoop = true;
      clearTimeout(k.helloTimer1); clearTimeout(k.helloTimer2); clearTimeout(k.helloTimer3);
      if (g && g.animate) g.animate([
        { transform: 'translateY(5px) scale(.25)', opacity: 0 },
        { transform: 'translateY(-1.6px) scale(.9, 1.14)', opacity: 1, offset: 0.34 },
        { transform: 'translateY(.4px) scale(1.14, .88)', offset: 0.52 },
        { transform: 'translateY(0) scale(.96, 1.04)', offset: 0.72 },
        { transform: 'translateY(0) scale(1)' }
      ], { duration: 820, delay: 160, easing: 'cubic-bezier(.25,.8,.3,1)', fill: 'backwards' });
      set(k, [HOME[0][0], HOME[0][1] + 0.8, 1, 0.25], [HOME[1][0], HOME[1][1] + 0.8, 1, 0.25], 0.01);
      k.helloTimer1 = setTimeout(function () { set(k, [-1.5, -0.7, 1.6, 2.4], [1.5, -0.7, 1.6, 2.4], 0.14, 'out'); }, 620);
      k.helloTimer2 = setTimeout(function () {
        var stage = k.el.closest('[data-lesson-stage]') || document;
        var cta = stage.querySelector('.btn-icon-link, .tinko-stage_cta'), dx = 0, dy = 0;
        if (cta) {
          var a = k.el.getBoundingClientRect(), b = cta.getBoundingClientRect();
          var vx = (b.left + b.width / 2) - (a.left + a.width / 2), vy = (b.top + b.height / 2) - (a.top + a.height / 2);
          var len = Math.sqrt(vx * vx + vy * vy) || 1; dx = vx / len; dy = vy / len;
        }
        set(k, [HOME[0][0] + dx * 1.9, HOME[0][1] + dy * 1.3, 1, 2], [HOME[1][0] + dx * 1.9, HOME[1][1] + dy * 1.3, 1, 2], 0.35);
      }, 1000);
      k.helloTimer3 = setTimeout(function () {
        k.bwoop = false; k.gaze = [9, 9]; k.nextBlink = 0;
        set(k, HOME[0].slice(), HOME[1].slice(), 0.4);
      }, 2300);
    }
    function step() {
      all.forEach(function (k) {
        if (!k.seen || k.bwoop) return;
        k.tick++;
        if (k.seq) {      // a working gesture: one pose every 0.9 s
          if (k.tick % 9 === 0) { var f = k.seq.shift(); if (f) set(k, f[0].slice(), f[1].slice(), 0.45); else { k.seq = null; k.gaze = [9, 9]; } }
          return;
        }
        if (Date.now() > k.nextGesture && !k.goofing) {
          k.nextGesture = Date.now() + 7000 + Math.random() * 9000;
          var gi = GESTURES[Math.floor(Math.random() * GESTURES.length)]; k.seq = [gi, gi]; return;
        }
        goof(k); if (!k.goofing) follow(k);
        blink(k);
      });
    }

    document.querySelectorAll('[data-tinko-mascot]:not([data-tinko-on])').forEach(function (el) {
      el.setAttribute('data-tinko-on', '');
      var svg = el.tagName.toLowerCase() === 'svg' ? el : el.appendChild(document.createElementNS(NS, 'svg'));
      svg.setAttribute('viewBox', '-1 -1 16 13');
      svg.setAttribute('aria-hidden', 'true');
      svg.style.overflow = 'visible';
      svg.innerHTML = svgMarkup();
      if (still) return;
      // The outline morph is SVG animation: it keeps changing the shape every frame, even while he's
      // hidden. So it only plays while he's on screen.
      if (svg.pauseAnimations) svg.pauseAnimations();
      var k = { el: el, eyes: svg.querySelectorAll('.dfs-tinko-eye'), now: [HOME[0].slice(), HOME[1].slice()], gaze: [0, 0], tick: 0,
        nextBlink: Date.now() + 2000, nextGoof: Date.now() + 5000, nextGesture: Date.now() + 9000, seq: null, seen: false, met: false };
      all.push(k);
      el.addEventListener('click', function () { bwoop(k); });
      el.addEventListener('tinko:hello', function () { hello(k); });
      // The first time he comes into view he says hello with the bwoop (unless a card just gave him his own hello)
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          k.seen = entries[0].isIntersecting;
          if (svg.pauseAnimations) { if (k.seen) svg.unpauseAnimations(); else svg.pauseAnimations(); }
          if (k.seen && !k.met) { k.met = true; setTimeout(function () { if (Date.now() - (k.helloAt || 0) > 2500) bwoop(k); }, 350); }
        }, { threshold: 0.6 }).observe(el);
      } else { k.seen = true; if (svg.unpauseAnimations) svg.unpauseAnimations(); }
    });
    if (all.length && !dfsTinkoMascot.running) {
      dfsTinkoMascot.running = true;
      setInterval(step, 100);
      document.addEventListener('mousemove', function (e) { mouse = [e.clientX, e.clientY]; }, { passive: true });
    }
  }

  // =========================================================
  // TINKO LINK — the course → Tinko hand-off without browser questions (19 Oct, Rim: "smooth").
  // The page talks to the dfs-helper worker (tinko/worker, /course/*) with the member's Memberstack token
  // in a POST body (never a URL or the clipboard); the worker answers with a ticket (signed, an hour) the
  // page uses after that. Three uses:
  //  - dfsTinkoInstallCode: the install line gets a one-time code (`… | sh -s K7QM-4XRT-9PWD`, once,
  //    15 minutes, renewed while the page is open), so Tinko connects himself on first launch and the
  //    Connect step goes.
  //  - dfsTinkoOnline: is this member's Tinko open right now? Then "Open Tinko" ([data-tinko-stage],
  //    dfsTinko) goes through the worker and he comes forward on that stage; else dfshelper://stage/N.
  //  - dfsTinkoClaim: Tinko's own Connect opens /login?tinko-claim=… (a gated page would send a logged-out
  //    visitor to /login before this code could keep the claim); once the member is logged in (already, or
  //    on the page after logging in), the page tells the worker who it is and Tinko collects his licence.
  // Plan: tinko/docs/course-handoff-plan.md.
  // =========================================================
  var TINKO_WORKER = 'https://dfs-helper.dfs-helper-worker.workers.dev';
  var tinkoLink = { ticket: null, online: false, checked: 0, code: null };

  function tinkoMode() {
    return location.hostname === 'dfs-staging.webflow.io' ? 'sandbox' : 'live';
  }

  // The member token the dfs-helper worker verifies: Memberstack's own getter first, then where
  // the DOM package keeps it (localStorage or the _ms-mid cookie), depending on its settings.
  function tinkoMemberToken(ms) {
    try { var t = ms.getMemberCookie && ms.getMemberCookie(); if (t) return t; } catch (e) {}
    try { var l = localStorage.getItem('_ms-mid'); if (l) return l; } catch (e) {}
    var m = document.cookie.match(/(?:^|;\s*)_ms-mid=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  // { ticket } while we have a fresh one, else { token } for a logged-in member, else null.
  function tinkoWho() {
    if (tinkoLink.ticket && Date.now() - tinkoLink.ticket.at < 50 * 60 * 1000) return Promise.resolve({ ticket: tinkoLink.ticket.value });
    return new Promise(function (resolve) {
      whenMemberstackReady(function () {
        var ms = window.$memberstackDom;
        ms.getCurrentMember().then(function (res) {
          if (!res || !res.data) return resolve(null);
          var token = tinkoMemberToken(ms);
          resolve(token ? { token: token } : null);
        }).catch(function () { resolve(null); });
      });
    });
  }

  // POST /course/<action>. text/plain, so the browser sends it straight away (no CORS preflight).
  function tinkoAsk(action, extra) {
    return tinkoWho().then(function (who) {
      if (!who) return null;
      var body = Object.assign({ mode: tinkoMode() }, extra || {}, who);
      return fetch(TINKO_WORKER + '/course/' + action, {
        method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body)
      }).then(function (r) {
        return r.json().then(function (j) { j.status = r.status; return j; });
      }).then(function (j) {
        if (j.ticket) tinkoLink.ticket = { value: j.ticket, at: tinkoLink.ticket && tinkoLink.ticket.value === j.ticket ? tinkoLink.ticket.at : Date.now() };
        if (j.code === 'bad-ticket') tinkoLink.ticket = null;
        return j;
      });
    }).catch(function () { return null; });
  }

  function dfsTinkoInstallCode() {
    function refresh() {
      tinkoAsk('code').then(function (j) {
        if (!j || !j.code) return;
        tinkoLink.code = { value: j.code, at: Date.now() };
        document.querySelectorAll('[data-helper-line]').forEach(function (line) {
          var base = line.getAttribute('data-helper-base') || line.textContent.trim().replace(/\s+-s\s+\S+$/, '');
          line.setAttribute('data-helper-base', base);
          line.textContent = base + ' -s ' + j.code;
        });
        // The code connects him: the Connect step isn't needed (it stays for logged-out visitors).
        document.querySelectorAll('[data-helper-connect]').forEach(function (button) {
          var block = button.closest('.work_files') || button.closest('.tinko_actions');
          if (block) block.style.display = 'none';
        });
        document.querySelectorAll('.tk_after').forEach(function (p) {
          p.textContent = 'Tinko installs himself in Applications, opens, and connects to your account. The line is yours: it works once.';
        });
      });
    }
    refresh();
    setInterval(function () { if (!document.hidden) refresh(); }, 10 * 60 * 1000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden && tinkoLink.code && Date.now() - tinkoLink.code.at > 10 * 60 * 1000) refresh();
    });
  }

  // Asked when the page loads, when it's back in view, and when the pointer comes near an Open Tinko
  // button (if the last answer is older than 15 s), so the click itself knows which way to go.
  function dfsTinkoOnline() {
    function check() {
      tinkoLink.checked = Date.now();
      tinkoAsk('online').then(function (j) { tinkoLink.online = !!(j && j.online); });
    }
    check();
    document.addEventListener('visibilitychange', function () { if (!document.hidden) check(); });
    document.addEventListener('pointerover', function (event) {
      if (event.target.closest && event.target.closest('[data-tinko-stage]') && Date.now() - tinkoLink.checked > 15000) check();
    });
  }

  function dfsTinkoClaim() {
    var KEY = 'dfs-tinko-claim';
    var params = new URLSearchParams(location.search);
    var fromUrl = params.get('tinko-claim');
    if (fromUrl) {
      try { localStorage.setItem(KEY, JSON.stringify({ claim: fromUrl, at: Date.now() })); } catch (e) {}
      params.delete('tinko-claim');
      history.replaceState(history.state, '', location.pathname + (params.toString() ? '?' + params : '') + location.hash);
    }
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (!saved) return;
    if (Date.now() - saved.at > 15 * 60 * 1000) { try { localStorage.removeItem(KEY); } catch (e) {} return; }
    tinkoWho().then(function (who) {
      // Not logged in: the claim waits in this browser and is used on the page after logging in.
      if (!who) {
        if (fromUrl) tinkoToast('Log in, and Tinko connects by himself.');
        return;
      }
      tinkoAsk('claim', { claim: saved.claim }).then(function (j) {
        try { localStorage.removeItem(KEY); } catch (e) {}
        tinkoToast(j && j.ok ? 'Tinko is connected. He\u2019s waiting for you on your Mac.' : 'That Connect took too long. Press Connect in Tinko again.');
      });
    });
  }

  function tinkoToast(text) {
    var el = document.createElement('div');
    el.textContent = text;
    el.setAttribute('role', 'status');
    el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:9999;max-width:calc(100% - 32px);' +
      'padding:12px 18px;border-radius:8px;background:#201A1A;color:#FBF7EF;font-size:14px;line-height:1.4;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.18);transition:opacity .4s';
    document.body.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; }, 6000);
    setTimeout(function () { el.remove(); }, 6500);
  }

  // The install line's Copy button: [data-helper-copy] copies the text of [data-helper-line] next to it.
  // One listener on the page, so it keeps working when the course player swaps lessons.
  function dfsHelperCopy() {
    window.addEventListener('click', function (event) {
      var button = event.target.closest && event.target.closest('[data-helper-copy]');
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();   // capture on window: before Webflow's href="#" scroll-to-top
      var box = button.closest('.tk_code') || button.parentNode;
      var line = box && box.querySelector('[data-helper-line]');
      var text = line ? line.textContent.trim() : '';
      if (!text) return;
      var label = button.getAttribute('data-label') || button.textContent;
      button.setAttribute('data-label', label);
      function done() {
        button.textContent = 'Copied';
        setTimeout(function () { button.textContent = label; }, 2000);
      }
      function fallback() {
        var area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        area.remove();
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    }, true);
  }

  // =========================================================
  // DFS HELPER — lesson 0.3 in the course, /helper-test (built in Webflow) and /onbaording-test (drawn here)
  // In Webflow the block is elements: [data-helper-connect] (the Connect button),
  // [data-helper-who] and [data-helper-status] (text lines); this only wires them up. Without them
  // (/onbaording-test) it draws its own card. The Mac helper app (Tinko) opens /helper-test with
  // ?helper=connect; once Memberstack knows who's logged in, the member token goes to the app through
  // dfshelper://connect, and the dfs-helper worker turns it into a licence.
  // =========================================================
  function dfsHelper() {
    var WORKER = 'https://dfs-helper.dfs-helper-worker.workers.dev';
    var MODE = location.hostname === 'dfs-staging.webflow.io' ? 'sandbox' : 'live';
    var STAR = 'M21.127 5.125H26.873V10.876L26.874 10.875L32 16.001L26.874 21.126L26.873 21.125V26.8691H21.126' +
      'L21.127 26.8701L16.001 31.9961L10.875 26.8701L10.876 26.8691H5.12598V21.126L0 16.001L5.12598 10.875V5.125' +
      'H10.875L16.001 0L21.127 5.125ZM12.375 12.374H6.625L10.252 16.001L6.63184 19.6201H12.375V25.3701L16.001 ' +
      '21.7451L19.624 25.3672V19.6201H25.3682L21.748 16.001L25.375 12.374H19.624V6.62793L16.001 10.251L12.375 ' +
      '6.625V12.374Z';

    // Built in Webflow: wire up what's there
    var card = document.querySelector('[data-helper-connect]') ? document : null;
    if (!card) {
      if (!document.getElementById('dfs-helper-style')) {
        var style = document.createElement('style');
        style.id = 'dfs-helper-style';
        style.textContent =
          '.dfs-helper{max-width:520px;margin:3rem auto;padding:2rem;border:1px solid #DFD5CA;border-radius:12px;' +
          'background:#F1EDE3;color:#3D3A36;text-align:center;font-family:inherit}' +
          '.dfs-helper svg{width:36px;height:36px;display:block;margin:0 auto 1rem}' +
          '.dfs-helper h3{margin:0 0 .4rem;font-size:1.5rem;font-weight:400}' +
          '.dfs-helper p{margin:0 0 1.25rem;font-size:.85rem;line-height:1.6;opacity:.75}' +
          '.dfs-helper-row{display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap}' +
          '.dfs-helper a.dfs-helper-btn,.dfs-helper button.dfs-helper-btn{display:inline-block;padding:.7rem 1.4rem;' +
          'border-radius:8px;border:1px solid #3D3A36;background:#3D3A36;color:#FBF7EF;font-size:.85rem;cursor:pointer;' +
          'text-decoration:none;font-family:inherit}' +
          '.dfs-helper button.dfs-helper-btn.is-light{background:transparent;color:#3D3A36}' +
          '.dfs-helper-who{margin:1.25rem 0 0;font-size:.8rem;opacity:.7}' +
          '.dfs-helper-status{margin:.4rem 0 0;font-size:.8rem;min-height:1.2em;color:#1A97D7}';
        document.head.appendChild(style);
      }

      card = document.createElement('section');
      card.className = 'dfs-helper';
      card.innerHTML =
        '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="#3D3A36" fill-rule="evenodd" d="' + STAR + '"/></svg>' +
        '<h3>DFS Helper</h3>' +
        '<p>The course’s helper app for your Mac. Get it, open it, and connect it to your account here.</p>' +
        '<div class="dfs-helper-row">' +
        '<a class="dfs-helper-btn" href="' + WORKER + '/download">Get the helper</a>' +
        '<button type="button" class="dfs-helper-btn is-light" data-helper-connect>Connect the app</button>' +
        '</div>' +
        '<p class="dfs-helper-who" data-helper-who>Checking who’s logged in…</p>' +
        '<p class="dfs-helper-status" data-helper-status></p>';
      document.body.appendChild(card);
    }

    var status = card.querySelector('[data-helper-status]');
    var who = card.querySelector('[data-helper-who]');
    function setStatus(text) { status.textContent = text; }

    // Who Memberstack thinks you are on this domain (staging = sandbox members, live = real members).
    whenMemberstackReady(function () {
      window.$memberstackDom.getCurrentMember().then(function (res) {
        var member = res && res.data;
        who.textContent = member
          ? 'Logged in as ' + (member.auth && member.auth.email ? member.auth.email : member.id) + ' (' + MODE + ')'
          : 'Not logged in on this domain. Log in first, then Connect the app.';
      }).catch(function () { who.textContent = 'Memberstack didn’t answer.'; });
    });

    function connect() {
      setStatus('Checking who you are…');
      whenMemberstackReady(function () {
        var ms = window.$memberstackDom;
        ms.getCurrentMember().then(function (res) {
          var member = res && res.data;
          if (!member) {
            setStatus('Log in first (the Log in link in the menu), then click Connect the app again.');
            return;
          }
          var token = tinkoMemberToken(ms);
          if (!token) {
            setStatus('Couldn’t read your login. Log out, log in again, and try once more.');
            return;
          }
          setStatus('Opening DFS Helper… Nothing happening? Download and open the app first, then try again.');
          location.href = 'dfshelper://connect?token=' + encodeURIComponent(token) + '&mode=' + MODE;
        }).catch(function () {
          setStatus('Memberstack didn’t answer. Reload the page and try again.');
        });
      });
    }

    var connectBtn = card.querySelector('[data-helper-connect]');
    connectBtn.addEventListener('click', function (e) { e.preventDefault(); connect(); });
    // Opened by the app: connect straight away.
    if (new URLSearchParams(location.search).get('helper') === 'connect') {
      connectBtn.scrollIntoView({ block: 'center' });
      connect();
    }
  }

  // =========================================================
  // BLOG: TABLE OF CONTENTS — article pages (/blog/…)
  // Osmo Supply's "Table of Contents for Article", as it came (only the plugin registration is
  // guarded and it starts from the router below). [data-toc-wrap] holds the list
  // ([data-toc-list] with one [data-toc-link] template link) and the rich text ([data-toc-content]).
  // One link per H2/H3; the heading you're reading gets data-toc-status="active" (styles.css).
  // {skip} in a heading leaves it out of the list. The click scrolls through Lenis.
  // =========================================================
  function dfsToc() {
    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

    document.querySelectorAll('[data-toc-wrap]').forEach(root => {
      const contentEl = root.querySelector('[data-toc-content]');
      const listEl = root.querySelector('[data-toc-list]');
      const templateLink = listEl?.querySelector('[data-toc-link]');
      if (!contentEl || !listEl || !templateLink) return;

      const levels = (root.getAttribute('data-toc-levels') || 'h2,h3').split(',').map(l => l.trim().toLowerCase()).filter(l => /^h[1-6]$/.test(l));
      const levelSelector = levels.join(', ');
      if (!levelSelector) return;

      const offset = parseInt(root.getAttribute('data-toc-offset')) || 50;
      const marker = '{skip}';

      const slugCounts = new Map();

      function slugify(text) {
        let slug = text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        if (!slug) slug = 'section';

        const count = slugCounts.get(slug) || 0;
        slugCounts.set(slug, count + 1);
        return count === 0 ? slug : slug + '-' + (count + 1);
      }

      function stripMarker(el) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (node.textContent.includes(marker)) {
            node.textContent = node.textContent.replace(marker, '').trim();
          }
        }
      }

      const allHeadings = Array.from(contentEl.querySelectorAll(levelSelector));
      const headings = [];

      allHeadings.forEach(heading => {
        if (heading.hasAttribute('data-toc-ignore')) return;
        if (heading.textContent.includes(marker)) {
          stripMarker(heading);
          return;
        }
        const text = heading.textContent.trim();
        if (!text) return;
        headings.push(heading);
      });

      if (!headings.length) return;

      headings.forEach(heading => {
        if (!heading.id) {
          heading.id = slugify(heading.textContent.trim());
        }
      });

      const tocLinks = [];

      headings.forEach(heading => {
        const clone = templateLink.cloneNode(true);
        const textTarget = clone.querySelector('[data-toc-text]') || clone;
        textTarget.textContent = heading.textContent.trim();

        clone.href = '#' + heading.id;
        clone.removeAttribute('data-toc-link');
        clone.setAttribute('data-toc-item', '');

        const level = heading.tagName.charAt(1);
        clone.setAttribute('data-toc-depth', level);

        listEl.appendChild(clone);
        tocLinks.push(clone);
      });

      listEl.querySelectorAll('[data-toc-link]').forEach(el => el.remove());

      // Active state tracking via ScrollTrigger
      if (typeof ScrollTrigger !== 'undefined') {
        function setActive(index) {
          tocLinks.forEach(link => link.setAttribute('data-toc-status', ''));
          if (tocLinks[index]) tocLinks[index].setAttribute('data-toc-status', 'active');
        }

        headings.forEach((heading, i) => {
          const nextHeading = headings[i + 1];

          ScrollTrigger.create({
            trigger: heading,
            start: 'top ' + (offset + 1) + 'px',
            endTrigger: nextHeading || contentEl,
            end: nextHeading ? 'top ' + (offset + 1) + 'px' : 'bottom top',
            onToggle: self => {
              if (self.isActive) setActive(i);
            }
          });
        });

        if (window.scrollY <= headings[0].getBoundingClientRect().top + window.scrollY - offset) {
          setActive(0);
        }
      }

      // Click handler with smooth scroll
      listEl.addEventListener('click', e => {
        const link = e.target.closest('[data-toc-item]');
        if (!link) return;
        e.preventDefault();
        e.stopPropagation();

        const id = link.getAttribute('href')?.slice(1);
        const target = document.getElementById(id);
        if (!target) return;

        if (typeof lenis !== 'undefined' && typeof lenis.scrollTo === 'function') {
          lenis.scrollTo(target, { offset: -offset });
        } else {
          const y = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      });
    });
  }

  // =========================================================
  // BLOG: TOPIC FILTER — /resources
  // Osmo Supply's "Multi Filter Setup (Multi Match)", as it came (it starts from the router below).
  // The topic buttons ([data-filter-target] = the topic slug) come from the Topics collection; each
  // article card collects its topics from the [data-filter-name-collect] chips inside it. Several
  // topics can be on at once and an article shows when it has any of them
  // (data-filter-name-match="multi" on the group; "single" = it must have all of them).
  // The states (active / transition-out / not-active) are styled in styles.css.
  // =========================================================
  function dfsFilter() {

    const transitionDelay = 300;
    const groups = [...document.querySelectorAll('[data-filter-group]')];

    groups.forEach(group => {
      const targetMatch = (group.getAttribute('data-filter-target-match') || 'multi').trim().toLowerCase(); // 'single' | 'multi'
      const nameMatch   = (group.getAttribute('data-filter-name-match')   || 'multi').trim().toLowerCase(); // 'single' | 'multi'

      const buttons = [...group.querySelectorAll('[data-filter-target]')];
      const items   = [...group.querySelectorAll('[data-filter-name]')];

      // Collect tokens from children if present
      items.forEach(item => {
        const collectors = item.querySelectorAll('[data-filter-name-collect]');
        if (!collectors.length) return;
        const seen = new Set(), tokens = [];
        collectors.forEach(c => {
          const v = (c.getAttribute('data-filter-name-collect') || '').trim().toLowerCase();
          if (v && !seen.has(v)) {
            seen.add(v);
            tokens.push(v);
          }
        });
        if (tokens.length) item.setAttribute('data-filter-name', tokens.join(' '));
      });

      // Cache item tokens
      const itemTokens = new Map();
      items.forEach(el => {
        const raw = (el.getAttribute('data-filter-name') || '').trim().toLowerCase();
        const tokens = raw ? raw.split(/\s+/).filter(Boolean) : [];
        itemTokens.set(el, new Set(tokens));
      });

      const setItemState = (el, on) => {
        const next = on ? 'active' : 'not-active';
        if (el.getAttribute('data-filter-status') !== next) {
          el.setAttribute('data-filter-status', next);
          el.setAttribute('aria-hidden', on ? 'false' : 'true');
        }
      };

      const setButtonState = (btn, on) => {
        const next = on ? 'active' : 'not-active';
        if (btn.getAttribute('data-filter-status') !== next) {
          btn.setAttribute('data-filter-status', next);
          btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        }
      };

      // Active tags model
      let activeTags = targetMatch === 'single' ? null : new Set(['all']);

      const hasRealActive = () => {
        if (targetMatch === 'single') return activeTags !== null;
        return activeTags.size > 0 && !activeTags.has('all');
      };

      const resetAll = () => {
        if (targetMatch === 'single') {
          activeTags = null;
        } else {
          activeTags.clear();
          activeTags.add('all');
        }
      };

      // Matching logic
      const itemMatches = (el) => {
        if (!hasRealActive()) return true;
        const tokens = itemTokens.get(el);

        if (targetMatch === 'single') {
          return tokens.has(activeTags);
        } else {
          const selected = [...activeTags];
          if (nameMatch === 'single') {
            // AND logic: must contain all selected
            for (let i = 0; i < selected.length; i++) {
              if (!tokens.has(selected[i])) return false;
            }
            return true;
          } else {
            // OR logic: must contain any selected
            for (let i = 0; i < selected.length; i++) {
              if (tokens.has(selected[i])) return true;
            }
            return false;
          }
        }
      };

      const paint = (rawTarget) => {
        const target = (rawTarget || '').trim().toLowerCase();
        if ((target === 'all' || target === 'reset') && !hasRealActive()) return;

        if (target === 'all' || target === 'reset') {
          resetAll();
        } else if (targetMatch === 'single') {
          activeTags = target;
        } else {
          if (activeTags.has('all')) activeTags.delete('all');
          if (activeTags.has(target)) activeTags.delete(target);
          else activeTags.add(target);
          if (activeTags.size === 0) resetAll();
        }

        // Update items
        items.forEach(el => {
          if (el._ft) clearTimeout(el._ft);
          const next = itemMatches(el);
          const cur = el.getAttribute('data-filter-status');
          if (cur === 'active' && transitionDelay > 0) {
            el.setAttribute('data-filter-status','transition-out');
            el._ft = setTimeout(() => { setItemState(el, next); el._ft = null; }, transitionDelay);
          } else if (transitionDelay > 0) {
            el._ft = setTimeout(() => { setItemState(el, next); el._ft = null; }, transitionDelay);
          } else {
            setItemState(el, next);
          }
        });

        // Update buttons
        buttons.forEach(btn => {
          const t = (btn.getAttribute('data-filter-target') || '').trim().toLowerCase();
          let on = false;
          if (t === 'all') on = !hasRealActive();
          else if (t === 'reset') on = hasRealActive();
          else on = targetMatch === 'single' ? activeTags === t : activeTags.has(t);
          setButtonState(btn, on);
        });
      };

      group.addEventListener('click', e => {
        const btn = e.target.closest('[data-filter-target]');
        if (btn && group.contains(btn)) paint(btn.getAttribute('data-filter-target'));
      });

      paint('all');
    });
  }

  // =========================================================
  // BLOG: RECOMMENDED — under an article ([data-blog-more] collection list)
  // The list fetches the newest four; its last card is hidden by its class (post_more-item, last-child), so three
  // show, in the Designer too. When the article you're on is one of the first three, it goes and the fourth fills in.
  // =========================================================
  function dfsBlogMore() {
    document.querySelectorAll('[data-blog-more]').forEach(function (list) {
      var here = location.pathname.replace(/\/+$/, '');
      var items = [].slice.call(list.querySelectorAll('.w-dyn-item'));
      var current = items.filter(function (item) {
        var a = item.querySelector('a[href]');
        return a && a.pathname.replace(/\/+$/, '') === here;
      })[0];
      if (!current) return;
      current.style.display = 'none';
      var last = items[items.length - 1];
      if (last !== current) last.style.display = 'block';
    });
  }

  // =========================================================
  // BLOG: COVERS — one look for every picture
  // Every cover is drawn as a two-colour dither of its picture (4×4 Bayer, in the palette of the article's
  // "Dither cover" option: the homepage journal's three), so any image gets the same feel. It renders in
  // steps from chunky pixels to the fine dither (after Osmo's Pixelate Image Render): when a card first
  // scrolls into view, quickly again on hover, and the article's own cover (.post_cover) once on load.
  // Also measures --ex per card (the excerpt + gap): at rest the picture is taller and the excerpt waits
  // below; on hover the picture gives that room back and the excerpt slides in ("Blog card styles").
  // =========================================================
  function dfsBlogCovers() {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var canHover = window.matchMedia('(hover: hover)').matches;
    var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    var PAL = { // [day, night], each [back, front], as the homepage journal covers
      stack: [['#16181d', '#e9e3d6'], ['#16181d', '#c9c3b6']],
      flow: [['#e3dccf', '#0297db'], ['#1b2236', '#1dabfa']],
      sun: [['#0e1628', '#7f90bb'], ['#0e1628', '#8a9bc6']]
    };
    var DITHER = 3; // css px per dither cell when it's fine
    var isNight = function () { return document.documentElement.classList.contains('dfs-night'); };
    var hex = function (h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
    var lum = function (c) { return .299 * c[0] + .587 * c[1] + .114 * c[2]; };
    var states = [];

    function measure(st) {
      if (!st.card) return;
      var ex = 0, p = st.card.querySelector('.res_excerpt');
      if (canHover && p) ex = p.offsetHeight + (parseFloat(getComputedStyle(st.card).rowGap) || 0);
      st.card.style.setProperty('--ex', ex + 'px');
    }
    function size(st) {
      var r = st.cv.getBoundingClientRect();
      st.dpr = Math.min(2, window.devicePixelRatio || 1);
      st.W = Math.max(1, Math.round(r.width * st.dpr));
      st.H = Math.max(1, Math.round(r.height * st.dpr));
      st.cv.width = st.W; st.cv.height = st.H;
      st.fine = Math.max(8, Math.round(r.width / DITHER));
    }
    // draw the dither at a given number of columns (few = chunky, st.fine = the resting look)
    function draw(st, cols) {
      if (!st.ready || !st.W) return;
      st.cols = cols;
      var cw = Math.max(1, Math.round(cols)), ch = Math.max(1, Math.round(cols * st.H / st.W));
      var iw = st.img.naturalWidth, ih = st.img.naturalHeight, s = Math.max(st.W / iw, st.H / ih);
      var sw = st.W / s, sh = st.H / s;
      st.small.width = cw; st.small.height = ch;
      st.sctx.imageSmoothingEnabled = true;
      st.sctx.drawImage(st.img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, cw, ch);
      var pair = (PAL[st.art] || PAL.flow)[isNight() ? 1 : 0].map(hex);
      var dark = lum(pair[0]) < lum(pair[1]) ? pair[0] : pair[1], light = dark === pair[0] ? pair[1] : pair[0];
      var d = st.sctx.getImageData(0, 0, cw, ch), a = d.data, lo = 255, hi = 0, sum = 0, j, v;
      // each picture on its own range, its average pulled toward the middle: a pale misty one still shows
      // its shapes and a dark one doesn't go solid
      for (j = 0; j < a.length; j += 4) { v = .299 * a[j] + .587 * a[j + 1] + .114 * a[j + 2]; sum += v; if (v < lo) lo = v; if (v > hi) hi = v; }
      var span = Math.max(24, hi - lo), shift = ((sum / (a.length / 4) - lo) / span - .5) * .5;
      for (var y = 0; y < ch; y++) {
        for (var x = 0; x < cw; x++) {
          var i = (y * cw + x) * 4;
          var l = Math.min(1, Math.max(0, ((.299 * a[i] + .587 * a[i + 1] + .114 * a[i + 2] - lo) / span - shift - .5) * 1.2 + .5));
          var c = l > (BAYER[(y & 3) * 4 + (x & 3)] + .5) / 16 ? light : dark;
          a[i] = c[0]; a[i + 1] = c[1]; a[i + 2] = c[2]; a[i + 3] = 255;
        }
      }
      st.sctx.putImageData(d, 0, 0);
      st.ctx.imageSmoothingEnabled = false;
      st.ctx.drawImage(st.small, 0, 0, cw, ch, 0, 0, st.W, st.H);
    }
    // render in steps from `from` columns to the fine dither, `ms` per step (Osmo's stepped render)
    function render(st, from, steps, ms) {
      cancelAnimationFrame(st.anim);
      if (reduce || steps < 2) { draw(st, st.fine); return; }
      var list = [], ratio = Math.pow(st.fine / from, 1 / (steps - 1)), shown = -1, t0 = 0;
      for (var i = 0; i < steps; i++) list.push(Math.round(from * Math.pow(ratio, i)));
      list[steps - 1] = st.fine;
      (function step(now) {
        if (!t0) t0 = now;
        var k = Math.max(0, Math.min(steps - 1, Math.floor((now - t0) / ms))); // a frame's time can be a hair before t0
        if (k !== shown) { shown = k; draw(st, list[k]); }
        if (k < steps - 1) st.anim = requestAnimationFrame(step);
      })(performance.now());
    }

    function setup(cover, card) {
      var tag = cover.querySelector('img');
      if (!tag || tag.classList.contains('w-dyn-bind-empty') || !tag.getAttribute('src')) return;
      var cv = document.createElement('canvas');
      cv.className = 'res_cover-fx';
      cv.setAttribute('aria-hidden', 'true');
      cover.appendChild(cv);
      tag.style.opacity = '0'; // the filter is the look; the real <img> stays for its alt text and as the fallback
      var st = { cover: cover, card: card, cv: cv, ctx: cv.getContext('2d'), small: document.createElement('canvas'),
        img: new Image(), anim: 0, ready: false, art: cover.getAttribute('data-journal-art') || 'flow' };
      st.sctx = st.small.getContext('2d', { willReadFrequently: true });
      states.push(st);
      measure(st);
      st.img.crossOrigin = 'anonymous';
      st.img.onload = function () {
        st.ready = true; size(st);
        if (!card) { render(st, 12, 12, 70); return; } // the article's own cover: renders in once
        draw(st, 12); // chunky until it scrolls in
        var seen = new IntersectionObserver(function (es) {
          if (!es[0].isIntersecting) return;
          seen.disconnect();
          render(st, 12, 12, 70);
        }, { rootMargin: '0px 0px -15% 0px', threshold: .25 });
        seen.observe(cover);
        if (canHover) card.addEventListener('pointerenter', function () { render(st, 16, 6, 45); });
      };
      st.img.onerror = function () { cv.remove(); tag.style.opacity = ''; };
      st.img.src = tag.currentSrc || tag.src;
    }

    document.querySelectorAll('.res_card .res_cover').forEach(function (cover) { setup(cover, cover.closest('.res_card')); });
    document.querySelectorAll('.post_cover').forEach(function (cover) { setup(cover, null); });

    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () { states.forEach(function (st) { measure(st); if (st.ready) { size(st); draw(st, st.fine); } }); }, 150);
    });
    new MutationObserver(function () {
      states.forEach(function (st) { if (st.ready) draw(st, st.cols || st.fine); });
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  // =========================================================
  // FOOTER (NEW) — the "Footer (new)" component ([data-foot]), from the test homepage
  // The ground (mountains) comes up and the lines draw in as the footer scrolls into view; Log in says My courses
  // when you're signed in and fills like a load on click; [data-foot-to] links scroll to that part of the page
  // when it's there (otherwise they follow their own link). The dashes and the night mountains are in the
  // component's own embed. On the test homepage dive/solutions.js runs this footer itself, so not there.
  // =========================================================
  function dfsFooter() {
    if (document.querySelector('[data-dive]')) return;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var smooth = function (a, b, x) { var t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

    document.querySelectorAll('[data-foot]').forEach(function (host) {
      var ground = host.querySelector('[data-foot-ground]'), frameEl = host.querySelector('[data-foot-frame]');
      var lines = [].slice.call(host.querySelectorAll('[data-foot-line]')), hline = host.querySelector('[data-foot-hline]');
      var rules = [].slice.call(host.querySelectorAll('[data-foot-rule]'));
      var cols = [].slice.call(host.querySelectorAll('[data-foot-col]'));
      var cells = [].slice.call(host.querySelectorAll('[data-foot-cell]')).map(function (c) {
        return { lines: [].slice.call(c.querySelectorAll('[data-foot-cline]')), inner: c.querySelector('[data-foot-in]'), fromRight: c.dataset.footCell === 'left' };
      });

      host.querySelectorAll('[data-foot-to]').forEach(function (a) {
        a.addEventListener('click', function (e) {
          var to = document.querySelector(a.dataset.footTo); if (!to) return;
          e.preventDefault();
          var y = to.getBoundingClientRect().top + scrollY - innerHeight * .12;
          window.lenis ? window.lenis.scrollTo(y, { duration: 1.6 }) : scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
        });
      });
      host.querySelectorAll('[data-foot-soon]').forEach(function (a) { a.addEventListener('click', function (e) { e.preventDefault(); }); });

      var login = host.querySelector('[data-foot-login]'), loginText = host.querySelector('[data-foot-login-text]');
      if (login) {
        var signedIn = function () {
          try { if (localStorage.getItem('_ms-mid')) return true; } catch (e) {}
          return /(?:^|;\s*)_ms-mid=/.test(document.cookie);
        };
        var mark = function (yes) { if (!yes) return; login.setAttribute('href', '/dashboard'); if (loginText) loginText.textContent = 'My courses'; };
        mark(signedIn());
        whenMemberstackReady(function () {
          window.$memberstackDom.getCurrentMember().then(function (r) { mark(!!(r && r.data)); }).catch(function () {});
        });
        login.addEventListener('click', function (e) {
          if (reduce || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
          e.preventDefault();
          login.classList.add('is-loading');
          setTimeout(function () { location.href = login.getAttribute('href'); }, 650);
        });
        addEventListener('pageshow', function () { login.classList.remove('is-loading'); });
      }

      var cut = function (k) { return ((1 - k) * 100).toFixed(2) + '%'; };
      var draw = function (p) {
        if (ground) ground.style.transform = 'translate3d(0,' + ((1 - p) * 16).toFixed(2) + 'vh,0)';
        lines.forEach(function (l, i) { l.style.clipPath = 'inset(0 0 ' + cut(smooth(.35 + i * .03, .85 + i * .03, p)) + ' 0)'; });
        if (hline) hline.style.clipPath = 'inset(0 ' + cut(smooth(.35, .85, p)) + ' 0 0)';
        rules.forEach(function (r, i) { r.style.clipPath = 'inset(0 ' + cut(smooth(.42 + i * .06, .82 + i * .05, p)) + ' 0 0)'; });
        cols.forEach(function (c, i) {
          var k = smooth(.6 + i * .05, Math.min(.98, .88 + i * .02), p);
          c.style.opacity = k.toFixed(3); c.style.transform = 'translate3d(0,' + ((1 - k) * 14).toFixed(1) + 'px,0)';
        });
        cells.forEach(function (c, i) {
          c.lines.forEach(function (l, j) {
            var k = smooth(.66 + i * .04 + j * .03, .9 + i * .03 + j * .02, p);
            l.style.clipPath = c.fromRight ? 'inset(0 0 0 ' + cut(k) + ')' : 'inset(0 ' + cut(k) + ' 0 0)';
          });
          if (c.inner) { var f = smooth(.8 + i * .03, .97 + i * .01, p); c.inner.style.opacity = f.toFixed(3); c.inner.style.transform = 'translate3d(0,' + ((1 - f) * 10).toFixed(1) + 'px,0)'; }
        });
      };
      // on phones the dashed line between the two columns starts under the brand row
      var size = function () {
        var b = cols[0] && frameEl ? cols[0].getBoundingClientRect().bottom - frameEl.getBoundingClientRect().top : 0;
        if (frameEl) frameEl.style.setProperty('--b', Math.max(0, b).toFixed(0) + 'px');
      };
      size(); addEventListener('resize', size);
      if (reduce) { draw(1); return; }

      var on = false, raf = 0, last = -1;
      var frame = function () {
        raf = 0; if (!on) return;
        var vh = innerHeight, top = host.getBoundingClientRect().top;
        var p = Math.max(0, Math.min(vh, vh - top)) / vh;
        if (Math.abs(p - last) > .0005) { last = p; draw(p); }
        raf = requestAnimationFrame(frame);
      };
      draw(0);
      new IntersectionObserver(function (es) {
        on = es[0].isIntersecting; if (on && !raf) raf = requestAnimationFrame(frame);
      }).observe(host);
      addEventListener('resize', function () { last = -1; });
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
    if (document.querySelector('[data-helper-connect]')) dfsHelper();   // lesson 0.3: Tinko
  } else if (path === '/courses/fundamentals-v2') {
    // Fundamentals 2.0 build (staging): same player, lessons read from the menu, own progress key
    dfsCourse({ lessonsFromMenu: true });
    dfsFormValidation();
    if (document.querySelector('[data-helper-connect]')) dfsHelper();   // lesson 0.2: Meet Tinko
  } else if (path === '/dashboard') {
    dfsDashboard();
    if (document.querySelector('[data-helper-connect]')) dfsHelper();   // Tools: Tinko install + connect
  } else if (path === '/feedback' || path.indexOf('/feedback/') === 0) {
    // /feedback/fundamentals (course), /feedback/rythems (the Rhythms app), ...
    dfsFeedback();
  } else if (path === '/helper-test') {
    dfsCourse({ demo: true, lesson: 'lesson-2.1' });
    dfsHelper();
  } else if (path === '/onbaording-test') {
    // Order matters: Feedback sets up the form first, so Form validation skips it.
    dfsFeedback();
    dfsFormValidation();
    dfsHelper();
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
    dfsScrollHeightWatch();
    if (document.querySelector('.oneshot-race')) dfsRaceBars();
    if (document.querySelector('[data-pixel-reveal]')) dfsPixelReveal();
    if (document.querySelector('[data-float]')) dfsFloat();
    if (document.querySelector('[data-stars]')) dfsStars();
    if (document.querySelector('[data-pixel-avatar]')) dfsPixelAvatars();   // before the marquee clones the lists
    if (document.querySelector('[data-marquee-v]')) dfsMarqueeV();
    if (document.querySelector('.oneshot-compare_bar')) dfsTimeBars();
    if (document.querySelector('[data-grid-zips]')) dfsGridZips();
    if (document.querySelector('[data-greet-name]')) dfsGreeting();
    if (document.querySelector('a[data-help-mail]')) dfsHelpMail();
    if (document.querySelector('[data-login-help]')) dfsLoginHelp();
    if (document.querySelector('.form-field-icon')) dfsSquareFieldIcons();
    if (document.querySelector('[data-rhythms-app]')) dfsRhythmsApp();
    if (document.querySelector('[data-rhythms-marquee]')) dfsRhythmsMarquee();
    if (document.querySelector('[data-tinko-gate], [data-lesson-stage], [data-tinko-show]')) dfsTinko();
    if (document.querySelector('[data-tinko-mascot]')) dfsTinkoMascot();
    if (document.querySelector('[data-helper-copy]')) dfsHelperCopy();
    if (document.querySelector('[data-helper-line]')) dfsTinkoInstallCode();   // the install line's one-time code
    if (document.querySelector('[data-tinko-stage]')) dfsTinkoOnline();       // Open Tinko without the browser question
    dfsTinkoClaim();                                                          // Tinko's Connect (?tinko-claim=…)
    if (document.querySelector('[data-toc-wrap]')) dfsToc();                 // blog article: On this page
    if (document.querySelector('[data-filter-group]')) dfsFilter();          // /resources: topic filter
    if (document.querySelector('[data-blog-more]')) dfsBlogMore();           // blog article: Recommended
    if (document.querySelector('[data-foot]')) dfsFooter();                  // the new footer (component)
    if (document.querySelector('.res_cover img, .post_cover img')) dfsBlogCovers(); // blog cards: dither → picture
    if (path === '/'|| path === '/course' || path === '/test-zone') dfsHome();
  });

})();
