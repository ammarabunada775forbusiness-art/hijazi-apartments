const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
    {
        apartmentId: { type: Number, required: true },
        apartmentLabel: { type: String },

        fullName: { type: String, required: true, trim: true },
        email: { type: String, required: true, trim: true, lowercase: true },
        phone: { type: String, required: true, trim: true },

        checkIn: { type: Date, required: true },
        checkOut: { type: Date, required: true },

        adults: { type: Number, required: true, min: 1 },
        children: { type: Number, default: 0, min: 0 },

        currency: { type: String, default: "JOD" },
        totalPrice: { type: Number, required: true },
        totalPriceText: { type: String },
    },
    { timestamps: true }
);

bookingSchema.index({ apartmentId: 1, checkIn: 1, checkOut: 1 });

module.exports = mongoose.model("Booking", bookingSchema);