(function () {
  "use strict";
  var pages = Array.prototype.slice.call(document.querySelectorAll(".pg"));
  var book = document.getElementById("book");
  var count = document.getElementById("cnt");
  var prev = document.getElementById("prev");
  var next = document.getElementById("next");
  var progress = document.getElementById("progress");
  var themeBtn = document.getElementById("theme");
  var fullBtn = document.getElementById("fullscreen");
  var helpBtn = document.getElementById("help");
  var toast = document.getElementById("toast");
  var index = 0, touchStart = null, toastTimer, turnTimer;

  // Khôi phục trang đã lưu nếu có
  try {
    var saved = parseInt(localStorage.getItem("lb-page"), 10);
    if (!isNaN(saved) && saved >= 0 && saved < pages.length) index = saved;
  } catch (e) {}

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2400);
  }

  function go(target) {
    var oldIndex = index;
    index = Math.max(0, Math.min(pages.length - 1, target));
    try { localStorage.setItem("lb-page", String(index)); } catch (e) {}

    if (oldIndex !== index) {
      var movingPage = index > oldIndex ? pages[oldIndex] : pages[index];
      if (movingPage) {
        movingPage.classList.remove("turning");
        void movingPage.offsetWidth;
        movingPage.classList.add("turning");
        setTimeout(function () { movingPage.classList.remove("turning"); }, 960);
      }
      book.classList.remove("turn-forward", "turn-back");
      void book.offsetWidth;
      book.classList.add(index > oldIndex ? "turn-forward" : "turn-back");
      clearTimeout(turnTimer);
      turnTimer = setTimeout(function () {
        book.classList.remove("turn-forward", "turn-back");
      }, 920);
    }

    pages.forEach(function (page, i) {
      page.classList.toggle("f", i < index);
      page.classList.toggle("on", i === index);
      // Trang đang lật giữ z-index cao nhất để thấy rõ tờ giấy xoay qua
      if (i === oldIndex && oldIndex !== index) {
        page.style.zIndex = 220;
      } else {
        page.style.zIndex = i < index ? 100 + i : pages.length - i;
      }
      page.setAttribute("aria-hidden", i === index ? "false" : "true");
    });

    count.textContent = String(index + 1).padStart(2, "0") + "/" + String(pages.length).padStart(2, "0");
    progress.style.height = ((index + 1) / pages.length * 100) + "%";
    prev.disabled = index === 0;
    next.disabled = index === pages.length - 1;
    document.title = (index + 1) + "/" + pages.length + " · Linh và Bolt";
  }

  prev.addEventListener("click", function () { go(index - 1); });
  next.addEventListener("click", function () { go(index + 1); });

  document.addEventListener("keydown", function (event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowRight" || event.key === "PageDown" || event.key === " ") {
      event.preventDefault(); go(index + 1);
    } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault(); go(index - 1);
    } else if (event.key === "Home") go(0);
    else if (event.key === "End") go(pages.length - 1);
  });

  book.addEventListener("touchstart", function (event) {
    touchStart = event.touches[0].clientX;
  }, { passive: true });
  book.addEventListener("touchend", function (event) {
    if (touchStart === null) return;
    var delta = event.changedTouches[0].clientX - touchStart;
    touchStart = null;
    if (Math.abs(delta) > 42) go(index + (delta < 0 ? 1 : -1));
  }, { passive: true });

  book.addEventListener("click", function (event) {
    if (event.target.closest("button, a")) return;
    if (window.getSelection && String(window.getSelection())) return;
    var rect = book.getBoundingClientRect();
    go(index + (event.clientX - rect.left > rect.width / 2 ? 1 : -1));
  });

  themeBtn.addEventListener("click", function () {
    var dark = document.documentElement.getAttribute("data-theme") !== "dark";
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    themeBtn.textContent = dark ? "☀" : "◐";
    showToast(dark ? "Đã bật giao diện tối" : "Đã bật giao diện sáng");
  });

  fullBtn.addEventListener("click", function () {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(function () {
        showToast("Không thể bật toàn màn hình trên trình duyệt này.");
      });
    } else if (document.exitFullscreen) document.exitFullscreen();
  });
  document.addEventListener("fullscreenchange", function () {
    fullBtn.textContent = document.fullscreenElement ? "×" : "⛶";
  });

  helpBtn.addEventListener("click", function () {
    showToast("Nhấn hai bên trang, vuốt ngang hoặc phím ← → | V: Giọng đọc | M: Tiếng lật giấy");
  });

  // Thêm lớp mặt sau & hiệu ứng ánh sáng cho từng tờ sách
  pages.forEach(function (page) {
    var back = document.createElement("div");
    back.className = "pg-backface";
    var sheen = document.createElement("div");
    sheen.className = "pg-sheen";
    page.appendChild(back);
    page.appendChild(sheen);

    Array.prototype.forEach.call(page.querySelectorAll(".pn"), function (panel, i) {
      panel.style.setProperty("--i", i);
      Array.prototype.forEach.call(panel.querySelectorAll(".sb,.big"), function (item) {
        item.style.setProperty("--i", i);
      });
    });
    Array.prototype.forEach.call(page.querySelectorAll(".cd"), function (item, i) {
      if (!item.style.getPropertyValue("--j")) item.style.setProperty("--j", i);
    });
  });

  window.LinhBolt = { go: go, count: pages.length, toast: showToast };
  go(index);
})();
