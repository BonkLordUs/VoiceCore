# Local runnable VoiceCore API

`apps/api/server.py` is an executable development backend, not a fake browser mock. It persists users, chats, messages and call-room requests in SQLite, enforces bearer-token chat membership and exposes REST endpoints. It enables a real local client/server development loop without third-party packages.

```bash
python3 apps/api/server.py
# open http://localhost:8787
```

For the seeded development account it prints the token `dev-alex-token`. Registering publicly through the development route is intentionally not a production authentication method. Before deployment, replace it with the OTP provider, PostgreSQL data access layer, Redis rate limiting, realtime WebSocket gateway, object storage, payment webhook validation, moderation worker and WebRTC SFU specified in the architecture.

## Available endpoints

- `POST /api/v1/auth/development-register`
- `GET /api/v1/me`
- `GET`, `POST /api/v1/chats`
- `GET`, `POST /api/v1/chats/:id/messages`
- `POST /api/v1/chats/:id/calls`

Calls create an authenticated room request. Actual voice/video media needs a TURN service and SFU, which cannot be safely replaced by client-only code.
