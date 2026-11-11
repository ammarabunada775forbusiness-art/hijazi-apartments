# HIJAZI Apartments – project memory for Claude

This file is read automatically at the start of every Claude Code session. Keep it current: at the end of each work session, update "Current status" and "Next steps" (ask the owner before changing it).

## Who and what
- HIJAZI Apartments (شقق حجازي المفروشة) is the owner's own furnished-apartment rental business in Shmeisani, Amman, next to Abdali. Treat it as a real commercial business.
- Every apartment: 3 bedrooms (one master), 3 bathrooms, kitchen, Wi-Fi; most have two balconies, one has one. Special discount for stays longer than one month. These are the only property facts published so far.
- Contact: +962 78 900 0444 (phone/WhatsApp), info@hijazi-apartments.com.

## How the owner wants to work
- Talk in a natural Jordanian/Palestinian Arabic dialect unless asked for English.
- Explain what a change does and why before large changes; the owner likes to understand and approve. Preserve the existing design and working booking flow.
- Never invent facts: distances, prices, hospital details, reviews. Hospital facts must come from published sources, and pages say to confirm with the hospital.
- Before creating project-memory files or similar setup in a repo, ask the owner first and remind them what will be created.

## Architecture and deployment
- `frontend/`: static HTML/CSS/JS with Bootstrap, Flatpickr, FullCalendar from CDNs. Deployed on Vercel (project `hijazi-apartments`, team `ammar-theebs-projects`). Pushing to `main` deploys production; every PR gets a Vercel preview.
- Domains: `hijazi-apartments.com` → 308 → `www.hijazi-apartments.com` (production). Canonicals use `https://www.hijazi-apartments.com/`.
- `backend/`: Node/Express + MongoDB Atlas on Render at `https://api.hijazi-apartments.com`. Apartments, availability and bookings come from the API.
- `frontend/admin.html` is the PMS (noindex). Do not touch it for SEO work.
- Tests: `cd backend && npm ci && npm test` (50 tests; some check frontend security files).
- Workflow used so far: branch → PR → wait for the Vercel status → squash merge to `main`.

## Conventions
- `js/main.js` renders the shared header, footer and WhatsApp widget, and handles language (`localStorage.siteLang`). When `main.js` changes, bump `js/main.js?v=N` on every page (currently `v=9`).
- Main pages (index, apartments, booking, faq, about, reviews) are bilingual on one URL via JS; the Arabic content is the static HTML.
- Landing pages exist as Arabic/English twins: `apartments-<topic>.html` and `apartments-<topic>-en.html`. Topics: amman, abdali, jordan-hospital, specialty-hospital, islamic-hospital, medical-amman, monthly-amman. They set `window.HIJAZI_PAGE_LANG` and `window.HIJAZI_ALT_PAGES` so the header language and the language switch work. Keep both twins in sync when editing.
- Every public page has static fallback links inside `#sharedFooter` (crawlable before JS); the JS footer replaces them. Add new pages there, in `sitemap.xml` (with hreflang for twins) and in `llms.txt`.
- The FAQ answers in `faq.html` are static HTML plus FAQPage JSON-LD; English swaps in via JS.
- `apartments.html` has static skeleton cards in `#grid` to avoid layout jumps, and a static SEO intro (`#seoIntro`).

## Current status (2026-11-11)
Done (PRs #13, #14, #15):
- Crawlable FAQ and links, descriptive H1s, structured data, sitemap with 20 URLs.
- Unique landing pages, 2 new pages and English twins, `llms.txt`.
- Removed the placeholder text from the reviews page; fixed the layout jump on the apartments page.

## Next steps
1. Owner to send the building's Google Maps link and real walking/driving times to each hospital; add them to the landing pages and to the schema (`geo`, full address).
2. Google Search Console: resubmit `sitemap.xml` and request indexing for the new pages. Then review the "Why pages aren't indexed" reasons together.
3. Reviews page: it uses Unsplash images; replace with real guest reviews (owner's decision).
4. Optional: put the header in static HTML (it is JS-rendered and appears a moment late).
5. Optional, bigger: English URLs for the main pages (booking is about 5000 lines; do it carefully).
6. Off-site: a Google Business Profile with real photos and reviews, and listings on Booking/Airbnb. These matter most for SEO and AI answers.
