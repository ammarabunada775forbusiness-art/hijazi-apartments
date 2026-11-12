/* =========================================================
   HIJAZI Apartments – المميزات والتجهيزات والخدمات
   =========================================================
   هذا الملف هو المصدر الوحيد لكل معلومات التجهيزات والخدمات
   وسياسات الإقامة، ولمواصفات كل شقة على حدة.

   يُستخدم في:
   - صفحة المميزات (amenities.html / amenities-en.html)
   - نافذة تفاصيل الشقة في apartments.html
   - صفحة الحجز booking.html
   - قسم "أهم المميزات" في الصفحة الرئيسية

   بعد أي تعديل هنا شغّل من جذر المشروع:
       node scripts/build-amenities.js
   حتى يتحدّث النص الثابت داخل صفحات HTML (مهم لمحركات البحث).

   قواعد مهمة:
   - لا تُضِف أي ميزة غير موجودة فعليًا.
   - الميزة الموجودة في بعض الشقق فقط تأخذ  tag: "some".
   - tag: "free"  = مجانًا عند الطلب.
   - tag: "paid"  = خدمة برسوم إضافية.
   - tag: "unit"  = خاص بشقة مذكورة بالاسم (لا يظهر ضمن "متوفر في جميع الشقق").
   - القيمة null في مواصفات الشقة تعني "غير محدد بعد" ولن تُعرض
     كمعلومة مؤكدة، بل تظهر للزائر جملة "اسألنا قبل الحجز".
========================================================= */
(function (root) {
    "use strict";

    /* -----------------------------------------------------
       أنواع الشقق حسب عدد غرف النوم
       النوع المنشور حاليًا هو 3 غرف نوم فقط.
       لإضافة شقق بغرفة أو غرفتين مستقبلًا:
         1) عبّئ مواصفات النوع هنا واجعل published: true
         2) أضف الشقة في apartments بالأسفل مع bedrooms المناسب
         3) أضف رقمها وسعرها في js/main.js
            (APARTMENT_DISPLAY_NUMBERS و APARTMENT_PRICES و APARTMENT_DISPLAY_ORDER)
       عندها يظهر فلتر "نوع الشقة" تلقائيًا في صفحة الشقق.
    ----------------------------------------------------- */
    const unitTypes = {
        1: {
            published: false,
            labelAr: "غرفة نوم واحدة",
            labelEn: "1 bedroom",
            areaSqm: null,
            guestsMin: null,
            guestsMax: null,
            bathrooms: null
        },
        2: {
            published: false,
            labelAr: "غرفتا نوم",
            labelEn: "2 bedrooms",
            areaSqm: null,
            guestsMin: null,
            guestsMax: null,
            bathrooms: null
        },
        3: {
            published: true,
            labelAr: "3 غرف نوم",
            labelEn: "3 bedrooms",
            areaSqm: 220,
            guestsMin: 7,
            guestsMax: 8,
            bathrooms: 3
        }
    };

    /* -----------------------------------------------------
       أنواع الأسرّة
    ----------------------------------------------------- */
    const bedTypes = {
        king: { ar: "سرير مزدوج King", en: "King double bed" },
        queen: { ar: "سرير مزدوج Queen", en: "Queen double bed" },
        twin: { ar: "سريران مفردان Single", en: "Two single beds" }
    };

    const roomNames = {
        master: { ar: "غرفة الماستر", en: "Master bedroom" },
        bedroom: { ar: "غرفة نوم", en: "Bedroom" }
    };

    /* -----------------------------------------------------
       مواصفات كل شقة على حدة
       المفتاح = المعرّف الداخلي للشقة (نفسه في main.js)
       number  = رقم الشقة الظاهر للزائر

       balconies : عدد الشرفات
       terrace   : true إذا كان فيها تراس
       indoorGarage  : true إذا كان للشقة كراج داخلي خاص بها (شقة 204)
       smoking / pets / toaster / extraParking :
           true  = متوفر/مسموح في هذه الشقة
           false = غير متوفر/غير مسموح
           null  = لم يُحدَّد بعد (لا يظهر شيء عن هذه الميزة في صفحة الشقة)
    ----------------------------------------------------- */
    const STANDARD_BEDS = [
        { room: "master", bed: "queen" },
        { room: "bedroom", bed: "twin" },
        { room: "bedroom", bed: "twin" }
    ];

    const KING_BEDS = [
        { room: "master", bed: "queen" },
        { room: "bedroom", bed: "king" },
        { room: "bedroom", bed: "twin" }
    ];

    function unit(number, overrides) {
        return Object.assign(
            {
                number: number,
                bedrooms: 3,
                beds: STANDARD_BEDS,
                balconies: 1,
                terrace: false,
                indoorGarage: false,
                smoking: null,
                pets: null,
                toaster: null,
                extraParking: null
            },
            overrides || {}
        );
    }

    const apartments = {
        1: unit("104", { beds: KING_BEDS }),
        2: unit("106", { beds: KING_BEDS }),
        3: unit("204", { terrace: true, indoorGarage: true }),
        4: unit("105"),
        5: unit("207", { balconies: 2 }),
        6: unit("305", { balconies: 2 }),
        7: unit("107"),
        8: unit("309", { balconies: 2 })
    };

    /* -----------------------------------------------------
       أهم المميزات (تظهر في أعلى صفحة المميزات وفي الرئيسية)
    ----------------------------------------------------- */
    const highlights = [
        {
            icon: "wifi",
            titleAr: "إنترنت Fiber عالي السرعة",
            titleEn: "High-speed fiber internet",
            textAr: "شبكة Wi-Fi مستقلة لكل شقة، بتغطية كاملة في كل الغرف.",
            textEn: "A private Wi-Fi network for each apartment, covering every room."
        },
        {
            icon: "flame",
            titleAr: "تدفئة مركزية",
            titleEn: "Central heating",
            textAr: "تدفئة مركزية في جميع الشقق.",
            textEn: "Central heating in every apartment."
        },
        {
            icon: "snowflake",
            titleAr: "5 مكيفات في كل شقة",
            titleEn: "5 air conditioners per apartment",
            textAr: "مكيفات حديثة تدعم التبريد والتدفئة.",
            textEn: "Modern units for both cooling and heating."
        },
        {
            icon: "car",
            titleAr: "موقف سيارة مخصص",
            titleEn: "Dedicated parking",
            textAr: "موقف داخلي مؤمَّن لكل شقة على الأقل.",
            textEn: "At least one secure indoor space for each apartment."
        },
        {
            icon: "sparkles",
            titleAr: "تنظيف دوري مجاني",
            titleEn: "Free regular housekeeping",
            textAr: "خدمة تنظيف يومًا بعد يوم في المعتاد، دون رسوم.",
            textEn: "Housekeeping usually every other day, at no charge."
        },
        {
            icon: "area",
            titleAr: "220 م² تتسع لـ 7–8 أشخاص",
            titleEn: "220 m² for 7–8 guests",
            textAr: "3 غرف نوم و3 حمامات وصالة وغرفة ضيوف.",
            textEn: "3 bedrooms, 3 bathrooms, a living room and a guest room."
        }
    ];

    /* -----------------------------------------------------
       معلومات الشقق الأساسية (شقق 3 غرف نوم المنشورة حاليًا)
    ----------------------------------------------------- */
    const basics = [
        { icon: "bed", valueAr: "3", valueEn: "3", labelAr: "غرف نوم", labelEn: "Bedrooms" },
        { icon: "area", valueAr: "220 م²", valueEn: "220 m²", labelAr: "مساحة الشقة", labelEn: "Apartment size" },
        { icon: "users", valueAr: "7–8", valueEn: "7–8", labelAr: "أشخاص", labelEn: "Guests" },
        { icon: "bath", valueAr: "3", valueEn: "3", labelAr: "حمامات", labelEn: "Bathrooms" }
    ];

    const basicsList = [
        { ar: "صالة معيشة مستقلة", en: "Separate living room" },
        { ar: "غرفة ضيوف", en: "Guest room" },
        { ar: "مطبخ مجهز بالكامل", en: "Fully equipped kitchen" },
        { ar: "غرفة غسيل مستقلة في كل شقة", en: "Separate laundry room in every apartment" },
        { ar: "شرفة في جميع الشقق، وبعض الشقق فيها شرفتان", en: "A balcony in every apartment; some have two" },
        { ar: "شقة 204 فيها شرفة وتراس وكراج داخلي", en: "Apartment 204 has a balcony, a terrace and an indoor garage" },
        { ar: "موقف سيارة مخصص لكل شقة في كراج العمارة", en: "A dedicated parking space for each apartment in the building garage" }
    ];

    /* -----------------------------------------------------
       أقسام المميزات
       كل قسم فيه مجموعات، وكل مجموعة فيها عناصر.
    ----------------------------------------------------- */
    const sections = [
        {
            id: "furnishing",
            titleAr: "المفروشات وتجهيزات غرف النوم",
            titleEn: "Furnishings & bedroom setup",
            introAr: "كل شقة مفروشة بالكامل وجاهزة للسكن من أول يوم.",
            introEn: "Every apartment is fully furnished and ready to live in from day one.",
            groups: [
                {
                    id: "bedrooms",
                    icon: "bed",
                    titleAr: "غرف النوم",
                    titleEn: "Bedrooms",
                    items: [
                        { ar: "أسرّة King و Queen و Single حسب الشقة", en: "King, Queen and Single beds, depending on the apartment", tag: "varies" },
                        { ar: "خزانة ملابس في كل غرفة نوم", en: "A wardrobe in every bedroom" },
                        { ar: "طاولات جانبية بجانب الأسرّة", en: "Bedside tables" },
                        { ar: "تسريحة ومرآة في كل غرفة نوم", en: "A dresser and mirror in every bedroom" },
                        { ar: "ستائر عازلة للضوء (Blackout)", en: "Blackout curtains" },
                        { ar: "مخدات إضافية", en: "Extra pillows" },
                        { ar: "لحافات وأغطية إضافية", en: "Extra duvets and blankets" },
                        { ar: "أطقم شراشف وأغطية احتياطية", en: "Spare sets of sheets and covers" },
                        { ar: "فرشات إضافية عند الطلب", en: "Extra mattresses on request", tag: "free" },
                        { ar: "سرير أطفال عند الطلب", en: "Baby cot on request", tag: "free" },
                        { ar: "سرير إضافي عند الطلب", en: "Extra bed on request", tag: "free" }
                    ]
                },
                {
                    id: "living",
                    icon: "sofa",
                    titleAr: "الصالة وغرفة الضيوف",
                    titleEn: "Living room & guest room",
                    items: [
                        { ar: "طقم كنب وجلسات", en: "Sofa set and seating" },
                        { ar: "طاولة وسط", en: "Coffee table" },
                        { ar: "طاولات جانبية", en: "Side tables" },
                        { ar: "طاولة تلفزيون", en: "TV stand" },
                        { ar: "تلفزيون ذكي في الصالة", en: "Smart TV in the living room" },
                        { ar: "تلفزيون ذكي في غرفة الضيوف", en: "Smart TV in the guest room" },
                        { ar: "سجاد وستائر", en: "Carpets and curtains" },
                        { ar: "إضاءة وديكورات داخلية", en: "Lighting and interior décor" },
                        { ar: "طاولة طعام وكراسي داخل المطبخ", en: "Dining table and chairs in the kitchen" },
                        { ar: "خزائن أحذية", en: "Shoe cabinets" }
                    ]
                },
                {
                    id: "balconies",
                    icon: "sun",
                    titleAr: "الشرفات",
                    titleEn: "Balconies",
                    items: [
                        { ar: "شرفة في جميع الشقق", en: "A balcony in every apartment" },
                        { ar: "شرفتان في بعض الشقق", en: "Two balconies in some apartments", tag: "some" },
                        { ar: "شرفة وتراس في شقة 204", en: "A balcony and a terrace in apartment 204", tag: "unit" },
                        { ar: "كراسي وطاولات خارجية في الشرف", en: "Outdoor chairs and tables on the balconies" }
                    ]
                }
            ]
        },
        {
            id: "kitchen",
            titleAr: "المطبخ والأجهزة المنزلية",
            titleEn: "Kitchen & home appliances",
            introAr: "المطبخ مجهز بالكامل للاستخدام اليومي، من الأجهزة إلى أدوات الطبخ والتقديم.",
            introEn: "The kitchen is fully equipped for everyday use, from appliances to cookware and serving ware.",
            groups: [
                {
                    id: "appliances",
                    icon: "plug",
                    titleAr: "الأجهزة الكهربائية",
                    titleEn: "Appliances",
                    items: [
                        { ar: "ثلاجة", en: "Refrigerator" },
                        { ar: "فريزر مستقل فوق الثلاجة", en: "Separate freezer compartment above the fridge" },
                        { ar: "فرن يعمل بالغاز", en: "Gas oven" },
                        { ar: "ميكروويف كهربائي", en: "Microwave" },
                        { ar: "شفاط مطبخ", en: "Kitchen extractor hood" },
                        { ar: "غلاية مياه", en: "Electric kettle" },
                        { ar: "ماكينة قهوة", en: "Coffee machine" },
                        { ar: "كولر مياه", en: "Water cooler" },
                        { ar: "غسالة ملابس", en: "Washing machine" },
                        { ar: "مكواة ملابس", en: "Clothes iron" },
                        { ar: "مكنسة كهربائية", en: "Vacuum cleaner" },
                        { ar: "سخان مياه", en: "Water heater" },
                        { ar: "مجفف شعر", en: "Hair dryer" },
                        { ar: "تلفزيونان ذكيان (Smart TV)", en: "Two smart TVs" },
                        { ar: "5 مكيفات حديثة للتبريد والتدفئة", en: "5 modern air conditioners for cooling and heating" },
                        { ar: "تدفئة مركزية", en: "Central heating" },
                        { ar: "راوتر إنترنت", en: "Internet router" },
                        { ar: "محمصة خبز", en: "Toaster", tag: "some" }
                    ]
                },
                {
                    id: "kitchenware",
                    icon: "utensils",
                    titleAr: "أدوات الطبخ والتقديم",
                    titleEn: "Cookware & tableware",
                    items: [
                        { ar: "صحون للأكل", en: "Dinner plates" },
                        { ar: "صحون للتقديم", en: "Serving dishes" },
                        { ar: "كاسات مياه", en: "Water glasses" },
                        { ar: "أكواب شاي وقهوة", en: "Tea and coffee cups" },
                        { ar: "ملاعق وشوك وسكاكين", en: "Spoons, forks and knives" },
                        { ar: "طناجر بأحجام مختلفة", en: "Pots in different sizes" },
                        { ar: "مقالي", en: "Frying pans" },
                        { ar: "سكاكين تقطيع", en: "Chef's knives" },
                        { ar: "ألواح تقطيع", en: "Cutting boards" },
                        { ar: "مصفاة", en: "Colander" },
                        { ar: "أدوات تحضير الطعام", en: "Food preparation utensils" },
                        { ar: "علب حفظ الطعام", en: "Food storage containers" },
                        { ar: "فتاحات علب وزجاجات", en: "Can and bottle openers" },
                        { ar: "أدوات تقديم الطعام والصواني", en: "Serving utensils and trays" },
                        { ar: "خزائن مطبخ", en: "Kitchen cabinets" },
                        { ar: "جميع الأدوات الأساسية لتحضير الطعام وتقديمه", en: "All the basics needed to prepare and serve meals" }
                    ]
                }
            ]
        },
        {
            id: "comfort",
            titleAr: "الحمامات والإنترنت والتدفئة والتبريد",
            titleEn: "Bathrooms, internet, heating & cooling",
            introAr: "ثلاثة حمامات مجهزة، وإنترنت Fiber، وتحكّم كامل بحرارة الشقة صيفًا وشتاءً.",
            introEn: "Three equipped bathrooms, fiber internet, and full control of the temperature in summer and winter.",
            groups: [
                {
                    id: "bathrooms",
                    icon: "bath",
                    titleAr: "الحمامات ومستلزمات العناية الشخصية",
                    titleEn: "Bathrooms & toiletries",
                    items: [
                        { ar: "3 حمامات مجهزة في كل شقة", en: "3 equipped bathrooms in every apartment" },
                        { ar: "دش في جميع الحمامات", en: "A shower in every bathroom" },
                        { ar: "شامبو للشعر", en: "Shampoo" },
                        { ar: "بلسم للشعر", en: "Conditioner" },
                        { ar: "صابون أو غسول للجسم", en: "Soap or body wash" },
                        { ar: "صابون لليدين", en: "Hand soap" },
                        { ar: "ورق تواليت", en: "Toilet paper" },
                        { ar: "مناشف استحمام", en: "Bath towels" },
                        { ar: "مناشف لليدين", en: "Hand towels" },
                        { ar: "نعال للاستخدام داخل الحمامات", en: "Bathroom slippers" },
                        { ar: "مرايا في جميع الحمامات", en: "Mirrors in every bathroom" },
                        { ar: "حامل صابون", en: "Soap holder" },
                        { ar: "سلال مهملات", en: "Waste bins" },
                        { ar: "فرش تنظيف المرحاض", en: "Toilet brushes" },
                        { ar: "سجادات حمام", en: "Bath mats" }
                    ],
                    noteAr: "مستلزمات النظافة الشخصية تُوفَّر وتُجدَّد مجانًا طوال فترة الإقامة.",
                    noteEn: "Toiletries are provided and replenished free of charge throughout your stay."
                },
                {
                    id: "internet",
                    icon: "wifi",
                    titleAr: "الإنترنت والتكنولوجيا",
                    titleEn: "Internet & technology",
                    items: [
                        { ar: "إنترنت Fiber عالي السرعة", en: "High-speed fiber internet" },
                        { ar: "تغطية Wi-Fi قوية وكاملة في جميع غرف الشقة", en: "Strong, full Wi-Fi coverage in every room" },
                        { ar: "شبكة Wi-Fi مستقلة لكل شقة", en: "A separate Wi-Fi network for each apartment" },
                        { ar: "كلمة مرور خاصة لكل شقة", en: "A private password for each apartment" },
                        { ar: "قنوات فضائية", en: "Satellite channels" },
                        { ar: "قنوات رياضية", en: "Sports channels" },
                        { ar: "أجهزة استقبال (Receiver)", en: "Satellite receivers" }
                    ]
                },
                {
                    id: "climate",
                    icon: "thermometer",
                    titleAr: "التدفئة والتبريد",
                    titleEn: "Heating & cooling",
                    items: [
                        { ar: "تدفئة مركزية في جميع الشقق", en: "Central heating in every apartment" },
                        { ar: "5 مكيفات حديثة في كل شقة", en: "5 modern air conditioners in every apartment" },
                        { ar: "جميع المكيفات تدعم التبريد والتدفئة", en: "All units provide both cooling and heating" },
                        { ar: "استخدام التدفئة والتبريد حسب احتياج النزيل", en: "Heating and cooling used as the guest needs" }
                    ]
                }
            ]
        },
        {
            id: "housekeeping",
            featured: true,
            titleAr: "خدمة التنظيف والتدبير المنزلي",
            titleEn: "Housekeeping & cleaning",
            introAr: "خدمة Housekeeping من الخدمات الأساسية في HIJAZI Apartments، وهي مجانية لجميع النزلاء.",
            introEn: "Housekeeping is a core service at HIJAZI Apartments, and it is free for all guests.",
            groups: [
                {
                    id: "cleaning",
                    icon: "sparkles",
                    titleAr: "التنظيف الدوري",
                    titleEn: "Regular housekeeping",
                    items: [
                        { ar: "تنظيف دوري لجميع الشقق، يومًا بعد يوم في المعتاد", en: "Regular cleaning of every apartment, usually every other day" },
                        { ar: "الخدمة مجانية للنزلاء", en: "The service is free for guests" },
                        { ar: "تنظيف شامل للشقة بأحدث أجهزة التنظيف", en: "Thorough cleaning with up-to-date cleaning equipment" },
                        { ar: "مواد تنظيف عالية الجودة", en: "High-quality cleaning products" },
                        { ar: "ترتيب الغرف وتجهيز الأسرّة", en: "Rooms tidied and beds made" },
                        { ar: "تغيير المناشف خلال خدمة التنظيف", en: "Towels changed during housekeeping" },
                        { ar: "تجديد مستلزمات الحمامات والنظافة الشخصية", en: "Bathroom supplies and toiletries replenished" },
                        { ar: "تنظيف إضافي عند الطلب", en: "Extra cleaning on request", tag: "paid" }
                    ]
                },
                {
                    id: "turnover",
                    icon: "check",
                    titleAr: "تجهيز الشقة بين النزلاء",
                    titleEn: "Preparation between guests",
                    items: [
                        { ar: "غسل وتجديد جميع الشراشف وأغطية الأسرّة والملايات والمخدات عند مغادرة كل نزيل", en: "All sheets, bed covers and pillows washed and replaced after every guest" },
                        { ar: "أطقم مفروشات احتياطية", en: "Spare sets of linen" },
                        { ar: "تجهيز الشقة بالكامل لاستقبال النزيل التالي", en: "The apartment fully prepared for the next guest" }
                    ]
                },
                {
                    id: "laundry",
                    icon: "washer",
                    titleAr: "الغسيل والكي",
                    titleEn: "Laundry & ironing",
                    items: [
                        { ar: "غسالة ملابس داخل كل شقة", en: "A washing machine in every apartment" },
                        { ar: "غرفة غسيل مستقلة في كل شقة", en: "A separate laundry room in every apartment" },
                        { ar: "منشر غسيل", en: "Drying rack" },
                        { ar: "سلة غسيل", en: "Laundry basket" },
                        { ar: "شماعات ملابس", en: "Clothes hangers" },
                        { ar: "مكواة ملابس", en: "Clothes iron" },
                        { ar: "مواد تنظيف", en: "Cleaning supplies" },
                        { ar: "سائل غسيل ملابس", en: "Laundry detergent" },
                        { ar: "خدمة غسيل وكي الملابس: موظف يستلم الملابس ويعيدها جاهزة", en: "Laundry and ironing service: a staff member collects your clothes and returns them ready", tag: "paid" }
                    ]
                }
            ]
        },
        {
            id: "building",
            titleAr: "المبنى ومواقف السيارات والأمان",
            titleEn: "Building, parking & security",
            introAr: "مواقف داخلية مؤمَّنة، ومراقبة وحراسة، ودخول ذكي من باب المبنى حتى باب الشقة.",
            introEn: "Secure indoor parking, surveillance and security staff, and smart access from the building entrance to your apartment door.",
            groups: [
                {
                    id: "parking",
                    icon: "car",
                    titleAr: "مواقف السيارات",
                    titleEn: "Parking",
                    items: [
                        { ar: "موقف سيارة مخصص لكل شقة على الأقل", en: "At least one dedicated parking space for each apartment" },
                        { ar: "مواقف داخلية ومؤمَّنة", en: "Indoor, secured parking" },
                        { ar: "نظام دخول ذكي للكراج", en: "Smart access to the garage" },
                        { ar: "أكثر من موقف لبعض الشقق", en: "More than one space for some apartments", tag: "some" }
                    ]
                },
                {
                    id: "security",
                    icon: "shield",
                    titleAr: "الأمان والدخول",
                    titleEn: "Security & access",
                    items: [
                        { ar: "كاميرات مراقبة في مداخل المباني والممرات ومواقف السيارات", en: "CCTV at building entrances, in corridors and in the parking areas" },
                        { ar: "حارس أمن", en: "Security guard" },
                        { ar: "نظام دخول ذكي للأبواب الرئيسية للمباني", en: "Smart access at the main building doors" },
                        { ar: "نظام دخول ذكي لباب الشقة", en: "Smart lock on the apartment door" },
                        { ar: "مفاتيح عادية للاستخدام داخل الشقة", en: "Regular keys for use inside the apartment" }
                    ]
                },
                {
                    id: "access",
                    icon: "building",
                    titleAr: "المبنى وسهولة الوصول",
                    titleEn: "Building & accessibility",
                    items: [
                        { ar: "مصاعد في جميع المباني", en: "Elevators in all buildings" },
                        { ar: "مداخل مناسبة للكراسي المتحركة", en: "Wheelchair-friendly entrances" },
                        { ar: "المباني مناسبة لدخول مستخدمي الكراسي المتحركة", en: "Buildings accessible to wheelchair users" }
                    ]
                }
            ]
        },
        {
            id: "guest-services",
            titleAr: "خدمات النزلاء والاستقبال",
            titleEn: "Guest services & reception",
            introAr: "فريقنا موجود لخدمتك من لحظة الوصول حتى المغادرة.",
            introEn: "Our team is there for you from arrival to departure.",
            groups: [
                {
                    id: "reception",
                    icon: "bell",
                    titleAr: "الاستقبال وخدمة النزلاء",
                    titleEn: "Reception & guest care",
                    items: [
                        { ar: "موظف متاح لخدمة النزلاء على مدار 24 ساعة", en: "A staff member available for guests 24 hours a day" },
                        { ar: "استقبال شخصي عند تسجيل الدخول", en: "In-person welcome at check-in" },
                        { ar: "تسجيل بيانات النزلاء عند الوصول", en: "Guest registration on arrival" },
                        { ar: "إصدار فاتورة للإقامة", en: "An invoice issued for your stay" },
                        { ar: "تسجيل دخول مرن بالتنسيق المسبق", en: "Flexible check-in by prior arrangement" },
                        { ar: "توفير مستلزمات إضافية عند الطلب", en: "Additional supplies available on request" },
                        { ar: "سرير إضافي أو فرشة إضافية عند الطلب", en: "Extra bed or extra mattress on request", tag: "free" },
                        { ar: "إقامة شهرية وطويلة الأمد بأسعار خاصة وخصومات ذهبية", en: "Monthly and long-term stays at special rates with golden discounts" }
                    ]
                },
                {
                    id: "airport",
                    icon: "plane",
                    titleAr: "المطار والتنقل",
                    titleEn: "Airport & transfers",
                    items: [
                        { ar: "ترتيب استقبال من المطار", en: "Airport pick-up can be arranged", tag: "paid" },
                        { ar: "ترتيب النقل من وإلى المطار", en: "Transfers to and from the airport can be arranged", tag: "paid" }
                    ]
                }
            ]
        }
    ];

    /* -----------------------------------------------------
       الخدمات المجانية والخدمات المدفوعة
    ----------------------------------------------------- */
    const services = {
        free: [
            { ar: "سرير الأطفال", en: "Baby cot" },
            { ar: "السرير الإضافي", en: "Extra bed" },
            { ar: "الفرشة الإضافية", en: "Extra mattress" },
            { ar: "المناشف الإضافية", en: "Extra towels" },
            { ar: "المخدات واللحافات الإضافية", en: "Extra pillows and duvets" }
        ],
        included: [
            { ar: "خدمة التنظيف الدوري (Housekeeping)", en: "Regular housekeeping" },
            { ar: "تجديد مستلزمات النظافة الشخصية", en: "Toiletries replenished" },
            { ar: "تغيير المناشف خلال التنظيف", en: "Towels changed during housekeeping" }
        ],
        paid: [
            { ar: "النقل من وإلى المطار", en: "Transfers to and from the airport" },
            { ar: "الاستقبال من المطار", en: "Airport pick-up" },
            { ar: "خدمة التنظيف الإضافي", en: "Extra cleaning" },
            { ar: "خدمة غسيل وكي الملابس", en: "Laundry and ironing service" }
        ]
    };

    /* -----------------------------------------------------
       سياسات الإقامة
       key: true = تظهر أيضًا في الملخص المختصر داخل تفاصيل الشقة والحجز
    ----------------------------------------------------- */
    const policies = [
        { icon: "users", key: true, ar: "سياسة عائلية: لا يُسمح بإقامة غير المتزوجين معًا.", en: "Family policy: unmarried couples are not permitted to stay together." },
        { icon: "calendar", key: true, ar: "الحد الأدنى للإقامة 3 ليالٍ.", en: "Minimum stay is 3 nights." },
        { icon: "key", ar: "تسجيل الدخول متاح بالتنسيق المسبق.", en: "Check-in is available by prior arrangement." },
        { icon: "clock", key: true, ar: "موعد المغادرة الأساسي الساعة 12 ظهرًا.", en: "Standard check-out is at 12:00 noon." },
        { icon: "clock", ar: "يمكن طلب تمديد المغادرة لبضع ساعات بالتنسيق المسبق وحسب التوفر.", en: "A late check-out of a few hours can be requested in advance, subject to availability." },
        { icon: "clock", ar: "بعد الساعة 12 ظهرًا، إذا لم يُتَّفق على تمديد المغادرة، يُحتسب يوم إقامة جديد.", en: "After 12:00 noon, unless a late check-out was agreed, an additional night is charged." },
        { icon: "smoking", key: true, ar: "التدخين مسموح في شقق محددة فقط، حسب سياسة كل شقة.", en: "Smoking is allowed in selected apartments only, according to each apartment's policy." },
        { icon: "paw", key: true, ar: "الحيوانات الأليفة مسموحة في شقق محددة فقط.", en: "Pets are allowed in selected apartments only." },
        { icon: "party", ar: "يُسمح بإقامة المناسبات والحفلات بعد إبلاغ الإدارة والحصول على موافقتها المسبقة.", en: "Events and parties are allowed after informing management and obtaining prior approval." }
    ];

    /* -----------------------------------------------------
       أسئلة شائعة عن التجهيزات والخدمات
       تظهر في صفحة المميزات وفي بياناتها المنظمة (FAQPage).
       الأسئلة نفسها مضافة يدويًا في faq.html؛ عند تعديل جواب هنا عدّله هناك.
    ----------------------------------------------------- */
    const faq = [
        {
            qAr: "كم مساحة الشقة وكم شخصًا تستوعب؟",
            aAr: "مساحة كل شقة 220 مترًا مربعًا، وفيها 3 غرف نوم و3 حمامات وصالة معيشة مستقلة وغرفة ضيوف، وتتسع من 7 إلى 8 أشخاص.",
            qEn: "How big are the apartments and how many guests do they sleep?",
            aEn: "Each apartment is 220 square metres with 3 bedrooms, 3 bathrooms, a separate living room and a guest room, and sleeps 7 to 8 guests."
        },
        {
            qAr: "هل يوجد موقف سيارة؟",
            aAr: "نعم، لكل شقة موقف سيارة مخصص واحد على الأقل. المواقف داخلية ومؤمَّنة وبنظام دخول ذكي للكراج، وبعض الشقق لها أكثر من موقف.",
            qEn: "Is parking available?",
            aEn: "Yes. Each apartment has at least one dedicated parking space. Parking is indoor and secured, with smart access to the garage, and some apartments have more than one space."
        },
        {
            qAr: "هل خدمة التنظيف مجانية؟",
            aAr: "نعم، خدمة التنظيف الدوري (Housekeeping) مجانية للنزلاء، وتتم يومًا بعد يوم في المعتاد، وتشمل ترتيب الغرف وتجهيز الأسرّة وتغيير المناشف وتجديد مستلزمات الحمامات. التنظيف الإضافي متاح مقابل رسوم.",
            qEn: "Is housekeeping free?",
            aEn: "Yes. Regular housekeeping is free for guests, usually every other day, and includes tidying the rooms, making the beds, changing towels and replenishing bathroom supplies. Extra cleaning is available for a fee."
        },
        {
            qAr: "ما نوع الإنترنت في الشقق؟",
            aAr: "إنترنت Fiber عالي السرعة، بشبكة Wi-Fi مستقلة وكلمة مرور خاصة لكل شقة، وتغطية كاملة في جميع الغرف.",
            qEn: "What kind of internet do the apartments have?",
            aEn: "High-speed fiber internet, with a separate Wi-Fi network and a private password for each apartment, and full coverage in every room."
        },
        {
            qAr: "هل يوجد تدفئة وتكييف؟",
            aAr: "نعم، في جميع الشقق تدفئة مركزية، وفي كل شقة 5 مكيفات حديثة تدعم التبريد والتدفئة.",
            qEn: "Is there heating and air conditioning?",
            aEn: "Yes. Every apartment has central heating, plus 5 modern air conditioners that provide both cooling and heating."
        },
        {
            qAr: "ما الحد الأدنى للإقامة وما موعد المغادرة؟",
            aAr: "الحد الأدنى للإقامة 3 ليالٍ. موعد المغادرة الأساسي الساعة 12 ظهرًا، ويمكن طلب تمديده لبضع ساعات بالتنسيق المسبق وحسب التوفر. تسجيل الدخول يتم بالتنسيق المسبق.",
            qEn: "What is the minimum stay and when is check-out?",
            aEn: "The minimum stay is 3 nights. Standard check-out is at 12:00 noon, and a late check-out of a few hours can be requested in advance, subject to availability. Check-in is by prior arrangement."
        },
        {
            qAr: "هل التدخين والحيوانات الأليفة مسموحة؟",
            aAr: "التدخين والحيوانات الأليفة مسموحان في شقق محددة فقط. اسألنا قبل الحجز لنرشّح لك الشقة المناسبة.",
            qEn: "Are smoking and pets allowed?",
            aEn: "Smoking and pets are allowed in selected apartments only. Ask us before booking and we will suggest a suitable apartment."
        },
        {
            qAr: "هل توفرون سرير أطفال أو سريرًا إضافيًا؟",
            aAr: "نعم، مجانًا عند الطلب: سرير أطفال، سرير إضافي، فرشة إضافية، ومناشف ومخدات ولحافات إضافية.",
            qEn: "Do you provide a baby cot or an extra bed?",
            aEn: "Yes, free on request: a baby cot, an extra bed, an extra mattress, and extra towels, pillows and duvets."
        },
        {
            qAr: "هل توفرون استقبالًا أو نقلًا من المطار؟",
            aAr: "نعم، يمكن ترتيب الاستقبال من المطار والنقل من وإلى المطار مقابل رسوم إضافية.",
            qEn: "Do you offer airport pick-up or transfers?",
            aEn: "Yes. Airport pick-up and transfers to and from the airport can be arranged for an extra charge."
        },
        {
            qAr: "هل يوجد غسالة داخل الشقة؟",
            aAr: "نعم، في كل شقة غرفة غسيل مستقلة فيها غسالة ملابس ومنشر ومكواة وسائل غسيل. وتتوفر أيضًا خدمة غسيل وكي الملابس مقابل رسوم إضافية.",
            qEn: "Is there a washing machine in the apartment?",
            aEn: "Yes. Every apartment has a separate laundry room with a washing machine, drying rack, iron and laundry detergent. A laundry and ironing service is also available for an extra charge."
        },
        {
            qAr: "هل المباني مناسبة لمستخدمي الكراسي المتحركة؟",
            aAr: "نعم، في جميع المباني مصاعد، والمداخل مناسبة لمستخدمي الكراسي المتحركة.",
            qEn: "Are the buildings wheelchair accessible?",
            aEn: "Yes. All buildings have elevators and wheelchair-friendly entrances."
        },
        {
            qAr: "هل يُسمح بإقامة غير المتزوجين؟",
            aAr: "لا. سياستنا عائلية، ولا يُسمح بإقامة غير المتزوجين معًا. الشقق مناسبة للعائلات ورجال الأعمال والإقامة الطبية.",
            qEn: "Can unmarried couples stay?",
            aEn: "No. We have a family policy, and unmarried couples are not permitted to stay together. The apartments suit families, business travellers and medical stays."
        }
    ];

    /* -----------------------------------------------------
       الأيقونات (SVG بسيطة، بدون مكتبات خارجية)
    ----------------------------------------------------- */
    const icons = {
        wifi: '<path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.86a10 10 0 0 1 14 0"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/>',
        flame: '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
        snowflake: '<path d="M2 12h20"/><path d="M12 2v20"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/>',
        thermometer: '<path d="M14 4v10.54a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0Z"/><path d="M12 9v8"/>',
        car: '<path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/>',
        sparkles: '<path d="M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.14-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0l1.58 6.14a2 2 0 0 0 1.44 1.44l6.14 1.58a.5.5 0 0 1 0 .96l-6.14 1.58a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z"/><path d="M20 3v4"/><path d="M22 5h-4"/>',
        area: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
        bed: '<path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/>',
        users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
        bath: '<path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.68 3 4 3.68 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="m10 5-2 2"/><path d="M2 12h20"/><path d="M7 19v2"/><path d="M17 19v2"/>',
        sofa: '<path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"/><path d="M4 18v2"/><path d="M20 18v2"/>',
        sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
        plug: '<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/>',
        utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
        check: '<path d="M20 6 9 17l-5-5"/>',
        washer: '<rect width="18" height="20" x="3" y="2" rx="2"/><path d="M6.5 6h2"/><path d="M17 6h.01"/><circle cx="12" cy="13.5" r="4.5"/>',
        shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
        building: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
        bell: '<path d="M3 20a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1Z"/><path d="M20 16a8 8 0 1 0-16 0"/><path d="M12 4v4"/><path d="M10 4h4"/>',
        plane: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
        gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
        banknote: '<rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01"/><path d="M18 12h.01"/>',
        clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
        calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
        clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
        key: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
        smoking: '<path d="M17 12H3a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h14"/><path d="M18 8c0-2.5-2-2.5-2-5"/><path d="M21 16a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M22 8c0-2.5-2-2.5-2-5"/><path d="M7 12v4"/>',
        paw: '<circle cx="11" cy="4" r="2"/><circle cx="18" cy="8" r="2"/><circle cx="20" cy="16" r="2"/><path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.05Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z"/>',
        party: '<path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/>',
        home: '<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .71-1.53l7-6a2 2 0 0 1 2.58 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
        info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'
    };

    /* -----------------------------------------------------
       دوال مساعدة صغيرة
    ----------------------------------------------------- */
    function getApartment(apartmentId) {
        const facts = apartments[Number(apartmentId)];
        if (!facts) return null;

        const type = unitTypes[facts.bedrooms] || {};

        return Object.assign({}, facts, {
            id: Number(apartmentId),
            typeLabelAr: type.labelAr || "",
            typeLabelEn: type.labelEn || "",
            areaSqm: facts.areaSqm != null ? facts.areaSqm : type.areaSqm,
            guestsMin: facts.guestsMin != null ? facts.guestsMin : type.guestsMin,
            guestsMax: facts.guestsMax != null ? facts.guestsMax : type.guestsMax,
            bathrooms: facts.bathrooms != null ? facts.bathrooms : type.bathrooms
        });
    }

    function outdoorLabel(facts, lang) {
        if (!facts) return "";

        if (facts.terrace) {
            if (facts.balconies >= 2) return lang === "en" ? "2 balconies + terrace" : "شرفتان وتراس";
            if (facts.balconies === 1) return lang === "en" ? "Balcony + terrace" : "شرفة وتراس";
            return lang === "en" ? "Terrace" : "تراس";
        }

        if (facts.balconies >= 2) return lang === "en" ? "2 balconies" : "شرفتان";
        if (facts.balconies === 1) return lang === "en" ? "1 balcony" : "شرفة واحدة";
        return "";
    }

    function guestsLabel(facts, lang) {
        if (!facts || !facts.guestsMax) return "";

        const range = facts.guestsMin && facts.guestsMin !== facts.guestsMax
            ? facts.guestsMin + "–" + facts.guestsMax
            : String(facts.guestsMax);

        return lang === "en" ? range + " guests" : range + " أشخاص";
    }

    function areaLabel(facts, lang) {
        if (!facts || !facts.areaSqm) return "";
        return lang === "en" ? facts.areaSqm + " m²" : facts.areaSqm + " م²";
    }

    function parkingLabel(facts, lang) {
        if (!facts) return "";

        if (facts.indoorGarage) {
            return lang === "en" ? "Indoor garage" : "كراج داخلي";
        }

        return lang === "en" ? "Dedicated space in the building garage" : "موقف مخصص في كراج العمارة";
    }

    /* قائمة المزايا المختصرة لبطاقة الشقة (أول 4 تظهر على البطاقة) */
    function featureList(apartmentId, lang) {
        const facts = getApartment(apartmentId);
        if (!facts) return [];

        const en = lang === "en";
        const list = [
            en ? facts.typeLabelEn : facts.typeLabelAr,
            areaLabel(facts, lang),
            guestsLabel(facts, lang),
            outdoorLabel(facts, lang),
            facts.bathrooms ? (en ? facts.bathrooms + " bathrooms" : facts.bathrooms + " حمامات") : "",
            en ? "Living room" : "صالة معيشة",
            en ? "Guest room" : "غرفة ضيوف",
            en ? "Fully equipped kitchen" : "مطبخ مجهز بالكامل",
            en ? "Laundry room" : "غرفة غسيل",
            en ? "Fiber internet" : "إنترنت Fiber",
            en ? "Central heating" : "تدفئة مركزية",
            en ? "5 air conditioners" : "5 مكيفات",
            facts.indoorGarage
                ? (en ? "Indoor garage" : "كراج داخلي")
                : (en ? "Dedicated parking" : "موقف سيارة مخصص"),
            en ? "Free housekeeping" : "تنظيف دوري مجاني"
        ];

        return list.filter(Boolean);
    }

    /* أنواع الشقق الموجودة فعليًا ضمن قائمة معرّفات */
    function bedroomTypesIn(apartmentIds) {
        const found = [];

        (apartmentIds || Object.keys(apartments)).forEach(function (id) {
            const facts = apartments[Number(id)];
            if (facts && found.indexOf(facts.bedrooms) === -1) found.push(facts.bedrooms);
        });

        return found.sort(function (a, b) { return a - b; });
    }

    const api = {
        unitTypes: unitTypes,
        bedTypes: bedTypes,
        roomNames: roomNames,
        apartments: apartments,
        highlights: highlights,
        basics: basics,
        basicsList: basicsList,
        sections: sections,
        services: services,
        policies: policies,
        faq: faq,
        icons: icons,
        getApartment: getApartment,
        outdoorLabel: outdoorLabel,
        guestsLabel: guestsLabel,
        areaLabel: areaLabel,
        parkingLabel: parkingLabel,
        featureList: featureList,
        bedroomTypesIn: bedroomTypesIn
    };

    root.HIJAZI_AMENITIES = api;

    if (typeof module !== "undefined" && module.exports) {
        module.exports = api;
    }
})(typeof window !== "undefined" ? window : globalThis);
