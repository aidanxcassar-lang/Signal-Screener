/* GET /.netlify/functions/confirm?t=TOKEN — completes double opt-in. */
import { getStore } from '@netlify/blobs';

const page = (title, msg) => new Response(
  `<!doctype html><meta charset="utf-8"><title>${title}</title>
   <body style="font-family:system-ui,sans-serif;background:#0F1219;color:#E6EDF7;
                display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
   <div style="max-width:420px;text-align:center;padding:24px">
     <h1 style="font-size:20px;margin:0 0 10px">${title}</h1>
     <p style="color:#8A9AB8;line-height:1.6;margin:0 0 18px">${msg}</p>
     <a href="/" style="color:#818CF8">Back to Signal Screener</a>
   </div></body>`,
  { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
);

export default async (req) => {
  const token = new URL(req.url).searchParams.get('t');
  if (!token) return page('Invalid link', 'That confirmation link is missing its token.');

  const index = getStore('alerts-index');
  const store = getStore('alerts');
  const { blobs } = await index.list();
  for (const b of blobs) {
    const rec = await store.get(b.key, { type: 'json' }).catch(() => null);
    if (rec && rec.confirmToken === token) {
      rec.confirmed = true;
      rec.confirmedAt = Date.now();
      await store.setJSON(b.key, rec);
      return page('Alerts confirmed',
        'You will be emailed when a tracked asset changes materially. Every email includes an unsubscribe link.');
    }
  }
  return page('Link expired', 'That confirmation link is no longer valid. Set the alert up again from the app.');
};

export const config = { path: '/.netlify/functions/confirm' };
