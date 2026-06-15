# Build Your Speaker

Build Your Speaker is a browser-based loudspeaker enclosure simulator inspired by WINISD. It models sealed, vented, and passive radiator enclosures and provides interactive graphs for SPL, impedance, cone excursion, port velocity, passive radiator excursion, phase, and a simple box preview.

## Requirements

- Node.js 20 or newer is recommended.
- A modern browser such as Chrome, Edge, Firefox, or Safari.
- No npm package installation is currently required. The app uses browser ES modules and a small local Node.js static server.

## Installation

Clone the repository and enter the project folder:

```bash
git clone <repository-url>
cd BuildYourSpeaker
```

If you downloaded the project as a ZIP file, extract it and open a terminal in the extracted folder instead.

## Run Locally

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

## Features

- Sealed, vented, and passive radiator enclosure simulation.
- Multiple identical active drivers per enclosure.
- Parallel and series wiring for driver arrays.
- Config comparison with multiple saved enclosure variants.
- Mobile layout with fixed graphs/configs and scrollable settings.
- Selectable graph views, with separate graphs for port velocity and passive radiator excursion.
- Built-in driver and passive radiator data.
- Driver search that can scrape candidate T/S parameters from public web pages.
- Auto planning tools for buildable sealed, vented, and passive radiator candidates.

## Usage Notes

- Use the `Driver` tab to enter or load driver parameters.
- Use the `Planning` tab to change enclosure type, volume, tuning, passive radiator settings, and auto plan constraints.
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
