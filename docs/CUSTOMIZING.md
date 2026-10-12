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

## Drivers

Open **Customize → Drivers**. Each row is one car: flag, full name and car number. Slots 1–2 drive for the first team, 3–4 for the second, and so on. The three-letter timing code comes from the surname ("Arun Pun" → PUN). Defaults live in `PW.DEFAULT_DRIVERS` in `js/data.js`; flags are in `js/flags.js` (add a country by adding a drawing function and a name).

## Season

Every finished race adds points: 25, 18, 15, 12, 10, 8, 6, 4, 2, 1 for the top ten, plus 1 for the fastest lap if that driver finishes in the top ten. Standings show in the Customize panel and during the garage break. **Start a new season** clears them.

## Drive-bys

In the web app, cars drive by in the ambient view every few minutes (turn it off under **Customize → Room**, press `D` to trigger one). The desktop app uses the same drivers and teams and is configured from its tray menu.

## Pit-board reminders

**Customize → Drive-bys and pit-board reminders.** Turn on *Drink water*, *Stretch break* or *Rest your eyes* and pick how often. *My own message* puts any short text (up to 28 characters) on the board, for example "Call Mom". *Drive-by speed* sets how long a car takes to cross the screen: 5, 9 or 14 seconds. Press `W` for a water reminder right now. In the desktop app the same reminders are set from the tray menu; your own message text comes from the Pit Wall settings.

## Send a drive-by

Click **Send a drive-by** (or open `send.html`). Pick an occasion, write who it's for and a short message, choose your flag, colour and number, then **Create link and QR code**. Send it by email, text or any app, or print the QR code on a card. The whole message is stored inside the link after the `#`, so nothing is uploaded anywhere.

### Shorter, friendlier links

Links look like `…/living-racetrack/z/#WzAsIlNhYmluYSJd`. In iMessage, WhatsApp, Slack and most email apps they show as a preview card ("Zoooom! A race car is coming for you") instead of a raw address. To drop the GitHub name from the link entirely, buy a short domain (for example `pitwall.fun`), then in the repository open **Settings → Pages → Custom domain**, enter it, and add the DNS records GitHub shows. Links become `pitwall.fun/z/#…`. After switching, update `PW.HOME` in `js/share.js` and the `og:image` address in `z/index.html`.

## Fantasy league and real race weekends

In **Customize → Season**, add up to eight players and give each two drivers. Their score is those drivers' season points. In **Customize → Tracks**, *Follow the real race calendar* makes Pit Wall race the real weekend's circuit; update `js/calendar.js` once a year with the new dates.

## Teams

Edit names and both livery colours in the Customize panel, or change the defaults in `PW.DEFAULT_TEAMS` in `js/data.js`. Driver codes and car numbers are in `PW.CODES` and `PW.NUMBERS`.

## Race behaviour

| Setting | Where | Notes |
|---|---|---|
| Race length | Panel | 6, 12 or 20 laps |
| Pace | Panel | real seconds per lap: 16, 24 or 40 |
| Weather | Panel | surprise me, always dry, always wet |
| Incidents | Panel | spins, crashes, safety cars, red flags, punctures |
| Incident rate | `js/sim.js`, `rate = .0004 …` | higher means more chaos |
| Grip and speed | `js/circuit.js`, `VMAX`, `ALAT` | top speed (m/s) and cornering grip (m/s²) |
| Default settings | `PW.DEFAULT_SETTINGS` in `js/data.js` | applied on first run and on reset |

## Night dimming

Turn on **Dim the display at night** and set the hours. The screen drops to about 40 % brightness inside that window.
