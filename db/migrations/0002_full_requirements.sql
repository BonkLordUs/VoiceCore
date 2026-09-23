-- VoiceCore phase 2: close gaps between foundation schema and full product requirements.
-- Apply with the normal migration runner inside a transaction.

CREATE TYPE dob_visibility AS ENUM ('FULL_DATE','AGE_ONLY','DATE_WITHOUT_YEAR','NOBODY');
ALTER TABLE profiles ALTER COLUMN username TYPE varchar(64);
ALTER TABLE privacy_settings
  ALTER COLUMN dob TYPE dob_visibility USING (
    CASE dob::text
      WHEN 'EVERYONE' THEN 'FULL_DATE'
      WHEN 'CONTACTS' THEN 'AGE_ONLY'
      ELSE 'NOBODY'
    END
  );
ALTER TABLE privacy_settings ALTER COLUMN dob SET DEFAULT 'NOBODY';

CREATE TABLE streamer_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  hide_user_ids boolean NOT NULL DEFAULT true,
  hide_usernames boolean NOT NULL DEFAULT false,
  hide_phone_numbers boolean NOT NULL DEFAULT true,
  hide_emails boolean NOT NULL DEFAULT true,
  hide_referral_codes boolean NOT NULL DEFAULT true,
  hide_referral_links boolean NOT NULL DEFAULT true,
  hide_transaction_ids boolean NOT NULL DEFAULT true,
  hide_vh_balances boolean NOT NULL DEFAULT true,
  hide_notification_previews boolean NOT NULL DEFAULT true,
  hide_message_previews boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  target_user_id uuid REFERENCES users(id),
  reason text NOT NULL,
  request_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE role_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL REFERENCES users(id),
  target_user_id uuid NOT NULL REFERENCES users(id),
  requested_role text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  decided_by uuid REFERENCES users(id),
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

CREATE TABLE helper_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  applicant_id uuid NOT NULL REFERENCES users(id),
  submitted_by uuid NOT NULL REFERENCES users(id),
  status text NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','REJECTED','CANCELLED')),
  decided_by uuid REFERENCES users(id),
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS target_id text;

CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON messages(chat_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status_created ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_created ON audit_logs(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_beneficiary_created ON referral_rewards(beneficiary_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, revoked_at, last_active_at DESC);

INSERT INTO permissions(code) VALUES
('USER_VIEW'),
('USER_VIEW_PRIVATE_DATA'),
('USER_VIEW_PHONE'),
('USER_VIEW_EMAIL'),
('USER_VIEW_DOB'),
('USER_VIEW_TRANSACTIONS'),
('USER_VIEW_REFERRALS'),
('CHAT_MODERATE'),
('CHAT_HISTORY_ACCESS'),
('MESSAGE_DELETE'),
('REPORT_VIEW'),
('REPORT_MANAGE'),
('BAN_USER'),
('MUTE_USER'),
('RESTRICT_USER'),
('ROLE_ASSIGN'),
('ROLE_REMOVE'),
('FINANCE_VIEW'),
('FINANCE_MANAGE'),
('REFERRAL_MANAGE'),
('PREMIUM_MANAGE'),
('GIFTS_MANAGE'),
('SYSTEM_SETTINGS'),
('AUDIT_LOG_VIEW')
ON CONFLICT (code) DO NOTHING;

INSERT INTO platform_settings(key,value)
VALUES
('username_min_length','5'),
('username_max_length','32'),
('coin_transfer_fee_percent','5'),
('minimum_age','13'),
('adult_age','18'),
('premium_price','0')
ON CONFLICT (key) DO NOTHING;
