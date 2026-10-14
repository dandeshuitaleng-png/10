#!/bin/zsh
cd "$(dirname "$0")/demo" || exit 1
if command -v node >/dev/null 2>&1; then
  node scripts/start-local-service.cjs
elif [[ -x "$HOME/.local/bin/node" ]]; then
  "$HOME/.local/bin/node" scripts/start-local-service.cjs
else
  echo "请先安装 Node.js 24.19 或更高版本。"
  exit 1
fi
