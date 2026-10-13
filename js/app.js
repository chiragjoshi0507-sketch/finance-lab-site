/* Finance Lab by SSEI — one page, five scenes.
   A fixed set of blocks is re-arranged into each scene's layout as the user scrolls
   (wheel, swipe, keys, nav). Content lives in data/content.json and data/quiz.json. */
(async function () {
  'use strict';

  const stage = document.getElementById('stage');
  const SCENES = [
    { slug: 'daily-brief' }, { slug: 'watch-the-money' }, { slug: 'under-the-lens' },
    { slug: 'quick-takes' }, { slug: 'about' }
  ];
  const S = SCENES.length;   // scenes
  const N = 8;               // blocks (marquee scenes use all of them)
  const MARQUEE = { 1: true, 3: true };
  const SPEED = { 1: 30, 3: 28 };  // px/second; positive = cards drift left -> right
  const DIRECTION = 1;             // 1 = left-to-right, -1 = right-to-left

  // palette (keep in sync with css/style.css)
  const BG = [10, 10, 10], VIOLET = [107, 75, 255], YELLOW = [255, 214, 10], LIME = [198, 255, 61],
        PINK = [255, 61, 154], CYAN = [45, 226, 230], ORANGE = [255, 122, 44];
  const ACCENTS = ['#ff3d9a', '#c6ff3d', '#2de2e6', '#ff7a2c', '#ffd60a', '#a78bfa'];

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
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
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
  const accent = i => ACCENTS[i % ACCENTS.length];
  const ytThumb = v => v.image || (v.youtubeId ? 'https://i.ytimg.com/vi/' + encodeURIComponent(v.youtubeId) + '/maxresdefault.jpg' : '');
  const thumbInner = (img, text) => img ? '<img src="' + esc(img) + '" alt="" loading="lazy"' + (/maxresdefault/.test(img) ? ' onerror="this.onerror=null;this.src=this.src.replace(\'maxresdefault\',\'mqdefault\')"' : '') + '>' : '<b>' + esc(text) + '</b>';

  function faceHTML(s, k) {
    const C = content;
    if (s === 0 && k === 0) {
      const b = C.brief;
      return '<a class="brief" href="' + safeUrl(b.url) + '" target="_blank" rel="noopener">' +
        '<div class="bthumb">' + thumbInner(b.image, b.thumbText || '') + '<span class="sticker">New today</span></div>' +
        '<div class="chip">' + esc(b.eyebrow) + '</div><h1>' + esc(b.title) + '</h1>' +
        '<p class="sum">' + esc(b.summary) + '</p><span class="pill">' + esc(b.cta) + '</span></a>';
    }
    if (s === 0 && k === 1) {
      const q = quiz.q, short = q.options.every(o => o.length <= 20);
      return '<div class="quiz"><div class="chip">🧠 FinQuest · Daily quiz</div>' +
        '<h2>' + esc(q.q) + '</h2><div class="opts' + (short ? ' two' : '') + '">' +
        q.options.map((o, i) => '<button type="button" class="opt" data-i="' + i + '">' + esc(o) + '</button>').join('') +
        '</div><div class="verdict" aria-live="polite"></div>' +
        '<a class="qlink" href="' + safeUrl(L.quizWhatsapp) + '" target="_blank" rel="noopener">Daily quizzes on WhatsApp →</a></div>';
    }
    if (s === 1) {
      const i = k % C.videos.length, v = C.videos[i];
      return '<a class="card" style="--c:' + accent(i) + '" href="' + safeUrl(v.url) + '" target="_blank" rel="noopener">' +
        '<div class="thumb">' + thumbInner(ytThumb(v), v.thumbText || v.title) + '</div>' +
        '<div class="meta"><span class="chip">' + esc(v.tag) + '</span><h3>' + esc(v.title) + '</h3>' + (v.blurb ? '<p>' + esc(v.blurb) + '</p>' : '') + '</div></a>';
    }
    if (s === 2 && k === 0) {
      const f = C.research.featured;
      return '<a class="feat' + (f.image ? ' has-img' : '') + '" href="' + safeUrl(f.url) + '" target="_blank" rel="noopener">' +
        (f.image ? '<div class="fphoto"><img src="' + esc(f.image) + '" alt="" loading="lazy"></div>' : '') +
        '<div class="ftext"><div class="chip">' + esc(f.tag) + '</div>' +
        (f.image ? '' : '<div class="wordmark">' + esc(f.wordmark || '') + '</div>') +
        '<h3>' + esc(f.title) + '</h3><p>' + esc(f.blurb) + '</p>' +
        '<span class="pill">' + esc(f.cta) + '</span></div></a>';
    }
    if (s === 2 && (k === 1 || k === 2)) {
      const it = C.research.items[k - 1];
      if (!it) return '';
      return '<a class="item" style="--c:' + accent(k) + '" href="' + safeUrl(it.url) + '" target="_blank" rel="noopener">' +
        '<span class="chip">' + esc(it.tag) + '</span><h3>' + esc(it.title) + '</h3><p>' + esc(it.blurb) + '</p>' +
        '<span class="pill">' + esc(it.cta) + '</span></a>';
    }
    if (s === 3) {
      const i = k % C.posts.length, p = C.posts[i];
      return '<a class="card post" style="--c:' + accent(i + 2) + '" href="' + safeUrl(p.url) + '" target="_blank" rel="noopener">' +
        '<div class="thumb">' + thumbInner(p.image, p.thumbText || p.type) + '<span class="badge">' + esc(p.type) + '</span></div>' +
        '<div class="meta"><h3>' + esc(p.title) + '</h3>' + (p.blurb ? '<p>' + esc(p.blurb) + '</p>' : '') + '</div></a>';
    }
    if (s === 4 && k === 0) {
      const a = C.about;
      return '<div class="about"><div class="chip">' + esc(a.eyebrow) + '</div><h2>' + esc(a.title) + '</h2>' +
        a.body.map(t => '<p>' + esc(t) + '</p>').join('') +
        '<div class="foot">© ' + new Date().getFullYear() + ' Finance Lab by SSEI · Sanjay Saraf Educational Institute</div></div>';
    }
    if (s === 4 && k >= 1 && k <= 4) {
      const socials = [
        ['instagram', 'Instagram', L.instagramHandle || '', L.instagram, '#ff3d9a'],
        ['whatsapp', 'WhatsApp', 'Community channel', L.whatsapp, '#c6ff3d'],
        ['substack', 'Substack', 'Daily Brief & research', L.substack, '#ff7a2c'],
        ['youtube', 'YouTube', 'Watch the Money', L.youtube, '#2de2e6']
      ][k - 1];
      return '<a class="soc" style="--c:' + socials[4] + '" href="' + safeUrl(socials[3]) + '" target="_blank" rel="noopener">' +
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
    el.className = 'scene-text s' + s + ' ' + (cls || '');
    el.innerHTML = html;
    el.style.opacity = 0;
    stage.appendChild(el);
    texts[s] = el;
  }
  const pauseBtn = '<button type="button" class="pause" data-pause aria-pressed="false">Pause ⏸</button>';
  addText(1, '', '<div class="head"><div class="chip">▶ YouTube</div><h2>Watch the <mark>Money</mark></h2><p>Real businesses. Real numbers. Decoded on video.</p></div>' +
    '<div class="tools">' + pauseBtn + '<a class="more" href="' + safeUrl(L.youtube) + '" target="_blank" rel="noopener">Visit our YouTube channel →</a></div>');
  addText(2, '', '<div class="head"><div class="chip">Deep dive research · Substack</div><h2>Under the <mark>Lens</mark></h2><p>Big questions. A closer look at the evidence.</p></div>' +
    '<div class="tools"><a class="more" href="' + safeUrl(L.substack) + '" target="_blank" rel="noopener">Explore all research →</a></div>');
  addText(3, '', '<div class="head"><div class="chip">⚡ Instagram · WhatsApp</div><h2>Quick <mark>Takes</mark></h2><p>Carousels and reels — finance in bite-sized swipes.</p></div>' +
    '<div class="tools">' + pauseBtn + '<a class="more" href="' + safeUrl(L.instagram) + '" target="_blank" rel="noopener">Follow on Instagram →</a></div>');
  addText(4, 't-email', '<div><div class="chip dark">Write to us</div><a class="mail" href="mailto:' + esc(L.email) + '">' + esc(L.email) + '</a></div>' +
    '<a class="btn" href="mailto:' + esc(L.email) + '">Email us</a>');

  /* ---------- metrics + layouts ---------- */
  let W = 0, H = 0, mobile = false, short = false, ox = 0, oy = 0, cw = 0, ch = 0, G = 24, HEAD = 136;
  const mOff = { 1: 0, 3: 0 };
  let pitch = { 1: 300, 3: 260 }, cardSize = { 1: [280, 300], 3: [240, 400] };

  function metrics() {
    const hd = document.querySelector('.top');
    hd.style.height = ''; hd.style.height = Math.ceil(hd.getBoundingClientRect().height) + 'px';   // whole-pixel stage edge
    W = stage.clientWidth; H = stage.clientHeight;
    mobile = W < 820;
    short = !mobile && H < 700;
    document.body.classList.toggle('short', short);
    const pad = mobile ? 16 : Math.max(24, (W - 1240) / 2);
    ox = pad; cw = W - 2 * pad;
    G = mobile ? 14 : 24;
    oy = mobile ? 12 : (short ? 8 : 18);
    ch = H - oy - (mobile ? 58 : (short ? 54 : 60));       // room for the round next-arrow
    HEAD = mobile ? 108 : (short ? 104 : 140);
    stage.style.setProperty('--fade', Math.round(Math.min(pad, 90)) + 'px');

    const avail = ch - HEAD - 10;            // height under the section heading
    const vx = mobile ? 142 : 150, px = mobile ? 160 : 168;   // text under each thumbnail
    // with few items, widen cards so the same one never shows twice at once
    const noDup = n => (W + 2) / Math.max(1, n) - G;
    const vw = clamp(Math.max(mobile ? cw * 0.78 : (cw - 2 * G) / 3.05, noDup(content.videos.length)), 200, Math.max(200, (avail - vx) * 16 / 9));
    cardSize[1] = [vw, Math.min(avail, vw * 9 / 16 + vx)];
    pitch[1] = vw + G;
    const pw = clamp(Math.max(mobile ? cw * 0.52 : (cw - 3 * G) / 4.15, noDup(content.posts.length)), 150, Math.max(150, (avail - px) * 0.75));
    cardSize[3] = [pw, Math.min(avail, pw * 4 / 3 + px)];
    pitch[3] = pw + G;

    // heading layers
    [1, 2, 3].forEach(s => { const t = texts[s]; t.style.left = ox + 'px'; t.style.top = oy + 'px'; t.style.width = cw + 'px'; t.style.height = HEAD - 12 + 'px'; });
    const eh = mobile ? 66 : 84, aH = areaH4();
    const t4 = texts[4];
    t4.style.left = ox + 'px'; t4.style.width = cw + 'px'; t4.style.height = eh + 'px'; t4.style.top = oy + aH + G + 'px';
  }
  const areaH4 = () => Math.min(ch - (mobile ? 66 : 84) - G, 560);

  const hidden = () => ({ x: ox + cw / 2 - 30, y: oy + ch / 2 - 30, w: 60, h: 60, o: 0, c: BG });

  function marqueeRects(s) {
    const [w, h] = cardSize[s], p = pitch[s], total = N * p;
    const lo = -(p + ox + 6);
    const y = oy + HEAD + 10 + Math.max(0, (ch - HEAD - 10 - h) * 0.4);
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
        const ah = Math.round(h * 0.42);
        R[0] = { x: ox, y, w: cw, h: ah, o: 1, c: VIOLET };
        R[1] = { x: ox, y: y + ah + G, w: cw, h: h - ah - G, o: 1, c: YELLOW };
      } else {
        const aw = Math.round((cw - G) * 0.6);
        R[0] = { x: ox, y, w: aw, h, o: 1, c: VIOLET };
        R[1] = { x: ox + aw + G, y, w: cw - aw - G, h, o: 1, c: YELLOW };
      }
    } else if (s === 1 || s === 3) {
      return marqueeRects(s);
    } else if (s === 2) {
      const y0 = oy + HEAD, aH = Math.min(ch - HEAD, mobile ? ch : 560);
      if (!content.research.items.length) {
        R[0] = { x: ox, y: y0, w: cw, h: aH, o: 1, c: LIME };
      } else if (mobile) {
        const fh = Math.round(aH * 0.4), ih = (aH - fh - 2 * G) / 2;
        R[0] = { x: ox, y: y0, w: cw, h: fh, o: 1, c: LIME };
        R[1] = { x: ox, y: y0 + fh + G, w: cw, h: ih, o: 1, c: PINK };
        R[2] = { x: ox, y: y0 + fh + G + ih + G, w: cw, h: ih, o: 1, c: CYAN };
      } else {
        const fw = Math.round((cw - G) * 0.54), rw = cw - fw - G, ih = (aH - G) / 2;
        R[0] = { x: ox, y: y0, w: fw, h: aH, o: 1, c: LIME };
        R[1] = { x: ox + fw + G, y: y0, w: rw, h: ih, o: 1, c: PINK };
        R[2] = { x: ox + fw + G, y: y0 + ih + G, w: rw, h: ih, o: 1, c: CYAN };
      }
    } else if (s === 4) {
      const aH = areaH4(), y0 = oy, tc = [PINK, LIME, ORANGE, CYAN];
      if (mobile) {
        const ah = Math.round(aH * 0.45), th = (aH - ah - 2 * G) / 2, tw = (cw - G) / 2;
        R[0] = { x: ox, y: y0, w: cw, h: ah, o: 1, c: VIOLET };
        for (let i = 0; i < 4; i++) R[1 + i] = { x: ox + (i % 2) * (tw + G), y: y0 + ah + G + Math.floor(i / 2) * (th + G), w: tw, h: th, o: 1, c: tc[i] };
      } else {
        const aw = Math.round((cw - G) * 0.5), tw = (cw - aw - 2 * G) / 2, th = (aH - G) / 2;
        R[0] = { x: ox, y: y0, w: aw, h: aH, o: 1, c: VIOLET };
        for (let i = 0; i < 4; i++) R[1 + i] = { x: ox + aw + G + (i % 2) * (tw + G), y: y0 + Math.floor(i / 2) * (th + G), w: tw, h: th, o: 1, c: tc[i] };
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
  let raf = 0, lastT = 0, hovering = false, paused = false, speedF = 1;
  function frame(t) {
    raf = 0;
    const dt = Math.min(0.05, lastT ? (t - lastT) / 1000 : 0.016);
    lastT = t;
    if (anim) {
      const p = clamp((t - anim.t0) / anim.dur);
      pos = anim.from + (anim.to - anim.from) * easeIO(p);
      if (p >= 1) { pos = anim.to; anim = null; }
    }
    const running = !anim && MARQUEE[tgt] && !paused;
    if (running && !document.hidden) {
      // slow right down (don't stop) while the pointer is on a card, so cards stay easy to click
      speedF += ((hovering ? 0.18 : 1) - speedF) * Math.min(1, dt * 6);
      mOff[tgt] -= DIRECTION * SPEED[tgt] * speedF * dt;
    }
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
    const on = navBtns.find(b => +b.dataset.nav === tgt);
    if (on && mobile && on.scrollIntoView) on.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
    dotBtns.forEach((b, i) => b.classList.toggle('on', i === tgt));
    nextBtn.classList.toggle('up', tgt === S - 1);
    nextBtn.setAttribute('aria-label', tgt === S - 1 ? 'Back to the top' : 'Next section');
  }

  function go(n, opts) {
    n = clamp(n, 0, S - 1);
    if (n === tgt && !anim && Math.abs(pos - n) < 1e-4) { if (opts && opts.focus) focusQuiz(); return; }
    tgt = n;
    const dist = Math.abs(n - pos);
    anim = { from: pos, to: n, t0: performance.now(), dur: Math.min(1500, 820 + dist * 200) };
    try { history.replaceState(null, '', '#' + SCENES[n].slug); } catch (e) { /* file:// */ }
    setActive(); kick();
    if (opts && opts.focus) setTimeout(focusQuiz, anim.dur);
  }
  function focusQuiz() {
    const q = blocks[1].el; q.classList.remove('pulse'); void q.offsetWidth; q.classList.add('pulse');
  }

  document.addEventListener('click', e => {
    const pb = e.target.closest('[data-pause]');
    if (pb) {
      paused = !paused;
      document.querySelectorAll('[data-pause]').forEach(b => { b.textContent = paused ? 'Play ▶' : 'Pause ⏸'; b.setAttribute('aria-pressed', String(paused)); });
      kick(); return;
    }
    const el = e.target.closest('[data-go]'); if (!el) return;
    e.preventDefault();
    go(+el.dataset.go, { focus: el.dataset.focus === 'quiz' });
  });
  nextBtn.addEventListener('click', () => go(tgt === S - 1 ? 0 : tgt + 1));

  // let a long quiz card scroll itself instead of changing section
  function innerScrolls(e) {
    const q = e.target.closest && e.target.closest('.quiz');
    if (!q || q.scrollHeight <= q.clientHeight + 1) return false;
    return e.deltaY > 0 ? q.scrollTop + q.clientHeight < q.scrollHeight - 1 : q.scrollTop > 0;
  }
  let lastWheel = 0;
  window.addEventListener('wheel', e => {
    if (innerScrolls(e)) return;
    e.preventDefault();
    const now = performance.now(), quiet = now - lastWheel > 140;
    lastWheel = now;
    if (anim || !quiet || Math.abs(e.deltaY) < 3) return;
    go(tgt + (e.deltaY > 0 ? 1 : -1));
  }, { passive: false });

  let ty = 0, tx = 0;
  stage.addEventListener('touchstart', e => { ty = e.touches[0].clientY; tx = e.touches[0].clientX; }, { passive: true });
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

  stage.addEventListener('pointermove', e => { hovering = !!e.target.closest('.block') && !!MARQUEE[tgt]; });
  stage.addEventListener('pointerleave', () => { hovering = false; });
  document.addEventListener('visibilitychange', kick);

  let rt = 0;
  window.addEventListener('resize', () => { cancelAnimationFrame(rt); rt = requestAnimationFrame(() => { metrics(); render(); kick(); }); });

  /* ---------- quiz behaviour + confetti ---------- */
  const qEl = blocks[1].faces[0];
  const qKey = 'fl-quiz-' + quiz.id;
  const optBtns = [...qEl.querySelectorAll('.opt')];
  const verdict = qEl.querySelector('.verdict');

  function answer(i, restore) {
    const right = quiz.q.answer, good = i === right;
    optBtns.forEach((b, j) => {
      b.disabled = true;
      b.classList.toggle('ok', j === right);
      b.classList.toggle('no', j === i && !good);
      b.classList.toggle('dim', j !== right && j !== i);
    });
    qEl.querySelector('.quiz').classList.add('answered');
    verdict.className = 'verdict show ' + (good ? 'good' : 'bad');
    verdict.innerHTML = '<strong>' + (good ? '🎉 Correct!' : '😬 Not quite') + '</strong>' +
      '<span class="ans">' + (good ? 'Answer: ' : 'Correct answer: ') + esc(quiz.q.options[right]) + '</span>' +
      (quiz.q.why ? '<em>' + esc(quiz.q.why) + '</em>' : '');
    if (!restore) {
      store.set(qKey, String(i));
      if (good) {
        const r = optBtns[i].getBoundingClientRect();
        confetti(r.left + r.width / 2, r.top + r.height / 2);
      } else {
        qEl.querySelector('.quiz').classList.remove('shake'); void qEl.offsetWidth; qEl.querySelector('.quiz').classList.add('shake');
      }
      // make sure the verdict is on screen even on a short window
      const q = qEl.querySelector('.quiz');
      setTimeout(() => { q.scrollTo({ top: q.scrollHeight, behavior: 'smooth' }); }, 60);
    }
  }
  optBtns.forEach((b, i) => b.addEventListener('click', () => answer(i, false)));
  const saved = store.get(qKey);
  if (saved !== null && !isNaN(+saved) && optBtns[+saved]) answer(+saved, true);

  const cv = document.getElementById('confetti'), cx = cv.getContext('2d');
  let parts = [], cRaf = 0;
  const COLORS = ['#ff3d9a', '#ffd60a', '#c6ff3d', '#2de2e6', '#6b4bff', '#ff7a2c', '#ffffff'];
  const EMOJI = ['🎉', '🥳', '✨', '💸', '🔥'];
  function sizeCanvas() { const d = Math.min(2, devicePixelRatio || 1); cv.width = innerWidth * d; cv.height = innerHeight * d; cx.setTransform(d, 0, 0, d, 0, 0); }
  function confetti(x, y) {
    sizeCanvas();
    const w = innerWidth, h = innerHeight;
    // party poppers: from the answer, both bottom corners, both sides, plus a rain from the top
    const cannons = [[x, y, -Math.PI / 2, 120, 1], [0, h, -Math.PI / 3, 110, 1.35], [w, h, -Math.PI * 2 / 3, 110, 1.35],
                     [0, h * 0.55, -Math.PI / 6, 70, 1.2], [w, h * 0.55, -Math.PI * 5 / 6, 70, 1.2]];
    cannons.forEach(([px, py, ang, n, pw]) => {
      for (let i = 0; i < n; i++) {
        const a = ang + (Math.random() - 0.5) * 1.15, v = (8 + Math.random() * 14) * pw;
        parts.push({ x: px, y: py, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.4,
          w: 7 + Math.random() * 8, h: 5 + Math.random() * 6, c: COLORS[(Math.random() * COLORS.length) | 0], life: 0, max: 150 + Math.random() * 90,
          e: Math.random() < 0.07 ? EMOJI[(Math.random() * EMOJI.length) | 0] : null });
      }
    });
    for (let i = 0; i < 90; i++) {   // rain
      parts.push({ x: Math.random() * w, y: -20 - Math.random() * h * 0.5, vx: (Math.random() - 0.5) * 2, vy: 2 + Math.random() * 4, r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
        w: 7 + Math.random() * 7, h: 5 + Math.random() * 5, c: COLORS[(Math.random() * COLORS.length) | 0], life: 0, max: 220 + Math.random() * 80, e: null });
    }
    if (!cRaf) cRaf = requestAnimationFrame(tick);
  }
  function tick() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life < p.max && p.y < innerHeight + 60);
    parts.forEach(p => {
      p.life++; p.vy += 0.3; p.vx *= 0.99; p.vy *= 0.992; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      cx.save(); cx.globalAlpha = clamp((p.max - p.life) / 30); cx.translate(p.x, p.y); cx.rotate(p.r);
      if (p.e) { cx.font = '26px serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(p.e, 0, 0); }
      else { cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
      cx.restore();
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
  new ResizeObserver(() => { metrics(); render(); kick(); }).observe(stage);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { metrics(); render(); });

  const ph = [content.brief, ...content.videos, content.research.featured, ...content.research.items, ...content.posts].filter(x => x.placeholder).length;
  if (ph) console.info('[Finance Lab] ' + ph + ' placeholder entries still in data/content.json');
})();
