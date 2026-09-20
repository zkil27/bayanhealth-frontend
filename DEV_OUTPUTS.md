# Dev Environment Outputs

Applied: 2026-06-08 (Singapore `ap-southeast-1` stack)

## API Gateway

- **API Endpoint**: `https://f9xiyx5s64.execute-api.ap-southeast-1.amazonaws.com`
- **Health Check**: `GET https://f9xiyx5s64.execute-api.ap-southeast-1.amazonaws.com/health` ✅

## Cognito

- **User Pool ID**: `ap-southeast-1_bnXemsKn2`
- **Web Client ID**: `13msbvlaepqpkghalh775t9qgv`
- **Issuer URL**: `https://cognito-idp.ap-southeast-1.amazonaws.com/ap-southeast-1_bnXemsKn2`

### RBAC Groups
- `patient`
- `doctor`
- `admin`

### Test accounts

This document does not store test-account credentials. Retrieve approved non-production smoke-test credentials only from the project secret-management process; rotate any credentials previously recorded here.

## DynamoDB Tables

- **App Core**: `bayanhealth-dev-app-core`
- **App Audit AI**: `bayanhealth-dev-app-audit-ai`

## S3

- **AI Raw Logs**: `bayanhealth-dev-ai-raw-logs-472206752892`
- **Media Private** (payment proofs): `bayanhealth-dev-media-private-472206752892`

## Secrets Manager

- **Together API Key**: managed in Secrets Manager; a real key is active for paid-model inference. Never record its value in this repository.

## Lambda

- **Health**: `bayanhealth-dev-health`
- **Bookings**: `bayanhealth-dev-bookings`
- **Schedules**: `bayanhealth-dev-schedules`
- **Payment Proof**: `bayanhealth-dev-payment-proof`

## AWS Account

- **Account ID**: `472206752892`
- **Region**: `ap-southeast-1`
- **IAM User**: `ben.bayanhealth`

---

## Frontend Configuration

```env
NEXT_PUBLIC_API_BASE_URL=https://f9xiyx5s64.execute-api.ap-southeast-1.amazonaws.com
NEXT_PUBLIC_COGNITO_USER_POOL_ID=ap-southeast-1_bnXemsKn2
NEXT_PUBLIC_COGNITO_CLIENT_ID=13msbvlaepqpkghalh775t9qgv
NEXT_PUBLIC_AWS_REGION=ap-southeast-1
```

## Smoke test

```bash
cd backend
API_BASE_URL=https://f9xiyx5s64.execute-api.ap-southeast-1.amazonaws.com \
COGNITO_CLIENT_ID=13msbvlaepqpkghalh775t9qgv \
AWS_REGION=ap-southeast-1 \
bash scripts/smoke-bookings-dev.sh
```

Refresh values anytime:

```bash
cd infra/environments/dev && terraform output
```
