# Lapwall wall kit: selling it on a USB stick

The wall kit turns any screen into Live Art. One stick, two ways to use it:

| Folder on the stick | For | How it plays |
|---|---|---|
| `TV - plug the stick into the TV` | Any smart TV or signage screen | Looping MP4 videos in the TV's own media player. No computer, no internet. |
| `Computer - Windows, Mac, Linux` | A PC, mini PC or laptop connected to the screen | The live app in locked **wall display mode**: endless new races, floodlights that follow the time of day. |

At the top of the stick: `START HERE.html` (instructions with the buyer's name), `lapwall.license` (their signed licence) and `lapwall-display.json` (tells the app to start straight in wall display mode).

## One-time setup (on your own computer)

You need Node 20+, ffmpeg (`winget install ffmpeg` on Windows, `brew install ffmpeg` on a Mac) and a copy of this repo.

1. **Make your signing key, once.**
   ```
   node tools/license.mjs keygen
   ```
   - The private key goes to `~/.lapwall/lapwall-license-private.pem`. Back it up offline (password manager or encrypted stick). Never commit, email or paste it. If you lose it you cannot sell new licences that existing apps accept; if it leaks, anyone can make licences.
   - The public key goes to `desktop/license-public.pem`. Commit and push it.
2. **Build the apps.** In GitHub: Actions → *Build desktop app* → Run workflow. When it finishes, download the three artifacts into one folder, for example `desktop-builds/`. You want `Lapwall-Portable-*.exe`, `Lapwall-*-mac.zip` and `Lapwall-*.AppImage`.
3. **Render the TV videos.** Actions → *Render TV videos* → Run workflow (night or day, race length). Download the `tv-videos` artifact into `tv-masters/`. Rendering takes 15 to 30 minutes per circuit, in parallel. You can also render locally: `python tools/render-video.py --track gb-1948 --light night --out "tv-masters/01 Silverstone (night).mp4"`.

Do steps 2 and 3 again only when you release a new version.

## For each sale

Plug in a blank USB stick (16 GB or more, exFAT or FAT32), then:

```
node tools/usb-kit.mjs --name "Buyer Name" --videos tv-masters --apps desktop-builds --out E:\
```

(On a Mac, `--out /Volumes/LAPWALL`.) The script:

1. signs a licence for the buyer and adds the sale to `~/.lapwall/sales.csv`
2. stamps `LAPWALL LW-XXXX-XXXX` (their licence ID) small in the corner of every TV video, and writes their name and ID into the video files' metadata
3. copies the apps, the display config and `START HERE.html`

A kit with seven 6-minute 1080p videos is about 3 to 4 GB. For a digital download instead of a stick, run the same command with `--out` pointing at a folder and zip it.

To check a licence someone sends you: `node tools/license.mjs check lapwall.license`.

## What the protection does, and what it cannot do

Nothing that runs on someone else's screen can be made impossible to copy. The kit makes copying pointless or traceable, and makes tampering hard:

- **Licences can't be forged.** They are signed with your Ed25519 private key; the app only has the public key. Changing one letter of a licence makes it invalid. Without a valid licence the app runs as a watermarked preview.
- **Leaks lead back to the buyer.** Every video shows the buyer's licence ID and carries their name in its metadata. Your `sales.csv` maps IDs to buyers.
- **The wall display can't be messed with.** It runs in kiosk mode: no cursor, keyboard swallowed, no right-click, no developer tools, closing blocked. Leaving needs `Ctrl+Shift+L` plus the owner's PIN. The PIN is stored as a salted scrypt hash, and wrong guesses lock it for a minute, doubling each time. It reloads itself if it crashes and keeps the screen awake.
- **The app can't easily be turned into something else.** Electron's run-as-Node, `NODE_OPTIONS` and inspector switches are fused off at build time. The app only loads from its packaged archive. Pages can't navigate away, open pop-ups or ask for camera, microphone or location.

Gaps to close as sales grow:

- **Code signing.** Windows (an OV or EV certificate) and macOS (an Apple Developer ID, about $99 a year, plus notarization) stop the "unknown publisher" warnings. They also make any modified app fail its signature check. This is the single biggest upgrade.
- **The public repo and website.** The free web version at github.io and the source on GitHub can be used without a licence. Keep the free version as the demo that sells the kit, or make the repo private (GitHub Pages on a private repo needs GitHub Pro) and host the demo separately.
- **Licences are not tied to one stick or machine.** That keeps it simple for buyers (they can move the stick between screens). Tying it to hardware would need an activation server.
