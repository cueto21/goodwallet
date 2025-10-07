import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, NotificationMessage } from '../../services/notification.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container">
      <div 
        *ngFor="let notification of notifications; trackBy: trackByFn" 
        class="notification-toast"
        [ngClass]="'notification-' + notification.type">
        
        <div class="notification-header">
          <div class="notification-icon">
            <span *ngIf="notification.type === 'success'">✓</span>
            <span *ngIf="notification.type === 'error'">✕</span>
            <span *ngIf="notification.type === 'warning'">⚠</span>
            <span *ngIf="notification.type === 'info'">ℹ</span>
          </div>
          <h4 class="notification-title">{{ notification.title }}</h4>
          <button 
            class="notification-close" 
            (click)="removeNotification(notification)"
            aria-label="Cerrar notificación">
            ✕
          </button>
        </div>
        
        <p class="notification-message">{{ notification.message }}</p>
        
        <div 
          *ngIf="notification.duration && notification.duration > 0"
          class="notification-progress"
          [style.animation-duration.ms]="notification.duration">
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
      width: 100%;
    }

    .notification-toast {
      background: white;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      border-left: 4px solid #ccc;
      animation: slideIn 0.3s ease-out;
      position: relative;
      overflow: hidden;
    }

    .notification-success {
      border-left-color: #22c55e;
    }

    .notification-error {
      border-left-color: #ef4444;
    }

    .notification-warning {
      border-left-color: #f59e0b;
    }

    .notification-info {
      border-left-color: #3b82f6;
    }

    .notification-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }

    .notification-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      font-weight: bold;
      font-size: 14px;
    }

    .notification-success .notification-icon {
      background: #22c55e;
      color: white;
    }

    .notification-error .notification-icon {
      background: #ef4444;
      color: white;
    }

    .notification-warning .notification-icon {
      background: #f59e0b;
      color: white;
    }

    .notification-info .notification-icon {
      background: #3b82f6;
      color: white;
    }

    .notification-title {
      flex: 1;
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
    }

    .notification-close {
      background: none;
      border: none;
      font-size: 18px;
      cursor: pointer;
      color: #6b7280;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .notification-close:hover {
      background: #f3f4f6;
      color: #374151;
    }

    .notification-message {
      margin: 0;
      color: #4b5563;
      font-size: 14px;
      line-height: 1.5;
    }

    .notification-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      background: rgba(0, 0, 0, 0.1);
      animation: shrink linear;
    }

    .notification-success .notification-progress {
      background: #22c55e;
    }

    .notification-error .notification-progress {
      background: #ef4444;
    }

    .notification-warning .notification-progress {
      background: #f59e0b;
    }

    .notification-info .notification-progress {
      background: #3b82f6;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes shrink {
      from {
        width: 100%;
      }
      to {
        width: 0%;
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .notification-container {
        left: 20px;
        right: 20px;
        max-width: none;
      }

      .notification-toast {
        padding: 12px;
      }

      .notification-title {
        font-size: 14px;
      }

      .notification-message {
        font-size: 13px;
      }
    }
  `]
})
export class NotificationToastComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private subscription?: Subscription;
  
  notifications: (NotificationMessage & { id: number })[] = [];
  private nextId = 1;

  ngOnInit() {
    this.subscription = this.notificationService.notification$.subscribe(
      (notification: NotificationMessage) => {
        this.addNotification(notification);
      }
    );
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private addNotification(notification: NotificationMessage) {
    const notificationWithId = {
      ...notification,
      id: this.nextId++
    };
    
    this.notifications.push(notificationWithId);

    // Auto-remove notification if duration is set
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(notificationWithId);
      }, notification.duration);
    }
  }

  removeNotification(notification: NotificationMessage & { id: number }) {
    this.notifications = this.notifications.filter(n => n.id !== notification.id);
  }

  trackByFn(index: number, item: NotificationMessage & { id: number }) {
    return item.id;
  }
}
