package app.voicecore.mobile

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity

/** Minimal native host. Set VOICECORE_WEB_ORIGIN to the HTTPS production web origin before release. */
class MainActivity : ComponentActivity() {
    private val webOrigin = BuildConfig.VOICECORE_WEB_ORIGIN
    @SuppressLint("SetJavaScriptEnabled") override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        require(webOrigin.startsWith("https://")) { "Production origin must use HTTPS." }
        setContentView(WebView(this).apply {
            settings.javaScriptEnabled = true; settings.domStorageEnabled = true
            settings.allowFileAccess = false; settings.allowContentAccess = false
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                    request.url.host != android.net.Uri.parse(webOrigin).host
            }
            loadUrl(webOrigin)
        })
    }
}
