# Living Racetrack · Pit Wall

**A racetrack that is always alive.** Pit Wall turns any screen into an animated motorsport display for your wall: twenty cars racing nonstop around a glowing circuit, with live timing, pit stops, crashes, safety cars, rain and a garage break between races.

It runs in any modern browser, installs like an app, works offline, and can run a Raspberry Pi behind a TV as a dedicated wall display.

![Race view](docs/screenshots/race.png)

> Living Racetrack is an original project by **Arun Pun**. The concept, design, code, teams, drivers and the four original circuits were created for this project. See [docs/ORIGIN.md](docs/ORIGIN.md).

---

## What it does

| | |
|---|---|
| **Race view** | 20 cars, a live timing tower with gaps and tyre compounds, start lights, overtakes, fastest laps and a race feed. |
| **Incidents** | Spins with tyre smoke, crashes into the barrier with debris, yellow flags, safety cars, red flags with a standing restart, and punctures after contact. |
| **Pit cam** | An overhead pit-box camera plays every stop in real time: crew, jacks, wheel change, release light and the stop clock. |
| **Weather** | Dry, wet or a passing shower. Teams switch to intermediates when it rains and back to slicks as it dries. |
| **Garage break** | Between races, an original single-seater rolls into a studio in the winning team's livery, with specs and a racing fact. |
| **Ambient view** | A calm mode with a large clock and circuit details while the cars keep lapping quietly. |
| **44 tracks** | 4 original circuits plus 40 real-layout replicas traced from open map data, named by location. |
| **Your own tracks** | Import any circuit as a GeoJSON file, for example a local kart track drawn on geojson.io. |
| **Customize** | Team names and liveries, favourite team highlight, race length, pace, weather, incidents, night dimming. |

![Pit cam](docs/screenshots/pitcam.png)
![Garage break](docs/screenshots/garage.png)

## Run it

**Quickest:** open `dist/pit-wall.html` in a browser (run `npm run build` first if the folder is missing). It is one self-contained file.

**From source:**

```bash
npm start          # serves the app at http://localhost:8080 (no dependencies to install)
```

**On a wall:** open it on a TV browser, a tablet, or a small PC behind a monitor, then press **Full screen**. Controls hide after a few seconds.

**As an app:** from Chrome or Edge, choose *Install app*. It keeps working without Wi-Fi.

**Dedicated Raspberry Pi display:**

```bash
git clone https://github.com/imarun-pun/living-racetrack.git
cd living-racetrack
bash install/raspberry-pi-kiosk.sh
sudo reboot
```

The Pi boots straight into Pit Wall in kiosk mode, hides the cursor and keeps the screen awake.

**GitHub Pages:** the included workflow publishes the site on every push to `main`. Turn it on under *Settings → Pages → Source: GitHub Actions*.

### Keys

`A` ambient · `N` next race · `C` customize · `F` full screen · `P` pause · `Esc` close panel

## Project layout

```
index.html              page structure
css/style.css           visual design
js/data.js              teams, drivers, tyres, original circuits, default settings
js/tracks-real.js       real-layout track pack (generated)
js/circuit.js           spline geometry, curvature, speed profile, corners, track import
js/sim.js               race simulation: pace, traffic, pit stops, weather, incidents, flags
js/render.js            canvas drawing: track, cars, weather, effects
js/pitcam.js            pit-stop camera
js/garage.js            garage break and the original car design
js/main.js              app shell: race weekend loop, HUD, settings, controls
tools/                  local server, single-file build, track converter
install/                Raspberry Pi kiosk installer
docs/                   origin record, roadmap, customization guide
```

## How the simulation works

Each circuit is smoothed into 1,600 evenly spaced samples. Curvature at each point sets a cornering speed limit, and forward and backward passes add acceleration and braking zones. That gives every track a realistic speed profile; simulated lap times land within a few seconds of real ones on the replica layouts.

Each car has its own pace, tyre wear, and a little noise. Cars follow each other in corners and pass on straights. Gaps in the timing tower come from 40 timing points per lap, the same way real timing loops work. Incidents are more likely in corners, in the rain, and on slick tyres in the wet.

Everything shown is a simulation. It is labelled as such on screen and never presented as live data.

## Customizing

See [docs/CUSTOMIZING.md](docs/CUSTOMIZING.md) for the track file format, team settings and how to add circuits to the built-in packs.

## Roadmap and product plan

See [docs/ROADMAP.md](docs/ROADMAP.md): live sim-racing telemetry, smart lights that follow flags, a phone remote, track packs, hardware editions and subscription tiers.

## License

Source-available under the [PolyForm Noncommercial License 1.0.0](LICENSE.md). You may run, study and modify Pit Wall for personal, educational and other noncommercial use. Selling it, offering it as a paid service, or bundling it with hardware for sale needs a separate commercial license from the author. See [NOTICE](NOTICE).

Third-party material is listed in [THIRD_PARTY.md](THIRD_PARTY.md).

## Disclaimer

Living Racetrack is an independent project. It is not affiliated with, endorsed by or connected to Formula 1, the FIA, any racing series, team, driver or circuit. Teams, drivers and car designs shown are fictional. Real-world layouts are named by their location only and are used for illustration.
