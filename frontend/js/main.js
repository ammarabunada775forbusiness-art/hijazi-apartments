// تغيير العملة
const rates = { USD: 1.41, SAR: 5.29 };
const currencySelect = document.getElementById("currencySelect");
const prices = document.querySelectorAll(".price");

if (currencySelect) {
    currencySelect.addEventListener("change", () => {
        const currency = currencySelect.value;
        prices.forEach(p => {
            const jod = parseFloat(p.getAttribute("data-price"));
            if (currency === "JOD") p.textContent = `${jod} JOD`;
            else if (currency === "USD") p.textContent = `${(jod * rates.USD).toFixed(2)} USD`;
            else if (currency === "SAR") p.textContent = `${(jod * rates.SAR).toFixed(2)} SAR`;
        });
    });
}

// نموذج الحجز
const bookingForm = document.getElementById("bookingForm");

if (bookingForm) {
    bookingForm.addEventListener("submit", async e => {
        e.preventDefault();

        const formData = new FormData(bookingForm);

        const data = {
            apartmentId: Number(formData.get("apartmentId") || 1),
            apartmentLabel: formData.get("apartmentLabel") || "",
            fullName: formData.get("fullName"),
            email: formData.get("email"),
            phone: formData.get("phone"),
            checkIn: formData.get("checkIn"),
            checkOut: formData.get("checkOut"),
            adults: Number(formData.get("adults") || 1),
            children: Number(formData.get("children") || 0),
            currency: formData.get("currency") || "JOD",
            totalPrice: Number(formData.get("totalPrice") || 0),
            totalPriceText: formData.get("totalPriceText") || ""
        };

        try {
            const res = await fetch("https://hijazi-apartments-backend.onrender.com/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (result.success) {
                alert("✅ تم إرسال الحجز بنجاح!");
                bookingForm.reset();
            } else {
                alert(result.message || "حدث خطأ");
            }
        } catch (err) {
            alert("فشل الاتصال بالسيرفر");
            console.error(err);
        }
    });
}

// قراءة ID الشقة من الرابط
function getAptId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("apt") || "1";
}

// بيانات محجوزة لكل شقة (Frontend فقط)
const bookingsData = {
    1: [{ start: '2026-03-05', end: '2026-03-08' }],
    2: [{ start: '2026-03-10', end: '2026-03-12' }],
    3: [{ start: '2026-03-03', end: '2026-03-06' }],
    4: [{ start: '2026-03-08', end: '2026-03-11' }],
    5: [{ start: '2026-03-12', end: '2026-03-15' }],
    6: [{ start: '2026-03-16', end: '2026-03-20' }]
};

// FullCalendar
document.addEventListener('DOMContentLoaded', function () {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) return;

    const aptId = getAptId();
    const bookings = bookingsData[aptId] || [];

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ar',
        selectable: false,
        events: bookings.map(b => ({
            start: b.start,
            end: b.end,
            display: 'background',
            color: 'red'
        }))
    });

    calendar.render();
});