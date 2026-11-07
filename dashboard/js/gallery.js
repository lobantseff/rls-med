/* Component kit: every chart type with its lettered options, on live OWID data. */
(function () {
  const CS = window.CS;
  const D = window.CS_DATA;
  const el = CS.el;
  const $ = (id) => document.getElementById(id);
  const M = CS.METRICS;
  const C = D.countries;

  CS.modePicker($('mode'));

  /* ---------- helpers ---------- */
  function chartCard(host, o) {
    const card = el('article', { class: 'card' });
    if (o.title) card.append(el('div', { class: 'card-head' }, el('div', {}, el('h3', { class: 'card-title', text: o.title }), o.sub ? el('p', { class: 'card-sub', text: o.sub }) : null), o.headRight || null));
    if (o.controls) card.append(o.controls);
    let legendTop;
    if (o.legend) { legendTop = el('div', { class: 'legend' }); card.append(legendTop); o.legend(legendTop); }
    const box = el('div', { class: 'chart' });
    card.append(box);
    let legendBottom;
    if (o.legendBelow) { legendBottom = el('div', { class: 'legend' }); card.append(legendBottom); }
    if (o.foot) card.append(el('div', { class: 'card-foot' }, o.foot));
    host.append(card);
    const rec = CS.mount(box, (n, w) => o.draw(n, w, legendBottom, legendTop));
    return { card, box, rec, legendBottom };
  }
  const regionLegend = (kind = 'dt', only) => (lg) => lg.replaceChildren(...CS.REGIONS.filter((r) => !only || only.includes(r)).map((r) => el('span', { class: 'k' }, el('i', { class: kind, style: `background:${CS.regionColor(r)}` }), r)));
  const regionMedian = (key) => CS.REGIONS.map((r) => ({ key: r, label: r, color: CS.regionColor(r), values: CS.medianSeries(C.filter((c) => c.region === r), key) }));
  const L = CS.LAST, Y0 = CS.Y0, Y1 = CS.Y1;
  const first = (arr) => (CS.firstFinite(arr) || {}).v;
  const top = (key, n, dir = -1) => C.filter((c) => CS.isNum(c[key])).sort((a, b) => dir * (a[key] - b[key])).slice(0, n);
  const lifeOpts = { fmt: M.life.fmt, tick: M.life.tick, metricLabel: M.life.label };
  const groupsFor = (key) => CS.REGIONS.map((r) => ({ key: r, color: CS.regionColor(r), items: C.filter((c) => c.region === r).map((c) => ({ label: c.name, v: c[key] })) }));
  const bubblePts = (yi) => C.map((c) => ({ id: c.iso3, label: c.name, x: c.series.gdp[yi], y: c.series.life[yi], size: c.series.pop[yi], region: c.region }));
  const scatterBase = {
    xLog: true, xFmt: M.gdp.fmt, xTick: M.gdp.tick, yFmt: (v) => v.toFixed(1) + ' yrs', yTick: (v) => v,
    xLabel: 'GDP per person (log scale) →', xLabelShort: 'GDP / person', yLabel: 'Life expectancy', sizeFmt: CS.fmtPop,
    xDomain: [d3.min(C, (c) => d3.min(c.series.gdp)), d3.max(C, (c) => d3.max(c.series.gdp))],
    yDomain: [d3.min(C, (c) => d3.min(c.series.life)), d3.max(C, (c) => d3.max(c.series.life))],
    sizeMax: d3.max(C, (c) => c.pop),
  };

  /* ---------- sections ---------- */
  const SECTIONS = [
    {
      id: 'tiles', title: 'Stat tiles', layout: 'tiles',
      lede: 'The headline numbers at the top of each view. All four can live in one row; the question is which treatment is the default.',
      variants: [
        { name: 'Number + change', best: 'Fastest to scan; works for any figure.', build: (h) => { const s = CS.medianSeries(C, 'life'); h.append(CS.kpi({ label: 'Median life expectancy', value: s[L].toFixed(1), unit: 'yrs', delta: { ...CS.deltaOf(s[L], s[0], M.life), ctx: `since ${Y0}` } })); } },
        { name: 'With sparkline', best: 'When the trend matters as much as the level.', build: (h) => { const s = CS.medianSeries(C, 'gdp'); h.append(CS.kpi({ variant: 'spark', label: 'Median GDP per person', value: M.gdp.fmt(s[L]), delta: { ...CS.deltaOf(s[L], s[0], M.gdp), ctx: `since ${Y0}` }, spark: s })); } },
        { name: 'With meter', best: 'Shares and percentages with a natural 100%.', build: (h) => { const s = CS.medianSeries(C, 'net'); const n = CS.lastFinite(s); h.append(CS.kpi({ variant: 'meter', label: 'Median internet use', value: Math.round(n.v) + '%', meter: { pct: n.v, text: `${Math.round(n.v)}% of people online in ${D.years[n.i]}, up from ${Math.round(s[0])}% in ${Y0}` } })); } },
        { name: 'With composition', best: 'Totals that split into regions or groups.', build: (h) => { h.append(CS.kpi({ variant: 'share', label: 'People covered', value: CS.fmtPop(d3.sum(C, (c) => c.pop)), unit: `in ${C.length} countries`, share: CS.REGIONS.map((r) => ({ label: r, color: CS.regionColor(r), v: d3.sum(C.filter((c) => c.region === r), (c) => c.pop) })) })); } },
      ],
    },
    {
      id: 'ranked', title: 'Ranked comparison',
      lede: 'Top and bottom lists by any indicator. Horizontal so country names stay readable on a phone.',
      variants: [
        { name: 'Bars', best: 'Default. One color, value at the tip.', build: (h) => chartCard(h, { title: 'Highest life expectancy', sub: 'Latest year, years', draw: (n, w) => CS.rankedBars(n, w, { variant: 'bar', rows: top('life', 10).map((c) => ({ label: c.short, name: c.name, value: c.life })), ...lifeOpts }) }) },
        { name: 'Lollipop', best: 'Lighter ink; good when values are close.', build: (h) => chartCard(h, { title: 'Highest GDP per person', sub: 'Latest year, int.-$ at PPP', draw: (n, w) => CS.rankedBars(n, w, { variant: 'lollipop', rows: top('gdp', 10).map((c) => ({ label: c.short, name: c.name, value: c.gdp })), fmt: M.gdp.fmt, metricLabel: M.gdp.label }) }) },
        { name: 'Region-colored + median line', best: 'When region mix is part of the story.', build: (h) => chartCard(h, { title: 'Highest CO₂ per person', sub: `Latest year, tonnes · line is the median of all ${C.length}`, legend: regionLegend('sw'), draw: (n, w) => CS.rankedBars(n, w, { variant: 'region', rows: top('co2', 10).map((c) => ({ label: c.short, name: c.name, value: c.co2, region: c.region })), fmt: M.co2.fmt, metricLabel: M.co2.label, ref: CS.median(C.map((c) => c.co2).filter(CS.isNum)), refLabel: 'Median' }) }) },
      ],
    },
    {
      id: 'distribution', title: 'Distribution (boxplots)',
      lede: 'How spread out countries are within each region. Same data, three levels of detail.',
      variants: [
        { name: 'Classic box', best: 'Compact summary; outliers as open dots.', build: (h) => chartCard(h, { title: 'Life expectancy by region', sub: 'Box = middle half · line = median', draw: (n, w) => CS.distribution(n, w, { variant: 'box', groups: groupsFor('life'), fmt: M.life.fmt, tick: M.life.tick }) }) },
        { name: 'Box + every country', best: 'Default. Shows sample size honestly.', build: (h) => chartCard(h, { title: 'Life expectancy by region', sub: 'Each dot is a country', draw: (n, w) => CS.distribution(n, w, { variant: 'dots', groups: groupsFor('life'), fmt: M.life.fmt, tick: M.life.tick }) }) },
        { name: 'Raincloud', best: 'Shape of the distribution; good on log scales.', build: (h) => chartCard(h, { title: 'GDP per person by region', sub: 'Log scale · curve shows where countries cluster', draw: (n, w) => CS.distribution(n, w, { variant: 'rain', groups: groupsFor('gdp'), fmt: M.gdp.fmt, tick: M.gdp.tick, log: true }) }) },
      ],
    },
    {
      id: 'trends', title: 'Trends over time',
      lede: 'Interactive line charts: drag or hover across the plot for a readout of every series at that year.',
      variants: [
        { name: 'Multi-line', best: 'Up to five series, labelled at the end.', build: (h) => chartCard(h, { title: 'Life expectancy, regional medians', sub: `${Y0}–${Y1}`, legend: regionLegend('ln'), draw: (n, w) => CS.lineChart(n, w, { variant: 'multi', series: regionMedian('life'), ...lifeOpts }) }) },
        {
          name: 'Highlight one', best: 'Many countries; one is the story. Tap a name.', build: (h) => {
            const st = { hl: 'KOR' };
            const peers = C.filter((c) => c.region === 'Asia').sort((a, b) => b.pop - a.pop).slice(0, 12);
            let rec;
            const legend = (lg) => {
              const render = () => lg.replaceChildren(...peers.map((c) => el('button', { type: 'button', class: 'k', 'aria-pressed': String(st.hl === c.iso3), onclick: () => { st.hl = c.iso3; render(); rec.redraw(); } }, el('i', { class: 'ln', style: `background:${st.hl === c.iso3 ? 'var(--accent)' : 'var(--axis)'}` }), c.short)));
              render();
              lg._render = render;
            };
            const out = chartCard(h, {
              title: 'Internet users in Asia', sub: '% of people, 12 most populous countries', legend,
              draw: (n, w, _b, lgTop) => CS.lineChart(n, w, {
                variant: 'emphasis', highlight: st.hl, onHighlight: (k) => { st.hl = k; lgTop._render(); rec.redraw(); },
                series: peers.map((c) => ({ key: c.iso3, label: c.short, values: c.series.net })), fmt: M.net.fmt, tick: M.net.tick, metricLabel: M.net.label,
              }),
            });
            rec = out.rec;
          },
        },
        { name: 'Small multiples', best: 'Comparing shapes without tangled lines.', build: (h) => chartCard(h, { title: 'CO₂ per person, regional medians', sub: 'Shared scale · tonnes', draw: (n, w) => CS.lineChart(n, w, { variant: 'small', series: regionMedian('co2'), fmt: M.co2.fmt, metricLabel: M.co2.label }) }) },
      ],
    },
    {
      id: 'relationships', title: 'Relationships (scatter & bubble)',
      lede: 'Two indicators against each other. Hover finds the nearest country, so small dots are easy to hit.',
      variants: [
        {
          name: 'Animated bubbles', best: `The “wow” chart: press play to watch ${Y0}→${Y1}.`, build: (h) => {
            const st = { yi: L, timer: null };
            const out_ = el('output', { text: String(Y1) });
            const slider = el('input', { type: 'range', id: 'g-year', min: 0, max: L, value: L, 'aria-label': 'Year' });
            const play = el('button', { type: 'button', class: 'btn primary', text: 'Play' });
            const controls = el('div', { class: 'row-controls' }, play, el('div', { class: 'range' }, slider, out_));
            let rec;
            const draw = (anim) => (n, w) => CS.scatter(n, w, { ...scatterBase, variant: 'bubble', points: bubblePts(st.yi), labels: ['CHN', 'IND', 'USA', 'NGA'], yearMark: String(Y0 + st.yi), animate: anim });
            const res = chartCard(h, { title: 'Income and life expectancy', sub: 'Bubble size is population', controls, legend: regionLegend('dt'), draw: (n, w) => draw(0)(n, w) });
            rec = res.rec;
            const step = (anim) => { out_.textContent = String(Y0 + st.yi); slider.value = st.yi; draw(anim)(res.box, res.box.clientWidth); };
            slider.addEventListener('input', () => { st.yi = +slider.value; step(120); });
            const stop = () => { clearInterval(st.timer); st.timer = null; play.textContent = 'Play'; };
            play.addEventListener('click', () => {
              if (st.timer) return stop();
              if (st.yi >= L) { st.yi = 0; step(0); }
              play.textContent = 'Pause';
              st.timer = setInterval(() => { if (st.yi >= L) return stop(); st.yi++; step(380); }, 400);
            });
          },
        },
        {
          name: 'Focus a region', best: 'Context in gray, one group in color.', build: (h) => {
            const st = { r: 'Africa' };
            let res;
            const seg = el('div', { class: 'seg' });
            const render = () => seg.replaceChildren(...CS.REGIONS.map((r) => el('button', { type: 'button', 'aria-pressed': String(st.r === r), text: r, onclick: () => { st.r = r; render(); res.rec.redraw(); } })));
            render();
            res = chartCard(h, { title: 'Income and life expectancy', sub: String(Y1), controls: seg, draw: (n, w) => CS.scatter(n, w, { ...scatterBase, variant: 'emphasis', focusRegion: st.r, points: bubblePts(L) }) });
          },
        },
        { name: 'Trend line', best: 'One clear takeaway, quantified.', build: (h) => chartCard(h, { title: 'Richer countries live longer', sub: `${Y1} · fitted on log income`, draw: (n, w) => CS.scatter(n, w, { ...scatterBase, variant: 'trend', points: bubblePts(L), labels: ['NGA', 'JPN', 'USA'] }) }) },
      ],
    },
    {
      id: 'maps', title: 'Maps', layout: 'wide',
      lede: 'Countries on a map. Real geography reads instantly; the tile grid gives small countries equal room, which matters on phones.',
      variants: [
        { name: 'Choropleth, smooth scale', best: 'Default world view. Pinch or ± to zoom.', build: (h) => chartCard(h, { title: 'Life expectancy', sub: 'Latest year, years', legendBelow: true, draw: (n, w, lg) => CS.worldMap(n, w, { variant: 'choropleth', value: (c) => c.life, fmt: M.life.fmt, metricLabel: M.life.label, legendEl: lg }) }) },
        { name: 'Choropleth, 5 classes', best: 'Easier to read exact bands.', build: (h) => chartCard(h, { title: 'GDP per person', sub: 'Latest year, five equal-count classes', legendBelow: true, draw: (n, w, lg) => CS.worldMap(n, w, { variant: 'binned', value: (c) => c.gdp, fmt: M.gdp.fmt, metricLabel: M.gdp.label, legendEl: lg }) }) },
        { name: 'Tile grid', best: 'Every country the same size; great on mobile.', build: (h) => chartCard(h, { title: 'Internet users', sub: 'Latest year · approximate geography', legendBelow: true, draw: (n, w, lg) => CS.worldMap(n, w, { variant: 'tiles', value: (c) => c.net, fmt: M.net.fmt, metricLabel: M.net.label, legendEl: lg }) }) },
        { name: 'Bubble map', best: 'Size by population, color by indicator.', build: (h) => chartCard(h, { title: 'CO₂ per person, sized by population', sub: 'Latest year', legendBelow: true, draw: (n, w, lg) => CS.worldMap(n, w, { variant: 'bubbles', value: (c) => c.co2, fmt: M.co2.fmt, metricLabel: M.co2.label, log: true, legendEl: lg }) }) },
      ],
    },
    {
      id: 'change', title: 'Change between two years',
      lede: 'Before and after, per country.',
      variants: [
        { name: 'Dumbbell', best: 'Default. Shows both levels and the gap.', build: (h) => chartCard(h, { title: `Life expectancy, ${Y0} → latest`, sub: '10 most populous countries', legend: (lg) => lg.replaceChildren(el('span', { class: 'k' }, el('i', { class: 'dt', style: 'background:var(--surface);box-shadow:inset 0 0 0 2px var(--muted)' }), String(Y0)), el('span', { class: 'k' }, el('i', { class: 'dt', style: 'background:var(--accent)' }), 'Latest')), draw: (n, w) => CS.change(n, w, { variant: 'dumbbell', rows: top('pop', 10).map((c) => ({ label: c.short, a: first(c.series.life), b: c.life })).sort((a, b) => b.b - a.b), ...lifeOpts, aLabel: String(Y0), bLabel: 'Latest' }) }) },
        { name: 'Slope chart', best: 'Who overtook whom.', build: (h) => chartCard(h, { title: `Life expectancy, ${Y0} → latest`, sub: 'Africa and Asia, 8 most populous', legend: regionLegend('ln', ['Africa', 'Asia']), draw: (n, w) => CS.change(n, w, { variant: 'slope', height: 320, rows: C.filter((c) => c.region === 'Africa' || c.region === 'Asia').sort((a, b) => b.pop - a.pop).slice(0, 8).map((c) => ({ label: c.short, a: first(c.series.life), b: c.life, region: c.region })), ...lifeOpts, aLabel: String(Y0), bLabel: 'Latest' }) }) },
        { name: 'Change bars', best: 'Only the change matters; sign at a glance.', build: (h) => chartCard(h, { title: `CO₂ per person, change since ${Y0}`, sub: 'Tonnes · warm = more emissions · 10 most populous', draw: (n, w) => CS.change(n, w, { variant: 'delta', rows: top('pop', 10).map((c) => ({ label: c.short, a: first(c.series.co2), b: c.co2 })).sort((a, b) => (b.b - b.a) - (a.b - a.a)), fmt: M.co2.fmt, dfmt: (v) => Math.abs(v) < 10 ? v.toFixed(1) : v.toFixed(0), invert: true, aLabel: String(Y0), bLabel: 'Latest' }) }) },
      ],
    },
    {
      id: 'heatmap', title: 'Heatmap (country × year)', layout: 'wide',
      lede: 'Dense history for many countries at once.',
      variants: [
        { name: 'Level', best: 'Where each country stands each year.', build: (h) => chartCard(h, { title: 'Life expectancy', sub: `${Y0}–${Y1}, years`, legendBelow: true, draw: (n, w, lg) => CS.heatmap(n, w, { variant: 'seq', rows: top('pop', 12).map((c) => ({ label: c.short, values: c.series.life })), ...lifeOpts, legendEl: lg }) }) },
        { name: 'Change since 2000', best: 'Gains and losses; two-sided color.', build: (h) => chartCard(h, { title: `CO₂ per person, change since ${Y0}`, sub: 'Tonnes per person · warm = more emissions', legendBelow: true, draw: (n, w, lg) => CS.heatmap(n, w, { variant: 'div', rows: top('pop', 12).map((c) => ({ label: c.short, values: c.series.co2 })), fmt: M.co2.fmt, dfmt: (v) => v.toFixed(1), invert: true, metricLabel: M.co2.label, legendEl: lg }) }) },
      ],
    },
    {
      id: 'tables', title: 'Tables', layout: 'wide',
      lede: 'Sortable. Scrolls sideways inside its card on small screens.',
      variants: [
        { name: 'Comfortable', best: 'Inline bars and trends; reads like a chart.', build: (h) => { const card = el('article', { class: 'card' }, el('div', { class: 'card-head' }, el('div', {}, el('h3', { class: 'card-title', text: 'Life expectancy' }), el('p', { class: 'card-sub', text: 'Tap a column to sort' })))); h.append(card); CS.table(card, { rows: C, metric: 'life', variant: 'comfortable', limit: 8 }); } },
        { name: 'Dense', best: 'Many columns for analysts; zebra rows.', build: (h) => { const card = el('article', { class: 'card' }, el('div', { class: 'card-head' }, el('div', {}, el('h3', { class: 'card-title', text: 'Internet users' }), el('p', { class: 'card-sub', text: 'Tap a column to sort' })))); h.append(card); CS.table(card, { rows: C, metric: 'net', variant: 'dense', limit: 8 }); } },
      ],
    },
    {
      id: 'controls', title: 'Filters & controls',
      lede: 'One filter row sits above everything it scopes. These are the building blocks for that row.',
      variants: [
        { name: 'Chips + segmented', best: 'Everything visible; one tap. Desktop + tablet.', build: (h) => { const st = { metric: 'life' }; const sel = new Set(CS.REGIONS); const card = el('article', { class: 'card' }); h.append(card); CS.metricSeg(card, st, () => {}); CS.regionChips(card, sel, () => {}); } },
        { name: 'Compact selects', best: 'Saves space on phones; native pickers.', build: (h) => {
          const st = { metric: 'gdp' };
          const card = el('article', { class: 'card' });
          const row = el('div', { class: 'row-controls' });
          CS.metricSelect(row, st, () => {}, 'g-metric');
          row.append(el('select', { class: 'select', id: 'g-region', 'aria-label': 'Region' }, el('option', { text: 'All regions' }), ...CS.REGIONS.map((r) => el('option', { text: r }))));
          row.append(el('select', { class: 'select', id: 'g-yr', 'aria-label': 'Year' }, ...D.years.slice().reverse().map((y) => el('option', { text: String(y) }))));
          card.append(row);
          h.append(card);
        } },
        { name: 'Year slider + search', best: 'Time travel and jump-to-country.', build: (h) => {
          const card = el('article', { class: 'card' });
          const o = el('output', { text: String(Y1) });
          const r = el('input', { type: 'range', id: 'g-year2', min: Y0, max: Y1, value: Y1, 'aria-label': 'Year', oninput: (e) => { o.textContent = e.target.value; } });
          const list = el('datalist', { id: 'g-countries' }, ...C.map((c) => el('option', { value: c.name })));
          card.append(el('div', { class: 'row-controls' }, el('button', { type: 'button', class: 'btn', text: '▶ Play' }), el('div', { class: 'range' }, r, o)));
          card.append(el('input', { class: 'search', id: 'g-search', type: 'search', list: 'g-countries', placeholder: 'Find a country', 'aria-label': 'Find a country' }), list);
          h.append(card);
        } },
      ],
    },
    {
      id: 'profile', title: 'Country profile', layout: 'wide',
      lede: 'The page you land on after tapping a country.',
      variants: [
        { name: 'Compact card', best: 'Four indicators, each with its trend.', build: (h) => h.append(CS.profile(D.byIso.BRA, 'compact')) },
        { name: 'Hero figure', best: 'One lead number, then the supporting stats.', build: (h) => h.append(CS.profile(D.byIso.KOR, 'hero')) },
      ],
    },
  ];

  const LETTERS = 'ABCDEFG';

  /* ---------- render ---------- */
  const toc = $('toc');
  const host = $('sections');
  SECTIONS.forEach((s) => {
    toc.append(el('a', { href: '#' + s.id, 'data-id': s.id, text: s.title.replace(/ \(.*\)/, '') }));
    const sec = el('section', { class: 'sec', id: s.id, 'aria-labelledby': s.id + '-h' },
      el('div', { class: 'sec-head' }, el('h2', { class: 'h2', id: s.id + '-h', text: s.title }), el('p', { class: 'lede', text: s.lede })));
    const grid = el('div', { class: 'variants ' + (s.layout || '') });
    sec.append(grid);
    host.append(sec);
    s.variants.forEach((v, i) => {
      const wrap = el('div', { class: 'variant' });
      wrap.append(el('div', { class: 'vhead' }, el('div', { class: 'vname' }, el('span', { class: 'vletter', text: LETTERS[i] }), el('span', { class: 'vtitle', text: v.name }))));
      wrap.append(el('p', { class: 'vbest', text: v.best }));
      grid.append(wrap);
      v.build(wrap);
    });
  });

  $('foot').replaceChildren(el('span', { text: `${D.note} Latest available year per country. Built ${D.generated}. ` }), el('a', { class: 'nextlink', href: (window.CS_LINKS || {}).themes || 'index.html', text: 'Open the world overview' }));
  if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView(), 50); }
})();
