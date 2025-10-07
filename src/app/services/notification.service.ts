import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface NotificationMessage {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // en milisegundos, 0 para permanente
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new Subject<NotificationMessage>();
  public notification$ = this.notificationSubject.asObservable();

  showSuccess(title: string, message: string, duration: number = 5000) {
    this.notificationSubject.next({
      type: 'success',
      title,
      message,
      duration
    });
  }

  showError(title: string, message: string, duration: number = 0) {
    this.notificationSubject.next({
      type: 'error',
      title,
      message,
      duration
    });
  }

  showWarning(title: string, message: string, duration: number = 7000) {
    this.notificationSubject.next({
      type: 'warning',
      title,
      message,
      duration
    });
  }

  showInfo(title: string, message: string, duration: number = 5000) {
    this.notificationSubject.next({
      type: 'info',
      title,
      message,
      duration
    });
  }
}
