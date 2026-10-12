#!/usr/bin/env python3
"""Records Lapwall's Live Art as an MP4 for TVs and signage screens that play videos from a USB stick.

Each frame is stepped exactly (the page's clock only moves when this script says so), then piped
to ffmpeg. The video runs from the start lights to the end of the garage break, fading in from and
out to black, so a playlist of these loops cleanly on a TV's "repeat all".

  pip install playwright && python -m playwright install chromium     (once)
  python tools/render-video.py --track gb-1948 --light night --out "TV/01 Silverstone night.mp4"

Needs ffmpeg on the PATH. A 12-lap race is about 6 minutes of video and takes 10-20 minutes to render.
"""
import argparse, functools, http.server, os, shutil, subprocess, sys, threading, asyncio

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def serve():
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    handler = functools.partial(Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv

async def record(a):
    from playwright.async_api import async_playwright
    w, h = map(int, a.size.lower().split('x'))
    srv = serve(); port = srv.server_address[1]
    q = f"capture&light={a.light}&laps={a.laps}" + (f"&track={a.track}" if a.track else '') + ('' if a.garage else '&garage=0')
    os.makedirs(os.path.dirname(os.path.abspath(a.out)) or '.', exist_ok=True)
    ff = subprocess.Popen([shutil.which('ffmpeg') or 'ffmpeg', '-y', '-loglevel', 'error',
        '-f', 'image2pipe', '-framerate', str(a.fps), '-c:v', 'mjpeg', '-i', '-',
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000',
        '-map', '0:v', '-map', '1:a', '-shortest',
        '-c:v', 'libx264', '-preset', a.preset, '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level', '4.2',
        '-maxrate', '14M', '-bufsize', '28M', '-g', str(a.fps * 2),
        '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart',
        '-metadata', 'title=Lapwall Live Art', '-metadata', 'comment=Lapwall by Arun Pun', a.out], stdin=subprocess.PIPE)
    dt = 1000 / a.fps
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--disable-gpu-vsync', '--force-color-profile=srgb'])
        pg = await b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
        errors = []; pg.on('pageerror', lambda e: errors.append(str(e)))
        await pg.goto(f'http://127.0.0.1:{port}/index.html?{q}')
        await pg.evaluate("document.fonts.ready")
        await pg.evaluate("""() => { const d = document.createElement('div'); d.id = 'capfade';
          d.style.cssText = 'position:fixed;inset:0;background:#000;z-index:99;pointer-events:none;opacity:1'; document.body.appendChild(d);
          document.querySelectorAll('*').forEach(el => { el.style.transitionDuration = '0s'; }); }""")
        for _ in range(3): await pg.evaluate(f"__capture.step({dt})")
        start_round = await pg.evaluate("__pw.round")
        fade_n, n, limit = a.fps, 0, int(a.max_minutes * 60 * a.fps)
        async def shot(opacity=None):
            if opacity is not None: await pg.evaluate(f"document.getElementById('capfade').style.opacity = '{opacity:.3f}'")
            ff.stdin.write(await pg.screenshot(type='jpeg', quality=93))
        while n < limit:
            await pg.evaluate(f"__capture.step({dt})")
            if await pg.evaluate("__pw.round") >= start_round + a.races: break
            await shot(max(0.0, 1 - n / fade_n) if n <= fade_n else None)
            n += 1
            if n % (a.fps * 30) == 0: print(f'  {n / a.fps / 60:.1f} min recorded', flush=True)
        for k in range(1, int(a.fps * 1.5) + 1):                 # fade out to black
            await pg.evaluate(f"__capture.step({dt})"); await shot(k / (a.fps * 1.5))
        await b.close()
    ff.stdin.close(); ff.wait(); srv.shutdown()
    if errors: print('Page errors:', errors[:3], file=sys.stderr)
    print(f'Wrote {a.out} · {n / a.fps / 60:.1f} min')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--track', default='', help='circuit id, e.g. gb-1948 (see js/tracks-real.js and js/data.js); empty = random')
    ap.add_argument('--light', default='night', choices=['night', 'day'])
    ap.add_argument('--laps', type=int, default=12, choices=[6, 12, 20])
    ap.add_argument('--races', type=int, default=1, help='how many races (with podium and garage) in one video')
    ap.add_argument('--no-garage', dest='garage', action='store_false')
    ap.add_argument('--size', default='1920x1080')
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--preset', default='medium', help='x264 preset: slower = smaller file')
    ap.add_argument('--max-minutes', type=float, default=30)
    ap.add_argument('--out', required=True)
    asyncio.run(record(ap.parse_args()))
