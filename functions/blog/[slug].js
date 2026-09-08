// =============================================================================
// functions/blog/[slug].js — becomes GET /blog/:slug
//
// The [slug] filename is Cloudflare Pages Functions' convention for a
// dynamic route segment — context.params.slug gives the actual value from
// the URL. Server-rendered for the same SEO reason as blog/index.js.
// =============================================================================

import { escapeHtml, PAGE_HEAD, BRAND_HEADER } from '../_shared/html.js';

export async function onRequestGet(context) {
  const { env, params } = context;
  const slug = params.slug;

  if (!env.ARTICLES_KV) {
    return new Response('Blog storage is not set up yet.', { status: 200, headers: { 'content-type': 'text/plain' } });
  }

  const raw = await env.ARTICLES_KV.get(`article:${slug}`);
  if (!raw) {
    return new Response('Article not found.', { status: 404, headers: { 'content-type': 'text/plain' } });
  }
  const article = JSON.parse(raw);
  if (article.published === false) {
    // Draft — not for public eyes yet. Preview it from /admin.html instead,
    // which renders drafts inline without needing this route to trust a
    // password passed around in a shareable URL.
    return new Response('This article is still a draft.', { status: 404, headers: { 'content-type': 'text/plain' } });
  }

  const paragraphs = String(article.content || '')
    .split(/\n\s*\n/)
    .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
    .join('');

  const publishedDate = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(article.title)}</title>
<meta name="description" content="${escapeHtml(article.summary)}">
<meta property="og:title" content="${escapeHtml(article.title)}">
<meta property="og:description" content="${escapeHtml(article.summary)}">
<meta property="og:type" content="article">
${PAGE_HEAD}
</head>
<body>
<div class="wrap">
  ${BRAND_HEADER}
  <h1>${escapeHtml(article.title)}</h1>
  <div class="meta">${escapeHtml(publishedDate)}</div>
  <article>${paragraphs}</article>
  <a href="/blog" class="backlink">← More articles</a>
</div>
</body>
</html>`;

  return new Response(html, { headers: { 'content-type': 'text/html;charset=UTF-8' } });
}
