import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  if (AuthService.isAuthenticated()) return true;
  // try to load current user (in case page reload and token present)
  return AuthService.loadCurrentUser().then(u => {
    if (u) return true;
    router.navigate(['/login']);
    return false;
  });
};
