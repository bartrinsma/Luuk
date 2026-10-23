/* Monte Amigo – reserveringsformulier met controle, prijsindicatie en kalender. */
(function () {
  "use strict";

  var MA = window.MA;
  var D = MA.date;
  var cfg = window.MONTE_AMIGO;

  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("reserveren-form");
    if (!form) return;

    var f = {
      naam: form.elements.naam,
      email: form.elements.email,
      telefoon: form.elements.telefoon,
      gasten: form.elements.gasten,
      aankomst: form.elements.aankomst,
      vertrek: form.elements.vertrek,
      toelichting: form.elements.toelichting,
      website: form.elements.website // honeypot
    };
    var summary = document.getElementById("summary");
    var status = document.getElementById("form-status");
    var submit = form.querySelector('button[type="submit"]');
    var tomorrow = D.add(D.today(), 1);

    f.aankomst.min = D.iso(tomorrow);
    f.vertrek.min = D.iso(D.add(tomorrow, cfg.minNights));

    var cal = MA.calendar(document.getElementById("booking-calendar"), {
      months: 2,
      onSelect: function (a, b) {
        f.aankomst.value = a ? D.iso(a) : "";
        f.vertrek.value = b ? D.iso(b) : "";
        clearError(f.aankomst);
        clearError(f.vertrek);
        update();
      }
    });

    /* ---------- Hulpfuncties voor foutmeldingen ---------- */

    function fieldOf(input) { return input.closest(".field"); }

    function setError(input, msg) {
      var fl = fieldOf(input);
      fl.classList.add("has-error");
      fl.querySelector(".err").textContent = msg;
      input.setAttribute("aria-invalid", "true");
    }

    function clearError(input) {
      var fl = fieldOf(input);
      fl.classList.remove("has-error");
      input.removeAttribute("aria-invalid");
    }

    /* ---------- Datums controleren ---------- */

    function checkDates() {
      var a = D.parse(f.aankomst.value);
      var b = D.parse(f.vertrek.value);
      var res = { a: a, b: b, errors: {}, warnings: [] };

      if (!a) res.errors.aankomst = "Kies een aankomstdatum.";
      else if (a < tomorrow) res.errors.aankomst = "De aankomstdatum moet in de toekomst liggen.";

      if (!b) res.errors.vertrek = "Kies een vertrekdatum.";
      else if (a && b <= a) res.errors.vertrek = "De vertrekdatum moet na de aankomstdatum liggen.";

      if (a && b && b > a && !res.errors.aankomst) {
        var n = D.nights(a, b);
        if (n < cfg.minNights) {
          res.errors.vertrek = "Het minimale verblijf is " + cfg.minNights + " nachten.";
        } else if (!MA.rangeFree(a, b)) {
          res.errors.vertrek = "Het appartement is in (een deel van) deze periode al bezet. Bekijk de kalender hierboven.";
        }
        if (n > cfg.maxNights) {
          res.warnings.push("Het maximale verblijf is in principe " + cfg.maxNights +
            " nachten. Langer blijven? Vermeld het in de toelichting, dan nemen we contact met je op.");
        }
        var summer = function (d) { return d.getMonth() === 6 || d.getMonth() === 7; };
        if ((summer(a) || summer(D.add(b, -1))) && (a.getDay() !== 6 || b.getDay() !== 6)) {
          res.warnings.push("In juli en augustus loopt het verblijf in principe van zaterdag tot zaterdag. " +
            "In overleg zijn andere aankomst- en vertrekdagen mogelijk.");
        }
      }
      return res;
    }

    /* ---------- Samenvatting + prijsindicatie ---------- */

    function update() {
      var a = D.parse(f.aankomst.value);
      var b = D.parse(f.vertrek.value);
      if (a) f.vertrek.min = D.iso(D.add(a, cfg.minNights));
      cal.select(a, b);

      var r = checkDates();
      if (!a || !b || b <= a) {
        summary.hidden = true;
        return;
      }

      var p = MA.price(a, b);
      var html = "<dl>" +
        "<dt>Aankomst</dt><dd>" + D.nice(a) + "</dd>" +
        "<dt>Vertrek</dt><dd>" + D.nice(b) + "</dd>" +
        "<dt>Aantal nachten</dt><dd>" + p.nights + "</dd>";

      if (!r.errors.aankomst && !r.errors.vertrek) {
        html +=
          "<dt>Verblijf</dt><dd>" + MA.euro(p.stay) + "</dd>" +
          "<dt>Schoonmaakkosten</dt><dd>" + MA.euro(p.cleaning) + "</dd>" +
          '<dt class="total">Totaal (indicatie)</dt><dd class="total">' + MA.euro(p.stay + p.cleaning) + "</dd>" +
          "</dl>" +
          '<p class="small">Exclusief ' + MA.euro(p.deposit) + " borg, die je na afloop terugkrijgt. " +
          "De definitieve prijs ontvang je bij de bevestiging.</p>";
      } else {
        html += "</dl>";
      }

      Object.keys(r.errors).forEach(function (k) {
        html += '<p class="notice error">' + r.errors[k] + "</p>";
      });
      r.warnings.forEach(function (w) {
        html += '<p class="notice warn">' + w + "</p>";
      });

      summary.innerHTML = html;
      summary.hidden = false;
    }

    f.aankomst.addEventListener("change", function () { clearError(f.aankomst); update(); });
    f.vertrek.addEventListener("change", function () { clearError(f.vertrek); update(); });
    [f.naam, f.email, f.telefoon, f.gasten, f.toelichting].forEach(function (el) {
      el.addEventListener("input", function () { clearError(el); });
    });

    /* ---------- Vooringevulde datums uit de agenda (?aankomst=...&vertrek=...) ---------- */

    var q = new URLSearchParams(window.location.search);
    if (D.parse(q.get("aankomst"))) f.aankomst.value = q.get("aankomst");
    if (D.parse(q.get("vertrek"))) f.vertrek.value = q.get("vertrek");
    update();

    /* ---------- Versturen ---------- */

    function validate() {
      var ok = true;
      var first = null;
      function fail(input, msg) {
        setError(input, msg);
        ok = false;
        if (!first) first = input;
      }

      if (f.naam.value.trim().length < 2) fail(f.naam, "Vul je naam in.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim())) fail(f.email, "Vul een geldig e-mailadres in.");
      var tel = f.telefoon.value.replace(/[\s\-().]/g, "");
      if (!/^\+?\d{8,15}$/.test(tel)) fail(f.telefoon, "Vul een geldig telefoonnummer in, bijv. +31 6 12345678.");
      if (!f.gasten.value) fail(f.gasten, "Kies het aantal gasten.");

      var r = checkDates();
      if (r.errors.aankomst) fail(f.aankomst, r.errors.aankomst);
      if (r.errors.vertrek) fail(f.vertrek, r.errors.vertrek);

      if (first) first.focus();
      return ok;
    }

    function showStatus(kind, html) {
      status.className = "form-status is-visible " + kind;
      status.innerHTML = html;
      status.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    function payload() {
      var a = D.parse(f.aankomst.value);
      var b = D.parse(f.vertrek.value);
      var p = MA.price(a, b);
      return {
        naam: f.naam.value.trim(),
        email: f.email.value.trim(),
        telefoon: f.telefoon.value.trim(),
        gasten: f.gasten.value,
        aankomst: f.aankomst.value,
        vertrek: f.vertrek.value,
        nachten: p.nights,
        prijsindicatie: p.stay + p.cleaning,
        toelichting: f.toelichting.value.trim()
      };
    }

    function mailBody(d) {
      return [
        "Reserveringsaanvraag Monte Amigo",
        "",
        "Naam: " + d.naam,
        "E-mail: " + d.email,
        "Telefoon: " + d.telefoon,
        "Aantal gasten: " + d.gasten,
        "Aankomst: " + D.nice(D.parse(d.aankomst)),
        "Vertrek: " + D.nice(D.parse(d.vertrek)),
        "Aantal nachten: " + d.nachten,
        "Prijsindicatie (incl. schoonmaak, excl. borg): " + MA.euro(d.prijsindicatie),
        "",
        "Toelichting:",
        d.toelichting || "-"
      ].join("\n");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status";
      if (f.website.value) return; // spam
      if (!validate()) return;

      var d = payload();
      var subject = "Reservering Monte Amigo: " + d.aankomst + " t/m " + d.vertrek + " (" + d.naam + ")";

      if (cfg.formEndpoint) {
        submit.disabled = true;
        submit.textContent = "Bezig met versturen…";
        fetch(cfg.formEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(Object.assign({ _subject: subject }, d))
        })
          .then(function (res) {
            if (!res.ok) throw new Error(res.status);
            form.reset();
            update();
            showStatus("ok", "<strong>Bedankt, " + d.naam.split(" ")[0] + "!</strong> Je aanvraag is verstuurd. " +
              "We nemen zo snel mogelijk contact met je op om je reservering te bevestigen.");
          })
          .catch(function () {
            showStatus("fail", "Het versturen is helaas niet gelukt. Probeer het nog eens of mail naar " +
              '<a href="mailto:' + cfg.email + '">' + cfg.email + "</a>.");
          })
          .then(function () {
            submit.disabled = false;
            submit.textContent = "Verstuur je formulier";
          });
        return;
      }

      // Geen formulierdienst ingesteld: open een vooringevulde e-mail.
      var href = "mailto:" + cfg.email +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(mailBody(d));
      window.location.href = href;
      showStatus("ok", "<strong>Bijna klaar!</strong> Je e-mailprogramma opent met je aanvraag. Verstuur die e-mail om je reservering door te geven. " +
        "Opent er niets? Mail je gegevens dan naar " +
        '<a href="' + href + '">' + cfg.email + "</a>.");
    });
  });
})();
