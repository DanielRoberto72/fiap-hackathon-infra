#!/usr/bin/env python3
"""Gera o PDF de entrega final do Hackathon FIAP IADT+SOAT.

Padrão visual inspirado no documento de entrega do Tech Challenge Fase 4.
"""
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

OUT = Path(__file__).with_name("entrega-final-hackathon.pdf")
HERE = Path(__file__).parent

styles = getSampleStyleSheet()
H1 = ParagraphStyle(
    "H1", parent=styles["Heading1"], fontSize=18, spaceAfter=12, textColor=colors.HexColor("#1a1a1a")
)
H2 = ParagraphStyle(
    "H2", parent=styles["Heading2"], fontSize=14, spaceBefore=14, spaceAfter=8, textColor=colors.HexColor("#1a1a1a")
)
H3 = ParagraphStyle(
    "H3", parent=styles["Heading3"], fontSize=12, spaceBefore=10, spaceAfter=6, textColor=colors.HexColor("#333")
)
BODY = ParagraphStyle(
    "Body", parent=styles["BodyText"], fontSize=10, leading=14, spaceAfter=6, alignment=TA_LEFT
)
BULLET = ParagraphStyle(
    "Bullet", parent=BODY, leftIndent=14, bulletIndent=4, spaceAfter=2
)
CODE = ParagraphStyle(
    "Code", parent=BODY, fontName="Courier", fontSize=9, leading=12, backColor=colors.HexColor("#f4f4f4"),
    borderColor=colors.HexColor("#ccc"), borderWidth=0.5, borderPadding=6, spaceAfter=8
)
# Estilo compacto para conteúdo dentro de células de tabela (com word-wrap).
CELL = ParagraphStyle(
    "Cell", parent=styles["BodyText"], fontSize=9, leading=11, spaceAfter=0, alignment=TA_LEFT
)
CELL_SMALL = ParagraphStyle(
    "CellSmall", parent=styles["BodyText"], fontSize=8, leading=10, spaceAfter=0, alignment=TA_LEFT
)


def cell(text, small=False):
    """Embrulha texto de célula em Paragraph para garantir word-wrap."""
    return Paragraph(text, CELL_SMALL if small else CELL)


def h1(t): return Paragraph(t, H1)
def h2(t): return Paragraph(t, H2)
def h3(t): return Paragraph(t, H3)
def p(t): return Paragraph(t, BODY)
def bullets(items):
    return [Paragraph(f"• {it}", BULLET) for it in items]
def code(t): return Paragraph(t.replace("\n", "<br/>"), CODE)


def table(rows, col_widths=None, header_bg="#222", header_fg="#fff"):
    # Embrulha strings em Paragraph (exceto header) para garantir word-wrap.
    wrapped = [rows[0]]
    for row in rows[1:]:
        wrapped.append([cell(c) if isinstance(c, str) else c for c in row])
    t = Table(wrapped, colWidths=col_widths, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(header_bg)),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor(header_fg)),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 10),
                ("FONTSIZE", (0, 1), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#999")),
                ("INNERGRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#bbb")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
            ]
        )
    )
    return t


def build():
    story = []

    # === CABEÇALHO ===
    story.append(h1("Hackathon Integrado IADT + SOAT — Entrega Final"))
    story.append(h2("FIAP Secure Systems — Análise de Diagramas de Arquitetura com IA"))

    story.append(
        table(
            [
                ["Campo", "Valor"],
                ["Aluno", "Daniel Roberto Pereira"],
                ["RM", "365742"],
                ["Discord", "danielroberto5075"],
                ["Curso", "POSTECH SOAT (Software Architecture)"],
                ["Data de entrega", "Maio/2026"],
            ],
            col_widths=[5 * cm, 11 * cm],
        )
    )

    # === REPOSITÓRIOS ===
    story.append(h2("Repositórios GitHub"))
    story.append(
        p(
            "Total: <b>6 repositórios</b> no GitHub (organização <code>DanielRoberto72</code>). "
            "O usuário <code>soat-architecture</code> foi adicionado como colaborador em todos eles. "
            "O repositório <code>fiap-hackathon-lambda-auth</code> é público para permitir que o bootstrap do LocalStack "
            "baixe o asset do GitHub Release."
        )
    )

    repos = [
        ["#", "Repositório", "Descrição", "Link"],
        [
            "1",
            cell("fiap-hackathon-infra"),
            cell("Terraform + Helm + LocalStack init + docker-compose E2E + docs + diagramas"),
            cell("github.com/DanielRoberto72/fiap-hackathon-infra", small=True),
        ],
        [
            "2",
            cell("fiap-hackathon-bff"),
            cell("BFF NestJS agregador (porta 3000) — agrega upload + report e expõe REST público"),
            cell("github.com/DanielRoberto72/fiap-hackathon-bff", small=True),
        ],
        [
            "3",
            cell("fiap-hackathon-upload-orchestration"),
            cell("Upload + validação MIME/magic-bytes + ClamAV + S3 + SQS analysis-requested (porta 3001)"),
            cell("github.com/DanielRoberto72/fiap-hackathon-upload-orchestration", small=True),
        ],
        [
            "4",
            cell("fiap-hackathon-processing"),
            cell("Worker SQS — pipeline IA Gemini Vision + Groq Llama 3.3 70B + Mongo (porta 3002)"),
            cell("github.com/DanielRoberto72/fiap-hackathon-processing", small=True),
        ],
        [
            "5",
            cell("fiap-hackathon-report"),
            cell("Consumer SQS analysis-completed/failed + REST GET /api/reports/{id} (porta 3003)"),
            cell("github.com/DanielRoberto72/fiap-hackathon-report", small=True),
        ],
        [
            "6",
            cell("fiap-hackathon-lambda-auth"),
            cell("Lambda authorizer + login + register (HS256 JWT). Zip empacotado em GitHub Release"),
            cell("github.com/DanielRoberto72/fiap-hackathon-lambda-auth", small=True),
        ],
    ]
    story.append(table(repos, col_widths=[0.7 * cm, 3.8 * cm, 6.2 * cm, 5.9 * cm]))

    # === VÍDEO ===
    story.append(h2("Vídeo de Demonstração"))
    story.append(
        p(
            '<b>Link do Vídeo:</b> <a href="https://youtu.be/J43rU2ctHPs" color="#1a73e8">https://youtu.be/J43rU2ctHPs</a>'
        )
    )

    # === ARQUITETURA — DIAGRAMA ===
    story.append(PageBreak())
    story.append(h1("Arquitetura"))
    diag_path = HERE / "diagrams" / "01-arquitetura-containers.png"
    if diag_path.exists():
        story.append(Image(str(diag_path), width=17 * cm, height=10 * cm, kind="proportional"))
    else:
        story.append(p("<i>(diagrama de containers em <code>docs/diagrams/01-arquitetura-containers.png</code>)</i>"))
    story.append(Spacer(1, 8))
    story.append(
        p(
            "Plataforma de microsserviços NestJS expostos por um API Gateway HTTP API com JWT Lambda authorizer. "
            "Cliente envia diagramas para o BFF; o upload-orchestration valida e persiste no S3; o processing "
            "consome a fila SQS, roda o pipeline IA em duas etapas (Gemini Vision + Groq Llama 3.3) e publica "
            "analysis-completed; o report materializa cópia local em MySQL e expõe consulta REST. Em ambiente local "
            "os serviços AWS são emulados via LocalStack (S3, SQS, SNS, Secrets Manager, Lambda, API Gateway, IAM)."
        )
    )

    # === 1. ARQUITETURA E SAGA ===
    story.append(h2("1. Arquitetura de Microsserviços e Comunicação"))

    story.append(h3("1.1 Estratégia escolhida"))
    story.append(
        p(
            "Adotamos <b>Event-Carried State Transfer (ECST) via SQS</b> como base da comunicação assíncrona. "
            "Cada microsserviço é dono do seu banco e publica eventos com payload completo no momento em que "
            "termina seu trabalho local. Os consumidores reagem aos eventos de forma autônoma, sem chamar de volta "
            "o produtor. A comunicação síncrona (REST) é restrita ao caminho cliente → API Gateway → BFF → upload."
        )
    )

    story.append(h3("1.2 Justificativa da escolha"))
    story.extend(
        bullets(
            [
                "<b>Desacoplamento total:</b> processing não conhece report (publica analysis-completed e segue).",
                "<b>Sem orquestrador central:</b> não há single point of failure no fluxo principal.",
                "<b>Escalabilidade independente:</b> processing pode escalar workers conforme tamanho da fila; "
                "report continua leve.",
                "<b>Resiliência embutida:</b> visibility timeout + 3 retries automáticos + Dead Letter Queue + "
                "alerta Datadog quando esgota.",
                "<b>Aderência ao requisito do PDF:</b> microsserviços com pelo menos um fluxo assíncrono.",
            ]
        )
    )

    story.append(h3("1.3 Implementação técnica"))
    story.append(
        table(
            [
                ["Componente", "Função"],
                [cell("AWS SQS analysis-requested"), cell("Upload publica → Processing consome (long-poll, batch size 5)")],
                [cell("AWS SQS analysis-completed"), cell("Processing publica payload completo → Report consome e materializa")],
                [cell("AWS SQS analysis-failed"), cell("Processing publica em falha permanente → Report registra como FAILED")],
                [cell("Dead Letter Queues (2x)"), cell("analysis-requested-dlq + analysis-completed-dlq após 3 tentativas")],
                [cell("Idempotency-Key"), cell("Upload exige header — POSTs duplicados devolvem o mesmo analysisId")],
            ],
            col_widths=[5 * cm, 11.6 * cm],
        )
    )

    story.append(h3("1.4 Fluxo de compensação e degradação"))
    story.append(
        p(
            "Em vez de Saga completa (que faz pouco sentido no domínio análise-de-diagrama), aplicamos "
            "<b>graceful degradation</b>: se Gemini Vision falhar 3x, o pipeline troca para MockLlmProvider "
            "(saída determinística) e publica <code>analysis.completed</code> com <code>degraded=true</code>, "
            "sinalizando ao consumidor que o relatório precisa de revisão humana. Falhas não-retentáveis "
            "(Zod schema inválido, S3 GET 404) vão direto para <code>analysis.failed</code> com <code>reason</code> enumerado."
        )
    )

    # === 2. DIVISÃO DOS MICROSSERVIÇOS ===
    story.append(PageBreak())
    story.append(h2("2. Divisão dos Microsserviços (Bounded Contexts)"))

    story.append(h3("2.1 Critérios de decomposição"))
    story.append(
        p(
            "Aplicamos o princípio de <b>Bounded Contexts do DDD</b> + <b>polyglot persistence</b>. "
            "Cada serviço encapsula um domínio coeso, é dono do seu banco e expõe apenas o necessário. "
            "Nenhum serviço lê o banco do outro — a integração é por evento."
        )
    )

    story.append(h3("2.2 BFF (porta 3000)"))
    story.append(p("<b>Domínio:</b> Agregação síncrona REST + roteamento."))
    story.extend(
        bullets(
            [
                "Responsabilidades: agregar upload + report sob uma única API pública.",
                "Sem persistência — atua como pass-through autenticado.",
                "Stack: NestJS 11 + TypeScript + Pino + Axios.",
            ]
        )
    )

    story.append(h3("2.3 Upload-orchestration (porta 3001)"))
    story.append(p("<b>Domínio:</b> Receber diagrama, validar, persistir no S3, disparar pipeline."))
    story.extend(
        bullets(
            [
                "Validação: MIME + magic bytes (file-type) + tamanho máximo + ClamAV sidecar.",
                "Idempotência via header <code>Idempotency-Key</code>.",
                "DB: MySQL <code>fiap_hackathon_upload</code> (Prisma).",
                "Saída: PUT no S3 raw/{uuid} + SendMessage SQS analysis-requested.",
            ]
        )
    )

    story.append(h3("2.4 Processing (porta 3002)"))
    story.append(p("<b>Domínio:</b> Pipeline IA — extração de componentes + classificação de riscos."))
    story.extend(
        bullets(
            [
                "Worker SQS long-poll batch 5 + autoscaling K8s HPA por queue depth.",
                "Pipeline 2 etapas: Gemini 2.5 Flash (vision) → Groq Llama 3.3 70B (text).",
                "Guardrails: Zod nas saídas + responseSchema do Gemini + temperature 0.2 + prompt injection defense.",
                "Fallback automático para MockLlmProvider após 3 retries com exponential backoff.",
                "DB: MongoDB Atlas <code>fiap_hackathon_processing</code> (Mongoose) — documento por análise.",
            ]
        )
    )

    story.append(h3("2.5 Report (porta 3003)"))
    story.append(p("<b>Domínio:</b> Materializar relatório em MySQL e expor consulta REST."))
    story.extend(
        bullets(
            [
                "Consumer SQS analysis-completed/failed.",
                "Materialização local (cópia ECST) — fica autossuficiente para responder GET /api/reports/{id}.",
                "DB: MySQL <code>fiap_hackathon_report</code> (Prisma).",
            ]
        )
    )

    story.append(h3("2.6 Lambda-auth (serverless)"))
    story.append(p("<b>Domínio:</b> Autenticação JWT HS256 + Lambda authorizer customizado."))
    story.extend(
        bullets(
            [
                "3 handlers: <code>login</code>, <code>register</code>, <code>authorizer</code>.",
                "DB: MySQL <code>fiap_hackathon_auth</code> (Prisma) — tabela <code>users</code>.",
                "JWT HS256 + bcrypt cost 10 + scopes (upload:write, report:read).",
                "Em produção AWS roda como Lambda nativa atrás de API Gateway HTTP API.",
                "Em ambiente local roda como Lambda real no LocalStack + API Gateway REST com custom id <code>fiapauth</code>.",
            ]
        )
    )

    story.append(h3("2.7 Princípio inviolável"))
    story.append(
        p(
            "Cada serviço é dono do seu DB. <b>Nenhum serviço lê o banco do outro.</b> A integração entre processing "
            "e report é feita exclusivamente via Event-Carried State Transfer no SQS (payload completo no "
            "<code>analysis.completed</code>)."
        )
    )

    # === 3. IA ===
    story.append(PageBreak())
    story.append(h2("3. Inteligência Artificial (IADT)"))

    story.append(h3("3.1 Abordagem escolhida"))
    story.append(
        p(
            "Combinamos <b>duas das abordagens do PDF</b>: detecção de componentes arquiteturais em imagens "
            "(Gemini Vision) + uso de LLM para geração de relatório técnico estruturado com guardrails "
            "(Groq Llama 3.3 70B). O pipeline é dividido em duas etapas independentes para isolar falhas e "
            "permitir uso de modelos especializados em cada tarefa."
        )
    )

    story.append(h3("3.2 Pipeline em duas etapas"))
    story.append(
        table(
            [
                ["Etapa", "Modelo", "Entrada", "Saída"],
                [
                    cell("1. Detecção (vision)"),
                    cell("Gemini 2.5 Flash"),
                    cell("Imagem do diagrama (bytes)"),
                    cell("Componentes + conexões + confidence"),
                ],
                [
                    cell("2. Classificação (text)"),
                    cell("Groq Llama 3.3 70B"),
                    cell("JSON dos componentes da etapa 1"),
                    cell("Riscos + recomendações + summary"),
                ],
            ],
            col_widths=[3.8 * cm, 3.5 * cm, 4 * cm, 5.3 * cm],
        )
    )

    story.append(h3("3.3 Modelos e provedores"))
    story.append(
        table(
            [
                ["Provedor", "Modelo", "Justificativa"],
                [cell("Google Gemini"), cell("gemini-2.5-flash"), cell("Multimodal nativo (vision), free tier generoso, responseSchema estruturado")],
                [cell("Groq"), cell("llama-3.3-70b-versatile"), cell("Inference rápida (&gt;500 tok/s), free tier robusto, suporte a JSON mode")],
                [cell("Mock (fallback)"), cell("MockLlmProvider"), cell("Saída determinística — usada em testes e como fallback de degradação")],
            ],
            col_widths=[3 * cm, 4.5 * cm, 9 * cm],
        )
    )

    story.append(h3("3.4 Guardrails (controle de entrada, saída e mitigação de alucinações)"))
    story.extend(
        bullets(
            [
                "<b>Schema-locked output:</b> Gemini chama com <code>responseMimeType=application/json</code> + <code>responseSchema</code> tipado (Type.OBJECT).",
                "<b>Validação Zod:</b> toda saída de LLM passa por <code>ComponentsExtractionSchema.parse()</code> e <code>RisksClassificationSchema.parse()</code> — Zod barra antes de persistir.",
                "<b>Temperature 0.2:</b> baixa criatividade → respostas reprodutíveis e auditáveis.",
                "<b>maxOutputTokens 16384:</b> evita truncamento (problema do thoughtsTokenCount no Gemini).",
                "<b>System prompts restritivos:</b> instrui o modelo a recusar entradas suspeitas (defesa contra prompt injection).",
                "<b>extractionConfidence / classificationConfidence:</b> modelo declara confiança própria; abaixo do threshold marca degraded.",
            ]
        )
    )

    story.append(h3("3.5 Tratamento de falhas da IA"))
    story.extend(
        bullets(
            [
                "Cada chamada Gemini/Groq tem <b>3 retries com exponential backoff</b> (1s → 2s → 4s).",
                "Se mesmo após retries o provider falhar, troca para <b>MockLlmProvider</b> e marca <code>degraded=true</code>.",
                "Falhas não-retentáveis (Zod inválido, S3 GET 404) vão para <code>analysis.failed</code> com <code>reason</code> enumerado.",
                "Após 3 falhas no SQS, mensagem vai para DLQ + alerta Datadog (oncall).",
            ]
        )
    )

    story.append(h3("3.6 Demonstração prática"))
    story.append(
        p(
            "Pipeline foi validado ponta-a-ponta com diagramas reais (incluindo o próprio diagrama de containers "
            "deste projeto). Resposta típica em ~25–30s com <code>providerChain={step1:gemini, step2:groq}</code> "
            "e <code>degraded=false</code>. A collection Postman em <code>postman/fiap-hackathon.postman_collection.json</code> "
            "automatiza a sequência register → login → upload → poll /reports/{id}."
        )
    )

    story.append(h3("3.7 Limitações reconhecidas"))
    story.extend(
        bullets(
            [
                "Free tier Gemini = 50 req/min — rate limit pode ativar o fallback durante demo.",
                "Modelo enxerga PNG/JPG, mas ainda erra em diagramas muito densos (50+ componentes).",
                "Não distingue confiavelmente camadas de rede (subnet, AZ) — limitação visual.",
                "extractionConfidence é auto-reportada — não é métrica calibrada estatisticamente.",
                "Saída em inglês (idioma do prompt) — multi-idioma fica como stretch goal.",
            ]
        )
    )

    # === 4. INTEGRAÇÃO IA + SISTEMA ===
    story.append(PageBreak())
    story.append(h2("4. Integração IA + Sistema"))

    story.append(h3("4.1 Como a IA é acionada"))
    story.append(
        p(
            "A IA <b>não é um script isolado</b>. Ela é acionada automaticamente quando o processing consome uma "
            "mensagem de <code>analysis-requested</code> (SQS long-poll). Sequência: o serviço baixa o arquivo do S3, "
            "passa pelo <code>LlmPipeline</code> (Strategy Pattern com provider selecionável via env), e publica "
            "<code>analysis-completed</code> com payload completo. O cliente nunca chama a IA diretamente — interage "
            "apenas com o BFF (REST)."
        )
    )

    story.append(h3("4.2 Como o sistema trata falhas da IA"))
    story.extend(
        bullets(
            [
                "Provider lança <code>LlmProviderError(message, providerName, cause, retryable)</code>.",
                "<code>LlmPipeline.withRetry()</code> respeita o flag <code>retryable</code> + 3 tentativas + backoff.",
                "Esgotadas as tentativas, fallback para Mock — publica <code>analysis.completed</code> com <code>degraded=true</code>.",
                "Erros não-retentáveis (Zod, schema) → <code>analysis.failed</code> com <code>reason</code> enumerado: <code>DOWNLOAD_FAILED, SCHEMA_VALIDATION_FAILED, AI_PROVIDER_EXHAUSTED, TIMEOUT, INTERNAL</code>.",
                "Alerta Datadog dispara quando mensagem cai em DLQ.",
            ]
        )
    )

    story.append(h3("4.3 Como o resultado da IA é persistido"))
    story.append(
        p(
            "<b>MongoDB Atlas</b> via Mongoose — coleção <code>analysis_results</code>. Cada documento contém o "
            "estado completo: status, providerChain (step1/step2), degraded, durationMs, components, risks, "
            "recommendations, errorReason. A escolha por Mongo é justificada pela estrutura semi-estruturada "
            "do output da IA (campos variáveis por análise) e ausência de joins com outras entidades."
        )
    )

    story.append(h3("4.4 Como o relatório é gerado a partir da análise"))
    story.append(
        p(
            "Após persistir em Mongo, o processing publica <code>analysis.completed</code> no SQS com o "
            "<b>payload completo</b> (Event-Carried State Transfer). O serviço report consome o evento e "
            "materializa uma cópia local em MySQL via Prisma. A consulta <code>GET /api/reports/{id}</code> "
            "responde com essa materialização — sem precisar consultar Mongo. Princípio: report fica "
            "autossuficiente para responder consultas, mesmo se Mongo estiver fora."
        )
    )

    # === 5. TECNOLOGIAS UTILIZADAS ===
    story.append(PageBreak())
    story.append(h2("5. Tecnologias Utilizadas"))

    story.append(h3("5.1 Backend"))
    story.append(
        table(
            [
                ["Tecnologia", "Versão", "Justificativa"],
                ["NestJS", "11", "Framework enterprise-ready, DI nativa, modularização, decorators TS"],
                ["TypeScript", "5.x", "Tipagem estática, melhor DX, redução de bugs em runtime"],
                ["Prisma", "6", "ORM type-safe com migrations — usado em upload, report e lambda-auth"],
                ["Mongoose", "8.x", "ODM maduro para MongoDB com schemas e validação — usado em processing"],
                ["Zod", "3.x", "Validação de schema runtime — guardrail das saídas IA e DTOs HTTP"],
                ["Pino", "9.x", "Logger estruturado JSON, alto throughput, PII redact via paths"],
            ],
            col_widths=[3.5 * cm, 2 * cm, 11 * cm],
        )
    )

    story.append(h3("5.2 Bancos de dados (polyglot persistence)"))
    story.append(
        table(
            [
                ["Banco", "Uso", "Justificativa"],
                ["MySQL 8 (RDS)", "upload, report, auth", "Relacional, ACID, integridade referencial, maturidade"],
                ["MongoDB Atlas", "processing", "Documento semi-estruturado (output IA varia), free tier M0"],
            ],
            col_widths=[3 * cm, 4 * cm, 9.5 * cm],
        )
    )

    story.append(h3("5.3 Mensageria"))
    story.append(
        table(
            [
                ["Componente", "Função", "Justificativa"],
                ["AWS SQS", "Filas (3x) + DLQ (2x)", "Garantia de entrega, retry, DLQ, integração nativa K8s/Lambda"],
                ["AWS SNS", "Topic analysis-events", "Fan-out se precisar adicionar consumidores futuros"],
                ["LocalStack 3.7", "Emulação local", "Subir SQS/SNS/S3/Lambda/IAM em dev sem custo AWS"],
            ],
            col_widths=[3.5 * cm, 4 * cm, 9 * cm],
        )
    )

    story.append(h3("5.4 IA / LLM"))
    story.append(
        table(
            [
                ["Provedor", "Modelo", "Função"],
                ["Google Gemini", "gemini-2.5-flash", "Vision — extração de componentes"],
                ["Groq", "llama-3.3-70b-versatile", "Text — classificação de riscos e recomendações"],
                ["Mock (in-process)", "—", "Fallback determinístico em caso de falha permanente"],
            ],
            col_widths=[3.5 * cm, 4.5 * cm, 8.5 * cm],
        )
    )

    story.append(h3("5.5 Autenticação"))
    story.append(
        table(
            [
                ["Componente", "Função", "Justificativa"],
                ["AWS Lambda", "Authorizer + login + register", "Serverless, escala automática, custo zero quando idle"],
                ["API Gateway HTTP API", "Roteamento + JWT auth", "Integração nativa com Lambda, throttling, CORS"],
                ["JWT HS256", "Tokens stateless", "Padrão da indústria, scopes em claims"],
                ["bcrypt cost 10", "Hash de senha", "Resistente a brute-force, padrão OWASP"],
            ],
            col_widths=[4 * cm, 4 * cm, 8.5 * cm],
        )
    )

    story.append(h3("5.6 Infraestrutura"))
    story.append(
        table(
            [
                ["Tecnologia", "Função", "Justificativa"],
                ["AWS EKS", "Orquestração (target prod)", "K8s gerenciado, integração com IAM/IRSA"],
                ["Terraform 1.9", "IaC", "Versionamento, plan/apply, state remoto"],
                ["Helm 3", "Deploy K8s", "Chart unificado para os 4 NestJS"],
                ["Docker (multi-stage Alpine)", "Containers", "Imagens enxutas (~150 MB), non-root, dumb-init"],
                ["GitHub Container Registry", "Registry imagens", "Multi-arch amd64+arm64, free, integração GH Actions"],
            ],
            col_widths=[4.5 * cm, 4.5 * cm, 7.5 * cm],
        )
    )

    story.append(h3("5.7 Observabilidade"))
    story.append(
        table(
            [
                ["Ferramenta", "Função", "Justificativa"],
                ["Pino", "Logs estruturados JSON", "Alto throughput, PII redact, request-id"],
                ["Datadog APM", "Tracing distribuído + métricas", "Free trial, dashboards prontos, alertas DLQ"],
                ["Healthchecks NestJS", "/api/health/live + /api/health/ready", "Compatível com K8s probes"],
            ],
            col_widths=[3.5 * cm, 5 * cm, 8.5 * cm],
        )
    )

    story.append(h3("5.8 Qualidade"))
    story.append(
        table(
            [
                ["Ferramenta", "Função", "Cobertura"],
                ["Jest 29", "Testes unitários", "108 testes verdes, gate 80% em todos os 5 services"],
                ["Supertest + Jest", "E2E", "Smoke ponta-a-ponta no infra (Postman + jest E2E)"],
                ["ESLint + Prettier", "Lint/format", "Configuração centralizada, pre-commit hook"],
            ],
            col_widths=[3.5 * cm, 4.5 * cm, 9 * cm],
        )
    )

    # === 6. INFRA E DEVOPS ===
    story.append(PageBreak())
    story.append(h2("6. Infraestrutura e DevOps"))

    story.append(h3("6.1 Docker"))
    story.append(
        p(
            "Todos os 4 microsserviços NestJS são containerizados com <b>Dockerfile multi-stage Alpine</b> — "
            "stage builder com devDeps + tsc, stage runtime apenas com dist/ + node_modules de produção. "
            "Imagens finais entre 150–200 MB. Container roda como usuário não-root (UID 1001), entrypoint via "
            "<code>dumb-init</code> para forwarding de signals e reaping de zumbis."
        )
    )

    story.append(h3("6.2 Docker Compose"))
    story.append(
        p(
            "Dois composes em <code>fiap-hackathon-infra/e2e/</code>:<br/>"
            "• <code>docker-compose.e2e.yml</code> — build local dos 4 NestJS + MySQL + Mongo + LocalStack + ClamAV. "
            "Usado em dev e como base do CI e2e-smoke.<br/>"
            "• <code>docker-compose.e2e.ghcr.yml</code> — override que troca <code>build:</code> local por <code>image: ghcr.io/danielroberto72/...:latest</code>. "
            "Permite ao avaliador rodar <code>make full-ghcr</code> clonando apenas o repo do infra.<br/>"
            "• <code>docker-compose.real-llm.yml</code> — override que troca providers de mock para Gemini + Groq reais "
            "(requer GEMINI_API_KEY + GROQ_API_KEY exportadas)."
        )
    )

    story.append(h3("6.3 Pipeline CI/CD"))
    story.append(
        p(
            "GitHub Actions em cada um dos 6 repos. Padrão para os 4 NestJS:"
        )
    )
    story.extend(
        bullets(
            [
                "<b>Job test</b> (todo push + PR): <code>npm ci → prisma generate → npm test → npm run build</code>. Coverage gate 80%.",
                "<b>Job build-and-push</b> (push em main): docker buildx multi-arch (linux/amd64 + linux/arm64) com QEMU + push GHCR com tags :latest, :sha-{short}, :main.",
                "Cache de build via <code>type=gha</code> — builds incrementais em segundos.",
                "Permissions mínimos: <code>contents:read, packages:write</code> + <code>secrets.GITHUB_TOKEN</code>.",
            ]
        )
    )

    story.append(
        p(
            "Para o lambda-auth: <code>npm test → tsc + tsc-alias → zip → upload-artifact + softprops/action-gh-release@v2</code> "
            "promove o zip para Release rolling <code>release-latest</code>."
        )
    )

    story.append(
        p(
            "Para o infra: <code>terraform fmt/validate → helm lint/template → e2e-smoke</code> "
            "(pull imagens GHCR → docker compose up → npm test → tear down). Roda em push, PR e schedule diário 06:00 UTC."
        )
    )

    story.append(h3("6.4 Deploy local via GHCR — caminho de demonstração"))
    story.append(
        p(
            "O PDF aceita explicitamente <i>Deploy local OU cloud</i>. Decidimos por <b>deploy local via GHCR</b> "
            "como caminho principal de demo (decisão registrada na ADR-002 D17). Avaliador roda o sistema completo "
            "com um único comando, clonando apenas o repo do infra:"
        )
    )
    story.append(
        code(
            "git clone https://github.com/DanielRoberto72/fiap-hackathon-infra\n"
            "cd fiap-hackathon-infra/e2e\n"
            "make full-ghcr   # pull imagens GHCR + docker-compose up + jest E2E + tear down"
        )
    )

    story.append(h3("6.5 Lambda local via LocalStack"))
    story.append(
        p(
            "O lambda-auth roda como <b>Lambda real no LocalStack Community</b> com API Gateway REST API v1 "
            "(custom id determinístico <code>fiapauth</code>). O bootstrap automatizado em "
            "<code>localstack-init/02-bootstrap-auth.sh</code> baixa o zip do GitHub Release, cria role IAM, "
            "3 funções Lambda (login, register, authorizer) e wireia routes <code>POST /auth/login</code> + "
            "<code>POST /auth/register</code> com Lambda Proxy Integration. Resultado: autenticação funciona "
            "serverless de verdade mesmo em ambiente local."
        )
    )

    story.append(h3("6.6 Capacidade de deploy AWS (provada, não armada)"))
    story.append(
        p(
            "A stack completa em AWS (EKS + RDS + S3 + SQS + Lambda + API Gateway + IRSA) está pronta como "
            "código em <code>terraform/</code> e <code>helm/</code>. O CI valida via <code>terraform fmt/validate</code> "
            "e <code>helm lint/template</code> a cada PR. <b>Não foi aplicada</b> em conta AWS para esta entrega "
            "(decisão estratégica D16 + D17 — economia de custo + tempo). Armar é uma flag "
            "<code>AWS_DEPLOY_ENABLED=true</code> de distância."
        )
    )

    # === 7. QUALIDADE E OBSERVABILIDADE ===
    story.append(PageBreak())
    story.append(h2("7. Qualidade e Observabilidade"))

    story.append(h3("7.1 Testes (108 verdes, cobertura 80%+ em todos)"))
    story.append(
        table(
            [
                ["Serviço", "Testes", "Coverage"],
                ["bff", "22", "100% statements / 100% branches / 100% funcs"],
                ["upload-orchestration", "28", "99% statements / 95%+ branches"],
                ["processing", "11", "100% statements"],
                ["report", "15", "100% statements / 81% branches"],
                ["lambda-auth", "30", "98% statements / 86% branches"],
                ["E2E (infra)", "2", "Happy path + idempotência"],
                ["Auth E2E (LocalStack)", "3", "register + login + JWT"],
                ["TOTAL", "108+ verdes", "Gate 80% em todos os jest.config"],
            ],
            col_widths=[5 * cm, 3 * cm, 8.5 * cm],
        )
    )

    story.append(h3("7.2 Logs estruturados"))
    story.append(
        p(
            "Todos os serviços usam <b>Pino</b> com saída JSON. Cada log carrega <code>requestId</code>, "
            "<code>analysisId</code>, <code>userId</code>, e contexto do bounded context. "
            "<b>PII redact</b> configurado em <code>logger.redact.paths</code> remove <code>password</code>, "
            "<code>req.headers.authorization</code> e <code>*.accessToken</code>."
        )
    )

    story.append(h3("7.3 Tratamento de erros"))
    story.extend(
        bullets(
            [
                "Erros de domínio extendem <code>AuthError</code>/<code>UploadError</code>/<code>AnalysisError</code> com <code>httpStatus</code> e <code>code</code> enumerados.",
                "Filter NestJS global converte para envelope JSON consistente <code>{error: {code, message}}</code>.",
                "Pipeline IA: erros classificados em <code>retryable: true|false</code> — controla decisão de retry.",
                "Razão de falha persistida em <code>analysis_results.errorReason</code> + <code>errorDetail</code> para auditoria.",
            ]
        )
    )

    story.append(h3("7.4 Observabilidade em produção"))
    story.extend(
        bullets(
            [
                "Datadog APM via <code>dd-trace</code> com auto-instrumentação HTTP/Mongo/Prisma/SQS.",
                "Métricas custom: <code>llm.duration_ms</code>, <code>llm.degraded.count</code>, <code>sqs.dlq.depth</code>.",
                "Alerta DLQ: <code>monitor</code> dispara quando depth > 0 por 5 min.",
                "Dashboards prontos em <code>terraform/datadog.tf</code> (provider Datadog) — Helm não aplica em local.",
            ]
        )
    )

    story.append(h3("7.5 Documentação"))
    story.extend(
        bullets(
            [
                "<b>README mestre</b> consolidado em <code>fiap-hackathon-infra/README.md</code> com 14 seções.",
                "<b>ADR-002</b> com 18 decisões arquiteturais documentadas (D1 a D18).",
                "<b>3 diagramas Eraser</b>: containers, sequence happy path, fluxo de falha IA.",
                "<b>docs/seguranca.md</b> com 10 seções obrigatórias do hackathon.",
                "<b>postman/</b> com collection v2.1 + DEMO.md (roteiro de gravação).",
            ]
        )
    )

    # === 8. SEGURANÇA ===
    story.append(PageBreak())
    story.append(h2("8. Segurança (seção obrigatória)"))

    story.append(h3("8.1 Requisitos básicos adotados"))
    story.extend(
        bullets(
            [
                "<b>TLS 1.2+</b> obrigatório no API Gateway (rejeição automática de protocolos legacy).",
                "<b>JWT HS256</b> com expiração 1h, scopes em claims, validado por Lambda authorizer em todas as rotas privadas.",
                "<b>bcrypt cost 10</b> no armazenamento de senhas — sem texto puro nem hash trivial.",
                "<b>Secrets Manager + IRSA</b> em produção: nenhuma credencial em env hardcoded ou em ConfigMap.",
                "<b>Pino PII redact</b> remove campos sensíveis antes de logs serem persistidos.",
            ]
        )
    )

    story.append(h3("8.2 Validação e tratamento de entradas não confiáveis"))
    story.extend(
        bullets(
            [
                "<b>Upload</b>: validação MIME (Content-Type), magic bytes via lib <code>file-type</code>, tamanho máximo (10MB), e <b>scan ClamAV</b> antes de persistir no S3.",
                "<b>Body JSON</b>: validação Zod por DTO em todos os endpoints — rejeição com 400 detalhado.",
                "<b>Idempotency-Key</b> obrigatória em POSTs de criação — protege contra retry duplicado do cliente.",
                "<b>Rate limit</b> no API Gateway (10 req/s por IP, 100 req/s burst).",
                "<b>CORS allowlist</b> no API Gateway — sem wildcard.",
            ]
        )
    )

    story.append(h3("8.3 Uso controlado da IA (escopo e previsibilidade)"))
    story.extend(
        bullets(
            [
                "<b>Schema-locked output:</b> Gemini chamado com <code>responseSchema</code> tipado (Type.OBJECT) — não consegue retornar texto livre.",
                "<b>Validação Zod</b> nos JSONs de saída antes de qualquer persistência ou propagação.",
                "<b>Temperature 0.2</b> em ambos os modelos — minimiza criatividade aleatória.",
                "<b>System prompts restritivos</b>: instruem o modelo a recusar pedidos que extrapolem o domínio (análise de diagrama).",
                "<b>Defesa contra prompt injection</b>: prompts do usuário (caption opcional) são sanitizados e wrapeados em delimiter <code>&lt;user_input&gt;...&lt;/user_input&gt;</code>.",
                "<b>maxOutputTokens 16384</b>: evita corte de JSON por estouro de orçamento de tokens.",
            ]
        )
    )

    story.append(h3("8.4 Tratamento seguro de falhas da IA"))
    story.extend(
        bullets(
            [
                "Retry exponencial 3x (1s → 2s → 4s) — não cascateia falha do provider para o cliente.",
                "Fallback automático para <b>MockLlmProvider</b> com <code>degraded=true</code> — relatório sempre é entregue.",
                "Falhas não-retentáveis (Zod, schema) → <code>analysis.failed</code> com <code>reason</code> enumerado.",
                "Após DLQ, alerta Datadog dispara oncall — operador humano revisa.",
                "<code>extractionConfidence</code> / <code>classificationConfidence</code> auto-reportadas pelo modelo são gravadas no documento para auditoria.",
            ]
        )
    )

    story.append(h3("8.5 Comunicação segura entre serviços"))
    story.extend(
        bullets(
            [
                "Em produção AWS: <b>API Gateway → VPC Link → NLB interno → EKS</b>. Nenhum microsserviço fica exposto publicamente.",
                "<b>IRSA (IAM Roles for Service Accounts):</b> uma role por pod, com privilégio mínimo definido em <code>terraform/iam.tf</code>.",
                "<b>Security Groups</b> restritivos: porta 3000–3003 só acessível dentro da VPC.",
                "<b>TLS interno</b> via service mesh (Linkerd) — stretch goal documentado em ADR-002.",
                "Em LocalStack local: rede Docker isolada <code>fiap-hackathon-e2e_e2e</code> + DNS interno.",
            ]
        )
    )

    story.append(h3("8.6 Hardening do container"))
    story.extend(
        bullets(
            [
                "Imagem base Alpine 3.20 (~30 MB) — superfície de ataque mínima.",
                "Container roda como usuário não-root (UID 1001).",
                "<code>dumb-init</code> como entrypoint — sem shell exposto em PID 1.",
                "Filesystem read-only exceto <code>/tmp</code> (configurado no K8s securityContext).",
                "<code>capabilities: drop ALL</code> + <code>privileged: false</code>.",
            ]
        )
    )

    story.append(h3("8.7 Riscos identificados, mitigações atuais e stretch goals"))
    story.append(
        table(
            [
                ["Risco", "Mitigação atual", "Stretch goal"],
                [
                    "MongoDB Atlas aberto a 0.0.0.0/0",
                    "Usuário/senha forte + IP allowlist do EKS NAT",
                    "VPC peering Atlas ↔ AWS VPC",
                ],
                [
                    "Falta de WAF no API Gateway",
                    "Validação Zod + rate limit nativo",
                    "AWS WAF v2 com managed rule sets",
                ],
                [
                    "External Secrets Operator não implementado",
                    "Secrets do K8s populados manualmente uma vez",
                    "ESO sincronizando do Secrets Manager",
                ],
                [
                    "Sem mTLS entre serviços",
                    "Tráfego confinado em VPC privada",
                    "Linkerd mesh com mTLS automático",
                ],
                [
                    "Datadog free trial = janela curta",
                    "Trial iniciado próximo à demo (~ 14 dias)",
                    "Plano pago ou switch para Grafana/Loki self-hosted",
                ],
                [
                    "Free tier LLM = rate limit",
                    "Fallback automático para Mock + degraded flag",
                    "Plano pago Gemini + Groq",
                ],
            ],
            col_widths=[4.5 * cm, 6 * cm, 6 * cm],
        )
    )

    # === 9. CONSIDERAÇÕES DE DESIGN ===
    story.append(PageBreak())
    story.append(h2("9. Considerações de Design"))

    story.append(h3("9.1 Consistência eventual"))
    story.append(
        p(
            "Cada serviço mantém consistência forte em seu banco local. A consistência entre serviços é alcançada "
            "via processamento de eventos (SQS analysis-completed). Em caso de falha, o mecanismo de fallback "
            "(degraded) garante que o relatório sempre é entregue, ainda que sinalizado para revisão humana."
        )
    )

    story.append(h3("9.2 Idempotência"))
    story.extend(
        bullets(
            [
                "<code>Idempotency-Key</code> obrigatória em <code>POST /api/analyses</code>.",
                "Verificação de estado no consumer SQS antes de aplicar mudanças.",
                "Mensagens SQS são processadas com base no <code>analysisId</code> (UUID único).",
                "Logs detalhados com <code>requestId</code> + <code>analysisId</code> para auditoria.",
            ]
        )
    )

    story.append(h3("9.3 Resiliência"))
    story.extend(
        bullets(
            [
                "Retentativas SQS via <code>visibilityTimeout</code> + maxReceiveCount 3.",
                "Dead Letter Queues (2x) para mensagens problemáticas.",
                "Fallback automático para Mock após exaurir retries do provider IA.",
                "Healthchecks <code>/api/health/live</code> e <code>/api/health/ready</code> — K8s reinicia pod automaticamente.",
                "Multi-AZ em produção (EKS managed) — stretch goal: read replica RDS.",
            ]
        )
    )

    # === 10. CONCLUSÃO ===
    story.append(h2("10. Conclusão"))
    story.append(
        p(
            "A arquitetura de microsserviços com comunicação assíncrona via SQS, polyglot persistence, "
            "pipeline IA em duas etapas com guardrails Zod e fallback automático, deploy local serverless "
            "via GHCR + LocalStack Lambda e cobertura de testes 80%+ proporciona um sistema:"
        )
    )
    story.extend(
        bullets(
            [
                "<b>Escalável:</b> cada serviço escala independentemente, fila SQS absorve picos.",
                "<b>Resiliente:</b> sem ponto único de falha, fallback automático, DLQ + alerta.",
                "<b>Manutenível:</b> bounded contexts isolados, ADR documentando todas as decisões.",
                "<b>Reproduzível:</b> avaliador roda <code>make full-ghcr</code> e tem o sistema completo em ~90s.",
                "<b>Observável:</b> Pino structured logs + Datadog APM + métricas custom.",
                "<b>Seguro:</b> validação em múltiplas camadas, guardrails IA, hardening de container.",
            ]
        )
    )
    story.append(
        p(
            "Esta entrega atende cirurgicamente aos requisitos do Hackathon Integrado IADT+SOAT — funcionalidades "
            "obrigatórias (upload + processo de análise + status + relatório), requisitos técnicos (microsserviços "
            "+ REST + assíncrono + Clean Architecture + DB próprio + testes), IA (pipeline + guardrails + fallback "
            "+ limitações documentadas), infraestrutura (Docker + Compose + CI/CD com Build + Testes + Deploy local "
            "verificado em runner GitHub Actions) e seção obrigatória de Segurança."
        )
    )

    doc = SimpleDocTemplate(
        str(OUT),
        pagesize=A4,
        leftMargin=2.2 * cm,
        rightMargin=2.2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
        title="Hackathon FIAP IADT+SOAT — Entrega Final",
        author="Daniel Roberto Pereira",
    )
    doc.build(story)
    print(f"OK: {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    build()
