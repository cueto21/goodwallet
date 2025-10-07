import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService, Theme } from '../../services/theme.service';

@Component({
  selector: 'app-theme-selector',
  imports: [CommonModule],
  templateUrl: './theme-selector.html',
  styleUrl: './theme-selector.scss'
})
export class ThemeSelector {
  private themeService = inject(ThemeService);
  themes = this.themeService.getThemes();
  currentThemeIndex = this.themeService.currentThemeIndex;
  dropdownOpen = signal(false);

  toggleDropdown() {
    this.dropdownOpen.update(v => !v);
  }

  selectTheme(index: number) {
    this.themeService.setTheme(index);
    this.dropdownOpen.set(false);
  }

  getCurrentTheme(): Theme {
    return this.themeService.getCurrentTheme();
  }
}
