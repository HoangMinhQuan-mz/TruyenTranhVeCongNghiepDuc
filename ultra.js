(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
  var pages = Array.prototype.slice.call(document.querySelectorAll(".pg"));
  var book = document.getElementById("book");
  var tools = document.querySelector(".tools");
  var bar = document.querySelector(".bar");
  var api = window.LinhBolt;
  var cur = -1, soundOn = true, ac = null;
  try { soundOn = localStorage.getItem("lb-sound") !== "off"; } catch (e) {}

  /* ---------- Âm thanh lật trang (WebAudio, không cần file) ---------- */
  function whoosh(dir) {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var t = ac.currentTime, len = Math.floor(.4 * ac.sampleRate);
      var buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
      var s = ac.createBufferSource(); s.buffer = buf;
      var f = ac.createBiquadFilter(); f.type = "bandpass"; f.Q.value = .9;
      f.frequency.setValueAtTime(dir > 0 ? 600 : 3000, t);
      f.frequency.exponentialRampToValueAtTime(dir > 0 ? 3200 : 500, t + .36);
      var g = ac.createGain(); g.gain.value = .17;
      s.connect(f); f.connect(g); g.connect(ac.destination); s.start(t);
    } catch (e) {}
  }
  var snd = document.createElement("button");
  snd.type = "button"; snd.className = "tool-btn"; snd.title = "Âm thanh (M)";
  snd.setAttribute("aria-label", "Bật hoặc tắt âm thanh");
  function paintSnd() { snd.textContent = soundOn ? "🔊" : "🔇"; snd.style.fontSize = "16px"; }
  snd.addEventListener("click", function () {
    soundOn = !soundOn; paintSnd();
    try { localStorage.setItem("lb-sound", soundOn ? "on" : "off"); } catch (e) {}
    if (soundOn) whoosh(1);
  });
  paintSnd(); tools.insertBefore(snd, tools.firstChild);

  /* ---------- Chấm điều hướng ---------- */
  var dots = document.createElement("div");
  dots.className = "dots";
  pages.forEach(function (_, i) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "dot"; b.setAttribute("aria-label", "Đến trang " + (i + 1));
    b.addEventListener("click", function () { if (api) api.go(i); });
    dots.appendChild(b);
  });
  bar.parentNode.insertBefore(dots, bar);

  /* ---------- Chữ chạy: lời thoại hiện dần, nhân vật nhép miệng ---------- */
  var timers = [], active = [];
  function paint(o, n) {
    o.b.textContent = "";
    o.b.appendChild(document.createTextNode(o.full.slice(0, n)));
    var s = document.createElement("span");
    s.style.visibility = "hidden"; s.textContent = o.full.slice(n);
    o.b.appendChild(s);
  }
  function finish() {
    timers.forEach(clearTimeout); timers = [];
    active.forEach(function (o) { o.b.textContent = o.full; if (o.row) o.row.classList.remove("talk"); });
    active = [];
  }
  function type(page) {
    finish();
    Array.prototype.forEach.call(page.querySelectorAll(".sb"), function (b, k) {
      if (!b.dataset.full) { if (b.childElementCount) return; b.dataset.full = b.textContent; }
      var o = { b: b, full: b.dataset.full, row: b.closest(".row") };
      if (reduce) { b.textContent = o.full; return; }
      active.push(o); paint(o, 0);
      var n = 0;
      function tick() {
        n++; paint(o, n);
        if (n < o.full.length) timers.push(setTimeout(tick, o.full.charAt(n - 1) === " " ? 12 : 22 + Math.random() * 16));
        else if (o.row) o.row.classList.remove("talk");
      }
      timers.push(setTimeout(function () { if (o.row) o.row.classList.add("talk"); tick(); }, 950 + k * 420));
    });
  }

  /* ---------- Hạt nền (bánh răng, tia sáng) + pháo giấy ---------- */
  var cv = document.createElement("canvas");
  cv.className = "fx"; cv.setAttribute("aria-hidden", "true");
  document.body.insertBefore(cv, document.body.firstChild);
  var ctx = cv.getContext("2d"), W = 0, H = 0, amb = [], bits = [];
  var COLORS = ["#d6372b", "#f4b73a", "#3f6f8f", "#f7edd5"];
  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function path(r, teeth, inner) {
    ctx.beginPath();
    for (var i = 0; i < teeth * 2; i++) {
      var a = i / (teeth * 2) * 6.2832, rr = (i % 2 ? inner : 1) * r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  }
  function seed() {
    amb = [];
    var n = W < 600 ? 14 : 26;
    for (var i = 0; i < n; i++) amb.push({
      x: Math.random() * W, y: Math.random() * H, r: 8 + Math.random() * 22,
      vx: (Math.random() - .5) * .12, vy: -(.08 + Math.random() * .22),
      a: Math.random() * 6.28, va: (Math.random() - .5) * .012,
      c: COLORS[i % 3], gear: Math.random() < .6
    });
  }
  function burst(x, y, n, spread, power) {
    for (var i = 0; i < n; i++) {
      var ang = spread ? Math.random() * 6.2832 : -1.57 + (Math.random() - .5) * 1.2;
      var sp = power * (.4 + Math.random());
      bits.push({ x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, life: 0,
        max: 60 + Math.random() * 50, c: COLORS[i % 4], s: 3 + Math.random() * 4,
        a: Math.random() * 6, va: (Math.random() - .5) * .3, star: spread });
    }
  }
  function celebrate() {
    if (reduce) return;
    burst(W * .2, H * .85, 50, false, 15); burst(W * .8, H * .85, 50, false, 15);
    setTimeout(function () { burst(W * .5, H * .6, 60, true, 8); }, 450);
  }
  function frame() {
    window.requestAnimationFrame(frame);
    if (document.hidden) return;
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 2;
    amb.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.a += p.va;
      if (p.y < -40) { p.y = H + 40; p.x = Math.random() * W; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.globalAlpha = .2; ctx.strokeStyle = p.c; ctx.fillStyle = p.c;
      if (p.gear) { path(p.r, 8, .78); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, p.r * .3, 0, 6.2832); ctx.stroke(); }
      else { path(p.r * .55, 4, .25); ctx.fill(); }
      ctx.restore();
    });
    bits = bits.filter(function (b) { return b.life < b.max; });
    bits.forEach(function (b) {
      b.life++; b.x += b.vx; b.y += b.vy; b.vy += .35; b.vx *= .985; b.a += b.va;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
      ctx.globalAlpha = Math.max(0, 1 - b.life / b.max); ctx.fillStyle = b.c;
      if (b.star) { path(b.s * 1.6, 4, .3); ctx.fill(); } else ctx.fillRect(-b.s, -b.s / 2, b.s * 2, b.s);
      ctx.restore();
    });
  }
  if (!reduce) {
    size(); seed(); frame();
    window.addEventListener("resize", function () { size(); seed(); });
    document.addEventListener("pointerdown", function (e) {
      if (e.target.closest && e.target.closest(".bar,.tools,.dots")) return;
      burst(e.clientX, e.clientY, 9, true, 4);
    });
  }

  /* ---------- Nghiêng 3D theo chuột + ánh sáng trên khung ---------- */
  if (!reduce && window.matchMedia("(hover:hover)").matches) {
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var nx = e.clientX / window.innerWidth - .5, ny = e.clientY / window.innerHeight - .5;
      var ang = Math.min(5, Math.hypot(nx, ny) * 7);
      book.style.rotate = ang < .05 ? "0 0 1 0deg" : (-ny) + " " + nx + " 0 " + ang + "deg";
      var pn = e.target.closest && e.target.closest(".pn");
      if (pn) {
        var r = pn.getBoundingClientRect();
        pn.style.setProperty("--gx", ((e.clientX - r.left) / r.width * 100) + "%");
        pn.style.setProperty("--gy", ((e.clientY - r.top) / r.height * 100) + "%");
      }
    });
    document.documentElement.addEventListener("mouseleave", function () { book.style.rotate = "0 0 1 0deg"; });
  }

  /* ---------- Phím tắt thêm: F toàn màn hình, T giao diện, M âm thanh ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var k = e.key.toLowerCase();
    if (k === "f") document.getElementById("fullscreen").click();
    else if (k === "t") document.getElementById("theme").click();
    else if (k === "m") snd.click();
  });

  /* ---------- Theo dõi trang đang mở (không sửa logic lật trang gốc) ---------- */
  function enter(i) {
    if (i === cur) return;
    var dir = i > cur ? 1 : -1, first = cur < 0;
    cur = i;
    Array.prototype.forEach.call(dots.children, function (d, j) {
      d.classList.toggle("on", j === i);
      d.setAttribute("aria-current", j === i ? "page" : "false");
    });
    if (!first) whoosh(dir);
    type(pages[i]);
    if (!first && i === pages.length - 1) setTimeout(celebrate, 900);
  }
  function sync() {
    var i = pages.findIndex(function (p) { return p.classList.contains("on"); });
    if (i > -1) enter(i);
  }
  var mo = new MutationObserver(sync);
  pages.forEach(function (p) { mo.observe(p, { attributes: true, attributeFilter: ["class"] }); });
  sync();
})();
