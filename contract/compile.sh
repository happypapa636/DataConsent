#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
export PATH="$HOME/.local/bin:$PATH"
rm -rf managed/dataconsent
exec compact compile dataconsent.compact managed/dataconsent