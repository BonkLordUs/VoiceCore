# Security Model

- **Authentication:** OTP challenges are hashed, single-use, short-lived and rate limited by account/device/risk signals. Sessions are rotated, revocable and bound to device metadata.
- **Privacy:** profile serialization is a server-side policy decision. Phone, email and DOB are encrypted at rest and decrypted only in a permission-checked path that writes an audit event.
- **Wallet:** transfer calculation uses configured fee basis points. The sender is debited for amount plus fee, recipient credited amount, platform credited fee, and all entries share an idempotency key and immutable transaction group.
- **Uploads:** clients receive scoped upload URLs only after authorization. The server verifies magic bytes, MIME, size and dimensions, scans malware, queues moderation, and only then marks the attachment publishable.
- **Abuse:** apply rate limits, device/account risk scoring, block lists and report queues. Anonymous matching enforces age and 18+ gates before pairing.
- **Operations:** sensitive reads, role changes, account actions and money operations are append-only audited with actor, target, reason, request ID and before/after metadata.
