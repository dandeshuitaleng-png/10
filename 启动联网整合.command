#!/bin/zsh
cd -- "$(dirname -- "$0")" || exit 1
quiz_node="${NODE_BINARY:-node}"
if ! "$quiz_node" -e "require('node:sqlite')" >/dev/null 2>&1; then
  quiz_bundled="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
  if [[ -x "$quiz_bundled" ]]; then quiz_node="$quiz_bundled"; else print '请安装支持node:sqlite的Node.js（建议24版）'; exit 1; fi
fi
"$quiz_node" demo/scripts/start-local-service.cjs || exit 1
open 'http://127.0.0.1:63112/play'
