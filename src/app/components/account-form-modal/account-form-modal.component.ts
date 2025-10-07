import { Component, signal, inject, output, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../services/account';
import { CardStyleService } from '../../services/card-style.service';

interface NewAccountForm {
  name: string;
  type: 'savings' | 'credit';
  balance: number;
  creditLimit: number;
  balanceTarget: number;
  spendingLimit: number;
  targetDate: string;
  goalDescription: string;
  selectedCardStyle: any;
}

@Component({
  selector: 'app-account-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <!-- Backdrop primero para que el blur no afecte al modal -->
      <div class="modal-backdrop fade show"></div>
      <div class="modal fade show" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" role="document">
          <div class="modal-content">
            <!-- Step Indicator -->
            <div class="step-indicator">
              <div class="step" [class.active]="currentStep() >= 1">
                <span class="step-number">1</span>
                <span class="step-label">Información</span>
              </div>
              <div class="step-line" [class.active]="currentStep() >= 2"></div>
              <div class="step" [class.active]="currentStep() >= 2">
                <span class="step-number">2</span>
                <span class="step-label">Diseño</span>
              </div>
            </div>

            <form (keydown.escape)="closeModal()" style="display: flex; flex-direction: column; height: 100%;">
              <!-- Step 1: Account Information -->
              <div class="step-content" [class.active]="currentStep() === 1" [class.slide-left]="currentStep() > 1">
                <div class="form-grid">
                  <!-- Left Column -->
                  <div class="form-column">
                    <div class="form-group">
                      <label for="account-name">Nombre:</label>
                      <input type="text" id="account-name" [(ngModel)]="formData().name" name="name" aria-describedby="name-help" autocomplete="off">
                      <small id="name-help" class="form-text">Nombre descriptivo para tu cuenta</small>
                    </div>

                    <div class="form-group">
                      <label>Tipo de Cuenta:</label>
                      <div class="account-type-buttons" role="radiogroup" aria-labelledby="account-type-label">
                        <button
                          type="button"
                          class="account-type-btn"
                          [class.active]="formData().type === 'savings'"
                          (click)="selectAccountType('savings')"
                          aria-pressed="formData().type === 'savings'">
                          💰 Cuenta de Ahorros
                        </button>
                        <button
                          type="button"
                          class="account-type-btn"
                          [class.active]="formData().type === 'credit'"
                          (click)="selectAccountType('credit')"
                          aria-pressed="formData().type === 'credit'">
                          💳 Tarjeta de Crédito
                        </button>
                      </div>
                      <small id="type-help" class="form-text">Selecciona el tipo de cuenta</small>
                    </div>
                  </div>

                  <!-- Right Column -->
                  <div class="form-column">
                    <div class="form-group">
                      <label for="initial-balance">{{ formData().type === 'credit' ? 'Monto Disponible:' : 'Saldo Inicial:' }}</label>
                      <input type="number" id="initial-balance" [(ngModel)]="formData().balance" name="balance" step="0.01" placeholder="0.00" aria-describedby="balance-help">
                      <small id="balance-help" class="form-text">{{ formData().type === 'credit' ? 'Monto disponible en la tarjeta' : 'Saldo actual de la cuenta' }}</small>
                    </div>

                    <div class="form-group" *ngIf="formData().type === 'credit'">
                      <label for="credit-limit">Límite de Crédito:</label>
                      <input type="number" id="credit-limit" [(ngModel)]="formData().creditLimit" name="creditLimit" step="0.01" placeholder="0.00" aria-describedby="limit-help">
                      <small id="limit-help" class="form-text">Límite total de la tarjeta de crédito</small>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Step 2: Card Design Selection -->
              <div class="step-content" [class.active]="currentStep() === 2" [class.slide-in]="currentStep() === 2">
                <div class="card-style-section">
                  <h3 class="section-title">Elige el diseño de tu tarjeta</h3>
                  <p class="section-subtitle">Personaliza el aspecto visual de tu cuenta</p>

                  <div class="card-style-grid">
                    <div
                      class="card-style-option"
                      [class.selected]="formData().selectedCardStyle === style"
                      *ngFor="let style of availableCardStyles()"
                      (click)="selectCardStyle(style)"
                      [attr.aria-label]="'Seleccionar diseño ' + style.name">
                      <div class="card-preview" [style.background]="style.gradient">
                        <div class="card-content">
                          <div class="card-name">{{ style.name }}</div>
                          <div class="card-type">{{ formData().type === 'credit' ? 'CRÉDITO' : 'AHORROS' }}</div>
                        </div>
                      </div>
                      <div class="card-info">
                        <span class="card-description">{{ style.description }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-actions" [class.step-2]="currentStep() === 2">
                <!-- Step 1 and default layout -->
                <div class="form-actions-row" *ngIf="currentStep() !== 2">
                  <button type="button" class="btn-cancel" (click)="closeModal()" aria-label="Cancelar y cerrar modal">Cancelar</button>

                  <button
                    type="button"
                    class="btn-primary"
                    (click)="nextStep()"
                    [disabled]="!formData().name.trim()"
                    aria-label="Continuar al siguiente paso">
                    Siguiente
                  </button>
                </div>

                <!-- Step 2 layout -->
                <div class="form-actions-step2" *ngIf="currentStep() === 2">
                  <div class="form-actions-row">
                    <button
                      type="button"
                      class="btn-secondary"
                      (click)="previousStep()"
                      aria-label="Volver al paso anterior">
                      Anterior
                    </button>

                    <button type="button" class="btn-cancel" (click)="closeModal()" aria-label="Cancelar y cerrar modal">Cancelar</button>
                  </div>

                  <button
                    type="button"
                    class="btn-save-full"
                    (click)="onSubmit()"
                    [disabled]="!formData().selectedCardStyle"
                    aria-label="Guardar nueva cuenta">
                    Guardar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['./account-form-modal.component.scss']
})
export class AccountFormModalComponent {
  private accountService = inject(AccountService);
  private cardStyleService = inject(CardStyleService);
  private originalScrollY = 0; // Variable para guardar la posición original del scroll
  
  // Inputs y Outputs
  isOpen = input<boolean>(false);
  onClose = output<void>();
  onAccountCreated = output<any>();
  
  // Step management
  currentStep = signal(1);
  totalSteps = 2;

  // Form data
  formData = signal<NewAccountForm>({
    name: '',
    type: 'savings',
    balance: 0,
    creditLimit: 0,
    balanceTarget: 0,
    spendingLimit: 0,
    targetDate: '',
    goalDescription: '',
    selectedCardStyle: null
  });

  availableCardStyles = () => this.cardStyleService.getAllStyles();

  constructor() {
    // Initialize with first card style
    const styles = this.availableCardStyles();
    if (styles.length > 0) {
      this.formData.update(data => ({
        ...data,
        selectedCardStyle: styles[0]
      }));
    }

    // Efecto para manejar el scroll del body y prevenir scroll fuera del modal
    effect(() => {
      if (this.isOpen()) {
        // Guardar posición de scroll actual
        this.originalScrollY = window.scrollY;
        
        // Prevenir scroll del body usando overflow hidden únicamente
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        
        // Calcular el ancho de la scrollbar para evitar saltos
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
          document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
        
      } else {
        // Restaurar scroll del body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // NO restaurar scroll - mantener la posición actual para mejor UX
      }
    });

  // Quitado efecto de posicionamiento manual: Bootstrap ya centra con .modal-dialog-centered
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  onBackdropScroll(event: Event): void {
    // Prevenir el scroll en el backdrop (fuera del modal)
    event.preventDefault();
    event.stopPropagation();
  }

  onModalContentScroll(event: Event): void {
    // Permitir scroll solo dentro del contenido del modal
    event.stopPropagation();
  }

  closeModal(): void {
    // Restaurar scroll del body al cerrar
    document.body.classList.remove('modal-open');
    const scrollY = document.body.style.top;
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
    document.body.style.overflow = '';
    if (scrollY) {
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    }

    this.currentStep.set(1); // Reset to first step
    this.resetForm();
    this.onClose.emit();
  }

  selectCardStyle(style: any): void {
    this.formData.update(data => ({
      ...data,
      selectedCardStyle: style
    }));
  }

  selectAccountType(type: 'savings' | 'credit'): void {
    this.formData.update(data => ({
      ...data,
      type
    }));
  }

  nextStep(): void {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.update(step => step + 1);
    }
  }

  previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
    }
  }

  isFormValid(): boolean {
    const data = this.formData();
    return !!(data.name.trim() && data.selectedCardStyle);
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      return;
    }

    const data = this.formData();
    
    // Create new account object
    const newAccount = {
      id: Date.now(),
      name: data.name.trim(),
      type: data.type,
      // Para tarjetas de crédito, el saldo se guarda como negativo (lo consumido)
      balance: data.type === 'credit' ? -(Number(data.balance) || 0) : (Number(data.balance) || 0),
      creditLimit: data.type === 'credit' ? Number(data.creditLimit) || 0 : 0,
      selectedCardStyle: data.selectedCardStyle,
      cardStyle: data.selectedCardStyle ? {
        gradient: data.selectedCardStyle.gradient,
        cardType: data.selectedCardStyle.cardType,
        bank: data.selectedCardStyle.bank
      } : undefined,
      goals: {
        isActive: !!(data.balanceTarget || data.spendingLimit || data.goalDescription),
        balanceTarget: data.type === 'savings' ? Number(data.balanceTarget) || 0 : 0,
        spendingLimit: data.type === 'credit' ? Number(data.spendingLimit) || 0 : 0,
        targetDate: data.type === 'savings' && data.targetDate ? new Date(data.targetDate) : undefined,
        description: data.goalDescription.trim() || undefined
      }
    };

    // Add account using service
    this.accountService.addAccount(newAccount);
    
    // Emit success event
    this.onAccountCreated.emit(newAccount);
    
    // Close modal
    this.closeModal();
  }

  private resetForm(): void {
    const styles = this.availableCardStyles();
    this.formData.set({
      name: '',
      type: 'savings',
      balance: 0,
      creditLimit: 0,
      balanceTarget: 0,
      spendingLimit: 0,
      targetDate: '',
      goalDescription: '',
      selectedCardStyle: styles.length > 0 ? styles[0] : null
    });
  }
}
