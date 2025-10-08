import { Component, signal, inject, output, input, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoanService } from '../../services/loan.service';
import { ModalVisibilityService } from '../../services/modal-visibility.service';
import { Loan } from '../../models/loan.interface';

@Component({
  selector: 'app-loan-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './loan-form-modal.component.html',
  styleUrls: ['./loan-form-modal.component.scss']
})
export class LoanFormModalComponent {
  private loanService = inject(LoanService);
  private modalVisibility = inject(ModalVisibilityService);
  private originalScrollY = 0; // Variable para guardar la posición original del scroll

  // Inputs y outputs
  isOpen = input<boolean>(false);
  editingLoan = input<Loan | null>(null);
  preselectedType = input<'lent' | 'borrowed' | null>(null);
  onClose = output<void>();
  onLoanAdded = output<void>();

  // Signals
  isSubmitting = signal(false);
  formData = signal({
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    type: 'lent' as 'lent' | 'borrowed',
    personName: '',
    status: 'pending' as 'pending' | 'paid' | 'overdue',
    hasInstallments: false,
    totalInstallments: 1,
    firstInstallmentDate: new Date().toISOString().split('T')[0],
    paymentFrequency: 'monthly' as 'daily' | 'weekly' | 'biweekly' | 'monthly'
  });

  // Computed para calcular cuota según la frecuencia
  installmentAmount = computed(() => {
    const data = this.formData();
    if (data.hasInstallments && data.totalInstallments > 0) {
      return data.amount / data.totalInstallments;
    }
    return 0;
  });

  // Backward compatibility - mantener monthlyInstallment para código existente
  monthlyInstallment = computed(() => this.installmentAmount());

  // Wizard steps similar to transaction modal
  currentStep = signal(1); // 1=Tipo/Persona, 2=Monto/Fechas, 3=Descripción/Cuotas, 4=Resumen
  totalSteps = 4;

  constructor() {
    // Effect para preseleccionar tipo
    effect(() => {
      const type = this.preselectedType();
      if (type && !this.editingLoan()) {
        this.formData.update(data => ({ ...data, type }));
      }
    });

    // Effect para manejar el scroll del body cuando se abre/cierra el modal
    effect(() => {
      if (this.isOpen()) {
        this.modalVisibility.registerModal();
        // Guardar posición de scroll actual
        this.originalScrollY = window.scrollY;
        
        // Prevenir scroll del body usando overflow hidden únicamente
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
        
        // Calcular el ancho de la scrollbar para evitar saltos
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) {
          document.body.style.paddingRight = `${scrollbarWidth}px`;
        }
        
      } else {
        this.modalVisibility.unregisterModal();
        // Restaurar scroll del body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // NO restaurar scroll - mantener la posición actual para mejor UX
      }
    });

    // Effect para cargar datos de edición
    effect(() => {
      const editingLoan = this.editingLoan();
      if (editingLoan && this.isOpen()) {
        this.formData.set({
          amount: editingLoan.amount,
          description: editingLoan.description,
          date: editingLoan.date.toISOString().split('T')[0],
          dueDate: editingLoan.dueDate.toISOString().split('T')[0],
          type: editingLoan.type,
          personName: editingLoan.personName,
          status: editingLoan.status,
          hasInstallments: editingLoan.installments?.enabled || false,
          totalInstallments: editingLoan.installments?.totalInstallments || 1,
          firstInstallmentDate: editingLoan.installments?.firstInstallmentDate?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          paymentFrequency: editingLoan.installments?.paymentFrequency || 'monthly'
        });
      } else if (!editingLoan && this.isOpen()) {
        // Reset form for new loan
        this.resetForm();
      }
    });
  }
  
  updateFormField<K extends keyof ReturnType<typeof this.formData>>(
    field: K, 
    value: ReturnType<typeof this.formData>[K]
  ) {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  onAmountChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.updateFormField('amount', +target.value);
  }

  adjustAmount(adjustment: number) {
    const currentAmount = this.formData().amount || 0;
    const newAmount = Math.max(0, parseFloat((currentAmount + adjustment).toFixed(2)));
    this.updateFormField('amount', newAmount);
  }

  onDescriptionChange(event: Event) {
    const target = event.target as HTMLTextAreaElement;
    this.updateFormField('description', target.value);
  }

  onDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.updateFormField('date', target.value);
  }

  onDueDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.updateFormField('dueDate', target.value);
  }

  onPersonNameChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.updateFormField('personName', target.value);
  }

  onTypeChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.updateFormField('type', target.value as 'lent' | 'borrowed');
  }

  onStatusChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.updateFormField('status', target.value as 'pending' | 'paid' | 'overdue');
  }

  onInstallmentsChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.updateFormField('hasInstallments', target.checked);
  }

  onTotalInstallmentsChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.updateFormField('totalInstallments', +target.value);
  }

  onFirstInstallmentDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.updateFormField('firstInstallmentDate', target.value);
  }
  
  async onSubmit() {
    if (this.isSubmitting()) return;
    
    const data = this.formData();
    
    // Validaciones básicas
    if (!data.amount || !data.description || !data.personName) {
      alert('Por favor completa todos los campos obligatorios');
      return;
    }
    
    if (data.amount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }

    if (data.hasInstallments && data.totalInstallments <= 0) {
      alert('El número de cuotas debe ser mayor a 0');
      return;
    }
    
    this.isSubmitting.set(true);
    
    try {
      const loanData: any = {
        amount: data.amount,
        description: data.description,
        date: new Date(data.date),
        dueDate: new Date(data.dueDate),
        type: data.type,
        personName: data.personName,
        status: data.status
      };

      // Agregar configuración de cuotas si está habilitada
      if (data.hasInstallments) {
        // Generar las cuotas aquí mismo en el componente
        const installmentsList = this.generateInstallments(
          'temp-id', // ID temporal, se actualizará después
          data.amount,
          data.totalInstallments,
          new Date(data.firstInstallmentDate),
          data.paymentFrequency
        );

        loanData.installments = {
          enabled: true,
          totalInstallments: data.totalInstallments,
          firstInstallmentDate: new Date(data.firstInstallmentDate),
          installmentAmount: data.amount / data.totalInstallments,
          installmentsList: installmentsList,
          paymentFrequency: data.paymentFrequency
        };

        // Enviar las cuotas al backend junto con el préstamo
        loanData.installmentsData = installmentsList;
      }

      // Determinar si es edición o creación
      const editingLoan = this.editingLoan();
      if (editingLoan) {
        // Actualizar préstamo existente
        this.loanService.updateLoan(editingLoan.id, loanData);
      } else {
        // Crear nuevo préstamo
        this.loanService.addLoan(loanData);
      }
      
      // Resetear formulario
      this.resetForm();
      
      // Emitir eventos
      this.onLoanAdded.emit();
      this.closeModal();
      
    } catch (error) {
      console.error('Error al agregar el préstamo:', error);
      alert('Error al agregar el préstamo. Inténtalo de nuevo.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  onBackdropScroll(event: Event): void {
    // Prevenir el scroll en el backdrop (fuera del modal)
    event.preventDefault();
    event.stopPropagation();
  }

  onModalContentScroll(event: Event): void {
    // Permitir scroll solo dentro del contenido del modal
    event.stopPropagation();
  }

  isFormValid(): boolean {
    const data = this.formData();
    const basicValid = !!(data.amount && data.description && data.personName && data.date);
    
    if (!data.hasInstallments) {
      return basicValid && !!data.dueDate;
    } else {
      return basicValid && data.totalInstallments > 0 && !!data.firstInstallmentDate;
    }
  }

  /* ===================== WIZARD NAVIGATION ===================== */
  canProceedToNextStep(): boolean {
    const d = this.formData();
    switch (this.currentStep()) {
      case 1:
        return !!(d.personName && d.personName.trim().length > 0 && d.type && d.status);
      case 2:
        if (d.hasInstallments) {
          return !!(d.amount > 0 && d.date && d.firstInstallmentDate && d.totalInstallments > 0);
        } else {
          return !!(d.amount > 0 && d.date && d.dueDate);
        }
      case 3:
        return !!(d.description && d.description.trim().length > 0);
      case 4:
        return this.isFormValid();
      default:
        return true;
    }
  }

  nextStep() {
    if (this.currentStep() < this.totalSteps && this.canProceedToNextStep()) {
      this.currentStep.update(s => s + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  isOnLastStep(): boolean { return this.currentStep() === this.totalSteps; }

  goSaveOrNext() {
    if (this.isOnLastStep()) {
      this.onSubmit();
    } else {
      this.nextStep();
    }
  }

  closeModal(): void {
    this.resetForm();
    this.onClose.emit();
    this.modalVisibility.unregisterModal();
  }
  
  private resetForm() {
    const preselectedType = this.preselectedType();
    this.formData.set({
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      type: preselectedType || 'lent',
      personName: '',
      status: 'pending',
      hasInstallments: false,
      totalInstallments: 1,
      firstInstallmentDate: new Date().toISOString().split('T')[0],
      paymentFrequency: 'monthly'
    });
  }

  onPaymentFrequencyChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.formData.update(data => ({
      ...data,
      paymentFrequency: target.value as 'daily' | 'weekly' | 'biweekly' | 'monthly'
    }));
  }

  getFrequencyText(): string {
    const frequency = this.formData().paymentFrequency;
    switch (frequency) {
      case 'daily': return 'diarias';
      case 'weekly': return 'semanales';
      case 'biweekly': return 'quincenales';
      case 'monthly': return 'mensuales';
      default: return 'mensuales';
    }
  }

  // Método para formatear moneda
  formatCurrency(amount: number): string {
    return `PEN ${amount.toFixed(2)}`;
  }

  // Generar cuotas para un préstamo
  private generateInstallments(
    loanId: string,
    totalAmount: number,
    installmentsCount: number,
    firstInstallmentDate: Date,
    paymentFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' = 'monthly'
  ): any[] {
    const installments: any[] = [];
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
        installmentNumber: i,
        amount: Math.round(amount * 100) / 100, // Redondear a 2 decimales
        dueDate,
        status: 'pending'
      });
    }

    return installments;
  }
}
