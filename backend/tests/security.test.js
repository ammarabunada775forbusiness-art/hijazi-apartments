const test = require("node:test");
const assert = require("node:assert/strict");

const {
    findDangerousObjectKey,
    timingSafeEqualStrings
} = require("../services/security");

test(
    "accepts ordinary nested booking data",
    () => {
        assert.equal(
            findDangerousObjectKey({
                fullName: "أحمد حجازي",

                notes:
                    "طلب عادي بقيمة $100",

                calendars: {
                    airbnb: {
                        enabled: true
                    }
                },

                guests: [
                    {
                        type: "adult"
                    }
                ]
            }),

            null
        );
    }
);

test(
    "rejects MongoDB operators at any depth",
    () => {
        assert.equal(
            findDangerousObjectKey({
                email: {
                    $ne: null
                }
            }),

            "body.email.$ne"
        );

        assert.equal(
            findDangerousObjectKey({
                calendars: [
                    {
                        "$where": "sleep(1)"
                    }
                ]
            }),

            "body.calendars[0].$where"
        );
    }
);

test(
    "rejects dotted and prototype-pollution keys",
    () => {
        assert.equal(
            findDangerousObjectKey({
                "profile.role": "admin"
            }),

            "body.profile.role"
        );

        assert.equal(
            findDangerousObjectKey(
                JSON.parse(
                    '{"__proto__":{"admin":true}}'
                )
            ),

            "body.__proto__"
        );
    }
);

test(
    "compares credentials without accepting mismatches",
    () => {
        assert.equal(
            timingSafeEqualStrings(
                "admin",
                "admin"
            ),

            true
        );

        assert.equal(
            timingSafeEqualStrings(
                "admin",
                "Admin"
            ),

            false
        );

        assert.equal(
            timingSafeEqualStrings(
                "short",
                "much-longer"
            ),

            false
        );
    }
);