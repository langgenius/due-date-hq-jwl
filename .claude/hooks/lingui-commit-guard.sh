#!/usr/bin/env sh
set -eu

# Claude Code PreToolUse(Bash) guard. Before a git commit that includes app
# source or Lingui catalogs, rebuild and strictly compile the catalogs. Deny
# the commit when translations are missing or generated catalog output is not
# staged. This runs before git's pre-commit hook to return a focused error.

cmd=$(jq -r '.tool_input.command // ""' 2>/dev/null)
[ -z "$cmd" ] && exit 0

# Remove quoted commit-message content before detecting the git subcommand.
SQ=\'
bare=$(printf '%s' "$cmd" | sed 's/"[^"]*"//g')
bare=$(printf '%s' "$bare" | sed "s/${SQ}[^${SQ}]*${SQ}//g")
commit_seg=$(printf '%s' "$bare" |
  grep -oE 'git([[:space:]]+-[Cc][[:space:]]+[^[:space:]]+)*[[:space:]]+commit([[:space:]][^&|;]*)?' ||
  true)
[ -z "$commit_seg" ] && exit 0

repo_root=$(git rev-parse --show-toplevel)
cd "$repo_root"

changed_paths=$(
  {
    git diff --cached --name-only
    git diff --name-only
  } | sort -u
)

if ! printf '%s\n' "$changed_paths" |
  grep -Eq '^apps/app/(lingui\.config\.(js|mjs|ts)|src/.*\.(ts|tsx)|src/i18n/locales/)'; then
  exit 0
fi

log_file=$(mktemp "${TMPDIR:-/tmp}/duedatehq-lingui-guard.XXXXXX")
trap 'rm -f "$log_file"' EXIT HUP INT TERM

deny() {
  reason=$1
  jq -n --arg r "$reason" \
    '{hookSpecificOutput:{hookEventName:"PreToolUse",permissionDecision:"deny",permissionDecisionReason:$r}}'
  exit 0
}

if ! pnpm run i18n:check >"$log_file" 2>&1; then
  details=$(tail -n 14 "$log_file")
  deny "Blocked: Lingui catalogs are not submission-ready. Run pnpm run i18n:check, translate every missing zh-CN message, and retry only after strict compile succeeds. Details:
$details"
fi

if ! git diff --quiet -- apps/app/src/i18n/locales; then
  deny 'Blocked: Lingui extraction or compilation changed catalog files after the index was prepared. Review the generated en/zh-CN catalog changes, stage all intended files under apps/app/src/i18n/locales, then commit normally.'
fi

exit 0
