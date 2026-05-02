resource "random_password" "jwt" {
  length  = 64
  special = true
}

resource "aws_secretsmanager_secret" "jwt" {
  name                    = "${local.name_prefix}-jwt-secret"
  description             = "Secret HS256 usado pela Lambda de auth para assinar JWTs"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id     = aws_secretsmanager_secret.jwt.id
  secret_string = random_password.jwt.result
}

resource "aws_secretsmanager_secret" "gemini_api_key" {
  name                    = "${local.name_prefix}-gemini-api-key"
  description             = "Chave da API Gemini consumida pelo processing"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret" "groq_api_key" {
  name                    = "${local.name_prefix}-groq-api-key"
  description             = "Chave da API Groq consumida pelo processing"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret" "mongo_atlas_uri" {
  name                    = "${local.name_prefix}-mongo-atlas-uri"
  description             = "URI MongoDB Atlas consumida pelo processing"
  recovery_window_in_days = 0
}
