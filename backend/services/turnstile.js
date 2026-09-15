/* التحقق الخادمي من Turnstile. لا تُطبع المفاتيح أو رموز الزوار في السجل. */
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const BOOKING_ACTION = "booking";

function createTurnstileProtection(env = process.env, fetchImpl = (...args) => fetch(...args)) {
    const flag = String(env.TURNSTILE_ENABLED || "false").trim();
    const enabled = flag === "true";
    const siteKey = String(env.TURNSTILE_SITE_KEY || "").trim();
    const secretKey = String(env.TURNSTILE_SECRET_KEY || "").trim();
    const hostnames = new Set(String(env.TURNSTILE_HOSTNAMES || "")
        .split(",").map(value => value.trim().toLowerCase()).filter(Boolean));
    const dummyKey = value => /^[123]x0{15,}/.test(value);
    const configValid = ["true", "false"].includes(flag) && (!enabled || (
        siteKey && secretKey && hostnames.size > 0 &&
        [...hostnames].every(host => /^[a-z0-9.-]+$/.test(host)) &&
        !(env.NODE_ENV === "production" && (dummyKey(siteKey) || dummyKey(secretKey)))
    ));

    function unavailable(res) {
        return res.status(503).json({ success: false, code: "SECURITY_UNAVAILABLE",
            message: "التحقق الأمني غير متاح حاليًا. حاول بعد قليل أو تواصل معنا مباشرة." });
    }

    function publicConfig(req, res) {
        res.set("Cache-Control", "no-store");
        if (!configValid) return unavailable(res);
        return res.json({ success: true, turnstile: {
            enabled, siteKey: enabled ? siteKey : "", action: BOOKING_ACTION
        } });
    }

    async function verify(req, res, next) {
        if (!configValid) return unavailable(res);
        if (!enabled) return next(); // تعطيل صريح من إعدادات الخادم فقط، للتفعيل المرحلي.
        const token = req.body?.turnstileToken;
        const reject = () => res.status(403).json({ success: false,
            code: "TURNSTILE_REJECTED",
            message: "لم يكتمل التحقق الأمني أو انتهت صلاحيته. أعد التحقق ثم حاول مجددًا." });
        if (typeof token !== "string" || !token.trim() || token.length > 2048) return reject();
        try {
            const response = await fetchImpl(VERIFY_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ secret: secretKey, response: token }),
                signal: AbortSignal.timeout(8000),
                redirect: "error"
            });
            if (!response.ok) return unavailable(res);
            const result = await response.json();
            if (!result || typeof result !== "object") return unavailable(res);
            const errors = Array.isArray(result["error-codes"]) ? result["error-codes"] : [];
            if (errors.some(code => ["missing-input-secret", "invalid-input-secret", "internal-error"].includes(code))) {
                return unavailable(res);
            }
            const issuedAt = Date.parse(result.challenge_ts);
            const age = Date.now() - issuedAt;
            if (result.success !== true || result.action !== BOOKING_ACTION ||
                !hostnames.has(String(result.hostname || "").toLowerCase()) ||
                !Number.isFinite(age) || age < -30000 || age > 300000) return reject();
            return next();
        } catch {
            // عند تعطل المزود لا يتحول الطلب تلقائيًا إلى حجز مسموح (Fail closed).
            return unavailable(res);
        }
    }
    return { publicConfig, verify };
}

module.exports = { createTurnstileProtection };
