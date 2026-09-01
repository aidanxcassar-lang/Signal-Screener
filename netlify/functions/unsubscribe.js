/* GET /.netlify/functions/unsubscribe?t=TOKEN — one click, no login, removes everything. */
import { getStore } from '@netlify/blobs';

const page = (msg) => new Response(
  `<!doctype html><meta charset="utf-8"><title>Unsubscribed</title>
   <body style="font-family:system-ui,sans-serif;background:#0F1219;color:#E6EDF7;
                display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
   <div style="max-width:420px;text-align:center;padding:24px">
     <h1 style="font-size:20px;margin:0 0 10px">Unsubscribed</h1>
     <p style="color:#8A9AB8;line-height:1.6">${msg}</p>
   </div></body>`,
  { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
);

export default async (req) => {
  const token = new URL(req.url).searchParams.get('t');
  if (!token) return page('That link is missing its token.');
  const index = getStore('alerts-index');
  const store = getStore('alerts');
  const { blobs } = await index.list();
  for (const b of blobs) {
    const rec = await store.get(b.key, { type: 'json' }).catch(() => null);
    if (rec && rec.unsubToken === token) {
      await store.delete(b.key);
      await index.delete(b.key);
      return page('Your alerts have been removed and your address deleted.');
    }
  }
  return page('That subscription no longer exists.');
};
// No `config.path` export: `/.netlify/*` is a reserved prefix, so declaring a custom path
// there suppresses the default `/.netlify/functions/unsubscribe` route without replacing it.
