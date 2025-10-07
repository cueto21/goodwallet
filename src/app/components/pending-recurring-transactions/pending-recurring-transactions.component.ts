import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecurringTransactionService } from '../../services/recurring-transaction.service';
import { TransactionService } from '../../services/transaction';
import { AccountService } from '../../services/account';
import { CategoryService } from '../../services/category';
import { PendingRecurringTransaction } from '../../models/recurring-transaction.interface';

@Component({
  selector: 'app-pending-recurring-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (todayPendingTransactions().length > 0) {
      <div class="pending-transactions-card">
        <div class="card-header">
          <h3>💳 Movimientos Pendientes de Hoy</h3>
          <span class="pending-count">{{ todayPendingTransactions().length }}</span>
        </div>
        
        <div class="pending-list">
          @for (pendingTransaction of todayPendingTransactions(); track pendingTransaction.id) {
            <div class="pending-item" [class.income]="pendingTransaction.type === 'income'">
              <div class="pending-info">
                <div class="pending-description">
                  <strong>{{ pendingTransaction.description }}</strong>
                  <span class="pending-category">{{ getCategoryName(pendingTransaction.categoryId) }}</span>
                </div>
                <div class="pending-details">
                  <span class="pending-amount" [class.income]="pendingTransaction.type === 'income'">
                    {{ pendingTransaction.type === 'income' ? '+' : '-' }}S/ {{ pendingTransaction.amount | number:'1.2-2' }}
                  </span>
                  <span class="pending-account">{{ getAccountName(pendingTransaction.accountId) }}</span>
                </div>
              </div>
              
              <div class="pending-actions">
                <button 
                  type="button" 
                  class="btn-confirm"
                  (click)="confirmTransaction(pendingTransaction)"
                  title="Confirmar movimiento">
                  ✓
                </button>
                <button 
                  type="button" 
                  class="btn-cancel"
                  (click)="cancelTransaction(pendingTransaction.id)"
                  title="Cancelar movimiento">
                  ✗
                </button>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .pending-transactions-card {
      background: linear-gradient(135deg, #FFF8E1 0%, #FFF3C4 100%);
      border-radius: 12px;
      padding: 1rem;
      margin-bottom: 1rem;
      border: 1.5px solid #FFE082;
      box-shadow: 0 2px 6px rgba(255, 193, 7, 0.10);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .card-header h3 {
      margin: 0;
      color: #E65100;
      font-size: 1.2rem;
      font-weight: 600;
    }

    .pending-count {
      background: #FF9800;
      color: white;
      padding: 0.3rem 0.8rem;
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 600;
    }

    .pending-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .pending-item {
      background: white;
      border-radius: 10px;
      padding: 0.7rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #FFE082;
      transition: all 0.2s ease;
    }

    .pending-item:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 152, 0, 0.15);
    }

    .pending-item.income {
      border-left: 4px solid #4CAF50;
    }

    .pending-item:not(.income) {
      border-left: 4px solid #F44336;
    }

    .pending-info {
      flex: 1;
    }

    .pending-description {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .pending-description strong {
      color: #333;
      font-size: 1rem;
    }

    .pending-category {
      color: #666;
      font-size: 0.85rem;
    }

    .pending-details {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 0.5rem;
    }

    .pending-amount {
      font-weight: 600;
      font-size: 1.1rem;
      color: #F44336;
    }

    .pending-amount.income {
      color: #4CAF50;
    }

    .pending-account {
      color: #666;
      font-size: 0.9rem;
    }

    .pending-actions {
      display: flex;
      gap: 0.5rem;
      margin-left: 1rem;
    }

    .btn-confirm,
    .btn-cancel {
      width: 28px;
      height: 28px;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1rem;
      font-weight: bold;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-confirm {
      background: #4CAF50;
      color: white;
    }

    .btn-confirm:hover {
      background: #45a049;
      transform: scale(1.05);
    }

    .btn-cancel {
      background: #F44336;
      color: white;
    }

    .btn-cancel:hover {
      background: #da190b;
      transform: scale(1.05);
    }

    @media (max-width: 768px) {
      .pending-transactions-card {
        padding: 0.5rem;
        border-radius: 8px;
      }
      .card-header h3 {
        font-size: 1rem;
      }
      .pending-item {
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
        padding: 0.5rem;
        border-radius: 7px;
      }
      .pending-description strong {
        font-size: 0.95rem;
      }
      .pending-category {
        font-size: 0.75rem;
      }
      .pending-details {
        margin-top: 0.4rem;
      }
      .pending-amount {
        font-size: 0.95rem;
      }
      .pending-account {
        font-size: 0.75rem;
      }
      .pending-actions {
        margin-left: 0;
        justify-content: center;
        gap: 0.2rem;
      }
      .btn-confirm,
      .btn-cancel {
        width: 22px;
        height: 22px;
        font-size: 0.85rem;
      }
    }
  `]
})
export class PendingRecurringTransactionsComponent {
  private recurringService = inject(RecurringTransactionService);
  private transactionService = inject(TransactionService);
  private accountService = inject(AccountService);
  private categoryService = inject(CategoryService);

  // Outputs
  transactionConfirmed = output<void>();

  // Data
  todayPendingTransactions = signal(this.recurringService.getTodayPendingTransactions());
  accounts = this.accountService.getAccounts();
  categories = this.categoryService.getCategories();

  constructor() {
    // Actualizar las transacciones pendientes cada minuto
    setInterval(() => {
      this.todayPendingTransactions.set(this.recurringService.getTodayPendingTransactions());
    }, 60000);
  }

  confirmTransaction(pendingTransaction: PendingRecurringTransaction): void {
    // 1. Confirmar la transacción pendiente
    this.recurringService.confirmPendingTransaction(pendingTransaction.id);
    
    // 2. Crear la transacción normal
    this.transactionService.addTransaction({
      amount: pendingTransaction.amount,
      description: pendingTransaction.description,
      date: new Date(),
      categoryId: pendingTransaction.categoryId,
      accountId: pendingTransaction.accountId,
      type: pendingTransaction.type
    });

    // 3. Actualizar el balance de la cuenta
    this.accountService.updateAccountBalance(
      pendingTransaction.accountId, 
      pendingTransaction.amount, 
      pendingTransaction.type
    );

    // 4. Actualizar la lista
    this.todayPendingTransactions.set(this.recurringService.getTodayPendingTransactions());
    
    // 5. Emitir evento
    this.transactionConfirmed.emit();

    // 6. Mostrar mensaje de confirmación
    alert(`Movimiento confirmado: ${pendingTransaction.description} por S/ ${pendingTransaction.amount}`);
  }

  cancelTransaction(pendingId: string): void {
    if (confirm('¿Estás seguro de que quieres cancelar este movimiento recurrente?')) {
      this.recurringService.cancelPendingTransaction(pendingId);
      this.todayPendingTransactions.set(this.recurringService.getTodayPendingTransactions());
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
}
