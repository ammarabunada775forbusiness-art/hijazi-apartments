/* نموذج الحجز المطبوع: كيف تتحول بيانات الحجز إلى نصوص النموذج. */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Form = require("../../frontend/js/reservation-form");

const frontendRoot = path.join(__dirname, "..", "..", "frontend");

const example = () => ({
    apartmentId: 1,
    fullName: "Sayed Mohamed Alawi Mahfoodh Ebrahim",
    phone: "",
    email: "",
    checkIn: "2026-10-25T00:00:00.000Z",
    checkOut: "2026-11-01T00:00:00.000Z",
    adults: 5,
    children: 0,
    currency: "JOD",
    totalPrice: 770,
    nightlyRate: 110,
    createdAt: "2026-10-25T09:00:00Z",
    guestDocument: {
        nationality: "BAHRAINI",
        passportNumber: "2609734",
        dateOfBirth: "1980-09-13",
        gender: "M",
        passportIssueDate: "2017-01-11",
        passportExpiryDate: "2027-01-11",
        placeOfBirth: "Bahrain",
        address: "BAHRAIN"
    }
});

test("the owner's filled example comes out field by field", () => {
    assert.deepEqual(Form.fieldsFromBooking(example(), { apartmentNumber: "104" }), {
        date: "25 / 10 / 2026",
        fullName: "SAYED MOHAMED ALAWI MAHFOODH EBRAHIM",
        nationality: "BAHRAINI",
        passportNumber: "2609734",
        dateOfBirth: "13 / 09 / 1980",
        gender: "MALE",
        passportIssueDate: "11 / 01 / 2017",
        passportExpiryDate: "11 / 01 / 2027",
        contact: "",
        email: "",
        placeOfBirth: "BAHRAIN",
        address: "BAHRAIN",
        checkIn: "25 / 10 / 2026",
        checkOut: "01 / 11 / 2026",
        lengthOfStay: "7 NIGHTS",
        apartmentNumber: "104",
        guests: "5",
        reference: "HA-25102026-104",
        ratePerNight: "110.00 JOD",
        totalRent: "770.00 JOD",
        securityDeposit: "200.00 JOD",
        totalPaid: "970.00 JOD",
        paymentMethod: "CASH"
    });
});

test("deposit defaults to 200, payment to cash, and the nightly rate falls back to total ÷ nights", () => {
    const booking = example();
    delete booking.nightlyRate;
    delete booking.guestDocument;
    const fields = Form.fieldsFromBooking(booking, { apartmentNumber: "104" });
    assert.equal(fields.ratePerNight, "110.00 JOD");
    assert.equal(fields.securityDeposit, "200.00 JOD");
    assert.equal(fields.totalPaid, "970.00 JOD");
    assert.equal(fields.paymentMethod, "CASH");
    assert.equal(fields.passportNumber, "");
});

test("owner overrides for deposit, amount paid and payment method are printed as entered", () => {
    const fields = Form.fieldsFromBooking({
        ...example(),
        securityDeposit: 0,
        amountPaid: 300,
        paymentMethod: "BANK_TRANSFER",
        totalPrice: 5600,
        checkOut: "2026-12-29",
        adults: 4,
        children: 3
    }, { apartmentNumber: "305" });
    assert.equal(fields.securityDeposit, "0.00 JOD");
    assert.equal(fields.totalPaid, "300.00 JOD");
    assert.equal(fields.totalRent, "5,600.00 JOD");
    assert.equal(fields.paymentMethod, "BANK TRANSFER");
    assert.equal(fields.guests, "7");
    assert.equal(fields.lengthOfStay, "65 NIGHTS");
    assert.equal(fields.reference, "HA-25102026-305");
});

test("booking reference is HA + check-in date + apartment number", () => {
    assert.equal(Form.referenceFor({ checkIn: "2026-01-05", apartmentId: 6 }, "305"), "HA-05012026-305");
    assert.equal(Form.referenceFor({ checkIn: "2026-01-05", apartmentId: 6 }), "HA-05012026-6");
    assert.equal(Form.referenceFor({ checkIn: "" }, "305"), "");
});

test("the form date is the booking day in Amman, not UTC", () => {
    const fields = Form.fieldsFromBooking({ ...example(), createdAt: "2026-10-24T22:30:00Z" });
    assert.equal(fields.date, "25 / 10 / 2026");
});

test("one night is singular and empty money stays empty", () => {
    const fields = Form.fieldsFromBooking({ ...example(), checkOut: "2026-10-26", totalPrice: 0, nightlyRate: null });
    assert.equal(fields.lengthOfStay, "1 NIGHT");
    assert.equal(fields.totalRent, "");
    assert.equal(fields.ratePerNight, "");
});

test("every printed field has a place on the template, and the template and font ship with the site", () => {
    const fields = Form.fieldsFromBooking(example(), { apartmentNumber: "104" });
    assert.deepEqual(Object.keys(fields).sort(), Object.keys(Form.FIELD_LINES).sort());
    for (const line of Object.values(Form.FIELD_LINES)) {
        assert.ok(line.x0 >= 0 && line.x1 <= 1536 && line.x0 < line.x1 && line.y > 0 && line.y < 1024);
    }
    assert.ok(fs.statSync(path.join(frontendRoot, "images/reservation-form-template.jpg")).size > 50000);
    assert.ok(fs.statSync(path.join(frontendRoot, "fonts/barlow-semi-condensed-500.woff2")).size > 10000);
    assert.ok(fs.existsSync(path.join(frontendRoot, "fonts/OFL.txt")));
});
