import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecurringTransactionService } from '../../services/recurring-transaction.service';
import { CategoryService } from '../../services/category';
import { AccountService } from '../../services/account';

interface RecurringTransactionForm {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  categoryId: string;
  accountId: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  startDate: string;
  endDate: string;
  isActive: boolean;
}

@Component({
  selector: 'app-recurring-transaction-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-backdrop" 
         (click)="onBackdropClick($event)">
      <div class="modal-content" 
           (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ isEditing() ? 'Editar' : 'Nuevo' }} Movimiento Recurrente</h3>
          <button class="close-btn" (click)="closeModal()">&times;</button>
        </div>
        
        <div class="modal-body">
          <form (ngSubmit)="onSubmit()" class="recurring-form">
            
            <!-- Layout principal de dos columnas -->
            <div class="main-form-layout">
              
              <!-- Columna 1: Información Básica -->
              <div class="form-column">
                <div class="form-column-title">Información Básica</div>
                
                <div class="form-group">
                  <label>Tipo de movimiento:</label>
                  <select [(ngModel)]="formData().type" name="type" required>
                    <option value="income">💰 Ingreso</option>
                    <option value="expense">💸 Gasto</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label>Monto:</label>
                  <input 
                    type="number" 
                    [(ngModel)]="formData().amount" 
                    name="amount" 
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    required>
                  <small>Cantidad del movimiento recurrente</small>
                </div>
                
                <div class="form-group">
                  <label>Descripción:</label>
                  <input 
                    type="text" 
                    [(ngModel)]="formData().description" 
                    name="description"
                    placeholder="Ej: Salario mensual, Alquiler, Suscripción Netflix"
                    required>
                  <small>Describe brevemente este movimiento recurrente</small>
                </div>
                
                <div class="form-group">
                  <label>Categoría:</label>
                  <select [(ngModel)]="formData().categoryId" name="categoryId" required>
                    <option value="">Seleccionar categoría</option>
                    @for (category of categories(); track category.id) {
                      <option [value]="category.id">{{ category.name }}</option>
                    }
                  </select>
                </div>
                
                <div class="form-group">
                  <label>Cuenta:</label>
                  <select [(ngModel)]="formData().accountId" name="accountId" required>
                    <option value="">Seleccionar cuenta</option>
                    @for (account of accounts(); track account.id) {
                      <option [value]="account.id">{{ account.name }}</option>
                    }
                  </select>
                </div>
              </div>

              <!-- Columna 2: Configuración de Recurrencia -->
              <div class="form-column">
                <div class="form-column-title">Configuración de Recurrencia</div>
                
                <div class="form-group">
                  <label>Frecuencia:</label>
                  <select [(ngModel)]="formData().frequency" name="frequency" required>
                    <option value="daily">📅 Diario</option>
                    <option value="weekly">📅 Semanal</option>
                    <option value="biweekly">📅 Quincenal</option>
                    <option value="monthly">📅 Mensual</option>
                  </select>
                  <small>¿Con qué frecuencia se repetirá este movimiento?</small>
                </div>
                
                <div class="form-group">
                  <label>Fecha de inicio:</label>
                  <input 
                    type="date" 
                    [(ngModel)]="formData().startDate" 
                    name="startDate"
                    required>
                  <small>¿Cuándo comenzará este movimiento recurrente?</small>
                </div>
                
                <div class="form-group">
                  <label>Fecha de fin (Opcional):</label>
                  <input 
                    type="date" 
                    [(ngModel)]="formData().endDate" 
                    name="endDate">
                  <small>Dejar vacío para que sea indefinido</small>
                </div>
                
                <div class="form-group checkbox-group">
                  <label class="checkbox-label">
                    <input 
                      type="checkbox" 
                      [(ngModel)]="formData().isActive" 
                      name="isActive">
                    <span class="checkmark"></span>
                    Activar inmediatamente
                  </label>
                  <small>Si está desactivado, podrás activarlo manualmente más tarde</small>
                </div>
                
                <!-- Preview de la recurrencia -->
                <div class="recurrence-preview">
                  <h4>Vista previa:</h4>
                  <div class="preview-card" [class]="formData().type">
                    <div class="preview-icon">
                      {{ formData().type === 'income' ? '💰' : '💸' }}
                    </div>
                    <div class="preview-details">
                      <div class="preview-description">{{ formData().description || 'Descripción del movimiento' }}</div>
                      <div class="preview-amount">S/ {{ formData().amount || 0 }}</div>
                      <div class="preview-frequency">{{ getFrequencyText() }}</div>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </form>
        </div>
        
        <div class="modal-footer">
          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="closeModal()">Cancelar</button>
            <button type="submit" class="btn-primary" [disabled]="!isFormValid()" (click)="onSubmit()">
              {{ isEditing() ? 'Actualizar' : 'Crear' }} Movimiento Recurrente
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./recurring-transaction-form.component.scss']
})
export class RecurringTransactionFormComponent {
  private recurringService = inject(RecurringTransactionService);
  private categoryService = inject(CategoryService);
  private accountService = inject(AccountService);

  // Outputs
  modalClosed = output<void>();
  recurringTransactionSaved = output<void>();

  // State
  isEditing = signal(false);
  
  // Form data with signals
  formData = signal<RecurringTransactionForm>({
    type: 'expense',
    amount: 0,
    description: '',
    categoryId: '',
    accountId: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isActive: true
  });

  // Data
  categories = this.categoryService.getCategories();
  accounts = this.accountService.getAccounts();

  // Methods
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.resetForm();
    this.modalClosed.emit();
  }

  onSubmit(): void {
    if (!this.isFormValid()) {
      return;
    }

    const data = this.formData();
    const recurringTransaction = {
      id: crypto.randomUUID(),
      amount: data.amount,
      description: data.description,
      categoryId: data.categoryId,
      accountId: data.accountId,
      type: data.type,
      frequency: data.frequency,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
      isActive: data.isActive,
      nextDate: new Date(data.startDate),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.recurringService.addRecurringTransaction(recurringTransaction);
    this.recurringTransactionSaved.emit();
    this.closeModal();
  }

  isFormValid(): boolean {
    const data = this.formData();
    return !!(
      data.amount > 0 &&
      data.description.trim() &&
      data.categoryId &&
      data.accountId &&
      data.frequency &&
      data.startDate
    );
  }

  getFrequencyText(): string {
    const frequencyMap = {
      daily: 'Cada día',
      weekly: 'Cada semana', 
      biweekly: 'Cada quincena',
      monthly: 'Cada mes'
    };
    return frequencyMap[this.formData().frequency];
  }

  resetForm(): void {
    this.formData.set({
      type: 'expense',
      amount: 0,
      description: '',
      categoryId: '',
      accountId: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      isActive: true
    });
    this.isEditing.set(false);
  }
}
