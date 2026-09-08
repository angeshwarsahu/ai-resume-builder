// =============================================================================
// functions/api/generate-resume.js
//
// This is a Cloudflare Pages Function. When this whole project is deployed to
// Cloudflare Pages, any file under functions/ automatically becomes a live
// API route — this exact file becomes POST /api/generate-resume. No separate
// backend to deploy, no server to run, nothing else to configure beyond
// setting the GEMINI_API_KEY environment variable in the Cloudflare
// dashboard (see README.md).
//
// This is the ONLY place the Gemini API key is ever used. The frontend
// (public/index.html) never sees it — it just calls this same-origin route.
//
// Why Gemini and not Claude here: Google's Gemini API has a genuinely free,
// permanent, no-credit-card tier (as of this build) that fits a $0-budget
// project. If you later have budget and prefer Claude's output quality,
// swap callGemini in functions/_shared/gemini.js for an Anthropic
// /v1/messages call — every endpoint file (this one included) shares that
// one function, so the swap only needs to happen in one place.
// =============================================================================

import { badRequest, notConfiguredResponse, aiErrorResponse, okResponse, methodNotAllowed, callGemini } from '../_shared/gemini.js';

const MAX_LEN = 6000; // generous cap on any single free-text field, abuse guard

function validate(body) {
  if (!body || typeof body !== 'object') return 'Invalid request.';
  const { profile, level } = body;
  if (!profile || typeof profile !== 'object') return 'Profile is required.';
  if (!profile.name || !String(profile.name).trim()) return 'Name is required.';
  if (!['fresher', 'experienced', 'switcher'].includes(level)) return 'Invalid candidate level.';
  const jsonSize = JSON.stringify(body).length;
  if (jsonSize > MAX_LEN * 6) return 'Request is too large.';
  return null;
}

function buildPrompt({ profile, jd, level }) {
  return `You are an ATS resume writing expert. Build resume content from ONLY the real information given below — never invent skills, jobs, numbers, or achievements the person didn't provide.

CANDIDATE LEVEL: ${level}
PERSONAL: name=${profile.name}, email=${profile.email || ''}, phone=${profile.phone || ''}, location=${profile.location || ''}, linkedin=${profile.linkedin || 'none'}
TARGET ROLE: ${profile.targetRole || 'not specified'}
EDUCATION: ${JSON.stringify(profile.education || [])}
EXPERIENCE (raw notes from candidate, rewrite as strong ATS bullet points, keep facts identical): ${JSON.stringify(profile.experience || [])}
PROJECTS (raw notes): ${JSON.stringify(profile.projects || [])}
SKILLS (comma list given by candidate): ${profile.skills || ''}
CERTIFICATIONS: ${profile.certifications || ''}
${jd ? `TARGET JOB DESCRIPTION (tailor summary/skills-order/bullet wording naturally to this — do not invent matching experience that wasn't given):\n"""${jd}"""` : 'No specific job description given — write a general strong resume for the target role.'}

Rules:
- Rewrite each experience/project note into 2-4 concise ATS-style bullet points: strong action verb + what was done + result, using only facts given. If no number/result was given, do not invent one — describe the action plainly instead.
- Summary: 2-3 sentences, plain language, tailored to target role/JD if given.
- Order skills by relevance to the JD if given, otherwise as given.
- Never fabricate an employer, title, duration, or metric.

Return ONLY JSON in this exact shape, no markdown fences, no explanation:
{
  "summary": "string",
  "skills": ["skill1","skill2"],
  "experience": [{"title":"","company":"","duration":"","bullets":["",""]}],
  "projects": [{"name":"","bullets":["",""]}],
  "education": [{"degree":"","institution":"","year":"","score":""}],
  "certifications": ["",""],
  "atsChecklist": [{"item":"e.g. Quantified achievements where possible","status":"pass|warn","note":"short reason"}],
  "keywordMatch": [{"keyword":"from JD if given","present":true}]
}
If no JD was given, return keywordMatch as an empty array. Keep atsChecklist to max 6 items, focused on content quality (not layout — layout is handled separately).`;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return badRequest('Malformed JSON body.');
  }

  const validationError = validate(body);
  if (validationError) return badRequest(validationError);

  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) return notConfiguredResponse();

  try {
    const result = await callGemini(buildPrompt(body), apiKey, { temperature: 0.4, maxOutputTokens: 2200 });
    return okResponse(result);
  } catch (err) {
    return aiErrorResponse();
  }
}

// Reject any method other than POST with a clear message instead of a
// generic platform 405 page.
export async function onRequestGet() { return methodNotAllowed(); }
