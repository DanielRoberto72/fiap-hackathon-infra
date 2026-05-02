# Helm chart unificado — `fiap-hackathon-service`

Um único chart parametrizado por `values-<servico>.yaml`. Mantém DRY entre os 4 microsserviços NestJS, evita duplicação e garante que mudanças de probe/HPA/security-context valem pra todos.

## Como instalar (após `kubectl` apontado pro EKS)

```bash
# Variáveis de ambiente esperadas (vindas dos outputs do Terraform).
export ECR_REGISTRY=$(aws ecr describe-registry --query registryId --output text).dkr.ecr.us-east-1.amazonaws.com
export IMAGE_TAG=$(git rev-parse --short HEAD)
export S3_BUCKET_RAW=$(terraform -chdir=../terraform output -raw s3_uploads_bucket)
export SQS_ANALYSIS_REQUESTED_URL=$(terraform -chdir=../terraform output -json sqs_queue_urls | jq -r '."analysis-requested"')
export SQS_ANALYSIS_COMPLETED_URL=$(terraform -chdir=../terraform output -json sqs_queue_urls | jq -r '."analysis-completed"')
export SQS_ANALYSIS_FAILED_URL=$(terraform -chdir=../terraform output -json sqs_queue_urls | jq -r '."analysis-failed"')
export IRSA_UPLOAD_ROLE_ARN=$(terraform -chdir=../terraform output -json irsa_role_arns | jq -r '.["upload-orchestration"]')
export IRSA_PROCESSING_ROLE_ARN=$(terraform -chdir=../terraform output -json irsa_role_arns | jq -r '.processing')
export IRSA_REPORT_ROLE_ARN=$(terraform -chdir=../terraform output -json irsa_role_arns | jq -r '.report')

# Secrets do K8s (criados manualmente uma vez):
kubectl create secret generic upload-db-credentials \
  --from-literal=DATABASE_URL=mysql://... --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic report-db-credentials \
  --from-literal=DATABASE_URL=mysql://... --dry-run=client -o yaml | kubectl apply -f -
kubectl create secret generic processing-secrets \
  --from-literal=MONGO_URI=mongodb+srv://... \
  --from-literal=GEMINI_API_KEY=... \
  --from-literal=GROQ_API_KEY=... --dry-run=client -o yaml | kubectl apply -f -

# Substitui as variáveis e instala cada serviço:
for svc in bff upload-orchestration processing report; do
  envsubst < values-${svc}.yaml > /tmp/values-${svc}.rendered.yaml
  helm upgrade --install fiap-hackathon-${svc} ./fiap-hackathon-service \
    -f /tmp/values-${svc}.rendered.yaml \
    --namespace default \
    --wait --timeout 5m
done
```

## Estrutura

```
helm/
├── README.md
├── fiap-hackathon-service/             # Chart base
│   ├── Chart.yaml
│   ├── values.yaml                     # defaults
│   └── templates/
│       ├── _helpers.tpl
│       ├── deployment.yaml
│       ├── service.yaml
│       ├── hpa.yaml
│       └── serviceaccount.yaml
├── values-bff.yaml                     # override do BFF (Service: LoadBalancer NLB)
├── values-upload-orchestration.yaml    # IRSA com S3 + SQS + Secrets
├── values-processing.yaml              # IRSA com S3 GET + SQS + Secrets
└── values-report.yaml                  # IRSA com SQS consume + Secrets
```

## Notas de segurança

- Todos os pods rodam com `runAsNonRoot: true`, `allowPrivilegeEscalation: false`, `capabilities.drop: [ALL]` e `seccompProfile: RuntimeDefault`.
- IRSA garante que cada pod só assume a role mínima necessária (princípio do menor privilégio — ver `terraform/iam.tf`).
- Probes apontam para `/api/health/live` e `/api/health/ready` (existentes em todos os microsserviços NestJS).
