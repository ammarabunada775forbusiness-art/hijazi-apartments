/* بيانات الجواز والدفع في API الإدارة. MongoDB وهمي بالكامل؛ لا قاعدة بيانات ولا بريد حقيقي. */
const test = require("node:test");
const assert = require("node:assert/strict");
process.env.NODE_ENV = "test";
process.env.TURNSTILE_ENABLED = "false";
process.env.ADMIN_USER = "local-test-admin";
process.env.ADMIN_PASS = "local-test-password";
process.env.RESEND_API_KEY = "";
process.env.MONGO_URI = "";
const { app } = require("../server");
const Apartment = require("../models/Apartment");
const Booking = require("../models/Booking");
const ActivityLog = require("../models/ActivityLog");

const auth = "Basic " + Buffer.from("local-test-admin:local-test-password").toString("base64");
const BOOKING_ID = "0123456789abcdef01234567";
const created = [];
const saved = [];
const activities = [];
const selections = [];
let server, base, dbCalls = 0, storedBooking;

const passport = () => ({
    nationality: "BAHRAINI",
    passportNumber: "ab 2609734",
    dateOfBirth: "1980-09-13",
    gender: "m",
    passportIssueDate: "2017-01-11",
    passportExpiryDate: "2027-01-11",
    placeOfBirth: "BAHRAIN",
    address: "BAHRAIN"
});

const manualBooking = (extra = {}) => ({
    apartmentId: 1, source: "manual", checkIn: "2099-10-25", checkOut: "2099-11-01",
    fullName: "SAYED MOHAMED ALAWI MAHFOODH EBRAHIM", adults: 5, children: 0,
    totalPrice: 770, currency: "JOD", status: "confirmed", ...extra
});

function request(path, { method = "GET", body, headers = {} } = {}) {
    return fetch(base + path, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body === undefined ? undefined : JSON.stringify(body)
    });
}

const admin = (path, options = {}) =>
    request(path, { ...options, headers: { Authorization: auth, ...(options.headers || {}) } });

test.before(async () => {
    Apartment.bulkWrite = async () => ({});
    Apartment.findOne = async () => { dbCalls++; return { apartmentId: 1, label: "شقة رقم 104", nightlyPriceJod: 110, active: true }; };
    Booking.findOne = async () => { dbCalls++; return null; };
    Booking.create = async data => {
        dbCalls++;
        const booking = new Booking(data);
        const error = booking.validateSync();
        if (error) throw error;
        created.push(booking.toObject());
        return booking;
    };
    Booking.prototype.save = async function () { saved.push(this.toObject()); return this; };
    Booking.findById = id => ({
        select(projection) {
            dbCalls++;
            selections.push(projection);
            return Promise.resolve(id === BOOKING_ID ? storedBooking : null);
        }
    });
    ActivityLog.create = async entry => { activities.push(entry); return entry; };
    server = await new Promise(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
    base = `http://127.0.0.1:${server.address().port}`;
});

test.after(async () => { await new Promise(resolve => server.close(resolve)); });

test.beforeEach(() => {
    storedBooking = new Booking({
        _id: BOOKING_ID, ...manualBooking(), checkIn: new Date("2099-10-25"), checkOut: new Date("2099-11-01"),
        guestDocument: { ...passport(), passportNumber: "AB2609734", gender: "M" }
    });
});

test("the passport is hidden from every booking query unless asked for", () => {
    assert.equal(Booking.schema.path("guestDocument").options.select, false);
});

test("admin create stores the passport and payment details, and the activity log never holds passport data", async () => {
    const response = await admin("/admin/bookings", {
        method: "POST",
        body: manualBooking({
            guestDocument: passport(), nightlyRate: 110, securityDeposit: "200", paymentMethod: "cash"
        })
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    const booking = created.at(-1);

    assert.deepEqual(booking.guestDocument, {
        nationality: "BAHRAINI", passportNumber: "AB 2609734", dateOfBirth: "1980-09-13", gender: "M",
        passportIssueDate: "2017-01-11", passportExpiryDate: "2027-01-11", placeOfBirth: "BAHRAIN", address: "BAHRAIN"
    });
    assert.equal(booking.nightlyRate, 110);
    assert.equal(booking.securityDeposit, 200);
    assert.equal(booking.amountPaid, null);
    assert.equal(booking.paymentMethod, "CASH");
    // الرد يرجع البيانات حتى تنطبع الورقة فورًا بعد الحفظ
    assert.equal(body.booking.guestDocument.passportNumber, "AB 2609734");

    const log = JSON.stringify(activities.at(-1));
    assert.ok(!log.includes("2609734"));
    assert.ok(!log.includes("1980-09-13"));
    assert.equal(activities.at(-1).details.hasGuestDocument, true);
});

test("a booking without passport details stores no passport object", async () => {
    const response = await admin("/admin/bookings", { method: "POST", body: manualBooking({ guestDocument: { nationality: " " } }) });
    assert.equal(response.status, 201);
    assert.equal(created.at(-1).guestDocument, undefined);
});

test("bad passport dates and payment values are rejected before touching the database", async () => {
    const before = dbCalls;
    const cases = [
        { guestDocument: { ...passport(), dateOfBirth: "13/09/1980" } },
        { guestDocument: { ...passport(), dateOfBirth: "2999-01-01" } },
        { guestDocument: { ...passport(), passportIssueDate: "2028-01-01" } },
        { guestDocument: { ...passport(), gender: "male" } },
        { guestDocument: [passport()] },
        { guestDocument: { ...passport(), nationality: { text: "x" } } },
        { paymentMethod: "BITCOIN" },
        { securityDeposit: -5 },
        { amountPaid: true },
        { nightlyRate: "abc" }
    ];

    for (const extra of cases) {
        const response = await admin("/admin/bookings", { method: "POST", body: manualBooking(extra) });
        assert.equal(response.status, 400, JSON.stringify(extra));
    }

    assert.equal(dbCalls, before);
});

test("passport data comes back only for one booking, and only for the admin", async () => {
    assert.equal((await request(`/admin/bookings/${BOOKING_ID}`, { headers: { "X-Forwarded-For": "198.51.100.90" } })).status, 401);

    const response = await admin(`/admin/bookings/${BOOKING_ID}`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.booking.guestDocument.passportNumber, "AB2609734");
    assert.equal(selections.at(-1), "+guestDocument");

    const before = dbCalls;
    assert.equal((await admin("/admin/bookings/not-a-booking-id")).status, 404);
    assert.equal(dbCalls, before);
});

test("editing a booking updates, keeps or clears the passport details", async () => {
    const edit = async extra => {
        const response = await admin(`/admin/bookings/${BOOKING_ID}`, {
            method: "PUT",
            body: { apartmentId: 1, checkIn: "2099-10-25", checkOut: "2099-11-01", ...extra }
        });
        assert.equal(response.status, 200);
        return saved.at(-1);
    };

    let booking = await edit({ guestDocument: { ...passport(), placeOfBirth: "MANAMA" }, amountPaid: 500, paymentMethod: "CLIQ" });
    assert.equal(booking.guestDocument.placeOfBirth, "MANAMA");
    assert.equal(booking.amountPaid, 500);
    assert.equal(booking.paymentMethod, "CLIQ");

    booking = await edit({ fullName: "SAYED EBRAHIM" });
    assert.equal(booking.guestDocument.passportNumber, "AB 2609734");
    assert.equal(booking.guestDocument.placeOfBirth, "MANAMA");

    booking = await edit({ guestDocument: {} });
    assert.equal(booking.guestDocument, undefined);

    const log = JSON.stringify(activities.at(-1));
    assert.ok(!log.includes("2609734"));
});

test("the public booking form cannot write passport or payment details", async () => {
    const response = await request("/bookings", {
        method: "POST",
        body: {
            apartmentId: 1, fullName: "Test Guest", email: "guest@example.com", phone: "+962790000000",
            checkIn: "2099-01-10", checkOut: "2099-01-13", adults: 2, children: 0, currency: "JOD",
            guestDocument: passport(), securityDeposit: 0, amountPaid: 1, paymentMethod: "CARD", nightlyRate: 1
        }
    });
    assert.equal(response.status, 200);
    const booking = saved.at(-1);
    assert.equal(booking.guestDocument, undefined);
    assert.equal(booking.securityDeposit, null);
    assert.equal(booking.amountPaid, null);
    assert.equal(booking.nightlyRate, null);
    assert.equal(booking.paymentMethod, "");
    assert.equal(booking.totalPrice, 330);
});
