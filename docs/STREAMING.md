# Streaming Lapwall on Kick, YouTube and Twitch

The **Stream Studio** (`stream.html`) turns your stream into a race your chat drives. Viewers type commands in chat; Lapwall gives them cars with their names on, and they call their own strategy live.

## Set it up in OBS (or Streamlabs)

1. Add a **Browser Source**: URL `https://imarun-pun.github.io/living-racetrack/stream.html`, width **1920**, height **1080**.
2. Right-click the source → **Interact**, hover the bottom-right corner and click **Settings**:
   - **Kick:** your chatroom ID. Open `kick.com/api/v2/channels/YOURNAME` in a browser and find `"chatroom":{"id":…`.
   - **YouTube:** the live video ID (the part after `watch?v=`) and a YouTube Data API v3 key from Google Cloud Console. Reading chat uses API quota; the free quota covers a few hours a day.
   - **Twitch:** your channel name. No key needed.
3. Click **Connect**. The connection status shows bottom-left. **Test with fake chat** lets you try it before going live.

Prefer no clicking? Put the settings in the address (keep it private, it contains your key):
`stream.html#kick=1234567&twitch=yourname&yt=VIDEOID&ytkey=YOURKEY`

## Chat commands

| Command | What it does |
|---|---|
| `!join` | Take a car. Your name goes on it straight away. 20 cars; a seat frees up if its owner is quiet for 10 minutes. |
| `!push` | Faster, but the tyres wear quicker and mistakes are likelier |
| `!save` | Slower, kinder to the tyres, safer |
| `!normal` | Back to normal pace |
| `!box` | Pit this lap for fresh tyres |
| `!boost` | Overtake boost, once a lap |
| `!pick CODE` | Predict the winner (driver code, car number or name) before the end of lap 1 |
| `!leave` | Give your car back |

## The chat championship

Viewers score 25-18-15-12-10-8-6-4-2-1 for where their car finishes, plus 5 for calling the winner. The table stays on screen across races and is saved in OBS's browser until you reset it in Settings. Sprint races (6 laps, about 3 minutes) work best for chat.

## Ideas for stream formats

- **Chat Grand Prix:** an evening of sprints, crown the chat champion at the end.
- **Elimination night:** set *Customize → Format → Elimination Cup*: the slowest quarter is knocked out each race.
- **Streamer vs chat:** play Story mode in another window, or race your own car with the pit-wall keys (1 2 3 B O), while chat runs the rest of the grid.
- **World Race watch-along:** switch to *Play → World Race* and react to the same race your viewers can open on their own phones.

## Privacy and safety

Only the Stream Studio page connects to the internet, and only to read chat: YouTube's API, Kick's chat socket and Twitch's chat socket. It never posts to chat. Names and messages are shown as plain text, never as HTML, and each viewer can send one command every 1.5 seconds. Your key stays in this browser.
