-- Local development only. Creates two password-authenticated test users.
-- No phone numbers, SMS, email verification, payments, or external providers are required.
CREATE TABLE IF NOT EXISTS dev_credentials (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  password_salt text NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO users(public_id, status)
VALUES
  (1000000001, 'ACTIVE'),
  (1000000002, 'ACTIVE')
ON CONFLICT (public_id) DO NOTHING;

INSERT INTO profiles(user_id, username, display_name, bio)
SELECT id, 'alexvc', 'Alex Volkov', 'VoiceCore local test account'
FROM users WHERE public_id=1000000001
ON CONFLICT (username) DO NOTHING;

INSERT INTO profiles(user_id, username, display_name, bio)
SELECT id, 'mayavc', 'Maya Chen', 'VoiceCore local test account'
FROM users WHERE public_id=1000000002
ON CONFLICT (username) DO NOTHING;

INSERT INTO privacy_settings(user_id)
SELECT id FROM users WHERE public_id IN (1000000001,1000000002)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO streamer_settings(user_id)
SELECT id FROM users WHERE public_id IN (1000000001,1000000002)
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO wallets(user_id, balance_vh)
SELECT id, 2840 FROM users WHERE public_id=1000000001
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO wallets(user_id, balance_vh)
SELECT id, 2840 FROM users WHERE public_id=1000000002
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO dev_credentials(user_id, password_salt, password_hash)
SELECT id, 'n8lj3vyZsr+kSOBA3CxQnw==', 'Dv1Fu9ycdMxiWA+sMsdX5fDea4PC9s+4TZaUa2i3/HbZ7UGPDGj29N2vfa23BLvlKA2YJGmRRKjBfPz+DSPsQQ=='
FROM users WHERE public_id=1000000001
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO dev_credentials(user_id, password_salt, password_hash)
SELECT id, 'iHVHGwjgZGgb7u3sHYdlTw==', 'dPLErk8wPkVOk4EvlGxFPt6bDy4ENuyjU50cQMUw5tPHIsbb3Q/UIXeIy7Or7mjyY1CaOKN5z56+C7CCZDSOLQ=='
FROM users WHERE public_id=1000000002
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO chats(kind, title, created_by)
SELECT 'PRIVATE', 'Alex & Maya', u.id
FROM users u WHERE u.public_id=1000000001
AND NOT EXISTS (
  SELECT 1 FROM chats c WHERE c.title='Alex & Maya' AND c.kind='PRIVATE'
);

INSERT INTO chat_members(chat_id, user_id)
SELECT c.id, u.id
FROM chats c CROSS JOIN users u
WHERE c.title='Alex & Maya' AND c.kind='PRIVATE'
  AND u.public_id IN (1000000001,1000000002)
ON CONFLICT DO NOTHING;

INSERT INTO messages(chat_id, sender_id, body)
SELECT c.id, u.id, 'Local VoiceCore messenger is ready. Send me a message from the other device.'
FROM chats c JOIN users u ON u.public_id=1000000002
WHERE c.title='Alex & Maya' AND c.kind='PRIVATE'
  AND NOT EXISTS (SELECT 1 FROM messages m WHERE m.chat_id=c.id);
