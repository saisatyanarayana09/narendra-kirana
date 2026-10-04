import * as TaskManager from 'expo-task-manager';
import * as Notifications from 'expo-notifications';
import { requestWidgetUpdate } from 'react-native-android-widget';
import { widgetTaskHandler } from './WidgetTaskHandler';

const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND-NOTIFICATION-TASK';

TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundTask] Error:', error);
    return;
  }
  
  if (data) {
    console.log('[BackgroundTask] Received notification in background, updating widget...');
    try {
      await requestWidgetUpdate({
        widgetName: 'OrderWidget',
        renderWidget: (widgetInfo) => {
          return new Promise((resolve) => {
            widgetTaskHandler({
              widgetAction: 'WIDGET_UPDATE',
              widgetInfo,
              renderWidget: (jsx: any) => resolve(jsx)
            });
          });
        },
      });
    } catch (e) {
      console.error('[BackgroundTask] Failed to update widget:', e);
    }
  }
});

export function registerBackgroundNotificationTask() {
  Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK).catch(err => {
    console.log('[BackgroundTask] Failed to register:', err);
  });
}
