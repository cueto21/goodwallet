import { Component, signal, inject, output, input, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../services/transaction';
import { AccountService } from '../../services/account';
import { CategoryService } from '../../services/category';

@Component({
  selector: 'app-transaction-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" *ngIf="isOpen()" (click)="onBackdropClick($event)">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Agregar Nuevo Movimiento</h3>
          <button class="close-btn" (click)="closeModal()">&times;</button>
        </div>
        
        <form (ngSubmit)="onSubmit()" class="transaction-form">
          <!-- Tipo de transacción -->
          <div class="form-group">
            <label>Tipo:</label>
            <div class="radio-group">
              <label class="radio-option">
                <input 
                  type="radio" 
                  name="type" 
                  value="income" 
                  [checked]="formData().type === 'income'"
                  (change)="updateFormField('type', 'income')">
                <span class="radio-label income">Ingreso</span>
              </label>
              <label class="radio-option">
                <input 
                  type="radio" 
                  name="type" 
                  value="expense" 
                  [checked]="formData().type === 'expense'"
                  (change)="updateFormField('type', 'expense')">
                <span class="radio-label expense">Gasto</span>
              </label>
            </div>
          </div>

          <!-- Monto -->
          <div class="form-group">
            <label for="amount">Monto (S/):</label>
            <input 
              type="number" 
              id="amount"
              step="0.01"
              min="0.01"
              [value]="formData().amount"
              (input)="onAmountChange($event)"
              required>
          </div>

          <!-- Descripción -->
          <div class="form-group">
            <label for="description">Descripción:</label>
            <input 
              type="text" 
              id="description"
              [value]="formData().description"
              (input)="onDescriptionChange($event)"
              required>
          </div>

          <!-- Fecha -->
          <div class="form-group">
            <label for="date">Fecha:</label>
            <input 
              type="date" 
              id="date"
              [value]="formData().date"
              (input)="onDateChange($event)"
              required>
          </div>

          <!-- Cuenta -->
          <div class="form-group">
            <label for="account">Cuenta:</label>
            <select 
              id="account"
              [value]="formData().accountId"
              (change)="onAccountChange($event)"
              required>
              <option value="">Seleccionar cuenta</option>
              @for (account of accounts(); track account.id) {
                <option [value]="account.id">{{ account.name }}</option>
              }
            </select>
          </div>

          <!-- Categoría -->
          <div class="form-group">
            <label for="category">Categoría:</label>
            <select 
              id="category"
              [value]="formData().categoryId"
              (change)="onCategoryChange($event)"
              required>
              <option value="">Seleccionar categoría</option>
              <option value="1">Alimentación</option>
              <option value="2">Ingresos</option>
              <option value="3">Entretenimiento</option>
              <option value="4">Compras</option>
              <option value="5">Transferenciaencias</option>
            </select>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-cancel" (click)="closeModal()">
              Cancelar
            </button>
            <button type="submit" class="btn-submit" [disabled]="isSubmitting()">
              {{ isSubmitting() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      backdrop-filter: blur(2px);
      overflow-y: auto;
      padding: 20px;
      box-sizing: border-box;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      padding: 0;
      width: 100%;
      max-width: 400px;
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
      animation: modalSlideIn 0.3s ease-out;
      position: relative;
      z-index: 10000;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (max-width: 640px) {
      .modal-backdrop {
        padding: 8px;
        align-items: flex-start;
        padding-top: 16px;
      }
      
      .modal-content {
        max-height: calc(100vh - 24px);
        width: 100%;
        max-width: 360px;
      }

      .transaction-form {
        padding: 12px 16px 16px;
      }

      .modal-header {
        padding: 12px 16px 8px;
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px 12px;
      border-bottom: 1px solid #e5e7eb;

      h3 {
        margin: 0;
        color: #1f2937;
        font-size: 1.1rem;
        font-weight: 600;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 24px;
        color: #6b7280;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
        border-radius: 4px;
        transition: all 0.2s;

        &:hover {
          background: #f3f4f6;
          color: #1f2937;
        }
      }
    }

    .transaction-form {
      padding: 16px 20px 20px;
    }

    .form-group {
      margin-bottom: 12px;

      label {
        display: block;
        margin-bottom: 6px;
        color: #374151;
        font-weight: 500;
        font-size: 0.9rem;
      }

      input, select {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid #d1d5db;
        border-radius: 5px;
        font-size: 14px;
        transition: all 0.2s;
        box-sizing: border-box;

        &:focus {
          outline: none;
          border-color: #10b981;
          box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
        }
      }
    }

    .radio-group {
      display: flex;
      gap: 12px;
      margin-top: 4px;

      .radio-option {
        display: flex;
        align-items: center;
        cursor: pointer;

        input[type="radio"] {
          width: auto;
          margin-right: 8px;
        }

        .radio-label {
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.2s;

          &.income {
            color: #059669;
            background: rgba(16, 185, 129, 0.1);
          }

          &.expense {
            color: #dc2626;
            background: rgba(239, 68, 68, 0.1);
          }
        }

        input:checked + .radio-label {
          &.income {
            background: #10b981;
            color: white;
          }

          &.expense {
            background: #ef4444;
            color: white;
          }
        }
      }
    }

    .form-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;

      button {
        padding: 8px 16px;
        border-radius: 5px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: none;
        font-size: 13px;

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      .btn-cancel {
        background: #f3f4f6;
        color: #374151;

        &:hover:not(:disabled) {
          background: #e5e7eb;
        }
      }

      .btn-submit {
        background: #10b981;
        color: white;

        &:hover:not(:disabled) {
          background: #059669;
        }
      }
    }
  `]
})
export class TransactionFormModalComponent {
  private transactionService = inject(TransactionService);
  private accountService = inject(AccountService);
  private categoryService = inject(CategoryService);
  
  // Señales de entrada y salida
  isOpen = input<boolean>(false);
  preselectedType = input<'income' | 'expense' | null>(null);
  onClose = output<void>();
  onTransactionAdded = output<void>();
  
  // Datos para el formulario
  accounts = this.accountService.getAccounts();
  
  // Formulario
  formData = signal({
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    accountId: '',
    type: 'expense' as 'income' | 'expense'
  });
  
  // Estados
  isSubmitting = signal(false);
  
  constructor() {
    // Efecto para preseleccionar el tipo cuando se abre el modal
    effect(() => {
      const type = this.preselectedType();
      if (type) {
        this.formData.update(data => ({ ...data, type }));
      }
    });

    // Efecto para controlar el scroll del body cuando el modal está abierto/cerrado
    effect(() => {
      if (this.isOpen()) {
        // Prevenir scroll del body
        document.body.style.overflow = 'hidden';
      } else {
        // Restaurar scroll del body
        document.body.style.overflow = '';
      }
    });
  }
  
  // Métodos auxiliares para manejar eventos de input
  onAmountChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.updateFormField('amount', +target.value);
    }
  }
  
  onDescriptionChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.updateFormField('description', target.value);
    }
  }
  
  onDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.updateFormField('date', target.value);
    }
  }
  
  onAccountChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.updateFormField('accountId', target.value);
    }
  }
  
  onCategoryChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (target) {
      this.updateFormField('categoryId', target.value);
    }
  }
  
  updateFormField<K extends keyof ReturnType<typeof this.formData>>(
    field: K, 
    value: ReturnType<typeof this.formData>[K]
  ) {
    this.formData.update(data => ({ ...data, [field]: value }));
  }
  
  async onSubmit() {
    if (this.isSubmitting()) return;
    
    const data = this.formData();
    
    // Validaciones básicas
    if (!data.amount || !data.description || !data.categoryId || !data.accountId) {
      alert('Por favor completa todos los campos');
      return;
    }
    
    if (data.amount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }
    
    this.isSubmitting.set(true);
    
    try {
      this.transactionService.addTransaction({
        amount: data.amount,
        description: data.description,
        date: new Date(data.date),
        categoryId: data.categoryId,
        accountId: data.accountId,
        type: data.type
      });
      
      // Actualizar el balance de la cuenta
      this.accountService.updateAccountBalance(data.accountId, data.amount, data.type);
      
      // Resetear formulario
      this.resetForm();
      
      // Emitir eventos
      this.onTransactionAdded.emit();
      this.closeModal();
      
    } catch (error) {
      console.error('Error al agregar la transacción:', error);
      alert('Error al agregar la transacción. Inténtalo de nuevo.');
    } finally {
      this.isSubmitting.set(false);
    }
  }
  
  closeModal() {
    console.log('Cerrando modal...'); // Debug log
    // Restaurar scroll del body inmediatamente
    document.body.style.overflow = '';
    this.onClose.emit();
    this.resetForm();
  }
  
  private resetForm() {
    this.formData.set({
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      categoryId: '',
      accountId: '',
      type: 'expense'
    });
  }
  
  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}
