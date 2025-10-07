export interface RecurringTransaction {
  id: string;
  amount: number;
  description: string;
  categoryId: string;
  accountId: string;
  type: 'income' | 'expense';
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  startDate: Date;
  endDate?: Date; // Opcional, si no se especifica es indefinido
  isActive: boolean;
  lastGeneratedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PendingRecurringTransaction {
  id: string;
  recurringTransactionId: string;
  amount: number;
  description: string;
  categoryId: string;
  accountId: string;
  type: 'income' | 'expense';
  scheduledDate: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: Date;
}
