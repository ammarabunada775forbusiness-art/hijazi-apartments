# HIJAZI Apartments – project memory for Claude

This file is read automatically at the start of every Claude Code session. Keep it current: at the end of each work session, update "Current status" and "Next steps" (ask the owner before changing it).

## Who and what
- HIJAZI Apartments (شقق حجازي المفروشة) is the owner's own furnished-apartment rental business in Shmeisani, Amman, next to Abdali. Treat it as a real commercial business.
- Every listed apartment: 220 m², 3 bedrooms (one master), 3 bathrooms, living room, guest room, equipped kitchen, laundry room, sleeps 7–8. Fiber internet, central heating, 5 air conditioners, dedicated indoor parking, free housekeeping (usually every other day). Special discount for stays longer than one month.
- Balconies: 104, 105, 106, 107 have one; 207, 305, 309 have two; 204 has a balcony, a terrace and an indoor garage.
- Policies: minimum stay 3 nights, check-out 12:00, smoking and pets in selected apartments only. "Family policy" means unmarried couples may not stay together; business travellers are welcome, so do not write "families only".
- The owner also has 1- and 2-bedroom apartments that are not published yet.
- All amenity, service and policy facts live in `frontend/js/amenities-data.js`. Publish nothing that is not there or confirmed by the owner. Do not mention Netflix or YouTube.
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
- Tests: `cd backend && npm ci && npm test` (54 tests; some check frontend files, including that the amenities pages match the data file).
- Workflow: earlier work went branch → PR → Vercel status → squash merge to `main`. On 2026-11-12 the owner chose a direct push to `main` without a PR; ask which they want each time, and never open a PR unless asked.

## Conventions
- `js/main.js` renders the shared header, footer and WhatsApp widget, and handles language (`localStorage.siteLang`). When `main.js` changes, bump `js/main.js?v=N` on every page (currently `v=10`).
- Main pages (index, apartments, booking, faq, about, reviews) are bilingual on one URL via JS; the Arabic content is the static HTML.
- Landing pages exist as Arabic/English twins: `apartments-<topic>.html` and `apartments-<topic>-en.html`. Topics: amman, abdali, jordan-hospital, specialty-hospital, islamic-hospital, medical-amman, monthly-amman. They set `window.HIJAZI_PAGE_LANG` and `window.HIJAZI_ALT_PAGES` so the header language and the language switch work. Keep both twins in sync when editing.
- Every public page has static fallback links inside `#sharedFooter` (crawlable before JS); the JS footer replaces them. Add new pages there, in `sitemap.xml` (with hreflang for twins) and in `llms.txt`.
- The FAQ answers in `faq.html` are static HTML plus FAQPage JSON-LD; English swaps in via JS.
- `apartments.html` has static skeleton cards in `#grid` to avoid layout jumps, and a static SEO intro (`#seoIntro`).
- Amenities: `js/amenities-data.js` is the single source (categories, per-apartment facts, services, policies, FAQ, icons, unit types). `js/amenities-ui.js` renders it. After editing the data file run `node scripts/build-amenities.js` from the repo root; it rewrites the generated blocks (between `<!-- NAME:START -->` and `<!-- NAME:END -->`) in `amenities.html`, `amenities-en.html` and `index.html`. Never edit those blocks by hand.
- Pages that show apartments (index, apartments, booking) load `amenities-data.js` and `amenities-ui.js` before `main.js`; `main.js` then takes each apartment's features and balcony count from the data file. Styles are in `css/amenities.css` (classes start with `am-`).
- Item tags in the data file: none = all apartments, `some` = some apartments, `free` = free on request, `paid` = extra charge, `unit` = one named apartment. Per-apartment `smoking`/`pets`/`toaster`/`extraParking` are `null` until the owner gives the list; `null` shows nothing.
- The amenities FAQ entries are also copied by hand into `faq.html` (three places: JSON-LD, static HTML, JS arrays). Keep them in sync.
- To add 1- or 2-bedroom apartments: fill the unit type in `amenities-data.js` and set `published: true`, add the apartment there, then add its number, price and order in `main.js`. The type filter on `apartments.html` appears by itself once two types exist.

## Current status (2026-11-12)
Done (PRs #13, #14, #15):
- Crawlable FAQ and links, descriptive H1s, structured data, sitemap.
- Unique landing pages, 2 new pages and English twins, `llms.txt`.
- Removed the placeholder text from the reviews page; fixed the layout jump on the apartments page.

Done (2026-11-12, pushed straight to `main`):
- Amenities and services page in Arabic and English (`amenities.html`, `amenities-en.html`) with structured data, linked from the header and footers; sitemap now has 22 URLs.
- Per-apartment facts on cards, in the details modal and on the booking page; highlights section on the homepage.
- FAQ grown to 26 questions; landing pages, `llms.txt` and homepage schema updated to the new facts.

Done (2026-11-12, later, pushed straight to `main`):
- English mode fully translated: homepage bottom sections (SEO cards, useful links now pointing to `-en` twins, FAQ) via `data-en` attributes in `index.html`; card/booking address and currency names/symbols.
- API (`api.hijazi-apartments.com`) sends `X-Robots-Tag: noindex` and serves a disallow-all `robots.txt` (it was a Soft 404 in Search Console).
- Photo viewer (apartments and booking), iPhone Photos style: no arrow buttons; continuous swipe where the neighbouring photos move with the finger (mouse drag and keyboard arrows on desktop), thumbnail strip at the bottom (tap or scrub it), swipe down to close, a transparent swipe hint for ~1.5 s on open. Files: `css/lightbox.css`, `js/lightbox-swipe.js` (both at `?v=3`); the pages pass `getItems`/`getIndex`/`goTo` to `HijaziLightboxSwipe.attach`. The old `#imageLightboxImage` is hidden but still updated by the page code.

Search Console findings (2026-11-12): 10 indexed, 8 not. 4 redirects and 2 alternate-canonical are normal; Soft 404 was the API; `faq.html` "crawled, not indexed" was last crawled 2026-06-16 (old version). Sitemap was last read 2026-11-05 with 11 URLs. On this domain property the sitemap must be submitted as the full URL `https://www.hijazi-apartments.com/sitemap.xml`.

## Next steps
1. Booking form and API still accept 1–2 nights although the policy is a 3-night minimum. Enforce it only after the owner agrees (it changes the booking flow).
2. Owner to send which apartments allow smoking and pets, and which have a toaster or a second parking space; fill them in `amenities-data.js`.
3. Owner to send the building's Google Maps link and real walking/driving times to each hospital; add them to the landing pages and to the schema (`geo`, full address).
4. Google Search Console (owner): resubmit the sitemap by full URL; request indexing over two days (day 1: faq, both amenities pages, the 7 English landing pages; day 2: Arabic landing pages, about, reviews, apartments, after checking each is not already indexed); after a few days click "Validate fix" on Soft 404 and on the faq report. Then review the report again together.
5. Admin: passport scan to fill a booking (owner wants this; build in a new session after the owner confirms the details). Plan: owner uploads a passport photo plus check-in/check-out dates; the page reads the passport's MRZ lines for free in the browser (no upload to a third party) and pre-fills name, nationality, passport number and birth date; the owner reviews and saves. Fallback for unreadable photos or ID cards: Claude API vision (rough cost per image: Haiku 5.5 well under $0.001, Sonnet 5.5 about $0.006; needs an Anthropic API key with credit). Before building, decide with the owner where images are stored, who can see them and how long they are kept (sensitive personal data; the owner should check Jordanian data-protection duties), and make sure the admin login is solid.
6. Reviews page: it uses Unsplash images; replace with real guest reviews (owner's decision).
7. Optional: put the header in static HTML (it is JS-rendered and appears a moment late).
8. Optional, bigger: English URLs for the main pages (booking is about 5000 lines; do it carefully).
9. Off-site: a Google Business Profile with real photos and reviews, and listings on Booking/Airbnb. These matter most for SEO and AI answers.
