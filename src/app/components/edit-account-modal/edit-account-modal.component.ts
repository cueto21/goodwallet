import { Component, inject, input, output, signal, effect, ElementRef, Renderer2, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../services/account';
import { DarkModeService } from '../../services/dark-mode.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-edit-account-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-account-modal.component.html',
  styleUrls: ['./edit-account-modal.component.scss']
})
export class EditAccountModalComponent implements OnInit, OnDestroy {
  private accountService = inject(AccountService);
  private darkModeService = inject(DarkModeService);
  private themeService = inject(ThemeService);
  // Element and renderer to move the component to document.body to avoid stacking-context issues
  private elRef = inject(ElementRef);
  private renderer = inject(Renderer2);

  // Inputs
  account = input<any>(null);
  isOpen = input<boolean>(false);

  // Outputs
  onClose = output<void>();
  onAccountUpdated = output<any>();

  // Dark mode and theme
  darkMode = this.darkModeService.darkMode;
  currentThemeIndex = this.themeService.currentThemeIndex;

  // Button computed colors (hex strings) to force exact colors regardless of CSS cascade
  buttonBg = signal<string>('');
  buttonText = signal<string>('');

  // Method to apply button styles with !important
  applyButtonStyles() {
    // Try to apply styles several times in case the DOM is not yet rendered.
    const applyOnce = () => {
      const buttons = this.elRef.nativeElement.querySelectorAll('.modal-footer .btn');
      if (!buttons || buttons.length === 0) return false;
      buttons.forEach((btn: HTMLElement) => {
        try {
          btn.style.setProperty('background-color', this.buttonBg() || 'transparent', 'important');
          btn.style.setProperty('color', this.buttonText() || 'inherit', 'important');
          btn.style.setProperty('border-color', this.buttonBg() || 'transparent', 'important');
          btn.style.setProperty('box-shadow', 'none', 'important');
          btn.style.setProperty('background-image', 'none', 'important');
        } catch (e) {
          // ignore individual failures
        }
      });
      return true;
    };

    // Attempt immediately, then retry a few times with increasing delay to handle async rendering
    if (applyOnce()) return;
    const retries = [30, 150, 400];
    retries.forEach((delay, idx) => {
      setTimeout(() => {
        applyOnce();
      }, delay);
    });
  }

  // Form data
  editData = signal({
    balance: 0,
    creditLimit: 0,
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
          creditLimit: this.account().creditLimit ? parseFloat(this.account().creditLimit) : 0,
          goals: {
            isActive: this.account().goals?.isActive || false,
            balanceTarget: this.account().goals?.balanceTarget || null
          }
        });
      }
    });

    // Compute button colors whenever theme or dark mode changes
    effect(() => {
      const idx = this.currentThemeIndex();
      const theme = this.themeService.getThemes()[idx];
      const color1 = theme.colors[0]; // primer color del tema
      const color2 = theme.colors[1]; // segundo color del tema
      const isDark = this.darkMode();

      console.log('[DEBUG] Modal button colors - Theme index:', idx, 'Theme:', theme, 'Colors:', { color1, color2 });

      if (idx === 1) {
        // Tema 2: fondo = color 2, texto = color 1 (siempre)
        this.buttonBg.set(color2);
        this.buttonText.set(color1);
        console.log('[DEBUG] Tema 2 applied - bg:', color2, 'text:', color1);
      } else {
        // Tema 1: fondo = color 1, texto = color 2
        this.buttonBg.set(color1);
        this.buttonText.set(color2);
        console.log('[DEBUG] Tema 1 applied - bg:', color1, 'text:', color2);
      }
      
      // Apply styles with !important after colors are set
      this.applyButtonStyles();
    });

    // Ensure styles are (re)applied when the modal opens
    effect(() => {
      if (this.isOpen()) {
        // Small delay to allow modal DOM insertion
        setTimeout(() => this.applyButtonStyles(), 10);
      }
    });
  }

  ngOnInit(): void {
    // Move the component host node to document.body so the modal is rendered at top-level
    try {
      if (this.elRef && this.elRef.nativeElement && document && document.body) {
        this.renderer.appendChild(document.body, this.elRef.nativeElement);
      }
    } catch (e) {
      // ignore if DOM manipulation is not permitted in the current environment
      console.warn('Could not append modal host to body:', e);
    }
    // Center modal programmatically to work around any layout/stacking-context issues
    const centerModal = () => {
      try {
        const host = this.elRef.nativeElement as HTMLElement;
        const container = host.querySelector('.modal-container') as HTMLElement | null;
        if (!container) return;

        // Use fixed positioning and CSS transform centering
        container.style.setProperty('position', 'fixed', 'important');
        container.style.setProperty('left', '50%', 'important');
        container.style.setProperty('top', '50%', 'important');
        container.style.setProperty('transform', 'translate(-50%, -50%)', 'important');

        // Ensure the modal content doesn't overflow the viewport
        const content = host.querySelector('.modal-content') as HTMLElement | null;
        if (content) {
          const maxWidth = Math.min(window.innerWidth - 32, 450); // Ensure max width fits viewport
          content.style.setProperty('max-width', `${maxWidth}px`, 'important');
        }
      } catch (e) {
        console.error('Error centering modal:', e);
      }
    };

    // Initial center and on resize
    setTimeout(centerModal, 50);
    window.addEventListener('resize', centerModal);
    // Store the listener so it can be removed on destroy
    (this as any)._centerModalListener = centerModal;
  }

  ngOnDestroy(): void {
    // Remove the element from body if it was appended
    try {
      const parent = this.elRef?.nativeElement?.parentNode;
      if (parent) {
        this.renderer.removeChild(parent, this.elRef.nativeElement);
      }
    } catch (e) {
      // ignore
    }
    // cleanup resize listener
    try {
      const l = (this as any)._centerModalListener;
      if (l) window.removeEventListener('resize', l);
    } catch (e) {}
  }

  // Debug helper: log when inputs change
  private _logEffect = effect(() => {
    try {
      console.log('[DEBUG] EditAccountModal - isOpen:', this.isOpen(), 'account:', this.account());
    } catch (e) {
      // swallow
    }
  });

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
      const updates: any = {
        balance: this.editData().balance,
        goals: this.editData().goals
      };

      // Include creditLimit for credit cards
      if (this.account().type === 'credit') {
        updates.creditLimit = this.editData().creditLimit;
      }

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