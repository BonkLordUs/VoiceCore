# Architecture

## Deployment topology

```text
Web / mobile clients → API gateway → Auth | User/Profile/Privacy | Chat | Wallet/Transaction
                                      → Referral | Gift/Premium | Moderation/Report | Admin/Audit
                                     ↘ WebSocket signaling / presence ↔ WebRTC SFU
All stateful services → PostgreSQL; ephemeral presence, queues and rate limits → Redis
Media → signed object-storage uploads → malware scan + moderation pipeline → publish/quarantine
```

Services are stateless and scale horizontally. A transactional outbox, consumed by workers, publishes domain events only after a committed database transaction. Consumers deduplicate with event IDs. The gateway authenticates requests, but every domain service repeats account-status, permission, ownership, and privacy checks.

## Ownership and critical flows

| Domain | Source of truth | Non-negotiable rule |
| --- | --- | --- |
| Identity | `users`, `profiles`, sessions | permanent numeric `users.public_id` never changes |
| Authorization | RBAC tables and per-user grants | role labels are not permissions |
| Wallet | wallets + immutable transactions | balances are server-calculated under transaction locks |
| Referral | relationship closure rows + versioned rules | reward stores the version used for calculation |
| Media | object storage + moderation record | no public URL before scan and moderation policy permit it |
| Audit | append-only audit logs | sensitive reads require a reason and create an audit entry |

## Phased implementation plan

1. **Foundation:** migration system, phone/email auth ports, account statuses, RBAC, audit context.
2. **Profiles:** username policy/configuration, privacy response mapper, streamer mode kept only in device-local storage.
3. **Chat/realtime:** chat service, attachments pipeline, websocket delivery/read receipts, WebRTC signaling/SFU.
4. **Safety:** age gates, anonymous matcher, reports and automated/manual moderation queues.
5. **Economy:** payment webhooks, wallet-ledger workflows, transfers, gifts, premium.
6. **Growth/admin:** referrals, dashboards, permission-gated operations and observability.

## Production controls

Use TLS end-to-end, a secrets manager, encrypted data fields for phone/email/DOB, structured logs with PII redaction, backups with restore tests, SLO monitoring, WAF/rate limiting, worker DLQs, and quarterly access reviews. Publish an explicit retention policy before enabling chat-history administrator access.
