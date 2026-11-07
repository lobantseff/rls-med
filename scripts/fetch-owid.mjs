// Downloads indicators from Our World in Data and builds dashboard/data/owid.js.
//
//   npm run data                    download from ourworldindata.org, cache CSVs, build
//   npm run data -- --offline DIR   build from CSVs already in DIR (same file names)
//
// Each indicator comes from an OWID grapher chart:
//   https://ourworldindata.org/grapher/<slug>.csv           data
//   https://ourworldindata.org/grapher/<slug>.metadata.json source, unit, last update
// OWID data is licensed CC BY 4.0; the page credits OWID and each original source.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoCentroid } from 'd3-geo';

const require = createRequire(import.meta.url);
const iso = require('i18n-iso-countries');
const world50 = require('world-atlas/countries-50m.json');

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('dashboard/data/owid.js', ROOT);
const CACHE = new URL('data/owid-raw/', ROOT);
const BASE = 'https://ourworldindata.org/grapher/';

export const FIRST_YEAR = 2000;
// Countries smaller than this are left out to keep rankings and maps readable.
export const MIN_POP = 1_000_000;
// A "latest" value older than this many years before the newest year counts as missing.
const MAX_STALE = 3;

export const INDICATORS = {
  life: { slug: 'life-expectancy', round: 1 },
  gdp: { slug: 'gdp-per-capita-worldbank', round: 0 },
  co2: { slug: 'co-emissions-per-capita', round: 2 },
  net: { slug: 'share-of-individuals-using-the-internet', round: 1 },
  pop: { slug: 'population', round: 0 },
};
const REGION_SLUG = 'continents-according-to-our-world-in-data';
// OWID continents -> the dashboard's five regions (one color each).
const REGION_MAP = {
  Africa: 'Africa', Asia: 'Asia', Europe: 'Europe', Oceania: 'Oceania',
  'North America': 'Americas', 'South America': 'Americas',
};
export const REGIONS = ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'];

const SHORT = {
  'Democratic Republic of Congo': 'DR Congo', 'Republic of Congo': 'Congo', Congo: 'Congo',
  'United States': 'USA', 'United Kingdom': 'UK', 'United Arab Emirates': 'UAE',
  'Central African Republic': 'CAR', 'Papua New Guinea': 'PNG', 'Bosnia and Herzegovina': 'Bosnia & Herz.',
  'Dominican Republic': 'Dominican Rep.', 'Trinidad and Tobago': 'Trinidad & Tob.', 'South Africa': 'S. Africa',
  'South Korea': 'S. Korea', 'North Korea': 'N. Korea', 'New Zealand': 'N. Zealand', 'Equatorial Guinea': 'Eq. Guinea',
  'South Sudan': 'S. Sudan', 'Guinea-Bissau': 'G.-Bissau', 'Sierra Leone': 'S. Leone', 'East Timor': 'Timor-Leste',
  'North Macedonia': 'N. Macedonia', 'Saudi Arabia': 'Saudi Arabia', 'Kyrgyzstan': 'Kyrgyzstan',
  'Palestine': 'Palestine', "Cote d'Ivoire": "Côte d'Ivoire",
};

/* ---------- CSV ---------- */
export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}
// The value column is whatever is not Entity / Code / Year / Day.
const valueKey = (rows) => Object.keys(rows[0] || {}).find((k) => !['Entity', 'Code', 'Year', 'Day'].includes(k));

/* ---------- download with cache ---------- */
async function get(name, url, offlineDir) {
  if (offlineDir) return readFile(new URL(name, offlineDir), 'utf8');
  const res = await fetch(url, { headers: { 'user-agent': 'country-stats-dashboard (data build)' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  const text = await res.text();
  await mkdir(CACHE, { recursive: true });
  await writeFile(new URL(name, CACHE), text);
  return text;
}

function sourceInfo(slug, meta) {
  const col = meta && meta.columns ? Object.values(meta.columns)[0] || {} : {};
  return {
    slug,
    url: BASE + slug,
    title: col.titleShort || col.titleLong || (meta && meta.chart && meta.chart.title) || slug,
    unit: col.unit || '',
    shortUnit: col.shortUnit || '',
    citation: col.citationShort || (meta && meta.chart && meta.chart.citation) || 'Our World in Data',
    lastUpdated: col.lastUpdated || null,
    timespan: col.timespan || null,
  };
}

/* ---------- build ---------- */
export async function build({ offlineDir } = {}) {
  const tables = {};
  const sources = {};
  for (const [key, ind] of Object.entries(INDICATORS)) {
    const csv = await get(`${ind.slug}.csv`, `${BASE}${ind.slug}.csv?v=1&csvType=full&useColumnShortNames=true`, offlineDir);
    const rows = parseCSV(csv);
    const vk = valueKey(rows);
    tables[key] = rows.map((r) => ({ code: r.Code, entity: r.Entity, year: +r.Year, v: r[vk] === '' ? null : +r[vk] }));
    let meta = null;
    try { meta = JSON.parse(await get(`${ind.slug}.metadata.json`, `${BASE}${ind.slug}.metadata.json?v=1&csvType=full&useColumnShortNames=true`, offlineDir)); } catch (e) { console.warn(`  no metadata for ${ind.slug}: ${e.message}`); }
    sources[key] = sourceInfo(ind.slug, meta);
    console.log(`  ${key.padEnd(4)} ${ind.slug}: ${rows.length} rows (column "${vk}")`);
  }
  const regionRows = parseCSV(await get(`${REGION_SLUG}.csv`, `${BASE}${REGION_SLUG}.csv?v=1&csvType=full&useColumnShortNames=true`, offlineDir));
  const rk = valueKey(regionRows);
  const continent = {};
  for (const r of regionRows) if (r.Code && (!continent[r.Code] || +r.Year >= continent[r.Code].year)) continent[r.Code] = { year: +r.Year, name: r[rk] };

  const lastYear = Math.max(...tables.life.filter((r) => r.v != null).map((r) => r.year));
  const years = [];
  for (let y = FIRST_YEAR; y <= lastYear; y++) years.push(y);

  // code -> key -> year -> value
  const byCode = {};
  const names = {};
  for (const [key, rows] of Object.entries(tables)) {
    for (const r of rows) {
      if (!r.code || r.year < FIRST_YEAR || r.year > lastYear || r.v == null || !isFinite(r.v)) continue;
      ((byCode[r.code] ||= {})[key] ||= {})[r.year] = r.v;
      names[r.code] = r.entity;
    }
  }

  const centroid = {};
  for (const f of feature(world50, world50.objects.countries).features) if (f.id) centroid[f.id] = geoCentroid(f);

  const round = (v, d) => (v == null ? null : +v.toFixed(d));
  const countries = [];
  const skipped = [];
  for (const code of Object.keys(byCode).sort()) {
    if (!/^[A-Z]{3}$/.test(code)) continue; // OWID aggregates use OWID_* codes
    const region = REGION_MAP[continent[code] && continent[code].name];
    if (!region) { skipped.push(`${code} (no continent)`); continue; }
    const d = byCode[code];
    const series = {};
    for (const key of Object.keys(INDICATORS)) {
      series[key] = years.map((y) => {
        const v = d[key] && d[key][y];
        if (v == null) return null;
        return key === 'pop' ? round(v / 1e6, 3) : round(v, INDICATORS[key].round);
      });
    }
    const popNow = lastFinite(series.pop);
    if (!popNow || popNow.v * 1e6 < MIN_POP) continue;
    const numeric = iso.alpha3ToNumeric(code);
    const c = {
      iso3: code, id: numeric || null, name: names[code], short: SHORT[names[code]] || names[code], region,
      lat: null, lon: null, series, year: {},
    };
    if (numeric && centroid[numeric]) { c.lon = round(centroid[numeric][0], 2); c.lat = round(centroid[numeric][1], 2); }
    for (const key of Object.keys(INDICATORS)) {
      const lf = lastFinite(series[key]);
      const fresh = lf && years[lf.i] >= lastYear - MAX_STALE;
      c[key] = fresh ? lf.v : null;
      c.year[key] = fresh ? years[lf.i] : null;
    }
    countries.push(c);
  }

  const world = {};
  for (const key of Object.keys(INDICATORS)) {
    const w = byCode.OWID_WRL && byCode.OWID_WRL[key];
    world[key] = years.map((y) => (w && w[y] != null ? (key === 'pop' ? round(w[y] / 1e6, 3) : round(w[y], INDICATORS[key].round)) : null));
  }

  const data = {
    generated: new Date().toISOString().slice(0, 10),
    note: `Our World in Data, CC BY 4.0. ${countries.length} countries with at least ${MIN_POP / 1e6} million people.`,
    years, regions: REGIONS, minPop: MIN_POP, sources, world, countries,
  };
  if (skipped.length) console.log(`  skipped: ${skipped.join(', ')}`);
  return data;
}

function lastFinite(arr) {
  for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null && isFinite(arr[i])) return { v: arr[i], i };
  return null;
}

export function toScript(data) {
  return `/* Generated by scripts/fetch-owid.mjs on ${data.generated}. Do not edit by hand.
 * Source: Our World in Data (https://ourworldindata.org), licensed CC BY 4.0. */
(function () {
  const D = ${JSON.stringify(data)};
  D.byIso = Object.fromEntries(D.countries.map((c) => [c.iso3, c]));
  D.byId = Object.fromEntries(D.countries.filter((c) => c.id).map((c) => [c.id, c]));
  window.CS_DATA = D;
})();
`;
}

const isMain = process.argv[1] && new URL(import.meta.url).pathname === new URL(`file://${process.argv[1]}`).pathname;
if (isMain) {
  const i = process.argv.indexOf('--offline');
  const offlineDir = i > -1 ? new URL(process.argv[i + 1].replace(/\/?$/, '/'), `file://${process.cwd()}/`) : null;
  if (offlineDir && !existsSync(offlineDir)) { console.error(`No such folder: ${offlineDir.pathname}`); process.exit(1); }
  console.log(offlineDir ? `Building from ${offlineDir.pathname}` : 'Downloading from Our World in Data…');
  const data = await build({ offlineDir });
  await writeFile(OUT, toScript(data));
  const kb = Math.round((await readFile(OUT)).length / 1024);
  console.log(`Wrote dashboard/data/owid.js: ${data.countries.length} countries, ${data.years[0]}–${data.years.at(-1)}, ${kb} KB`);
}
