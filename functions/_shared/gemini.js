// functions/_shared/gemini.js
// Shared Gemini API helpers for Cloudflare Pages Functions.

export const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';

export function badRequest(message) {
  return new Response(
    JSON.stringify({
      success: false,
      errorCode: 'INVALID_INPUT',
      message,
    }),
    {
      status: 400,
      headers: { 'content-type': 'application/json' },
    }
  );
}

export function notConfiguredResponse() {
  return new Response(
    JSON.stringify({
      success: false,
      errorCode: 'NOT_CONFIGURED',
      message:
        'AI is not set up on this server yet. Add GEMINI_API_KEY in the Cloudflare Pages dashboard.',
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }
  );
}

export function aiErrorResponse() {
  return new Response(
    JSON.stringify({
      success: false,
      errorCode: 'AI_ERROR',
      message:
        'AI could not complete this right now. Please try again in a moment.',
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }
  );
}

export function okResponse(data) {
  return new Response(
    JSON.stringify({
      success: true,
      data,
    }),
    {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }
  );
}

export function methodNotAllowed() {
  return new Response(
    JSON.stringify({
      success: false,
      errorCode: 'METHOD_NOT_ALLOWED',
      message: 'Use POST.',
    }),
    {
      status: 405,
      headers: { 'content-type': 'application/json' },
    }
  );
}

export function parseJsonFromModelText(text) {
  let cleaned = text
    .replace(/```json/g, '')
    .replace(/```/g, '')
    .trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');

  if (start >= 0 && end >= 0) {
    cleaned = cleaned.slice(start, end + 1);
  }

  return JSON.parse(cleaned);
}

export async function callGemini(
  prompt,
  apiKey,
  { maxOutputTokens = 1200 } = {}
) {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, 25000);

  let res;

  try {
    res = await fetch(
      `${GEMINI_URL}?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens,
          },
        }),
        signal: controller.signal,
      }
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');

    throw new Error(
      `Gemini HTTP ${res.status}: ${errText.slice(0, 500)}`
    );
  }

  const data = await res.json();

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || '')
      .join('\n') || '';

  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  return parseJsonFromModelText(text);
}
