/* =========================================================
   ملف JavaScript الرئيسي للموقع
   يحتوي على:
   1) بيانات الشقق
   2) نظام الترجمة عربي / إنجليزي
   3) الهيدر المشترك
   4) الفوتر المشترك
   5) أدوات مساعدة عامة
========================================================= */

/* =========================
   أسعار تحويل العملة
========================= */
const rates = { USD: 1.41, SAR: 5.29 };
/* =========================
   أسعار الشقق بالدينار الأردني
========================= */
const APARTMENT_PRICES = {
    1: 150,
    2: 200,
    3: 150,
    4: 200,
    5: 150,
    6: 200
};
/* =========================
   بيانات الشقق المشتركة
========================= */
const HIJAZI_APARTMENTS = {
    1: {
        id: 1,
        location: "وسط البلد",
        mapEmbed: "https://www.google.com/maps?q=%D9%88%D8%B3%D8%B7%20%D8%A7%D9%84%D8%A8%D9%84%D8%AF%20%D8%B9%D9%85%D8%A7%D9%86&z=15&output=embed",
        nameAr: "شقة رقم 1",
        nameEn: "Apartment 1",
        price: APARTMENT_PRICES[1],
        oneBalcony: false,
        descAr: "شقة مفروشة راقية مناسبة للإقامة الطبية والتنفيذية في عمّان.",
        descEn: "Elegant furnished apartment suitable for medical and executive stays in Amman.",
        featuresAr: ["3 غرف نوم", "3 حمامات", "غرفة معيشة", "غرفة ضيوف", "مطبخ", "شرفتان", "واي فاي", "مكيف"],
        featuresEn: ["3 Bedrooms", "3 Bathrooms", "Living Room", "Guest Room", "Kitchen", "2 Balconies", "Wi-Fi", "Air Conditioning"],
        images: [
            "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80"
        ],
        video: "https://www.w3schools.com/html/mov_bbb.mp4",
        rooms: [
            {
                key: "master",
                titleAr: "غرفة النوم الماستر",
                titleEn: "Master Bedroom",
                noteAr: "تحتوي على تخت مزدوج وحمام خاص.",
                noteEn: "Includes a double bed and a private bathroom.",
                images: [
                    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1505693431205-36e7f9307d05?auto=format&fit=crop&w=1200&q=80"
                ]
            },
            {
                key: "bedroom1",
                titleAr: "غرفة نوم 1",
                titleEn: "Bedroom 1",
                noteAr: "تحتوي على سريرين مفردين.",
                noteEn: "Includes two single beds.",
                images: [
                    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1464890100898-a385f744067f?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&q=80"
                ]
            },
            {
                key: "bedroom2",
                titleAr: "غرفة نوم 2",
                titleEn: "Bedroom 2",
                noteAr: "تحتوي على سريرين مفردين.",
                noteEn: "Includes two single beds.",
                images: [
                    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
                ]
            },
            {
                key: "living",
                titleAr: "غرفة المعيشة",
                titleEn: "Living Room",
                noteAr: "مساحة مريحة للجلوس اليومي.",
                noteEn: "Comfortable space for everyday living.",
                images: [
                    "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1505693431205-36e7f9307d05?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80"
                ]
            },
            {
                key: "guest",
                titleAr: "غرفة الضيوف",
                titleEn: "Guest Room",
                noteAr: "غرفة مخصصة لاستقبال الضيوف براحة وأناقة.",
                noteEn: "Dedicated guest area with comfort and elegance.",
                images: [
                    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
                ]
            },
            {
                key: "kitchen",
                titleAr: "المطبخ",
                titleEn: "Kitchen",
                noteAr: "مطبخ مجهز بالكامل للاستخدام اليومي.",
                noteEn: "Fully equipped kitchen for daily use.",
                images: [
                    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80"
                ]
            },
            {
                key: "bathrooms",
                titleAr: "الحمامات",
                titleEn: "Bathrooms",
                noteAr: "3 حمامات في كل شقة.",
                noteEn: "3 bathrooms in each apartment.",
                images: [
                    "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1505693431205-36e7f9307d05?auto=format&fit=crop&w=1200&q=80"
                ]
            },
            {
                key: "balconies",
                titleAr: "الشرفات",
                titleEn: "Balconies",
                noteAr: "تحتوي الشقة على شرفتين.",
                noteEn: "This apartment includes two balconies.",
                images: [
                    "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1464890100898-a385f744067f?auto=format&fit=crop&w=1200&q=80",
                    "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&q=80"
                ]
            }
        ]
    }
};

/* =========================
   توليد بيانات الشقق 2-6
========================= */
for (let i = 2; i <= 6; i++) {
    HIJAZI_APARTMENTS[i] = JSON.parse(JSON.stringify(HIJAZI_APARTMENTS[1]));
    HIJAZI_APARTMENTS[i].id = i;
    HIJAZI_APARTMENTS[i].nameAr = `شقة رقم ${i}`;
    HIJAZI_APARTMENTS[i].nameEn = `Apartment ${i}`;
    HIJAZI_APARTMENTS[i].price = APARTMENT_PRICES[i];
}

/* =========================================================
   مرافق الشقق
   عدّل أو احذف أو أضف أي عنصر حسب التجهيز الحقيقي للشقة
========================================================= */

const COMMON_APARTMENT_FEATURES = {
    ar: [
        "3 غرف نوم",
        "3 حمامات",
        "إنترنت Wi-Fi سريع",
        "موقف سيارة",
        "شاشتان Smart TV",
        "غرفة معيشة",
        "غرفة ضيوف",
        "مطبخ مجهز بالكامل",
        "غسالة ملابس",
        "تكييف",
        "مصعد",
        "ماء ساخن"
    ],

    en: [
        "3 Bedrooms",
        "3 Bathrooms",
        "High-speed Wi-Fi",
        "Car parking",
        "2 Smart TVs",
        "Living room",
        "Guest room",
        "Fully equipped kitchen",
        "Washing machine",
        "Air conditioning",
        "Elevator",
        "Hot water"
    ]
};

/*
  الإضافات الخاصة بكل شقة.
  تستطيع لاحقًا تخصيص كل شقة بإضافة عناصر داخل ar و en.
*/
const APARTMENT_FEATURE_OVERRIDES = {
    1: {
        ar: ["شرفتان"],
        en: ["2 Balconies"]
    },

    2: {
        ar: ["شرفتان"],
        en: ["2 Balconies"]
    },

    3: {
        ar: ["شرفتان"],
        en: ["2 Balconies"]
    },

    4: {
        ar: ["شرفتان"],
        en: ["2 Balconies"]
    },

    5: {
        ar: ["شرفتان"],
        en: ["2 Balconies"]
    },

    6: {
        ar: ["شرفة واحدة"],
        en: ["1 Balcony"]
    }
};

for (let apartmentId = 1; apartmentId <= 6; apartmentId++) {
    const apartment = HIJAZI_APARTMENTS[apartmentId];
    const extraFeatures = APARTMENT_FEATURE_OVERRIDES[apartmentId];

    if (!apartment || !extraFeatures) continue;

    apartment.featuresAr = [
        ...COMMON_APARTMENT_FEATURES.ar,
        ...extraFeatures.ar
    ];

    apartment.featuresEn = [
        ...COMMON_APARTMENT_FEATURES.en,
        ...extraFeatures.en
    ];
}

/* =========================================================
   موقع موحد لجميع الشقق - HIJAZI Apartments
========================================================= */
const HIJAZI_SHARED_LOCATION_AR = "HIJAZI Apartments - شارع يوسف بن تاشفين، الشميساني، عمّان";
const HIJAZI_SHARED_MAP_EMBED = "https://www.google.com/maps?q=31.97618730798579,35.89911515004555&z=18&output=embed";

HIJAZI_APARTMENTS[1].location = HIJAZI_SHARED_LOCATION_AR;
HIJAZI_APARTMENTS[1].mapEmbed = HIJAZI_SHARED_MAP_EMBED;

HIJAZI_APARTMENTS[2].location = HIJAZI_SHARED_LOCATION_AR;
HIJAZI_APARTMENTS[2].mapEmbed = HIJAZI_SHARED_MAP_EMBED;

HIJAZI_APARTMENTS[3].location = HIJAZI_SHARED_LOCATION_AR;
HIJAZI_APARTMENTS[3].mapEmbed = HIJAZI_SHARED_MAP_EMBED;

HIJAZI_APARTMENTS[4].location = HIJAZI_SHARED_LOCATION_AR;
HIJAZI_APARTMENTS[4].mapEmbed = HIJAZI_SHARED_MAP_EMBED;

HIJAZI_APARTMENTS[5].location = HIJAZI_SHARED_LOCATION_AR;
HIJAZI_APARTMENTS[5].mapEmbed = HIJAZI_SHARED_MAP_EMBED;

HIJAZI_APARTMENTS[6].location = HIJAZI_SHARED_LOCATION_AR;
HIJAZI_APARTMENTS[6].mapEmbed = HIJAZI_SHARED_MAP_EMBED;
/* =========================================================
   الشقة 6 تحتوي على شرفة واحدة فقط
========================================================= */
if (HIJAZI_APARTMENTS[6]) {
    HIJAZI_APARTMENTS[6].oneBalcony = true;
    const balconies = HIJAZI_APARTMENTS[6].rooms.find(r => r.key === "balconies");
    if (balconies) {
        balconies.noteAr = "تحتوي هذه الشقة على شرفة واحدة.";
        balconies.noteEn = "This apartment includes one balcony.";
    }
}
/* =========================================================
   نظام صور محلية مرتبة لكل شقة مثل Airbnb
   بدون أي صور خارجية من الإنترنت

   ملاحظة:
   أول صورة من أول قسم هي صورة البطاقة الرئيسية.
========================================================= */

const APARTMENT_ROOM_PHOTO_PLAN = [
    {
        key: "living",
        folder: "living",
        count: 4,
        titleAr: "غرفة المعيشة",
        titleEn: "Living Room",
        noteAr: "صور غرفة المعيشة والصالة.",
        noteEn: "Living room and seating area photos."
    },
    {
        key: "guest",
        folder: "guest",
        count: 2,
        titleAr: "غرفة الضيوف",
        titleEn: "Guest Room",
        noteAr: "صور غرفة الضيوف.",
        noteEn: "Guest room photos."
    },
    {
        key: "bedroom-1",
        folder: "bedroom-1",
        count: 3,
        titleAr: "غرفة النوم الماستر",
        titleEn: "Master Bedroom",
        noteAr: "صور غرفة النوم الماستر.",
        noteEn: "Master bedroom photos."
    },
    {
        key: "bedroom-2",
        folder: "bedroom-2",
        count: 2,
        titleAr: "غرفة النوم 2",
        titleEn: "Bedroom 2",
        noteAr: "صور غرفة النوم الثانية.",
        noteEn: "Bedroom 2 photos."
    },
    {
        key: "bedroom-3",
        folder: "bedroom-3",
        count: 2,
        titleAr: "غرفة النوم 3",
        titleEn: "Bedroom 3",
        noteAr: "صور غرفة النوم الثالثة.",
        noteEn: "Bedroom 3 photos."
    },
    {
        key: "kitchen",
        folder: "kitchen",
        count: 3,
        titleAr: "المطبخ",
        titleEn: "Kitchen",
        noteAr: "صور المطبخ وتجهيزاته.",
        noteEn: "Kitchen photos."
    },
    {
        key: "bathroom-1",
        folder: "bathroom-1",
        count: 2,
        titleAr: "حمام الماستر",
        titleEn: "Master Bathroom",
        noteAr: "صور حمام غرفة النوم الماستر.",
        noteEn: "Master bathroom photos."
    },
    {
        key: "bathroom-2",
        folder: "bathroom-2",
        count: 2,
        titleAr: "حمام كامل 2",
        titleEn: "Bathroom 2",
        noteAr: "صور الحمام الثاني.",
        noteEn: "Bathroom 2 photos."
    },
    {
        key: "bathroom-3",
        folder: "bathroom-3",
        count: 2,
        titleAr: "حمام كامل 3",
        titleEn: "Bathroom 3",
        noteAr: "صور الحمام الثالث.",
        noteEn: "Bathroom 3 photos."
    },
    {
        key: "laundry",
        folder: "laundry",
        count: 2,
        titleAr: "غرفة الغسيل",
        titleEn: "Laundry Room",
        noteAr: "صور غرفة الغسيل أو مساحة الخدمات.",
        noteEn: "Laundry or service area photos."
    },
    {
        key: "others",
        folder: "others",
        count: 4,
        titleAr: "أخرى",
        titleEn: "Others",
        noteAr: "صور عامة مثل الباب، المدخل، الممر، الدرج، المصعد، وأي تفاصيل إضافية.",
        noteEn: "General photos such as door, entrance, corridor, stairs, elevator, and extra details."
    },
    {
        key: "balcony",
        folder: "balcony",
        count: 2,
        titleAr: "الشرفة",
        titleEn: "Balcony",
        noteAr: "صور الشرفة والإطلالة.",
        noteEn: "Balcony and view photos."
    }
];

/* =========================================================
   تفاصيل الغرف والمرافق
   هذه النصوص منفصلة عن عدد الصور وأسماء مجلداتها
========================================================= */

const DEFAULT_APARTMENT_ROOM_DETAILS = {
    living: {
        noteAr: "جلسة مريحة للاستخدام اليومي مع شاشة Smart TV وتكييف.",
        noteEn: "Comfortable daily seating area with a Smart TV and air conditioning."
    },

    guest: {
        noteAr: "غرفة مستقلة لاستقبال الضيوف مع جلسة وشاشة Smart TV.",
        noteEn: "Separate guest room with comfortable seating and a Smart TV."
    },

    "bedroom-1": {
        noteAr: "غرفة نوم ماستر مع سرير مزدوج وخزائن وحمام خاص.",
        noteEn: "Master bedroom with a double bed, wardrobes and a private bathroom."
    },

    "bedroom-2": {
        noteAr: "غرفة نوم مع أسرّة مريحة وخزانة ملابس وتكييف.",
        noteEn: "Bedroom with comfortable beds, a wardrobe and air conditioning."
    },

    "bedroom-3": {
        noteAr: "غرفة نوم إضافية مناسبة للعائلة أو الإقامة الطويلة.",
        noteEn: "Additional bedroom suitable for families and long stays."
    },

    kitchen: {
        noteAr: "مطبخ مجهز بثلاجة وفرن وموقد وأدوات أساسية للاستخدام اليومي.",
        noteEn: "Kitchen equipped with a refrigerator, oven, cooker and daily essentials."
    },

    "bathroom-1": {
        noteAr: "حمام خاص لغرفة النوم الماستر مع دش وماء ساخن.",
        noteEn: "Private master bathroom with a shower and hot water."
    },

    "bathroom-2": {
        noteAr: "حمام كامل مجهز للاستخدام اليومي.",
        noteEn: "Fully equipped bathroom for daily use."
    },

    "bathroom-3": {
        noteAr: "حمام إضافي لخدمة غرف النوم والضيوف.",
        noteEn: "Additional bathroom serving bedrooms and guests."
    },

    laundry: {
        noteAr: "مساحة خدمات تحتوي على غسالة ملابس وتجهيزات التنظيف.",
        noteEn: "Service area with a washing machine and cleaning facilities."
    },

    others: {
        noteAr: "مدخل مرتب وممرات داخلية ومصعد للوصول إلى الشقة.",
        noteEn: "Organized entrance, internal corridors and elevator access."
    },

    balcony: {
        noteAr: "شرفة مناسبة للتهوية والإطلالة على المنطقة.",
        noteEn: "Balcony providing ventilation and a view of the surrounding area."
    }
};

/*
  تخصيص اختياري لشقة محددة.
  اكتب فقط الغرفة المختلفة، وسيستخدم الموقع التفاصيل العامة للباقي.

  مثال:
  5: {
      living: {
          noteAr: "غرفة معيشة كبيرة مع شاشتين.",
          noteEn: "Large living room with two TVs."
      }
  }
*/
const APARTMENT_ROOM_DETAILS = {
    1: {},
    2: {},
    3: {},
    4: {},
    5: {},
    6: {}
};

function getApartmentRoomDetails(apartmentId, roomKey) {
    return (
        APARTMENT_ROOM_DETAILS[apartmentId]?.[roomKey] ||
        DEFAULT_APARTMENT_ROOM_DETAILS[roomKey] ||
        {}
    );
}

/* =========================================================
   عدد الصور الفعلي لكل شقة ولكل غرفة
   المفتاح الأول = رقم الشقة
   المفتاح الداخلي = key تبع الغرفة من APARTMENT_ROOM_PHOTO_PLAN
========================================================= */
const APARTMENT_ROOM_COUNTS = {
    1: {
        living: 3,
        guest: 5,
        "bedroom-1": 6,
        "bedroom-2": 3,
        "bedroom-3": 4,
        kitchen: 7,
        "bathroom-1": 5,
        "bathroom-2": 4,
        "bathroom-3": 1,
        laundry: 1,
        others: 7,
        balcony: 1
    },

    2: {
        living: 5,
        guest: 5,
        "bedroom-1": 5,
        "bedroom-2": 6,
        "bedroom-3": 3,
        kitchen: 6,
        "bathroom-1": 6,
        "bathroom-2": 4,
        "bathroom-3": 1,
        laundry: 1,
        others: 5,
        balcony: 1
    },

    3: {
        living: 2,
        guest: 2,
        "bedroom-1": 2,
        "bedroom-2": 3,
        "bedroom-3": 3,
        kitchen: 3,
        "bathroom-1": 2,
        "bathroom-2": 1,
        "bathroom-3": 0,
        laundry: 1,
        others: 4,
        balcony: 2
    },

    4: {
        living: 3,
        guest: 6,
        "bedroom-1": 4,
        "bedroom-2": 3,
        "bedroom-3": 2,
        kitchen: 4,
        "bathroom-1": 7,
        "bathroom-2": 2,
        "bathroom-3": 1,
        laundry: 1,
        others: 8,
        balcony: 1
    },

    5: {
        living: 3,
        guest: 3,
        "bedroom-1": 5,
        "bedroom-2": 3,
        "bedroom-3": 4,
        kitchen: 4,
        "bathroom-1": 3,
        "bathroom-2": 3,
        "bathroom-3": 3,
        laundry: 3,
        others: 6,
        balcony: 2
    },

    6: {
        living: 4,
        guest: 2,
        "bedroom-1": 3,
        "bedroom-2": 2,
        "bedroom-3": 2,
        kitchen: 3,
        "bathroom-1": 2,
        "bathroom-2": 2,
        "bathroom-3": 2,
        laundry: 2,
        others: 4,
        balcony: 1
    }
};

/* الشقق التي تم رفع صورها فعليًا */
const APARTMENTS_WITH_PHOTOS = [1, 2, 3, 4, 5];

function getApartmentRoomCount(aptId, room) {
    const id = Number(aptId);

    /*
      مهم جدًا:
      أي شقة غير موجودة هنا لن يحاول الموقع تحميل صورها.
      لما ترفع صور الشقة 4 لاحقًا، فقط أضف رقم 4 فوق.
    */
    if (!APARTMENTS_WITH_PHOTOS.includes(id)) {
        return 0;
    }

    const aptCounts = APARTMENT_ROOM_COUNTS[id] || {};

    /*
      لا نستخدم room.count كاحتياط؛ لأن هذا يسبب طلب صور غير موجودة.
      لازم العدد يكون مكتوب صراحة داخل APARTMENT_ROOM_COUNTS.
    */
    const count =
        aptCounts[room.key] ??
        aptCounts[room.folder] ??
        0;

    return Math.max(0, Number(count) || 0);
}

/* =========================================================
   نظام صور ديناميكي
   يكتشف الصور تلقائيًا حسب الملفات الموجودة داخل المجلدات
========================================================= */
const APARTMENT_IMAGE_EXTENSIONS = ["webp"];

function buildApartmentPhotoPath(aptId, folder, index, ext = "webp") {
    return `images/apartments/apt-${aptId}/${folder}/${index}.${ext}`;
}

function buildApartmentRooms(aptId, oneBalcony = false) {
    return APARTMENT_ROOM_PHOTO_PLAN.map(room => {
        const isBalcony = room.key === "balcony";

        const imageCount = getApartmentRoomCount(aptId, room);
        const roomDetails = getApartmentRoomDetails(aptId, room.key);

        const images = Array.from({ length: imageCount }, (_, index) => {
            return buildApartmentPhotoPath(aptId, room.folder, index + 1, "webp");
        });

        return {
            key: room.key,
            folder: room.folder,
            titleAr: isBalcony && oneBalcony ? "الشرفة" : room.titleAr,
            titleEn: isBalcony && oneBalcony ? "Balcony" : room.titleEn,
            noteAr: isBalcony && oneBalcony
                ? "شرفة واحدة مناسبة للتهوية والإطلالة على المنطقة."
                : (roomDetails.noteAr || room.noteAr),

            noteEn: isBalcony && oneBalcony
                ? "One balcony providing ventilation and a view of the surrounding area."
                : (roomDetails.noteEn || room.noteEn),
            images
        };
    });
}

function getApartmentGalleryImages(apt) {
    if (!apt || !Array.isArray(apt.rooms)) return [];

    const lang = getCurrentLang ? getCurrentLang() : "ar";
    const items = [];

    apt.rooms.forEach(room => {
        const roomTitle = lang === "ar" ? room.titleAr : room.titleEn;

        (room.images || []).forEach((src, index) => {
            items.push({
                src,
                roomKey: room.key,
                roomTitleAr: room.titleAr,
                roomTitleEn: room.titleEn,
                titleAr: `${room.titleAr} ${index + 1}`,
                titleEn: `${room.titleEn} ${index + 1}`,
                label: `${roomTitle} ${index + 1}`
            });
        });
    });

    return items;
}

function getApartmentImageSources(apt) {
    return getApartmentGalleryImages(apt).map(item => item.src);
}

async function loadApartmentGallery(aptId, force = false) {
    const apt = HIJAZI_APARTMENTS[aptId];

    if (!apt) return null;

    if (apt.galleryLoaded && !force) {
        return apt;
    }

    apt.rooms = buildApartmentRooms(aptId, apt.oneBalcony);

    apt.images = getApartmentImageSources(apt);
    apt.galleryLoaded = true;
    apt.coverLoaded = true;

    return apt;
}

async function loadApartmentCoverImage(aptId) {
    const apt = HIJAZI_APARTMENTS[aptId];

    if (!apt) return null;

    if (apt.coverLoaded && apt.images && apt.images.length) {
        return apt;
    }

    const firstRoom = APARTMENT_ROOM_PHOTO_PLAN.find(room => getApartmentRoomCount(aptId, room) > 0);

    if (firstRoom) {
        apt.images = [buildApartmentPhotoPath(aptId, firstRoom.folder, 1, "webp")];
    } else {
        apt.images = [];
    }

    apt.coverLoaded = true;
    return apt;
}

async function loadAllApartmentCoverImages(ids) {
    ids.forEach(id => {
        loadApartmentCoverImage(Number(id));
    });
}
Object.keys(HIJAZI_APARTMENTS).forEach(id => {
    const apt = HIJAZI_APARTMENTS[id];
    const aptId = Number(id);

    if (!apt) return;

    apt.rooms = buildApartmentRooms(aptId, apt.oneBalcony);
    apt.images = [];
    apt.video = "";

    if (apt.oneBalcony) {
        apt.featuresAr = apt.featuresAr.map(f => f === "شرفتان" ? "شرفة واحدة" : f);
        apt.featuresEn = apt.featuresEn.map(f => f === "2 Balconies" ? "1 Balcony" : f);
    }
});
/* =========================
   النصوص المشتركة للترجمة
========================= */
const SITE_TRANSLATIONS = {
    ar: {
        home: "الرئيسية",
        apartments: "الشقق",
        booking: "الحجز",
        about: "من نحن",
        faq: "الأسئلة الشائعة",
        reviews: "التقييمات",
        chooseHijazi: "لماذا تختار Hijazi",
        contactUs: "التحقق من التوافر عبر واتس اب",
        copyright: "© 2026 HIJAZI Apartments - جميع الحقوق محفوظة",
        footerDesc: "شقق مفروشة راقية في قلب عمان الشميساني مناسبة للإقامة الطبية والتنفيذية بالقرب من المستشفيات والمطاعم والكافيهات.",
        address: "عمان، الأردن، الشميساني",
        phoneLabel: "الهاتف",
        emailLabel: "البريد",
        social: "السوشال ميديا",
        longStayNote: "خصم ذهبي للإقامة أكثر من شهر",
        longStayAlert: "سوف يتم التواصل معك للحصول على خصم خاص",
        langArabic: "العربية",
        langEnglish: "English"
    },
    en: {
        home: "Home",
        apartments: "Apartments",
        booking: "Booking",
        about: "About Us",
        faq: "FAQ",
        reviews: "Reviews",
        chooseHijazi: "Why Hijazi",
        contactUs: "Check availability on WhatsApp",
        copyright: "© 2026 HIJAZI Apartments - All rights reserved",
        footerDesc: "Elegant furnished apartments in the heart of Amman, Shmeisani, ideal for medical and executive stays near hospitals, restaurants, and cafés.",
        address: "Amman, Jordan, Shmeisani",
        phoneLabel: "Phone",
        emailLabel: "Email",
        social: "Social Media",
        longStayNote: "Golden discount for stays longer than one month",
        longStayAlert: "We will contact you to offer a special discount",
        langArabic: "العربية",
        langEnglish: "English"
    }
};

/* =========================
   اللغة الحالية
========================= */
function getCurrentLang() {
    return localStorage.getItem("siteLang") || "ar";
}

function setCurrentLang(lang) {
    localStorage.setItem("siteLang", lang);
}

/* =========================
   اتجاه الصفحة حسب اللغة
========================= */
function applyDocumentDirection() {
    const lang = getCurrentLang();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";

    if (document.body) {
        document.body.classList.toggle("ltr-mode", lang === "en");
    }
}

/* =========================
   إنشاء الهيدر المشترك
   showAdminTrigger = true فقط في الصفحة الرئيسية
========================= */
function renderSharedHeader(activePage, showAdminTrigger = false) {
    const lang = getCurrentLang();
    const t = SITE_TRANSLATIONS[lang];
    const headerHost = document.getElementById("sharedHeader");
    if (!headerHost) return;

    const brandClass = showAdminTrigger ? "admin-trigger" : "";
    const navId = "mainNavbarCollapse";

    headerHost.innerHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark fixed-top custom-navbar">
            <div class="container">
                <a class="navbar-brand gold ${brandClass}" href="${showAdminTrigger ? "javascript:void(0)" : "index.html"}">
                    HIJAZI Apartments
                </a>

                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#${navId}" aria-controls="${navId}" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>

                <div class="collapse navbar-collapse" id="${navId}">
                    <ul class="navbar-nav mx-auto align-items-lg-center">
                        <li class="nav-item">
                            <a class="nav-link ${activePage === "index" ? "active" : ""}" href="index.html">${t.home}</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link ${activePage === "apartments" ? "active" : ""}" href="apartments.html">${t.apartments}</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link ${activePage === "booking" ? "active" : ""}" href="booking.html">${t.booking}</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link ${activePage === "about" ? "active" : ""}" href="about.html">${t.about}</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link ${activePage === "faq" ? "active" : ""}" href="faq.html">${t.faq}</a>
                        </li>
                        <li class="nav-item">
                            <a class="nav-link ${activePage === "reviews" ? "active" : ""}" href="reviews.html">${t.reviews}</a>
                        </li>
                    </ul>

                    <div class="lang-switcher-wrapper">
                        <div class="lang-switcher">
                            <button type="button" class="lang-btn ${lang === "ar" ? "active" : ""}" onclick="switchLanguage('ar')">
                                ${t.langArabic}
                            </button>
                            <button type="button" class="lang-btn ${lang === "en" ? "active" : ""}" onclick="switchLanguage('en')">
                                ${t.langEnglish}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    `;

    if (showAdminTrigger) {
        initAdminTrigger();
    }

    initNavbarMobileBehavior(navId);
}

/* =========================
   تحسين سلوك الهيدر على الموبايل
========================= */
function initNavbarMobileBehavior(navId = "mainNavbarCollapse") {
    const navCollapseEl = document.getElementById(navId);
    const toggler = document.querySelector(`.navbar-toggler[data-bs-target="#${navId}"]`);

    if (!navCollapseEl || !toggler || typeof bootstrap === "undefined") return;

    const bsCollapse = bootstrap.Collapse.getOrCreateInstance(navCollapseEl, { toggle: false });

    const navLinks = navCollapseEl.querySelectorAll(".nav-link");
    navLinks.forEach(link => {
        link.addEventListener("click", () => {
            if (window.innerWidth < 992 && navCollapseEl.classList.contains("show")) {
                bsCollapse.hide();
            }
        });
    });

    document.addEventListener("click", (e) => {
        if (window.innerWidth >= 992) return;
        if (!navCollapseEl.classList.contains("show")) return;

        const clickedInsideMenu = navCollapseEl.contains(e.target);
        const clickedToggler = toggler.contains(e.target);

        if (!clickedInsideMenu && !clickedToggler) {
            bsCollapse.hide();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth >= 992 && navCollapseEl.classList.contains("show")) {
            bsCollapse.hide();
        }
    });
}

/* =========================
   إنشاء الفوتر المشترك
========================= */
function renderSharedFooter() {
    const lang = getCurrentLang();
    const t = SITE_TRANSLATIONS[lang];
    const footerHost = document.getElementById("sharedFooter");
    if (!footerHost) return;

    footerHost.innerHTML = `
        <footer class="site-footer">
            <div class="footer-container">
                <div class="footer-box">
                    <h3>HIJAZI Apartments</h3>
                    <p>${t.footerDesc}</p>
                </div>

                <div class="footer-box">
                    <h4>${t.contactUs}</h4>
                    <p>${t.phoneLabel}: <a href="tel:+962789000444">+962789000444</a></p>
                    <p>${t.emailLabel}: <a href="mailto:info@hijazi-apartments.com">info@hijazi-apartments.com</a></p>
                    <p>${t.address}</p>
                </div>

                <div class="footer-box">
                    <h4>${t.social}</h4>
                    <div class="social-links">
                        <a href="https://www.instagram.com/j_ibrahim_j/" target="_blank" rel="noopener noreferrer">Instagram</a>
                        <a href="https://web.facebook.com/abrahem.hjaze.71?locale=ar_AR" target="_blank" rel="noopener noreferrer">Facebook</a>
                        <a href="#" target="_blank" rel="noopener noreferrer">Snapchat</a>
                    </div>
                </div>
            </div>

            <div class="footer-bottom">${t.copyright}</div>
        </footer>
    `;
}

/* =========================
   زر واتساب مشترك
========================= */
function renderWhatsAppWidget() {
    const lang = getCurrentLang();
    const t = SITE_TRANSLATIONS[lang];
    const host = document.getElementById("sharedWhatsApp");
    if (!host) return;

    host.innerHTML = `
        <div class="whatsapp-widget">
            <div class="whatsapp-label">${t.contactUs}</div>
            <a href="https://wa.me/962789000444?text=Hello%20HIJAZI%20Apartments"
               class="whatsapp-float"
               target="_blank"
               rel="noopener noreferrer"
               aria-label="WhatsApp">
                <span class="whatsapp-pulse"></span>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="30" height="30" fill="white">
                    <path d="M19.11 17.27c-.27-.13-1.58-.78-1.82-.87-.24-.09-.41-.13-.59.14-.18.27-.68.87-.84 1.04-.15.18-.31.2-.58.07-.27-.13-1.12-.41-2.13-1.3-.79-.7-1.32-1.57-1.47-1.84-.15-.27-.02-.42.11-.55.11-.11.27-.29.41-.43.14-.15.18-.25.27-.43.09-.18.05-.34-.02-.48-.07-.13-.59-1.43-.81-1.96-.21-.5-.43-.43-.59-.44h-.5c-.18 0-.48.07-.73.34-.25.27-.96.94-.96 2.29s.98 2.65 1.11 2.83c.14.18 1.92 2.93 4.65 4.11.65.28 1.16.45 1.56.58.66.21 1.26.18 1.73.11.53-.08 1.58-.65 1.8-1.27.22-.63.22-1.16.15-1.27-.06-.12-.24-.18-.5-.31z"></path>
                    <path d="M16.02 3.2c-7.07 0-12.8 5.72-12.8 12.77 0 2.25.59 4.45 1.71 6.39L3.1 28.8l6.63-1.73a12.8 12.8 0 0 0 6.29 1.69h.01c7.06 0 12.79-5.72 12.79-12.77 0-3.42-1.34-6.63-3.79-9.04A12.76 12.76 0 0 0 16.02 3.2zm0 23.39h-.01a10.62 10.62 0 0 1-5.41-1.49l-.39-.23-3.94 1.03 1.05-3.84-.25-.4a10.55 10.55 0 0 1-1.63-5.61c0-5.84 4.76-10.59 10.6-10.59 2.82 0 5.47 1.09 7.47 3.08a10.5 10.5 0 0 1 3.11 7.51c0 5.84-4.76 10.59-10.6 10.59z"></path>
                </svg>
            </a>
        </div>
    `;
}

/* =========================
   تغيير اللغة وإعادة تحميل الصفحة
========================= */
function switchLanguage(lang) {
    setCurrentLang(lang);
    location.reload();
}

/* =========================
   حساب عدد الليالي
========================= */
function calcNights(checkIn, checkOut) {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    const diff = end - start;
    return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
}

/* =========================
   فحص الإقامة الطويلة
========================= */
function isLongStay(checkIn, checkOut) {
    return calcNights(checkIn, checkOut) >= 30;
}

/* =========================
   رسالة الخصم الذهبي
========================= */
function renderLongStayNotice(containerId, checkIn, checkOut) {
    const lang = getCurrentLang();
    const t = SITE_TRANSLATIONS[lang];
    const host = document.getElementById(containerId);
    if (!host) return;

    const nights = calcNights(checkIn, checkOut);

    if (nights >= 30) {
        host.innerHTML = `
            <div class="long-stay-box">
                <strong>${t.longStayNote}</strong>
                <div>${t.longStayAlert}</div>
            </div>
        `;
    } else {
        host.innerHTML = `
            <div class="long-stay-note">${t.longStayNote}</div>
        `;
    }
}

/* =========================
   تفعيل دخول الأدمن المخفي
   فقط للصفحة الرئيسية
========================= */
function initAdminTrigger() {
    let adminTapCount = 0;
    let adminTapTimer = null;
    const adminTriggers = document.querySelectorAll(".admin-trigger");

    adminTriggers.forEach((trigger) => {
        trigger.style.cursor = "pointer";

        trigger.addEventListener("click", function (e) {
            e.preventDefault();
            adminTapCount++;

            if (!adminTapTimer) {
                adminTapTimer = setTimeout(() => {
                    adminTapCount = 0;
                    adminTapTimer = null;
                }, 3000);
            }

            if (adminTapCount >= 5) {
                window.location.href = "admin.html";
            }
        });
    });
}

/* =========================
   زر الصعود للأعلى
========================= */
function renderScrollTopButton() {
    const existing = document.getElementById("scrollTopBtn");
    if (existing) return;

    const btn = document.createElement("button");
    btn.id = "scrollTopBtn";
    btn.className = "scroll-top-btn";
    btn.innerHTML = "↑";
    btn.setAttribute("aria-label", "Scroll to top");
    document.body.appendChild(btn);

    btn.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });

    window.addEventListener("scroll", () => {
        btn.style.display = window.scrollY > 250 ? "block" : "none";
    });
}

/* =========================
   تأثير دخول العناصر أثناء التمرير
========================= */
function initFadeInSections() {
    const sections = document.querySelectorAll(".fade-in-section");
    if (!sections.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
            }
        });
    }, {
        threshold: 0.15
    });

    sections.forEach(section => observer.observe(section));
}

/* =========================
   تشغيل عام
========================= */
document.addEventListener("DOMContentLoaded", () => {
    applyDocumentDirection();
    renderScrollTopButton();
    initFadeInSections();
});

/* =========================================================
   HIJAZI Glass Date Picker
   يستبدل تقويم المتصفح الأصلي بتقويم زجاجي
========================================================= */

function initHijaziGlassDatePickers() {
    if (typeof flatpickr === "undefined") return;

    const lang = getCurrentLang ? getCurrentLang() : "ar";

    const dateInputs = document.querySelectorAll('input[type="date"], input.glass-date-input');

    dateInputs.forEach(input => {
        if (input._flatpickr) return;

        input.type = "text";
        input.classList.add("glass-date-input");
        input.setAttribute("autocomplete", "off");
        input.setAttribute("readonly", "readonly");

        flatpickr(input, {
            dateFormat: "Y-m-d",
            minDate: input.min || "today",
            locale: lang === "ar" ? flatpickr.l10ns.ar : "default",
            disableMobile: true,
            allowInput: false,

            onReady: function (_, __, instance) {
                instance.calendarContainer.classList.add("hijazi-glass-calendar");
            },

            onOpen: function (_, __, instance) {
                instance.calendarContainer.classList.add("hijazi-glass-calendar");
            },

            onChange: function () {
                input.dispatchEvent(new Event("change", { bubbles: true }));
            }
        });
    });

    const checkIn = document.getElementById("checkIn");
    const checkOut = document.getElementById("checkOut");

    if (checkIn && checkOut && checkIn._flatpickr && checkOut._flatpickr) {
        checkIn.addEventListener("change", function () {
            checkOut._flatpickr.set("minDate", checkIn.value || "today");

            if (checkOut.value && checkIn.value && checkOut.value <= checkIn.value) {
                checkOut.value = "";
                checkOut._flatpickr.clear();
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", initHijaziGlassDatePickers);