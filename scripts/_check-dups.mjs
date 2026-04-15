import { readFileSync } from 'fs';
const p = JSON.parse(readFileSync('memory/debug-backfill-payload-BL1-gw4.json', 'utf-8'));
console.log(`GW=${p.gw} fixtures=${p.fixtureResults.length} stats=${p.uniqueStats.length}`);

const byPid = new Map();
for (const s of p.uniqueStats) {
  if (s.player_id == null) continue;
  const arr = byPid.get(s.player_id) ?? [];
  arr.push({ fx: s.fixture_id.slice(0,8), api: s.api_football_player_id, mins: s.minutes_played, rating: s.rating, name: s.player_name_api });
  byPid.set(s.player_id, arr);
}
const dups = Array.from(byPid.entries()).filter(([, arr]) => arr.length > 1);
console.log(`Players with multiple rows: ${dups.length}`);
for (const [pid, arr] of dups.slice(0, 10)) {
  console.log(`  ${pid.slice(0,8)}:`, arr);
}
