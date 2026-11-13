// Browser notification helpers. Permission is requested only when the user
// clicks the "Enable notifications" button — never automatically on page load.

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) {
    return 'unsupported'
  }
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<
  NotificationPermission | 'unsupported'
> {
  if (!notificationsSupported()) {
    return 'unsupported'
  }
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

export function showPhaseChangeNotification(title: string, body: string): void {
  if (!notificationsSupported() || Notification.permission !== 'granted') {
    return
  }
  try {
    // A fixed tag so two quick phase changes cannot stack duplicates.
    new Notification(title, { body, tag: 'focusroom-phase-change' })
  } catch {
    // Some browsers (e.g. in service-worker contexts) require other APIs;
    // notifications are best-effort, never critical.
  }
}
