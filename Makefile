COMPOSE := docker compose
COMPOSE_PROD := docker compose -f docker-compose.prod.yml

# Read .env so targets can reference the database settings.
-include .env
POSTGRES_USER ?= onix
POSTGRES_PASSWORD ?= onix
POSTGRES_DB ?= onix_dev
# onix_dev -> onix_test, matching the derivation in apps/api/vitest.config.ts
TEST_DB := $(patsubst %_dev,%,$(POSTGRES_DB))_test
TEST_DATABASE_URL := postgres://$(POSTGRES_USER):$(POSTGRES_PASSWORD)@postgres:5432/$(TEST_DB)

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

.PHONY: up
up: ## Build (if needed) and start the full dev stack
	$(COMPOSE) up --build

.PHONY: start
start: ## Start the dev stack in the background
	$(COMPOSE) up -d --build

.PHONY: down
down: ## Stop the stack
	$(COMPOSE) down

.PHONY: clean
clean: ## Stop the stack and delete the database volume
	$(COMPOSE) down -v

.PHONY: logs
logs: ## Tail logs from all services
	$(COMPOSE) logs -f

.PHONY: ps
ps: ## Show service status
	$(COMPOSE) ps

.PHONY: sh-api sh-web psql
sh-api: ## Shell into the API container
	$(COMPOSE) exec api sh

sh-web: ## Shell into the web container
	$(COMPOSE) exec web sh

psql: ## Open psql against the dev database
	$(COMPOSE) exec postgres psql -U $${POSTGRES_USER:-onix} -d $${POSTGRES_DB:-onix_dev}

.PHONY: migrate-up migrate-down migrate-create
migrate-up: ## Apply pending migrations
	$(COMPOSE) exec api npm run migrate:up

migrate-down: ## Roll back the most recent migration
	$(COMPOSE) exec api npm run migrate:down

migrate-create: ## Create a migration: make migrate-create name=companies
	@test -n "$(name)" || (echo "usage: make migrate-create name=<migration-name>" && exit 1)
	$(COMPOSE) exec api npm run migrate:create -- $(name)

.PHONY: test test-db lint typecheck format
test: ## Run API tests (against the test database, not onix_dev)
	$(COMPOSE) exec api npm test

test-db: ## Create the test database and apply migrations to it
	@$(COMPOSE) exec -T postgres psql -U $(POSTGRES_USER) -d postgres -tc \
		"SELECT 1 FROM pg_database WHERE datname='$(TEST_DB)'" | grep -q 1 \
		|| $(COMPOSE) exec -T postgres createdb -U $(POSTGRES_USER) $(TEST_DB)
	$(COMPOSE) exec -T -e DATABASE_URL=$(TEST_DATABASE_URL) api npm run migrate:up
	@echo "Test database ready: $(TEST_DB)"

lint: ## Lint both services
	$(COMPOSE) exec api npm run lint
	$(COMPOSE) exec web npm run lint

typecheck: ## Typecheck both services
	$(COMPOSE) exec api npm run typecheck
	$(COMPOSE) exec web npm run typecheck

format: ## Format both services
	$(COMPOSE) exec api npm run format
	$(COMPOSE) exec web npm run format

.PHONY: install-api install-web
install-api: ## Add a dependency to the API: make install-api pkg=dayjs
	@test -n "$(pkg)" || (echo "usage: make install-api pkg=<package>" && exit 1)
	$(COMPOSE) exec api npm install $(pkg)

install-web: ## Add a dependency to the web app: make install-web pkg=clsx
	@test -n "$(pkg)" || (echo "usage: make install-web pkg=<package>" && exit 1)
	$(COMPOSE) exec web npm install $(pkg)

.PHONY: prod-up prod-down
prod-up: ## Build and start the production stack
	$(COMPOSE_PROD) up -d --build

prod-down: ## Stop the production stack
	$(COMPOSE_PROD) down
