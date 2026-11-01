import assert from "node:assert/strict";
import { after, before, describe, it, mock } from "node:test";
import express from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { createApp } from "../src/app";
import { createErrorHandler, notFound } from "../src/middleware/errorHandler";
import { getValidated, validate } from "../src/middleware/validate";
import { ApiError } from "../src/utils/ApiError";
import { startServer } from "./helpers";

describe("app basics (no database connected)", () => {
    let server: Awaited<ReturnType<typeof startServer>>;
    before(async () => {
        server = await startServer(createApp({ clientOrigins: ["http://localhost:5173"] }));
    });
    after(() => server.close());

    it("GET /api/health reports 503 / degraded when the database is not connected", async () => {
        const res = await fetch(`${server.url}/api/health`);
        assert.equal(res.status, 503);
        const body = (await res.json()) as Record<string, unknown>;
        assert.equal(body.success, false);
        assert.equal(body.status, "degraded");
        assert.equal(body.database, "disconnected");
    });

    it("unknown routes return a JSON 404 in the standard error shape", async () => {
        const res = await fetch(`${server.url}/api/nope`);
        assert.equal(res.status, 404);
        const body = (await res.json()) as Record<string, unknown>;
        assert.equal(body.success, false);
        assert.match(String(body.message), /Route not found/);
    });

    it("malformed JSON returns a clean 400 instead of a stack trace", async () => {
        const res = await fetch(`${server.url}/api/health`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: "{ this is not json",
        });
        assert.equal(res.status, 400);
        const body = (await res.json()) as Record<string, unknown>;
        assert.equal(body.message, "Request body is not valid JSON");
    });

    it("rejects an oversized body with 413", async () => {
        const res = await fetch(`${server.url}/api/health`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ blob: "x".repeat(1_200_000) }),
        });
        assert.equal(res.status, 413);
    });

    it("allows the configured frontend origin and not others (CORS)", async () => {
        const allowed = await fetch(`${server.url}/api/health`, { headers: { Origin: "http://localhost:5173" } });
        assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:5173");
        const blocked = await fetch(`${server.url}/api/health`, { headers: { Origin: "https://evil.example" } });
        assert.equal(blocked.headers.get("access-control-allow-origin"), null);
    });

    it("sends security headers and hides the Express signature", async () => {
        const res = await fetch(`${server.url}/api/health`);
        assert.equal(res.headers.get("x-powered-by"), null);
        assert.equal(res.headers.get("x-content-type-options"), "nosniff");
    });
});

describe("error handler and validate middleware", () => {
    let server: Awaited<ReturnType<typeof startServer>>;

    before(async () => {
        const app = express();
        app.use(express.json());

        app.post(
            "/echo/:id",
            validate({
                params: z.object({ id: z.string().regex(/^\d+$/, "id must be a number") }),
                query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
                body: z.object({ email: z.email("must be a valid email"), guests: z.number().int().min(1) }),
            }),
            (_req, res) => {
                res.json({ success: true, validated: getValidated(res) });
            },
        );
        app.get("/boom/api-error", () => {
            throw ApiError.forbidden("Nope");
        });
        app.get("/boom/unexpected", () => {
            throw new Error("secret internal detail");
        });
        app.get("/boom/cast", () => {
            throw new mongoose.Error.CastError("ObjectId", "not-an-id", "_id");
        });
        app.get("/boom/duplicate", () => {
            throw Object.assign(new Error("E11000 duplicate key"), { code: 11000, keyPattern: { email: 1 } });
        });
        app.use(notFound);
        app.use(createErrorHandler({ exposeInternalErrors: false }));
        server = await startServer(app);
    });
    after(() => server.close());

    const post = (path: string, body: unknown) =>
        fetch(`${server.url}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    it("passes valid input through and applies defaults/coercion", async () => {
        const res = await post("/echo/42?page=3", { email: "a@b.co", guests: 2 });
        assert.equal(res.status, 200);
        const body = (await res.json()) as { validated: { params: unknown; query: unknown; body: unknown } };
        assert.deepEqual(body.validated.params, { id: "42" });
        assert.deepEqual(body.validated.query, { page: 3 });
    });

    it("lists every problem at once with the field name", async () => {
        const res = await post("/echo/abc?page=0", { email: "nope", guests: 0 });
        assert.equal(res.status, 400);
        const body = (await res.json()) as { success: boolean; message: string; errors: { field: string; message: string }[] };
        assert.equal(body.success, false);
        assert.equal(body.message, "Validation failed");
        const fields = body.errors.map((e) => e.field).sort();
        assert.deepEqual(fields, ["body.email", "body.guests", "params.id", "query.page"]);
    });

    it("treats a missing body as an empty object (and reports the missing fields)", async () => {
        const res = await fetch(`${server.url}/echo/1`, { method: "POST" });
        assert.equal(res.status, 400);
    });

    it("maps ApiError, CastError and duplicate-key errors to the right status codes", async () => {
        assert.equal((await fetch(`${server.url}/boom/api-error`)).status, 403);
        const cast = await fetch(`${server.url}/boom/cast`);
        assert.equal(cast.status, 400);
        const dup = await fetch(`${server.url}/boom/duplicate`);
        assert.equal(dup.status, 409);
        assert.equal(((await dup.json()) as { message: string }).message, "A record with this email already exists");
    });

    it("hides internal error details from the client in production mode", async () => {
        const logged = mock.method(console, "error", () => undefined); // the server logs it; keep test output clean
        const res = await fetch(`${server.url}/boom/unexpected`);
        assert.equal(logged.mock.callCount(), 1); // ...but it WAS logged for the developer
        logged.mock.restore();
        assert.equal(res.status, 500);
        const text = await res.text();
        assert.ok(!text.includes("secret internal detail"));
        assert.ok(!text.includes("stack"));
    });
});
