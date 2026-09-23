# VoiceCore

VoiceCore is a security-first, real-time communications platform for private messaging, anonymous matching, VH Coins, gifts, referrals, Core Premium, and permission-governed operations.

## What is implemented in this foundation

- A responsive VoiceCore web shell with Chats, Anonymous, Gifts, Profile and Creator surfaces.
- Architecture, API, permissions and security contracts that keep client UI separate from server authorization.
- PostgreSQL migration baseline for identity, RBAC, privacy, chats, wallet ledger, referrals, moderation, and audit logs.
- Configurable platform settings and development seeds; no economic or authorization rule is trusted from the client.

## Stack and boundaries

The delivery is designed as a modular service architecture: a web client talks to an API gateway; domain services own authorization and writes; PostgreSQL is the source of truth; Redis handles ephemeral rate limiting/presence; object storage keeps media private; a horizontally scaled websocket layer handles realtime signaling. See [architecture](docs/architecture.md).

The current UI is dependency-free so it can run in restricted development environments. Production client and server work should be split into `apps/web`, `apps/api`, and independently deployable workers/services as described in the architecture.

## Run the web shell

```bash
python3 -m http.server 4173 --directory apps/web
# open http://localhost:4173
```

## Validate the foundation

```bash
python3 tests/validate_foundation.py
```

## Run the local client and API

```bash
python3 apps/api/server.py
# open http://localhost:8787
```

The local API and its limits are documented in [development API](docs/development-api.md).

## Phone installation and Android release

The web shell is an installable PWA when deployed over HTTPS. A separate Android host project is configured for the deployed PWA; use the [fast APK guide](docs/android-fast-track.md) for a private test APK and [mobile release](docs/mobile-release.md) for Play release requirements. A workspace/private-network address cannot be opened by arbitrary phones on the Internet.

## Database

The initial PostgreSQL schema is in `db/migrations/0001_foundation.sql`. Apply it through the deployment migration runner using a transaction-aware migration tool (for example Atlas, Flyway, or node-pg-migrate); do not run application DDL at startup in production.

## Security invariants

1. The browser never supplies trusted roles, permissions, balances, account status, premium state, or transaction result.
2. Wallet writes only occur in one serializable, idempotent Transaction Service workflow with immutable ledger records.
3. Private-data and chat-history access must be permission-checked, reason-bound, and audited.
4. Privacy filtering happens while building server responses, not by hiding fields in the UI.
5. External payment, OTP, malware scanning, and moderation providers are ports behind server-side adapters; development adapters cannot be selected in production.

See [API contracts](docs/api-contracts.md), [permission matrix](docs/permission-matrix.md), and [security model](docs/security.md).
