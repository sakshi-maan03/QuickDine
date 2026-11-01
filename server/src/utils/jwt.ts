import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../config/env";

export interface JwtPayload { sub: string; role: string; iat: number; exp: number }
const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
export function signToken(userId: string, role: string): string {
    const now = Math.floor(Date.now() / 1000);
    const expires = env.JWT_EXPIRES_IN;
    const match = /^(\d+)([smhd])$/.exec(expires);
    const seconds = match ? Number(match[1]) * ({ s: 1, m: 60, h: 3600, d: 86400 }[match[2] as "s" | "m" | "h" | "d"]) : 604800;
    const header = encode({ alg: "HS256", typ: "JWT" });
    const payload = encode({ sub: userId, role, iat: now, exp: now + seconds });
    const input = `${header}.${payload}`;
    const signature = createHmac("sha256", env.JWT_SECRET).update(input).digest("base64url");
    return `${input}.${signature}`;
}
export function verifyToken(token: string): JwtPayload {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Invalid token");
    const input = `${parts[0]}.${parts[1]}`;
    const expected = createHmac("sha256", env.JWT_SECRET).update(input).digest();
    const actual = Buffer.from(parts[2]!, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new Error("Invalid token");
    const payload = JSON.parse(Buffer.from(parts[1]!, "base64url").toString()) as JwtPayload;
    if (!payload.sub || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) throw new Error("Expired token");
    return payload;
}
