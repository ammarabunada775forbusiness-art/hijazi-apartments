\# HIJAZI Apartments | شقق حجازي المفروشة



موقع ويب لحجز شقق مفروشة راقية في عمّان - الأردن، مصمم لتسهيل عرض الشقق، استعراض الصور، فحص التوفر، وإرسال طلبات الحجز بشكل مباشر.



> حالة المشروع: المشروع شبه مكتمل، والمتبقي الأساسي هو رفع جميع صور الشقق وتحسينها، مع بعض اللمسات النهائية على الأداء والتصميم بعد اكتمال الصور.



\---



\## نبذة عن المشروع



\*\*HIJAZI Apartments\*\* هو موقع حجز شقق مفروشة يعرض عدة شقق بطريقة منظمة واحترافية، مع دعم اللغة العربية والإنجليزية، ونظام حجز متصل بقاعدة بيانات، ولوحة إدارة لمتابعة الحجوزات.



الموقع مناسب للعملاء الذين يبحثون عن شقق مفروشة في عمّان، خصوصًا للإقامات الطبية، التنفيذية، والعائلية.



\---



\## روابط المشروع



\* الموقع: https://www.hijazi-apartments.com

\* API: https://api.hijazi-apartments.com

\* GitHub Repository: https://github.com/ammarabunada775forbusiness-art/hijazi-apartments



\---



\## الميزات الأساسية



\* واجهة عربية / إنجليزية.

\* تصميم متجاوب مناسب للموبايل أولًا.

\* عرض الشقق مع التفاصيل والأسعار.

\* معرض صور منظم لكل شقة.

\* تقسيم الصور حسب الغرف:



&#x20; \* غرفة المعيشة

&#x20; \* غرفة الضيوف

&#x20; \* غرف النوم

&#x20; \* المطبخ

&#x20; \* الحمامات

&#x20; \* غرفة الغسيل

&#x20; \* الشرفة

&#x20; \* صور أخرى مثل الباب، المدخل، المصعد، الدرج، والممرات

\* نموذج حجز يحتوي على:



&#x20; \* اختيار الشقة

&#x20; \* تاريخ الدخول والخروج

&#x20; \* عدد البالغين والأطفال

&#x20; \* العملة

&#x20; \* ملاحظات إضافية اختيارية

\* فحص التوفر ومنع الحجز المكرر لنفس الشقة في نفس الفترة.

\* تقويم يعرض حجوزات الشقق.

\* رسالة خاصة للإقامة الطويلة عند الحجز لمدة 30 ليلة أو أكثر.

\* لوحة إدارة للحجوزات.

\* إرسال إشعار بالبريد الإلكتروني عند وجود حجز جديد.

\* زر واتساب ثابت للتواصل السريع.

\* ملفات SEO مثل sitemap و robots.



\---



\## التقنيات المستخدمة



\### Frontend



\* HTML5

\* CSS3

\* JavaScript

\* Bootstrap

\* Flatpickr

\* FullCalendar



\### Backend



\* Node.js

\* Express.js

\* MongoDB Atlas

\* Mongoose

\* Resend Email API

\* Basic Authentication



\### Deployment



\* Frontend: Vercel

\* Backend: Render

\* Database: MongoDB Atlas

\* Domain: GoDaddy



\---



\## هيكلية المشروع



```txt

hijazi-apartments/

│

├── frontend/

│   ├── index.html

│   ├── apartments.html

│   ├── booking.html

│   ├── about.html

│   ├── faq.html

│   ├── reviews.html

│   ├── admin.html

│   │

│   ├── css/

│   │   └── style.css

│   │

│   ├── js/

│   │   └── main.js

│   │

│   ├── images/

│   │   └── apartments/

│   │       ├── apt-1/

│   │       ├── apt-2/

│   │       ├── apt-3/

│   │       ├── apt-4/

│   │       ├── apt-5/

│   │       └── apt-6/

│   │

│   ├── robots.txt

│   └── sitemap.xml

│

├── backend/

│   ├── server.js

│   ├── package.json

│   ├── package-lock.json

│   │

│   └── models/

│       └── Booking.js

│

└── README.md

```



\---



\## هيكلية صور الشقق



يتم ترتيب صور كل شقة داخل مجلد خاص بها، ثم تقسيم الصور حسب نوع الغرفة.



مثال:



```txt

frontend/images/apartments/apt-1/living/1.webp

frontend/images/apartments/apt-1/living/2.webp

frontend/images/apartments/apt-1/guest/1.webp

frontend/images/apartments/apt-1/kitchen/1.webp

frontend/images/apartments/apt-1/others/1.webp

```



يفضل أن تكون الصور:



```txt

Format: WebP

Width: 1200px - 1600px

Recommended size: 150KB - 400KB per image

```



الصور الكبيرة جدًا قد تسبب بطء في الموقع، خصوصًا على الهواتف.



\---



\## نظام الحجز



يعتمد نظام الحجز على فحص تعارض التواريخ للشقة المختارة.



يتم اعتبار الحجز متعارضًا إذا تحقق الشرط التالي:



```txt

existing check-in < selected check-out

existing check-out > selected check-in

```



إذا كانت الشقة محجوزة في الفترة المختارة، يعرض الموقع رسالة توضح فترة الحجز الحالية حتى يختار العميل تاريخًا آخر.



\---



\## Backend Environment Variables



يجب إنشاء ملف `.env` داخل مجلد `backend` يحتوي على المتغيرات التالية:



```env

MONGO\_URI=your\_mongodb\_connection\_string

ADMIN\_USER=your\_admin\_username

ADMIN\_PASS=your\_admin\_password



RESEND\_API\_KEY=your\_resend\_api\_key

RESEND\_FROM=your\_verified\_sender\_email

ADMIN\_EMAIL=your\_admin\_receiver\_email

ENABLE\_CUSTOMER\_EMAIL=true

```



مهم: لا يتم رفع ملف `.env` إلى GitHub لأنه يحتوي على بيانات حساسة.



\---



\## تشغيل الباك إند محليًا



```bash

cd backend

npm install

npm start

```



بعد التشغيل، يعمل السيرفر غالبًا على:



```txt

http://localhost:10000

```



\---



\## API Routes



\### Public Routes



```txt

GET  /

GET  /health

GET  /health/db

GET  /availability

GET  /calendar

GET  /bookings

POST /bookings

```



\### Admin Routes



```txt

GET    /admin/db-test

GET    /admin/bookings

DELETE /admin/bookings/:id

```



مسارات الأدمن محمية باستخدام Basic Authentication.



\---



\## ملاحظات التصميم



يعتمد الموقع على هوية بصرية فاخرة باللونين الأسود والذهبي، مع عناصر زجاجية، بطاقات واضحة، وتجربة استخدام مناسبة للموبايل.



أهم أهداف التصميم:



\* سهولة تصفح الشقق.

\* وضوح الأسعار والتفاصيل.

\* سهولة إرسال طلب الحجز.

\* عرض الصور بطريقة منظمة.

\* تجربة جيدة على الهاتف.



\---



\## SEO



تم تجهيز المشروع ليكون مناسبًا لمحركات البحث من خلال:



\* Meta tags.

\* Sitemap.

\* Robots file.

\* صفحات منفصلة للشقق والحجز والأسئلة الشائعة.

\* محتوى عربي وإنجليزي.



\---



\## المهام المتبقية



\* رفع جميع صور الشقق.

\* ضغط وتحسين الصور قبل رفعها.

\* مراجعة أداء معرض الصور بعد اكتمال الرفع.

\* اختبار الحجز النهائي على الهاتف والكمبيوتر.

\* مراجعة SEO بعد اكتمال الصور.

\* إضافة تحسينات مستقبلية حسب الحاجة.



\---



\## Developer



Developed by \*\*Ammar Abu Nada\*\*.



\---



\## English Summary



\*\*HIJAZI Apartments\*\* is a full-stack furnished apartments booking website for premium apartments in Amman, Jordan.



The project includes apartment listings, bilingual Arabic/English support, apartment photo galleries, availability checking, booking requests, an admin dashboard, MongoDB database integration, and email notifications.



The main development is completed, and the remaining work is mainly uploading and optimizing apartment images, followed by final performance and SEO checks.



\---



\## License



This project is private/business work for HIJAZI Apartments.

All rights reserved.



