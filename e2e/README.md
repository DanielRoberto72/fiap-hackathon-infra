# E2E — fluxo completo do Hackathon

Sobe os 4 microsserviços + Lambda auth (omit) em containers locais, dispara o fluxo completo via BFF e valida o relatório final.

## Pré-requisitos

- Docker + Docker Compose
- Node 22 + npm
- ~4 GB de RAM livres (pra MySQL + Mongo + LocalStack + 4 serviços NestJS)

## Como rodar

```bash
# Builda imagens, sobe stack, espera healthchecks, roda testes, derruba.
make full
```

Ou em passos separados:

```bash
make build      # docker compose build --parallel
make up         # docker compose up -d --wait
make run-test   # npm install + npm test (Jest + Supertest)
make down       # docker compose down
```

## O que é validado

1. `POST /api/analyses` aceita o upload (multipart/form-data) e retorna `202 Accepted` com `analysisId` em estado `RECEIVED`.
2. O fluxo SQS roda ponta-a-ponta:
   - `analysis-requested` é consumido pelo `processing`
   - O pipeline IA mock executa as duas etapas
   - `analysis-completed` é publicado e consumido pelo `report`
3. `GET /api/reports/:id` retorna `200` com `componentsCount > 0`, `risksCount > 0`, `recommendationsCount > 0` e `status: ANALYZED`.
4. **Idempotência**: dois `POST /api/analyses` com a mesma `Idempotency-Key` retornam o mesmo `analysisId` (segundo com `alreadyExisted: true`).

## Provider de IA usado nos testes

`LLM_VISION_PROVIDER=mock` e `LLM_TEXT_PROVIDER=mock` — saída determinística, sem custo, sem dependência de chave Gemini/Groq. O pipeline real é exercitado em demos manuais e no vídeo.
