locals {
  queue_names = ["analysis-requested", "analysis-completed", "analysis-failed"]
}

resource "aws_sqs_queue" "dlq" {
  for_each = toset(["analysis-requested", "analysis-completed"])

  name                       = "${local.name_prefix}-${each.value}-dlq"
  message_retention_seconds  = 1209600 # 14 dias
  visibility_timeout_seconds = 60

  tags = {
    Name = "${local.name_prefix}-${each.value}-dlq"
  }
}

resource "aws_sqs_queue" "main" {
  for_each = toset(local.queue_names)

  name                       = "${local.name_prefix}-${each.value}"
  visibility_timeout_seconds = each.value == "analysis-requested" ? 120 : 60
  message_retention_seconds  = 345600 # 4 dias
  receive_wait_time_seconds  = 20

  redrive_policy = contains(["analysis-requested", "analysis-completed"], each.value) ? jsonencode({
    deadLetterTargetArn = aws_sqs_queue.dlq[each.value].arn
    maxReceiveCount     = 3
  }) : null

  tags = {
    Name = "${local.name_prefix}-${each.value}"
  }
}

resource "aws_sns_topic" "analysis_events" {
  name = "${local.name_prefix}-analysis-events"

  tags = {
    Name = "${local.name_prefix}-analysis-events"
  }
}
