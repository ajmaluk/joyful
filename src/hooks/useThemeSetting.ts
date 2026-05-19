import { useCallback, useEffect, useState } from 'react';
import type { UserSettings } from '@/types';
import * as storage from '@/services/storage';

export function useThemeSetting() {
  const [theme, setThemeState] = useState<UserSettings['theme']>(() => storage.getSettings().theme);

  useEffect(() => {
    const handleSettingsChanged = (event: Event) => {
      setThemeState((event as CustomEvent<UserSettings>).detail.theme);
    };

    window.addEventListener('joyful_settings_changed', handleSettingsChanged);
    return () => window.removeEventListener('joyful_settings_changed', handleSettingsChanged);
  }, []);

  const setTheme = useCallback((nextTheme: UserSettings['theme']) => {
    const nextSettings = { ...storage.getSettings(), theme: nextTheme };
    setThemeState(nextTheme);
    storage.saveSettings(nextSettings);
  }, []);

  const cycleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  return { theme, setTheme, cycleTheme, isDark: theme === 'dark' };
}
