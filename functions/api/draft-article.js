// =============================================================================
// functions/api/draft-article.js — becomes /api/draft-article
//
// Gated behind the same ADMIN_PASSWORD as kv-articles.js's write path — this
// endpoint spends AI quota, so it must not be left open to random visitors,
// even though it doesn't publish anything by itself.
// =============================================================================

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function parseJsonFromModelText(text) {
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start >= 0 && end >= 0) cleaned = cleaned.slice(start, end + 1);
  return JSON.parse(cleaned);
}

async function callGemini(prompt, apiKey) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  let res;
  try {
    res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 1600 },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('\n') || '';
  if (!text) throw new Error('Empty response from Gemini');
  return parseJsonFromModelText(text);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ADMIN_PASSWORD) {
    return json({ success: false, errorCode: 'NOT_CONFIGURED', message: 'ADMIN_PASSWORD is not set on the server yet.' });
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

  const topic = String(body.topic || '').trim();
  if (!topic) return json({ success: false, errorCode: 'INVALID_INPUT', message: 'Topic is required.' }, 400);
  if (topic.length > 300) return json({ success: false, errorCode: 'INVALID_INPUT', message: 'Topic is too long.' }, 400);

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ success: false, errorCode: 'NOT_CONFIGURED', message: 'GEMINI_API_KEY is not set on the server yet.' });
  }

  const prompt = `Write a practical, honest career-advice blog article for Indian job seekers on this topic: "${topic}".
Audience: freshers, working professionals, and career switchers in India, reading on mobile.
Style: plain, simple English (Hinglish words are fine where natural), no fluff, no exaggerated claims, genuinely useful and specific — not generic "5 tips" filler.
Length: 500-700 words, 4-6 short paragraphs, no markdown headers needed inside the content (plain paragraphs only).
Also write an SEO-friendly title (under 65 characters) and a meta description (under 155 characters) summarizing the article.
Return ONLY JSON, no markdown fences: {"title":"","summary":"(this is the meta description)","content":"(the full article, paragraphs separated by \\n\\n)"}`;

  try {
    const draft = await callGemini(prompt, apiKey);
    return json({ success: true, data: draft });
  } catch (err) {
    return json({ success: false, errorCode: 'AI_ERROR', message: 'AI could not draft the article right now. Please try again.' });
  }
}
