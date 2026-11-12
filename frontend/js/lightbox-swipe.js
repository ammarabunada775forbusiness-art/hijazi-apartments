/* سحب الصور باللمس أو بالماوس داخل عارض الصور (صفحتي الشقق والحجز) */
(function () {
    function attach(opts) {
        const box = opts.box, img = opts.img;
        if (!box || !img) return;

        let startX = 0, startY = 0, dx = 0, active = false, locked = null, busy = false;

        function setX(x, animate) {
            img.style.transition = animate ? "transform .28s cubic-bezier(.2,.8,.2,1), opacity .28s" : "none";
            img.style.transform = x ? `translate3d(${x}px,0,0)` : "";
            img.style.opacity = x ? String(Math.max(0.35, 1 - Math.abs(x) / (window.innerWidth * 1.2))) : "";
        }

        // dir = -1 الصورة تطلع لليسار، 1 لليمين
        function slide(dir, go) {
            if (busy) return;
            busy = true;
            const w = window.innerWidth;
            setX(dir * w * 0.6, true);
            setTimeout(function () {
                go();
                setX(-dir * w * 0.35, false);
                img.getBoundingClientRect();
                setX(0, true);
                setTimeout(function () { busy = false; }, 280);
            }, 200);
        }

        function forward() { return opts.isRTL() ? 1 : -1; } // اتجاه "التالي"

        box.addEventListener("pointerdown", function (e) {
            if (busy || e.button > 0 || e.target.closest("button")) return;
            active = true; locked = null; dx = 0;
            startX = e.clientX; startY = e.clientY;
        });

        box.addEventListener("pointermove", function (e) {
            if (!active) return;
            const x = e.clientX - startX, y = e.clientY - startY;
            if (locked === null && (Math.abs(x) > 8 || Math.abs(y) > 8)) {
                locked = Math.abs(x) > Math.abs(y) ? "x" : "y";
                if (locked === "x") { try { box.setPointerCapture(e.pointerId); } catch (_) {} box.classList.add("dragging"); }
            }
            if (locked === "x") { dx = x; setX(dx, false); }
        });

        function end() {
            if (!active) return;
            active = false;
            box.classList.remove("dragging");
            if (locked !== "x") return;
            box.dataset.justDragged = "1";
            setTimeout(function () { delete box.dataset.justDragged; }, 50);
            const limit = Math.min(90, window.innerWidth * 0.18);
            if (Math.abs(dx) < limit) { setX(0, true); return; }
            const dir = dx < 0 ? -1 : 1;
            slide(dir, dir === forward() ? opts.next : opts.prev);
        }
        box.addEventListener("pointerup", end);
        box.addEventListener("pointercancel", end);

        // ما نسكر العارض إذا الضغطة كانت آخر سحبة
        box.addEventListener("click", function (e) {
            if (box.dataset.justDragged) e.stopImmediatePropagation();
        }, true);

        // الأزرار والأسهم بتعمل نفس الحركة
        if (opts.prevBtn) opts.prevBtn.addEventListener("click", function (e) { e.stopImmediatePropagation(); slide(-forward(), opts.prev); }, true);
        if (opts.nextBtn) opts.nextBtn.addEventListener("click", function (e) { e.stopImmediatePropagation(); slide(forward(), opts.next); }, true);

        // شريط التقدم
        const counter = opts.counter, bar = box.querySelector(".image-lightbox-progress span");
        if (counter && bar) {
            new MutationObserver(function () {
                const m = counter.textContent.match(/(\d+)\s*\/\s*(\d+)/);
                if (m) bar.style.width = (m[1] / m[2] * 100) + "%";
            }).observe(counter, { childList: true, characterData: true, subtree: true });
        }
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
        const ar = (document.documentElement.lang || "ar").startsWith("ar") && document.documentElement.dir !== "ltr";
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
