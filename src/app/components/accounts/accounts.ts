import { Component, inject, computed, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../services/account';
import { DarkModeService } from '../../services/dark-mode.service';
import { CardStyleService } from '../../services/card-style.service';
import { Account } from '../../models/account.interface';

@Component({
  selector: 'app-accounts',
  imports: [CommonModule, FormsModule],
  templateUrl: './accounts.html',
  styleUrl: './accounts.scss'
})
export class AccountsComponent implements OnInit {
  private accountService = inject(AccountService);
  private darkModeService = inject(DarkModeService);
  private cardStyleService = inject(CardStyleService);

  // Use the global dark mode service signal
  isDarkMode = this.darkModeService.darkMode;

  // Modal properties
  showNewAccountForm = false;
  currentStep = 1;
  totalSteps = 2;
  private originalBodyOverflow = '';

  // Form properties
  newAccount = {
    name: '',
    type: 'savings' as 'savings' | 'credit',
    balance: null as number | null,
    creditLimit: null as number | null,
    selectedCardStyle: null as any
  };

  // Card styles
  availableCardStyles = computed(() => this.cardStyleService.getAllStyles());

  accounts = computed(() => this.accountService.getAccounts()());

  async ngOnInit() {
    try {
      // Load accounts if not already loaded
      if (!this.accountService.areAccountsLoaded()) {
        await this.accountService.loadAccounts();
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  }

  // Form methods
  openNewAccountForm() {
    this.showNewAccountForm = true;
    this.resetNewAccountForm();
    this.preventBodyScroll();
  }

  private preventBodyScroll() {
    // Store original overflow
    this.originalBodyOverflow = document.body.style.overflow || '';

    // Prevent body scroll by setting overflow hidden
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '0px'; // Prevent layout shift

    // Also prevent scroll on html element
    document.documentElement.style.overflow = 'hidden';
  }

  cancelNewAccount() {
    this.showNewAccountForm = false;
    this.resetNewAccountForm();
    this.restoreBodyScroll();
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  selectCardStyle(style: any) {
    this.newAccount.selectedCardStyle = style;
  }

  private restoreBodyScroll() {
    document.body.style.overflow = this.originalBodyOverflow;
    document.documentElement.style.overflow = '';
  }

  saveNewAccount() {
    if (!this.newAccount.name.trim()) {
      alert('El nombre de la cuenta es requerido');
      return;
    }

    if (this.newAccount.type === 'credit' && (this.newAccount.creditLimit === null || this.newAccount.creditLimit <= 0)) {
      alert('El límite de crédito debe ser mayor a 0');
      return;
    }

    // Simple account creation
    const accountData = {
      name: this.newAccount.name,
      type: this.newAccount.type,
      balance: this.newAccount.balance || 0,
      creditLimit: this.newAccount.type === 'credit' ? this.newAccount.creditLimit || 0 : undefined,
      cardStyle: this.newAccount.selectedCardStyle ? {
        gradient: this.newAccount.selectedCardStyle.gradient,
        cardType: this.newAccount.selectedCardStyle.cardType,
        bank: this.newAccount.selectedCardStyle.bank
      } : undefined
    };

    this.accountService.addAccount(accountData as any);
    this.showNewAccountForm = false;
    this.resetNewAccountForm();
    this.restoreBodyScroll();
    alert('Cuenta agregada exitosamente');
  }

  private resetNewAccountForm() {
    this.newAccount = {
      name: '',
      type: 'savings',
      balance: null,
      creditLimit: null,
      selectedCardStyle: this.availableCardStyles()[0] || null
    };
    this.currentStep = 1;
  }

  // Simple edit method - just show alert for now
  editAccount(accountId: string) {
    alert('Funcionalidad de edición próximamente disponible');
  }

  // Delete account
  deleteAccount(accountId: string) {
    const account = this.accounts().find(a => a.id === accountId);
    if (account) {
      const confirmDelete = confirm(`¿Estás seguro que deseas eliminar la cuenta "${account.name}"?\n\nEsta acción no se puede deshacer y eliminará todas las transacciones asociadas.`);
      if (confirmDelete) {
        this.accountService.deleteAccount(accountId);
        alert('Cuenta eliminada exitosamente');
      }
    }
  }

  // Helper methods for the template
  getCardGradient(account: Account): string {
    if (account.cardStyle?.gradient) {
      return account.cardStyle.gradient;
    }
    // Default gradients
    const defaults = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    ];
    return defaults[Number(account.id) % defaults.length];
  }

  formatBalance(account: Account): string {
    if (account.type === 'credit') {
      const available = (account.creditLimit || 0) + account.balance;
      return available.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return account.balance.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatNumber(value: number | string): string {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return num.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  getGoalProgress(account: Account): number {
    if (!account.goals?.isActive || account.type !== 'savings') return 0;
    if (!account.goals.balanceTarget) return 0;
    return Math.min(100, (account.balance / account.goals.balanceTarget) * 100);
  }

  // Helper method for absolute value
  getAbsoluteValue(value: number): number {
    return Math.abs(value);
  }

  // TrackBy function for ngFor
  trackById(index: number, item: any): any {
    return item?.id || index;
  }

  // Keyboard navigation
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: Event): void {
    if (this.showNewAccountForm) {
      this.cancelNewAccount();
    }
  }
}
