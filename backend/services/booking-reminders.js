const DAY_MS = 24 * 60 * 60 * 1000;
const AMMAN_TIME_ZONE = "Asia/Amman";

const SCHEDULE = Object.freeze([
    { kind: "checkout", daysUntil: 0, label: "الخروج اليوم" },
    { kind: "checkin", daysUntil: 0, label: "الدخول اليوم" },
    { kind: "checkout", daysUntil: 1, label: "الخروج غدًا" },
    { kind: "checkin", daysUntil: 1, label: "الدخول غدًا" },
    { kind: "checkin", daysUntil: 3, label: "الدخول بعد 3 أيام" }
]);

function dateKey(value) {
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
    }

    const key = String(value || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : "";
}

function ammanDateKey(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: AMMAN_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function isReminderSendTime(now = new Date()) {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: AMMAN_TIME_ZONE,
        hour: "2-digit",
        hourCycle: "h23"
    }).formatToParts(now);
    return Number(parts.find(part => part.type === "hour").value) >= 9;
}

function daysBetween(today, target) {
    if (!today || !target) return NaN;
    return (Date.parse(`${target}T00:00:00Z`) -
        Date.parse(`${today}T00:00:00Z`)) / DAY_MS;
}

function dueReminders(bookings, now = new Date()) {
    const today = ammanDateKey(now);
    const reminders = [];

    for (const booking of bookings) {
        if (booking.status !== "confirmed") continue;

        for (const step of SCHEDULE) {
            const targetDate = dateKey(
                step.kind === "checkin" ? booking.checkIn : booking.checkOut
            );

            if (daysBetween(today, targetDate) !== step.daysUntil) continue;

            reminders.push({
                booking,
                bookingId: String(booking._id),
                kind: step.kind,
                daysUntil: step.daysUntil,
                label: step.label,
                targetDate,
                key: `${step.kind}:${targetDate}:${step.daysUntil}`
            });
        }
    }

    return reminders.sort((first, second) =>
        SCHEDULE.findIndex(step => step.label === first.label) -
        SCHEDULE.findIndex(step => step.label === second.label) ||
        Number(first.booking.apartmentId) - Number(second.booking.apartmentId) ||
        first.bookingId.localeCompare(second.bookingId)
    );
}

function serializeReminder(reminder) {
    const { booking } = reminder;
    return {
        bookingId: reminder.bookingId,
        apartmentId: booking.apartmentId,
        apartmentLabel: booking.apartmentLabel,
        fullName: booking.fullName,
        phone: booking.phone,
        source: booking.source,
        kind: reminder.kind,
        daysUntil: reminder.daysUntil,
        label: reminder.label,
        targetDate: reminder.targetDate
    };
}

async function deliverReminders(reminders, { claim, send, release }) {
    let sent = 0;
    const errors = [];

    for (const reminder of reminders) {
        if (!await claim(reminder)) continue;

        try {
            await send(reminder);
            sent += 1;
        } catch (error) {
            try {
                await release(reminder);
            } catch (releaseError) {
                errors.push(releaseError);
            }
            errors.push(error);
        }
    }

    return { sent, errors };
}

module.exports = {
    ammanDateKey,
    isReminderSendTime,
    dueReminders,
    serializeReminder,
    deliverReminders
};
