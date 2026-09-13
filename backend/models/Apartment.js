const crypto = require("crypto");
const mongoose = require("mongoose");

/* =========================================================
   إعدادات رابط تقويم خارجي واحد
========================================================= */
const calendarConnectionSchema = new mongoose.Schema(
    {
        url: { type: String, default: "", trim: true },
        enabled: { type: Boolean, default: false },
        lastSyncedAt: { type: Date, default: null },
        lastSyncStatus: {
            type: String,
            enum: ["never", "success", "error"],
            default: "never"
        },
        lastSyncMessage: {
            type: String,
            default: "",
            trim: true
        }
    },
    { _id: false }
);

/* =========================================================
   نموذج الشقة داخل نظام HIJAZI PMS
========================================================= */
const apartmentSchema = new mongoose.Schema(
    {
        apartmentId: {
            type: Number,
            required: true,
            unique: true,
            min: 1
        },

        label: {
            type: String,
            required: true,
            trim: true
        },

        active: {
            type: Boolean,
            default: true,
            index: true
        },

        /* سعر الليلة الأساسي بالدينار */
        nightlyPriceJod: {
            type: Number,
            required: true,
            default: 0,
            min: 0
        },

        // رمز سري داخل رابط التصدير حتى لا يمكن تخمين التقويم بسهولة
        calendarToken: {
            type: String,
            default: () => crypto.randomBytes(24).toString("hex"),
            select: true
        },

        calendars: {
            airbnb: {
                type: calendarConnectionSchema,
                default: () => ({})
            },

            booking: {
                type: calendarConnectionSchema,
                default: () => ({})
            }
        }
    },
    { timestamps: true }
);

apartmentSchema.index({ active: 1, apartmentId: 1 });

module.exports = mongoose.model("Apartment", apartmentSchema);