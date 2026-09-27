const assert = require("node:assert/strict");
const test = require("node:test");

const { groupFor, group } = require("../../frontend/js/admin-booking-groups.js");
const today = "2026-09-27";

function booking(_id, status, checkIn, checkOut, extra = {}) {
    return { _id, status, checkIn, checkOut, ...extra };
}

test("a stay finishes on checkout morning in Amman only after it was confirmed", () => {
    assert.equal(groupFor(booking("1", "confirmed", "2026-09-25T00:00:00Z", "2026-09-27T00:00:00Z"), today), "completed");
    assert.equal(groupFor(booking("2", "confirmed", "2026-09-25T00:00:00Z", "2026-09-28T00:00:00Z"), today), "confirmed");
    assert.equal(groupFor(booking("3", "pending", "2026-09-20T00:00:00Z", "2026-09-22T00:00:00Z"), today), "pending");
    assert.equal(groupFor(booking("4", "cancelled", "2026-09-20T00:00:00Z", "2026-09-22T00:00:00Z"), today), "cancelled");
    assert.equal(groupFor(booking("5", "blocked", "2026-09-20T00:00:00Z", "2026-09-22T00:00:00Z"), today), "blocked");
});

test("groups sort active confirmed stays first, then pending, recent finished and cancelled stays", () => {
    const bookings = [
        booking("archived-old", "cancelled", "2026-10-01", "2026-10-02", { cancelledAt: "2026-09-20T09:00:00Z" }),
        booking("pending-late", "pending", "2026-10-05", "2026-10-07"),
        booking("finished-old", "confirmed", "2026-09-01", "2026-09-02"),
        booking("future", "confirmed", "2026-10-01", "2026-10-03"),
        booking("current", "confirmed", "2026-09-26", "2026-09-30"),
        booking("pending-soon", "pending", "2026-09-28", "2026-09-29"),
        booking("finished-new", "confirmed", "2026-09-24", "2026-09-27"),
        booking("archived-new", "cancelled", "2026-10-01", "2026-10-02", { cancelledAt: "2026-09-25T09:00:00Z" }),
        booking("unavailable", "blocked", "2026-09-27", "2026-09-29")
    ];

    const grouped = group(bookings, today);
    assert.deepEqual(Object.keys(grouped), ["confirmed", "pending", "completed", "cancelled", "blocked"]);
    assert.deepEqual(grouped.confirmed.map(item => item._id), ["current", "future"]);
    assert.deepEqual(grouped.pending.map(item => item._id), ["pending-soon", "pending-late"]);
    assert.deepEqual(grouped.completed.map(item => item._id), ["finished-new", "finished-old"]);
    assert.deepEqual(grouped.cancelled.map(item => item._id), ["archived-new", "archived-old"]);
    assert.deepEqual(grouped.blocked.map(item => item._id), ["unavailable"]);
    assert.equal(bookings[0]._id, "archived-old", "grouping does not mutate API data");
    assert.equal(bookings[6].status, "confirmed", "completed is a view, not a stored status");
});
