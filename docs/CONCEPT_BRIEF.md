# PROJECT CONCEPT BRIEF
# LIVING RACETRACK
## An Original Connected Motorsport Display Product

**Project type:** Consumer hardware + software startup  
**Category:** Connected wall art, motorsport technology, ambient displays  
**Initial market:** Formula 1 fans, sim-racing enthusiasts, gaming-room owners, motorsport collectors  
**Product strategy:** Develop an original software platform and physical display product that can eventually be sold in Mini, Medium, and Large sizes.

**Working product name:** Living Racetrack  
*This is a placeholder. The brand name must be researched for trademark availability before commercial use.*

---

# 1. EXECUTIVE SUMMARY

I want to create an original physical display product that brings a racetrack to life on a wall, desk, or shelf.

Imagine a beautiful, rectangular, premium display mounted in a gaming room, office, bedroom, or motorsport enthusiast's home. Instead of showing ordinary television content, it displays a real racing circuit with animated representations of cars moving around the track.

The display connects to Wi-Fi and intelligently changes what it shows based on the current motorsport schedule, available live timing data, and the owner's preferences.

When a supported live racing session is available, the device automatically switches to live mode. It displays the appropriate circuit, moving car markers, driver positions, lap information, and selected race statistics.

When no live session is happening, it can automatically play a historical race visualization, selected by the user or chosen randomly from supported historical data.

When the owner wants something calmer, the display switches into ambient mode. A beautifully rendered circuit remains on screen, with subtle motion, optional lighting, and minimal information.

The device should feel like a combination of:

- Premium automotive wall art.
- A live motorsport information display.
- An animated digital collectible.
- A smart home decor product.
- A dedicated motorsport experience that runs without needing a television or computer.

The ultimate objective is to develop a product people would genuinely want to purchase, display in their homes, and recommend to other motorsport fans.

**The central product philosophy is: a racetrack that is always alive.**

This must be an original product. We are not attempting to recreate an existing F1 desktop application or copy another developer's graphical interface. We will design our own visual language, software architecture, animations, physical enclosure, interaction model, and customer experience.

---

# 2. THE PROBLEM

Motorsport fans have several ways to follow racing today:

1. Watch a race on a television.
2. Follow live timing on a phone or computer.
3. Use a sim-racing monitor or telemetry dashboard.
4. Purchase physical circuit maps, posters, or LED track art.
5. Display collectible models, helmets, or other motorsport memorabilia.

However, these experiences are usually separate.

A circuit poster is attractive but static. A live timing application is informative but generally designed for a computer screen. A television is versatile but takes up substantial space and is not always suitable as an ambient decorative object.

Living Racetrack aims to combine the visual appeal of motorsport wall art with the information and motion of live racing.

It should be attractive even to someone who is not actively following a race.

It should also provide a reason to keep it switched on throughout the week, not just during Grand Prix weekends.

---

# 3. THE PRODUCT VISION

Create a premium, connected physical display that transforms a real racetrack into a continuously evolving visual experience.

The product should satisfy five objectives:

**1. Beautiful:** It must look like an intentional piece of interior design rather than an ordinary monitor showing an application.

**2. Intelligent:** It should automatically select an appropriate experience based on available live sessions, historical data, and user settings.

**3. Informative:** It should present racing information without overwhelming the display with text, numbers, and conventional dashboard widgets.

**4. Personalizable:** Owners should be able to control modes, circuits, brightness, colors, animation, and scheduling.

**5. Commercially viable:** The same software platform should support multiple hardware sizes without requiring a completely different application for each version.

---

# 4. THE CORE PRODUCT EXPERIENCE

The device has four principal operating modes.

## 4.1 Live Mode

When a supported live session is occurring and reliable timing data is available, the display automatically enters Live Mode.

The device identifies the session and selects the correct circuit.

The display can show:

- Circuit name.
- Racing series and session type.
- Live or delayed-data status.
- Current lap and total laps, when available.
- Driver positions.
- Animated car representations.
- Timing gaps, when available.
- Sector information, when available.
- Pit-stop activity, when available.
- Safety-car and race-control information, when available.
- Session completion status.

Cars should move around the track according to the best available timing and positional data.

The animation must communicate relative positions and racing progress accurately enough to be useful. It must never present invented positions as genuine live telemetry.

If only interval or sector data is available, the software must use an appropriate interpolation method and clearly distinguish estimated movement from measured positions.

The display should not depend on a user manually opening an application every race weekend.

## 4.2 Historical Race Mode

When a live session is unavailable, the device can play a previously recorded or reconstructed race.

The user can select a historical race manually or enable automatic selection.

Potential selection options include:

- Random historical race.
- A specific season.
- A favorite circuit.
- A favorite driver.
- A favorite team.
- Memorable races.
- Recently watched races.
- Short race highlights or abbreviated replay.
- Full-length race visualization, when supported.

For example, the display might show a historical race from Monaco, Silverstone, Suzuka, or Spa.

The device changes to the relevant circuit and animates the available historical data.

The replay engine should support pause, resume, playback speed, seeking, restart, and session information, depending on the selected hardware and software version.

The archive must contain only data that the product is legally permitted to store and use.

The application should distinguish a reconstructed timing-based replay from an official broadcast or a fully accurate simulation. It does not need to show broadcast video.

## 4.3 Ambient Mode

Ambient Mode is the display's default decorative experience when no race is being watched.

It should look beautiful from across a room.

Possible elements include:

- A minimalist circuit outline.
- A subtle illuminated track.
- Slow-moving car silhouettes.
- Circuit name and location.
- Circuit length.
- Number of corners.
- Small manufacturer-designed interface details.
- Subtle time or date information.
- Optional ambient lighting.
- A restrained clock or next-session countdown.

The user should be able to choose between a static circuit, subtle animation, and a more dynamic screensaver.

Ambient Mode should avoid excessive movement, distracting flashing, large blocks of text, and unnecessary information.

It must support reduced-motion settings, low brightness, and scheduled nighttime behavior.

## 4.4 Event and Race-Finish Mode

This mode provides a more expressive experience around significant events.

Potential triggers include:

- Session start.
- Race start.
- Pit stop.
- Position change.
- Safety-car deployment.
- Red flag.
- Session finish.
- Podium or final classification availability.

Possible visual treatments include a short highlight animation, a controlled lighting change, or a temporary results panel.

These effects must be configurable. The display should never use bright flashing effects that are unsuitable for a bedroom or nighttime environment.

Race-control events should only be shown when supported by reliable data.

---

# 5. AUTOMATIC MODE SELECTION

Automatic behavior is one of the most important features and should be designed as a core system capability.

The device must not simply check whether it is Sunday and assume that a race is occurring.

Instead, it should evaluate:

1. The configured racing series.
2. The current event schedule.
3. Whether a session is scheduled.
4. Whether the session is actually active, when this can be established.
5. Whether live data is available.
6. Whether the session has finished.
7. Whether the user has manually selected another mode.

Recommended decision logic:

- If a supported live session is active and the user permits automatic live mode, show Live Mode.
- If a session is scheduled but live status cannot be verified, show an appropriate scheduled or waiting state rather than falsely claiming the session is live.
- If a session is active but timing data is temporarily unavailable, display a clear connection or data-status indicator.
- If no live session is active, follow the user's selected fallback mode.
- If Historical Race Mode is enabled, select a permitted historical replay.
- Otherwise, show Ambient Mode.
- If the owner manually selects a mode, respect that choice for a configurable period or until the next relevant session.

The system should handle time zones, schedule changes, postponed sessions, cancellations, daylight-saving changes, network outages, and data-source failures.

Users should be able to disable automatic switching completely.

---

# 6. PRODUCT DESIGN AND INDUSTRIAL DESIGN

The physical appearance is a major part of the product's value.

The display must not look like a conventional television with a racing application running on it.

It should look like a purpose-built premium object.

## Design direction

- Horizontal rectangular form.
- Minimal black or graphite frame.
- Clean front surface.
- Slim, carefully proportioned bezel.
- High-quality screen finish.
- Optional rear or edge lighting.
- Hidden or discreet mounting hardware.
- Concealed cables where practical.
- No unnecessary physical controls.
- No oversized logos.
- No permanently visible computer interface.

Potential materials include aluminum, powder-coated metal, quality plastics, acrylic, and glass. The final choice should be driven by durability, weight, safety, heat dissipation, manufacturability, and cost.

The product must look attractive when powered off as well as when running.

The design should be recognizable across all three product sizes.

## Important distinction

Do not assume that the product needs a transparent screen or a complicated custom LED matrix.

Start by testing an ordinary high-quality display inside a well-designed enclosure. A custom screen technology should only be pursued if it materially improves the customer experience enough to justify its additional cost.

---

# 7. THREE PRODUCT SIZES

Develop one software platform and three physical product configurations.

All dimensions and prices below are initial hypotheses. They must be validated through prototypes, customer interviews, supplier quotes, and cost analysis.

## 7.1 MINI — Desktop Edition

**Target dimensions:** Approximately 8–12 inches diagonally.

**Initial target retail price:** $149–249.

Designed for desks, shelves, dorm rooms, gaming setups, home offices, and smaller spaces.

Potential features:

- Compact circuit visualization.
- Animated car markers.
- Basic live-session information.
- Historical race playback.
- Ambient Mode.
- Wi-Fi connectivity.
- Phone-based settings.
- Adjustable brightness.
- USB-C power, if power requirements and