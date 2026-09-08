// =============================================================================
// functions/_shared/html.js — shared helper, NOT a route.
//
// Cloudflare Pages Functions only turns a file into a live API route if it
// exports a handler named onRequestGet/onRequestPost/onRequest etc. This file
// exports neither, so Cloudflare skips it when building routes — it's safe
// to import from here without accidentally creating a public /_shared/html
// endpoint.
// =============================================================================

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(title) {
  return String(title || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

export const PAGE_HEAD = `
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  body{font-family:'Inter',ui-sans-serif,system-ui,sans-serif; background:#F7F8F7; color:#1B2430; margin:0;}
  .wrap{max-width:720px; margin:0 auto; padding:32px 20px 80px;}
  .brand{display:flex; align-items:center; gap:8px; margin-bottom:28px; text-decoration:none; color:#1B2430;}
  .brand .mark{width:28px; height:28px; border-radius:8px; background:#1E3A5F; color:#fff; display:flex; align-items:center; justify-content:center; font-family:'Sora',sans-serif; font-weight:800; font-size:13px;}
  .brand .name{font-family:'Sora',sans-serif; font-weight:800; font-size:15px;}
  h1{font-family:'Sora',sans-serif; font-weight:800; font-size:26px; margin:0 0 8px;}
  .meta{font-size:12.5px; color:#5B6472; margin-bottom:20px;}
  .card{background:#fff; border:1px solid #E4E4DE; border-radius:14px; padding:18px; margin-bottom:14px;}
  .card a{color:#1E3A5F; text-decoration:none; font-family:'Sora',sans-serif; font-weight:700; font-size:16px;}
  .card p{color:#5B6472; font-size:13.5px; margin:6px 0 0;}
  article p{font-size:15px; line-height:1.7; margin:0 0 14px;}
  .backlink{display:inline-block; margin-top:28px; font-size:13.5px; font-weight:600; color:#1E3A5F;}
</style>`;

export const BRAND_HEADER = `
<a href="/" class="brand">
  <span class="mark">R</span>
  <span class="name">ATS Resume Builder</span>
</a>`;
