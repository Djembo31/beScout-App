#!/usr/bin/env bash
# SHIP-Loop: After Edit on services/queries/migrations, suggest vitest run.
# Non-blocking. Output hint on stdout so Claude sees it.

set -u

JSON_INPUT="$(cat)"
FILE_PATH="$(echo "$JSON_INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"

[ -z "$FILE_PATH" ] && exit 0

NORM_PATH="$(echo "$FILE_PATH" | sed 's|^[A-Za-z]:||' | sed 's|\\|/|g')"

IS_SERVICE=0
case "$NORM_PATH" in
    */src/lib/services/*.ts)  IS_SERVICE=1 ;;
    */src/lib/queries/*.ts)   IS_SERVICE=1 ;;
esac

[ "$IS_SERVICE" -eq 0 ] && exit 0

# Find related test file
BASENAME="$(basename "$FILE_PATH" .ts)"
DIRNAME="$(dirname "$NORM_PATH")"
TEST_FILE=""

# Check common test locations
for candidate in "$DIRNAME/$BASENAME.test.ts" "$DIRNAME/__tests__/$BASENAME.test.ts" "$DIRNAME/$BASENAME.spec.ts"; do
    if [ -f "$candidate" ]; then
        TEST_FILE="$candidate"
        break
    fi
done

echo "[SHIP-POST-SERVICE]"
if [ -n "$TEST_FILE" ]; then
    echo "  File: $FILE_PATH"
    echo "  Test: $TEST_FILE"
    echo "  Run:  npx vitest run $TEST_FILE"
    echo "  Nachweis fuer /ship prove: Output nach worklog/proofs/NNN-test.txt"
else
    echo "  File: $FILE_PATH"
    echo "  !! Kein Test-File gefunden fuer $BASENAME."
    echo "  Fix: Test schreiben (test-writer Agent) ODER Begruendung in Spec."
fi

exit 0
