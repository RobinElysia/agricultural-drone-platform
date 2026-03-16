# Backend Payload Limit Fix Notes v1.0.4

## Version Info
- Version: `v1.0.4`
- Date: `2026-03-12`
- Scope: Backend request body parsing and error handling for YOLO base64 image uploads.

## Problem Summary
When frontend uploads base64 images to `POST /api/yolo/detect`, backend throws:
- `PayloadTooLargeError: request entity too large`
- `type: 'entity.too.large'`
- default parser limit was `102400` bytes (`100kb`)

This blocks normal YOLO image detection for medium/large images.

## Root Cause
Express body parser in backend was initialized with defaults:
- `express.json()` default limit is `100kb`
- `express.urlencoded()` default limit is also too small for base64 image payloads

Base64 image payload (example ~700KB+) exceeds parser limit before route handler executes.

## Code Review Findings
1. `backend/src/index.ts`
- Request parser limit not configured for image payload scenario.

2. `backend/src/middleware/auth.ts`
- Global error handler did not explicitly map `entity.too.large` to a clear API response.

3. `backend/src/config/index.ts`
- No environment configuration entry for body size limit.

## Fix Implemented

### 1. Configurable request body limit
- Updated `backend/src/config/index.ts`
- Added:
  - `server.bodyLimit: process.env.BODY_LIMIT || '10mb'`

### 2. Apply parser limit in app bootstrap
- Updated `backend/src/index.ts`
- Changed:
  - `express.json({ limit: config.server.bodyLimit })`
  - `express.urlencoded({ extended: true, limit: config.server.bodyLimit })`

### 3. Friendly 413 error response
- Updated `backend/src/middleware/auth.ts`
- Added handling for:
  - `err.type === 'entity.too.large'`
  - `status/statusCode === 413`
- Returns a clear API message:
  - `Request body too large. Reduce image size or increase BODY_LIMIT.`

## Runtime Configuration
Set in backend `.env` if needed:

```env
BODY_LIMIT=10mb
```

Recommended range for current YOLO base64 upload flow:
- `5mb` to `20mb` depending on expected image size and concurrent load.

## Impact
- YOLO upload requests that previously failed at body-parser level can now reach controller logic.
- Oversized payloads now return clear, actionable 413 API responses.
- No route contract changes; frontend API usage remains unchanged.

## Validation
Basic checks performed:
1. Confirmed parser config wired to `config.server.bodyLimit`.
2. Confirmed 413 handling path added in global middleware.
3. Confirmed document + code consistency for `.env` knob (`BODY_LIMIT`).

Note:
- Repository still has unrelated historical TypeScript build issues outside this fix scope.

## Modified Files
- `backend/src/config/index.ts`
- `backend/src/index.ts`
- `backend/src/middleware/auth.ts`
