output "vpc_id" {
  description = "ID da VPC do hackathon."
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "IDs das subnets privadas."
  value       = [for s in aws_subnet.private : s.id]
}

output "public_subnet_ids" {
  description = "IDs das subnets públicas."
  value       = [for s in aws_subnet.public : s.id]
}

output "eks_cluster_name" {
  description = "Nome do cluster EKS."
  value       = aws_eks_cluster.main.name
}

output "eks_cluster_endpoint" {
  description = "Endpoint da API do cluster EKS."
  value       = aws_eks_cluster.main.endpoint
}

output "eks_oidc_provider_arn" {
  description = "ARN do OIDC provider associado ao cluster EKS."
  value       = aws_iam_openid_connect_provider.eks.arn
}

output "ecr_repository_urls" {
  description = "URLs dos repositórios ECR por microsserviço."
  value       = { for k, v in aws_ecr_repository.service : k => v.repository_url }
}

output "rds_endpoint" {
  description = "Endpoint do RDS MySQL."
  value       = aws_db_instance.main.address
}

output "rds_credentials_secret_arn" {
  description = "ARN do segredo com credenciais do RDS."
  value       = aws_secretsmanager_secret.rds_credentials.arn
}

output "s3_uploads_bucket" {
  description = "Nome do bucket S3 de uploads."
  value       = aws_s3_bucket.uploads.bucket
}

output "sqs_queue_urls" {
  description = "URLs das filas SQS principais."
  value       = { for k, v in aws_sqs_queue.main : k => v.url }
}

output "sqs_dlq_urls" {
  description = "URLs das DLQs."
  value       = { for k, v in aws_sqs_queue.dlq : k => v.url }
}

output "sns_analysis_events_topic_arn" {
  description = "ARN do tópico SNS de eventos de análise."
  value       = aws_sns_topic.analysis_events.arn
}

output "jwt_secret_arn" {
  description = "ARN do segredo JWT."
  value       = aws_secretsmanager_secret.jwt.arn
}

output "irsa_role_arns" {
  description = "ARNs das roles IRSA por microsserviço."
  value       = { for k, v in aws_iam_role.irsa : k => v.arn }
}

output "api_gateway_invoke_url" {
  description = "URL pública do API Gateway HTTP API."
  value       = aws_apigatewayv2_api.main.api_endpoint
}
