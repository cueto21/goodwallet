import { Injectable, signal, inject } from '@angular/core';
import { Transaction } from '../models/transaction.interface';
import { StorageService } from './storage.service';
import { DateUtilService } from './date-util.service';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private storageService = inject(StorageService);
  private dateUtil = inject(DateUtilService);
  private transactions = signal<Transaction[]>(this.loadTransactionsFromStorage());
  
  constructor() {
    // Try loading from API and fall back to storage
    // call but don't block construction
    this.loadFromApi();
  }

  private loadTransactionsFromStorage(): Transaction[] {
    const transactions = this.storageService.getItem<Transaction[]>('transactions', []);
    
    // Convertir las fechas de string a Date objects usando el DateUtilService
    return transactions.map(transaction => ({
      ...transaction,
      date: this.dateUtil.parseLocalDate(transaction.date),
      createdAt: this.dateUtil.parseLocalDateTime(transaction.createdAt),
      updatedAt: this.dateUtil.parseLocalDateTime(transaction.updatedAt)
    }));
  }

  async loadFromApi() {
    try {
      const rows: any[] = await (await import('./api.service')).ApiService.get('/transactions');
      if (Array.isArray(rows)) {
      const parsed = rows.map(r => ({
          ...r,
          // ensure accountId and relatedAccountId are strings to match Account.id
          accountId: r.accountId !== undefined && r.accountId !== null ? String(r.accountId) : '',
          relatedAccountId: r.relatedAccountId !== undefined && r.relatedAccountId !== null ? String(r.relatedAccountId) : '',
        // preserve time component when available
        date: this.dateUtil.parseLocalDateTime(r.date),
          createdAt: this.dateUtil.parseLocalDateTime(r.createdAt),
          updatedAt: this.dateUtil.parseLocalDateTime(r.updatedAt)
        }));
        this.transactions.set(parsed);
        this.saveTransactionsToStorage();
      }
    } catch (e) {
      // keep existing from storage
    }
  }

  private saveTransactionsToStorage(): void {
    this.storageService.setItem('transactions', this.transactions());
  }

  getTransactions() {
    return this.transactions.asReadonly();
  }

  getTransactionsByAccount(accountId: string) {
    return this.transactions().filter(transaction => transaction.accountId === accountId);
  }

  async addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) {
    // Try sending to backend first. If it fails, fall back to local-only storage (offline mode).
    try {
      const payload: any = {
        accountId: transaction.accountId,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        categoryId: transaction.categoryId,
        relatedAccountId: transaction.relatedAccountId,
        TransferenciaGroupId: (transaction as any).TransferenciaGroupId,
        referenceId: (transaction as any).referenceId,
        shared_with: (transaction as any).shared_with,
        metadata: (transaction as any).metadata || {}
      };
      // Include date/time if provided by caller
      if ((transaction as any).date) {
        const d = (transaction as any).date;
        payload.date = d instanceof Date ? d.toISOString() : d;
      }

      const created: any = await ApiService.post('/transactions', payload);

      const parsed: Transaction = {
        ...created,
        accountId: created.accountId !== undefined && created.accountId !== null ? String(created.accountId) : '',
        relatedAccountId: created.relatedAccountId !== undefined && created.relatedAccountId !== null ? String(created.relatedAccountId) : '',
        amount: parseFloat(created.amount ?? transaction.amount),
        date: this.dateUtil.parseLocalDate(created.date ?? (transaction as any).date ?? new Date()),
        createdAt: this.dateUtil.parseLocalDateTime(created.createdAt ?? new Date()),
        updatedAt: this.dateUtil.parseLocalDateTime(created.updatedAt ?? new Date())
      } as Transaction;

      this.transactions.update(list => [...list, parsed]);
      this.saveTransactionsToStorage();
      return parsed;
    } catch (e) {
      // Fallback: local-only create (preserve previous offline behavior)
      const newTransaction: Transaction = {
        ...transaction,
        id: Date.now().toString(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.transactions.update(transactions => [...transactions, newTransaction]);
      this.saveTransactionsToStorage(); // Guardar automáticamente
      return newTransaction;
    }
  }

  // Crear dos movimientos: uno expense (salida) y uno income (entrada) con mismo TransferenciaGroupId
  async addTransferencia(params: { amount: number; description: string; date: Date; fromAccountId: string; toAccountId: string; }) {
    // Prefer server-side Transferencia so DB rows and balances are consistent.
    try {
      const body = {
        fromAccountId: params.fromAccountId,
        toAccountId: params.toAccountId,
        amount: params.amount,
        description: params.description || 'Transferencia',
        date: params.date
      };
      const res = await ApiService.post('/transactions/Transferencia', body);
      // Refresh local transactions to reflect server state
      await this.loadFromApi();
      return res;
    } catch (e) {
      // Fallback to local-only Transferencia if offline
      const TransferenciaGroupId = 'trf-' + Date.now().toString();
      const base = {
        description: params.description || 'Transferenciaencia',
        date: params.date,
        categoryId: 'Transferencia',
        createdAt: new Date(),
        updatedAt: new Date(),
        TransferenciaGroupId,
        relatedAccountId: ''
      } as const;

      const expenseTx: Transaction = {
        id: TransferenciaGroupId + '-out',
        amount: params.amount,
        description: base.description,
        date: base.date,
        categoryId: base.categoryId,
        accountId: params.fromAccountId,
        type: 'expense',
        TransferenciaGroupId,
        relatedAccountId: params.toAccountId,
        createdAt: base.createdAt,
        updatedAt: base.updatedAt
      };

      const incomeTx: Transaction = {
        id: TransferenciaGroupId + '-in',
        amount: params.amount,
        description: base.description,
        date: base.date,
        categoryId: base.categoryId,
        accountId: params.toAccountId,
        type: 'income',
        TransferenciaGroupId,
        relatedAccountId: params.fromAccountId,
        createdAt: base.createdAt,
        updatedAt: base.updatedAt
      };

      this.transactions.update(list => [...list, expenseTx, incomeTx]);
      this.saveTransactionsToStorage();
      return { TransferenciaGroupId };
    }
  }

  updateTransaction(id: string, updates: Partial<Transaction>) {
    this.transactions.update(transactions =>
      transactions.map(transaction =>
        transaction.id === id
          ? { ...transaction, ...updates, updatedAt: new Date() }
          : transaction
      )
    );
    this.saveTransactionsToStorage(); // Guardar automáticamente
  }

  async deleteTransaction(id: string) {
    try {
      await ApiService.delete(`/transactions/${id}`);
      // Remove from local state after successful backend deletion
      this.transactions.update(transactions =>
        transactions.filter(transaction => transaction.id !== id)
      );
      this.saveTransactionsToStorage();
    } catch (e) {
      // If backend fails, still remove from local state for offline functionality
      this.transactions.update(transactions =>
        transactions.filter(transaction => transaction.id !== id)
      );
      this.saveTransactionsToStorage();
      throw e; // Re-throw to let caller handle the error
    }
  }

  getTotalBalance() {
    const transactions = this.transactions();
    return transactions.reduce((total, transaction) => {
      return transaction.type === 'income' 
        ? total + transaction.amount 
        : total - transaction.amount;
    }, 0);
  }

  getMonthlyIncome() {
    const transactions = this.transactions();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return transactions
      .filter(t => 
        t.type === 'income' && 
        t.date.getMonth() === currentMonth && 
        t.date.getFullYear() === currentYear
      )
      .reduce((total, t) => total + t.amount, 0);
  }

  getMonthlyExpenses() {
    const transactions = this.transactions();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return transactions
      .filter(t => 
        t.type === 'expense' && 
        t.date.getMonth() === currentMonth && 
        t.date.getFullYear() === currentYear
      )
      .reduce((total, t) => total + t.amount, 0);
  }
}
