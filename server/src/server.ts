import { createApp } from "./app";
import { connectDB, disconnectDB } from "./config/db";
import { env } from "./config/env"; // validates .env first; stops with a clear message if something is wrong

async function main(): Promise<void> {
    await connectDB(env.MONGODB_URI);

    const app = createApp({
        clientOrigins: env.CLIENT_URL,
        isProduction: env.NODE_ENV === "production",
    });

    const server = app.listen(env.PORT, () => {
        console.log(`🚀 QuickDine API running at http://localhost:${env.PORT}/api (${env.NODE_ENV})`);
    });

    server.on("error", (error: NodeJS.ErrnoException) => {
        if (error.code === "EADDRINUSE") {
            console.error(`Port ${env.PORT} is already in use. Stop the other program or change PORT in .env`);
        } else {
            console.error("Server error:", error.message);
        }
        process.exit(1);
    });

    // Close connections neatly when the server is stopped (Ctrl+C or a hosting restart).
    const shutdown = (signal: string) => {
        console.log(`\n${signal} received, shutting down...`);
        server.close(async () => {
            await disconnectDB();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10_000).unref(); // force-quit if it hangs
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}

process.on("unhandledRejection", (reason) => {
    console.error("Unhandled promise rejection:", reason);
});

main().catch((error: unknown) => {
    console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
});
