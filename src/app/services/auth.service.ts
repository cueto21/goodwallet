import { ApiService } from './api.service';
import { signal } from '@angular/core';

export const AuthService = {
  currentUser: signal<any | null>(null),

  async loadCurrentUser() {
    try {
      const u = await ApiService.get('/users/me');
      this.currentUser.set(u);
      return u;
    } catch (e) {
      this.currentUser.set(null);
      return null;
    }
  },

  async register(email: string, password: string, display_name?: string) {
    const r = await ApiService.post('/auth/register', { email, password, display_name });
    if (r && r.access_token) {
      ApiService.setAccessToken(r.access_token);
      await this.loadCurrentUser();
    }
    return r;
  },

  async login(email: string, password: string) {
    const r = await ApiService.post('/auth/login', { email, password });
    if (r && r.access_token) {
      ApiService.setAccessToken(r.access_token);
      await this.loadCurrentUser();
    }
    return r;
  },

  async logout() {
    try { await ApiService.post('/auth/logout'); } catch (e) {}
    ApiService.setAccessToken(null);
    this.currentUser.set(null);
  },

  getAccessToken() { return ApiService.getAccessToken(); },

  isAuthenticated() { return !!this.currentUser(); }
};
