import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { DB_STATES } from "./config/db";
import { createErrorHandler, notFound } from "./middleware/errorHandler";
import authRoutes from "./routes/auth";
import restaurantRoutes from "./routes/restaurant";

export interface AppOptions {
    /** Websites allowed to call this API from a browser (CORS). */
    clientOrigins: string[];
    isProduction?: boolean;
}

/**
 * Builds the Express app. It is a function (not a global) so tests can create
 * their own copy. Routes for auth, restaurants, bookings, owner and admin are
 * added here in the next steps.
 */
export function createApp({ clientOrigins, isProduction = false }: AppOptions): Express {
    const app = express();

    // Adds a set of security-related HTTP headers.
    app.use(helmet());

    // Browsers only let the React app call this API if its address is listed here.
    // app.use(
    //     cors({
    //         origin(origin, callback) {
    //             // Requests without an Origin header (curl, health checks) are not from a browser.
    //             if (!origin || clientOrigins.includes(origin)) return callback(null, true);
    //             callback(null, false);
    //         },
    //     }),
    // );
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));


    // Lets us read JSON sent by the frontend. The size limit blocks absurdly large bodies.
    app.use(express.json({ limit: "1mb" }));

    // A quick way to check "is the server up, and can it reach the database?"
    app.get("/api/health", (_req, res) => {
        const state = mongoose.connection.readyState;
        const healthy = state === 1;
        res.status(healthy ? 200 : 503).json({
            success: healthy,
            status: healthy ? "ok" : "degraded",
            database: DB_STATES[state] ?? "unknown",
            uptimeSeconds: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
        });
    });

    app.use("/api/auth", authRoutes);
    app.use("/api/restaurants", restaurantRoutes);

    // --- Restaurant, booking, owner and admin routes are added in later steps ---

    app.use(notFound);
    app.use(createErrorHandler({ exposeInternalErrors: !isProduction }));

    return app;
}
