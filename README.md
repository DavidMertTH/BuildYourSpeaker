# AudioSim

AudioSim is an early browser-based loudspeaker enclosure simulator. The first milestone is a clean WINISD-style core for closed and vented boxes, with plots for SPL, impedance, cone excursion, phase/group delay, and port velocity.

## Run

```powershell
node server.mjs
```

Then open `http://localhost:4173`.

## Test

```powershell
node --test
```

The app has no npm dependencies yet. It uses browser ES modules and a small local Node static server.

## Interaction

- Use the browser Back button to step back through parameter changes.
- Use `Ctrl+Z` / `Cmd+Z` to undo the last app-level parameter change, even while an input field is focused.
- Drag plot panels by their handle to reorder the graph area. Plot panes can also be resized from their lower-right corner.
- Use the `View` presets to switch between predefined graph arrangements, and the `Panels` tabs to show or hide individual graph panes. The layout is saved in local browser storage.
- The UI follows the system light/dark color scheme.
- Use the driver search in the Driver panel to scrape candidate T/S parameters from public web pages. Always verify scraped values against the linked source before committing to a build.
- Use the `Known driver` select to load built-in and previously applied scraped drivers.
- The generated Parts Express import currently scans 1,718 sitemap candidates and adds 210 drivers with usable T/S data to `Known driver`.
- Box modes currently include sealed, vented, and passive radiator.
- The passive radiator list includes a built-in reference PR plus scraped Parts Express passive radiators.

## Parts Express Import

```powershell
node scripts/import-parts-express.mjs
```

The importer reads the public Parts Express sitemap, filters likely raw driver product pages, scrapes T/S parameters, and writes `src/data/partsExpressDrivers.js`.

```powershell
node scripts/import-passive-radiators.mjs
```

The passive radiator importer writes `src/data/passiveRadiators.js`.
