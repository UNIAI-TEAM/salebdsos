// Helper: insert exported rows in dependency order using node-postgres.
import { readFileSync } from "node:fs";
import pg from "pg";

const data = JSON.parse(readFileSync(process.argv[2], "utf8"));
const order = [
  "tenants","user_roles","teams","team_members","invitations",
  "card_templates","cards","card_blocks","projects","card_projects",
  "brochures","customers","leads",
  "pipeline_stages","pipeline_deals",
  "ai_followups","ai_lead_scores",
  "campaigns","settings","audit_logs",
  "dynamic_qr_codes","wallet_cards","nfc_short_codes",
];

const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
try {
  await c.query("BEGIN");
  for (const table of order) {
    const rows = data[table] ?? [];
    for (const row of rows) {
      const cols = Object.keys(row);
      const vals = cols.map((_, i) => `$${i + 1}`).join(",");
      await c.query(
        `INSERT INTO public.${table} (${cols.join(",")})
         VALUES (${vals}) ON CONFLICT DO NOTHING`,
        cols.map((k) => row[k]),
      );
    }
    console.log(`  ${table}: ${rows.length}`);
  }
  await c.query("COMMIT");
} catch (e) {
  await c.query("ROLLBACK");
  throw e;
} finally {
  await c.end();
}
