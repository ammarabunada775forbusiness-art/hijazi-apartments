const express = require("express");
const crypto = require("node:crypto");
const mongoose = require("mongoose");
const cors = require("cors");
const Booking = require("./models/Booking");
const Apartment = require("./models/Apartment");
const ActivityLog = require("./models/ActivityLog");
const basicAuth = require("basic-auth");
const { Resend } = require("resend");
const { buildIcalFeed, fetchCalendarEvents, validateCalendarUrl } = require("./services/ical");
const {
    createRateLimiter,
    rejectDangerousBodyKeys,
    requireJsonContentType,
    securityHeaders,
    timingSafeEqualStrings,
    requestPathForLog,
    validatePublicBookingShape
} = require("./services/security");
require("dotenv").config();

const { createTurnstileProtection } = require("./services/turnstile");
const turnstileProtection = createTurnstileProtection();
const app = express();

/* إخفاء اسم Express من HTTP Headers */
app.disable("x-powered-by");
/* Render يعمل خلف Proxy؛ هذا يجعل req.ip يرجّع IP الحقيقي */
app.set("trust proxy", 1);

/* =========================================================
   إعدادات CORS وقراءة JSON
========================================================= */
const configuredOrigins = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const defaultOrigins = [
    "https://hijazi-apartments.com",
    "https://www.hijazi-apartments.com"
];

/* السماح بالتطوير المحلي فقط عند تفعيله صراحةً */
if (process.env.ALLOW_LOCAL_ORIGINS === "true") {
    defaultOrigins.push(
        "http://localhost:5500",
        "http://127.0.0.1:5500"
    );
}

/* قبول النطاقات المسجلة فقط */
function isAllowedOrigin(origin) {
    if (!origin) return true;

    return [
        ...defaultOrigins,
        ...configuredOrigins
    ].includes(origin);
}

/* حد عام لكل مستخدم: 600 طلب كل 15 دقيقة */
const globalApiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 600,
    message:
        "طلبات كثيرة خلال وقت قصير. حاول مرة أخرى بعد قليل."
});

/* حد خاص بلوحة الإدارة */
const adminApiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message:
        "تم تجاوز الحد المؤقت لطلبات لوحة الإدارة. حاول بعد قليل."
});

/* منع إرسال حجوزات وهمية كثيرة */
const publicBookingLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message:
        "تم إرسال طلبات حجز كثيرة من هذا الاتصال. حاول لاحقًا أو تواصل معنا مباشرة."
});

/* إضافة Security Headers */
app.use(securityHeaders);

/* رفض Origin غير المعتمد داخل الخادم أيضًا، قبل أي تعديل للبيانات. */
app.use((req, res, next) => {
    if (!isAllowedOrigin(req.get("Origin"))) {
        return res.status(403).json({ success: false, message: "مصدر الطلب غير مسموح." });
    }
    next();
});

/* إعداد CORS */
app.use(cors({
    origin(origin, callback) {
        callback(
            null,
            isAllowedOrigin(origin)
        );
    },

    methods: [
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE"
    ],

    allowedHeaders: [
        "Content-Type",
        "Authorization"
    ]
}));

/* تطبيق الحد العام للطلبات */
app.use(globalApiLimiter);

/* قبول JSON فقط في طلبات الكتابة */
app.use(requireJsonContentType);

/* رفض JSON أكبر من 50KB */
app.use(express.json({
    limit: "50kb",
    strict: true
}));

/* فحص جسم الطلب من MongoDB Injection */
app.use(rejectDangerousBodyKeys);

/* حد منفصل لطلبات الأدمن */
app.use("/admin", adminApiLimiter);

app.use((req, res, next) => {
    console.log(`[REQUEST] ${new Date().toISOString()} ${req.method} ${requestPathForLog(req)}`);
    next();
});
/* =========================================================
   الاتصال بقاعدة البيانات
========================================================= */
if (require.main === module) mongoose
    .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 15000,
        family: 4
    })
    .then(async () => {
        console.log("MongoDB Connected Successfully");
        await ensureDefaultApartments();
        await migrateApartmentDisplayLabels();
        runScheduledCalendarSync().catch((error) => {
            console.log("INITIAL CALENDAR SYNC ERROR:", error.message);
        });
    })
    .catch((err) => console.log("MongoDB Connection Error:", err.name || "Error"));

/* =========================================================
   إعداد Resend لإرسال الإيميلات
========================================================= */
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

/* =========================================================
   مسار الجذر للتجربة
========================================================= */
app.get("/", (req, res) => {
    res.send("HIJAZI Apartments API Running");
});

app.get("/security/public-config", turnstileProtection.publicConfig);

app.get("/health", (req, res) => {
    res.status(200).json({
        success: true,
        status: "ok",
        service: "HIJAZI Apartments API",
        time: new Date().toISOString()
    });
});

app.get("/health/db", async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            return res.status(503).json({
                success: false,
                status: "db_disconnected",
                connectionState: mongoose.connection.readyState
            });
        }

        await mongoose.connection.db.admin().ping();

        res.status(200).json({
            success: true,
            status: "db_ok",
            connectionState: mongoose.connection.readyState,
            time: new Date().toISOString()
        });
    } catch (error) {
        console.log(
            "DATABASE HEALTH CHECK ERROR:",
            error.message
        );

        res.status(500).json({
            success: false,
            status: "db_error"
        });
    }
});

/* =========================================================
   حماية مسارات الأدمن
========================================================= */
/* =========================================================
   حماية الأدمن من محاولات تسجيل الدخول المتكررة
========================================================= */
const ADMIN_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const ADMIN_MAX_FAILED_ATTEMPTS = 8;
const adminFailedAttempts = new Map();

function getAdminClientKey(req) {
    return req.ip || req.socket.remoteAddress || "unknown";
}

function requireAdmin(req, res, next) {
    const clientKey = getAdminClientKey(req);
    const now = Date.now();
    const previousAttempt = adminFailedAttempts.get(clientKey);

    if (
        previousAttempt?.blockedUntil &&
        previousAttempt.blockedUntil > now
    ) {
        const retryAfterSeconds = Math.ceil(
            (previousAttempt.blockedUntil - now) / 1000
        );

        res.set("Retry-After", String(retryAfterSeconds));

        return res.status(429).json({
            success: false,
            message:
                "تم إيقاف محاولات الدخول مؤقتًا بسبب تكرار البيانات الخاطئة. حاول بعد 15 دقيقة."
        });
    }

    const user = basicAuth(req);

    const configuredAdminUser = String(
        process.env.ADMIN_USER || ""
    );

    const configuredAdminPass = String(
        process.env.ADMIN_PASS || ""
    );

    const ok =
        user &&
        configuredAdminUser &&
        configuredAdminPass &&
        // & ينفذ المقارنتين؛ لا نتوقف مبكرًا بسبب اسم مستخدم غير مطابق.
        (timingSafeEqualStrings(user.name, configuredAdminUser) &
            timingSafeEqualStrings(user.pass, configuredAdminPass));

    if (!ok) {
        const attemptExpired =
            !previousAttempt ||
            now - previousAttempt.firstFailedAt >
            ADMIN_LOGIN_WINDOW_MS;

        const nextAttempt = attemptExpired
            ? {
                count: 1,
                firstFailedAt: now,
                blockedUntil: 0
            }
            : {
                ...previousAttempt,
                count: previousAttempt.count + 1
            };

        if (
            nextAttempt.count >=
            ADMIN_MAX_FAILED_ATTEMPTS
        ) {
            nextAttempt.blockedUntil =
                now + ADMIN_LOGIN_WINDOW_MS;
        }

        adminFailedAttempts.set(
            clientKey,
            nextAttempt
        );

        res.set(
            "WWW-Authenticate",
            'Basic realm="HIJAZI Admin"'
        );

        return res.status(401).json({
            success: false,
            message: "اسم المستخدم أو كلمة المرور غير صحيحة."
        });
    }

    adminFailedAttempts.delete(clientKey);
    req.adminUser = user.name;
    next();
}

/* تنظيف سجلات محاولات الدخول القديمة من الذاكرة */
const adminAttemptCleanupTimer = setInterval(() => {
    const now = Date.now();

    for (
        const [clientKey, attempt]
        of adminFailedAttempts.entries()
    ) {
        const expired =
            (
                !attempt.blockedUntil ||
                attempt.blockedUntil <= now
            ) &&
            now - attempt.firstFailedAt >
            ADMIN_LOGIN_WINDOW_MS;

        if (expired) {
            adminFailedAttempts.delete(clientKey);
        }
    }
}, ADMIN_LOGIN_WINDOW_MS);

adminAttemptCleanupTimer.unref();

/* يسجل العملية، ولا يعطل الطلب الأساسي إذا تعذر حفظ السجل. */
async function recordAdminActivity(req, entry) {
    try {
        await ActivityLog.create({
            category: entry.category || "system",
            action: String(entry.action || "system.action").slice(0, 80),
            description: String(entry.description || "عملية إدارية").slice(0, 500),
            targetType: entry.targetType || entry.category || "system",
            targetId: String(entry.targetId || "").slice(0, 150),
            apartmentId: Number.isFinite(Number(entry.apartmentId))
                ? Number(entry.apartmentId)
                : null,
            source: String(entry.source || "").slice(0, 30),
            adminUser: String(req.adminUser || process.env.ADMIN_USER || "admin").slice(0, 100),
            details: entry.details || {}
        });
    } catch (error) {
        console.log("ADMIN ACTIVITY LOG ERROR:", error.message);
    }
}

app.get("/admin/db-test", requireAdmin, async (req, res) => {
    try {
        const stateMap = {
            0: "disconnected",
            1: "connected",
            2: "connecting",
            3: "disconnecting"
        };

        if (!process.env.MONGO_URI) {
            return res.status(500).json({
                success: false,
                message: "MONGO_URI is missing in Render Environment"
            });
        }

        if (mongoose.connection.readyState !== 1) {
            await mongoose.connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 15000,
                family: 4
            });
        }

        await mongoose.connection.db.admin().ping();

        const bookingsCount = await Booking.countDocuments();

        res.json({
            success: true,
            message: "MongoDB connection is working ✅",
            connectionState: stateMap[mongoose.connection.readyState],
            bookingsCount
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "MongoDB connection failed ❌",
            connectionState: mongoose.connection.readyState,
            errorName: error.name,
            errorMessage: error.message
        });
    }
});

/* =========================================================
   تنسيق التاريخ بشكل YYYY-MM-DD
========================================================= */
function formatDate(d) {
    const x = new Date(d);
    if (isNaN(x.getTime())) return "";
    return x.toISOString().slice(0, 10);
}

/* =========================================================
   حساب عدد الليالي
========================================================= */
function calculateNights(checkIn, checkOut) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = end - start;
    return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

/* =========================================================
   تحويل الرموز الخطرة إلى نص آمن داخل HTML
========================================================= */
function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================================================
   قبول التاريخ بصيغة YYYY-MM-DD فقط
========================================================= */
function parseDateOnly(value) {
    const text = String(value || "");

    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
        return null;
    }

    const date = new Date(
        `${text}T00:00:00.000Z`
    );

    if (
        Number.isNaN(date.getTime()) ||
        formatDate(date) !== text
    ) {
        return null;
    }

    return date;
}

/* =========================================================
   تنظيف الحقول النصية ومنع الأسطر ومحارف التحكم
========================================================= */
function normalizeSingleLine(value, maxLength) {
    return String(value || "")
        .replace(
            /[\u0000-\u001f\u007f]/g,
            " "
        )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength);
}

/* =========================================================
   أسعار التحويل المعتمدة داخل السيرفر
========================================================= */
const PUBLIC_CURRENCY_RATES = Object.freeze({
    JOD: 1,
    USD: 0.71,
    SAR: 2.66
});

/* =========================================================
   تجهيز الشقق الست الحالية أول مرة بدون تغيير بياناتها لاحقًا
========================================================= */
const DEFAULT_APARTMENTS = [
    { apartmentId: 1, label: "شقة رقم 104", nightlyPriceJod: 150 },
    { apartmentId: 2, label: "شقة رقم 106", nightlyPriceJod: 200 },
    { apartmentId: 3, label: "شقة رقم 204", nightlyPriceJod: 150 },
    { apartmentId: 4, label: "شقة رقم 105", nightlyPriceJod: 200 },
    { apartmentId: 5, label: "شقة رقم 207", nightlyPriceJod: 150 },
    { apartmentId: 6, label: "شقة رقم 305", nightlyPriceJod: 200 }
];

function defaultApartmentLabel(apartmentId, fallback = "") {
    return DEFAULT_APARTMENTS.find(
        apartment => apartment.apartmentId === Number(apartmentId)
    )?.label || fallback || `شقة رقم ${apartmentId}`;
}

/* =========================================================
   تجهيز الشقق الأساسية وترحيل أسعارها القديمة تلقائيًا
========================================================= */
async function ensureDefaultApartments() {
    await Apartment.bulkWrite(
        DEFAULT_APARTMENTS.map(apartment => ({
            updateOne: {
                filter: {
                    apartmentId: apartment.apartmentId
                },

                update: {
                    $setOnInsert: {
                        apartmentId: apartment.apartmentId,
                        label: apartment.label,
                        active: true,
                        nightlyPriceJod: apartment.nightlyPriceJod
                    }
                },

                upsert: true
            }
        }))
    );

    /* إضافة السعر للشقق الموجودة مسبقًا بدون تغيير أي سعر محفوظ */
    await Apartment.bulkWrite(
        DEFAULT_APARTMENTS.map(apartment => ({
            updateOne: {
                filter: {
                    apartmentId: apartment.apartmentId,

                    $or: [
                        { nightlyPriceJod: { $exists: false } },
                        { nightlyPriceJod: null }
                    ]
                },

                update: {
                    $set: {
                        nightlyPriceJod: apartment.nightlyPriceJod
                    }
                }
            }
        }))
    );
}

/* =========================================================
   ترحيل أسماء الشقق الحالية والحجوزات القديمة عند النشر

   لا نغيّر apartmentId لأنه مفتاح تقني للصور والتقويم والروابط.
========================================================= */
async function migrateApartmentDisplayLabels() {
    await Apartment.bulkWrite(
        DEFAULT_APARTMENTS.map(apartment => ({
            updateOne: {
                filter: { apartmentId: apartment.apartmentId },
                update: { $set: { label: apartment.label } }
            }
        })),
        { ordered: false }
    );

    await Booking.bulkWrite(
        DEFAULT_APARTMENTS.map(apartment => ({
            updateMany: {
                filter: { apartmentId: apartment.apartmentId },
                update: { $set: { apartmentLabel: apartment.label } }
            }
        })),
        { ordered: false }
    );
}

/* =========================================================
   جلب الشقق الفعالة مع fallback يحافظ على عمل الموقع القديم
========================================================= */
async function getActiveApartments() {
    await ensureDefaultApartments();
    return Apartment.find({ active: true }).sort({ apartmentId: 1 });
}

/* =========================================================
   شرط موحّد للحجوزات التي تغلق التواريخ
========================================================= */
const ACTIVE_BOOKING_FILTER = { status: { $ne: "cancelled" } };

/* =========================================================
   رسالة نصية مختصرة للحجز
========================================================= */
function bookingText(booking) {
    const nights = calculateNights(booking.checkIn, booking.checkOut);
    const longStayText = nights >= 30 ? "\nملاحظة: هذا الحجز مؤهل لخصم الإقامة الطويلة." : "";

    return `
HIJAZI Apartments - حجز جديد

الشقة: ${booking.apartmentLabel} (ID: ${booking.apartmentId})
الاسم: ${booking.fullName}
الهاتف: ${booking.phone}
البريد: ${booking.email}

الدخول: ${formatDate(booking.checkIn)}
الخروج: ${formatDate(booking.checkOut)}
عدد الليالي: ${nights}
بالغين: ${booking.adults}
أطفال: ${booking.children}

العملة: ${booking.currency}
السعر: ${booking.totalPriceText || booking.totalPrice}
الملاحظات: ${booking.notes || "لا توجد ملاحظات"}${longStayText}

تم إنشاء الحجز: ${formatDate(booking.createdAt || new Date())}
  `.trim();
}

/* =========================================================
   قالب HTML للإيميل
========================================================= */
function bookingHtml(booking, forCustomer = false) {
    const nights = calculateNights(
        booking.checkIn,
        booking.checkOut
    );

    const isLong = nights >= 30;

    /* تنظيف كل بيانات العميل قبل إدخالها في HTML */
    const safeApartmentLabel =
        escapeHtml(booking.apartmentLabel);

    const safeApartmentId =
        escapeHtml(booking.apartmentId);

    const safeFullName =
        escapeHtml(booking.fullName);

    const safePhone =
        escapeHtml(booking.phone);

    const safeEmail =
        escapeHtml(booking.email);

    const safeAdults =
        escapeHtml(booking.adults);

    const safeChildren =
        escapeHtml(booking.children);

    const safeCurrency =
        escapeHtml(booking.currency);

    const safeTotalPrice = escapeHtml(
        booking.totalPriceText ||
        booking.totalPrice
    );

    const title = forCustomer
        ? "تم استلام طلب الحجز ✅"
        : "حجز جديد ✅";

    const msg = forCustomer
        ? "شكراً لك! تم استلام طلب الحجز بنجاح، وسنتواصل معك قريباً لتأكيد التفاصيل."
        : "وصل حجز جديد على الموقع.";

    const longStayBox = isLong
        ? `
            <div style="margin-top:14px;padding:12px;border-radius:10px;background:#fff7e7;border:1px solid #e9c46a;color:#6b4f00">
                <strong>خصم ذهبي للإقامة أكثر من شهر</strong><br/>
                سوف يتم التواصل مع العميل للحصول على خصم خاص.
            </div>
        `
        : "";

    const notesBox = booking.notes
        ? `
        <p>
            <b>ملاحظات العميل:</b><br/>
            <span style="white-space:pre-line">${escapeHtml(booking.notes)}</span>
        </p>
        `
        : `
        <p>
            <b>ملاحظات العميل:</b>
            لا توجد ملاحظات
        </p>
        `;

    return `
    <div style="font-family:Arial,sans-serif;line-height:1.8">
        <div style="padding:14px 16px;color:#fff;background:linear-gradient(90deg,#c89116,#000);border-radius:10px">
            <h2 style="margin:0">
                ${title} - HIJAZI Apartments
            </h2>
        </div>

        <p style="margin-top:12px">
            ${msg}
        </p>

        <div style="border:1px solid #eee;border-radius:10px;padding:14px">
            <p>
                <b>الشقة:</b>
                ${safeApartmentLabel}
                (ID: ${safeApartmentId})
            </p>

            <p>
                <b>الاسم:</b>
                ${safeFullName}
            </p>

            <p>
                <b>الهاتف:</b>
                ${safePhone}
            </p>

            <p>
                <b>البريد:</b>
                ${safeEmail}
            </p>

            <p>
                <b>الدخول:</b>
                ${formatDate(booking.checkIn)}
            </p>

            <p>
                <b>الخروج:</b>
                ${formatDate(booking.checkOut)}
            </p>

            <p>
                <b>عدد الليالي:</b>
                ${nights}
            </p>

            <p>
                <b>الضيوف:</b>
                بالغين ${safeAdults}
                + أطفال ${safeChildren}
            </p>

            <p>
                <b>السعر:</b>
                ${safeTotalPrice}
                (${safeCurrency})
            </p>

            ${notesBox}
            ${longStayBox}
        </div>

        <p style="color:#666;font-size:13px;margin-top:10px">
            الشميساني - عمّان، الأردن<br/>
            HIJAZI Apartments
        </p>
    </div>
    `;
}

/* =========================================================
   إرسال الإيميلات بعد الحجز
========================================================= */
async function sendBookingEmails(booking) {
    const from = process.env.RESEND_FROM;
    const adminTo = process.env.ADMIN_EMAIL;
    const enableCustomerEmail = process.env.ENABLE_CUSTOMER_EMAIL === "true";

    if (!resend || !from || !adminTo) {
        console.log("Email skipped: missing RESEND_API_KEY / RESEND_FROM / ADMIN_EMAIL");
        return;
    }

    try {
        const adminResult = await resend.emails.send({
            from,
            to: adminTo,
            subject: `حجز جديد ✅ - ${normalizeSingleLine(
                booking.apartmentLabel,
                100
            )} (${formatDate(
                booking.checkIn
            )} → ${formatDate(
                booking.checkOut
            )})`,
            text: bookingText(booking),
            html: bookingHtml(booking, false),
        });

        console.log("Admin email result:", adminResult);
    } catch (e) {
        console.log("Admin email exception:", e.message);
    }

    if (enableCustomerEmail) {
        try {
            const customerResult = await resend.emails.send({
                from,
                to: booking.email,
                subject: "تم استلام طلب حجزك ✅ - HIJAZI Apartments",
                text: `مرحباً ${booking.fullName}\n\nتم استلام طلب حجزك بنجاح.\n${bookingText(booking)}\n\nشكراً لك.`,
                html: bookingHtml(booking, true),
            });

            console.log("Customer email result:", customerResult);
        } catch (e) {
            console.log("Customer email exception:", e.message);
        }
    }
}


/* =========================================================
   إرسال تنبيه عند فشل مزامنة Airbnb أو Booking
   مع منع تكرار نفس التنبيه خلال 6 ساعات
========================================================= */
const syncFailureAlertTimes = new Map();
const SYNC_FAILURE_ALERT_COOLDOWN_MS =
    6 * 60 * 60 * 1000;

async function sendSyncFailureEmail({
    apartmentId,
    source,
    message
}) {
    const from = process.env.RESEND_FROM;
    const adminTo = process.env.ADMIN_EMAIL;

    if (!resend || !from || !adminTo) {
        console.log(
            "Sync failure email skipped: missing email settings"
        );
        return;
    }

    const alertKey = `${apartmentId}:${source}`;
    const lastAlertTime =
        syncFailureAlertTimes.get(alertKey) || 0;

    if (
        Date.now() - lastAlertTime <
        SYNC_FAILURE_ALERT_COOLDOWN_MS
    ) {
        return;
    }

    const sourceTitle =
        source === "airbnb"
            ? "Airbnb"
            : "Booking.com";
    const apartmentLabel = defaultApartmentLabel(apartmentId);

    try {
        await resend.emails.send({
            from,
            to: adminTo,
            subject:
                `فشل مزامنة ${sourceTitle} - ${apartmentLabel}`,
            text:
                `تنبيه من HIJAZI PMS\n\n` +
                `الشقة: ${apartmentLabel}\n` +
                `المنصة: ${sourceTitle}\n` +
                `الخطأ: ${message || "خطأ غير معروف"}\n` +
                `الوقت: ${new Date().toLocaleString(
                    "ar-JO",
                    { timeZone: "Asia/Amman" }
                )}\n\n` +
                `افتح لوحة الإدارة وافحص رابط التقويم.`
        });

        syncFailureAlertTimes.set(
            alertKey,
            Date.now()
        );

        console.log(
            `Sync failure alert sent for apartment=${apartmentId} source=${source}`
        );
    } catch (error) {
        console.log(
            "SYNC FAILURE EMAIL ERROR:",
            error.message
        );
    }
}

/* =========================================================
   جميع أرقام الشقق المعتمدة
========================================================= */
/* =========================================================
   API: فحص الشقق المتاحة
   يرجّع المتاح + المحجوز + فترات الحجز المتعارضة
========================================================= */
app.get("/availability", async (req, res) => {
    try {
        const { checkIn, checkOut } = req.query;

        if (!checkIn || !checkOut) {
            return res.status(400).json({
                success: false,
                message: "checkIn و checkOut مطلوبين",
            });
        }

        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
            return res.status(400).json({
                success: false,
                message: "تواريخ غير صحيحة.",
            });
        }

        if (checkOutDate <= checkInDate) {
            return res.status(400).json({
                success: false,
                message: "تاريخ المغادرة لازم يكون بعد تاريخ الوصول.",
            });
        }

        const apartments = await getActiveApartments();
        const apartmentIds = apartments.map((apartment) => apartment.apartmentId);

        const conflicts = await Booking.find({
            ...ACTIVE_BOOKING_FILTER,
            apartmentId: { $in: apartmentIds },
            checkIn: { $lt: checkOutDate },
            checkOut: { $gt: checkInDate },
        })
            .select("apartmentId apartmentLabel checkIn checkOut")
            .sort({ apartmentId: 1, checkIn: 1 });

        const bookedSet = new Set(conflicts.map((b) => Number(b.apartmentId)));
        const available = apartmentIds.filter((id) => !bookedSet.has(id));

        const bookedRanges = conflicts.map((b) => ({
            apartmentId: Number(b.apartmentId),
            apartmentLabel: defaultApartmentLabel(
                b.apartmentId,
                b.apartmentLabel
            ),
            checkIn: formatDate(b.checkIn),
            checkOut: formatDate(b.checkOut),
        }));

        res.json({
            success: true,
            checkIn: formatDate(checkInDate),
            checkOut: formatDate(checkOutDate),
            availableApartments: available,
            bookedApartments: Array.from(bookedSet),
            bookedRanges,
        });
    } catch (error) {
        console.log("AVAILABILITY ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Error checking availability",
        });
    }
});
/* =========================================================
   API: تقويم الشقق
   إذا أرسلت aptId يرجّع حجوزات شقة محددة
   إذا لم ترسل aptId يرجّع حجوزات كل الشقق بدون بيانات العميل
========================================================= */
app.get("/calendar", async (req, res) => {
    try {
        const aptId = req.query.aptId ? Number(req.query.aptId) : null;

        const filter = aptId
            ? { ...ACTIVE_BOOKING_FILTER, apartmentId: aptId }
            : { ...ACTIVE_BOOKING_FILTER };

        const bookings = await Booking.find(filter)
            .select("apartmentId apartmentLabel checkIn checkOut")
            .sort({ apartmentId: 1, checkIn: 1 });

        res.json({
            success: true,
            scope: aptId ? "single" : "all",
            bookings,
        });
    } catch (error) {
        console.error("CALENDAR ERROR:", error);
        res.status(500).json({
            success: false,
            message:
                "تعذر جلب بيانات التقويم حاليًا."
        });
    }
});
/* =========================================================
   API: جلب الحجوزات العامة
   ملاحظة: هذا المسار لا يرجّع بيانات العميل الخاصة
   يستخدم فقط لعرض فترات الحجز في الموقع
========================================================= */
app.get("/bookings", async (req, res) => {
    try {
        const aptId = req.query.aptId ? Number(req.query.aptId) : null;
        const filter = aptId
            ? { ...ACTIVE_BOOKING_FILTER, apartmentId: aptId }
            : { ...ACTIVE_BOOKING_FILTER };

        const bookings = await Booking.find(filter)
            .select("apartmentId apartmentLabel checkIn checkOut")
            .sort({ apartmentId: 1, checkIn: 1 });

        res.json({
            success: true,
            bookings,
        });
    } catch (error) {
        console.log("GET BOOKINGS ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching bookings",
        });
    }
});

/* =========================================================
   API: إنشاء حجز جديد
   يتحقق من المدخلات ويحسب السعر داخل السيرفر
========================================================= */
app.post(
    "/bookings",
    publicBookingLimiter,
    validatePublicBookingShape,
    turnstileProtection.verify,
    async (req, res) => {
        try {
            const {
                apartmentId,
                fullName,
                email,
                phone,
                checkIn,
                checkOut,
                adults,
                children,
                currency,
                notes
            } = req.body;

            /* تنظيف القيم النصية */
            const normalizedFullName =
                normalizeSingleLine(
                    fullName,
                    150
                );

            const normalizedEmail =
                normalizeSingleLine(
                    email,
                    200
                ).toLowerCase();

            const normalizedPhone =
                normalizeSingleLine(
                    phone,
                    30
                );

            const adultsNumber =
                Number(adults);

            const childrenNumber =
                Number(children || 0);

            const currencyCode =
                String(currency || "JOD")
                    .trim()
                    .toUpperCase();

            /* سجل لا يحتوي بيانات العميل الشخصية */
            console.log(
                "BOOKING REQUEST RECEIVED:",
                {
                    apartmentId,

                    hasFullName:
                        Boolean(
                            normalizedFullName
                        ),

                    hasEmail:
                        Boolean(
                            normalizedEmail
                        ),

                    hasPhone:
                        Boolean(
                            normalizedPhone
                        ),

                    checkIn,
                    checkOut,
                    adults: adultsNumber,
                    children: childrenNumber,
                    currency: currencyCode,
                    hasNotes: Boolean(notes)
                }
            );

            /* التأكد من وجود الحقول المطلوبة */
            if (
                apartmentId === undefined ||
                !normalizedFullName ||
                !normalizedEmail ||
                !normalizedPhone ||
                !checkIn ||
                !checkOut ||
                adults === undefined
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "بيانات ناقصة. تأكد من تعبئة الحقول المطلوبة."
                });
            }

            /* التحقق من الاسم */
            if (
                normalizedFullName.length < 2
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "الاسم المدخل قصير جدًا."
                });
            }

            /* التحقق من البريد */
            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
                    normalizedEmail
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "البريد الإلكتروني غير صحيح."
                });
            }

            /* التحقق من رقم الهاتف */
            if (
                !/^[\p{N}+\-().\s]{6,30}$/u.test(
                    normalizedPhone
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "رقم الهاتف غير صحيح."
                });
            }

            /* التحقق من عدد البالغين */
            if (
                !Number.isInteger(
                    adultsNumber
                ) ||
                adultsNumber < 1 ||
                adultsNumber > 20
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "عدد البالغين غير صحيح."
                });
            }

            /* التحقق من عدد الأطفال */
            if (
                !Number.isInteger(
                    childrenNumber
                ) ||
                childrenNumber < 0 ||
                childrenNumber > 20
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "عدد الأطفال غير صحيح."
                });
            }

            /* قبول العملات المعتمدة فقط */
            if (
                !Object.hasOwn(
                    PUBLIC_CURRENCY_RATES,
                    currencyCode
                )
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "العملة المختارة غير مدعومة."
                });
            }

            /* التحقق الصارم من التواريخ */
            const checkInDate =
                parseDateOnly(checkIn);

            const checkOutDate =
                parseDateOnly(checkOut);

            if (
                !checkInDate ||
                !checkOutDate
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "تواريخ غير صحيحة."
                });
            }

            if (
                checkOutDate <= checkInDate
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "تاريخ المغادرة لازم يكون بعد تاريخ الوصول."
                });
            }

            const nights = calculateNights(
                checkInDate,
                checkOutDate
            );

            const today = parseDateOnly(
                new Date()
                    .toISOString()
                    .slice(0, 10)
            );

            /* منع الحجز بتاريخ قديم */
            if (checkInDate < today) {
                return res.status(400).json({
                    success: false,
                    message:
                        "تاريخ الوصول لا يمكن أن يكون في الماضي."
                });
            }

            /* منع إدخال مدد غير منطقية */
            if (nights > 730) {
                return res.status(400).json({
                    success: false,
                    message:
                        "مدة الحجز أطول من الحد المسموح."
                });
            }

            await ensureDefaultApartments();

            /* أخذ بيانات الشقة والسعر من MongoDB */
            const apartment =
                await Apartment.findOne({
                    apartmentId:
                        Number(apartmentId),

                    active: true
                });

            if (!apartment) {
                return res.status(400).json({
                    success: false,
                    message:
                        "الشقة المختارة غير موجودة أو غير متاحة للحجز."
                });
            }

            /* فحص تعارض التواريخ */
            const conflict =
                await Booking.findOne({
                    ...ACTIVE_BOOKING_FILTER,

                    apartmentId:
                        Number(apartmentId),

                    checkIn: {
                        $lt: checkOutDate
                    },

                    checkOut: {
                        $gt: checkInDate
                    }
                });

            if (conflict) {
                return res.status(409).json({
                    success: false,

                    message:
                        `❌ هذه الشقة محجوزة من ${formatDate(
                            conflict.checkIn
                        )} إلى ${formatDate(
                            conflict.checkOut
                        )}. اختر تاريخًا آخر.`
                });
            }

            /*
             * لا نثق بالسعر القادم من المتصفح.
             * السيرفر يحسبه من سعر الشقة المخزن.
             */
            const calculatedTotal = Number(
                (
                    apartment.nightlyPriceJod *
                    nights *
                    PUBLIC_CURRENCY_RATES[
                    currencyCode
                    ]
                ).toFixed(2)
            );

            const booking = new Booking({
                apartmentId:
                    Number(apartmentId),

                apartmentLabel:
                    apartment.label,

                fullName:
                    normalizedFullName,

                email:
                    normalizedEmail,

                phone:
                    normalizedPhone,

                checkIn:
                    checkInDate,

                checkOut:
                    checkOutDate,

                adults:
                    adultsNumber,

                children:
                    childrenNumber,

                currency:
                    currencyCode,

                totalPrice:
                    calculatedTotal,

                totalPriceText:
                    `${calculatedTotal.toFixed(
                        2
                    )} ${currencyCode}`,

                notes: notes
                    ? String(notes)
                        .replace(/\u0000/g, "")
                        .trim()
                        .slice(0, 1000)
                    : "",

                stayType:
                    nights >= 30
                        ? "long"
                        : "normal",

                source: "website",
                status: "pending"
            });

            await booking.save();

            console.log(
                "BOOKING SAVED SUCCESSFULLY:",
                {
                    id: booking._id,

                    apartmentId:
                        booking.apartmentId,

                    checkIn:
                        formatDate(
                            booking.checkIn
                        ),

                    checkOut:
                        formatDate(
                            booking.checkOut
                        )
                }
            );

            sendBookingEmails(
                booking
            ).catch((error) => {
                console.log(
                    "SEND EMAILS ERROR:",
                    error.message
                );
            });

            res.json({
                success: true,
                message:
                    "✅ تم حفظ الحجز بنجاح"
            });
        } catch (error) {
            console.log(
                "SAVE BOOKING ERROR:",
                error.name || "Error"
            );

            res.status(500).json({
                success: false,
                message:
                    "تعذر حفظ الحجز حاليًا. حاول مرة أخرى."
            });
        }
    }
);

/* =========================================================
   مزامنة تقويم خارجي لشقة واحدة ومصدر واحد
========================================================= */
async function syncApartmentCalendar(apartment, source) {
    const connection = apartment.calendars[source];

    if (!connection || !connection.enabled || !connection.url) {
        return { source, status: "skipped", imported: 0, message: "الرابط غير مفعّل." };
    }

    try {
        const events = await fetchCalendarEvents(connection.url, source);
        const syncedAt = new Date();
        const externalUids = [];

        for (const event of events) {
            externalUids.push(event.externalUid);

            await Booking.findOneAndUpdate(
                {
                    apartmentId: apartment.apartmentId,
                    source,
                    externalUid: event.externalUid
                },
                {
                    $set: {
                        apartmentLabel: apartment.label,
                        checkIn: event.checkIn,
                        checkOut: event.checkOut,
                        status: "confirmed",
                        sourceReference: event.sourceReference,
                        lastSyncedAt: syncedAt
                    },
                    $setOnInsert: {
                        fullName: source === "airbnb" ? "حجز Airbnb" : "حجز Booking.com",
                        email: "",
                        phone: "",
                        adults: 0,
                        children: 0,
                        currency: "JOD",
                        totalPrice: 0,
                        totalPriceText: "",
                        notes: event.summary,
                        stayType: calculateNights(event.checkIn, event.checkOut) >= 30 ? "long" : "normal"
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const missingFilter = {
            apartmentId: apartment.apartmentId,
            source,
            externalUid: { $ne: "" },
            checkOut: { $gte: today },
            status: { $ne: "cancelled" }
        };

        if (externalUids.length) {
            missingFilter.externalUid = { $nin: externalUids };
        }

        await Booking.updateMany(missingFilter, {
            $set: { status: "cancelled", lastSyncedAt: syncedAt }
        });

        connection.lastSyncedAt = syncedAt;
        connection.lastSyncStatus = "success";
        connection.lastSyncMessage = `تمت قراءة ${events.length} فترة حجز.`;
        await apartment.save();

        return {
            source,
            status: "success",
            imported: events.length,
            message: connection.lastSyncMessage
        };
    } catch (error) {
        connection.lastSyncedAt = new Date();
        connection.lastSyncStatus = "error";
        connection.lastSyncMessage = String(error.message || "فشل مزامنة التقويم.").slice(0, 300);
        await apartment.save();
        throw error;
    }
}

/* =========================================================
   API عام: تصدير تقويم HIJAZI إلى منصة محددة
   نستثني حجوزات المنصة نفسها لتقليل الدوران والتكرار
========================================================= */
app.get("/ical/:apartmentId/:token/:target", async (req, res) => {
    try {
        const apartmentId = Number(req.params.apartmentId);
        const target = String(req.params.target).replace(/\.ics$/i, "");

        if (!["airbnb", "booking"].includes(target)) {
            return res.status(404).send("Calendar not found");
        }

        const apartment = await Apartment.findOne({
            apartmentId,
            calendarToken: req.params.token,
            active: true
        });

        if (!apartment) {
            return res.status(404).send("Calendar not found");
        }

        const bookings = await Booking.find({
            ...ACTIVE_BOOKING_FILTER,
            apartmentId,
            source: { $ne: target }
        }).sort({ checkIn: 1 });

        const feed = buildIcalFeed(apartment, bookings, target);
        res.set({
            "Content-Type": "text/calendar; charset=utf-8",
            "Content-Disposition": `inline; filename="hijazi-apartment-${apartmentId}-${target}.ics"`,
            "Cache-Control": "no-store"
        });
        res.send(feed);
    } catch (error) {
        console.log("ICAL EXPORT ERROR:", error);
        res.status(500).send("Calendar export error");
    }
});

/* =========================================================
   API عام: أسعار الشقق الفعالة للموقع
   لا يعرض روابط التقويم أو الرموز السرية
========================================================= */
app.get("/apartments/public", async (req, res) => {
    try {
        await ensureDefaultApartments();

        const apartments = await Apartment.find({
            active: true
        })
            .select("apartmentId label nightlyPriceJod")
            .sort({ apartmentId: 1 });

        res.json({
            success: true,
            apartments: apartments.map(apartment => ({
                apartmentId: Number(apartment.apartmentId),
                label: defaultApartmentLabel(
                    apartment.apartmentId,
                    apartment.label
                ),
                nightlyPriceJod: Number(apartment.nightlyPriceJod)
            }))
        });
    } catch (error) {
        console.log("PUBLIC APARTMENTS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "تعذر جلب أسعار الشقق."
        });
    }
});

/* =========================================================
   API: جلب الشقق وإعدادات الربط وروابط التصدير للأدمن
========================================================= */
app.get("/admin/apartments", requireAdmin, async (req, res) => {
    try {
        await ensureDefaultApartments();
        const apartments = await Apartment.find()
            .select("+calendarToken")
            .sort({ apartmentId: 1 });
        const apiBase = String(process.env.PUBLIC_API_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");

        res.json({
            success: true,
            apartments: apartments.map((apartment) => ({
                ...apartment.toObject(),
                exportUrls: {
                    airbnb: `${apiBase}/ical/${apartment.apartmentId}/${apartment.calendarToken}/airbnb.ics`,
                    booking: `${apiBase}/ical/${apartment.apartmentId}/${apartment.calendarToken}/booking.ics`
                }
            }))
        });
    } catch (error) {
        console.log("ADMIN GET APARTMENTS ERROR:", error);
        res.status(500).json({ success: false, message: "تعذر جلب إعدادات الشقق." });
    }
});

/* =========================================================
   API: جلب آخر سجل عمليات الأدمن
========================================================= */
app.get("/admin/activity", requireAdmin, async (req, res) => {
    try {
        const requestedLimit = Number(req.query.limit || 250);
        const limit = Number.isFinite(requestedLimit)
            ? Math.min(500, Math.max(20, Math.floor(requestedLimit)))
            : 250;
        const allowedCategories = ["booking", "apartment", "sync", "system"];
        const category = String(req.query.category || "").trim();
        const filter = allowedCategories.includes(category) ? { category } : {};

        const activities = await ActivityLog.find(filter)
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        res.json({ success: true, activities, limit });
    } catch (error) {
        console.log("ADMIN GET ACTIVITY ERROR:", error);
        res.status(500).json({ success: false, message: "تعذر جلب سجل العمليات." });
    }
});

/* =========================================================
   API: إضافة شقة جديدة للنظام
========================================================= */
app.post("/admin/apartments", requireAdmin, async (req, res) => {
    try {
        const lastApartment = await Apartment.findOne()
            .sort({ apartmentId: -1 });

        const requestedId = Number(req.body.apartmentId);

        const apartmentId =
            Number.isInteger(requestedId) && requestedId > 0
                ? requestedId
                : (lastApartment?.apartmentId || 0) + 1;

        const nightlyPriceJod = Number(req.body.nightlyPriceJod);

        if (
            !Number.isFinite(nightlyPriceJod) ||
            nightlyPriceJod < 0
        ) {
            return res.status(400).json({
                success: false,
                message: "سعر الليلة غير صحيح."
            });
        }

        const apartment = await Apartment.create({
            apartmentId,

            label: String(
                req.body.label || `شقة رقم ${apartmentId}`
            )
                .trim()
                .slice(0, 100),

            nightlyPriceJod,
            active: req.body.active !== false
        });

        await recordAdminActivity(req, {
            category: "apartment",
            action: "apartment.created",
            targetType: "apartment",
            targetId: apartment._id,
            apartmentId: apartment.apartmentId,
            description: `تمت إضافة ${apartment.label} إلى PMS.`,
            details: { nightlyPriceJod: apartment.nightlyPriceJod, active: apartment.active }
        });

        res.status(201).json({
            success: true,
            apartment
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "رقم الشقة مستخدم مسبقًا."
            });
        }

        console.log("ADMIN CREATE APARTMENT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "تعذر إضافة الشقة."
        });
    }
});

/* =========================================================
   API: تعديل اسم الشقة وحالتها وروابط تقاويمها
========================================================= */
/* إبطال روابط التصدير القديمة بإجراء صريح من الأدمن، ثم نسخ الروابط الجديدة للمنصات. */
app.post("/admin/apartments/:id/rotate-calendar-token", requireAdmin, async (req, res) => {
    if (!/^[a-f0-9]{24}$/i.test(req.params.id) || req.body?.confirm !== true) {
        return res.status(400).json({ success: false, message: "تأكد من الشقة ووافق على استبدال روابط التصدير." });
    }
    try {
        const apartment = await Apartment.findByIdAndUpdate(req.params.id, {
            $set: { calendarToken: crypto.randomBytes(24).toString("hex") }
        }, { new: true, runValidators: true });
        if (!apartment) return res.status(404).json({ success: false, message: "الشقة غير موجودة." });
        await recordAdminActivity(req, {
            category: "apartment", action: "apartment.calendar_token_rotated", targetType: "apartment",
            targetId: apartment._id, apartmentId: apartment.apartmentId,
            description: `تم تجديد روابط تصدير التقويم لـ${defaultApartmentLabel(apartment.apartmentId, apartment.label)}.`
        });
        return res.json({ success: true, message: "تم تجديد الروابط. حدّث رابط HIJAZI في Airbnb وBooking.com." });
    } catch {
        return res.status(500).json({ success: false, message: "تعذر تجديد روابط التقويم." });
    }
});

app.put("/admin/apartments/:id", requireAdmin, async (req, res) => {
    try {
        const apartment = await Apartment.findById(req.params.id);
        if (!apartment) {
            return res.status(404).json({ success: false, message: "الشقة غير موجودة." });
        }

        const previousApartment = {
            label: apartment.label,
            active: apartment.active,
            nightlyPriceJod: apartment.nightlyPriceJod,
            airbnbEnabled: Boolean(apartment.calendars?.airbnb?.enabled),
            bookingEnabled: Boolean(apartment.calendars?.booking?.enabled)
        };

        if (req.body.label !== undefined) {
            const label = String(req.body.label).trim();
            if (!label) {
                return res.status(400).json({ success: false, message: "اسم الشقة مطلوب." });
            }
            apartment.label = label.slice(0, 100);
        }

        if (req.body.active !== undefined) {
            apartment.active = Boolean(req.body.active);
        }

        if (req.body.nightlyPriceJod !== undefined) {
            const nightlyPriceJod = Number(req.body.nightlyPriceJod);

            if (
                !Number.isFinite(nightlyPriceJod) ||
                nightlyPriceJod < 0
            ) {
                return res.status(400).json({
                    success: false,
                    message: "سعر الليلة غير صحيح."
                });
            }

            apartment.nightlyPriceJod = nightlyPriceJod;
        }

        for (const source of ["airbnb", "booking"]) {
            const incoming = req.body.calendars?.[source];
            if (!incoming) continue;

            const url = String(incoming.url || "").trim();
            if (url) await validateCalendarUrl(url, source);

            apartment.calendars[source].url = url;
            apartment.calendars[source].enabled = Boolean(incoming.enabled && url);
            apartment.calendars[source].lastSyncStatus = "never";
            apartment.calendars[source].lastSyncMessage = "";
        }

        await apartment.save();

        await recordAdminActivity(req, {
            category: "apartment",
            action: "apartment.updated",
            targetType: "apartment",
            targetId: apartment._id,
            apartmentId: apartment.apartmentId,
            description: `تم تحديث إعدادات ${apartment.label}.`,
            details: {
                before: previousApartment,
                after: {
                    label: apartment.label,
                    active: apartment.active,
                    nightlyPriceJod: apartment.nightlyPriceJod,
                    airbnbEnabled: Boolean(apartment.calendars?.airbnb?.enabled),
                    bookingEnabled: Boolean(apartment.calendars?.booking?.enabled)
                }
            }
        });

        res.json({ success: true, apartment, message: "✅ تم حفظ إعدادات الشقة." });
    } catch (error) {
        console.log("ADMIN UPDATE APARTMENT ERROR:", error);
        res.status(400).json({ success: false, message: error.message || "تعذر حفظ الإعدادات." });
    }
});

/* =========================================================
   API: حذف شقة إضافية مع حماية الشقق الأساسية 1 إلى 6
========================================================= */
app.delete("/admin/apartments/:id", requireAdmin, async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.id)) {
            return res.status(400).json({
                success: false,
                message: "معرّف الشقة غير صحيح."
            });
        }

        const apartment = await Apartment.findById(req.params.id);

        if (!apartment) {
            return res.status(404).json({
                success: false,
                message: "الشقة غير موجودة."
            });
        }

        if (apartment.apartmentId >= 1 && apartment.apartmentId <= 6) {
            return res.status(403).json({
                success: false,
                message: "الشقق الأساسية الحالية محمية ولا يمكن حذفها."
            });
        }

        const bookingsCount = await Booking.countDocuments({
            apartmentId: apartment.apartmentId
        });

        if (bookingsCount > 0) {
            return res.status(409).json({
                success: false,
                message: "لا يمكن حذف هذه الشقة لأنها تحتوي على حجوزات سابقة أو حالية. ألغِ تفعيلها بدلًا من حذفها، أو احذف حجوزاتها التجريبية أولًا."
            });
        }

        await Apartment.deleteOne({
            _id: apartment._id
        });

        await recordAdminActivity(req, {
            category: "apartment",
            action: "apartment.deleted",
            targetType: "apartment",
            targetId: apartment._id,
            apartmentId: apartment.apartmentId,
            description: `تم حذف ${apartment.label} من PMS.`,
            details: { nightlyPriceJod: apartment.nightlyPriceJod }
        });

        res.json({
            success: true,
            message: `✅ تم حذف ${defaultApartmentLabel(apartment.apartmentId, apartment.label)}.`
        });
    } catch (error) {
        console.log("ADMIN DELETE APARTMENT ERROR:", error);

        res.status(500).json({
            success: false,
            message: "تعذر حذف الشقة."
        });
    }
});

/* =========================================================
   API: مزامنة شقة واحدة أو جميع الشقق الآن
========================================================= */
app.post("/admin/sync", requireAdmin, async (req, res) => {
    try {
        const requestedApartmentId = req.body.apartmentId
            ? Number(req.body.apartmentId)
            : null;

        const requestedSource = String(req.body.source || "")
            .trim()
            .toLowerCase();

        if (
            requestedSource &&
            !["airbnb", "booking"].includes(requestedSource)
        ) {
            return res.status(400).json({
                success: false,
                message: "مصدر المزامنة غير صحيح."
            });
        }

        const filter = requestedApartmentId
            ? {
                apartmentId: requestedApartmentId,
                active: true
            }
            : {
                active: true
            };

        const apartments = await Apartment.find(filter)
            .sort({ apartmentId: 1 });

        if (!apartments.length) {
            return res.status(404).json({
                success: false,
                message: "لم يتم العثور على شقة فعالة للمزامنة."
            });
        }

        const sources = requestedSource
            ? [requestedSource]
            : ["airbnb", "booking"];

        const results = [];

        for (const apartment of apartments) {
            for (const source of sources) {
                try {
                    const result = await syncApartmentCalendar(
                        apartment,
                        source
                    );

                    results.push({
                        apartmentId: apartment.apartmentId,
                        ...result
                    });
                } catch (error) {
                    results.push({
                        apartmentId: apartment.apartmentId,
                        source,
                        status: "error",
                        imported: 0,
                        message: error.message
                    });
                    await sendSyncFailureEmail({
                        apartmentId: apartment.apartmentId,
                        source,
                        message: error.message
                    });
                }
            }
        }

        const successfulCount = results.filter(result => result.status === "success").length;
        const failedCount = results.filter(result => result.status === "error").length;

        await recordAdminActivity(req, {
            category: "sync",
            action: "sync.manual",
            targetType: "sync",
            targetId: requestedApartmentId ? `apartment-${requestedApartmentId}` : "all-apartments",
            apartmentId: requestedApartmentId,
            source: requestedSource,
            description: requestedApartmentId
                ? `تم تشغيل مزامنة يدوية لـ${defaultApartmentLabel(requestedApartmentId)}${requestedSource ? ` مع ${requestedSource === "airbnb" ? "Airbnb" : "Booking.com"}` : ""}.`
                : "تم تشغيل مزامنة يدوية لجميع الشقق.",
            details: { successfulCount, failedCount, calendarsChecked: results.length }
        });

        res.json({
            success: !results.some(
                result => result.status === "error"
            ),
            results
        });
    } catch (error) {
        console.log("ADMIN SYNC ERROR:", error);

        res.status(500).json({
            success: false,
            message: "تعذر تشغيل المزامنة."
        });
    }
});

/* =========================================================
   API: إضافة حجز يدوي أو حجز منصة من لوحة الإدارة
========================================================= */
app.post("/admin/bookings", requireAdmin, async (req, res) => {
    try {
        const apartmentId = Number(req.body.apartmentId);
        const checkInDate = new Date(req.body.checkIn);
        const checkOutDate = new Date(req.body.checkOut);
        const allowedSources = ["manual", "airbnb", "booking"];
        const source = allowedSources.includes(req.body.source) ? req.body.source : "manual";

        if (!Number.isInteger(apartmentId) || Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime())) {
            return res.status(400).json({ success: false, message: "رقم الشقة وتاريخا الدخول والخروج مطلوبة." });
        }

        if (checkOutDate <= checkInDate) {
            return res.status(400).json({ success: false, message: "تاريخ الخروج يجب أن يكون بعد تاريخ الدخول." });
        }

        const apartment = await Apartment.findOne({ apartmentId, active: true });
        if (!apartment) {
            return res.status(400).json({ success: false, message: "الشقة غير موجودة أو غير فعالة." });
        }

        const conflict = await Booking.findOne({
            ...ACTIVE_BOOKING_FILTER,
            apartmentId,
            checkIn: { $lt: checkOutDate },
            checkOut: { $gt: checkInDate }
        });

        if (conflict) {
            return res.status(409).json({
                success: false,
                message: `هذه الفترة تتعارض مع حجز موجود (${formatDate(conflict.checkIn)} إلى ${formatDate(conflict.checkOut)}).`
            });
        }

        const booking = await Booking.create({
            apartmentId,
            apartmentLabel: apartment.label,
            fullName: String(req.body.fullName || "حجز يدوي").trim().slice(0, 150),
            email: String(req.body.email || "").trim().slice(0, 200),
            phone: String(req.body.phone || "").trim().slice(0, 50),
            checkIn: checkInDate,
            checkOut: checkOutDate,
            adults: Math.max(0, Number(req.body.adults || 0)),
            children: Math.max(0, Number(req.body.children || 0)),
            currency: String(req.body.currency || "JOD").slice(0, 10),
            totalPrice: Math.max(0, Number(req.body.totalPrice || 0)),
            totalPriceText: String(req.body.totalPriceText || "").trim().slice(0, 100),
            notes: String(req.body.notes || "").trim().slice(0, 1000),
            stayType: calculateNights(checkInDate, checkOutDate) >= 30 ? "long" : "normal",
            source,
            status: req.body.status === "pending" ? "pending" : "confirmed",
            sourceReference: String(req.body.sourceReference || "").trim().slice(0, 250)
        });

        await recordAdminActivity(req, {
            category: "booking",
            action: "booking.created",
            targetType: "booking",
            targetId: booking._id,
            apartmentId: booking.apartmentId,
            source: booking.source,
            description: `تمت إضافة حجز جديد لـ${defaultApartmentLabel(booking.apartmentId, booking.apartmentLabel)}.`,
            details: {
                checkIn: booking.checkIn,
                checkOut: booking.checkOut,
                status: booking.status,
                totalPrice: booking.totalPrice,
                currency: booking.currency
            }
        });

        res.status(201).json({ success: true, booking, message: "✅ تم إضافة الحجز." });
    } catch (error) {
        console.log("ADMIN CREATE BOOKING ERROR:", error);
        res.status(500).json({ success: false, message: "تعذر إضافة الحجز." });
    }
});

/* =========================================================
   API: جلب الحجوزات للأدمن
========================================================= */
app.get("/admin/bookings", requireAdmin, async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json({ success: true, bookings });
    } catch (error) {
        console.log("ADMIN GET BOOKINGS ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching bookings",
        });
    }
});

/* =========================================================
   API: تعديل بيانات حجز من لوحة الإدارة
   الحجز المستورد من منصة يبقى مقفولًا في الشقة والتواريخ والحالة
========================================================= */
app.put("/admin/bookings/:id", requireAdmin, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "الحجز غير موجود."
            });
        }

        const isImportedPlatformBooking =
            ["airbnb", "booking"].includes(booking.source) &&
            Boolean(booking.externalUid);

        const previousBooking = {
            apartmentId: booking.apartmentId,
            checkIn: booking.checkIn,
            checkOut: booking.checkOut,
            status: booking.status,
            totalPrice: booking.totalPrice,
            currency: booking.currency
        };

        let apartmentId = booking.apartmentId;
        let checkInDate = new Date(booking.checkIn);
        let checkOutDate = new Date(booking.checkOut);

        if (!isImportedPlatformBooking) {
            apartmentId = Number(req.body.apartmentId);
            checkInDate = new Date(req.body.checkIn);
            checkOutDate = new Date(req.body.checkOut);

            if (
                !Number.isInteger(apartmentId) ||
                Number.isNaN(checkInDate.getTime()) ||
                Number.isNaN(checkOutDate.getTime())
            ) {
                return res.status(400).json({
                    success: false,
                    message: "رقم الشقة وتاريخا الدخول والخروج مطلوبة."
                });
            }

            if (checkOutDate <= checkInDate) {
                return res.status(400).json({
                    success: false,
                    message: "تاريخ الخروج يجب أن يكون بعد تاريخ الدخول."
                });
            }

            const apartment = await Apartment.findOne({
                apartmentId,
                active: true
            });

            if (!apartment) {
                return res.status(400).json({
                    success: false,
                    message: "الشقة غير موجودة أو غير فعالة."
                });
            }

            const conflict = await Booking.findOne({
                _id: { $ne: booking._id },
                ...ACTIVE_BOOKING_FILTER,
                apartmentId,
                checkIn: { $lt: checkOutDate },
                checkOut: { $gt: checkInDate }
            });

            if (conflict) {
                return res.status(409).json({
                    success: false,
                    message:
                        `هذه الفترة تتعارض مع حجز موجود (${formatDate(conflict.checkIn)} إلى ${formatDate(conflict.checkOut)}).`
                });
            }

            booking.apartmentId = apartmentId;
            booking.apartmentLabel = apartment.label;
            booking.checkIn = checkInDate;
            booking.checkOut = checkOutDate;
            booking.stayType =
                calculateNights(checkInDate, checkOutDate) >= 30
                    ? "long"
                    : "normal";

            if (req.body.status !== undefined) {
                const allowedStatuses = [
                    "pending",
                    "confirmed",
                    "cancelled",
                    "blocked"
                ];

                if (!allowedStatuses.includes(req.body.status)) {
                    return res.status(400).json({
                        success: false,
                        message: "حالة الحجز غير صحيحة."
                    });
                }

                booking.status = req.body.status;
                booking.cancelledAt =
                    req.body.status === "cancelled"
                        ? new Date()
                        : null;
            }
        }

        const numberFields = ["adults", "children", "totalPrice"];

        for (const field of numberFields) {
            if (req.body[field] === undefined) continue;

            const value = Number(req.body[field]);

            if (!Number.isFinite(value) || value < 0) {
                return res.status(400).json({
                    success: false,
                    message: "القيم الرقمية في الحجز غير صحيحة."
                });
            }

            booking[field] = value;

            if (field === "totalPrice") {
                booking.totalPriceText = "";
            }
        }

        if (req.body.fullName !== undefined) {
            booking.fullName = String(req.body.fullName)
                .trim()
                .slice(0, 150);
        }

        if (req.body.email !== undefined) {
            booking.email = String(req.body.email)
                .trim()
                .slice(0, 200);
        }

        if (req.body.phone !== undefined) {
            booking.phone = String(req.body.phone)
                .trim()
                .slice(0, 50);
        }

        if (req.body.currency !== undefined) {
            booking.currency = String(req.body.currency || "JOD")
                .trim()
                .slice(0, 10);
        }

        if (req.body.notes !== undefined) {
            booking.notes = String(req.body.notes)
                .trim()
                .slice(0, 1000);
        }

        if (req.body.sourceReference !== undefined) {
            booking.sourceReference = String(req.body.sourceReference)
                .trim()
                .slice(0, 250);
        }

        await booking.save();

        await recordAdminActivity(req, {
            category: "booking",
            action: "booking.updated",
            targetType: "booking",
            targetId: booking._id,
            apartmentId: booking.apartmentId,
            source: booking.source,
            description: `تم تعديل حجز ${defaultApartmentLabel(booking.apartmentId, booking.apartmentLabel)}.`,
            details: {
                platformFieldsLocked: isImportedPlatformBooking,
                before: previousBooking,
                after: {
                    apartmentId: booking.apartmentId,
                    checkIn: booking.checkIn,
                    checkOut: booking.checkOut,
                    status: booking.status,
                    totalPrice: booking.totalPrice,
                    currency: booking.currency
                }
            }
        });

        res.json({
            success: true,
            booking,
            lockedByPlatform: isImportedPlatformBooking,
            message: isImportedPlatformBooking
                ? "✅ تم حفظ بيانات العميل والسعر والملاحظات. الشقة والتواريخ والحالة تبقى من المنصة."
                : "✅ تم حفظ تعديلات الحجز."
        });
    } catch (error) {
        console.log("UPDATE BOOKING ERROR:", error);

        res.status(500).json({
            success: false,
            message: "تعذر تعديل الحجز."
        });
    }
});

/* =========================================================
   API: تحديث حالة الحجز للأدمن
========================================================= */
app.patch("/admin/bookings/:id", requireAdmin, async (req, res) => {
    try {
        const allowedStatuses = [
            "pending",
            "confirmed",
            "cancelled",
            "blocked"
        ];

        if (!allowedStatuses.includes(req.body.status)) {
            return res.status(400).json({
                success: false,
                message: "حالة الحجز غير صحيحة."
            });
        }

        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "الحجز غير موجود."
            });
        }

        const isImportedPlatformBooking =
            ["airbnb", "booking"].includes(booking.source) &&
            Boolean(booking.externalUid);

        if (isImportedPlatformBooking) {
            return res.status(409).json({
                success: false,
                message:
                    `هذا الحجز مستورد من ${booking.source === "airbnb" ? "Airbnb" : "Booking.com"}. غيّر حالته أو ألغِه من المنصة نفسها.`
            });
        }

        const previousStatus = booking.status;

        booking.status = req.body.status;
        booking.cancelledAt =
            req.body.status === "cancelled"
                ? new Date()
                : null;

        await booking.save();

        await recordAdminActivity(req, {
            category: "booking",
            action: "booking.status_changed",
            targetType: "booking",
            targetId: booking._id,
            apartmentId: booking.apartmentId,
            source: booking.source,
            description: `تم تغيير حالة حجز ${defaultApartmentLabel(booking.apartmentId, booking.apartmentLabel)} من ${previousStatus} إلى ${booking.status}.`,
            details: { previousStatus, status: booking.status }
        });

        res.json({
            success: true,
            booking,
            message: "✅ تم تحديث حالة الحجز."
        });
    } catch (error) {
        console.log("UPDATE BOOKING STATUS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "تعذر تحديث حالة الحجز."
        });
    }
});

/* =========================================================
   API: حذف نهائي آمن
   لا نحذف حجز منصة، والحجز المحلي يجب إلغاؤه أولًا
========================================================= */
app.delete("/admin/bookings/:id", requireAdmin, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);

        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "الحجز غير موجود."
            });
        }

        const isImportedPlatformBooking =
            ["airbnb", "booking"].includes(booking.source) &&
            Boolean(booking.externalUid);

        if (isImportedPlatformBooking) {
            return res.status(409).json({
                success: false,
                message:
                    `لا يمكن حذف حجز ${booking.source === "airbnb" ? "Airbnb" : "Booking.com"} المستورد من PMS. ألغِه من المنصة نفسها.`
            });
        }

        if (booking.status !== "cancelled") {
            return res.status(409).json({
                success: false,
                message: "ألغِ الحجز أولًا، وبعدها يمكنك حذفه نهائيًا."
            });
        }

        await Booking.deleteOne({ _id: booking._id });

        await recordAdminActivity(req, {
            category: "booking",
            action: "booking.deleted",
            targetType: "booking",
            targetId: booking._id,
            apartmentId: booking.apartmentId,
            source: booking.source,
            description: `تم حذف حجز ملغي لـ${defaultApartmentLabel(booking.apartmentId, booking.apartmentLabel)} نهائيًا.`,
            details: {
                checkIn: booking.checkIn,
                checkOut: booking.checkOut,
                totalPrice: booking.totalPrice,
                currency: booking.currency
            }
        });

        res.json({
            success: true,
            message: "✅ تم حذف الحجز الملغي نهائيًا."
        });
    } catch (error) {
        console.log("DELETE BOOKING ERROR:", error);

        res.status(500).json({
            success: false,
            message: "تعذر حذف الحجز."
        });
    }
});

/* =========================================================
   مزامنة دورية للتقاويم المفعّلة أثناء عمل خدمة Render
========================================================= */
let calendarSyncRunning = false;

async function runScheduledCalendarSync() {
    if (calendarSyncRunning || mongoose.connection.readyState !== 1) return;
    calendarSyncRunning = true;

    try {
        const apartments = await Apartment.find({ active: true });
        for (const apartment of apartments) {
            for (const source of ["airbnb", "booking"]) {
                if (!apartment.calendars[source]?.enabled) continue;

                try {
                    await syncApartmentCalendar(apartment, source);
                } catch (error) {
                    console.log(
                        `SCHEDULED SYNC ERROR apartment=${apartment.apartmentId} source=${source}:`,
                        error.message
                    );

                    await sendSyncFailureEmail({
                        apartmentId: apartment.apartmentId,
                        source,
                        message: error.message
                    });
                }
            }
        }
    } finally {
        calendarSyncRunning = false;
    }
}

const syncIntervalMinutes = Math.max(5, Number(process.env.ICAL_SYNC_MINUTES || 15));
const syncTimer = setInterval(
    () => runScheduledCalendarSync().catch((error) => console.log("CALENDAR SYNC TIMER ERROR:", error.message)),
    syncIntervalMinutes * 60 * 1000
);
syncTimer.unref();

/* =========================================================
   رد للمسارات غير الموجودة
========================================================= */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message:
            "المسار المطلوب غير موجود."
    });
});

/* =========================================================
   معالجة الأخطاء بدون كشف تفاصيل السيرفر
========================================================= */
app.use((error, req, res, next) => {
    console.log(
        "UNHANDLED REQUEST ERROR:",
        error.name || "Error"
    );

    if (res.headersSent) return next(error);

    /* JSON أكبر من 50KB */
    if (
        error.type === "entity.too.large"
    ) {
        return res.status(413).json({
            success: false,
            message:
                "حجم البيانات المرسلة أكبر من الحد المسموح."
        });
    }

    /* JSON مكتوب بصيغة خاطئة */
    if (
        error instanceof SyntaxError &&
        error.status === 400 &&
        "body" in error
    ) {
        return res.status(400).json({
            success: false,
            message:
                "صيغة JSON المرسلة غير صحيحة."
        });
    }

    if (res.headersSent) {
        return next(error);
    }

    return res.status(500).json({
        success: false,
        message:
            "حدث خطأ داخلي. حاول مرة أخرى لاحقًا."
    });
});

/* =========================================================
   تشغيل السيرفر
========================================================= */
const PORT = process.env.PORT || 10000;
if (require.main === module) {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
module.exports = { app };
