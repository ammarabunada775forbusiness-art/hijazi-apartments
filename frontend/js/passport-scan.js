/* =========================================================
   قراءة صورة الجواز داخل المتصفح نفسه

   - الصورة لا تُرفع لأي سيرفر ولا تُحفظ؛ تبقى في ذاكرة الصفحة فقط.
   - أداة القراءة (Tesseract.js) تُحمّل من jsDelivr عند أول استعمال
     بنسخة مثبتة، وبعدها يحفظ المتصفح ملف اللغة عنده.
   - نقرأ سطري MRZ (<<<) ونتحقق منهما بأرقام التحقق في passport-mrz.js.
========================================================= */
(function (root) {
    "use strict";

    const OCR_ASSETS = Object.freeze({
        script: "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/tesseract.min.js",
        integrity: "sha384-2BQ3U3OdKOb0Uczxqr41I9UvZkzr4V9Hv8uSzMMZAlmhsFClvdZX5wi5fDCzG+tM",
        workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@7.0.0/dist/worker.min.js",
        corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@7.0.0",
        langPath: "https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int"
    });

    const MRZ_CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<";
    const WORKER_IDLE_MS = 3 * 60 * 1000;
    const MAX_SKEW = (20 * Math.PI) / 180;
    const MAX_CROP_SIDE = 3200;

    let libraryPromise = null;
    let workerPromise = null;
    let idleTimer = null;
    let progressListener = null;
    let scanning = false;

    function loadLibrary() {
        if (root.Tesseract) return Promise.resolve(root.Tesseract);

        if (!libraryPromise) {
            libraryPromise = new Promise((resolve, reject) => {
                const script = document.createElement("script");
                script.src = OCR_ASSETS.script;
                script.integrity = OCR_ASSETS.integrity;
                script.crossOrigin = "anonymous";
                script.async = true;
                script.onload = () => (root.Tesseract
                    ? resolve(root.Tesseract)
                    : reject(new Error("تعذر تشغيل أداة قراءة الجواز.")));
                script.onerror = () => {
                    libraryPromise = null;
                    script.remove();
                    reject(new Error("تعذر تحميل أداة قراءة الجواز. تأكد من الإنترنت وجرّب مرة ثانية."));
                };
                document.head.appendChild(script);
            });
        }

        return libraryPromise;
    }

    function getWorker() {
        clearTimeout(idleTimer);

        if (!workerPromise) {
            workerPromise = loadLibrary()
                .then(Tesseract => Tesseract.createWorker("eng", 1, {
                    workerPath: OCR_ASSETS.workerPath,
                    corePath: OCR_ASSETS.corePath,
                    langPath: OCR_ASSETS.langPath,
                    logger: message => progressListener && progressListener(message)
                }))
                .catch(error => {
                    workerPromise = null;
                    throw error;
                });
        }

        return workerPromise;
    }

    /* نطفي أداة القراءة بعد 3 دقائق بدون استعمال حتى نوفّر ذاكرة الجوال */
    function releaseLater() {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(async () => {
            const pending = workerPromise;
            workerPromise = null;
            try {
                const worker = await pending;
                if (worker) await worker.terminate();
            } catch (error) {
                // لا شيء؛ الأداة ستُنشأ من جديد عند المسح القادم
            }
        }, WORKER_IDLE_MS);
    }

    /* تحميل مسبق عند فتح اختيار الصورة حتى لا ينتظر المستخدم لاحقًا */
    function preload() {
        getWorker().then(releaseLater).catch(() => { });
    }

    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const image = new Image();
            image.decoding = "async";
            image.onload = () => {
                URL.revokeObjectURL(url);
                resolve(image);
            };
            image.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("صيغة الصورة غير مدعومة. جرّب صورة JPG أو PNG أو لقطة شاشة."));
            };
            image.src = url;
        });
    }

    function createCanvas(width, height) {
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(width));
        canvas.height = Math.max(1, Math.round(height));
        return canvas;
    }

    /* حجم مناسب للقراءة: الصور الصغيرة نكبرها والكبيرة نصغرها */
    function workingCanvas(image) {
        const width = image.naturalWidth || image.width;
        const height = image.naturalHeight || image.height;
        const longSide = Math.max(width, height);
        const target = Math.min(2400, Math.max(1600, longSide));
        const scale = target / longSide;
        const canvas = createCanvas(width * scale, height * scale);
        const context = canvas.getContext("2d");
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas;
    }

    function rotatedCanvas(source, degrees) {
        if (!degrees) return source;
        const sideways = degrees % 180 !== 0;
        const canvas = createCanvas(
            sideways ? source.height : source.width,
            sideways ? source.width : source.height
        );
        const context = canvas.getContext("2d");
        context.translate(canvas.width / 2, canvas.height / 2);
        context.rotate((degrees * Math.PI) / 180);
        context.drawImage(source, -source.width / 2, -source.height / 2);
        return canvas;
    }

    function allLines(data) {
        const lines = [];
        (data.blocks || []).forEach(block =>
            (block.paragraphs || []).forEach(paragraph =>
                (paragraph.lines || []).forEach(line => lines.push(line))));
        return lines;
    }

    /* أسطر MRZ المتتالية في أسفل الصفحة */
    function findMrzLines(data) {
        const candidates = allLines(data)
            .filter(line => line.bbox && root.HijaziMrz.looksLikeMrzLine(line.text))
            .sort((first, second) => first.bbox.y0 - second.bbox.y0);

        if (!candidates.length) return [];

        const group = [candidates[candidates.length - 1]];
        for (let index = candidates.length - 2; index >= 0 && group.length < 3; index--) {
            const line = candidates[index];
            const next = group[0];
            const height = Math.max(8, next.bbox.y1 - next.bbox.y0);
            if (next.bbox.y0 - line.bbox.y1 > height * 2.5) break;
            group.unshift(line);
        }

        return group;
    }

    function lineAngle(lines) {
        const angles = lines
            .map(line => line.baseline)
            .filter(baseline => baseline && baseline.x1 > baseline.x0)
            .map(baseline => Math.atan2(baseline.y1 - baseline.y0, baseline.x1 - baseline.x0));
        if (!angles.length) return 0;
        return angles.reduce((total, angle) => total + angle, 0) / angles.length;
    }

    /* مقاسات منطقة MRZ بعد تعديل الميلان */
    function mrzGeometry(lines) {
        const x0 = Math.min(...lines.map(line => line.bbox.x0));
        const y0 = Math.min(...lines.map(line => line.bbox.y0));
        const x1 = Math.max(...lines.map(line => line.bbox.x1));
        const y1 = Math.max(...lines.map(line => line.bbox.y1));
        const angle = lineAngle(lines);
        const width = (x1 - x0) / Math.cos(angle);
        const skew = (x1 - x0) * Math.abs(Math.tan(angle));
        const textHeight = Math.max(8, (y1 - y0 - skew) / lines.length);

        return {
            angle,
            centerX: (x0 + x1) / 2,
            centerY: (y0 + y1) / 2,
            width,
            height: Math.max(textHeight * lines.length * 1.4, y1 - y0 - skew),
            textHeight
        };
    }

    /*
       يقص مستطيلًا مائلًا من الصورة ويعدّله أفقيًا.
       offsetY: إزاحة المركز للأعلى (بالبكسل على محور الصفحة بعد التعديل).
    */
    function deskewedCrop(source, geometry, width, height, offsetY, requestedScale, contrast) {
        const { angle } = geometry;
        const centerX = geometry.centerX + offsetY * Math.sin(angle);
        const centerY = geometry.centerY - offsetY * Math.cos(angle);
        const scale = Math.min(requestedScale, MAX_CROP_SIDE / Math.max(width, height));
        const canvas = createCanvas(width * scale, height * scale);
        const context = canvas.getContext("2d", { willReadFrequently: true });

        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.imageSmoothingQuality = "high";
        context.translate(canvas.width / 2, canvas.height / 2);
        context.scale(scale, scale);
        context.rotate(-angle);
        context.drawImage(source, -centerX, -centerY);

        stretchContrast(canvas, context, contrast.dark, contrast.light);
        return canvas;
    }

    /* سطور MRZ مكبّرة حتى يصير ارتفاع الحرف حوالي 46 بكسل */
    function mrzCrop(source, geometry) {
        const scale = Math.min(3, Math.max(1, 46 / geometry.textHeight));
        return deskewedCrop(
            source,
            geometry,
            geometry.width + geometry.textHeight * 2.4,
            geometry.height + geometry.textHeight * 1.8,
            0,
            scale,
            { dark: 0.01, light: 0.05 }
        );
    }

    /*
       صفحة البيانات فوق سطور MRZ (عرضها تقريبًا عرض السطور وارتفاعها 70% منه).
       تباين قوي يمسح الزخارف الفاتحة في خلفية الجواز ويبقي الكتابة.
    */
    function printedPageCrop(source, geometry) {
        const width = geometry.width * 1.12;
        const height = width * 0.72;
        const offsetY = height / 2 - geometry.height / 2;
        const scale = Math.min(2, Math.max(1, 1600 / width));
        return deskewedCrop(source, geometry, width, height, offsetY, scale, { dark: 0.02, light: 0.5 });
    }

    function stretchContrast(canvas, context, darkShare, lightShare) {
        const image = context.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = image.data;
        const histogram = new Uint32Array(256);
        const gray = new Uint8Array(pixels.length / 4);

        for (let index = 0, pixel = 0; index < pixels.length; index += 4, pixel++) {
            const value = (pixels[index] * 299 + pixels[index + 1] * 587 + pixels[index + 2] * 114) / 1000;
            gray[pixel] = value;
            histogram[gray[pixel]]++;
        }

        const total = gray.length;
        let low = 0;
        let high = 255;
        for (let sum = 0; low < 255 && (sum += histogram[low]) < total * darkShare; low++);
        for (let sum = 0; high > 0 && (sum += histogram[high]) < total * lightShare; high--);
        const range = Math.max(1, high - low);

        for (let index = 0, pixel = 0; index < pixels.length; index += 4, pixel++) {
            const value = Math.max(0, Math.min(255, ((gray[pixel] - low) * 255) / range));
            pixels[index] = pixels[index + 1] = pixels[index + 2] = value;
        }

        context.putImageData(image, 0, 0);
    }

    async function recognize(worker, image, parameters, output) {
        await worker.setParameters(parameters);
        const { data } = await worker.recognize(image, {}, output);
        return data;
    }

    /*
       يقرأ صورة جواز أو هوية ويرجّع بيانات جاهزة لتعبئة الحجز.
       onProgress يستقبل { stage: "loading" | "reading", progress: 0..1, step }
    */
    async function read(file, options = {}) {
        if (!file) throw new Error("اختر صورة الجواز أولًا.");
        if (!root.HijaziMrz) throw new Error("ملف قراءة الجواز غير محمّل.");
        if (scanning) throw new Error("في قراءة شغالة حاليًا، استنى لحظة.");

        scanning = true;
        const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => { };
        let step = 1;

        progressListener = message => {
            const status = String(message && message.status || "");
            const progress = Number(message && message.progress) || 0;
            onProgress({
                stage: status === "recognizing text" ? "reading" : "loading",
                progress,
                step
            });
        };

        try {
            onProgress({ stage: "loading", progress: 0, step });
            const [image, worker] = await Promise.all([loadImage(file), getWorker()]);
            const base = workingCanvas(image);
            let page = null;
            let canvas = base;
            let mrzLines = [];

            // المحاولة الأولى: الصفحة كاملة؛ وإذا الصورة مقلوبة أو مايلة 90 درجة نلفها
            const tried = new Set();
            let degrees = 0;

            while (degrees !== undefined) {
                tried.add(degrees);
                canvas = rotatedCanvas(base, degrees);
                page = await recognize(worker, canvas,
                    { tessedit_char_whitelist: "", tessedit_pageseg_mode: "3" },
                    { text: true, blocks: true });

                const lines = findMrzLines(page);
                const angle = lineAngle(lines);

                if (lines.length >= 2 && Math.abs(angle) <= MAX_SKEW) {
                    mrzLines = lines;
                    break;
                }

                // سطور عمودية: نعرف من اتجاهها كم لازم نلف الصورة
                const vertical = lines.length >= 2 && Math.abs(Math.abs(angle) - Math.PI / 2) <= MAX_SKEW;
                const suggested = vertical ? (degrees + (angle > 0 ? 270 : 90)) % 360 : undefined;
                degrees = suggested !== undefined && !tried.has(suggested)
                    ? suggested
                    : [0, 90, 270, 180].find(option => !tried.has(option));
                step++;
            }

            if (mrzLines.length < 2) {
                throw new Error("ما قدرت ألاقي السطور اللي فيها <<< تحت صفحة الجواز. صوّر صفحة البيانات كاملة وبوضوح وبدون انعكاس ضوء.");
            }

            const geometry = mrzGeometry(mrzLines);
            const results = [root.HijaziMrz.parse(page.text, options)];

            // إذا ما تأكدنا من كل الحقول: نقص السطور ونكبرها ونقرأها مرة ومرتين
            if (!root.HijaziMrz.isComplete(results)) {
                const crop = mrzCrop(canvas, geometry);
                step++;
                const plain = await recognize(worker, crop,
                    { tessedit_char_whitelist: "", tessedit_pageseg_mode: "6" }, { text: true });
                results.push(root.HijaziMrz.parse(plain.text, options));

                if (!root.HijaziMrz.isComplete(results)) {
                    step++;
                    const strict = await recognize(worker, crop,
                        { tessedit_char_whitelist: MRZ_CHARACTERS, tessedit_pageseg_mode: "6" }, { text: true });
                    results.push(root.HijaziMrz.parse(strict.text, options));
                }
            }

            let printedText = page.text;
            let combined = root.HijaziMrz.combine(results, printedText, options);

            // تاريخ الإصدار مش موجود في MRZ: نقرأ صفحة البيانات المطبوعة بتباين أقوى
            if (combined && !combined.issueDate) {
                step++;
                const printed = await recognize(worker, printedPageCrop(canvas, geometry),
                    { tessedit_char_whitelist: "", tessedit_pageseg_mode: "3" }, { text: true });
                printedText = `${page.text}\n${printed.text}`;
                combined = root.HijaziMrz.combine(results, printedText, options);
            }

            const guest = root.HijaziMrz.toGuestDocument(combined);

            if (!guest || (!guest.passportNumber && !guest.dateOfBirth && !guest.fullName)) {
                throw new Error("قرأت الصورة بس البيانات مش واضحة. جرّب صورة أوضح أو قرّب على صفحة البيانات.");
            }

            return guest;
        } finally {
            scanning = false;
            progressListener = null;
            releaseLater();
        }
    }

    root.HijaziPassportScan = Object.freeze({ read, preload, assets: OCR_ASSETS });
})(window);
