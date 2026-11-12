/* عارض صور على طريقة الآيفون (صفحتي الشقق والحجز)
   - الصور جنب بعض، والسحب بيحرك الصورة الحالية واللي بعدها مع الإصبع
   - شريط صور مصغرة تحت، بتقدر تسحبه للتنقل السريع
   - سحب لتحت بيسكر العارض */
(function () {
    const GAP = 16;
    const EASE = "cubic-bezier(.22,.8,.24,1)";

    function attach(o) {
        const box = o.box;
        if (!box) return;
        const stage = box.querySelector(".image-lightbox-stage");
        const closeBtn = box.querySelector(".image-lightbox-close");

        const viewport = document.createElement("div");
        viewport.className = "lb-viewport";
        const track = document.createElement("div");
        track.className = "lb-track";
        viewport.appendChild(track);
        stage.insertBefore(viewport, stage.firstChild);

        const strip = document.createElement("div");
        strip.className = "lb-strip";
        strip.setAttribute("aria-hidden", "true");
        box.appendChild(strip);

        const slides = [-1, 0, 1].map(function () {
            const s = document.createElement("div");
            s.className = "lb-slide";
            const img = document.createElement("img");
            img.decoding = "async";
            img.draggable = false;
            s.appendChild(img);
            track.appendChild(s);
            return s;
        });

        let items = [], index = 0, stripFor = null, animating = false;
        const rtl = () => o.isRTL();
        const sign = () => (rtl() ? -1 : 1);          // وين "التالي": يمين (1) أو يسار (-1)
        const step = () => viewport.clientWidth + GAP;

        function setTrack(x, ms) {
            track.style.transition = ms ? `transform ${ms}ms ${EASE}` : "none";
            track.style.transform = `translate3d(${x}px,0,0)`;
        }

        function layout() {
            slides.forEach(function (s, i) {
                const k = i - 1;
                s.style.transform = `translate3d(${k * step() * sign()}px,0,0)`;
                const it = items[index + k];
                const img = s.firstChild;
                if (it) {
                    if (img.getAttribute("src") !== it.src) img.src = it.src;
                    img.alt = "";
                    s.style.visibility = "";
                } else {
                    s.style.visibility = "hidden";
                }
            });
            setTrack(0, 0);
        }

        function buildStrip() {
            if (stripFor === items) return;
            stripFor = items;
            strip.innerHTML = "";
            strip.dir = rtl() ? "rtl" : "ltr";
            items.forEach(function (it, i) {
                const b = document.createElement("button");
                b.type = "button";
                b.className = "lb-thumb";
                b.tabIndex = -1;
                b.innerHTML = `<img src="${it.src}" alt="" loading="lazy" decoding="async" draggable="false">`;
                b.addEventListener("click", function () { go(i, false); });
                strip.appendChild(b);
            });
        }

        let stripProgrammatic = 0;
        function syncStrip(smooth) {
            const t = strip.children[index];
            Array.prototype.forEach.call(strip.children, (c, i) => c.classList.toggle("active", i === index));
            if (!t) return;
            stripProgrammatic = Date.now();
            const left = t.offsetLeft + t.offsetWidth / 2 - strip.clientWidth / 2;
            strip.scrollTo({ left: left, behavior: smooth ? "smooth" : "auto" });
        }

        // لما المستخدم يسحب الشريط: الصورة اللي بالنص هي اللي بتنعرض
        let stripTimer;
        strip.addEventListener("scroll", function () {
            if (Date.now() - stripProgrammatic < 450) return;
            clearTimeout(stripTimer);
            stripTimer = setTimeout(function () {
                const mid = strip.getBoundingClientRect().left + strip.clientWidth / 2;
                let best = index, bd = Infinity;
                Array.prototype.forEach.call(strip.children, function (c, i) {
                    const r = c.getBoundingClientRect();
                    const d = Math.abs(r.left + r.width / 2 - mid);
                    if (d < bd) { bd = d; best = i; }
                });
                if (best !== index) go(best, false, true);
            }, 40);
        }, { passive: true });

        function go(i, animate, fromStrip) {
            i = Math.max(0, Math.min(items.length - 1, i));
            if (i === index && !animate) return;
            const k = i - index;
            const done = function () {
                index = i;
                o.goTo(i);          // بيحدث العنوان والعداد بالصفحة
                layout();
                if (!fromStrip) syncStrip(true);
                else Array.prototype.forEach.call(strip.children, (c, j) => c.classList.toggle("active", j === index));
            };
            if (animate && Math.abs(k) === 1) {
                animating = true;
                setTrack(-k * step() * sign(), 320);
                setTimeout(function () { animating = false; done(); }, 330);
            } else {
                done();
            }
        }

        function open() {
            items = o.getItems() || [];
            index = o.getIndex() || 0;
            stripFor = null;
            box.style.removeProperty("--lb-bg");
            viewport.style.transform = "";
            layout();
            buildStrip();
            requestAnimationFrame(function () { syncStrip(false); });
        }

        // أي تغيير من برا (الكيبورد مثلاً) بنلحقه
        if (o.counter) {
            new MutationObserver(function () {
                if (animating || !box.classList.contains("open")) return;
                const i = o.getIndex();
                if (i !== index && items.length) { index = i; layout(); syncStrip(true); }
            }).observe(o.counter, { childList: true, characterData: true, subtree: true });
        }

        let wasOpen = false;
        new MutationObserver(function () {
            const isOpen = box.classList.contains("open");
            if (isOpen && !wasOpen) open();
            wasOpen = isOpen;
        }).observe(box, { attributes: true, attributeFilter: ["class"] });

        window.addEventListener("resize", function () { if (box.classList.contains("open")) { layout(); syncStrip(false); } });

        /* ===== السحب ===== */
        let sx = 0, sy = 0, dx = 0, dy = 0, lock = null, down = false, t0 = 0, lastX = 0, lastT = 0, vx = 0;

        viewport.addEventListener("pointerdown", function (e) {
            if (animating || e.button > 0) return;
            down = true; lock = null; dx = dy = 0;
            sx = lastX = e.clientX; sy = e.clientY; t0 = lastT = performance.now(); vx = 0;
        });

        viewport.addEventListener("pointermove", function (e) {
            if (!down) return;
            dx = e.clientX - sx; dy = e.clientY - sy;
            if (!lock && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
                lock = Math.abs(dx) >= Math.abs(dy) ? "x" : (dy > 0 ? "y" : "none");
                if (lock !== "none") { try { viewport.setPointerCapture(e.pointerId); } catch (_) {} }
            }
            const now = performance.now();
            if (now > lastT) { vx = (e.clientX - lastX) / (now - lastT); lastX = e.clientX; lastT = now; }
            if (lock === "x") {
                const toNext = dx * sign() < 0;
                const atEdge = (toNext && index >= items.length - 1) || (!toNext && index <= 0);
                setTrack(atEdge ? dx * 0.3 : dx, 0);
            } else if (lock === "y") {
                const p = Math.min(1, Math.max(0, dy) / 400);
                viewport.style.transition = "none";
                viewport.style.transform = `translate3d(0,${Math.max(0, dy)}px,0) scale(${1 - p * 0.25})`;
                box.style.setProperty("--lb-bg", String(1 - p));
            }
        });

        function end() {
            if (!down) return;
            down = false;
            if (lock === "x") {
                const fast = Math.abs(vx) > 0.45 && Math.abs(dx) > 20;
                const far = Math.abs(dx) > Math.min(120, step() * 0.25);
                const toNext = (fast ? vx : dx) * sign() < 0;
                const target = index + (toNext ? 1 : -1);
                if ((fast || far) && target >= 0 && target < items.length) {
                    go(target, true);
                } else {
                    setTrack(0, 280);
                }
            } else if (lock === "y") {
                if (dy > 110) {
                    closeBtn && closeBtn.click();
                } else {
                    viewport.style.transition = `transform 260ms ${EASE}`;
                    viewport.style.transform = "";
                    box.style.removeProperty("--lb-bg");
                }
            }
            lock = null;
        }
        viewport.addEventListener("pointerup", end);
        viewport.addEventListener("pointercancel", end);

        // ضغطة على الخلفية الفاضية حوالين الصورة بتسكر، بس مش بعد سحب
        viewport.addEventListener("click", function (e) {
            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) { e.stopPropagation(); return; }
            if (e.target.tagName !== "IMG") closeBtn && closeBtn.click();
        });
    }

    window.HijaziLightboxSwipe = { attach: attach };
})();

/* تلميح شفاف أول ما ينفتح العارض: اسحب للتنقل */
(function () {
    const box = document.getElementById("imageLightbox");
    if (!box) return;
    const hint = document.createElement("div");
    hint.className = "image-lightbox-hint";
    hint.setAttribute("aria-hidden", "true");
    hint.innerHTML =
        '<div class="hint-hand"><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10"/><path d="M12 10V8.5a1.5 1.5 0 0 1 3 0V11"/><path d="M15 11v-1a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1-6 6h-1.2a5 5 0 0 1-4-2l-2.6-3.6a1.5 1.5 0 0 1 2.3-1.9L9 15"/></svg></div>' +
        '<div class="hint-arrows"><span>‹</span><span>›</span></div><div class="hint-text"></div>';
    box.appendChild(hint);
    let timer;
    function show() {
        const ar = document.documentElement.dir !== "ltr";
        hint.querySelector(".hint-text").textContent = ar ? "اسحب يمين أو يسار للتنقل بين الصور" : "Swipe left or right to browse photos";
        hint.classList.remove("show"); void hint.offsetWidth; hint.classList.add("show");
        clearTimeout(timer);
        timer = setTimeout(function () { hint.classList.remove("show"); }, 1600);
    }
    let wasOpen = false;
    new MutationObserver(function () {
        const open = box.classList.contains("open");
        if (open && !wasOpen) show();
        if (!open) hint.classList.remove("show");
        wasOpen = open;
    }).observe(box, { attributes: true, attributeFilter: ["class"] });
    box.addEventListener("pointerdown", function () { hint.classList.remove("show"); });
})();
