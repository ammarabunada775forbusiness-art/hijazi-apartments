const dns = require("dns").promises;
const net = require("net");
const ical = require("node-ical");

const https = require("node:https");
const MAX_CALENDAR_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15000;

const blockedIpv4 = new net.BlockList();
for (const [address, prefix] of [
    ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
    ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
    ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
    ["203.0.113.0", 24], ["224.0.0.0", 3]
]) blockedIpv4.addSubnet(address, prefix, "ipv4");
const globalIpv6 = new net.BlockList();
globalIpv6.addSubnet("2000::", 3, "ipv6");
const blockedIpv6 = new net.BlockList();
for (const [address, prefix] of [["2001::", 23], ["2001:db8::", 32], ["2002::", 16], ["3fff::", 20]]) {
    blockedIpv6.addSubnet(address, prefix, "ipv6");
}

/* لا نسمح بعناوين loopback أو خاصة أو محجوزة، بما فيها IPv4-mapped IPv6. */
function isPrivateAddress(address) {
    if (net.isIPv4(address)) return blockedIpv4.check(address, "ipv4");
    if (net.isIPv6(address)) return !globalIpv6.check(address, "ipv6") || blockedIpv6.check(address, "ipv6");
    return true;
}

/* الفحص يربط المصدر بالنطاق الصحيح ولا يقبل URL credentials أو منفذًا آخر. */
function parseCalendarUrl(rawUrl, expectedSource) {
    if (!["airbnb", "booking"].includes(expectedSource) || typeof rawUrl !== "string" || rawUrl.length > 2048) {
        throw new Error("مصدر أو رابط التقويم غير صحيح.");
    }
    let parsed;
    try { parsed = new URL(rawUrl); }
    catch { throw new Error("رابط التقويم غير صحيح."); }
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash ||
        (parsed.port && parsed.port !== "443")) throw new Error("استخدم رابط https:// رسميًا بدون بيانات دخول أو منفذ مخصص.");
    const hostname = parsed.hostname.toLowerCase();
    const expectedHost = expectedSource === "airbnb" ? "airbnb.com" : "booking.com";
    if (!(hostname === expectedHost || hostname.endsWith(`.${expectedHost}`))) {
        throw new Error(`الرابط يجب أن يكون رابط تقويم ${expectedSource === "airbnb" ? "Airbnb" : "Booking.com"} رسميًا.`);
    }
    return parsed;
}

async function resolveCalendarUrl(rawUrl, source, lookup = dns.lookup.bind(dns)) {
    const parsed = parseCalendarUrl(rawUrl, source);
    let addresses;
    try { addresses = await lookup(parsed.hostname, { all: true }); }
    catch { throw new Error("تعذر التحقق من خادم التقويم."); }
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
        throw new Error("تعذر التحقق من عنوان خادم التقويم.");
    }
    return { parsed, addresses };
}

async function validateCalendarUrl(rawUrl, source) {
    return (await resolveCalendarUrl(rawUrl, source)).parsed.toString();
}

/* تثبيت عنوان DNS المفحوص في الاتصال نفسه، مع إبقاء hostname للتحقق من TLS. */
function downloadCalendar(resolved, signal) {
    return new Promise((resolve, reject) => {
        const { parsed, addresses } = resolved;
        const selected = addresses[0];
        const req = https.request(parsed, {
            method: "GET", agent: false, signal,
            headers: { "User-Agent": "HIJAZI-Apartments-PMS/1.0", "Accept-Encoding": "identity" },
            lookup(hostname, options, callback) {
                if (hostname !== parsed.hostname) return callback(new Error("Unexpected calendar hostname"));
                if (options?.all) return callback(null, [selected]);
                callback(null, selected.address, selected.family);
            }
        }, response => {
            if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
                const location = response.headers.location;
                response.destroy();
                return resolve({ location, status: response.statusCode });
            }
            if (response.statusCode < 200 || response.statusCode >= 300) {
                response.destroy();
                return reject(new Error(`فشل تنزيل التقويم (HTTP ${response.statusCode}).`));
            }
            if (Number(response.headers["content-length"]) > MAX_CALENDAR_BYTES ||
                (response.headers["content-encoding"] && response.headers["content-encoding"] !== "identity")) {
                response.destroy();
                return reject(new Error("حجم أو ترميز ملف التقويم غير مسموح."));
            }
            readLimitedCalendarBody(response).then(text => resolve({ text }), reject);
        });
        req.on("error", reject);
        req.end();
    });
}

/* الحد أثناء البث؛ لا نحمّل ملفًا ضخمًا في الذاكرة ثم نرفضه. */
async function readLimitedCalendarBody(stream, maxBytes = MAX_CALENDAR_BYTES) {
    const chunks = [];
    let bytes = 0;
    for await (const chunk of stream) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        bytes += buffer.length;
        if (bytes > maxBytes) {
            stream.destroy();
            throw new Error("ملف التقويم أكبر من الحجم المسموح.");
        }
        chunks.push(buffer);
    }
    return Buffer.concat(chunks, bytes).toString("utf8");
}

async function fetchCalendarEvents(url, source) {
    const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
    const timedOut = new Promise((resolve, reject) => {
        signal.addEventListener("abort", () => reject(new Error("انتهت مهلة الاتصال بالتقويم.")), { once: true });
    });
    const job = async () => {
        let currentUrl = url;
        let text;
        for (let redirects = 0; redirects <= 3; redirects += 1) {
            const resolved = await resolveCalendarUrl(currentUrl, source);
            if (signal.aborted) throw new Error("انتهت مهلة الاتصال بالتقويم.");
            const result = await downloadCalendar(resolved, signal);
            if (result.text !== undefined) { text = result.text; break; }
            if (!result.location || redirects === 3) throw new Error("تحويل رابط التقويم غير صالح أو متكرر.");
            currentUrl = new URL(result.location, resolved.parsed).toString();
        }
        if (!text?.includes("BEGIN:VCALENDAR") || !text.includes("END:VCALENDAR")) {
            throw new Error("الرابط لم يرجع ملف iCal صالحًا.");
        }
        let parsed;
        try { parsed = ical.sync.parseICS(text); }
        catch { throw new Error("تعذر قراءة صيغة ملف التقويم."); }
        return Object.values(parsed)
            .filter(entry => entry && entry.type === "VEVENT" && entry.start instanceof Date && entry.end instanceof Date &&
                Number.isFinite(entry.start.getTime()) && Number.isFinite(entry.end.getTime()))
            .map(entry => ({
                externalUid: String(entry.uid || `${entry.start.toISOString()}-${entry.end.toISOString()}`),
                checkIn: new Date(entry.start), checkOut: new Date(entry.end),
                summary: String(entry.summary || "حجز مستورد").slice(0, 150),
                sourceReference: String(entry.uid || "").slice(0, 250)
            }))
            .filter(event => event.checkOut > event.checkIn);
    };
    try { return await Promise.race([job(), timedOut]); }
    catch (error) {
        if (signal.aborted) throw new Error("انتهت مهلة الاتصال بالتقويم.");
        // رسائل Node الداخلية قد تحتوي اسم الخادم أو مسار الرابط السري.
        if (/^[A-Za-z]/.test(error.message || "")) throw new Error("تعذر الاتصال الآمن بخادم التقويم.");
        throw error;
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
    isPrivateAddress,
    parseCalendarUrl,
    resolveCalendarUrl,
    readLimitedCalendarBody,
    buildIcalFeed,
    fetchCalendarEvents,
    validateCalendarUrl
};
