#!/bin/bash

# PostToolUse Hook: Catch direct Supabase imports in component files
# Our #1 anti-pattern: Components importing from @/lib/supabase directly
# Rule: Component -> Service -> Supabase (NEVER direct)

INPUT=$(cat)

FILE_PATH=$(echo "$INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+')

if [ -z "$FILE_PATH" ]; then
    exit 0
fi

# Only check component files
if [[ ! "$FILE_PATH" =~ src/components/.+\.(ts|tsx)$ ]]; then
    exit 0
fi

# Skip UI primitives (they don't import supabase)
if [[ "$FILE_PATH" =~ /ui/ ]]; then
    exit 0
fi

# Check for direct supabase imports
if grep -qE "from ['\"]@/lib/supabase['\"]|from ['\"].*supabase.*client['\"]" "$FILE_PATH" 2>/dev/null; then
    echo "SERVICE LAYER VIOLATION: $FILE_PATH imports Supabase directly."
    echo "Rule: Component -> Service -> Supabase. Use a service function instead."
fi

exit 0
