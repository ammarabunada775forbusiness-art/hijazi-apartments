/* =========================================================
   قراءة سطور MRZ في الجواز أو الهوية (معيار ICAO 9303)

   هذا الملف لا يقرأ الصورة؛ يستقبل النص الذي خرج من OCR
   ويصلح أخطاءه الشائعة ويتحقق من كل حقل بأرقام التحقق.
   يعمل في المتصفح (window.HijaziMrz) وفي اختبارات Node.
========================================================= */
(function (root) {
    "use strict";

    /* الدول: الرمز | اسم الدولة | الجنسية (كما تظهر على نموذج الحجز) */
    const COUNTRY_DATA = `
ABW|ARUBA|ARUBAN;AFG|AFGHANISTAN|AFGHAN;AGO|ANGOLA|ANGOLAN;AIA|ANGUILLA|ANGUILLAN;ALA|ALAND ISLANDS|ALAND ISLANDER;
ALB|ALBANIA|ALBANIAN;AND|ANDORRA|ANDORRAN;ARE|UNITED ARAB EMIRATES|EMIRATI;ARG|ARGENTINA|ARGENTINE;ARM|ARMENIA|ARMENIAN;
ASM|AMERICAN SAMOA|AMERICAN SAMOAN;ATA|ANTARCTICA|ANTARCTIC;ATF|FRENCH SOUTHERN TERRITORIES|FRENCH;ATG|ANTIGUA AND BARBUDA|ANTIGUAN;
AUS|AUSTRALIA|AUSTRALIAN;AUT|AUSTRIA|AUSTRIAN;AZE|AZERBAIJAN|AZERBAIJANI;BDI|BURUNDI|BURUNDIAN;BEL|BELGIUM|BELGIAN;
BEN|BENIN|BENINESE;BES|BONAIRE, SINT EUSTATIUS AND SABA|DUTCH;BFA|BURKINA FASO|BURKINABE;BGD|BANGLADESH|BANGLADESHI;
BGR|BULGARIA|BULGARIAN;BHR|BAHRAIN|BAHRAINI;BHS|BAHAMAS|BAHAMIAN;BIH|BOSNIA AND HERZEGOVINA|BOSNIAN;BLM|SAINT BARTHELEMY|FRENCH;
BLR|BELARUS|BELARUSIAN;BLZ|BELIZE|BELIZEAN;BMU|BERMUDA|BERMUDIAN;BOL|BOLIVIA|BOLIVIAN;BRA|BRAZIL|BRAZILIAN;BRB|BARBADOS|BARBADIAN;
BRN|BRUNEI|BRUNEIAN;BTN|BHUTAN|BHUTANESE;BVT|BOUVET ISLAND|NORWEGIAN;BWA|BOTSWANA|BOTSWANAN;CAF|CENTRAL AFRICAN REPUBLIC|CENTRAL AFRICAN;
CAN|CANADA|CANADIAN;CCK|COCOS (KEELING) ISLANDS|AUSTRALIAN;CHE|SWITZERLAND|SWISS;CHL|CHILE|CHILEAN;CHN|CHINA|CHINESE;
CIV|COTE D'IVOIRE|IVORIAN;CMR|CAMEROON|CAMEROONIAN;COD|DR CONGO|CONGOLESE;COG|CONGO|CONGOLESE;COK|COOK ISLANDS|COOK ISLANDER;
COL|COLOMBIA|COLOMBIAN;COM|COMOROS|COMORIAN;CPV|CABO VERDE|CAPE VERDEAN;CRI|COSTA RICA|COSTA RICAN;CUB|CUBA|CUBAN;
CUW|CURACAO|CURACAOAN;CXR|CHRISTMAS ISLAND|AUSTRALIAN;CYM|CAYMAN ISLANDS|CAYMANIAN;CYP|CYPRUS|CYPRIOT;CZE|CZECHIA|CZECH;
DEU|GERMANY|GERMAN;DJI|DJIBOUTI|DJIBOUTIAN;DMA|DOMINICA|DOMINICAN;DNK|DENMARK|DANISH;DOM|DOMINICAN REPUBLIC|DOMINICAN;
DZA|ALGERIA|ALGERIAN;ECU|ECUADOR|ECUADORIAN;EGY|EGYPT|EGYPTIAN;ERI|ERITREA|ERITREAN;ESH|WESTERN SAHARA|SAHRAWI;ESP|SPAIN|SPANISH;
EST|ESTONIA|ESTONIAN;ETH|ETHIOPIA|ETHIOPIAN;FIN|FINLAND|FINNISH;FJI|FIJI|FIJIAN;FLK|FALKLAND ISLANDS|FALKLAND ISLANDER;
FRA|FRANCE|FRENCH;FRO|FAROE ISLANDS|FAROESE;FSM|MICRONESIA|MICRONESIAN;GAB|GABON|GABONESE;GBR|UNITED KINGDOM|BRITISH;
GEO|GEORGIA|GEORGIAN;GGY|GUERNSEY|BRITISH;GHA|GHANA|GHANAIAN;GIB|GIBRALTAR|GIBRALTARIAN;GIN|GUINEA|GUINEAN;GLP|GUADELOUPE|FRENCH;
GMB|GAMBIA|GAMBIAN;GNB|GUINEA-BISSAU|BISSAU-GUINEAN;GNQ|EQUATORIAL GUINEA|EQUATORIAL GUINEAN;GRC|GREECE|GREEK;GRD|GRENADA|GRENADIAN;
GRL|GREENLAND|GREENLANDIC;GTM|GUATEMALA|GUATEMALAN;GUF|FRENCH GUIANA|FRENCH;GUM|GUAM|GUAMANIAN;GUY|GUYANA|GUYANESE;
HKG|HONG KONG|HONG KONGER;HMD|HEARD ISLAND AND MCDONALD ISLANDS|AUSTRALIAN;HND|HONDURAS|HONDURAN;HRV|CROATIA|CROATIAN;
HTI|HAITI|HAITIAN;HUN|HUNGARY|HUNGARIAN;IDN|INDONESIA|INDONESIAN;IMN|ISLE OF MAN|MANX;IND|INDIA|INDIAN;
IOT|BRITISH INDIAN OCEAN TERRITORY|BRITISH;IRL|IRELAND|IRISH;IRN|IRAN|IRANIAN;IRQ|IRAQ|IRAQI;ISL|ICELAND|ICELANDIC;
ISR|ISRAEL|ISRAELI;ITA|ITALY|ITALIAN;JAM|JAMAICA|JAMAICAN;JEY|JERSEY|BRITISH;JOR|JORDAN|JORDANIAN;JPN|JAPAN|JAPANESE;
KAZ|KAZAKHSTAN|KAZAKH;KEN|KENYA|KENYAN;KGZ|KYRGYZSTAN|KYRGYZ;KHM|CAMBODIA|CAMBODIAN;KIR|KIRIBATI|I-KIRIBATI;
KNA|SAINT KITTS AND NEVIS|KITTITIAN;KOR|SOUTH KOREA|SOUTH KOREAN;KWT|KUWAIT|KUWAITI;LAO|LAOS|LAO;LBN|LEBANON|LEBANESE;
LBR|LIBERIA|LIBERIAN;LBY|LIBYA|LIBYAN;LCA|SAINT LUCIA|SAINT LUCIAN;LIE|LIECHTENSTEIN|LIECHTENSTEINER;LKA|SRI LANKA|SRI LANKAN;
LSO|LESOTHO|BASOTHO;LTU|LITHUANIA|LITHUANIAN;LUX|LUXEMBOURG|LUXEMBOURGISH;LVA|LATVIA|LATVIAN;MAC|MACAO|MACANESE;
MAF|SAINT MARTIN|FRENCH;MAR|MOROCCO|MOROCCAN;MCO|MONACO|MONEGASQUE;MDA|MOLDOVA|MOLDOVAN;MDG|MADAGASCAR|MALAGASY;
MDV|MALDIVES|MALDIVIAN;MEX|MEXICO|MEXICAN;MHL|MARSHALL ISLANDS|MARSHALLESE;MKD|NORTH MACEDONIA|MACEDONIAN;MLI|MALI|MALIAN;
MLT|MALTA|MALTESE;MMR|MYANMAR|BURMESE;MNE|MONTENEGRO|MONTENEGRIN;MNG|MONGOLIA|MONGOLIAN;MNP|NORTHERN MARIANA ISLANDS|AMERICAN;
MOZ|MOZAMBIQUE|MOZAMBICAN;MRT|MAURITANIA|MAURITANIAN;MSR|MONTSERRAT|MONTSERRATIAN;MTQ|MARTINIQUE|FRENCH;MUS|MAURITIUS|MAURITIAN;
MWI|MALAWI|MALAWIAN;MYS|MALAYSIA|MALAYSIAN;MYT|MAYOTTE|FRENCH;NAM|NAMIBIA|NAMIBIAN;NCL|NEW CALEDONIA|FRENCH;NER|NIGER|NIGERIEN;
NFK|NORFOLK ISLAND|NORFOLK ISLANDER;NGA|NIGERIA|NIGERIAN;NIC|NICARAGUA|NICARAGUAN;NIU|NIUE|NIUEAN;NLD|NETHERLANDS|DUTCH;
NOR|NORWAY|NORWEGIAN;NPL|NEPAL|NEPALI;NRU|NAURU|NAURUAN;NZL|NEW ZEALAND|NEW ZEALANDER;OMN|OMAN|OMANI;PAK|PAKISTAN|PAKISTANI;
PAN|PANAMA|PANAMANIAN;PCN|PITCAIRN|PITCAIRN ISLANDER;PER|PERU|PERUVIAN;PHL|PHILIPPINES|FILIPINO;PLW|PALAU|PALAUAN;
PNG|PAPUA NEW GUINEA|PAPUA NEW GUINEAN;POL|POLAND|POLISH;PRI|PUERTO RICO|PUERTO RICAN;PRK|NORTH KOREA|NORTH KOREAN;
PRT|PORTUGAL|PORTUGUESE;PRY|PARAGUAY|PARAGUAYAN;PSE|PALESTINE|PALESTINIAN;PYF|FRENCH POLYNESIA|FRENCH;QAT|QATAR|QATARI;
REU|REUNION|FRENCH;ROU|ROMANIA|ROMANIAN;RUS|RUSSIA|RUSSIAN;RWA|RWANDA|RWANDAN;SAU|SAUDI ARABIA|SAUDI;SDN|SUDAN|SUDANESE;
SEN|SENEGAL|SENEGALESE;SGP|SINGAPORE|SINGAPOREAN;SGS|SOUTH GEORGIA AND THE SOUTH SANDWICH ISLANDS|BRITISH;
SHN|SAINT HELENA|SAINT HELENIAN;SJM|SVALBARD AND JAN MAYEN|NORWEGIAN;SLB|SOLOMON ISLANDS|SOLOMON ISLANDER;
SLE|SIERRA LEONE|SIERRA LEONEAN;SLV|EL SALVADOR|SALVADORAN;SMR|SAN MARINO|SAMMARINESE;SOM|SOMALIA|SOMALI;
SPM|SAINT PIERRE AND MIQUELON|FRENCH;SRB|SERBIA|SERBIAN;SSD|SOUTH SUDAN|SOUTH SUDANESE;STP|SAO TOME AND PRINCIPE|SAO TOMEAN;
SUR|SURINAME|SURINAMESE;SVK|SLOVAKIA|SLOVAK;SVN|SLOVENIA|SLOVENIAN;SWE|SWEDEN|SWEDISH;SWZ|ESWATINI|SWAZI;
SXM|SINT MAARTEN|DUTCH;SYC|SEYCHELLES|SEYCHELLOIS;SYR|SYRIA|SYRIAN;TCA|TURKS AND CAICOS ISLANDS|TURKS AND CAICOS ISLANDER;
TCD|CHAD|CHADIAN;TGO|TOGO|TOGOLESE;THA|THAILAND|THAI;TJK|TAJIKISTAN|TAJIK;TKL|TOKELAU|TOKELAUAN;TKM|TURKMENISTAN|TURKMEN;
TLS|TIMOR-LESTE|TIMORESE;TON|TONGA|TONGAN;TTO|TRINIDAD AND TOBAGO|TRINIDADIAN;TUN|TUNISIA|TUNISIAN;TUR|TURKIYE|TURKISH;
TUV|TUVALU|TUVALUAN;TWN|TAIWAN|TAIWANESE;TZA|TANZANIA|TANZANIAN;UGA|UGANDA|UGANDAN;UKR|UKRAINE|UKRAINIAN;
UMI|UNITED STATES MINOR OUTLYING ISLANDS|AMERICAN;URY|URUGUAY|URUGUAYAN;USA|UNITED STATES|AMERICAN;UZB|UZBEKISTAN|UZBEK;
VAT|VATICAN CITY|VATICAN;VCT|SAINT VINCENT AND THE GRENADINES|VINCENTIAN;VEN|VENEZUELA|VENEZUELAN;
VGB|BRITISH VIRGIN ISLANDS|BRITISH VIRGIN ISLANDER;VIR|U.S. VIRGIN ISLANDS|AMERICAN;VNM|VIETNAM|VIETNAMESE;VUT|VANUATU|NI-VANUATU;
WLF|WALLIS AND FUTUNA|FRENCH;WSM|SAMOA|SAMOAN;YEM|YEMEN|YEMENI;ZAF|SOUTH AFRICA|SOUTH AFRICAN;ZMB|ZAMBIA|ZAMBIAN;
ZWE|ZIMBABWE|ZIMBABWEAN;D|GERMANY|GERMAN;GBD|UNITED KINGDOM|BRITISH;GBN|UNITED KINGDOM|BRITISH;GBO|UNITED KINGDOM|BRITISH;
GBP|UNITED KINGDOM|BRITISH;GBS|UNITED KINGDOM|BRITISH;RKS|KOSOVO|KOSOVAR;UNK|KOSOVO|KOSOVAR;UNO|UNITED NATIONS|UNITED NATIONS;
UNA|UNITED NATIONS|UNITED NATIONS;XXA|STATELESS|STATELESS;XXB|REFUGEE|REFUGEE;XXC|REFUGEE|REFUGEE;XXX|UNSPECIFIED|UNSPECIFIED;
EUE|EUROPEAN UNION|EUROPEAN UNION`;

    const COUNTRIES = Object.freeze(
        COUNTRY_DATA.split(";").reduce((map, entry) => {
            const [code, name, nationality] = entry.trim().split("|");
            if (code) map[code] = Object.freeze({ code, name, nationality });
            return map;
        }, {})
    );

    /* أخطاء OCR الشائعة: حرف بدل رقم أو رقم بدل حرف */
    const LETTER_TO_DIGIT = Object.freeze({ O: "0", Q: "0", D: "0", I: "1", L: "1", Z: "2", S: "5", G: "6", B: "8" });
    const DIGIT_TO_LETTER = Object.freeze({ 0: "O", 1: "I", 2: "Z", 5: "S", 6: "G", 8: "B" });
    const FILLER_LOOKALIKES = /[‹〈《(\[{£€¢©]/g;
    const SYMBOL_LOOKALIKES = Object.freeze({ "]": "J", "|": "I", "!": "I", "$": "S" });

    function countryInfo(code) {
        const key = String(code || "").replace(/</g, "").toUpperCase();
        return COUNTRIES[key] || null;
    }

    /* رقم التحقق: أوزان 7، 3، 1 */
    function checkDigit(value) {
        const weights = [7, 3, 1];
        let total = 0;

        for (let index = 0; index < value.length; index++) {
            const char = value[index];
            let number = 0;

            if (char >= "0" && char <= "9") number = char.charCodeAt(0) - 48;
            else if (char >= "A" && char <= "Z") number = char.charCodeAt(0) - 55;

            total += number * weights[index % 3];
        }

        return String(total % 10);
    }

    function asDigits(value) {
        return String(value || "").replace(/[A-Z]/g, char => LETTER_TO_DIGIT[char] || char);
    }

    function asLetters(value) {
        return String(value || "").replace(/[0-9]/g, char => DIGIT_TO_LETTER[char] || char);
    }

    /* تنظيف سطر واحد من مخرجات OCR قبل قراءته */
    function normalizeLine(raw) {
        let text = String(raw || "")
            .replace(/«/g, "<<")
            .replace(FILLER_LOOKALIKES, "<")
            .replace(/[\]|!$]/g, char => SYMBOL_LOOKALIKES[char])
            .replace(/\s+/g, "");

        // سلسلة حروف صغيرة داخل MRZ تكون غالبًا علامات < مقروءة غلط
        text = text.replace(/[a-z]{2,}/g, run => "<".repeat(run.length));
        return text.toUpperCase().replace(/[^A-Z0-9<]/g, "");
    }

    function realDate(year, month, day) {
        const date = new Date(Date.UTC(year, month - 1, day));
        return date.getUTCFullYear() === year &&
            date.getUTCMonth() === month - 1 &&
            date.getUTCDate() === day;
    }

    function pad(number) {
        return String(number).padStart(2, "0");
    }

    /* YYMMDD إلى YYYY-MM-DD؛ الميلاد في الماضي والانتهاء غالبًا بعد 2000 */
    function mrzDate(value, kind, now = new Date()) {
        const digits = asDigits(value);
        if (!/^\d{6}$/.test(digits)) return "";

        const yy = Number(digits.slice(0, 2));
        const month = Number(digits.slice(2, 4));
        const day = Number(digits.slice(4, 6));
        const currentYear = now.getUTCFullYear();
        let year = 2000 + yy;

        if (kind === "birth") {
            const iso = `${year}-${pad(month)}-${pad(day)}`;
            if (iso > now.toISOString().slice(0, 10)) year -= 100;
        } else if (year > currentYear + 30) {
            year -= 100;
        }

        return realDate(year, month, day) ? `${year}-${pad(month)}-${pad(day)}` : "";
    }

    function cleanName(value) {
        return asLetters(value)
            .replace(/[^A-Z<]/g, "")
            .replace(/<+/g, " ")
            .trim();
    }

    /* الأسماء: اللقب<<الأسماء؛ نتوقف عند أول << بعد الأسماء لأنها بداية الحشو */
    function parseNames(field) {
        const text = String(field || "");
        const split = text.indexOf("<<");

        if (split < 0) {
            const parts = cleanName(text).split(" ").filter(Boolean);
            return { surname: parts.shift() || "", givenNames: parts.join(" ") };
        }

        return {
            surname: cleanName(text.slice(0, split)),
            givenNames: cleanName(text.slice(split + 2).split("<<")[0])
        };
    }

    /* الاسم ممكن يكون مقطوع إذا عبّى الخانة كاملة بدون << حشو بعد الأسماء */
    function nameLooksTruncated(field, length) {
        if (field.length < length || !/[A-Z]$/.test(field)) return false;
        const split = field.indexOf("<<");
        return split < 0 || !field.slice(split + 2).includes("<<");
    }

    /* السطر الثاني: الميلاد + رقمه + الجنس + الانتهاء + رقمه */
    const LINE2_ANCHORS = [/\d{6}\d[MFX<]\d{6}\d/g, /\d{6}\d.\d{6}\d/g];

    function findAnchors(line) {
        const digitLine = asDigits(line);
        const found = new Set();

        for (const pattern of LINE2_ANCHORS) {
            pattern.lastIndex = 0;
            let match;

            while ((match = pattern.exec(digitLine))) {
                found.add(match.index);
                pattern.lastIndex = match.index + 1;
            }

            if (found.size) break;
        }

        return [...found];
    }

    function sexCode(char) {
        if (char === "M" || char === "F") return char;
        if (char === "X") return "X";
        return "";
    }

    function scoreParse(result) {
        return (result.checks.documentNumber ? 3 : 0) +
            (result.checks.birthDate ? 3 : 0) +
            (result.checks.expiryDate ? 3 : 0) +
            (result.checks.composite ? 2 : 0) +
            (countryInfo(result.nationality) ? 1 : 0) +
            (countryInfo(result.issuingState) ? 1 : 0) +
            (result.surname ? 1 : 0);
    }

    function compositeCheck(line, ranges, digitIndex) {
        if (line.length <= digitIndex) return false;
        const value = ranges.map(([start, end]) => line.slice(start, end)).join("");
        return checkDigit(value) === asDigits(line[digitIndex]);
    }

    /* حقل الرقم الشخصي الفارغ: LLLL أو KKKK فيه هي علامات حشو < مقروءة غلط */
    function cleanEmptyOptionalField(line, start, end) {
        const field = line.slice(start, end);
        if (!field.includes("<") || /\d/.test(field)) return line;
        return line.slice(0, start) + field.replace(/[KLCE]/g, "<") + line.slice(end);
    }

    /* جواز أو هوية بسطرين (TD3 = 44 حرف، TD2 = 36 حرف) */
    function parseTwoLine(line1, rawLine2, anchor, now) {
        const isTd3Line = rawLine2.length >= 40;
        const line2 = cleanEmptyOptionalField(rawLine2, anchor + 15, isTd3Line ? anchor + 29 : anchor + 22);
        const numberStart = Math.max(0, anchor - 13);
        const documentNumber = line2.slice(numberStart, anchor - 4);
        const numberDigit = line2[anchor - 4] || "";
        const birth = line2.slice(anchor, anchor + 6);
        const expiry = line2.slice(anchor + 8, anchor + 14);
        let first = line1 || "";

        // OCR يسقط حرف P أحيانًا من بداية السطر الأول
        if (/^<[A-Z0-9]{3}/.test(first)) first = `P${first}`;

        const isTd3 = line2.length >= 40 || first.length >= 40;
        const nameField = first.slice(5, isTd3 ? 44 : 36);
        const names = parseNames(nameField);

        return {
            format: isTd3 ? "TD3" : "TD2",
            documentCode: first.slice(0, 2).replace(/<+$/, ""),
            issuingState: asLetters(first.slice(2, 5)),
            surname: names.surname,
            givenNames: names.givenNames,
            nameMaybeTruncated: nameLooksTruncated(nameField, isTd3 ? 39 : 31),
            documentNumber: documentNumber.replace(/<+$/g, "").replace(/</g, ""),
            nationality: asLetters(line2.slice(anchor - 3, anchor)),
            birthRaw: asDigits(birth),
            birthDate: mrzDate(birth, "birth", now),
            sex: sexCode(line2[anchor + 7]),
            expiryRaw: asDigits(expiry),
            expiryDate: mrzDate(expiry, "expiry", now),
            checks: {
                documentNumber: anchor >= 13 && documentNumber.length === 9 &&
                    checkDigit(documentNumber) === asDigits(numberDigit),
                birthDate: checkDigit(asDigits(birth)) === asDigits(line2[anchor + 6] || ""),
                expiryDate: checkDigit(asDigits(expiry)) === asDigits(line2[anchor + 14] || ""),
                composite: anchor === 13 && (isTd3
                    ? compositeCheck(line2, [[0, 10], [13, 20], [21, 43]], 43)
                    : compositeCheck(line2, [[0, 10], [13, 20], [21, 35]], 35))
            }
        };
    }

    /* بطاقة هوية بثلاثة أسطر (TD1 = 30 حرف) */
    function parseThreeLine(line1, line2, line3, anchor, now) {
        const documentNumber = line1.slice(5, 14);
        const birth = line2.slice(anchor, anchor + 6);
        const expiry = line2.slice(anchor + 8, anchor + 14);
        const names = parseNames(line3);

        return {
            format: "TD1",
            documentCode: line1.slice(0, 2).replace(/<+$/, ""),
            issuingState: asLetters(line1.slice(2, 5)),
            surname: names.surname,
            givenNames: names.givenNames,
            nameMaybeTruncated: nameLooksTruncated(line3.slice(0, 30), 30),
            documentNumber: documentNumber.replace(/<+$/g, "").replace(/</g, ""),
            nationality: asLetters(line2.slice(anchor + 15, anchor + 18)),
            birthRaw: asDigits(birth),
            birthDate: mrzDate(birth, "birth", now),
            sex: sexCode(line2[anchor + 7]),
            expiryRaw: asDigits(expiry),
            expiryDate: mrzDate(expiry, "expiry", now),
            checks: {
                documentNumber: documentNumber.length === 9 &&
                    checkDigit(documentNumber) === asDigits(line1[14] || ""),
                birthDate: checkDigit(asDigits(birth)) === asDigits(line2[anchor + 6] || ""),
                expiryDate: checkDigit(asDigits(expiry)) === asDigits(line2[anchor + 14] || ""),
                composite: anchor === 0 && line1.length >= 30 && line2.length >= 30 &&
                    checkDigit(line1.slice(5, 30) + line2.slice(0, 7) + line2.slice(8, 15) + line2.slice(18, 29)) ===
                    asDigits(line2[29])
            }
        };
    }

    /* يقرأ أفضل MRZ من نص OCR كامل (أسطر متعددة وفيها ضجيج) */
    function parse(text, options = {}) {
        const now = options.now || new Date();
        const lines = (Array.isArray(text) ? text : String(text || "").split(/\r?\n/))
            .map(normalizeLine)
            .filter(line => line.length >= 20);
        let best = null;

        lines.forEach((line, index) => {
            for (const anchor of findAnchors(line)) {
                let result = null;

                if (anchor <= 2 && index >= 1) {
                    result = parseThreeLine(lines[index - 1], line, lines[index + 1] || "", anchor, now);
                } else if (anchor >= 10) {
                    result = parseTwoLine(index >= 1 ? lines[index - 1] : "", line, anchor, now);
                }

                if (!result) continue;
                result.score = scoreParse(result);
                if (!best || result.score > best.score) best = result;
            }
        });

        return best;
    }

    /* مسافة التعديل بين نصين (Levenshtein) */
    function editDistance(first, second) {
        const previous = Array.from({ length: second.length + 1 }, (_, index) => index);

        for (let i = 1; i <= first.length; i++) {
            let diagonal = previous[0];
            previous[0] = i;

            for (let j = 1; j <= second.length; j++) {
                const above = previous[j];
                previous[j] = Math.min(
                    previous[j] + 1,
                    previous[j - 1] + 1,
                    diagonal + (first[i - 1] === second[j - 1] ? 0 : 1)
                );
                diagonal = above;
            }
        }

        return previous[second.length];
    }

    function vizLines(vizText) {
        return String(vizText || "")
            .split(/\r?\n/)
            .map(line => line.toUpperCase().replace(/[^A-Z\s]/g, " ").replace(/\s+/g, " ").trim())
            .filter(line => line.replace(/\s/g, "").length >= 3);
    }

    /* نصلح حرفًا أو حرفين في الاسم إذا كان مطبوعًا بوضوح في الجزء العلوي من الجواز */
    function correctNameFromViz(name, lines) {
        const letters = name.replace(/\s/g, "");
        if (letters.length < 6) return name;

        const allowed = Math.max(1, Math.floor(letters.length / 8));
        let best = { distance: Infinity, value: name };

        for (const line of lines) {
            const candidates = [line, ...line.split(" ")];

            for (const candidate of candidates) {
                const distance = editDistance(letters, candidate.replace(/\s/g, ""));
                if (distance < best.distance) best = { distance, value: candidate };
            }
        }

        return best.distance > 0 && best.distance <= allowed ? best.value : name;
    }

    /* =========================================================
       التواريخ المطبوعة في الجواز: تاريخ الإصدار ليس داخل MRZ
    ========================================================= */
    const MONTHS = Object.freeze({
        JAN: 1, JANV: 1, ENE: 1, GEN: 1,
        FEB: 2, FEV: 2, FEBR: 2,
        MAR: 3, MARS: 3, MRZ: 3,
        APR: 4, AVR: 4, ABR: 4,
        MAY: 5, MAI: 5, MAG: 5, MAYO: 5,
        JUN: 6, JUIN: 6, GIU: 6,
        JUL: 7, JUIL: 7, LUG: 7,
        AUG: 8, AOU: 8, AOUT: 8, AGO: 8,
        SEP: 9, SEPT: 9, SET: 9,
        OCT: 10, OUT: 10, OKT: 10, OTT: 10,
        NOV: 11,
        DEC: 12, DEZ: 12, DIC: 12
    });

    function addDate(list, year, month, day) {
        const years = year < 100 ? [2000 + year, 1900 + year] : [year];

        for (const fullYear of years) {
            if (realDate(fullYear, month, day)) list.push(`${fullYear}-${pad(month)}-${pad(day)}`);
        }
    }

    function findDates(text) {
        const upper = String(text || "").toUpperCase();
        const dates = [];
        let match;

        const named = /(\d{1,2})\s*([A-Z]{3,4})(?:\s*\/\s*[A-Z]{3,4})?[\s.,/-]*(\d{4}|\d{2})(?!\d)/g;
        while ((match = named.exec(upper))) {
            const month = MONTHS[match[2]];
            if (month) addDate(dates, Number(match[3]), month, Number(match[1]));
        }

        const dayFirst = /(?<!\d)(\d{1,2})[\s./-]+(\d{1,2})[\s./-]+(\d{4}|\d{2})(?!\d)/g;
        while ((match = dayFirst.exec(upper))) {
            const first = Number(match[1]);
            const second = Number(match[2]);
            addDate(dates, Number(match[3]), second, first);
            if (first <= 12 && first !== second) addDate(dates, Number(match[3]), first, second);
        }

        const yearFirst = /(?<!\d)(\d{4})[\s./-]+(\d{1,2})[\s./-]+(\d{1,2})(?!\d)/g;
        while ((match = yearFirst.exec(upper))) {
            addDate(dates, Number(match[1]), Number(match[2]), Number(match[3]));
        }

        return [...new Set(dates)];
    }

    function addYears(isoDate, years) {
        const [year, month, day] = isoDate.split("-").map(Number);
        const date = new Date(Date.UTC(year + years, month - 1, day));
        // 29 شباط في سنة غير كبيسة يصير 1 آذار
        return date.toISOString().slice(0, 10);
    }

    function previousDay(isoDate) {
        const date = new Date(`${isoDate}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() - 1);
        return date.toISOString().slice(0, 10);
    }

    /*
       تاريخ الإصدار: تاريخ مطبوع يسبق الانتهاء بعدد سنوات كامل (أو ناقص يوم).
       هذا الشرط يمنع اختيار تاريخ غلط؛ إذا ما في تاريخ واحد مؤكد نرجع فارغ.
    */
    function findIssueDate(vizText, expiryDate, birthDate = "") {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate || "")) return "";

        const matches = findDates(vizText).filter(date => {
            if (date >= expiryDate || date === birthDate || (birthDate && date <= birthDate)) return false;

            for (let years = 1; years <= 12; years++) {
                const end = addYears(date, years);
                if (end === expiryDate || previousDay(end) === expiryDate) return true;
            }

            return false;
        });

        const unique = [...new Set(matches)];
        return unique.length === 1 ? unique[0] : "";
    }

    function mostCommon(values) {
        const counts = new Map();
        values.filter(Boolean).forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
        let best = "";
        let bestCount = 0;
        counts.forEach((count, value) => {
            if (count > bestCount) {
                best = value;
                bestCount = count;
            }
        });
        return best;
    }

    /*
       نختار لكل حقل أفضل قراءة من عدة محاولات OCR:
       أولًا قراءة نجح رقم تحققها، ثم قراءة مطبوعة أيضًا في أعلى الجواز، وإلا نعلّمها "تحقق".
    */
    function pickVerified(results, valueKey, checkKey, printedValues) {
        const verified = results.filter(result => result.checks[checkKey] && result[valueKey]);
        if (verified.length) return { value: mostCommon(verified.map(result => result[valueKey])), verified: true };

        const values = results.map(result => result[valueKey]).filter(Boolean);
        const confirmed = values.find(value => printedValues.includes(value));
        if (confirmed) return { value: confirmed, verified: true };

        return { value: mostCommon(values), verified: false };
    }

    /* الجزء المطبوع فقط (VIZ)؛ نحذف أسطر MRZ حتى لا "يؤكد" الحقل نفسه */
    function printedZone(text) {
        return String(text || "")
            .split(/\r?\n/)
            .filter(line => {
                const compact = line.toUpperCase().replace(/[^A-Z0-9]/g, "");
                return !/[<«‹]/.test(line) && !findAnchors(compact).length;
            })
            .join("\n");
    }

    function combine(results, rawVizText = "", options = {}) {
        const usable = (results || []).filter(Boolean);
        if (!usable.length) return null;

        const vizText = printedZone(rawVizText);
        const vizDates = findDates(vizText);
        const vizTokens = String(vizText || "").toUpperCase().split(/[^A-Z0-9]+/).filter(token => token.length >= 5);
        const lines = vizLines(vizText);
        const best = usable.reduce((first, second) => (second.score > first.score ? second : first));

        const documentNumber = pickVerified(usable, "documentNumber", "documentNumber", vizTokens);
        const birthDate = pickVerified(usable, "birthDate", "birthDate", vizDates);
        const expiryDate = pickVerified(usable, "expiryDate", "expiryDate", vizDates);
        const knownNationality = usable.map(result => result.nationality).filter(code => countryInfo(code));
        const knownIssuer = usable.map(result => result.issuingState).filter(code => countryInfo(code));
        const surname = correctNameFromViz(best.surname, lines);
        const givenNames = correctNameFromViz(best.givenNames, lines);
        const issueDate = findIssueDate(vizText, expiryDate.value, birthDate.value);

        // إذا الجنسية ما انقرت، الغالب إنها نفس الدولة اللي أصدرت الجواز (تبقى "تحقق")
        const issuingState = mostCommon(knownIssuer) || best.issuingState;
        const nationality = mostCommon(knownNationality) ||
            (countryInfo(issuingState) ? issuingState : best.nationality);

        return {
            format: best.format,
            documentCode: best.documentCode,
            issuingState,
            nationality,
            surname,
            givenNames,
            nameMaybeTruncated: Boolean(best.nameMaybeTruncated),
            documentNumber: documentNumber.value,
            birthDate: birthDate.value,
            expiryDate: expiryDate.value,
            issueDate,
            sex: mostCommon(usable.map(result => result.sex)),
            verified: {
                documentNumber: documentNumber.verified,
                birthDate: birthDate.verified,
                expiryDate: expiryDate.verified,
                composite: usable.some(result => result.checks.composite),
                nationality: knownNationality.length > 0
            },
            now: options.now
        };
    }

    function isComplete(results) {
        return (results || []).some(result => result && result.checks.composite) ||
            ["documentNumber", "birthDate", "expiryDate"].every(key =>
                (results || []).some(result => result && result.checks[key]));
    }

    /* الشكل النهائي الذي يعبّي حقول الأدمن */
    function toGuestDocument(combined) {
        if (!combined) return null;

        const nationality = countryInfo(combined.nationality);
        const issuer = countryInfo(combined.issuingState) || nationality;
        const fullName = [combined.givenNames, combined.surname].filter(Boolean).join(" ");

        return {
            fullName,
            nationality: nationality ? nationality.nationality : combined.nationality,
            passportNumber: combined.documentNumber,
            dateOfBirth: combined.birthDate,
            gender: combined.sex,
            passportIssueDate: combined.issueDate,
            passportExpiryDate: combined.expiryDate,
            address: issuer ? issuer.name : "",
            issuingCountry: combined.issuingState,
            documentType: combined.format === "TD3" ? "passport" : "id",
            nameMaybeTruncated: combined.nameMaybeTruncated,
            verified: {
                passportNumber: combined.verified.documentNumber || combined.verified.composite,
                dateOfBirth: combined.verified.birthDate || combined.verified.composite,
                passportExpiryDate: combined.verified.expiryDate || combined.verified.composite,
                nationality: combined.verified.nationality
            }
        };
    }

    /* هل هذا السطر من سطور MRZ؟ (يستعمله قارئ الصورة لتحديد مكان السطور) */
    function looksLikeMrzLine(text) {
        const line = normalizeLine(text);
        return line.length >= 25 && (/<</.test(line) || findAnchors(line).length > 0);
    }

    const api = {
        COUNTRIES,
        checkDigit,
        normalizeLine,
        looksLikeMrzLine,
        parse,
        combine,
        isComplete,
        findDates,
        findIssueDate,
        toGuestDocument,
        countryInfo,
        editDistance
    };

    if (typeof module === "object" && module.exports) module.exports = api;
    else root.HijaziMrz = api;
})(typeof window !== "undefined" ? window : globalThis);
