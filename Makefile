.DEFAULT_GOAL := help
.PHONY: help install start stop clean fresh build test lint types check

help: ## Liste les commandes
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Installe les dépendances PHP + JS, .env, clé, migrations
	composer install
	@test -f .env || cp .env.example .env
	@grep -q "^APP_KEY=base64" .env || php artisan key:generate
	@touch database/database.sqlite
	php artisan migrate --force
	npm install

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
	npm run build

test: ## Lance les tests PHP (Pest) puis front (Vitest)
	php artisan test
	npm test

lint: ## Formate PHP (Pint) + JS/TS
	composer lint
	npm run check:fix

types: ## Vérifie les types PHP (PHPStan) + TypeScript
	composer types:check
	npm run types:check

check: lint types test ## Lint + types + tests
