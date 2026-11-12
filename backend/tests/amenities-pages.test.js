const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const FRONTEND = path.join(__dirname, "../../frontend");
const data = require(path.join(FRONTEND, "js/amenities-data.js"));
const ui = require(path.join(FRONTEND, "js/amenities-ui.js"));
const { build } = require("../../scripts/build-amenities.js");

test("amenities pages are in sync with js/amenities-data.js", () => {
    // If this fails: run `node scripts/build-amenities.js` from the project root.
    assert.deepEqual(build({ check: true }), []);
});

test("every apartment shown on the website has complete facts", () => {
    const main = fs.readFileSync(path.join(FRONTEND, "js/main.js"), "utf8");
    const numbers = main.match(/const APARTMENT_DISPLAY_NUMBERS = Object\.freeze\(\{([\s\S]*?)\}\);/)[1];
    const ids = [...numbers.matchAll(/(\d+):\s*"(\d+)"/g)].map(match => [Number(match[1]), match[2]]);

    assert.ok(ids.length >= 8);

    for (const [id, number] of ids) {
        const facts = data.getApartment(id);

        assert.ok(facts, `apartment ${number} is missing from amenities-data.js`);
        assert.equal(facts.number, number);
        assert.equal(facts.beds.length, facts.bedrooms);
        assert.ok(data.unitTypes[facts.bedrooms].published, `unit type ${facts.bedrooms} must be published`);
        assert.ok(facts.areaSqm > 0 && facts.guestsMax > 0 && facts.bathrooms > 0);
        assert.ok(facts.balconies >= 1, "every apartment has at least one balcony");

        for (const bed of facts.beds) {
            assert.ok(data.bedTypes[bed.bed] && data.roomNames[bed.room]);
        }

        for (const lang of ["ar", "en"]) {
            assert.ok(data.featureList(id, lang).length >= 4);
            assert.match(ui.renderApartmentPanel(id, lang), /am-panel/);
        }
    }
});

test("every amenity has Arabic and English text and a known tag and icon", () => {
    const tags = new Set([undefined, "some", "free", "paid", "varies", "unit"]);
    const lists = [data.basicsList, data.services.free, data.services.included, data.services.paid, data.policies];

    for (const section of data.sections) {
        assert.ok(section.titleAr && section.titleEn && section.introAr && section.introEn);

        for (const group of section.groups) {
            assert.ok(group.titleAr && group.titleEn);
            assert.ok(data.icons[group.icon], `unknown icon ${group.icon}`);
            lists.push(group.items);
        }
    }

    for (const list of lists) {
        for (const item of list) {
            assert.ok(item.ar && item.en, JSON.stringify(item));
            assert.ok(tags.has(item.tag), `unknown tag ${item.tag}`);
        }
    }

    for (const item of [...data.highlights, ...data.basics, ...data.policies]) {
        assert.ok(data.icons[item.icon], `unknown icon ${item.icon}`);
    }

    for (const entry of data.faq) {
        assert.ok(entry.qAr && entry.aAr && entry.qEn && entry.aEn);
    }
});

test("amenities pages have valid structured data and scripts", () => {
    for (const file of ["amenities.html", "amenities-en.html", "apartments.html", "index.html", "faq.html"]) {
        const html = fs.readFileSync(path.join(FRONTEND, file), "utf8");

        for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
            if (/type=["']application\/ld\+json/i.test(match[1])) {
                JSON.parse(match[2]);
            } else {
                new vm.Script(match[2], { filename: file });
            }
        }

        for (const match of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']((?:js|css)\/[^"']+)/gi)) {
            assert.equal(fs.existsSync(path.join(FRONTEND, match[1].split(/[?#]/)[0])), true, `${file}: ${match[1]}`);
        }
    }
});
