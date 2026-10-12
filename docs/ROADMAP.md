# Roadmap and product plan

Living Racetrack starts as free software anyone can put on a screen, and grows into subscriptions, track packs and dedicated hardware. Prices below are starting guesses to test with real customers, not decisions.

## Shipped

**v0.1 Lapwall:** animated race, timing tower, start lights, safety car, podium, ambient view.
**v0.2 (this version):** spins, crashes, red flags with standing restarts, punctures, pit cam, rain and tyre strategy, garage break with an original car, 40 real-layout replicas, track import, team livery editor, favourite team, night dimming, offline install, Raspberry Pi kiosk.

**v0.3:** your own drivers with names, flags and numbers; season championship; DRS zones; team radio; Zoom-by cars in ambient view; desktop tray app with Zoom-bys above the taskbar.

**v0.4:** slower Zoom-bys that brake mid-screen; pit-board reminders (water, stretch, eyes, your own message); self-hosted fonts and a strict content security policy; desktop app hardening.

**v0.5:** send-a-Zoom-by links and QR codes; podium champagne celebration; fantasy league; real race-weekend calendar; realistic circuit map with gravel traps, grandstands and pit garages; world locator; map zoom; choose the Zoom-by car.

**v0.6:** realistic map on a black background; real safety car that leaves and returns through the pit lane; crane recovery of crashed cars; short `z/` links with preview cards.

**v0.7:** chase cam and onboard view; career mode with upgrades and team offers; Elimination Cup; reverse-grid races; world map hides itself when it would cover the track.

## Next features

### Make it yours
- **Phone remote.** A QR code on screen opens a control page: switch mode, pick a track, follow a team. No app store needed.
- **Predictions.** Pick a winner before lights out; a household leaderboard over the season.
- **Follow cam.** Picture-in-picture zoom that follows your favourite car.
- **Art styles.** Neon (current), blueprint, 1970s poster, watercolour, minimal line. Seasonal drops keep the wall fresh.
- **Your own laps.** Import a GPS lap from a track day or kart session and race your own ghost on the wall.

### Make it live
- **Sim-racing live mode.** A small companion app on the gaming PC reads telemetry from the user's own sim sessions and streams it to the display. Your race, live on your wall, every night, with no licensing barrier because it is the user's own data.
- **Karting track editions.** Kart tracks own their timing data and want screens for customers. A track-specific edition with its layout and live kart timing is a clean B2B product.
- **Real local weather.** When it rains outside, it rains on your circuit.
- **Pro series data.** Only through a proper data licence. Until then everything stays clearly labelled as simulated.

### Make the room react
- **Smart lights.** Philips Hue, Nanoleaf, WLED or Home Assistant lights follow the race: green at lights out, amber for the safety car, red for a red flag, purple for a fastest lap.
- **Sound pack.** Start beeps, a low engine hum, the crowd at the finish, with quiet hours.
- **Multiple screens.** Track map on one screen, timing tower on another, synced.

## Packages

| Package | Price idea | What's included |
|---|---|---|
| **Community** | Free | Web app, original circuits, real-layout replicas, simulation, ambient view, track import, Raspberry Pi kiosk. Noncommercial use. |
| **Lapwall Plus** | $3–5 / month or $29 / year | Art style packs, championship mode, predictions, phone remote, smart-light sync, settings synced across screens, new content each month. |
| **Sim Pro** | $6–8 / month | Plus, live sim-racing telemetry, multi-screen, custom branding for streamers. |
| **Venue licence** | $30–80 / screen / month | Commercial use for bars, sim centres and kart tracks, venue branding, live kart timing integration, support. |
| **Hardware** | see below | Living Racetrack frames with the software built in, 1 year of Plus included. |

## Hardware editions

| Edition | Size | Price idea | Notes |
|---|---|---|---|
| Mini | 8–12 in desk frame | $149–249 | Pi-class board, USB-C power, shelf or desk |
| Medium | 24–27 in wall frame | $399–599 | The main product: art frame first, screen second |
| Large | 43 in+ or ultra-wide bar | $999+ | Statement piece for gaming rooms and venues |

Build order: software first, then one hardware size after demand is proven.

## Validation plan

1. Publish the repository and a GitHub Pages demo.
2. Post a short screen recording to sim-racing and motorsport communities (follow each community's self-promotion rules).
3. Put up a simple landing page with a waitlist and a "which size would you buy?" question.
4. Interview 20–30 people who leave it running for a week: what did they love, what did they switch off?
5. Pitch a pilot to one local kart track.
6. Pre-orders or a crowdfunding campaign before tooling any enclosure.

## Legal checklist before selling

- Trademark search for *Living Racetrack* and *Lapwall*; file for the name you keep.
- Keep official series names, logos, team names and liveries out of the product and marketing.
- Get any live professional-series data only through a written licence.
- Talk to an IP attorney about the enclosure design and the commercial licence terms.
- Form a company before taking money; add a privacy policy once there are accounts.
- Budget for FCC, safety (UL/ETL) and Wi-Fi certification on hardware.
