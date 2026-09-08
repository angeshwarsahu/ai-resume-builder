// =============================================================================
// functions/api/kv-articles.js — becomes /api/kv-articles
//
// Storage: Cloudflare KV (a free key-value store — see README for how to
// create and bind the namespace, no credit card needed). Each article is
// stored under key `article:{slug}`.
//
// GET  /api/kv-articles          -> list of all articles (public, for the blog list)
// GET  /api/kv-articles?slug=x   -> single article (public, for the article page)
// POST /api/kv-articles          -> create or update an article. Requires
//                                    { password } matching env.ADMIN_PASSWORD
//                                    in the body — this is a single-owner
//                                    blog, not a multi-user system, so a
//                                    shared secret is an honest, appropriately
//                                    simple amount of protection for it.
// DELETE (via POST with {password, slug, delete:true}) -> removes an article.
// =============================================================================

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  if (!env.ARTICLES_KV) {
    return json({ success: false, errorCode: 'NOT_CONFIGURED', message: 'Article storage is not set up yet (ARTICLES_KV binding missing — see README).' });
  }
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');

  if (slug) {
    const raw = await env.ARTICLES_KV.get(`article:${slug}`);
    if (!raw) return json({ success: false, errorCode: 'NOT_FOUND', message: 'Article not found.' }, 404);
    return json({ success: true, data: JSON.parse(raw) });
  }

  const list = await env.ARTICLES_KV.list({ prefix: 'article:' });
  const articles = [];
  for (const key of list.keys) {
    const raw = await env.ARTICLES_KV.get(key.name);
    if (raw) articles.push(JSON.parse(raw));
  }
  articles.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
  return json({ success: true, data: articles });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.ARTICLES_KV) {
    return json({ success: false, errorCode: 'NOT_CONFIGURED', message: 'Article storage is not set up yet (ARTICLES_KV binding missing — see README).' });
  }
  if (!env.ADMIN_PASSWORD) {
    return json({ success: false, errorCode: 'NOT_CONFIGURED', message: 'ADMIN_PASSWORD is not set on the server yet — see README.' });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ success: false, errorCode: 'INVALID_INPUT', message: 'Malformed JSON body.' }, 400);
  }

  if (body.password !== env.ADMIN_PASSWORD) {
    return json({ success: false, errorCode: 'UNAUTHORIZED', message: 'Wrong admin password.' }, 401);
  }

  if (body.delete) {
    if (!body.slug) return json({ success: false, errorCode: 'INVALID_INPUT', message: 'slug is required to delete.' }, 400);
    await env.ARTICLES_KV.delete(`article:${body.slug}`);
    return json({ success: true, data: { deleted: body.slug } });
  }

  const { slug, title, summary, content, published } = body;
  if (!slug || !title || !content) {
    return json({ success: false, errorCode: 'INVALID_INPUT', message: 'slug, title, and content are required.' }, 400);
  }

  const existingRaw = await env.ARTICLES_KV.get(`article:${slug}`);
  const existing = existingRaw ? JSON.parse(existingRaw) : null;

  const article = {
    slug,
    title: String(title).slice(0, 200),
    summary: String(summary || '').slice(0, 300),
    content: String(content).slice(0, 20000),
    // Explicit boolean from the admin form: the "Save draft" button sends
    // false, "Publish" sends true. Editing an already-published article and
    // saving again keeps it published unless the caller says otherwise.
    published: typeof published === 'boolean' ? published : (existing?.published ?? false),
    publishedAt: existing?.publishedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await env.ARTICLES_KV.put(`article:${slug}`, JSON.stringify(article));
  return json({ success: true, data: article });
}
