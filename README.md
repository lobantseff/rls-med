# Country Stats

A dashboard of statistics about countries, built for phones and desktops.

This repository used to hold a medical-imaging ML project (`rls-med`). That code is kept, untouched, in [`archive/rls-med/`](archive/rls-med/).

## Status: agreeing on the look

Nothing here uses real statistics yet. `dashboard/js/data.js` holds about 60 countries with rounded, approximate values and **synthetic** 2000–2023 histories, so we can judge layout and interaction before building the data pipeline.

Two pages, also hosted as private Claude artifacts: [theme look book](https://claude.ai/artifact/X28oUf5M5WVU9rVfk6Xgor) · [component gallery](https://claude.ai/artifact/BEYCNDpcxb7Lm9tfVPYcSY).

| Page | What it is for |
|---|---|
| `dashboard/index.html` | **Theme look book.** Four themes (Meridian, Terrain, Pulse, Ledger), each in light and dark, applied to the same overview dashboard. |
| `dashboard/components.html` | **Component gallery.** Every building block with lettered options (A/B/C…): stat tiles, ranked bars, boxplots, line charts, scatter/bubble, maps, change charts, heatmaps, tables, filters, country profile. Pick favourites and copy the summary. |

## Run locally

```sh
npm run dev        # http://localhost:5173/  (no install needed, Node 18+)
```

Pages are written as HTML fragments (no `<html>`/`<head>`) so the same files publish as Claude artifacts; the dev server wraps them.

## Layout

```
dashboard/
  index.html, components.html   pages
  themes.mjs                     theme tokens (edit here)
  css/themes.css                 generated from themes.mjs (npm run themes)
  css/base.css                   layout + component styles, tokens only
  js/core.js                     theme switching, tooltip, responsive mount, formatting
  js/charts.js                   D3 charts: rankedBars, distribution, lineChart, scatter,
                                 worldMap (choropleth / binned / tiles / bubbles), change, heatmap
  js/ui.js                       stat tiles, filter controls, sortable table, profile card
  js/data.js                     illustrative sample data
  data/world-110m.js             Natural Earth 110m countries (world-atlas 2.0.2)
scripts/
  build-themes.mjs               tokens -> CSS
  serve.mjs                      dev server
```

Libraries: D3 7.9.0 and topojson-client 3.1.0 from CDN. No build step.

## Design rules baked in

- Region colors are a fixed five-slot palette per theme, checked for colorblind separation and contrast in both modes. Colors follow the region, never its rank.
- Every chart has hover/tap readouts with hit areas larger than the marks; text never takes a series color.
- One filter row scopes everything below it.
- Charts redraw on resize and theme change, so they fit any width from 360px up.
