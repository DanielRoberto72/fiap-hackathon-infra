# fiap-hackathon-infra

Infrastructure-as-Code for the FIAP Hackathon. Terraform modules for AWS VPC, EKS cluster, ECR repos, RDS MySQL, S3 buckets, SQS queues + DLQs, SNS topics, Secrets Manager, and API Gateway HTTP API. Also hosts Helm charts and K8s manifests for all microservices, plus the master README and architecture diagrams.

> 🚨 Part of the **FIAP Hackathon IADT+SOAT** (deadline 2026-05-27).
> Architecture overview and full documentation: see [`fiap-hackathon-infra`](https://github.com/DanielRoberto72/fiap-hackathon-infra) (master README).

## Sibling services

- [`fiap-hackathon-bff`](https://github.com/DanielRoberto72/fiap-hackathon-bff) — BFF NestJS aggregator
- [`fiap-hackathon-upload-orchestration`](https://github.com/DanielRoberto72/fiap-hackathon-upload-orchestration) — Upload + S3 + SQS publish
- [`fiap-hackathon-processing`](https://github.com/DanielRoberto72/fiap-hackathon-processing) — AI pipeline (Gemini Vision + Groq)
- [`fiap-hackathon-report`](https://github.com/DanielRoberto72/fiap-hackathon-report) — Report consumer + REST query
- [`fiap-hackathon-lambda-auth`](https://github.com/DanielRoberto72/fiap-hackathon-lambda-auth) — JWT Lambda authorizer
- [`fiap-hackathon-infra`](https://github.com/DanielRoberto72/fiap-hackathon-infra) — Terraform + K8s + Helm

## Stack

NestJS 11 + TypeScript + Clean Architecture (Interface / Application / Domain / Infrastructure).

## Status

🚧 **Initial scaffold** — implementation in progress (sprint 2026-05-01 to 2026-05-03).
