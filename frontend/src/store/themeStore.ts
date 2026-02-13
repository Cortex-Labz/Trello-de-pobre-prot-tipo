import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeName = 'light' | 'dark' | 'ocean' | 'sunset';

interface ThemeState {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  // Manter compatibilidade com código antigo
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'dark',
      isDark: true,

      setTheme: (theme: ThemeName) =>
        set(() => {
          // Apply theme to document using data-theme attribute
          document.documentElement.setAttribute('data-theme', theme);

          // Também manter classe dark para compatibilidade
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }

          return {
            theme,
            isDark: theme === 'dark'
          };
        }),

      // Manter toggleTheme para compatibilidade
      toggleTheme: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        get().setTheme(newTheme);
      },
    }),
    {
      name: 'versatly-task-theme',
    }
  )
);
