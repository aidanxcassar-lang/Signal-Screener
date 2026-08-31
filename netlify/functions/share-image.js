/* GET /card/:id.png — serves the stored scorecard so crawlers can fetch it. */
import { getStore } from '@netlify/blobs';

export default async (req) => {
  const file = new URL(req.url).pathname.split('/').pop() || '';
  const id = file.replace(/\.png$/i, '').slice(0, 40);
  const store = getStore('share-cards');
  let bytes;
  try { bytes = await store.get(id, { type: 'arrayBuffer' }); } catch { bytes = null; }
  if (!bytes) return new Response('Not found', { status: 404 });
  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      // Cards are immutable once created, so they can be cached hard.
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
};

export const config = { path: '/card/:file' };
