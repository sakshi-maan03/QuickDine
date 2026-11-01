import type { RequestHandler, Response } from "express";
import type { ZodType } from "zod";
import { ApiError } from "../utils/ApiError";
import { formatZodIssues, type FieldError } from "../utils/zodErrors";

interface RequestSchemas {
    body?: ZodType;
    query?: ZodType;
    params?: ZodType;
}

/**
 * Checks the incoming request against Zod schemas BEFORE the route runs.
 * If anything is wrong the client gets a 400 listing every problem.
 * If everything is fine, the cleaned-up values are available through getValidated().
 *
 * Example (used from Step 2 on):
 *   router.post("/login", validate({ body: loginSchema }), loginController);
 */
export function validate(schemas: RequestSchemas): RequestHandler {
    return (req, res, next) => {
        const problems: FieldError[] = [];
        const cleaned: Record<string, unknown> = {};

        for (const part of ["params", "query", "body"] as const) {
            const schema = schemas[part];
            if (!schema) continue;

            const input = part === "body" ? (req.body ?? {}) : req[part];
            const result = schema.safeParse(input);

            if (result.success) {
                cleaned[part] = result.data;
            } else {
                problems.push(...formatZodIssues(result.error, part));
            }
        }

        if (problems.length > 0) {
            return next(ApiError.badRequest("Validation failed", problems));
        }

        res.locals.validated = cleaned;
        next();
    };
}

/** Reads the cleaned values saved by validate(). */
export function getValidated<T extends { body?: unknown; query?: unknown; params?: unknown }>(res: Response): T {
    return res.locals.validated as T;
}
