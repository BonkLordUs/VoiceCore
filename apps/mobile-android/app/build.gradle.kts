plugins { id("com.android.application") }

android {
    namespace = "app.voicecore.mobile"
    compileSdk = 35

    defaultConfig {
        applicationId = "app.voicecore.mobile"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "VOICECORE_WEB_ORIGIN", "\"https://voice-core-x7mx.vercel.app/\"")
    }
    buildFeatures { buildConfig = true }
}
