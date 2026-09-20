const test = require("node:test");
const assert = require("node:assert/strict");
const dns = require("node:dns").promises;
const https = require("node:https");
const { EventEmitter } = require("node:events");
const { PassThrough } = require("node:stream");
const { fetchCalendarEvents } = require("../services/ical");
function fakeRequest(callback, { status = 200, location, body = "" } = {}) {
    const req = new EventEmitter();
    req.end = () => queueMicrotask(() => {
        const response = new PassThrough();
        response.statusCode = status; response.headers = location ? { location } : {};
        callback(response); if (!response.destroyed) response.end(body);
    });
    return req;
}
test("iCal transport pins the checked DNS answer and retains HTTPS hostname validation", async t => {
    let lookups = 0;
    t.mock.method(dns, "lookup", async () => { lookups++; return [{ address: "1.1.1.1", family: 4 }]; });
    t.mock.method(https, "request", (url, options, callback) => {
        assert.equal(url.hostname, "www.airbnb.com"); assert.equal(url.protocol, "https:");
        assert.notEqual(options.rejectUnauthorized, false); assert.equal(options.agent, false);
        options.lookup(url.hostname, {}, (error, address, family) => {
            assert.equal(error, null); assert.equal(address, "1.1.1.1"); assert.equal(family, 4);
        });
        options.lookup(url.hostname, { all: true }, (error, addresses) => {
            assert.deepEqual(addresses, [{ address: "1.1.1.1", family: 4 }]);
        });
        return fakeRequest(callback, { body: "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:test\r\nDTSTART;VALUE=DATE:20260915\r\nDTEND;VALUE=DATE:20260918\r\nSUMMARY:Reserved\r\nDESCRIPTION:Late arrival\\nNeeds a cot\r\nLOCATION:Shmeisani\r\nEND:VEVENT\r\nEND:VCALENDAR\r\n" });
    });
    const events = await fetchCalendarEvents("https://www.airbnb.com/calendar/sample", "airbnb");
    assert.equal(events.length, 1); assert.equal(lookups, 1);
    assert.equal(events[0].summary, "Reserved");
    assert.equal(events[0].description, "Late arrival\nNeeds a cot");
    assert.equal(events[0].location, "Shmeisani");
});
test("iCal transport validates redirect targets before connecting to them", async t => {
    let connections = 0;
    t.mock.method(dns, "lookup", async () => [{ address: "1.1.1.1", family: 4 }]);
    t.mock.method(https, "request", (url, options, callback) => {
        connections++;
        return fakeRequest(callback, { status: 302, location: "https://127.0.0.1/private" });
    });
    await assert.rejects(fetchCalendarEvents("https://www.airbnb.com/calendar/sample", "airbnb"));
    assert.equal(connections, 1);
});
