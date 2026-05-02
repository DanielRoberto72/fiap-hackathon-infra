resource "aws_apigatewayv2_api" "main" {
  name          = "${local.name_prefix}-http-api"
  protocol_type = "HTTP"
  description   = "API HTTP do Hackathon FIAP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["content-type", "authorization", "idempotency-key", "x-request-id"]
    max_age       = 600
  }
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.main.id
  name        = "$default"
  auto_deploy = true

  default_route_settings {
    throttling_burst_limit = 50
    throttling_rate_limit  = 100
  }

  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
    })
  }
}

resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigw/${local.name_prefix}"
  retention_in_days = 7
}

resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id                            = aws_apigatewayv2_api.main.id
  authorizer_type                   = "REQUEST"
  authorizer_uri                    = aws_lambda_function.authorizer.invoke_arn
  identity_sources                  = ["$request.header.Authorization"]
  name                              = "${local.name_prefix}-jwt-authorizer"
  authorizer_payload_format_version = "2.0"
  enable_simple_responses           = true
  authorizer_result_ttl_in_seconds  = 60
}

resource "aws_lambda_permission" "apigw_invoke_authorizer" {
  statement_id  = "AllowAPIGatewayInvokeAuthorizer"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.authorizer.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/authorizers/${aws_apigatewayv2_authorizer.jwt.id}"
}

resource "aws_apigatewayv2_integration" "auth_login" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.auth_login.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "auth_register" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.auth_register.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_integration" "bff" {
  api_id                 = aws_apigatewayv2_api.main.id
  integration_type       = "HTTP_PROXY"
  integration_method     = "ANY"
  integration_uri        = "http://${aws_lb.bff_nlb.dns_name}:80/{proxy}"
  payload_format_version = "1.0"
  connection_type        = "VPC_LINK"
  connection_id          = aws_apigatewayv2_vpc_link.main.id
}

resource "aws_apigatewayv2_route" "auth_login" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/login"
  target    = "integrations/${aws_apigatewayv2_integration.auth_login.id}"
}

resource "aws_apigatewayv2_route" "auth_register" {
  api_id    = aws_apigatewayv2_api.main.id
  route_key = "POST /auth/register"
  target    = "integrations/${aws_apigatewayv2_integration.auth_register.id}"
}

resource "aws_apigatewayv2_route" "bff_proxy" {
  api_id             = aws_apigatewayv2_api.main.id
  route_key          = "ANY /{proxy+}"
  target             = "integrations/${aws_apigatewayv2_integration.bff.id}"
  authorization_type = "CUSTOM"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

resource "aws_lambda_permission" "apigw_invoke_login" {
  statement_id  = "AllowAPIGatewayInvokeLogin"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_login.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_lambda_permission" "apigw_invoke_register" {
  statement_id  = "AllowAPIGatewayInvokeRegister"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth_register.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.main.execution_arn}/*/*"
}

resource "aws_apigatewayv2_vpc_link" "main" {
  name               = "${local.name_prefix}-vpc-link"
  security_group_ids = [aws_security_group.vpc_link.id]
  subnet_ids         = [for s in aws_subnet.private : s.id]
}

resource "aws_security_group" "vpc_link" {
  name        = "${local.name_prefix}-vpc-link-sg"
  description = "VPC Link do API Gateway -> NLB do BFF"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = [var.vpc_cidr]
  }

  tags = {
    Name = "${local.name_prefix}-vpc-link-sg"
  }
}

resource "aws_lb" "bff_nlb" {
  name               = "${local.name_prefix}-bff-nlb"
  internal           = true
  load_balancer_type = "network"
  subnets            = [for s in aws_subnet.private : s.id]

  tags = {
    Name = "${local.name_prefix}-bff-nlb"
  }
}
