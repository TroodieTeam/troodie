import Toast from 'react-native-toast-message';

export interface ToastAction {
  label: string;
  onPress: () => void;
}

export interface ToastOptions {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  action?: ToastAction;
}

export class ToastService {
  static show({ 
    message, 
    type = 'success', 
    duration = 3000,
    action 
  }: ToastOptions) {
    const config: any = {
      type,
      text1: message,
      visibilityTime: duration,
      position: 'bottom',
      bottomOffset: 100, // Account for tab bar
    };

    if (action) {
      config.text2 = action.label;
      config.onPress = action.onPress;
      config.props = {
        isActionable: true,
        actionLabel: action.label,
        onActionPress: action.onPress,
      };
    }

    Toast.show(config);
  }

  static showSuccess(message: string, action?: ToastAction) {
    this.show({ message, type: 'success', action });
  }

  // Alias for showSuccess to support both naming conventions
  static success(title: string, message?: string, action?: ToastAction) {
    const fullMessage = message ? `${title}\n${message}` : title;
    this.show({ message: fullMessage, type: 'success', action });
  }

  static showError(message: string) {
    this.show({ message, type: 'error', duration: 4000 });
  }

  static showInfo(message: string) {
    this.show({ message, type: 'info' });
  }

  static hide() {
    Toast.hide();
  }
}