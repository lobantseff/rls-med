/* Illustrative sample data for layout work only.
 * Latest values are rounded approximations of recent public figures; the
 * 2000–2023 histories are synthesised from them. Do not cite these numbers.
 * Will be replaced by a real data pipeline once the look is agreed. */
(function () {
  // iso3, ISO numeric (matches world-atlas ids), name, short name, region,
  // population (millions), GDP per capita (US$ thousands), life expectancy (years),
  // CO2 per person (tonnes), internet users (% of population)
  const ROWS = [
    ['NGA', '566', 'Nigeria', 'Nigeria', 'Africa', 218, 2.2, 53.0, 0.6, 55],
    ['EGY', '818', 'Egypt', 'Egypt', 'Africa', 111, 4.3, 70.2, 2.3, 72],
    ['ZAF', '710', 'South Africa', 'S. Africa', 'Africa', 60, 6.8, 62.3, 6.7, 72],
    ['ETH', '231', 'Ethiopia', 'Ethiopia', 'Africa', 123, 1.0, 65.0, 0.15, 19],
    ['KEN', '404', 'Kenya', 'Kenya', 'Africa', 54, 2.1, 62.0, 0.4, 41],
    ['MAR', '504', 'Morocco', 'Morocco', 'Africa', 37, 3.6, 74.8, 1.8, 88],
    ['GHA', '288', 'Ghana', 'Ghana', 'Africa', 33, 2.2, 63.9, 0.6, 69],
    ['DZA', '012', 'Algeria', 'Algeria', 'Africa', 45, 4.3, 76.1, 3.9, 71],
    ['COD', '180', 'DR Congo', 'DR Congo', 'Africa', 99, 0.65, 59.2, 0.04, 27],
    ['TZA', '834', 'Tanzania', 'Tanzania', 'Africa', 65, 1.2, 66.2, 0.2, 32],
    ['SEN', '686', 'Senegal', 'Senegal', 'Africa', 17, 1.6, 67.9, 0.7, 60],
    ['AGO', '024', 'Angola', 'Angola', 'Africa', 36, 3.0, 61.6, 0.7, 39],
    ['USA', '840', 'United States', 'USA', 'Americas', 333, 76.3, 76.4, 14.9, 92],
    ['CAN', '124', 'Canada', 'Canada', 'Americas', 39, 55.5, 81.3, 14.3, 93],
    ['MEX', '484', 'Mexico', 'Mexico', 'Americas', 128, 11.5, 70.2, 3.6, 76],
    ['BRA', '076', 'Brazil', 'Brazil', 'Americas', 215, 8.9, 73.4, 2.2, 81],
    ['ARG', '032', 'Argentina', 'Argentina', 'Americas', 46, 13.7, 75.4, 4.0, 88],
    ['COL', '170', 'Colombia', 'Colombia', 'Americas', 52, 6.6, 73.0, 1.9, 73],
    ['CHL', '152', 'Chile', 'Chile', 'Americas', 19.6, 15.4, 79.0, 4.4, 90],
    ['PER', '604', 'Peru', 'Peru', 'Americas', 34, 7.1, 72.4, 1.6, 75],
    ['GTM', '320', 'Guatemala', 'Guatemala', 'Americas', 17.4, 5.5, 68.7, 1.0, 51],
    ['HTI', '332', 'Haiti', 'Haiti', 'Americas', 11.6, 1.7, 63.2, 0.2, 39],
    ['CHN', '156', 'China', 'China', 'Asia', 1412, 12.7, 78.2, 8.0, 76],
    ['IND', '356', 'India', 'India', 'Asia', 1417, 2.4, 67.7, 1.9, 49],
    ['IDN', '360', 'Indonesia', 'Indonesia', 'Asia', 276, 4.8, 68.3, 2.6, 66],
    ['PAK', '586', 'Pakistan', 'Pakistan', 'Asia', 236, 1.6, 66.4, 0.9, 33],
    ['BGD', '050', 'Bangladesh', 'Bangladesh', 'Asia', 171, 2.7, 72.4, 0.6, 39],
    ['JPN', '392', 'Japan', 'Japan', 'Asia', 125, 34.0, 84.0, 8.5, 85],
    ['KOR', '410', 'South Korea', 'S. Korea', 'Asia', 52, 32.4, 83.7, 11.6, 97],
    ['VNM', '704', 'Vietnam', 'Vietnam', 'Asia', 98, 4.2, 74.6, 3.5, 79],
    ['PHL', '608', 'Philippines', 'Philippines', 'Asia', 116, 3.5, 69.8, 1.3, 73],
    ['THA', '764', 'Thailand', 'Thailand', 'Asia', 72, 7.1, 78.7, 3.8, 88],
    ['TUR', '792', 'Türkiye', 'Türkiye', 'Asia', 85, 10.6, 76.0, 5.1, 83],
    ['IRN', '364', 'Iran', 'Iran', 'Asia', 89, 4.4, 74.0, 8.0, 79],
    ['SAU', '682', 'Saudi Arabia', 'Saudi Ar.', 'Asia', 36, 30.4, 77.0, 18.0, 99],
    ['ISR', '376', 'Israel', 'Israel', 'Asia', 9.6, 54.0, 82.7, 6.2, 90],
    ['KAZ', '398', 'Kazakhstan', 'Kazakhstan', 'Asia', 19.6, 11.5, 70.2, 12.7, 90],
    ['AFG', '004', 'Afghanistan', 'Afghanistan', 'Asia', 41, 0.36, 62.0, 0.3, 18],
    ['MNG', '496', 'Mongolia', 'Mongolia', 'Asia', 3.4, 5.0, 71.0, 11.0, 84],
    ['DEU', '276', 'Germany', 'Germany', 'Europe', 84, 48.7, 80.7, 8.0, 92],
    ['FRA', '250', 'France', 'France', 'Europe', 68, 40.9, 82.3, 4.6, 85],
    ['GBR', '826', 'United Kingdom', 'UK', 'Europe', 67, 46.1, 80.7, 4.7, 95],
    ['ITA', '380', 'Italy', 'Italy', 'Europe', 59, 34.1, 82.9, 5.7, 85],
    ['ESP', '724', 'Spain', 'Spain', 'Europe', 48, 29.7, 83.0, 5.0, 94],
    ['POL', '616', 'Poland', 'Poland', 'Europe', 37.6, 18.7, 77.5, 8.0, 87],
    ['UKR', '804', 'Ukraine', 'Ukraine', 'Europe', 38, 4.5, 70.0, 3.7, 79],
    ['SWE', '752', 'Sweden', 'Sweden', 'Europe', 10.5, 56.4, 83.0, 3.6, 95],
    ['NOR', '578', 'Norway', 'Norway', 'Europe', 5.5, 106, 83.2, 7.5, 99],
    ['NLD', '528', 'Netherlands', 'Netherlands', 'Europe', 17.7, 57.0, 81.7, 7.1, 93],
    ['ROU', '642', 'Romania', 'Romania', 'Europe', 19, 15.8, 75.3, 3.7, 86],
    ['GRC', '300', 'Greece', 'Greece', 'Europe', 10.4, 20.9, 80.1, 5.3, 83],
    ['RUS', '643', 'Russia', 'Russia', 'Europe', 144, 15.3, 70.1, 11.4, 90],
    ['PRT', '620', 'Portugal', 'Portugal', 'Europe', 10.4, 24.5, 81.0, 4.0, 85],
    ['FIN', '246', 'Finland', 'Finland', 'Europe', 5.6, 50.8, 81.9, 6.5, 93],
    ['AUS', '036', 'Australia', 'Australia', 'Oceania', 26, 65.1, 83.3, 14.9, 96],
    ['NZL', '554', 'New Zealand', 'N. Zealand', 'Oceania', 5.1, 48.4, 82.1, 6.2, 96],
    ['PNG', '598', 'Papua New Guinea', 'PNG', 'Oceania', 10, 3.0, 65.4, 0.8, 32],
    ['FJI', '242', 'Fiji', 'Fiji', 'Oceania', 0.93, 5.3, 67.1, 1.3, 88],
  ];

  const YEARS = Array.from({ length: 24 }, (_, i) => 2000 + i);

  // Small deterministic noise so the synthetic histories look organic but stable.
  function rng(seed) {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    return () => {
      h = Math.imul(h ^ (h >>> 15), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }
  const ease = (t) => t * t * (3 - 2 * t);

  const LIFE_GAIN = { Africa: 9, Asia: 6, Americas: 3.5, Europe: 3.6, Oceania: 3.4 };
  const COVID_DIP = { Americas: 1.6, Europe: 1.1, Asia: 0.7, Africa: 0.5, Oceania: 0.2 };
  const GDP_RATIO = { Africa: 1.9, Asia: 3.2, Americas: 1.9, Europe: 2.1, Oceania: 2.6 };
  const GDP_OVERRIDE = { CHN: 13, IND: 5, VNM: 7, ETH: 7, BGD: 6, KAZ: 7, RUS: 8, POL: 4, ROU: 8, UKR: 4, ARG: 1.7, JPN: 0.9, ITA: 1.4, MNG: 6, AGO: 5, NGA: 3.3 };

  function lifeSeries(c, r) {
    const gain = (LIFE_GAIN[c.region] * (c.life > 80 ? 0.7 : 1)) * (0.8 + r() * 0.4);
    const dip = (c.iso3 === 'RUS' || c.iso3 === 'IND' ? 2.6 : COVID_DIP[c.region]) * (0.6 + r() * 0.8);
    const start = c.life - gain;
    return YEARS.map((y) => {
      const t = (y - 2000) / 23;
      let v = start + gain * ease(Math.min(1, t * 1.08));
      if (y === 2020) v -= dip * 0.6;
      if (y === 2021) v -= dip;
      if (y === 2022) v -= dip * 0.25;
      return +(v + (r() - 0.5) * 0.25).toFixed(1);
    });
  }

  function gdpSeries(c, r) {
    const ratio = GDP_OVERRIDE[c.iso3] ?? GDP_RATIO[c.region] * (0.8 + r() * 0.4);
    const g = Math.pow(ratio, 1 / 23);
    const start = c.gdp / ratio;
    return YEARS.map((y) => {
      let v = start * Math.pow(g, y - 2000);
      if (y === 2009 && (c.region === 'Europe' || c.region === 'Americas')) v *= 0.95;
      if (y === 2020) v *= 0.94;
      v *= 1 + (r() - 0.5) * 0.04;
      return +v.toFixed(2);
    });
  }

  function co2Series(c, r) {
    const rich = c.gdp > 25;
    const ratio = rich ? 0.75 + r() * 0.15 : 1.4 + r() * 1.2; // end / start
    const start = c.co2 / ratio;
    return YEARS.map((y, i) => {
      let v = start + (c.co2 - start) * (i / 23);
      if (y === 2020) v *= 0.93;
      return +(v * (1 + (r() - 0.5) * 0.05)).toFixed(2);
    });
  }

  function netSeries(c, r) {
    const start = c.gdp > 25 ? 30 + r() * 20 : c.gdp > 8 ? 4 + r() * 6 : 0.2 + r() * 1.5;
    const mid = 2006 + (100 - c.net) / 8 + r() * 3;
    return YEARS.map((y) => {
      const s = 1 / (1 + Math.exp(-(y - mid) / 2.6));
      const s0 = 1 / (1 + Math.exp(-(2000 - mid) / 2.6));
      const s1 = 1 / (1 + Math.exp(-(2023 - mid) / 2.6));
      const v = start + (c.net - start) * ((s - s0) / (s1 - s0));
      return +Math.max(0.1, v).toFixed(1);
    });
  }

  const countries = ROWS.map(([iso3, id, name, short, region, pop, gdp, life, co2, net]) => {
    const c = { iso3, id, name, short, region, pop, gdp: gdp * 1000, life, co2, net };
    c.gdp = gdp; // kept in thousands while generating, converted below
    const r = rng(iso3);
    c.series = {
      life: lifeSeries(c, r),
      gdp: gdpSeries(c, r).map((v) => Math.round(v * 1000)),
      co2: co2Series(c, r),
      net: netSeries(c, r),
    };
    c.gdp = Math.round(gdp * 1000);
    // Latest values come from the series so every view agrees.
    for (const k of ['life', 'gdp', 'co2', 'net']) c[k] = c.series[k][c.series[k].length - 1];
    c.series.pop = YEARS.map((y) => +(pop / Math.pow(1 + (region === 'Africa' ? 0.026 : region === 'Europe' ? 0.001 : 0.011), 2023 - y)).toFixed(2));
    return c;
  });

  window.CS_DATA = {
    note: 'Illustrative sample data: rounded approximations with synthetic 2000–2023 histories. Not for citation.',
    years: YEARS,
    regions: ['Africa', 'Americas', 'Asia', 'Europe', 'Oceania'],
    countries,
    byIso: Object.fromEntries(countries.map((c) => [c.iso3, c])),
    byId: Object.fromEntries(countries.map((c) => [c.id, c])),
  };
})();
