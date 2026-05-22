# Hackathon FIAP IADT+SOAT — Plano de Apresentação

Documento de referência para a gravação do vídeo de até 15 minutos exigido pelo PDF do hackathon.
Cobre o checklist de aderência aos requisitos, o roteiro detalhado do vídeo (com tempos sugeridos),
o que mostrar em cada tela e os comandos prontos para copiar/colar durante a gravação.

---

## 1. Checklist de aderência ao PDF (status atual)

### 1.1 Requisitos funcionais

| Funcionalidade obrigatória | Onde está | Status |
|---|---|---|
| Upload de diagrama (imagem ou PDF) | `POST /api/analyses` no BFF + upload-orchestration | OK |
| Criação de processo de análise | Persistido em MySQL `fiap_hackathon_upload.analyses` + SQS analysis-requested | OK |
| Consulta de status (RECEBIDO, EM PROCESSAMENTO, ANALISADO, ERRO) | `GET /api/analyses/{id}/status` | OK |
| Geração de relatório com componentes, riscos e recomendações | `GET /api/reports/{id}` | OK |

### 1.2 Requisitos técnicos — SOAT

| Requisito | Implementação | Status |
|---|---|---|
| Arquitetura baseada em microsserviços | 5 services + 1 Lambda (BFF, upload, processing, report, lambda-auth) | OK |
| Comunicação REST | API Gateway → BFF → upload/report | OK |
| Ao menos um fluxo assíncrono | 3 filas SQS + 2 DLQ (Event-Carried State Transfer) | OK |
| Clean Architecture (ou Hexagonal) | Estrutura `domain/application/infrastructure/interface` em todos os NestJS | OK |
| Responsabilidade clara por serviço | Bounded contexts documentados na ADR-002 D4 | OK |
| Banco de dados próprio | Polyglot: MySQL (upload/report/auth) + MongoDB (processing) | OK |
| Testes automatizados | 108 testes verdes, gate 80% no jest.config de cada service | OK |

### 1.3 Requisitos técnicos — IADT

| Requisito | Implementação | Status |
|---|---|---|
| Pelo menos uma das 4 abordagens | Detecção em imagens (Gemini Vision) + LLM com guardrails (Groq Llama) — duas abordagens | OK |
| Pipeline claro de IA | 2 etapas: vision → text, documentado em ADR-002 D8/D9 e no diagrama 03-fluxo-falha | OK |
| Justificativa da abordagem | Seção 3 da entrega + ADR-002 D8 | OK |
| Demonstração prática | Caminho `POST /api/analyses` → `GET /api/reports/{id}` no Postman | OK |
| Discussão de limitações | Seção 3.7 da entrega final + `docs/seguranca.md` seção IA | OK |
| Guardrails (entrada/saída/anti-alucinação) | responseSchema do Gemini + Zod + temperature 0.2 + system prompt restritivo | OK |

### 1.4 Integração IA + Sistema

| Item | Implementação |
|---|---|
| Como a IA é acionada | Worker do processing consome SQS analysis-requested |
| Como o sistema trata falhas da IA | Retry exponencial 3x + fallback MockLlmProvider + `degraded=true` + DLQ |
| Como o resultado é persistido | MongoDB Atlas (`fiap_hackathon_processing.analysis_results`) |
| Como o relatório é gerado | Event-Carried State Transfer — processing publica payload completo, report materializa em MySQL |

### 1.5 Infraestrutura e DevOps

| Requisito | Status |
|---|---|
| Docker | OK — 5 Dockerfiles multi-stage Alpine |
| Docker Compose ou Kubernetes | OK — `docker-compose.e2e.yml` + Helm chart unificado (lint verde no CI) |
| CI/CD com Build | OK — `docker/build-push-action@v5` multi-arch nos 4 NestJS |
| CI/CD com Testes | OK — `npm test` com gate 80% bloqueante |
| CI/CD com Deploy local OU cloud | OK — Deploy local: imagens GHCR + `e2e-smoke` workflow valida no runner |

### 1.6 Qualidade e observabilidade

| Requisito | Status |
|---|---|
| Logs estruturados | OK — Pino JSON com PII redact (password, authorization) |
| Tratamento de erros | OK — erros tipados, envelope padrão, `analysis.failed` com reason enumerada |
| Testes unitários | OK — 108 testes verdes |
| README explicativo | OK — README mestre em `fiap-hackathon-infra/README.md` (14 seções) |

### 1.7 Entregáveis

| Entregável | Local | Status |
|---|---|---|
| Repositório Git com código-fonte | 6 repos no GitHub `DanielRoberto72/fiap-hackathon-*` | OK |
| Dockerfile em cada serviço | OK | OK |
| docker-compose ou manifestos | `fiap-hackathon-infra/e2e/docker-compose.e2e.yml` + Helm chart | OK |
| Pipeline CI/CD | GitHub Actions em cada repo | OK |
| README com descrição do problema | Seção 1 do README mestre | OK |
| README com arquitetura proposta | Seção 2 do README mestre + diagramas Eraser | OK |
| README com fluxo da solução | Seção 3 do README mestre + sequence diagram | OK |
| README com instruções de execução | Seção 4 do README mestre + `postman/DEMO.md` | OK |
| Diagrama de arquitetura | `docs/diagrams/01-arquitetura-containers.png` + 02 e 03 | OK |
| **Seção Segurança obrigatória** | `docs/seguranca.md` + Seção 8 da entrega final | OK |
| Vídeo até 15 min | PENDENTE — gravar conforme roteiro abaixo | PENDENTE |

---

## 2. Roteiro do vídeo (até 15 min)

Tempo-alvo: **10–12 minutos**, deixando folga para narração tranquila.

### Bloco 1 — Abertura e contexto (~1 min)

**Tela:** README mestre do `fiap-hackathon-infra` aberto no GitHub ou VS Code.

**Falar:**

> "Olá. Sou Daniel Roberto Pereira, RM 365742, aluno da POSTECH SOAT. Esta é a entrega final do Hackathon Integrado IADT+SOAT da FIAP. O problema proposto pela empresa fictícia FIAP Secure Systems é construir um back-end capaz de receber diagramas de arquitetura e devolver automaticamente uma análise técnica — componentes detectados, riscos arquiteturais e recomendações. Vou mostrar a arquitetura, rodar o fluxo completo e detalhar como a IA está integrada ao sistema."

### Bloco 2 — Arquitetura (~2 min)

**Tela:** abrir `docs/diagrams/01-arquitetura-containers.png` (full screen) — depois `02-sequencia-happy-path.png`.

**Falar:**

> "A solução é composta por cinco serviços. O BFF NestJS é o ponto de entrada REST público. O upload-orchestration valida o arquivo (MIME, magic bytes, ClamAV) e persiste no S3 via LocalStack. O processing é um worker que consome a fila SQS analysis-requested e roda o pipeline de IA em duas etapas — Gemini 2.5 Flash para visão computacional e Groq Llama 3.3 70B para classificação de riscos. O resultado é persistido no MongoDB e publicado como analysis-completed. O report consome esse evento e materializa uma cópia local em MySQL para responder consultas. A autenticação é serverless: três Lambdas (login, register, authorizer) atrás de um API Gateway HTTP. Cada serviço tem banco próprio — polyglot persistence. Comunicação entre processing e report é Event-Carried State Transfer no SQS."

> "Esta é a sequência do caminho feliz. O cliente recebe 202 em segundos com um analysisId. O pipeline de IA roda em background. O report fica autossuficiente após receber o evento."

### Bloco 3 — Stack rodando (~1 min)

**Tela:** terminal.

**Comandos para copiar:**

```bash
cd ~/projetos/fiap-hackathon/fiap-hackathon-infra/e2e
docker compose -f docker-compose.e2e.yml -f docker-compose.e2e.ghcr.yml -f docker-compose.real-llm.yml ps
```

**Falar:**

> "Aqui está a stack rodando localmente. Sete containers — BFF, upload, processing, report, MySQL, MongoDB e LocalStack — todos saudáveis. As quatro imagens NestJS estão sendo puxadas do GitHub Container Registry, multi-arch amd64 e arm64. O LocalStack emula S3, SQS, Lambda, API Gateway e Secrets Manager. Vamos confirmar que as três Lambdas de auth foram provisionadas pelo bootstrap automático."

```bash
docker exec fiap-hackathon-e2e-localstack-1 awslocal lambda list-functions --query 'Functions[].FunctionName' --output text
```

**Esperado:** `fiap-hackathon-auth-login fiap-hackathon-auth-register fiap-hackathon-authorizer`

### Bloco 4 — Autenticação serverless via LocalStack (~2 min)

**Tela:** Postman, pasta **"1. Autenticação"**.

**Falar:**

> "A autenticação é serverless de verdade — Lambda real no LocalStack, exposta via API Gateway REST com custom id determinístico `fiapauth`. Vamos criar um usuário."

1. Rodar `POST /auth/register` → mostrar resposta 201 com `id`, `email`, `scopes`.
2. Rodar `POST /auth/login` → mostrar resposta 200 com `accessToken`, `tokenType=Bearer`, `expiresIn=3600`.
3. Copiar o JWT e colar em [jwt.io](https://jwt.io) → mostrar header (HS256), payload (sub, email, scopes, exp) e que a assinatura confere.

**Falar (sobre o JWT):**

> "O token é HS256 com expiração de 1 hora, scopes em claims. Ele foi gerado pela Lambda `fiap-hackathon-auth-login` exatamente como rodaria em produção AWS — o BFF não sabe a diferença entre LocalStack e AWS real, é o mesmo `AUTH_BASE_URL`."

### Bloco 5 — Pipeline IA com Gemini + Groq reais (~3 min)

**Tela:** Postman, pasta **"2. Pipeline de análise IA"** + um terminal lateral com `docker logs -f processing`.

```bash
# em outro terminal, abrir lateral:
docker logs -f fiap-hackathon-e2e-processing-1 | grep -E "(analysisId|provider|degraded|completed)"
```

**Falar:**

> "Agora o coração do sistema. Vou subir um diagrama de arquitetura real — esse mesmo diagrama dos containers que mostrei na abertura. O BFF recebe, o upload valida e empurra para a fila SQS analysis-requested, o processing consome e dispara o pipeline IA."

1. No `POST /api/analyses`, anexar `fiap-hackathon-infra/docs/diagrams/01-arquitetura-containers.png` no campo `file`.
2. Mostrar response 202 com `analysisId`.
3. Pausar e narrar olhando o terminal lateral:

> "Olhem o log do processing — `analysis.processing.started` publicado, agora ele chamou o Gemini Vision com o PNG. Cada chamada tem retry 3x com exponential backoff. Se Gemini falhar, fallback automático para um MockLlmProvider e a resposta vem com flag `degraded=true`. Não vai falhar essa demo porque já fiz warmup."

4. Quando aparecer `analysis.completed published`, rodar `GET /api/reports/{id}` no Postman.
5. Mostrar a resposta com:
   - `providerChain: { step1: "gemini", step2: "groq" }`  ← **importante mostrar este campo**
   - `degraded: false`
   - `componentsCount` real do diagrama
   - `risksCount` + `recommendationsCount`
   - Expandir um risco específico (ex.: "missing observability stack") + uma recomendação

**Falar:**

> "Aqui está o relatório. `providerChain` mostra que rodou no Gemini de verdade na etapa 1 e no Groq na etapa 2 — `degraded: false`, sem fallback. O modelo detectou os cinco componentes do diagrama — Web App, API Gateway, microsserviço, banco e Event Bus —, identificou três riscos arquiteturais e devolveu três recomendações com prioridade e referências. O JSON foi validado por Zod no processing antes de ser persistido — o guardrail que garante que o LLM não retorna lixo."

### Bloco 6 — Pipeline CI/CD e Deploy local via GHCR (~1 min)

**Tela:** GitHub Actions de um dos NestJS (`fiap-hackathon-bff/actions`) + GitHub do infra mostrando workflow `e2e-smoke`.

**Falar:**

> "Para o requisito de CI/CD com Build, Testes e Deploy, cada push em `main` dispara o workflow que roda `npm test` com cobertura 80% obrigatória, builda imagem Docker multi-arch e publica no GitHub Container Registry. O repositório infra tem um workflow chamado `e2e-smoke` que puxa as imagens GHCR, sobe a stack inteira no runner do GitHub e roda os specs Jest — funciona como regression gate diário. Estratégia documentada na ADR-002 D17."

```bash
# em terminal:
gh run list --repo DanielRoberto72/fiap-hackathon-bff --limit 3
gh run list --repo DanielRoberto72/fiap-hackathon-infra --workflow e2e-smoke --limit 3
```

### Bloco 7 — Segurança (~1 min)

**Tela:** `docs/seguranca.md` aberto.

**Falar:**

> "Sobre a seção obrigatória de Segurança. Quatro frentes principais. Validação de entrada: MIME e magic bytes via lib file-type, scan ClamAV antes do S3, Zod em todos os bodies JSON, Idempotency-Key obrigatória. Uso controlado da IA: responseSchema tipado no Gemini, validação Zod nas saídas, temperature 0.2, system prompt restritivo, defesa contra prompt injection. Tratamento seguro de falhas: retry exponencial, fallback automático para Mock com flag degraded, DLQ + alerta Datadog. Comunicação entre serviços: VPC Link + NLB interno em produção, IRSA com privilégio mínimo, Secrets Manager. Documento com 10 seções em docs/seguranca.md."

### Bloco 8 — Qualidade (~30 s)

**Tela:** terminal rodando `npm test` em um dos services (ex.: `fiap-hackathon-bff`).

**Falar:**

> "Cobertura de testes: 108 testes verdes nos cinco services, com gate de 80 por cento configurado no jest.config de cada um — o CI falha se cair abaixo."

```bash
cd ~/projetos/fiap-hackathon/fiap-hackathon-bff && npm test
```

### Bloco 9 — Fechamento (~30 s)

**Tela:** README mestre + tabela dos 6 repositórios.

**Falar:**

> "Para encerrar, qualquer pessoa consegue rodar o sistema completo clonando apenas o repositório fiap-hackathon-infra e executando `make full-ghcr`. Em menos de dois minutos sobe MySQL, MongoDB, LocalStack com as três Lambdas provisionadas e os quatro NestJS puxados do GHCR. A documentação completa, ADR com dezoito decisões arquiteturais, três diagramas Eraser, collection Postman e roteiro de demo estão todos no repo infra. Obrigado."

---

## 3. Comandos prontos para copiar/colar durante a gravação

Coloque estes em um arquivo `.txt` aberto em uma aba do editor para colar rápido.

```bash
# Subir tudo (se ainda não estiver up)
cd ~/projetos/fiap-hackathon/fiap-hackathon-infra/e2e
set -a; source ~/projetos/fiap-hackathon/.secrets/keys.env; set +a
docker compose -f docker-compose.e2e.yml -f docker-compose.e2e.ghcr.yml -f docker-compose.real-llm.yml up -d
sleep 90
docker compose -f docker-compose.e2e.yml -f docker-compose.e2e.ghcr.yml -f docker-compose.real-llm.yml ps

# Listar Lambdas
docker exec fiap-hackathon-e2e-localstack-1 awslocal lambda list-functions --query 'Functions[].FunctionName' --output text

# Logs do processing em tempo real (para mostrar Gemini + Groq sendo chamados)
docker logs -f fiap-hackathon-e2e-processing-1 | grep --line-buffered -E "(analysisId|provider|degraded|completed|started)"

# CI status
gh run list --repo DanielRoberto72/fiap-hackathon-bff --limit 3
gh run list --repo DanielRoberto72/fiap-hackathon-infra --workflow e2e-smoke --limit 3

# Tear down (após a gravação)
cd ~/projetos/fiap-hackathon/fiap-hackathon-infra/e2e
docker compose -f docker-compose.e2e.yml -f docker-compose.e2e.ghcr.yml -f docker-compose.real-llm.yml down
```

---

## 4. Checklist antes de apertar o REC

Marque cada item antes de gravar:

- [ ] Stack completa rodando (`docker compose ps` mostra 7 healthy)
- [ ] LocalStack com as 3 Lambdas Active (`lambda list-functions`)
- [ ] Variáveis `GEMINI_API_KEY` e `GROQ_API_KEY` exportadas no shell (`echo $GEMINI_API_KEY | head -c 10`)
- [ ] Processing rodando com providers `gemini` + `groq` (`docker logs processing | grep "LLM pipeline ready"`)
- [ ] **Warmup**: faça 1 upload de teste antes da gravação para garantir que Gemini não vai dar cold start lento
- [ ] Postman aberto com a collection importada e a variável `auth_base`/`bff_base` apontando para localhost
- [ ] PNG do diagrama (`docs/diagrams/01-arquitetura-containers.png`) acessível no Finder para arrastar
- [ ] Aba do navegador em [jwt.io](https://jwt.io) pronta
- [ ] Aba do navegador no GitHub Actions de um dos repos
- [ ] README mestre aberto no VS Code
- [ ] `docs/seguranca.md` aberto em outra aba do editor
- [ ] Microfone testado, OBS/QuickTime gravando tela + áudio
- [ ] Resolução do terminal grande (fonte 16pt+) para leitura no vídeo

---

## 5. Plano B — se algo falhar durante a gravação

| Falha | Plano B |
|---|---|
| Gemini retorna 429 (rate limit) | Esperar 60s. Se persistir, mostrar o fallback `degraded: true` como feature (não bug — guardrail funcionando) |
| Container processing trava | `docker restart fiap-hackathon-e2e-processing-1` + aguardar 15s |
| LocalStack lambda em estado Failed | Refazer bootstrap: `docker exec localstack-1 bash /etc/localstack/init/ready.d/02-bootstrap-auth.sh` |
| Idempotency-Key rejeitada | Gerar novo via `{{$guid}}` no Postman (já está configurado) |
| OBS lota disco | Pré-checar 5 GB livres em `~/Movies` |

---

## 6. Pós-gravação

- [ ] Upload no YouTube (não-listado) ou Google Drive (link compartilhável)
- [ ] Atualizar `docs/entrega-final-hackathon.pdf` colocando o link real do vídeo (substituir `(a preencher após a gravação...)`)
- [ ] Regenerar PDF: `python3 docs/gen-entrega-final.py`
- [ ] Adicionar o link também no README mestre (seção 14)
- [ ] Commit final em `fiap-hackathon-infra` com mensagem: `docs: link do vídeo de demonstração`
- [ ] Verificar que todos os 6 repos têm o usuário `soat-architecture` como colaborador
- [ ] Submeter o PDF na plataforma da FIAP
