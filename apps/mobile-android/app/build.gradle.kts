plugins { id("com.android.application") }

android { buildFeatures { buildConfig = true }
    namespace = "app.voicecore.mobile"; compileSdk = 35
    defaultConfig { buildConfigField("String", "VOICECORE_WEB_ORIGIN", "\"https://app.voicecore.example\"")
        applicationId = "app.voicecore.mobile"; minSdk = 26; targetSdk = 35; versionCode = 1; versionName = "0.1.0" }
}
