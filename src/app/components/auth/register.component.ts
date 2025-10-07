import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export default class RegisterComponent {
  email = signal('');
  password = signal('');
  display_name = signal('');
  loading = signal(false);
  error = signal<string | null>(null);
  animState = signal<'idle'|'submitting'>('idle');

  constructor(private router: Router) {}

  async submit(e?: Event) {
    e?.preventDefault();
  this.loading.set(true);
  this.animState.set('submitting');
    this.error.set(null);
    try {
      const r = await AuthService.register(this.email(), this.password(), this.display_name());
      if (r && r.access_token) this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.error.set(err?.message || err?.error || 'Error al registrar');
    } finally {
      this.loading.set(false);
  this.animState.set('idle');
    }
  }
}
