#!/usr/bin/env node
// TR-Strings Delta-Report: Compare old vs new tr-strings.txt dumps
// Usage: node scripts/audit/tr-strings-delta.mjs <old.txt> <new.txt>

import fs from 'node:fs';

const OLD = process.argv[2];
const NEW = process.argv[3];

if (!OLD || !NEW) {
  console.error('Usage: node tr-strings-delta.mjs <old.txt> <new.txt>');
  process.exit(1);
}

const parse = (p) => {
  const raw = fs.readFileSync(p, 'utf-8');
  return new Set(
    raw
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith('#') && !l.startsWith('Run:') && !l.startsWith('Target:') && !l.startsWith('Total'))
      .map((l) => l.trim())
      .filter(Boolean),
  );
};

const oldStrings = parse(OLD);
const newStrings = parse(NEW);

const removed = [...oldStrings].filter((s) => !newStrings.has(s));
const added = [...newStrings].filter((s) => !oldStrings.has(s));
const stayed = [...oldStrings].filter((s) => newStrings.has(s));

console.log('# TR-Strings Delta\n');
console.log(`Old (${OLD}): ${oldStrings.size} strings`);
console.log(`New (${NEW}): ${newStrings.size} strings`);
console.log(`Stayed:  ${stayed.length}`);
console.log(`Removed: ${removed.length}`);
console.log(`Added:   ${added.length}\n`);

console.log(`## Removed (${removed.length})\n`);
removed.slice(0, 60).forEach((s) => console.log(`- ${s}`));
if (removed.length > 60) console.log(`... (+${removed.length - 60} more)`);

console.log(`\n## Added (${added.length})\n`);
added.slice(0, 60).forEach((s) => console.log(`- ${s}`));
if (added.length > 60) console.log(`... (+${added.length - 60} more)`);
