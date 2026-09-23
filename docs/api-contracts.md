# API Contracts (v1)

All endpoints require TLS, JSON, a request ID and authenticated endpoints require a bearer access token. Mutations use `Idempotency-Key`; authorization errors deliberately do not disclose private resource existence.

| Method/path | Service | Contract |
| --- | --- | --- |
| `POST /v1/auth/phone/otp` | Auth | rate-limited OTP challenge; never returns OTP |
| `POST /v1/auth/phone/verify` | Auth | consumes challenge and creates active phone account |
| `POST /v1/auth/email/register` | Auth | creates `PENDING_EMAIL_REVIEW` account |
| `GET /v1/users/:publicId/profile` | Profile | response fields filtered by requester privacy/permissions |
| `POST /v1/chats` | Chat | membership checked; private chat deduplicated server-side |
| `POST /v1/chats/:id/messages` | Chat | validates membership, content and moderation state |
| `POST /v1/wallet/transfers` | Transaction | `{recipientPublicId, amountVH}`; locks wallets and charges configured fee |
| `POST /v1/gifts/purchases` | Gift | wallet workflow; atomic gift inventory and ledger records |
| `POST /v1/referrals/bind` | Referral | one direct referrer, self-reference rejected, fraud review supported |
| `POST /v1/reports` | Report | immutable evidence reference plus moderation workflow |
| `POST /v1/admin/users/:id/chat-access` | Admin | requires reason, permission and audit record before issuing scoped view |

Errors use `{ "error": { "code": "FORBIDDEN", "message": "Something went wrong. Try again.", "requestId": "…" } }`. Detailed exceptions remain server-side.
