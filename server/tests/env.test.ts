import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseEnv } from "../src/config/envSchema";

const good = {
    MONGODB_URI: "mongodb+srv://user:pass@cluster0.example.mongodb.net/quickdine",
    JWT_SECRET: "x".repeat(40),
};

describe("environment validation", () => {
    it("accepts a minimal valid config and applies defaults", () => {
        const result = parseEnv(good);
        assert.equal(result.ok, true);
        if (!result.ok) return;
        assert.equal(result.env.PORT, 5000);
        assert.equal(result.env.NODE_ENV, "development");
        assert.equal(result.env.BUSINESS_TIMEZONE, "Asia/Kolkata");
        assert.deepEqual(result.env.CLIENT_URL, ["http://localhost:5173"]);
    });

    it("reports a missing MONGODB_URI and JWT_SECRET", () => {
        const result = parseEnv({});
        assert.equal(result.ok, false);
        if (result.ok) return;
        assert.ok(result.problems.some((p) => p.startsWith("MONGODB_URI")));
        assert.ok(result.problems.some((p) => p.startsWith("JWT_SECRET")));
    });

    it("rejects the placeholder connection string from .env.example", () => {
        const result = parseEnv({ ...good, MONGODB_URI: "mongodb+srv://<username>:<password>@<cluster>.mongodb.net/quickdine" });
        assert.equal(result.ok, false);
    });

    it("rejects a non-mongodb connection string", () => {
        assert.equal(parseEnv({ ...good, MONGODB_URI: "http://localhost:27017" }).ok, false);
    });

    it("rejects a short JWT secret", () => {
        assert.equal(parseEnv({ ...good, JWT_SECRET: "too-short" }).ok, false);
    });

    it("rejects an invalid timezone and an invalid port", () => {
        assert.equal(parseEnv({ ...good, BUSINESS_TIMEZONE: "Mars/Olympus" }).ok, false);
        assert.equal(parseEnv({ ...good, PORT: "99999" }).ok, false);
    });

    it("splits several client origins and trims trailing slashes", () => {
        const result = parseEnv({ ...good, CLIENT_URL: "http://localhost:5173/, https://quickdine.vercel.app" });
        assert.equal(result.ok, true);
        if (result.ok) assert.deepEqual(result.env.CLIENT_URL, ["http://localhost:5173", "https://quickdine.vercel.app"]);
    });

    it("rejects an invalid client origin", () => {
        assert.equal(parseEnv({ ...good, CLIENT_URL: "not a url" }).ok, false);
    });

    it("treats blank optional values as not set", () => {
        const result = parseEnv({ ...good, CLOUDINARY_API_KEY: "   " });
        assert.equal(result.ok, true);
        if (result.ok) assert.equal(result.env.CLOUDINARY_API_KEY, undefined);
    });
});
