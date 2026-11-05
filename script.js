
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
    "--bg": ["#10294f", "#eef1f5"], "--c-name": ["#ffffff", "#10294f"],
    "--c-role": ["#b3c5dd", "#4d5c72"], "--c-link": ["#a9bcd6", "#4d5c72"],
    "--c-hover": ["#ffffff", "#10294f"], "--c-rule": ["#3b5277", "#dde3ec"]
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

  function put(el, xs, ys, xe, ye, e, s) {
    var x = xs + (xe - xs) * e, y = ys + (ye - ys) * e;
    el.style.transform = "translate3d(" + x + "px," + y + "px,0) scale(" + s + ")";
  }

  var SPEED = 1.1;

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
    var s1 = Math.min(0.64, (vw * 0.92) / rowU);
    var left = -s1 * rowU / 2, top1 = 64;
    var tx = left + s1 * (m.pw + 22);
    var textH = m.nh + 6 + m.rh;
    var ty = top1 + s1 * (m.ph - textH) / 2;

    var e = ease(clamp(y * SPEED / (vh * 0.9)));
    var s = s0 + (s1 - s0) * e;

    put(pic, -s0 * m.pw / 2, gTop, left, top1, e, s);
    put(nm,  -s0 * m.nw / 2, gTop + s0 * nY, tx, ty, e, s);
    put(rl,  -s0 * m.rw / 2, gTop + s0 * rY, tx, ty + s1 * (m.nh + 6), e, s);
    put(em,  -s0 * m.ew / 2, gTop + s0 * eY, tx, ty + s1 * (m.nh + 6 + m.rh + 6), e, s);

    var fade = 1 - clamp(e / 0.45);
    em.style.opacity = fade;
    em.style.visibility = fade <= 0 ? "hidden" : "visible";

    for (var k in cols) { root.style.setProperty(k, mix(cols[k][0], cols[k][1], e)); }

    var t2 = clamp((y * SPEED - vh * 0.55) / (vh * 1.25));
    var e2 = ease(t2);
    map.style.opacity = clamp(t2 * 4);
    map.style.transform = "translate3d(0," + ((1 - e2) * vh * 1.1) + "px,0) scale(" + (0.15 + 0.85 * e2) + ")";
    sq.style.transform = "translate3d(" + ((1 - e2) * vw * 0.45) + "px,0,0)";
  }

  var cur = window.scrollY, target = cur, running = false;

  function tick() {
    var d = target - cur;
    if (calm || Math.abs(d) < 0.1) { cur = target; } else { cur += d * 0.14; }
    render(cur);
    if (cur !== target) { window.requestAnimationFrame(tick); } else { running = false; }
  }

  window.addEventListener("scroll", function () {
    target = window.scrollY;
    if (!running) { running = true; window.requestAnimationFrame(tick); }
  }, { passive: true });

  function refresh() { measure(); cur = target = window.scrollY; render(cur); }
  window.addEventListener("resize", refresh);
  window.addEventListener("load", refresh);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(refresh); }
  refresh();
})();
