#!/usr/bin/env bash
# Called by the smoke workflow inside the running emulator.
#   A: open the app cold.   A2: a widget refresh while it's open.
#   B: app closed, a widget wakes it, then it's opened.
#   C: add the Now and Caseload widgets from Settings, then look at the home screen.
set -x
mkdir -p smoke
APK=android/app/build/outputs/apk/release/app-release.apk
PKG=com.hatsfocus.app
FIND="python3 .github/smoke_find.py"

alive() { adb shell pidof $PKG >/dev/null 2>&1 && echo "RUNNING" || echo "NOT RUNNING"; }
focused() { adb shell dumpsys window | grep -E "mCurrentFocus" | head -1; }
dump() { adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb exec-out cat /sdcard/ui.xml > smoke/ui.xml; }
H=$(adb shell wm size | grep -oE '[0-9]+x[0-9]+' | tail -1 | cut -dx -f2); H=${H:-1920}
W=$(adb shell wm size | grep -oE '[0-9]+x[0-9]+' | tail -1 | cut -dx -f1); W=${W:-1080}

# Boston time, so the bell schedule logic runs against a real school-day clock.
adb root >/dev/null 2>&1; sleep 2
adb shell setprop persist.sys.timezone America/New_York
adb shell cmd alarm set-timezone America/New_York >/dev/null 2>&1 || true
adb shell date

adb install -r "$APK"

# --- A: cold open
adb logcat -c
adb shell am start -W -n $PKG/.MainActivity
sleep 30
{ echo "alive: $(alive)"; focused; } > smoke/a-launch.txt
adb exec-out screencap -p > smoke/a-launch.png
adb logcat -d -v time > smoke/a-logcat.txt
adb logcat -d -b crash > smoke/a-crash.txt

# --- A2: a widget refresh while the app is open
adb shell am broadcast -a android.appwidget.action.APPWIDGET_UPDATE -n $PKG/.widget.HatsNow --eia appWidgetIds 1
sleep 15
{ echo "alive: $(alive)"; focused; } > smoke/a2-widget.txt

# --- B: closed, woken by a widget, then opened
adb shell am force-stop $PKG
adb logcat -c
adb shell am broadcast -a android.appwidget.action.APPWIDGET_UPDATE -n $PKG/.widget.HatsNow --eia appWidgetIds 1
sleep 25
echo "alive after widget: $(alive)" > smoke/b-widget.txt
adb shell am start -W -n $PKG/.MainActivity
sleep 30
{ echo "alive after open: $(alive)"; focused; } >> smoke/b-widget.txt
adb exec-out screencap -p > smoke/b-open.png
adb logcat -d -v time > smoke/b-logcat.txt
adb logcat -d -b crash > smoke/b-crash.txt

# --- C: add widgets the way Chris would, from Settings
adb logcat -c
: > smoke/c-steps.txt
for title in "Now" "Caseload \+1"; do
  adb shell am start -W -a android.intent.action.VIEW -d "hats://settings" $PKG
  sleep 8
  hit=""
  for i in 1 2 3 4 5 6 7 8 9 10; do
    dump
    xy=$($FIND smoke/ui.xml "^Add the $title widget\|") && {
      y=${xy#* }
      if [ "$y" -gt 200 ] && [ "$y" -lt $((H - 200)) ]; then hit=$xy; break; fi
    }
    adb shell input swipe $((W / 2)) $((H * 3 / 4)) $((W / 2)) $((H / 4)) 400
    sleep 1
  done
  echo "$title: add button at '$hit'" >> smoke/c-steps.txt
  [ -n "$hit" ] || continue
  adb shell input tap $hit
  sleep 4
  dump
  cp smoke/ui.xml "smoke/c-dialog-${title//[^A-Za-z]/}.xml"
  adb exec-out screencap -p > "smoke/c-dialog-${title//[^A-Za-z]/}.png"
  ok=$($FIND smoke/ui.xml "add to home screen|add automatically|^\|add$") && adb shell input tap $ok
  echo "$title: confirm at '${ok:-none}'" >> smoke/c-steps.txt
  sleep 4
done
adb shell input keyevent KEYCODE_HOME
sleep 25
adb exec-out screencap -p > smoke/c-home.png
adb shell dumpsys appwidget | grep -iE "hatsfocus|provider=|id=" | head -40 > smoke/c-appwidgets.txt
echo "alive: $(alive)" >> smoke/c-steps.txt
adb logcat -d -v time > smoke/c-logcat.txt
adb logcat -d -b crash > smoke/c-crash.txt

for f in a-logcat b-logcat c-logcat; do
  grep -iE "AndroidRuntime|ReactNativeJS|ReactNative|ReactHost|FATAL|Exception|hatsfocus|AndroidWidget|RNWidget|Headless|WM-" smoke/$f.txt > smoke/$f-filtered.txt || true
done
exit 0
