import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// One-shot cleanup endpoint. Protected by a secret token in env.
// DELETE /api/admin/reset?secret=<ADMIN_SECRET>
export async function DELETE(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await query("TRUNCATE TABLE incidents");
    return NextResponse.json({ success: true, message: "All incident records deleted." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
