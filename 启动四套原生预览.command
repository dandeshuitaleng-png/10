#!/bin/zsh
cd -- "$(dirname -- "$0")/rural-culture-miniprogram" || exit 1
node tools/v4-start-preview.cjs
open 'http://127.0.0.1:6497/preview/v4.html'
