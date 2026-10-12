# Customizing Pit Wall

Most changes can be made from the **Customize** panel on screen. Settings are saved in that browser.

## Import a track

Click **Import track file** and choose one of these:

1. **GeoJSON** with a `LineString` or `Polygon` in longitude/latitude. Draw your local kart track on [geojson.io](https://geojson.io), or export a raceway from OpenStreetMap. The first point becomes the start/finish line, and points should run in race direction.
2. **Plain JSON** list of points in metres:

```json
{ "name": "Garage Loop", "points": [[0, 0], [400, 0], [480, 80], [480, 300], [0, 300]] }
```

Optional GeoJSON properties: `name` or `Location` (display name) and `length` (metres; otherwise measured from the line).

Imported tracks need at least 8 points and must be longer than 500 m. Up to 12 are kept.

## Add a track to the built-in packs

Original circuits live in `js/data.js` under `PW.ORIGINAL_CIRCUITS`. Each one is a list of control points in a 1.6 × 1 box that a spline smooths into a track:

```js
{ id: 'my-circuit', name: 'My Circuit', place: 'Somewhere · night race', length: 5000, hue: '#38c6ff', kind: 'original',
  pts: [[.1, .7], [.5, .8], /* … at least 8 points, no crossings unless you want a figure-eight */] }
```

The start line is placed automatically on the longest straight.

Real layouts are generated into `js/tracks-real.js` by:

```bash
python3 tools/convert-tracks.py path/to/f1-circuits.geojson
```

## Teams

Edit names and both livery colours in the Customize panel, or change the defaults in `PW.DEFAULT_TEAMS` in `js/data.js`. Driver codes and car numbers are in `PW.CODES` and `PW.NUMBERS`.

## Race behaviour

| Setting | Where | Notes |
|---|---|---|
| Race length | Panel | 6, 12 or 20 laps |
| Pace | Panel | real seconds per lap: 16, 24 or 40 |
| Weather | Panel | surprise me, always dry, always wet |
| Incidents | Panel | spins, crashes, safety cars, red flags, punctures |
| Incident rate | `js/sim.js`, `rate = .00055 …` | higher means more chaos |
| Grip and speed | `js/circuit.js`, `VMAX`, `ALAT` | top speed (m/s) and cornering grip (m/s²) |
| Default settings | `PW.DEFAULT_SETTINGS` in `js/data.js` | applied on first run and on reset |

## Night dimming

Turn on **Dim the display at night** and set the hours. The screen drops to about 40 % brightness inside that window.
