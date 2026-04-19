#!/bin/bash
# Injects context7-reminder when library-keywords detected in user-prompt
# Trigger: UserPromptSubmit
# Rationale: Training cutoff Jan 2026, libraries evolve — stale API-answers prevented by context7

PROMPT="$(cat 2>/dev/null || echo '')"

# Library keywords that should trigger context7-reminder
KEYWORDS='(react(\.js|js|_query)?|next(\.js|js)?|supabase|tailwind|tanstack|react-query|lucide-react|zustand|next-intl|vitest|playwright|drizzle|prisma|@anthropic-ai|anthropic-sdk|shadcn)'

if echo "$PROMPT" | grep -iqE "$KEYWORDS" 2>/dev/null; then
  # Emit as hook-feedback to Claude
  cat <<EOF
[context7-gate] Library keyword detected in prompt. REMINDER: Use context7 MCP (mcp__context7__resolve-library-id + mcp__context7__query-docs) to fetch current library docs BEFORE answering. Training data is Jan 2026 — APIs may have changed. Prefer context7 over memory/training for: React Query v5, Supabase JS, Next.js 14 App Router, Tailwind v4, lucide-react, zustand v5, next-intl, vitest, @anthropic-ai/sdk.
EOF
fi

exit 0
