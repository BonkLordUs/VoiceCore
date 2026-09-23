# Fast track: install a separate VoiceCore Android app

The Android app is configured to open the deployed VoiceCore address:

```text
https://voice-core-x7mx.vercel.app/
```

## Create a test APK without installing Android Studio

1. Push this repository to GitHub.
2. In GitHub open **Actions → Android debug APK → Run workflow**.
3. When the workflow has completed, open its run and download the **voicecore-debug-apk** artifact.
4. Unzip it on your phone and install `app-debug.apk`. Android will ask you to allow the browser/file manager to install unknown apps.

The debug APK is suitable only for private testing; it is automatically signed with a temporary debug key. Never upload it to Google Play.

## What you must fix on Vercel first

The supplied URL currently returns an authorization response to external checks, so it may be protected by Vercel Deployment Protection. In Vercel project settings, make the production deployment public (or create a public production deployment). A mobile app cannot complete normal login through a protected Vercel preview URL.

## Google Play release

For Google Play, create a signing/upload key, configure it in GitHub Actions secrets, build a signed `.aab`, and submit through Play Console. The app URL must stay on a stable public HTTPS domain; use a custom domain before production rather than a preview-like Vercel address.
