/* Property Maps · comportamiento compartido.
   Cada página de proyecto define window.PROYECTO (ver elquillay/ y miradornuble/). */
(function () {
  'use strict';

  var P = window.PROYECTO || null;
  var ES_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(location.hostname) || location.protocol === 'file:';

  var clp = function (n) { return '$' + Math.round(n).toLocaleString('es-CL'); };
  var m2 = function (n) { return n.toLocaleString('es-CL') + ' m²'; };
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  function waLink(numero, texto) {
    return 'https://wa.me/' + numero + '?text=' + encodeURIComponent(texto);
  }

  /* ---------- Medición: píxel de Meta y atribución ----------
     El snippet base del píxel vive en el <head> de cada página (window.MEDICION). Aquí solo se
     disparan eventos, siempre comprobando que fbq exista: con un bloqueador la web sigue igual.
     Misma estructura que Hacienda los Aromos (core.js): Lead con event_id compartido con n8n
     para que Meta no cuente dos veces, Contact en WhatsApp y eventos propios en los demás clics. */
  var CATEGORIA = P ? 'Parcelas ' + P.nombre : 'Property Maps';
  function track(evento, datos, opciones) {
    if (typeof fbq !== 'function') return;
    try { fbq('track', evento, datos || {}, opciones || undefined); } catch (e) { console.warn('Meta:', e); }
  }
  function trackCustom(evento, datos) {
    if (typeof fbq !== 'function') return;
    try { fbq('trackCustom', evento, datos || {}); } catch (e) { console.warn('Meta:', e); }
  }
  function cookie(nombre) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + nombre + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }
  function nuevoEventId() {
    return 'lead-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  /* La atribución (UTM, gclid, fbclid, cookies del píxel) se guarda al ENTRAR, no al enviar:
     quien llega por un anuncio a la portada y cotiza desde la página del proyecto llevaría
     la URL limpia. Se guarda la primera con valor y no se pisa; dura la sesión del navegador. */
  var CLAVE_ATRIB = 'pm_atribucion';
  function atribDeLaUrl() {
    var q = new URLSearchParams(location.search);
    var g = function (k) { return (q.get(k) || '').slice(0, 180); };
    var fbclid = g('fbclid');
    return {
      utm_source: g('utm_source'), utm_medium: g('utm_medium'), utm_campaign: g('utm_campaign'),
      utm_term: g('utm_term'), utm_content: g('utm_content'), gclid: g('gclid'), fbclid: fbclid,
      fbp: cookie('_fbp'),
      fbc: cookie('_fbc') || (fbclid ? 'fb.1.' + Date.now() + '.' + fbclid : ''),
      pagina: location.origin + location.pathname,
      referrer: document.referrer || ''
    };
  }
  function leerAtrib() { try { return JSON.parse(sessionStorage.getItem(CLAVE_ATRIB) || 'null'); } catch (e) { return null; } }
  function guardarAtrib(d) { try { sessionStorage.setItem(CLAVE_ATRIB, JSON.stringify(d)); } catch (e) { /* incógnito */ } }
  function hayIndicio(a) { return !!(a.utm_source || a.utm_campaign || a.gclid || a.fbclid); }
  function datosCampana() {
    var ahora = atribDeLaUrl();
    var guardada = leerAtrib();
    if (!hayIndicio(ahora) && guardada) {
      guardada.pagina = ahora.pagina;
      guardada.fbp = ahora.fbp || guardada.fbp || '';
      guardada.fbc = ahora.fbc || guardada.fbc || '';
      return guardada;
    }
    if (hayIndicio(ahora) && !guardada) guardarAtrib(ahora);
    return ahora;
  }
  (function () { var a = atribDeLaUrl(); if (hayIndicio(a) && !leerAtrib()) guardarAtrib(a); })();

  /* Clics medidos: un solo escuchador en captura, así cuenta también lo que se pinta después
     (la ficha de un lote, la confirmación del formulario). */
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('a, button');
    if (!el) return;
    var href = el.getAttribute('href') || '';
    if (/wa\.me|api\.whatsapp\.com/.test(href)) { track('Contact', { content_name: 'Clic WhatsApp', content_category: CATEGORIA }); return; }
    if (/^tel:/.test(href)) { trackCustom('ClicTelefono', { content_category: CATEGORIA }); return; }
    if (/^mailto:/.test(href)) { trackCustom('ClicEmail', { content_category: CATEGORIA }); return; }
    if (href === '#contacto' || el.hasAttribute('data-cotizar')) { trackCustom('ClicCotizar', { content_category: CATEGORIA }); return; }
    if (/elquillay360\.terraworks\.cl/.test(href)) { trackCustom('ClicTourVirtual', { content_category: CATEGORIA }); return; }
    if (!P && /^(elquillay|miradornuble)\/?$/.test(href)) {
      trackCustom('ClicProyecto', { content_name: /quillay/.test(href) ? 'El Quillay' : 'Mirador del Ñuble' });
    }
  }, true);

  /* ---------- Solo en local: la pestaña se recarga sola cuando cambia un archivo ---------- */
  if (ES_LOCAL) {
    var vigilados = [location.pathname]
      .concat($$('link[rel="stylesheet"][href], script[src]').map(function (el) { return el.href || el.src; }))
      .filter(function (u) { return u.indexOf('//') === -1 || u.indexOf(location.host) !== -1; });
    var firmas = [];
    var firmar = function (u) {
      return fetch(u, { method: 'HEAD', cache: 'no-store' })
        .then(function (r) { return (r.headers.get('Last-Modified') || '') + '|' + (r.headers.get('Content-Length') || ''); })
        .catch(function () { return null; });
    };
    var vigilar = function () {
      Promise.all(vigilados.map(firmar)).then(function (ahora) {
        var cambio = ahora.some(function (f, i) {
          if (f === null) return false;
          if (firmas[i] === undefined) { firmas[i] = f; return false; }
          return firmas[i] !== f;
        });
        if (cambio) location.reload(); else setTimeout(vigilar, 1500);
      });
    };
    vigilar();
  }

  /* ---------- Menú móvil ---------- */
  var toggle = $('.nav-toggle');
  var nav = $('#nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ---------- Hero de la landing: fotos de las parcelas ---------- */
  var hero = $('[data-hero]');
  if (hero) {
    var slides = $$('[data-slide]', hero);
    var dots = $$('.hero-dots button', hero);
    var link = $('[data-hero-link]', hero);  // solo en la portada
    var actual = 0;
    var timer = null;
    var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var mostrar = function (i) {
      actual = (i + slides.length) % slides.length;
      slides.forEach(function (s, j) { s.classList.toggle('is-active', j === actual); });
      dots.forEach(function (d, j) { d.setAttribute('aria-pressed', j === actual ? 'true' : 'false'); });
      var s = slides[actual];
      if (!link) return;
      link.setAttribute('href', s.getAttribute('data-href'));
      $('[data-hero-name]', link).textContent = s.getAttribute('data-name');
      $('[data-hero-place]', link).textContent = s.getAttribute('data-place');
    };
    var parar = function () { clearInterval(timer); timer = null; };
    var seguir = function () {
      if (quieto || timer) return;
      timer = setInterval(function () { mostrar(actual + 1); }, Number(hero.getAttribute('data-intervalo')) || 6000);
    };

    dots.forEach(function (d, j) {
      d.addEventListener('click', function () { mostrar(j); parar(); seguir(); });
    });
    hero.addEventListener('focusin', parar);
    hero.addEventListener('focusout', seguir);
    document.addEventListener('visibilitychange', function () { document.hidden ? parar() : seguir(); });
    seguir();
  }

  /* ---------- Animaciones de lectura ---------- */
  var raiz = document.documentElement;
  if (raiz.classList.contains('anim')) {
    raiz.classList.add('anim-ok');

    var animar = function (sel, tipo, extra) {
      $$(sel).forEach(function (el) {
        if (el.hasAttribute('data-a') || el.closest('.wa-panel')) return;
        el.setAttribute('data-a', tipo);
        if (extra) extra(el);
      });
    };
    var retraso = function (sel, d) { $$(sel).forEach(function (el) { el.style.setProperty('--d', d); }); };

    // Títulos: cada palabra sube desde una máscara
    animar('main h1, main h2', 'lines', function (h) {
      var palabras = h.textContent.trim().split(/\s+/);
      h.textContent = '';
      palabras.forEach(function (p, i) {
        var w = document.createElement('span');
        var s = document.createElement('span');
        w.className = 'w';
        s.textContent = p;
        s.style.setProperty('--i', i);
        w.appendChild(s);
        h.appendChild(w);
        if (i < palabras.length - 1) h.appendChild(document.createTextNode(' '));
      });
    });
    animar('.hero-pm .lead, .hero-project .place, .hero-project .lead, .intro-project .lead, .hero-actions, .hero-foot, ' +
      '.section-head p, .about-text > p, .tour p.lead, .tour .btn, .contact .lead, .chooser p.lead, ' +
      '.contact-mail, .chooser-mail, .lots-toolbar, .legend, .form-card, .lot-panel, .location .btn', 'rise');
    animar('.project-tile, .mosaic img, .gallery figure, .tour-preview, .location iframe', 'wipe');
    animar('.steps, .assurance-list, .features, .terms, .distances, .facts dl, .chooser-links, .contact-direct, .fields', 'stagger', function (el) {
      Array.prototype.forEach.call(el.children, function (c, i) { c.style.setProperty('--i', i); });
    });
    animar('.lot-groups', 'lots');
    $$('.steps').forEach(function (el) { el.style.setProperty('--gap', '180ms'); });

    // Entrada de la portada al cargar: título, bajada, botones y pie, en ese orden
    retraso('.hero-pm h1, .hero-project h1', '0.1s');
    retraso('.hero-pm .lead, .hero-project .lead, .intro-project .lead', '0.4s');
    retraso('.hero-pm .hero-actions, .hero-project .hero-actions, .intro-project .hero-actions', '0.55s');
    retraso('.hero-foot', '0.75s');

    // Las cifras cuentan hasta su valor cuando aparecen
    var contar = function (el) {
      if (el.children.length) return;
      var txt = el.textContent;
      var m = txt.match(/\d[\d.]*/);
      if (!m) return;
      var fin = parseInt(m[0].replace(/\./g, ''), 10);
      if (!(fin >= 10)) return;
      var antes = txt.slice(0, m.index);
      var despues = txt.slice(m.index + m[0].length);
      var t0 = null;
      var paso = function (t) {
        if (!t0) t0 = t;
        var k = Math.min(1, (t - t0) / 1300);
        el.textContent = antes + Math.round(fin * (1 - Math.pow(1 - k, 3))).toLocaleString('es-CL') + despues;
        if (k < 1) requestAnimationFrame(paso); else el.textContent = txt;
      };
      requestAnimationFrame(paso);
    };

    var vigia = new Map();
    var revelar = function (obs) {
      (vigia.get(obs) || []).forEach(function (el, n) {
        if (el.getAttribute('data-a') === 'lots') {
          $$('.lot', el).forEach(function (l, i) { l.style.setProperty('--i', Math.min(i, 70)); });
        }
        if (el.getAttribute('data-a') === 'wipe' && n) el.style.setProperty('--d', (n * 0.12) + 's');
        if (el.matches('.facts dl, .terms')) $$('dd, strong', el).forEach(contar);
        el.classList.add('is-in');
        // Terminada la entrada, el elemento vuelve a su estilo normal (hover, filtros, etc.)
        setTimeout(function () { el.removeAttribute('data-a'); el.classList.remove('is-in'); }, 2800);
      });
    };
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        revelar(en.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0 });
    $$('[data-a]').forEach(function (el) {
      var obs = el.getAttribute('data-a') === 'wipe' ? el.parentElement : el;
      if (!vigia.has(obs)) {
        vigia.set(obs, []);
        // Lo del banner entra al cargar, aunque quede pegado al borde inferior de la pantalla
        if (!el.closest('.hero-pm, .hero-project, .intro-project')) io.observe(obs);
      }
      vigia.get(obs).push(el);
    });
    vigia.forEach(function (lista, obs) {
      if (lista[0].closest('.hero-pm, .hero-project, .intro-project')) requestAnimationFrame(function () { revelar(obs); });
    });
  }

  /* ---------- WhatsApp: landing (elige proyecto) ---------- */
  var waBtn = $('#wa-float');
  var waPanel = $('#wa-panel');
  if (waBtn && waPanel) {
    waBtn.addEventListener('click', function () {
      var open = waPanel.classList.toggle('open');
      waBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) { var first = $('a', waPanel); if (first) first.focus(); }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && waPanel.classList.contains('open')) {
        waPanel.classList.remove('open');
        waBtn.setAttribute('aria-expanded', 'false');
        waBtn.focus();
      }
    });
    document.addEventListener('click', function (e) {
      if (!waPanel.contains(e.target) && !waBtn.contains(e.target)) {
        waPanel.classList.remove('open');
        waBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- WhatsApp: proyecto ---------- */
  if (P) {
    $$('[data-wa]').forEach(function (a) {
      a.href = waLink(P.whatsapp, a.getAttribute('data-wa') || P.waMensaje);
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  /* ---------- Galería ---------- */
  $$('[data-gallery]').forEach(function (wrap) {
    var track = $('.gallery', wrap);
    $$('[data-dir]', wrap).forEach(function (b) {
      b.addEventListener('click', function () {
        var dir = Number(b.getAttribute('data-dir'));
        track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
      });
    });
  });

  if (!P) return;

  /* ---------- Plano de lotes ---------- */
  var lotsRoot = $('#lot-groups');
  var panel = $('#lot-panel');
  var filtro = 'todos';
  var seleccionado = null;

  function claseLote(l) {
    if (l.estado === 'Vendido') return 'is-sold';
    if (l.estado !== 'Disponible') return 'is-na';
    if (l.rio) return 'is-river';
    if (l.grande) return 'is-big';
    return '';
  }

  function pintarLotes() {
    if (!lotsRoot) return;
    lotsRoot.innerHTML = '';
    P.lotes.grupos.forEach(function (g) {
      var sec = document.createElement('div');
      sec.className = 'lot-group';
      if (g.titulo) {
        var h = document.createElement('h3');
        h.textContent = g.titulo;
        sec.appendChild(h);
      }
      var grid = document.createElement('div');
      grid.className = 'lot-grid';
      grid.setAttribute('role', 'group');
      grid.setAttribute('aria-label', g.titulo || 'Lotes');
      g.items.forEach(function (l) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'lot ' + claseLote(l);
        b.dataset.id = l.id;
        var libre = l.estado === 'Disponible';
        b.setAttribute('aria-pressed', seleccionado === l.id ? 'true' : 'false');
        b.setAttribute('aria-label', l.nombre + ', ' + m2(l.m2) + ', ' + l.estado.toLowerCase());
        b.innerHTML = '<b>' + l.num + '</b><small>' + m2(Math.round(l.m2)) + '</small>';
        b.hidden = (filtro === 'disponibles' && !libre) || (filtro === 'rio' && !l.rio);
        b.addEventListener('click', function () {
          if (!libre) { mostrarPanel(l); return; }
          seleccionado = l.id;
          $$('.lot', lotsRoot).forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.id === l.id ? 'true' : 'false'); });
          mostrarPanel(l);
        });
        grid.appendChild(b);
      });
      sec.appendChild(grid);
      var visibles = g.items.some(function (l) {
        return !((filtro === 'disponibles' && l.estado !== 'Disponible') || (filtro === 'rio' && !l.rio));
      });
      sec.hidden = !visibles;
      lotsRoot.appendChild(sec);
    });
    llenarSelect();
  }

  function mostrarPanel(l) {
    if (!panel) return;
    var libre = l.estado === 'Disponible';
    var filas = [
      ['Superficie', m2(l.m2)],
      ['Estado', l.estado]
    ];
    if (l.etapa) filas.splice(1, 0, ['Etapa', l.etapa]);
    if (l.rio) filas.push(['Ubicación', 'Vista al río']);
    if (libre) filas.push(['Precio', l.precio ? clp(l.precio) : 'Consultar']);
    var html = '<h3>' + l.nombre + '</h3><dl>' + filas.map(function (f) {
      return '<div><dt>' + f[0] + '</dt><dd>' + f[1] + '</dd></div>';
    }).join('') + '</dl>';
    if (libre) {
      html += '<a class="btn btn-primary btn-block" href="#contacto" data-cotizar="' + l.id + '">Cotizar este lote</a>' +
        '<a class="btn btn-outline btn-block" target="_blank" rel="noopener" href="' +
        waLink(P.whatsapp, 'Hola, me interesa el ' + l.nombre + ' (' + m2(l.m2) + ') de ' + P.nombre + '. ¿Me pueden dar más información?') +
        '">Preguntar por WhatsApp</a>';
    } else {
      html += '<p class="muted" style="margin:0">Este lote ya no está disponible. Elige uno de los lotes con borde para ver su información.</p>';
    }
    if (P.lotes.nota) html += '<p class="price-note">' + P.lotes.nota + '</p>';
    var destino = ES_MOVIL.matches ? abrirHoja() : panel;
    destino.innerHTML = html;
    var c = $('[data-cotizar]', destino);
    if (c) c.addEventListener('click', function () {
      var sel = $('#f-parcela');
      if (sel) sel.value = l.id;
      cerrarHoja();
    });
  }

  /* En el teléfono la ficha del lote sube desde abajo, sobre el plano */
  var ES_MOVIL = window.matchMedia('(max-width: 980px)');
  var hoja = null;
  var fondo = null;
  var antesDeHoja = null;

  function abrirHoja() {
    if (!hoja) {
      fondo = document.createElement('div');
      fondo.className = 'sheet-backdrop';
      hoja = document.createElement('div');
      hoja.className = 'lot-sheet';
      hoja.setAttribute('role', 'dialog');
      hoja.setAttribute('aria-modal', 'true');
      hoja.setAttribute('aria-label', 'Información del lote');
      hoja.innerHTML = '<button type="button" class="sheet-close" aria-label="Cerrar">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button><div class="lot-panel sheet-body"></div>';
      document.body.appendChild(fondo);
      document.body.appendChild(hoja);
      fondo.addEventListener('click', cerrarHoja);
      $('.sheet-close', hoja).addEventListener('click', cerrarHoja);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && hoja.classList.contains('open')) cerrarHoja();
      });
    }
    antesDeHoja = document.activeElement;
    hoja.classList.add('open');
    fondo.classList.add('open');
    setTimeout(function () { $('.sheet-close', hoja).focus({ preventScroll: true }); }, 50);
    return $('.sheet-body', hoja);
  }

  function cerrarHoja() {
    if (!hoja || !hoja.classList.contains('open')) return;
    hoja.classList.remove('open');
    fondo.classList.remove('open');
    if (antesDeHoja && antesDeHoja.focus) antesDeHoja.focus({ preventScroll: true });
  }

  $$('.filter button').forEach(function (b) {
    b.addEventListener('click', function () {
      filtro = b.getAttribute('data-filtro');
      $$('.filter button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      pintarLotes();
    });
  });

  function llenarSelect() {
    var sel = $('#f-parcela');
    if (!sel) return;
    var actual = sel.value;
    sel.innerHTML = '<option value="">Aún no lo sé, quiero asesoría</option>';
    P.lotes.grupos.forEach(function (g) {
      var og = document.createElement('optgroup');
      og.label = g.titulo || 'Lotes disponibles';
      g.items.filter(function (l) { return l.estado === 'Disponible'; }).forEach(function (l) {
        var o = document.createElement('option');
        o.value = l.id;
        o.textContent = l.nombre + ' · ' + m2(l.m2) + (l.precio ? ' · ' + clp(l.precio) : '');
        og.appendChild(o);
      });
      if (og.children.length) sel.appendChild(og);
    });
    sel.value = actual;
  }

  function contarDisponibles() {
    var n = 0;
    P.lotes.grupos.forEach(function (g) { g.items.forEach(function (l) { if (l.estado === 'Disponible') n++; }); });
    $$('[data-disponibles]').forEach(function (el) { el.textContent = n; });
  }

  pintarLotes();
  contarDisponibles();

  /* Disponibilidad en vivo (El Quillay: misma fuente que el tour 360°) */
  if (P.lotes.vivo) {
    fetch(P.lotes.vivo.url, { headers: { 'X-API-Key': P.lotes.vivo.clave } })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (lista) {
        if (!Array.isArray(lista) || !lista.length) return;
        var porNum = {};
        lista.forEach(function (x) { porNum[String(x.numeroParcela)] = x; });
        P.lotes.grupos.forEach(function (g) {
          g.items.forEach(function (l) {
            var x = porNum[String(l.num)];
            if (!x) return;
            l.estado = x.status || x.estado || l.estado;
            if (x.superficieM2) l.m2 = x.superficieM2;
            if (x.price) l.precio = x.price;
          });
        });
        pintarLotes();
        contarDisponibles();
        var u = $('#lots-updated');
        if (u) u.textContent = 'Disponibilidad en línea';
      })
      .catch(function (e) { console.info('[Property Maps] Se muestra la disponibilidad guardada:', e.message); });
  }

  /* ---------- Formulario ---------- */
  var form = $('#lead-form');
  if (!form) return;

  /* La atribución (UTM, gclid, fbclid, cookies del píxel) la entrega datosCampana(), más arriba. */

  function marcar(campo, mal) {
    var f = campo.closest('.field');
    if (f) f.classList.toggle('has-error', mal);
    campo.setAttribute('aria-invalid', mal ? 'true' : 'false');
  }

  function validar() {
    var ok = true;
    var nombre = form.nombre, tel = form.telefono, email = form.email;
    var telLimpio = tel.value.replace(/\D/g, '').replace(/^56/, '');
    var nOk = nombre.value.trim().length >= 2;
    var tOk = /^9\d{8}$/.test(telLimpio);
    var eOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    var aOk = !form.acepto || form.acepto.checked;
    marcar(nombre, !nOk); marcar(tel, !tOk); marcar(email, !eOk);
    if (form.acepto) marcar(form.acepto, !aOk);
    ok = nOk && tOk && eOk && aOk;
    if (!ok) {
      var primero = form.querySelector('[aria-invalid="true"]');
      if (primero) primero.focus();
    }
    return ok ? '+56' + telLimpio : null;
  }

  ['nombre', 'telefono', 'email'].forEach(function (n) {
    form[n].addEventListener('input', function () {
      if (form[n].getAttribute('aria-invalid') === 'true') marcar(form[n], false);
    });
  });
  if (form.acepto) {
    form.acepto.addEventListener('change', function () {
      if (form.acepto.checked) marcar(form.acepto, false);
    });
  }

  function loteElegido() {
    var id = form.parcela.value;
    var res = null;
    P.lotes.grupos.forEach(function (g) { g.items.forEach(function (l) { if (l.id === id) res = l; }); });
    return res;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var telefono = validar();
    if (!telefono) return;

    var partes = form.nombre.value.trim().split(/\s+/);
    var lote = loteElegido();
    var plazo = form.plazo.value;
    var mensaje = form.mensaje.value.trim();
    var eventId = nuevoEventId();
    var nota = [
      'Proyecto: ' + P.nombre,
      lote ? 'Parcela de interés: ' + lote.nombre + ' (' + m2(lote.m2) + ')' : 'Parcela de interés: sin definir',
      plazo ? 'Plazo de compra: ' + plazo : '',
      mensaje ? 'Mensaje: ' + mensaje : ''
    ].filter(Boolean).join('\n');

    var datos = {
      origen: P.form.origen,
      proyecto: P.nombre,
      nombre: partes.shift(),
      apellido: partes.join(' '),
      telefono: telefono,
      email: form.email.value.trim(),
      parcela: lote ? lote.nombre : '',
      plazo_de_compra: plazo,
      mensaje: nota,
      pagina: location.origin + location.pathname,
      acepta_politicas: 'Sí',
      event_id: eventId,
      creacion: new Date().toISOString(),
      _hp: form._hp.value
    };
    var campana = datosCampana();
    Object.keys(campana).forEach(function (k) { if (campana[k] && !datos[k]) datos[k] = campana[k]; });

    /* Mismo event_id que recibe n8n: Meta junta el Lead del navegador con el de la API de conversiones */
    track('Lead', { content_name: 'Solicitud de cotización', content_category: CATEGORIA }, { eventID: eventId });

    var boton = form.querySelector('button[type="submit"]');
    var estado = $('#form-status');
    var textoWa = 'Hola, soy ' + form.nombre.value.trim() + '. ' + nota.replace(/\n/g, '. ') + '. Mi teléfono es ' + telefono + ' y mi correo ' + datos.email + '.';

    /* Sin webhook propio: el formulario se completa por WhatsApp */
    if (!P.form.endpoint) {
      window.open(waLink(P.whatsapp, textoWa), '_blank', 'noopener');
      terminar('Te abrimos WhatsApp con tus datos', 'Envía el mensaje que preparamos y un asesor de ' + P.nombre + ' te responde por ahí.');
      return;
    }

    if (ES_LOCAL) {
      console.info('[Property Maps] Modo local: este lead NO se envió a HighLevel. ' + JSON.stringify(datos));
      terminar('Recibimos tus datos', 'Un asesor de ' + P.nombre + ' te contactará por WhatsApp o teléfono.', true);
      return;
    }

    boton.disabled = true;
    boton.textContent = 'Enviando…';
    fetch(P.form.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-lead-token': P.form.token },
      body: JSON.stringify(datos)
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        if (window.fbq) window.fbq('track', 'Lead');
        terminar('Recibimos tus datos', 'Un asesor de ' + P.nombre + ' te contactará por WhatsApp o teléfono.');
      })
      .catch(function () {
        boton.disabled = false;
        boton.textContent = 'Enviar solicitud';
        estado.className = 'form-status fail';
        /* Que el lead no se pierda: el mismo mensaje armado, listo para mandarlo por WhatsApp */
        estado.innerHTML = 'No pudimos enviar el formulario. <a href="' + waLink(P.whatsapp, textoWa) + '" target="_blank" rel="noopener">Envíanos tus datos por WhatsApp</a> o inténtalo de nuevo.';
      });
  });

  function terminar(titulo, texto, local) {
    var card = form.closest('.form-card');
    card.innerHTML =
      '<div class="form-done" role="status">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m8 12.5 2.7 2.7L16 9.8"/></svg>' +
      '<h3>' + titulo + '</h3><p>' + texto + '</p>' +
      '<a class="btn btn-wa" target="_blank" rel="noopener" href="' + waLink(P.whatsapp, P.waMensaje) + '">Escribir ahora por WhatsApp</a>' +
      (local ? '<p class="dev-note">Modo local: el formulario no envía a HighLevel desde este computador. Los datos quedaron en la consola del navegador.</p>' : '') +
      '</div>';
    card.querySelector('h3').setAttribute('tabindex', '-1');
    card.querySelector('h3').focus();
  }
})();
