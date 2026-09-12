const dns = require("dns").promises;
const net = require("net");
const ical = require("node-ical");

const ALLOWED_CALENDAR_HOSTS = ["airbnb.com", "booking.com"];

/* =========================================================
   التحقق من أن رابط iCal تابع لـ Airbnb أو Booking وآمن للجلب
========================================================= */
async function validateCalendarUrl(rawUrl, expectedSource) {
    let parsed;

    try {
        parsed = new URL(rawUrl);
    } catch {
        throw new Error("رابط التقويم غير صحيح.");
    }

    if (parsed.protocol !== "https:") {
        throw new Error("رابط التقويم يجب أن يبدأ بـ https://");
    }

    const hostname = parsed.hostname.toLowerCase();
    const expectedHost = expectedSource === "airbnb" ? "airbnb.com" : "booking.com";
    const matchesExpectedSource = hostname === expectedHost || hostname.endsWith(`.${expectedHost}`);

    if (!matchesExpectedSource || !ALLOWED_CALENDAR_HOSTS.some((host) => hostname === host || hostname.endsWith(`.${host}`))) {
        throw new Error(`الرابط يجب أن يكون رابط تقويم ${expectedSource === "airbnb" ? "Airbnb" : "Booking.com"} رسميًا.`);
    }

    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
        throw new Error("تعذر التحقق من عنوان خادم التقويم.");
    }

    return parsed.toString();
}

/* =========================================================
   منع عناوين الشبكات المحلية عند جلب روابط خارجية
========================================================= */
function isPrivateAddress(address) {
    if (net.isIPv4(address)) {
        const parts = address.split(".").map(Number);
        return (
            parts[0] === 10 ||
            parts[0] === 127 ||
            (parts[0] === 169 && parts[1] === 254) ||
            (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
            (parts[0] === 192 && parts[1] === 168) ||
            parts[0] === 0
        );
    }

    if (net.isIPv6(address)) {
        const normalized = address.toLowerCase();
        return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
    }

    return true;
}

/* =========================================================
   تنزيل ملف iCal وتحويله إلى أحداث حجز صالحة
========================================================= */
async function fetchCalendarEvents(url, source) {
    let safeUrl = await validateCalendarUrl(url, source);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
        let response;

        for (let redirectCount = 0; redirectCount <= 3; redirectCount++) {
            response = await fetch(safeUrl, {
                signal: controller.signal,
                redirect: "manual",
                headers: { "User-Agent": "HIJAZI-Apartments-PMS/1.0" }
            });

            if (![301, 302, 303, 307, 308].includes(response.status)) break;
            if (redirectCount === 3) throw new Error("رابط التقويم يحتوي تحويلات كثيرة.");

            const location = response.headers.get("location");
            if (!location) throw new Error("خادم التقويم أعاد تحويلًا غير صحيح.");
            safeUrl = await validateCalendarUrl(new URL(location, safeUrl).toString(), source);
        }

        if (!response.ok) {
            throw new Error(`فشل تنزيل التقويم (HTTP ${response.status}).`);
        }

        const text = await response.text();
        if (text.length > 5 * 1024 * 1024) {
            throw new Error("ملف التقويم أكبر من الحجم المسموح.");
        }
        if (!text.includes("BEGIN:VCALENDAR") || !text.includes("END:VCALENDAR")) {
            throw new Error("الرابط لم يُرجع ملف iCal صالحًا. تأكد أنك نسخت رابط التصدير وليس رابط صفحة الحساب.");
        }

        const parsed = ical.sync.parseICS(text);
        return Object.values(parsed)
            .filter((entry) => entry && entry.type === "VEVENT" && entry.start && entry.end)
            .map((entry) => ({
                externalUid: String(entry.uid || `${entry.start.toISOString()}-${entry.end.toISOString()}`),
                checkIn: new Date(entry.start),
                checkOut: new Date(entry.end),
                summary: String(entry.summary || "حجز مستورد").slice(0, 150),
                sourceReference: String(entry.uid || "").slice(0, 250)
            }))
            .filter((event) => !Number.isNaN(event.checkIn.getTime()) && !Number.isNaN(event.checkOut.getTime()) && event.checkOut > event.checkIn);
    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error("انتهت مهلة الاتصال بالتقويم.");
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

/* =========================================================
   أدوات إنشاء ملف iCal الذي تستورده المنصات الخارجية
========================================================= */
function escapeIcalText(value) {
    return String(value || "")
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\r?\n/g, "\\n");
}

function toIcalDate(value) {
    const date = new Date(value);
    return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function toIcalTimestamp(value = new Date()) {
    return new Date(value).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function buildIcalFeed(apartment, bookings, target) {
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//HIJAZI Apartments//PMS Calendar//AR",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:${escapeIcalText(`${apartment.label} - HIJAZI`)}`,
        "X-WR-TIMEZONE:Asia/Amman"
    ];

    bookings.forEach((booking) => {
        lines.push(
            "BEGIN:VEVENT",
            `UID:${escapeIcalText(`${booking._id}@hijazi-apartments.com`)}`,
            `DTSTAMP:${toIcalTimestamp(booking.updatedAt || booking.createdAt)}`,
            `DTSTART;VALUE=DATE:${toIcalDate(booking.checkIn)}`,
            `DTEND;VALUE=DATE:${toIcalDate(booking.checkOut)}`,
            "SUMMARY:Reserved - HIJAZI Apartments",
            `DESCRIPTION:${escapeIcalText(`Blocked by HIJAZI PMS (${booking.source}) for ${target}`)}`,
            "STATUS:CONFIRMED",
            "TRANSP:OPAQUE",
            "END:VEVENT"
        );
    });

    lines.push("END:VCALENDAR");
    return `${lines.join("\r\n")}\r\n`;
}

module.exports = {
    buildIcalFeed,
    fetchCalendarEvents,
    validateCalendarUrl
};
