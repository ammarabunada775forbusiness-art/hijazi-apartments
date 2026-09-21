const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const frontendRoot = path.join(__dirname, "..", "..", "frontend");

function readFrontendFile(name) {
    return fs.readFileSync(path.join(frontendRoot, name), "utf8");
}

test("admin uses per-apartment calendars with the approved source colors", () => {
    const html = readFrontendFile("admin.html");

    assert.match(html, /class="apartment-calendar-grid"/);
    assert.match(html, /website:\s*"#c89116"/);
    assert.match(html, /manual:\s*"#7f56d9"/);
    assert.match(html, /airbnb:\s*"#ff385c"/);
    assert.match(html, /booking:\s*"#003b95"/);
    assert.match(html, /class="mini-calendar-surface" dir="ltr"/);
    assert.match(html, /\.mini-calendar-days \{[\s\S]*?gap: 0;/);
    assert.doesNotMatch(html, /<div class="calendar-legend">/);
    assert.doesNotMatch(html, /data-calendar-today>اليوم</);
    assert.doesNotMatch(html, /new FullCalendar\.Calendar/);
});

test("admin calendar treats checkout as exclusive and hides finished conflicts", () => {
    const html = readFrontendFile("admin.html");

    assert.match(html, /return start <= dateKey && dateKey < end;/);
    assert.match(html, /item\.end > todayStart/);
    assert.match(html, /isPast \? \[\] : dayBookings/);
    assert.match(html, /يوم الخروج لا يُحسب ليلة/);
});

test("public booking screens explain that checkout is the departure morning", () => {
    const index = readFrontendFile("index.html");
    const apartments = readFrontendFile("apartments.html");
    const booking = readFrontendFile("booking.html");

    assert.match(index, /تاريخ المغادرة صباحًا/);
    assert.match(apartments, /تاريخ المغادرة صباحًا/);
    assert.match(booking, /يوم المغادرة لا يُحسب ليلة/);
    assert.match(booking, /The check-out date is not charged as a night/);
});

test("inline admin JavaScript compiles", () => {
    const html = readFrontendFile("admin.html");
    const inlineScripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
        .map(match => match[1].trim())
        .filter(Boolean);

    assert.ok(inlineScripts.length > 0);

    for (const script of inlineScripts) {
        assert.doesNotThrow(() => new Function(script));
    }
});
