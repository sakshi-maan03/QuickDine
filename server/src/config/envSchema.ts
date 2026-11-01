import { z } from "zod";

/**
 * Describes every setting the server reads from environment variables.
 * Keeping this separate from env.ts lets us test the rules without touching
 * the real process environment.
 */

const isValidTimezone = (tz: string): boolean => {
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: tz });
        return true;
    } catch {
        return false;
    }
};

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),

    CLIENT_URL: z
        .string()
        .default("http://localhost:5173")
        .transform((value) =>
            value
                .split(",")
                .map((origin) => origin.trim().replace(/\/+$/, ""))
                .filter(Boolean),
        )
        .refine(
            (origins) =>
                origins.length > 0 &&
                origins.every((origin) => {
                    try {
                        const url = new URL(origin);
                        return url.protocol === "http:" || url.protocol === "https:";
                    } catch {
                        return false;
                    }
                }),
            { message: "must be one or more valid http(s) URLs separated by commas" },
        ),

    MONGODB_URI: z
        .string({ error: "is required (copy it from MongoDB Atlas)" })
        .regex(/^mongodb(\+srv)?:\/\//, "must start with mongodb:// or mongodb+srv://")
        .refine((uri) => !/[<>]/.test(uri), {
            message: "still contains a <placeholder>; replace <username>, <password> and <cluster> with real values",
        }),

    JWT_SECRET: z
        .string({ error: "is required" })
        .min(32, "must be at least 32 characters long (see .env.example for how to generate one)"),
    JWT_EXPIRES_IN: z.string().default("7d"),

    BUSINESS_TIMEZONE: z
        .string()
        .default("Asia/Kolkata")
        .refine(isValidTimezone, { message: "is not a valid IANA timezone (example: Asia/Kolkata)" }),

    // Optional for now; they become required when image upload is built.
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export type EnvResult = { ok: true; env: Env } | { ok: false; problems: string[] };

/**
 * Validates a bag of raw environment values.
 * Blank values (e.g. "CLOUDINARY_API_KEY=") are treated as "not set".
 */
export function parseEnv(raw: Record<string, string | undefined>): EnvResult {
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
        if (typeof value === "string" && value.trim() !== "") {
            cleaned[key] = value.trim();
        }
    }

    const result = envSchema.safeParse(cleaned);
    if (result.success) {
        return { ok: true, env: result.data };
    }

    const problems = result.error.issues.map((issue) => `${issue.path.join(".") || "(env)"} ${issue.message}`);
    return { ok: false, problems };
}
