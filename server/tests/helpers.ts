import type { Express } from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

/** Starts an Express app on a random free port so tests can call it with fetch(). */
export async function startServer(app: Express): Promise<{ url: string; close: () => Promise<void> }> {
    const server: Server = await new Promise((resolve) => {
        const s = app.listen(0, "127.0.0.1", () => resolve(s));
    });
    const { port } = server.address() as AddressInfo;
    return {
        url: `http://127.0.0.1:${port}`,
        close: () => new Promise((resolve) => server.close(() => resolve())),
    };
}
