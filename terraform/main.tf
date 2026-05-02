terraform {
  required_version = ">= 1.6.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.70"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  backend "s3" {
    bucket         = "fiap-hackathon-tfstate"
    key            = "infra/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "fiap-hackathon-tfstate-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "fiap-hackathon"
      Owner       = "DanielRoberto72"
      ManagedBy   = "terraform"
      Environment = var.environment
    }
  }
}

locals {
  name_prefix = "fiap-hackathon-${var.environment}"
  microservices = [
    "bff",
    "upload-orchestration",
    "processing",
    "report",
  ]
}
