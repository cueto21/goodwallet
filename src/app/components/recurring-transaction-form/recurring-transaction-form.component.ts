import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecurringTransactionService } from '../../services/recurring-transaction.service';
import { CategoryService } from '../../services/category';
import { AccountService } from '../../services/account';
import { DateUtilService } from '../../services/date-util.service';

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
    @if (true) {
      <!-- Backdrop primero para que el blur no afecte al modal -->
      <div class="modal-backdrop fade show"></div>
      <div class="modal fade show" tabindex="-1" role="dialog" style="display:block;">
        <div class="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" role="document">
          <div class="modal-content">
            <div class="modal-header py-3">
              <h5 class="modal-title mb-0 fw-bold">{{ isEditing() ? 'Editar' : 'Nuevo' }} Movimiento Recurrente</h5>
              <button type="button" class="btn-close" aria-label="Close" (click)="closeModal()"></button>
            </div>
            <form (ngSubmit)="onSubmit()" class="needs-validation" novalidate>
              <div class="modal-body pt-3 pb-2">
                <div class="row g-3">
                  <!-- Col 1: Información Básica -->
                  <div class="col-12 col-md-6 col-lg-4">
                    <h6 class="text-uppercase small fw-semibold text-secondary border-bottom pb-1 mb-3">Información Básica</h6>
                    <div class="mb-3">
                      <label class="form-label small text-uppercase fw-semibold">Tipo de movimiento</label>
                      <select class="form-select form-select-sm" [(ngModel)]="formData().type" name="type" required>
                        <option value="income">💰 Ingreso</option>
                        <option value="expense">💸 Gasto</option>
                      </select>
                    </div>
                    <div class="mb-3">
                      <label class="form-label small text-uppercase fw-semibold">Monto</label>
                      <input
                        type="number"
                        class="form-control form-control-sm"
                        [(ngModel)]="formData().amount"
                        name="amount"
                        placeholder="0.00"
                        step="0.01"
                        min="0.01"
                        required>
                      <div class="form-text">Cantidad del movimiento recurrente</div>
                    </div>
                    <div class="mb-3">
                      <label class="form-label small text-uppercase fw-semibold">Descripción</label>
                      <input
                        type="text"
                        class="form-control form-control-sm"
                        [(ngModel)]="formData().description"
                        name="description"
                        placeholder="Ej: Salario mensual, Alquiler"
                        required>
                      <div class="form-text">Describe brevemente este movimiento</div>
                    </div>
                  </div>

                  <!-- Col 2: Categorización -->
                  <div class="col-12 col-md-6 col-lg-4">
                    <h6 class="text-uppercase small fw-semibold text-secondary border-bottom pb-1 mb-3">Categorización</h6>
                    <div class="mb-3">
                      <label class="form-label small text-uppercase fw-semibold">Categoría</label>
                      <select class="form-select form-select-sm" [(ngModel)]="formData().categoryId" name="categoryId" required>
                        <option value="">Seleccionar categoría</option>
                        @for (category of categories(); track category.id) {
                          <option [value]="category.id">{{ category.name }}</option>
                        }
                      </select>
                    </div>
                    <div class="mb-3">
                      <label class="form-label small text-uppercase fw-semibold">Cuenta</label>
                      <select class="form-select form-select-sm" [(ngModel)]="formData().accountId" name="accountId" required>
                        <option value="">Seleccionar cuenta</option>
                        @for (account of accounts(); track account.id) {
                          <option [value]="account.id">{{ account.name }}</option>
                        }
                      </select>
                    </div>
                    <div class="mb-3">
                      <div class="form-check">
                        <input
                          class="form-check-input"
                          type="checkbox"
                          [(ngModel)]="formData().isActive"
                          name="isActive"
                          id="isActiveCheck">
                        <label class="form-check-label small fw-semibold" for="isActiveCheck">
                          Activar inmediatamente
                        </label>
                      </div>
                      <div class="form-text">Si está desactivado, podrás activarlo más tarde</div>
                    </div>
                  </div>

                  <!-- Col 3: Configuración de Recurrencia -->
                  <div class="col-12 col-md-6 col-lg-4">
                    <h6 class="text-uppercase small fw-semibold text-secondary border-bottom pb-1 mb-3">Configuración de Recurrencia</h6>
                    <div class="mb-3">
                      <label class="form-label small text-uppercase fw-semibold">Frecuencia</label>
                      <select class="form-select form-select-sm" [(ngModel)]="formData().frequency" name="frequency" required>
                        <option value="daily">📅 Diario</option>
                        <option value="weekly">📅 Semanal</option>
                        <option value="biweekly">📅 Quincenal</option>
                        <option value="monthly">📅 Mensual</option>
                      </select>
                      <div class="form-text">¿Con qué frecuencia se repetirá?</div>
                    </div>
                    <div class="mb-3">
                      <label class="form-label small text-uppercase fw-semibold">Fecha de inicio</label>
                      <input
                        type="date"
                        class="form-control form-control-sm"
                        [(ngModel)]="formData().startDate"
                        name="startDate"
                        required>
                      <div class="form-text">¿Cuándo comenzará este movimiento?</div>
                    </div>
                    <div class="mb-3">
                      <label class="form-label small text-uppercase fw-semibold">Fecha de fin (Opcional)</label>
                      <input
                        type="date"
                        class="form-control form-control-sm"
                        [(ngModel)]="formData().endDate"
                        name="endDate">
                      <div class="form-text">Dejar vacío para que sea indefinido</div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="modal-footer py-2">
                <button type="button" class="btn btn-outline-secondary btn-sm" (click)="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary btn-sm" [disabled]="!isFormValid()">{{ isEditing() ? 'Actualizar' : 'Crear' }} Movimiento Recurrente</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['./recurring-transaction-form.component.scss']
})
export class RecurringTransactionFormComponent {
  private recurringService = inject(RecurringTransactionService);
  private categoryService = inject(CategoryService);
  private accountService = inject(AccountService);
  private dateUtil = inject(DateUtilService);

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
    startDate: this.dateUtil.getTodayString(),
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
      startDate: this.dateUtil.parseLocalDate(data.startDate),
      endDate: data.endDate ? this.dateUtil.parseLocalDate(data.endDate) : undefined,
      isActive: data.isActive,
      nextDate: this.dateUtil.parseLocalDate(data.startDate),
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
      startDate: this.dateUtil.getTodayString(),
      endDate: '',
      isActive: true
    });
    this.isEditing.set(false);
  }
}
