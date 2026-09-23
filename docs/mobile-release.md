# Mobile delivery and APK release

VoiceCore is an installable PWA today and has a native Android host project at `apps/mobile-android` for Play distribution. A phone cannot reach the development server in this workspace: `172.31.x.x` is a private container address, not a public Internet address.

## Test on a phone now

1. Deploy `apps/web` to an HTTPS host (Cloudflare Pages, Vercel, Firebase Hosting, or an organization-controlled HTTPS domain).
2. Open the HTTPS URL on Android Chrome or iOS Safari. The service worker and manifest allow an **Install app / Add to Home Screen** prompt. The PWA requires HTTPS outside localhost.
3. Never expose the development `python3 -m http.server` process directly to public users. It has no authentication, TLS, access controls or production asset pipeline.

## Build a signed Android APK/AAB

Install Android Studio with Android SDK Platform 35, then set `VOICECORE_WEB_ORIGIN` in `apps/mobile-android/app/build.gradle.kts` to the deployed HTTPS app origin. From `apps/mobile-android` run:

```bash
gradle :app:assembleRelease
# Play Store submission uses an Android App Bundle:
gradle :app:bundleRelease
```

Configure a release signing key in CI or Android Studio before distributing the output. Play Console requires an AAB, privacy policy, data-safety disclosure, content rating, support contact and a signed release. Do not ship the app until its backend API, authentication, account deletion flow, moderation, and privacy policy are complete.

## Native scope

The current Android host is deliberately secure-by-default: it loads only an HTTPS origin, prevents cleartext traffic and disables file/content access. Production calls, camera, microphone, push notifications and secure credential storage must be implemented with native permission flows and server-side authorization; they must not be delegated to the web shell alone.
