/* HTML components: top bar, stat tiles, filters, sortable table, profile card. */
(function () {
  const CS = window.CS;
  const D = window.CS_DATA;
  const el = CS.el;

  /* ---------- top bar: light / dark picker ---------- */
  CS.modePicker = (host) => {
    const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Light or dark' });
    const render = () => {
      const m = CS.getMode();
      seg.replaceChildren(...[['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(([id, lab]) =>
        el('button', { type: 'button', 'aria-pressed': String(m === id), onclick: () => CS.setMode(id), text: lab })));
    };
    render();
    document.addEventListener('cs:theme', render);
    host.append(seg);
  };

  /* ---------- filters ---------- */
  CS.regionChips = (host, selected, onChange, opt = {}) => {
    const wrap = el('div', { class: 'chips', role: 'group', 'aria-label': 'Regions' });
    const render = () => {
      const allOn = selected.size === CS.REGIONS.length;
      wrap.replaceChildren(
        el('button', { type: 'button', class: 'chip', 'aria-pressed': String(allOn), text: 'All regions', onclick: () => { CS.REGIONS.forEach((r) => selected.add(r)); render(); onChange(); } }),
        ...CS.REGIONS.map((r) => el('button', {
          type: 'button', class: 'chip', 'aria-pressed': String(!allOn && selected.has(r)),
          onclick: () => {
            if (allOn) { selected.clear(); selected.add(r); } else if (selected.has(r)) { selected.delete(r); if (!selected.size) CS.REGIONS.forEach((x) => selected.add(x)); } else selected.add(r);
            render(); onChange();
          },
        }, opt.dots === false ? null : el('span', { class: 'dot', style: `background:${CS.regionColor(r)}` }), r)),
      );
    };
    render();
    host.append(wrap);
    return render;
  };
  CS.metricSeg = (host, state, onChange, keys = ['life', 'gdp', 'co2', 'net']) => {
    const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Indicator' });
    const render = () => seg.replaceChildren(...keys.map((k) => el('button', {
      type: 'button', 'aria-pressed': String(state.metric === k), text: CS.METRICS[k].short,
      onclick: () => { state.metric = k; render(); onChange(); },
    })));
    render();
    host.append(seg);
  };
  CS.metricSelect = (host, state, onChange, id) => {
    const s = el('select', { class: 'select', id, 'aria-label': 'Indicator', onchange: (e) => { state.metric = e.target.value; onChange(); } },
      ...Object.values(CS.METRICS).map((m) => el('option', { value: m.key, text: m.label })));
    s.value = state.metric;
    host.append(s);
    return s;
  };

  /* ---------- stat tiles ---------- */
  // o: { label, value, unit, delta: {text, good, ctx}, spark, variant: 'plain'|'spark'|'meter'|'share'|'columns', meter: {pct, text}, share: [{color, v, label}] }
  CS.kpi = (o) => {
    const card = el('div', { class: 'card kpi' });
    card.append(el('div', { class: 'label', text: o.label }));
    const valueEl = el('div', { class: 'value' }, o.value, o.unit ? el('span', { class: 'unit', text: o.unit }) : null);
    const deltaEl = o.delta && o.delta.text ? el('div', { class: 'delta ' + (o.delta.good ? 'good' : 'bad') }, el('span', { 'aria-hidden': 'true', text: o.delta.up ? '▲' : '▼' }), o.delta.text, o.delta.ctx ? el('span', { class: 'ctx', text: o.delta.ctx }) : null) : null;
    const v = o.variant || 'plain';
    if (v === 'spark' || v === 'columns') {
      card.append(el('div', { class: 'row' }, el('div', {}, valueEl, deltaEl), v === 'spark' ? CS.sparkline(o.spark, { w: 88, h: 34 }) : CS.miniColumns(o.spark.filter((_, i) => i % 2 === 1), { w: 88, h: 34 })));
    } else {
      card.append(valueEl);
      if (deltaEl) card.append(deltaEl);
    }
    if (v === 'meter') {
      card.append(el('div', { class: 'meter', role: 'img', 'aria-label': o.meter.text }, el('i', { style: `width:${Math.max(2, Math.min(100, o.meter.pct))}%` })));
      card.append(el('div', { class: 'card-sub', text: o.meter.text }));
    }
    if (v === 'share') {
      const tot = o.share.reduce((a, b) => a + b.v, 0);
      card.append(el('div', { class: 'segbar', role: 'img', 'aria-label': o.share.map((s) => `${s.label} ${Math.round((s.v / tot) * 100)}%`).join(', ') },
        ...o.share.filter((s) => s.v > 0).map((s) => el('i', { title: `${s.label} ${Math.round((s.v / tot) * 100)}%`, style: `flex:${s.v};background:${s.color}` }))));
      card.append(el('div', { class: 'legend' }, ...o.share.filter((s) => s.v > 0).map((s) => el('span', { class: 'k' }, el('i', { class: 'dt', style: `background:${s.color}` }), `${s.label} ${Math.round((s.v / tot) * 100)}%`))));
    }
    if (o.foot) card.append(el('div', { class: 'card-sub', text: o.foot }));
    return card;
  };

  // Median of a metric across countries for each year.
  CS.medianSeries = (countries, key) => D.years.map((_, i) => CS.median(countries.map((c) => c.series[key][i])));

  // Delta helper: returns {text, up, good}
  CS.deltaOf = (now, then, m) => {
    if (!CS.isNum(now) || !CS.isNum(then)) return null;
    const up = now >= then;
    const diff = now - then;
    let text;
    if (m.key === 'life') text = `${up ? '+' : '−'}${Math.abs(diff).toFixed(1)} yrs`;
    else if (m.key === 'net') text = `${up ? '+' : '−'}${Math.abs(diff).toFixed(0)} pts`;
    else text = `${up ? '+' : '−'}${Math.abs((diff / then) * 100).toFixed(0)}%`;
    return { text, up, good: up === m.higherIsBetter };
  };

  /* ---------- sortable table ---------- */
  // o: { rows: countries, metric: key, variant: 'comfortable'|'dense', limit }
  CS.table = (host, o) => {
    const m = CS.METRICS[o.metric];
    const dense = o.variant === 'dense';
    o = { ...o, rows: o.rows.filter((c) => CS.isNum(c[o.metric])) };
    const base = (c) => (CS.firstFinite(c.series[o.metric]) || {}).v;
    const chgOf = (c) => { const b = base(c); if (!CS.isNum(b)) return -Infinity; return (c[o.metric] - b) / (o.metric === 'life' || o.metric === 'net' ? 1 : b); };
    const cols = [
      { key: 'rank', label: '#', r: false },
      { key: 'name', label: 'Country', sort: (c) => c.name },
      ...(dense ? [{ key: 'region', label: 'Region', sort: (c) => c.region }] : []),
      { key: 'metric', label: m.label, r: true, sort: (c) => c[o.metric] },
      ...(dense ? [] : [{ key: 'trend', label: `${CS.Y0}–${CS.Y1}`, r: false }]),
      { key: 'chg', label: `Since ${CS.Y0}`, r: true, sort: chgOf },
      { key: 'pop', label: 'People', r: true, sort: (c) => c.pop },
      ...(dense ? [{ key: 'gdp2', label: 'GDP / person', r: true, sort: (c) => c.gdp }, { key: 'life2', label: 'Life exp.', r: true, sort: (c) => c.life }] : []),
    ].filter((c) => !(dense && o.metric === 'gdp' && c.key === 'gdp2') && !(dense && o.metric === 'life' && c.key === 'life2'));
    let sortKey = o.sortKey || 'metric', dir = -1, expanded = false;
    const wrap = el('div', { class: 'tablewrap' });
    host.append(wrap);
    const max = Math.max(...o.rows.map((c) => c[o.metric]));
    function render() {
      const col = cols.find((c) => c.key === sortKey);
      const rows = o.rows.slice().sort((a, b) => {
        const x = col.sort(a), y = col.sort(b);
        return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir;
      }).slice(0, expanded ? 999 : o.limit || 999);
      const table = el('table', { class: 'data' + (dense ? ' dense zebra' : '') });
      const thead = el('thead', {}, el('tr', {}, ...cols.map((c) => {
        const th = el('th', { class: c.r ? 'r' : '', scope: 'col' });
        if (c.key === sortKey) th.setAttribute('aria-sort', dir < 0 ? 'descending' : 'ascending');
        if (c.sort) th.append(el('button', { type: 'button', onclick: () => { if (sortKey === c.key) dir = -dir; else { sortKey = c.key; dir = c.key === 'name' || c.key === 'region' ? 1 : -1; } render(); } }, c.label, c.key === sortKey ? (dir < 0 ? ' ↓' : ' ↑') : ''));
        else th.textContent = c.label;
        return th;
      })));
      const tbody = el('tbody');
      rows.forEach((c, i) => {
        const dl = CS.deltaOf(c[o.metric], base(c), m);
        const tds = {
          rank: el('td', { class: 'rank', text: String(i + 1) }),
          name: el('td', {}, el('span', { class: 'rdot', style: `background:${CS.regionColor(c.region)}` }), c.name),
          region: el('td', { class: 'muted', text: c.region }),
          metric: el('td', { class: 'r num' }, dense ? m.fmt(c[o.metric]) : el('span', { class: 'inbar' }, m.fmt(c[o.metric]), el('span', { class: 'track' }, el('i', { style: `width:${(c[o.metric] / max) * 100}%` })))),
          trend: el('td', {}, CS.sparkline(c.series[o.metric], { w: 80, h: 22, area: false })),
          chg: el('td', { class: 'r num' }, dl ? el('span', { class: 'delta ' + (dl.good ? 'good' : 'bad') }, dl.text) : el('span', { class: 'muted', text: '–' })),
          pop: el('td', { class: 'r num', text: CS.fmtPop(c.pop) }),
          gdp2: el('td', { class: 'r num', text: CS.METRICS.gdp.fmt(c.gdp) }),
          life2: el('td', { class: 'r num', text: CS.METRICS.life.fmt(c.life) }),
        };
        tbody.append(el('tr', {}, ...cols.map((cl) => tds[cl.key])));
      });
      table.append(thead, tbody);
      wrap.replaceChildren(table);
      if (o.limit && o.rows.length > o.limit) {
        wrap.append(el('div', { class: 'table-more' }, el('button', {
          type: 'button', class: 'btn', onclick: () => { expanded = !expanded; render(); },
          text: expanded ? 'Show fewer' : `Show all ${o.rows.length} countries`,
        })));
      }
    }
    render();
  };

  /* ---------- country profile ---------- */
  CS.profile = (c, variant = 'compact') => {
    const card = el('div', { class: 'card profile ' + variant });
    const peers = D.countries.filter((x) => x.region === c.region);
    const rankIn = (k) => { const r = peers.filter((x) => CS.isNum(x[k])).sort((a, b) => b[k] - a[k]); return { i: r.findIndex((x) => x.iso3 === c.iso3) + 1, n: r.length }; };
    const head = el('div', { class: 'card-head' },
      el('div', {}, el('div', { class: 'eyebrow', text: `${c.region} · ${c.iso3}` }), el('h3', { class: variant === 'hero' ? 'h2' : 'h3', text: c.name })),
      el('span', { class: 'badge' }, el('span', { class: 'rdot', style: `background:${CS.regionColor(c.region)};margin:0` }), `${CS.fmtPop(c.pop)} people`));
    card.append(head);
    if (variant === 'hero') {
      const dl = CS.deltaOf(c.life, (CS.firstFinite(c.series.life) || {}).v, CS.METRICS.life);
      card.append(el('div', { class: 'hero-fig' },
        el('div', {}, el('div', { class: 'hero-num' }, CS.METRICS.life.fmt(c.life), el('span', { class: 'unit', text: ' years' })), el('div', { class: 'card-sub', text: `Life expectancy at birth, ${c.year.life}` })),
        dl ? el('div', { class: 'delta ' + (dl.good ? 'good' : 'bad') }, (dl.up ? '▲ ' : '▼ ') + dl.text, el('span', { class: 'ctx', text: `since ${CS.Y0}` })) : null));
      const box = el('div', { class: 'chart' });
      card.append(box);
      CS.mount(box, (n, w) => CS.lineChart(n, w, { variant: 'area', height: 150, series: [{ key: c.iso3, label: c.name, color: 'var(--accent)', values: c.series.life }], fmt: (v) => v.toFixed(1), tick: (v) => v }));
    }
    const stats = el('div', { class: 'stats' });
    ['life', 'gdp', 'co2', 'net'].filter((k) => variant !== 'hero' || k !== 'life').forEach((k) => {
      const m = CS.METRICS[k];
      stats.append(el('div', { class: 'stat' },
        el('div', { class: 'card-sub', text: m.short }),
        el('div', { class: 'stat-v' }, m.fmt(c[k])),
        el('div', { class: 'stat-r', text: CS.isNum(c[k]) ? `#${rankIn(k).i} of ${rankIn(k).n} in ${c.region} · ${c.year[k]}` : 'No recent data' }),
        variant === 'compact' ? CS.sparkline(c.series[k], { w: 100, h: 22, area: false, color: 'var(--accent)' }) : null));
    });
    card.append(stats);
    return card;
  };
})();
