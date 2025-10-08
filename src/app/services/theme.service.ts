import { Injectable, signal, inject, effect } from '@angular/core';
import { DarkModeService } from './dark-mode.service';

export interface Theme {
  name: string;
  colors: [string, string]; // [primary, secondary]
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private themes: Theme[] = [
    { name: 'Tema 1', colors: ['#D7263D', '#02182B'] },
    { name: 'Tema 2', colors: ['#eaebed', '#006989'] },
    { name: 'Tema 3', colors: ['#EEE5DA', '#262424'] },
    { name: 'Tema 4', colors: ['#EFDFBB', '#722F37'] },
    { name: 'Tema 5', colors: ['#F092DD', '#392F5A'] }
  ];

  currentThemeIndex = signal(0);
  private darkModeService = inject(DarkModeService);

  constructor() {
    this.initialize();
    // Reapply theme when dark mode changes
    effect(() => {
      this.darkModeService.darkMode();
      this.applyTheme();
    });
  }

  initialize() {
    try {
      const stored = localStorage.getItem('app:themeIndex');
      if (stored !== null) {
        const index = parseInt(stored, 10);
        if (index >= 0 && index < this.themes.length) {
          this.currentThemeIndex.set(index);
        }
      }
    } catch (e) {
      // ignore storage errors
    }
    this.applyTheme();
  }

  setTheme(index: number) {
    if (index >= 0 && index < this.themes.length) {
      this.currentThemeIndex.set(index);
      try {
        localStorage.setItem('app:themeIndex', index.toString());
      } catch (e) {}
      this.applyTheme();
    }
  }

  getCurrentTheme(): Theme {
    return this.themes[this.currentThemeIndex()];
  }

  getThemes(): Theme[] {
    return this.themes;
  }

  private applyTheme() {
    const theme = this.getCurrentTheme();
    const primaryColor = theme.colors[0];
    const secondaryColor = theme.colors[1];
    const isDark = this.darkModeService.darkMode();
    const isTema2 = this.currentThemeIndex() === 1;

    // Gear background always uses secondary color
    document.documentElement.style.setProperty('--theme-gear-bg', secondaryColor);

    // Switch background for Tema 2
    if (isTema2) {
      if (isDark) {
        document.documentElement.style.setProperty('--theme-switch-bg', secondaryColor);
        document.documentElement.style.setProperty('--theme-switch-bg-light', secondaryColor);
        document.documentElement.style.setProperty('--theme-switch-checked-bg', secondaryColor);
        document.documentElement.style.setProperty('--theme-switch-checked-bg-light', secondaryColor);
        document.documentElement.style.setProperty('--theme-switch-knob-bg', primaryColor);
        document.documentElement.style.setProperty('--theme-switch-knob-bg-light', primaryColor);
      } else {
        document.documentElement.style.setProperty('--theme-switch-bg', primaryColor);
        document.documentElement.style.setProperty('--theme-switch-bg-light', primaryColor);
        document.documentElement.style.setProperty('--theme-switch-checked-bg', primaryColor);
        document.documentElement.style.setProperty('--theme-switch-checked-bg-light', primaryColor);
        document.documentElement.style.setProperty('--theme-switch-knob-bg', secondaryColor);
        document.documentElement.style.setProperty('--theme-switch-knob-bg-light', secondaryColor);
      }
    } else {
      // Remove for Tema 1 to use defaults
      document.documentElement.style.removeProperty('--theme-switch-bg');
      document.documentElement.style.removeProperty('--theme-switch-bg-light');
      document.documentElement.style.removeProperty('--theme-switch-checked-bg');
      document.documentElement.style.removeProperty('--theme-switch-checked-bg-light');
      document.documentElement.style.removeProperty('--theme-switch-knob-bg');
      document.documentElement.style.removeProperty('--theme-switch-knob-bg-light');
    }

    // Bottom nav: depends on theme
    if (isTema2) {
      // Tema 2: bg secondary, text primary
      document.documentElement.style.setProperty('--theme-nav-bg', secondaryColor);
      document.documentElement.style.setProperty('--theme-nav-text', primaryColor);
    } else {
      // Tema 1: bg primary, text white
      document.documentElement.style.setProperty('--theme-nav-bg', primaryColor);
      document.documentElement.style.setProperty('--theme-nav-text', '#ffffff');
    }

    // Button styling: map strictly by theme so buttons always follow the user's rule:
    // - Tema 1: background = color1 (primary), text = color2 (secondary)
    // - Tema 2: background = color2 (secondary), text = color1 (primary)
    if (this.currentThemeIndex() === 0) {
      document.documentElement.style.setProperty('--theme-btn-bg', primaryColor);
      document.documentElement.style.setProperty('--theme-btn-text', secondaryColor);
    } else {
      document.documentElement.style.setProperty('--theme-btn-bg', secondaryColor);
      document.documentElement.style.setProperty('--theme-btn-text', primaryColor);
    }

    // Friends button: for Tema 2, always bg secondary, color primary; for Tema 1, depends on mode
    if (isTema2) {
      document.documentElement.style.setProperty('--theme-friends-btn-bg', secondaryColor);
      document.documentElement.style.setProperty('--theme-friends-btn-color', primaryColor);
    } else {
      if (isDark) {
        // Dark mode: bg primary, color secondary
        document.documentElement.style.setProperty('--theme-friends-btn-bg', primaryColor);
        document.documentElement.style.setProperty('--theme-friends-btn-color', secondaryColor);
      } else {
        // Light mode: bg secondary, color white
        document.documentElement.style.setProperty('--theme-friends-btn-bg', secondaryColor);
        document.documentElement.style.setProperty('--theme-friends-btn-color', '#ffffff');
      }
    }

    // Income and expenses cards: themed with some variations
    document.documentElement.style.setProperty('--theme-income-bg', primaryColor);
    document.documentElement.style.setProperty('--theme-income-text', secondaryColor);
    document.documentElement.style.setProperty('--theme-expenses-bg', secondaryColor);

    // Expenses text: depends on theme and mode
    if (!isTema2 && !isDark) {
      // Tema 1 in light mode: white text
      document.documentElement.style.setProperty('--theme-expenses-text', '#ffffff');
    } else {
      // Other cases: primary color
      document.documentElement.style.setProperty('--theme-expenses-text', primaryColor);
    }

    // Balance card behavior:
    // - Tema 2 + dark: preserve existing behavior (balance bg = primary, text = secondary)
    // - Tema 1: user requested special mapping:
    //     * dark mode => background = color1 (primary), text = white
    //     * light mode => background = color2 (secondary), text = white
    if (isTema2 && isDark) {
      document.documentElement.style.setProperty('--theme-balance-bg', primaryColor);
      document.documentElement.style.setProperty('--theme-balance-text', secondaryColor);
    } else if (!isTema2) {
      // Tema 1: apply requested mapping regardless of viewport/media queries
      if (isDark) {
        document.documentElement.style.setProperty('--theme-balance-bg', primaryColor);
        document.documentElement.style.setProperty('--theme-balance-text', '#ffffff');
      } else {
        document.documentElement.style.setProperty('--theme-balance-bg', secondaryColor);
        document.documentElement.style.setProperty('--theme-balance-text', '#ffffff');
      }
    } else {
      // Other cases (e.g., Tema2 in light) -> remove to fall back to defaults
      document.documentElement.style.removeProperty('--theme-balance-bg');
      document.documentElement.style.removeProperty('--theme-balance-text');
    }

    if (isTema2) {
      // Tema 2: always color 2 for bg, white for text
      document.documentElement.style.setProperty('--theme-cards-bg', secondaryColor);
      document.documentElement.style.setProperty('--theme-cards-text', '#ffffff');
    } else {
      // Tema 1: depends on mode
      if (isDark) {
        // Dark mode: color 2 for bg, color 1 for text
        document.documentElement.style.setProperty('--theme-cards-bg', secondaryColor);
        document.documentElement.style.setProperty('--theme-cards-text', primaryColor);
      } else {
        // Light mode: color 1 for bg, white for text
        document.documentElement.style.setProperty('--theme-cards-bg', primaryColor);
        document.documentElement.style.setProperty('--theme-cards-text', '#ffffff');
      }
    }
  }
}