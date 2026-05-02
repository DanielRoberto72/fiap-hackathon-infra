resource "aws_security_group" "lambda_auth" {
  name        = "${local.name_prefix}-lambda-auth-sg"
  description = "Security group da Lambda de auth (acesso ao RDS via subnets privadas)"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${local.name_prefix}-lambda-auth-sg"
  }
}

resource "aws_iam_role" "lambda_auth" {
  name = "${local.name_prefix}-lambda-auth-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_auth.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  role       = aws_iam_role.lambda_auth.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "lambda_secrets" {
  name = "${local.name_prefix}-lambda-auth-secrets"
  role = aws_iam_role.lambda_auth.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue"]
      Resource = [
        aws_secretsmanager_secret.jwt.arn,
        aws_secretsmanager_secret.rds_credentials.arn,
      ]
    }]
  })
}

resource "aws_lambda_function" "auth_login" {
  function_name = "${local.name_prefix}-auth-login"
  role          = aws_iam_role.lambda_auth.arn
  filename      = var.lambda_auth_zip_path
  handler       = "handlers/login.handler.handler"
  runtime       = "nodejs22.x"
  timeout       = 10
  memory_size   = 256

  vpc_config {
    subnet_ids         = [for s in aws_subnet.private : s.id]
    security_group_ids = [aws_security_group.lambda_auth.id]
  }

  environment {
    variables = {
      JWT_SECRET_ARN  = aws_secretsmanager_secret.jwt.arn
      JWT_TTL_SECONDS = "3600"
      DATABASE_URL    = "mysql://hackathon:${random_password.rds_master.result}@${aws_db_instance.main.address}:3306/fiap_hackathon_auth"
    }
  }
}

resource "aws_lambda_function" "auth_register" {
  function_name = "${local.name_prefix}-auth-register"
  role          = aws_iam_role.lambda_auth.arn
  filename      = var.lambda_auth_zip_path
  handler       = "handlers/register.handler.handler"
  runtime       = "nodejs22.x"
  timeout       = 10
  memory_size   = 256

  vpc_config {
    subnet_ids         = [for s in aws_subnet.private : s.id]
    security_group_ids = [aws_security_group.lambda_auth.id]
  }

  environment {
    variables = {
      DATABASE_URL = "mysql://hackathon:${random_password.rds_master.result}@${aws_db_instance.main.address}:3306/fiap_hackathon_auth"
    }
  }
}

resource "aws_lambda_function" "authorizer" {
  function_name = "${local.name_prefix}-authorizer"
  role          = aws_iam_role.lambda_auth.arn
  filename      = var.lambda_auth_zip_path
  handler       = "handlers/authorizer.handler.handler"
  runtime       = "nodejs22.x"
  timeout       = 5
  memory_size   = 256

  environment {
    variables = {
      JWT_SECRET_ARN = aws_secretsmanager_secret.jwt.arn
    }
  }
}
