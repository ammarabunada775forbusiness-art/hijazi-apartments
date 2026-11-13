/* =========================================================
   نموذج حجز شقة / APARTMENT RESERVATION FORM

   نرسم بيانات الحجز فوق صورة النموذج الفاضي الذي اعتمده المالك
   (images/reservation-form-template.jpg) ونطلع صورة PNG
   للطباعة أو الإرسال للعميل على واتساب.
   fieldsFromBooking دالة بحتة تُختبر في Node.
========================================================= */
(function (root) {
    "use strict";

    const TEMPLATE = Object.freeze({ src: "images/reservation-form-template.jpg", width: 1536, height: 1024 });
    const FONT_FAMILY = "HijaziReservationForm";
    const FONT_SRC = "fonts/barlow-semi-condensed-500.woff2";
    const FONT_STACK = `"${FONT_FAMILY}", "Segoe UI", Tahoma, Arial, sans-serif`;
    const OUTPUT_SCALE = 2;
    const DEFAULT_SECURITY_DEPOSIT = 200;
    const EMPTY = "—";

    const PAYMENT_METHODS = Object.freeze({
        CASH: "CASH",
        CLIQ: "CLIQ",
        BANK_TRANSFER: "BANK TRANSFER",
        CARD: "CARD"
    });

    const GENDERS = Object.freeze({ M: "MALE", F: "FEMALE", X: "UNSPECIFIED" });

    /*
       مكان كل قيمة: بداية ونهاية الخط الذي تُكتب فوقه وارتفاعه،
       بالبكسل على صورة النموذج الأصلية (1536 × 1024).
    */
    const FIELD_LINES = Object.freeze({
        date: { x0: 1240, x1: 1489, y: 163, size: 30, align: "center" },

        fullName: { x0: 341, x1: 812, y: 272 },
        nationality: { x0: 341, x1: 812, y: 310 },
        passportNumber: { x0: 341, x1: 812, y: 347 },
        dateOfBirth: { x0: 341, x1: 812, y: 384 },
        gender: { x0: 341, x1: 812, y: 422 },

        passportIssueDate: { x0: 1211, x1: 1488, y: 272 },
        passportExpiryDate: { x0: 1211, x1: 1488, y: 307 },
        contact: { x0: 1211, x1: 1488, y: 340 },
        email: { x0: 1211, x1: 1488, y: 373 },
        placeOfBirth: { x0: 1211, x1: 1488, y: 407 },
        address: { x0: 1211, x1: 1488, y: 440 },

        checkIn: { x0: 381, x1: 773, y: 536 },
        checkOut: { x0: 381, x1: 773, y: 571 },
        lengthOfStay: { x0: 381, x1: 773, y: 605 },
        apartmentNumber: { x0: 381, x1: 773, y: 642 },
        guests: { x0: 381, x1: 773, y: 681 },

        reference: { x0: 1184, x1: 1489, y: 537 },
        ratePerNight: { x0: 1184, x1: 1489, y: 570 },
        totalRent: { x0: 1184, x1: 1489, y: 601 },
        securityDeposit: { x0: 1184, x1: 1489, y: 634 },
        totalPaid: { x0: 1184, x1: 1489, y: 666 },
        paymentMethod: { x0: 1184, x1: 1489, y: 697 }
    });

    function dateKey(value) {
        if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
        const key = String(value || "").slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : "";
    }

    function ammanDateKey(value) {
        const date = value instanceof Date ? value : new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Amman",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(date);
    }

    /* 2026-10-25 ← 25 / 10 / 2026 مثل النموذج */
    function displayDate(value) {
        const key = dateKey(value);
        if (!key) return "";
        const [year, month, day] = key.split("-");
        return `${day} / ${month} / ${year}`;
    }

    function nightsBetween(checkIn, checkOut) {
        const start = dateKey(checkIn);
        const end = dateKey(checkOut);
        if (!start || !end) return 0;
        return Math.max(0, Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000));
    }

    function hasNumber(value) {
        return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
    }

    function money(value, currency) {
        if (!hasNumber(value)) return "";
        const amount = Number(value).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
        return `${amount} ${currency}`;
    }

    function upper(value) {
        return String(value || "").replace(/\s+/g, " ").trim().toUpperCase();
    }

    /* رقم الحجز حسب تاريخ الدخول ورقم الشقة: HA-25102026-104 */
    function referenceFor(booking, apartmentNumber) {
        const key = dateKey(booking && booking.checkIn);
        if (!key) return "";
        const [year, month, day] = key.split("-");
        const apartment = String(apartmentNumber || (booking && booking.apartmentId) || "").trim();
        return `HA-${day}${month}${year}${apartment ? `-${apartment}` : ""}`;
    }

    /* بيانات الحجز ← نصوص النموذج كما ستُطبع */
    function fieldsFromBooking(booking, options = {}) {
        const guestDocument = booking.guestDocument || {};
        const nights = nightsBetween(booking.checkIn, booking.checkOut);
        const currency = upper(booking.currency) || "JOD";
        const totalRent = hasNumber(booking.totalPrice) ? Number(booking.totalPrice) : 0;
        const deposit = hasNumber(booking.securityDeposit)
            ? Number(booking.securityDeposit)
            : DEFAULT_SECURITY_DEPOSIT;
        const rate = hasNumber(booking.nightlyRate)
            ? Number(booking.nightlyRate)
            : (nights > 0 && totalRent > 0 ? totalRent / nights : null);
        const paid = hasNumber(booking.amountPaid) ? Number(booking.amountPaid) : totalRent + deposit;
        const guests = Number(booking.adults || 0) + Number(booking.children || 0);
        const apartmentNumber = String(options.apartmentNumber || booking.apartmentId || "");

        return {
            date: displayDate(ammanDateKey(booking.createdAt || options.now || new Date())),
            fullName: upper(booking.fullName),
            nationality: upper(guestDocument.nationality),
            passportNumber: upper(guestDocument.passportNumber),
            dateOfBirth: displayDate(guestDocument.dateOfBirth),
            gender: GENDERS[guestDocument.gender] || "",
            passportIssueDate: displayDate(guestDocument.passportIssueDate),
            passportExpiryDate: displayDate(guestDocument.passportExpiryDate),
            contact: String(booking.phone || "").trim(),
            email: String(booking.email || "").trim().toLowerCase(),
            placeOfBirth: upper(guestDocument.placeOfBirth),
            address: upper(guestDocument.address),
            checkIn: displayDate(booking.checkIn),
            checkOut: displayDate(booking.checkOut),
            lengthOfStay: nights > 0 ? `${nights} ${nights === 1 ? "NIGHT" : "NIGHTS"}` : "",
            apartmentNumber,
            guests: guests > 0 ? String(guests) : "",
            reference: referenceFor(booking, apartmentNumber),
            ratePerNight: money(rate, currency),
            totalRent: totalRent > 0 ? money(totalRent, currency) : "",
            securityDeposit: money(deposit, currency),
            totalPaid: money(paid, currency),
            paymentMethod: PAYMENT_METHODS[booking.paymentMethod] || PAYMENT_METHODS.CASH
        };
    }

    /* ===================== الرسم في المتصفح ===================== */
    let templatePromise = null;
    let fontPromise = null;

    function loadTemplate() {
        if (!templatePromise) {
            templatePromise = new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = () => {
                    templatePromise = null;
                    reject(new Error("تعذر تحميل صورة نموذج الحجز."));
                };
                image.src = TEMPLATE.src;
            });
        }
        return templatePromise;
    }

    /* إذا الخط ما تحمّل نكمل بخط النظام بدل ما نوقف الطباعة */
    function loadFont() {
        if (!fontPromise) {
            fontPromise = (async () => {
                try {
                    if (!root.FontFace || !root.document || !root.document.fonts) return;
                    const face = new root.FontFace(FONT_FAMILY, `url("${FONT_SRC}") format("woff2")`, { weight: "500" });
                    await face.load();
                    root.document.fonts.add(face);
                } catch (error) {
                    // خط بديل
                }
            })();
        }
        return fontPromise;
    }

    function drawValue(context, value, line) {
        const text = String(value || "").trim() || EMPTY;
        const isArabic = /[؀-ۿ]/.test(text);
        const maxWidth = line.x1 - line.x0 - 8;
        let size = line.size || 22;

        context.direction = isArabic ? "rtl" : "ltr";
        context.font = `500 ${size}px ${FONT_STACK}`;

        while (size > 14 && context.measureText(text).width > maxWidth) {
            size -= 1;
            context.font = `500 ${size}px ${FONT_STACK}`;
        }

        let output = text;
        while (output.length > 1 && context.measureText(output).width > maxWidth) {
            output = `${output.slice(0, -2).trimEnd()}…`;
        }

        const y = line.y - 9;

        if (line.align === "center") {
            context.textAlign = "center";
            context.fillText(output, (line.x0 + line.x1) / 2, y);
        } else if (isArabic) {
            context.textAlign = "right";
            context.fillText(output, line.x1 - 4, y);
        } else {
            context.textAlign = "left";
            context.fillText(output, line.x0 + 4, y);
        }
    }

    async function renderCanvas(fields) {
        const [template] = await Promise.all([loadTemplate(), loadFont()]);
        const canvas = root.document.createElement("canvas");
        canvas.width = TEMPLATE.width * OUTPUT_SCALE;
        canvas.height = TEMPLATE.height * OUTPUT_SCALE;

        const context = canvas.getContext("2d");
        context.imageSmoothingQuality = "high";
        context.drawImage(template, 0, 0, canvas.width, canvas.height);
        context.scale(canvas.width / TEMPLATE.width, canvas.height / TEMPLATE.height);
        context.fillStyle = "#1d2433";
        context.textBaseline = "alphabetic";

        Object.entries(FIELD_LINES).forEach(([key, line]) => drawValue(context, fields[key], line));
        return canvas;
    }

    function canvasToBlob(canvas) {
        return new Promise((resolve, reject) => {
            canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error("تعذر تجهيز صورة النموذج."))), "image/png");
        });
    }

    /* يجهز صورة النموذج لحجز واحد */
    async function create(booking, options = {}) {
        const fields = fieldsFromBooking(booking, options);
        const canvas = await renderCanvas(fields);
        const blob = await canvasToBlob(canvas);
        const name = fields.reference || "reservation";

        return {
            fields,
            blob,
            fileName: `HIJAZI-${name}.png`,
            url: URL.createObjectURL(blob)
        };
    }

    /* نجهز صورة الطباعة مسبقًا (مخفية) حتى تشتغل الطباعة فورًا عند الضغط */
    function preparePrint(form) {
        let area = root.document.getElementById("reservationPrintArea");

        if (!area) {
            area = root.document.createElement("div");
            area.id = "reservationPrintArea";
            const image = root.document.createElement("img");
            image.alt = "نموذج حجز شقة";
            area.appendChild(image);
            root.document.body.appendChild(area);
        }

        const image = area.querySelector("img");
        if (image.getAttribute("src") !== form.url) image.src = form.url;
        return image;
    }

    /* الطباعة: نطبع الصورة وحدها على ورقة A4 بالعرض */
    function print(form) {
        const body = root.document.body;
        const image = preparePrint(form);
        const startPrint = () => {
            body.classList.add("printing-reservation-form");
            const done = () => {
                body.classList.remove("printing-reservation-form");
                root.removeEventListener("afterprint", done);
            };
            root.addEventListener("afterprint", done);
            root.print();
            setTimeout(done, 60000);
        };

        if (image.complete && image.naturalWidth) {
            startPrint();
        } else {
            image.onload = () => {
                image.onload = null;
                startPrint();
            };
        }
    }

    function download(form) {
        const link = root.document.createElement("a");
        link.href = form.url;
        link.download = form.fileName;
        root.document.body.appendChild(link);
        link.click();
        link.remove();
    }

    /* المشاركة (واتساب وغيره) من الجوال؛ إذا المتصفح ما بدعمها ننزل الصورة */
    async function share(form) {
        const file = new File([form.blob], form.fileName, { type: "image/png" });

        if (root.navigator && root.navigator.canShare && root.navigator.canShare({ files: [file] })) {
            try {
                await root.navigator.share({ files: [file], title: "HIJAZI Apartments – Reservation Form" });
                return "shared";
            } catch (error) {
                if (error && error.name === "AbortError") return "cancelled";
                throw error;
            }
        }

        download(form);
        return "downloaded";
    }

    function release(form) {
        if (form && form.url) URL.revokeObjectURL(form.url);
    }

    const api = {
        FIELD_LINES,
        PAYMENT_METHODS,
        DEFAULT_SECURITY_DEPOSIT,
        fieldsFromBooking,
        referenceFor,
        displayDate,
        nightsBetween,
        create,
        preparePrint,
        print,
        share,
        download,
        release
    };

    if (typeof module === "object" && module.exports) module.exports = api;
    else root.HijaziReservationForm = api;
})(typeof window !== "undefined" ? window : globalThis);
