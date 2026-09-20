const test = require("node:test");
const assert = require("node:assert/strict");

process.env.NODE_ENV = "test";
process.env.MONGO_URI = "";
process.env.RESEND_API_KEY = "";

const Booking = require("../models/Booking");
const {
    bookingText,
    bookingHtml,
    bookingSourceLabel,
    syncApartmentCalendar
} = require("../server");

function externalBooking(source = "booking") {
    return {
        apartmentId: 7,
        apartmentLabel: "شقة رقم 107",
        fullName: source === "airbnb" ? "حجز Airbnb" : "حجز Booking.com",
        email: "",
        phone: "",
        checkIn: new Date("2026-10-01T00:00:00.000Z"),
        checkOut: new Date("2026-10-05T00:00:00.000Z"),
        adults: 0,
        children: 0,
        currency: "JOD",
        totalPrice: 0,
        totalPriceText: "",
        notes: "Reserved",
        source,
        createdAt: new Date("2026-09-20T00:00:00.000Z")
    };
}

test("booking notification starts with حجز جديد and identifies its source", () => {
    const booking = externalBooking("booking");
    const text = bookingText(booking);
    const html = bookingHtml(booking, false);

    assert.match(text, /^حجز جديد - HIJAZI Apartments/);
    assert.match(text, /المصدر: Booking\.com/);
    assert.match(html, /وصل حجز جديد من Booking\.com/);
    assert.match(html, /<b>المصدر:<\/b>\s*Booking\.com/);
    assert.equal(bookingSourceLabel("airbnb"), "Airbnb");
    assert.equal(bookingSourceLabel("website"), "الموقع");
});

test("iCal sync notifies only when an external booking is first inserted", async () => {
    const originalFindOneAndUpdate = Booking.findOneAndUpdate;
    const originalUpdateMany = Booking.updateMany;
    const notifications = [];
    let syncCount = 0;

    Booking.findOneAndUpdate = async (filter, update, options) => {
        assert.equal(options.includeResultMetadata, true);
        const inserted = syncCount++ === 0;

        return {
            lastErrorObject: {
                updatedExisting: !inserted,
                ...(inserted ? { upserted: "external-booking-id" } : {})
            },
            value: {
                ...externalBooking("airbnb"),
                ...update.$set,
                ...update.$setOnInsert,
                source: filter.source,
                externalUid: filter.externalUid
            }
        };
    };
    Booking.updateMany = async () => ({ acknowledged: true });

    const apartment = {
        apartmentId: 7,
        label: "شقة رقم 107",
        calendars: {
            airbnb: {
                enabled: true,
                url: "https://www.airbnb.com/calendar/example.ics"
            }
        },
        save: async () => apartment
    };

    const fetchEvents = async () => [{
        externalUid: "airbnb-event-1",
        checkIn: new Date("2026-10-01T00:00:00.000Z"),
        checkOut: new Date("2026-10-05T00:00:00.000Z"),
        sourceReference: "airbnb-event-1",
        summary: "Reserved"
    }];

    try {
        await syncApartmentCalendar(apartment, "airbnb", {
            fetchEvents,
            notifyBooking: async booking => notifications.push(booking)
        });
        await syncApartmentCalendar(apartment, "airbnb", {
            fetchEvents,
            notifyBooking: async booking => notifications.push(booking)
        });

        assert.equal(notifications.length, 1);
        assert.equal(notifications[0].source, "airbnb");
        assert.equal(notifications[0].externalUid, "airbnb-event-1");
    } finally {
        Booking.findOneAndUpdate = originalFindOneAndUpdate;
        Booking.updateMany = originalUpdateMany;
    }
});
