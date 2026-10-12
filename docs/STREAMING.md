# Streaming Lapwall on Kick or YouTube

Share the race on your stream and let viewers take cars from their phones. No chat bots, no keys, no sign-ups.

## How it works

1. Open **stream.html** (Play → Stream Studio) on the computer you stream from.
2. Capture that browser window in OBS, or share the screen. 1920 × 1080 looks best. OBS's Browser Source works too.
3. Hover the bottom-right corner → **Settings** → **Copy** the join link and paste it into your Kick or YouTube chat. The QR code on screen opens the same link.
4. Viewers open the link on their phone, type a name and tap **Join the race**. Their name goes on a car straight away, and the stream shows "Max takes car #12".
5. From their phone they run their car's strategy: **Push**, **Normal**, **Save tyres**, **Box this lap**, **⚡ Boost** (once a lap). They can also **pick the winner** before lap 2 by typing a driver code from the screen.

Viewers score 25-18-15-12-10-8-6-4-2-1 for where their car finishes, plus 5 for calling the winner. The viewer championship stays on screen across races. Sprint races (6 laps, about 3 minutes) work best; set it in Settings.

## Good to know

- **20 cars.** A seat frees up when its owner has been quiet for 10 minutes or gives the car back.
- **Moderation.** Settings → *Drivers in this room* lists everyone; **Remove** takes a car back and ignores that phone.
- **New link.** Settings → *New link* starts a fresh room; old links stop working.
- **Try it first.** Settings → *Open a test phone* opens the phone page in a new tab. For a fully offline test, open `stream.html#test`; test phones then only work in tabs of the same browser.

## How the phones reach your stream

Phones send their calls through [ntfy.sh](https://ntfy.sh), a free, open-source message service that needs no account. Each room is a random, unguessable channel. Messages only go one way, phone to stream, and only carry a name, a random phone ID and the call. Lapwall itself stores nothing online. If ntfy.sh is ever down, live join pauses and the race keeps running.
