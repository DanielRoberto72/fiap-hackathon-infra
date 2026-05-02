# FIAP Hackathon — Análise Automática de Diagramas Arquiteturais

> **Hackathon Integrado IADT + SOAT da FIAP** (entrega 2026-05-27).
> Empresa fictícia: **FIAP Secure Systems**.

Este é o **repositório-mestre** do projeto. Hospeda toda a infraestrutura como código (Terraform), o Helm chart unificado, o E2E, os ADRs e a documentação de arquitetura e segurança.

---

## Descrição do problema

Empresas que operam sistemas distribuídos têm dezenas de **diagramas de arquitetura** em PDFs e imagens, usados em revisões, auditorias de segurança e avaliações de escalabilidade. Esses diagramas:

- são analisados manualmente
- demandam muito tempo
- dependem de especialistas
- não escalam

A **FIAP Secure Systems** quer um MVP back-end que receba um diagrama de arquitetura (imagem ou PDF) e devolva automaticamente:

- ✅ **Componentes identificados** (microsserviços, bancos, filas, gateways, observabilidade…)
- ✅ **Riscos arquiteturais** (SPOF, falta de observabilidade, acoplamento, segurança…)
- ✅ **Recomendações priorizadas** (com referências e estimativa de esforço)

---

## Arquitetura proposta

### Em uma frase

Uma plataforma de microsserviços NestJS em **AWS EKS** que recebe diagramas via **API Gateway HTTP API** com JWT Lambda authorizer, persiste no S3, dispara um pipeline assíncrono via **SQS**, executa um pipeline de **IA em duas etapas** (Gemini Vision para extração de componentes + Groq Llama 3.3 para classificação de riscos), e expõe relatórios estruturados consultáveis por REST.

### Diagrama (C4 Container)

Ver [`docs/arquitetura.md`](docs/arquitetura.md) para diagramas Mermaid completos: visão de containers, sequência do happy path, fluxo de falha e bounded contexts.

### Microsserviços

| # | Repositório | Responsabilidade | DB | Comunicação |
|---|---|---|---|---|
| 1 | [`fiap-hackathon-bff`](https://github.com/DanielRoberto72/fiap-hackathon-bff) | BFF / agregador de chamadas REST | — | REST in / REST out |
| 2 | [`fiap-hackathon-upload-orchestration`](https://github.com/DanielRoberto72/fiap-hackathon-upload-orchestration) | Upload, validação, ClamAV scan, S3 PUT, publicação SQS | MySQL/Prisma | REST + SQS publish |
| 3 | [`fiap-hackathon-processing`](https://github.com/DanielRoberto72/fiap-hackathon-processing) | Pipeline IA (Gemini Vision → Groq Llama) | MongoDB/Mongoose | SQS consume + LLM HTTP + SQS publish |
| 4 | [`fiap-hackathon-report`](https://github.com/DanielRoberto72/fiap-hackathon-report) | Persiste relatório final, expõe consulta REST | MySQL/Prisma | SQS consume + REST |
| 5 | [`fiap-hackathon-lambda-auth`](https://github.com/DanielRoberto72/fiap-hackathon-lambda-auth) | login/register + Lambda authorizer JWT | MySQL | API Gateway invoke |

### Stack

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Backend | NestJS 11 + TypeScript | Reaproveitamento do ecossistema FIAP existente, Clean Architecture nativa |
| Persistência | Polyglot — MySQL/Prisma + MongoDB Atlas/Mongoose | Dados estruturados em MySQL; outputs IA semi-estruturados em Mongo |
| Storage | AWS S3 + presigned URLs | Free tier, durabilidade 11 9's, IAM nativo via IRSA |
| Mensageria | AWS SQS + DLQ + SNS | Async natural, **Event-Carried State Transfer**, retry idempotente |
| Edge | API Gateway HTTP API + JWT Lambda authorizer + BFF NestJS | TLS, rate limit, JWT nativo, BFF Pattern para agregação |
| IA | Strategy Pattern: Gemini 2.5 Flash + Groq Llama 3.3 + Mock | "Right model for right task"; demo determinística com Mock; custo controlado |
| Guardrails IA | Zod schemas, system prompt rígido, prompt-injection defense | Saída estruturada e validada; resiliência a entradas adversárias |
| Infra | EKS, IRSA, Terraform, Helm | Reaproveitamento do `fiap-infra-kubernetes`, princípio do menor privilégio |
| Observabilidade | Datadog (APM, Logs Pino, Metrics) | Stack unificada com restante do ecossistema FIAP |
| CI/CD | GitHub Actions (build + test + push ECR + helm upgrade) | OIDC AWS, sem long-lived secrets, pipeline padrão por repo |

---

## Fluxo da solução

```
Cliente
   │  POST /api/analyses (multipart, JWT, Idempotency-Key)
   ▼
[API Gateway HTTP API] ── JWT authorizer (Lambda)
   │
   ▼
[BFF NestJS] ── proxy ──► [upload-orchestration]
                              1. valida MIME + magic bytes + size ≤ 10MB
                              2. ClamAV scan (sidecar)
                              3. PUT s3://bucket/raw/{uuid}
                              4. INSERT analyses (status=RECEIVED)
                              5. SendMessage SQS analysis.requested
                              6. retorna 202 + analysisId
                                            │
                            (async)         ▼
                        [processing] ── consome analysis.requested
                              1. (PDF? renderiza 1ª página em PNG via pdf2pic)
                              2. Gemini Vision ──► ComponentsExtraction (Zod)
                              3. Groq Llama 3.3 ──► RisksAndRecommendations (Zod)
                              4. INSERT analysis_results (Mongo)
                              5. SendMessage SQS analysis.completed (payload completo)
                                            │
                            (async)         ▼
                        [report] ── consome analysis.completed
                              1. INSERT reports (cópia local — Event-Carried State Transfer)
                              2. expõe GET /api/reports/{id}

Cliente
   │  GET /api/reports/{analysisId}
   ▼
[API Gateway] → [BFF] → [report] → 200 OK { components, risks, recommendations }
```

Em caso de falha permanente: `analysis.failed` é publicado, o `report` registra um relatório com `status=ERROR` e `errorReason`. Após 3 tentativas, mensagens vão para a DLQ.

---

## Instruções de execução

### Pré-requisitos

- Docker + Docker Compose
- Node 22 + npm
- Make
- (Para deploy real) AWS CLI + Terraform 1.9+ + Helm 3 + kubectl

### Desenvolvimento local

```bash
# 1. Subir as dependências (MySQL + Mongo + LocalStack + ClamAV)
make up
make smoke

# 2. Em outro terminal, subir cada microsserviço:
cd ../fiap-hackathon-upload-orchestration && npm install && npm run start:dev
cd ../fiap-hackathon-processing && npm install && npm run start:dev
cd ../fiap-hackathon-report && npm install && npm run start:dev
cd ../fiap-hackathon-bff && npm install && npm run start:dev

# 3. Smoke test do fluxo:
curl -X POST http://localhost:3000/api/analyses \
  -H "Idempotency-Key: $(uuidgen)" \
  -F "file=@./docs/diagrama-exemplo.png" | jq

curl http://localhost:3000/api/reports/<id> | jq
```

### Teste E2E ponta-a-ponta (automatizado)

```bash
cd e2e
make full   # build + up + jest + down
```

Ver [`e2e/README.md`](e2e/README.md).

### Deploy em AWS EKS

```bash
# 1. Provisionar infra (uma vez)
cd terraform
terraform init
terraform plan
terraform apply

# 2. Configurar kubeconfig
aws eks update-kubeconfig --name fiap-hackathon-dev-eks --region us-east-1

# 3. Buildar e empurrar imagens (CI/CD faz isso automaticamente em push pra main)
# ou manualmente em cada repo de serviço:
docker build -t <ECR>/fiap-hackathon-dev-bff:latest .
docker push <ECR>/fiap-hackathon-dev-bff:latest

# 4. Deployar via Helm
cd ../helm
# Ver helm/README.md para o passo-a-passo completo com envsubst.
```

### Empacotar Lambda

```bash
cd fiap-hackathon-lambda-auth
npm run package    # gera lambda-auth.zip pronto pra terraform apply
```

---

## Estrutura deste repositório

```
fiap-hackathon-infra/
├── README.md                              # este documento
├── Makefile                               # atalhos: up, smoke, s3-ls, sqs-ls
├── docker-compose.yml                     # stack local de dev
├── .env.example                           # template de env vars
├── docker/mysql-init/                     # bootstrap do MySQL local
├── localstack-init/                       # bootstrap do LocalStack
├── shared/                                # biblioteca TS compartilhada (Zod, LLM Strategy, Pino, errors)
├── terraform/                             # IaC AWS (VPC + EKS + ECR + RDS + S3 + SQS + Lambda + API GW + IAM)
├── helm/                                  # chart unificado fiap-hackathon-service + 4 values
├── e2e/                                   # docker-compose.e2e.yml + Jest + Supertest
├── docs/
│   ├── arquitetura.md                     # diagramas Mermaid (C4 + sequência + falha)
│   ├── seguranca.md                       # SEÇÃO OBRIGATÓRIA do hackathon
│   └── adr-002-arquitetura-fiap-hackathon.md
└── .github/workflows/
    ├── terraform.yml                      # plan/apply via OIDC
    └── helm-lint.yml                      # lint + smoke render dos 4 values
```

---

## Segurança

Seção obrigatória pelo PDF do hackathon. Documentação completa em [`docs/seguranca.md`](docs/seguranca.md), cobrindo:

1. Validação de entradas não confiáveis (MIME + magic bytes + tamanho + sanitização + ClamAV + idempotência)
2. Uso controlado de IA (system prompts rígidos, Zod nos outputs, prompt-injection defense, temperature 0.2)
3. Tratamento de falhas da IA (retry exponencial + fallback Mock + classificação de erro)
4. Comunicação inter-serviços (TLS, VPC privada, IRSA com privilégio mínimo, security groups)
5. Gestão de segredos (AWS Secrets Manager para tudo)
6. JWT (HS256 explícito, iss/aud validados, secret ≥ 16 chars, bcrypt cost 10)
7. Princípio do menor privilégio (IRSA por serviço com escopos mínimos — ver `terraform/iam.tf`)
8. Hardening de container (runAsNonRoot, capabilities drop ALL, seccompProfile RuntimeDefault, alpine images)
9. Observabilidade e auditoria (Pino redact, Datadog APM, CloudWatch access logs)
10. Riscos identificados e mitigações (tabela completa)

---

## Decisões arquiteturais

A ADR-002 documenta **16 decisões** com alternativas rejeitadas e justificativas:

→ [`docs/adr-002-arquitetura-fiap-hackathon.md`](docs/adr-002-arquitetura-fiap-hackathon.md)

Resumo das mais importantes:

| ID | Decisão |
|---|---|
| D3 | Stack unificada NestJS + TypeScript em todos os serviços |
| D4 | Quatro microsserviços (bff + upload-orchestration + processing + report) |
| D5 | Polyglot persistence (MySQL para estruturado + Mongo para outputs IA) |
| D6 | Comunicação assíncrona via Event-Carried State Transfer (SQS) |
| D8 | LLM multi-provider via Strategy Pattern (Gemini + Groq + Mock fallback) |
| D9 | Pipeline IA em 2 etapas justificadas (vision → text) |
| D10 | Edge híbrido (API Gateway HTTP API + BFF) |
| D11 | Lambda authorizer custom + JWT email/senha |
| D14 | Pirâmide pragmática de testes (~70% unit + integration + E2E) |
| D15 | Pacote intermediário de segurança (ClamAV, idempotência, prompt-injection defense) |

---

## Escopo do MVP — checklist do PDF

### Funcionalidades obrigatórias

- [x] Upload de diagrama (imagem ou PDF) — `POST /api/analyses`
- [x] Criação de processo de análise — INSERT `analyses` + publish `analysis.requested`
- [x] Consulta de status (RECEIVED / PROCESSING / ANALYZED / ERROR) — `GET /api/analyses/:id/status`
- [x] Geração de relatório com componentes, riscos, recomendações — `GET /api/reports/:id`

### Requisitos técnicos SOAT

- [x] Microsserviços (5)
- [x] Comunicação REST + ao menos um fluxo assíncrono (SQS, em 3 tópicos)
- [x] Clean Architecture (Interface / Application / Domain / Infrastructure) em todos
- [x] Cada serviço com responsabilidade clara, DB próprio, testes automatizados
- [x] API Gateway, Upload+Orquestração, Processamento, Relatórios — todos os mínimos sugeridos cobertos

### Requisitos técnicos IADT

- [x] Pipeline claro de IA (2 etapas)
- [x] Justificativa da abordagem ("right model for right task" — vision + text)
- [x] Demonstração prática (E2E com mock provider determinístico)
- [x] Discussão de limitações (`degraded` flag, classificação de falha, fallback Mock)

### Integração IA + Sistema

- [x] IA é parte do fluxo (consumer SQS no `processing`)
- [x] Sistema trata falhas da IA (retry + fallback + `analysis.failed`)
- [x] Resultado da IA é persistido (Mongo no `processing`, MySQL no `report`)
- [x] Relatório é gerado a partir da análise (Event-Carried State Transfer)

### Infraestrutura e DevOps

- [x] Docker (multi-stage Dockerfiles em todos os serviços)
- [x] Docker Compose **e** Kubernetes (Helm chart)
- [x] Pipeline CI/CD com build + testes + deploy (GitHub Actions com OIDC para AWS)

### Qualidade e observabilidade

- [x] Logs estruturados (Pino JSON com PII redact)
- [x] Tratamento de erros (DomainError hierarchy + filter)
- [x] Testes unitários (31 testes verdes em 3 serviços)
- [x] README explicativo (este)

---

## Status do projeto

🚧 **Sprint inicial concluído em 2026-05-02**. Próximos passos:

1. Provisionamento da conta AWS nova + Budget alert
2. Apply do Terraform (em janela 19-20/05)
3. Smoke tests no EKS (21-25/05)
4. Ensaio + gravação do vídeo de demo (26-27/05)
5. Entrega oficial em **2026-05-27**

---

## Licença e autoria

- **Autor**: Daniel Roberto Pereira ([@DanielRoberto72](https://github.com/DanielRoberto72))
- **Curso**: Pós-Graduação em Software Architecture — FIAP
- **Hackathon**: IADT + SOAT (2026)
