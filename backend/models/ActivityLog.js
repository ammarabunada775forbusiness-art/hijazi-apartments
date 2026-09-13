const mongoose = require("mongoose");

/* سجل عمليات الأدمن بدون كلمات المرور أو روابط iCal السرية. */
const activityLogSchema = new mongoose.Schema(
    {
        category: {
            type: String,
            enum: ["booking", "apartment", "sync", "system"],
            required: true,
            index: true
        },
        action: { type: String, required: true, trim: true, maxlength: 80, index: true },
        description: { type: String, required: true, trim: true, maxlength: 500 },
        targetType: {
            type: String,
            enum: ["booking", "apartment", "sync", "system"],
            default: "system"
        },
        targetId: { type: String, default: "", trim: true, maxlength: 150 },
        apartmentId: { type: Number, default: null, index: true },
        source: { type: String, default: "", trim: true, maxlength: 30 },
        adminUser: { type: String, default: "admin", trim: true, maxlength: 100 },
        details: { type: mongoose.Schema.Types.Mixed, default: () => ({}) }
    },
    { timestamps: true, versionKey: false }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
