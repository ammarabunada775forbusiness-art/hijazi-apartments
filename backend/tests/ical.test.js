const test = require("node:test");
const assert = require("node:assert/strict");
const { buildIcalFeed, validateCalendarUrl } = require("../services/ical");

test("buildIcalFeed creates an all-day reservation with exclusive checkout", () => {
    const feed = buildIcalFeed(
        { label: "شقة رقم 104" },
        [{
            _id: "booking-1",
            checkIn: new Date("2026-09-15T00:00:00.000Z"),
            checkOut: new Date("2026-09-18T00:00:00.000Z"),
            source: "manual",
            createdAt: new Date("2026-09-12T00:00:00.000Z")
        }],
        "airbnb"
    );

    assert.match(feed, /BEGIN:VCALENDAR/);
    assert.match(feed, /DTSTART;VALUE=DATE:20260915/);
    assert.match(feed, /DTEND;VALUE=DATE:20260918/);
    assert.match(feed, /END:VCALENDAR/);
});

test("validateCalendarUrl rejects non-HTTPS and unrelated hosts", async () => {
    await assert.rejects(
        validateCalendarUrl("http://www.airbnb.com/calendar/test.ics", "airbnb"),
        /https:\/\//
    );

    await assert.rejects(
        validateCalendarUrl("https://example.com/calendar.ics", "booking"),
        /Booking\.com/
    );
});
