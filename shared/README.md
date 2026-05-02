# @fiap-hackathon/shared

Código TypeScript compartilhado entre os microsserviços do Hackathon FIAP.

> **Distribuição**: NÃO é publicado como pacote npm. Os arquivos em `src/` são **copiados** para o diretório `src/shared/` de cada serviço no momento do scaffold. Isso mantém cada microsserviço autocontido e evita dependência de registry durante o sprint.

## O que tem aqui

| Caminho | Função |
|---|---|
| `src/types/analysis-status.ts` | Enum de status + lista de mimetypes permitidos + limite de tamanho |
| `src/schemas/analysis.schema.ts` | DTOs do `POST /analyses` e da consulta de status |
| `src/schemas/components.schema.ts` | `ComponentsExtraction` (saída da etapa 1 — Gemini Vision) |
| `src/schemas/risks.schema.ts` | `RisksAndRecommendations` (saída da etapa 2 — Groq) |
| `src/schemas/events.schema.ts` | Envelopes de eventos SQS (`analysis.requested`, `.completed`, `.failed`) |
| `src/llm/llm-provider.interface.ts` | Interface `LlmProvider` + erros customizados |
| `src/llm/gemini.provider.ts` | Provider Gemini 2.5 Flash (visão + texto) |
| `src/llm/groq.provider.ts` | Provider Groq Llama 3.3 70B (apenas texto) |
| `src/llm/mock.provider.ts` | Mock determinístico — usado em testes, default em dev e como fallback |
| `src/llm/llm-pipeline.ts` | Orquestra o pipeline de duas etapas com retry + fallback |
| `src/llm/llm-factory.ts` | Constrói o pipeline a partir das variáveis de ambiente |
| `src/llm/prompts/*.prompt.ts` | System + user prompts (já com defesa contra prompt injection) |
| `src/logger/pino-config.ts` | Factory do logger Pino com redação automática de PII |
| `src/errors/domain-errors.ts` | Hierarquia de erros de domínio (com HTTP status) |
| `src/config/env.ts` | Schema + loader das variáveis de ambiente compartilhadas |

## Como cada serviço consome

No momento de criar cada microsserviço (`upload-orchestration`, `processing`, `report`, `bff`):

```bash
# A partir da raiz do workspace
cp -R fiap-hackathon-infra/shared/src \
      fiap-hackathon-<servico>/src/shared
```

Em seguida, no `package.json` do serviço, instalar as dependências de runtime:

```bash
cd fiap-hackathon-<servico>
pnpm add zod pino pino-pretty @google/genai groq-sdk
```

## Por que copy-paste e não pacote npm

- São 6 repositórios separados — publicar em um registry adiciona cerimônia desnecessária.
- O sprint tem 48 horas úteis.
- Cada serviço continua compilando independentemente em CI sem precisar de autenticação externa.
- A decisão está documentada na ADR-002.
