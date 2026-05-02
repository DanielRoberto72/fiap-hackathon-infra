# IAM Roles para os pods via IRSA (IAM Roles for Service Accounts).
# Cada microsserviço tem uma role com escopo mínimo no que ele realmente
# usa: o upload-orchestration faz PUT no S3 e SendMessage no analysis-requested,
# o processing faz GetObject + ReceiveMessage + SendMessage, e o report
# faz apenas ReceiveMessage + DeleteMessage.

locals {
  oidc_issuer_short = replace(aws_iam_openid_connect_provider.eks.url, "https://", "")
}

data "aws_iam_policy_document" "irsa_assume" {
  for_each = toset(local.microservices)

  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.eks.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_issuer_short}:sub"
      values   = ["system:serviceaccount:default:${each.value}"]
    }

    condition {
      test     = "StringEquals"
      variable = "${local.oidc_issuer_short}:aud"
      values   = ["sts.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "irsa" {
  for_each = toset(local.microservices)

  name               = "${local.name_prefix}-irsa-${each.value}"
  assume_role_policy = data.aws_iam_policy_document.irsa_assume[each.value].json
}

# Upload-orchestration: PUT S3 raw/* + SendMessage analysis-requested + GetSecretValue
resource "aws_iam_role_policy" "upload_orchestration" {
  name = "${local.name_prefix}-upload-orchestration-policy"
  role = aws_iam_role.irsa["upload-orchestration"].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:PutObjectAcl"]
        Resource = "${aws_s3_bucket.uploads.arn}/raw/*"
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage", "sqs:GetQueueAttributes"]
        Resource = aws_sqs_queue.main["analysis-requested"].arn
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = aws_secretsmanager_secret.rds_credentials.arn
      },
    ]
  })
}

# Processing: GetObject S3 + ReceiveMessage analysis-requested + SendMessage analysis-completed/failed + GetSecretValue
resource "aws_iam_role_policy" "processing" {
  name = "${local.name_prefix}-processing-policy"
  role = aws_iam_role.irsa["processing"].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.uploads.arn}/raw/*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:ChangeMessageVisibility",
          "sqs:GetQueueAttributes",
        ]
        Resource = aws_sqs_queue.main["analysis-requested"].arn
      },
      {
        Effect = "Allow"
        Action = ["sqs:SendMessage", "sqs:GetQueueAttributes"]
        Resource = [
          aws_sqs_queue.main["analysis-completed"].arn,
          aws_sqs_queue.main["analysis-failed"].arn,
        ]
      },
      {
        Effect = "Allow"
        Action = ["secretsmanager:GetSecretValue"]
        Resource = [
          aws_secretsmanager_secret.gemini_api_key.arn,
          aws_secretsmanager_secret.groq_api_key.arn,
          aws_secretsmanager_secret.mongo_atlas_uri.arn,
        ]
      },
    ]
  })
}

# Report: ReceiveMessage analysis-completed/failed + GetSecretValue (RDS)
resource "aws_iam_role_policy" "report" {
  name = "${local.name_prefix}-report-policy"
  role = aws_iam_role.irsa["report"].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:ChangeMessageVisibility",
          "sqs:GetQueueAttributes",
        ]
        Resource = [
          aws_sqs_queue.main["analysis-completed"].arn,
          aws_sqs_queue.main["analysis-failed"].arn,
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = aws_secretsmanager_secret.rds_credentials.arn
      },
    ]
  })
}

# BFF: nada de AWS além de healthcheck básico (chamadas internas via HTTP).
resource "aws_iam_role_policy" "bff" {
  name = "${local.name_prefix}-bff-policy"
  role = aws_iam_role.irsa["bff"].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:DescribeLogStreams"]
      Resource = "*"
    }]
  })
}
