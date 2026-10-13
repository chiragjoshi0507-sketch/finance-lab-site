/* Finance Lab by SSEI — one page, five scenes.
   A fixed set of blocks is re-arranged into each scene's layout as the user scrolls
   (wheel, swipe, keys, nav). Content lives in data/content.json and data/quiz.json. */
(async function () {
  'use strict';

  const stage = document.getElementById('stage');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SCENES = [
    { slug: 'daily-brief' }, { slug: 'watch-the-money' }, { slug: 'under-the-lens' },
    { slug: 'quick-takes' }, { slug: 'about' }
  ];
  const S = SCENES.length;   // scenes
  const N = 8;               // blocks (marquee scenes use all of them)
  const MARQUEE = { 1: true, 3: true };
  const BG = [23, 27, 39], PANEL = [35, 43, 63], BROWN = [74, 56, 34];

  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = t => t * t * (3 - 2 * t);
  const easeIO = t => 0.5 - 0.5 * Math.cos(Math.PI * t);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = u => /^(https?:|mailto:)/i.test(u || '') ? esc(u) : '#';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };

  async function getJSON(url) {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw new Error(url + ' ' + r.status);
    return r.json();
  }
  let content, quizBank;
  try {
    [content, quizBank] = await Promise.all([getJSON('data/content.json'), getJSON('data/quiz.json')]);
  } catch (e) {
    document.getElementById('loading').innerHTML = 'Could not load the site data.<br>Open this page through a web server, not as a file.';
    console.error(e);
    return;
  }
  document.getElementById('loading').remove();
  const L = content.links;

  /* ---------- icons ---------- */
  const ICON = {
    instagram: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r=".9" fill="currentColor" stroke="none"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.2v5.6l4.8-2.8z"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 20.5l1.4-4.3A8.5 8.5 0 1 1 8 19.3z"/><path d="M9.2 8.6c0 3.1 2.6 5.8 5.8 5.8l.9-1.4-1.9-1-.9.7c-.9-.4-1.8-1.3-2.2-2.2l.7-.9-1-1.9z"/></svg>',
    substack: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 4h15M4.5 8.5h15M4.5 13v7.5L12 16.5l7.5 4V13z"/></svg>'
  };

  /* ---------- quiz selection (IST day) ---------- */
  function istKey() {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return p; // YYYY-MM-DD
  }
  function pickQuiz() {
    const key = istKey();
    const qs = quizBank.questions;
    const dated = qs.find(q => q.date === key);
    if (dated) return { q: dated, id: key };
    const pool = qs.filter(q => !q.date);
    const doy = Math.floor((Date.parse(key) - Date.parse(key.slice(0, 4) + '-01-01')) / 864e5);
    return { q: pool[doy % pool.length], id: key };
  }
  const quiz = pickQuiz();

  /* ---------- face templates ---------- */
  const thumb = (cls, text, img) =>
    '<div class="thumb ' + cls + '">' + (img ? '<img src="' + esc(img) + '" alt="" loading="lazy">' : '') + (img ? '' : '<b>' + esc(text) + '</b>') + '</div>';
  const ytThumb = v => v.image || (v.youtubeId ? 'https://i.ytimg.com/vi/' + encodeURIComponent(v.youtubeId) + '/hqdefault.jpg' : '');

  function faceHTML(s, k) {
    const C = content;
    if (s === 0 && k === 0) {
      const b = C.brief;
      return '<a class="brief face-in" href="' + safeUrl(b.url) + '" target="_blank" rel="noopener" style="display:flex;flex-direction:column">' +
        thumb('', b.thumbText || '', b.image) +
        '<div class="eyebrow">' + esc(b.eyebrow) + '</div><h1>' + esc(b.title) + '</h1>' +
        '<p class="sum">' + esc(b.summary) + '</p><span class="link">' + esc(b.cta) + '</span></a>';
    }
    if (s === 0 && k === 1) {
      const q = quiz.q;
      return '<div class="quiz" style="display:flex;flex-direction:column;height:100%"><div class="eyebrow">FinQuest · Daily quiz</div>' +
        '<h2>' + esc(q.q) + '</h2><div class="opts">' +
        q.options.map((o, i) => '<button type="button" class="opt" data-i="' + i + '">' + esc(o) + '</button>').join('') +
        '</div><div class="verdict" aria-live="polite"></div>' +
        '<a class="link" href="' + safeUrl(L.quizWhatsapp) + '" target="_blank" rel="noopener">Daily quizzes on WhatsApp →</a></div>';
    }
    if (s === 1) {
      const v = C.videos[k % C.videos.length];
      return '<a class="card" href="' + safeUrl(v.url) + '" target="_blank" rel="noopener">' +
        thumb('vthumb', v.thumbText || v.title, ytThumb(v)) +
        '<div class="tag">' + esc(v.tag) + '</div><h3>' + esc(v.title) + '</h3><p>' + esc(v.blurb) + '</p></a>';
    }
    if (s === 2 && k === 0) {
      const f = C.research.featured;
      return '<a class="feat' + (f.image ? ' has-img' : '') + '" href="' + safeUrl(f.url) + '" target="_blank" rel="noopener">' +
        (f.image ? '<div class="fphoto"><img src="' + esc(f.image) + '" alt="" loading="lazy"></div>' : '') +
        '<div class="ftext"><div class="eyebrow">' + esc(f.tag) + '</div>' +
        (f.image ? '' : '<div class="wordmark">' + esc(f.wordmark || '') + '</div><hr>') +
        '<h3>' + esc(f.title) + '</h3><p>' + esc(f.blurb) + '</p>' +
        '<span class="link">' + esc(f.cta) + '</span></div></a>';
    }
    if (s === 2 && (k === 1 || k === 2)) {
      const it = C.research.items[k - 1];
      if (!it) return '';
      return '<a class="item" href="' + safeUrl(it.url) + '" target="_blank" rel="noopener" style="display:flex;flex-direction:column">' +
        '<div class="tag">' + esc(it.tag) + '</div><h3>' + esc(it.title) + '</h3><p>' + esc(it.blurb) + '</p>' +
        '<span class="link">' + esc(it.cta) + '</span></a>';
    }
    if (s === 3) {
      const p = C.posts[k % C.posts.length];
      return '<a class="card" href="' + safeUrl(p.url) + '" target="_blank" rel="noopener">' +
        '<div class="thumb pthumb" style="margin:18px 0">' + (p.image ? '<img src="' + esc(p.image) + '" alt="" loading="lazy">' : '<b>' + esc(p.thumbText || p.type) + '</b>') +
        '<span class="badge">' + esc(p.type) + '</span></div>' +
        '<h3>' + esc(p.title) + '</h3><p>' + esc(p.blurb) + '</p></a>';
    }
    if (s === 4 && k === 0) {
      const a = C.about;
      return '<div class="about" style="display:flex;flex-direction:column"><div class="eyebrow">' + esc(a.eyebrow) + '</div><h2>' + esc(a.title) + '</h2>' +
        a.body.map(t => '<p>' + esc(t) + '</p>').join('') +
        '<div class="foot">© ' + new Date().getFullYear() + ' Finance Lab by SSEI · Sanjay Saraf Educational Institute</div></div>';
    }
    if (s === 4 && k >= 1 && k <= 4) {
      const socials = [
        ['instagram', 'Instagram', L.instagramHandle || '', L.instagram],
        ['whatsapp', 'WhatsApp', 'Community channel', L.whatsapp],
        ['substack', 'Substack', 'Daily Brief & research', L.substack],
        ['youtube', 'YouTube', 'Watch the Money', L.youtube]
      ][k - 1];
      return '<a class="soc" href="' + safeUrl(socials[3]) + '" target="_blank" rel="noopener" style="display:flex;flex-direction:column">' +
        ICON[socials[0]] + '<span class="ar">↗</span><div><div class="nm">' + socials[1] + '</div><div class="hd">' + esc(socials[2]) + '</div></div></a>';
    }
    return '';
  }

  /* ---------- build blocks ---------- */
  const blocks = [];
  for (let k = 0; k < N; k++) {
    const el = document.createElement('div');
    el.className = 'block';
    const faces = [];
    for (let s = 0; s < S; s++) {
      const html = faceHTML(s, k);
      if (!html) continue;
      const f = document.createElement('div');
      f.className = 'face';
      f.innerHTML = html;
      f.inert = true;
      f.style.opacity = 0;
      el.appendChild(f);
      faces[s] = f;
    }
    stage.appendChild(el);
    blocks.push({ el, faces, k });
  }

  /* ---------- scene text layers ---------- */
  const texts = [];
  function addText(s, cls, html) {
    const el = document.createElement('div');
    el.className = 'scene-text ' + (cls || '');
    el.innerHTML = html;
    el.style.opacity = 0;
    stage.appendChild(el);
    texts[s] = el;
  }
  addText(1, '', '<div><div class="eyebrow">Watch the Money · YouTube</div><h2>Watch the Money</h2><p>Real businesses, real numbers — explained on video.</p></div>' +
    '<a class="more" href="' + safeUrl(L.youtube) + '" target="_blank" rel="noopener">Visit our YouTube channel →</a>');
  addText(2, '', '<div><div class="eyebrow">Under the Lens</div><h2>Deep dive research · Substack</h2><p>Big questions. A closer look at the evidence.</p></div>' +
    '<a class="more" href="' + safeUrl(L.substack) + '" target="_blank" rel="noopener">Explore all research →</a>');
  addText(3, '', '<div><div class="eyebrow">Quick Takes</div><h2>Carousels &amp; reels</h2><p>Bite-sized finance from our Instagram and WhatsApp.</p></div>' +
    '<a class="more" href="' + safeUrl(L.instagram) + '" target="_blank" rel="noopener">Follow on Instagram →</a>');
  addText(4, 't-email', '<div><div class="eyebrow">Write to us</div><a class="mail" href="mailto:' + esc(L.email) + '">' + esc(L.email) + '</a>' +
    '</div>' +
    '<a class="btn" href="mailto:' + esc(L.email) + '">Email us</a>');

  /* ---------- metrics + layouts ---------- */
  let W = 0, H = 0, mobile = false, ox = 0, oy = 0, cw = 0, ch = 0, G = 24, HEAD = 116;
  const mOff = { 1: 0, 3: 0 };
  let pitch = { 1: 300, 3: 260 }, cardSize = { 1: [280, 300], 3: [240, 400] };

  function metrics() {
    W = stage.clientWidth; H = stage.clientHeight;
    mobile = W < 820;
    const pad = mobile ? 16 : Math.max(24, (W - 1240) / 2);
    ox = pad; cw = W - 2 * pad;
    G = mobile ? 14 : 24;
    oy = mobile ? 14 : 18;
    ch = H - oy - (mobile ? 58 : 60);       // room for the round next-arrow
    HEAD = mobile ? 96 : 118;

    const avail = ch - HEAD;                 // height under the section heading
    const vx = mobile ? 172 : 204, px = mobile ? 150 : 178;
    // with few items, widen cards so the same one never shows twice at once
    const noDup = n => (W + 2) / Math.max(1, n) - G;
    const vw = Math.max(200, Math.min(Math.max(mobile ? cw * 0.78 : (cw - 2 * G) / 3.05, noDup(content.videos.length)), (avail - vx) / 0.5625));
    cardSize[1] = [vw, vw * 9 / 16 + vx];
    pitch[1] = vw + G;
    const pw = Math.max(150, Math.min(Math.max(mobile ? cw * 0.52 : (cw - 3 * G) / 4.15, noDup(content.posts.length)), (avail - px) * 0.75));
    cardSize[3] = [pw, pw * 4 / 3 + px];
    pitch[3] = pw + G;

    // heading layers
    [1, 2, 3].forEach(s => { const t = texts[s]; t.style.left = ox + 'px'; t.style.top = oy + 'px'; t.style.width = cw + 'px'; t.style.height = HEAD - 10 + 'px'; });
    const eh = mobile ? 66 : 80, aH = areaH4();
    const t4 = texts[4];
    t4.style.left = ox + 'px'; t4.style.width = cw + 'px'; t4.style.height = eh + 'px'; t4.style.top = oy + aH + G + 'px';
  }
  const areaH4 = () => Math.min(ch - (mobile ? 66 : 80) - G, 560);

  const hidden = () => ({ x: ox + cw / 2 - 30, y: oy + ch / 2 - 30, w: 60, h: 60, o: 0, c: BG });

  function marqueeRects(s) {
    const [w, h] = cardSize[s], p = pitch[s], total = N * p;
    const lo = -(p + ox + 6);
    const y = oy + HEAD + Math.max(0, (ch - HEAD - h) * 0.4);
    const out = [];
    for (let k = 0; k < N; k++) {
      const x = lo + (((k * p - mOff[s] - lo) % total) + total) % total;
      out.push({ x, y, w, h, o: 1, c: BG });
    }
    return out;
  }

  function layout(s) {
    const R = [];
    if (s === 0) {
      const h = Math.min(ch, mobile ? ch : 640), y = oy + (ch - h) * 0.25;
      if (mobile) {
        const ah = Math.round(h * 0.5);
        R[0] = { x: ox, y, w: cw, h: ah, o: 1, c: PANEL };
        R[1] = { x: ox, y: y + ah + G, w: cw, h: h - ah - G, o: 1, c: BROWN };
      } else {
        const aw = Math.round((cw - G) * 0.62);
        R[0] = { x: ox, y, w: aw, h, o: 1, c: PANEL };
        R[1] = { x: ox + aw + G, y, w: cw - aw - G, h, o: 1, c: BROWN };
      }
    } else if (s === 1 || s === 3) {
      return marqueeRects(s);
    } else if (s === 2) {
      const y0 = oy + HEAD, aH = Math.min(ch - HEAD, mobile ? ch : 560);
      if (!content.research.items.length) {
        R[0] = { x: ox, y: y0, w: cw, h: aH, o: 1, c: PANEL };
      } else if (mobile) {
        const fh = Math.round(aH * 0.4), ih = (aH - fh - 2 * G) / 2;
        R[0] = { x: ox, y: y0, w: cw, h: fh, o: 1, c: PANEL };
        R[1] = { x: ox, y: y0 + fh + G, w: cw, h: ih, o: 1, c: BG };
        R[2] = { x: ox, y: y0 + fh + G + ih + G, w: cw, h: ih, o: 1, c: BG };
      } else {
        const fw = Math.round((cw - G) * 0.54), rw = cw - fw - G, ih = (aH - G) / 2;
        R[0] = { x: ox, y: y0, w: fw, h: aH, o: 1, c: PANEL };
        R[1] = { x: ox + fw + G, y: y0, w: rw, h: ih, o: 1, c: BG };
        R[2] = { x: ox + fw + G, y: y0 + ih + G, w: rw, h: ih, o: 1, c: BG };
      }
    } else if (s === 4) {
      const aH = areaH4(), y0 = oy;
      if (mobile) {
        const ah = Math.round(aH * 0.45), th = (aH - ah - 2 * G) / 2, tw = (cw - G) / 2;
        R[0] = { x: ox, y: y0, w: cw, h: ah, o: 1, c: PANEL };
        for (let i = 0; i < 4; i++) R[1 + i] = { x: ox + (i % 2) * (tw + G), y: y0 + ah + G + Math.floor(i / 2) * (th + G), w: tw, h: th, o: 1, c: PANEL };
      } else {
        const aw = Math.round((cw - G) * 0.5), tw = (cw - aw - 2 * G) / 2, th = (aH - G) / 2;
        R[0] = { x: ox, y: y0, w: aw, h: aH, o: 1, c: PANEL };
        for (let i = 0; i < 4; i++) R[1 + i] = { x: ox + aw + G + (i % 2) * (tw + G), y: y0 + Math.floor(i / 2) * (th + G), w: tw, h: th, o: 1, c: PANEL };
      }
    }
    for (let k = 0; k < N; k++) if (!R[k]) R[k] = hidden();
    return R;
  }

  /* ---------- render ---------- */
  let pos = 0, tgt = 0, anim = null;
  const STAG = 0.032;

  function render() {
    const i = Math.min(Math.floor(pos + 1e-6), S - 2), f = clamp(pos - i);
    const A = layout(i), B = layout(i + 1);
    const span = 1 - (N - 1) * STAG;
    for (let k = 0; k < N; k++) {
      const b = blocks[k], a = A[k], z = B[k];
      const fk = smooth(clamp((f - k * STAG) / span));
      const x = lerp(a.x, z.x, fk), y = Math.round(lerp(a.y, z.y, fk)), w = Math.round(lerp(a.w, z.w, fk)), h = Math.round(lerp(a.h, z.h, fk)), o = lerp(a.o, z.o, fk);
      const st = b.el.style;
      st.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y + 'px,0)';
      st.width = w + 'px'; st.height = h + 'px';
      st.opacity = o.toFixed(3);
      const rgb = [0, 1, 2].map(n => Math.round(lerp(a.c[n], z.c[n], fk)));
      st.background = (rgb[0] === BG[0] && rgb[1] === BG[1] && rgb[2] === BG[2]) ? 'transparent' : 'rgb(' + rgb.join(',') + ')';
      st.visibility = o < 0.01 ? 'hidden' : 'visible';
      const pk = i + fk;
      for (let s = 0; s < S; s++) {
        const fc = b.faces[s]; if (!fc) continue;
        const wgt = clamp((0.3 - Math.abs(pk - s)) / 0.2);
        fc.style.opacity = wgt.toFixed(3);
        const vis = wgt > 0.001;
        if (fc.hidden === vis) fc.hidden = !vis;
        const on = wgt > 0.9;
        if (fc.inert === on) fc.inert = !on;
      }
    }
    for (let s = 1; s < S; s++) {
      const t = texts[s]; if (!t) continue;
      const d = pos - s, wgt = clamp((0.5 - Math.abs(d)) / 0.25);
      t.style.opacity = wgt.toFixed(3);
      t.style.transform = 'translateY(' + (-d * 36).toFixed(1) + 'px)';
      t.style.visibility = wgt > 0.001 ? 'visible' : 'hidden';
      t.classList.toggle('on', wgt > 0.9);
    }
  }

  /* ---------- animation loop ---------- */
  let raf = 0, lastT = 0, hovering = false;
  function frame(t) {
    raf = 0;
    const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016);
    lastT = t;
    if (anim) {
      const p = clamp((t - anim.t0) / anim.dur);
      pos = anim.from + (anim.to - anim.from) * easeIO(p);
      if (p >= 1) { pos = anim.to; anim = null; }
    }
    const running = !anim && MARQUEE[tgt] && !reduce;
    if (running && !hovering && !document.hidden) mOff[tgt] += (tgt === 1 ? 38 : 34) * dt;
    render();
    if (anim || running) raf = requestAnimationFrame(frame);
    else lastT = 0;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };

  /* ---------- navigation ---------- */
  const navBtns = [...document.querySelectorAll('.nav [data-nav]')];
  const dotsEl = document.querySelector('.dots');
  const nextBtn = document.getElementById('next');
  const dotBtns = SCENES.map((sc, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('aria-label', 'Go to section ' + (i + 1));
    b.addEventListener('click', () => go(i));
    dotsEl.appendChild(b); return b;
  });

  function setActive() {
    navBtns.forEach(b => b.classList.toggle('on', +b.dataset.nav === tgt));
    dotBtns.forEach((b, i) => b.classList.toggle('on', i === tgt));
    const on = navBtns.find(b => +b.dataset.nav === tgt);
    if (on && mobile && on.scrollIntoView) on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    nextBtn.classList.toggle('up', tgt === S - 1);
    nextBtn.setAttribute('aria-label', tgt === S - 1 ? 'Back to the top' : 'Next section');
  }

  function go(n, opts) {
    n = clamp(n, 0, S - 1);
    if (n === tgt && !anim && Math.abs(pos - n) < 1e-4) { if (opts && opts.focus) focusQuiz(); return; }
    tgt = n;
    const dist = Math.abs(n - pos);
    anim = { from: pos, to: n, t0: performance.now(), dur: reduce ? 180 : Math.min(1500, 820 + dist * 200) };
    try { history.replaceState(null, '', '#' + SCENES[n].slug); } catch (e) { /* file:// */ }
    setActive(); kick();
    if (opts && opts.focus) setTimeout(focusQuiz, anim.dur);
  }
  function focusQuiz() {
    const q = blocks[1].el; q.classList.remove('pulse'); void q.offsetWidth; q.classList.add('pulse');
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-go]'); if (!el) return;
    e.preventDefault();
    go(+el.dataset.go, { focus: el.dataset.focus === 'quiz' });
  });
  nextBtn.addEventListener('click', () => go(tgt === S - 1 ? 0 : tgt + 1));

  let lastWheel = 0;
  window.addEventListener('wheel', e => {
    e.preventDefault();
    const now = performance.now(), quiet = now - lastWheel > 140;
    lastWheel = now;
    if (anim || !quiet || Math.abs(e.deltaY) < 3) return;
    go(tgt + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  let ty = 0, tx = 0, tT = 0;
  stage.addEventListener('touchstart', e => { ty = e.touches[0].clientY; tx = e.touches[0].clientX; tT = performance.now(); }, { passive: true });
  stage.addEventListener('touchend', e => {
    const c = e.changedTouches[0], dy = ty - c.clientY, dx = tx - c.clientX;
    if (anim || Math.abs(dy) < 45 || Math.abs(dy) < Math.abs(dx) * 1.2) return;
    go(tgt + (dy > 0 ? 1 : -1));
  }, { passive: true });

  window.addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const onBody = document.activeElement === document.body || document.activeElement === stage;
    const k = e.key;
    if (k === 'ArrowDown' || k === 'PageDown' || (k === ' ' && onBody)) { e.preventDefault(); if (!anim) go(tgt + 1); }
    else if (k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); if (!anim) go(tgt - 1); }
    else if (k === 'Home') { e.preventDefault(); go(0); }
    else if (k === 'End') { e.preventDefault(); go(S - 1); }
  });

  stage.addEventListener('pointerover', e => { hovering = !!e.target.closest('.block') && MARQUEE[tgt]; });
  stage.addEventListener('pointerleave', () => { hovering = false; kick(); });
  stage.addEventListener('pointermove', e => { const h = !!e.target.closest('.block') && !!MARQUEE[tgt]; if (h !== hovering) { hovering = h; kick(); } });
  document.addEventListener('visibilitychange', kick);

  let rt = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(rt); rt = requestAnimationFrame(() => { metrics(); render(); kick(); }); });

  /* ---------- quiz behaviour + confetti ---------- */
  const qEl = blocks[1].faces[0];
  const qKey = 'fl-quiz-' + quiz.id;
  const optBtns = [...qEl.querySelectorAll('.opt')];
  const verdict = qEl.querySelector('.verdict');

  function answer(i, restore) {
    const right = quiz.q.answer;
    optBtns.forEach((b, j) => {
      b.disabled = true;
      b.classList.toggle('ok', j === right);
      b.classList.toggle('no', j === i && i !== right);
      b.classList.toggle('dim', j !== right && j !== i);
    });
    const good = i === right;
    verdict.innerHTML = (good ? '<strong class="g">Correct! 🎉</strong>' : '<strong class="b">Not quite.</strong>') +
      '<em style="font-style:normal">' + esc(quiz.q.why) + '</em>';
    if (!restore) {
      store.set(qKey, String(i));
      if (good) {
        const r = optBtns[i].getBoundingClientRect();
        confetti(r.left + r.width / 2, r.top + r.height / 2);
      }
    }
  }
  optBtns.forEach((b, i) => b.addEventListener('click', () => answer(i, false)));
  const saved = store.get(qKey);
  if (saved !== null && !isNaN(+saved) && optBtns[+saved]) answer(+saved, true);

  const cv = document.getElementById('confetti'), cx = cv.getContext('2d');
  let parts = [], cRaf = 0;
  const COLORS = ['#a9b8ff', '#ffd166', '#3ecf8e', '#ff7a7a', '#f2f3f7', '#cdb897'];
  function sizeCanvas() { const d = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); }
  function confetti(x, y) {
    if (reduce) return;
    sizeCanvas();
    const cannons = [[x, y, -Math.PI / 2, 90], [0, innerHeight, -Math.PI / 3, 70], [innerWidth, innerHeight, -Math.PI * 2 / 3, 70]];
    cannons.forEach(([px, py, ang, n]) => {
      for (let i = 0; i < n; i++) {
        const a = ang + (Math.random() - 0.5) * 1.1, v = 7 + Math.random() * 11;
        parts.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
          w: 6 + Math.random() * 6, h: 4 + Math.random() * 5, c: COLORS[(Math.random() * COLORS.length) | 0], life: 0, max: 110 + Math.random() * 60 });
      }
    });
    if (!cRaf) cRaf = requestAnimationFrame(tick);
  }
  function tick() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life < p.max && p.y < innerHeight + 40);
    parts.forEach(p => {
      p.life++; p.vy += 0.32; p.vx *= 0.992; p.vy *= 0.992; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      cx.save(); cx.globalAlpha = clamp((p.max - p.life) / 30); cx.translate(p.x, p.y); cx.rotate(p.r);
      cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore();
    });
    cRaf = parts.length ? requestAnimationFrame(tick) : 0;
    if (!parts.length) cx.clearRect(0, 0, innerWidth, innerHeight);
  }

  /* ---------- go ---------- */
  metrics();
  const h0 = SCENES.findIndex(s => '#' + s.slug === location.hash);
  if (h0 > 0) { pos = tgt = h0; }
  setActive();
  render();
  kick();
  new ResizeObserver(() => { metrics(); render(); }).observe(stage);

  const ph = [content.brief, ...content.videos, content.research.featured, ...content.research.items, ...content.posts].filter(x => x.placeholder).length;
  if (ph) console.info('[Finance Lab] ' + ph + ' placeholder entries still in data/content.json');
})();
