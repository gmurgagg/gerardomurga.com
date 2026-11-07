
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
  var HOME = "50deg 74deg auto", globeState = "";
  function settleGlobe(e) {
    if (!map.jumpCameraToGoal) { return; }          /* model-viewer has not loaded yet */
    var state = e >= 0.999 ? "spin" : (e <= 0.001 ? "home" : "hold");
    if (state === globeState) { return; }
    globeState = state;
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
    map.style.opacity = clamp(p * 4);
    map.style.transform = "translate3d(0," + ((1 - e) * vh * 1.1) + "px,0) scale(" + (0.15 + 0.85 * e) + ")";
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
  refresh();
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

  globe.addEventListener("pointerdown", function () {
    dragging = true; samples = [];
    if (coasting) { cancelAnimationFrame(coasting); coasting = 0; }
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
