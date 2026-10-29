import 'expo-router/entry';
import { Platform } from 'react-native';

// Home-screen widgets run this handler when they're added, refreshed or tapped (Android only).
// Guarded so a widget problem can never stop the app itself from opening.
if (Platform.OS === 'android') {
  try {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { registerWidgetTaskHandler } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    const { personalWidgetHandler } = require('./src/personal/widgets') as typeof import('./src/personal/widgets');
    /* eslint-enable @typescript-eslint/no-require-imports */
    registerWidgetTaskHandler(personalWidgetHandler);
  } catch (e) {
    console.warn('Hats widgets unavailable', e);
  }
}
