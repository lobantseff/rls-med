/* Core helpers shared by every chart: skins, formatting, tooltip, responsive mount. */
(function () {
  const CS = (window.CS = window.CS || {});
  const root = document.documentElement;
  const D = window.CS_DATA;

  CS.REGIONS = D.regions;
  CS.regionColor = (r) => `var(--c${CS.REGIONS.indexOf(r) + 1})`;
  CS.css = (name) => getComputedStyle(root).getPropertyValue(name).trim();

  /* ---------- skins & mode ---------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };
  CS.store = store;

  CS.getSkin = () => root.dataset.skin || window.CS_DEFAULT_SKIN;
  CS.setSkin = (id, persist = true) => {
    if (!window.CS_SKINS[id]) return;
    root.dataset.skin = id;
    if (persist) store.set('cs-skin', id);
    document.dispatchEvent(new CustomEvent('cs:theme'));
  };
  CS.getMode = () => root.dataset.mode || 'auto';
  CS.setMode = (m) => {
    if (m === 'auto') delete root.dataset.mode; else root.dataset.mode = m;
    store.set('cs-mode', m);
    document.dispatchEvent(new CustomEvent('cs:theme'));
  };
  CS.isDark = () => {
    const m = root.dataset.mode;
    if (m) return m === 'dark';
    const t = root.dataset.theme;
    if (t) return t === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };
  // Restore saved choices before anything paints.
  CS.setSkin(store.get('cs-skin') || window.CS_DEFAULT_SKIN, false);
  const savedMode = store.get('cs-mode');
  if (savedMode && savedMode !== 'auto') root.dataset.mode = savedMode;
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => document.dispatchEvent(new CustomEvent('cs:theme')));
  new MutationObserver(() => document.dispatchEvent(new CustomEvent('cs:theme'))).observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- formatting ---------- */
  const compact = (v) => {
    const a = Math.abs(v);
    if (a >= 1e9) return (v / 1e9).toFixed(a >= 1e10 ? 0 : 1).replace(/\.0$/, '') + 'B';
    if (a >= 1e6) return (v / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
    if (a >= 1e3) return (v / 1e3).toFixed(a >= 1e4 ? 0 : 1).replace(/\.0$/, '') + 'K';
    return String(Math.round(v));
  };
  CS.compact = compact;
  CS.fmtPop = (m) => compact(m * 1e6);

  CS.METRICS = {
    life: { key: 'life', label: 'Life expectancy', short: 'Life exp.', unit: 'years', fmt: (v) => v.toFixed(1), tick: (v) => String(v), higherIsBetter: true },
    gdp: { key: 'gdp', label: 'GDP per capita', short: 'GDP / person', unit: 'US$', fmt: (v) => '$' + compact(v), tick: (v) => '$' + compact(v), log: true, higherIsBetter: true },
    co2: { key: 'co2', label: 'CO₂ per person', short: 'CO₂ / person', unit: 'tonnes', fmt: (v) => v.toFixed(v < 10 ? 1 : 0) + ' t', tick: (v) => String(v), higherIsBetter: false },
    net: { key: 'net', label: 'Internet users', short: 'Internet', unit: '% of people', fmt: (v) => Math.round(v) + '%', tick: (v) => v + '%', higherIsBetter: true },
  };

  CS.median = (arr) => {
    const s = arr.filter((v) => v != null && !isNaN(v)).sort((a, b) => a - b);
    if (!s.length) return NaN;
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  /* ---------- DOM helpers ---------- */
  CS.el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'style') n.style.cssText = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid != null) n.append(kid.nodeType ? kid : document.createTextNode(kid));
    return n;
  };

  /* ---------- tooltip (one per page) ---------- */
  let tipEl;
  function tip() {
    if (!tipEl) {
      tipEl = CS.el('div', { class: 'cs-tip', role: 'status', 'aria-live': 'polite' });
      tipEl.hidden = true;
      document.body.append(tipEl);
    }
    return tipEl;
  }
  // rows: [{ value, label, color, key: 'line'|'dot' }]
  CS.showTip = (evt, title, rows) => {
    const t = tip();
    t.replaceChildren();
    if (title) t.append(CS.el('div', { class: 'cs-tip-title', text: title }));
    for (const r of rows) {
      const row = CS.el('div', { class: 'cs-tip-row' });
      if (r.color) row.append(CS.el('span', { class: 'cs-tip-key ' + (r.key || 'line'), style: `background:${r.color}` }));
      row.append(CS.el('span', { class: 'cs-tip-val', text: r.value }));
      if (r.label) row.append(CS.el('span', { class: 'cs-tip-lab', text: r.label }));
      t.append(row);
    }
    t.hidden = false;
    let x, y;
    if (evt && evt.clientX != null) { x = evt.clientX; y = evt.clientY; } else if (evt && evt.target && evt.target.getBoundingClientRect) {
      const b = evt.target.getBoundingClientRect(); x = b.left + b.width / 2; y = b.top;
    } else return;
    const tw = t.offsetWidth, th = t.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
    let left = x + 14, top = y - th - 12;
    if (left + tw > vw - 8) left = x - tw - 14;
    if (left < 8) left = Math.max(8, Math.min(vw - tw - 8, x - tw / 2));
    if (top < 8) top = Math.min(vh - th - 8, y + 18);
    t.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  };
  CS.hideTip = () => { if (tipEl) tipEl.hidden = true; };
  window.addEventListener('scroll', CS.hideTip, { passive: true });
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('[data-tip-target], .cs-tip')) CS.hideTip(); });

  /* ---------- responsive mount ---------- */
  const mounted = [];
  // draw(el, width) is called on first layout, on resize and on theme change.
  CS.mount = (el, draw) => {
    const rec = { el, draw, w: 0 };
    rec.redraw = () => { rec.w = el.clientWidth; if (rec.w > 0) draw(el, rec.w); };
    new ResizeObserver(() => {
      const w = el.clientWidth;
      if (w > 0 && Math.abs(w - rec.w) > 1) { rec.w = w; draw(el, w); }
    }).observe(el);
    mounted.push(rec);
    return rec;
  };
  CS.redrawAll = () => mounted.forEach((r) => r.el.isConnected && r.redraw());
  document.addEventListener('cs:theme', () => requestAnimationFrame(CS.redrawAll));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => CS.redrawAll());

  CS.svg = (el, w, h, label) => {
    el.replaceChildren();
    const svg = d3.select(el).append('svg')
      .attr('viewBox', `0 0 ${w} ${h}`).attr('width', w).attr('height', h)
      .attr('role', 'img').attr('aria-label', label || '');
    return svg;
  };

  // Rounded data-end, square at the baseline (horizontal bar growing right).
  CS.barPathH = (x0, y, x1, h, r = 4) => {
    const w = Math.max(0, x1 - x0);
    r = Math.min(r, w, h / 2);
    return `M${x0},${y}H${x0 + w - r}Q${x0 + w},${y} ${x0 + w},${y + r}V${y + h - r}Q${x0 + w},${y + h} ${x0 + w - r},${y + h}H${x0}Z`;
  };
  // Vertical column growing up from baseline y0.
  CS.barPathV = (x, y0, y1, w, r = 4) => {
    const h = Math.max(0, y0 - y1);
    r = Math.min(r, h, w / 2);
    return `M${x},${y0}V${y0 - h + r}Q${x},${y0 - h} ${x + r},${y0 - h}H${x + w - r}Q${x + w},${y0 - h} ${x + w},${y0 - h + r}V${y0}Z`;
  };

  // Text width measurement for label layout.
  const ctx = document.createElement('canvas').getContext('2d');
  CS.textW = (s, size = 12, family) => {
    ctx.font = `${size}px ${family || CS.css('--font-ui') || 'system-ui'}`;
    return ctx.measureText(s).width;
  };

  // Luminance-based ink for labels inside a colored fill.
  CS.inkOn = (color) => {
    const c = d3.color(color);
    if (!c) return '#fff';
    const { r, g, b } = c.rgb();
    const l = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const L = 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b);
    return L > 0.4 ? '#0b0b0b' : '#ffffff';
  };
  CS.resolve = (v) => (v.startsWith('var(') ? CS.css(v.slice(4, -1)) : v);
})();
