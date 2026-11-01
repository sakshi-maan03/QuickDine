import type { ErrorRequestHandler, RequestHandler } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";
import { formatZodIssues, type FieldError } from "../utils/zodErrors";

/**
 * Every error in the app ends up here and is turned into the same JSON shape
 * the React app already expects:  { success: false, message: "...", errors?: [...] }
 * (The frontend reads error.response.data.message.)
 */

/** Used when no route matched the request (a "404"). */
export const notFound: RequestHandler = (req, _res, next) => {
    next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

interface ErrorHandlerOptions {
    /** In development we include the real error text for 500s to help debugging. */
    exposeInternalErrors: boolean;
}

type HttpLikeError = Error & { status?: number; statusCode?: number; type?: string; code?: number | string };

export function createErrorHandler({ exposeInternalErrors }: ErrorHandlerOptions): ErrorRequestHandler {
    // Express recognises error handlers by their 4 parameters, so `_next` must stay.
    return (err: unknown, _req, res, _next) => {
        let status = 500;
        let message = "Something went wrong on our side. Please try again.";
        let errors: FieldError[] | undefined;

        if (err instanceof ApiError) {
            status = err.statusCode;
            message = err.message;
            if (Array.isArray(err.details)) errors = err.details as FieldError[];
        } else if (err instanceof ZodError) {
            status = 400;
            message = "Validation failed";
            errors = formatZodIssues(err);
        } else if (err instanceof mongoose.Error.ValidationError) {
            status = 400;
            message = "Validation failed";
            errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
        } else if (err instanceof mongoose.Error.CastError) {
            // e.g. someone requested /api/bookings/not-a-real-id
            status = 400;
            message = `Invalid value for "${err.path}"`;
        } else if ((err as HttpLikeError)?.code === 11000) {
            // MongoDB "duplicate key": a unique field (like email) already exists.
            const keyPattern = (err as { keyPattern?: Record<string, unknown> }).keyPattern ?? {};
            const field = Object.keys(keyPattern)[0] ?? "value";
            status = 409;
            message = `A record with this ${field} already exists`;
        } else if (err instanceof Error) {
            const httpErr = err as HttpLikeError;
            const clientStatus = httpErr.status ?? httpErr.statusCode;
            if (typeof clientStatus === "number" && clientStatus >= 400 && clientStatus < 500) {
                // Errors raised by Express itself, such as a request body that isn't valid JSON.
                status = clientStatus;
                if (httpErr.type === "entity.parse.failed") message = "Request body is not valid JSON";
                else if (httpErr.type === "entity.too.large") message = "Request body is too large";
                else message = "Bad request";
            } else {
                console.error("Unhandled error:", err);
                if (exposeInternalErrors) message = err.message;
            }
        } else {
            console.error("Unhandled non-error thrown:", err);
        }

        if (status >= 500 && err instanceof ApiError) {
            console.error("Server error:", err);
        }

        res.status(status).json({ success: false, message, ...(errors && { errors }) });
    };
}
