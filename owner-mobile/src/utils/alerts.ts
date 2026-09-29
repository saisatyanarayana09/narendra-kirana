import { Alert, Platform } from 'react-native';

export function showAlert(title: string, message?: string, onOk?: () => void) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(message ? `${title}\n\n${message}` : title);
      if (onOk) onOk();
      return;
    }
    Alert.alert(
      title,
      message,
      onOk ? [{ text: 'OK', onPress: onOk }] : undefined
    );
  } catch {
    if (onOk) onOk();
  }
}

export function showConfirm(
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText = 'Confirm'
) {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        onConfirm();
      } else if (onCancel) {
        onCancel();
      }
      return;
    }
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: onCancel },
      { text: confirmText, onPress: onConfirm },
    ]);
  } catch {
    if (onCancel) onCancel();
  }
}
