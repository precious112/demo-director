#!/bin/sh
# Restores the Vahl project to its committed state: every film starts from the same files.
set -e
cd "$(dirname "$0")/.."
git checkout -- project/vahl/.caret/pages project/vahl/.caret/tokens project/vahl/.caret/caret-theme.css project/vahl/src
rm -rf project/vahl/.caret/.variants.json project/vahl/.caret/pages/*--v*
git checkout -- project/vahl/.caret/assets/index.json
rm -f project/vahl/.caret/assets/fog-ride.jpg
