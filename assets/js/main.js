/* Norvik Studio — interactions (vanilla + GSAP/ScrollTrigger/SplitText + Lenis) */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGsap = typeof window.gsap !== "undefined";
  const em = (el, n) => parseFloat(getComputedStyle(el).fontSize) * n;
  const EASE = "power2.inOut";

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (typeof window.Lenis !== "undefined" && !reduced) {
    lenis = new Lenis({ autoRaf: !hasGsap, prevent: (node) => node.closest && node.closest(".nav__panel, .filter__bar") });
    window.lenis = lenis;
    if (hasGsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }
  if (hasGsap) gsap.registerPlugin(ScrollTrigger, SplitText);

  const scrollToHash = (hash) => {
    const el = hash && hash.length > 1 && document.getElementById(hash.slice(1));
    if (!el) return false;
    lenis ? lenis.scrollTo(el, { offset: 0, duration: 1.2 }) : el.scrollIntoView({ behavior: "smooth" });
    return true;
  };

  /* ---------- menu ---------- */
  const toggle = $("[data-menu-toggle]");
  const panel = $("[data-menu-panel]");
  const scrim = $("[data-scrim]");
  let menuTl = null;
  let menuOpen = false;
  if (toggle && panel) {
    const items = $$(".nav__item", panel);
    if (hasGsap) {
      menuTl = gsap.timeline({ paused: true, defaults: { duration: 0.45, ease: EASE } })
        .set(scrim, { visibility: "visible" }, 0)
        .fromTo(panel, { height: 0 }, { height: "auto" }, 0)
        .fromTo(items, { opacity: 0, y: () => em(panel, 1), scale: 0.98 }, { opacity: 1, y: 0, scale: 1, stagger: 0.06 }, 0)
        .fromTo(scrim, { opacity: 0 }, { opacity: 1 }, 0);
      menuTl.eventCallback("onReverseComplete", () => gsap.set(scrim, { visibility: "hidden" }));
    }
    const setMenu = (open) => {
      menuOpen = open;
      toggle.setAttribute("aria-expanded", String(open));
      document.body.classList.toggle("menu-open", open);
      if (menuTl) open ? menuTl.play() : menuTl.reverse();
      else { panel.style.height = open ? "auto" : "0"; scrim.style.visibility = open ? "visible" : "hidden"; scrim.style.opacity = open ? 1 : 0; }
    };
    toggle.addEventListener("click", () => setMenu(!menuOpen));
    scrim.addEventListener("click", () => setMenu(false));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && menuOpen) setMenu(false); });

    // sub menus (independent toggles)
    $$("[data-sub-toggle]").forEach((btn) => {
      const wrap = btn.nextElementSibling;
      const links = $$(".nav__sublink", wrap);
      let tl = null;
      if (hasGsap) {
        tl = gsap.timeline({ paused: true, defaults: { duration: 0.45, ease: EASE } })
          .fromTo(wrap, { height: 0 }, { height: "auto" }, 0)
          .fromTo(links, { opacity: 0, y: () => em(wrap, 0.5), scale: 0.98 }, { opacity: 1, y: 0, scale: 1, stagger: 0.06 }, 0);
      }
      btn.addEventListener("click", () => {
        const open = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", String(open));
        if (tl) open ? tl.play() : tl.reverse();
        else wrap.style.height = open ? "auto" : "0";
      });
    });

    // same-page anchors: close the menu and scroll smoothly
    $$(".nav__sublink, .nav__row[href]").forEach((a) => {
      a.addEventListener("click", (e) => {
        const url = new URL(a.href, location.href);
        if (url.pathname === location.pathname && url.hash) {
          e.preventDefault();
          setMenu(false);
          setTimeout(() => scrollToHash(url.hash), 250);
        }
      });
    });
  }
  if (location.hash) window.addEventListener("load", () => setTimeout(() => scrollToHash(location.hash), 60));

  /* ---------- scroll-triggered reveals ---------- */
  const once = (trigger, fn, start = "top bottom") => {
    if (!hasGsap || reduced) return;
    ScrollTrigger.create({ trigger, start, once: true, onEnter: fn });
  };
  const fadeUp = (targets, { delay = 0.15, stagger = 0, dist = 0.5, ease = EASE, duration = 0.45, trigger } = {}) => {
    const list = Array.isArray(targets) ? targets : [targets];
    if (!list.length || !hasGsap || reduced) return;
    gsap.set(list, { opacity: 0, y: (i, el) => em(el, dist) });
    once(trigger || list[0], () => gsap.to(list, { opacity: 1, y: 0, duration, delay, stagger, ease }));
  };

  const initReveals = () => {
    if (!hasGsap || reduced) { $$("[data-reveal]").forEach((h) => h.classList.add("is-split")); return; }

    // headings: line-by-line fade
    $$("[data-reveal]").forEach((h) => {
      const split = new SplitText(h, { type: "lines", linesClass: "split-line" });
      h.classList.add("is-split");
      gsap.set(split.lines, { opacity: 0, y: (i, el) => em(el, 0.25) });
      once(h, () => gsap.to(split.lines, { opacity: 1, y: 0, duration: 0.45, delay: 0.15, stagger: 0.02, ease: EASE }));
    });

    // statement: char opacity scrubbed by scroll
    $$("[data-chars]").forEach((p) => {
      const split = new SplitText(p, { type: "words,chars" });
      gsap.fromTo(split.chars, { opacity: 0.15 }, {
        opacity: 1, ease: "none", stagger: 0.1, duration: 1,
        scrollTrigger: { trigger: p, start: "top bottom", end: "bottom 30%", scrub: 0.8 },
      });
    });

    $$("[data-status]").forEach((el) => fadeUp(el, { delay: 0.54 }));
    $$(".sec-meta").forEach((m) => fadeUp($$(".sec-meta__t", m), { stagger: 0.15, trigger: m }));
    $$("[data-fade-text]").forEach((el) => { gsap.set(el, { opacity: 0 }); once(el, () => gsap.to(el, { opacity: 1, duration: 0.45, delay: 0.15, ease: EASE })); });
    $$("[data-fade-careers]").forEach((el) => fadeUp(el, { delay: 0.45, ease: "power2.out" }));
    $$("[data-fade-buttons]").forEach((row) => fadeUp($$(".btn", row), { delay: 0.45, stagger: 0.15, trigger: row }));
    $$(".value__row").forEach((row) => { const t = $(".value__text", row); gsap.set(t, { opacity: 0 }); once(row, () => gsap.to(t, { opacity: 1, duration: 0.45, delay: 0.2, ease: EASE })); });
    $$(".work-grid").forEach((g) => fadeUp($$(".work-card", g), { stagger: 0.15, trigger: g }));
    $$(".live").forEach((l) => { fadeUp(l); fadeUp($$(".live__row", l), { stagger: 0.15, trigger: l }); });
    $$(".slider.is-services").forEach((s) => fadeUp($$(".svc", s), { stagger: 0.15, trigger: s }));
    $$(".slider.is-testi").forEach((s) => fadeUp($$(".tcard", s), { stagger: 0.15, trigger: s, ease: "power1.out" }));
    $$(".reel").forEach((r) => {
      gsap.set(r, { opacity: 0, scale: 0.95, y: em(r, 2) });
      once(r, () => gsap.to(r, { opacity: 1, scale: 1, y: 0, duration: 0.6, delay: 0.15, ease: EASE }));
    });
    $$(".faq__list").forEach((l) => { fadeUp(l, { ease: "power1.out" }); const rows = $$(".faq__row", l); fadeUp(rows, { stagger: 0.15 / rows.length, trigger: l, ease: "power1.out" }); });
    $$(".jgrid").forEach((g) => fadeUp($$(".jcard", g), { stagger: 0.15, trigger: g }));
    $$(".jindex").forEach((l) => fadeUp($$(".jrow", l), { stagger: 0.15, trigger: l }));

    ScrollTrigger.refresh();
  };

  /* ---------- marquee ---------- */
  $$("[data-marquee]").forEach((track) => {
    if (reduced) return;
    if (hasGsap) gsap.to(track, { xPercent: -50, duration: 20, ease: "none", repeat: -1 });
    else track.animate([{ transform: "translateX(0)" }, { transform: "translateX(-50%)" }], { duration: 20000, iterations: Infinity });
  });

  /* ---------- sliders (services / testimonials) ---------- */
  $$("[data-slider]").forEach((slider) => {
    const track = $(".slider__track", slider);
    const slides = $$(".slider__slide", slider);
    const prev = $("[data-prev]", slider);
    const next = $("[data-next]", slider);
    let index = 0;
    const max = slides.length - 1;
    const step = () => slides[0].getBoundingClientRect().width + parseFloat(getComputedStyle(slides[0]).marginRight);
    const render = () => {
      track.style.transform = `translateX(${-index * step()}px)`;
      prev.classList.toggle("is-hidden", index === 0);
      next.classList.toggle("is-hidden", index === max);
    };
    prev.addEventListener("click", () => { index = Math.max(0, index - 1); render(); });
    next.addEventListener("click", () => { index = Math.min(max, index + 1); render(); });
    slider.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") next.click();
      if (e.key === "ArrowLeft") prev.click();
    });
    window.addEventListener("resize", () => { track.style.transition = "none"; render(); requestAnimationFrame(() => (track.style.transition = "")); });
    render();
  });

  /* ---------- studio reel ---------- */
  $$("[data-reel]").forEach((reel) => {
    const video = $("video", reel);
    const btn = $("[data-reel-toggle]", reel);
    const time = $("[data-reel-time]", reel);
    const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    const sync = () => {
      const playing = !video.paused;
      reel.classList.toggle("is-playing", playing);
      btn.setAttribute("aria-label", playing ? "Pause video" : "Play video");
    };
    btn.addEventListener("click", () => (video.paused ? video.play() : video.pause()));
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    video.addEventListener("loadedmetadata", () => { if (isFinite(video.duration)) time.textContent = fmt(video.duration); });
    video.addEventListener("timeupdate", () => { if (isFinite(video.duration)) time.textContent = fmt(video.duration - video.currentTime); });
  });

  /* ---------- FAQ accordion ---------- */
  $$(".faq__row").forEach((row) => {
    const q = $(".faq__q", row);
    const a = $(".faq__a", row);
    q.addEventListener("click", () => {
      const open = !row.classList.contains("is-open");
      row.classList.toggle("is-open", open);
      q.setAttribute("aria-expanded", String(open));
      if (hasGsap) gsap.to(a, { height: open ? "auto" : 0, duration: 0.45, ease: EASE, onComplete: () => ScrollTrigger.refresh() });
      else a.style.height = open ? "auto" : "0";
    });
  });

  /* ---------- contact form (local only — nothing is sent) ---------- */
  $$("[data-form]").forEach((block) => {
    const form = $("form", block);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      let ok = true;
      $$("[required]", form).forEach((f) => {
        const bad = !f.value.trim() || (f.type === "email" && !/^\S+@\S+\.\S+$/.test(f.value));
        f.classList.toggle("is-invalid", bad);
        if (bad) ok = false;
      });
      block.classList.toggle("is-fail", !ok);
      if (ok) { block.classList.add("is-done"); ScrollTrigger && ScrollTrigger.refresh(); }
    });
    $$(".input", form).forEach((f) => f.addEventListener("input", () => f.classList.remove("is-invalid")));
  });

  /* ---------- 401 password form (demo: password "norvik") ---------- */
  $$("[data-password]").forEach((form) => {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = form.pass.value.trim();
      if (v.toLowerCase() === "norvik") { location.href = "index.html"; return; }
      form.classList.add("is-error");
      form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
    });
  });

  /* ---------- studio profile "download" ---------- */
  $$("[data-download]").forEach((a) => a.addEventListener("click", (e) => e.preventDefault()));

  /* ---------- boot ---------- */
  const start = () => initReveals();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  else window.addEventListener("load", start);
  window.addEventListener("load", () => hasGsap && ScrollTrigger.refresh());
})();
