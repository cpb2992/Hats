#!/usr/bin/env bash
# Called by the smoke workflow inside the running emulator.
# Scenario A: open the app cold.  Scenario B: a widget wakes the app first, then the person opens it.
set -x
mkdir -p smoke
APK=android/app/build/outputs/apk/release/app-release.apk
PKG=com.hatsfocus.app

alive() { adb shell pidof $PKG >/dev/null 2>&1 && echo "RUNNING" || echo "NOT RUNNING"; }
focused() { adb shell dumpsys window | grep -E "mCurrentFocus|mFocusedApp" | head -2; }

adb install -r "$APK"

# --- Scenario A: cold open
adb logcat -c
adb shell am start -W -n $PKG/.MainActivity
sleep 30
{ echo "alive: $(alive)"; focused; } > smoke/a-launch.txt
adb exec-out screencap -p > smoke/a-launch.png
adb logcat -d -v time > smoke/a-logcat.txt
adb logcat -d -b crash > smoke/a-crash.txt

# --- Scenario A2: a widget update while the app is open
adb shell am broadcast -a android.appwidget.action.APPWIDGET_UPDATE -n $PKG/.widget.HatsNow --eia appWidgetIds 1
sleep 15
{ echo "alive: $(alive)"; focused; } > smoke/a2-widget.txt

# --- Scenario B: app closed, a widget wakes it, then it is opened
adb shell am force-stop $PKG
adb logcat -c
adb shell am broadcast -a android.appwidget.action.APPWIDGET_UPDATE -n $PKG/.widget.HatsNow --eia appWidgetIds 1
sleep 25
{ echo "alive after widget: $(alive)"; } > smoke/b-widget.txt
adb shell am start -W -n $PKG/.MainActivity
sleep 30
{ echo "alive after open: $(alive)"; focused; } >> smoke/b-widget.txt
adb exec-out screencap -p > smoke/b-open.png
adb logcat -d -v time > smoke/b-logcat.txt
adb logcat -d -b crash > smoke/b-crash.txt

for f in a-logcat b-logcat; do
  grep -iE "AndroidRuntime|ReactNativeJS|ReactNative|ReactHost|FATAL|Exception|Error|hatsfocus|AndroidWidget|RNWidget|Headless|WM-|expo" smoke/$f.txt > smoke/$f-filtered.txt || true
done
exit 0
