/* ============================================================
   PRAGMA SOFTWARES — Interaction Engine
   Motion (motion.dev) + GSAP/ScrollTrigger + Lenis + SplitType
   ============================================================ */
/* Motion (motion.dev) is lazy-loaded off the critical path so the page boots
   instantly even on a slow CDN. GSAP is the always-available baseline. */
let _M = null, _Mtried = false;
async function ensureMotion() {
  if (_Mtried) return _M;
  _Mtried = true;
  try { _M = await import("https://esm.sh/motion@12.40.0"); }
  catch (e) { console.warn("Motion unavailable, using GSAP fallback", e); _M = null; }
  return _M;
}

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const Lenis = window.Lenis;
const SplitType = window.SplitType;

const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const TOUCH = window.matchMedia("(hover: none), (pointer: coarse)").matches;
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const lerp = (a, b, n) => (1 - n) * a + n * b;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);
document.documentElement.classList.add("js");

/* ------------------------------------------------------------
   1 · SMOOTH SCROLL (Lenis ↔ ScrollTrigger)
------------------------------------------------------------ */
let lenis = null;
function smoothScroll() {
  if (REDUCED || !Lenis) return;
  lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  lenis.on("scroll", () => ScrollTrigger && ScrollTrigger.update());
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // anchor links
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length > 1 && $(id)) {
        e.preventDefault();
        lenis.scrollTo(id, { offset: -40, duration: 1.4 });
        closeMenu();
      }
    });
  });
}

/* ------------------------------------------------------------
   3 · CUSTOM CURSOR
------------------------------------------------------------ */
/* The native pointer is visible; this just trails a single small dot behind it.
   The dot inverts with the section theme (light on dark sections, dark over
   .section-light) so it stays readable everywhere. */
function cursor() {
  if (TOUCH || REDUCED) return;
  const dot = $(".cursor-dot");
  if (!dot) return;

  gsap.set(dot, { xPercent: -50, yPercent: -50 }); // center the dot on its point
  const xDot = gsap.quickTo(dot, "x", { duration: 0.18, ease: "power3" });
  const yDot = gsap.quickTo(dot, "y", { duration: 0.18, ease: "power3" });

  let onLight = false;
  window.addEventListener("mousemove", (e) => {
    xDot(e.clientX); yDot(e.clientY);
    // Flip colour when the pointer is over a light section.
    const light = !!(e.target.closest && e.target.closest(".section-light"));
    if (light !== onLight) { onLight = light; dot.classList.toggle("on-light", light); }
  });

  document.addEventListener("mouseleave", () => gsap.to(dot, { opacity: 0, duration: 0.3 }));
  document.addEventListener("mouseenter", () => gsap.to(dot, { opacity: 1, duration: 0.3 }));
}

/* ------------------------------------------------------------
   4 · MAGNETIC
------------------------------------------------------------ */
function magnetic() {
  if (TOUCH || REDUCED) return;
  $$("[data-magnetic]").forEach((el) => {
    const strength = parseFloat(el.getAttribute("data-magnetic")) || 0.35;
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
    let r = null; // cache rect on enter — only changes when the element moves
    el.addEventListener("mouseenter", () => { r = el.getBoundingClientRect(); });
    el.addEventListener("mousemove", (e) => {
      if (!r) r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    });
    el.addEventListener("mouseleave", () => { xTo(0); yTo(0); r = null; });
  });
}

/* ------------------------------------------------------------
   5 · NAV DROPDOWNS
------------------------------------------------------------ */
function navDropdowns() {
  if (TOUCH) return;

  const mega = $("#nav-mega");
  if (!mega) return;

  const sections = $$(".nav-mega-section", mega);
  const roots = $$(".nav-drop-root");
  let closeTimer = null;
  let activeId = null;

  const backdrop = document.createElement("div");
  backdrop.className = "nav-backdrop";
  document.body.appendChild(backdrop);

  function showSection(id) {
    sections.forEach((s) => s.classList.toggle("active", s.dataset.panelId === id));
    activeId = id;
  }

  function setTriggers(id) {
    roots.forEach((r) => {
      const on = r.dataset.panel === id;
      r.classList.toggle("open", on);
      r.querySelector(".nav-link-btn")?.setAttribute("aria-expanded", on ? "true" : "false");
    });
  }

  function openPanel(id) {
    clearTimeout(closeTimer);
    backdrop.classList.add("visible");
    if (!mega.classList.contains("open")) {
      // Panel is closed — load content first, then reveal
      showSection(id);
      mega.classList.add("open");
      mega.setAttribute("aria-hidden", "false");
    } else if (activeId !== id) {
      // Panel already open — crossfade content only, box stays put
      showSection(id);
    }
    setTriggers(id);
  }

  function closePanel() {
    mega.classList.remove("open");
    mega.setAttribute("aria-hidden", "true");
    backdrop.classList.remove("visible");
    setTriggers(null);
    activeId = null;
  }

  function scheduleClose() {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(closePanel, 120);
  }

  roots.forEach((root) => {
    root.addEventListener("mouseenter", () => openPanel(root.dataset.panel));
    root.addEventListener("mouseleave", scheduleClose);
  });

  mega.addEventListener("mouseenter", () => clearTimeout(closeTimer));
  mega.addEventListener("mouseleave", scheduleClose);

  backdrop.addEventListener("click", closePanel);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { clearTimeout(closeTimer); closePanel(); }
  });

  $$("a", mega).forEach((a) => {
    a.addEventListener("click", () => { clearTimeout(closeTimer); closePanel(); });
  });
}

/* ------------------------------------------------------------
   6 · NAV SCROLL HIDE/SHOW
------------------------------------------------------------ */
function closeMenu() {
  const menu = $("#mobile-menu");
  if (menu && menu.classList.contains("open")) {
    menu.classList.remove("open");
    menu.setAttribute("aria-hidden", "true");
    document.body.classList.remove("menu-open");
    $("#menu-toggle")?.setAttribute("aria-expanded", "false");
  }
}
function nav() {
  const navEl = $(".nav");
  if (!navEl) return;
  let last = 0;
  ScrollTrigger && ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (self) => {
      const y = self.scroll();
      navEl.classList.toggle("scrolled", y > 40);
      if (y > 400 && y > last) navEl.classList.add("hidden");
      else navEl.classList.remove("hidden");
      last = y;
    },
  });

  const toggle = $("#menu-toggle");
  const menu = $("#mobile-menu");
  toggle?.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    menu.setAttribute("aria-hidden", String(!open));
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
}

/* ------------------------------------------------------------
   6 · REVEAL GRAMMAR
------------------------------------------------------------ */
function reveals() {
  if (REDUCED) { $$("[data-reveal]").forEach((el) => (el.style.opacity = 1)); return; }

  // graceful fallback if SplitType is unavailable
  if (!SplitType) {
    $$('[data-reveal="lines"], [data-reveal="chars"]').forEach((el) => {
      gsap.fromTo(el, { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "expo.out",
        scrollTrigger: { trigger: el, start: "top 86%" } });
    });
  }

  // line/char splits
  if (SplitType) $$('[data-reveal="lines"]').forEach((el) => {
    const split = new SplitType(el, { types: "lines", lineClass: "split-line" });
    split.lines.forEach((l) => {
      const w = document.createElement("span");
      w.className = "line-mask"; w.style.display = "block";
      l.parentNode.insertBefore(w, l); w.appendChild(l);
    });
    gsap.set(el, { opacity: 1 });
    gsap.from(split.lines, {
      yPercent: 115, duration: 1.05, ease: "expo.out", stagger: 0.08,
      scrollTrigger: { trigger: el, start: "top 85%" },
    });
  });

  if (SplitType) $$('[data-reveal="chars"]').forEach((el) => {
    const split = new SplitType(el, { types: "chars,words", charClass: "split-char" });
    gsap.set(el, { opacity: 1 });
    gsap.from(split.chars, {
      yPercent: 120, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.018,
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  // generic fade-up (and groups)
  $$('[data-reveal="up"], [data-reveal=""], [data-reveal="fade"]').forEach((el) => {
    const delay = parseFloat(el.getAttribute("data-delay")) || 0;
    gsap.fromTo(el, { y: 42, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1, ease: "expo.out", delay,
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  // staggered groups via [data-reveal-group]
  $$("[data-reveal-group]").forEach((group) => {
    const items = $$("[data-reveal-item]", group);
    gsap.set(group, { opacity: 1 });
    gsap.from(items, {
      y: 40, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.09,
      scrollTrigger: { trigger: group, start: "top 82%" },
    });
  });
}

/* ------------------------------------------------------------
   7 · HERO PLASMA + PARTICLE NETWORK
------------------------------------------------------------ */
function heroCanvas() {
  const canvas = $("#hero-canvas");
  if (!canvas || REDUCED) return;
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, dpr = 1, particles = [], rafId = 0, running = false;
  const mouse = { x: -999, y: -999 };

  const COLORS = ["#8b5cff", "#22d3ee", "#6d4dff"];
  const LINK = 130, LINK2 = LINK * LINK, CUR = 160, CUR2 = CUR * CUR;

  function seed() {
    const count = Math.min(w < 768 ? 42 : 90, Math.floor((w * h) / 16000));
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.32, vy: (Math.random() - 0.5) * 0.32,
      r: Math.random() * 1.6 + 0.6,
      c: COLORS[(Math.random() * COLORS.length) | 0],
    }));
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const nw = canvas.clientWidth, nh = canvas.clientHeight;
    canvas.width = nw * dpr; canvas.height = nh * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const widthChanged = nw !== w;
    w = nw; h = nh;
    if (widthChanged || !particles.length) seed(); // ignore height-only changes (mobile URL bar)
  }
  function draw() {
    ctx.clearRect(0, 0, w, h);
    // particles
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      const dxm = mouse.x - p.x, dym = mouse.y - p.y;
      if (dxm * dxm + dym * dym < 24000) { p.x += dxm * 0.0009; p.y += dym * 0.0009; }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.c; ctx.fill();
    }
    // particle links (squared distance, fixed colour, alpha via globalAlpha — no per-line string alloc)
    ctx.lineWidth = 1; ctx.strokeStyle = "#8b5cff";
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
        if (d2 < LINK2) {
          ctx.globalAlpha = 0.12 * (1 - d2 / LINK2);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    // links to cursor
    if (mouse.x > -900) {
      ctx.strokeStyle = "#22d3ee";
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i], dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < CUR2) {
          ctx.globalAlpha = 0.18 * (1 - d2 / CUR2);
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
  }
  function frame() { draw(); if (running) rafId = requestAnimationFrame(frame); }
  function start() { if (running) return; running = true; rafId = requestAnimationFrame(frame); }
  function stop() { running = false; cancelAnimationFrame(rafId); }

  resize();
  start();

  let resizeRaf = 0;
  window.addEventListener("resize", () => { cancelAnimationFrame(resizeRaf); resizeRaf = requestAnimationFrame(resize); });
  const hero = $("#hero");
  hero?.addEventListener("mousemove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  hero?.addEventListener("mouseleave", () => { mouse.x = -999; mouse.y = -999; });
  // exactly one rAF chain — pause when hero is offscreen, resume when back
  ScrollTrigger && ScrollTrigger.create({
    trigger: hero, start: "top bottom", end: "bottom top",
    onToggle: (self) => (self.isActive ? start() : stop()),
  });
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
}

/* ------------------------------------------------------------
   8 · HERO INTRO + PARALLAX GLOWS
------------------------------------------------------------ */
/* HERO ENTRANCE EXTRAS + PARALLAX
   The reveal itself is CSS-driven (see styles.css "HERO + NAV ENTRANCE"), so the
   hero appears in sync with the header the instant the page paints — it does NOT
   wait for GSAP. Here we only add non-blocking flourishes that never gate the
   content: metric count-ups, the pill "ONLINE" flare, and scroll parallax. */
function heroIntro() {
  const hero = $("#hero");
  if (!hero || hero.dataset.introDone) return;
  hero.dataset.introDone = "1";

  const pill = $(".pbadge", hero);
  const metrics = [
    { el: $("#conf-val"), to: 98.7, dec: 1, suffix: "%" },
    { el: $("#m-rps"), to: 24.8, dec: 1, suffix: "k" },
    { el: $("#m-gain"), to: 34, dec: 0, prefix: "+", suffix: "%" },
  ].filter((m) => m.el);
  const writeMetric = (m, v) => { m.el.textContent = (m.prefix || "") + v.toFixed(m.dec) + (m.suffix || ""); };

  if (REDUCED) { metrics.forEach((m) => writeMetric(m, m.to)); return; }

  // Numbers tick up as the cards fade in. The cards are CSS-pre-hidden, so
  // resetting to 0 here (before they're visible) never flashes the final value.
  metrics.forEach((m) => {
    const p = { v: 0 }; writeMetric(m, 0);
    gsap.to(p, { v: m.to, duration: 0.9, delay: 0.35, ease: "power2.out", onUpdate: () => writeMetric(m, p.v) });
  });

  // Typewriter + pill "ONLINE" flare, timed to the copy/pill entrance.
  gsap.delayedCall(0.35, startTypewriter);
  if (pill) gsap.delayedCall(0.42, () => { pill.classList.add("online"); gsap.delayedCall(0.3, () => pill.classList.remove("online")); });

  // Scroll parallax: content drifts + fades. (Orbs keep their own CSS drift.)
  gsap.to("#hero-content", { yPercent: 14, opacity: 0.4, ease: "none",
    scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } });

  // Cerebri Sans can swap after first paint and shift H1 metrics — recompute then.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger && ScrollTrigger.refresh());
}

/* ------------------------------------------------------------
   9 · MARQUEE
------------------------------------------------------------ */
function marquees() {
  $$("[data-marquee]").forEach((track) => {
    const speed = parseFloat(track.getAttribute("data-marquee")) || 40;
    const inner = track.querySelector(".marquee");
    if (!inner) return;
    // duplicate content once for a seamless 50% loop
    inner.innerHTML += inner.innerHTML;
    const dir = track.getAttribute("data-dir") === "right" ? 1 : -1;
    const from = dir < 0 ? 0 : -50;
    const to = dir < 0 ? -50 : 0;
    gsap.set(inner, { xPercent: from });
    const tween = gsap.to(inner, {
      xPercent: to,
      duration: inner.scrollWidth / 2 / speed,
      ease: "none",
      repeat: -1,
    });
    if (REDUCED || TOUCH) { return; }
    // scroll velocity nudges speed (skip the write when nothing meaningful changed)
    gsap.ticker.add(() => {
      const target = 1 + Math.min(Math.abs(scrollVel) * 0.06, 3);
      if (Math.abs(tween.timeScale() - target) > 0.005) tween.timeScale(target);
    });
  });
}

/* ------------------------------------------------------------
   10 · CARD TILT + SPOTLIGHT  (bento · work · testimonials)
   One handler drives the shared hover effect on every [data-tilt] card:
   a gentle 3D tilt toward the cursor plus a spotlight glow that tracks it.
   GSAP owns the transform so it coexists with the reveal tweens.
------------------------------------------------------------ */
function cardTilt() {
  if (TOUCH || REDUCED) return;
  $$("[data-tilt]").forEach((card) => {
    gsap.set(card, { transformPerspective: 1400, transformStyle: "preserve-3d" });
    const rotX = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3" });
    const rotY = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3" });
    let r = null, pending = false, mx = 50, my = 50;
    card.addEventListener("mouseenter", () => { r = card.getBoundingClientRect(); });
    card.addEventListener("mousemove", (e) => {
      if (!r) r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      mx = px * 100; my = py * 100;
      rotY((px - 0.5) * 5);   // ≈ ±2.5° — restrained, like the winner cards
      rotX(-(py - 0.5) * 5);
      if (!pending) {
        pending = true;
        requestAnimationFrame(() => {
          card.style.setProperty("--mx", mx + "%");
          card.style.setProperty("--my", my + "%");
          pending = false;
        });
      }
    });
    card.addEventListener("mouseleave", () => { rotX(0); rotY(0); r = null; });
  });
}

/* ------------------------------------------------------------
   11 · WORK CARDS — scroll parallax on the inner UI layer
   (the hover tilt/spotlight is handled by cardTilt() above)
------------------------------------------------------------ */
function workCards() {
  if (REDUCED) return;
  $$(".work-card").forEach((card) => {
    const layer = card.querySelector(".layer");
    if (!layer) return;
    gsap.fromTo(layer, { yPercent: -12 }, {
      yPercent: 12, ease: "none",
      scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: true },
    });
  });
}

/* ------------------------------------------------------------
   12 · PROCESS sticky progress
------------------------------------------------------------ */
function process() {
  const wrap = $("#process-steps");
  if (!wrap || REDUCED) return;
  const steps = $$(".process-step", wrap);
  const fill = $("#process-fill");
  if (fill) {
    gsap.to(fill, {
      scaleY: 1, ease: "none", transformOrigin: "top",
      scrollTrigger: { trigger: wrap, start: "top 60%", end: "bottom 70%", scrub: true },
    });
  }
  steps.forEach((step) => {
    ScrollTrigger.create({
      trigger: step, start: "top 65%", end: "bottom 65%",
      onToggle: (self) => step.classList.toggle("active", self.isActive),
    });
  });
}

/* ------------------------------------------------------------
   13 · STAT COUNTERS
------------------------------------------------------------ */
function counters() {
  $$("[data-count]").forEach((el) => {
    const target = parseFloat(el.getAttribute("data-count"));
    const decimals = clamp(parseInt(el.getAttribute("data-decimals"), 10) || 0, 0, 6);
    const obj = { v: 0 };
    const run = () => {
      if (REDUCED) { el.textContent = target.toFixed(decimals); return; }
      gsap.to(obj, {
        v: target, duration: 2, ease: "power2.out",
        onUpdate: () => { el.textContent = obj.v.toFixed(decimals); },
      });
    };
    ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: run });
  });
}

/* ------------------------------------------------------------
   14 · AI TERMINAL typing
------------------------------------------------------------ */
function terminal() {
  const term = $("#ai-terminal");
  if (!term) return;
  const lines = JSON.parse(term.getAttribute("data-lines") || "[]");
  const out = $(".terminal-output", term);
  if (!out || REDUCED) {
    if (out) out.innerHTML = lines.map((l) => `<div class="${l[0]}">${l[1]}</div>`).join("");
    return;
  }
  let started = false;
  const type = async () => {
    for (const [cls, text] of lines) {
      const div = document.createElement("div");
      div.className = cls;
      out.appendChild(div);
      if (cls === "prompt-line") {
        for (let i = 0; i < text.length; i++) {
          div.textContent = text.slice(0, i + 1);
          await new Promise((r) => setTimeout(r, 24));
        }
      } else {
        await new Promise((r) => setTimeout(r, 220));
        div.innerHTML = text;
        gsap.fromTo(div, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" });
      }
      await new Promise((r) => setTimeout(r, 160));
    }
  };
  ScrollTrigger.create({
    trigger: term, start: "top 75%", once: true,
    onEnter: () => { if (!started) { started = true; type(); } },
  });
}

/* ------------------------------------------------------------
   15 · FOOTER wordmark parallax
------------------------------------------------------------ */
function footerWord() {
  const word = $(".footer-word");
  if (!word || REDUCED) return;
  gsap.fromTo(word, { yPercent: 18 }, {
    yPercent: -4, ease: "none",
    scrollTrigger: { trigger: word, start: "top bottom", end: "bottom bottom", scrub: true },
  });
}

/* ------------------------------------------------------------
   16 · MOTION-based micro entrances (uses Motion inView/stagger)
------------------------------------------------------------ */
async function motionInView() {
  if (REDUCED) return;
  const groups = $$("[data-motion-group]");
  if (!groups.length) return;
  // Race the import against a 200ms timeout so a slow CDN can't delay the entrance.
  const m = await Promise.race([ensureMotion(), new Promise((res) => setTimeout(() => res(null), 200))]);
  if (m && m.inView && m.animate) {
    const { animate, inView, stagger } = m;
    groups.forEach((group) => {
      inView(group, () => {
        const items = $$("[data-motion-item]", group);
        animate(items, { opacity: [0, 1], transform: ["translateY(14px)", "translateY(0px)"] },
          { delay: stagger(0.06), duration: 0.6, ease: [0.16, 1, 0.3, 1] });
      }, { amount: 0.3 });
    });
  } else {
    // GSAP fallback
    groups.forEach((group) => {
      gsap.from($$("[data-motion-item]", group), {
        y: 14, opacity: 0, duration: 0.6, ease: "expo.out", stagger: 0.06,
        scrollTrigger: { trigger: group, start: "top 85%" },
      });
    });
  }
}

/* scroll velocity tracker (for marquee) */
let scrollVel = 0;
function velocityTracker() {
  if (REDUCED || TOUCH) return;
  let lastY = lenis ? lenis.scroll : window.scrollY;
  gsap.ticker.add(() => {
    const y = lenis ? lenis.scroll : window.scrollY;
    scrollVel = lerp(scrollVel, y - lastY, 0.1);
    lastY = y;
  });
}

/* ------------------------------------------------------------
   BOOT
------------------------------------------------------------ */
let _booted = false;
function startSite() {
  if (_booted) return;
  _booted = true;
  if (window.lucide) window.lucide.createIcons();
  smoothScroll();
  cursor();
  magnetic();
  navDropdowns();
  nav();
  heroCanvas();
  setupTypewriter();
  heroIntro();
  heroMicro();
  velocityTracker();
  reveals();
  marquees();
  cardTilt();
  workCards();
  process();
  counters();
  terminal();
  footerWord();
  motionInView();
  ScrollTrigger && ScrollTrigger.refresh();
  document.body.classList.add("ready");
  // year
  const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
}

/* if core libs failed to load, show everything statically */
function failSafe() {
  document.documentElement.classList.remove("js"); // drops every .js .pre-hide / .h-inner gate -> all visible
  if (window.lucide) window.lucide.createIcons();
  setupTypewriter();   // still want the typewriter without GSAP
  startTypewriter();
  const y = $("#year"); if (y) y.textContent = new Date().getFullYear();
}

// QA hook — only exposed with ?qa=1 (or window.__PRAGMA_QA). Inert in production.
if (location.search.includes("qa=1") || window.__PRAGMA_QA) {
  window.PRAGMA = { startSite, skipIntro: startSite };
}

// No preloader — boot immediately so the page paints right away (fast FCP).
// If GSAP *or* ScrollTrigger failed to load, show everything statically rather than risk a half-init invisible page.
window.addEventListener("DOMContentLoaded", () => {
  if (!gsap || !ScrollTrigger) { failSafe(); return; }
  try { startSite(); } catch (e) { console.error(e); failSafe(); }
});
window.addEventListener("load", () => ScrollTrigger && ScrollTrigger.refresh());
// Pause the continuous grain animation when the tab is hidden.
document.addEventListener("visibilitychange", () => {
  document.body.classList.toggle("tab-hidden", document.hidden);
});

/* ------------------------------------------------------------
   HERO TYPEWRITER
   Set up once; the hero boot timeline triggers startTypewriter() the moment the
   sub-paragraph becomes visible, so the caret types on-screen instead of on a
   blank line behind a fixed timer. A fallback timer covers the no-intro paths.
------------------------------------------------------------ */
let _twStart = null, _twStarted = false;
function setupTypewriter() {
  const tw = document.getElementById("tw");
  if (!tw) return;
  const phrases = [
    "AI-powered analytics",
    "intelligent automation",
    "production ML pipelines",
    "enterprise data platforms",
    "LLM-native products",
  ];
  if (REDUCED) { tw.textContent = phrases[0]; return; }
  let pi = 0, ci = 0, deleting = false;
  function type() {
    const phrase = phrases[pi];
    if (!deleting) {
      tw.textContent = phrase.slice(0, ci + 1);
      ci++;
      if (ci === phrase.length) { deleting = true; setTimeout(type, 2200); return; }
      setTimeout(type, 68);
    } else {
      tw.textContent = phrase.slice(0, ci - 1);
      ci--;
      if (ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; setTimeout(type, 400); return; }
      setTimeout(type, 38);
    }
  }
  _twStart = type;
  setTimeout(startTypewriter, 2600); // fallback if the intro never fires the trigger
}
function startTypewriter() {
  if (_twStarted || !_twStart) return;
  _twStarted = true;
  _twStart();
}

/* ------------------------------------------------------------
   HERO MICRO-INTERACTIONS — avatar stack fans out on hover
------------------------------------------------------------ */
function heroMicro() {
  if (TOUCH || REDUCED) return;
  const group = $("[data-avatars]");
  if (!group) return;
  const avs = $$(":scope > div", group);
  const xTo = avs.map((a) => gsap.quickTo(a, "x", { duration: 0.4, ease: "power3" }));
  group.addEventListener("mouseenter", () => avs.forEach((a, i) => xTo[i](i * 7)));
  group.addEventListener("mouseleave", () => avs.forEach((a, i) => xTo[i](0)));
}
