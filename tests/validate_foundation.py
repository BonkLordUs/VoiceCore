from pathlib import Path
root = Path(__file__).parents[1]
sql = (root/'db/migrations/0001_foundation.sql').read_text()
for table in ['users','profiles','privacy_settings','wallets','transactions','referral_relationships','referral_rewards','audit_logs','reports']:
    assert f'CREATE TABLE {table} ' in sql, table
assert 'one_direct_referrer' in sql
assert "CHECK(sender_id<>recipient_id)" in sql
assert 'idempotency_key text UNIQUE NOT NULL' in sql
assert (root/'apps/web/index.html').exists()
assert (root/'.env.example').exists()
assert (root/'apps/web/manifest.webmanifest').exists()
assert (root/'apps/web/service-worker.js').exists()
assert (root/'apps/mobile-android/app/src/main/AndroidManifest.xml').exists()
assert 'https://voice-core-x7mx.vercel.app/' in (root/'apps/mobile-android/app/build.gradle.kts').read_text()
assert (root/'.github/workflows/android-debug-apk.yml').exists()
print('VoiceCore foundation contract checks passed.')
