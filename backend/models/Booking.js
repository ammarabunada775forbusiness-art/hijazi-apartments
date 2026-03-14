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
        fullName: { type: String, required: true, trim: true },

        // البريد الإلكتروني
        email: { type: String, required: true, trim: true, lowercase: true },

        // رقم الهاتف
        phone: { type: String, required: true, trim: true },

        // تاريخ الدخول
        checkIn: { type: Date, required: true },

        // تاريخ الخروج
        checkOut: { type: Date, required: true },

        // عدد البالغين
        adults: { type: Number, required: true, min: 1 },

        // عدد الأطفال
        children: { type: Number, default: 0, min: 0 },

        // العملة المختارة
        currency: { type: String, default: "JOD" },

        // السعر الرقمي النهائي
        totalPrice: { type: Number, required: true },

        // السعر النصي النهائي
        totalPriceText: { type: String },

        // نوع الإقامة: عادية أو طويلة
        stayType: { type: String, default: "normal" }
    },
    { timestamps: true }
);

/* =========================================================
   فهرس لتحسين البحث والتأكد من فحص التعارضات بسرعة
========================================================= */
bookingSchema.index({ apartmentId: 1, checkIn: 1, checkOut: 1 });

module.exports = mongoose.model("Booking", bookingSchema);