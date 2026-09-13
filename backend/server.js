const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Booking = require("./models/Booking");
const Apartment = require("./models/Apartment");
const basicAuth = require("basic-auth");
const { Resend } = require("resend");
const { buildIcalFeed, fetchCalendarEvents, validateCalendarUrl } = require("./services/ical");
require("dotenv").config();

const app = express();

/* =========================================================
   إعدادات CORS وقراءة JSON
========================================================= */
const configuredOrigins = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const defaultOrigins = [
    "https://hijazi-apartments.com",
    "https://www.hijazi-apartments.com",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
];

function isAllowedOrigin(origin) {
    if (!origin) return true;
    if ([...defaultOrigins, ...configuredOrigins].includes(origin)) return true;

    try {
        return new URL(origin).hostname.endsWith(".vercel.app");
    } catch {
        return false;
    }
}

app.use(cors({
    origin(origin, callback) {
        callback(null, isAllowedOrigin(origin));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

app.use((req, res, next) => {
    console.log(`[REQUEST] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
    next();
});
/* =========================================================
   الاتصال بقاعدة البيانات
========================================================= */
mongoose
    .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 15000,
        family: 4
    })
    .then(async () => {
        console.log("MongoDB Connected Successfully");
        await ensureDefaultApartments();
        runScheduledCalendarSync().catch((error) => {
            console.log("INITIAL CALENDAR SYNC ERROR:", error.message);
        });
    })
    .catch((err) => console.log("MongoDB Connection Error:", err));

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
        res.status(500).json({
            success: false,
            status: "db_error",
            errorMessage: error.message
        });
    }
});

/* =========================================================
   حماية مسارات الأدمن
========================================================= */
function requireAdmin(req, res, next) {
    const user = basicAuth(req);

    const ok =
        user &&
        user.name === process.env.ADMIN_USER &&
        user.pass === process.env.ADMIN_PASS;

    if (!ok) {
        res.set("WWW-Authenticate", 'Basic realm="HIJAZI Admin"');
        return res.status(401).send("Authentication required.");
    }

    next();
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
   تجهيز الشقق الست الحالية أول مرة بدون تغيير بياناتها لاحقًا
========================================================= */
async function ensureDefaultApartments() {
    const count = await Apartment.countDocuments();
    if (count > 0) return;

    await Apartment.insertMany(
        Array.from({ length: 6 }, (_, index) => ({
            apartmentId: index + 1,
            label: `شقة رقم ${index + 1}`,
            active: true
        }))
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
    const nights = calculateNights(booking.checkIn, booking.checkOut);
    const isLong = nights >= 30;

    const title = forCustomer ? "تم استلام طلب الحجز ✅" : "حجز جديد ✅";
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
        <p><b>ملاحظات العميل:</b><br/>
        <span style="white-space:pre-line">${String(booking.notes).replace(/[<>]/g, "")}</span></p>
    `
        : `<p><b>ملاحظات العميل:</b> لا توجد ملاحظات</p>`;

    return `
  <div style="font-family:Arial,sans-serif;line-height:1.8">
    <div style="padding:14px 16px;color:#fff;background:linear-gradient(90deg,#c89116,#000);border-radius:10px">
      <h2 style="margin:0">${title} - HIJAZI Apartments</h2>
    </div>

    <p style="margin-top:12px">${msg}</p>

    <div style="border:1px solid #eee;border-radius:10px;padding:14px">
      <p><b>الشقة:</b> ${booking.apartmentLabel} (ID: ${booking.apartmentId})</p>
      <p><b>الاسم:</b> ${booking.fullName}</p>
      <p><b>الهاتف:</b> ${booking.phone}</p>
      <p><b>البريد:</b> ${booking.email}</p>
      <p><b>الدخول:</b> ${formatDate(booking.checkIn)}</p>
      <p><b>الخروج:</b> ${formatDate(booking.checkOut)}</p>
      <p><b>عدد الليالي:</b> ${nights}</p>
      <p><b>الضيوف:</b> بالغين ${booking.adults} + أطفال ${booking.children}</p>
      <p><b>السعر:</b> ${booking.totalPriceText || booking.totalPrice} (${booking.currency})</p>
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
            subject: `حجز جديد ✅ - ${booking.apartmentLabel} (${formatDate(booking.checkIn)} → ${formatDate(booking.checkOut)})`,
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
            apartmentLabel: b.apartmentLabel || `شقة رقم ${b.apartmentId}`,
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
            message: "Error fetching calendar",
            error: error.message,
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
========================================================= */
app.post("/bookings", async (req, res) => {
    try {
        const {
            apartmentId,
            apartmentLabel,
            fullName,
            email,
            phone,
            checkIn,
            checkOut,
            adults,
            children,
            currency,
            totalPrice,
            totalPriceText,
            notes,
            stayType,
        } = req.body;

        console.log("BOOKING REQUEST RECEIVED:", {
            apartmentId,
            hasFullName: Boolean(fullName),
            hasEmail: Boolean(email),
            hasPhone: Boolean(phone),
            checkIn,
            checkOut,
            adults,
            children,
            currency,
            totalPrice,
            hasNotes: Boolean(notes)
        });

        if (
            apartmentId === undefined ||
            !fullName ||
            !email ||
            !phone ||
            !checkIn ||
            !checkOut ||
            adults === undefined ||
            totalPrice === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "بيانات ناقصة. تأكد من تعبئة الحقول المطلوبة.",
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

        await ensureDefaultApartments();
        const apartment = await Apartment.findOne({
            apartmentId: Number(apartmentId),
            active: true
        });

        if (!apartment) {
            return res.status(400).json({
                success: false,
                message: "الشقة المختارة غير موجودة أو غير متاحة للحجز.",
            });
        }

        const conflict = await Booking.findOne({
            ...ACTIVE_BOOKING_FILTER,
            apartmentId: Number(apartmentId),
            checkIn: { $lt: checkOutDate },
            checkOut: { $gt: checkInDate },
        });

        if (conflict) {
            return res.status(409).json({
                success: false,
                message: `❌ هذه الشقة محجوزة من ${formatDate(conflict.checkIn)} إلى ${formatDate(conflict.checkOut)}. اختر تاريخًا آخر.`,
            });
        }

        const booking = new Booking({
            apartmentId: Number(apartmentId),
            apartmentLabel: apartmentLabel || `شقة رقم ${apartmentId}`,
            fullName,
            email,
            phone,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            adults: Number(adults),
            children: Number(children || 0),
            currency: currency || "JOD",
            totalPrice: Number(totalPrice),
            totalPriceText: totalPriceText || "",
            notes: notes ? String(notes).trim().slice(0, 1000) : "",
            stayType: stayType || "normal",
            source: "website",
            status: "pending"
        });

        await booking.save();

        console.log("BOOKING SAVED SUCCESSFULLY:", {
            id: booking._id,
            apartmentId: booking.apartmentId,
            checkIn: formatDate(booking.checkIn),
            checkOut: formatDate(booking.checkOut)
        });

        sendBookingEmails(booking).catch((e) => {
            console.log("SEND EMAILS ERROR:", e.message);
        });

        res.json({
            success: true,
            message: "✅ تم حفظ الحجز بنجاح",
        });
    } catch (error) {
        console.log("SAVE BOOKING ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Error saving booking",
            error: error.message,
        });
    }
});

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
   API: جلب الشقق وإعدادات الربط وروابط التصدير للأدمن
========================================================= */
app.get("/admin/apartments", requireAdmin, async (req, res) => {
    try {
        await ensureDefaultApartments();
        const apartments = await Apartment.find().sort({ apartmentId: 1 });
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
   API: إضافة شقة جديدة للنظام
========================================================= */
app.post("/admin/apartments", requireAdmin, async (req, res) => {
    try {
        const lastApartment = await Apartment.findOne().sort({ apartmentId: -1 });
        const requestedId = Number(req.body.apartmentId);
        const apartmentId = Number.isInteger(requestedId) && requestedId > 0
            ? requestedId
            : (lastApartment?.apartmentId || 0) + 1;

        const apartment = await Apartment.create({
            apartmentId,
            label: String(req.body.label || `شقة رقم ${apartmentId}`).trim().slice(0, 100),
            active: req.body.active !== false
        });

        res.status(201).json({ success: true, apartment });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ success: false, message: "رقم الشقة مستخدم مسبقًا." });
        }
        console.log("ADMIN CREATE APARTMENT ERROR:", error);
        res.status(500).json({ success: false, message: "تعذر إضافة الشقة." });
    }
});

/* =========================================================
   API: تعديل اسم الشقة وحالتها وروابط تقاويمها
========================================================= */
app.put("/admin/apartments/:id", requireAdmin, async (req, res) => {
    try {
        const apartment = await Apartment.findById(req.params.id);
        if (!apartment) {
            return res.status(404).json({ success: false, message: "الشقة غير موجودة." });
        }

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
                message: "الشقق الأساسية من 1 إلى 6 محمية ولا يمكن حذفها."
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

        res.json({
            success: true,
            message: `✅ تم حذف الشقة ${apartment.apartmentId}.`
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
                }
            }
        }

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
   API: تحديث حالة الحجز للأدمن
========================================================= */
app.patch("/admin/bookings/:id", requireAdmin, async (req, res) => {
    try {
        const allowedStatuses = ["pending", "confirmed", "cancelled", "blocked"];
        if (!allowedStatuses.includes(req.body.status)) {
            return res.status(400).json({ success: false, message: "حالة الحجز غير صحيحة." });
        }

        const booking = await Booking.findByIdAndUpdate(
            req.params.id,
            { $set: { status: req.body.status } },
            { new: true, runValidators: true }
        );

        if (!booking) {
            return res.status(404).json({ success: false, message: "الحجز غير موجود." });
        }

        res.json({ success: true, booking, message: "✅ تم تحديث حالة الحجز." });
    } catch (error) {
        console.log("UPDATE BOOKING STATUS ERROR:", error);
        res.status(500).json({ success: false, message: "تعذر تحديث حالة الحجز." });
    }
});

/* =========================================================
   API: حذف حجز للأدمن
========================================================= */
app.delete("/admin/bookings/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Booking.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({
                success: false,
                message: "Booking not found",
            });
        }

        res.json({
            success: true,
            message: "✅ Booking deleted",
        });
    } catch (error) {
        console.log("DELETE BOOKING ERROR:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting booking",
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
                    console.log(`SCHEDULED SYNC ERROR apartment=${apartment.apartmentId} source=${source}:`, error.message);
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
   تشغيل السيرفر
========================================================= */
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
