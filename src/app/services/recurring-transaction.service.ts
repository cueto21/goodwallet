import { Injectable, signal, computed, inject } from '@angular/core';
import { RecurringTransaction, PendingRecurringTransaction } from '../models/recurring-transaction.interface';
import { DateUtilService } from './date-util.service';

@Injectable({
  providedIn: 'root'
})
export class RecurringTransactionService {
  private dateUtil = inject(DateUtilService);
  private recurringTransactionsSignal = signal<RecurringTransaction[]>([]);
  private pendingTransactionsSignal = signal<PendingRecurringTransaction[]>([]);

  constructor() {
    this.loadRecurringTransactions();
    this.loadPendingTransactions();
    // Verificar transacciones pendientes al inicializar
    this.generatePendingTransactions();
  }

  // Señales públicas
  recurringTransactions = this.recurringTransactionsSignal.asReadonly();
  pendingTransactions = this.pendingTransactionsSignal.asReadonly();

  // Computed properties
  activeRecurringTransactions = computed(() => 
    this.recurringTransactions().filter(rt => rt.isActive)
  );

  pendingTransactionsByDate = computed(() => {
    const pending = this.pendingTransactions();
    const grouped: { [key: string]: PendingRecurringTransaction[] } = {};
    
    pending.forEach(pt => {
      const dateKey = pt.scheduledDate.toDateString();
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(pt);
    });
    
    return grouped;
  });

  // Agregar nueva transacción recurrente
  addRecurringTransaction(recurringTransaction: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt'>): void {
    const newRecurringTransaction: RecurringTransaction = {
      ...recurringTransaction,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const current = this.recurringTransactionsSignal();
    this.recurringTransactionsSignal.set([...current, newRecurringTransaction]);
    this.saveRecurringTransactions();
    
    // Generar transacciones pendientes para esta nueva recurrencia
    this.generatePendingTransactionsForRecurring(newRecurringTransaction);
  }

  // Actualizar transacción recurrente
  updateRecurringTransaction(id: string, updates: Partial<RecurringTransaction>): void {
    const current = this.recurringTransactionsSignal();
    const updated = current.map(rt => 
      rt.id === id 
        ? { ...rt, ...updates, updatedAt: new Date() }
        : rt
    );
    this.recurringTransactionsSignal.set(updated);
    this.saveRecurringTransactions();
  }

  // Eliminar transacción recurrente
  deleteRecurringTransaction(id: string): void {
    const current = this.recurringTransactionsSignal();
    const filtered = current.filter(rt => rt.id !== id);
    this.recurringTransactionsSignal.set(filtered);
    this.saveRecurringTransactions();

    // También eliminar transacciones pendientes asociadas
    this.deletePendingTransactionsByRecurringId(id);
  }

  // Confirmar transacción pendiente
  confirmPendingTransaction(pendingId: string): void {
    const current = this.pendingTransactionsSignal();
    const updated = current.map(pt => 
      pt.id === pendingId 
        ? { ...pt, status: 'confirmed' as const }
        : pt
    );
    this.pendingTransactionsSignal.set(updated);
    this.savePendingTransactions();
  }

  // Cancelar transacción pendiente
  cancelPendingTransaction(pendingId: string): void {
    const current = this.pendingTransactionsSignal();
    const updated = current.map(pt => 
      pt.id === pendingId 
        ? { ...pt, status: 'cancelled' as const }
        : pt
    );
    this.pendingTransactionsSignal.set(updated);
    this.savePendingTransactions();
  }

  // Generar transacciones pendientes basadas en las recurrencias activas
  generatePendingTransactions(): void {
    const recurring = this.activeRecurringTransactions();
    recurring.forEach(rt => this.generatePendingTransactionsForRecurring(rt));
  }

  private generatePendingTransactionsForRecurring(recurringTransaction: RecurringTransaction): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startDate = new Date(recurringTransaction.lastGeneratedDate || recurringTransaction.startDate);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = recurringTransaction.endDate ? new Date(recurringTransaction.endDate) : null;
    
    const pendingDates: Date[] = [];
    let currentDate = new Date(startDate);

    // Generar fechas hasta 30 días en el futuro
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    while (currentDate <= maxDate) {
      if (endDate && currentDate > endDate) break;
      
      if (currentDate >= today) {
        // Verificar que no existe ya una transacción pendiente para esta fecha
        const existing = this.pendingTransactions().find(pt => 
          pt.recurringTransactionId === recurringTransaction.id &&
          pt.scheduledDate.toDateString() === currentDate.toDateString()
        );
        
        if (!existing) {
          pendingDates.push(new Date(currentDate));
        }
      }
      
      currentDate = this.getNextDate(currentDate, recurringTransaction.frequency);
    }

    // Crear transacciones pendientes
    if (pendingDates.length > 0) {
      const newPendingTransactions = pendingDates.map(date => ({
        id: this.generateId(),
        recurringTransactionId: recurringTransaction.id,
        amount: recurringTransaction.amount,
        description: recurringTransaction.description,
        categoryId: recurringTransaction.categoryId,
        accountId: recurringTransaction.accountId,
        type: recurringTransaction.type,
        scheduledDate: date,
        status: 'pending' as const,
        createdAt: new Date()
      }));

      const current = this.pendingTransactionsSignal();
      this.pendingTransactionsSignal.set([...current, ...newPendingTransactions]);
      this.savePendingTransactions();

      // Actualizar la fecha de última generación
      this.updateRecurringTransaction(recurringTransaction.id, {
        lastGeneratedDate: pendingDates[pendingDates.length - 1]
      });
    }
  }

  private getNextDate(currentDate: Date, frequency: RecurringTransaction['frequency']): Date {
    const nextDate = new Date(currentDate);
    
    switch (frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }
    
    return nextDate;
  }

  private deletePendingTransactionsByRecurringId(recurringId: string): void {
    const current = this.pendingTransactionsSignal();
    const filtered = current.filter(pt => pt.recurringTransactionId !== recurringId);
    this.pendingTransactionsSignal.set(filtered);
    this.savePendingTransactions();
  }

  // Obtener transacciones pendientes de hoy
  getTodayPendingTransactions(): PendingRecurringTransaction[] {
    return this.pendingTransactions().filter(pt => 
      this.dateUtil.isToday(pt.scheduledDate) && pt.status === 'pending'
    );
  }

  // Métodos de persistencia
  private loadRecurringTransactions(): void {
    const stored = localStorage.getItem('recurring-transactions');
    if (stored) {
      const parsed = JSON.parse(stored).map((rt: any) => ({
        ...rt,
        startDate: this.dateUtil.parseLocalDate(rt.startDate),
        endDate: rt.endDate ? this.dateUtil.parseLocalDate(rt.endDate) : undefined,
        lastGeneratedDate: rt.lastGeneratedDate ? this.dateUtil.parseLocalDate(rt.lastGeneratedDate) : undefined,
        createdAt: this.dateUtil.parseLocalDateTime(rt.createdAt),
        updatedAt: this.dateUtil.parseLocalDateTime(rt.updatedAt)
      }));
      this.recurringTransactionsSignal.set(parsed);
    }
  }

  private saveRecurringTransactions(): void {
    localStorage.setItem('recurring-transactions', JSON.stringify(this.recurringTransactionsSignal()));
  }

  private loadPendingTransactions(): void {
    const stored = localStorage.getItem('pending-recurring-transactions');
    if (stored) {
      const parsed = JSON.parse(stored).map((pt: any) => ({
        ...pt,
        scheduledDate: this.dateUtil.parseLocalDate(pt.scheduledDate),
        createdAt: this.dateUtil.parseLocalDateTime(pt.createdAt)
      }));
      this.pendingTransactionsSignal.set(parsed);
    }
  }

  private savePendingTransactions(): void {
    localStorage.setItem('pending-recurring-transactions', JSON.stringify(this.pendingTransactionsSignal()));
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
