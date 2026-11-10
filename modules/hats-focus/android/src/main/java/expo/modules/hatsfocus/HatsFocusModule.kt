package expo.modules.hatsfocus

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class HatsFocusModule : Module() {
  private var sharedText: String? = null
  override fun definition() = ModuleDefinition {
    Name("HatsFocus")
    OnNewIntent { intent ->
      if (intent.action == Intent.ACTION_SEND && intent.type == "text/plain") {
        sharedText = intent.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString()
      }
    }
    AsyncFunction("consumeSharedText") {
      val initial = appContext.currentActivity?.intent
      val result = sharedText ?: if (initial?.action == Intent.ACTION_SEND && initial.type == "text/plain") initial.getCharSequenceExtra(Intent.EXTRA_TEXT)?.toString() else null
      sharedText = null
      initial?.removeExtra(Intent.EXTRA_TEXT)
      result?.take(20000)
    }
    AsyncFunction("configure") { until: Double, packages: List<String> ->
      val context = appContext.reactContext ?: throw IllegalStateException("App is not ready")
      val safePackages = packages.filter { it.matches(Regex("[a-zA-Z0-9_.]+")) && it != context.packageName }
      context.getSharedPreferences("hats_focus", Context.MODE_PRIVATE).edit()
        .putLong("until", until.toLong()).putStringSet("packages", safePackages.toSet()).apply()
    }
    Function("isEnabled") {
      val context = appContext.reactContext
      if (context == null) false else {
        val component = ComponentName(context, HatsFocusService::class.java)
        val enabled = Settings.Secure.getString(context.contentResolver, Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES) ?: ""
        enabled.split(":").any { ComponentName.unflattenFromString(it) == component }
      }
    }
    AsyncFunction("openSettings") {
      val context = appContext.reactContext ?: throw IllegalStateException("App is not ready")
      context.startActivity(Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
    }
  }
}
