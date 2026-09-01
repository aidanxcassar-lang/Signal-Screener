/* POST /.netlify/functions/share-create
 * Stores a rendered scorecard PNG and returns a public share URL.
 *
 * Why this exists: Twitter, Slack and WhatsApp read og:image from the URL being shared.
 * Sharing the homepage always showed the generic site card. To show a specific coin's
 * scorecard, that card needs its own URL with its own og:image — which needs a server.
 */
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const MAX_BYTES = 3 * 1024 * 1024;   // a 1080x1080 PNG is well under this

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' }
});

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  // Cap BEFORE parsing. The 3MB image check previously ran only after the whole body had
  // already been read into memory, which defeats the point of having a cap.
  const MAX_BODY = 5 * 1024 * 1024;
  const declared = Number(req.headers.get('content-length') || 0);
  if (declared > MAX_BODY) return json(413, { error: 'Request body too large' });
  let raw;
  try { raw = await req.text(); } catch { return json(400, { error: 'Could not read body' }); }
  if (raw.length > MAX_BODY) return json(413, { error: 'Request body too large' });

  let body;
  try { body = JSON.parse(raw); } catch { return json(400, { error: 'Invalid JSON' }); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json(400, { error: 'Expected a JSON object' });
  }

  const dataUrl = String(body.image || '');
  if (!dataUrl.startsWith('data:image/png;base64,')) {
    return json(400, { error: 'Expected a PNG data URL' });
  }
  const b64 = dataUrl.slice('data:image/png;base64,'.length);
  const bytes = Buffer.from(b64, 'base64');
  if (!bytes.length || bytes.length > MAX_BYTES) {
    return json(413, { error: 'Image too large' });
  }
  // Confirm it really is a PNG rather than something mislabelled.
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50 || bytes[2] !== 0x4e || bytes[3] !== 0x47) {
    return json(400, { error: 'Not a valid PNG' });
  }

  const id = crypto.randomBytes(9).toString('base64url');
  const store = getStore('share-cards');
  await store.set(id, bytes, {
    metadata: {
      ticker: String(body.ticker || '').slice(0, 20).toUpperCase(),
      name: String(body.name || '').slice(0, 60),
      quality: Number.isFinite(body.quality) ? body.quality : null,
      opportunity: Number.isFinite(body.opportunity) ? body.opportunity : null,
      riskTier: String(body.riskTier || '').slice(0, 20),
      coverage: Number.isFinite(body.coverage) ? body.coverage : null,
      createdAt: Date.now()
    }
  });

  const site = process.env.SITE_URL || 'https://www.signalscreener.app';
  return json(200, { ok: true, id, url: `${site}/s/${id}` });
};

// No config.path: the default /.netlify/functions/<name> route is correct.
// Declaring a custom path REPLACES that route, and /.netlify/* is reserved,
// so any path declared here makes the function 404 on every request.
