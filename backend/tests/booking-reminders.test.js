const test = require("node:test");
const assert = require("node:assert/strict");
const {
    ammanDateKey,
    isReminderSendTime,
    dueReminders,
    serializeReminder,
    deliverReminders
} = require("../services/booking-reminders");

const now = new Date("2026-09-28T09:00:00Z");

function booking(id, checkIn, checkOut, status = "confirmed") {
    return {
        _id: id,
        status,
        apartmentId: Number(id),
        apartmentLabel: `شقة رقم ${id}`,
        fullName: `ضيف ${id}`,
        phone: `079000000${id}`,
        source: "manual",
        checkIn: new Date(`${checkIn}T00:00:00.000Z`),
        checkOut: new Date(`${checkOut}T00:00:00.000Z`)
    };
}

test("Jordan calendar day and morning cutoff use Asia/Amman, not server timezone", () => {
    assert.equal(ammanDateKey(new Date("2026-09-27T20:59:00Z")), "2026-09-27");
    assert.equal(ammanDateKey(new Date("2026-09-27T21:00:00Z")), "2026-09-28");
    assert.equal(isReminderSendTime(new Date("2026-09-28T05:59:00Z")), false);
    assert.equal(isReminderSendTime(new Date("2026-09-28T06:00:00Z")), true);
});

test("only confirmed bookings get the five reminders on their exact calendar days", () => {
    const bookings = [
        booking("1", "2026-10-01", "2026-10-06"),
        booking("2", "2026-09-29", "2026-10-03"),
        booking("3", "2026-09-28", "2026-09-29"),
        booking("4", "2026-09-26", "2026-09-28"),
        booking("5", "2026-09-29", "2026-10-02", "pending"),
        booking("6", "2026-09-28", "2026-09-29", "cancelled"),
        booking("7", "2026-09-28", "2026-09-29", "blocked")
    ];

    const reminders = dueReminders(bookings, now);
    assert.deepEqual(
        reminders.map(({ bookingId, key }) => [bookingId, key]),
        [
            ["4", "checkout:2026-09-28:0"],
            ["3", "checkin:2026-09-28:0"],
            ["3", "checkout:2026-09-29:1"],
            ["2", "checkin:2026-09-29:1"],
            ["1", "checkin:2026-10-01:3"]
        ]
    );

    assert.deepEqual(serializeReminder(reminders[0]), {
        bookingId: "4",
        apartmentId: 4,
        apartmentLabel: "شقة رقم 4",
        fullName: "ضيف 4",
        phone: "0790000004",
        source: "manual",
        kind: "checkout",
        daysUntil: 0,
        label: "الخروج اليوم",
        targetDate: "2026-09-28"
    });

    assert.equal(dueReminders(bookings, new Date("2026-09-29T20:59:00Z"))
        .some(reminder => reminder.bookingId === "1" && reminder.daysUntil === 1), false);
    assert.equal(dueReminders(bookings, new Date("2026-09-29T21:00:00Z"))
        .some(reminder => reminder.bookingId === "1" && reminder.daysUntil === 1), true);
});

test("delivery claims each reminder once and retries a failed email", async () => {
    const [reminder] = dueReminders([booking("1", "2026-10-01", "2026-10-06")], now);
    const sentKeys = new Set();
    const delivered = [];
    let failOnce = true;
    const deps = {
        claim: async item => {
            if (sentKeys.has(item.key)) return false;
            sentKeys.add(item.key);
            return true;
        },
        send: async item => {
            if (failOnce) {
                failOnce = false;
                throw new Error("Email provider unavailable");
            }
            delivered.push(item.key);
        },
        release: async item => sentKeys.delete(item.key)
    };

    const failed = await deliverReminders([reminder], deps);
    assert.equal(failed.sent, 0);
    assert.equal(failed.errors[0].message, "Email provider unavailable");
    assert.equal(sentKeys.size, 0);

    const success = await deliverReminders([reminder, reminder], deps);
    assert.equal(success.sent, 1);
    assert.equal(success.errors.length, 0);
    assert.deepEqual(delivered, [reminder.key]);
    assert.equal((await deliverReminders([reminder], deps)).sent, 0);
});

test("admin bookings endpoint exposes today's reminders only after authentication", async () => {
    process.env.NODE_ENV = "test";
    process.env.MONGO_URI = "";
    process.env.RESEND_API_KEY = "";
    process.env.ADMIN_USER = "reminder-test-admin";
    process.env.ADMIN_PASS = "reminder-test-pass";

    const Booking = require("../models/Booking");
    const { app } = require("../server");
    const originalFind = Booking.find;
    const today = ammanDateKey();
    const checkIn = new Date(`${today}T00:00:00.000Z`);
    const checkOut = new Date(checkIn.getTime() + 2 * 86400000);
    const confirmed = {
        ...booking("1", today, checkOut.toISOString().slice(0, 10)),
        checkIn
    };

    Booking.find = () => ({ sort: async () => [confirmed] });
    const server = await new Promise(resolve => {
        const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
    });

    try {
        const url = `http://127.0.0.1:${server.address().port}/admin/bookings`;
        const unauthorized = await fetch(url);
        assert.equal(unauthorized.status, 401);

        const response = await fetch(url, {
            headers: {
                Authorization: `Basic ${Buffer.from("reminder-test-admin:reminder-test-pass").toString("base64")}`
            }
        });
        assert.equal(response.status, 200);
        const result = await response.json();
        assert.equal(result.bookings.length, 1);
        assert.equal(result.reminders.length, 1);
        assert.equal(result.reminders[0].kind, "checkin");
        assert.equal(result.reminders[0].targetDate, today);
        assert.equal(result.reminders[0].fullName, "ضيف 1");
    } finally {
        Booking.find = originalFind;
        await new Promise(resolve => server.close(resolve));
    }
});
