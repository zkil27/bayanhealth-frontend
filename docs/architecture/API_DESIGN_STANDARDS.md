# API Design Standards

Purpose: Define binding API design rules for BayanHealth API Gateway + Lambda endpoints.

Applies to: All HTTP API and WebSocket API endpoints in this repo.

> **Assessment-first CDS status:** `contracts/openapi.yaml` now contains the accepted assessment, candidate/CPG Preview, gate-token, seven protected-generation, async status/cancellation, finalization/release, and terminal legacy-route inventory. CI pins Redocly `1.34.0`, checks generated backend/frontend types, and rejects retired-route drift. This repository evidence is not an environment deployment or rollout approval; see `CDS_TASK_10_READINESS.md`.

References:
- ADR-20260416-08: TypeScript on Node.js 24.x
- ADR-20260416-09: OpenAPI 3.1 YAML contracts
- ADR-20260416-12: DynamoDB conditional writes for idempotency
- ADR-20260416-13: Cognito groups for RBAC

---

## 1) API Design Principles

1. **Contract-first**: Define OpenAPI spec before writing handler code (ADR-09)
2. **Resource-oriented**: URLs represent resources, not actions
3. **Stateless**: Each request contains all information needed; no server-side session state
4. **Idempotent writes**: All POST/PUT/PATCH operations must be idempotent via `Idempotency-Key` (ADR-12)
5. **Fail-safe defaults**: Missing optional fields use safe defaults; never assume client intent
6. **Minimal PHI exposure**: Return only necessary data; never leak PHI in error messages or logs
7. **Traceable**: Every request has correlation ID for end-to-end tracing

---

## 2) Route Naming Conventions

### URL Structure

```
/{version}/{resource}/{resourceId}/{subresource}
```

- Version prefix: `/v1/` for all endpoints
- Resources: plural nouns, lowercase, kebab-case for multi-word
- Resource IDs: path parameters, not query parameters
- Subresources: nested under parent resource

### Compliant Examples

```
GET    /v1/bookings                    # List bookings
POST   /v1/bookings                    # Create booking
GET    /v1/bookings/{bookingId}        # Get booking
PUT    /v1/bookings/{bookingId}        # Update booking
DELETE /v1/bookings/{bookingId}        # Cancel booking

GET    /v1/bookings/{bookingId}/messages           # List messages in booking
POST   /v1/bookings/{bookingId}/messages           # Send message
GET    /v1/doctors/{doctorId}/schedules            # Get doctor schedule
POST   /v1/consultations/{consultId}/documents     # Create document
GET    /v1/prescriptions/{prescriptionId}/verify   # Public verification
```

### Non-Compliant Examples

```
# Bad: Action in URL (use HTTP method instead)
POST   /v1/bookings/create
POST   /v1/bookings/{bookingId}/cancel

# Bad: Singular resource name
GET    /v1/booking/{bookingId}

# Bad: camelCase or PascalCase
GET    /v1/paymentProofs
GET    /v1/PaymentProofs

# Bad: ID in query parameter for single resource
GET    /v1/bookings?id=123

# Bad: Verb in resource name
GET    /v1/getBookings
POST   /v1/sendMessage
```

### Reserved Paths

| Path | Purpose |
|------|---------|
| `/v1/health` | Health check (unauthenticated) |
| `/v1/auth/*` | Auth-related endpoints |
| `/v1/admin/*` | Admin-only endpoints |
| `/v1/public/*` | Explicitly unauthenticated endpoints |

---

## 3) operationId Naming Conventions

Every endpoint must have a unique `operationId` for code generation.

### Format

```
{action}{Resource}{Subresource?}
```

- Action: `create`, `get`, `list`, `update`, `delete`, `verify`, `activate`, `upload`
- Resource: PascalCase singular
- Subresource: PascalCase singular (if applicable)

### Compliant Examples

```yaml
# POST /v1/bookings
operationId: createBooking

# GET /v1/bookings
operationId: listBookings

# GET /v1/bookings/{bookingId}
operationId: getBooking

# PUT /v1/bookings/{bookingId}
operationId: updateBooking

# DELETE /v1/bookings/{bookingId}
operationId: deleteBooking

# POST /v1/bookings/{bookingId}/messages
operationId: createBookingMessage

# GET /v1/otl/{token}/activate
operationId: activateOtl

# GET /v1/prescriptions/{prescriptionId}/verify
operationId: verifyPrescription
```

### Non-Compliant Examples

```yaml
# Bad: Verb not at start
operationId: bookingCreate

# Bad: Includes HTTP method
operationId: postBooking

# Bad: kebab-case or snake_case
operationId: create-booking
operationId: create_booking

# Bad: Ambiguous action
operationId: handleBooking
operationId: processMessage
```

---

## 4) Request Envelope Rules

### Request Body Structure

All request bodies must be JSON objects at the root level.

```yaml
# Compliant: Object at root
requestBody:
  content:
    application/json:
      schema:
        type: object
        required:
          - patientId
          - serviceType
        properties:
          patientId:
            type: string
          serviceType:
            type: string
```

```yaml
# Non-Compliant: Array at root
requestBody:
  content:
    application/json:
      schema:
        type: array
        items:
          type: object
```

### Required Fields

- Mark fields as `required` in schema when absence would cause failure
- Document default values for optional fields
- Never silently ignore unknown fields in strict mode

---

## 5) Response Envelope Rules

### Success Response Structure

All success responses use a consistent envelope:

```yaml
components:
  schemas:
    SuccessResponse:
      type: object
      required:
        - data
        - meta
      properties:
        data:
          description: Response payload (object or array)
        meta:
          type: object
          required:
            - requestId
          properties:
            requestId:
              type: string
              description: Unique request identifier for tracing
            timestamp:
              type: string
              format: date-time
            pagination:
              $ref: '#/components/schemas/Pagination'
```

### Compliant Success Response

```json
{
  "data": {
    "bookingId": "bk_abc123",
    "status": "confirmed",
    "createdAt": "2026-04-16T10:30:00Z"
  },
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2026-04-16T10:30:00Z"
  }
}
```

### List Response with Pagination

```json
{
  "data": [
    { "bookingId": "bk_abc123", "status": "confirmed" },
    { "bookingId": "bk_def456", "status": "pending" }
  ],
  "meta": {
    "requestId": "req_xyz789",
    "timestamp": "2026-04-16T10:30:00Z",
    "pagination": {
      "limit": 20,
      "offset": 0,
      "total": 42,
      "hasMore": true
    }
  }
}
```

### Non-Compliant Responses

```json
// Bad: No envelope, raw data at root
{
  "bookingId": "bk_abc123",
  "status": "confirmed"
}

// Bad: Missing requestId in meta
{
  "data": { "bookingId": "bk_abc123" },
  "meta": { "timestamp": "2026-04-16T10:30:00Z" }
}

// Bad: Array at root
[
  { "bookingId": "bk_abc123" }
]
```

---

## 6) Standard Error Envelope

All error responses must use this structure (per ADR-09):

```yaml
components:
  schemas:
    ErrorResponse:
      type: object
      required:
        - error
      properties:
        error:
          type: object
          required:
            - code
            - message
            - requestId
          properties:
            code:
              type: string
              description: Machine-readable error code (SCREAMING_SNAKE_CASE)
            message:
              type: string
              description: Human-readable error message (no PHI)
            requestId:
              type: string
              description: Correlation ID for tracing
            details:
              type: object
              description: Additional context (field errors, constraints)
            retryable:
              type: boolean
              description: Whether client should retry
```

### Error Code Format

Use `SCREAMING_SNAKE_CASE` for error codes:

| Category | Pattern | Examples |
|----------|---------|----------|
| Validation | `INVALID_*` | `INVALID_PAYLOAD`, `INVALID_DATE_RANGE` |
| Auth | `AUTH_*` | `AUTH_TOKEN_EXPIRED`, `AUTH_INSUFFICIENT_ROLE` |
| Resource | `RESOURCE_*` | `RESOURCE_NOT_FOUND`, `RESOURCE_ALREADY_EXISTS` |
| State | `STATE_*` | `STATE_CONFLICT`, `STATE_EXPIRED` |
| Rate | `RATE_*` | `RATE_LIMIT_EXCEEDED` |
| Server | `INTERNAL_*` | `INTERNAL_ERROR`, `INTERNAL_TIMEOUT` |

### Compliant Error Response

```json
{
  "error": {
    "code": "INVALID_PAYLOAD",
    "message": "Request validation failed",
    "requestId": "req_xyz789",
    "details": {
      "fields": [
        { "field": "scheduledAt", "reason": "Must be in the future" },
        { "field": "serviceType", "reason": "Unknown service type" }
      ]
    },
    "retryable": false
  }
}
```

### Non-Compliant Error Responses

```json
// Bad: PHI in error message
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Patient John Doe with SSN 123-45-6789 not found"
  }
}

// Bad: No error code
{
  "message": "Something went wrong"
}

// Bad: camelCase error code
{
  "error": {
    "code": "invalidPayload"
  }
}

// Bad: Stack trace exposed
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Error at line 42 in bookingHandler.ts"
  }
}
```

---

## 7) Required Status Code Behavior

| Code | When to Use | Body Required |
|------|-------------|---------------|
| 200 | GET success, PUT success | Yes (SuccessResponse) |
| 201 | POST created resource | Yes (SuccessResponse with created resource) |
| 202 | Accepted for async processing | Yes (SuccessResponse with operation ID) |
| 204 | DELETE success, no content | No |
| 400 | Malformed request syntax | Yes (ErrorResponse) |
| 401 | Missing/invalid authentication | Yes (ErrorResponse) |
| 403 | Valid auth, insufficient permissions | Yes (ErrorResponse) |
| 404 | Resource not found | Yes (ErrorResponse) |
| 409 | Conflict (idempotency collision, state) | Yes (ErrorResponse) |
| 422 | Semantic validation error | Yes (ErrorResponse with field details) |
| 429 | Rate limited | Yes (ErrorResponse with retry-after) |
| 500 | Internal server error | Yes (ErrorResponse, no internals exposed) |
| 502 | Upstream service failure | Yes (ErrorResponse) |
| 503 | Service unavailable | Yes (ErrorResponse with retry-after) |
| 504 | Gateway timeout | Yes (ErrorResponse) |

### 401 vs 403 Decision

- **401 Unauthorized**: Token missing, expired, or invalid signature
- **403 Forbidden**: Token valid, but user lacks required role or resource access

### 400 vs 422 Decision

- **400 Bad Request**: Malformed JSON, missing required header, wrong content type
- **422 Unprocessable Entity**: Valid JSON, but semantic validation failed (e.g., date in past, unknown enum)

---

## 8) Idempotency-Key Rules

Per ADR-20260416-12, all write operations require idempotency.

### Required Header

```yaml
parameters:
  - name: Idempotency-Key
    in: header
    required: true
    schema:
      type: string
      format: uuid
      minLength: 36
      maxLength: 36
    description: |
      Client-generated UUID v4 for idempotent writes.
      - Same key within 24 hours returns cached response
      - Different payload with same key returns 409 Conflict
```

### Applies To

| Method | Idempotency-Key Required |
|--------|--------------------------|
| POST | Yes |
| PUT | Yes |
| PATCH | Yes |
| DELETE | Yes (for state-changing deletes) |
| GET | No |

### Backend Behavior

1. Check if `idempotencyKey` exists in DynamoDB
2. If exists with same payload hash: return cached response
3. If exists with different payload hash: return 409 Conflict
4. If not exists: process request, store result with 24h TTL
5. Store: `idempotencyKey`, `payloadHash`, `response`, `createdAt`, `ttl`

### Compliant Request

```http
POST /v1/bookings HTTP/1.1
Authorization: Bearer eyJ...
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{"patientId": "pt_123", "serviceType": "general"}
```

### Non-Compliant Requests

```http
# Bad: Missing Idempotency-Key header
POST /v1/bookings HTTP/1.1
Authorization: Bearer eyJ...

# Bad: Invalid UUID format
POST /v1/bookings HTTP/1.1
Idempotency-Key: not-a-uuid

# Bad: Reusing key with different payload (returns 409)
POST /v1/bookings HTTP/1.1
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

{"patientId": "pt_456", "serviceType": "specialist"}
```

---

## 9) Cognito JWT Security Documentation

Per ADR-20260416-13, all protected endpoints use Cognito JWT with group-based RBAC.

### Security Scheme

```yaml
components:
  securitySchemes:
    cognitoAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: |
        Cognito JWT with claims:
        - sub: User ID
        - cognito:groups: Array of roles [patient, doctor, admin]
        - email: User email
```

### Role Documentation Requirement

Every protected endpoint must document required roles in the description:

```yaml
paths:
  /v1/bookings:
    post:
      summary: Create a booking
      description: |
        Creates a new consultation booking.
        
        **Required role**: `patient`
        
        **Assignment scope**: Own bookings only
      security:
        - cognitoAuth: []
```

### Role Matrix

| Role | Can Access |
|------|------------|
| `patient` | Own bookings, own documents, own chat |
| `doctor` | Assigned patient bookings, assigned consultations, create documents |
| `admin` | All resources, break-glass access, audit logs |

### Assignment Checks

Document assignment requirements explicitly:

```yaml
/v1/consultations/{consultId}/ai-logs:
  get:
    description: |
      Retrieve AI raw logs for consultation.
      
      **Required role**: `doctor` OR `admin`
      
      **Assignment scope**: 
      - Doctor must be assigned to consultation
      - Admin requires break-glass with reason
```

### Non-Compliant Security Documentation

```yaml
# Bad: No role documented
/v1/bookings:
  post:
    description: Creates a booking
    security:
      - cognitoAuth: []

# Bad: No assignment scope documented for scoped resource
/v1/consultations/{consultId}:
  get:
    description: |
      Get consultation details.
      **Required role**: doctor
    # Missing: Assignment scope
```

---

## 10) Correlation ID and Request ID Conventions

Every request must be traceable end-to-end.

### Request ID

- Generated by API Gateway or handler if not present
- Format: `req_` prefix + 20 character alphanumeric
- Included in all response `meta.requestId` and error responses
- Logged in all CloudWatch entries

### Correlation ID Header

```yaml
parameters:
  - name: X-Correlation-ID
    in: header
    required: false
    schema:
      type: string
      maxLength: 64
    description: |
      Optional client-provided correlation ID.
      If provided, used for distributed tracing.
      If not provided, requestId is used.
```

### Logging Requirements

All handler logs must include:

```json
{
  "requestId": "req_abc123xyz456",
  "correlationId": "client-provided-or-requestId",
  "userId": "sub-from-jwt",
  "path": "/v1/bookings",
  "method": "POST",
  "statusCode": 201,
  "durationMs": 142
}
```

---

## 11) Async Operation Contract Pattern

Per ADR-20260416-05, operations exceeding p95 latency target (5s for CDS) return queued status.

### Async Response Structure

```yaml
components:
  schemas:
    AsyncOperationResponse:
      type: object
      required:
        - data
        - meta
      properties:
        data:
          type: object
          required:
            - operationId
            - status
          properties:
            operationId:
              type: string
              description: Unique operation ID for polling
            status:
              type: string
              enum: [queued, processing, completed, failed]
            result:
              description: Present only when status is completed
            error:
              $ref: '#/components/schemas/ErrorResponse'
              description: Present only when status is failed
            estimatedCompletionSeconds:
              type: integer
              description: Estimated time to completion
        meta:
          $ref: '#/components/schemas/Meta'
```

### Sync-First, Async-Fallback Pattern

1. Client calls endpoint normally
2. Handler attempts sync completion within timeout (e.g., 5s for CDS)
3. If completes: return 200 with result
4. If times out: return 202 with `operationId` and `status: queued`
5. Client polls `/v1/operations/{operationId}` for result

### Compliant Async Response (202)

```json
{
  "data": {
    "operationId": "op_cds_abc123",
    "status": "queued",
    "estimatedCompletionSeconds": 10
  },
  "meta": {
    "requestId": "req_xyz789"
  }
}
```

### Polling Endpoint

```yaml
/v1/operations/{operationId}:
  get:
    operationId: getOperation
    description: |
      Poll async operation status.
      
      **Required role**: Same as original operation
    responses:
      200:
        description: Operation status
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/AsyncOperationResponse'
```

---

## 12) Realtime + HTTP Fallback Contract Pattern

Per ADR-20260416-04, realtime uses WebSocket with HTTP fallback.

### Dual-Path Design

Every realtime feature must have an HTTP fallback:

| Realtime (WebSocket) | HTTP Fallback |
|---------------------|---------------|
| `ws://` connect | N/A |
| Send message event | `POST /v1/bookings/{id}/messages` |
| Receive message event | `GET /v1/bookings/{id}/messages?since={timestamp}` |
| Presence event | `GET /v1/bookings/{id}/presence` |
| Typing indicator | `POST /v1/bookings/{id}/typing` (optional) |

### Message Contract (HTTP Fallback)

```yaml
/v1/bookings/{bookingId}/messages:
  get:
    operationId: listBookingMessages
    description: |
      List messages for booking (HTTP fallback for realtime).
      
      **Required role**: `patient` OR `doctor`
      
      **Assignment scope**: Participant in booking
    parameters:
      - name: since
        in: query
        schema:
          type: string
          format: date-time
        description: Return messages after this timestamp (for polling)
      - name: limit
        in: query
        schema:
          type: integer
          default: 50
          maximum: 100
    responses:
      200:
        description: Messages list
        
  post:
    operationId: createBookingMessage
    description: |
      Send message to booking (HTTP fallback for realtime).
      
      **Write-before-emit**: Message persisted before delivery attempted.
```

### Write-Before-Emit Requirement

All chat/message endpoints must:

1. Persist message to DynamoDB first
2. Attempt WebSocket delivery
3. Return success regardless of delivery status
4. Client uses polling fallback if WebSocket disconnected

### Reconnect Hydration Endpoint

```yaml
/v1/bookings/{bookingId}/state:
  get:
    operationId: getBookingState
    description: |
      Get current booking state for reconnection hydration.
      Returns all state needed to restore client after disconnect.
```

---

## 13) PHI-Safe Public Endpoint Rules

Per blueprint, public prescription verification must not leak PHI.

### Public Endpoint Requirements

1. **No authentication required** but rate-limited
2. **Minimal data exposure**: Only verification status and non-PHI metadata
3. **No enumeration**: Opaque tokens, no sequential IDs
4. **Audit logged**: All access logged for security review

### Compliant Public Endpoint

```yaml
/v1/public/prescriptions/{verificationCode}/verify:
  get:
    operationId: verifyPrescription
    security: []  # Explicitly unauthenticated
    description: |
      Public prescription verification.
      
      **Authentication**: None (public endpoint)
      
      **Rate limit**: 10 requests/minute per IP
      
      **PHI exposure**: None - returns only verification status
    parameters:
      - name: verificationCode
        in: path
        required: true
        schema:
          type: string
          minLength: 32
          maxLength: 64
        description: Opaque verification code (not prescription ID)
    responses:
      200:
        description: Verification result
        content:
          application/json:
            schema:
              type: object
              properties:
                data:
                  type: object
                  properties:
                    verified:
                      type: boolean
                    issuedAt:
                      type: string
                      format: date-time
                    validUntil:
                      type: string
                      format: date-time
                    issuerName:
                      type: string
                      description: Doctor name (public info on prescription)
```

### Non-Compliant Public Response (PHI Leak)

```json
// Bad: Exposes patient PHI
{
  "data": {
    "verified": true,
    "patientName": "John Doe",
    "patientDob": "1990-01-15",
    "diagnosis": "Hypertension",
    "medications": ["Lisinopril 10mg"]
  }
}
```

### Compliant Public Response

```json
{
  "data": {
    "verified": true,
    "issuedAt": "2026-04-15T10:00:00Z",
    "validUntil": "2026-05-15T10:00:00Z",
    "issuerName": "Dr. Jane Smith"
  },
  "meta": {
    "requestId": "req_public_xyz789"
  }
}
```

---

## 14) Contract Review Checklist

Use this checklist for all contract PRs:

### Structure and Naming

- [ ] Route follows `/{version}/{resource}/{id}/{subresource}` pattern
- [ ] Resource names are plural, lowercase, kebab-case
- [ ] operationId follows `{action}{Resource}{Subresource}` pattern
- [ ] operationId is unique across entire spec

### Request/Response

- [ ] Request body is JSON object (not array) at root
- [ ] Success response uses `{ data, meta }` envelope
- [ ] Error response uses standard `{ error }` envelope
- [ ] `meta.requestId` included in all responses
- [ ] Pagination included for list endpoints

### Security

- [ ] Security requirement documented (`security: [cognitoAuth: []]` or `security: []`)
- [ ] Required role documented in description
- [ ] Assignment scope documented for scoped resources
- [ ] Public endpoints explicitly marked and PHI-safe

### Idempotency

- [ ] Write operations (POST/PUT/PATCH/DELETE) have `Idempotency-Key` header
- [ ] 409 response documented for idempotency conflicts

### Async Operations

- [ ] Long-running operations support 202 Accepted response
- [ ] Polling endpoint documented for async operations
- [ ] `estimatedCompletionSeconds` included in async response

### Realtime

- [ ] HTTP fallback endpoint exists for realtime features
- [ ] Reconnect hydration endpoint documented
- [ ] Write-before-emit behavior documented for chat/message endpoints

### Error Handling

- [ ] All error codes use `SCREAMING_SNAKE_CASE`
- [ ] No PHI in error messages
- [ ] `retryable` field included where appropriate
- [ ] All possible error codes documented per endpoint

### Observability

- [ ] `X-Correlation-ID` header documented
- [ ] `requestId` in all responses
- [ ] Logging requirements met

---

## 15) Unresolved Items

The following items are intentionally not locked in this document pending ADR acceptance:

| Item | Pending ADR | Notes |
|------|-------------|-------|
| DynamoDB `app_core` internal schema | ADR-20260416-10 (Proposed) | API contracts do not depend on table internals |
| Lambda packaging model | ADR-20260416-11 (Proposed) | Does not affect API contract design |

Locked elsewhere: CDS inference is **ADR-20260525-01** + **`architecture/AI_INFERENCE.md`** (AI Architecture PRD; Together.ai; no Bedrock).

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2026-04-16 | Initial version | Backend/Cloud/AI Engineer |
