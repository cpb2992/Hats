#!/usr/bin/env bash
set -euo pipefail
BUILD="$RUNNER_TEMP/hats-widget-host"
mkdir -p "$BUILD/classes" "$BUILD/dex"
TOOLS=$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -1)
JAR=$(find "$ANDROID_HOME/platforms" -name android.jar | sort -V | tail -1)
cat > "$BUILD/AndroidManifest.xml" <<'XML'
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.hats.ci.widgethost"><uses-sdk android:minSdkVersion="26" android:targetSdkVersion="34"/><application android:theme="@android:style/Theme.Material.Light.NoActionBar" android:label="Hats CI widget host"><activity android:name=".WidgetHost" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity></application></manifest>
XML
javac -source 8 -target 8 -classpath "$JAR" -d "$BUILD/classes" scripts/release-readiness/WidgetHost.java
"$TOOLS/d8" --lib "$JAR" --output "$BUILD/dex" "$BUILD/classes/com/hats/ci/widgethost/WidgetHost.class"
"$TOOLS/aapt2" link -I "$JAR" --manifest "$BUILD/AndroidManifest.xml" -o "$BUILD/unsigned.apk"
(cd "$BUILD/dex" && zip -q -j "$BUILD/unsigned.apk" classes.dex)
keytool -genkeypair -keystore "$BUILD/ci.jks" -storepass android -keypass android -alias ci -dname "CN=Disposable CI" -keyalg RSA -validity 2 >/dev/null 2>&1
"$TOOLS/apksigner" sign --ks "$BUILD/ci.jks" --ks-pass pass:android --out "$BUILD/host.apk" "$BUILD/unsigned.apk"
