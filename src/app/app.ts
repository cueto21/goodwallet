import { Component, signal, inject, OnInit, computed } from '@angular/core';
import { AuthService } from './services/auth.service';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { SidebarService } from './services/sidebar.service';
import { NotificationToastComponent } from './components/notification-toast/notification-toast.component';
import { BottomNavComponent } from './components/bottom-nav/bottom-nav.component';
import { ThemeSelector } from './components/theme-selector/theme-selector';
import { DarkModeService } from './services/dark-mode.service';
import { ThemeService } from './services/theme.service';
import { AccountService } from './services/account';
import { LoanService } from './services/loan.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    NgIf,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NotificationToastComponent,
    BottomNavComponent,
    ThemeSelector
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss']
})
export class App implements OnInit {
  protected readonly title = signal('goodwallet');
  private sidebarService = inject(SidebarService);
  private router = inject(Router);
  private darkModeService = inject(DarkModeService);
  private themeService = inject(ThemeService);
  private accountService = inject(AccountService);
  private loanService = inject(LoanService);
  auth = AuthService;
  accountPanel = signal(false);

  sidebarVisible = this.sidebarService.sidebarVisible;
  sidebarCollapsed = this.sidebarService.sidebarCollapsed;
  darkMode = this.darkModeService.darkMode;
  currentThemeIndex = this.themeService.currentThemeIndex;

  async ngOnInit() {
    // Intentar cargar el usuario actual al inicializar la app
    try {
      await this.auth.loadCurrentUser();
    } catch (error) {
      // Si falla, el usuario será null y será redirigido al login por el guard
      console.log('No current user session found');
    }

    // Inicializar modo oscuro
    this.darkModeService.initialize();
  }

  toggleSidebar() {
    this.sidebarService.toggleSidebar();
  }

  toggleCollapse() {
    this.sidebarService.toggleCollapse();
  }

  toggleAccount() {
    this.accountPanel.update(v => !v);
  }

  /** Toggle global dark mode */
  toggleDarkMode(event: Event | boolean) {
    this.darkModeService.toggleDarkMode();
  }

  /**
   * Abrir la proyección de balance en el dashboard: navegamos al dashboard con un query param
   * que el componente Dashboard detectará y abrirá la modal.
   */
  openBalanceProjection() {
    // cerrar panel de cuenta y navegar
    this.accountPanel.set(false);
    try {
      this.router.navigate(['/dashboard'], { queryParams: { openProjection: '1' } });
    } catch (e) {
      console.error('Error navigating to dashboard for balance projection', e);
    }
  }

  /**
   * Ir a la pantalla de respaldo
   */
  openBackup() {
    this.accountPanel.set(false);
    try {
      this.router.navigate(['/backup']);
    } catch (e) {
      console.error('Error navigating to backup page', e);
    }
  }

  getInitials(): string {
    const user = this.auth.currentUser();
    if (!user) return 'U';
    const name = user.display_name || user.email || '';
    return name.split(' ').map((n: string) => n[0]?.toUpperCase()).join('').slice(0, 2) || 'U';
  }

  closeSidebar() {
    this.sidebarService.setSidebarVisible(false);
  }

  logout() {
    this.auth.logout();
  }

  isAuthPage(): boolean {
    const url = this.router.url;
    return url.includes('/login') || url.includes('/register') || url === '/';
  }

  isDashboardRoute(): boolean {
    return this.router.url.includes('/dashboard');
  }

  formatDashboardCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  }

  // Computed properties for dashboard metrics
  dashboardTotalBalance = computed(() => {
    // Solo contar el balance de cuentas de ahorro (dinero líquido real)
    const accounts = this.accountService.getAccounts()();
    const savingsAccounts = accounts.filter(account => account.type === 'savings');
    const total = savingsAccounts.reduce((total, account) => total + account.balance, 0);
    return total;
  });

  dashboardTotalLent = computed(() => {
    const loans = this.loanService.getLoans()();
    const filtered = loans.filter(l => l.type === 'lent' && (l.status === 'pending' || l.status === 'overdue'));
    const sum = filtered.reduce((sumAcc, l) => {
      if (l.installments?.enabled) {
        const instSum = (l.installments.installmentsList || [])
          .filter(inst => inst.status === 'pending' || inst.status === 'overdue' || inst.status === 'partial')
          .reduce((s, inst) => {
            if (inst.status === 'partial') {
              const remaining = Number(inst.amount || 0) - Number(inst.partialAmountPaid || 0);
              return s + (remaining > 0 ? remaining : 0);
            }
            return s + Number(inst.amount || 0);
          }, 0);
        return sumAcc + (isNaN(instSum) ? 0 : instSum);
      }
      const amt = Number(l.amount || 0);
      return sumAcc + (isNaN(amt) ? 0 : amt);
    }, 0);
    return sum;
  });

  dashboardTotalBorrowed = computed(() => {
    const loans = this.loanService.getLoans()();
    const filtered = loans.filter(l => l.type === 'borrowed' && (l.status === 'pending' || l.status === 'overdue'));
    const sum = filtered.reduce((sumAcc, l) => {
      if (l.installments?.enabled) {
        const instSum = (l.installments.installmentsList || [])
          .filter(inst => inst.status === 'pending' || inst.status === 'overdue')
          .reduce((s, inst) => s + Number(inst.amount || 0), 0);
        return sumAcc + (isNaN(instSum) ? 0 : instSum);
      }
      const amt = Number(l.amount || 0);
      return sumAcc + (isNaN(amt) ? 0 : amt);
    }, 0);
    return sum;
  });

  getDashboardTotalBalance(): number {
    return this.dashboardTotalBalance();
  }

  getDashboardTotalLent(): number {
    return this.dashboardTotalLent();
  }

  getDashboardTotalBorrowed(): number {
    return this.dashboardTotalBorrowed();
  }
}
