/* قراءة سطور MRZ: أرقام التحقق، أخطاء OCR الشائعة، والتواريخ المطبوعة. بيانات تجريبية فقط. */
const test = require("node:test");
const assert = require("node:assert/strict");
const Mrz = require("../../frontend/js/passport-mrz");

const now = new Date("2026-11-13T12:00:00Z");

// العيّنة الرسمية في معيار ICAO 9303
const ICAO_LINE_1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<";
const ICAO_LINE_2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<10";

test("check digits follow the ICAO 7-3-1 weights", () => {
    assert.equal(Mrz.checkDigit("L898902C3"), "6");
    assert.equal(Mrz.checkDigit("740812"), "2");
    assert.equal(Mrz.checkDigit("120415"), "9");
    assert.equal(Mrz.checkDigit("ZE184226B<<<<<"), "1");
});

test("a clean TD3 passport passes every check digit", () => {
    const result = Mrz.parse(`${ICAO_LINE_1}\n${ICAO_LINE_2}`, { now });
    assert.equal(result.format, "TD3");
    assert.equal(result.surname, "ERIKSSON");
    assert.equal(result.givenNames, "ANNA MARIA");
    assert.equal(result.documentNumber, "L898902C3");
    assert.equal(result.birthDate, "1974-08-12");
    assert.equal(result.expiryDate, "2012-04-15");
    assert.equal(result.sex, "F");
    assert.deepEqual(result.checks, { documentNumber: true, birthDate: true, expiryDate: true, composite: true });
});

test("noisy OCR text with spaces, misread fillers and other lines still parses", () => {
    const text = [
        "PASSPORT us jlo»",
        "SAYED MOHAMED ALAWI MAHFOODH",
        "11 JAN 2017",
        "11 JAN 2027",
        "P<BHREBRAHIM<<SAY ED<MOHAMED<ALAWI<MAHFOODH<<",
        "2609734<<7 BHR8009135M2701 116<<<<<<<<<LLLLL<2"
    ].join("\n");
    const combined = Mrz.combine([Mrz.parse(text, { now })], text, { now });
    const guest = Mrz.toGuestDocument(combined);

    assert.equal(guest.fullName, "SAYED MOHAMED ALAWI MAHFOODH EBRAHIM");
    assert.equal(guest.nationality, "BAHRAINI");
    assert.equal(guest.address, "BAHRAIN");
    assert.equal(guest.passportNumber, "2609734");
    assert.equal(guest.dateOfBirth, "1980-09-13");
    assert.equal(guest.gender, "M");
    assert.equal(guest.passportExpiryDate, "2027-01-11");
    assert.equal(guest.passportIssueDate, "2017-01-11");
    assert.equal(guest.nameMaybeTruncated, false);
    assert.deepEqual(guest.verified, {
        passportNumber: true,
        dateOfBirth: true,
        passportExpiryDate: true,
        nationality: true
    });
});

test("a misread check digit is confirmed by the printed date, and the printed name fixes OCR letters", () => {
    const text = [
        "ERIKSSON",
        "ANNA MARIA",
        "12 AuG/aouT 74",
        "16 APR/AVR 07",
        "15 APR/AVR 12",
        "P<UTOERTKSSON<<ANNA<MART A<<<<<sccecceccecee",
        "L898902C36UT07408122F12041507¢ 184226B<<<<<1p"
    ].join("\n");
    const parsed = Mrz.parse(text, { now });
    assert.equal(parsed.checks.expiryDate, false);

    const combined = Mrz.combine([parsed], text, { now });
    assert.equal(combined.expiryDate, "2012-04-15");
    assert.equal(combined.verified.expiryDate, true);
    assert.equal(combined.surname, "ERIKSSON");
    assert.equal(combined.givenNames, "ANNA MARIA");
    assert.equal(combined.issueDate, "2007-04-16");
});

test("the MRZ lines themselves never confirm an unverified field", () => {
    // رقم الجواز رقم تحققه غلط؛ ظهوره داخل سطر MRZ لا يعتبر تأكيدًا
    const text = "P<JORAL<AHMAD<<OMAR<KHALED<<<<<<<<<<<<<<<<<<\nQ1234567<0JOR9503021M29041579951234567<<<<98";
    const combined = Mrz.combine([Mrz.parse(text, { now })], text, { now });
    assert.equal(combined.documentNumber, "Q1234567");
    assert.equal(combined.verified.documentNumber, false);
});

test("TD1 identity cards (three lines of 30) are supported", () => {
    const text = [
        "IDENTITY CARD",
        "I<JORZX123456729922012345<<<<<",
        "9201154F3108206]0R<<<<<<<<<<<9",
        "HADDAD<<L INA<SAMI<<<<<<<<<<<<<"
    ].join("\n");
    const guest = Mrz.toGuestDocument(Mrz.combine([Mrz.parse(text, { now })], text, { now }));
    assert.equal(guest.documentType, "id");
    assert.equal(guest.fullName, "LINA SAMI HADDAD");
    assert.equal(guest.passportNumber, "ZX1234567");
    assert.equal(guest.nationality, "JORDANIAN");
    assert.equal(guest.dateOfBirth, "1992-01-15");
    assert.equal(guest.gender, "F");
    assert.equal(guest.passportExpiryDate, "2031-08-20");
});

test("the issue date is only filled when exactly one printed date fits the passport validity", () => {
    assert.equal(Mrz.findIssueDate("Date of issue 16/04/2024\nDate of expiry 15/04/2029", "2029-04-15", "1995-03-02"), "2024-04-16");
    assert.equal(Mrz.findIssueDate("06/01/2025 05/01/2030", "2030-01-05"), "2025-01-06");
    // 17 كانون الثاني لا يطابق صلاحية 10 سنين بالضبط، فلا نخمّن
    assert.equal(Mrz.findIssueDate("17 JAN 2017", "2027-01-11"), "");
    // تاريخان مطابقان؟ لا نختار
    assert.equal(Mrz.findIssueDate("11 JAN 2017 11 JAN 2022", "2027-01-11"), "");
    assert.equal(Mrz.findIssueDate("", "2027-01-11"), "");
});

test("birth years go to the past and expiry years to this century", () => {
    const line2 = (dob, exp) => {
        const number = "AB1234567";
        const body = `${number}${Mrz.checkDigit(number)}JOR${dob}${Mrz.checkDigit(dob)}M${exp}${Mrz.checkDigit(exp)}`;
        return body.padEnd(44, "<");
    };
    const infant = Mrz.parse(`P<JORTEST<<BABY<<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n${line2("250101", "300101")}`, { now });
    assert.equal(infant.birthDate, "2025-01-01");
    const adult = Mrz.parse(`P<JORTEST<<ADULT<<<<<<<<<<<<<<<<<<<<<<<<<<<<\n${line2("400101", "310101")}`, { now });
    assert.equal(adult.birthDate, "1940-01-01");
    assert.equal(adult.expiryDate, "2031-01-01");
});

test("a name that fills the whole MRZ field is flagged as possibly cut", () => {
    const long = "P<SAUALQAHTANI<<MOHAMMEDABDULLAHABDULRAHMANSA";
    const number = "Y12345678";
    const line2 = `${number}${Mrz.checkDigit(number)}SAU8707220M3001054`.padEnd(44, "<");
    assert.equal(Mrz.parse(`${long}\n${line2}`, { now }).nameMaybeTruncated, true);
    assert.equal(Mrz.parse(`${ICAO_LINE_1}\n${ICAO_LINE_2}`, { now }).nameMaybeTruncated, false);
});

test("text with no MRZ returns nothing instead of guessing", () => {
    assert.equal(Mrz.parse("HELLO WORLD\nTHIS IS NOT A PASSPORT PAGE AT ALL", { now }), null);
    assert.equal(Mrz.combine([null], ""), null);
    assert.equal(Mrz.toGuestDocument(null), null);
});

test("country table covers the main guest countries with nationality and name", () => {
    for (const [code, nationality, name] of [
        ["JOR", "JORDANIAN", "JORDAN"], ["SAU", "SAUDI", "SAUDI ARABIA"], ["ARE", "EMIRATI", "UNITED ARAB EMIRATES"],
        ["KWT", "KUWAITI", "KUWAIT"], ["QAT", "QATARI", "QATAR"], ["BHR", "BAHRAINI", "BAHRAIN"], ["OMN", "OMANI", "OMAN"],
        ["IRQ", "IRAQI", "IRAQ"], ["PSE", "PALESTINIAN", "PALESTINE"], ["EGY", "EGYPTIAN", "EGYPT"], ["D", "GERMAN", "GERMANY"]
    ]) {
        assert.equal(Mrz.countryInfo(code).nationality, nationality, code);
        assert.equal(Mrz.countryInfo(code).name, name, code);
    }
});
