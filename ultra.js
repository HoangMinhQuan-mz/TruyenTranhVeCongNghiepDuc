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

  /* ---------- Giọng đọc toàn bộ nội dung trên trang (hỗ trợ tốt cả Việt & Anh) ---------- */
  function stopSpeech() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    document.querySelectorAll(".sb.speaking").forEach(function (el) { el.classList.remove("speaking"); });
    document.querySelectorAll(".pn.reading-highlight").forEach(function (el) { el.classList.remove("reading-highlight"); });
    document.querySelectorAll(".row.talk").forEach(function (el) { el.classList.remove("talk"); });
  }

  // Chọn giọng tự nhiên nhất (ưu tiên giọng Google / Microsoft Natural / HoaiMy / NamMinh)
  function pickBestVoices() {
    var voices = window.speechSynthesis.getVoices() || [];
    var viVoices = voices.filter(function (v) { return /^vi/i.test(v.lang); });
    var enVoices = voices.filter(function (v) { return /^en/i.test(v.lang); });

    function scoreVoice(v, preferMale) {
      var s = 0;
      var n = (v.name || "").toLowerCase();
      if (n.indexOf("natural") > -1 || n.indexOf("online") > -1 || n.indexOf("neural") > -1) s += 10;
      if (n.indexOf("google") > -1 || n.indexOf("microsoft") > -1) s += 5;
      if (preferMale && (n.indexOf("nam") > -1 || n.indexOf("male") > -1 || n.indexOf("guy") > -1 || n.indexOf("david") > -1)) s += 4;
      if (!preferMale && (n.indexOf("hoaimy") > -1 || n.indexOf("female") > -1 || n.indexOf("jenny") > -1 || n.indexOf("aria") > -1)) s += 4;
      return s;
    }

    var viLoc = viVoices.slice().sort(function (a, b) { return scoreVoice(b, true) - scoreVoice(a, true); })[0] || null;
    var viBolt = viVoices.slice().sort(function (a, b) { return scoreVoice(b, false) - scoreVoice(a, false); })[0] || viLoc;
    var enVoice = enVoices.slice().sort(function (a, b) { return scoreVoice(b, false) - scoreVoice(a, false); })[0] || null;

    return { viLoc: viLoc, viBolt: viBolt, en: enVoice };
  }

  // Tách đoạn văn có từ tiếng Anh chuyên ngành để đọc đúng ngữ âm Anh - Việt
  function splitBilingualSegments(text) {
    var clean = text
      .replace(/[←→▲▼①②③④]/g, " ")
      .replace(/km²/g, " ki-lô-mét vuông ")
      .replace(/&/g, " và ")
      .replace(/\s+/g, " ")
      .trim();
    if (!clean) return [];

    var enRegex = /\b(Made in Germany|Smart Factory|Digital Twin|Hidden Champions|Industrie 4\.0|Energiewende|De-risking|Ausbildung|Mittelstand|Volkswagen|Mercedes-Benz|Siemens|Bosch|Infineon|Nordrhein-Westfalen|Bundestag|Bundesrat|Hamburg|Berlin|Frankfurt|Stuttgart|Internet|IIoT|AI)\b/g;
    var parts = [];
    var lastIndex = 0;
    var match;
    while ((match = enRegex.exec(clean)) !== null) {
      if (match.index > lastIndex) {
        var viPart = clean.slice(lastIndex, match.index).trim();
        if (viPart) parts.push({ text: viPart, lang: "vi" });
      }
      parts.push({ text: match[0], lang: "en" });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < clean.length) {
      var tail = clean.slice(lastIndex).trim();
      if (tail) parts.push({ text: tail, lang: "vi" });
    }
    return parts.length ? parts : [{ text: clean, lang: "vi" }];
  }

  // Thu thập toàn bộ nội dung hiển thị trên trang để nhân vật đọc trọn vẹn
  function collectPageReadingQueue(page) {
    var defaultSpeaker = page.dataset.speaker || "loc";
    var queue = [];

    // 1. Tiêu đề trang
    var titleEl = page.querySelector(".tt");
    if (titleEl && titleEl.textContent.trim()) {
      queue.push({ text: titleEl.textContent.trim(), speaker: defaultSpeaker, el: titleEl });
    }

    // 2. Nếu là trang bìa: đọc tiêu đề lớn
    var h1El = page.querySelector("h1");
    if (h1El && h1El.textContent.trim()) {
      queue.push({ text: h1El.textContent.trim(), speaker: defaultSpeaker, el: h1El });
    }

    // 3. Duyệt qua từng khung panel (.pn) theo đúng thứ tự xuất hiện
    var panels = Array.prototype.slice.call(page.querySelectorAll(".pn"));
    var currentSpeaker = defaultSpeaker;

    panels.forEach(function (pn) {
      var sb = pn.querySelector(".sb");
      if (sb) {
        currentSpeaker = sb.dataset.voice || currentSpeaker;
        var sbText = sb.dataset.full || sb.textContent;
        queue.push({ text: sbText, speaker: currentSpeaker, el: sb, row: sb.closest(".row") });
      } else {
        // Loại bỏ ký tự emoji/icon để giọng đọc mượt mà không đọc tên emoji
        var raw = pn.textContent.replace(/[^\p{L}\p{N}\s.,;:!?()\-–—/%&>"“”'’+~]/gu, " ").replace(/\s+/g, " ").trim();
        if (raw) {
          queue.push({ text: raw, speaker: currentSpeaker, el: pn });
        }
      }
    });

    // 4. Lời thoại nằm ngoài .pn (ví dụ ở bìa hoặc trang kết)
    Array.prototype.forEach.call(page.children, function (child) {
      if (child.classList && child.classList.contains("sb")) {
        var spk = child.dataset.voice || defaultSpeaker;
        queue.push({ text: child.dataset.full || child.textContent, speaker: spk, el: child });
      }
    });

    // 5. Ghi chú cuối trang (.nt) nếu có
    var ntEl = page.querySelector(".nt");
    if (ntEl && ntEl.textContent.trim()) {
      queue.push({ text: ntEl.textContent.trim(), speaker: currentSpeaker, el: ntEl });
    }

    return queue;
  }

  function speakPage(page) {
    stopSpeech();
    if (!voiceOn || !("speechSynthesis" in window)) return;
    var queue = collectPageReadingQueue(page);
    if (!queue.length) return;

    var vMap = pickBestVoices();
    var qIdx = 0;

    function speakNextItem() {
      if (!voiceOn || qIdx >= queue.length) return;
      var item = queue[qIdx++];
      var segments = splitBilingualSegments(item.text);
      var sIdx = 0;

      if (item.el) {
        if (item.el.classList.contains("sb")) item.el.classList.add("speaking");
        else if (item.el.classList.contains("pn")) item.el.classList.add("reading-highlight");
      }
      if (item.row) item.row.classList.add("talk");

      function speakNextSegment() {
        if (!voiceOn) return;
        if (sIdx >= segments.length) {
          if (item.el) {
            item.el.classList.remove("speaking");
            item.el.classList.remove("reading-highlight");
          }
          if (item.row) item.row.classList.remove("talk");
          setTimeout(speakNextItem, 220);
          return;
        }

        var seg = segments[sIdx++];
        var utter = new SpeechSynthesisUtterance(seg.text);
        if (seg.lang === "en" && vMap.en) {
          utter.voice = vMap.en;
          utter.lang = "en-US";
          utter.pitch = item.speaker === "bolt" ? 0.88 : 1.02;
          utter.rate = 0.96;
        } else {
          var v = item.speaker === "bolt" ? vMap.viBolt : vMap.viLoc;
          if (v) utter.voice = v;
          utter.lang = "vi-VN";
          if (item.speaker === "bolt") {
            utter.pitch = 0.90;
            utter.rate = 0.98;
          } else {
            utter.pitch = 1.05;
            utter.rate = 1.02;
          }
        }

        utter.onend = utter.onerror = function () {
          speakNextSegment();
        };
        window.speechSynthesis.speak(utter);
      }

      speakNextSegment();
    }

    setTimeout(speakNextItem, 420);
  }

  if ("speechSynthesis" in window) {
    window.speechSynthesis.onvoiceschanged = function () { pickBestVoices(); };
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
        if (api && api.toast) api.toast("Đã bật giọng đọc toàn trang (Lộc & Bolt)");
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

  /* ---------- Hạt nền bánh răng chuyển động + Pháo hoa trang cuối ---------- */
  var cv = document.createElement("canvas");
  cv.className = "fx";
  cv.setAttribute("aria-hidden", "true");
  document.body.insertBefore(cv, document.body.firstChild);
  var ctx = cv.getContext("2d"), W = 0, H = 0, amb = [], bits = [];
  var COLORS = ["#d6372b", "#f4b73a", "#3f6f8f", "#27ae60", "#ffffff"];

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
    var n = W < 600 ? 16 : 28;
    for (var i = 0; i < n; i++) amb.push({
      x: Math.random() * W, y: Math.random() * H, r: 10 + Math.random() * 24,
      vx: (Math.random() - .5) * .35, vy: -(.18 + Math.random() * .35),
      a: Math.random() * 6.28, va: (Math.random() - .5) * .022,
      c: COLORS[i % 3], gear: Math.random() < .65
    });
  }
  function burst(x, y, n, spread, power) {
    for (var i = 0; i < n; i++) {
      var ang = spread ? Math.random() * 6.2832 : -1.57 + (Math.random() - .5) * 1.25;
      var sp = power * (.45 + Math.random());
      bits.push({
        x: x, y: y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
        life: 0, max: 65 + Math.random() * 55, c: COLORS[i % COLORS.length],
        s: 3.5 + Math.random() * 4.5, a: Math.random() * 6, va: (Math.random() - .5) * .3, star: spread
      });
    }
  }
  function celebrate() {
    if (reduce) return;
    burst(W * .22, H * .85, 55, false, 15);
    burst(W * .78, H * .85, 55, false, 15);
    setTimeout(function () { burst(W * .5, H * .48, 75, true, 9.5); }, 350);
    setTimeout(function () {
      burst(W * .3, H * .4, 45, true, 7.5);
      burst(W * .7, H * .4, 45, true, 7.5);
    }, 800);
  }
  function frame() {
    window.requestAnimationFrame(frame);
    if (document.hidden) return;
    ctx.clearRect(0, 0, W, H);
    ctx.lineWidth = 2;
    amb.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.a += p.va;
      if (p.y < -45) { p.y = H + 45; p.x = Math.random() * W; }
      if (p.x < -45) p.x = W + 45;
      if (p.x > W + 45) p.x = -45;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.globalAlpha = .24; ctx.strokeStyle = p.c; ctx.fillStyle = p.c;
      if (p.gear) { gearPath(p.r, 8, .78); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, p.r * .3, 0, 6.2832); ctx.stroke(); }
      else { gearPath(p.r * .55, 4, .25); ctx.fill(); }
      ctx.restore();
    });
    bits = bits.filter(function (b) { return b.life < b.max; });
    bits.forEach(function (b) {
      b.life++; b.x += b.vx; b.y += b.vy; b.vy += .32; b.vx *= .985; b.a += b.va;
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
      if (e.target.closest && e.target.closest(".side-dock, button")) return;
      burst(e.clientX, e.clientY, 10, true, 4.2);
    });
  }

  // Nút tương tác ở trang cuối
  var replayBtn = document.getElementById("replayBtn");
  var celebrateBtn = document.getElementById("celebrateBtn");
  if (replayBtn) {
    replayBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (api) api.go(0);
    });
  }
  if (celebrateBtn) {
    celebrateBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      celebrate();
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
    if (i === pages.length - 1) setTimeout(celebrate, first ? 400 : 750);
  }

  function sync() {
    var i = pages.findIndex(function (p) { return p.classList.contains("on"); });
    if (i > -1) enter(i);
  }
  var mo = new MutationObserver(sync);
  pages.forEach(function (p) { mo.observe(p, { attributes: true, attributeFilter: ["class"] }); });
  sync();
})();
