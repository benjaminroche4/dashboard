#!/bin/sh
# Installe les hooks git du projet. Lancé par `make install`.
cd "$(git rev-parse --show-toplevel)" || exit 1
git config core.hooksPath scripts/hooks
