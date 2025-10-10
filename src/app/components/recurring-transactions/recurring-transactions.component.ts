import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecurringTransactionService } from '../../services/recurring-transaction.service';
import { CategoryService } from '../../services/category';
import { AccountService } from '../../services/account';
import { SidebarService } from '../../services/sidebar.service';
import { DarkModeService } from '../../services/dark-mode.service';
import { RecurringTransactionFormComponent } from '../recurring-transaction-form/recurring-transaction-form.component';
import { PendingRecurringTransactionsComponent } from '../pending-recurring-transactions/pending-recurring-transactions.component';

@Component({
  selector: 'app-recurring-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, RecurringTransactionFormComponent, PendingRecurringTransactionsComponent],
  template: `
    <div class="recurring-transactions-container" [class.dark]="isDarkMode()">
      <!-- Header -->
      <header class="recurring-header">
        <div class="header-content">
          <h1 class="header-title">Movimientos Recurrentes</h1>
          <button class="btn btn-create-recurring" (click)="openAddModal()" title="Crear nuevo movimiento recurrente">
            <span class="icon-plus">+</span>
          </button>
        </div>
      </header>

      <!-- Statistics Cards -->
      <section class="stats-section">
        <div class="stats-grid">
          <div class="stat-card stat-active">
            <div class="stat-content">
              <h3 class="stat-label">Activos</h3>
              <p class="stat-amount">{{ totalActiveRecurring() }}</p>
              <span class="stat-count stat-count--visible">movimientos</span>
            </div>
          </div>

          <div class="stat-card stat-income">
            <div class="stat-content">
              <h3 class="stat-label">Ingresos</h3>
              <p class="stat-amount">{{ formatCurrency(totalIncomeRecurring()) }}</p>
              <span class="stat-count stat-count--visible">mensuales</span>
            </div>
          </div>

          <div class="stat-card stat-expense">
            <div class="stat-content">
              <h3 class="stat-label">Gastos</h3>
              <p class="stat-amount">{{ formatCurrency(totalExpenseRecurring()) }}</p>
              <span class="stat-count stat-count--visible">mensuales</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Pending Transactions -->
      <app-pending-recurring-transactions
        (transactionConfirmed)="onTransactionConfirmed()">
      </app-pending-recurring-transactions>

      <!-- Filters -->
      <section class="filters-section">
        <div class="filters-grid">
          <div class="filter-item">
            <label class="filter-label">Estado:</label>
            <select class="filter-select" [(ngModel)]="statusFilter">
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </div>

          <div class="filter-item">
            <label class="filter-label">Tipo:</label>
            <select class="filter-select" [(ngModel)]="typeFilter">
              <option value="all">Todos</option>
              <option value="income">Ingresos</option>
              <option value="expense">Gastos</option>
            </select>
          </div>

          <div class="filter-item">
            <label class="filter-label">Frecuencia:</label>
            <select class="filter-select" [(ngModel)]="frequencyFilter">
              <option value="all">Todas</option>
              <option value="daily">Diario</option>
              <option value="weekly">Semanal</option>
              <option value="biweekly">Quincenal</option>
              <option value="monthly">Mensual</option>
            </select>
          </div>
        </div>
      </section>

      <!-- Recurring Transactions Grid -->
      <section class="recurring-section">
        @if (filteredRecurringTransactions().length === 0) {
          <div class="empty-state">
            <h3 class="empty-title">No hay movimientos recurrentes</h3>
            <p class="empty-description">Crea tu primer movimiento recurrente para automatizar tus finanzas</p>
            <button class="btn btn-primary" (click)="openAddModal()">
              Crear Movimiento Recurrente
            </button>
          </div>
        } @else {
          <div class="recurring-grid">
            @for (recurring of filteredRecurringTransactions(); track recurring.id) {
              <article class="recurring-card" [class]="'recurring-' + recurring.type + ' recurring-' + recurring.frequency + (recurring.isActive ? '' : ' recurring-inactive')">

                <!-- Card Header -->
                <header class="card-header">
                  <div class="recurring-type-badge" [class]="'badge-' + recurring.type">
                    <span class="badge-text">{{ recurring.type === 'income' ? 'Ingreso' : 'Gasto' }} - {{ getFrequencyLabel(recurring.frequency) }}</span>
                  </div>

                  <div class="status-container">
                    <div class="recurring-status-badge" [class]="'status-' + (recurring.isActive ? 'active' : 'inactive')">
                      {{ recurring.isActive ? 'ACTIVO' : 'INACTIVO' }}
                    </div>
                  </div>
                </header>

                <!-- Card Body -->
                <div class="card-body">
                  <!-- Row 1: Main Info -->
                  <div class="info-row main-row">
                    <div class="recurring-main-info">
                      <div class="recurring-description">{{ recurring.description }}</div>
                      <div class="recurring-details">
                        <span class="category">{{ getCategoryName(recurring.categoryId) }}</span>
                        <span class="account">{{ getAccountName(recurring.accountId) }}</span>
                      </div>
                    </div>
                    <div class="recurring-amount" [class]="recurring.type">
                      {{ recurring.type === 'income' ? '+' : '-' }}{{ formatCurrency(recurring.amount) }}
                    </div>
                  </div>

                  <!-- Row 2: Schedule Info -->
                  <div class="info-row schedule-row">
                    <div class="schedule-info">
                      <div class="date-item">
                        <span class="date-label">Inicia:</span>
                        <span class="date-value">{{ formatDate(recurring.startDate) }}</span>
                      </div>
                      @if (recurring.endDate) {
                        <div class="date-item">
                          <span class="date-label">Termina:</span>
                          <span class="date-value">{{ formatDate(recurring.endDate) }}</span>
                        </div>
                      }
                    </div>
                  </div>
                </div>

                <!-- Card Actions -->
                <footer class="card-actions">
                  <button class="btn btn-secondary btn-icon-action btn-toggle" (click)="toggleRecurringStatus(recurring.id, !recurring.isActive)" [title]="recurring.isActive ? 'Desactivar' : 'Activar'">
                    <span class="icon-toggle">{{ recurring.isActive ? '⏸️' : '▶️' }}</span>
                  </button>

                  <button class="btn btn-secondary btn-icon-action btn-edit" (click)="editRecurring(recurring)" title="Editar">
                    <span class="icon-edit">✎</span>
                  </button>

                  <button class="btn btn-danger btn-icon-action" (click)="deleteRecurring(recurring.id)" title="Eliminar">
                    <span class="icon-delete">✕</span>
                  </button>
                </footer>
              </article>
            }
          </div>
        }
      </section>

      <!-- Form Modal -->
      @if (showFormModal()) {
        <app-recurring-transaction-form
          (modalClosed)="closeFormModal()"
          (recurringTransactionSaved)="onRecurringTransactionSaved()">
        </app-recurring-transaction-form>
      }
    </div>
  `,
  styleUrl: './recurring-transactions.component.scss'
})
export class RecurringTransactionsComponent {
  private recurringService = inject(RecurringTransactionService);
  private categoryService = inject(CategoryService);
  private accountService = inject(AccountService);
  private sidebarService = inject(SidebarService);
  private darkModeService = inject(DarkModeService);

  // Data
  recurringTransactions = this.recurringService.recurringTransactions;
  categories = this.categoryService.getCategories();
  accounts = this.accountService.getAccounts();

  // UI State
  showFormModal = signal(false);
  sidebarVisible = this.sidebarService.sidebarVisible;

  // Filters
  statusFilter = signal<'all' | 'active' | 'inactive'>('all');
  typeFilter = signal<'all' | 'income' | 'expense'>('all');
  frequencyFilter = signal<'all' | 'daily' | 'weekly' | 'biweekly' | 'monthly'>('all');

  // Computed
  filteredRecurringTransactions = computed(() => {
    let transactions = this.recurringTransactions();

    if (this.statusFilter() !== 'all') {
      transactions = transactions.filter(rt =>
        this.statusFilter() === 'active' ? rt.isActive : !rt.isActive
      );
    }

    if (this.typeFilter() !== 'all') {
      transactions = transactions.filter(rt => rt.type === this.typeFilter());
    }

    if (this.frequencyFilter() !== 'all') {
      transactions = transactions.filter(rt => rt.frequency === this.frequencyFilter());
    }

    return transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  // Stats
  totalActiveRecurring = computed(() => {
    return this.recurringTransactions().filter(rt => rt.isActive).length;
  });

  totalIncomeRecurring = computed(() => {
    return this.recurringTransactions()
      .filter(rt => rt.isActive && rt.type === 'income')
      .reduce((sum, rt) => sum + rt.amount, 0);
  });

  totalExpenseRecurring = computed(() => {
    return this.recurringTransactions()
      .filter(rt => rt.isActive && rt.type === 'expense')
      .reduce((sum, rt) => sum + rt.amount, 0);
  });

  onToggleSidebar(): void {
    this.sidebarService.toggleSidebar();
  }

  openAddModal(): void {
    this.showFormModal.set(true);
  }

  closeFormModal(): void {
    this.showFormModal.set(false);
  }

  onRecurringTransactionSaved(): void {
    // El servicio ya maneja la actualización automática
  }

  onTransactionConfirmed(): void {
    // Cualquier lógica adicional cuando se confirma una transacción
  }

  toggleRecurringStatus(id: string, isActive: boolean): void {
    this.recurringService.updateRecurringTransaction(id, { isActive });
  }

  editRecurring(recurring: any): void {
    // TODO: Implementar edición
    console.log('Edit recurring:', recurring);
  }

  deleteRecurring(id: string): void {
    if (confirm('¿Estás seguro de que quieres eliminar este movimiento recurrente? También se eliminarán todas las transacciones pendientes asociadas.')) {
      this.recurringService.deleteRecurringTransaction(id);
    }
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories().find(cat => cat.id === categoryId);
    return category ? category.name : 'Sin categoría';
  }

  getAccountName(accountId: string): string {
    const account = this.accounts().find(acc => acc.id === accountId);
    return account ? account.name : 'Sin cuenta';
  }

  getFrequencyLabel(frequency: string): string {
    const labels: Record<string, string> = {
      'daily': 'Diario',
      'weekly': 'Semanal',
      'biweekly': 'Quincenal',
      'monthly': 'Mensual'
    };
    return labels[frequency] || frequency;
  }

  isDarkMode(): boolean {
    return this.darkModeService.darkMode();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  }

  formatDate(date: string | Date): string {
    return new Intl.DateTimeFormat('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(new Date(date));
  }
}
