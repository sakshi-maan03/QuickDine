// These tests check the models' rules WITHOUT needing a database.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import mongoose from "mongoose";
import { Booking, Restaurant, SlotInventory, User } from "../src/models";

const id = () => new mongoose.Types.ObjectId();

/** Returns the names of the fields that failed validation (empty list = document is valid). */
const problems = async (doc: { validate: () => Promise<void> }): Promise<string[]> => {
    try {
        await doc.validate();
        return [];
    } catch (error) {
        return Object.keys((error as mongoose.Error.ValidationError).errors).sort();
    }
};

describe("User model rules", () => {
    const valid = { name: "Asha Verma", email: "Asha@Example.com", password: "a-good-password", role: "user" };

    it("accepts a valid user and lower-cases the email", async () => {
        const user = new User(valid);
        assert.deepEqual(await problems(user), []);
        assert.equal(user.email, "asha@example.com");
    });
    it("rejects a bad email, short password, long password and unknown role", async () => {
        assert.deepEqual(await problems(new User({ ...valid, email: "nope" })), ["email"]);
        assert.deepEqual(await problems(new User({ ...valid, password: "short" })), ["password"]);
        assert.deepEqual(await problems(new User({ ...valid, password: "x".repeat(73) })), ["password"]);
        assert.deepEqual(await problems(new User({ ...valid, role: "superuser" })), ["role"]);
    });
    it("defaults the role to 'user'", async () => {
        const { role: _role, ...withoutRole } = valid;
        assert.equal(new User(withoutRole).role, "user");
    });
    it("never includes the password in JSON", async () => {
        const json = new User(valid).toJSON() as unknown as Record<string, unknown>;
        assert.equal("password" in json, false);
        assert.equal("__v" in json, false);
    });
});

describe("Restaurant model rules", () => {
    const valid = {
        name: "Test Kitchen",
        slug: "test-kitchen",
        cuisine: "Italian",
        location: "Sonipat",
        address: "1 Test Road, Sonipat",
        totalSeats: 40,
        availableSlots: ["19:00", "18:00", "18:00"],
        owner: id(),
    };

    it("accepts a valid restaurant, defaults to pending, sorts and de-duplicates slots", async () => {
        const r = new Restaurant(valid);
        assert.deepEqual(await problems(r), []);
        assert.equal(r.status, "pending");
        assert.equal(r.priceRange, "$$");
        assert.deepEqual([...r.availableSlots], ["18:00", "19:00"]);
    });
    it("rejects bad seats, price range, slots, rating and status", async () => {
        assert.ok((await problems(new Restaurant({ ...valid, totalSeats: 0 }))).includes("totalSeats"));
        assert.ok((await problems(new Restaurant({ ...valid, totalSeats: 10.5 }))).includes("totalSeats"));
        assert.ok((await problems(new Restaurant({ ...valid, priceRange: "$$$$$" }))).includes("priceRange"));
        assert.ok((await problems(new Restaurant({ ...valid, availableSlots: [] }))).includes("availableSlots"));
        assert.ok((await problems(new Restaurant({ ...valid, availableSlots: ["7pm"] }))).includes("availableSlots"));
        assert.ok((await problems(new Restaurant({ ...valid, rating: 6 }))).includes("rating"));
        assert.ok((await problems(new Restaurant({ ...valid, status: "open" }))).includes("status"));
    });
    it("requires an owner and the core text fields", async () => {
        const { owner: _o, name: _n, cuisine: _c, ...rest } = valid;
        const errors = await problems(new Restaurant(rest));
        assert.deepEqual(errors, ["cuisine", "name", "owner"]);
    });
});

describe("Booking model rules", () => {
    const valid = {
        user: id(),
        restaurant: id(),
        date: new Date("2026-12-25T00:00:00.000Z"),
        time: "19:30",
        guests: 4,
        guestName: "Asha Verma",
        guestEmail: "asha@example.com",
        guestPhone: "+91 98765 43210",
    };

    it("accepts a valid booking, creates a QD- reference and defaults to confirmed", async () => {
        const b = new Booking(valid);
        assert.deepEqual(await problems(b), []);
        assert.match(b.bookingId, /^QD-[0-9A-F]{8}$/);
        assert.equal(b.status, "confirmed");
    });
    it("rejects bad guests, time, status and a date that is not midnight UTC", async () => {
        assert.ok((await problems(new Booking({ ...valid, guests: 0 }))).includes("guests"));
        assert.ok((await problems(new Booking({ ...valid, guests: 21 }))).includes("guests"));
        assert.ok((await problems(new Booking({ ...valid, guests: 2.5 }))).includes("guests"));
        assert.ok((await problems(new Booking({ ...valid, time: "25:00" }))).includes("time"));
        assert.ok((await problems(new Booking({ ...valid, status: "pending" }))).includes("status"));
        assert.ok((await problems(new Booking({ ...valid, date: new Date("2026-12-25T10:30:00.000Z") }))).includes("date"));
    });
    it("requires contact details", async () => {
        const { guestName: _a, guestEmail: _b, guestPhone: _c, ...rest } = valid;
        assert.deepEqual(await problems(new Booking(rest)), ["guestEmail", "guestName", "guestPhone"]);
    });
});

describe("SlotInventory model rules", () => {
    it("rejects negative or fractional booked seats", async () => {
        const base = { restaurant: id(), date: new Date("2026-12-25T00:00:00.000Z"), time: "19:00" };
        assert.deepEqual(await problems(new SlotInventory({ ...base, bookedSeats: 5 })), []);
        assert.ok((await problems(new SlotInventory({ ...base, bookedSeats: -1 }))).includes("bookedSeats"));
        assert.ok((await problems(new SlotInventory({ ...base, bookedSeats: 1.5 }))).includes("bookedSeats"));
    });
});
