/* Monte Amigo – algemene scripts: menu, lightbox, datumhulpjes. */
(function () {
  "use strict";

  var MA = (window.MA = window.MA || {});

  /* ---------- Datumhulpjes (lokale tijd, zonder tijdzoneverrassingen) ---------- */

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  MA.date = {
    parse: function (s) {
      if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
      var p = s.split("-");
      var d = new Date(+p[0], +p[1] - 1, +p[2]);
      return d.getMonth() === +p[1] - 1 ? d : null;
    },
    iso: function (d) {
      return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    },
    add: function (d, days) {
      return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);
    },
    today: function () {
      var n = new Date();
      return new Date(n.getFullYear(), n.getMonth(), n.getDate());
    },
    nights: function (a, b) {
      return Math.round((b - a) / 86400000);
    },
    nice: function (d) {
      return d.toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
    },
    isoWeek: function (d) {
      var t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      var day = t.getUTCDay() || 7;
      t.setUTCDate(t.getUTCDate() + 4 - day);
      var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
      return Math.ceil(((t - y0) / 86400000 + 1) / 7);
    }
  };

  /* ---------- Beschikbaarheid ---------- */

  var bookings = ((window.MONTE_AMIGO && window.MONTE_AMIGO.bookings) || [])
    .map(function (b) { return { van: MA.date.parse(b.van), tot: MA.date.parse(b.tot) }; })
    .filter(function (b) { return b.van && b.tot && b.tot > b.van; });

  /* Is de nacht die op deze dag begint bezet? */
  MA.nightBooked = function (d) {
    for (var i = 0; i < bookings.length; i++) {
      if (d >= bookings[i].van && d < bookings[i].tot) return true;
    }
    return false;
  };

  /* Zijn alle nachten van aankomst t/m de nacht vóór vertrek vrij? */
  MA.rangeFree = function (a, b) {
    for (var d = a; d < b; d = MA.date.add(d, 1)) {
      if (MA.nightBooked(d)) return false;
    }
    return true;
  };

  /* ---------- Prijsindicatie ---------- */

  MA.price = function (a, b) {
    var cfg = window.MONTE_AMIGO;
    var n = MA.date.nights(a, b);
    var total = 0;
    var d = a;
    var left = n;
    // Hele weken tegen weektarief (maand van de eerste nacht van die week), rest per nacht.
    while (left >= 7) {
      total += cfg.rates[d.getMonth()].week;
      d = MA.date.add(d, 7);
      left -= 7;
    }
    while (left > 0) {
      total += cfg.rates[d.getMonth()].night;
      d = MA.date.add(d, 1);
      left -= 1;
    }
    return { nights: n, stay: total, cleaning: cfg.cleaningFee, deposit: cfg.deposit };
  };

  MA.euro = function (v) { return "€" + v.toLocaleString("nl-NL"); };

  /* ---------- Menu ---------- */

  function initMenu() {
    var nav = document.querySelector(".main-nav");
    if (!nav) return;
    var btn = nav.querySelector(".menu-toggle");
    btn.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  /* ---------- Video: verbergen als het bestand ontbreekt ---------- */

  function initVideo() {
    var v = document.querySelector(".video video");
    if (!v) return;
    var hide = function () { v.parentNode.hidden = true; };
    // Het fout-event kan al zijn afgegaan voordat dit script draait.
    if (v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) return hide();
    v.addEventListener("error", hide, true);
  }

  /* ---------- Lightbox voor de fotogalerij ---------- */

  function initLightbox() {
    var links = Array.prototype.slice.call(document.querySelectorAll("[data-lightbox]"));
    if (!links.length) return;

    var box = document.createElement("div");
    box.className = "lightbox";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Foto vergroot");
    box.innerHTML =
      '<img alt="">' +
      '<button type="button" class="lb-close" aria-label="Sluiten">&times;</button>' +
      '<button type="button" class="lb-prev" aria-label="Vorige foto">&#8249;</button>' +
      '<button type="button" class="lb-next" aria-label="Volgende foto">&#8250;</button>' +
      '<div class="lb-count" aria-live="polite"></div>';
    document.body.appendChild(box);

    var img = box.querySelector("img");
    var count = box.querySelector(".lb-count");
    var idx = 0;
    var lastFocus = null;

    function show(i) {
      idx = (i + links.length) % links.length;
      var l = links[idx];
      img.src = l.getAttribute("data-lightbox");
      img.alt = l.querySelector("img").alt;
      count.textContent = idx + 1 + " / " + links.length;
    }
    function open(i) {
      lastFocus = document.activeElement;
      show(i);
      box.classList.add("is-open");
      document.body.style.overflow = "hidden";
      box.querySelector(".lb-close").focus();
    }
    function close() {
      box.classList.remove("is-open");
      document.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }

    links.forEach(function (l, i) {
      l.addEventListener("click", function (e) { e.preventDefault(); open(i); });
    });
    box.querySelector(".lb-close").addEventListener("click", close);
    box.querySelector(".lb-prev").addEventListener("click", function () { show(idx - 1); });
    box.querySelector(".lb-next").addEventListener("click", function () { show(idx + 1); });
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
    document.addEventListener("keydown", function (e) {
      if (!box.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "ArrowRight") show(idx + 1);
    });

    var startX = null;
    box.addEventListener("touchstart", function (e) { startX = e.touches[0].clientX; }, { passive: true });
    box.addEventListener("touchend", function (e) {
      if (startX === null) return;
      var dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
      startX = null;
    });
  }

  /* ---------- Tarieventabel: huidige maand markeren ---------- */

  function initRates() {
    var rows = document.querySelectorAll(".rates tbody tr");
    if (rows.length === 12) rows[new Date().getMonth()].classList.add("is-current");
  }

  document.addEventListener("DOMContentLoaded", function () {
    initMenu();
    initVideo();
    initLightbox();
    initRates();
  });
})();
