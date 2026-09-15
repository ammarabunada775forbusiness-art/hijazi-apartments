const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
const script = fs.readFileSync(path.join(__dirname, "../../frontend/js/booking-security.js"), "utf8");
function browserHarness(getConfig) {
    const elements = { bookingSecurity: { hidden: true }, bookingSecurityStatus: { textContent: "" } };
    let widget, resets = 0, renders = 0;
    const window = { turnstile: { render(selector, config) { widget = config; renders++; return "widget-1"; }, reset() { resets++; } } };
    const context = { window, document: { documentElement: { lang: "ar" }, getElementById: id => elements[id],
        addEventListener() {} }, fetch: async () => ({ ok: true, json: async () => ({ success: true, turnstile: await getConfig() }) }),
        AbortSignal, setTimeout, clearTimeout };
    vm.runInNewContext(script, context);
    return { security: window.HijaziBookingSecurity, elements, widget: () => widget, resets: () => resets, renders: () => renders };
}
test("booking UI allows an explicitly disabled server configuration", async () => {
    const ui = browserHarness(() => ({ enabled: false }));
    assert.equal(await ui.security.getToken(), ""); assert.equal(ui.renders(), 0); assert.equal(ui.elements.bookingSecurity.hidden, true);
});
test("booking UI requires a token, forwards it, clears expiry and resets after submission", async () => {
    const ui = browserHarness(() => ({ enabled: true, siteKey: "public-example", action: "booking" }));
    await assert.rejects(ui.security.getToken());
    assert.equal(ui.elements.bookingSecurity.hidden, false); assert.equal(ui.renders(), 1);
    ui.widget().callback("sample-token"); assert.equal(await ui.security.getToken(), "sample-token");
    ui.widget()["expired-callback"](); await assert.rejects(ui.security.getToken());
    ui.widget().callback("another-token"); ui.security.reset();
    assert.equal(ui.resets(), 1); await assert.rejects(ui.security.getToken());
});
test("booking UI rejects a configuration outage and retries without silently bypassing", async () => {
    let attempts = 0;
    const ui = browserHarness(() => { attempts++; throw new Error("offline"); });
    await assert.rejects(ui.security.getToken()); await assert.rejects(ui.security.getToken());
    assert.equal(attempts, 2);
});
test("every classic inline script in both edited HTML pages has valid syntax", () => {
    for (const file of ["booking.html", "admin.html"]) {
        const html = fs.readFileSync(path.join(__dirname, "../../frontend", file), "utf8");
        for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
            if (/type=["']application\/ld\+json/i.test(match[1])) continue;
            new vm.Script(match[2], { filename: file });
        }
        for (const match of html.matchAll(/<script\b[^>]*src=["'](js\/[^"']+)/gi)) {
            assert.equal(fs.existsSync(path.join(__dirname, "../../frontend", match[1].split(/[?#]/)[0])), true, match[1]);
        }
    }
});
