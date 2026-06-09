import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// Ensure incidents table exists on first call
async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      chain_data JSONB NOT NULL,
      tx_hash TEXT,
      submitter_address TEXT NOT NULL,
      neighbourhood_id TEXT NOT NULL,
      evidence_urls TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_incidents_neighbourhood ON incidents(neighbourhood_id)
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_incidents_submitter ON incidents(submitter_address)
  `);
}

export async function GET(req: NextRequest) {
  try {
    await ensureTable();
    const { searchParams } = new URL(req.url);
    const neighbourhood = searchParams.get("neighbourhood");
    const submitter = searchParams.get("submitter");
    const id = searchParams.get("id");

    if (id) {
      const rows = await query<{ id: string; chain_data: unknown; tx_hash: string; created_at: string }>(
        "SELECT * FROM incidents WHERE id = $1",
        [id]
      );
      if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(rows[0]);
    }

    if (neighbourhood) {
      const rows = await query(
        "SELECT * FROM incidents WHERE neighbourhood_id = $1 ORDER BY created_at DESC LIMIT 50",
        [neighbourhood]
      );
      return NextResponse.json(rows);
    }

    if (submitter) {
      const rows = await query(
        "SELECT * FROM incidents WHERE submitter_address ILIKE $1 ORDER BY created_at DESC",
        [submitter]
      );
      return NextResponse.json(rows);
    }

    const rows = await query(
      "SELECT * FROM incidents ORDER BY created_at DESC LIMIT 100"
    );
    return NextResponse.json(rows);
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await ensureTable();
    const body = await req.json() as {
      id: string;
      chain_data: unknown;
      tx_hash: string;
      submitter_address: string;
      neighbourhood_id: string;
      evidence_urls: string[];
    };

    await query(
      `INSERT INTO incidents (id, chain_data, tx_hash, submitter_address, neighbourhood_id, evidence_urls)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         chain_data = $2,
         tx_hash = $3,
         updated_at = NOW()`,
      [
        body.id,
        JSON.stringify(body.chain_data),
        body.tx_hash,
        body.submitter_address,
        body.neighbourhood_id,
        body.evidence_urls ?? [],
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DB error:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
