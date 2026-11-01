import mongoose from "mongoose";

/** Human-readable names for mongoose's numeric connection states. */
export const DB_STATES: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
};

export function isDbConnected(): boolean {
    return mongoose.connection.readyState === 1;
}

let listenersRegistered = false;
let closingOnPurpose = false;

function registerConnectionListeners(): void {
    if (listenersRegistered) return;
    listenersRegistered = true;

    // Only warn about drops we did not ask for (e.g. a network problem).
    mongoose.connection.on("disconnected", () => {
        if (!closingOnPurpose) console.warn("⚠️  MongoDB disconnected");
    });
    mongoose.connection.on("reconnected", () => console.log("✅ MongoDB reconnected"));
    mongoose.connection.on("error", (err) => console.error("MongoDB error:", err.message));
}

export async function connectDB(uri: string): Promise<void> {
    registerConnectionListeners();
    closingOnPurpose = false;

    try {
        await mongoose.connect(uri, {
            // Give up after 10s instead of hanging forever if Atlas can't be reached.
            serverSelectionTimeoutMS: 10_000,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Never print the URI itself: it contains your database password.
        throw new Error(
            `Could not connect to MongoDB: ${message}\n` +
                "Check MONGODB_URI, your Atlas username/password, and that your IP address is allowed under Atlas → Network Access.",
        );
    }

    console.log(`✅ MongoDB connected (database: ${mongoose.connection.name})`);
}

export async function disconnectDB(): Promise<void> {
    closingOnPurpose = true;
    await mongoose.disconnect();
}
