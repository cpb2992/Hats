#!/usr/bin/env bash
# Emulator smoke test for the personal-life build. Called by smoke-personal.yml.
#   A: cold open.  B: set up with a sample name and visit each tab.  C: widget refreshes,
#   open and closed.  D: text shared from another app, warm and cold.  E: finish the
#   kitchen reset and see the linked streak.  Uses a made-up name; no private data.
set -x
mkdir -p smoke
APK=android/app/build/outputs/apk/release/app-release.apk
PKG=com.hatsfocus.app
FIND="python3 .github/smoke_find.py"
LOG=smoke/steps.txt
: > $LOG

alive() { adb shell pidof $PKG >/dev/null 2>&1 && echo "RUNNING" || echo "NOT RUNNING"; }
dump() { adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb exec-out cat /sdcard/ui.xml > smoke/ui.xml; }
shot() { adb exec-out screencap -p > "smoke/$1.png"; dump; cp smoke/ui.xml "smoke/$1.xml"; }
note() { echo "$*" >> $LOG; }
H=$(adb shell wm size | grep -oE '[0-9]+x[0-9]+' | tail -1 | cut -dx -f2); H=${H:-1920}
W=$(adb shell wm size | grep -oE '[0-9]+x[0-9]+' | tail -1 | cut -dx -f1); W=${W:-1080}
tap_label() {
  local n=${2:-10}
  for i in $(seq 1 $((n * 2))); do
    dump
    if xy=$($FIND smoke/ui.xml "$1"); then
      y=${xy#* }
      if [ "$y" -gt 20 ] && [ "$y" -lt "${TAP_MAXY:-$((H - 12))}" ]; then adb shell input tap $xy; note "tapped '$1'"; return 0; fi
    fi
    if [ "$i" -le "$n" ]; then adb shell input swipe $((W / 2)) $((H * 3 / 5)) $((W / 2)) $((H * 2 / 5)) 600
    else adb shell input swipe $((W / 2)) $((H * 2 / 5)) $((W / 2)) $((H * 3 / 5)) 600; fi
    sleep 1
  done
  note "could not find '$1'"; return 1
}
seen() { dump; grep -qiE "$1" smoke/ui.xml && note "PASS: $2" || note "FAIL: $2"; }

adb root >/dev/null 2>&1; sleep 2
adb shell setprop persist.sys.timezone America/New_York
adb shell cmd alarm set-timezone America/New_York >/dev/null 2>&1 || true
adb install -r "$APK" && note "installed"

# --- A: cold open
adb logcat -c
adb shell am start -W -n $PKG/.MainActivity
sleep 25
note "A alive: $(alive)"
shot a-welcome
seen "Make room for what matters|Import my setup" "welcome screen shows on first launch"

# --- B: set up with a sample name, then each tab
tap_label "What should Hats call you" 3 && sleep 1 && adb shell input text "Sam" && sleep 1
adb shell input keyevent KEYCODE_BACK; sleep 1
tap_label "Make room for what matters" 6 && sleep 5
shot b-today
seen "Today|Kitchen reset" "Today screen after setup"
TAP_MAXY=$H
for tab in "My hats" "Plan" "Capture" "Today"; do
  tap_label "^\|?$tab|$tab$" 2 && sleep 3
  shot "b-tab-${tab// /-}"
done
unset TAP_MAXY
adb shell am start -W -a android.intent.action.VIEW -d "hats://settings" $PKG
sleep 5
shot b-settings
seen "Personal setup|Settings" "Settings opens by link"
for i in 1 2 3 4; do adb shell input swipe $((W / 2)) $((H * 4 / 5)) $((W / 2)) $((H / 5)) 500; sleep 1; shot "b-settings-$i"; done
note "B alive: $(alive)"

# --- C: widgets refresh while open, and wake the app while closed
for w in HatsNow HatsLog HatsSay; do
  adb shell am broadcast -a android.appwidget.action.APPWIDGET_UPDATE -n $PKG/.widget.$w --eia appWidgetIds 1 >/dev/null
done
sleep 10
note "C alive after widget refresh (open): $(alive)"
adb shell am force-stop $PKG
for w in HatsNow HatsLog HatsSay; do
  adb shell am broadcast -a android.appwidget.action.APPWIDGET_UPDATE -n $PKG/.widget.$w --eia appWidgetIds 1 >/dev/null
done
sleep 20
note "C process after widget wake (closed): $(alive)"
adb logcat -d -b crash > smoke/c-crash.txt

# --- D: share text from another app, warm then cold
adb shell am start -W -n $PKG/.MainActivity; sleep 6
adb shell am start -W -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "Warm_share_test" -n $PKG/.MainActivity
sleep 6
shot d-share-warm
seen "Warm_share_test" "warm share lands in Capture"
adb shell am force-stop $PKG
adb shell am start -W -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT "Cold_share_test" -n $PKG/.MainActivity
sleep 20
shot d-share-cold
seen "Cold_share_test" "cold share lands in Capture"

# --- E: finish every step of the kitchen reset and look for the streak
adb shell am force-stop $PKG
adb shell am start -W -n $PKG/.MainActivity; sleep 10
TAP_MAXY=$((H * 4 / 5)) tap_label "Kitchen reset" 8 && sleep 3
shot e-task
for step in "Wash or load the dishes" "Wipe the counters" "Sweep what needs it" "Put the last things away"; do
  TAP_MAXY=$((H * 9 / 10)) tap_label "$step" 4 && sleep 1
done
sleep 2
shot e-task-done
adb shell input keyevent KEYCODE_BACK; sleep 3
adb shell am start -W -a android.intent.action.VIEW -d "hats://hat/home" $PKG; sleep 5
shot e-home-hat
for i in 1 2 3; do adb shell input swipe $((W / 2)) $((H * 4 / 5)) $((W / 2)) $((H / 5)) 500; sleep 1; shot "e-home-hat-$i"; done
note "E alive: $(alive)"

adb logcat -d -v time > smoke/logcat.txt
adb logcat -d -b crash > smoke/crash.txt
grep -iE "AndroidRuntime|ReactNativeJS|FATAL|Exception|hatsfocus|AndroidWidget|Headless" smoke/logcat.txt > smoke/logcat-filtered.txt || true
[ -s smoke/crash.txt ] && note "CRASH BUFFER NOT EMPTY" || note "crash buffer empty"
exit 0
