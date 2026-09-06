.DEFAULT_GOAL := help
.PHONY: help install hooks start stop clean fresh build test lint types check refactor

help: ## Liste les commandes
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Installe les dépendances PHP + JS, .env, clé, migrations
	composer install
	@test -f .env || cp .env.example .env
	@grep -q "^APP_KEY=base64" .env || php artisan key:generate
	@touch database/database.sqlite
	php artisan migrate --force
	php artisan storage:link
	pnpm install
	sh scripts/install-hooks.sh

hooks: ## Active le hook git pre-commit (make check avant chaque commit)
	sh scripts/install-hooks.sh

refactor: ## Rector en dry-run (montre ce qui serait modernisé)
	composer refactor:check

start: ## Lance serveur HTTP + queue + Reverb (websocket) + Vite + logs
	composer dev

stop: ## Tue les process de dev encore ouverts
	-pkill -f "artisan serve" || true
	-pkill -f "artisan reverb:start" || true
	-pkill -f "artisan queue:listen" || true
	-pkill -f "vite" || true

clean: ## Vide tous les caches Laravel (config, routes, vues, events, app) + Vite
	php artisan optimize:clear
	rm -rf public/build node_modules/.vite
	@echo "Caches vidés."

fresh: clean ## Reset complet de la base (drop + migrate + seed)
	php artisan migrate:fresh --seed

build: ## Build de production des assets
	pnpm run build

test: ## Lance les tests PHP (Pest) puis front (Vitest)
	php artisan test
	pnpm test

lint: ## Rector + Pint + oxlint/oxfmt --fix
	composer lint
	pnpm run check:fix

types: ## Vérifie les types PHP (PHPStan) + TypeScript
	composer types:check
	pnpm run types:check

check: lint types test ## Lint + types + tests

# Régénère package-lock.json (utilisé par `npm ci` sur Laravel Cloud) depuis package.json,
# hors de node_modules (arborescence pnpm) : à lancer après tout changement de dépendance.
lock:
	rm -rf /tmp/dashboard-npm-lock && mkdir -p /tmp/dashboard-npm-lock && cp package.json /tmp/dashboard-npm-lock/ \
	&& cd /tmp/dashboard-npm-lock && npm install --package-lock-only --ignore-scripts --no-audit --no-fund \
	&& cp /tmp/dashboard-npm-lock/package-lock.json $(CURDIR)/package-lock.json && rm -rf /tmp/dashboard-npm-lock

