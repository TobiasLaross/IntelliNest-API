import assert from "node:assert/strict";
import { test } from "node:test";
import { isAuthorized } from "./requireSecret";

const secret = "4f1d9c2a7b3e8f60";

const cases: { name: string; authorization: string | undefined; secret: string | undefined; expected: boolean }[] = [
    { name: "the matching secret", authorization: `Bearer ${secret}`, secret, expected: true },
    { name: "a wrong secret", authorization: "Bearer 0000000000000000", secret, expected: false },
    { name: "no header", authorization: undefined, secret, expected: false },
    { name: "no configured secret", authorization: "Bearer ", secret: undefined, expected: false },
];

for (const testCase of cases) {
    test(`authorization with ${testCase.name}`, () => {
        assert.equal(isAuthorized(testCase.authorization, testCase.secret), testCase.expected);
    });
}
