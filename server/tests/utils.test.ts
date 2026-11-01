import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BOOKING_ID_REGEX, generateBookingId } from "../src/utils/bookingId";
import { slugify } from "../src/utils/slugify";

describe("slugify", () => {
    it("matches the slugs used by the existing frontend data", () => {
        assert.equal(slugify("Amrik Sukhdev"), "amrik-sukhdev");
        assert.equal(slugify("Bella Nosh Cafe & Lounge"), "bella-nosh-cafe-lounge");
        assert.equal(slugify("5Monkey Bistro"), "5monkey-bistro");
        assert.equal(slugify("Haldiram's Murthal"), "haldiram-s-murthal");
    });
    it("removes accents and extra symbols", () => {
        assert.equal(slugify("  L'Éssence!!  "), "l-essence");
    });
    it("never returns an empty string", () => {
        assert.equal(slugify("!!!"), "restaurant");
    });
});

describe("generateBookingId", () => {
    it("uses the QD- prefix followed by 8 hex characters", () => {
        for (let i = 0; i < 50; i++) assert.match(generateBookingId(), BOOKING_ID_REGEX);
        assert.ok(generateBookingId().startsWith("QD-"));
    });
    it("produces different values", () => {
        const ids = new Set(Array.from({ length: 500 }, generateBookingId));
        assert.equal(ids.size, 500);
    });
});
