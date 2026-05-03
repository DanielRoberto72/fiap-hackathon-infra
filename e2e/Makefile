.PHONY: up down build run-test full clean pull-ghcr up-ghcr full-ghcr down-ghcr

SHELL := /bin/bash

COMPOSE_GHCR := docker compose -f docker-compose.e2e.yml -f docker-compose.e2e.ghcr.yml

up:
	docker compose -f docker-compose.e2e.yml up -d --wait

build:
	docker compose -f docker-compose.e2e.yml build --parallel

down:
	docker compose -f docker-compose.e2e.yml down

clean:
	docker compose -f docker-compose.e2e.yml down -v

run-test:
	npm install
	npm test

full:
	$(MAKE) build
	$(MAKE) up
	@echo "→ aguardando 10s para os serviços ficarem estáveis"
	@sleep 10
	$(MAKE) run-test
	$(MAKE) down

# === alvos GHCR (puxam imagens publicadas em vez de buildar local) ===

pull-ghcr:
	$(COMPOSE_GHCR) pull

up-ghcr:
	$(COMPOSE_GHCR) up -d --wait

down-ghcr:
	$(COMPOSE_GHCR) down

full-ghcr:
	$(MAKE) pull-ghcr
	$(MAKE) up-ghcr
	@echo "→ aguardando 10s para os serviços ficarem estáveis"
	@sleep 10
	$(MAKE) run-test
	$(MAKE) down-ghcr
