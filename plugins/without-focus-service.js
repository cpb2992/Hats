/**
 * The public (Play Store) build leaves out the Android accessibility service behind "Protected
 * family time". Google Play only approves accessibility services for real accessibility needs,
 * so the public app drops it; the module's share-to-Hats bridge stays. Personal builds keep it.
 */
const { withAndroidManifest } = require("expo/config-plugins");

module.exports = function withoutFocusService(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = { ...manifest.$, "xmlns:tools": "http://schemas.android.com/tools" };
    const app = manifest.application[0];
    app.service = (app.service ?? []).filter((s) => s.$["android:name"] !== "expo.modules.hatsfocus.HatsFocusService");
    app.service.push({ $: { "android:name": "expo.modules.hatsfocus.HatsFocusService", "tools:node": "remove" } });
    return cfg;
  });
};
