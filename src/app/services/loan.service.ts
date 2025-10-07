import { Injectable, signal, computed, inject } from '@angular/core';
import { Loan, LoanInstallment } from '../models/loan.interface';
import { DateUtilService } from './date-util.service';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class LoanService {
  private dateUtil = inject(DateUtilService);
  private loans = signal<Loan[]>([]);
  private isLoaded = signal(false);

  /**
   * Carga los préstamos desde la API
   */
  async loadLoans(): Promise<void> {
    try {
      let loansData: any;
      try {
        loansData = await ApiService.get('/loans');
      } catch (e: any) {
        console.error('[DEBUG] LoanService.loadLoans - failed to fetch /loans:', e && e.message ? e.message : e);
        // rethrow so outer catch handles setting empty list
        throw e;
      }

  try { console.log('[DEBUG] LoanService.loadLoans - raw payload count:', (loansData || []).length, loansData && loansData.slice ? loansData.slice(0,5) : loansData); } catch(e) {}
      const processedLoans = this.processLoansData(loansData || []);
  try { console.log('[DEBUG] LoanService.loadLoans - processed loans count:', processedLoans.length, processedLoans.slice(0,5)); } catch(e) {}
      this.loans.set(processedLoans);
      this.isLoaded.set(true);
    } catch (error) {
      console.error('Error loading loans:', error);
      this.loans.set([]);
      this.isLoaded.set(true);
    }
  }

  /**
   * Procesa los datos de préstamos desde la API
   */
  private processLoansData(loans: any[]): Loan[] {
    return loans.map(loan => {
      const parsedCreatedAt = loan.createdAt ? this.dateUtil.parseLocalDateTime(loan.createdAt) : new Date();
      const parsedUpdatedAt = loan.updatedAt ? this.dateUtil.parseLocalDateTime(loan.updatedAt) : new Date();
      const parsedDate = loan.date ? this.dateUtil.parseLocalDateTime(loan.date) : new Date();
      const parsedDueDate = loan.dueDate ? this.dateUtil.parseLocalDateTime(loan.dueDate) : undefined;
      const parsedPaidDate = loan.paidDate ? this.dateUtil.parseLocalDateTime(loan.paidDate) : undefined;

      // Parse installments list first so we can infer totals and amounts
      const installmentsList = loan.installments?.installmentsList?.map((installment: any) => ({
        ...installment,
        dueDate: installment.dueDate ? this.dateUtil.parseLocalDateTime(installment.dueDate) : undefined,
        paidDate: installment.paidDate ? this.dateUtil.parseLocalDateTime(installment.paidDate) : undefined,
        partialAmountPaid: installment.partialAmountPaid ?? installment.partial_amount_paid ?? 0
      })) || [];

      const totalInstallments = loan.installments?.totalInstallments || installmentsList.length || 0;
      const installmentAmount = loan.installments?.installmentAmount || installmentsList[0]?.amount || 0;
      const firstInstallmentDate = this.dateUtil.parseLocalDateTime(loan.installments?.firstInstallmentDate || installmentsList[0]?.dueDate || loan.dueDate || parsedDueDate || new Date());

      const result: Loan = {
        ...loan,
        // default type when missing (imports may not include it)
        type: loan.type ?? 'lent',
        // Ensure the frontend always has these fields populated
        personName: loan.personName || loan.person || loan.name || '',
        description: loan.description || loan.name || '',
        // Prefer explicit notes field from backend; fallback to description for older records
        notes: loan.notes ?? loan.description ?? '',
        date: parsedDate,
        dueDate: parsedDueDate,
        createdAt: parsedCreatedAt,
        updatedAt: parsedUpdatedAt,
        paidDate: parsedPaidDate,
        installments: loan.installments ? {
          ...loan.installments,
          totalInstallments,
          installmentAmount,
          firstInstallmentDate,
          paymentFrequency: loan.installments.paymentFrequency || 'monthly',
          installmentsList
        } : undefined
      } as Loan;

      // Debug: small print for each loan processed (avoid too verbose output)
      try {
        console.log('[DEBUG] processLoansData - loan processed id:', result.id, 'type:', result.type, 'status:', result.status, 'amount:', result.amount, 'installmentsEnabled:', !!result.installments?.enabled);
      } catch (e) {
        // ignore
      }

      return result;
    });
  }

  /**
   * Verifica si los préstamos han sido cargados
   */
  areLoansLoaded(): boolean {
    return this.isLoaded();
  }

  getLoans() {
    return this.loans.asReadonly();
  }

  // Préstamos que yo hice
  getLentLoans = computed(() => {
    return this.loans().filter(loan => loan.type === 'lent');
  });

  // Préstamos que me hicieron
  getBorrowedLoans = computed(() => {
    return this.loans().filter(loan => loan.type === 'borrowed');
  });

  // Préstamos pendientes
  getPendingLoans = computed(() => {
    return this.loans().filter(loan => loan.status === 'pending');
  });

  // Préstamos vencidos
  getOverdueLoans = computed(() => {
    return this.loans().filter(loan => loan.status === 'overdue');
  });

  // Total de dinero prestado
  getTotalLent = computed(() => {
    return this.getLentLoans().reduce((total, loan) => total + loan.amount, 0);
  });

  // Total de dinero que debo
  getTotalBorrowed = computed(() => {
    return this.getBorrowedLoans().reduce((total, loan) => total + loan.amount, 0);
  });

  // Total de dinero prestado pendiente (para balance)
  getTotalLentPending = computed(() => {
    return this.getLentLoans()
      .filter(loan => loan.status === 'pending' || loan.status === 'overdue')
      .reduce((total, loan) => {
        if (loan.installments?.enabled) {
          // Sumar solo las cuotas pendientes y vencidas
          const instSum = loan.installments.installmentsList
            .filter(inst => inst.status === 'pending' || inst.status === 'overdue')
            .reduce((instTotal, inst) => instTotal + Number(inst.amount || 0), 0);
          return total + (isNaN(instSum) ? 0 : instSum);
        }
        const amt = Number(loan.amount || 0);
        return total + (isNaN(amt) ? 0 : amt);
      }, 0);
  });

  // Total de dinero adeudado pendiente (para balance)
  getTotalBorrowedPending = computed(() => {
    return this.getBorrowedLoans()
      .filter(loan => loan.status === 'pending' || loan.status === 'overdue')
      .reduce((total, loan) => {
        if (loan.installments?.enabled) {
          // Sumar solo las cuotas pendientes y vencidas
          const instSum = loan.installments.installmentsList
            .filter(inst => inst.status === 'pending' || inst.status === 'overdue')
            .reduce((instTotal, inst) => instTotal + Number(inst.amount || 0), 0);
          return total + (isNaN(instSum) ? 0 : instSum);
        }
        const amt = Number(loan.amount || 0);
        return total + (isNaN(amt) ? 0 : amt);
      }, 0);
  });

  // Cuotas próximas a vencer (en los próximos 7 días)
  getUpcomingInstallments = computed(() => {
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);
    
    const upcomingInstallments: Array<{
      loan: Loan;
      installment: LoanInstallment;
    }> = [];

    this.loans().forEach(loan => {
      if (loan.installments?.enabled) {
        loan.installments.installmentsList.forEach(installment => {
          if (installment.status === 'pending' && 
              installment.dueDate <= weekFromNow && 
              installment.dueDate >= today) {
            upcomingInstallments.push({ loan, installment });
          }
        });
      }
    });

    return upcomingInstallments.sort((a, b) => 
      new Date(a.installment.dueDate).getTime() - new Date(b.installment.dueDate).getTime()
    );
  });

  async addLoan(loanData: Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    try {
      // Crear el préstamo en el backend
      const newLoan = await ApiService.post('/loans', loanData);
      
      // Recargar los préstamos desde el servidor
      await this.loadLoans();
    } catch (error) {
      console.error('Error creating loan:', error);
      throw error;
    }
  }

  async updateLoan(id: string, updates: Partial<Loan>): Promise<void> {
    try {
      // Actualizar en el backend
      await ApiService.put(`/loans/${id}`, updates);
      
      // Actualizar localmente
      this.loans.update(loans => 
        loans.map(loan => 
          loan.id === id 
            ? { ...loan, ...updates, updatedAt: new Date() }
            : loan
        )
      );
    } catch (error) {
      console.error('Error updating loan:', error);
      throw error;
    }
  }

  async deleteLoan(id: string): Promise<void> {
    try {
      // Eliminar en el backend
      await ApiService.delete(`/loans/${id}`);
      
      // Eliminar localmente
      this.loans.update(loans => loans.filter(loan => loan.id !== id));
    } catch (error) {
      console.error('Error deleting loan:', error);
      throw error;
    }
  }

  async fetchInstallments(loanId: string) {
    try {
      const rows = await ApiService.get(`/loans/${loanId}/installments`);
      return rows;
    } catch (e) {
      return null;
    }
  }

  async createInstallments(loanId: string, installments: any[]) {
    try {
      const rows = await ApiService.post(`/loans/${loanId}/installments`, { installments });
      return rows;
    } catch (e) {
      return null;
    }
  }

  async fetchPayments(loanId: string) {
    try {
      const rows = await ApiService.get(`/loans/${loanId}/payments`);
      return rows;
    } catch (e) {
      return null;
    }
  }

  async registerPayment(loanId: string, payload: { transaction_id?: string; accountId?: string; account_id?: string; paid_amount: number; principal_component?: number; interest_component?: number; installment_number?: number; }) {
    const body = { ...payload } as any;
    // normalize accountId -> account_id for backend
    if (body.accountId && !body.account_id) body.account_id = body.accountId;
    const r = await ApiService.post(`/loans/${loanId}/payments`, body);
    return r;
  }

  updateLoanStatus(id: string, status: 'pending' | 'paid' | 'overdue'): void {
    const updates: Partial<Loan> = { status };
    if (status === 'paid') {
      updates.paidDate = new Date();
    }
    this.updateLoan(id, updates);
  }

  // Marcar préstamo como pagado
  markAsPaid(id: string): void {
    this.updateLoanStatus(id, 'paid');
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Verificar préstamos vencidos
  checkOverdueLoans(): void {
    const today = new Date();
    // normalize to start of day
    today.setHours(0,0,0,0);
    this.loans.update(loans => 
      loans.map(loan => {
        if (loan.status !== 'pending') return loan;

        // If loan has installments, determine next pending/partial installment's due date
        if (loan.installments?.enabled && loan.installments.installmentsList?.length > 0) {
          const nextInst = loan.installments.installmentsList
            .filter(inst => inst.status === 'pending' || inst.status === 'partial')
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
          if (!nextInst) return loan;
          const due = new Date(nextInst.dueDate);
          due.setHours(0,0,0,0);
          if (due.getTime() < today.getTime()) {
            return { ...loan, status: 'overdue' as const, updatedAt: new Date() };
          }
          return loan;
        }

        // Fallback for loans without installments: use loan.dueDate
        if (!loan.dueDate) return loan;
        const dueDate = new Date(loan.dueDate);
        dueDate.setHours(0,0,0,0);
        if (dueDate.getTime() < today.getTime()) {
          return { ...loan, status: 'overdue' as const, updatedAt: new Date() };
        }
        return loan;
      })
    );
  }

  // Generar cuotas para un préstamo
  private generateInstallments(
    loanId: string, 
    totalAmount: number, 
    installmentsCount: number, 
    firstInstallmentDate: Date,
    paymentFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' = 'monthly'
  ): LoanInstallment[] {
    const installments: LoanInstallment[] = [];
  // calculate installment amount
  const installmentAmount = totalAmount / installmentsCount;
    
    for (let i = 1; i <= installmentsCount; i++) {
      const dueDate = new Date(firstInstallmentDate);
      
      // Calcular la fecha según la frecuencia de pago
      switch (paymentFrequency) {
        case 'daily':
          dueDate.setDate(dueDate.getDate() + (i - 1));
          break;
        case 'weekly':
          dueDate.setDate(dueDate.getDate() + ((i - 1) * 7));
          break;
        case 'biweekly':
          dueDate.setDate(dueDate.getDate() + ((i - 1) * 15));
          break;
        case 'monthly':
        default:
          dueDate.setMonth(dueDate.getMonth() + (i - 1));
          break;
      }
      
      // Ajustar el último pago para que cubra cualquier diferencia de centavos
      const amount = i === installmentsCount 
        ? totalAmount - (installmentAmount * (installmentsCount - 1))
        : installmentAmount;

      installments.push({
        id: `${loanId}-${i}`,
        installmentNumber: i,
        amount: Math.round(amount * 100) / 100, // Redondear a 2 decimales
        dueDate,
        status: 'pending'
      });
    }
    
    return installments;
  }

  // Marcar cuota como pagada
  markInstallmentAsPaid(loanId: string, installmentId: string): void {
    this.loans.update(loans =>
      loans.map(loan => {
        if (loan.id === loanId && loan.installments?.enabled) {
          const updatedInstallments = loan.installments.installmentsList.map(inst => {
            if (inst.id === installmentId) {
              return { ...inst, status: 'paid' as const, paidDate: new Date() };
            }
            return inst;
          });

          // Verificar si todas las cuotas están pagadas
          const allInstallmentsPaid = updatedInstallments.every(inst => inst.status === 'paid');
          
          return {
            ...loan,
            status: allInstallmentsPaid ? 'paid' as const : loan.status,
            installments: {
              ...loan.installments,
              installmentsList: updatedInstallments
            },
            updatedAt: new Date()
          };
        }
        return loan;
      })
    );
  }

  // Verificar cuotas vencidas
  checkOverdueInstallments(): void {
    const today = new Date();
    today.setHours(0,0,0,0);
    this.loans.update(loans =>
      loans.map(loan => {
        if (loan.installments?.enabled) {
          const updatedInstallments = loan.installments.installmentsList.map(inst => {
            if (inst.status === 'pending') {
              const due = new Date(inst.dueDate);
              due.setHours(0,0,0,0);
              if (due.getTime() < today.getTime()) {
                return { ...inst, status: 'overdue' as const };
              }
            }
            return inst;
          });

          return {
            ...loan,
            installments: {
              ...loan.installments,
              installmentsList: updatedInstallments
            },
            updatedAt: new Date()
          };
        }
        return loan;
      })
    );
  }
}
