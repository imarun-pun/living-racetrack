# Security and privacy

Pit Wall is built so there is nothing to steal.

## What the app does with your data

- **No accounts, no server, no tracking.** The app is a set of static files. It has no backend, no analytics and no ads.
- **No network requests.** Fonts, flags and tracks are bundled. A strict Content Security Policy blocks the page from loading or sending anything to another site.
- **Your settings stay on your device.** Driver names, flags, season points and reminders live in your browser's local storage (or the desktop app's own storage). They are never uploaded. Clearing site data, or **Customize → Reset everything**, removes them.

## How it is hardened

- Everything you type (driver and team names, reminder text, imported track names) is treated as plain text, escaped before display and clamped to a fixed length. Saved settings are re-validated every time they load.
- Imported track files are parsed as JSON only, never run as code, and are rejected over 5 MB or 20,000 points.
- Desktop app (Electron): context isolation, sandboxed renderers and no Node.js access in any page; navigation, pop-ups, embedded web views and device permissions (camera, microphone, location, notifications) are all blocked. The drive-by window is click-through and never takes focus.
- Dependencies: the web app has none. The desktop app only uses Electron and electron-builder for packaging; Dependabot watches them and the GitHub Actions for updates.

## Keeping the repository safe

- Turn on two-factor authentication for the GitHub account that owns this repository.
- Never commit passwords, API keys or tokens. GitHub secret scanning is on for public repositories.
- Review pull requests from others before merging; keep `main` protected (Settings → Branches).

## Reporting a problem

If you find a security issue, please do not open a public issue. Use **Security → Report a vulnerability** on this repository so it can be fixed privately.
