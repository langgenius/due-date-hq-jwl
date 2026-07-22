#!/usr/bin/env sh
set -eu

repo_root=$(git rev-parse --show-toplevel)
guard="$repo_root/.claude/hooks/no-verify-guard.sh"

run_guard() {
  jq -n --arg command "$1" '{tool_input:{command:$command}}' | sh "$guard"
}

expect_denied() {
  command=$1
  output=$(run_guard "$command")
  decision=$(printf '%s' "$output" | jq -r '.hookSpecificOutput.permissionDecision // ""')
  if [ "$decision" != 'deny' ]; then
    echo "expected command to be denied: $command" >&2
    exit 1
  fi
}

expect_allowed() {
  command=$1
  output=$(run_guard "$command")
  if [ -n "$output" ]; then
    echo "expected command to be allowed: $command" >&2
    printf '%s\n' "$output" >&2
    exit 1
  fi
}

expect_denied 'git commit --no-verify -m "skip hook"'
expect_denied 'git commit -nm "skip hook"'
expect_denied 'git push origin main --no-verify'
expect_denied 'git -C /tmp/worktree push --no-verify origin main'
expect_denied 'git status && git push --no-verify origin main'

expect_allowed 'git commit -m "normal commit"'
expect_allowed 'git commit -m "document --no-verify policy"'
expect_allowed 'git push origin main'
expect_allowed 'git push -n origin main'
expect_allowed 'git show -n 1'
expect_allowed 'echo --no-verify'

echo 'no-verify guard tests passed'
