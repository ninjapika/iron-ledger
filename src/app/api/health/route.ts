import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

// Deliberately unauthenticated — the patch script hits this from outside
// any logged-in session (a fresh container has no cookies to send), and an
// uptime monitor needs the same. It reveals nothing beyond "the app booted
// and can reach its database," which isn't sensitive.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, db: "connected", time: new Date().toISOString() });
  } catch (err) {
    return NextResponse.json(
      { ok: false, db: "unreachable", error: err instanceof Error ? err.message : String(err) },
      { status: 503 }
    );
  }
}
