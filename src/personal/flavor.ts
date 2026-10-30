/** Which Hats this is: the public Play Store app, or a personal build. Set in app.json → extra.flavor. */
import Constants from "expo-constants";

export const PUBLIC_BUILD = Constants.expoConfig?.extra?.flavor === "public";
export const ANDROID_PACKAGE = "com.hatsplanner.app";
export const STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
export const PRIVACY_URL = "https://github.com/cpb2992/Hats/blob/public/PRIVACY.md";
export const SHARE_MESSAGE = `I've been using Hats to juggle family, home, work and everything else: every role gets its own space, and it plans one calm day. Free on Android: ${STORE_URL}`;
