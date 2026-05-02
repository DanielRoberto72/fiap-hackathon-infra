variable "aws_region" {
  description = "Região AWS onde a infra será provisionada."
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Nome do ambiente (dev, staging, prod)."
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  description = "CIDR /16 da VPC."
  type        = string
  default     = "10.10.0.0/16"
}

variable "azs" {
  description = "Availability Zones a usar."
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

variable "eks_version" {
  description = "Versão do EKS."
  type        = string
  default     = "1.30"
}

variable "eks_node_instance_type" {
  description = "Tipo de instância dos nodes do EKS."
  type        = string
  default     = "t3.small"
}

variable "eks_node_desired" {
  description = "Quantidade desejada de nodes EKS."
  type        = number
  default     = 2
}

variable "eks_node_min" {
  description = "Quantidade mínima de nodes EKS."
  type        = number
  default     = 1
}

variable "eks_node_max" {
  description = "Quantidade máxima de nodes EKS."
  type        = number
  default     = 4
}

variable "rds_instance_class" {
  description = "Classe da instância RDS MySQL."
  type        = string
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  description = "Storage alocado em GB para o RDS."
  type        = number
  default     = 20
}

variable "lambda_auth_zip_path" {
  description = "Caminho local para o ZIP da Lambda de auth."
  type        = string
  default     = "../../fiap-hackathon-lambda-auth/lambda-auth.zip"
}

variable "s3_lifecycle_glacier_days" {
  description = "Dias até mover uploads brutos para Glacier."
  type        = number
  default     = 30
}
