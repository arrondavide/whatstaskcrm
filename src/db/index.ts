import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// For Supabase, use connection pooler (port 6543) in serverless environments
const client = postgres(connectionString, {
  prepare: false, // Required for Supabase transaction pooler
});

export const db = drizzle(client, { schema });
