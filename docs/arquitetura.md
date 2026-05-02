# Diagrama de arquitetura

## Visão de alto nível (C4 — Container)

```mermaid
graph TB
  Client[Cliente / curl / Postman]
  subgraph "AWS API Gateway HTTP API"
    APIGW[HTTP API + JWT Authorizer]
  end
  subgraph "AWS Lambda"
    LAuth[lambda-auth login + register]
    LAuthz[lambda-auth authorizer]
  end
  subgraph "EKS"
    BFF[BFF NestJS :3000]
    UO[upload-orchestration NestJS :3001]
    PR[processing NestJS :3002 + worker SQS]
    RP[report NestJS :3003 + worker SQS]
    CV[ClamAV sidecar TCP 3310]
  end
  subgraph "AWS Storage"
    S3[(S3 bucket uploads/raw)]
    RDS[(RDS MySQL — 3 schemas)]
    Mongo[(MongoDB Atlas — analysis_results)]
    Sec[Secrets Manager — JWT, RDS, Gemini, Groq, Mongo]
  end
  subgraph "AWS SQS"
    QReq[analysis-requested + DLQ]
    QComp[analysis-completed + DLQ]
    QFail[analysis-failed]
  end
  subgraph "Provedores LLM"
    Gemini[Google Gemini 2.5 Flash]
    Groq[Groq Llama 3.3 70B]
  end

  Client -->|HTTPS| APIGW
  APIGW -->|/auth/*| LAuth
  APIGW -->|qualquer rota privada| LAuthz
  APIGW -->|/api/* via VPC Link + NLB| BFF
  BFF -->|REST interno| UO
  BFF -->|REST interno| RP
  UO -->|scan TCP| CV
  UO -->|PUT| S3
  UO -->|INSERT| RDS
  UO -->|publish| QReq
  QReq -->|consume| PR
  PR -->|GET| S3
  PR -->|vision| Gemini
  PR -->|text| Groq
  PR -->|INSERT| Mongo
  PR -->|publish payload completo| QComp
  PR -->|publish em falha| QFail
  QComp -->|consume| RP
  QFail -->|consume| RP
  RP -->|INSERT| RDS
  Client -->|GET /reports/:id| APIGW
  LAuth -->|GetSecretValue| Sec
  PR -->|GetSecretValue| Sec
  RP -->|GetSecretValue| Sec
  UO -->|GetSecretValue| Sec
```

## Sequência do happy path

```mermaid
sequenceDiagram
  participant C as Cliente
  participant GW as API Gateway
  participant Az as authorizer (Lambda)
  participant BFF as BFF NestJS
  participant UO as upload-orchestration
  participant CV as ClamAV
  participant S3 as S3
  participant RDS as MySQL
  participant Q1 as SQS analysis-requested
  participant PR as processing
  participant LLM1 as Gemini Vision
  participant LLM2 as Groq Llama
  participant Mongo as MongoDB
  participant Q2 as SQS analysis-completed
  participant RP as report

  C->>GW: POST /api/analyses (file, JWT)
  GW->>Az: validate JWT
  Az-->>GW: isAuthorized=true (sub, scopes)
  GW->>BFF: POST /api/analyses (file)
  BFF->>UO: POST /api/analyses (file)
  UO->>UO: valida MIME + magic bytes + size
  UO->>CV: scan(buffer)
  CV-->>UO: clean
  UO->>S3: PutObject raw/{uuid}
  UO->>RDS: INSERT analyses status=RECEIVED
  UO->>Q1: SendMessage analysis.requested
  UO-->>BFF: 202 Accepted {analysisId}
  BFF-->>C: 202 Accepted {analysisId}

  rect rgb(240,248,255)
    note over Q1,RP: assíncrono
    PR->>Q1: ReceiveMessage
    PR->>S3: GetObject
    PR->>LLM1: ComponentsExtraction (vision)
    LLM1-->>PR: JSON validado por Zod
    PR->>LLM2: RisksAndRecommendations (text)
    LLM2-->>PR: JSON validado por Zod
    PR->>Mongo: INSERT analysis_results
    PR->>Q2: SendMessage analysis.completed (payload completo)
    PR->>Q1: DeleteMessage
    RP->>Q2: ReceiveMessage
    RP->>RDS: INSERT reports
    RP->>Q2: DeleteMessage
  end

  C->>GW: GET /api/reports/{analysisId}
  GW->>BFF: GET /api/reports/{id}
  BFF->>RP: GET /api/reports/{id}
  RP-->>BFF: 200 OK relatório completo
  BFF-->>GW: 200 OK
  GW-->>C: 200 OK
```

## Fluxo de falha permanente

```mermaid
flowchart TD
  Start[analysis.requested]
  P[processing.use-case]
  Retry{retry < 3?}
  Mock[Fallback Mock provider]
  Fail[publish analysis.failed]
  DLQ[Mensagem vai pra DLQ após 3 tentativas]

  Start --> P
  P -->|Gemini falha| Retry
  Retry -->|sim| P
  Retry -->|não| Mock
  Mock -->|sucesso| Continue[publish analysis.completed degraded=true]
  Mock -->|falha| Fail
  P -->|S3 GET falha| Fail
  P -->|Schema Zod falha| Fail
  Fail --> DLQ
```

## Bounded contexts e ownership de dados

| Bounded context | Owner | DB | Lê de | Escreve em |
|---|---|---|---|---|
| Upload | `upload-orchestration` | MySQL `fiap_hackathon_upload` | — | S3, MySQL, SQS analysis-requested |
| Processing | `processing` | MongoDB `fiap_hackathon_processing` | S3, SQS analysis-requested | MongoDB, SQS analysis-completed/failed |
| Reporting | `report` | MySQL `fiap_hackathon_report` | SQS analysis-completed/failed | MySQL |
| Auth | `lambda-auth` | MySQL `fiap_hackathon_auth` | — | MySQL |
| Edge | `bff` | sem persistência | — | — |

Princípio: **cada serviço dono de seu DB**. Nenhum serviço lê o banco do outro. A integração entre `processing` e `report` é via Event-Carried State Transfer no SQS (payload completo no `analysis.completed`).
