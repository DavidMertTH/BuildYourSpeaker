# Build Your Speaker

Build Your Speaker is a browser-based loudspeaker enclosure simulator inspired by WINISD. It models sealed, vented, and passive radiator enclosures and provides interactive graphs for SPL, impedance, cone excursion, port velocity, passive radiator excursion, phase, and a simple box preview.

## Requirements

- Node.js 20 or newer is recommended.
- A modern browser such as Chrome, Edge, Firefox, or Safari.
- npm dependencies are required for the Svelte/Vite build.

## Installation

Clone the repository and enter the project folder:

```bash
git clone <repository-url>
cd BuildYourSpeaker
```

If you downloaded the project as a ZIP file, extract it and open a terminal in the extracted folder instead.

## Run Locally

On Windows PowerShell, the easiest option is:

```powershell
.\start.ps1 -Open
```

The script uses `node` from your PATH when available, and falls back to the bundled Codex Node.js runtime when running inside Codex. If the app is already running, it prints the existing local URL instead of starting a duplicate server. It uses `127.0.0.1` because some Windows setups resolve `localhost` slowly in PowerShell.

Start the local server:

```bash
npm start
```

Then open:

```text
http://localhost:4173
```

You can also start the server directly:

```bash
node server.mjs
```

To use a different port:

```bash
PORT=3000 npm start
```

On Windows PowerShell:

```powershell
$env:PORT=3000
npm start
```

## Open From Another Device

If your phone or tablet is on the same Wi-Fi network as the computer running the server, open the app with the computer's local IP address:

```text
http://<your-computer-ip>:4173
```

Example:

```text
http://192.168.178.42:4173
```

Your operating system firewall may ask for permission to allow Node.js network access.

## Test

Run the test suite:

```bash
npm test
```

Or directly:

```bash
node --test
```

## Deploy On Render

Use a Node Web Service, not a Static Site, because the app also exposes search APIs.

Recommended settings:

```text
Build Command: npm ci --include=dev && npm run build
Start Command: npm start
```

The included `render.yaml` defines these settings and sets `NODE_ENV=production`, so the server serves the Vite/Svelte build from `dist`.

For an existing service configured manually, update **Settings > Build & Deploy** in the Render dashboard. The repository's `render.yaml` does not replace that service's saved commands automatically. Replace a legacy `yarn` build command and `yarn start` start command with the commands above, keep `NODE_ENV=production`, then choose **Manual Deploy > Clear build cache & deploy**. Use npm with the committed `package-lock.json` so deployment uses the tested dependency versions.

The frontend must be compiled during the [build phase](https://render.com/docs/deploys#build-command). Render runs that phase on [separate build resources](https://render.com/docs/build-pipeline), while the start command runs within the web service's memory limit. `npm start` checks that `dist/index.html` exists and reports the required settings if it is missing; it never attempts to compile the frontend in the running service.

## Features

- Sealed, vented, and passive radiator enclosure simulation.
- Multiple identical active drivers per enclosure.
- Parallel and series wiring for driver arrays.
- Config comparison with multiple saved enclosure variants.
- Mobile layout with fixed graphs/configs and scrollable settings.
- Selectable graph views, with separate graphs for port velocity and passive radiator excursion.
- Built-in driver and passive radiator data.
- Driver search that can scrape candidate T/S parameters from public web pages.

## Usage Notes

- Use the `Driver` tab to enter or load driver parameters.
- Use the `Planning` tab to change enclosure type, volume, tuning, and passive radiator settings.
- Use config pills to compare variants and switch the active design.
- On mobile, use the graph dropdown to choose the single visible graph.
- Always verify scraped driver parameters against the original source before building a real enclosure.

## Data Import Scripts

Import Parts Express driver data:

```bash
node scripts/import-parts-express.mjs
```

Import Parts Express passive radiator data:

```bash
node scripts/import-passive-radiators.mjs
```

These scripts read public Parts Express pages and write generated data files into `src/data/`.
