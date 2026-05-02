.PHONY: up down build run-test full clean

SHELL := /bin/bash

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
