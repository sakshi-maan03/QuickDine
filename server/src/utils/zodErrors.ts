import type { ZodError } from "zod";

export interface FieldError {
    field: string;
    message: string;
}

/** Converts Zod's error into a simple list: [{ field: "body.email", message: "..." }] */
export function formatZodIssues(error: ZodError, prefix?: string): FieldError[] {
    return error.issues.map((issue) => ({
        field: [...(prefix ? [prefix] : []), ...issue.path.map(String)].join(".") || "(root)",
        message: issue.message,
    }));
}
