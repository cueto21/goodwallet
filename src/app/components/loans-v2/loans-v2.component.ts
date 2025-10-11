import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService } from '../../services/loan.service';
import { AccountService } from '../../services/account';
import { TransactionService } from '../../services/transaction';
import { DarkModeService } from '../../services/dark-mode.service';
import { Loan } from '../../models/loan.interface';
import { Account } from '../../models/account.interface';
import { LoanFormModalComponent } from '../loan-form-modal/loan-form-modal.component';

@Component({
  selector: 'app-loans-v2',
  standalone: true,
  imports: [CommonModule, FormsModule, LoanFormModalComponent],
  templateUrl: './loans-v2.component.html',
  styleUrls: ['./loans-v2.component.scss']
})
export class LoansV2Component implements OnInit {
  private loanService = inject(LoanService);
  private accountService = inject(AccountService);
  private transactionService = inject(TransactionService);
  private darkModeService = inject(DarkModeService);

  // Dark mode
  isDarkMode = this.darkModeService.darkMode;
  
  // Make Math available in template
  Math = Math;

  // Signals
  loans = signal<Loan[]>([]);
  accounts = signal<Account[]>([]);
  isLoadingLoans = signal<boolean>(true);
  selectedAccountId = signal<string>('');
  filterType = signal<string>('all');
  filterStatus = signal<string>('all');
  showLoanModal = signal<boolean>(false);
  showPaymentModal = signal<boolean>(false);
  showPartialPaymentModal = signal<boolean>(false);
  selectedLoan = signal<Loan | null>(null);
  selectedInstallment = signal<any>(null);
  selectedInstallmentAmount = signal<number>(0);
  partialPaymentAmount = signal<number>(0);
  shouldRegisterTransaction = signal<boolean>(true); // Nueva opción para controlar si se registra en las cuentas
  editingLoan = signal<Loan | null>(null);
  formData = signal<any>({
    amount: 0,
    description: '',
    date: '',
    dueDate: '',
    type: 'lent',
    personName: '',
    status: 'pending',
    hasInstallments: false,
    totalInstallments: 1,
    firstInstallmentDate: ''
  });

  // Computed properties
  lentLoans = computed(() => this.loans().filter(loan => loan.type === 'lent'));
  borrowedLoans = computed(() => this.loans().filter(loan => loan.type === 'borrowed'));
  
  totalLent = computed(() => {
    return this.lentLoans()
      .filter(loan => loan.status === 'pending' || loan.status === 'overdue')
      .reduce((sum, loan) => {
        if (loan.installments?.enabled) {
          const instSum = (loan.installments.installmentsList || [])
            .filter(inst => inst.status === 'pending' || inst.status === 'overdue' || inst.status === 'partial')
            .reduce((s, inst) => {
              if (inst.status === 'partial') {
                const remaining = Number(inst.amount || 0) - Number(inst.partialAmountPaid || 0);
                return s + (remaining > 0 ? remaining : 0);
              }
              return s + Number(inst.amount || 0);
            }, 0);
          return sum + (isNaN(instSum) ? 0 : instSum);
        }
        return sum + Number(loan.amount || 0);
      }, 0);
  });
  
  totalBorrowed = computed(() => {
    return this.borrowedLoans()
      .filter(loan => loan.status === 'pending' || loan.status === 'overdue')
      .reduce((sum, loan) => {
        if (loan.installments?.enabled) {
          const instSum = (loan.installments.installmentsList || [])
            .filter(inst => inst.status === 'pending' || inst.status === 'overdue' || inst.status === 'partial')
            .reduce((s, inst) => {
              if (inst.status === 'partial') {
                const remaining = Number(inst.amount || 0) - Number(inst.partialAmountPaid || 0);
                return s + (remaining > 0 ? remaining : 0);
              }
              return s + Number(inst.amount || 0);
            }, 0);
          return sum + (isNaN(instSum) ? 0 : instSum);
        }
        return sum + Number(loan.amount || 0);
      }, 0);
  });

  filteredLoans = computed(() => {
    let filtered = this.loans();
    
    if (this.filterType() !== 'all') {
      const type = this.filterType();
      filtered = filtered.filter(loan => (loan.type || '') === type);
    }
    
    if (this.filterStatus() !== 'all') {
      if (this.filterStatus() === 'overdue') {
        // Incluir préstamos que el backend ya marcó como 'overdue'
        filtered = filtered.filter(loan => 
          loan.status === 'overdue' || (loan.status === 'pending' && this.isOverdue(loan))
        );
      } else {
        filtered = filtered.filter(loan => loan.status === this.filterStatus());
      }
    }
    
    return filtered;
  });

  ngOnInit() {
  this.loadLoans();
    // Ensure accounts are loaded from backend so the payment modal can list them
    this.accountService.loadAccounts().then(() => this.loadAccounts()).catch(() => this.loadAccounts());
  }

  // Data loading methods
  async loadLoans() {
    this.isLoadingLoans.set(true);
    // Force the service to fetch from API (handles F5 and fresh loads)
    try {
      await this.loanService.loadLoans();
    } catch (e) {
      // ignore - service already logs errors
    }

    const currentLoans = this.loanService.getLoans();
    this.loans.set(currentLoans());
    this.isLoadingLoans.set(false);
  }

  private loadAccounts() {
    const currentAccounts = this.accountService.getAccounts();
    this.accounts.set(currentAccounts());
  }

  // Utility methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  }

  formatDate(date: Date): string {
    // If date is UTC (like "2025-10-10T00:00:00.000Z"), extract the date part directly
    const dateObj = new Date(date);
    const isoString = dateObj.toISOString();
    
    // Extract the date part from ISO string (YYYY-MM-DD)
    const datePart = isoString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    
    // Create a new date using UTC components to avoid timezone conversion
    const normalizedDate = new Date(Date.UTC(year, month - 1, day));
    
    const formattedDate = normalizedDate.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC' // Force UTC to prevent timezone conversion
    });
    
    console.log(`[DEBUG formatDate]`, {
      originalDate: date,
      originalDateISO: isoString,
      extractedDatePart: datePart,
      normalizedDateUTC: normalizedDate.toISOString(),
      formattedDate: formattedDate,
      currentTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    
    return formattedDate;
  }

  isOverdue(loan: Loan): boolean {
  // If loan is already paid, it's not overdue
  if (loan.status === 'paid') return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar la fecha de hoy para una comparación precisa

    // Lógica para préstamos CON CUOTAS
    if (loan.installments?.enabled && loan.installments.installmentsList?.length > 0) {
      // Buscar la próxima cuota pendiente o parcial (la más próxima en fecha)
      const nextInstallment = loan.installments.installmentsList
        .filter(inst => inst.status === 'pending' || inst.status === 'partial')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
      if (nextInstallment) {
        // Get today's date as YYYY-MM-DD in local time
        const todayDate = new Date();
        const todayStr = todayDate.getFullYear() + '-' + 
                        String(todayDate.getMonth() + 1).padStart(2, '0') + '-' + 
                        String(todayDate.getDate()).padStart(2, '0');
        
        // For UTC dates, extract the date part directly from ISO string
        const dueDateObj = new Date(nextInstallment.dueDate);
        const dueDateISO = dueDateObj.toISOString();
        const dueDateStr = dueDateISO.split('T')[0]; // Extract YYYY-MM-DD part
        
        // Create normalized dates from the date strings
        const todayNormalized = new Date(todayStr + 'T00:00:00');
        const dueDate = new Date(dueDateStr + 'T00:00:00');
        
        const isOverdueResult = dueDate.getTime() < todayNormalized.getTime();
        
        console.log(`[DEBUG isOverdue] Loan: ${loan.personName}`, {
          originalDueDate: nextInstallment.dueDate,
          dueDateISO: dueDateISO,
          extractedDatePart: dueDateStr,
          todayStr,
          todayNormalized: todayNormalized.toISOString(),
          dueDateNormalized: dueDate.toISOString(),
          todayGetTime: todayNormalized.getTime(),
          dueDateGetTime: dueDate.getTime(),
          comparison: `${dueDate.getTime()} < ${todayNormalized.getTime()}`,
          isOverdue: isOverdueResult,
          installmentNumber: nextInstallment.installmentNumber,
          installmentStatus: nextInstallment.status
        });
        
        // overdue only if dueDate is strictly before today
        return isOverdueResult;
      }
      return false;
    }

    // Lógica para préstamos SIN CUOTAS (o sin lista de cuotas)
    if (!loan.dueDate) return false;
  const generalDueDate = new Date(loan.dueDate);
  generalDueDate.setHours(0, 0, 0, 0);
  return generalDueDate.getTime() < today.getTime();
  }

  getDaysUntilDue(dueDate: Date): number {
    // Get today's date as YYYY-MM-DD in local time
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');
    
    // For UTC dates, extract the date part directly from ISO string
    const dueDateObj = new Date(dueDate);
    const dueDateISO = dueDateObj.toISOString();
    const dueDateStr = dueDateISO.split('T')[0]; // Extract YYYY-MM-DD part
    
    // Create normalized dates from the date strings
    const todayDate = new Date(todayStr + 'T00:00:00');
    const dueDateNormalized = new Date(dueDateStr + 'T00:00:00');
    
    const diffTime = dueDateNormalized.getTime() - todayDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  // Métodos para progreso de cuotas
  getInstallmentProgress(installment: any): number {
    if (installment.status === 'paid') return 100;
    if (installment.status === 'partial' && installment.partialAmountPaid) {
      return Math.round((installment.partialAmountPaid / installment.amount) * 100);
    }
    return 0;
  }

  getInstallmentPaidAmount(installment: any): number {
    if (installment.status === 'paid') return installment.amount;
    if (installment.status === 'partial' && installment.partialAmountPaid) {
      return installment.partialAmountPaid;
    }
    return 0;
  }

  getInstallmentRemainingAmount(installment: any): number {
    return installment.amount - this.getInstallmentPaidAmount(installment);
  }

  // Métodos para fechas de cuotas
  getNextPaymentDate(loan: Loan): Date | null {
    if (!loan.installments?.enabled) return null;
    
    const nextInstallment = loan.installments.installmentsList
      .find(inst => inst.status === 'pending' || inst.status === 'partial');
    
    if (nextInstallment) {
      console.log(`[DEBUG getNextPaymentDate] Loan: ${loan.personName}`, {
        installmentNumber: nextInstallment.installmentNumber,
        status: nextInstallment.status,
        dueDateFromEndpoint: nextInstallment.dueDate,
        dueDateType: typeof nextInstallment.dueDate,
        dueDateParsed: new Date(nextInstallment.dueDate).toISOString(),
        dueDateLocal: new Date(nextInstallment.dueDate).toLocaleDateString('es-PE')
      });
    }
    
    return nextInstallment ? new Date(nextInstallment.dueDate) : null;
  }

  getFinalPaymentDate(loan: Loan): Date | null {
    if (!loan.installments?.enabled) return null;
    
    const installments = loan.installments.installmentsList;
    return installments[installments.length - 1]?.dueDate || null;
  }

  getDaysUntilNextPayment(loan: Loan): number {
    const nextDate = this.getNextPaymentDate(loan);
    if (!nextDate) return 0;
    
    // Get today's date as YYYY-MM-DD in local time
    const today = new Date();
    const todayStr = today.getFullYear() + '-' + 
                    String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                    String(today.getDate()).padStart(2, '0');
    
    // For UTC dates, extract the date part directly from ISO string
    const nextDateObj = new Date(nextDate);
    const nextDateISO = nextDateObj.toISOString();
    const nextDateStr = nextDateISO.split('T')[0]; // Extract YYYY-MM-DD part
    
    // Create new dates from the date strings to avoid timezone issues
    const todayDate = new Date(todayStr + 'T00:00:00');
    const nextDateNormalized = new Date(nextDateStr + 'T00:00:00');
    
    const diffTime = nextDateNormalized.getTime() - todayDate.getTime();
    const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    console.log(`[DEBUG getDaysUntilNextPayment] Loan: ${loan.personName}`, {
      nextDateISO,
      extractedDatePart: nextDateStr,
      todayStr,
      todayDate: todayDate.toISOString(),
      nextDateNormalized: nextDateNormalized.toISOString(),
      diffTimeMs: diffTime,
      daysDifference: daysDiff
    });
    
    return daysDiff;
  }

  // Installment methods
  getPaidInstallments(loan: Loan): number {
    if (!loan.installments?.enabled) return 0;
    return loan.installments.installmentsList?.filter(i => i.status === 'paid').length || 0;
  }

  getRemainingInstallments(loan: Loan): number {
    if (!loan.installments?.enabled) return 0;
    const total = loan.installments.totalInstallments || 0;
    const paid = this.getPaidInstallments(loan);
    return total - paid;
  }

  getRemainingAmount(loan: Loan): number {
    if (!loan.installments?.enabled) return loan.amount;
    
    return loan.installments.installmentsList
      .filter(inst => inst.status !== 'paid')
      .reduce((total, inst) => {
        const partiallyPaid = inst.partialAmountPaid || 0;
        return total + (inst.amount - partiallyPaid);
      }, 0);
  }

  getProgressPercentage(loan: Loan): number {
    if (!loan.installments?.enabled) return 0;
    const paid = this.getPaidInstallments(loan);
    const total = loan.installments.totalInstallments || 1;
    return Math.round((paid / total) * 100);
  }

  // Payment methods
  async toggleInstallmentPayment(loan: Loan, installment: any) {
    if (installment.status === 'paid') return;
    
    this.selectedLoan.set(loan);
    this.selectedInstallment.set(installment);
    
    // Calcular el monto restante por pagar
    const remainingAmount = this.getInstallmentRemainingAmount(installment);
    this.selectedInstallmentAmount.set(remainingAmount);
    
    // Siempre abrir modal para seleccionar cuenta
    // Load accounts before showing modal
    try {
      await this.accountService.loadAccounts();
    } catch (e) {
      // ignore, still show whatever cached accounts exist
    }
    this.loadAccounts();
    this.showPaymentModal.set(true);
  }

  async processInstallmentPayment() {
    const loan = this.selectedLoan();
    const installment = this.selectedInstallment();
    const accountId = this.selectedAccountId();
    const amountToPay = this.selectedInstallmentAmount();
    const shouldRegister = this.shouldRegisterTransaction();
    
    if (!loan || !installment) return;
    if (shouldRegister && !accountId) {
      alert('Por favor selecciona una cuenta');
      return;
    }

    // Mark installment as paid
    installment.status = 'paid';
    installment.paidDate = new Date();
    // Limpiar cualquier pago parcial previo ya que ahora está completamente pagado
    installment.partialAmountPaid = undefined;

    // Siempre registrar el pago en backend, solo agrega accountId si corresponde
    const payload: any = { paid_amount: amountToPay, installment_number: installment.installmentNumber };
    if (shouldRegister && accountId) payload.accountId = accountId;
    try {
      await this.loanService.registerPayment(String(loan.id), payload);
      // Recargar cuentas y préstamos para mostrar saldos actualizados
      if (shouldRegister && accountId) {
        await this.accountService.loadAccounts();
      }
      await this.loanService.loadLoans();
      // actualizar señales locales
      this.loadAccounts();
      this.loadLoans();

      // Check if all installments are paid and update loan status
      const allPaid = loan.installments?.installmentsList?.every(i => i.status === 'paid');
      if (allPaid) {
        loan.status = 'paid';
        this.loanService.updateLoan(loan.id, loan);
      }
    } catch (e) {
      console.error('Error registering payment:', e);
      alert('Error al registrar el pago en el servidor');
    }

    this.loadLoans();
    this.closePaymentModal();
  }

  async openPartialPaymentModal(loan: Loan) {
    this.selectedLoan.set(loan);
    this.partialPaymentAmount.set(0);
    try {
      await this.accountService.loadAccounts();
    } catch (e) {}
    this.loadAccounts();
    this.showPartialPaymentModal.set(true);
  }

  async processPartialPayment() {
    const loan = this.selectedLoan();
    const amount = this.partialPaymentAmount();
    const accountId = this.selectedAccountId();
    const shouldRegister = this.shouldRegisterTransaction();
    
    if (!loan || !loan.installments?.enabled) return;
    if (amount <= 0) return alert('Ingresa un monto válido');
  if (shouldRegister && !accountId) return alert('Por favor selecciona una cuenta');

    let remainingAmount = amount;
    const installments = loan.installments.installmentsList;
    
    for (let inst of installments) {
      if (inst.status === 'paid') continue;
      
      const alreadyPaid = inst.partialAmountPaid || 0;
      const toPay = inst.amount - alreadyPaid;
      
      if (remainingAmount >= toPay) {
        // Paga la cuota completa
        inst.status = 'paid';
        inst.paidDate = new Date();
        inst.partialAmountPaid = undefined;
        remainingAmount -= toPay;
      } else if (remainingAmount > 0) {
        // Pago parcial
        inst.status = 'partial';
        inst.partialAmountPaid = alreadyPaid + remainingAmount;
        remainingAmount = 0;
        break;
      }
    }
    
    // Siempre registrar el pago parcial en backend, solo agrega accountId si corresponde
    const payload: any = { paid_amount: amount };
    if (shouldRegister && accountId) payload.accountId = accountId;
    try {
      await this.loanService.registerPayment(String(loan.id), payload);
      if (shouldRegister && accountId) {
        await this.accountService.loadAccounts();
      }
      await this.loanService.loadLoans();
      this.loadAccounts();
      this.loadLoans();
    } catch (e) {
      console.error('Error registering partial payment:', e);
      alert('Error al registrar el pago en el servidor');
    }
    
    // Si todas las cuotas están pagadas, marcar préstamo como pagado
    if (installments.every(i => i.status === 'paid')) {
      loan.status = 'paid';
      loan.paidDate = new Date();
    }
    
    // Guardar cambios en el servicio
    this.loanService.updateLoan(loan.id, { 
      installments: loan.installments, 
      status: loan.status, 
      paidDate: loan.paidDate 
    });
    
    this.loadLoans();
    this.closePartialPaymentModal();
  }

  async markAsPaid(loan: Loan) {
    // Si el préstamo NO tiene cuotas, abrir el modal de pago completo
    if (!loan.installments?.enabled) {
      this.selectedLoan.set(loan);
      this.selectedInstallment.set(null);
      this.selectedInstallmentAmount.set(loan.amount);
      try {
        await this.accountService.loadAccounts();
      } catch (e) {}
      this.loadAccounts();
      this.showPaymentModal.set(true);
    } else {
      // Si tiene cuotas, usar el flujo normal
      this.loanService.markAsPaid(loan.id);
      this.loadLoans();
    }
  }

  // Modal methods
  openLoanModal() {
    this.showLoanModal.set(true);
  }

  closeLoanModal() {
    this.showLoanModal.set(false);
    this.resetForm();
  }

  resetForm() {
    this.editingLoan.set(null);
    this.formData.set({
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      type: 'lent',
      personName: '',
      status: 'pending',
      hasInstallments: false,
      totalInstallments: 1,
      firstInstallmentDate: new Date().toISOString().split('T')[0]
    });
  }

  closePaymentModal() {
    this.showPaymentModal.set(false);
    this.selectedLoan.set(null);
    this.selectedInstallment.set(null);
    this.selectedInstallmentAmount.set(0);
    this.selectedAccountId.set('');
    this.shouldRegisterTransaction.set(true); // Resetear a true por defecto
  }

  closePartialPaymentModal() {
    this.showPartialPaymentModal.set(false);
    this.selectedLoan.set(null);
    this.partialPaymentAmount.set(0);
    this.selectedAccountId.set('');
    this.shouldRegisterTransaction.set(true); // Resetear a true por defecto
  }

  confirmPayment() {
    const loan = this.selectedLoan();
    const installment = this.selectedInstallment();
    const accountId = this.selectedAccountId();
    const shouldRegister = this.shouldRegisterTransaction();

    if (loan && installment) {
      // Pago de cuota individual
      // Asegura que el endpoint se consuma y espera a que termine antes de refrescar
      this.processInstallmentPayment();
    } else if (loan && !installment) {
      // Pago completo de préstamo sin cuotas
      // Asegura que el endpoint se consuma y espera a que termine antes de refrescar
      this.processCompleteLoanPayment();
    }
  }

  async processCompleteLoanPayment() {
    const loan = this.selectedLoan();
    const accountId = this.selectedAccountId();
    const shouldRegister = this.shouldRegisterTransaction();
    const amountToPay = this.selectedInstallmentAmount();
    
    if (!loan) return;

    // Registrar pago completo en backend
    if (shouldRegister) {
      const payload: any = { paid_amount: amountToPay };
      if (accountId) payload.accountId = accountId;
      try {
        await this.loanService.registerPayment(String(loan.id), payload);
        await this.accountService.loadAccounts();
        await this.loanService.loadLoans();
        this.loadAccounts();
        this.loadLoans();

        // Marcar préstamo como pagado
        loan.status = 'paid';
        loan.paidDate = new Date();
        this.loanService.updateLoan(loan.id, loan);
      } catch (e) {
        console.error('Error registering complete payment:', e);
        alert('Error al registrar el pago en el servidor');
      }
    }
    this.loadLoans();
    this.closePaymentModal();
  }

  // CRUD methods
  editLoan(loan: Loan) {
    this.editingLoan.set(loan);
    this.formData.set({
      amount: loan.amount,
      description: loan.description,
      date: loan.date.toISOString().split('T')[0],
      dueDate: loan.dueDate.toISOString().split('T')[0],
      type: loan.type,
      personName: loan.personName,
      status: loan.status,
      hasInstallments: loan.installments?.enabled || false,
      totalInstallments: loan.installments?.totalInstallments || 1,
      firstInstallmentDate: loan.installments?.firstInstallmentDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
    });
    this.showLoanModal.set(true);
  }

  deleteLoan(loan: Loan) {
    if (confirm('¿Estás seguro de que quieres eliminar este préstamo?')) {
      this.loanService.deleteLoan(loan.id);
      this.loadLoans();
    }
  }

  handleLoanAdded() {
    this.loadLoans();
    this.closeLoanModal();
  }

  // Additional utility methods
  getNextInstallmentDueDate(loan: Loan): Date | null {
    if (!loan.installments?.enabled) return null;
    const unpaidInstallments = loan.installments.installmentsList
      .filter(inst => inst.status !== 'paid')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    
    return unpaidInstallments.length > 0 ? unpaidInstallments[0].dueDate : null;
  }

  getLastInstallmentDate(loan: Loan): Date | null {
    if (!loan.installments?.enabled || !loan.installments.installmentsList.length) return null;
    const sortedInstallments = loan.installments.installmentsList
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    
    return sortedInstallments[0].dueDate;
  }

  markInstallmentAsPaid(loan: Loan, installmentId: string): void {
    this.loanService.markInstallmentAsPaid(loan.id, installmentId);
    this.loadLoans();
  }
}
