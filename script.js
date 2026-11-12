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
  var index = 0;
  var touchStart = null;
  var toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove("show"); }, 2400);
  }

  function go(target) {
    index = Math.max(0, Math.min(pages.length - 1, target));
    pages.forEach(function (page, i) {
      page.classList.toggle("f", i < index);
      page.classList.toggle("on", i === index);
      page.style.zIndex = i < index ? 100 + i : pages.length - i;
      page.setAttribute("aria-hidden", i === index ? "false" : "true");
    });
    count.textContent = "TRANG " + (index + 1) + " / " + pages.length;
    progress.style.width = ((index + 1) / pages.length * 100) + "%";
    prev.disabled = index === 0;
    next.disabled = index === pages.length - 1;
    prev.setAttribute("aria-disabled", prev.disabled);
    next.setAttribute("aria-disabled", next.disabled);
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
    } else if (event.key === "Home") {
      go(0);
    } else if (event.key === "End") {
      go(pages.length - 1);
    } else if (event.key === "Escape" && document.fullscreenElement) {
      document.exitFullscreen();
    }
  });

  book.addEventListener("touchstart", function (event) {
    touchStart = event.touches[0].clientX;
  }, { passive: true });
  book.addEventListener("touchend", function (event) {
    if (touchStart === null) return;
    var delta = event.changedTouches[0].clientX - touchStart;
    touchStart = null;
    if (Math.abs(delta) > 45) go(index + (delta < 0 ? 1 : -1));
  }, { passive: true });

  book.addEventListener("click", function (event) {
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
    if (!document.fullscreenElement) {
      var request = document.documentElement.requestFullscreen;
      if (request) request.call(document.documentElement).catch(function () {
        showToast("Trình duyệt không hỗ trợ toàn màn hình");
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  });

  document.addEventListener("fullscreenchange", function () {
    fullBtn.textContent = document.fullscreenElement ? "×" : "⛶";
  });

  helpBtn.addEventListener("click", function () {
    showToast("Dùng nút Trước/Tiếp, phím ← → hoặc vuốt ngang để lật trang.");
  });

  pages.forEach(function (page) {
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

  go(0);
})();