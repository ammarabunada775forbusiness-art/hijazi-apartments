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
- Tests: `cd backend && npm ci && npm test` (79 tests; some check frontend files, including that the amenities pages match the data file).
- Workflow: earlier work went branch → PR → Vercel status → squash merge to `main`. On 2026-11-12 the owner chose a direct push to `main` without a PR; ask which they want each time, and never open a PR unless asked. On 2026-11-13 the owner again asked for a direct push to `main`.

## Conventions
- `js/main.js` renders the shared header, footer and WhatsApp widget, and handles language (`localStorage.siteLang`). When `main.js` changes, bump `js/main.js?v=N` on every page (currently `v=11`).
- Main pages (index, apartments, booking, faq, about, reviews) are bilingual on one URL via JS; the Arabic content is the static HTML.
- Landing pages exist as Arabic/English twins: `apartments-<topic>.html` and `apartments-<topic>-en.html`. Topics: amman, abdali, jordan-hospital, specialty-hospital, islamic-hospital, medical-amman, monthly-amman. They set `window.HIJAZI_PAGE_LANG` and `window.HIJAZI_ALT_PAGES` so the header language and the language switch work. Keep both twins in sync when editing.
- Every public page has static fallback links inside `#sharedFooter` (crawlable before JS); the JS footer replaces them. Add new pages there, in `sitemap.xml` (with hreflang for twins) and in `llms.txt`.
- The FAQ answers in `faq.html` are static HTML plus FAQPage JSON-LD; English swaps in via JS.
- `apartments.html` has static skeleton cards in `#grid` to avoid layout jumps, and a static SEO intro (`#seoIntro`).
- Amenities: `js/amenities-data.js` is the single source (categories, per-apartment facts, services, policies, FAQ, icons, unit types). `js/amenities-ui.js` renders it. After editing the data file run `node scripts/build-amenities.js` from the repo root; it rewrites the generated blocks (between `<!-- NAME:START -->` and `<!-- NAME:END -->`) in `amenities.html`, `amenities-en.html` and `index.html`. Never edit those blocks by hand.
- Pages that show apartments (index, apartments, booking) load `amenities-data.js` and `amenities-ui.js` before `main.js`; `main.js` then takes each apartment's features and balcony count from the data file. Styles are in `css/amenities.css` (classes start with `am-`).
- Item tags in the data file: none = all apartments, `some` = some apartments, `free` = free on request, `paid` = extra charge, `unit` = one named apartment. Per-apartment `smoking`/`pets`/`toaster`/`extraParking` are `null` until the owner gives the list; `null` shows nothing.
- The amenities FAQ entries are also copied by hand into `faq.html` (three places: JSON-LD, static HTML, JS arrays). Keep them in sync.
- Admin passport scan and reservation form:
  - `js/passport-mrz.js` parses MRZ text (TD3 passports, TD1/TD2 ID cards), checks check digits, fixes common OCR errors and holds the country table (code → country name and nationality). `js/passport-scan.js` runs Tesseract.js 7.0.0 in the browser (pinned on jsDelivr with SRI on the main script, loaded on first use). `js/reservation-form.js` draws the form on `images/reservation-form-template.jpg` with the self-hosted font `fonts/barlow-semi-condensed-500.woff2` (OFL). All three are tested in Node; scripts load in `admin.html` at `?v=1`.
  - The passport photo is never uploaded or stored. Only the text goes in `booking.guestDocument`, which has `select: false`: the booking list never returns it, only `GET /admin/bookings/:id` does, and it is never written to the activity log. The public booking route cannot set it.
  - MRZ has no place of birth, issue date or address. Place of birth is typed by the owner. The issue date is filled only when a printed date fits the passport validity exactly (N years or N years minus one day before the verified expiry). The address defaults to the issuing country name.
  - Payment fields on a booking: `nightlyRate`, `securityDeposit`, `amountPaid` (null means automatic: deposit 200, paid = rent + deposit) and `paymentMethod` (default CASH).
  - Booking reference: `HA-DDMMYYYY-<apartment number>` from the check-in date. It is computed, not stored, so it changes if the apartment or check-in date changes.
  - Text positions on the form are `FIELD_LINES` in pixels on the 1536×1024 template. If the owner changes the template design, update them.
  - Admin dialogs cap their height to the window and scroll inside. The page's global input and dialog styles use `!important`, so new admin styles often need it too.
- To add 1- or 2-bedroom apartments: fill the unit type in `amenities-data.js` and set `published: true`, add the apartment there, then add its number, price and order in `main.js`. The type filter on `apartments.html` appears by itself once two types exist.

## Current status (2026-11-14)
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

- Apartments page intro (`#seoIntro`) restyled (CSS only, same text): gold top line, facts as two-column tiles with gold check marks (one column on mobile), guide links as pill buttons. The English text is still swapped in by JS.

Done (2026-11-13, pushed straight to `main`, commits 3cdb3f0, 9919682, 28b5242):
- Admin "إضافة حجز" restructured into guest, booking and payment groups. A passport or ID photo fills the guest fields: fields that need a check are marked «تحقق», empty ones «ناقص». The edit dialog has the same scan plus the passport and payment fields.
- After saving, the reservation form opens (owner's template): print as A4 landscape, share (WhatsApp on the phone) or download as PNG. Also opens from the «النموذج» row button, the calendar details dialog, and «حفظ وعرض نموذج الحجز» in the edit dialog.
- Tested on synthetic passport images only. The owner confirmed it works in the live admin; not yet tested on many real passports.

Search Console findings (2026-11-12): 10 indexed, 8 not. 4 redirects and 2 alternate-canonical are normal; Soft 404 was the API; `faq.html` "crawled, not indexed" was last crawled 2026-06-16 (old version). Sitemap was last read 2026-11-05 with 11 URLs. On this domain property the sitemap must be submitted as the full URL `https://www.hijazi-apartments.com/sitemap.xml`.

## Next steps
1. Booking form and API still accept 1–2 nights although the policy is a 3-night minimum. Enforce it only after the owner agrees (it changes the booking flow).
2. Owner to send which apartments allow smoking and pets, and which have a toaster or a second parking space; fill them in `amenities-data.js`.
3. Owner to send the building's Google Maps link and real walking/driving times to each hospital; add them to the landing pages and to the schema (`geo`, full address).
4. Google Search Console (owner): resubmit the sitemap by full URL; request indexing over two days (day 1: faq, both amenities pages, the 7 English landing pages; day 2: Arabic landing pages, about, reviews, apartments, after checking each is not already indexed); after a few days click "Validate fix" on Soft 404 and on the faq report. Then review the report again together.
5. Passport scan follow-up: the owner tests it on real passports and WhatsApp photos and reports misreads. Options only if the owner asks: Claude API vision so that place of birth and issue date are always read (roughly under $0.01 per image; needs an Anthropic API key; the image goes to Anthropic); a sequence number instead of the apartment number in the booking reference; automatic deletion of passport data after a set period (the owner should first check how long guest records must be kept).
6. Reviews page: it uses Unsplash images; replace with real guest reviews (owner's decision).
7. Optional: put the header in static HTML (it is JS-rendered and appears a moment late).
8. Optional, bigger: English URLs for the main pages (booking is about 5000 lines; do it carefully).
9. Off-site: a Google Business Profile with real photos and reviews, and listings on Booking/Airbnb. These matter most for SEO and AI answers.
