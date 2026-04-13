import { db } from "@/db";
import { sql } from "drizzle-orm";

// Keep-alive endpoint — pinged by Vercel cron every 4 minutes
// Prevents Supabase free tier from sleeping due to inactivity
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return Response.json(
      { status: "error", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
