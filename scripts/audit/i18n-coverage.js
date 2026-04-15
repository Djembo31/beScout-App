#!/usr/bin/env node
/**
 * i18n-Coverage Audit — Ferrari 10/10 Pre-Commit Guard
 *
 * Checks:
 *  1. Key-Parity DE ↔ TR (beide Files haben exakt gleiche Keys)
 *  2. Empty Values (key: "")
 *  3. Conflict-Marker (<<<<<<< verbleiben in Files)
 *
 * Exit 1 = block commit. Exit 0 = pass.
 */
const fs = require('fs');
const path = require('path');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

function loadJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) {
    if (/<<<<<<< /.test(fs.readFileSync(p, 'utf8'))) {
      console.error(`${RED}❌ Merge-Conflict marker in ${p}${RESET}`);
      process.exit(1);
    }
    console.error(`${RED}❌ Parse error in ${p}: ${e.message}${RESET}`);
    process.exit(1);
  }
}

function walkKeys(obj, prefix = '') {
  const out = new Set();
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      for (const sub of walkKeys(v, p)) out.add(sub);
    } else {
      out.add(p);
    }
  }
  return out;
}

function findEmpties(obj, prefix = '') {
  const out = [];
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string' && v.trim() === '') out.push(p);
    else if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...findEmpties(v, p));
  }
  return out;
}

const de = loadJson(path.join(__dirname, '../../messages/de.json'));
const tr = loadJson(path.join(__dirname, '../../messages/tr.json'));

const deKeys = walkKeys(de);
const trKeys = walkKeys(tr);

const missingInTr = [...deKeys].filter(k => !trKeys.has(k));
const missingInDe = [...trKeys].filter(k => !deKeys.has(k));
const emptyDe = findEmpties(de);
const emptyTr = findEmpties(tr);

let violations = 0;

if (missingInTr.length) {
  console.error(`${RED}❌ i18n: ${missingInTr.length} Keys in de.json fehlen in tr.json${RESET}`);
  missingInTr.slice(0, 10).forEach(k => console.error(`   - ${k}`));
  if (missingInTr.length > 10) console.error(`   ... und ${missingInTr.length - 10} weitere`);
  violations++;
}

if (missingInDe.length) {
  console.error(`${RED}❌ i18n: ${missingInDe.length} Keys in tr.json fehlen in de.json${RESET}`);
  missingInDe.slice(0, 10).forEach(k => console.error(`   - ${k}`));
  if (missingInDe.length > 10) console.error(`   ... und ${missingInDe.length - 10} weitere`);
  violations++;
}

if (emptyDe.length) {
  console.error(`${YELLOW}⚠️  i18n: ${emptyDe.length} leere Values in de.json${RESET}`);
  emptyDe.slice(0, 5).forEach(k => console.error(`   - ${k}`));
}
if (emptyTr.length) {
  console.error(`${YELLOW}⚠️  i18n: ${emptyTr.length} leere Values in tr.json${RESET}`);
  emptyTr.slice(0, 5).forEach(k => console.error(`   - ${k}`));
}

if (violations > 0) {
  console.error(`${RED}💀 i18n-Coverage Audit failed — Commit blocked.${RESET}`);
  process.exit(1);
}

console.log(`${GREEN}✅ i18n-Coverage passed (${deKeys.size} keys, DE↔TR Parität)${RESET}`);
process.exit(0);
