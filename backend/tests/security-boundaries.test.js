const test = require("node:test");
const assert = require("node:assert/strict");
const { Readable } = require("node:stream");
const { requestPathForLog } = require("../services/security");
const { createTurnstileProtection } = require("../services/turnstile");
const { isPrivateAddress, parseCalendarUrl, resolveCalendarUrl, readLimitedCalendarBody } = require("../services/ical");
const { csvCell } = require("../../frontend/js/export-security");

test("calendar URLs never log the bearer token or query strings", () => {
    assert.equal(requestPathForLog({ path: "/ical/1/private-value/airbnb.ics" }), "/ical/[redacted]");
    assert.equal(requestPathForLog({ path: "/health", originalUrl: "/health?secret=private" }), "/health");
});

test("CSV cells neutralize formula starts, whitespace, quotes and line breaks", () => {
    for (const value of ["=1+1", "+SUM(1,2)", "-1+2", "@SUM(1,2)", "  =1+1", "\t=1+1", "\r=1+1", "＝1+1", "＠SUM(1,2)"]) {
        assert.ok(csvCell(value).startsWith('"\''));
    }
    assert.equal(csvCell('عمار "ضيف"'), '"عمار ""ضيف"""');
    assert.equal(csvCell("two\nlines"), '"two\nlines"');
    assert.equal(csvCell(120), '"120"');
});

test("SSRF rejects credentials, wrong sources, lookalike domains and other ports", () => {
    for (const url of ["https://airbnb.com.evil.example/a", "https://evilairbnb.com/a",
        "https://user:pass@airbnb.com/a", "https://airbnb.com:8443/a", "http://airbnb.com/a",
        "https://127.0.0.1/a", "https://airbnb.com/a#token"]) {
        assert.throws(() => parseCalendarUrl(url, "airbnb"));
    }
    assert.throws(() => parseCalendarUrl("https://booking.com/a", "airbnb"));
    assert.throws(() => parseCalendarUrl("https://booking.com/a", "invalid"));
    assert.equal(parseCalendarUrl("https://www.airbnb.com/calendar/a", "airbnb").hostname, "www.airbnb.com");
});

test("SSRF blocks private, shared, mapped IPv6 and reserved addresses", () => {
    for (const address of ["127.0.0.1", "10.0.0.2", "172.16.0.1", "192.168.1.1", "169.254.169.254",
        "100.64.0.1", "0.0.0.0", "198.18.0.1", "224.0.0.1", "::1", "::", "fc00::1", "fe90::1",
        "::ffff:127.0.0.1", "::ffff:7f00:1", "2001:db8::1", "invalid"]) assert.equal(isPrivateAddress(address), true, address);
    for (const address of ["1.1.1.1", "8.8.8.8", "2606:4700::1111"]) assert.equal(isPrivateAddress(address), false, address);
});

test("DNS resolution rejects any private answer and returns the validated addresses", async () => {
    await assert.rejects(resolveCalendarUrl("https://airbnb.com/calendar", "airbnb", async () => [
        { address: "1.1.1.1", family: 4 }, { address: "127.0.0.1", family: 4 }
    ]));
    const safe = await resolveCalendarUrl("https://airbnb.com/calendar", "airbnb", async () => [{ address: "1.1.1.1", family: 4 }]);
    assert.deepEqual(safe.addresses, [{ address: "1.1.1.1", family: 4 }]);
});

test("calendar download stops while streaming and counts bytes instead of characters", async () => {
    assert.equal(await readLimitedCalendarBody(Readable.from([Buffer.from("OK")]), 2), "OK");
    const tooLarge = Readable.from([Buffer.from("ab"), Buffer.from("cd")]);
    await assert.rejects(readLimitedCalendarBody(tooLarge, 3));
    assert.equal(tooLarge.destroyed, true);
    await assert.rejects(readLimitedCalendarBody(Readable.from([Buffer.from("عمار")]), 4));
});

function responseStub() {
    return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; },
        set() { return this; }, json(body) { this.body = body; return this; } };
}

test("Turnstile enabled with incomplete configuration fails closed and publishes no secret", async () => {
    const guard = createTurnstileProtection({ TURNSTILE_ENABLED: "true", TURNSTILE_SECRET_KEY: "private-example" });
    const configRes = responseStub();
    guard.publicConfig({}, configRes);
    assert.equal(configRes.statusCode, 503);
    assert.ok(!JSON.stringify(configRes.body).includes("private-example"));
    const res = responseStub(); let next = false;
    await guard.verify({ body: {} }, res, () => { next = true; });
    assert.equal(res.statusCode, 503); assert.equal(next, false);
});

test("Turnstile cannot silently disable on a misspelled flag or use dummy production keys", async () => {
    for (const env of [{ TURNSTILE_ENABLED: "TRUE" }, { NODE_ENV: "production", TURNSTILE_ENABLED: "true",
        TURNSTILE_SITE_KEY: "1x00000000000000000000AA", TURNSTILE_SECRET_KEY: "private-example", TURNSTILE_HOSTNAMES: "example.com" }]) {
        const res = responseStub(); createTurnstileProtection(env).publicConfig({}, res); assert.equal(res.statusCode, 503);
    }
});

test("Turnstile can be disabled only by server configuration for staged deployment", async () => {
    const res = responseStub(); let next = false;
    await createTurnstileProtection({ TURNSTILE_ENABLED: "false" }).verify({ body: {} }, res, () => { next = true; });
    assert.equal(next, true);
});
