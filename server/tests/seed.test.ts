/**
 * Runs the real seed script (as a separate process) against a throw-away database.
 * Only runs when TEST_MONGODB_URI is set.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import mongoose from "mongoose";
import { Booking, Restaurant, User } from "../src/models";

const baseUri = process.env.TEST_MONGODB_URI;

describe("seed script", { skip: baseUri ? false : "set TEST_MONGODB_URI to run these" }, () => {
    const dbName = `quickdine_seedtest_${randomBytes(4).toString("hex")}`;
    const uriWithDb = baseUri ? `${baseUri.replace(/\/+$/, "")}/${dbName}` : "";

    const childEnv = (overrides: Record<string, string> = {}) => ({
        ...process.env,
        NODE_ENV: "test",
        MONGODB_URI: uriWithDb,
        JWT_SECRET: "t".repeat(48),
        SEED_ADMIN_EMAIL: "admin@quickdine.example",
        SEED_ADMIN_PASSWORD: "admin-test-pass-1",
        SEED_OWNER_PASSWORD: "owner-test-pass-1",
        SEED_USER_PASSWORD: "diner-test-pass-1",
        ...overrides,
    });

    const runSeed = (args: string[] = [], overrides: Record<string, string> = {}) =>
        spawnSync("node", ["--import", "tsx", "src/seed/seed.ts", ...args], { env: childEnv(overrides), encoding: "utf8", timeout: 120_000 });

    before(async () => {
        await mongoose.connect(baseUri!, { dbName });
    });
    after(async () => {
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });

    it("creates the admin, a demo diner, 8 owners and 8 approved restaurants", async () => {
        const run = runSeed();
        assert.equal(run.status, 0, run.stderr + run.stdout);
        assert.match(run.stdout, /8 created, 0 already existed/);

        assert.equal(await Restaurant.countDocuments({ status: "approved" }), 8);
        assert.equal(await User.countDocuments({ role: "owner" }), 8);
        assert.equal(await User.countDocuments({ role: "admin" }), 1);
        assert.equal(await User.countDocuments({ role: "user" }), 1);

        const amrik = await Restaurant.findOne({ slug: "amrik-sukhdev" }).populate<{ owner: { email: string; role: string } }>("owner");
        assert.equal(amrik?.owner.email, "owner001@quickdine.example");
        assert.equal(amrik?.owner.role, "owner");
        assert.equal(amrik?.featured, true);
    });

    it("stores hashed passwords, and they match the values from the environment", async () => {
        const admin = await User.findOne({ role: "admin" }).select("+password");
        assert.ok(admin);
        assert.notEqual(admin.password, "admin-test-pass-1");
        assert.equal(await admin.comparePassword("admin-test-pass-1"), true);
        const owner = (await User.findOne({ email: "owner003@quickdine.example" }).select("+password"))!;
        assert.equal(await owner.comparePassword("owner-test-pass-1"), true);
    });

    it("is safe to run again: nothing is duplicated and nothing is overwritten", async () => {
        await Restaurant.updateOne({ slug: "gulshan-dhaba" }, { description: "Edited by the owner" });
        const run = runSeed();
        assert.equal(run.status, 0, run.stderr + run.stdout);
        assert.match(run.stdout, /0 created, 8 already existed/);
        assert.equal(await Restaurant.countDocuments(), 8);
        assert.equal(await User.countDocuments(), 10);
        assert.equal((await Restaurant.findOne({ slug: "gulshan-dhaba" }))!.description, "Edited by the owner");
    });

    it("never prints passwords", () => {
        const run = runSeed();
        assert.ok(!run.stdout.includes("admin-test-pass-1"));
        assert.ok(!run.stdout.includes("owner-test-pass-1"));
        assert.ok(!run.stderr.includes("owner-test-pass-1"));
    });

    it("stops with a clear message when seed passwords are missing or too short", () => {
        const run = runSeed([], { SEED_OWNER_PASSWORD: "short" });
        assert.notEqual(run.status, 0);
        assert.match(run.stderr, /SEED_OWNER_PASSWORD must be at least 8 characters/);
    });

    it("refuses --reset without confirmation when not in a terminal", () => {
        const run = runSeed(["--reset"]);
        assert.notEqual(run.status, 0);
        assert.match(run.stderr, /needs confirmation/);
        // and nothing was deleted
        return Restaurant.countDocuments().then((n) => assert.equal(n, 8));
    });

    it("refuses --reset in production even with --yes", () => {
        const run = runSeed(["--reset", "--yes"], { NODE_ENV: "production" });
        assert.notEqual(run.status, 0);
        assert.match(run.stderr, /Refusing to reset/);
    });

    it("--reset --yes wipes everything (including bookings) and re-creates the demo data", async () => {
        const diner = (await User.findOne({ role: "user" }))!;
        const restaurant = (await Restaurant.findOne())!;
        await Booking.create({
            user: diner._id, restaurant: restaurant._id, date: new Date("2026-12-30T00:00:00.000Z"), time: "19:00",
            guests: 2, guestName: "Temp", guestEmail: "t@example.com", guestPhone: "+91 99999 99999",
        });
        assert.equal(await Booking.countDocuments(), 1);

        const run = runSeed(["--reset", "--yes"]);
        assert.equal(run.status, 0, run.stderr + run.stdout);
        assert.match(run.stdout, /8 created, 0 already existed/);
        assert.equal(await Booking.countDocuments(), 0);
        assert.equal(await Restaurant.countDocuments(), 8);
        assert.equal(await User.countDocuments(), 10);
    });
});
