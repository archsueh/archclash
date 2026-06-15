/**
 * Desktop preferences: close-to-tray, launch-on-startup, start-minimized,
 * tray availability, preferred UI language, window-visibility hook.
 */
export {
  GetDesktopPrefs,
  GetLaunchOnStartupPreference,
  GetPreferredLanguage,
  GetTrayAvailability,
  OnWindowBecameVisible,
  SetAppAutoUpdateEnabled,
  SetCloseToTrayPreference,
  SetDnsSmartFallback,
  SetHwidEnabled,
  SetLaunchOnStartupPreference,
  SetLogLevel,
  SetUiLanguage,
  StartedMinimized,
} from '../../wailsjs/go/main/App'
