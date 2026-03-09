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
    bookingForm.addEventListener("submit", e => {
        e.preventDefault();
        alert("تم إرسال الحجز! سيتم التأكيد لاحقاً.");
        bookingForm.reset();
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