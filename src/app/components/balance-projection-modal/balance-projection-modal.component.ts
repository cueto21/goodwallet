import { Component, inject, signal, output, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../services/transaction';
import { AccountService } from '../../services/account';
import { LoanService } from '../../services/loan.service';
import { RecurringTransactionService } from '../../services/recurring-transaction.service';
import { DateUtilService } from '../../services/date-util.service';
import { RecurringTransaction } from '../../models/recurring-transaction.interface';

interface BalanceProjection {
  date: Date;
  totalBalance: number;
  accountBalances: { accountId: string; accountName: string; balance: number; type: 'savings' | 'credit'; }[];
  transactions: {
    type: 'recurring' | 'loan_payment' | 'loan_collection';
    description: string;
    amount: number;
    accountName: string;
    date: Date;
  }[];
}

@Component({
  selector: 'app-balance-projection-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen()) {
      <div class="modal-backdrop" 
           (click)="onBackdropClick($event)">
        <div class="modal-content" 
             (click)="$event.stopPropagation()">
          <div class="modal-header">
            <div class="header-content">
              <div class="header-icon">📊</div>
              <div class="header-text">
                <h3>Proyección de Balance</h3>
                <p>Calcula tu balance futuro considerando todos los movimientos</p>
              </div>
            </div>
            <button class="close-btn" (click)="closeModal()">
              <span class="close-icon">✕</span>
            </button>
          </div>
          
          <div class="modal-body">
            
            <!-- Selector de fecha -->
            <div class="date-selector-section">
              <div class="section-title">
                <span class="title-icon">📅</span>
                <h4>Selecciona la fecha de proyección</h4>
              </div>
              <div class="date-input-container">
                <input 
                  type="date" 
                  [(ngModel)]="selectedDate"
                  [min]="dateUtil.getTodayString()"
                  class="date-input"
                  (change)="calculateProjection()">
                <div class="date-info">
                  @if (selectedDateInfo()) {
                    <span class="date-difference">
                      {{ selectedDateInfo()!.daysFromNow > 0 ? 
                          'En ' + selectedDateInfo()!.daysFromNow + ' días' : 
                          'Hoy' }}
                    </span>
                  }
                </div>
              </div>
            </div>

            @if (projection()) {
              <!-- Resumen del balance proyectado -->
              <div class="projection-summary">
                <div class="summary-header">
                  <span class="summary-icon">💰</span>
                  <h4>Balance proyectado para {{ formatDate(projection()!.date) }}</h4>
                </div>
                
                <div class="balance-overview">
                  <div class="total-balance" [class.positive]="projection()!.totalBalance >= 0" 
                       [class.negative]="projection()!.totalBalance < 0">
                    <div class="balance-label">Balance Total</div>
                    <div class="balance-amount">{{ formatCurrency(projection()!.totalBalance) }}</div>
                  </div>
                  
                  <div class="balance-change">
                    <div class="change-label">Cambio desde hoy</div>
                    <div class="change-amount" 
                         [class.positive]="balanceChange() >= 0"
                         [class.negative]="balanceChange() < 0">
                      {{ balanceChange() >= 0 ? '+' : '' }}{{ formatCurrency(balanceChange()) }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Desglose por cuentas -->
              <div class="accounts-breakdown">
                <div class="section-title">
                  <span class="title-icon">🏦</span>
                  <h4>Balance por cuenta</h4>
                </div>
                
                <div class="accounts-grid">
                  @for (account of projection()!.accountBalances; track account.accountId) {
                    <div class="account-card" [class]="account.type">
                      <div class="account-header">
                        <div class="account-name">{{ account.accountName }}</div>
                        <div class="account-type">
                          {{ account.type === 'savings' ? '💳' : '💸' }}
                        </div>
                      </div>
                      <div class="account-balance" 
                           [class.positive]="account.balance >= 0"
                           [class.negative]="account.balance < 0">
                        {{ formatCurrency(account.balance) }}
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Timeline de transacciones -->
              @if (projection()!.transactions.length > 0) {
                <div class="transactions-timeline">
                  <div class="section-title">
                    <span class="title-icon">⏰</span>
                    <h4>Movimientos considerados ({{ projection()!.transactions.length }})</h4>
                  </div>
                  
                  <div class="timeline-container">
                    @for (transaction of projection()!.transactions; track $index) {
                      <div class="timeline-item" [class]="transaction.type">
                        <div class="timeline-dot">
                          @switch (transaction.type) {
                            @case ('recurring') {
                              🔄
                            }
                            @case ('loan_payment') {
                              💸
                            }
                            @case ('loan_collection') {
                              💰
                            }
                          }
                        </div>
                        <div class="timeline-content">
                          <div class="transaction-header">
                            <span class="transaction-description">{{ transaction.description }}</span>
                            <span class="transaction-date">{{ formatDate(transaction.date) }}</span>
                          </div>
                          <div class="transaction-details">
                            <span class="transaction-amount" 
                                  [class.positive]="transaction.amount > 0"
                                  [class.negative]="transaction.amount < 0">
                              {{ transaction.amount > 0 ? '+' : '' }}{{ formatCurrency(transaction.amount) }}
                            </span>
                            <span class="transaction-account">{{ transaction.accountName }}</span>
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Análisis y recomendaciones -->
              <div class="analysis-section">
                <div class="section-title">
                  <span class="title-icon">🎯</span>
                  <h4>Análisis</h4>
                </div>
                
                <div class="analysis-cards">
                  @if (projection()!.totalBalance < 0) {
                    <div class="analysis-card warning">
                      <div class="card-icon">⚠️</div>
                      <div class="card-content">
                        <div class="card-title">Balance negativo proyectado</div>
                        <div class="card-description">
                          Tu balance estará en rojo. Considera reducir gastos o generar ingresos adicionales.
                        </div>
                      </div>
                    </div>
                  } @else if (projection()!.totalBalance < 1000) {
                    <div class="analysis-card caution">
                      <div class="card-icon">💡</div>
                      <div class="card-content">
                        <div class="card-title">Balance bajo</div>
                        <div class="card-description">
                          Tu balance será bajo. Es recomendable mantener un fondo de emergencia.
                        </div>
                      </div>
                    </div>
                  } @else {
                    <div class="analysis-card success">
                      <div class="card-icon">✅</div>
                      <div class="card-content">
                        <div class="card-title">Balance saludable</div>
                        <div class="card-description">
                          Tu proyección financiera se ve bien. ¡Sigue así!
                        </div>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
          
          <div class="modal-footer">
            <div class="footer-actions">
              <button type="button" class="btn-secondary" (click)="closeModal()">
                Cerrar
              </button>
              @if (projection()) {
                <button type="button" class="btn-primary" (click)="exportProjection()">
                  📄 Exportar Proyección
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styleUrls: ['./balance-projection-modal.component.scss']
})
export class BalanceProjectionModalComponent {
  private transactionService = inject(TransactionService);
  private accountService = inject(AccountService);
  private loanService = inject(LoanService);
  private recurringService = inject(RecurringTransactionService);
  public dateUtil = inject(DateUtilService);

  // Inputs y Outputs
  isOpen = input<boolean>(false);
  onClose = output<void>();

  // State
  selectedDate = signal(this.dateUtil.getTodayString());
  projection = signal<BalanceProjection | null>(null);

  // Data
  accounts = this.accountService.getAccounts();
  loans = this.loanService.getLoans();
  recurringTransactions = this.recurringService.activeRecurringTransactions();

  // Computed properties
  selectedDateInfo = computed(() => {
    const selected = this.dateUtil.parseLocalDate(this.selectedDate());
    const today = new Date();
    const diffTime = selected.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      date: selected,
      daysFromNow: diffDays
    };
  });

  currentTotalBalance = computed(() => {
    return this.accounts().reduce((total, account) => {
      if (account.type === 'savings') {
        return total + account.balance;
      }
      // Excluir tarjetas de crédito del balance total
      return total;
    }, 0);
  });

  balanceChange = computed(() => {
    if (!this.projection()) return 0;
    return this.projection()!.totalBalance - this.currentTotalBalance();
  });

  // Methods
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeModal(): void {
    this.onClose.emit();
  }

  calculateProjection(): void {
  const targetDate = this.dateUtil.parseLocalDate(this.selectedDate());
  const today = new Date();
  // Normalize to start of day
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
    
    if (targetDate < today) {
      this.projection.set(null);
      return;
    }

    // Crear copia de los balances actuales
    const projectedBalances = this.accounts().map(account => ({
      accountId: account.id,
      accountName: account.name,
      balance: account.balance,
      type: account.type
    }));

    const transactions: BalanceProjection['transactions'] = [];

    // 1. Calcular transacciones recurrentes hasta la fecha
    this.recurringTransactions.forEach((recurring: RecurringTransaction) => {
      const occurrences = this.calculateRecurringOccurrences(recurring, targetDate, todayStart);
      
      occurrences.forEach(occurrence => {
        const accountIndex = projectedBalances.findIndex(a => a.accountId === recurring.accountId);
        if (accountIndex !== -1) {
          const amount = recurring.type === 'income' ? recurring.amount : -recurring.amount;
          projectedBalances[accountIndex].balance += amount;
          
          transactions.push({
            type: 'recurring',
            description: recurring.description,
            amount: amount,
            accountName: projectedBalances[accountIndex].accountName,
            date: occurrence
          });
        }
      });
    });

    // 2. Calcular pagos de préstamos (dinero que nos devuelven)
    this.loans().forEach(loan => {
      if (loan.type === 'lent' && loan.status !== 'paid') {
        console.log(`[DEBUG] Processing LENT loan: ${loan.personName}`, {
          hasInstallments: loan.installments?.enabled,
          installmentsCount: loan.installments?.installmentsList?.length || 0,
          targetDate: targetDate.toISOString().split('T')[0]
        });
        if (loan.installments?.enabled) {
          // Filtrar cuotas futuras hasta la fecha objetivo
          const futureInstallments = loan.installments.installmentsList.filter(inst => {
            const instDate = new Date(inst.dueDate);
            instDate.setHours(0, 0, 0, 0);
            // Incluir todas las cuotas futuras, no solo las pendientes
            return instDate >= todayStart && instDate <= targetDate;
          });
          console.log(`[DEBUG] Found ${futureInstallments.length} future installments for ${loan.personName}`);
          futureInstallments.forEach(installment => {
            // Buscar la cuenta (asumimos que se devuelve a la primera cuenta de ahorros)
            const savingsAccount = projectedBalances.find(a => a.type === 'savings');
            if (savingsAccount) {
              savingsAccount.balance += installment.amount;
              transactions.push({
                type: 'loan_collection',
                description: `Cuota ${installment.installmentNumber} - ${loan.personName}`,
                amount: installment.amount,
                accountName: savingsAccount.accountName,
                date: new Date(installment.dueDate)
              });
            }
          });
        } else if (loan.dueDate && new Date(loan.dueDate) <= targetDate) {
          // Crédito del préstamo completo en la fecha de vencimiento
          const savingsAccount = projectedBalances.find(a => a.type === 'savings');
          if (savingsAccount) {
            savingsAccount.balance += loan.amount;
            transactions.push({
              type: 'loan_collection',
              description: `Cobro préstamo - ${loan.personName}`,
              amount: loan.amount,
              accountName: savingsAccount.accountName,
              date: new Date(loan.dueDate)
            });
          }
        }
      }
    });

    // 3. Calcular pagos de deudas (dinero que pagamos)
    this.loans().forEach(loan => {
      if (loan.type === 'borrowed' && loan.status !== 'paid') {
        console.log(`[DEBUG] Processing BORROWED loan: ${loan.personName}`, {
          hasInstallments: loan.installments?.enabled,
          installmentsCount: loan.installments?.installmentsList?.length || 0,
          targetDate: targetDate.toISOString().split('T')[0]
        });
        
        if (loan.installments?.enabled) {
          // Filtrar cuotas futuras hasta la fecha objetivo
          const futureInstallments = loan.installments.installmentsList.filter(inst => {
            const instDate = new Date(inst.dueDate);
            instDate.setHours(0, 0, 0, 0);
            // Incluir todas las cuotas futuras, no solo las pendientes
            return instDate >= todayStart && instDate <= targetDate;
          });
          
          console.log(`[DEBUG] Found ${futureInstallments.length} future borrowed installments for ${loan.personName}`);
          
          futureInstallments.forEach(installment => {
            // Buscar una cuenta con suficiente saldo (priorizar ahorros)
            const paymentAccount = this.findBestPaymentAccount(projectedBalances, installment.amount);
            if (paymentAccount) {
              paymentAccount.balance -= installment.amount;
              
              transactions.push({
                type: 'loan_payment',
                description: `Cuota ${installment.installmentNumber} - ${loan.personName}`,
                amount: -installment.amount,
                accountName: paymentAccount.accountName,
                date: installment.dueDate
              });
            }
          });
        } else if (loan.dueDate <= targetDate) {
          // Deuda completa si vence antes de la fecha
          const paymentAccount = this.findBestPaymentAccount(projectedBalances, loan.amount);
          if (paymentAccount) {
            paymentAccount.balance -= loan.amount;
            
            transactions.push({
              type: 'loan_payment',
              description: `Pago deuda - ${loan.personName}`,
              amount: -loan.amount,
              accountName: paymentAccount.accountName,
              date: loan.dueDate
            });
          }
        }
      }
    });

    // Ordenar transacciones por fecha
    transactions.sort((a, b) => a.date.getTime() - b.date.getTime());
    
    console.log(`[DEBUG] Final transactions summary:`, {
      totalTransactions: transactions.length,
      loanCollections: transactions.filter(t => t.type === 'loan_collection').length,
      loanPayments: transactions.filter(t => t.type === 'loan_payment').length,
      recurringTransactions: transactions.filter(t => t.type === 'recurring').length,
      transactions: transactions.map(t => ({
        type: t.type,
        description: t.description,
        amount: t.amount,
        date: t.date.toISOString().split('T')[0]
      }))
    });

    // Calcular balance total (solo cuentas de ahorros)
    const totalBalance = projectedBalances.reduce((total, account) => {
      if (account.type === 'savings') {
        return total + account.balance;
      }
      // Excluir tarjetas de crédito del balance total
      return total;
    }, 0);

    this.projection.set({
      date: targetDate,
      totalBalance,
      accountBalances: projectedBalances,
      transactions
    });
  }

  private calculateRecurringOccurrences(recurring: any, targetDate: Date, todayStart: Date): Date[] {
    const occurrences: Date[] = [];
    // Asegurarse que startDate es un objeto Date
    const startDate = new Date(recurring.startDate);
    
    let currentDate = new Date(Math.max(startDate.getTime(), todayStart.getTime()));
    
    while (currentDate <= targetDate) {
      occurrences.push(new Date(currentDate));
      
      // Calcular siguiente fecha según frecuencia
      switch (recurring.frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'biweekly':
          currentDate.setDate(currentDate.getDate() + 14);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
      
      // Verificar fecha de fin
      if (recurring.endDate && currentDate > new Date(recurring.endDate)) {
        break;
      }
    }
    
    return occurrences;
  }

  private findBestPaymentAccount(balances: any[], amount: number) {
    // Priorizar cuentas de ahorro con suficiente saldo
    const savingsWithBalance = balances.filter(
      acc => acc.type === 'savings' && acc.balance >= amount
    );
    
    if (savingsWithBalance.length > 0) {
      // Elegir la cuenta con más saldo
      return savingsWithBalance.reduce((best, current) => 
        current.balance > best.balance ? current : best
      );
    }
    
    // Si no hay suficiente en ahorros, usar la cuenta con más saldo disponible
    const accountWithMostBalance = balances.reduce((best, current) => 
      current.balance > best.balance ? current : best
    );
    
    return accountWithMostBalance;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  }

  formatDate(date: Date): string {
    return this.dateUtil.formatForDisplay(date);
  }

  exportProjection(): void {
    if (!this.projection()) return;
    
    const data = {
      fecha: this.formatDate(this.projection()!.date),
      balanceTotal: this.projection()!.totalBalance,
      balancePorCuenta: this.projection()!.accountBalances,
      movimientos: this.projection()!.transactions.map(t => ({
        fecha: this.formatDate(t.date),
        descripcion: t.description,
        monto: t.amount,
        cuenta: t.accountName,
        tipo: t.type
      }))
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `proyeccion-balance-${this.selectedDate()}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
  }
}
