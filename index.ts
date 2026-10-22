import 'expo-router/entry';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './src/widgets/task-handler';

// Home-screen widgets run this handler when they're added, refreshed or tapped (Android only).
registerWidgetTaskHandler(widgetTaskHandler);
