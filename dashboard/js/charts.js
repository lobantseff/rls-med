/* Chart components. Each takes (el, width, options) and renders an SVG into el.
 * Colors always come from CSS tokens so a skin switch only needs a redraw. */
(function () {
  const CS = window.CS;
  const YEARS = window.CS_DATA.years;
  const NS = 'http://www.w3.org/2000/svg';

  const numFont = () => CS.css('--font-num');
  function empty(el, msg) { el.replaceChildren(CS.el('p', { class: 'cs-empty', text: msg })); }
  const tickSize = 11;

  function hitTarget(sel, onEnter) {
    sel.attr('data-tip-target', '').attr('tabindex', 0)
      .on('pointerenter pointermove', onEnter)
      .on('focus', onEnter)
      .on('pointerleave blur', CS.hideTip);
  }

  function xTicksLinear(scale, n) { return scale.ticks(n); }
  function logTicks(scale, w) {
    const [a, b] = scale.domain();
    const all = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];
    let t = all.filter((v) => v >= a && v <= b);
    if (w < 460) t = t.filter((v) => /^10*$/.test(String(v)));
    else if (w < 700) t = t.filter((v) => /^(1|5)0*$/.test(String(v)));
    return t;
  }

  function gridX(g, scale, ticks, y0, y1, fmt) {
    const t = g.append('g').attr('class', 'cs-axis');
    t.selectAll('line').data(ticks).join('line')
      .attr('x1', (d) => scale(d) + 0.5).attr('x2', (d) => scale(d) + 0.5)
      .attr('y1', y0).attr('y2', y1).attr('stroke', 'var(--grid)');
    t.selectAll('text').data(ticks).join('text')
      .attr('x', (d) => scale(d)).attr('y', y1 + 16).attr('text-anchor', 'middle')
      .attr('class', 'cs-tick').text(fmt);
    return t;
  }
  function gridY(g, scale, ticks, x0, x1, fmt) {
    const t = g.append('g').attr('class', 'cs-axis');
    t.selectAll('line').data(ticks).join('line')
      .attr('x1', x0).attr('x2', x1)
      .attr('y1', (d) => Math.round(scale(d)) + 0.5).attr('y2', (d) => Math.round(scale(d)) + 0.5)
      .attr('stroke', 'var(--grid)');
    t.selectAll('text').data(ticks).join('text')
      .attr('x', x0 - 8).attr('y', (d) => scale(d) + 4).attr('text-anchor', 'end')
      .attr('class', 'cs-tick').text(fmt);
    return t;
  }

  /* ======================================================================
   * Ranked horizontal bars
   * o.rows [{id,label,value,region}], o.fmt, o.variant 'bar'|'lollipop'|'region',
   * o.ref (number), o.refLabel
   * ==================================================================== */
  CS.rankedBars = (el, w, o) => {
    const rows = o.rows.filter((r) => CS.isNum(r.value));
    if (!rows.length) return empty(el, 'No data for this selection');
    const rowH = o.rowH || 28;
    const barH = 14;
    const top = o.ref != null ? 24 : 4;
    const labelW = Math.ceil(Math.max(...rows.map((r) => CS.textW(r.label, 12)))) + 12;
    const valueW = Math.ceil(Math.max(...rows.map((r) => CS.textW(o.fmt(r.value), 12, numFont())))) + 10;
    const h = top + rows.length * rowH + 2;
    const max = o.max || d3.max(rows, (r) => r.value) || 1;
    const x = d3.scaleLinear([0, max], [labelW, w - valueW]);
    const svg = CS.svg(el, w, h, o.title);
    const color = (r) => (o.highlight ? (r.id === o.highlight ? 'var(--accent)' : 'var(--axis)') : o.variant === 'region' ? CS.regionColor(r.region) : o.color || 'var(--accent)');

    svg.append('line').attr('x1', labelW + 0.5).attr('x2', labelW + 0.5).attr('y1', top - 2).attr('y2', h)
      .attr('stroke', 'var(--axis)');

    const g = svg.selectAll('g.row').data(rows).join('g').attr('class', 'row')
      .attr('transform', (d, i) => `translate(0,${top + i * rowH})`);
    g.append('text').attr('x', labelW - 8).attr('y', rowH / 2 + 4).attr('text-anchor', 'end')
      .attr('class', (d) => 'cs-label' + (o.highlight && d.id === o.highlight ? ' cs-strong' : '')).text((d) => d.label);
    if (o.variant === 'lollipop') {
      g.append('line').attr('x1', labelW).attr('x2', (d) => x(d.value)).attr('y1', rowH / 2).attr('y2', rowH / 2)
        .attr('stroke', color).attr('stroke-width', 2).attr('stroke-linecap', 'round');
      g.append('circle').attr('cx', (d) => x(d.value)).attr('cy', rowH / 2).attr('r', 5.5)
        .attr('fill', color).attr('stroke', 'var(--surface)').attr('stroke-width', 2);
    } else {
      g.append('path').attr('class', 'cs-mark')
        .attr('d', (d) => CS.barPathH(labelW + 1, (rowH - barH) / 2, x(d.value), barH)).attr('fill', color);
    }
    g.append('text').attr('x', (d) => x(d.value) + (o.variant === 'lollipop' ? 10 : 6)).attr('y', rowH / 2 + 4)
      .attr('class', 'cs-value').text((d) => o.fmt(d.value));

    if (o.ref != null) {
      const rx = x(o.ref);
      svg.append('line').attr('x1', rx + 0.5).attr('x2', rx + 0.5).attr('y1', top - 6).attr('y2', h)
        .attr('stroke', 'var(--ink-2)').attr('stroke-width', 1);
      const lab = `${o.refLabel || 'Median'} ${o.fmt(o.ref)}`;
      const lw = CS.textW(lab, 11);
      svg.append('text').attr('x', Math.min(Math.max(rx, labelW + lw / 2), w - lw / 2 - 2)).attr('y', 12)
        .attr('text-anchor', 'middle').attr('class', 'cs-note').text(lab);
    }
    hitTarget(g.append('rect').attr('x', 0).attr('width', w).attr('height', rowH).attr('fill', 'transparent'),
      function (e, d) {
        d3.select(this.parentNode).classed('is-hot', true);
        CS.showTip(e, d.name || d.label, [{ value: o.fmt(d.value), label: o.metricLabel || '', color: color(d), key: 'dot' }, ...(d.region ? [{ value: d.region, label: '' }] : [])]);
      });
    g.select('rect').on('pointerleave.hot blur.hot', function () { d3.select(this.parentNode).classed('is-hot', false); });
  };

  /* ======================================================================
   * Distribution by group (horizontal)
   * o.groups [{key,color,items:[{label,v}]}], o.fmt, o.tick, o.log,
   * o.variant 'box'|'dots'|'rain'
   * ==================================================================== */
  function quantiles(vals) {
    const s = vals.slice().sort((a, b) => a - b);
    const q = (p) => d3.quantileSorted(s, p);
    const q1 = q(0.25), med = q(0.5), q3 = q(0.75), iqr = q3 - q1;
    const lo = d3.min(s.filter((v) => v >= q1 - 1.5 * iqr));
    const hi = d3.max(s.filter((v) => v <= q3 + 1.5 * iqr));
    return { q1, med, q3, lo, hi, n: s.length };
  }
  function jitter(label, i) {
    let h = 0; for (const ch of label) h = (h * 31 + ch.charCodeAt(0)) | 0;
    return (((h >>> 0) % 1000) / 1000 - 0.5) + (i % 2 ? 0.08 : -0.08);
  }
  CS.distribution = (el, w, o) => {
    const v = o.variant || 'box';
    o = { ...o, groups: o.groups.map((g) => ({ ...g, items: g.items.filter((d) => CS.isNum(d.v)) })).filter((g) => g.items.length) };
    if (!o.groups.length) return empty(el, 'No data for this selection');
    const rowH = v === 'rain' ? 70 : v === 'dots' ? 52 : 42;
    const labelW = Math.ceil(Math.max(...o.groups.map((g) => CS.textW(g.key, 12)))) + 14;
    const top = 6, bottom = 26, right = 14;
    const h = top + o.groups.length * rowH + bottom;
    const all = o.groups.flatMap((g) => g.items.map((d) => d.v));
    const ext = d3.extent(all);
    const x = o.log
      ? d3.scaleLog([ext[0] * 0.8, ext[1] * 1.2], [labelW, w - right])
      : d3.scaleLinear(ext, [labelW, w - right]).nice();
    const svg = CS.svg(el, w, h, o.title);
    const ticks = o.log ? logTicks(x, w) : x.ticks(w < 420 ? 4 : 7);
    gridX(svg, x, ticks, top, h - bottom, o.tick || o.fmt);

    o.groups.forEach((grp, gi) => {
      const cy = top + gi * rowH + rowH / 2;
      const g = svg.append('g');
      const st = quantiles(grp.items.map((d) => d.v));
      const col = grp.color;
      g.append('text').attr('x', labelW - 10).attr('y', cy + 4).attr('text-anchor', 'end').attr('class', 'cs-label').text(grp.key);

      const boxH = v === 'box' ? 16 : v === 'dots' ? 12 : 6;
      const by = v === 'rain' ? cy + 4 : cy;

      if (v === 'rain') {
        // Half-violin (kernel density in pixel space) above the axis line.
        const px = grp.items.map((d) => x(d.v));
        const bw = Math.max(10, (w - labelW) / 16);
        const xs = d3.range(d3.min(px) - bw, d3.max(px) + bw, 2);
        const k = (u) => (Math.abs(u) <= 1 ? 0.75 * (1 - u * u) : 0);
        const dens = xs.map((xx) => [xx, d3.sum(px, (p) => k((xx - p) / bw)) / (px.length * bw)]);
        const dmax = d3.max(dens, (d) => d[1]);
        const area = d3.area().x((d) => d[0]).y0(cy - 2).y1((d) => cy - 2 - (d[1] / dmax) * (rowH * 0.42)).curve(d3.curveBasis);
        g.append('path').attr('d', area(dens)).attr('fill', col).attr('fill-opacity', 0.22).attr('stroke', col).attr('stroke-width', 1.5);
      }

      // Whiskers
      g.append('line').attr('x1', x(st.lo)).attr('x2', x(st.hi)).attr('y1', by).attr('y2', by)
        .attr('stroke', v === 'rain' ? 'var(--ink-2)' : 'var(--muted)').attr('stroke-width', v === 'rain' ? 1.5 : 1.5);
      if (v === 'box') {
        [st.lo, st.hi].forEach((e) => g.append('line').attr('x1', x(e)).attr('x2', x(e)).attr('y1', by - 5).attr('y2', by + 5).attr('stroke', 'var(--muted)').attr('stroke-width', 1.5));
      }
      // Box
      g.append('rect').attr('x', x(st.q1)).attr('width', Math.max(2, x(st.q3) - x(st.q1)))
        .attr('y', by - boxH / 2).attr('height', boxH).attr('rx', Math.min(4, boxH / 2))
        .attr('fill', v === 'rain' ? 'var(--ink-2)' : col).attr('fill-opacity', v === 'box' ? 0.28 : v === 'dots' ? 0.16 : 0.9);
      // Median
      if (v === 'rain') {
        g.append('circle').attr('cx', x(st.med)).attr('cy', by).attr('r', 4.5).attr('fill', 'var(--surface)').attr('stroke', 'var(--ink)').attr('stroke-width', 2);
      } else {
        g.append('line').attr('x1', x(st.med)).attr('x2', x(st.med)).attr('y1', by - boxH / 2 - 2).attr('y2', by + boxH / 2 + 2)
          .attr('stroke', 'var(--ink)').attr('stroke-width', 2.5).attr('stroke-linecap', 'round');
      }
      const boxHit = g.append('rect').attr('x', x(st.lo) - 4).attr('width', x(st.hi) - x(st.lo) + 8)
        .attr('y', by - Math.max(12, boxH / 2 + 4)).attr('height', Math.max(24, boxH + 8)).attr('fill', 'transparent');
      hitTarget(boxHit, (e) => CS.showTip(e, `${grp.key} · ${st.n} countries`, [
        { value: o.fmt(st.med), label: 'median', color: col, key: 'dot' },
        { value: `${o.fmt(st.q1)} – ${o.fmt(st.q3)}`, label: 'middle half' },
        { value: `${o.fmt(d3.min(grp.items, (d) => d.v))} – ${o.fmt(d3.max(grp.items, (d) => d.v))}`, label: 'full range' },
      ]));

      // Points
      let pts = [];
      if (v === 'box') pts = grp.items.filter((d) => d.v < st.lo || d.v > st.hi);
      else pts = grp.items;
      const spread = v === 'dots' ? rowH * 0.34 : v === 'rain' ? rowH * 0.14 : 0;
      const baseY = v === 'rain' ? cy + 18 : cy;
      const dots = g.selectAll('circle.pt').data(pts).join('circle').attr('class', 'pt')
        .attr('cx', (d) => x(d.v)).attr('cy', (d, i) => baseY + jitter(d.label, i) * spread * 2)
        .attr('r', v === 'box' ? 3.5 : v === 'rain' ? 3.2 : 4.5)
        .attr('fill', v === 'box' ? 'var(--surface)' : col)
        .attr('stroke', v === 'box' ? col : 'var(--surface)').attr('stroke-width', v === 'box' ? 1.5 : 1.5);
      // Bigger invisible hit areas so dots are easy to hit with a finger.
      hitTarget(g.selectAll('circle.hit').data(pts).join('circle').attr('class', 'hit')
        .attr('cx', (d) => x(d.v)).attr('cy', (d, i) => baseY + jitter(d.label, i) * spread * 2).attr('r', 9).attr('fill', 'transparent'),
      function (e, d) { CS.showTip(e, d.label, [{ value: o.fmt(d.v), label: grp.key, color: col, key: 'dot' }]); });
    });
  };

  /* ======================================================================
   * Time series
   * o.series [{key,label,color,values}], o.fmt, o.tick, o.log,
   * o.variant 'multi'|'emphasis'|'small'|'area', o.highlight, o.onHighlight
   * ==================================================================== */
  CS.lineChart = (el, w, o) => {
    if (o.variant === 'small') return smallMultiples(el, w, o);
    const v = o.variant || 'multi';
    const series = o.series;
    const h = o.height || (w < 520 ? 230 : 290);
    const allVals = series.flatMap((s) => s.values).filter(CS.isNum);
    if (!allVals.length) return empty(el, 'No data for this selection');
    const y0 = o.log ? d3.scaleLog().domain(d3.extent(allVals)).nice() : d3.scaleLinear().domain([o.zero ? 0 : d3.min(allVals), d3.max(allVals)]).nice();
    const ticksY = o.log ? logTicks(y0, 300) : y0.ticks(5);
    const left = Math.ceil(Math.max(...ticksY.map((t) => CS.textW((o.tick || o.fmt)(t), tickSize, numFont())))) + 12;
    const showEnd = v !== 'area' && w >= 420;
    const labelled = (v === 'emphasis' ? series.filter((s) => s.key === o.highlight) : series).filter((s) => CS.lastFinite(s.values));
    const endW = showEnd ? Math.ceil(Math.max(...labelled.map((s) => CS.textW(s.label, 12)))) + 22 : 12;
    const m = { t: 12, r: endW, b: 28, l: left };
    const x = d3.scaleLinear([YEARS[0], YEARS[YEARS.length - 1]], [m.l, w - m.r]);
    const y = y0.range([h - m.b, m.t]);
    const svg = CS.svg(el, w, h, o.title);
    gridY(svg, y, ticksY, m.l, w - m.r, o.tick || o.fmt);
    const xt = w < 420 ? [2000, 2010, 2020] : [2000, 2005, 2010, 2015, 2020];
    const ax = svg.append('g').attr('class', 'cs-axis');
    ax.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', h - m.b + 0.5).attr('y2', h - m.b + 0.5).attr('stroke', 'var(--axis)');
    ax.selectAll('text').data(xt).join('text').attr('x', (d) => x(d)).attr('y', h - m.b + 18).attr('text-anchor', 'middle').attr('class', 'cs-tick').text((d) => d);

    const line = d3.line().defined(CS.isNum).x((d, i) => x(YEARS[i])).y((d) => y(d)).curve(d3.curveMonotoneX);
    const order = v === 'emphasis' ? [...series.filter((s) => s.key !== o.highlight), ...series.filter((s) => s.key === o.highlight)] : series;
    const colorOf = (s) => (v === 'emphasis' ? (s.key === o.highlight ? 'var(--accent)' : 'var(--axis)') : s.color);

    if (v === 'area') {
      const s = series[0];
      const area = d3.area().defined(CS.isNum).x((d, i) => x(YEARS[i])).y0(h - m.b).y1((d) => y(d)).curve(d3.curveMonotoneX);
      svg.append('path').attr('d', area(s.values)).attr('fill', s.color).attr('fill-opacity', 0.12);
    }
    const paths = svg.append('g').selectAll('path').data(order).join('path')
      .attr('d', (s) => line(s.values)).attr('fill', 'none').attr('stroke', colorOf)
      .attr('stroke-width', (s) => (v === 'emphasis' && s.key === o.highlight ? 2.5 : v === 'emphasis' ? 1.25 : 2))
      .attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round');
    if (v === 'emphasis' && o.onHighlight) {
      svg.append('g').selectAll('path').data(order).join('path').attr('d', (s) => line(s.values))
        .attr('fill', 'none').attr('stroke', 'transparent').attr('stroke-width', 14).style('cursor', 'pointer')
        .on('click', (e, s) => o.onHighlight(s.key));
    }

    // End markers + direct labels
    const last = YEARS.length - 1;
    const ends = labelled.map((s) => { const lf = CS.lastFinite(s.values); return { s, i: lf.i, y: y(lf.v), ty: y(lf.v) }; });
    svg.append('g').selectAll('circle').data(ends).join('circle')
      .attr('cx', (d) => x(YEARS[d.i])).attr('cy', (d) => d.y).attr('r', 4.5)
      .attr('fill', (d) => colorOf(d.s)).attr('stroke', 'var(--surface)').attr('stroke-width', 2);
    if (showEnd) {
      ends.sort((a, b) => a.y - b.y);
      for (let it = 0; it < 30; it++) for (let i = 1; i < ends.length; i++) {
        const d = ends[i].ty - ends[i - 1].ty;
        if (d < 14) { const p = (14 - d) / 2; ends[i].ty += p; ends[i - 1].ty -= p; }
      }
      const lx = x(YEARS[last]) + 8;
      const lg = svg.append('g');
      ends.forEach((d) => {
        if (Math.abs(d.ty - d.y) > 3) lg.append('path').attr('d', `M${lx - 2},${d.y}L${lx + 4},${d.ty}`).attr('stroke', 'var(--axis)').attr('fill', 'none');
        lg.append('text').attr('x', lx + 6).attr('y', d.ty + 4).attr('class', 'cs-label').text(d.s.label);
      });
    }

    // Crosshair + one tooltip for every series at the hovered year
    const cross = svg.append('line').attr('y1', m.t).attr('y2', h - m.b).attr('stroke', 'var(--ink-2)').attr('stroke-width', 1).style('display', 'none');
    const dots = svg.append('g').style('display', 'none');
    const overlay = svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', w - m.l - m.r).attr('height', h - m.t - m.b)
      .attr('fill', 'transparent').attr('data-tip-target', '').style('touch-action', 'pan-y');
    function move(e) {
      const [px] = d3.pointer(e, svg.node());
      const i = Math.max(0, Math.min(last, Math.round(x.invert(px) - YEARS[0])));
      const cx = x(YEARS[i]);
      cross.style('display', null).attr('x1', cx).attr('x2', cx);
      dots.style('display', null).selectAll('circle').data(order.filter((s) => CS.isNum(s.values[i]))).join('circle').attr('cx', cx).attr('cy', (s) => y(s.values[i]))
        .attr('r', 4).attr('fill', colorOf).attr('stroke', 'var(--surface)').attr('stroke-width', 2);
      const rows = series.map((s) => ({ value: o.fmt(s.values[i]), label: s.label, color: colorOf(s), _v: CS.isNum(s.values[i]) ? s.values[i] : -Infinity }))
        .sort((a, b) => b._v - a._v);
      CS.showTip(e, String(YEARS[i]), v === 'emphasis' ? rows.filter((r, k) => k < 6 || series.find((s) => s.label === r.label).key === o.highlight) : rows);
    }
    overlay.on('pointermove pointerdown', move).on('pointerleave', () => { cross.style('display', 'none'); dots.style('display', 'none'); CS.hideTip(); });
  };

  function smallMultiples(el, w, o) {
    el.replaceChildren();
    const cols = w < 480 ? 2 : w < 820 ? 3 : Math.min(5, o.series.length);
    const grid = CS.el('div', { class: 'cs-small-grid', style: `grid-template-columns:repeat(${cols},minmax(0,1fr))` });
    el.append(grid);
    const all = o.series.flatMap((s) => s.values).filter(CS.isNum);
    const yd = d3.extent(all);
    const gap = 12;
    const pw = Math.floor((w - gap * (cols - 1)) / cols);
    const ph = 96;
    o.series.forEach((s) => {
      const cell = CS.el('div', { class: 'cs-small' });
      const head = CS.el('div', { class: 'cs-small-head' }, CS.el('span', { class: 'cs-small-name', text: s.label }), CS.el('span', { class: 'cs-small-val', text: o.fmt((CS.lastFinite(s.values) || {}).v) }));
      cell.append(head);
      const box = CS.el('div');
      cell.append(box);
      grid.append(cell);
      const m = { t: 6, r: 6, b: 18, l: 4 };
      const x = d3.scaleLinear([YEARS[0], YEARS[YEARS.length - 1]], [m.l, pw - m.r]);
      const y = (o.log ? d3.scaleLog() : d3.scaleLinear()).domain(yd).range([ph - m.b, m.t]);
      const svg = CS.svg(box, pw, ph, s.label);
      y.ticks(3).forEach((t) => svg.append('line').attr('x1', m.l).attr('x2', pw - m.r).attr('y1', Math.round(y(t)) + 0.5).attr('y2', Math.round(y(t)) + 0.5).attr('stroke', 'var(--grid)'));
      svg.append('line').attr('x1', m.l).attr('x2', pw - m.r).attr('y1', ph - m.b + 0.5).attr('y2', ph - m.b + 0.5).attr('stroke', 'var(--axis)');
      [CS.Y0, CS.Y1].forEach((yr, k) => svg.append('text').attr('x', x(yr)).attr('y', ph - 4).attr('text-anchor', k ? 'end' : 'start').attr('class', 'cs-tick').text(yr));
      const area = d3.area().defined(CS.isNum).x((d, i) => x(YEARS[i])).y0(ph - m.b).y1((d) => y(d)).curve(d3.curveMonotoneX);
      const line = d3.line().defined(CS.isNum).x((d, i) => x(YEARS[i])).y((d) => y(d)).curve(d3.curveMonotoneX);
      svg.append('path').attr('d', area(s.values)).attr('fill', s.color).attr('fill-opacity', 0.12);
      svg.append('path').attr('d', line(s.values)).attr('fill', 'none').attr('stroke', s.color).attr('stroke-width', 2);
      const L = s.values.length - 1;
      const lf = CS.lastFinite(s.values);
      if (lf) svg.append('circle').attr('cx', x(YEARS[lf.i])).attr('cy', y(lf.v)).attr('r', 4).attr('fill', s.color).attr('stroke', 'var(--surface)').attr('stroke-width', 2);
      const cross = svg.append('line').attr('y1', m.t).attr('y2', ph - m.b).attr('stroke', 'var(--ink-2)').style('display', 'none');
      svg.append('rect').attr('x', m.l).attr('y', 0).attr('width', pw - m.l - m.r).attr('height', ph - m.b).attr('fill', 'transparent')
        .attr('data-tip-target', '').style('touch-action', 'pan-y')
        .on('pointermove pointerdown', (e) => {
          const [px] = d3.pointer(e, svg.node());
          const i = Math.max(0, Math.min(L, Math.round(x.invert(px) - YEARS[0])));
          cross.style('display', null).attr('x1', x(YEARS[i])).attr('x2', x(YEARS[i]));
          CS.showTip(e, `${s.label} · ${YEARS[i]}`, [{ value: o.fmt(s.values[i]), label: o.metricLabel || '', color: s.color }]);
        })
        .on('pointerleave', () => { cross.style('display', 'none'); CS.hideTip(); });
    });
  }

  /* ======================================================================
   * Scatter / bubble
   * o.points [{id,label,x,y,size,region}], o.xFmt, o.yFmt, o.xLog,
   * o.variant 'bubble'|'emphasis'|'trend', o.focusRegion, o.labels [ids]
   * ==================================================================== */
  CS.scatter = (el, w, o) => {
    const v = o.variant || 'bubble';
    const h = o.height || Math.round(Math.min(440, Math.max(260, w * 0.6)));
    const pts = o.points.filter((d) => CS.isNum(d.x) && d.x > 0 && CS.isNum(d.y) && CS.isNum(d.size)).sort((a, b) => b.size - a.size);
    const xd = o.xDomain || d3.extent(pts, (d) => d.x);
    const yd = o.yDomain || d3.extent(pts, (d) => d.y);
    const x0 = o.xLog ? d3.scaleLog().domain([xd[0] * 0.85, xd[1] * 1.15]) : d3.scaleLinear().domain(xd).nice();
    const y0 = d3.scaleLinear().domain(yd).nice();
    const ticksY = y0.ticks(5);
    const m = { t: 14, r: 16, b: 40, l: Math.ceil(Math.max(...ticksY.map((t) => CS.textW(o.yTick(t), tickSize, numFont())))) + 12 };
    const x = x0.range([m.l, w - m.r]);
    const y = y0.range([h - m.b, m.t]);
    const rMax = v === 'bubble' ? (w < 500 ? 20 : 32) : 5;
    const r = v === 'bubble' ? d3.scaleSqrt([0, o.sizeMax || d3.max(pts, (d) => d.size)], [2.5, rMax]) : () => 5;
    const colorOf = (d) => {
      if (v === 'trend') return 'var(--accent)';
      if (v === 'emphasis') return d.region === o.focusRegion ? CS.regionColor(d.region) : 'var(--axis)';
      return CS.regionColor(d.region);
    };

    let svg = d3.select(el).select('svg');
    const reuse = o.animate && !svg.empty() && +svg.attr('width') === w && el.__scatterV === v;
    if (!reuse) {
      svg = CS.svg(el, w, h, o.title);
      el.__scatterV = v;
      gridY(svg, y, ticksY, m.l, w - m.r, o.yTick);
      const xt = o.xLog ? logTicks(x, w) : x.ticks(6);
      gridX(svg, x, xt, m.t, h - m.b, o.xTick).select('line'); // vertical grid
      svg.append('text').attr('x', w - m.r).attr('y', h - 4).attr('text-anchor', 'end').attr('class', 'cs-note').text(o.xLabel);
      svg.append('text').attr('x', m.l).attr('y', h - 4).attr('class', 'cs-note').text(o.yLabel ? `↑ ${o.yLabel}` : '');
      if (o.yearMark) svg.append('text').attr('class', 'cs-yearmark').attr('x', w - m.r - 4).attr('y', h - m.b - 10).attr('text-anchor', 'end');
      svg.append('g').attr('class', 'trend');
      svg.append('g').attr('class', 'dots');
      svg.append('g').attr('class', 'labels');
      svg.append('circle').attr('class', 'hot').attr('fill', 'none').attr('stroke', 'var(--ink)').attr('stroke-width', 2).style('display', 'none');
    }
    if (o.yearMark) svg.select('.cs-yearmark').text(o.yearMark);
    const dur = reuse ? o.animate : 0;

    const sel = svg.select('g.dots').selectAll('circle').data(pts, (d) => d.id);
    sel.join(
      (enter) => enter.append('circle').attr('cx', (d) => x(d.x)).attr('cy', (d) => y(d.y)).attr('r', (d) => r(d.size)),
    ).attr('fill', colorOf).attr('fill-opacity', v === 'bubble' ? 0.8 : 1)
      .attr('stroke', 'var(--surface)').attr('stroke-width', v === 'bubble' ? 1.5 : 2)
      .transition().duration(dur).ease(d3.easeLinear)
      .attr('cx', (d) => x(d.x)).attr('cy', (d) => y(d.y)).attr('r', (d) => r(d.size));
    if (v === 'emphasis') svg.select('g.dots').selectAll('circle').filter((d) => d.region === o.focusRegion).raise();
    svg.select('g.labels').raise();

    svg.select('g.trend').selectAll('*').remove();
    if (v === 'trend') {
      const lx = pts.map((d) => Math.log10(d.x)), ly = pts.map((d) => d.y);
      const mx = d3.mean(lx), my = d3.mean(ly);
      const b = d3.sum(lx, (a, i) => (a - mx) * (ly[i] - my)) / d3.sum(lx, (a) => (a - mx) ** 2);
      const a = my - b * mx;
      const [xa, xb] = x.domain();
      svg.select('g.trend').append('line').attr('x1', x(xa)).attr('x2', x(xb)).attr('y1', y(a + b * Math.log10(xa))).attr('y2', y(a + b * Math.log10(xb)))
        .attr('stroke', 'var(--ink-2)').attr('stroke-width', 1.5);
      svg.select('g.trend').append('text').attr('x', x(xb) - 4).attr('y', y(a + b * Math.log10(xb)) - 8).attr('text-anchor', 'end').attr('class', 'cs-note')
        .text(`+${b.toFixed(1)} yrs per 10× income`);
    }

    const labels = pts.filter((d) => (o.labels || []).slice(0, w < 500 ? 2 : 99).includes(d.id) || d.id === o.mark);
    let markG = svg.select('g.mark');
    if (markG.empty()) markG = svg.append('g').attr('class', 'mark');
    markG.selectAll('circle').data(pts.filter((d) => d.id === o.mark), (d) => d.id).join('circle')
      .attr('fill', 'var(--accent)').attr('stroke', 'var(--surface)').attr('stroke-width', 2.5).style('pointer-events', 'none')
      .attr('cx', (d) => x(d.x)).attr('cy', (d) => y(d.y)).attr('r', (d) => Math.max(7, r(d.size)));
    markG.raise();
    const flip = (d) => x(d.x) + r(d.size) + 6 + CS.textW(d.label, 12) > w - 2;
    svg.select('g.labels').selectAll('text').data(labels, (d) => d.id).join('text').attr('class', 'cs-label cs-halo')
      .transition().duration(dur).ease(d3.easeLinear)
      .attr('x', (d) => (flip(d) ? x(d.x) - r(d.size) - 4 : x(d.x) + r(d.size) + 4)).attr('y', (d) => y(d.y) + 4)
      .attr('text-anchor', (d) => (flip(d) ? 'end' : 'start')).text((d) => d.label);

    // Nearest-point hover (Delaunay) so small dots are easy to hit.
    const delaunay = d3.Delaunay.from(pts, (d) => x(d.x), (d) => y(d.y));
    let ov = svg.select('rect.ov');
    if (ov.empty()) ov = svg.append('rect').attr('class', 'ov').attr('fill', 'transparent').attr('data-tip-target', '').style('touch-action', 'pan-y');
    ov.attr('x', m.l).attr('y', m.t).attr('width', w - m.l - m.r).attr('height', h - m.t - m.b).raise();
    const hot = svg.select('circle.hot');
    ov.on('pointermove pointerdown', (e) => {
      const [px, py] = d3.pointer(e, svg.node());
      const d = pts[delaunay.find(px, py)];
      if (!d || Math.hypot(x(d.x) - px, y(d.y) - py) > Math.max(36, r(d.size) + 12)) { hot.style('display', 'none'); CS.hideTip(); return; }
      hot.style('display', null).attr('cx', x(d.x)).attr('cy', y(d.y)).attr('r', r(d.size) + 3);
      CS.showTip(e, d.label, [
        { value: o.yFmt(d.y), label: o.yLabel, color: colorOf(d), key: 'dot' },
        { value: o.xFmt(d.x), label: o.xLabelShort || o.xLabel },
        ...(o.sizeFmt ? [{ value: o.sizeFmt(d.size), label: 'people' }] : []),
      ]);
    }).on('pointerleave', () => { hot.style('display', 'none'); CS.hideTip(); });
  };

  /* ======================================================================
   * World maps
   * o.value(country)->number, o.fmt, o.log, o.variant 'choropleth'|'binned'|'tiles'|'bubbles'
   * o.dim (Set of iso3 to fade), returns legend info via o.legendEl
   * ==================================================================== */
  let features, land;
  function geo() {
    if (!features) {
      const W = window.WORLD_110M;
      features = topojson.feature(W, W.objects.countries).features.filter((f) => f.id !== '010');
      land = topojson.merge(W, W.objects.countries.geometries.filter((g) => g.id !== '010'));
    }
    return { features, land };
  }
  CS.colorScale = (o, values) => {
    const lo = CS.css('--seq-lo'), hi = CS.css('--seq-hi');
    const interp = d3.interpolateLab(lo, hi);
    const ext = d3.extent(values);
    if (o.variant === 'binned' || o.variant === 'tiles') {
      const n = 5;
      const s = d3.scaleQuantile(values, d3.range(n).map((i) => interp(0.08 + (i / (n - 1)) * 0.92)));
      s.kind = 'bins';
      return s;
    }
    const s = o.log ? d3.scaleSequentialLog(ext, interp) : d3.scaleSequential(ext, interp);
    s.kind = 'continuous';
    return s;
  };
  CS.mapLegend = (el, scale, o) => {
    el.replaceChildren();
    if (scale.kind === 'bins') {
      const q = scale.quantiles();
      const ext = d3.extent(scale.domain());
      const edges = [ext[0], ...q, ext[1]];
      scale.range().forEach((c, i) => el.append(CS.el('span', { class: 'cs-leg-item' }, CS.el('i', { class: 'cs-leg-sw', style: `background:${c}` }), `${o.fmt(edges[i])}–${o.fmt(edges[i + 1])}`)));
    } else {
      const [a, b] = scale.domain();
      const stops = d3.range(0, 1.01, 0.1).map((t) => scale.interpolator()(t)).join(',');
      el.append(CS.el('span', { class: 'cs-leg-ramp' }, CS.el('span', { class: 'cs-num', text: o.fmt(a) }), CS.el('i', { class: 'cs-leg-grad', style: `background:linear-gradient(90deg,${stops})` }), CS.el('span', { class: 'cs-num', text: o.fmt(b) })));
    }
    el.append(CS.el('span', { class: 'cs-leg-item' }, CS.el('i', { class: 'cs-leg-sw nodata' }), 'No data'));
  };

  CS.worldMap = (el, w, o) => {
    const v = o.variant || 'choropleth';
    if (v === 'tiles') return tileMap(el, w, o);
    const { features, land } = geo();
    const D = window.CS_DATA;
    const vals = D.countries.map(o.value).filter((v) => CS.isNum(v) && (!o.log || v > 0));
    const scale = CS.colorScale(o, vals);
    const color = (v) => (CS.isNum(v) && (!o.log || v > 0) ? scale(v) : 'var(--surface-2)');
    if (o.legendEl) CS.mapLegend(o.legendEl, scale, o);
    const h = Math.round(w / 2.1);
    const proj = d3.geoEqualEarth().fitExtent([[2, 2], [w - 2, h - 2]], { type: 'Sphere' });
    const path = d3.geoPath(proj);
    el.replaceChildren();
    el.classList.add('cs-map');
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('width', w).attr('height', h).attr('role', 'img').attr('aria-label', o.title || 'World map');
    const g = svg.append('g');
    g.append('path').attr('d', path({ type: 'Sphere' })).attr('fill', 'var(--surface-2)').attr('fill-opacity', 0.5).attr('stroke', 'var(--grid)');
    const dim = (c) => o.dim && c && o.dim.has(c.iso3);

    if (v === 'bubbles') {
      g.append('path').attr('d', path(land)).attr('fill', 'var(--surface-2)').attr('stroke', 'var(--axis)').attr('stroke-width', 0.4);
      const rs = d3.scaleSqrt([0, d3.max(D.countries, (c) => c.pop)], [2, w < 500 ? 18 : 30]);
      const items = D.countries.filter((c) => c.lat != null && CS.isNum(c.pop)).map((c) => {
        const [cx, cy] = proj([c.lon, c.lat]);
        return { c, cx, cy, r: rs(c.pop) };
      }).sort((a, b) => b.r - a.r);
      const dots = g.selectAll('circle').data(items).join('circle')
        .attr('cx', (d) => d.cx).attr('cy', (d) => d.cy).attr('r', (d) => d.r)
        .attr('fill', (d) => color(o.value(d.c))).attr('fill-opacity', (d) => (dim(d.c) ? 0.25 : 0.92)).attr('stroke', 'var(--surface)').attr('stroke-width', 1.2);
      hitTarget(dots, (e, d) => CS.showTip(e, d.c.name, [{ value: o.fmt(o.value(d.c)), label: o.metricLabel, color: color(o.value(d.c)), key: 'dot' }, { value: CS.fmtPop(d.c.pop), label: 'people' }]));
    } else {
      const shapes = g.selectAll('path.ctry').data(features).join('path').attr('class', 'ctry')
        .attr('d', path)
        .attr('fill', (f) => { const c = D.byId[f.id]; return c ? color(o.value(c)) : 'var(--surface-2)'; })
        .attr('fill-opacity', (f) => (dim(D.byId[f.id]) ? 0.25 : 1))
        .attr('stroke', 'var(--surface)').attr('stroke-width', 0.6).attr('vector-effect', 'non-scaling-stroke');
      hitTarget(shapes, function (e, f) {
        const c = D.byId[f.id];
        d3.select(this).raise().attr('stroke', 'var(--ink)').attr('stroke-width', 1.2);
        CS.showTip(e, c ? c.name : f.properties.name, c && CS.isNum(o.value(c)) ? [{ value: o.fmt(o.value(c)), label: o.metricLabel, color: color(o.value(c)), key: 'dot' }, { value: c.region, label: '' }] : [{ value: 'No data', label: '' }]);
      });
      shapes.on('pointerleave.s blur.s', function () { d3.select(this).attr('stroke', 'var(--surface)').attr('stroke-width', 0.6); });
    }

    // Zoom: buttons, mouse drag, trackpad pinch / ctrl+wheel, two-finger touch.
    const zoom = d3.zoom().scaleExtent([1, 8]).translateExtent([[0, 0], [w, h]])
      .filter((e) => (e.type === 'wheel' ? e.ctrlKey || e.metaKey : e.type.startsWith('touch') ? e.touches.length > 1 : !e.button))
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom).style('touch-action', 'pan-x pan-y');
    const ctl = CS.el('div', { class: 'cs-zoom' },
      CS.el('button', { type: 'button', 'aria-label': 'Zoom in', text: '+', onclick: () => svg.transition().duration(250).call(zoom.scaleBy, 1.8) }),
      CS.el('button', { type: 'button', 'aria-label': 'Zoom out', text: '−', onclick: () => svg.transition().duration(250).call(zoom.scaleBy, 1 / 1.8) }),
      CS.el('button', { type: 'button', 'aria-label': 'Reset zoom', text: '⟲', onclick: () => svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity) }));
    el.append(ctl);
  };

  let tileLayout;
  function tileMap(el, w, o) {
    const D = window.CS_DATA;
    if (!tileLayout) {
      const placed = D.countries.filter((c) => c.lat != null);
      const proj = d3.geoEqualEarth().fitWidth(Math.round(Math.max(26, Math.sqrt(placed.length) * 2.6)), { type: 'Sphere' });
      const taken = new Map();
      const items = placed.slice().sort((a, b) => b.pop - a.pop).map((c) => {
        const [px, py] = proj([c.lon, c.lat]);
        return { c, tx: px, ty: py * 1.25 };
      });
      // Place largest countries first, then spiral to the nearest free cell.
      for (const it of items) {
        let best = null;
        for (let rad = 0; rad < 20 && !best; rad++) {
          let bd = Infinity;
          for (let dx = -rad; dx <= rad; dx++) for (let dy = -rad; dy <= rad; dy++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== rad) continue;
            const cx = Math.round(it.tx) + dx, cy = Math.round(it.ty) + dy;
            if (taken.has(cx + ',' + cy)) continue;
            const dd = Math.hypot(cx - it.tx, cy - it.ty);
            if (dd < bd) { bd = dd; best = [cx, cy]; }
          }
        }
        taken.set(best.join(','), it);
        it.col = best[0]; it.row = best[1];
      }
      const c0 = d3.min(items, (d) => d.col), r0 = d3.min(items, (d) => d.row);
      items.forEach((d) => { d.col -= c0; d.row -= r0; });
      tileLayout = { items, cols: d3.max(items, (d) => d.col) + 1, rows: d3.max(items, (d) => d.row) + 1 };
    }
    const vals = D.countries.map(o.value).filter(CS.isNum);
    const scale = CS.colorScale({ ...o, variant: 'tiles' }, vals);
    const color = (v) => (CS.isNum(v) ? scale(v) : CS.css('--surface-2'));
    if (o.legendEl) CS.mapLegend(o.legendEl, scale, o);
    const gap = 3;
    const cell = Math.min(46, Math.floor((w + gap) / tileLayout.cols));
    const W = tileLayout.cols * cell, H = tileLayout.rows * cell;
    const ox = Math.floor((w - W) / 2);
    const svg = CS.svg(el, w, H, o.title || 'Tile map');
    const g = svg.selectAll('g').data(tileLayout.items).join('g').attr('transform', (d) => `translate(${ox + d.col * cell},${d.row * cell})`);
    g.append('rect').attr('width', cell - gap).attr('height', cell - gap).attr('rx', Math.min(6, parseFloat(CS.css('--radius-sm')) || 4))
      .attr('fill', (d) => color(o.value(d.c))).attr('fill-opacity', (d) => (o.dim && o.dim.has(d.c.iso3) ? 0.25 : 1));
    if (cell >= 24) {
      g.append('text').attr('x', (cell - gap) / 2).attr('y', (cell - gap) / 2 + 3.5).attr('text-anchor', 'middle')
        .attr('class', 'cs-tile-text').style('font-size', cell >= 34 ? '11px' : '9px')
        .attr('fill', (d) => CS.inkOn(color(o.value(d.c)))).text((d) => d.c.iso3);
    }
    hitTarget(g.append('rect').attr('width', cell).attr('height', cell).attr('fill', 'transparent'),
      (e, d) => CS.showTip(e, d.c.name, [{ value: o.fmt(o.value(d.c)), label: o.metricLabel, color: color(o.value(d.c)), key: 'dot' }, { value: d.c.region, label: '' }]));
  }

  /* ======================================================================
   * Change between two years
   * o.rows [{label,a,b,region}], o.fmt, o.aLabel, o.bLabel,
   * o.variant 'dumbbell'|'slope'|'delta'
   * ==================================================================== */
  CS.change = (el, w, o) => {
    const v = o.variant || 'dumbbell';
    o = { ...o, rows: o.rows.filter((r) => CS.isNum(r.a) && CS.isNum(r.b)) };
    if (!o.rows.length) return empty(el, 'No data for this selection');
    if (v === 'slope') return slope(el, w, o);
    const rows = o.rows;
    const rowH = 26;
    const labelW = Math.ceil(Math.max(...rows.map((r) => CS.textW(r.label, 12)))) + 12;
    const top = 6, bottom = 26, right = v === 'delta' ? 52 : 16;
    const h = top + rows.length * rowH + bottom;
    const svg = CS.svg(el, w, h, o.title);
    if (v === 'delta') {
      const ds = rows.map((r) => r.b - r.a);
      const m = Math.max(Math.abs(d3.min(ds)), Math.abs(d3.max(ds)));
      const x = d3.scaleLinear([d3.min(ds) < 0 ? -m : 0, m], [labelW, w - right]).nice();
      gridX(svg, x, x.ticks(w < 420 ? 4 : 6), top, h - bottom, (t) => (t > 0 ? '+' : '') + o.dfmt(t));
      svg.append('line').attr('x1', x(0) + 0.5).attr('x2', x(0) + 0.5).attr('y1', top).attr('y2', h - bottom).attr('stroke', 'var(--ink-2)');
      const g = svg.selectAll('g.row').data(rows).join('g').attr('class', 'row').attr('transform', (d, i) => `translate(0,${top + i * rowH})`);
      g.append('text').attr('x', labelW - 8).attr('y', rowH / 2 + 4).attr('text-anchor', 'end').attr('class', 'cs-label').text((d) => d.label);
      g.append('path').attr('d', (d) => {
        const dv = d.b - d.a;
        if (dv >= 0) return CS.barPathH(x(0), (rowH - 12) / 2, x(dv), 12);
        // mirrored bar for negative change
        const p = CS.barPathH(0, (rowH - 12) / 2, x(0) - x(dv), 12);
        return p;
      }).attr('transform', (d) => (d.b - d.a < 0 ? `translate(${x(0)},0) scale(-1,1)` : null))
        .attr('fill', (d) => ((d.b - d.a >= 0) !== !!o.invert ? 'var(--div-pos)' : 'var(--div-neg)'));
      g.append('text').attr('x', (d) => (d.b - d.a >= 0 ? x(d.b - d.a) + 6 : x(0) + 6)).attr('y', rowH / 2 + 4).attr('class', 'cs-value')
        .text((d) => (d.b - d.a >= 0 ? '+' : '') + o.dfmt(d.b - d.a));
      hitTarget(g.append('rect').attr('width', w).attr('height', rowH).attr('fill', 'transparent'), (e, d) => CS.showTip(e, d.label, [
        { value: (d.b - d.a >= 0 ? '+' : '') + o.dfmt(d.b - d.a), label: `${o.aLabel}→${o.bLabel}`, color: (d.b - d.a >= 0) !== !!o.invert ? 'var(--div-pos)' : 'var(--div-neg)', key: 'dot' },
        { value: `${o.fmt(d.a)} → ${o.fmt(d.b)}`, label: '' }]));
      return;
    }
    const all = rows.flatMap((r) => [r.a, r.b]);
    const x = d3.scaleLinear(d3.extent(all), [labelW + 6, w - right]).nice();
    gridX(svg, x, x.ticks(w < 420 ? 4 : 6), top, h - bottom, o.tick || o.fmt);
    const g = svg.selectAll('g.row').data(rows).join('g').attr('class', 'row').attr('transform', (d, i) => `translate(0,${top + i * rowH})`);
    g.append('text').attr('x', labelW - 8).attr('y', rowH / 2 + 4).attr('text-anchor', 'end').attr('class', 'cs-label').text((d) => d.label);
    g.append('line').attr('x1', (d) => x(d.a)).attr('x2', (d) => x(d.b)).attr('y1', rowH / 2).attr('y2', rowH / 2).attr('stroke', 'var(--axis)').attr('stroke-width', 3).attr('stroke-linecap', 'round');
    g.append('circle').attr('cx', (d) => x(d.a)).attr('cy', rowH / 2).attr('r', 5).attr('fill', 'var(--surface)').attr('stroke', 'var(--muted)').attr('stroke-width', 2);
    g.append('circle').attr('cx', (d) => x(d.b)).attr('cy', rowH / 2).attr('r', 5.5).attr('fill', 'var(--accent)').attr('stroke', 'var(--surface)').attr('stroke-width', 2);
    hitTarget(g.append('rect').attr('width', w).attr('height', rowH).attr('fill', 'transparent'), (e, d) => CS.showTip(e, d.label, [
      { value: o.fmt(d.b), label: o.bLabel, color: 'var(--accent)', key: 'dot' }, { value: o.fmt(d.a), label: o.aLabel, color: 'var(--muted)', key: 'dot' }]));
  };

  function slope(el, w, o) {
    const rows = o.rows;
    const h = o.height || 300;
    const lw = Math.min(110, Math.ceil(Math.max(...rows.map((r) => CS.textW(`${r.label} ${o.fmt(r.b)}`, 11)))) + 14);
    const m = { t: 26, b: 12, l: lw, r: lw };
    const all = rows.flatMap((r) => [r.a, r.b]);
    const y = d3.scaleLinear(d3.extent(all), [h - m.b, m.t]);
    const xa = m.l, xb = w - m.r;
    const svg = CS.svg(el, w, h, o.title);
    [[xa, o.aLabel, 'end'], [xb, o.bLabel, 'start']].forEach(([xx, lab]) => {
      svg.append('line').attr('x1', xx).attr('x2', xx).attr('y1', m.t - 6).attr('y2', h - m.b).attr('stroke', 'var(--axis)');
      svg.append('text').attr('x', xx).attr('y', 12).attr('text-anchor', 'middle').attr('class', 'cs-label cs-strong').text(lab);
    });
    const hl = new Set(o.highlight || []);
    const colorOf = (d) => (hl.size ? (hl.has(d.label) ? CS.regionColor(d.region) : 'var(--axis)') : CS.regionColor(d.region));
    const g = svg.selectAll('g.s').data(rows.slice().sort((a, b) => hl.has(a.label) - hl.has(b.label))).join('g').attr('class', 's');
    g.append('line').attr('x1', xa).attr('x2', xb).attr('y1', (d) => y(d.a)).attr('y2', (d) => y(d.b)).attr('stroke', colorOf).attr('stroke-width', (d) => (hl.has(d.label) ? 2.5 : 1.5));
    g.append('circle').attr('cx', xa).attr('cy', (d) => y(d.a)).attr('r', 4).attr('fill', colorOf).attr('stroke', 'var(--surface)').attr('stroke-width', 2);
    g.append('circle').attr('cx', xb).attr('cy', (d) => y(d.b)).attr('r', 4).attr('fill', colorOf).attr('stroke', 'var(--surface)').attr('stroke-width', 2);
    // Labels on both sides, dropped when they would collide.
    function place(side) {
      const key = side === 'a' ? 'a' : 'b';
      const cand = rows.slice().sort((p, q) => (hl.has(q.label) - hl.has(p.label)) || (q[key] - p[key]));
      const used = [];
      cand.forEach((d) => {
        const yy = y(d[key]);
        if (used.some((u) => Math.abs(u - yy) < 13)) return;
        used.push(yy);
        svg.append('text').attr('x', side === 'a' ? xa - 8 : xb + 8).attr('y', yy + 4).attr('text-anchor', side === 'a' ? 'end' : 'start')
          .attr('class', 'cs-label').text(side === 'a' ? `${o.fmt(d.a)}` : `${d.label} ${o.fmt(d.b)}`);
      });
    }
    place('a'); place('b');
    hitTarget(g.append('line').attr('x1', xa).attr('x2', xb).attr('y1', (d) => y(d.a)).attr('y2', (d) => y(d.b)).attr('stroke', 'transparent').attr('stroke-width', 14),
      (e, d) => CS.showTip(e, d.label, [{ value: o.fmt(d.b), label: o.bLabel, color: colorOf(d) }, { value: o.fmt(d.a), label: o.aLabel }]));
  }

  /* ======================================================================
   * Heatmap: rows × years
   * o.rows [{label, values}], o.fmt, o.variant 'seq'|'div' (change vs 2000)
   * ==================================================================== */
  CS.heatmap = (el, w, o) => {
    const v = o.variant || 'seq';
    const rows = o.rows.map((r) => { const b = CS.firstFinite(r.values); return { ...r, cells: v === 'div' ? r.values.map((x) => (CS.isNum(x) && b ? x - b.v : null)) : r.values }; });
    const labelW = Math.ceil(Math.max(...rows.map((r) => CS.textW(r.label, 12)))) + 12;
    const top = 20, gap = 2;
    const cw = (w - labelW) / YEARS.length;
    const rh = 20;
    const h = top + rows.length * rh;
    const all = rows.flatMap((r) => r.cells).filter(CS.isNum);
    let color;
    if (v === 'div') {
      const m = d3.max(all, Math.abs);
      const poles = [CS.css('--div-neg'), CS.css('--div-mid'), CS.css('--div-pos')];
      if (o.invert) poles.reverse();
      color = d3.scaleDiverging([-m, 0, m], d3.piecewise(d3.interpolateLab, poles));
    } else {
      color = d3.scaleSequential(d3.extent(all), d3.interpolateLab(CS.css('--seq-lo'), CS.css('--seq-hi')));
    }
    const svg = CS.svg(el, w, h, o.title);
    const step = cw < 14 ? 10 : 5;
    YEARS.forEach((yr, i) => { if ((yr - 2000) % step === 0) svg.append('text').attr('x', labelW + i * cw).attr('y', 12).attr('class', 'cs-tick').text(yr); });
    const g = svg.selectAll('g.r').data(rows).join('g').attr('class', 'r').attr('transform', (d, i) => `translate(0,${top + i * rh})`);
    g.append('text').attr('x', labelW - 8).attr('y', rh / 2 + 3).attr('text-anchor', 'end').attr('class', 'cs-label').text((d) => d.label);
    const cells = g.selectAll('rect').data((d) => d.cells.map((c, i) => ({ r: d, i, c }))).join('rect')
      .attr('x', (d) => labelW + d.i * cw).attr('y', 0).attr('width', Math.max(1, cw - gap)).attr('height', rh - gap)
      .attr('rx', Math.min(3, (cw - gap) / 3)).attr('fill', (d) => (CS.isNum(d.c) ? color(d.c) : 'var(--surface-2)'));
    hitTarget(cells, function (e, d) {
      if (!CS.isNum(d.c)) return CS.showTip(e, `${d.r.label} · ${YEARS[d.i]}`, [{ value: 'No data', label: '' }]);
      CS.showTip(e, `${d.r.label} · ${YEARS[d.i]}`, [
        { value: v === 'div' ? (d.c >= 0 ? '+' : '') + o.dfmt(d.c) : o.fmt(d.c), label: v === 'div' ? `since ${YEARS[0]}` : o.metricLabel, color: color(d.c), key: 'dot' },
        ...(v === 'div' ? [{ value: o.fmt(d.r.values[d.i]), label: o.metricLabel }] : []),
      ]);
    });
    if (o.legendEl) {
      o.legendEl.replaceChildren();
      const dom = color.domain();
      const stops = d3.range(0, 1.01, 0.1).map((t) => color(dom[0] + t * (dom[dom.length - 1] - dom[0]))).join(',');
      const f = v === 'div' ? (t) => (t > 0 ? '+' : '') + o.dfmt(t) : o.fmt;
      o.legendEl.append(CS.el('span', { class: 'cs-leg-ramp' }, CS.el('span', { class: 'cs-num', text: f(dom[0]) }), CS.el('i', { class: 'cs-leg-grad', style: `background:linear-gradient(90deg,${stops})` }), CS.el('span', { class: 'cs-num', text: f(dom[dom.length - 1]) })));
    }
  };

  /* ======================================================================
   * Position strip: every country as a dot on one axis, one highlighted.
   * o.values [{id,label,v,region}], o.highlight id, o.peerRegion, o.fmt,
   * o.tick, o.log, o.ref (number), o.refLabel
   * ==================================================================== */
  CS.strip = (el, w, o) => {
    const vals = o.values.filter((d) => CS.isNum(d.v) && (!o.log || d.v > 0));
    if (!vals.length) return empty(el, 'No data');
    const h = 78, m = { l: 10, r: 10, t: 26, b: 22 }, mid = m.t + (h - m.t - m.b) / 2;
    const ext = d3.extent(vals, (d) => d.v);
    const x = (o.log ? d3.scaleLog().domain([ext[0] * 0.9, ext[1] * 1.1]) : d3.scaleLinear().domain(ext).nice()).range([m.l, w - m.r]);
    const svg = CS.svg(el, w, h, o.title);
    const ticks = o.log ? logTicks(x, w) : x.ticks(w < 420 ? 4 : 6);
    svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', mid + 0.5).attr('y2', mid + 0.5).attr('stroke', 'var(--grid)');
    svg.append('g').selectAll('text').data(ticks).join('text').attr('class', 'cs-tick')
      .attr('x', (d) => x(d)).attr('y', h - 4).attr('text-anchor', 'middle').text(o.tick || o.fmt);
    if (o.ref != null && CS.isNum(o.ref)) {
      svg.append('line').attr('x1', x(o.ref) + 0.5).attr('x2', x(o.ref) + 0.5).attr('y1', mid - 16).attr('y2', mid + 16).attr('stroke', 'var(--ink-2)');
    }
    const hi = vals.find((d) => d.id === o.highlight);
    const others = vals.filter((d) => d !== hi);
    const jy = (d, i) => mid + jitter(d.label, i) * 18;
    svg.append('g').selectAll('circle').data(others).join('circle')
      .attr('cx', (d) => x(d.v)).attr('cy', jy).attr('r', 3.5)
      .attr('fill', (d) => (o.peerRegion && d.region === o.peerRegion ? CS.regionColor(d.region) : 'var(--axis)'))
      .attr('fill-opacity', (d) => (o.peerRegion && d.region === o.peerRegion ? 0.9 : 0.8));
    if (hi) {
      svg.append('circle').attr('cx', x(hi.v)).attr('cy', mid).attr('r', 7).attr('fill', 'var(--accent)').attr('stroke', 'var(--surface)').attr('stroke-width', 2.5);
      const lab = `${hi.label} ${o.fmt(hi.v)}`;
      const lw = CS.textW(lab, 12) + 4;
      svg.append('text').attr('class', 'cs-label cs-strong').attr('y', 13)
        .attr('x', Math.max(m.l + lw / 2, Math.min(w - m.r - lw / 2, x(hi.v)))).attr('text-anchor', 'middle').text(lab);
      svg.append('line').attr('x1', x(hi.v)).attr('x2', x(hi.v)).attr('y1', 17).attr('y2', mid - 8).attr('stroke', 'var(--accent)').attr('stroke-width', 1.5);
    }
    // Nearest-dot hover
    const pts = vals.map((d, i) => ({ d, px: x(d.v), py: d === hi ? mid : jy(d, others.indexOf(d)) }));
    const del = d3.Delaunay.from(pts, (p) => p.px, (p) => p.py);
    svg.append('rect').attr('x', 0).attr('y', m.t - 6).attr('width', w).attr('height', h - m.t - m.b + 12).attr('fill', 'transparent')
      .attr('data-tip-target', '').style('touch-action', 'pan-y')
      .on('pointermove pointerdown', (e) => {
        const [px, py] = d3.pointer(e, svg.node());
        const p = pts[del.find(px, py)];
        if (!p) return;
        const rank = vals.slice().sort((a, b) => b.v - a.v).indexOf(p.d) + 1;
        CS.showTip(e, p.d.label, [{ value: o.fmt(p.d.v), label: `#${rank} of ${vals.length}`, color: p.d === hi ? 'var(--accent)' : (o.peerRegion && p.d.region === o.peerRegion ? CS.regionColor(p.d.region) : 'var(--axis)'), key: 'dot' }]);
      })
      .on('pointerleave', CS.hideTip);
  };

  /* ======================================================================
   * Small inline figures (return DOM nodes)
   * ==================================================================== */
  CS.sparkline = (values, opt = {}) => {
    const w = opt.w || 96, h = opt.h || 28, pad = 4;
    const x = d3.scaleLinear([0, values.length - 1], [pad, w - pad]);
    const y = d3.scaleLinear(d3.extent(values), [h - pad, pad]);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('width', w); svg.setAttribute('height', h);
    svg.setAttribute('class', 'cs-spark'); svg.setAttribute('aria-hidden', 'true');
    const s = d3.select(svg);
    const color = opt.color || 'var(--accent)';
    if (opt.area !== false) s.append('path').attr('d', d3.area().defined(CS.isNum).x((d, i) => x(i)).y0(h).y1((d) => y(d)).curve(d3.curveMonotoneX)(values)).attr('fill', color).attr('fill-opacity', 0.12);
    s.append('path').attr('d', d3.line().defined(CS.isNum).x((d, i) => x(i)).y((d) => y(d)).curve(d3.curveMonotoneX)(values)).attr('fill', 'none').attr('stroke', opt.muted ? 'var(--muted)' : color).attr('stroke-width', 1.75).attr('stroke-linecap', 'round');
    const lf = CS.lastFinite(values);
    if (lf) s.append('circle').attr('cx', x(lf.i)).attr('cy', y(lf.v)).attr('r', 3).attr('fill', color).attr('stroke', 'var(--surface)').attr('stroke-width', 1.5);
    return svg;
  };

  // Columns mini chart for stat tiles.
  CS.miniColumns = (values, opt = {}) => {
    const w = opt.w || 96, h = opt.h || 28;
    const n = values.length, gap = 2, bw = Math.max(2, (w - gap * (n - 1)) / n);
    const y = d3.scaleLinear([0, d3.max(values)], [h, 2]);
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`); svg.setAttribute('width', w); svg.setAttribute('height', h); svg.setAttribute('aria-hidden', 'true');
    values.forEach((v, i) => {
      if (!CS.isNum(v)) return;
      const p = document.createElementNS(NS, 'path');
      p.setAttribute('d', CS.barPathV(i * (bw + gap), h, y(v), bw, 1.5));
      p.setAttribute('fill', i === n - 1 ? 'var(--accent)' : 'var(--axis)');
      svg.append(p);
    });
    return svg;
  };
})();
