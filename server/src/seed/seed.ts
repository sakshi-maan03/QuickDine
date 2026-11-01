/**
 * Fills the database with demo data so you can try the app straight away.
 *
 *   npm run seed          Safe to run again and again. Adds what is missing and
 *                         never overwrites accounts or restaurants that exist.
 *   npm run seed:reset    DELETES EVERYTHING first, then adds the demo data.
 *                         Asks you to type the database name to confirm.
 *
 * Demo passwords come from SEED_*_PASSWORD in your .env file; none are written in code.
 */
import { createInterface } from "node:readline/promises";
import mongoose from "mongoose";
import { z } from "zod";
import { connectDB, disconnectDB } from "../config/db";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../config/constants";
import { env } from "../config/env";
import { Booking, Restaurant, SlotInventory, User, type UserRole } from "../models";
import { seedRestaurants } from "./restaurants.data";

const password = (name: string) =>
    z
        .string({ error: `${name} is required in .env` })
        .min(PASSWORD_MIN_LENGTH, `${name} must be at least ${PASSWORD_MIN_LENGTH} characters`)
        .max(PASSWORD_MAX_LENGTH, `${name} must be at most ${PASSWORD_MAX_LENGTH} characters`);

const seedEnvSchema = z.object({
    SEED_ADMIN_EMAIL: z.email({ error: "SEED_ADMIN_EMAIL must be a valid email address" }),
    SEED_ADMIN_PASSWORD: password("SEED_ADMIN_PASSWORD"),
    SEED_OWNER_PASSWORD: password("SEED_OWNER_PASSWORD"),
    SEED_USER_PASSWORD: password("SEED_USER_PASSWORD"),
});

function readSeedEnv() {
    const raw: Record<string, string> = {};
    for (const key of Object.keys(seedEnvSchema.shape)) {
        const value = process.env[key]?.trim();
        if (value) raw[key] = value;
    }
    const parsed = seedEnvSchema.safeParse(raw);
    if (!parsed.success) {
        console.error("\n❌ The seed script needs these values in server/.env:\n");
        for (const issue of parsed.error.issues) console.error(`   • ${issue.message}`);
        console.error("\nSee .env.example for the full list.\n");
        process.exit(1);
    }
    return parsed.data;
}

async function confirmReset(): Promise<void> {
    if (env.NODE_ENV === "production") {
        throw new Error("Refusing to reset: NODE_ENV is 'production'.");
    }

    const dbName = mongoose.connection.name;
    if (process.argv.includes("--yes")) return;

    if (!process.stdin.isTTY) {
        throw new Error("Reset needs confirmation. Run it in a terminal, or add --yes if you are sure.");
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question(
        `\n⚠️  This will DELETE ALL users, restaurants and bookings in the database "${dbName}".\n` +
            `   Type the database name to continue: `,
    );
    rl.close();

    if (answer.trim() !== dbName) {
        throw new Error("Name did not match. Nothing was deleted.");
    }
}

interface AccountInput {
    name: string;
    email: string;
    password: string;
    role: UserRole;
    phone?: string;
}

/** Creates the account only if nobody has that email yet. */
async function ensureUser(input: AccountInput) {
    const existing = await User.findOne({ email: input.email.toLowerCase() });
    if (existing) return { user: existing, created: false };

    const user = await User.create(input); // the password is hashed automatically on save
    return { user, created: true };
}

async function main(): Promise<void> {
    const seedEnv = readSeedEnv();
    const wantsReset = process.argv.includes("--reset");

    await connectDB(env.MONGODB_URI);

    // Make sure unique indexes exist before we insert anything.
    await Promise.all([User.init(), Restaurant.init(), Booking.init(), SlotInventory.init()]);

    if (wantsReset) {
        await confirmReset();
        await Promise.all([
            Booking.deleteMany({}),
            SlotInventory.deleteMany({}),
            Restaurant.deleteMany({}),
            User.deleteMany({}),
        ]);
        console.log("🧹 Existing data deleted.");
    }

    const accounts: { role: string; email: string; created: boolean }[] = [];

    const admin = await ensureUser({
        name: "QuickDine Admin",
        email: seedEnv.SEED_ADMIN_EMAIL,
        password: seedEnv.SEED_ADMIN_PASSWORD,
        role: "admin",
    });
    accounts.push({ role: "admin", email: admin.user.email, created: admin.created });

    const diner = await ensureUser({
        name: "Demo Diner",
        email: "diner@quickdine.example",
        password: seedEnv.SEED_USER_PASSWORD,
        role: "user",
        phone: "+91 98765 43210",
    });
    accounts.push({ role: "user", email: diner.user.email, created: diner.created });

    let restaurantsCreated = 0;
    let restaurantsSkipped = 0;

    for (const { ownerKey, ...restaurantData } of seedRestaurants) {
        const owner = await ensureUser({
            name: `${restaurantData.name} Owner`,
            email: `${ownerKey}@quickdine.example`,
            password: seedEnv.SEED_OWNER_PASSWORD,
            role: "owner",
        });
        accounts.push({ role: "owner", email: owner.user.email, created: owner.created });

        const exists = await Restaurant.exists({ slug: restaurantData.slug });
        if (exists) {
            restaurantsSkipped += 1;
            continue;
        }

        await Restaurant.create({ ...restaurantData, owner: owner.user._id });
        restaurantsCreated += 1;
    }

    console.log("\n✅ Seeding finished");
    console.log(`   Restaurants: ${restaurantsCreated} created, ${restaurantsSkipped} already existed`);
    console.log("   Accounts (passwords are the SEED_*_PASSWORD values in your .env):");
    for (const account of accounts) {
        console.log(`     ${account.created ? "＋ created " : "· existing"}  ${account.role.padEnd(5)}  ${account.email}`);
    }
    console.log("");
}

main()
    .then(async () => {
        await disconnectDB();
    })
    .catch(async (error: unknown) => {
        console.error(`\n❌ Seeding failed: ${error instanceof Error ? error.message : String(error)}\n`);
        await disconnectDB().catch(() => undefined);
        process.exit(1);
    });
