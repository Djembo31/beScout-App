// Backend Agent — Live-DB Read-Only Query Helper (Supabase JS Client)
// Usage: node scripts/backend-agent-query.mjs <table> [select] [filterCol=val] [limit]
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/backend-agent-query.mjs <table> [select="*"] [filter=key:val] [limit=10]');
  process.exit(1);
}

const [table, select = '*', filterArg = '', limitArg = '100'] = args;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

let q = supabase.from(table).select(select, { count: 'exact' });

if (filterArg && filterArg.includes(':')) {
  const [col, val] = filterArg.split(':');
  q = q.eq(col, val);
}

const limit = parseInt(limitArg, 10);
if (limit > 0) q = q.limit(limit);

const { data, error, count } = await q;

if (error) {
  console.error('ERR:', error.message);
  process.exit(1);
}
console.log(`count=${count}`);
console.log(JSON.stringify(data, null, 2));
