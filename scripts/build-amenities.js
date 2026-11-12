#!/usr/bin/env node
/* =========================================================
   HIJAZI Apartments – توليد النص الثابت لصفحات المميزات
   =========================================================
   المصدر:  frontend/js/amenities-data.js
   الناتج:  الأجزاء المحصورة بين العلامات داخل الصفحات:
            <!-- NAME:START --> ... <!-- NAME:END -->

   الاستخدام (من جذر المشروع):
       node scripts/build-amenities.js          يحدّث الصفحات
       node scripts/build-amenities.js --check  يفحص فقط (يُستخدم في الاختبارات)

   لماذا؟ حتى تبقى المعلومات مكتوبة مرة واحدة في ملف البيانات،
   ويبقى النص موجودًا داخل HTML نفسه ليقرأه Google ومحركات
   الذكاء الاصطناعي دون الحاجة إلى تشغيل JavaScript.
========================================================= */
const fs = require("node:fs");
const path = require("node:path");

const FRONTEND = path.join(__dirname, "..", "frontend");
const data = require(path.join(FRONTEND, "js", "amenities-data.js"));
const ui = require(path.join(FRONTEND, "js", "amenities-ui.js"));

const SITE = "https://www.hijazi-apartments.com";
const IMAGE = SITE + "/images/apartments/apt-1/living/1.webp";

const PAGE = {
    ar: {
        file: "amenities.html",
        name: "مميزات وتجهيزات وخدمات الشقق | HIJAZI Apartments",
        description: "كل تجهيزات وخدمات شقق HIJAZI Apartments في الشميساني بعمّان: 220 م²، 3 غرف نوم، إنترنت Fiber، تدفئة مركزية، 5 مكيفات، موقف سيارة، تنظيف دوري مجاني، وسياسات الإقامة.",
        home: "الرئيسية",
        crumb: "المميزات والخدمات",
        apartmentName: "شقة مفروشة 3 غرف نوم – HIJAZI Apartments"
    },
    en: {
        file: "amenities-en.html",
        name: "Apartment Amenities & Facilities | HIJAZI Apartments Amman",
        description: "Everything included at HIJAZI Apartments in Shmeisani, Amman: 220 m², 3 bedrooms, fiber internet, central heating, 5 air conditioners, parking, free housekeeping and stay policies.",
        home: "Home",
        crumb: "Amenities & services",
        apartmentName: "3-bedroom furnished apartment – HIJAZI Apartments"
    }
};

/* المجموعات التي تدخل عناصرها في amenityFeature داخل البيانات المنظمة */
const SCHEMA_GROUPS = ["internet", "climate", "appliances", "parking", "security", "access", "cleaning", "laundry", "reception"];

function pick(obj, lang) {
    return obj[lang === "en" ? "en" : "ar"];
}

function amenityFeatures(lang) {
    const names = [];

    data.basicsList.forEach(item => names.push(pick(item, lang)));

    data.sections.forEach(section => {
        section.groups.forEach(group => {
            if (!SCHEMA_GROUPS.includes(group.id)) return;

            group.items.forEach(item => {
                /* فقط ما هو متوفر في جميع الشقق ودون رسوم */
                if (item.tag) return;
                names.push(pick(item, lang));
            });
        });
    });

    return [...new Set(names)].map(name => ({
        "@type": "LocationFeatureSpecification",
        name,
        value: true
    }));
}

function buildSchema(lang) {
    const page = PAGE[lang];
    const url = `${SITE}/${page.file}`;
    const type = data.unitTypes[3];
    const features = amenityFeatures(lang);

    const graph = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "WebPage",
                "@id": `${url}#webpage`,
                url,
                name: page.name,
                description: page.description,
                inLanguage: lang,
                isPartOf: { "@id": `${SITE}/#website` },
                about: { "@id": `${SITE}/#business` },
                breadcrumb: { "@id": `${url}#breadcrumb` },
                primaryImageOfPage: IMAGE
            },
            {
                "@type": "BreadcrumbList",
                "@id": `${url}#breadcrumb`,
                itemListElement: [
                    { "@type": "ListItem", position: 1, name: page.home, item: `${SITE}/` },
                    { "@type": "ListItem", position: 2, name: page.crumb, item: url }
                ]
            },
            {
                "@type": "LodgingBusiness",
                "@id": `${SITE}/#business`,
                name: "HIJAZI Apartments",
                alternateName: "شقق حجازي المفروشة",
                url: `${SITE}/`,
                telephone: "+962789000444",
                email: "info@hijazi-apartments.com",
                image: IMAGE,
                address: {
                    "@type": "PostalAddress",
                    streetAddress: "Shmeisani",
                    addressLocality: "Amman",
                    addressRegion: "Amman",
                    addressCountry: "JO"
                },
                areaServed: ["Shmeisani", "Abdali", "Amman"],
                checkoutTime: "12:00",
                amenityFeature: features,
                containsPlace: { "@id": `${url}#apartment` }
            },
            {
                "@type": "Apartment",
                "@id": `${url}#apartment`,
                name: page.apartmentName,
                numberOfBedrooms: 3,
                numberOfBathroomsTotal: type.bathrooms,
                floorSize: { "@type": "QuantitativeValue", value: type.areaSqm, unitCode: "MTK" },
                occupancy: { "@type": "QuantitativeValue", minValue: type.guestsMin, maxValue: type.guestsMax },
                amenityFeature: features,
                containedInPlace: { "@id": `${SITE}/#business` }
            },
            {
                "@type": "FAQPage",
                "@id": `${url}#faq`,
                inLanguage: lang,
                mainEntity: data.faq.map(entry => ({
                    "@type": "Question",
                    name: lang === "en" ? entry.qEn : entry.qAr,
                    acceptedAnswer: { "@type": "Answer", text: lang === "en" ? entry.aEn : entry.aAr }
                }))
            }
        ]
    };

    /* منع إغلاق وسم script من داخل النص */
    const json = JSON.stringify(graph, null, 2).replace(/</g, "\\u003c");

    return `<script type="application/ld+json">\n${json}\n    </script>`;
}

const TARGETS = [
    { file: "amenities.html", blocks: { "AMENITIES-SCHEMA": buildSchema("ar"), AMENITIES: ui.renderPage("ar") } },
    { file: "amenities-en.html", blocks: { "AMENITIES-SCHEMA": buildSchema("en"), AMENITIES: ui.renderPage("en") } },
    { file: "index.html", blocks: { HIGHLIGHTS: ui.renderHighlights("ar") } }
];

function applyBlocks(html, blocks, file) {
    let output = html;

    for (const [name, content] of Object.entries(blocks)) {
        const pattern = new RegExp(`(<!-- ${name}:START[^>]*-->)[\\s\\S]*?(<!-- ${name}:END -->)`);

        if (!pattern.test(output)) {
            throw new Error(`${file}: لم أجد العلامة <!-- ${name}:START --> ... <!-- ${name}:END -->`);
        }

        output = output.replace(pattern, (match, start, end) => `${start}\n${content}\n${end}`);
    }

    return output;
}

function build({ check = false } = {}) {
    const stale = [];

    for (const target of TARGETS) {
        const filePath = path.join(FRONTEND, target.file);
        const current = fs.readFileSync(filePath, "utf8");
        const next = applyBlocks(current, target.blocks, target.file);

        if (next !== current) {
            stale.push(target.file);
            if (!check) fs.writeFileSync(filePath, next);
        }
    }

    return stale;
}

module.exports = { build };

if (require.main === module) {
    const check = process.argv.includes("--check");
    const stale = build({ check });

    if (check && stale.length) {
        console.error(`هذه الصفحات غير محدّثة: ${stale.join(", ")}\nشغّل: node scripts/build-amenities.js`);
        process.exit(1);
    }

    console.log(stale.length
        ? `${check ? "تحتاج تحديث" : "تم تحديث"}: ${stale.join(", ")}`
        : "كل الصفحات محدّثة.");
}
