#!/usr/bin/env bash
# Called by the smoke workflow inside the running emulator.
set -x
mkdir -p smoke
APK=android/app/build/outputs/apk/release/app-release.apk
adb install -r "$APK"
adb logcat -c
adb shell am start -W -n com.hatsfocus.app/.MainActivity
sleep 25
(adb shell pidof com.hatsfocus.app || echo "NOT RUNNING") > smoke/after-launch.txt
adb exec-out screencap -p > smoke/launch.png
# Ask a widget provider to update, the way the launcher does after a widget is added.
adb shell am broadcast -a android.appwidget.action.APPWIDGET_UPDATE -n com.hatsfocus.app/.widget.HatsNow --eia appWidgetIds 1
sleep 20
(adb shell pidof com.hatsfocus.app || echo "NOT RUNNING") > smoke/after-widget.txt
adb exec-out screencap -p > smoke/after-widget.png
adb logcat -d -b crash > smoke/crash.txt
adb logcat -d -v time > smoke/logcat-all.txt
grep -iE "AndroidRuntime|ReactNativeJS|ReactNative|FATAL|Exception|hatsfocus|AndroidWidget|RNWidget|Headless" smoke/logcat-all.txt > smoke/logcat-filtered.txt || true
exit 0
