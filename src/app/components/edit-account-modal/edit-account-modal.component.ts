import { Component, inject, input, output, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../services/account';
import { DarkModeService } from '../../services/dark-mode.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-edit-account-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-account-modal.component.html',
  styleUrl: './edit-account-modal.component.scss'
})
export class EditAccountModalComponent {
  private accountService = inject(AccountService);
  private darkModeService = inject(DarkModeService);
  private themeService = inject(ThemeService);

  // Inputs
  account = input<any>(null);
  isOpen = input<boolean>(false);

  // Outputs
  onClose = output<void>();
  onAccountUpdated = output<any>();

  // Dark mode and theme
  darkMode = this.darkModeService.darkMode;
  currentThemeIndex = this.themeService.currentThemeIndex;

  // Form data
  editData = signal({
    balance: 0,
    goals: {
      isActive: false,
      balanceTarget: undefined as number | undefined
    }
  });

  // Loading state
  isSaving = signal(false);

  constructor() {
    effect(() => {
      if (this.account() && this.isOpen()) {
        this.editData.set({
          balance: this.account().balance || 0,
          goals: {
            isActive: this.account().goals?.isActive || false,
            balanceTarget: this.account().goals?.balanceTarget || null
          }
        });
      }
    });
  }

  closeModal() {
    this.onClose.emit();
  }

  toggleSavingsGoal() {
    this.editData.update(data => ({
      ...data,
      goals: {
        ...data.goals,
        isActive: !data.goals.isActive,
        balanceTarget: !data.goals.isActive ? data.goals.balanceTarget : undefined
      }
    }));
  }

  async saveChanges() {
    if (!this.account()) return;

    this.isSaving.set(true);
    try {
      const updates = {
        balance: this.editData().balance,
        goals: this.editData().goals
      };

      await this.accountService.updateAccount(this.account().id, updates);
      this.onAccountUpdated.emit({ ...this.account(), ...updates });
      this.closeModal();
    } catch (error) {
      console.error('Error updating account:', error);
      alert('Error al actualizar la cuenta');
    } finally {
      this.isSaving.set(false);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  }
}