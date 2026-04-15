#!/bin/bash
# Compliance-Audit — Ferrari 10/10 Pre-Commit Guard
# Fängt CRITICAL business.md + common-errors.md Violations BEVOR commit.
# Exit 1 = block commit. Exit 0 = pass.
set -e
cd "$(git rev-parse --show-toplevel)"

VIOLATIONS=0

red()   { printf '\033[31m%s\033[0m\n' "$1"; }
green() { printf '\033[32m%s\033[0m\n' "$1"; }
yellow(){ printf '\033[33m%s\033[0m\n' "$1"; }

echo "🔍 Compliance-Audit running..."

# ── 1. $SCOUT Ticker in user-facing JSON values (NICHT admin-namespace) ────
SCOUT_VIOL=$(
  node -e "
    const de = require('./messages/de.json');
    const tr = require('./messages/tr.json');
    function walk(obj, path=[]){
      const out=[];
      for(const [k,v] of Object.entries(obj)){
        const p=[...path,k];
        if(typeof v==='object' && v) out.push(...walk(v,p));
        else if(typeof v==='string' && /\\\$SCOUT/.test(v)){
          const ns=path[0]||'';
          if(!/admin/i.test(ns) && !/bescoutAdmin/.test(ns)) out.push(p.join('.')+' = '+v.slice(0,50));
        }
      }
      return out;
    }
    const all=[...walk(de).map(x=>'de: '+x),...walk(tr).map(x=>'tr: '+x)];
    if(all.length){process.stderr.write(all.join('\n')+'\n');process.exit(1);}
  " 2>&1 || echo "FAIL"
)
if [ "$SCOUT_VIOL" = "FAIL" ] || [ -n "$SCOUT_VIOL" ] && [ "$SCOUT_VIOL" != "" ]; then
  if echo "$SCOUT_VIOL" | grep -q '='; then
    red "❌ COMPLIANCE: \$SCOUT Ticker in user-facing i18n Values (business.md)"
    echo "$SCOUT_VIOL" | head -10
    VIOLATIONS=$((VIOLATIONS+1))
  fi
fi

# ── 2. kazan* Glücksspiel-Verb in TR user-facing ────
KAZAN_VIOL=$(grep -rE ':\s*"[^"]*kazan[dıy][nıı]?[^"]*"' messages/tr.json 2>/dev/null | grep -v '"kazanc' | grep -v '"kazananlar"' || true)
if [ -n "$KAZAN_VIOL" ]; then
  red "❌ COMPLIANCE: kazan* Glücksspiel-Verb in TR user-facing (MASAK §4 Abs.1 e)"
  echo "$KAZAN_VIOL" | head -5
  VIOLATIONS=$((VIOLATIONS+1))
fi

# ── 3. Trader/Tüccar als Role in user-facing (Kapitalmarkt-Glossar AR-17) ────
TRADER_VIOL=$(
  grep -rE ':\s*"[^"]*\b(als\s+Trader|olarak\s+Tüccar|bist\s+Trader|aktif\s+tüccar)\b[^"]*"' messages/ 2>/dev/null || true
)
if [ -n "$TRADER_VIOL" ]; then
  red "❌ COMPLIANCE: Trader/Tüccar als Role-Framing user-facing (business.md AR-17)"
  echo "$TRADER_VIOL" | head -5
  VIOLATIONS=$((VIOLATIONS+1))
fi

# ── 4. CREATE OR REPLACE FUNCTION ohne REVOKE in STAGED Migration-Files ────
STAGED_MIG=$(git diff --cached --name-only 2>/dev/null | grep 'supabase/migrations/.*\.sql$' || true)
for f in $STAGED_MIG; do
  if [ -f "$f" ] && grep -q 'CREATE OR REPLACE FUNCTION' "$f"; then
    # Exception: Trigger-Funktions (RETURNS trigger) brauchen kein REVOKE
    if grep -q 'RETURNS trigger' "$f"; then continue; fi
    if ! grep -q 'REVOKE EXECUTE ON FUNCTION' "$f"; then
      red "❌ SECURITY: Missing REVOKE EXECUTE block in $f (AR-44 Template)"
      VIOLATIONS=$((VIOLATIONS+1))
    fi
  fi
done

# ── 5. Service throw raw-DE-string (i18n-Key-Leak pattern) ────
STAGED_TS=$(git diff --cached --name-only 2>/dev/null | grep -E 'src/lib/services/.*\.ts$' || true)
for f in $STAGED_TS; do
  if [ -f "$f" ]; then
    RAW_THROW=$(grep -nE "throw new Error\('[^']*[äöüß][^']*'\)" "$f" | grep -v mapErrorToKey | head -3 || true)
    if [ -n "$RAW_THROW" ]; then
      yellow "⚠️  i18n-Key-Leak in $f (use mapErrorToKey pattern)"
      echo "$RAW_THROW"
      # Nur Warning, kein Block — sonst zu aggressiv
    fi
  fi
done

# ── Exit ────
if [ $VIOLATIONS -gt 0 ]; then
  red ""
  red "💀 $VIOLATIONS Compliance-Violations — Commit blocked."
  red "Fix violations or run 'git commit --no-verify' (emergency only)."
  exit 1
fi

green "✅ Compliance-Audit passed"
exit 0
