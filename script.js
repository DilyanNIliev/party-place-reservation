/* ============================================================
   Зала Aurea — script.js
   Vanilla JS, без зависимости. Всеки модул е самостоятелен и
   се инициализира само ако съответните елементи съществуват.
   ============================================================ */
(function () {
  'use strict';

  var $  = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var MONTH_NAMES = ['януари', 'февруари', 'март', 'април', 'май', 'юни',
                     'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];
  function formatDate(iso) {
    var p = String(iso).split('-');
    if (p.length !== 3) return iso;
    return Number(p[2]) + ' ' + MONTH_NAMES[Number(p[1]) - 1] + ' ' + p[0] + ' г.';
  }

  /* ---------- 1. Фолбек за липсващи снимки ----------
     Ако реалната снимка още не е качена в assets/img/, показваме
     елегантен градиентен заместител с текста от alt атрибута. */
  function imageFallback(img) {
    if (img.id === 'lbImg') return;                       // lightbox-ът си има собствен фон
    var wrap = img.closest('.media') || img.parentElement; // .media, .gal__btn, …
    if (!wrap) return;
    wrap.classList.add('is-missing');
    if (!wrap.getAttribute('data-alt')) wrap.setAttribute('data-alt', img.alt || 'Снимка от залата');
  }
  document.addEventListener('error', function (e) {
    if (e.target && e.target.tagName === 'IMG') imageFallback(e.target);
  }, true);
  // за снимки, които са се провалили преди зареждането на скрипта
  $$('img').forEach(function (img) {
    if (img.complete && img.naturalWidth === 0) imageFallback(img);
  });

  /* ---------- 2. Хедър: фон при скрол + активна секция ---------- */
  var header = $('#siteHeader');
  var navLinks = $$('.nav__list a');
  var sections = navLinks.map(function (a) { return $(a.getAttribute('href')); }).filter(Boolean);

  function onScroll() {
    if (header) header.classList.toggle('is-stuck', window.scrollY > 40);

    var toTop = $('#toTop');
    if (toTop) toTop.classList.toggle('is-visible', window.scrollY > 600);

    var pos = window.scrollY + window.innerHeight * 0.3;
    var current = null;
    sections.forEach(function (sec) { if (sec.offsetTop <= pos) current = sec.id; });
    navLinks.forEach(function (a) {
      a.classList.toggle('is-current', a.getAttribute('href') === '#' + current);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- 3. Мобилно меню ---------- */
  var burger = $('#burger');
  var nav = $('#nav');
  if (burger && nav) {
    var closeNav = function () {
      nav.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Отвори менюто');
      document.body.classList.remove('is-locked');
    };
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Затвори менюто' : 'Отвори менюто');
      document.body.classList.toggle('is-locked', open);
    });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeNav(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeNav(); });
  }

  /* ---------- 4. Разкриване при скрол ---------- */
  var revealables = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var siblings = Array.prototype.slice.call(entry.target.parentElement.children)
          .filter(function (el) { return el.classList.contains('reveal'); });
        var i = Math.max(0, siblings.indexOf(entry.target));
        entry.target.style.setProperty('--d', Math.min(i, 5) * 90 + 'ms');
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px' });
    revealables.forEach(function (el) { io.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------- 5. Анимирани броячи ---------- */
  var counters = $$('[data-count]');
  if (counters.length && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseInt(el.getAttribute('data-count'), 10) || 0;
        if (reduceMotion) { el.textContent = target; cio.unobserve(el); return; }
        var start = performance.now(), dur = 1400;
        (function tick(now) {
          var p = Math.min(1, (now - start) / dur);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(tick);
        })(start);
        cio.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- 6. Превключване на тарифа в пакетите ---------- */
  $$('.toggle__btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var mode = btn.getAttribute('data-price'); // 'day' | 'hour'
      $$('.toggle__btn').forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-selected', String(on));
      });
      $$('[data-price-' + mode + ']').forEach(function (el) {
        el.textContent = el.getAttribute('data-price-' + mode);
      });
    });
  });

  /* ---------- 7. Интерактивен план на залата ---------- */
  var svg = $('#planSvg');
  if (svg) {
    var NS = 'http://www.w3.org/2000/svg';
    var range = $('#guestRange');
    var out = $('#guestOut');
    var layout = 'banquet';
    var CAP = { banquet: 250, theatre: 300, cocktail: 350, ushape: 90 };
    var NAMES = { banquet: 'Банкет', theatre: 'Театрална', cocktail: 'Коктейл', ushape: 'П-образна' };

    function el(name, attrs) {
      var n = document.createElementNS(NS, name);
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      return n;
    }

    function drawShell() {
      svg.appendChild(el('rect', { x: 10, y: 10, width: 580, height: 400, rx: 14, fill: '#17151A', stroke: 'rgba(200,162,74,.28)' }));
      // сцена
      svg.appendChild(el('rect', { x: 215, y: 16, width: 170, height: 34, rx: 6, fill: '#8E2B41', opacity: '.85' }));
      var stageTxt = el('text', { x: 300, y: 38, 'text-anchor': 'middle', fill: '#F4EFE6', 'font-size': '13', 'font-family': 'Manrope, sans-serif' });
      stageTxt.textContent = 'СЦЕНА';
      svg.appendChild(stageTxt);
      // бар
      svg.appendChild(el('rect', { x: 16, y: 300, width: 34, height: 104, rx: 6, fill: '#5E7C8B', opacity: '.8' }));
      var barTxt = el('text', { x: 33, y: 356, 'text-anchor': 'middle', fill: '#F4EFE6', 'font-size': '11', 'font-family': 'Manrope, sans-serif', transform: 'rotate(-90 33 356)' });
      barTxt.textContent = 'БАР';
      svg.appendChild(barTxt);
      // вход
      svg.appendChild(el('rect', { x: 540, y: 380, width: 50, height: 8, rx: 4, fill: 'rgba(244,239,230,.35)' }));
      var inTxt = el('text', { x: 565, y: 374, 'text-anchor': 'middle', fill: '#9A9289', 'font-size': '10', 'font-family': 'Manrope, sans-serif' });
      inTxt.textContent = 'вход';
      svg.appendChild(inTxt);
    }

    function drawBanquet(guests) {
      var tables = Math.ceil(guests / 10);
      // дансинг
      svg.appendChild(el('rect', { x: 218, y: 188, width: 164, height: 92, rx: 8, fill: 'rgba(244,239,230,.08)', stroke: 'rgba(244,239,230,.25)', 'stroke-dasharray': '5 5' }));
      var d = el('text', { x: 300, y: 239, 'text-anchor': 'middle', fill: 'rgba(244,239,230,.55)', 'font-size': '11', 'font-family': 'Manrope, sans-serif' });
      d.textContent = 'ДАНСИНГ';
      svg.appendChild(d);

      var spots = [], cols = 6, rows = 5;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x = 80 + c * 88, y = 85 + r * 68;
          if (x > 210 && x < 400 && y > 150 && y < 300) continue; // прескачаме дансинга
          spots.push([x, y]);
        }
      }
      spots.slice(0, Math.min(tables, spots.length)).forEach(function (p, i) {
        svg.appendChild(el('circle', { cx: p[0], cy: p[1], r: 22, fill: 'rgba(200,162,74,.18)', stroke: '#C8A24A', 'stroke-width': '1.5' }));
        var t = el('text', { x: p[0], y: p[1] + 4, 'text-anchor': 'middle', fill: '#C8A24A', 'font-size': '11', 'font-family': 'Manrope, sans-serif' });
        t.textContent = String(i + 1);
        svg.appendChild(t);
        for (var s = 0; s < 8; s++) {
          var a = (Math.PI * 2 / 8) * s;
          svg.appendChild(el('circle', { cx: p[0] + Math.cos(a) * 31, cy: p[1] + Math.sin(a) * 31, r: 4, fill: 'rgba(244,239,230,.45)' }));
        }
      });
      return { furniture: tables + ' кръгли маси × 10 стола', space: 'дансинг 80 м² в центъра' };
    }

    function drawTheatre(guests) {
      var perRow = 16, rows = Math.ceil(guests / perRow), drawn = 0;
      for (var r = 0; r < Math.min(rows, 10); r++) {
        for (var c = 0; c < perRow; c++) {
          if (drawn >= guests) break;
          var gap = c < perRow / 2 ? 0 : 28;
          svg.appendChild(el('rect', { x: 92 + c * 25 + gap, y: 90 + r * 30, width: 17, height: 17, rx: 3, fill: 'rgba(200,162,74,.25)', stroke: '#C8A24A', 'stroke-width': '1' }));
          drawn++;
        }
      }
      return { furniture: Math.min(rows, 10) + ' реда × 16 стола (централна пътека)', space: 'подиум и екран 4×3 м' };
    }

    function drawCocktail(guests) {
      var tables = Math.ceil(guests / 8);
      var positions = [];
      for (var r = 0; r < 4; r++) for (var c = 0; c < 7; c++) positions.push([85 + c * 72, 100 + r * 78]);
      positions.slice(0, Math.min(tables, positions.length)).forEach(function (p) {
        svg.appendChild(el('circle', { cx: p[0], cy: p[1], r: 13, fill: 'rgba(200,162,74,.2)', stroke: '#C8A24A', 'stroke-width': '1.5' }));
      });
      svg.appendChild(el('rect', { x: 200, y: 300, width: 200, height: 90, rx: 8, fill: 'rgba(244,239,230,.08)', stroke: 'rgba(244,239,230,.25)', 'stroke-dasharray': '5 5' }));
      var d = el('text', { x: 300, y: 350, 'text-anchor': 'middle', fill: 'rgba(244,239,230,.55)', 'font-size': '11', 'font-family': 'Manrope, sans-serif' });
      d.textContent = 'СВОБОДНА ЗОНА';
      svg.appendChild(d);
      return { furniture: tables + ' бар маси (стоящи, по 8 души)', space: 'свободна зона 180 м²' };
    }

    function drawUshape(guests) {
      var seats = Math.min(guests, 90), placed = 0, w = 8;
      function seat(x, y) { svg.appendChild(el('rect', { x: x, y: y, width: w, height: w, rx: 2, fill: 'rgba(244,239,230,.5)' })); }
      // маси във форма на П
      svg.appendChild(el('rect', { x: 150, y: 95, width: 300, height: 34, rx: 5, fill: 'rgba(200,162,74,.2)', stroke: '#C8A24A' }));
      svg.appendChild(el('rect', { x: 150, y: 129, width: 34, height: 230, rx: 5, fill: 'rgba(200,162,74,.2)', stroke: '#C8A24A' }));
      svg.appendChild(el('rect', { x: 416, y: 129, width: 34, height: 230, rx: 5, fill: 'rgba(200,162,74,.2)', stroke: '#C8A24A' }));
      for (var i = 0; i < 14 && placed < seats; i++, placed++) seat(160 + i * 21, 80);
      for (var j = 0; j < 12 && placed < seats; j++, placed++) seat(136, 140 + j * 19);
      for (var k = 0; k < 12 && placed < seats; k++, placed++) seat(456, 140 + k * 19);
      for (var m = 0; m < 12 && placed < seats; m++, placed++) seat(200 + m * 19, 150);
      for (var n = 0; n < 12 && placed < seats; n++, placed++) seat(200 + n * 19, 340);
      return { furniture: 'П-образна маса за ' + seats + ' души', space: 'зона за презентация пред сцената' };
    }

    function render() {
      var guests = parseInt(range.value, 10);
      svg.innerHTML = '<title id="planTitle">Схема на подредбата в залата</title>' +
        '<desc id="planDesc">Динамична схема на разположението на масите спрямо избрания брой гости.</desc>';
      drawShell();

      var info;
      if (layout === 'banquet') info = drawBanquet(guests);
      else if (layout === 'theatre') info = drawTheatre(guests);
      else if (layout === 'cocktail') info = drawCocktail(guests);
      else info = drawUshape(guests);

      out.textContent = guests;
      $('#infoLayout').textContent = NAMES[layout];
      $('#infoFurniture').textContent = info.furniture;
      $('#infoSpace').textContent = info.space;

      var cap = CAP[layout], status = $('#infoStatus');
      status.className = '';
      if (guests <= cap * 0.8) { status.textContent = 'Побира се комфортно'; status.classList.add('ok'); }
      else if (guests <= cap) { status.textContent = 'Побира се, но е плътно'; status.classList.add('warn'); }
      else { status.textContent = 'Над капацитета (макс. ' + cap + ')'; status.classList.add('bad'); }
    }

    range.addEventListener('input', render);
    $$('#layoutChips .chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        layout = chip.getAttribute('data-layout');
        $$('#layoutChips .chip').forEach(function (c) { c.classList.toggle('is-active', c === chip); });
        render();
      });
    });
    render();
  }

  /* ---------- 8. Филтър на галерията ---------- */
  $$('.filters .chip').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.getAttribute('data-filter');
      $$('.filters .chip').forEach(function (c) {
        var on = c === chip;
        c.classList.toggle('is-active', on);
        c.setAttribute('aria-selected', String(on));
      });
      $$('.gal').forEach(function (fig) {
        fig.classList.toggle('is-hidden', f !== 'all' && fig.getAttribute('data-cat') !== f);
      });
    });
  });

  /* ---------- 9. Lightbox ---------- */
  var lb = $('#lightbox');
  if (lb) {
    var lbImg = $('#lbImg'), lbCap = $('#lbCap'), idx = 0, lastFocus = null;
    var visible = function () { return $$('.gal:not(.is-hidden)'); };

    function show(i) {
      var items = visible();
      if (!items.length) return;
      idx = (i + items.length) % items.length;
      var fig = items[idx], img = $('img', fig), cap = $('figcaption', fig);
      lbImg.src = img.getAttribute('src');
      lbImg.alt = img.alt;
      lbCap.textContent = cap ? cap.textContent : img.alt;
    }
    function open(i) {
      lastFocus = document.activeElement;
      lb.hidden = false;
      document.body.classList.add('is-locked');
      show(i);
      $('#lbClose').focus();
    }
    function close() {
      lb.hidden = true;
      document.body.classList.remove('is-locked');
      if (lastFocus) lastFocus.focus();
    }

    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.gal__btn');
      if (!btn) return;
      open(visible().indexOf(btn.closest('.gal')));
    });
    $('#lbClose').addEventListener('click', close);
    $('#lbPrev').addEventListener('click', function () { show(idx - 1); });
    $('#lbNext').addEventListener('click', function () { show(idx + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(idx - 1);
      if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  /* ---------- 10. Видео обиколка (заместител) ---------- */
  var tourBtn = $('#tourPlay');
  if (tourBtn) {
    tourBtn.addEventListener('click', function () {
      // Замени с реален embed: <iframe src="https://www.youtube.com/embed/VIDEO_ID?autoplay=1">
      var src = tourBtn.getAttribute('data-video');
      if (src) {
        var frame = document.createElement('iframe');
        frame.src = src;
        frame.title = 'Видео обиколка на зала Aurea';
        frame.allow = 'autoplay; fullscreen';
        frame.setAttribute('allowfullscreen', '');
        frame.style.cssText = 'width:100%;aspect-ratio:16/9;border:0;border-radius:14px';
        tourBtn.replaceWith(frame);
      } else {
        alert('Видео обиколката ще бъде публикувана скоро. Запази оглед на живо на +359 888 123 456.');
      }
    });
  }

  /* ---------- 11. Слайдер с отзиви ---------- */
  var track = $('#reviewTrack');
  if (track) {
    var slides = $$('.review', track);
    var dotsBox = $('#revDots');
    var active = 0, timer = null;

    slides.forEach(function (_, i) {
      var b = document.createElement('button');
      b.setAttribute('aria-label', 'Отзив ' + (i + 1));
      b.addEventListener('click', function () { go(i, true); });
      dotsBox.appendChild(b);
    });
    var dots = $$('button', dotsBox);

    function go(i, stop) {
      active = (i + slides.length) % slides.length;
      track.scrollTo({ left: slides[active].offsetLeft - track.offsetLeft, behavior: reduceMotion ? 'auto' : 'smooth' });
      dots.forEach(function (d, k) { d.classList.toggle('is-active', k === active); });
      if (stop) restart();
    }
    function restart() {
      clearInterval(timer);
      if (!reduceMotion) timer = setInterval(function () { go(active + 1); }, 7000);
    }
    $('#revNext').addEventListener('click', function () { go(active + 1, true); });
    $('#revPrev').addEventListener('click', function () { go(active - 1, true); });
    track.addEventListener('scroll', function () {
      var i = Math.round(track.scrollLeft / (slides[0].offsetWidth + 24));
      if (i !== active && slides[i]) {
        active = i;
        dots.forEach(function (d, k) { d.classList.toggle('is-active', k === active); });
      }
    }, { passive: true });
    ['mouseenter', 'focusin', 'touchstart'].forEach(function (ev) {
      track.addEventListener(ev, function () { clearInterval(timer); }, { passive: true });
    });
    track.addEventListener('mouseleave', restart);
    go(0);
    restart();
  }

  /* ---------- 12. Календар с наличност ----------
     ДЕМО ДАННИ: в реален проект зареди наличността от бекенда, напр.
     fetch('/api/availability?from=…&to=…').then(r => r.json())
     с формат { "2026-09-19": "busy", "2026-09-26": "hold" } */
  var grid = $('#calGrid');
  if (grid) {
    var MONTHS = MONTH_NAMES;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var view = new Date(today.getFullYear(), today.getMonth(), 1);
    var minView = new Date(today.getFullYear(), today.getMonth(), 1);
    var maxView = new Date(today.getFullYear() + 1, today.getMonth(), 1);
    var selected = null;

    var key = function (d) {
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    };

    // Демо наличност: повечето съботи в следващите 6 месеца са заети,
    // част от петъците са с опция. Заменя се с реални данни от бекенда.
    var availability = (function () {
      var map = {}, d = new Date(today), i = 0;
      for (; i < 400; i++) {
        var day = d.getDay();
        if (day === 6 && i % 21 < 14) map[key(d)] = 'busy';
        else if (day === 5 && i % 17 < 5) map[key(d)] = 'hold';
        else if (day === 0 && i % 29 < 4) map[key(d)] = 'busy';
        d.setDate(d.getDate() + 1);
      }
      return map;
    })();

    function build() {
      grid.innerHTML = '';
      $('#calTitle').textContent = MONTHS[view.getMonth()] + ' ' + view.getFullYear();
      $('#calPrev').disabled = view <= minView;
      $('#calNext').disabled = view >= maxView;

      var first = new Date(view.getFullYear(), view.getMonth(), 1);
      var offset = (first.getDay() + 6) % 7; // понеделник = 0
      var total = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();

      for (var i = 0; i < offset; i++) {
        var e = document.createElement('div');
        e.className = 'day day--empty';
        grid.appendChild(e);
      }

      for (var n = 1; n <= total; n++) {
        var date = new Date(view.getFullYear(), view.getMonth(), n);
        var k = key(date);
        var state = date < today ? 'past' : (availability[k] || 'free');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'day day--' + state;
        btn.textContent = n;
        btn.dataset.date = k;
        btn.setAttribute('role', 'gridcell');
        if (date.getTime() === today.getTime()) btn.classList.add('day--today');
        if (selected === k) btn.classList.add('is-selected');

        var label = n + ' ' + MONTHS[view.getMonth()] + ' ' + view.getFullYear();
        if (state === 'free') btn.setAttribute('aria-label', label + ' – свободно, избери датата');
        else if (state === 'hold') btn.setAttribute('aria-label', label + ' – резервирано с опция');
        else if (state === 'busy') { btn.setAttribute('aria-label', label + ' – заето'); btn.disabled = true; }
        else { btn.setAttribute('aria-label', label + ' – минала дата'); btn.disabled = true; }

        grid.appendChild(btn);
      }
    }

    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('.day');
      if (!btn || btn.disabled || btn.classList.contains('day--empty')) return;
      selected = btn.dataset.date;
      $$('.day', grid).forEach(function (d) { d.classList.remove('is-selected'); });
      btn.classList.add('is-selected');

      var input = $('#fDate');
      if (input) input.value = selected;

      var parts = selected.split('-');
      var pretty = Number(parts[2]) + ' ' + MONTHS[Number(parts[1]) - 1] + ' ' + parts[0];
      var hint = $('#calHint');
      if (btn.classList.contains('day--hold')) {
        hint.innerHTML = 'Избрана дата: <strong>' + pretty + '</strong> – има резервация с опция. Изпрати запитване и ще те уведомим при освобождаване.';
      } else {
        hint.innerHTML = 'Избрана дата: <strong>' + pretty + '</strong> – свободна. Попълни формата, за да я задържим с опция за 7 дни.';
      }
      var form = $('#booking-form');
      if (form && window.innerWidth < 940) form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    });

    $('#calPrev').addEventListener('click', function () { view.setMonth(view.getMonth() - 1); build(); });
    $('#calNext').addEventListener('click', function () { view.setMonth(view.getMonth() + 1); build(); });
    build();

    // ограничения на полето за дата
    var dateInput = $('#fDate');
    if (dateInput) {
      dateInput.min = key(today);
      dateInput.max = key(new Date(today.getFullYear() + 2, today.getMonth(), today.getDate()));
    }
  }

  /* ---------- 13. Предварителен избор от картите и пакетите ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-preset], [data-preset-package]');
    if (!a) return;
    var type = a.getAttribute('data-preset');
    var pkg = a.getAttribute('data-preset-package');
    if (type && $('#fType')) $('#fType').value = type;
    if (pkg && $('#fPackage')) $('#fPackage').value = pkg;
  });

  /* ---------- 14. Валидация и изпращане на формата ---------- */
  var form = $('#booking-form');
  if (form) {
    var rules = {
      fName:   function (v) { return v.trim().length >= 3 || 'Моля, въведи име и фамилия.'; },
      fPhone:  function (v) { return /^[+0-9\s()\-]{9,18}$/.test(v.trim()) || 'Въведи валиден телефонен номер.'; },
      fEmail:  function (v) { return /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(v.trim()) || 'Въведи валиден имейл адрес.'; },
      fDate:   function (v) {
        if (!v) return 'Избери дата на събитието.';
        var d = new Date(v + 'T00:00:00'), t = new Date(); t.setHours(0, 0, 0, 0);
        return d >= t || 'Датата трябва да е в бъдещето.';
      },
      fType:   function (v) { return !!v || 'Избери тип събитие.'; },
      fGuests: function (v) {
        var n = Number(v);
        if (!v) return 'Въведи очакван брой гости.';
        if (n < 10) return 'Минималният брой гости е 10.';
        if (n > 350) return 'Капацитетът на залата е 350 гости. Свържи се с нас за повече.';
        return true;
      },
      fGdpr:   function (v, el) { return el.checked || 'Необходимо е съгласие за обработка на данните.'; }
    };

    function validateField(id) {
      var el = $('#' + id);
      if (!el || !rules[id]) return true;
      var res = rules[id](el.value, el);
      var field = el.closest('.field');
      var msg = $('.field__error[data-for="' + id + '"]');
      var ok = res === true;
      if (field) field.classList.toggle('has-error', !ok);
      if (msg) msg.textContent = ok ? '' : res;
      el.setAttribute('aria-invalid', String(!ok));
      return ok;
    }

    Object.keys(rules).forEach(function (id) {
      var el = $('#' + id);
      if (!el) return;
      el.addEventListener('blur', function () { validateField(id); });
      el.addEventListener('input', function () {
        if (el.closest('.field').classList.contains('has-error')) validateField(id);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = $('#formStatus');
      var valid = Object.keys(rules).map(validateField).every(Boolean);

      if (!valid) {
        status.className = 'form__status is-err';
        status.textContent = 'Моля, провери отбелязаните полета.';
        var firstBad = $('.field.has-error input, .field.has-error select');
        if (firstBad) firstBad.focus();
        return;
      }

      var data = Object.fromEntries(new FormData(form).entries());
      data.submittedAt = new Date().toISOString();

      /* Тук се закача реалният бекенд, например:
         fetch('/api/inquiry', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify(data)
         })
         Демо режим: запазваме локално и показваме потвърждение. */
      try {
        var saved = JSON.parse(localStorage.getItem('aurea_inquiries') || '[]');
        saved.push(data);
        localStorage.setItem('aurea_inquiries', JSON.stringify(saved));
      } catch (err) { /* localStorage може да е недостъпен */ }

      var btn = $('button[type="submit"]', form);
      btn.disabled = true;
      btn.textContent = 'Изпращане…';

      setTimeout(function () {
        btn.disabled = false;
        btn.textContent = 'Изпрати запитването';
        status.className = 'form__status is-ok';
        status.textContent = 'Благодарим, ' + data.name.split(' ')[0] + '! Запитването за ' +
          formatDate(data.date) + ' (' + data.type.toLowerCase() + ', ' + data.guests +
          ' гости) е получено. Ще се свържем с теб до 24 часа на ' + data.phone + '.';
        form.reset();
        $$('.field').forEach(function (f) { f.classList.remove('has-error'); });
        $$('.field__error').forEach(function (m) { m.textContent = ''; });
      }, 700);
    });
  }

  /* ---------- 15. Нагоре + година във футъра ---------- */
  var toTopBtn = $('#toTop');
  if (toTopBtn) {
    toTopBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }
  var year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

})();
