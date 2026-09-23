/* اختبارات HTTP على localhost. MongoDB وCloudflare وهميان؛ لا حجز ولا بريد حقيقي. */
const test = require("node:test");
const assert = require("node:assert/strict");
process.env.NODE_ENV = "test";
process.env.TURNSTILE_ENABLED = "true";
process.env.TURNSTILE_SITE_KEY = "local-test-site";
process.env.TURNSTILE_SECRET_KEY = "local-test-secret";
process.env.TURNSTILE_HOSTNAMES = "hijazi-apartments.com,www.hijazi-apartments.com";
process.env.ADMIN_USER = "local-test-admin";
process.env.ADMIN_PASS = "local-test-password";
process.env.RESEND_API_KEY = "";
process.env.MONGO_URI = "";
const { app } = require("../server");
const Apartment = require("../models/Apartment");
const Booking = require("../models/Booking");
const ActivityLog = require("../models/ActivityLog");
const originalFetch = global.fetch;
const saved = [];
let verification = {};
let upstreamMode = "normal";
let server, base, dbCalls = 0, verifyCalls = 0;
const auth = "Basic " + Buffer.from("local-test-admin:local-test-password").toString("base64");
const valid = () => ({ apartmentId: 1, fullName: "Test Guest", email: "guest@example.com", phone: "+962790000000",
    checkIn: "2099-01-10", checkOut: "2099-01-12", adults: 2, children: 0, currency: "JOD", notes: "test",
    turnstileToken: "valid-local-token" });
async function post(body, headers = {}) {
    return originalFetch(base + "/bookings", { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
}
test.before(async () => {
    Apartment.bulkWrite = async () => { dbCalls++; return {}; };
    Apartment.findOne = async () => { dbCalls++; return { apartmentId: 1, label: "Trusted apartment", nightlyPriceJod: 55 }; };
    Booking.findOne = async () => { dbCalls++; return null; };
    Booking.prototype.save = async function () { saved.push(this.toObject()); return this; };
    global.fetch = async (url, options) => {
        assert.equal(url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
        const body = JSON.parse(options.body);
        assert.equal(body.secret, "local-test-secret");
        verifyCalls++;
        if (upstreamMode === "timeout") throw new DOMException("Timed out", "TimeoutError");
        return { ok: upstreamMode !== "http-error", json: async () => verification };
    };
    server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => { global.fetch = originalFetch; await new Promise(resolve => server.close(resolve)); });
test.beforeEach(() => { verification = { success: true, hostname: "hijazi-apartments.com", action: "booking", challenge_ts: new Date().toISOString() }; upstreamMode = "normal"; });

test("public config exposes only the site key and uses no-store", async () => {
    const response = await originalFetch(base + "/security/public-config");
    assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.text(); assert.ok(body.includes("local-test-site")); assert.ok(!body.includes("local-test-secret"));
});
test("API security headers protect error responses too", async () => {
    const response = await originalFetch(base + "/missing");
    assert.equal(response.status, 404); assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff"); assert.equal(response.headers.get("x-powered-by"), null);
});
test("CORS and server-side origin checking reject a foreign origin before writing", async () => {
    const before = dbCalls;
    assert.equal((await post(valid(), { Origin: "https://untrusted.example" })).status, 403);
    assert.equal(dbCalls, before);
    const preflight = await originalFetch(base + "/bookings", { method: "OPTIONS", headers: {
        Origin: "https://hijazi-apartments.com", "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type" } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get("access-control-allow-origin"), "https://hijazi-apartments.com");
});
test("JSON controls reject non-JSON, malformed JSON, large bodies and injection keys", async () => {
    assert.equal((await originalFetch(base + "/bookings", { method: "POST", headers: { "Content-Type": "text/plain" }, body: "{}" })).status, 415);
    assert.equal((await originalFetch(base + "/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{invalid-json" })).status, 400);
    assert.equal((await post({ notes: "x".repeat(60000) })).status, 413);
    const before = dbCalls;
    assert.equal((await post({ ...valid(), email: { $ne: null } })).status, 400);
    assert.equal(dbCalls, before);
});
test("strict booking types reject arrays and boolean IDs before Cloudflare or MongoDB", async () => {
    const before = verifyCalls;
    assert.equal((await post({ ...valid(), apartmentId: true })).status, 400);
    assert.equal(verifyCalls, before);
});
test("missing Turnstile tokens cannot create bookings", async () => {
    const body = valid(); delete body.turnstileToken;
    const before = dbCalls;
    assert.equal((await post(body)).status, 403); assert.equal(dbCalls, before);
});
test("foreign-host, wrong-action and expired/replayed tokens cannot create bookings", async () => {
    const before = saved.length;
    verification.hostname = "untrusted.example"; assert.equal((await post(valid())).status, 403);
    verification.hostname = "hijazi-apartments.com"; verification.action = "login"; assert.equal((await post(valid())).status, 403);
    verification.action = "booking"; verification.success = false; verification["error-codes"] = ["timeout-or-duplicate"];
    assert.equal((await post(valid())).status, 403); assert.equal(saved.length, before);
});
test("provider timeouts fail closed with 503", async () => {
    upstreamMode = "timeout"; const before = dbCalls;
    assert.equal((await post(valid())).status, 503); assert.equal(dbCalls, before);
});
test("the real booking route ignores forged price, labels, source and status", async () => {
    const response = await post({ ...valid(), totalPrice: 0.01, totalPriceText: "0.01 JOD", apartmentLabel: "Forged",
        source: "manual", status: "confirmed", stayType: "long" });
    assert.equal(response.status, 200);
    const booking = saved.at(-1);
    assert.equal(booking.totalPrice, 110); assert.equal(booking.apartmentLabel, "Trusted apartment");
    assert.equal(booking.source, "website"); assert.equal(booking.status, "pending"); assert.equal(booking.stayType, "normal");
});
test("admin can backfill a manual booking whose stay is already in the past", async () => {
    const originalActivityCreate = ActivityLog.create;
    const originalBookingCreate = Booking.create;
    ActivityLog.create = async () => ({});
    Booking.create = async data => {
        const booking = new Booking(data);
        saved.push(booking.toObject());
        return booking;
    };

    try {
        const response = await originalFetch(base + "/admin/bookings", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: auth,
                "X-Forwarded-For": "198.51.100.70"
            },
            body: JSON.stringify({
                apartmentId: 1,
                source: "manual",
                checkIn: "2020-01-10",
                checkOut: "2020-01-12",
                fullName: "Past Guest",
                adults: 1,
                children: 0,
                totalPrice: 100,
                currency: "JOD",
                status: "confirmed"
            })
        });

        assert.equal(response.status, 201);
        const body = await response.json();
        assert.equal(body.success, true);
        assert.equal(body.booking.source, "manual");
        assert.equal(String(body.booking.checkIn).slice(0, 10), "2020-01-10");
        assert.equal(String(body.booking.checkOut).slice(0, 10), "2020-01-12");
    } finally {
        ActivityLog.create = originalActivityCreate;
        Booking.create = originalBookingCreate;
    }
});
test("the eleventh request to the booking route is rate limited", async () => {
    const headers = { "X-Forwarded-For": "198.51.100.50" };
    const body = valid(); delete body.turnstileToken;
    for (let attempt = 0; attempt < 10; attempt++) assert.equal((await post(body, headers)).status, 403);
    const response = await post(body, headers);
    assert.equal(response.status, 429); assert.ok(response.headers.get("retry-after"));
});
test("admin access needs authentication and repeated failures are blocked", async () => {
    for (let attempt = 0; attempt < 8; attempt++) {
        const response = await originalFetch(base + "/admin/bookings");
        assert.equal(response.status, 401); assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
    }
    const blocked = await originalFetch(base + "/admin/bookings", { headers: { Authorization: auth } });
    assert.equal(blocked.status, 429); assert.ok(blocked.headers.get("retry-after"));
});

test("public apartment data exposes labels and prices but never calendar tokens", async () => {
    const originalFind = Apartment.find;
    Apartment.find = () => ({
        select: () => ({
            sort: async () => [{
                _id: "internal-id",
                apartmentId: 1,
                label: "شقة رقم 104",
                nightlyPriceJod: 120,
                calendarToken: "must-not-be-public"
            }]
        })
    });

    try {
        const response = await originalFetch(base + "/apartments/public");
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.deepEqual(body.apartments, [{
            apartmentId: 1,
            label: "شقة رقم 104",
            nightlyPriceJod: 120
        }]);
        assert.ok(!JSON.stringify(body).includes("calendarToken"));
        assert.ok(!JSON.stringify(body).includes("must-not-be-public"));
    } finally {
        Apartment.find = originalFind;
    }
});

test("calendar token rotation requires admin and explicit confirmation; audit has no token", async () => {
    const path = "/admin/apartments/0123456789abcdef01234567/rotate-calendar-token";
    const headers = { "Content-Type": "application/json", "X-Forwarded-For": "198.51.100.60" };
    let update, activity;
    Apartment.findByIdAndUpdate = async (id, change) => { update = change; return { _id: id, apartmentId: 1 }; };
    ActivityLog.create = async entry => { activity = entry; };
    assert.equal((await originalFetch(base + path, { method: "POST", headers, body: '{"confirm":true}' })).status, 401);
    assert.equal(update, undefined);
    headers.Authorization = auth;
    assert.equal((await originalFetch(base + path, { method: "POST", headers, body: '{}' })).status, 400);
    assert.equal(update, undefined);
    const response = await originalFetch(base + path, { method: "POST", headers, body: '{"confirm":true}' });
    assert.equal(response.status, 200);
    const newToken = update.$set.calendarToken;
    assert.match(newToken, /^[a-f0-9]{48}$/);
    assert.ok(!JSON.stringify(activity).includes(newToken));
    assert.ok(!(await response.text()).includes(newToken));
});
