import { Component, signal } from '@angular/core';
import { CommonModule, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export default class LoginComponent {
  email = signal('');
  password = signal('');
  remember = signal(false);
  loading = signal(false);
  error = signal<string | null>(null);
  showBiometric = signal(false);

  constructor(private router: Router) {}

  async submit(e?: Event) {
    e?.preventDefault();
    this.loading.set(true);
    this.error.set(null);
    try {
      const r = await AuthService.login(this.email(), this.password());
      if (r && r.access_token) {
        // save credentials to localStorage if requested
        if (this.remember()) {
          this.saveRemembered();
        } else {
          this.clearRemembered();
        }
        this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      this.error.set(err?.message || err?.error || 'Error al autenticar');
    } finally {
      this.loading.set(false);
    }
  }

  // UI-only: detect biometric availability (stub for mobile)
  ngOnInit() {
    try {
      // reasonable assumption: platform check would go here; keep as UI stub
      this.showBiometric.set(false);
      // try load remembered credentials
      this.loadRemembered();
    } catch (e) {
      this.showBiometric.set(false);
    }
  }

  // LocalStorage helpers - lightweight base64 encoding (not secure, see notes)
  saveRemembered() {
    try {
      const payload = JSON.stringify({ email: this.email(), password: this.password() });
      localStorage.setItem('gw_remember', btoa(payload));
    } catch (e) { /* noop */ }
  }

  loadRemembered() {
    try {
      const v = localStorage.getItem('gw_remember');
      if (!v) return;
      const parsed = JSON.parse(atob(v));
      if (parsed?.email) this.email.set(parsed.email);
      if (parsed?.password) this.password.set(parsed.password);
      this.remember.set(true);
    } catch (e) { /* noop */ }
  }

  clearRemembered() {
    try { localStorage.removeItem('gw_remember'); } catch (e) {}
    this.remember.set(false);
  }
}
