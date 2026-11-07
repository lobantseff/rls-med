/* Theme look book: one overview dashboard rendered in the selected skin. */
(function () {
  const CS = window.CS;
  const D = window.CS_DATA;
  const el = CS.el;
  const $ = (id) => document.getElementById(id);

  const state = { metric: 'life', regions: new Set(CS.REGIONS) };
  const picked = () => D.countries.filter((c) => state.regions.has(c.region));

  /* ---- theme cards ---- */
  CS.modePicker($('mode'));
  const skinsHost = $('skins');
  function renderSkins() {
    const dark = CS.isDark();
    skinsHost.replaceChildren(...Object.entries(window.CS_SKINS).map(([id, s], i) => {
      const p = dark ? s.dark : s.light;
      return el('button', {
        type: 'button', class: 'skin', 'aria-pressed': String(CS.getSkin() === id),
        onclick: () => CS.setSkin(id),
      },
      el('div', { class: 'skin-top' },
        el('span', { class: 'skin-name', style: `font-family:${s.shape['font-display']};font-weight:${s.shape['display-weight']};letter-spacing:${s.shape['display-tracking']}`, text: s.name }),
        el('span', { class: 'skin-letter', text: 'Theme ' + 'ABCD'[i] })),
      el('div', { class: 'swatches', 'aria-hidden': 'true' },
        el('i', { class: 'bg', style: `background:${p.page}` }), el('i', { class: 'bg', style: `background:${p.surface}` }),
        ...['c1', 'c2', 'c3', 'c4', 'c5'].map((k) => el('i', { style: `background:${p[k]}` }))),
      el('span', { class: 'skin-blurb', text: s.blurb }));
    }));
    $('demo-eyebrow').textContent = `Preview · ${window.CS_SKINS[CS.getSkin()].name}, ${dark ? 'dark' : 'light'}`;
  }
  renderSkins();
  document.addEventListener('cs:theme', renderSkins);

  /* ---- filters (one row, scopes everything below) ---- */
  const fb = $('filters');
  CS.metricSeg(fb, state, update);
  CS.regionChips(fb, state.regions, update);

  /* ---- charts ---- */
  const charts = [];
  const add = (id, draw) => charts.push(CS.mount($(id), draw));

  add('map', (n, w) => {
    const m = CS.METRICS[state.metric];
    const dim = new Set(D.countries.filter((c) => !state.regions.has(c.region)).map((c) => c.iso3));
    CS.worldMap(n, w, { variant: 'choropleth', value: (c) => c[state.metric], fmt: m.fmt, log: m.log, metricLabel: m.label, legendEl: $('map-legend'), dim });
  });

  add('bars', (n, w) => {
    const m = CS.METRICS[state.metric];
    const cs = picked();
    const top = cs.slice().sort((a, b) => b[state.metric] - a[state.metric]).slice(0, 10);
    CS.rankedBars(n, w, { variant: 'bar', rows: top.map((c) => ({ id: c.iso3, label: c.short, name: c.name, value: c[state.metric], region: c.region })), fmt: m.fmt, metricLabel: m.label, ref: CS.median(cs.map((c) => c[state.metric])), refLabel: 'Median' });
  });

  add('line', (n, w) => {
    const m = CS.METRICS[state.metric];
    const regions = CS.REGIONS.filter((r) => state.regions.has(r));
    const series = regions.map((r) => ({ key: r, label: r, color: CS.regionColor(r), values: CS.medianSeries(D.countries.filter((c) => c.region === r), state.metric) }));
    $('line-legend').replaceChildren(...series.map((s) => el('span', { class: 'k' }, el('i', { class: 'ln', style: `background:${s.color}` }), s.label)));
    CS.lineChart(n, w, { variant: 'multi', series, fmt: m.fmt, tick: m.tick, log: m.log, metricLabel: m.label });
  });

  add('dist', (n, w) => {
    const m = CS.METRICS[state.metric];
    const groups = CS.REGIONS.filter((r) => state.regions.has(r)).map((r) => ({ key: r, color: CS.regionColor(r), items: D.countries.filter((c) => c.region === r).map((c) => ({ label: c.name, v: c[state.metric] })) }));
    CS.distribution(n, w, { variant: 'dots', groups, fmt: m.fmt, tick: m.tick, log: m.log });
  });

  add('scatter', (n, w) => {
    const cs = picked();
    $('sc-legend').replaceChildren(...CS.REGIONS.filter((r) => state.regions.has(r)).map((r) => el('span', { class: 'k' }, el('i', { class: 'dt', style: `background:${CS.regionColor(r)}` }), r)));
    CS.scatter(n, w, {
      variant: 'bubble', points: cs.map((c) => ({ id: c.iso3, label: c.name, x: c.gdp, y: c.life, size: c.pop, region: c.region })),
      xLog: true, xFmt: CS.METRICS.gdp.fmt, xTick: CS.METRICS.gdp.tick, yFmt: (v) => v.toFixed(1) + ' yrs', yTick: (v) => v,
      xLabel: 'GDP per person (log scale) →', xLabelShort: 'GDP / person', yLabel: 'Life expectancy', sizeFmt: CS.fmtPop,
      xDomain: d3.extent(D.countries, (c) => c.gdp), yDomain: d3.extent(D.countries, (c) => c.life), sizeMax: d3.max(D.countries, (c) => c.pop),
      labels: ['CHN', 'IND', 'USA', 'NGA', 'JPN', 'NOR'],
    });
  });

  add('change', (n, w) => {
    const m = CS.METRICS[state.metric];
    const rows = picked().sort((a, b) => b.pop - a.pop).slice(0, 10).map((c) => ({ label: c.short, a: c.series[state.metric][0], b: c[state.metric], region: c.region }))
      .sort((a, b) => b.b - a.b);
    CS.change(n, w, { variant: 'dumbbell', rows, fmt: m.fmt, tick: m.tick, aLabel: '2000', bLabel: '2023' });
  });

  function renderKpis() {
    const m = CS.METRICS[state.metric];
    const cs = picked();
    const med = CS.medianSeries(cs, state.metric);
    const now = med[med.length - 1], then = med[0];
    const sorted = cs.slice().sort((a, b) => b[state.metric] - a[state.metric]);
    const hi = sorted[0], lo = sorted[sorted.length - 1];
    const popByRegion = CS.REGIONS.map((r) => ({ label: r, color: CS.regionColor(r), v: cs.filter((c) => c.region === r).reduce((a, c) => a + c.pop, 0) }));
    const splitUnit = (s) => { const mm = /^(\$?[\d.,]+[KMB]?)(.*)$/.exec(s); return mm ? [mm[1], mm[2].trim()] : [s, '']; };
    const [mv, mu] = splitUnit(m.fmt(now));
    $('kpis').replaceChildren(
      CS.kpi({ variant: 'spark', label: `Median ${m.label.toLowerCase()}`, value: mv, unit: mu || (m.key === 'life' ? 'yrs' : ''), delta: { ...CS.deltaOf(now, then, m), ctx: 'since 2000' }, spark: med }),
      CS.kpi({ variant: 'share', label: 'People covered', value: CS.fmtPop(cs.reduce((a, c) => a + c.pop, 0)), unit: `in ${cs.length} countries`, share: popByRegion }),
      CS.kpi({ variant: 'plain', label: 'Highest', value: m.fmt(hi[state.metric]), foot: hi.name }),
      CS.kpi({ variant: 'plain', label: 'Lowest', value: m.fmt(lo[state.metric]), foot: lo.name }),
    );
  }

  function renderTable() {
    $('table').replaceChildren();
    CS.table($('table'), { rows: picked(), metric: state.metric, variant: 'comfortable', limit: 10 });
  }

  function renderTitles() {
    const m = CS.METRICS[state.metric];
    $('map-title').textContent = `${m.label} by country`;
    $('bars-title').textContent = state.metric === 'co2' ? 'Highest 10 emitters per person' : `Highest 10 · ${m.label.toLowerCase()}`;
    $('line-title').textContent = `${m.label}, trend by region`;
    $('dist-title').textContent = `${m.label}, spread within regions`;
    $('chg-title').textContent = `${m.label}, 2000 → 2023`;
  }

  function update() {
    renderTitles();
    renderKpis();
    renderTable();
    charts.forEach((c) => c.redraw());
  }
  renderTitles(); renderKpis(); renderTable();
  document.addEventListener('cs:theme', () => { renderKpis(); renderTable(); });

  $('data-note').textContent = D.note;
  if (window.CS_LINKS) $('next').href = window.CS_LINKS.components;
})();
