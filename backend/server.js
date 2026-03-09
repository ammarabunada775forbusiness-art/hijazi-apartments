const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const Booking = require("./models/Booking");
const basicAuth = require("basic-auth");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();

// ✅ CORS محلياً
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// ✅ اتصال DB
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch((err) => console.log("MongoDB Connection Error:", err));

app.get("/", (req, res) => {
    res.send("HIJAZI Apartments API Running");
});

// ===================== Admin Auth =====================
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

// ===================== Mail Transporter (Gmail) =====================
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS, // App Password
    },
});

// ===================== Helpers =====================
function formatDate(d) {
    const x = new Date(d);
    if (isNaN(x.getTime())) return "";
    return x.toISOString().slice(0, 10);
}

function bookingText(booking) {
    return `
HIJAZI Apartments - حجز جديد

الشقة: ${booking.apartmentLabel} (ID: ${booking.apartmentId})
الاسم: ${booking.fullName}
الهاتف: ${booking.phone}
البريد: ${booking.email}

الدخول: ${formatDate(booking.checkIn)}
الخروج: ${formatDate(booking.checkOut)}
بالغين: ${booking.adults}
أطفال: ${booking.children}

العملة: ${booking.currency}
السعر: ${booking.totalPriceText || booking.totalPrice}

تم إنشاء الحجز: ${formatDate(booking.createdAt || new Date())}
  `.trim();
}

function bookingHtml(booking, forCustomer = false) {
    const title = forCustomer ? "تم استلام طلب الحجز ✅" : "حجز جديد ✅";
    const msg = forCustomer
        ? "شكراً لك! تم استلام طلب الحجز بنجاح، وسنتواصل معك قريباً لتأكيد التفاصيل."
        : "وصل حجز جديد على الموقع.";

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
      <p><b>الضيوف:</b> بالغين ${booking.adults} + أطفال ${booking.children}</p>
      <p><b>السعر:</b> ${booking.totalPriceText || booking.totalPrice} (${booking.currency})</p>
    </div>

    <p style="color:#666;font-size:13px;margin-top:10px">
      الشميساني - عمّان، الأردن<br/>
      HIJAZI Apartments
    </p>
  </div>
  `;
}

// ===================== ✅ Availability API =====================
// GET /availability?checkIn=2026-03-06&checkOut=2026-03-08
// يرجّع الشقق المتاحة بهالتواريخ (بدون تداخل)
const APARTMENT_IDS = [1, 2, 3, 4, 5, 6];

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
            return res.status(400).json({ success: false, message: "تواريخ غير صحيحة." });
        }

        if (checkOutDate <= checkInDate) {
            return res.status(400).json({
                success: false,
                message: "تاريخ المغادرة لازم يكون بعد تاريخ الوصول.",
            });
        }

        // كل الحجوزات المتداخلة مع الفترة المطلوبة
        const conflicts = await Booking.find({
            checkIn: { $lt: checkOutDate },
            checkOut: { $gt: checkInDate },
        }).select("apartmentId");

        const bookedSet = new Set(conflicts.map((b) => Number(b.apartmentId)));
        const available = APARTMENT_IDS.filter((id) => !bookedSet.has(id));

        res.json({
            success: true,
            checkIn: formatDate(checkInDate),
            checkOut: formatDate(checkOutDate),
            availableApartments: available,
            bookedApartments: Array.from(bookedSet),
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Error checking availability" });
    }
});

// ===================== Calendar API =====================
app.get("/calendar", async (req, res) => {
    try {
        const aptId = Number(req.query.aptId);
        if (!aptId) {
            return res.status(400).json({ success: false, message: "aptId is required" });
        }

        const bookings = await Booking.find({ apartmentId: aptId })
            .select("checkIn checkOut")
            .sort({ checkIn: 1 });

        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching calendar" });
    }
});

// ===================== Booking APIs =====================
app.get("/bookings", async (req, res) => {
    try {
        const aptId = req.query.aptId ? Number(req.query.aptId) : null;
        const filter = aptId ? { apartmentId: aptId } : {};
        const bookings = await Booking.find(filter).sort({ checkIn: 1 });
        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching bookings" });
    }
});

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
        } = req.body;

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
            return res.status(400).json({ success: false, message: "تواريخ غير صحيحة." });
        }
        if (checkOutDate <= checkInDate) {
            return res.status(400).json({
                success: false,
                message: "تاريخ المغادرة لازم يكون بعد تاريخ الوصول.",
            });
        }

        // ✅ منع التداخل لنفس الشقة
        const conflict = await Booking.findOne({
            apartmentId: Number(apartmentId),
            checkIn: { $lt: checkOutDate },
            checkOut: { $gt: checkInDate },
        });

        if (conflict) {
            return res.status(409).json({
                success: false,
                message: "❌ هذا التاريخ محجوز بالفعل لهذه الشقة. اختر تاريخًا آخر.",
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
        });

        await booking.save();

        // ===================== Send Emails =====================
        const adminTo = process.env.ADMIN_EMAIL || process.env.MAIL_USER;

        const adminMail = {
            from: `HIJAZI Apartments <${process.env.MAIL_USER}>`,
            to: adminTo,
            subject: `حجز جديد ✅ - ${booking.apartmentLabel} (${formatDate(
                booking.checkIn
            )} → ${formatDate(booking.checkOut)})`,
            text: bookingText(booking),
            html: bookingHtml(booking, false),
        };

        const customerMail = {
            from: `HIJAZI Apartments <${process.env.MAIL_USER}>`,
            to: booking.email,
            subject: `تم استلام طلب حجزك ✅ - HIJAZI Apartments`,
            text: `مرحباً ${booking.fullName}\n\nتم استلام طلب حجزك بنجاح.\n${bookingText(
                booking
            )}\n\nشكراً لك.`,
            html: bookingHtml(booking, true),
        };

        transporter
            .sendMail(adminMail)
            .catch((e) => console.log("Admin email error:", e.message));
        transporter
            .sendMail(customerMail)
            .catch((e) => console.log("Customer email error:", e.message));

        res.json({ success: true, message: "✅ تم حفظ الحجز بنجاح (وتم إرسال الإيميل)" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Error saving booking" });
    }
});

// ===================== Admin APIs =====================
app.get("/admin/bookings", requireAdmin, async (req, res) => {
    try {
        const bookings = await Booking.find().sort({ createdAt: -1 });
        res.json({ success: true, bookings });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching bookings" });
    }
});

app.delete("/admin/bookings/:id", requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Booking.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        res.json({ success: true, message: "✅ Booking deleted" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting booking" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));