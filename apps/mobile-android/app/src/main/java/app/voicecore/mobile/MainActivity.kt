package app.voicecore.mobile

import android.annotation.SuppressLint
import android.app.Activity
import android.net.Uri
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient

/** Native HTTPS-only host for the deployed VoiceCore PWA. */
class MainActivity : Activity() {
    private val webOrigin = BuildConfig.VOICECORE_WEB_ORIGIN

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        require(webOrigin.startsWith("https://")) { "VoiceCore production origin must use HTTPS." }
        val allowedHost = Uri.parse(webOrigin).host
        setContentView(WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            webViewClient = object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                    request.url.host != allowedHost
            }
            loadUrl(webOrigin)
        })
    }
}
