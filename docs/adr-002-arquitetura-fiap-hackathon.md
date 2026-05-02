---
id: adr-002-arquitetura-fiap-hackathon
title: "ADR-002: Arquitetura do Hackathon FIAP — Análise de Diagramas com IA"
status: aceita
data: 2026-05-01
autores: [daniel-roberto]
projeto: prj-fiap-hackathon
tags: [adr, arquitetura, hackathon, microsservicos, ia, soat]
---

# ADR-002: Arquitetura do Hackathon FIAP — Análise Automática de Diagramas

## Contexto

O Hackathon Integrado **IADT + SOAT** da Pós-Graduação em Software Architecture da FIAP exige um MVP backend da empresa fictícia **FIAP Secure Systems**, que recebe diagramas de arquitetura (PDF ou imagem) e devolve uma análise técnica automatizada (componentes, riscos, recomendações).

Daniel cobre sozinho ambas as frentes do hackathon (SOAT + IADT). A avaliação prioriza **coerência da solução**, **decisões arquiteturais bem explicadas** e **integração ponta a ponta funcionando**. Há mentoria de IA disponível e o requisito IADT permite uso de API LLM pronta com guardrails e prompt engineering — não exige modelo customizado.

A entrega é em 2026-05-27, com sprint principal entre 01 e 03 de maio (sex+sáb+dom).

Daniel já possui um ecossistema FIAP maduro (NestJS, Clean Architecture, MySQL/Prisma, MongoDB/Mongoose, AWS SQS/SNS, EKS, Terraform, Datadog, GitHub Actions) — o reaproveitamento de boilerplate é decisivo.

## Decisões

### D1 — Cobertura: solo, foco em SOAT, IADT mínimo
**Escolhido:** Daniel cobre tudo. O SOAT recebe peso maior; o IADT é atendido com API pronta + classificação simples + fallback mock.
**Por quê:** A coordenação do curso indicou explicitamente que a IA pode ser API pronta + prompt engineering. Há mentoria de professores de IADT disponível para dúvidas pontuais.

### D2 — Prazo e cadência
**Escolhido:** Entrega em 2026-05-27. Sprint núcleo de 01 a 03/05. Polimento de 04 a 26/05. Apply do Terraform + ensaio + gravação entre 19 e 27/05.
**Por quê:** Concentrar a implementação no fim de semana protege o ciclo das outras responsabilidades (Surf, Contexta, AtomEdAI).

### D3 — Stack unificada NestJS + TypeScript
**Escolhido:** Todos os 4 microsserviços + BFF + Lambda em NestJS 11 + TypeScript.
**Alternativas rejeitadas:**
- NestJS + Python (FastAPI) só para a IA — adicionaria complexidade poliglota sem ganho real.
- 100% Python — descartaria a expertise e o boilerplate FIAP existente.
- 100% Node sem NestJS — perderia DI, validation pipes e a Clean Architecture pronta.

**Por quê:** Coerência arquitetural total, reaproveitamento máximo dos boilerplates de `fiap-billing` e `fiap-execution`, defesa cristalina diante da banca.

### D4 — Quatro microsserviços
**Escolhido:** `api-gateway-bff`, `upload-orchestration`, `processing`, `report`.
**Alternativas rejeitadas:**
- Três (consolidando gateway + upload) — fere a orientação explícita do PDF.
- Cinco (separar `ai-service` do `processing`) — over-engineering para um MVP, já que a IA é usada por um único serviço.

**Por quê:** Conformidade literal com a sugestão do PDF e separação justificável dos contextos delimitados.

### D5 — Polyglot persistence
**Escolhido:**
- `upload-orchestration` → MySQL (Prisma) — metadados estruturados, transacionais.
- `processing` → MongoDB Atlas (Mongoose) — outputs de IA semi-estruturados (mesma decisão do `fiap-billing`).
- `report` → MySQL (Prisma) — relatório estruturado, com queries por status e por data.

**Alternativas rejeitadas:**
- Tudo em MySQL — schema rígido demais para outputs de LLM.
- Tudo em MongoDB — perde a força transacional onde ela importa.

**Por quê:** "Right data store for right data shape", reaproveita o padrão FIAP e demonstra polyglot persistence (ponto positivo para o SOAT).

### D6 — Comunicação assíncrona via Event-Carried State Transfer (SQS)
**Escolhido:** O `processing` publica `analysis.completed` no SQS com payload completo. O `report` consome, persiste cópia local e fica autossuficiente.
**Alternativas rejeitadas:**
- Notificação + REST callback — acoplamento temporal, latência maior.
- Leitura compartilhada de DB — antipadrão, fere o bounded context.
- Saga choreography com 2 eventos — over-engineering para um MVP solo.

**Por quê:** Padrão idiomático de microsserviços, resiliente (com DLQ), payload bem dentro do limite de 256 KB do SQS para este caso, justificável diante da banca.

### D7 — Storage S3 com presigned URLs
**Escolhido:** AWS S3, lifecycle de 30 dias → glacier, presigned URLs para GET seguro.
**Alternativas rejeitadas:**
- EFS / EKS PV — operacionalmente pesado para um MVP.
- Base64 inline em SQS — limite de 256 KB inviabiliza PDFs reais.
- MongoDB GridFS — mistura responsabilidades.

**Por quê:** Padrão de mercado, free tier de 5 GB, durabilidade de 11 9's, IAM nativo via IRSA.

### D8 — LLM multi-provider via Strategy Pattern
**Escolhido:** Variável de ambiente `LLM_PROVIDER`. Implementações:
- `gemini` (Google Gemini 2.5 Flash, multimodal com visão, free tier robusto)
- `groq` (Llama 3.3 70B, apenas texto, ultra-rápido)
- `mock` (templates determinísticos, default em dev/test/CI)

**Alternativas rejeitadas:**
- AWS Bedrock — não está no free tier e a conta nova começa zerada.
- SDKs OpenAI/Anthropic diretos — créditos limitados, lock-in maior.

**Por quê:** Reaproveita o Strategy Pattern já implementado no `arq-contexta`. Demo determinística com mock. "Right model for right task". Custo total estimado abaixo de US$ 1.

### D9 — Pipeline de IA em duas etapas justificadas
**Escolhido:**
- **Etapa 1** — `processing` envia a imagem ao Gemini Vision → retorna `ComponentsExtraction` (validado por Zod): lista de componentes arquiteturais detectados.
- **Etapa 2** — `processing` envia esse JSON ao Groq → retorna `RisksAndRecommendations` (validado por Zod): classificação de riscos + recomendações.
- Guardrails: Zod em cada saída, retry 3x com exponential backoff, fallback para o mock provider em caso de falha permanente.

**Por quê:** Atende diretamente aos itens do PDF de IADT (detecção de componentes + classificação de riscos + LLM com guardrails + pipeline claro). Justifica o uso de múltiplos providers como decisão arquitetural ("right model for right task").

### D10 — Edge: API Gateway HTTP API + BFF NestJS (híbrido)
**Escolhido:** AWS API Gateway HTTP API (TLS, rate limit, JWT authorizer) → BFF NestJS no EKS → microsserviços.
**Alternativas rejeitadas:**
- Apenas API Gateway gerenciado — perde a defesa do BFF Pattern diante da banca.
- Apenas Ingress ALB — perde a camada gerenciada de segurança e rate limit.
- Apenas BFF — perde o JWT authorizer nativo do API Gateway.

**Por quê:** Cobre Edge + BFF + Microservices na mesma defesa arquitetural. Reaproveita o Terraform do `fiap-infra-kubernetes`.

### D11 — Auth: Lambda authorizer customizado + JWT email/senha
**Escolhido:** A Lambda `fiap-hackathon-lambda-auth` adapta o `fiap-lambda-auth-cpf` para `POST /auth/login` (email + bcrypt + JWT HS256).
**Alternativas rejeitadas:**
- Reaproveitar a Lambda CPF — domínio corporativo não combina com login por CPF.
- AWS Cognito — adiciona dependência sem ganho proporcional.
- Apenas API Key — fraca para a seção obrigatória de Segurança.
- Sem auth — não cumpre a seção obrigatória de Segurança.

**Por quê:** Reaproveita a arquitetura de auth custom da Fase 3 do FIAP, robustez justificável em ADR, JWT com escopos suporta `upload:write` / `report:read`.

### D12 — Observabilidade: Datadog (free trial)
**Escolhido:** Datadog APM + Logs Pino estruturados (com correlação via DD trace) + Metrics (DogStatsD) + dashboards.
**Alternativas rejeitadas:**
- AWS CloudWatch — UX fraca para demo na banca.
- Stack LGTM (Prometheus + Grafana + Loki + Tempo) — sprint extra de operação.

**Por quê:** Daniel já domina, alinha com `fiap-techchallenge` / `fiap-billing` / `fiap-execution`, free trial de 14 dias casa com a janela da entrega + banca.

### D13 — Multi-repo (padrão FIAP)
**Escolhido:** 6 repositórios GitHub:
- `fiap-hackathon-bff`
- `fiap-hackathon-upload-orchestration`
- `fiap-hackathon-processing`
- `fiap-hackathon-report`
- `fiap-hackathon-lambda-auth`
- `fiap-hackathon-infra`

**Alternativas rejeitadas:**
- Monorepo Turborepo — fugiria do padrão FIAP existente.
- Híbrido — confunde.

**Por quê:** Coerência com o ecossistema FIAP existente, GitHub Actions independente por serviço, deploy isolado, README focado em cada um.

### D14 — Testes: pirâmide pragmática
**Escolhido:** ~70% unitário (Jest, use cases + domain) + 1 teste de integração por serviço (Supertest + testcontainers MySQL/Mongo) + 1 teste E2E do fluxo completo (`docker-compose.test.yml` + LocalStack S3+SQS + LLM mock provider). Coverage gate de 70% no CI.
**Alternativas rejeitadas:**
- Mínimo viável (60% unitário apenas) — não comprova "integração ponta a ponta", critério explícito de avaliação.
- TDD completo — inviável no prazo.
- Pirâmide clássica 80%+ — leva mais tempo do que ganha.

**Por quê:** Cumpre o requisito formal e ataca diretamente o critério de avaliação destacado pela coordenação.

### D15 — Segurança: pacote intermediário (B)
**Escolhido:**
- Validação MIME + magic bytes + tamanho 10 MB + sanitização do nome
- Sidecar ClamAV antes do PUT no S3
- HTTPS, Secrets Manager, rate limit por IP e por usuário
- JWT com escopos
- Idempotência via header `Idempotency-Key`
- Defesa contra prompt injection (system prompt explícito + post-validation Zod)
- Logs sem PII (Pino redact), temperature 0.2, circuit breaker

**Stretch goals (apenas se sobrar tempo):**
- mTLS via Linkerd entre serviços

**Por quê:** Cobre todos os bullets da seção obrigatória de Segurança do PDF com profundidade defensável. ClamAV é fácil de integrar e impressiona. A defesa contra prompt injection é diferencial pesado em IA segura.

### D16 — Conta AWS nova + sprint local primeiro
**Escolhido:**
- Criar conta AWS nova (free tier zerado, isolamento total).
- Repositório Terraform novo `fiap-hackathon-infra` baseado no `fiap-infra-kubernetes`.
- Sprint local primeiro (kind/k3d + LocalStack + MongoDB Atlas M0 free).
- Apply do Terraform em 19-20/05, smoke tests em 21-25/05, ensaio em 26/05, gravação em EKS real em 26-27/05.
- AWS Budget alert de US$ 5 configurado já no dia 1.

**Alternativas rejeitadas:**
- Conta FIAP atual — free tier esgotado.
- Apply imediato em cloud — gasto sem necessidade durante o desenvolvimento.
- Demo final em local — a banca espera cloud real.

**Por quê:** Custo controlado (≤ US$ 5), ciclo de desenvolvimento rápido em local, demo impressionante em EKS real.

## Consequências

### Positivas
- Reaproveitamento massivo (60-70% do código vem dos boilerplates FIAP/Contexta).
- Coerência arquitetural total — uma decisão sustenta a outra.
- Demo ponta a ponta determinística (mock) + cloud real (Gemini/Groq) na entrega.
- Custo AWS controlado (~US$ 3-5).
- Aderência cirúrgica aos requisitos do PDF (microsserviços, REST + assíncrono, Clean Architecture, DBs próprios, testes, Docker, K8s, CI/CD, segurança).

### Negativas / Trade-offs
- Multi-repo (6 repositórios) tem overhead operacional vs monorepo — aceito pelo padrão FIAP.
- Datadog free trial é janela curta — precisa coordenar com a data da demo.
- Conta AWS nova consome ~30 minutos de setup.
- Strategy Pattern multi-provider adiciona complexidade vs single-provider.
- Pipeline de IA em 2 etapas adiciona latência vs single-call (mas justifica o multi-provider).

## Riscos

| Risco | Mitigação |
|---|---|
| Free tier AWS estourar | AWS Budget alert de US$ 5 já no dia 1 + preferência por destruir a infra entre sessões |
| Rate limit de Gemini/Groq | Mock fallback como default; troca de provider via env var |
| EKS cair durante a demo | Ensaio em 26/05; comando `kubectl get all -A` em backup |
| Datadog trial expirar antes da banca | Iniciar o trial somente em 18-19/05 (cobre até 02-03/06, com folga) |
| ClamAV consumir RAM excessiva no pod | Limit de 512 MB; alternativa: skip + log em dev |
| Demo do vídeo travar (rede, latência LLM) | Gravar com mock provider; explicar swap durante a apresentação |
| Limite de conta GitHub | Repos privados → 6 livres; CI minutes 2000/mo cobrem com folga |

## Itens em aberto / Stretch goals

- mTLS via Linkerd entre serviços (D15 stretch).
- Helm chart unificado para os 4 microsserviços.
- Diagrama renderizado no relatório com bounding boxes (Gemini retorna coordenadas → desenhar overlay).
- Webhook para callback assíncrono (cliente cadastra URL para receber `analysis.completed`).
- Análise multi-idioma (relatório em PT-BR e EN-US).

## Referências

- PDF do Hackathon: `~/SegundoCerebro/50-References/hackathon-soat-iadt.pdf` (a copiar)
- Boilerplates: `prj-fiap-billing`, `prj-fiap-execution`, `prj-fiap-lambda-auth-cpf`, `prj-fiap-infra-kubernetes`
- LLM Strategy Pattern: `prj-arq-contexta`
- Projeto: `prj-fiap-hackathon`
