.PHONY: help up up-obs down logs ps clean s3-ls sqs-ls smoke

SHELL := /bin/bash

help:
	@echo "FIAP Hackathon — atalhos de desenvolvimento local"
	@echo ""
	@echo "  make up         sobe MySQL + Mongo + LocalStack + ClamAV"
	@echo "  make up-obs     sobe tudo acima + Datadog Agent"
	@echo "  make down       para e remove containers"
	@echo "  make logs       acompanha os logs de todos os serviços"
	@echo "  make ps         mostra serviços em execução"
	@echo "  make clean      down + remove volumes (DESTRUTIVO)"
	@echo "  make s3-ls      lista buckets S3 no LocalStack"
	@echo "  make sqs-ls     lista filas SQS no LocalStack"
	@echo "  make smoke      health-check rápido das dependências"

up:
	docker compose up -d mysql mongo localstack clamav
	@echo "→ http://localhost:4566/_localstack/health"

up-obs:
	docker compose --profile observability up -d

down:
	docker compose down

logs:
	docker compose logs -f --tail=100

ps:
	docker compose ps

clean:
	docker compose down -v

s3-ls:
	docker compose exec localstack awslocal s3 ls

sqs-ls:
	docker compose exec localstack awslocal sqs list-queues

smoke:
	@echo "→ MySQL"
	@docker compose exec mysql mysqladmin ping -h 127.0.0.1 -uroot -p$${MYSQL_ROOT_PASSWORD:-rootpass} 2>/dev/null && echo "  ✅ ativo" || echo "  ❌ fora do ar"
	@echo "→ Mongo"
	@docker compose exec mongo mongosh --quiet --eval "db.adminCommand('ping').ok" 2>/dev/null && echo "  ✅ ativo" || echo "  ❌ fora do ar"
	@echo "→ LocalStack"
	@curl -fs http://localhost:4566/_localstack/health > /dev/null && echo "  ✅ ativo" || echo "  ❌ fora do ar"
	@echo "→ ClamAV"
	@(echo PING | nc -q 1 127.0.0.1 3310 2>/dev/null | grep -q PONG) && echo "  ✅ ativo" || echo "  ❌ fora do ar (ainda subindo? primeira execução leva ~60s)"
