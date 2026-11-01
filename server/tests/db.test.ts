/**
 * Integration tests that talk to a REAL MongoDB.
 * They only run when TEST_MONGODB_URI is set, and they use a throw-away database
 * (named quickdine_test_<random>) that is deleted afterwards, so your real data is never touched.
 *
 *   TEST_MONGODB_URI="mongodb://127.0.0.1:27017" npm test
 */
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import mongoose from "mongoose";
import { Booking, Restaurant, SlotInventory, User } from "../src/models";

const uri = process.env.TEST_MONGODB_URI;

describe("models against a real database", { skip: uri ? false : "set TEST_MONGODB_URI to run these" }, () => {
    const dbName = `quickdine_test_${randomBytes(4).toString("hex")}`;

    before(async () => {
        await mongoose.connect(uri!, { dbName, serverSelectionTimeoutMS: 5000 });
        await Promise.all([User.init(), Restaurant.init(), Booking.init(), SlotInventory.init()]);
    });
    after(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });

    const makeUser = (email: string, role: "user" | "owner" = "owner") =>
        User.create({ name: "Test Person", email, password: "correct-horse-battery", role });

    const restaurantData = (owner: mongoose.Types.ObjectId, name = "Pizza Place") => ({
        name,
        cuisine: "Italian",
        location: "Sonipat",
        address: "1 Test Road",
        totalSeats: 30,
        availableSlots: ["18:00", "19:00"],
        owner,
    });

    describe("User", () => {
        it("hashes the password and can verify it", async () => {
            const user = await makeUser("hash@example.com");
            const stored = await User.findById(user._id).select("+password");
            assert.ok(stored);
            assert.notEqual(stored.password, "correct-horse-battery");
            assert.match(stored.password, /^\$2[aby]\$12\$/);
            assert.equal(await stored.comparePassword("correct-horse-battery"), true);
            assert.equal(await stored.comparePassword("wrong-password"), false);
        });

        it("does not return the password hash unless asked", async () => {
            const user = await makeUser("hidden@example.com");
            const found = await User.findById(user._id);
            assert.equal(found?.password, undefined);
            const json = found?.toJSON() as unknown as Record<string, unknown>;
            assert.equal("password" in json, false);
        });

        it("does not re-hash an already hashed password when other fields change", async () => {
            const user = await makeUser("rehash@example.com");
            const loaded = (await User.findById(user._id).select("+password"))!;
            const hashBefore = loaded.password;
            loaded.name = "Renamed Person";
            await loaded.save();
            const reloaded = (await User.findById(user._id).select("+password"))!;
            assert.equal(reloaded.password, hashBefore);
            assert.equal(await reloaded.comparePassword("correct-horse-battery"), true);
        });

        it("rejects two accounts with the same email (even with different capitals)", async () => {
            await makeUser("dupe@example.com");
            await assert.rejects(makeUser("DUPE@example.com"), (err: { code?: number }) => err.code === 11000);
        });
    });

    describe("Restaurant", () => {
        it("creates a slug from the name and adds -2, -3 for duplicates", async () => {
            const a = await Restaurant.create(restaurantData((await makeUser("o1@example.com"))._id, "Pizza Place"));
            const b = await Restaurant.create(restaurantData((await makeUser("o2@example.com"))._id, "Pizza Place"));
            const c = await Restaurant.create(restaurantData((await makeUser("o3@example.com"))._id, "Pizza Place!"));
            assert.equal(a.slug, "pizza-place");
            assert.equal(b.slug, "pizza-place-2");
            assert.equal(c.slug, "pizza-place-3");
        });

        it("keeps a slug that was provided (the seed data relies on this)", async () => {
            const r = await Restaurant.create({ ...restaurantData((await makeUser("o4@example.com"))._id, "Anything"), slug: "my-fixed-slug" });
            assert.equal(r.slug, "my-fixed-slug");
        });

        it("allows only one restaurant per owner", async () => {
            const owner = await makeUser("single@example.com");
            await Restaurant.create(restaurantData(owner._id, "First Place"));
            await assert.rejects(Restaurant.create(restaurantData(owner._id, "Second Place")), (err: { code?: number }) => err.code === 11000);
        });

        it("starts as pending and sorts the slots", async () => {
            const r = await Restaurant.create({
                ...restaurantData((await makeUser("o5@example.com"))._id, "Slot Sorter"),
                availableSlots: ["21:00", "09:00", "21:00"],
            });
            assert.equal(r.status, "pending");
            assert.deepEqual([...r.availableSlots], ["09:00", "21:00"]);
        });

        it("fails with a readable validation error for bad data", async () => {
            const owner = await makeUser("bad@example.com");
            await assert.rejects(
                Restaurant.create({ ...restaurantData(owner._id, "Bad One"), totalSeats: -4, priceRange: "$$$$$" as never }),
                (err: mongoose.Error.ValidationError) => err.name === "ValidationError" && "totalSeats" in err.errors && "priceRange" in err.errors,
            );
        });
    });

    describe("Booking and SlotInventory", () => {
        it("saves a booking with a unique QD- reference and cannot change it afterwards", async () => {
            const diner = await makeUser("diner@example.com", "user");
            const owner = await makeUser("bk-owner@example.com");
            const restaurant = await Restaurant.create(restaurantData(owner._id, "Booking Bistro"));

            const data = {
                user: diner._id,
                restaurant: restaurant._id,
                date: new Date("2026-12-25T00:00:00.000Z"),
                time: "19:00",
                guests: 2,
                guestName: "Diner",
                guestEmail: "diner@example.com",
                guestPhone: "+91 98765 43210",
            };
            const first = await Booking.create(data);
            const second = await Booking.create(data);
            assert.match(first.bookingId, /^QD-[0-9A-F]{8}$/);
            assert.notEqual(first.bookingId, second.bookingId);
            assert.equal(first.status, "confirmed");

            const original = first.bookingId;
            await Booking.updateOne({ _id: first._id }, { bookingId: "QD-00000000" }); // immutable: silently ignored
            assert.equal((await Booking.findById(first._id))!.bookingId, original);
        });

        it("can populate the restaurant on a booking (the shape the dashboard needs)", async () => {
            const booking = await Booking.findOne().populate<{ restaurant: { name: string; slug: string } }>("restaurant", "name slug");
            assert.ok(booking);
            assert.equal(typeof booking.restaurant.name, "string");
            assert.ok(booking.restaurant.slug);
        });

        it("enforces one SlotInventory record per restaurant + date + time", async () => {
            const owner = await makeUser("inv-owner@example.com");
            const restaurant = await Restaurant.create(restaurantData(owner._id, "Inventory Inn"));
            const key = { restaurant: restaurant._id, date: new Date("2026-12-26T00:00:00.000Z"), time: "20:00" };
            await SlotInventory.create({ ...key, bookedSeats: 4 });
            await assert.rejects(SlotInventory.create({ ...key, bookedSeats: 2 }), (err: { code?: number }) => err.code === 11000);
            // a different time on the same day is fine
            await SlotInventory.create({ ...key, time: "21:00", bookedSeats: 2 });
        });
    });
});
