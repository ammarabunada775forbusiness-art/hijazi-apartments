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
   بيانات الشقق المشتركة
========================= */
const HIJAZI_APARTMENTS = {
    1: {
        id: 1,
        location: "وسط البلد",
        mapEmbed: "https://www.google.com/maps?q=%D9%88%D8%B3%D8%B7%20%D8%A7%D9%84%D8%A8%D9%84%D8%AF%20%D8%B9%D9%85%D8%A7%D9%86&z=15&output=embed",
        nameAr: "شقة رقم 1",
        nameEn: "Apartment 1",
        price: 50,
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
    HIJAZI_APARTMENTS[i].price = [50, 55, 60, 65, 70][(i - 2) % 5];
}

/* =========================================================
   تخصيص موقع وخريطة مستقلة لكل شقة
========================================================= */
HIJAZI_APARTMENTS[1].location = "الشميساني - قرب مستشفى الأردن";
HIJAZI_APARTMENTS[1].mapEmbed = "https://www.google.com/maps?q=Jordan%20Hospital%20Amman&z=15&output=embed";

HIJAZI_APARTMENTS[2].location = "الشميساني - قرب المستشفى الإسلامي";
HIJAZI_APARTMENTS[2].mapEmbed = "https://www.google.com/maps?q=Islamic%20Hospital%20Amman&z=15&output=embed";

HIJAZI_APARTMENTS[3].location = "العبدلي - قرب البوليفارد";
HIJAZI_APARTMENTS[3].mapEmbed = "https://www.google.com/maps?q=The%20Boulevard%20Amman&z=15&output=embed";

HIJAZI_APARTMENTS[4].location = "الشميساني - قرب شارع الثقافة";
HIJAZI_APARTMENTS[4].mapEmbed = "https://www.google.com/maps?q=Shmeisani%20Amman&z=15&output=embed";

HIJAZI_APARTMENTS[5].location = "العبدلي - قرب المستشفى التخصصي";
HIJAZI_APARTMENTS[5].mapEmbed = "https://www.google.com/maps?q=Specialty%20Hospital%20Amman&z=15&output=embed";

HIJAZI_APARTMENTS[6].location = "الشميساني - قرب الكافيهات والخدمات";
HIJAZI_APARTMENTS[6].mapEmbed = "https://www.google.com/maps?q=Shmeisani%20restaurants%20Amman&z=15&output=embed";

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
        contactUs: "تواصل معنا",
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
        contactUs: "Contact Us",
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
                    <p>${t.emailLabel}: <a href="mailto:ammarabunada775forbusiness@gmail.com">ammarabunada775forbusiness@gmail.com</a></p>
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