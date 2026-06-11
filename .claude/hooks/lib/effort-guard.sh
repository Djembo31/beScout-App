#!/usr/bin/env bash
# Shared guard for heavy SHIP-Loop hooks.
# Sourced near the top of each heavy hook, BEFORE consuming stdin.
# Silently exits the parent process when CLAUDE_EFFORT < high.
#
# Default = xhigh: unset env var means old Claude version → behave as before (safe).
# To override (e.g. force-run on medium for debug): EFFORT_GUARD_FORCE=1
[ "${EFFORT_GUARD_FORCE:-0}" = "1" ] && return 0 2>/dev/null || true
case "${CLAUDE_EFFORT:-xhigh}" in
  high|xhigh|max) : ;;
  *) exit 0 ;;
esac
