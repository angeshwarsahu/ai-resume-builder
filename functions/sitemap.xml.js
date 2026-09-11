// =============================================================================
// functions/sitemap.xml.js — becomes GET /sitemap.xml
//
// Dynamic on purpose: a static sitemap file would go stale the moment a new
// article is published from /admin.html. This reads the same KV store the
// blog itself reads, so the sitemap always reflects exactly what's live.
// =============================================================================

export async function onRequestGet(context) {
  const { request, env } = context;
  const origin = new URL(request.url).origin;

  const staticUrls = [
    { loc: `${origin}/`, changefreq: 'monthly', priority: '1.0' },
    { loc: `${origin}/blog`, changefreq: 'weekly', priority: '0.8' },
    { loc: `${origin}/privacy.html`, changefreq: 'yearly', priority: '0.2' },
    { loc: `${origin}/terms.html`, changefreq: 'yearly', priority: '0.2' },
    { loc: `${origin}/copyright.html`, changefreq: 'yearly', priority: '0.2' },
    { loc: `${origin}/security.html`, changefreq: 'yearly', priority: '0.2' },
  ];

  let articleUrls = [];
  if (env.ARTICLES_KV) {
    const list = await env.ARTICLES_KV.list({ prefix: 'article:' });
    for (const key of list.keys) {
      const raw = await env.ARTICLES_KV.get(key.name);
      if (!raw) continue;
      const a = JSON.parse(raw);
      if (a.published === false) continue; // drafts never go in the sitemap
      articleUrls.push({
        loc: `${origin}/blog/${a.slug}`,
        lastmod: (a.updatedAt || a.publishedAt || '').slice(0, 10),
        changefreq: 'monthly',
        priority: '0.6',
      });
    }
  }

  const all = [...staticUrls, ...articleUrls];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map((u) => `  <url>
    <loc>${u.loc}</loc>
    ${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, { headers: { 'content-type': 'application/xml;charset=UTF-8' } });
}
