import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DarkModeService {
  darkMode = signal(false);

  toggleDarkMode() {
    this.darkMode.update(current => !current);
    try { localStorage.setItem('app:darkMode', this.darkMode() ? '1' : '0'); } catch (e) {}
  }

  initialize() {
    try {
      const stored = localStorage.getItem('app:darkMode');
      if (stored === '1' || stored === 'true') {
        this.darkMode.set(true);
      }
    } catch (e) {
      // ignore storage errors
    }
  }
}