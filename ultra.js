(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion:reduce)").matches;
  var pages = Array.prototype.slice.call(document.querySelectorAll(".pg"));
  var book = document.getElementById("book");
  var dotsBox = document.getElementById("dots");
  var sndBtn = document.getElementById("sound");
  var voiceBtn = document.getElementById("voice");
  var api = window.LinhBolt;
  var cur = -1, soundOn = true, voiceOn = false, ac = null;

  try { soundOn = localStorage.getItem("lb-sound") !== "off"; } catch (e) {}

  /* ---------- Âm thanh lật trang giấy 2 nhịp (Web Audio API) ---------- */
  function playPageSound(dir) {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      var t = ac.currentTime;
      // Nhịp 1: nhấc mép giấy + Nhịp 2: úp tờ giấy xuống
      [0, 0.14].forEach(function (offset, idx) {
        var dur = idx === 0 ? 0.18 : 0.28;
        var len = Math.floor(dur * ac.sampleRate);
        var buf = ac.createBuffer(1, len, ac.sampleRate);
        var d = buf.getChannelData(0);
        for (var i = 0; i < len; i++) {
          var env = Math.sin((i / len) * Math.PI);
          d[i] = (Math.random() * 2 - 1) * env * (idx === 0 ? 0.7 : 1.0);
        }
        var src = ac.createBufferSource();
        src.buffer = buf;
        var filter = ac.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.value = 1.1;
        filter.frequency.setValueAtTime(dir > 0 ? 750 : 2400, t + offset);
        filter.frequency.exponentialRampToValueAtTime(dir > 0 ? 2800 : 650, t + offset + dur);
        var gain = ac.createGain();
        gain.gain.value = idx === 0 ? 0.12 : 0.18;
        src.connect(filter);
        filter.connect(gain);
        gain.connect(ac.destination);
        src.start(t + offset);
      });
    } catch (e) {}
  }

  function paintSnd() {
    if (!sndBtn) return;
    sndBtn.textContent = soundOn ? "🔊" : "🔇";
    sndBtn.classList.toggle("active", soundOn);
  }
  if (sndBtn) {
    sndBtn.addEventListener("click", function () {
      soundOn = !soundOn;
      paintSnd();
      try { localStorage.setItem("lb-sound", soundOn ? "on" : "off"); } catch (e) {}
      if (soundOn) playPageSound(1);
      if (api && api.toast) api.toast(soundOn ? "Đã bật âm thanh lật sách" : "Đã tắt âm thanh lật sách");
    });
    paintSnd();
  }

  /* ---------- Giọng đọc hội thoại nhân vật (Linh & Robot Bolt) ---------- */
  function stopSpeech() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    document.querySelectorAll(".sb.speaking").forEach(function (el) { el.classList.remove("speaking"); });
    document.querySelectorAll(".row.talk").forEach(function (el) { el.classList.remove("talk"); });
  }

  function speakPage(page) {
    stopSpeech();
    if (!voiceOn || !("speechSynthesis" in window)) return;
    var bubbles = Array.prototype.slice.call(page.querySelectorAll(".sb"));
    if (!bubbles.length) return;

    var voices = window.speechSynthesis.getVoices();
    var viVoice = voices.find(function (v) { return /vi/i.test(v.lang); }) || null;
    var idx = 0;

    function nextBubble() {
      if (!voiceOn || idx >= bubbles.length) return;
      var sb = bubbles[idx++];
      var text = sb.dataset.full || sb.textContent.replace(/[←→]/g, "").trim();
      var role = sb.dataset.voice || "linh";
      var row = sb.closest(".row");

      var utter = new SpeechSynthesisUtterance(text);
      if (viVoice) utter.voice = viVoice;
      utter.lang = "vi-VN";
      // Giọng Linh cao và tự nhiên; giọng Robot Bolt trầm và đều nhịp
      if (role === "bolt") {
        utter.pitch = 0.72;
        utter.rate = 0.96;
      } else {
        utter.pitch = 1.18;
        utter.rate = 1.04;
      }
      utter.onstart = function () {
        sb.classList.add("speaking");
        if (row) row.classList.add("talk");
      };
      utter.onend = utter.onerror = function () {
        sb.classList.remove("speaking");
        if (row) row.classList.remove("talk");
        setTimeout(nextBubble, 260);
      };
      window.speechSynthesis.speak(utter);
    }
    setTimeout(nextBubble, 450);
  }

  if (voiceBtn) {
    voiceBtn.addEventListener("click", function () {
      if (!("speechSynthesis" in window)) {
        if (api && api.toast) api.toast("Trình duyệt không hỗ trợ đọc giọng nói.");
        return;
      }
      voiceOn = !voiceOn;
      voiceBtn.classList.toggle("active", voiceOn);
      if (voiceOn) {
        if (api && api.toast) api.toast("Đã bật giọng đọc Linh & Bolt");
        if (cur >= 0) speakPage(pages[cur]);
      } else {
        stopSpeech();
        if (api && api.toast) api.toast("Đã tắt giọng đọc nhân vật");
      }
    });
  }

  /* ---------- Chấm chọn nhanh trang ở thanh bên ---------- */
  if (dotsBox) {
    pages.forEach(function (_, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "dot";
      b.title = "Trang " + (i + 1);
      b.setAttribute("aria-label", "Đến trang " + (i + 1));
      b.addEventListener("click", function () { if (api) api.go(i); });
      dotsBox.appendChild(b);
    });
  }

  /* ---------- Hiệu ứng chữ chạy & nhân vật nhép miệng ---------- */
  var timers = [], active = [];
  function paint(o, n) {
    o.b.textContent = "";
    o.b.appendChild(document.createTextNode(o.full.slice(0, n)));
    var s = document.createElement("span");
    s.style.visibility = "hidden";
    s.textContent = o.full.slice(n);
    o.b.appendChild(s);
  }
  function finishTyping() {
    timers.forEach(clearTimeout);
    timers = [];
    active.forEach(function (o) {
      o.b.textContent = o.full;
      if (o.row && !voiceOn) o.row.classList.remove("talk");
    });
    active = [];
  }
  function typePage(page) {
    finishTyping();
    Array.prototype.forEach.call(page.querySelectorAll(".sb"), function (b, k) {
      if (!b.dataset.full) {
        if (b.childElementCount) return;
        b.dataset.full = b.textContent;
      }
      var o = { b: b, full: b.dataset.full, row: b.closest(".row") };
      if (reduce) { b.textContent = o.full; return; }
      active.push(o);
      paint(o, 0);
      var n = 0;
      function tick() {
        n++;
        paint(o, n);
        if (n < o.full.length) {
          timers.push(setTimeout(tick, o.full.charAt(n - 1) === " " ? 10 : 18 + Math.random() * 14));
        } else if (o.row && !voiceOn) {
          o.row.classList.remove("talk");
        }
      }
      timers.push(setTimeout(function () {
        if (o.row) o.row.classList.add("talk");
        tick();
      }, 650 + k * 360));
    });
  }

  /* ---------- Hạt nền bánh răng + pháo giấy trang cuối ---------- */
  var cv = document.createElement("canvas");
  cv.className = "fx";
  cv.setAttribute("aria-hidden", "true");
  document.body.insertBefore(cv, document.body.firstChild);
  var ctx = cv.getContext("2d"), W = 0, H = 0, amb = [], bits = [];
  var COLORS = ["#d6372b", "#f4b73a", "#3f6f8f", "#f7edd5"];

  function size() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function gearPath(r, teeth, inner) {
    ctx.beginPath();
    for (var i = 0; i < teeth * 2; i++) {
      var a = i / (teeth * 2) * 6.2832, rr = (i % 2 ? inner : 1) * r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath();
  }
  function seed() {
    amb = [];
    var n = W < 600 ? 12 : 22;
    for (var i = 0; i < n; i++) amb.push({
      x: Math.random() * W, y: Math.random() * H, r: 8 + Math.random() * 20,
      vx: (Math.random() - .5) * .12, vy: -(.08 + Math.random() * .2),
      a: Math.random() * 6.28, va: (Math.random() - .5) * .012,
      c: COLORS[i % 3], gear: Math.random() < .6
    });
  }
  function burst(x, y, n, spread, power) {
    for (var i = 0; i < n; i++) {
      var ang = spread ? Math.random() * 6.2832 : -1.57 + (Math.random() - .5) * 1.2;
      var sp = power * (.4 + Math.random());
      bits.push({
        x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        life: 0, max: 60 + Math.random() * 50, c: COLORS[i % 4],
        s: 3 + Math.random() * 4, a: Math.random() * 6, va: (Math.random() - .5) * .3, star: spread
      });
    }
  }
  function celebrate() {
    if (reduce) return;
    burst(W * .25, H * .85, 45, false, 14);
    burst(W * .75, H * .85, 45, false, 14);
    setTimeout(function () { burst(W * .5, H * .55, 55, true, 8); }, 420);
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
      ctx.globalAlpha = .18; ctx.strokeStyle = p.c; ctx.fillStyle = p.c;
      if (p.gear) { gearPath(p.r, 8, .78); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, p.r * .3, 0, 6.2832); ctx.stroke(); }
      else { gearPath(p.r * .55, 4, .25); ctx.fill(); }
      ctx.restore();
    });
    bits = bits.filter(function (b) { return b.life < b.max; });
    bits.forEach(function (b) {
      b.life++; b.x += b.vx; b.y += b.vy; b.vy += .35; b.vx *= .985; b.a += b.va;
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a);
      ctx.globalAlpha = Math.max(0, 1 - b.life / b.max); ctx.fillStyle = b.c;
      if (b.star) { gearPath(b.s * 1.6, 4, .3); ctx.fill(); } else ctx.fillRect(-b.s, -b.s / 2, b.s * 2, b.s);
      ctx.restore();
    });
  }
  if (!reduce) {
    size(); seed(); frame();
    window.addEventListener("resize", function () { size(); seed(); });
    document.addEventListener("pointerdown", function (e) {
      if (e.target.closest && e.target.closest(".side-dock")) return;
      burst(e.clientX, e.clientY, 8, true, 3.8);
    });
  }

  /* ---------- Nghiêng 3D nhẹ theo chuột ---------- */
  if (!reduce && window.matchMedia("(hover:hover)").matches) {
    document.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse") return;
      var nx = e.clientX / window.innerWidth - .5, ny = e.clientY / window.innerHeight - .5;
      var ang = Math.min(4, Math.hypot(nx, ny) * 6);
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

  /* ---------- Phím tắt ---------- */
  document.addEventListener("keydown", function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var k = e.key.toLowerCase();
    if (k === "f") document.getElementById("fullscreen").click();
    else if (k === "t") document.getElementById("theme").click();
    else if (k === "m" && sndBtn) sndBtn.click();
    else if (k === "v" && voiceBtn) voiceBtn.click();
  });

  function enter(i) {
    if (i === cur) return;
    var dir = i > cur ? 1 : -1, first = cur < 0;
    cur = i;
    if (dotsBox) {
      Array.prototype.forEach.call(dotsBox.children, function (d, j) {
        d.classList.toggle("on", j === i);
        d.setAttribute("aria-current", j === i ? "page" : "false");
      });
    }
    if (!first) playPageSound(dir);
    typePage(pages[i]);
    if (voiceOn) speakPage(pages[i]);
    if (!first && i === pages.length - 1) setTimeout(celebrate, 850);
  }

  function sync() {
    var i = pages.findIndex(function (p) { return p.classList.contains("on"); });
    if (i > -1) enter(i);
  }
  var mo = new MutationObserver(sync);
  pages.forEach(function (p) { mo.observe(p, { attributes: true, attributeFilter: ["class"] }); });
  sync();
})();
