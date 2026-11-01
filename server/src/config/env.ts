import dotenv from "dotenv";
import { parseEnv, type Env } from "./envSchema";

// Reads the ".env" file (if there is one) into process.env.
dotenv.config({ quiet: true });

const result = parseEnv(process.env);

if (!result.ok) {
    // Fail fast with a clear message instead of crashing later in a confusing way.
    console.error("\n❌ Invalid environment configuration. Fix these in server/.env:\n");
    for (const problem of result.problems) {
        console.error(`   • ${problem}`);
    }
    console.error("\nTip: copy .env.example to .env and fill in the values.\n");
    process.exit(1);
}

export const env: Env = result.env;
