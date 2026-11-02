/* EKON 380 hazırlık modülü: gezinme, vurgu/tema tercihleri, ilerleme ve quiz. Bağımlılık yok. */
(function () {
  "use strict";

  /* ---------- Depolama (tarayıcı engellerse sessizce çalış) ---------- */
  var store = {
    get: function (k, fallback) {
      try { var v = localStorage.getItem("ekon380." + k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set: function (k, v) { try { localStorage.setItem("ekon380." + k, JSON.stringify(v)); } catch (e) {} }
  };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- Vurgu aç/kapat ---------- */
  var markBtn = $("#markBtn");
  function applyMarks(on) {
    document.documentElement.classList.toggle("marks-off", !on);
    markBtn.setAttribute("aria-pressed", on ? "true" : "false");
  }
  var marksOn = store.get("marks", "on") !== "off";
  try { marksOn = localStorage.getItem("ekon380.marks") !== "off"; } catch (e) {}
  applyMarks(marksOn);
  markBtn.addEventListener("click", function () {
    marksOn = !marksOn;
    applyMarks(marksOn);
    try { localStorage.setItem("ekon380.marks", marksOn ? "on" : "off"); } catch (e) {}
  });

  /* ---------- Tema ---------- */
  var themeBtn = $("#themeBtn");
  function effectiveTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    if (t) return t;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function labelTheme() { themeBtn.textContent = effectiveTheme() === "dark" ? "Açık tema" : "Koyu tema"; }
  labelTheme();
  themeBtn.addEventListener("click", function () {
    var next = effectiveTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("ekon380.theme", next); } catch (e) {}
    labelTheme();
  });

  /* ---------- Gezinme ---------- */
  var views = $$(".view");
  var railLinks = $$(".rail a");
  var menuBtn = $("#menuBtn");
  var pendingQuiz = null;

  function show(id) {
    if (!id || !document.getElementById(id) || !document.getElementById(id).classList.contains("view")) id = "home";
    views.forEach(function (v) { v.classList.toggle("active", v.id === id); });
    railLinks.forEach(function (a) {
      var u = a.getAttribute("data-u");
      var match = (u === "q" && id === "quiz") || ("u" + u === id);
      if (match) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    document.body.classList.remove("menu-open");
    menuBtn.setAttribute("aria-expanded", "false");
    window.scrollTo({ top: 0, behavior: "instant" });
    var titles = { home: "Ana sayfa", quiz: "Örnek quizler" };
    var h = $("#" + id + " h1");
    document.title = (titles[id] || (h ? h.textContent : "")) + " | EKON 380 hazırlık";
    if (id === "quiz") { renderSets(); if (pendingQuiz) { var p = pendingQuiz; pendingQuiz = null; startQuiz(p); } }
  }
  function route() { show(location.hash.replace("#", "")); }
  window.addEventListener("hashchange", route);

  menuBtn.addEventListener("click", function () {
    var open = document.body.classList.toggle("menu-open");
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  document.addEventListener("click", function (e) {
    var q = e.target.closest("[data-quiz]");
    if (q) { pendingQuiz = q.getAttribute("data-quiz"); }
    var d = e.target.closest("[data-done]");
    if (d) { toggleDone(d.getAttribute("data-done")); }
  });

  /* ---------- İlerleme ---------- */
  var done = store.get("done", []);
  if (!Array.isArray(done)) done = [];
  function paintProgress() {
    $("#progText").textContent = done.length + " / 6 sunum bitti";
    $("#progBar").style.width = Math.round(done.length / 6 * 100) + "%";
    $$(".rail a[data-u]").forEach(function (a) {
      var u = a.getAttribute("data-u"); if (u === "q") return;
      var small = $("small", a);
      var base = a.getAttribute("data-base") || small.textContent;
      a.setAttribute("data-base", base);
      small.textContent = done.indexOf("u" + u) > -1 ? base + " ✓" : base;
    });
    $$("[data-done]").forEach(function (b) {
      var isDone = done.indexOf(b.getAttribute("data-done")) > -1;
      b.textContent = isDone ? "Tamamlandı, geri al" : "Okudum, tamamlandı say";
    });
  }
  function toggleDone(id) {
    var i = done.indexOf(id);
    if (i > -1) done.splice(i, 1); else done.push(id);
    store.set("done", done);
    paintProgress();
  }
  paintProgress();

  /* ---------- Quiz ---------- */
  var SETS = window.QUIZ_SETS || [];
  var BANK = window.QUIZ || [];
  var best = store.get("best", {});
  var qsetsEl = $("#qsets");
  var stage = $("#qstage");
  var run = null; /* aktif quiz durumu */

  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function setTitle(id) {
    if (id === "mix") return "Deneme sınavı";
    for (var i = 0; i < SETS.length; i++) if (SETS[i].id === id) return SETS[i].title + ": " + SETS[i].sub;
    return "";
  }
  function bankFor(id) { return BANK.filter(function (q) { return q.u === id; }); }

  function renderSets() {
    qsetsEl.innerHTML = "";
    SETS.forEach(function (s) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button"; b.setAttribute("data-set", s.id);
      b.setAttribute("aria-pressed", run && run.id === s.id ? "true" : "false");
      var n = bankFor(s.id).length;
      b.innerHTML = "<b>" + s.title + ": " + s.sub + "</b><small>" + n + " soru" +
        (best[s.id] != null ? ' <span class="best">En iyi: %' + best[s.id] + "</span>" : "") + "</small>";
      li.appendChild(b); qsetsEl.appendChild(li);
    });
    var li2 = document.createElement("li"); li2.style.gridColumn = "1 / -1";
    var m = document.createElement("button");
    m.type = "button"; m.className = "mix"; m.setAttribute("data-set", "mix");
    m.setAttribute("aria-pressed", run && run.id === "mix" ? "true" : "false");
    m.innerHTML = "<b>Deneme sınavı</b><small>Altı sunumdan karışık 20 soru" +
      (best.mix != null ? " · En iyi: %" + best.mix : "") + "</small>";
    li2.appendChild(m); qsetsEl.appendChild(li2);
  }
  qsetsEl.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-set]"); if (!b) return;
    startQuiz(b.getAttribute("data-set"));
  });

  function pickMix() {
    var picked = [], rest = [];
    SETS.forEach(function (s) {
      var items = shuffle(bankFor(s.id));
      picked = picked.concat(items.slice(0, 3));
      rest = rest.concat(items.slice(3));
    });
    picked = picked.concat(shuffle(rest).slice(0, 20 - picked.length));
    return shuffle(picked);
  }

  function startQuiz(id, onlyQuestions) {
    var qs = onlyQuestions || (id === "mix" ? pickMix() : shuffle(bankFor(id)));
    if (!qs.length) return;
    run = { id: id, qs: qs, i: 0, score: 0, wrong: [], answered: false, retry: !!onlyQuestions };
    renderSets();
    renderQuestion();
    stage.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function renderQuestion() {
    var q = run.qs[run.i];
    /* Şıkları karıştır, doğru olanın yeni yerini tut */
    var order = shuffle(q.o.map(function (_, idx) { return idx; }));
    run.order = order; run.correctPos = order.indexOf(q.a); run.answered = false;
    var letters = ["A", "B", "C", "D", "E"];
    var html = '<div class="qhead"><span class="count">Soru ' + (run.i + 1) + " / " + run.qs.length + "</span><span>" + run.score + " doğru</span></div>" +
      '<div class="qbar"><i style="width:' + Math.round(run.i / run.qs.length * 100) + '%"></i></div>' +
      '<div class="qtag">' + setTitle(run.id === "mix" ? q.u : run.id) + "</div>" +
      '<div class="qtext">' + q.q + "</div><ul class=\"opts\">";
    order.forEach(function (orig, pos) {
      html += '<li><button type="button" data-pos="' + pos + '"><span class="k">' + letters[pos] + '</span><span class="t"></span></button></li>';
    });
    html += "</ul><div id=\"feedback\"></div>";
    stage.innerHTML = html;
    $$(".opts .t", stage).forEach(function (el, pos) { el.textContent = q.o[order[pos]]; });
    $(".opts button", stage).focus({ preventScroll: true });
  }

  stage.addEventListener("click", function (e) {
    var opt = e.target.closest(".opts button");
    if (opt && run && !run.answered) { answer(parseInt(opt.getAttribute("data-pos"), 10)); return; }
    var act = e.target.closest("[data-act]");
    if (!act) return;
    var a = act.getAttribute("data-act");
    if (a === "next") { run.i++; if (run.i >= run.qs.length) finish(); else renderQuestion(); }
    else if (a === "again") startQuiz(run.id);
    else if (a === "retry") startQuiz(run.id, shuffle(run.wrong.slice()));
    else if (a === "sets") { run = null; stage.innerHTML = ""; renderSets(); window.scrollTo({ top: 0, behavior: "smooth" }); }
  });

  document.addEventListener("keydown", function (e) {
    if (!run || !$("#quiz").classList.contains("active") || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!stage.querySelector(".opts")) return;
    var k = e.key.toLowerCase(), pos = -1;
    if ("1234".indexOf(k) > -1 && k.length === 1) pos = parseInt(k, 10) - 1;
    else if ("abcd".indexOf(k) > -1 && k.length === 1) pos = "abcd".indexOf(k);
    if (pos > -1 && !run.answered && pos < run.order.length) { e.preventDefault(); answer(pos); }
  });

  function answer(pos) {
    var q = run.qs[run.i];
    run.answered = true;
    var ok = pos === run.correctPos;
    if (ok) run.score++; else run.wrong.push(q);
    $$(".opts button", stage).forEach(function (b, p) {
      b.disabled = true;
      if (p === run.correctPos) b.classList.add("correct");
      else if (p === pos) b.classList.add("wrong");
    });
    var last = run.i === run.qs.length - 1;
    $("#feedback", stage).innerHTML =
      '<div class="explain"><b class="v">' + (ok ? "Doğru." : "Yanlış.") + "</b> " + q.e + "</div>" +
      '<button type="button" class="btn" data-act="next">' + (last ? "Sonucu gör" : "Sonraki soru") + "</button>";
    $("[data-act=next]", stage).focus({ preventScroll: true });
  }

  function finish() {
    var n = run.qs.length, pct = Math.round(run.score / n * 100);
    if (!run.retry) { if (best[run.id] == null || pct > best[run.id]) { best[run.id] = pct; store.set("best", best); } }
    var msg = pct >= 85 ? "Konuya hâkimsin." : pct >= 60 ? "İyi gidiyorsun; yanlışlarının açıklamalarına bir daha bak." : "İlgili sunumu bir kez daha oku, sonra yeniden dene.";
    var html = '<div class="result"><div class="qtag">' + setTitle(run.id) + (run.retry ? " (yanlış tekrarı)" : "") + "</div>" +
      '<div class="score">' + run.score + "<small> / " + n + "</small></div><p class=\"lede\">%" + pct + ". " + msg + "</p>" +
      '<div class="row-btns">' +
      (run.wrong.length ? '<button class="btn" type="button" data-act="retry">Yanlışlarımı tekrar çöz (' + run.wrong.length + ")</button>" : "") +
      '<button class="btn ghost" type="button" data-act="again">Baştan başla</button>' +
      '<button class="btn ghost" type="button" data-act="sets">Başka set seç</button></div>';
    if (run.wrong.length) {
      html += "<h3>Yanlış yaptıkların</h3><ul class=\"review\">";
      run.wrong.forEach(function (q) {
        html += '<li><div class="q">' + q.q + '</div><div class="a">Doğru cevap: ' + escapeHtml(q.o[q.a]) + "</div><div class=\"a\">" + q.e + "</div></li>";
      });
      html += "</ul>";
    }
    html += "</div>";
    stage.innerHTML = html;
    renderSets();
    stage.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function escapeHtml(s) { return s.replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* Quiz sayfasındaki soru sayılarını gerçek banka ile eşle */
  var total = BANK.length;
  var navSmall = $('.rail a[data-u="q"] small'); if (navSmall) navSmall.textContent = total + " soru, anında geri bildirim";

  route();
})();
