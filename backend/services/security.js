const crypto = require("crypto");

const BODY_METHODS = new Set(["POST", "PUT", "PATCH"]);
const BLOCKED_OBJECT_KEYS = new Set([
    "__proto__",
    "prototype",
    "constructor"
]);

/* =========================================================
   استخراج عنوان العميل لاستخدامه في Rate Limiting
========================================================= */
function getClientKey(req) {
    return req.ip || req.socket?.remoteAddress || "unknown";
}

/* =========================================================
   مقارنة بيانات الدخول بطريقة تقلل Timing Attacks
========================================================= */
function timingSafeEqualStrings(left, right) {
    // هاش ثابت الطول لتجنب مقارنة كلمة المرور باختلاف طول المصفوفتين.
    const leftBuffer = crypto.createHash("sha256").update(String(left ?? "")).digest();
    const rightBuffer = crypto.createHash("sha256").update(String(right ?? "")).digest();

    return crypto.timingSafeEqual(
        leftBuffer,
        rightBuffer
    );
}

/* لا نسجل Query strings أو رمز الوصول الموجود داخل رابط التقويم. */
function requestPathForLog(req) {
    const path = String(req.path || "/");
    return /^\/ical(?:\/|$)/i.test(path)
        ? "/ical/[redacted]"
        : path.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 200);
}

/* التحقق من الأنواع قبل Number/String لمنع تحويل مصفوفة أو Boolean إلى قيمة مقبولة. */
function validatePublicBookingShape(req, res, next) {
    const body = req.body;
    const bad = () => res.status(400).json({ success: false, message: "أنواع بيانات الحجز غير صحيحة." });
    if (!body || typeof body !== "object" || Array.isArray(body)) return bad();
    const limits = { fullName: 150, email: 200, phone: 30, checkIn: 10, checkOut: 10 };
    for (const [key, max] of Object.entries(limits)) {
        if (typeof body[key] !== "string" || !body[key].trim() || body[key].length > max) return bad();
    }
    for (const [key, max] of Object.entries({ notes: 1000, currency: 3 })) {
        if (body[key] !== undefined && (typeof body[key] !== "string" || body[key].length > max)) return bad();
    }
    for (const key of ["apartmentId", "adults", "children"]) {
        const value = body[key];
        if (key === "children" && value === undefined) continue;
        if ((typeof value !== "number" && !(typeof value === "string" && /^\d+$/.test(value))) ||
            !Number.isSafeInteger(Number(value)) || Number(value) < (key === "children" ? 0 : 1)) return bad();
    }
    return next();
}

/* =========================================================
   إضافة Security Headers إلى ردود الـ API
========================================================= */
function securityHeaders(req, res, next) {
    res.set({
        "Content-Security-Policy":
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",

        "Cross-Origin-Resource-Policy":
            "cross-origin",

        "Permissions-Policy":
            "camera=(), microphone=(), geolocation=(), payment=()",

        "Referrer-Policy":
            "no-referrer",

        "X-Content-Type-Options":
            "nosniff",

        "X-Frame-Options":
            "DENY",

        "X-Permitted-Cross-Domain-Policies":
            "none"
    });

    const forwardedProtocol = String(
        req.headers["x-forwarded-proto"] || ""
    )
        .split(",")[0]
        .trim();

    if (
        process.env.NODE_ENV === "production" &&
        (req.secure || forwardedProtocol === "https")
    ) {
        res.set(
            "Strict-Transport-Security",
            "max-age=31536000"
        );
    }

    if (
        req.path === "/admin" ||
        req.path.startsWith("/admin/") || req.path.startsWith("/ical/")
    ) {
        res.set(
            "Cache-Control",
            "no-store, max-age=0"
        );

        res.set(
            "Pragma",
            "no-cache"
        );
    }

    next();
}

/* =========================================================
   قبول JSON فقط في طلبات التعديل والإضافة
========================================================= */
function requireJsonContentType(req, res, next) {
    if (!BODY_METHODS.has(req.method)) {
        return next();
    }

    if (!req.is("application/json")) {
        return res.status(415).json({
            success: false,
            message:
                "نوع المحتوى غير مدعوم. أرسل البيانات بصيغة JSON."
        });
    }

    next();
}

/* =========================================================
   البحث عن MongoDB Operators ومفاتيح Prototype Pollution
========================================================= */
function findDangerousObjectKey(
    value,
    path = "body",
    seen = new Set(),
    depth = 0
) {
    if (
        value === null ||
        typeof value !== "object"
    ) {
        return null;
    }

    if (depth > 20) {
        return `${path} (too deep)`;
    }

    if (seen.has(value)) {
        return null;
    }

    seen.add(value);

    if (Array.isArray(value)) {
        for (
            let index = 0;
            index < value.length;
            index += 1
        ) {
            const found = findDangerousObjectKey(
                value[index],
                `${path}[${index}]`,
                seen,
                depth + 1
            );

            if (found) return found;
        }

        return null;
    }

    for (const key of Object.keys(value)) {
        if (
            key.startsWith("$") ||
            key.includes(".") ||
            BLOCKED_OBJECT_KEYS.has(key)
        ) {
            return `${path}.${key}`;
        }

        const found = findDangerousObjectKey(
            value[key],
            `${path}.${key}`,
            seen,
            depth + 1
        );

        if (found) return found;
    }

    return null;
}

/* =========================================================
   رفض الطلب إذا احتوى مفاتيح خطيرة
========================================================= */
function rejectDangerousBodyKeys(req, res, next) {
    const dangerousKey =
        findDangerousObjectKey(req.body);

    if (dangerousKey) {
        return res.status(400).json({
            success: false,
            message:
                "تحتوي البيانات المرسلة على بنية غير مسموحة."
        });
    }

    next();
}

/* =========================================================
   إنشاء Rate Limiter بدون مكتبات إضافية
========================================================= */
function createRateLimiter({
    windowMs,
    max,
    message
}) {
    const buckets = new Map();

    const cleanupTimer = setInterval(() => {
        const now = Date.now();

        for (
            const [key, bucket]
            of buckets.entries()
        ) {
            if (bucket.resetAt <= now) {
                buckets.delete(key);
            }
        }
    }, Math.min(windowMs, 5 * 60 * 1000));

    cleanupTimer.unref();

    return function rateLimiter(req, res, next) {
        const now = Date.now();
        const key = getClientKey(req);

        let bucket = buckets.get(key);

        if (
            !bucket ||
            bucket.resetAt <= now
        ) {
            bucket = {
                count: 0,
                resetAt: now + windowMs
            };

            buckets.set(key, bucket);
        }

        const resetSeconds = Math.max(
            1,
            Math.ceil(
                (bucket.resetAt - now) / 1000
            )
        );

        res.set(
            "RateLimit-Limit",
            String(max)
        );

        res.set(
            "RateLimit-Remaining",
            String(
                Math.max(
                    0,
                    max - bucket.count - 1
                )
            )
        );

        res.set(
            "RateLimit-Reset",
            String(resetSeconds)
        );

        if (bucket.count >= max) {
            res.set(
                "Retry-After",
                String(resetSeconds)
            );

            return res.status(429).json({
                success: false,
                message
            });
        }

        bucket.count += 1;
        next();
    };
}

module.exports = {
    requestPathForLog,
    validatePublicBookingShape,
    createRateLimiter,
    findDangerousObjectKey,
    rejectDangerousBodyKeys,
    requireJsonContentType,
    securityHeaders,
    timingSafeEqualStrings
};
