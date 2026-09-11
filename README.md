# ATS Resume Builder — free deployment guide

No Firebase, no Node install required to deploy, no credit card anywhere.
Frontend + AI backend both run on Cloudflare's free tier.

## What's in this folder
```
public/index.html                      The whole app (frontend) — one file, no build step
                                        Resume Builder, Cover Letter, Interview Prep,
                                        LinkedIn Optimizer, and Application Tracker all live
                                        in this one file, switched via the top nav bar
public/admin.html                      Password-gated blog admin — write & publish articles
functions/api/generate-resume.js       AI backend — becomes POST /api/generate-resume
functions/api/generate-cover-letter.js AI backend — becomes POST /api/generate-cover-letter
functions/api/interview-questions.js   AI backend — becomes POST /api/interview-questions
functions/api/interview-feedback.js    AI backend — becomes POST /api/interview-feedback
functions/api/linkedin-optimize.js     AI backend — becomes POST /api/linkedin-optimize
functions/api/draft-article.js         AI drafts a blog post from a topic (admin-only)
functions/api/kv-articles.js           Reads/writes blog posts in Cloudflare KV
functions/blog/index.js                Public blog listing — becomes GET /blog
functions/blog/[slug].js               Public single article — becomes GET /blog/:slug
functions/sitemap.xml.js               Auto-updating sitemap (includes every published post)
functions/_shared/gemini.js            Shared Gemini-calling helpers, not a route
functions/_shared/html.js              Shared page styling/markup, not a route
```

**About the Application Tracker specifically:** it's the one feature that stores nothing
on any server — your saved applications live only in your own browser's `localStorage`.
That means no new setup step for it, but also means the data won't follow you to a
different browser or device, and clearing your browser data clears it. This was a
deliberate choice to avoid needing a login system for this MVP.

## Setup (about 10 minutes, all free, no card)

### 1. Get a free Gemini API key
1. Go to **aistudio.google.com**
2. Sign in with any Google account
3. Click **Get API key** → **Create API key**
4. Copy it somewhere safe — you'll paste it in step 4 below

### 2. Create a free Cloudflare account
1. Go to **dash.cloudflare.com/sign-up**
2. Sign up with email — no card needed for Pages' free tier

### 3. Deploy this folder
**Easiest way — drag and drop, no CLI, no git:**
1. In the Cloudflare dashboard, go to **Workers & Pages** → **Create** → **Pages** → **Upload assets**
2. Give the project a name (e.g. `ats-resume-builder`)
3. Drag this entire folder in (both `public/` and `functions/` need to be included —
   if the upload UI only accepts a single folder, upload the whole project folder,
   not just `public/`)
4. Click **Deploy**

You'll get a live URL immediately, like `https://ats-resume-builder-xyz.pages.dev`.

### 4. Add your Gemini key (so the AI actually works)
1. In the Cloudflare dashboard, open your new Pages project
2. Go to **Settings** → **Environment variables**
3. Add a variable: name `GEMINI_API_KEY`, value = the key from step 1
4. Save, then go to **Deployments** → click the latest one → **Retry deployment**
   (environment variables only apply to deployments made after they're added)

### 5. Test it
Open your `*.pages.dev` URL, fill in your details, click **Generate ATS Resume**.
If you see "AI is not set up on this server yet", the key didn't save — repeat step 4.

## Blog setup (optional — for writing articles that bring people in via Google)

The blog needs one more free thing: a place to store articles. Cloudflare KV is a
free key-value store, no card needed.

### 1. Create the KV namespace
1. In the Cloudflare dashboard, go to **Workers & Pages** → **KV** (left sidebar)
2. Click **Create a namespace**, name it `articles` (any name works), **Create**

### 2. Bind it to your Pages project
1. Open your Pages project → **Settings** → **Functions** → **KV namespace bindings**
2. Click **Add binding**: variable name `ARTICLES_KV`, KV namespace = the one you just created
3. Save

### 3. Set an admin password
1. Same **Settings** area → **Environment variables**
2. Add: name `ADMIN_PASSWORD`, value = any password you choose (make it a real one — this
   is the only thing standing between the internet and your publish button)
3. Save, then **Deployments** → latest → **Retry deployment** (bindings and env vars only
   apply to deployments made after they're added — same as the Gemini key earlier)

### 4. Write your first article
1. Go to `https://your-site.pages.dev/admin.html`
2. Enter the password you just set
3. Type a topic and click **Draft with AI** — it fills in a title, summary, and full
   article for you to review
4. Edit anything you want, then click **Publish**
5. It's now live at `/blog/your-article-slug`, and listed at `/blog`

**Keep `admin.html`'s URL private** — anyone with the password can publish/delete
articles. There's no username, just the one shared password, which is an honestly
appropriate amount of protection for a single-owner blog (not a place to store anything
more sensitive than blog drafts).

## Costs, honestly
- Cloudflare Pages: free, no card, no time limit, generous free tier
- Cloudflare KV: free, no card, generous free tier (way more than a personal blog needs)
- Gemini API free tier: free, no card, ~1,500 requests/day — far more than one person needs
- **You will not be charged anything to run this.**

## If you want your own domain later
Cloudflare Pages → your project → **Custom domains** → add a domain you own.
(Buying a domain is the one genuinely paid step in this whole project, and it's optional —
the free `*.pages.dev` address works fine for testing and sharing with friends/family.)

## Swapping to Claude later (once you have budget)
`functions/api/generate-resume.js` has a comment at the top explaining exactly what to
change — the prompt, validation, and response shape all stay the same; only the API
call itself changes.

## V4 additions
- Expanded browser-side PDF workspace: remove/extract pages, page numbers, watermark, PDF→JPG, optimize/re-save.
- Added Exam Robot API and UI for MCQs, mini mock tests, explanations, revision plans, strategy and practice questions.
- Added Document AI navigation from the PDF workspace.

## V7 additions
- PDF Preview & Organize: page thumbnails, remove/keep, reorder, per-page rotate, export.
- Rebuild PDF wording replaces the old misleading "Optimize PDF" label; it does not promise image compression.
- Document AI OCR fallback now checks pages individually and OCRs only pages with little/no selectable text.
- Robot Mode now returns a usable workspace route and an input hint.
- Frontend AI requests have a 30-second timeout and clearer network/HTTP errors.
- Recent AI work history is stored locally in the browser (last 10 items) and can be cleared.

## V8 performance architecture
- Heavy browser libraries are lazy-loaded only when their feature is used: PDF-Lib, JSZip, Tesseract.js and docx.
- React now uses the production UMD builds.
- PDF.js is loaded only when a PDF preview/text/OCR operation starts.
- Cloudflare Pages `_routes.json` limits Pages Function invocation to dynamic API/blog/sitemap routes; normal static assets are served directly.
- AI request timeout is 60 seconds with clearer retry/network messages.
- The site intentionally does not claim that “Rebuild PDF” is image compression; it only re-saves the PDF with compact object streams.

Cloudflare Pages currently documents that static asset requests are free/unlimited and that `_routes.json` can exclude static routes from Pages Function invocation. See the official Cloudflare Pages routing/pricing documentation before changing routing behavior.
