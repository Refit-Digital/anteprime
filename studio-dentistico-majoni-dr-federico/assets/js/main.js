/* Studio Majoni — piccolo JS senza dipendenze. Il sito funziona anche senza. */
(function () {
  "use strict";

  /*
    ORARI SETTIMANALI — unico punto da modificare.
    Finché HOURS è null il sito mostra solo "Su appuntamento" / "By appointment".
    VERIFY: il vecchio sito indicava "lunedì–venerdì su appuntamento" (fonte singola).
    Quando lo studio conferma gli orari, sostituire null con un oggetto così
    (giorni 0=domenica ... 6=sabato; array vuoto = chiuso):

    var HOURS = {
      1: [["08:30", "12:30"], ["14:30", "19:00"]],
      ...
      6: [],
      0: []
    };
  */
  var HOURS = null;

  var lang = document.documentElement.lang === "en" ? "en" : "it";
  var T = {
    it: {
      days: ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"],
      openToday: "Oggi aperto: ", closedToday: "Oggi chiuso.", closed: "Chiuso",
      and: " e ", today: "oggi", caption: "Orari di apertura",
      ok: "Messaggio ricevuto, grazie. Lo studio La ricontatterà appena possibile. Per le urgenze telefonare allo 0436 866030.",
      err: "Non è stato possibile inviare il messaggio. Riprovare tra poco oppure telefonare allo 0436 866030.",
      invalid: "Alcuni campi vanno corretti: vedere i messaggi sotto ciascun campo.",
      sending: "Invio in corso…",
      fieldErr: {
        name: "Errore: inserire nome e cognome.",
        phone: "Errore: inserire un numero di telefono valido, ad esempio 333 123 4567.",
        email: "Errore: indirizzo email non valido. Controllare il formato, ad esempio nome@esempio.it.",
        privacy: "Errore: per inviare la richiesta è necessario accettare l'informativa privacy."
      },
      consentText: "Questo sito usa cookie tecnici e, solo previo consenso, cookie di terze parti per: "
    },
    en: {
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      openToday: "Open today: ", closedToday: "Closed today.", closed: "Closed",
      and: " and ", today: "today", caption: "Opening hours",
      ok: "Thank you, we've received your message and will get back to you soon. If it's urgent, please call +39 0436 866030.",
      err: "Sorry, your message couldn't be sent. Please try again shortly or call +39 0436 866030.",
      invalid: "Some fields need correcting: see the message under each field.",
      sending: "Sending…",
      fieldErr: {
        name: "Error: please enter your full name.",
        phone: "Error: please enter a valid phone number with country code, for example +44 7700 900123.",
        email: "Error: this email address isn't valid. Check the format, for example name@example.com.",
        privacy: "Error: please accept the privacy policy to send your request."
      },
      consentText: "This site uses technical cookies and, only with your consent, third-party cookies for: "
    }
  }[lang];

  /* ---------- Language switch: keep the #section when changing language ---------- */
  // Section ids are identical in both languages. The form confirmation anchors are not carried over.
  var NO_CARRY = { inviato: 1, sent: 1 };
  function syncLangLinks() {
    var h = window.location.hash.slice(1);
    document.querySelectorAll("a[data-lang-switch]").forEach(function (a) {
      var base = a.getAttribute("href").split("#")[0];
      a.setAttribute("href", h && !NO_CARRY[h] ? base + "#" + h : base);
    });
  }
  syncLangLinks();
  window.addEventListener("hashchange", syncLangLinks);
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("a[data-lang-switch]")) syncLangLinks();
  }, true);

  /* ---------- Focus not obscured (WCAG 2.4.11) ----------
     Browsers only scroll a focused control if it is mostly off-screen; a tall field can still end
     up half behind the fixed call bar or the cookie card. Nudge it above them (uses scroll-padding). */
  document.addEventListener("focusin", function (e) {
    var t = e.target;
    if (!t || !t.getBoundingClientRect || t.closest(".callbar, #cookie-banner")) return;
    var r = t.getBoundingClientRect();
    var pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingBottom) || 0;
    if (r.height < window.innerHeight / 2 && r.bottom > window.innerHeight - pad + 1) t.scrollIntoView({ block: "nearest" });
  });

  /* ---------- Hours (only once HOURS is filled in) ---------- */
  function fmt(t) { return t.replace(/^0/, ""); }
  function ranges(r) { return r.map(function (x) { return fmt(x[0]) + "–" + fmt(x[1]); }); }
  function romeDay() { // weekday in Cortina (Europe/Rome), not in the phone's time zone
    var wd = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", weekday: "short" }).format(new Date());
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
  }
  if (HOURS) {
    var d = romeDay();
    var todays = HOURS[d] || [];
    var msg = todays.length ? T.openToday + ranges(todays).join(T.and) : T.closedToday;
    document.querySelectorAll("[data-today-status]").forEach(function (el) { el.textContent = msg; });
    var slot = document.querySelector("[data-hours-table]");
    if (slot) {
      var html = '<table class="hours"><caption>' + T.caption + "</caption><tbody>";
      [1, 2, 3, 4, 5, 6, 0].forEach(function (i) {
        var r = HOURS[i] || [], isToday = i === d;
        html += "<tr" + (isToday ? ' class="is-today" aria-current="date"' : "") + '><th scope="row">' + T.days[i] +
          (isToday ? '<span class="today-tag">' + T.today + "</span>" : "") + "</th><td" + (r.length ? "" : ' class="closed"') + ">" +
          (r.length ? ranges(r).join("<br>") : T.closed) + "</td></tr>";
      });
      slot.innerHTML = html + "</tbody></table>";
    }
  }

  /* ---------- Web3forms: fetch with inline messages; without JS the normal POST + redirect works ---------- */
  var form = document.getElementById("contact-form");
  var PLACEHOLDER_KEY = "WEB3FORMS_ACCESS_KEY";
  function keyIsPlaceholder() {
    return !!form && !!form.access_key && form.access_key.value === PLACEHOLDER_KEY;
  }
  function warnKey() { // developer console only; nothing changes on the page
    if (keyIsPlaceholder() && window.console) {
      console.warn("[Studio Majoni] Web3forms access_key is still the placeholder \"" + PLACEHOLDER_KEY +
        "\": the contact form cannot send. Paste the real key in index.html and en/index.html (see README).");
    }
  }
  warnKey();

  if (form && window.fetch && window.FormData) {
    var status = document.getElementById("form-status");
    var btn = form.querySelector("button[type=submit]");
    form.setAttribute("novalidate", "");

    // field name -> test; each field has <p class="field-error" id="<input id>-err" hidden>
    var rules = {
      name: function (f) { return f.value.trim() !== ""; },
      phone: function (f) { return (f.value.match(/\d/g) || []).length >= 6; },
      email: function (f) { return f.value.trim() === "" || f.checkValidity(); },
      privacy: function (f) { return f.checked; }
    };

    function setError(f, text) {
      var err = document.getElementById(f.id + "-err");
      var base = (f.getAttribute("data-describedby") || "").trim();
      if (text) {
        f.setAttribute("aria-invalid", "true");
        if (err) { err.textContent = text; err.hidden = false; }
        f.setAttribute("aria-describedby", (base + " " + f.id + "-err").trim());
      } else {
        f.removeAttribute("aria-invalid");
        if (err) { err.textContent = ""; err.hidden = true; }
        if (base) f.setAttribute("aria-describedby", base); else f.removeAttribute("aria-describedby");
      }
    }

    Object.keys(rules).forEach(function (name) {
      var f = form.elements[name];
      if (!f) return;
      f.setAttribute("data-describedby", f.getAttribute("aria-describedby") || "");
      var clear = function () { if (f.getAttribute("aria-invalid") === "true" && rules[name](f)) setError(f, ""); };
      f.addEventListener("input", clear);
      f.addEventListener("change", clear);
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status";
      status.textContent = "";
      var bad = [];
      Object.keys(rules).forEach(function (name) {
        var f = form.elements[name];
        if (!f) return;
        var ok = rules[name](f);
        setError(f, ok ? "" : T.fieldErr[name]);
        if (!ok) bad.push(f);
      });
      if (bad.length) {
        status.textContent = T.invalid;
        status.classList.add("err");
        bad[0].focus();
        return;
      }
      if (form.botcheck && form.botcheck.checked) return; // bots: send nothing, say nothing

      warnKey();
      var data = new FormData(form);
      data.delete("redirect"); // the redirect is only for the no-JS fallback
      btn.disabled = true;
      status.textContent = T.sending;
      fetch(form.action, { method: "POST", headers: { Accept: "application/json" }, body: data })
        .then(function (r) { return r.json().then(function (j) { return r.ok && j.success; }); })
        .then(function (ok) {
          if (!ok) throw new Error("fail");
          form.reset();
          status.textContent = T.ok;
          status.classList.add("ok");
        })
        .catch(function () {
          status.textContent = T.err;
          status.classList.add("err");
        })
        .then(function () { btn.disabled = false; });
    });
  }

  /* ---------- Cookie notice / consent (design.md, "Cookie banner") ----------
     Only these two localStorage keys are ever used on this site:
     "mj-cookie-notice" (informative mode) and "mj-consent" (consent mode). */
  (function () {
    var el = document.getElementById("cookie-banner");
    if (!el) return;
    var root = document.documentElement;
    var services = Array.isArray(window.MJ_CONSENT_SERVICES) ? window.MJ_CONSENT_SERVICES : [];
    var consentMode = services.length > 0;
    var KEY = consentMode ? "mj-consent" : "mj-cookie-notice";
    var opener = null;

    function get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } }
    function set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* storage blocked: the notice returns next visit */ } }

    function activate() {
      document.querySelectorAll('script[type="text/plain"][data-consent]').forEach(function (old) {
        var s = document.createElement("script");
        for (var i = 0; i < old.attributes.length; i++) {
          var a = old.attributes[i];
          if (a.name !== "type" && a.name !== "data-consent") s.setAttribute(a.name, a.value);
        }
        s.text = old.text;
        old.replaceWith(s);
      });
    }

    // Tell the CSS how much of the bottom of the viewport the card covers, so focused
    // fields and anchors scroll clear of it (scroll-padding-bottom).
    function measure() {
      if (el.hidden) { root.style.removeProperty("--cookie-space"); return; }
      root.style.setProperty("--cookie-space", Math.ceil(window.innerHeight - el.getBoundingClientRect().top) + "px");
    }
    window.addEventListener("resize", measure);

    function show() {
      el.hidden = false;
      el.classList.remove("is-in");
      void el.offsetWidth; // restart the entrance animation (CSS runs it only without reduced motion)
      el.classList.add("is-in");
      measure();
    }
    function hide() {
      var hadFocus = el.contains(document.activeElement);
      el.hidden = true;
      el.classList.remove("is-in");
      measure();
      if (hadFocus && opener && document.contains(opener)) opener.focus(); // don't drop focus to <body>
      opener = null;
    }

    function decide(value) { // '1' | 'accepted' | 'rejected'
      var before = get(KEY);
      set(KEY, value);
      hide();
      if (value === "accepted") activate();
      if (value === "rejected" && before === "accepted") window.location.reload(); // unload activated scripts
    }

    if (consentMode) {
      el.querySelector(".cookie__ok").hidden = true;
      el.querySelector('[data-cookie="accept"]').hidden = false;
      el.querySelector('[data-cookie="reject"]').hidden = false;
      var text = el.querySelector(".cookie__text");
      var link = text.querySelector("a");
      var labels = services.map(function (s) { return s && s.label ? s.label : String(s && s.id || s); });
      text.textContent = T.consentText + labels.join(", ") + ". ";
      if (link) text.appendChild(link);
    }

    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-cookie]");
      if (!b) return;
      if (!consentMode) return decide("1");                         // Ok and X both just close
      decide(b.getAttribute("data-cookie") === "accept" ? "accepted" : "rejected"); // X = reject
    });
    // Escape closes the notice when focus is in it (or nowhere in particular), not while typing in the form.
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape" || el.hidden) return;
      var a = document.activeElement;
      if (el.contains(a) || !a || a === document.body) decide(consentMode ? "rejected" : "1");
    });

    // The card must never sit on top of the form: when focus enters the form, put the card away
    // for this page view without recording a choice (it comes back on the next page).
    if (form) {
      form.addEventListener("focusin", function () { if (!el.hidden) hide(); });
    }

    // Footer "Preferenze cookie" / "Cookie preferences" reopens the notice (without JS it opens the policy)
    document.querySelectorAll("[data-cookie-prefs]").forEach(function (l) {
      l.addEventListener("click", function (e) {
        e.preventDefault();
        opener = l;
        show();
        var first = el.querySelector(".cookie__actions button:not([hidden])");
        if (first) first.focus();
      });
    });

    var stored = get(KEY);
    if (consentMode && stored === "accepted") activate();
    if (!stored) show();
  })();
})();
