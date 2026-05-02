# fiap-hackathon-infra

> 🚨 **Repositório-mestre** do **Hackathon Integrado IADT + SOAT da FIAP** (entrega em 2026-05-27).
> Hospeda a infraestrutura como código, as bibliotecas compartilhadas, o README mestre da arquitetura, manifestos Kubernetes, charts Helm e o log de decisões (ADRs).

## O que tem aqui

| Caminho | Para que serve |
|---|---|
| `shared/` | Código TypeScript compartilhado (schemas Zod, Strategy de LLM, logger, erros). É copiado para o `src/shared/` de cada serviço no momento da implementação. Ver [shared/README.md](shared/README.md). |
| `docker-compose.yml` | Stack local de desenvolvimento: MySQL 8 + Mongo 7 + LocalStack (S3 / SQS / SNS / Secrets Manager) + ClamAV + Datadog Agent (sob profile). |
| `docker/mysql-init/` | Scripts de bootstrap do MySQL (cria os bancos por serviço). |
| `localstack-init/` | Hooks de inicialização do LocalStack (cria bucket, filas, segredos). |
| `Makefile` | Atalhos: `make up`, `make smoke`, `make s3-ls`, `make sqs-ls`. |
| `terraform/` | (em construção) Módulos Terraform para AWS VPC, EKS, ECR, RDS, S3, SQS, SNS, Secrets Manager e API Gateway. |
| `k8s/` | (em construção) Manifestos Kubernetes (Deployment, Service, Ingress, HPA, ConfigMap, Secret) por microsserviço. |
| `helm/` | (em construção) Charts Helm dos 4 microsserviços NestJS. |
| `docs/` | Diagramas de arquitetura, seção de Segurança, ADRs. |

## Visão geral da arquitetura

O MVP recebe diagramas de arquitetura (imagem ou PDF), executa um pipeline de IA em duas etapas e devolve um relatório técnico estruturado contendo componentes identificados, riscos arquiteturais e recomendações.

**Repositórios irmãos:**
- [`fiap-hackathon-bff`](https://github.com/DanielRoberto72/fiap-hackathon-bff)
- [`fiap-hackathon-upload-orchestration`](https://github.com/DanielRoberto72/fiap-hackathon-upload-orchestration)
- [`fiap-hackathon-processing`](https://github.com/DanielRoberto72/fiap-hackathon-processing)
- [`fiap-hackathon-report`](https://github.com/DanielRoberto72/fiap-hackathon-report)
- [`fiap-hackathon-lambda-auth`](https://github.com/DanielRoberto72/fiap-hackathon-lambda-auth)

Log de decisões: [`docs/adr-002-arquitetura-fiap-hackathon.md`](docs/adr-002-arquitetura-fiap-hackathon.md).

## Como rodar localmente

```bash
# 1. Configurar variáveis de ambiente
cp .env.example .env

# 2. Subir as dependências (MySQL + Mongo + LocalStack + ClamAV)
make up

# 3. Aguardar o health-check
make smoke

# 4. Inspecionar recursos provisionados no LocalStack
make s3-ls
make sqs-ls
```

Para habilitar a observabilidade (Datadog Agent local):

```bash
make up-obs
```

## Status

🚧 **Sprint em andamento** — esqueleto inicial publicado em 2026-05-01.
Próximo passo: scaffold dos 4 microsserviços NestJS e da função `lambda-auth`.
