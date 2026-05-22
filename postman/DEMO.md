# Roteiro de demonstração — FIAP Hackathon IADT+SOAT

## 1. Como subir o ambiente

```bash
cd fiap-hackathon-infra/e2e
docker compose -f docker-compose.e2e.yml -f docker-compose.e2e.ghcr.yml down -v
docker compose -f docker-compose.e2e.yml -f docker-compose.e2e.ghcr.yml up -d
# Aguardar ~90s no primeiro start (LocalStack baixa zip do lambda-auth, cria 3 Lambdas, API Gateway)
docker compose -f docker-compose.e2e.yml -f docker-compose.e2e.ghcr.yml ps
```

Quando todos os containers aparecerem como `healthy`, abra o Postman e importe a coleção em `postman/fiap-hackathon.postman_collection.json`.

## 2. URLs expostas

| Serviço | URL local | Função |
|---|---|---|
| BFF | http://localhost:3000 | Entry point REST que o cliente usa |
| upload-orchestration | http://localhost:3001 | Upload + ClamAV + S3 + SQS (acesso direto p/ debug) |
| processing | http://localhost:3002 | Pipeline IA — só worker, sem REST público |
| report | http://localhost:3003 | Consulta de relatório (acesso direto p/ debug) |
| LocalStack | http://localhost:4566 | Lambda + API Gateway + S3 + SQS + Secrets Manager |
| auth (API Gateway) | http://localhost:4566/restapis/fiapauth/local/_user_request_ | Roteado para Lambda `fiap-hackathon-auth-*` |

## 3. Rotas que valem para a demo

### Auth (serverless real via LocalStack Lambda)

```
POST /auth/register       — cria usuário
POST /auth/login          — devolve JWT HS256
```

### Pipeline de análise (BFF + upload + processing assíncrono + report)

```
POST /api/analyses               — multipart com diagrama PNG/JPG (Authorization: Bearer + Idempotency-Key)
GET  /api/analyses/{id}/status   — status: RECEIVED → PROCESSING → ANALYZED
GET  /api/reports/{id}           — relatório consolidado após pipeline IA
```

### Healthchecks

```
GET /api/health/live      — liveness probe (todos os NestJS — porta 3000/3001/3003)
GET /api/health/ready     — readiness probe (todos os NestJS)
GET /_localstack/health   — status dos serviços AWS emulados (porta 4566)
```

Todos os NestJS aplicam `app.setGlobalPrefix('api')`, por isso as rotas começam com `/api/`.

## 4. Sequência sugerida para o vídeo

1. **Mostrar `docker compose ps`** — todos os 8 containers saudáveis (BFF, upload, processing, report, MySQL, MongoDB, LocalStack, Mongo).
2. **Mostrar o LocalStack provisionado** — `awslocal lambda list-functions` exibe `fiap-hackathon-auth-login`, `fiap-hackathon-auth-register`, `fiap-hackathon-authorizer`.
3. **Postman → folder "1. Autenticação"** — `POST /auth/register` e `POST /auth/login`. Mostrar o accessToken JWT decodificado em jwt.io.
4. **Postman → folder "2. Pipeline de análise"** — anexar um diagrama (`docs/diagrams/01-arquitetura-containers.png` deste repo serve) em `POST /api/analyses`, esperar 5-15s e fazer `GET /api/reports/{analysis_id}` até obter 200 com componentes detectados, riscos e recomendações.
5. **Postman → folder "3. Cenários alternativos"** — auth com senha errada e upload sem Authorization, mostrando 401.
6. **Logs em vivo** — `docker logs -f fiap-hackathon-e2e-processing-1` mostra Gemini Vision + Groq Llama executando o pipeline IA.

## 5. Variáveis da collection

| Variável | Default | Uso |
|---|---|---|
| `bff_base` | `http://localhost:3000` | Endpoint público do cliente |
| `auth_base` | `http://localhost:4566/restapis/fiapauth/local/_user_request_` | API Gateway LocalStack |
| `test_email` | `daniel@fiap.com` | Edite à vontade |
| `test_password` | `Hackathon123!` | Idem |
| `access_token` | _(vazio)_ | Preenchido automaticamente pelo `POST /auth/login` |
| `analysis_id` | _(vazio)_ | Preenchido automaticamente pelo `POST /api/analyses` |

## 6. Comandos curl equivalentes (caso prefira terminal)

```bash
# 1. Register
curl -sS -X POST http://localhost:4566/restapis/fiapauth/local/_user_request_/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"daniel@fiap.com","password":"Hackathon123!"}'

# 2. Login (extrai accessToken)
TOKEN=$(curl -sS -X POST http://localhost:4566/restapis/fiapauth/local/_user_request_/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"daniel@fiap.com","password":"Hackathon123!"}' | jq -r .accessToken)

echo "$TOKEN"

# 3. Upload de diagrama (substitua o path do PNG)
ANALYSIS_ID=$(curl -sS -X POST http://localhost:3000/api/analyses \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -F "file=@docs/diagrams/01-arquitetura-containers.png" | jq -r .analysisId)

echo "$ANALYSIS_ID"

# 4. Consultar relatório (re-rode até receber 200)
curl -sS -X GET "http://localhost:3000/api/reports/$ANALYSIS_ID" \
  -H "Authorization: Bearer $TOKEN" | jq
```

## 7. Tear down

```bash
docker compose -f docker-compose.e2e.yml -f docker-compose.e2e.ghcr.yml down -v
```
