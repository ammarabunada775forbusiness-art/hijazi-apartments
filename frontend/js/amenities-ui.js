/* =========================================================
   HIJAZI Apartments – عرض المميزات والخدمات
   =========================================================
   هذا الملف يحوّل البيانات الموجودة في js/amenities-data.js
   إلى HTML. لا تُكتب فيه أي معلومة عن الشقق؛ المعلومات كلها
   في ملف البيانات.

   يعمل في المتصفح (نافذة تفاصيل الشقة، صفحة الحجز، الرئيسية)
   ويعمل في Node عبر scripts/build-amenities.js لتوليد النص
   الثابت داخل الصفحات.
========================================================= */
(function (root) {
    "use strict";

    const DATA = typeof module !== "undefined" && module.exports
        ? require("./amenities-data.js")
        : root.HIJAZI_AMENITIES;

    const WHATSAPP_NUMBER = "962789000444";

    const TEXT = {
        ar: {
            tagSome: "بعض الشقق",
            tagFree: "مجانًا عند الطلب",
            tagPaid: "برسوم إضافية",
            tagVaries: "حسب الشقة",
            legendTitle: "دليل الرموز",
            legendAll: "بدون إشارة: متوفر في جميع الشقق",
            legendSome: "متوفر في بعض الشقق فقط",
            legendFree: "مجاني، يُجهَّز عند طلبك",
            legendPaid: "خدمة متاحة مقابل رسوم",
            navHighlights: "أهم المميزات",
            navUnits: "الشقق",
            navServices: "المجاني والمدفوع",
            navPolicies: "سياسات الإقامة",
            navLabel: "أقسام الصفحة",
            highlightsTitle: "أهم المميزات",
            highlightsIntro: "ما يميّز الإقامة في HIJAZI Apartments، في جميع الشقق.",
            highlightsLink: "كل المميزات والخدمات",
            unitsTitle: "معلومات الشقق الأساسية",
            unitsIntro: "جميع الشقق المعروضة حاليًا على الموقع بثلاث غرف نوم، وبالمواصفات نفسها التالية:",
            perUnitTitle: "تفاصيل كل شقة",
            perUnitIntro: "توزيع الأسرّة والشرفات يختلف من شقة لأخرى. هذه تفاصيل كل شقة على حدة:",
            apartment: "شقة",
            bedroomN: "غرفة نوم",
            outdoor: "الشرفات",
            parking: "الموقف",
            viewUnit: "الصور والتوافر",
            servicesTitle: "الخدمات المجانية والخدمات المدفوعة",
            servicesIntro: "حتى تكون الصورة واضحة قبل الحجز: ما هو مشمول، وما هو مجاني عند الطلب، وما هو برسوم إضافية.",
            includedTitle: "مشمولة في الإقامة",
            freeTitle: "مجانًا عند الطلب",
            paidTitle: "خدمات برسوم إضافية",
            paidNote: "للاستفسار عن رسوم هذه الخدمات وترتيبها تواصل معنا قبل الوصول.",
            policiesTitle: "سياسات الإقامة",
            policiesIntro: "نرجو قراءة هذه السياسات قبل إتمام الحجز.",
            faqTitle: "أسئلة شائعة عن التجهيزات والخدمات",
            navFaq: "أسئلة شائعة",
            variesTitle: "مميزات تختلف حسب الشقة",
            variesText: "التدخين والحيوانات الأليفة مسموحان في شقق محددة فقط، ومحمصة الخبز والموقف الإضافي متوفران في بعض الشقق. إذا كان أحدها مهمًّا لك، اسألنا عن الشقة التي تناسبك قبل الحجز.",
            askWhatsApp: "اسألنا عبر واتساب",
            askGeneralMessage: "مرحبا HIJAZI Apartments، عندي استفسار عن مميزات الشقق.",
            panelSpecs: "مواصفات",
            panelBeds: "توزيع الأسرّة",
            panelAskTitle: "يختلف حسب الشقة",
            panelAskLead: "اسألنا عن هذه الشقة قبل الحجز بخصوص:",
            panelAskButton: "اسأل عن هذه الشقة",
            panelAskMessage: "مرحبا HIJAZI Apartments، عندي استفسار عن شقة {n} بخصوص: {topics}.",
            panelAllTitle: "متوفر في جميع الشقق",
            panelPolicies: "سياسات مهمة",
            panelMore: "كل المميزات والخدمات والسياسات",
            askSmoking: "التدخين",
            askPets: "الحيوانات الأليفة",
            askToaster: "محمصة الخبز",
            askExtraParking: "موقف سيارة إضافي",
            smokingYes: "التدخين مسموح",
            smokingNo: "التدخين غير مسموح",
            petsYes: "الحيوانات الأليفة مسموحة",
            petsNo: "الحيوانات الأليفة غير مسموحة",
            toasterYes: "محمصة خبز",
            extraParkingYes: "أكثر من موقف سيارة",
            listSeparator: "، "
        },
        en: {
            tagSome: "Some apartments",
            tagFree: "Free on request",
            tagPaid: "Extra charge",
            tagVaries: "Varies by apartment",
            legendTitle: "Key",
            legendAll: "No label: available in every apartment",
            legendSome: "Available in some apartments only",
            legendFree: "Free, prepared when you ask",
            legendPaid: "Available for an extra charge",
            navHighlights: "Highlights",
            navUnits: "Apartments",
            navServices: "Free & paid",
            navPolicies: "Stay policies",
            navLabel: "Page sections",
            highlightsTitle: "Key highlights",
            highlightsIntro: "What sets a stay at HIJAZI Apartments apart, in every apartment.",
            highlightsLink: "All amenities & services",
            unitsTitle: "Apartment basics",
            unitsIntro: "All apartments currently listed on the website have three bedrooms and share the following specifications:",
            perUnitTitle: "Details for each apartment",
            perUnitIntro: "Bed layouts and balconies differ from one apartment to another. Here are the details for each one:",
            apartment: "Apartment",
            bedroomN: "Bedroom",
            outdoor: "Outdoor",
            parking: "Parking",
            viewUnit: "Photos & availability",
            servicesTitle: "Free services and paid services",
            servicesIntro: "So everything is clear before you book: what is included, what is free on request, and what carries an extra charge.",
            includedTitle: "Included in your stay",
            freeTitle: "Free on request",
            paidTitle: "Services with an extra charge",
            paidNote: "Contact us before arrival to ask about the fees and to arrange these services.",
            policiesTitle: "Stay policies",
            policiesIntro: "Please read these policies before completing your booking.",
            faqTitle: "Common questions about amenities and services",
            navFaq: "FAQ",
            variesTitle: "Features that vary by apartment",
            variesText: "Smoking and pets are allowed in selected apartments only, and a toaster and an additional parking space are available in some apartments. If any of these matters to you, ask us which apartment suits you before booking.",
            askWhatsApp: "Ask us on WhatsApp",
            askGeneralMessage: "Hello HIJAZI Apartments, I have a question about the apartment amenities.",
            panelSpecs: "Specifications",
            panelBeds: "Bed layout",
            panelAskTitle: "Varies by apartment",
            panelAskLead: "Ask us about this apartment before booking regarding:",
            panelAskButton: "Ask about this apartment",
            panelAskMessage: "Hello HIJAZI Apartments, I have a question about apartment {n} regarding: {topics}.",
            panelAllTitle: "Available in every apartment",
            panelPolicies: "Key policies",
            panelMore: "All amenities, services & policies",
            askSmoking: "smoking",
            askPets: "pets",
            askToaster: "a toaster",
            askExtraParking: "an additional parking space",
            smokingYes: "Smoking allowed",
            smokingNo: "No smoking",
            petsYes: "Pets allowed",
            petsNo: "No pets",
            toasterYes: "Toaster",
            extraParkingYes: "More than one parking space",
            listSeparator: ", "
        }
    };

    /* ---------------------------------------------------------
       أدوات صغيرة
    --------------------------------------------------------- */
    function esc(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    function pick(obj, lang, base) {
        if (!obj) return "";
        if (base) return obj[base + (lang === "en" ? "En" : "Ar")] || "";
        return obj[lang === "en" ? "en" : "ar"] || "";
    }

    function icon(name) {
        const body = DATA.icons[name] || DATA.icons.check;
        return '<svg class="am-icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + body + "</svg>";
    }

    function tagBadge(tag, lang) {
        const t = TEXT[lang];
        const labels = { some: t.tagSome, free: t.tagFree, paid: t.tagPaid, varies: t.tagVaries };
        if (!labels[tag]) return "";
        return ' <span class="am-tag am-tag-' + tag + '">' + esc(labels[tag]) + "</span>";
    }

    function itemsList(items, lang) {
        return '<ul class="am-list">' + items.map(function (item) {
            return "<li>" + esc(pick(item, lang)) + tagBadge(item.tag, lang) + "</li>";
        }).join("") + "</ul>";
    }

    function amenitiesPageUrl(lang) {
        return lang === "en" ? "amenities-en.html" : "amenities.html";
    }

    function whatsappUrl(message) {
        return "https://wa.me/" + WHATSAPP_NUMBER + "?text=" + encodeURIComponent(message);
    }

    function sortedApartmentIds() {
        return Object.keys(DATA.apartments).map(Number).sort(function (a, b) {
            return String(DATA.apartments[a].number).localeCompare(String(DATA.apartments[b].number), "en", { numeric: true });
        });
    }

    function bedRows(facts, lang) {
        let plainIndex = 1;

        return facts.beds.map(function (entry) {
            let roomLabel;

            if (entry.room === "master") {
                roomLabel = pick(DATA.roomNames.master, lang);
            } else {
                plainIndex += 1;
                roomLabel = TEXT[lang].bedroomN + " " + plainIndex;
            }

            return { room: roomLabel, bed: pick(DATA.bedTypes[entry.bed], lang) };
        });
    }

    /* ---------------------------------------------------------
       أهم المميزات (الرئيسية + أعلى صفحة المميزات)
    --------------------------------------------------------- */
    function highlightTiles(lang) {
        return '<div class="am-highlights">' + DATA.highlights.map(function (item) {
            return '<div class="am-highlight">' +
                '<span class="am-highlight-icon">' + icon(item.icon) + "</span>" +
                '<div><h3>' + esc(pick(item, lang, "title")) + "</h3>" +
                "<p>" + esc(pick(item, lang, "text")) + "</p></div>" +
                "</div>";
        }).join("") + "</div>";
    }

    function renderHighlights(lang) {
        const t = TEXT[lang];

        return highlightTiles(lang) +
            '<div class="am-highlights-more"><a class="am-btn" href="' + amenitiesPageUrl(lang) + '">' + esc(t.highlightsLink) + "</a></div>";
    }

    /* ---------------------------------------------------------
       صفحة المميزات الكاملة
    --------------------------------------------------------- */
    function renderUnitCard(apartmentId, lang) {
        const t = TEXT[lang];
        const facts = DATA.getApartment(apartmentId);

        const beds = bedRows(facts, lang).map(function (row) {
            return "<li><span>" + esc(row.room) + "</span><strong>" + esc(row.bed) + "</strong></li>";
        }).join("");

        return '<article class="am-unit">' +
            "<h4>" + esc(t.apartment + " " + facts.number) + "</h4>" +
            '<ul class="am-unit-beds">' + beds + "</ul>" +
            '<ul class="am-unit-facts">' +
            "<li>" + icon("sun") + "<span>" + esc(DATA.outdoorLabel(facts, lang)) + "</span></li>" +
            "<li>" + icon("car") + "<span>" + esc(DATA.parkingLabel(facts, lang)) + "</span></li>" +
            "</ul>" +
            "</article>";
    }

    function renderSection(section, lang) {
        const groups = section.groups.map(function (group) {
            const note = pick(group, lang, "note");

            return '<div class="am-card" id="' + esc(group.id) + '">' +
                '<h3><span class="am-card-icon">' + icon(group.icon) + "</span>" + esc(pick(group, lang, "title")) + "</h3>" +
                itemsList(group.items, lang) +
                (note ? '<p class="am-note">' + esc(note) + "</p>" : "") +
                "</div>";
        }).join("");

        return '<section class="am-section' + (section.featured ? " am-section-featured" : "") + '" id="' + esc(section.id) + '" aria-labelledby="' + esc(section.id) + '-title">' +
            '<h2 id="' + esc(section.id) + '-title">' + esc(pick(section, lang, "title")) + "</h2>" +
            '<p class="am-intro">' + esc(pick(section, lang, "intro")) + "</p>" +
            '<div class="am-grid">' + groups + "</div>" +
            "</section>";
    }

    function renderPage(lang) {
        const t = TEXT[lang];
        const apartmentsUrl = "apartments.html";

        const navLinks = [{ id: "highlights", label: t.navHighlights }, { id: "units", label: t.navUnits }]
            .concat(DATA.sections.map(function (section) {
                return { id: section.id, label: pick(section, lang, "title") };
            }))
            .concat([{ id: "services", label: t.navServices }, { id: "policies", label: t.navPolicies }, { id: "amenities-faq", label: t.navFaq }]);

        const nav = '<nav class="am-nav" aria-label="' + esc(t.navLabel) + '"><div class="am-nav-inner">' +
            navLinks.map(function (link) {
                return '<a href="#' + esc(link.id) + '">' + esc(link.label) + "</a>";
            }).join("") + "</div></nav>";

        const highlights = '<section class="am-section" id="highlights" aria-labelledby="highlights-title">' +
            '<h2 id="highlights-title">' + esc(t.highlightsTitle) + "</h2>" +
            '<p class="am-intro">' + esc(t.highlightsIntro) + "</p>" +
            highlightTiles(lang) +
            "</section>";

        const stats = '<div class="am-stats">' + DATA.basics.map(function (item) {
            return '<div class="am-stat">' + icon(item.icon) +
                "<strong>" + esc(pick(item, lang, "value")) + "</strong>" +
                "<span>" + esc(pick(item, lang, "label")) + "</span></div>";
        }).join("") + "</div>";

        const units = '<section class="am-section" id="units" aria-labelledby="units-title">' +
            '<h2 id="units-title">' + esc(t.unitsTitle) + "</h2>" +
            '<p class="am-intro">' + esc(t.unitsIntro) + "</p>" +
            stats +
            '<div class="am-card am-card-wide">' + itemsList(DATA.basicsList, lang) + "</div>" +
            '<h3 class="am-subtitle" id="per-apartment">' + esc(t.perUnitTitle) + "</h3>" +
            '<p class="am-intro">' + esc(t.perUnitIntro) + "</p>" +
            '<div class="am-units">' + sortedApartmentIds().map(function (id) {
                return renderUnitCard(id, lang);
            }).join("") + "</div>" +
            '<div class="am-varies">' + icon("info") +
            "<div><h3>" + esc(t.variesTitle) + "</h3><p>" + esc(t.variesText) + "</p>" +
            '<p class="am-varies-actions"><a class="am-btn" href="' + esc(whatsappUrl(t.askGeneralMessage)) + '" target="_blank" rel="noopener noreferrer">' + esc(t.askWhatsApp) + "</a>" +
            '<a class="am-btn am-btn-outline" href="' + apartmentsUrl + '">' + esc(t.viewUnit) + "</a></p></div></div>" +
            "</section>";

        const legend = '<div class="am-legend" aria-label="' + esc(t.legendTitle) + '">' +
            "<strong>" + esc(t.legendTitle) + ":</strong>" +
            "<span>" + esc(t.legendAll) + "</span>" +
            '<span><span class="am-tag am-tag-some">' + esc(t.tagSome) + "</span> " + esc(t.legendSome) + "</span>" +
            '<span><span class="am-tag am-tag-free">' + esc(t.tagFree) + "</span> " + esc(t.legendFree) + "</span>" +
            '<span><span class="am-tag am-tag-paid">' + esc(t.tagPaid) + "</span> " + esc(t.legendPaid) + "</span>" +
            "</div>";

        const services = '<section class="am-section" id="services" aria-labelledby="services-title">' +
            '<h2 id="services-title">' + esc(t.servicesTitle) + "</h2>" +
            '<p class="am-intro">' + esc(t.servicesIntro) + "</p>" +
            '<div class="am-grid">' +
            '<div class="am-card am-card-included"><h3><span class="am-card-icon">' + icon("check") + "</span>" + esc(t.includedTitle) + "</h3>" + itemsList(DATA.services.included, lang) + "</div>" +
            '<div class="am-card am-card-free"><h3><span class="am-card-icon">' + icon("gift") + "</span>" + esc(t.freeTitle) + "</h3>" + itemsList(DATA.services.free, lang) + "</div>" +
            '<div class="am-card am-card-paid"><h3><span class="am-card-icon">' + icon("banknote") + "</span>" + esc(t.paidTitle) + "</h3>" + itemsList(DATA.services.paid, lang) +
            '<p class="am-note">' + esc(t.paidNote) + "</p></div>" +
            "</div></section>";

        const policies = '<section class="am-section" id="policies" aria-labelledby="policies-title">' +
            '<h2 id="policies-title">' + esc(t.policiesTitle) + "</h2>" +
            '<p class="am-intro">' + esc(t.policiesIntro) + "</p>" +
            '<ul class="am-policies">' + DATA.policies.map(function (policy) {
                return "<li>" + icon(policy.icon) + "<span>" + esc(pick(policy, lang)) + "</span></li>";
            }).join("") + "</ul></section>";

        const faq = '<section class="am-section" id="amenities-faq" aria-labelledby="amenities-faq-title">' +
            '<h2 id="amenities-faq-title">' + esc(t.faqTitle) + "</h2>" +
            '<div class="am-faq">' + DATA.faq.map(function (entry) {
                return '<div class="am-faq-item"><h3>' + esc(pick(entry, lang, "q")) + "</h3><p>" + esc(pick(entry, lang, "a")) + "</p></div>";
            }).join("") + "</div></section>";

        return [
            nav,
            highlights,
            units,
            legend,
            DATA.sections.map(function (section) { return renderSection(section, lang); }).join("\n"),
            services,
            policies,
            faq
        ].join("\n");
    }

    /* ---------------------------------------------------------
       لوحة مميزات شقة واحدة (نافذة التفاصيل + صفحة الحجز)
    --------------------------------------------------------- */
    function renderApartmentPanel(apartmentId, lang, options) {
        const t = TEXT[lang];
        const facts = DATA.getApartment(apartmentId);
        if (!facts) return "";

        const opts = options || {};

        /* specs: false = لا تكرّر المواصفات الأساسية إذا كانت الصفحة تعرضها أصلًا */
        const chips = opts.specs === false ? [] : [
            { icon: "bed", label: lang === "en" ? facts.typeLabelEn : facts.typeLabelAr },
            { icon: "area", label: DATA.areaLabel(facts, lang) },
            { icon: "users", label: DATA.guestsLabel(facts, lang) },
            { icon: "bath", label: facts.bathrooms ? (lang === "en" ? facts.bathrooms + " bathrooms" : facts.bathrooms + " حمامات") : "" },
            { icon: "sun", label: DATA.outdoorLabel(facts, lang) },
            { icon: "car", label: DATA.parkingLabel(facts, lang) }
        ];

        /* مميزات اختيارية معروفة لهذه الشقة تُعرض صراحة، وغير المحددة تذهب لصندوق "اسألنا" */
        const askTopics = [];

        if (facts.smoking === true) chips.push({ icon: "smoking", label: t.smokingYes });
        else if (facts.smoking === false) chips.push({ icon: "smoking", label: t.smokingNo });
        else askTopics.push(t.askSmoking);

        if (facts.pets === true) chips.push({ icon: "paw", label: t.petsYes });
        else if (facts.pets === false) chips.push({ icon: "paw", label: t.petsNo });
        else askTopics.push(t.askPets);

        if (facts.toaster === true) chips.push({ icon: "plug", label: t.toasterYes });
        else if (facts.toaster == null) askTopics.push(t.askToaster);

        if (facts.extraParking === true) chips.push({ icon: "car", label: t.extraParkingYes });
        else if (facts.extraParking == null) askTopics.push(t.askExtraParking);

        const visibleChips = chips.filter(function (chip) { return chip.label; });

        const chipsHtml = visibleChips.length
            ? "<" + (opts.headingTag || "h4") + ">" + esc(t.panelSpecs + " " + t.apartment.toLowerCase() + " " + facts.number) + "</" + (opts.headingTag || "h4") + ">" +
              '<ul class="am-chips">' + visibleChips.map(function (chip) {
                  return "<li>" + icon(chip.icon) + "<span>" + esc(chip.label) + "</span></li>";
              }).join("") + "</ul>"
            : "";

        const bedsHtml = '<ul class="am-unit-beds">' + bedRows(facts, lang).map(function (row) {
            return "<li><span>" + esc(row.room) + "</span><strong>" + esc(row.bed) + "</strong></li>";
        }).join("") + "</ul>";

        let askHtml = "";

        if (askTopics.length) {
            const topicsText = askTopics.join(t.listSeparator);
            const message = t.panelAskMessage.replace("{n}", facts.number).replace("{topics}", topicsText);

            askHtml = '<div class="am-ask">' + icon("info") +
                "<div><strong>" + esc(t.panelAskTitle) + "</strong>" +
                "<p>" + esc(t.panelAskLead + " " + topicsText) + ".</p>" +
                '<a href="' + esc(whatsappUrl(message)) + '" target="_blank" rel="noopener noreferrer">' + esc(t.panelAskButton) + "</a></div></div>";
        }

        const commonGroups = [];

        DATA.sections.forEach(function (section) {
            section.groups.forEach(function (group) {
                const items = group.items.filter(function (item) {
                    return !item.tag || item.tag === "free" || item.tag === "paid";
                });

                if (!items.length) return;

                commonGroups.push(
                    '<details class="am-details">' +
                    "<summary>" + icon(group.icon) + "<span>" + esc(pick(group, lang, "title")) + "</span></summary>" +
                    itemsList(items, lang) +
                    "</details>"
                );
            });
        });

        const keyPolicies = '<ul class="am-policies am-policies-compact">' + DATA.policies.filter(function (policy) {
            return policy.key;
        }).map(function (policy) {
            return "<li>" + icon(policy.icon) + "<span>" + esc(pick(policy, lang)) + "</span></li>";
        }).join("") + "</ul>";

        const heading = opts.headingTag || "h4";

        return '<div class="am-panel">' +
            chipsHtml +
            "<" + heading + ">" + esc(t.panelBeds) + "</" + heading + ">" +
            bedsHtml +
            askHtml +
            "<" + heading + ">" + esc(t.panelAllTitle) + "</" + heading + ">" +
            '<div class="am-details-list">' + commonGroups.join("") + "</div>" +
            "<" + heading + ">" + esc(t.panelPolicies) + "</" + heading + ">" +
            keyPolicies +
            '<a class="am-more-link" href="' + amenitiesPageUrl(lang) + '" target="_blank" rel="noopener">' + esc(t.panelMore) + (lang === "en" ? " →" : " ←") + "</a>" +
            "</div>";
    }

    /* ملخص السياسات المهمة (صفحة الحجز) */
    function renderKeyPolicies(lang) {
        const t = TEXT[lang];

        return '<div class="am-panel am-panel-policies">' +
            "<h4>" + esc(t.panelPolicies) + "</h4>" +
            '<ul class="am-policies am-policies-compact">' + DATA.policies.filter(function (policy) {
                return policy.key;
            }).map(function (policy) {
                return "<li>" + icon(policy.icon) + "<span>" + esc(pick(policy, lang)) + "</span></li>";
            }).join("") + "</ul>" +
            '<a class="am-more-link" href="' + amenitiesPageUrl(lang) + '#policies" target="_blank" rel="noopener">' + esc(t.policiesTitle) + (lang === "en" ? " →" : " ←") + "</a>" +
            "</div>";
    }

    const api = {
        renderPage: renderPage,
        renderHighlights: renderHighlights,
        renderApartmentPanel: renderApartmentPanel,
        renderKeyPolicies: renderKeyPolicies,
        amenitiesPageUrl: amenitiesPageUrl
    };

    root.HijaziAmenitiesUI = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
