// =============================================================================
// functions/blog/index.js — becomes GET /blog
//
// Server-rendered on purpose (not the React app) — search engines and social
// media link-preview crawlers see real, immediate HTML here, with no
// JavaScript execution required, which is exactly what you want for content
// meant to be found via Google.
// =============================================================================

import { escapeHtml, PAGE_HEAD, BRAND_HEADER } from '../_shared/html.js';

export async function onRequestGet(context) {
  const { env } = context;

  if (!env.ARTICLES_KV) {
    return new Response('Blog storage is not set up yet.', { status: 200, headers: { 'content-type': 'text/plain' } });
  }

  const list = await env.ARTICLES_KV.list({ prefix: 'article:' });
  const articles = [];
  for (const key of list.keys) {
    const raw = await env.ARTICLES_KV.get(key.name);
    if (!raw) continue;
    const a = JSON.parse(raw);
    // published !== false (not "=== true") on purpose: articles saved before
    // the draft/publish distinction existed have no `published` field at
    // all, and must keep showing up rather than silently vanishing.
    if (a.published !== false) articles.push(a);
  }
  articles.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));

  const cards = articles.length
    ? articles.map((a) => `
      <div class="card">
        <a href="/blog/${escapeHtml(a.slug)}">${escapeHtml(a.title)}</a>
        <p>${escapeHtml(a.summary)}</p>
      </div>`).join('')
    : `<p style="color:#5B6472;">No articles yet.</p>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Career Advice & Resume Tips — ATS Resume Builder Blog</title>
<meta name="description" content="Practical, honest career and resume-writing advice for Indian job seekers.">
${PAGE_HEAD}
</head>
<body>
<div class="wrap">
  ${BRAND_HEADER}
  <h1>Career Advice & Resume Tips</h1>
  <div class="meta">Practical guidance for Indian job seekers — no fluff.</div>
  ${cards}
  <a href="/" class="backlink">← Back to the Resume Builder</a>
</div>
</body>
</html>`;

  return new Response(html, { headers: { 'content-type': 'text/html;charset=UTF-8' } });
}
