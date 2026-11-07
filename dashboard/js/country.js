/* Country page. The country comes from the URL hash (#FRA); France by default. */
(function () {
  const CS = window.CS;
  const D = window.CS_DATA;
  const el = CS.el;
  const M = CS.METRICS;
  const $ = (id) => document.getElementById(id);
  const KEYS = ['life', 'gdp', 'co2', 'net'];
  const DEFAULT = 'FRA';

  const fromHash = () => { const h = decodeURIComponent(location.hash.slice(1)).toUpperCase(); return D.byIso[h] ? h : DEFAULT; };
  const state = { iso: fromHash(), metric: 'life' };
  const cur = () => D.byIso[state.iso];
  const regionOf = () => D.countries.filter((c) => c.region === cur().region);
  const rank = (k, pool) => { const r = pool.filter((c) => CS.isNum(c[k])).sort((a, b) => b[k] - a[k]); return { i: r.indexOf(cur()) + 1, n: r.length }; };
  const worldMedian = (k) => CS.median(D.countries.map((c) => c[k]).filter(CS.isNum));
  const splitUnit = (s) => { const mm = /^(\$?[\d.,]+[KMB]?)(.*)$/.exec(s); return mm ? [mm[1], mm[2].trim()] : [s, '']; };

  CS.modePicker($('mode'));
  if (window.CS_LINKS) $('home').href = window.CS_LINKS.themes;

  /* ---- country finder ---- */
  $('c-list').replaceChildren(...D.countries.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => el('option', { value: c.name })));
  function go() {
    const q = $('c-search').value.trim().toLowerCase();
    if (!q) return;
    const hit = D.countries.find((c) => c.name.toLowerCase() === q) || D.countries.find((c) => c.iso3.toLowerCase() === q)
      || D.countries.find((c) => c.name.toLowerCase().startsWith(q)) || D.countries.find((c) => c.name.toLowerCase().includes(q));
    if (hit) { $('c-search').value = ''; location.hash = hit.iso3; } else { $('c-search').setCustomValidity('No country with that name in the data'); $('c-search').reportValidity(); }
  }
  $('finder').addEventListener('submit', (e) => { e.preventDefault(); go(); });
  $('c-search').addEventListener('input', () => {
    $('c-search').setCustomValidity('');
    if (D.countries.some((c) => c.name === $('c-search').value)) go(); // picked from the suggestion list
  });
  window.addEventListener('hashchange', () => { state.iso = fromHash(); renderAll(); window.scrollTo({ top: 0 }); });

  /* ---- position strips (one per indicator) ---- */
  const charts = [];
  const strips = KEYS.map((k) => {
    const meta = el('div', { class: 'strip-meta' });
    const box = el('div', { class: 'chart' });
    $('strips').append(el('div', { class: 'strip-row' }, meta, box));
    charts.push(CS.mount(box, (n, w) => CS.strip(n, w, {
      values: D.countries.map((c) => ({ id: c.iso3, label: c.short, v: c[k], region: c.region })),
      highlight: state.iso, peerRegion: cur().region, fmt: M[k].fmt, tick: M[k].tick, log: M[k].log, ref: worldMedian(k), title: M[k].label,
    })));
    return { k, meta };
  });

  /* ---- detail charts, scoped by the indicator selector ---- */
  CS.metricSeg($('filters'), state, () => { renderDetailText(); detail.forEach((c) => c.redraw()); });
  const detail = [];
  detail.push(CS.mount($('trend'), (n, w) => {
    const c = cur(), k = state.metric;
    const series = [
      { key: c.iso3, label: c.short, color: 'var(--accent)', values: c.series[k] },
      { key: 'region', label: `${c.region} median`, color: CS.regionColor(c.region), values: CS.medianSeries(regionOf(), k) },
      { key: 'world', label: 'World', color: 'var(--muted)', values: D.world[k] },
    ].filter((s) => s.values && s.values.some(CS.isNum));
    $('trend-legend').replaceChildren(...series.map((s) => el('span', { class: 'k' }, el('i', { class: 'ln', style: `background:${s.color}` }), s.label)));
    CS.lineChart(n, w, { variant: 'multi', series, fmt: M[k].fmt, tick: M[k].tick, log: M[k].log, metricLabel: M[k].label });
  }));
  detail.push(CS.mount($('peers'), (n, w) => {
    const c = cur(), k = state.metric;
    const ranked = regionOf().filter((x) => CS.isNum(x[k])).sort((a, b) => b[k] - a[k]);
    const at = ranked.indexOf(c);
    const lo = Math.max(0, Math.min(at - 5, ranked.length - 11));
    const win = at < 0 ? ranked.slice(0, 11) : ranked.slice(lo, lo + 11);
    CS.rankedBars(n, w, {
      rows: win.map((x) => ({ id: x.iso3, name: x.name, label: `${ranked.indexOf(x) + 1}. ${x.short}`, value: x[k], region: x.region })),
      highlight: c.iso3, fmt: M[k].fmt, metricLabel: M[k].label, ref: CS.median(ranked.map((x) => x[k])), refLabel: `${c.region} median`,
      max: ranked.length ? ranked[0][k] : undefined,
    });
  }));
  detail.push(CS.mount($('scatter'), (n, w) => {
    const c = cur();
    const ok = D.countries.filter((x) => CS.isNum(x.gdp) && CS.isNum(x.life));
    $('sc-legend').replaceChildren(
      el('span', { class: 'k' }, el('i', { class: 'dt', style: 'background:var(--accent)' }), c.short),
      el('span', { class: 'k' }, el('i', { class: 'dt', style: `background:${CS.regionColor(c.region)}` }), `Rest of ${c.region}`),
      el('span', { class: 'k' }, el('i', { class: 'dt', style: 'background:var(--axis)' }), 'Rest of world'));
    CS.scatter(n, w, {
      variant: 'emphasis', focusRegion: c.region, mark: c.iso3,
      points: ok.map((x) => ({ id: x.iso3, label: x.name, x: x.gdp, y: x.life, size: x.pop, region: x.region })),
      xLog: true, xFmt: M.gdp.fmt, xTick: M.gdp.tick, yFmt: (v) => v.toFixed(1) + ' yrs', yTick: (v) => v,
      xLabel: 'GDP per person, PPP (log scale) →', xLabelShort: 'GDP / person', yLabel: 'Life expectancy', sizeFmt: CS.fmtPop,
    });
  }));

  /* ---- render ---- */
  function renderHeader() {
    const c = cur();
    const popRank = rank('pop', D.countries);
    $('c-eyebrow').textContent = `${c.region} · ${c.iso3}`;
    $('c-name').textContent = c.name;
    $('c-facts').replaceChildren(
      el('span', { class: 'badge' }, el('span', { class: 'rdot', style: `background:${CS.regionColor(c.region)};margin:0` }), `${CS.fmtPop(c.pop)} people`),
      el('span', { class: 'badge', text: `#${popRank.i} of ${popRank.n} by population` }),
      el('span', { class: 'badge', text: `Data ${CS.Y0}–${Math.max(...KEYS.map((k) => c.year[k] || 0))}` }));
    $('pos-title').textContent = `Where ${c.short} stands`;
    $('pos-sub').textContent = `Each dot is one of ${D.countries.length} countries · vertical line is the world median`;
    $('pos-legend').replaceChildren(
      el('span', { class: 'k' }, el('i', { class: 'dt', style: 'background:var(--accent)' }), c.short),
      el('span', { class: 'k' }, el('i', { class: 'dt', style: `background:${CS.regionColor(c.region)}` }), c.region),
      el('span', { class: 'k' }, el('i', { class: 'dt', style: 'background:var(--axis)' }), 'Other'));
  }

  function renderKpis() {
    const c = cur();
    $('kpis').replaceChildren(...KEYS.map((k) => {
      const m = M[k];
      const r = rank(k, D.countries), rr = rank(k, regionOf());
      const f = CS.firstFinite(c.series[k]);
      const dl = f ? CS.deltaOf(c[k], f.v, m) : null;
      const [v, u] = splitUnit(m.fmt(c[k]));
      return CS.kpi({
        variant: 'spark', label: m.label, value: v, unit: u || (k === 'life' ? 'yrs' : ''), spark: c.series[k],
        delta: dl && { ...dl, ctx: `since ${D.years[f.i]}` },
        foot: CS.isNum(c[k]) ? `#${r.i} of ${r.n} · #${rr.i} of ${rr.n} in ${c.region} · ${c.year[k]}` : 'No recent data',
      });
    }));
  }

  function renderStrips() {
    const c = cur();
    strips.forEach(({ k, meta }) => {
      const r = rank(k, D.countries);
      const pct = r.n > 1 && r.i ? Math.round(((r.n - r.i) / (r.n - 1)) * 100) : null;
      meta.replaceChildren(
        el('div', { class: 'k', text: M[k].label }),
        el('div', { class: 'v', text: M[k].fmt(c[k]) }),
        el('div', { class: 'r', text: pct == null ? 'No recent data' : `Higher than ${pct}% of countries` }));
    });
  }

  function renderDetailText() {
    const c = cur(), m = M[state.metric];
    $('detail-h').textContent = `${c.short} in detail`;
    $('trend-title').textContent = `${m.label}, ${CS.Y0}–${CS.Y1}`;
    $('trend-sub').textContent = `${c.short} vs. the median of ${c.region} and OWID's world figure${m.log ? ' · log scale' : ''}`;
    $('peers-title').textContent = `${m.label}: nearest in ${c.region}`;
    $('peers-sub').textContent = `${c.short} and its neighbours in the ${c.region} ranking · line is the regional median`;
    $('sc-sub').textContent = `Latest year · bubble size is population`;
  }

  function renderYears() {
    const c = cur();
    const idx = D.years.map((y, i) => i).filter((i) => (D.years[i] - CS.Y0) % 5 === 0);
    if (idx[idx.length - 1] !== CS.LAST) idx.push(CS.LAST);
    const cols = [['life', M.life.short], ['gdp', M.gdp.short], ['co2', M.co2.short], ['net', M.net.short], ['pop', 'People']];
    const table = el('table', { class: 'data years', style: 'min-width:460px' },
      el('thead', {}, el('tr', {}, el('th', { scope: 'col', text: 'Year' }), ...cols.map(([, lab]) => el('th', { class: 'r', scope: 'col', text: lab })))),
      el('tbody', {}, ...idx.slice().reverse().map((i) => el('tr', {},
        el('td', { class: 'num', text: String(D.years[i]) }),
        ...cols.map(([k]) => el('td', { class: 'r num', text: k === 'pop' ? (CS.isNum(c.series.pop[i]) ? CS.fmtPop(c.series.pop[i]) : '–') : M[k].fmt(c.series[k][i]) }))))));
    $('years').replaceChildren(table);
    $('yrs-title').textContent = `${c.short}, year by year`;
  }

  function renderAll() {
    renderHeader(); renderKpis(); renderStrips(); renderDetailText(); renderYears();
    charts.forEach((r) => r.redraw()); detail.forEach((r) => r.redraw());
  }
  renderHeader(); renderKpis(); renderStrips(); renderDetailText(); renderYears();
  CS.sourcesList($('sources'));
  $('data-note').textContent = `${D.note} Data built ${D.generated}.`;
  document.addEventListener('cs:theme', () => { renderKpis(); renderYears(); });
})();
