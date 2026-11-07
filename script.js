
(function () {
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* fade sections in as they enter the viewport, project cards staggered */
  var items = document.querySelectorAll(".reveal");
  var lastY = window.scrollY;
  var goingDown = true;

  if (calm || !("IntersectionObserver" in window)) {
    items.forEach(function (el) { el.classList.add("visible"); });
  } else {
    document.querySelectorAll(".project").forEach(function (el, i) {
      el.style.transitionDelay = (i * 90) + "ms";
    });

    /* show without animating, used when the reader is moving back up */
    function showInstantly(el) {
      var delay = el.style.transitionDelay;
      el.style.transition = "none";
      el.style.transitionDelay = "0s";
      el.classList.add("visible");
      void el.offsetWidth;
      el.style.transition = "";
      el.style.transitionDelay = delay;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          if (goingDown) {
            entry.target.classList.add("visible");
          } else {
            showInstantly(entry.target);
          }
        } else {
          /* reset once it is out of sight so it can play again on the way down */
          entry.target.classList.remove("visible");
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

    items.forEach(function (el) { observer.observe(el); });
  }

  /* drifting rings in the header, plus the progress bar and active nav link */
  var rings = document.querySelectorAll(".band-deco img, .band-front img");
  var bar = document.getElementById("progress-bar");
  var links = document.querySelectorAll("nav a");
  var sections = document.querySelectorAll("section[id]");
  var ticking = false;

  function frame() {
    var y = window.scrollY;

    if (!calm) {
      rings.forEach(function (ring) {
        var speed = parseFloat(ring.getAttribute("data-speed")) || 0;
        var rot = parseFloat(ring.getAttribute("data-rot")) || 0;
        ring.style.transform = "translate3d(0," + (y * speed) + "px,0) rotate(" + rot + "deg)";
      });
    }

    var height = document.documentElement.scrollHeight - window.innerHeight;
    if (!bar) { ticking = false; return; }
    bar.style.width = (height > 0 ? Math.min(y / height, 1) * 100 : 0) + "%";

    var current = "";
    sections.forEach(function (section) {
      if (y >= section.offsetTop - 140) { current = section.id; }
    });
    links.forEach(function (link) {
      link.classList.toggle("active", link.getAttribute("href") === "#" + current);
    });

    ticking = false;
  }

  window.addEventListener("scroll", function () {
    var y = window.scrollY;
    if (y !== lastY) { goingDown = y > lastY; lastY = y; }
    if (!ticking) { window.requestAnimationFrame(frame); ticking = true; }
  }, { passive: true });

  frame();
})();

/* home opening: column to row, fade the blue, then bring in the map and the grey square */
(function () {
  var pin = document.querySelector(".showcase .pin");
  if (!pin) { return; }
  var root = document.documentElement;
  var core = pin.querySelector(".opening");
  var pic = core.querySelector(".portrait-holder");
  var nm = core.querySelector("h1");
  var rl = core.querySelector(".role");
  var em = core.querySelector(".email");
  var map = pin.querySelector(".map");
  var sq = pin.querySelector(".grey-square");
  var calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var cols = {
    "--bg": ["#10294f", "#0b0b0e"], "--c-name": ["#ffffff", "#f6efe2"],
    "--c-role": ["#b3c5dd", "#a9a297"], "--c-link": ["#a9bcd6", "#9c9ca6"],
    "--c-hover": ["#ffffff", "#ffffff"], "--c-rule": ["#3b5277", "#24242a"]
  };

  function clamp(t) { return Math.max(0, Math.min(1, t)); }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function rgb(h) { return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }); }
  function mix(a, b, t) {
    var x = rgb(a), y = rgb(b);
    return "rgb(" + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t); }).join(",") + ")";
  }

  var m = {};
  function measure() {
    m.pw = pic.offsetWidth; m.ph = pic.offsetHeight;
    m.nw = nm.offsetWidth;  m.nh = nm.offsetHeight;
    m.rw = rl.offsetWidth;  m.rh = rl.offsetHeight;
    m.ew = em.offsetWidth;  m.eh = em.offsetHeight;
  }

  function put(el, xs, ys, xe, ye, px, py, ps, s0, s1) {
    var x = xs + (xe - xs) * px, y = ys + (ye - ys) * py, s = s0 + (s1 - s0) * ps;
    el.style.transform = "translate3d(" + x + "px," + y + "px,0) scale(" + s + ")";
  }

  var SPEED = 1.1;

  /* the globe faces Mexico and the US while it rises, and only starts spinning once it has arrived;
     out of sight it is turned back to that view, so it never jumps while on screen */
  /* globeIn: 0 until the globe's model has loaded. If it loads while still off screen it jumps
     to 1; if the globe should already be showing (e.g. coming back to #index), it rises from
     below over about a second, the same motion as the first scroll */
  var globeIn = 0, warming = false, globeStarted = false;
  function globeLoaded() {
    if (globeStarted) { return; }
    globeStarted = true;
    /* the first time the globe is drawn the browser uploads its textures, which freezes
       animation for up to a second. Do that first draw in place but invisible (warming), wait
       until frames run smoothly again, and only then let the globe appear */
    warming = true; render(cur);
    var last = null, smooth = 0, began = performance.now();
    function warm(now) {
      smooth = (last !== null && now - last < 40) ? smooth + 1 : 0;
      last = now;
      if ((smooth >= 4 && now - began > 200) || now - began > 3000) { warming = false; appear(); }
      else { window.requestAnimationFrame(warm); }
    }
    window.requestAnimationFrame(warm);
  }
  function appear() {
    var shown = clamp(window.scrollY * SPEED / (window.innerHeight * 0.9));
    if (shown < 0.02 || calm) { globeIn = 1; render(cur); return; }
    var t0 = null, RISE = 1100;
    function step(now) {
      if (t0 === null) { t0 = now; }
      globeIn = Math.max(0.0001, Math.min(1, (now - t0) / RISE));
      render(cur);
      if (globeIn < 1) { window.requestAnimationFrame(step); }
    }
    window.requestAnimationFrame(step);
  }
  map.addEventListener("load", globeLoaded);

  var HOME = "50deg 74deg auto", globeState = "";
  function settleGlobe(e) {
    if (!map.jumpCameraToGoal) { return; }          /* model-viewer has not loaded yet */
    var state = e >= 0.999 ? "spin" : (e <= 0.001 ? "home" : "hold");
    if (state === globeState) { return; }
    globeState = state;
    if (state === "spin") { map.autoRotateDelay = 0; }   /* spin right away on arrival; a touch sets its own pause */
    map.autoRotate = state === "spin" && !calm;
    if (state === "home") { map.cameraOrbit = HOME; map.jumpCameraToGoal(); }
  }
  if (window.customElements) {
    customElements.whenDefined("model-viewer").then(function () { globeState = ""; settleGlobe(ease(clamp(window.scrollY * SPEED / (window.innerHeight * 0.9)))); });
  }

  function render(y) {
    var vh = window.innerHeight, vw = window.innerWidth;

    /* column layout, centered: picture, name, description, email */
    var nY = m.ph + 22, rY = nY + m.nh + 10, eY = rY + m.rh + 8;
    var H0 = eY + m.eh;
    var maxW = Math.max(m.pw, m.nw, m.rw, m.ew);
    var s0 = Math.min(1.5, (vh * 0.78) / H0, (vw * 0.94) / maxW);
    var gTop = vh / 2 - s0 * H0 / 2;

    /* row layout: picture left, name and description right */
    var tw = Math.max(m.nw, m.rw);
    var rowU = m.pw + 22 + tw;
    var s1 = Math.min(0.74, (vw * 0.92) / rowU);
    var left = -s1 * rowU / 2, top1 = 64;
    var tx = left + s1 * (m.pw + 22);
    var textH = m.nh + 6 + m.rh;
    var ty = top1 + s1 * (m.ph - textH) / 2;

    var p = clamp(y * SPEED / (vh * 0.9));
    var e = ease(p);

    /* the picture leads; the text waits, slides right clear of it, then rises */
    var pp = ease(clamp(p / 0.75));
    var tx_ = ease(clamp((p - 0.2) / 0.6));
    var ty_ = ease(clamp((p - 0.35) / 0.65));
    var ts = ease(clamp((p - 0.15) / 0.85));

    put(pic, -s0 * m.pw / 2, gTop, left, top1, pp, pp, pp, s0, s1);
    put(nm,  -s0 * m.nw / 2, gTop + s0 * nY, tx, ty, tx_, ty_, ts, s0, s1);
    put(rl,  -s0 * m.rw / 2, gTop + s0 * rY, tx, ty + s1 * (m.nh + 6), tx_, ty_, ts, s0, s1);
    put(em,  -s0 * m.ew / 2, gTop + s0 * eY, tx, ty + s1 * (m.nh + 6 + m.rh + 6), tx_, ty_, ts, s0, s1);

    var fade = 1 - clamp(p / 0.3);
    em.style.opacity = fade;
    em.style.visibility = fade <= 0 ? "hidden" : "visible";

    for (var k in cols) { root.style.setProperty(k, mix(cols[k][0], cols[k][1], e)); }
    root.style.setProperty("--glow", e.toFixed(3));   /* white glows fade in on the dark background */

    /* the map rises from the bottom on the same step as the grey square */
    /* the globe never shows before its model is ready (globeIn), so it can't pop in half-loaded */
    var gp = Math.min(p, globeIn), ge = ease(gp);
    if (warming) {                       /* in place and drawn, but not visible yet */
      map.style.opacity = "0.01"; map.style.transform = "none"; map.style.pointerEvents = "none";
    } else {
      map.style.pointerEvents = "";
      map.style.opacity = clamp(gp * 4);
      map.style.transform = "translate3d(0," + ((1 - ge) * vh * 1.1) + "px,0) scale(" + (0.15 + 0.85 * ge) + ")";
    }
    sq.style.transform = "translate3d(" + ((1 - e) * vw * 0.45) + "px,0,0)";
    settleGlobe(e);
  }

  var cur = window.scrollY, target = cur, running = false;

  function tick() {
    var d = target - cur;
    if (calm || animating || Math.abs(d) < 0.1) { cur = target; } else { cur += d * 0.14; }
    render(cur);
    if (cur !== target) { window.requestAnimationFrame(tick); } else { running = false; }
  }

  window.addEventListener("scroll", function () {
    target = window.scrollY;
    if (!running) { running = true; window.requestAnimationFrame(tick); }
  }, { passive: true });

  /* never rest mid-transition: the first nudge plays the whole stage right away */
  var lastY = window.scrollY, animating = false, DURATION = 1100;

  function glide(from, to) {
    animating = true;
    var t0 = null;
    function step(now) {
      if (t0 === null) { t0 = now; }
      var t = calm ? 1 : Math.min(1, (now - t0) / DURATION);
      var v = from + (to - from) * ease(t);
      window.scrollTo({ top: v, behavior: "instant" });
      target = v; cur = v; render(v);
      if (t < 1) { window.requestAnimationFrame(step); }
      else { animating = false; lastY = window.scrollY; }
    }
    window.requestAnimationFrame(step);
  }

  /* links to a section on this page (#about, #projects...) go straight there instead of being
     caught by the snap above, which would otherwise stop them at the end of the opening */
  var jumping = false, jumpTimer = 0;
  document.addEventListener("click", function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href^="#"]');
    if (!a || ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.shiftKey) { return; }
    var target = document.getElementById(a.getAttribute("href").slice(1));
    if (!target) { return; }
    ev.preventDefault();
    var margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    var top = target.getBoundingClientRect().top + window.scrollY - margin;
    jumping = true;
    if (history.pushState) { history.pushState(null, "", a.getAttribute("href")); }
    window.scrollTo({ top: top, behavior: calm ? "auto" : "smooth" });
    function done() { jumping = false; lastY = window.scrollY; window.removeEventListener("scrollend", done); }
    window.addEventListener("scrollend", done);
    clearTimeout(jumpTimer); jumpTimer = setTimeout(done, 1500);   /* browsers without scrollend */
  });

  function onScroll() {
    var y = window.scrollY;
    if (animating || jumping) { return; }
    var dir = y > lastY ? 1 : -1;
    lastY = y;
    var vh = window.innerHeight;
    var pts = [0, vh * 0.9 / SPEED];
    if (y >= pts[pts.length - 1] - 1) { return; }
    var lo = 0;
    for (var i = 0; i < pts.length - 1; i++) { if (y >= pts[i]) { lo = i; } }
    if (y - pts[lo] < 2) {
      if (dir > 0 || lo === 0) { glide(y, pts[lo + 1]); }
      else { glide(y, pts[lo - 1]); }
      return;
    }
    glide(y, dir > 0 ? pts[lo + 1] : pts[lo]);
  }

  window.addEventListener("scroll", onScroll, { passive: true });

  function block(ev) { if (animating) { ev.preventDefault(); } }
  window.addEventListener("wheel", block, { passive: false });
  window.addEventListener("touchmove", block, { passive: false });

  function refresh() { measure(); cur = target = window.scrollY; render(cur); }
  window.addEventListener("resize", refresh);
  window.addEventListener("load", refresh);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(refresh); }

  /* "Back" on a project page links to index.html#index: open straight on the globe and chat
     view (the end of the first scroll) instead of the full-screen intro */
  var toIndex = location.hash === "#index", userMoved = false;
  function jumpToIndex() {
    if (!toIndex || userMoved) { return; }
    var landing = window.innerHeight * 0.9 / SPEED;
    if (Math.abs(window.scrollY - landing) < 2) { return; }
    /* "instant" is not accepted by every Safari, so switch off smooth scrolling for this one jump */
    var html = document.documentElement, before = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, landing);
    html.style.scrollBehavior = before;
    lastY = window.scrollY;
    refresh();
  }
  if (toIndex) {
    if ("scrollRestoration" in history) { history.scrollRestoration = "manual"; }
    /* stop re-applying once the visitor scrolls on their own */
    ["wheel", "touchstart", "keydown"].forEach(function (t) {
      window.addEventListener(t, function () { userMoved = true; }, { once: true, passive: true });
    });
    jumpToIndex();
    /* some browsers move the page again while it finishes loading; put it back if so */
    window.addEventListener("load", jumpToIndex);
    window.addEventListener("pageshow", jumpToIndex);
    setTimeout(jumpToIndex, 400);
  }
  refresh();
  /* model-viewer's "load" event can arrive a couple of seconds after the model is actually
     ready, so also watch its loaded flag and start the rise as soon as it flips */
  (function watchLoaded(tries) {
    if (globeStarted) { return; }
    if (map.loaded) { globeLoaded(); return; }
    if (tries < 300) { setTimeout(function () { watchLoaded(tries + 1); }, 100); }
  })(0);
})();

/* globe: after the drag is released, let it coast and slow down gradually */
(function () {
  var globe = document.querySelector("model-viewer.map");
  if (!globe || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { return; }

  var COAST = 0.36;       /* seconds for the spin to lose most of its speed; higher glides longer */
  var MAX_SPEED = 6;       /* radians per second, so a hard flick does not whip it around */
  var samples = [], dragging = false, coasting = 0;

  function theta() { return globe.getCameraOrbit().theta; }
  function wrap(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }

  /* once touched, the globe holds still and only starts spinning again 4 seconds after release */
  var PAUSE_MS = 4000, wasSpinning = false;

  globe.addEventListener("pointerdown", function () {
    dragging = true; samples = [];
    if (coasting) { cancelAnimationFrame(coasting); coasting = 0; }
    wasSpinning = globe.autoRotate;
    globe.autoRotate = false;
  });

  globe.addEventListener("camera-change", function (ev) {
    if (!dragging || ev.detail.source !== "user-interaction") { return; }
    var now = performance.now();
    samples.push({ t: now, a: theta() });
    while (samples.length > 2 && now - samples[0].t > 90) { samples.shift(); }
  });

  function release() {
    if (!dragging) { return; }
    dragging = false;
    if (wasSpinning) {
      /* turning auto-rotate back on restarts model-viewer's delay clock, so the wait counts from release */
      globe.autoRotateDelay = PAUSE_MS;
      globe.autoRotate = true;
    }
    if (samples.length < 2) { return; }
    var a = samples[0], b = samples[samples.length - 1];
    var dt = (b.t - a.t) / 1000;
    if (dt <= 0 || performance.now() - b.t > 80) { return; }   /* held still before letting go */
    var v = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, wrap(b.a - a.a) / dt));
    /* the drawn globe trails the drag target by 2 x decay x speed; start the coast from the target */
    var lag = 2 * (globe.interpolationDecay || 50) / 1000;
    var angle = b.a + v * lag, last = performance.now();

    function step(now) {
      var s = (now - last) / 1000; last = now;
      angle += v * s;
      v *= Math.exp(-s / COAST);
      globe.cameraOrbit = angle + "rad 74deg auto";
      coasting = Math.abs(v) > 0.02 ? requestAnimationFrame(step) : 0;
    }
    coasting = requestAnimationFrame(step);
  }

  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);
})();

/* app-window mockup: type the question, think briefly, then answer with links.
   It plays once when the window comes into view; the answer stays so visitors can click it. */
(function () {
  var box = document.querySelector(".cc");
  if (!box) { return; }
  var typed = box.querySelector(".cc-typed");
  var spark = box.querySelector(".cc-spark");
  var reply = box.querySelector(".cc-reply");
  var TEXT = "How can I use the website?";
  var THINK_MS = 1800;
  var GLYPHS = ["\u00b7", "\u2722", "\u2733", "\u2736", "\u273b", "\u273d", "\u273b", "\u2736", "\u2733", "\u2722"];

  /* each paragraph and list row of the answer fades in a moment after the last */
  var lines = reply ? reply.querySelectorAll(":scope > p, :scope > ul > li") : [];
  Array.prototype.forEach.call(lines, function (el, i) {
    el.classList.add("cc-reply-line");
    el.style.animationDelay = (i * 0.14) + "s";
  });

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    box.classList.add("is-still");
    return;
  }

  /* coming back from a project page: the visitor has seen the intro, so show the answer right away */
  if (location.hash === "#index") {
    box.classList.add("is-instant", "is-sent", "is-answered");
    return;
  }

  var played = false, sparkTimer = 0;
  function set(name, on) { box.classList.toggle(name, on); }

  function play() {
    if (played) { return; }
    played = true;
    var t = 350;
    set("is-typing", true);
    for (var i = 1; i <= TEXT.length; i++) {
      (function (n) { setTimeout(function () { typed.textContent = TEXT.slice(0, n); }, t + n * 45); })(i);
    }
    t += TEXT.length * 45 + 350;
    setTimeout(function () {                        /* send: input empties, question appears */
      typed.textContent = ""; set("is-typing", false); set("is-sent", true);
    }, t);
    setTimeout(function () {
      set("is-thinking", true);
      var k = 0;
      sparkTimer = setInterval(function () { spark.textContent = GLYPHS[k++ % GLYPHS.length]; }, 120);
    }, t + 250);
    setTimeout(function () {                        /* answer replaces the thinking row and stays */
      clearInterval(sparkTimer);
      set("is-thinking", false); set("is-answered", true);
    }, t + 250 + THINK_MS);
  }

  /* start once most of the window has slid into view */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].intersectionRatio >= 0.6) { io.disconnect(); play(); }
    }, { threshold: [0.6] });
    io.observe(box);
  } else {
    play();
  }
})();

/* stickman ragdoll (a 2D take on the stickman by LDev) with Gerardo's face. On the index view one
   hand grabs the cursor and the body hangs from it under gravity; over the Claude Code window, or
   away from the index view, he lets go and hangs from the window's top-left corner instead.
   Verlet physics: each joint is a point, each bone a fixed length, and a few "no closer than"
   rules keep elbows, knees and the neck from folding the wrong way. */
(function () {
  var canvas = document.querySelector(".ragdoll");
  var pin = document.querySelector(".showcase .pin");
  var win = document.querySelector(".cc");
  if (!canvas || !pin || !win || !canvas.getContext) { return; }
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) { return; }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { return; }

  var ctx = canvas.getContext("2d");
  var face = new Image();
  face.src = "assets/stickman_face_small.png";   /* small copy of stickman_face.png */

  /* joints */
  var HEAD = 0, NECK = 1, HIP = 2, ELB_R = 3, HAND_R = 4, ELB_L = 5, HAND_L = 6,
      KNEE_R = 7, FOOT_R = 8, KNEE_L = 9, FOOT_L = 10;
  var S = 1, pts = [], bones = [], limits = [], headR = 17;

  function build() {
    S = 0.5 * Math.max(0.8, Math.min(1.2, window.innerHeight / 820));   /* half the original size */
    headR = 28 * S;                         /* half the face's drawn height */
    var L = { neck: 34 * S, torso: 52 * S, upper: 32 * S, fore: 30 * S, thigh: 37 * S, shin: 35 * S };
    bones = [
      [HEAD, NECK, L.neck], [NECK, HIP, L.torso],
      [NECK, ELB_R, L.upper], [ELB_R, HAND_R, L.fore],
      [NECK, ELB_L, L.upper], [ELB_L, HAND_L, L.fore],
      [HIP, KNEE_R, L.thigh], [KNEE_R, FOOT_R, L.shin],
      [HIP, KNEE_L, L.thigh], [KNEE_L, FOOT_L, L.shin]
    ];
    /* joint limits: elbows and knees can't fold shut, the head can't fold onto the chest,
       and the two feet / two hands keep a little apart */
    limits = [
      [NECK, HAND_R, 0.45 * (L.upper + L.fore)], [NECK, HAND_L, 0.45 * (L.upper + L.fore)],
      [HIP, FOOT_R, 0.55 * (L.thigh + L.shin)], [HIP, FOOT_L, 0.55 * (L.thigh + L.shin)],
      [HEAD, HIP, 0.93 * (L.neck + L.torso)],                 /* neck tilts up to about 45 degrees */
      [KNEE_R, KNEE_L, 10 * S], [FOOT_R, FOOT_L, 18 * S], [HAND_L, HIP, 16 * S],
      [HEAD, ELB_R, headR * 1.05], [HEAD, ELB_L, headR * 1.05]
    ];
  }

  /* start standing under the anchor, arm raised, then let gravity take over */
  function pose(ax, ay) {
    var u = 32 * S, f = 30 * S, n = 34 * S, t = 52 * S, th = 37 * S, sh = 35 * S;
    var neckX = ax - 4 * S, neckY = ay + u + f;
    var place = [
      [neckX, neckY - n], [neckX, neckY], [neckX, neckY + t],
      [ax - 2 * S, ay + f], [ax, ay],
      [neckX - 14 * S, neckY + u * 0.9], [neckX - 18 * S, neckY + u + f * 0.9],
      [neckX + 6 * S, neckY + t + th], [neckX + 7 * S, neckY + t + th + sh],
      [neckX - 6 * S, neckY + t + th], [neckX - 7 * S, neckY + t + th + sh]
    ];
    pts = place.map(function (p) { return { x: p[0], y: p[1], px: p[0], py: p[1] }; });
  }

  /* low gravity plus more drag reads as a heavier body: slower, calmer swings */
  var GRAVITY = 560, DAMP = 0.975, ITER = 7, STEP = 1 / 60;
  var anchor = { x: 0, y: 0 }, target = { x: 0, y: 0 }, holding = false;

  function simulate(dt) {
    var g = GRAVITY * dt * dt;
    for (var i = 0; i < pts.length; i++) {
      var p = pts[i], vx = (p.x - p.px) * DAMP, vy = (p.y - p.py) * DAMP;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + g;
    }
    for (var k = 0; k < ITER; k++) {
      pts[HAND_R].x = anchor.x; pts[HAND_R].y = anchor.y;          /* the hand holds on */
      for (var b = 0; b < bones.length; b++) { solve(bones[b], false); }
      for (var l = 0; l < limits.length; l++) { solve(limits[l], true); }
    }
    pts[HAND_R].x = anchor.x; pts[HAND_R].y = anchor.y;
  }

  function solve(c, minOnly) {
    var a = pts[c[0]], b = pts[c[1]];
    var dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy) || 0.0001;
    if (minOnly && d >= c[2]) { return; }
    var diff = (d - c[2]) / d * 0.5, ox = dx * diff, oy = dy * diff;
    var aFixed = c[0] === HAND_R, bFixed = c[1] === HAND_R;
    if (aFixed) { b.x -= ox * 2; b.y -= oy * 2; }
    else if (bFixed) { a.x += ox * 2; a.y += oy * 2; }
    else { a.x += ox; a.y += oy; b.x -= ox; b.y -= oy; }
  }

  /* ---------- drawing ---------- */
  var dpr = 1, W = 0, H = 0;
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = pin.clientWidth; H = pin.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    build();
  }

  function line(a, b) { ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b].x, pts[b].y); }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var ink = "rgba(246, 239, 226, 0.95)";

    /* neck from the bottom edge of the head, so the line doesn't cross the face */
    var hx = pts[HEAD].x, hy = pts[HEAD].y, nx = pts[NECK].x, ny = pts[NECK].y;
    var ang = Math.atan2(hy - ny, hx - nx), len = Math.hypot(hx - nx, hy - ny) || 1;
    var edgeX = hx - Math.cos(ang) * headR, edgeY = hy - Math.sin(ang) * headR;

    ctx.save();
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.strokeStyle = ink; ctx.lineWidth = Math.max(2, 3.4 * S);
    ctx.shadowColor = "rgba(255, 255, 255, 0.35)"; ctx.shadowBlur = 5;
    ctx.beginPath();
    line(NECK, HIP);
    line(NECK, ELB_R); line(ELB_R, HAND_R);
    line(NECK, ELB_L); line(ELB_L, HAND_L);
    line(HIP, KNEE_R); line(KNEE_R, FOOT_R);
    line(HIP, KNEE_L); line(KNEE_L, FOOT_L);
    if (len > headR) { ctx.moveTo(nx, ny); ctx.lineTo(edgeX, edgeY); }
    ctx.stroke();

    /* hands, feet and joints as small dots */
    ctx.fillStyle = ink;
    [HAND_R, HAND_L, FOOT_R, FOOT_L].forEach(function (i) {
      ctx.beginPath(); ctx.arc(pts[i].x, pts[i].y, Math.max(1.6, 2.6 * S), 0, Math.PI * 2); ctx.fill();
    });
    ctx.restore();

    /* the head: the transparent face cutout, upright along the neck, with a soft glow */
    if (face.complete && face.naturalWidth) {
      var fh = headR * 2, fw = fh * face.naturalWidth / face.naturalHeight;
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(ang + Math.PI / 2);
      ctx.shadowColor = "rgba(255, 255, 255, 0.35)"; ctx.shadowBlur = 6;
      ctx.drawImage(face, -fw / 2, -fh / 2, fw, fh);
      ctx.restore();
    }
  }

  /* ---------- where the hand goes ---------- */
  var mouse = { x: 0, y: 0, px: 0, py: 0, in: false };   /* px/py: last position outside the window */
  var grip = null, wasOver = false;   /* grip: spot on the window's edge he grabbed, as fractions of its size */

  function onIndex() {
    var g = parseFloat(document.documentElement.style.getPropertyValue("--glow")) || 0;
    var r = pin.getBoundingClientRect();
    return g > 0.98 && r.top > -2 && r.top < 2;                   /* opening finished, still pinned */
  }

  function restPoint() {
    var w = win.getBoundingClientRect(), p = pin.getBoundingClientRect();
    if (grip) { return { x: w.left + grip.x * w.width - p.left, y: w.top + grip.y * w.height - p.top }; }
    return { x: w.left - p.left - 14 * S, y: w.top - p.top + 6 };   /* before any grab: beside the top-left corner */
  }

  /* where the cursor's path from (ax, ay) to (bx, by) crossed the window's border */
  function entryPoint(w, ax, ay, bx, by) {
    var t0 = 0, t1 = 1, dx = bx - ax, dy = by - ay;
    var edges = [[-dx, ax - w.left], [dx, w.right - ax], [-dy, ay - w.top], [dy, w.bottom - ay]];
    for (var i = 0; i < 4; i++) {
      var pp = edges[i][0], q = edges[i][1];
      if (pp === 0) { if (q < 0) { t0 = 2; } continue; }
      var r = q / pp;
      if (pp < 0) { t0 = Math.max(t0, r); } else { t1 = Math.min(t1, r); }
    }
    if (t0 <= t1 && t0 <= 1) { return { x: ax + t0 * dx, y: ay + t0 * dy }; }
    /* no clean crossing (e.g. the page scrolled under the cursor): snap to the nearest edge */
    var d = [bx - w.left, w.right - bx, by - w.top, w.bottom - by], m = Math.min.apply(null, d);
    if (m === d[0]) { return { x: w.left, y: by }; }
    if (m === d[1]) { return { x: w.right, y: by }; }
    if (m === d[2]) { return { x: bx, y: w.top }; }
    return { x: bx, y: w.bottom };
  }

  function chooseTarget() {
    var p = pin.getBoundingClientRect(), w = win.getBoundingClientRect();
    var overWindow = mouse.in && mouse.x > w.left && mouse.x < w.right && mouse.y > w.top && mouse.y < w.bottom;
    if (overWindow && !wasOver) {                                /* just crossed in: grab the edge right there */
      var e = entryPoint(w, mouse.px, mouse.py, mouse.x, mouse.y);
      grip = { x: Math.max(0, Math.min(1, (e.x - w.left) / w.width)), y: Math.max(0, Math.min(1, (e.y - w.top) / w.height)) };
    }
    wasOver = overWindow;
    holding = mouse.in && !overWindow && mouse.y > p.top && mouse.y < p.bottom;
    if (holding) { target.x = mouse.x - p.left; target.y = mouse.y - p.top; }
    else { var r = restPoint(); target.x = r.x; target.y = r.y; }
  }

  /* ---------- loop: runs only while he's on screen and still moving ---------- */
  var running = false, last = 0, acc = 0, still = 0, shown = false, started = false;

  function frame(now) {
    var visible = onIndex() && !document.hidden;
    if (visible !== shown) { shown = visible; canvas.classList.toggle("is-on", visible); }
    if (!visible) {
      running = false;
      /* while the opening is on screen, look again shortly (cheap) so he appears as soon as it finishes */
      if (!document.hidden && pin.getBoundingClientRect().bottom > 0) { setTimeout(wake, 400); }
      return;
    }

    chooseTarget();
    if (!started) { anchor.x = target.x; anchor.y = target.y; pose(anchor.x, anchor.y); started = true; }

    /* the hand reaches the cursor quickly but not instantly, so switching grips swings him */
    var k = (holding || grip) ? 0.3 : 0.12;
    anchor.x += (target.x - anchor.x) * k; anchor.y += (target.y - anchor.y) * k;
    if (Math.abs(target.x - anchor.x) < 0.3 && Math.abs(target.y - anchor.y) < 0.3) { anchor.x = target.x; anchor.y = target.y; }

    var dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    acc += dt;
    var moved = 0;
    while (acc >= STEP) {
      simulate(STEP); acc -= STEP;
      for (var i = 0; i < pts.length; i++) {                 /* how far each joint actually travelled */
        moved += Math.abs(pts[i].x - pts[i].px) + Math.abs(pts[i].y - pts[i].py);
      }
    }
    draw();

    /* stop the loop once he has settled; any mouse move or scroll wakes him up */
    still = moved < 0.02 ? still + 1 : 0;
    if (still > 45) { running = false; last = 0; return; }
    window.requestAnimationFrame(frame);
  }

  function wake() {
    if (running) { return; }
    running = true; still = 0; last = 0;
    window.requestAnimationFrame(frame);
  }

  window.addEventListener("pointermove", function (ev) {
    if (ev.pointerType && ev.pointerType !== "mouse") { return; }
    mouse.x = ev.clientX; mouse.y = ev.clientY; mouse.in = true;
    var w = win.getBoundingClientRect();                       /* remember the last spot outside the window */
    if (!(mouse.x > w.left && mouse.x < w.right && mouse.y > w.top && mouse.y < w.bottom)) { mouse.px = mouse.x; mouse.py = mouse.y; }
    wake();
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", function () { mouse.in = false; wake(); });
  window.addEventListener("blur", function () { mouse.in = false; wake(); });
  window.addEventListener("scroll", wake, { passive: true });
  window.addEventListener("resize", function () { resize(); started = false; wake(); });
  document.addEventListener("visibilitychange", wake);
  face.onload = wake;

  resize();
  /* the opening may already be finished on load (coming back to #index) */
  setTimeout(wake, 300);
})();
