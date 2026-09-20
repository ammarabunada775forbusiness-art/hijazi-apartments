const mongoose = require("mongoose");

/* =========================================================
   نموذج الحجز
   هذا الملف يحدد شكل بيانات الحجز داخل MongoDB
========================================================= */
const bookingSchema = new mongoose.Schema(
    {
        // رقم الشقة
        apartmentId: { type: Number, required: true },

        // اسم الشقة الظاهر للعميل
        apartmentLabel: { type: String },

        // الاسم الكامل للعميل
        fullName: { type: String, default: "", trim: true },

        // البريد الإلكتروني
        email: { type: String, default: "", trim: true, lowercase: true },

        // رقم الهاتف
        phone: { type: String, default: "", trim: true },

        // تاريخ الدخول
        checkIn: { type: Date, required: true },

        // تاريخ الخروج
        checkOut: { type: Date, required: true },

        // عدد البالغين
        adults: { type: Number, default: 1, min: 0 },

        // عدد الأطفال
        children: { type: Number, default: 0, min: 0 },

        // العملة المختارة
        currency: { type: String, default: "JOD" },

        // السعر الرقمي النهائي
        totalPrice: { type: Number, default: 0, min: 0 },

        // السعر النصي النهائي
        totalPriceText: { type: String },

        // ملاحظات أو أسئلة إضافية من العميل - اختياري
        notes: { type: String, default: "", trim: true, maxlength: 1000 },

        // نوع الإقامة: عادية أو طويلة
        stayType: { type: String, default: "normal" },

        // مصدر الحجز داخل نظام الإدارة المركزي
        source: {
            type: String,
            enum: ["website", "manual", "airbnb", "booking"],
            default: "website",
            index: true
        },

        // حالة الحجز؛ الحجوزات الملغاة لا تغلق التواريخ
        status: {
            type: String,
            enum: ["pending", "confirmed", "cancelled", "blocked"],
            default: "pending",
            index: true
        },

        // وقت إلغاء الحجز داخل PMS للحجوزات المحلية
        cancelledAt: { type: Date, default: null },

        // رقم الحجز أو UID القادم من المنصة الخارجية
        externalUid: { type: String, default: "", trim: true },
        sourceReference: { type: String, default: "", trim: true },

        // أي بيانات إضافية يسمح ملف iCal للمنصة بإرسالها
        externalSummary: { type: String, default: "", trim: true, maxlength: 500 },
        externalDescription: { type: String, default: "", trim: true, maxlength: 2000 },
        externalLocation: { type: String, default: "", trim: true, maxlength: 500 },

        // وقت آخر تحديث للحجز المستورد من iCal
        lastSyncedAt: { type: Date, default: null }
    },
    { timestamps: true }
);

/* =========================================================
   فهرس لتحسين البحث والتأكد من فحص التعارضات بسرعة
========================================================= */
bookingSchema.index({ apartmentId: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index(
    { apartmentId: 1, source: 1, externalUid: 1 },
    {
        unique: true,
        partialFilterExpression: { externalUid: { $type: "string", $gt: "" } }
    }
);

module.exports = mongoose.model("Booking", bookingSchema);
