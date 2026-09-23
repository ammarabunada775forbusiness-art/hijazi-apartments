(function (window, document) {
    "use strict";

    function nextDateKey(value) {
        const dateKey = value ? String(value).slice(0, 10) : "";
        if (!dateKey) return "";

        const date = new Date(`${dateKey}T00:00:00Z`);
        if (Number.isNaN(date.getTime())) return "";

        date.setUTCDate(date.getUTCDate() + 1);
        return date.toISOString().slice(0, 10);
    }

    function closeMonthMenus(exceptMenu) {
        document
            .querySelectorAll(".hijazi-month-menu:not([hidden])")
            .forEach(menu => {
                if (menu === exceptMenu) return;

                menu.hidden = true;
                menu
                    .closest(".hijazi-glass-calendar")
                    ?.querySelector(".hijazi-month-trigger")
                    ?.setAttribute("aria-expanded", "false");
            });
    }

    function installMonthPicker(instance) {
        const calendar = instance.calendarContainer;
        const currentMonth = calendar.querySelector(
            ".flatpickr-current-month"
        );
        const nativeLabel = currentMonth?.querySelector(".cur-month");

        if (!currentMonth || !nativeLabel) return;
        if (calendar.querySelector(".hijazi-month-trigger")) return;

        nativeLabel.classList.add("hijazi-native-month-label");

        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "hijazi-month-trigger";
        trigger.setAttribute("aria-haspopup", "listbox");
        trigger.setAttribute("aria-expanded", "false");
        trigger.setAttribute("aria-label", "اختيار الشهر");

        const menu = document.createElement("div");
        menu.className = "hijazi-month-menu";
        menu.setAttribute("role", "listbox");
        menu.setAttribute("aria-label", "الأشهر");
        menu.hidden = true;

        const monthNames = instance.l10n.months.longhand;

        monthNames.forEach((monthName, monthIndex) => {
            const option = document.createElement("button");
            option.type = "button";
            option.className = "hijazi-month-option";
            option.textContent = monthName;
            option.dataset.month = String(monthIndex);
            option.setAttribute("role", "option");

            option.addEventListener("click", event => {
                event.stopPropagation();
                instance.changeMonth(monthIndex, false);
                menu.hidden = true;
                trigger.setAttribute("aria-expanded", "false");
            });

            menu.appendChild(option);
        });

        function updateMonthPicker() {
            trigger.textContent = monthNames[instance.currentMonth];

            menu
                .querySelectorAll(".hijazi-month-option")
                .forEach(option => {
                    const selected =
                        Number(option.dataset.month) ===
                        instance.currentMonth;

                    option.classList.toggle("is-selected", selected);
                    option.setAttribute(
                        "aria-selected",
                        selected ? "true" : "false"
                    );
                });
        }

        trigger.addEventListener("click", event => {
            event.stopPropagation();

            const willOpen = menu.hidden;
            closeMonthMenus(menu);
            menu.hidden = !willOpen;
            trigger.setAttribute(
                "aria-expanded",
                willOpen ? "true" : "false"
            );

            if (willOpen) {
                menu
                    .querySelector(".is-selected")
                    ?.scrollIntoView({ block: "nearest" });
            }
        });

        menu.addEventListener("click", event => {
            event.stopPropagation();
        });

        nativeLabel.insertAdjacentElement("afterend", trigger);
        calendar.appendChild(menu);

        instance.config.onMonthChange.push(updateMonthPicker);
        instance.config.onYearChange.push(updateMonthPicker);
        instance.config.onOpen.push(updateMonthPicker);
        instance.config.onClose.push(() => {
            menu.hidden = true;
            trigger.setAttribute("aria-expanded", "false");
        });

        updateMonthPicker();
    }

    function create(input, options = {}) {
        if (!input || typeof window.flatpickr === "undefined") {
            return null;
        }

        if (input._flatpickr) return input._flatpickr;

        const locale = options.locale || "default";
        const config = {
            dateFormat: "Y-m-d",
            locale,
            disableMobile: true,
            allowInput: false,
            clickOpens: true,
            monthSelectorType: "static",

            onReady(_, __, instance) {
                instance.calendarContainer.classList.add(
                    "hijazi-glass-calendar"
                );
                installMonthPicker(instance);
            },

            onOpen(_, __, instance) {
                instance.calendarContainer.classList.add(
                    "hijazi-glass-calendar"
                );
            },

            onChange() {
                input.dispatchEvent(
                    new Event("change", { bubbles: true })
                );
            }
        };

        if (Object.prototype.hasOwnProperty.call(options, "minDate")) {
            config.minDate = options.minDate || null;
        }

        input.type = "text";
        input.classList.add("glass-date-input");
        input.setAttribute("autocomplete", "off");
        input.setAttribute("readonly", "readonly");

        return window.flatpickr(input, config);
    }

    if (!window.__hijaziMonthMenuListeners) {
        document.addEventListener("click", () => closeMonthMenus());
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") closeMonthMenus();
        });
        window.__hijaziMonthMenuListeners = true;
    }

    window.HijaziDatePicker = {
        create,
        nextDateKey
    };
})(window, document);
