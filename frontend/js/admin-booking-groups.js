(function (root) {
    "use strict";

    const ORDER = ["confirmed", "pending", "completed", "cancelled", "blocked"];

    function dateKey(value) {
        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? "" : value.toISOString().slice(0, 10);
        }

        const key = String(value || "").slice(0, 10);
        return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : "";
    }

    function groupFor(booking, today) {
        const status = booking.status || "pending";

        if (status === "cancelled") return "cancelled";
        if (status === "blocked") return "blocked";

        // Checkout is the departure morning, so the stay has ended on this date.
        if (status === "confirmed" && dateKey(booking.checkOut) &&
            dateKey(booking.checkOut) <= today) {
            return "completed";
        }

        return status === "confirmed" ? "confirmed" : "pending";
    }

    function compareDates(first, second, descending = false) {
        const a = dateKey(first);
        const b = dateKey(second);
        // Missing dates go last in either direction.
        if (!a) return b ? 1 : 0;
        if (!b) return -1;
        return descending ? b.localeCompare(a) : a.localeCompare(b);
    }

    function compareTimestamps(first, second) {
        const a = Date.parse(first || "");
        const b = Date.parse(second || "");
        if (Number.isNaN(a)) return Number.isNaN(b) ? 0 : 1;
        if (Number.isNaN(b)) return -1;
        return b - a;
    }

    function sortGroup(bookings, key, today) {
        return [...bookings].sort((first, second) => {
            let difference = 0;

            if (key === "completed") {
                difference = compareDates(first.checkOut, second.checkOut, true);
            } else if (key === "cancelled") {
                difference = compareTimestamps(
                    first.cancelledAt || first.updatedAt,
                    second.cancelledAt || second.updatedAt
                );
            } else {
                if (key === "confirmed") {
                    const firstDate = dateKey(first.checkIn);
                    const secondDate = dateKey(second.checkIn);
                    const firstIsCurrent = Boolean(firstDate && firstDate <= today);
                    const secondIsCurrent = Boolean(secondDate && secondDate <= today);
                    if (firstIsCurrent !== secondIsCurrent) return firstIsCurrent ? -1 : 1;
                    if (firstIsCurrent) {
                        difference = compareDates(first.checkOut, second.checkOut);
                    }
                }

                difference ||= compareDates(first.checkIn, second.checkIn);
            }

            return difference || compareTimestamps(first.createdAt, second.createdAt) ||
                String(first._id || "").localeCompare(String(second._id || ""));
        });
    }

    function group(bookings, today) {
        const groups = Object.fromEntries(ORDER.map(key => [key, []]));

        for (const booking of bookings) {
            groups[groupFor(booking, today)].push(booking);
        }

        for (const key of ORDER) {
            groups[key] = sortGroup(groups[key], key, today);
        }

        return groups;
    }

    const api = Object.freeze({ groupFor, group });
    root.HijaziBookingGroups = api;
    if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
