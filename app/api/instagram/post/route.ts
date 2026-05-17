import { z } from 'zod';
import { getServerEnv } from '@/lib/env';

// Minimal Instagram Graph API posting.
// Requires a Business/Creator IG account connected to a Facebook Page.
// Docs: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing/

const BodySchema = z.object({
  caption: z.string().default(''),
  // Must be a publicly reachable URL (Graph API cannot fetch localhost/data URLs).
  imageUrl: z.string().url(),
});

async function igFetch(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export async function POST(req: Request) {
  const env = getServerEnv();

  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_IG_USER_ID;

  if (!accessToken || !igUserId) {
    return new Response(
      JSON.stringify({
        error: 'Missing INSTAGRAM_ACCESS_TOKEN or INSTAGRAM_IG_USER_ID on server',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const { caption, imageUrl } = parsed.data;

  // 1) Create media container
  const createUrl = new URL(`https://graph.facebook.com/v19.0/${igUserId}/media`);
  createUrl.searchParams.set('image_url', imageUrl);
  createUrl.searchParams.set('caption', caption);
  createUrl.searchParams.set('access_token', accessToken);

  const created = await igFetch(createUrl.toString(), { method: 'POST' });
  if (!created.res.ok) {
    return new Response(
      JSON.stringify({
        step: 'create_container',
        error: created.data?.error?.message || 'Failed to create media container',
        details: created.data,
      }),
      { status: 502, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  const creationId = created.data?.id as string | undefined;
  if (!creationId) {
    return new Response(JSON.stringify({ step: 'create_container', error: 'No creation id returned', details: created.data }), {
      status: 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  // 2) Publish container
  const publishUrl = new URL(`https://graph.facebook.com/v19.0/${igUserId}/media_publish`);
  publishUrl.searchParams.set('creation_id', creationId);
  publishUrl.searchParams.set('access_token', accessToken);

  const published = await igFetch(publishUrl.toString(), { method: 'POST' });
  if (!published.res.ok) {
    return new Response(
      JSON.stringify({
        step: 'publish',
        error: published.data?.error?.message || 'Failed to publish media',
        creationId,
        details: published.data,
      }),
      { status: 502, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      creationId,
      mediaId: published.data?.id || null,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' } }
  );
}
