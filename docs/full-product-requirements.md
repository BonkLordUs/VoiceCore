# VoiceCore — Full Product Requirements

This document is the canonical implementation checklist for VoiceCore. It consolidates the complete product requirements supplied for the project and maps them to production architecture. The existing foundation must be extended incrementally; do not replace working code unnecessarily.

## Product
- Name: VoiceCore
- Currency: VH Coins
- Premium: Core Premium
- Goal: production-ready, scalable messenger with private/group chat, voice/video calls, anonymous text/voice matching, moderation, economy, referrals, gifts, premium, privacy, roles and administration.
- Priority: security, privacy, correct financial accounting, correct permissions, scalability, reliability, UX, visual polish.

## Identity and authentication
- Permanent numeric User ID; never changes after account creation.
- Phone registration: phone -> OTP -> verification -> account/profile setup.
- Email registration creates PENDING_EMAIL_REVIEW until approved/rejected/requested-info/suspended by authorized staff.
- Username: unique; default 5-32 chars; configurable min/max/pattern; changing policy must not invalidate existing usernames.
- Profile: avatar, banner, display name, username, permanent ID, bio, DOB/age, interests, gifts, Premium, status, role badge, referral information.
- Hide Rank is presentation-only; backend retains actual role.

## Privacy and Streamer Mode
Privacy settings:
- phone: Everyone/Contacts/Nobody, default Nobody
- email: Everyone/Contacts/Nobody, default Nobody
- DOB: full date/age only/date without year/nobody
- avatar/banner/online/last seen: Everyone/Contacts/Nobody
- User ID, gifts, gift sender, VH balance, Premium, referral information: visible/hidden
Privacy is enforced in server response serialization; hidden fields are never sent to unauthorized clients.
Creator/Admin access to sensitive data is permission-gated and audited.

Streamer Mode is device-local and only changes presentation. It can hide IDs, usernames, phone/email, referral codes/links, transaction IDs, VH balances, notification previews, message previews and other private account data.

## Roles and permissions
Hierarchy: Creator > Admin > Moderator > Helper > User.
Use explicit permissions, never role-name checks in clients.
Required permission families include:
USER_VIEW, USER_VIEW_PRIVATE_DATA, USER_VIEW_PHONE, USER_VIEW_EMAIL, USER_VIEW_DOB, USER_VIEW_TRANSACTIONS, USER_VIEW_REFERRALS,
CHAT_MODERATE, CHAT_HISTORY_ACCESS, MESSAGE_DELETE,
REPORT_VIEW, REPORT_MANAGE,
BAN_USER, MUTE_USER, RESTRICT_USER,
ROLE_ASSIGN, ROLE_REMOVE,
FINANCE_VIEW, FINANCE_MANAGE,
REFERRAL_MANAGE, PREMIUM_MANAGE, GIFTS_MANAGE,
SYSTEM_SETTINGS, AUDIT_LOG_VIEW.
Creator can manage permissions. Admin->Moderator and Moderator->Helper changes use approval workflows.

## Administration
Creator panel:
Dashboard, Users, Transactions, VH Coins, Referrals, Roles, Permissions, Reports, Moderation, Anonymous, Gifts, Premium, Analytics, Audit Logs, System Settings.
Admin panel:
Dashboard, Users, Reports, Moderation, Chats, Roles, Moderator Applications, Audit Logs.
Moderator:
Reports, Anonymous Rooms, Users, Moderation, Helper Applications.
Helper:
Reports, Support, Anonymous Rooms.
Only permission-authorized actions are visible/usable.

User management:
- Search by ID, username, display name, phone, email.
- Filters: role, account status, Premium, registration date, birthday, country, VH balance, top-up, spending, referrals, reports, last active.
- Sort: newest, oldest, birthday, balance, donations, spending, referrals, activity.
User admin card includes identity, role/permissions, wallet, referrals/revenue, Premium, reports, restrictions, account status, sessions/chats where authorized.
Actions include profile, transactions, referrals, reports, sessions, all chats, role/permission changes, hide rank, ban/unban, restrict, delete.

## Account deletion
Do not destroy audit trail. Support TEMPORARILY_DELETED and PERMANENTLY_DELETED. Preserve permanent User ID. Message/history handling follows an explicit retention policy.

## Messaging
Private and group chats support:
text, emoji, reactions, reply, edit, delete, forward, pin, files, images, video, voice messages, links, mentions, message search, report.
Realtime: WebSocket delivery, presence, typing, read receipts and call signaling.
Use WebRTC for voice/video, with scalable realtime/SFU architecture for group calls.

## Anonymous
Dedicated Anonymous section:
- Anonymous Text
- Anonymous Voice
Matching preferences: age range, gender preference, interests, language, optional region.
Use a matchmaking service. Expose minimum information.
Anonymous Text actions: Next, Report, Block, End.
Anonymous Voice states: Searching, Connected; Mute, Next, Report, End.
Age safety: minimum 13+. 18+ features/rooms require 18+ gating and minors must never be paired into 18+ rooms.

## Moderation and reports
Automated moderation pipeline for images, videos, avatars, banners, messages, profiles, supported voice content and user reports.
Statuses: SAFE, REVIEW, REJECT, BLOCK.
Always retain a manual moderation queue.
Reports may target user, message, image, video, profile, group, anonymous user, voice room or call.
Categories: Spam, Harassment, Threats, NSFW, Scam, Hate/Abuse, Illegal Content, Impersonation, Other.
Report fields: ID, reporter, target user/message, category, description, evidence, timestamps, status, assignee, resolution.
Statuses: PENDING, REVIEWING, RESOLVED, REJECTED, ESCALATED.

## VH Coins
VH Coins are server-authoritative and used for gifts, Premium, transfers and platform features.
Configurable top-up packages include 100, 500, 1,000, 5,000, 10,000, 25,000 and 50,000 VH.
Transactions store ID, user, type, amount, currency, VH amount, fee, status, timestamp.
Transfers use a configurable 5% default fee: sending 1000 VH costs sender 1050 VH, recipient receives 1000 VH, platform receives 50 VH.
All economic operations are atomic and go through Transaction Service.
Use database transactions/locks, idempotency keys and immutable ledger history. Never mutate balance directly from frontend.

Transaction types:
TOP_UP, REFERRAL_REWARD, REFERRAL_DISCOUNT, GIFT_PURCHASE, GIFT_RECEIVED, COIN_TRANSFER, TRANSFER_FEE, PREMIUM_PURCHASE, REFUND, ADMIN_ADJUSTMENT.

Creator-authorized balance adjustments require amount, target User ID, reason, actor ID and timestamp, and create an Audit Log.

## Gifts
Gift Store with configurable gifts such as Heart, Rose, Diamond, Crown, Rocket, Fire, Cat, Gaming Gift and Birthday Gift.
Gift fields: ID, name, animation, icon, price, rarity, description, active.
Users can buy for self or another user.
Receiver can hide gift from profile. Sender can send anonymously.

## Referrals
Each user has a referral link and code; both map to the same referral relationship.
User can bind only one direct referrer. Self-referral is rejected. Referrer cannot be changed by the user after confirmation except authorized admin override.
Referral profile:
- Who invited me
- My referrals
- Referral descendants according to privacy rules
- revenue and join date
Hidden identities render as Anonymous User while revenue remains accounted.

Support multi-level referral relationships (Level 1, Level 2, and future levels).
Default example:
- Level 1 = 10%
- Level 2 = 5% + 10 VH
Do not hardcode economic values.
Creator configuration fields:
Level, Percentage, Fixed VH Bonus, Minimum Top-Up, Maximum Reward, Active/Inactive.
Every rules change creates a new immutable rule version; historical rewards retain the rule version used.
Referral revenue views include total, monthly, per-level and transaction history.
Creator can inspect referral network trees.
Anti-fraud:
- reject self-referral
- one direct referrer
- suspicious linked accounts -> review
- configurable minimum top-up/account age
- Creator can cancel reward
- all reward changes audited
- never rely on IP alone for fraud detection.

## Core Premium
Premium is cosmetic/additional user functionality and never grants administrative rights.
Features may include custom profile, banner, avatar frame, animated avatar, Premium badge, custom status, Premium themes, custom theme, chat customization and additional profile customization.
Themes: Light, Dark, Premium Purple, Custom Premium.
Custom Premium Theme controls:
Primary Color, Accent Color, Background, Message Bubble, Incoming Message, Outgoing Message, Button Color, Text Color, Secondary Text, Profile Color.
Support Preview/Save/Reset and multiple saved themes.
Premium profile supports avatar, banner, background, frame, name color, custom status, badge and profile theme.

## Dashboard and analytics
Creator dashboard metrics:
Total Users, Online Users, New Users, Premium Users, VH Coins in Circulation, Today's Transactions, Today's Revenue, Reports, Banned Users, Referral Revenue, Gift Sales.
Charts:
new users, active users, DAU, MAU, top-ups, VH circulation, gifts, Premium, referrals, reports.

## Audit and private access
Audit:
role changes, permission changes, bans/unbans, account deletion/restoration, balance adjustments, transaction actions, referral adjustments, sensitive-data access, chat-history access, moderation decisions and report decisions.
Private chat access requires a permission, explicit reason and confirmation before opening. Never expose this feature to ordinary users.

## Database
Keep a normalized relational model. Required domains/tables include:
users, profiles, phone_verifications, email_verifications,
roles, permissions, role_permissions, user_roles, user_permissions,
sessions, devices,
privacy_settings, streamer_settings,
chats, chat_members, messages, message_reactions, attachments,
calls, call_participants,
anonymous_sessions, anonymous_interests, interest_catalog,
reports, report_evidence,
wallets, transactions, coin_transfers,
gifts, gift_inventory, gift_transactions,
premium_subscriptions, premium_features,
referral_codes, referral_relationships, referral_rules, referral_rule_versions, referral_rewards,
bans, restrictions, admin_actions, audit_logs, notifications.
Referral relationships must preserve ancestor/referrer/referred user, level, status and timestamps. Rewards preserve transaction, beneficiary, source, level, percentage/fixed/total reward and rule version.

## Security
Required controls:
HTTPS/TLS, secure sessions, password hashing if passwords are used, OTP rate limiting, brute-force protection, API rate limiting, CSRF protection where applicable, XSS protection, SQL injection protection, input validation, upload validation, MIME verification, malware scanning, server-side permission checks, audit logs, encryption of sensitive data where appropriate, secure secret management, backups and monitoring.
Uploads validate MIME, extension, size, dimensions, content and malware. Never trust client filenames.

## Notifications and sessions
Notifications:
new message, new call, missed call, gift, referral reward, Premium, report result, moderation warning, role change, security login, account action.
Streamer Mode hides notification previews locally.
Session management shows device, last active and appropriate approximate location/IP information; support Terminate Session and Log out all devices.

## UX and frontend
Main navigation:
Chats, Anonymous, Gifts, Profile; authorized staff also see Admin/Creator.
Profile navigation:
Overview, Referrals, Gifts, Wallet, Premium, Privacy, Security, Appearance, Settings.
Responsive, mobile-first, desktop-friendly, accessible, component-based.
Reusable components include Avatar, UserCard, MessageBubble, ChatList, ChatHeader, Modal, Drawer, Dropdown, ReportModal, GiftCard, WalletCard, ReferralTree, AdminTable, TransactionTable, UserManagementPanel, ThemeSelector and PrivacySettings.
Admin tables require search, filters, sorting, pagination, loading, empty/error states and confirmation dialogs.
Do not expose stack traces. Use safe user-facing errors and backend monitoring.
Use skeleton loaders and safe optimistic UI; never use optimistic UI for authoritative money/permission changes.

## Architecture
Recommended logical services:
Auth, User, Profile, Privacy, Chat, Realtime, Call, Anonymous Matchmaking, Moderation, Report, Wallet, Transaction, Referral, Gift, Premium, Notification, Admin, Audit.
Topology:
Client -> API Gateway -> domain services -> PostgreSQL, Redis/cache, object storage, realtime/WebRTC.
Keep modules/services logically separated. Use clean external-service interfaces and development mocks only when explicitly separated from production implementations.

## API and access control
Every endpoint checks:
1. authentication
2. account status
3. role
4. permissions
5. resource ownership
6. privacy rules
Never rely on frontend authorization.
REST or GraphQL is acceptable if contracts are explicit.
Realtime uses WebSocket for delivery/presence/typing/read receipts/signaling and WebRTC for calls.

## Testing
Unit tests:
referral calculation, VH calculations, transaction service, permission service, privacy service, gift purchase, Premium.
Integration:
registration, OTP, referral binding, top-up, transfer, gifts, role assignment, reports.
Security:
unauthorized access, IDOR, permission escalation, balance manipulation, referral abuse, rate limiting.

## Seed/configuration
Development seed:
Creator, Admin, Moderator, Helper, User.
Interests include Gaming, Music, Movies, Sports, Technology, Programming, Travel, Cars, Art, Education, Books, Anime.
Seed sample gifts, Premium and referral rules.
All mutable values live in configuration/database, including username policy, referral percentages/fixed bonuses, transfer fee, Premium price and minimum age. Creator may edit allowed settings through UI.

## Delivery phases
1. Architecture + database + authentication
2. Profiles + privacy + usernames
3. Private/group chats
4. Realtime + calls
5. Anonymous system
6. Moderation + reports
7. VH Coins + transactions
8. Referral system
9. Gifts
10. Core Premium + themes
11. Admin/Creator dashboards
12. Security + testing + optimization

## Definition of done
VoiceCore is not a one-screen mock. Each production feature must have:
- server-side authorization
- persistence and migrations where applicable
- API contract
- error/empty/loading states
- audit trail where sensitive
- tests for critical logic
- configurable business rules
- production adapter boundaries for external services
- documentation of security/privacy implications
