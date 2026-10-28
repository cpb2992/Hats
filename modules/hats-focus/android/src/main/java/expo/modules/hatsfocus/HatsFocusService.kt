package expo.modules.hatsfocus

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.view.accessibility.AccessibilityEvent
import android.widget.Toast

class HatsFocusService : AccessibilityService() {
  private var lastNotice = 0L
  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event?.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
    val packageName = event.packageName?.toString() ?: return
    val prefs = getSharedPreferences("hats_focus", Context.MODE_PRIVATE)
    if (System.currentTimeMillis() >= prefs.getLong("until", 0)) return
    if (!(prefs.getStringSet("packages", emptySet()) ?: emptySet()).contains(packageName)) return
    if (performGlobalAction(GLOBAL_ACTION_HOME) && System.currentTimeMillis() - lastNotice > 5000) {
      lastNotice = System.currentTimeMillis()
      Toast.makeText(this, "Time set aside. Open Hats to pause or end your session.", Toast.LENGTH_SHORT).show()
    }
  }
  override fun onInterrupt() { }
}
