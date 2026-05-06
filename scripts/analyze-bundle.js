const fs = require('fs');
const html = fs.readFileSync('.next/analyze/client.html', 'utf8');
const start = html.indexOf('window.chartData');
if (start === -1) { console.error('no chartData'); process.exit(1); }
const eq = html.indexOf('=', start);
// find matching closing bracket from the [ that follows
let i = html.indexOf('[', eq);
const arrStart = i;
let depth = 0;
let inStr = false;
let strCh = '';
let escape = false;
for (; i < html.length; i++) {
  const c = html[i];
  if (escape) { escape = false; continue; }
  if (c === '\\' && inStr) { escape = true; continue; }
  if (inStr) { if (c === strCh) inStr = false; continue; }
  if (c === '"' || c === "'") { inStr = true; strCh = c; continue; }
  if (c === '[') depth++;
  else if (c === ']') { depth--; if (depth === 0) { i++; break; } }
}
const json = html.slice(arrStart, i);
const data = JSON.parse(json);
console.log(`Parsed ${data.length} top-level bundles`);

function sumByLib(node, agg) {
  if (node.path) {
    const idx = node.path.lastIndexOf('node_modules');
    if (idx !== -1) {
      const rest = node.path.slice(idx + 'node_modules'.length).replace(/^[\\/]+/, '');
      const parts = rest.split(/[\\/]+/);
      let lib;
      if (parts[0].startsWith('@')) lib = parts[0] + '/' + (parts[1] || '');
      else lib = parts[0];
      agg[lib] = (agg[lib] || 0) + (node.parsedSize || 0);
    }
  }
  if (node.groups) for (const c of node.groups) sumByLib(c, agg);
}

const agg = {};
for (const bundle of data) sumByLib(bundle, agg);
const sorted = Object.entries(agg).sort((a, b) => b[1] - a[1]);

console.log('\nTop 30 libraries by parsed size:');
for (const [lib, size] of sorted.slice(0, 30)) {
  console.log(`  ${(size / 1024).toFixed(1).padStart(8)} KB  ${lib}`);
}
const total = sorted.reduce((a, [, s]) => a + s, 0);
console.log(`\nTotal node_modules parsed: ${(total / 1024).toFixed(1)} KB across ${sorted.length} libs`);

console.log('\n=== Top-10 chunks by parsedSize ===');
const bundlesSorted = [...data].sort((a, b) => (b.parsedSize || 0) - (a.parsedSize || 0));
for (const bundle of bundlesSorted.slice(0, 10)) {
  const localAgg = {};
  sumByLib(bundle, localAgg);
  const top = Object.entries(localAgg).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const parsed = (bundle.parsedSize / 1024).toFixed(0);
  console.log(`\n${bundle.label} (parsed=${parsed} KB):`);
  for (const [lib, size] of top) {
    console.log(`  ${(size / 1024).toFixed(1).padStart(7)} KB  ${lib}`);
  }
}
