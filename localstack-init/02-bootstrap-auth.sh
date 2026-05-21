#!/usr/bin/env bash
# Bootstraps the lambda-auth stack inside LocalStack:
#   1. Downloads the latest lambda-auth.zip from GitHub Releases (public repo).
#   2. Creates IAM role + JWT secret + 3 Lambdas (auth-login, auth-register, authorizer).
#   3. Creates an HTTP API (apigatewayv2) with a fixed custom id (`fiapauth`)
#      so the BFF can reach it via a deterministic URL.
#   4. Wires routes POST /auth/login and POST /auth/register to the matching Lambdas.
#
# Idempotent: every awslocal call ends with `|| true` so re-runs after restart do not break.
# Triggered automatically by LocalStack on container ready (scripts in /etc/localstack/init/ready.d).
set -euo pipefail

REGION="${AWS_DEFAULT_REGION:-us-east-1}"
ZIP_URL="${LAMBDA_AUTH_RELEASE_URL:-https://github.com/DanielRoberto72/fiap-hackathon-lambda-auth/releases/download/release-latest/lambda-auth.zip}"
ZIP_PATH="/tmp/lambda-auth.zip"
ROLE_NAME="lambda-auth-exec"
ROLE_ARN="arn:aws:iam::000000000000:role/${ROLE_NAME}"
API_ID="fiapauth"
STAGE_NAME="local"

echo "[auth-init] downloading lambda-auth zip from $ZIP_URL"
if ! curl -fsSL -o "$ZIP_PATH" "$ZIP_URL"; then
  echo "[auth-init] FAILED to download lambda-auth.zip — aborting auth bootstrap (other resources keep working)"
  exit 0
fi

if [ ! -s "$ZIP_PATH" ]; then
  echo "[auth-init] zip is empty — aborting auth bootstrap"
  exit 0
fi
echo "[auth-init] zip downloaded ($(wc -c < "$ZIP_PATH") bytes)"

echo "[auth-init] creating IAM role $ROLE_NAME"
awslocal iam create-role \
  --role-name "$ROLE_NAME" \
  --assume-role-policy-document '{
    "Version":"2012-10-17",
    "Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]
  }' 2>/dev/null || true

# JWT secret used by login/register and validated by authorizer
awslocal secretsmanager create-secret \
  --name /fiap-hackathon/local/auth-jwt \
  --secret-string '{"secret":"local-dev-jwt-secret-change-me"}' 2>/dev/null || true

create_function() {
  local fn_name="$1"
  local handler="$2"
  echo "[auth-init] creating lambda: $fn_name (handler=$handler)"
  awslocal lambda create-function \
    --function-name "$fn_name" \
    --runtime nodejs20.x \
    --role "$ROLE_ARN" \
    --handler "$handler" \
    --zip-file "fileb://$ZIP_PATH" \
    --timeout 30 \
    --memory-size 512 \
    --environment 'Variables={
      JWT_SECRET_NAME=/fiap-hackathon/local/auth-jwt,
      JWT_ISSUER=fiap-hackathon-local,
      JWT_AUDIENCE=fiap-hackathon-local,
      JWT_TTL_SECONDS=3600,
      DB_HOST=mysql,
      DB_PORT=3306,
      DB_USER=hackathon,
      DB_PASSWORD=hackathonpass,
      DB_NAME=fiap_hackathon_auth,
      AWS_ENDPOINT_URL=http://localstack:4566
    }' 2>/dev/null || true
}

# Handler path: o zip é gerado a partir de `dist/` (cd dist && zip -r ../lambda-auth.zip .),
# então dentro do zip o arquivo fica como `handlers/login.handler.js` exportando `handler`.
create_function "fiap-hackathon-auth-login"    "handlers/login.handler.handler"
create_function "fiap-hackathon-auth-register" "handlers/register.handler.handler"
create_function "fiap-hackathon-authorizer"    "handlers/authorizer.handler.handler"

echo "[auth-init] creating HTTP API (apigatewayv2) with custom id $API_ID"
awslocal apigatewayv2 create-api \
  --name fiap-hackathon-auth \
  --protocol-type HTTP \
  --tags "_custom_id_=${API_ID}" 2>/dev/null || true

create_route() {
  local route_key="$1"
  local fn_name="$2"
  local fn_arn="arn:aws:lambda:${REGION}:000000000000:function:${fn_name}"

  local integration_id
  integration_id=$(awslocal apigatewayv2 create-integration \
    --api-id "$API_ID" \
    --integration-type AWS_PROXY \
    --integration-uri "$fn_arn" \
    --payload-format-version 2.0 \
    --query 'IntegrationId' --output text 2>/dev/null || echo "")

  if [ -z "$integration_id" ]; then
    echo "[auth-init] integration for $route_key already exists, skipping"
    return
  fi

  awslocal apigatewayv2 create-route \
    --api-id "$API_ID" \
    --route-key "$route_key" \
    --target "integrations/${integration_id}" 2>/dev/null || true

  # Permite que o API Gateway invoque a Lambda
  awslocal lambda add-permission \
    --function-name "$fn_name" \
    --statement-id "apigw-${fn_name}" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com 2>/dev/null || true

  echo "[auth-init] route $route_key → $fn_name wired"
}

create_route "POST /auth/login"    "fiap-hackathon-auth-login"
create_route "POST /auth/register" "fiap-hackathon-auth-register"

awslocal apigatewayv2 create-stage \
  --api-id "$API_ID" \
  --stage-name "$STAGE_NAME" \
  --auto-deploy 2>/dev/null || true

echo "[auth-init] auth stack ready"
echo "[auth-init] AUTH_BASE_URL=http://localstack:4566/_aws/execute-api/${API_ID}/${STAGE_NAME}"
