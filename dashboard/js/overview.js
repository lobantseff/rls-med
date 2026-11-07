/* World overview dashboard. One filter row scopes every chart. */
(function () {
  const CS = window.CS;
  const D = window.CS_DATA;
  const el = CS.el;
  const $ = (id) => document.getElementById(id);
  const Y0 = CS.Y0, Y1 = CS.Y1;

  const state = { metric: 'life', regions: new Set(CS.REGIONS) };
  const picked = () => D.countries.filter((c) => state.regions.has(c.region));
  const withValue = (cs) => cs.filter((c) => CS.isNum(c[state.metric]));

  CS.modePicker($('mode'));
  $('eyebrow').textContent = `World overview · ${Y0}–${Y1}`;
  $('lede').textContent = `${D.countries.length} countries with at least ${D.minPop / 1e6} million people. Pick an indicator and regions; every chart below follows the same selection.`;

  /* ---- filters ---- */
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
    const cs = withValue(picked());
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
    const ok = D.countries.filter((c) => CS.isNum(c.gdp) && CS.isNum(c.life));
    CS.scatter(n, w, {
      variant: 'bubble', points: cs.map((c) => ({ id: c.iso3, label: c.name, x: c.gdp, y: c.life, size: c.pop, region: c.region })),
      xLog: true, xFmt: CS.METRICS.gdp.fmt, xTick: CS.METRICS.gdp.tick, yFmt: (v) => v.toFixed(1) + ' yrs', yTick: (v) => v,
      xLabel: 'GDP per person, PPP (log scale) →', xLabelShort: 'GDP / person', yLabel: 'Life expectancy', sizeFmt: CS.fmtPop,
      xDomain: d3.extent(ok, (c) => c.gdp), yDomain: d3.extent(ok, (c) => c.life), sizeMax: d3.max(D.countries, (c) => c.pop),
      labels: ['CHN', 'IND', 'USA', 'NGA', 'JPN'],
    });
  });

  add('change', (n, w) => {
    const m = CS.METRICS[state.metric];
    const rows = withValue(picked()).sort((a, b) => b.pop - a.pop).slice(0, 10)
      .map((c) => ({ label: c.short, a: (CS.firstFinite(c.series[state.metric]) || {}).v, b: c[state.metric], region: c.region }))
      .sort((a, b) => b.b - a.b);
    CS.change(n, w, { variant: 'dumbbell', rows, fmt: m.fmt, tick: m.tick, aLabel: String(Y0), bLabel: 'Latest' });
  });
  $('chg-legend').replaceChildren(
    el('span', { class: 'k' }, el('i', { class: 'dt', style: 'background:var(--surface);box-shadow:inset 0 0 0 2px var(--muted)' }), String(Y0)),
    el('span', { class: 'k' }, el('i', { class: 'dt', style: 'background:var(--accent)' }), 'Latest'));

  function renderKpis() {
    const m = CS.METRICS[state.metric];
    const cs = picked();
    const vs = withValue(cs);
    const med = CS.medianSeries(cs, state.metric);
    const nowF = CS.lastFinite(med), thenF = CS.firstFinite(med);
    const sorted = vs.slice().sort((a, b) => b[state.metric] - a[state.metric]);
    const hi = sorted[0], lo = sorted[sorted.length - 1];
    const popByRegion = CS.REGIONS.map((r) => ({ label: r, color: CS.regionColor(r), v: cs.filter((c) => c.region === r).reduce((a, c) => a + c.pop, 0) }));
    const splitUnit = (s) => { const mm = /^(\$?[\d.,]+[KMB]?)(.*)$/.exec(s); return mm ? [mm[1], mm[2].trim()] : [s, '']; };
    const [mv, mu] = splitUnit(m.fmt(nowF && nowF.v));
    const dl = nowF && thenF ? CS.deltaOf(nowF.v, thenF.v, m) : null;
    $('kpis').replaceChildren(
      CS.kpi({ variant: 'spark', label: `Median ${m.label.toLowerCase()}`, value: mv, unit: mu || (m.key === 'life' ? 'yrs' : ''), delta: dl && { ...dl, ctx: `since ${D.years[thenF.i]}` }, spark: med }),
      CS.kpi({ variant: 'share', label: 'People covered', value: CS.fmtPop(cs.reduce((a, c) => a + c.pop, 0)), unit: `in ${cs.length} countries`, share: popByRegion }),
      CS.kpi({ variant: 'plain', label: 'Highest', value: hi ? m.fmt(hi[state.metric]) : '–', foot: hi ? `${hi.name} · ${hi.year[state.metric]}` : '' }),
      CS.kpi({ variant: 'plain', label: 'Lowest', value: lo ? m.fmt(lo[state.metric]) : '–', foot: lo ? `${lo.name} · ${lo.year[state.metric]}` : '' }),
    );
  }

  function renderTable() {
    $('table').replaceChildren();
    CS.table($('table'), { rows: picked(), metric: state.metric, variant: 'comfortable', limit: 10 });
    $('table-title').textContent = `All countries · ${withValue(picked()).length} with data`;
  }

  function renderTitles() {
    const m = CS.METRICS[state.metric];
    $('map-title').textContent = `${m.label} by country`;
    $('bars-title').textContent = state.metric === 'co2' ? 'Highest 10 emitters per person' : `Highest 10 · ${m.label.toLowerCase()}`;
    $('line-title').textContent = `${m.label}, trend by region`;
    $('line-sub').textContent = `Median of countries in each region, ${Y0}–${Y1}${m.log ? ' · log scale' : ''}`;
    $('dist-title').textContent = `${m.label}, spread within regions`;
    $('chg-title').textContent = `${m.label}, ${Y0} → latest`;
  }

  function renderSources() {
    const order = [['life', 'Life expectancy'], ['gdp', 'GDP per person'], ['co2', 'CO₂ per person'], ['net', 'Internet users'], ['pop', 'Population']];
    $('sources').replaceChildren(...order.flatMap(([k, lab]) => {
      const s = (D.sources || {})[k];
      if (!s) return [];
      return [el('dt', { text: lab }), el('dd', {}, `${s.citation}${s.unit ? ` · ${s.unit}` : ''}${s.lastUpdated ? ` · updated ${s.lastUpdated}` : ''} · `, el('a', { href: s.url, target: '_blank', rel: 'noopener', text: 'OWID chart' }))];
    }));
    $('data-note').textContent = `${D.note} Each country shows its latest available year (at most 3 years old). Data built ${D.generated}.`;
  }

  function update() {
    renderTitles();
    renderKpis();
    renderTable();
    charts.forEach((c) => c.redraw());
  }
  renderTitles(); renderKpis(); renderTable(); renderSources();
  document.addEventListener('cs:theme', () => { renderKpis(); renderTable(); });
  if (window.CS_LINKS) $('next').href = window.CS_LINKS.components;
})();
