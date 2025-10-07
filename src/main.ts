import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { AuthService } from './app/services/auth.service';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));

// expose for simple inline components
(window as any).AuthService = AuthService;
// try to hydrate current user (if refresh cookie present)
AuthService.loadCurrentUser().catch(() => {});
