/* Monte Amigo – beschikbaarheidskalender.
   Gebruik: MA.calendar(element, { months: 12, onSelect: function (aankomst, vertrek) {} }) */
(function () {
  "use strict";

  var MA = window.MA;
  var D = MA.date;
  var MONTHS = ["Januari", "Februari", "Maart", "April", "Mei", "Juni", "Juli",
    "Augustus", "September", "Oktober", "November", "December"];
  var DAYS = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];
  var MAX_AHEAD = 24; // maanden vooruit bladeren

  MA.calendar = function (root, opts) {
    opts = opts || {};
    var perView = opts.months || 12;
    var today = D.today();
    var first = new Date(today.getFullYear(), today.getMonth(), 1);
    var offset = 0;
    var start = null;
    var end = null;

    root.innerHTML =
      '<div class="cal-toolbar">' +
      '<button type="button" class="cal-btn cal-prev">&lsaquo; Eerder</button>' +
      '<div class="cal-range" aria-live="polite"></div>' +
      '<button type="button" class="cal-btn cal-next">Later &rsaquo;</button>' +
      "</div>" +
      '<div class="cal-grid"></div>' +
      '<ul class="cal-legend">' +
      '<li><span class="sw free"></span>Beschikbaar</li>' +
      '<li><span class="sw booked"></span>Bezet</li>' +
      '<li><span class="sw arrive"></span>Wisseldag (vertrek / aankomst)</li>' +
      (opts.onSelect ? '<li><span class="sw sel"></span>Jouw keuze</li>' : "") +
      "</ul>" +
      (opts.onSelect ? '<p class="cal-hint" aria-live="polite"></p>' : "");

    var grid = root.querySelector(".cal-grid");
    var label = root.querySelector(".cal-range");
    var prev = root.querySelector(".cal-prev");
    var next = root.querySelector(".cal-next");
    var hint = root.querySelector(".cal-hint");

    prev.addEventListener("click", function () { offset = Math.max(0, offset - perView); render(); });
    next.addEventListener("click", function () { offset = Math.min(MAX_AHEAD - perView, offset + perView); render(); });

    function setHint(text) {
      if (hint) hint.textContent = text;
    }

    function dayState(d) {
      if (d < today) return "past";
      var night = MA.nightBooked(d);
      var morning = MA.nightBooked(D.add(d, -1));
      if (night && morning) return "booked";
      if (night) return "arrive";
      if (morning) return "depart";
      return "free";
    }

    function stateLabel(s) {
      return {
        past: "verleden",
        booked: "bezet",
        arrive: "vrij tot de middag, daarna bezet",
        depart: "vrij vanaf de middag",
        free: "beschikbaar"
      }[s];
    }

    function monthTable(y, m) {
      var firstDay = new Date(y, m, 1);
      var lead = (firstDay.getDay() + 6) % 7;
      var days = new Date(y, m + 1, 0).getDate();
      var html = '<div class="cal-month"><h3>' + MONTHS[m] + " " + y + "</h3><table><thead><tr>" +
        '<th scope="col" aria-label="Weeknummer">w</th>';
      DAYS.forEach(function (d) { html += '<th scope="col">' + d + "</th>"; });
      html += "</tr></thead><tbody>";

      var cell = 0;
      var d = 1;
      while (d <= days) {
        var weekStart = new Date(y, m, Math.max(1, d - (cell === 0 ? lead : 0)));
        html += '<tr><td class="wk">' + D.isoWeek(weekStart) + "</td>";
        for (var c = 0; c < 7; c++) {
          if ((cell === 0 && c < lead) || d > days) {
            html += "<td></td>";
          } else {
            var date = new Date(y, m, d);
            html += "<td>" + dayCell(date) + "</td>";
            d++;
          }
        }
        html += "</tr>";
        cell++;
      }
      return html + "</tbody></table></div>";
    }

    function dayCell(date) {
      var s = dayState(date);
      var cls = "cal-day " + s;
      var iso = D.iso(date);
      if (start && +date === +start) cls += end ? " sel-start" : " sel";
      else if (end && +date === +end) cls += " sel-end";
      else if (start && end && date > start && date < end && s === "free") cls += " in-range";

      var aria = D.nice(date) + ", " + stateLabel(s);
      if (opts.onSelect && s !== "past") {
        return '<button type="button" class="' + cls + '" data-date="' + iso + '" aria-label="' + aria + '">' +
          date.getDate() + "</button>";
      }
      return '<span class="' + cls + '" title="' + aria + '">' + date.getDate() + "</span>";
    }

    function render() {
      var html = "";
      for (var i = 0; i < perView; i++) {
        var m = new Date(first.getFullYear(), first.getMonth() + offset + i, 1);
        html += monthTable(m.getFullYear(), m.getMonth());
      }
      grid.innerHTML = html;
      var a = new Date(first.getFullYear(), first.getMonth() + offset, 1);
      var b = new Date(first.getFullYear(), first.getMonth() + offset + perView - 1, 1);
      label.textContent = perView === 1
        ? MONTHS[a.getMonth()] + " " + a.getFullYear()
        : MONTHS[a.getMonth()].slice(0, 3) + " " + a.getFullYear() + " – " + MONTHS[b.getMonth()].slice(0, 3) + " " + b.getFullYear();
      prev.disabled = offset === 0;
      next.disabled = offset + perView >= MAX_AHEAD;
    }

    if (opts.onSelect) {
      grid.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-date]");
        if (!btn) return;
        var d = D.parse(btn.getAttribute("data-date"));

        if (!start || end || d <= start) {
          // Nieuwe aankomstdatum kiezen
          if (MA.nightBooked(d)) {
            setHint("Op " + D.nice(d) + " kun je niet aankomen; die nacht is al bezet.");
            return;
          }
          start = d;
          end = null;
          setHint("Aankomst: " + D.nice(d) + ". Kies nu je vertrekdatum.");
        } else {
          if (!MA.rangeFree(start, d)) {
            setHint("Er zit een bezette nacht tussen. Kies een eerdere vertrekdatum of een andere aankomst.");
            return;
          }
          end = d;
          setHint(D.nights(start, end) + " nachten geselecteerd. Klik op een dag om opnieuw te kiezen.");
        }
        render();
        opts.onSelect(start, end);
      });
    }

    render();

    return {
      select: function (a, b) {
        start = a || null;
        end = a && b && b > a ? b : null;
        if (start) {
          var diff = (start.getFullYear() - first.getFullYear()) * 12 + start.getMonth() - first.getMonth();
          if (diff >= 0 && (diff < offset || diff >= offset + perView)) {
            offset = Math.min(MAX_AHEAD - perView, diff);
          }
        }
        render();
      }
    };
  };
})();
