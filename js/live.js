/* Live join: viewers' phones (play.html) send their name and their calls to the streamer's race (stream.html).
   It runs over ntfy.sh, a free, open-source publish/subscribe service: no account and no setup. Each room is a
   random, unguessable topic. Messages only go one way (phone → stream), so the stream never posts anything;
   viewers see their car on the stream itself. Add "&test" to both links to try it with tabs on one computer. */
window.PW = window.PW || {};
(() => {
const HOST = 'ntfy.sh';
PW.newRoomId = () => Array.from(crypto.getRandomValues(new Uint8Array(14)), b => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
const topic = room => 'lapwall-' + room;
const okRoom = room => /^[a-z0-9]{10,24}$/.test(room);

/* The stream's side: listen for messages in a room. Reconnects on its own. */
PW.liveListen = function (room, test, onMsg, onStatus) {
  const status = (s, ok) => { try { onStatus && onStatus(s, ok); } catch (e) { /* ignore */ } };
  if (!okRoom(room)) { status('bad room', false); return null; }
  const handle = text => { let m; try { m = JSON.parse(text); } catch (e) { return; } if (m && typeof m === 'object') onMsg(m); };
  if (test) {
    const bc = new BroadcastChannel('lapwall-' + room); bc.onmessage = e => handle(e.data);
    setTimeout(() => status('test mode (this computer only)', true), 50);
    return { close: () => bc.close() };
  }
  let ws = null, closed = false, tries = 0;
  const open = () => {
    if (closed) return;
    ws = new WebSocket(`wss://${HOST}/${topic(room)}/ws`);
    ws.onopen = () => { tries = 0; status('ready for viewers', true); };
    ws.onmessage = e => { let ev; try { ev = JSON.parse(e.data); } catch (err) { return; } if (ev.event === 'message' && typeof ev.message === 'string' && ev.message.length < 600) handle(ev.message); };
    ws.onclose = () => { if (closed) return; status('reconnecting…', false); setTimeout(open, Math.min(30000, 2000 * ++tries)); };
  };
  open();
  return { close: () => { closed = true; if (ws) ws.close(); } };
};

/* A phone's side: send one message to the room. */
PW.liveSend = function (room, test, msg) {
  if (!okRoom(room)) return Promise.reject(new Error('bad room'));
  const body = JSON.stringify(msg);
  if (test) { const bc = new BroadcastChannel('lapwall-' + room); bc.postMessage(body); bc.close(); return Promise.resolve(); }
  return fetch(`https://${HOST}/${topic(room)}`, { method: 'POST', body, headers: { 'Content-Type': 'text/plain' }, cache: 'no-store', referrerPolicy: 'no-referrer' })
    .then(r => { if (!r.ok) throw new Error(r.status === 429 ? 'Too many taps, slow down a little' : 'Could not reach the stream'); });
};
})();
