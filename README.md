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

## Phone installation and Android release

The web shell is an installable PWA when deployed over HTTPS. A signed Android host project and Play release instructions are available in [mobile release](docs/mobile-release.md). A workspace/private-network address cannot be opened by arbitrary phones on the Internet.

## Database

The initial PostgreSQL schema is in `db/migrations/0001_foundation.sql`. Apply it through the deployment migration runner using a transaction-aware migration tool (for example Atlas, Flyway, or node-pg-migrate); do not run application DDL at startup in production.

## Security invariants

1. The browser never supplies trusted roles, permissions, balances, account status, premium state, or transaction result.
2. Wallet writes only occur in one serializable, idempotent Transaction Service workflow with immutable ledger records.
3. Private-data and chat-history access must be permission-checked, reason-bound, and audited.
4. Privacy filtering happens while building server responses, not by hiding fields in the UI.
5. External payment, OTP, malware scanning, and moderation providers are ports behind server-side adapters; development adapters cannot be selected in production.

See [API contracts](docs/api-contracts.md), [permission matrix](docs/permission-matrix.md), and [security model](docs/security.md).


## Full product requirements

The complete VoiceCore product scope is now captured in [full product requirements](docs/full-product-requirements.md), covering identity, privacy, RBAC, chats, calls, anonymous matching, moderation, reports, VH Coins, gifts, referrals, Core Premium, administration, audit, security, testing and phased delivery.

Migration `0002_full_requirements.sql` extends the foundation with streamer settings, admin action records, role/helper approval workflows, configurable DOB visibility, operational indexes and the full permission/configuration seed.

Implementation remains incremental: preserve working code, keep production adapters separate from development mocks, and finish each phase with server-side authorization, persistence, contracts, tests and audit/privacy controls.

## Local two-account messenger test

This repository now includes a **development-only runnable messenger**: PostgreSQL, a small REST API, WebSocket realtime delivery, and the existing web UI are started together with Docker Compose.

### 1. Install prerequisites

Install:
- Docker Desktop (Windows/macOS) or Docker Engine + Compose (Linux)
- Git

### 2. Get the project

```bash
git clone https://github.com/BonkLordUs/VoiceCore.git
cd VoiceCore
```

### 3. Start everything

```bash
docker compose up --build
```

Wait until the log contains:

```
VoiceCore local dev: http://0.0.0.0:3000
```

### 4. Open it on the computer

Open:

```
http://localhost:3000
```

The login screen already contains two local accounts. No phone number, SMS, email verification, or payment provider is used.

| Account | Username | Password |
|---|---|---|
| Alex Volkov | `alexvc` | `Test1234!` |
| Maya Chen | `mayavc` | `Test1234!` |

### 5. Test two devices

Keep the Docker process running.

On the computer, sign in as **Alex**.

Find the computer's LAN IP:
- Windows: `ipconfig`
- macOS/Linux: `ip addr` (or `ifconfig`)

Look for an address such as `192.168.1.25`.

On the phone, connect to the **same Wi-Fi** and open:

```
http://192.168.1.25:3000
```

Replace the IP with the computer's actual LAN IP.

Sign in on the phone as **Maya**. Then send a message from either device. Messages are persisted in PostgreSQL and delivered to the other open client through WebSocket.

### 6. Stop / reset the local database

Stop:

```bash
docker compose down
```

To completely reset the local database and recreate the two test accounts/chat:

```bash
docker compose down -v
docker compose up --build
```

### What is live in this local test

- Two password-authenticated development accounts
- No phone numbers or SMS
- Persistent PostgreSQL chat history
- Login/session handling
- REST chat history and message creation
- WebSocket realtime message delivery
- Desktop + phone on the same LAN
- Existing VoiceCore UI, theme, profile and product shell

Voice/video, payments, anonymous matching, moderation workflows and production authentication providers remain separate product layers and are not enabled by this local messenger test.

**Important:** the credentials above are development credentials only. Do not deploy `DEV_MODE=true` or `dev_credentials` to production.
