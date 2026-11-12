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
