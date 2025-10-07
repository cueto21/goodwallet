import { Component, signal, inject, output, input, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TransactionService } from '../../services/transaction';
import { AccountService } from '../../services/account';
import { CategoryService } from '../../services/category';
import { FriendsService } from '../../services/friends';

@Component({
  selector: 'app-transaction-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transaction-form-modal.component.html',
  styleUrls: ['./transaction-form-modal.component.scss']
})
export class TransactionFormModalComponent {
  private transactionService = inject(TransactionService);
  private accountService = inject(AccountService);
  private categoryService = inject(CategoryService);
  private friendsService = inject(FriendsService);
  private originalScrollY = 0; // Variable para guardar la posición original del scroll

  // Inputs y outputs
  isOpen = input<boolean>(false);
  preselectedType = input<'income' | 'expense' | 'Transferencia' | null>(null);
  preselectedEnableSharing = input<boolean | null>(null);
  onClose = output<void>();
  onTransactionAdded = output<void>();

  // Signals
  isSubmitting = signal(false);
  currentStep = signal(1); // Step-based wizard: 1=Type, 2=Details, 3=Account, 4=Category, 5=Sharing
  enableSharing = signal(false);
  formData = signal({
    amount: null as number | null,
    description: '',
    date: new Date().toISOString().split('T')[0],
    categoryId: '',
    accountId: '', // cuenta origen en Transferenciaencia
    toAccountId: '', // cuenta destino en Transferenciaencia
    type: 'expense' as 'income' | 'expense' | 'Transferencia',
    shared_with: [] as {friend_id: number, split_type: 'fixed' | 'percentage', split_value: number}[]
  });

  // Computed
  accounts = this.accountService.getAccounts();
  categories = this.categoryService.getCategories();
  categoriesByType = this.categoryService.getCategoriesByType;
  friends = this.friendsService.getFriends();

  // UI state for custom dropdowns
  categoryDropdownOpen = signal(false);
  searchTerm = signal('');
  // Account dropdown state
  accountDropdownOpen = signal(false);
  toAccountDropdownOpen = signal(false);
  accountSearch = signal('');

  filteredAccounts = computed(() => {
    const q = this.accountSearch().trim().toLowerCase();
    const list = this.accounts() || [];
    if (!q) return list;
    return list.filter((a: any) => String(a.name).toLowerCase().includes(q));
  });

  filteredCategories = computed(() => {
    const typeKey = this.formData().type === 'income' ? 'income' : 'expense';
    const lists = this.categoriesByType();
    const list = (lists && lists[typeKey]) ? lists[typeKey] : [];
    const q = this.searchTerm().trim().toLowerCase();
    if (!q) return list;
    return list.filter((c: any) => String(c.name).toLowerCase().includes(q));
  });

  constructor() {
    // Effect para preseleccionar tipo y auto-avanzar
    effect(() => {
      const type = this.preselectedType();
      if (type) {
        this.formData.update(data => ({ ...data, type }));
        // Auto-avanzar a step 2 cuando hay un tipo preseleccionado
        this.currentStep.set(2);
      }

      const enableSharing = this.preselectedEnableSharing();
      if (enableSharing !== null) {
        this.enableSharing.set(enableSharing);
      }
    });

    // Effect para manejar el scroll del body cuando se abre/cierra el modal
    effect(() => {
      if (this.isOpen()) {
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
        // Restaurar scroll del body
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        // NO restaurar scroll - mantener la posición actual para mejor UX
      }
    });

    // Close category dropdown when clicking outside
    effect(() => {
      if (this.categoryDropdownOpen()) {
        const onDoc = (e: any) => {
          // if click is outside modal-content, close dropdown
          const modal = document.querySelector('.modal-content');
          if (!modal) return;
          if (!modal.contains(e.target)) {
            this.categoryDropdownOpen.set(false);
          }
        };
        document.addEventListener('click', onDoc);
        return () => document.removeEventListener('click', onDoc);
      }
      return undefined;
    });

    // Load friends when modal opens
    effect(() => {
      if (this.isOpen()) {
        this.friendsService.loadFriends();
      }
    });
  }
  
  updateFormField<K extends keyof ReturnType<typeof this.formData>>(
    field: K,
    value: ReturnType<typeof this.formData>[K]
  ) {
    this.formData.update(data => ({ ...data, [field]: value }));
  }

  // Step navigation
  nextStep() {
    const maxStep = this.enableSharing() && this.formData().type === 'expense' ? 5 : 4;
    if (this.currentStep() < maxStep) {
      this.currentStep.update(step => step + 1);
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(step => step - 1);
    }
  }

  goToStep(step: number) {
    const maxStep = this.enableSharing() && this.formData().type === 'expense' ? 5 : 4;
    if (step >= 1 && step <= maxStep) {
      this.currentStep.set(step);
    }
  }

  // Type selection
  selectType(type: 'income' | 'expense' | 'Transferencia') {
    this.updateFormField('type', type);
    this.nextStep();
  }

  onAmountChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.updateFormField('amount', +target.value);
  }

  onDescriptionChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.updateFormField('description', target.value);
  }

  onDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    this.updateFormField('date', target.value);
  }

  onAccountChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.updateFormField('accountId', target.value);
  }

  onCategoryChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.updateFormField('categoryId', target.value);
  }

  // Custom dropdown handlers
  toggleCategoryDropdown() {
    this.categoryDropdownOpen.update(v => !v);
  }

  selectCategory(cat: any) {
    // ensure we set the id as string to match frontend storage format
    this.updateFormField('categoryId', String(cat.id));
    this.categoryDropdownOpen.set(false);
  }

  onCategorySearch(event: Event) {
    const t = event.target as HTMLInputElement;
    this.searchTerm.set(t.value || '');
  }

  getSelectedCategory() {
    const id = this.formData().categoryId;
    return id ? this.categoryService.getCategoryById(String(id)) : undefined;
  }

  getSelectedCategoryColor() {
    const c = this.getSelectedCategory();
    return c?.color ?? '#cbd5e1';
  }

  getSelectedCategoryIcon() {
    const c = this.getSelectedCategory();
    return c?.icon ?? '';
  }

  // Account helpers
  toggleAccountDropdown() {
    this.accountDropdownOpen.update(v => !v);
    // ensure the other dropdown is closed
    if (this.toAccountDropdownOpen()) this.toAccountDropdownOpen.set(false);
  }

  toggleToAccountDropdown() {
    this.toAccountDropdownOpen.update(v => !v);
    if (this.accountDropdownOpen()) this.accountDropdownOpen.set(false);
  }

  selectAccountItem(acc: any) {
    this.updateFormField('accountId', String(acc.id));
    this.accountDropdownOpen.set(false);
  }

  selectToAccount(acc: any) {
    this.updateFormField('toAccountId', String(acc.id));
    this.toAccountDropdownOpen.set(false);
  }

  getSelectedAccount() {
    const id = this.formData().accountId;
    if (!id) return undefined;
    return this.accounts().find(a => String(a.id) === String(id));
  }

  getSelectedAccountLabel() {
    const a = this.getSelectedAccount();
  if (!a) return null;
  const currency = (a as any).currency_code ?? (a as any).currency ?? 'PEN';
  const bal = Number((a as any).balance ?? (a as any).current_balance ?? 0).toFixed(2);
  return `${a.name} - ${currency} ${bal}`;
  }

  onAccountSearch(event: Event) {
    const t = event.target as HTMLInputElement;
    this.accountSearch.set(t.value || '');
  }

  getAccountNumericBalance(acc: any): number {
    return Number((acc as any).balance ?? (acc as any).current_balance ?? (acc as any).initial_balance ?? 0);
  }

  getAccountNameById(id: any): string | null {
    if (!id) return null;
    const a = this.accounts().find((x: any) => String(x.id) === String(id));
    return a ? a.name : null;
  }

  onToAccountChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    this.updateFormField('toAccountId', target.value);
  }

  // Sharing methods
  toggleFriendShare(friendId: number, selected: boolean) {
    const current = this.formData().shared_with;
    if (selected) {
      // Add with default split
      const newShare = { friend_id: friendId, split_type: 'fixed' as 'fixed', split_value: 0 };
      this.updateFormField('shared_with', [...current, newShare]);
    } else {
      // Remove
      this.updateFormField('shared_with', current.filter(s => s.friend_id !== friendId));
    }
  }

  isFriendSelected(friendId: number): boolean {
    return this.formData().shared_with.some(s => s.friend_id === friendId);
  }

  setSplitType(friendId: number, type: string) {
    const current = this.formData().shared_with;
    const updated = current.map(s => s.friend_id === friendId ? { ...s, split_type: type as 'fixed' | 'percentage' } : s);
    this.updateFormField('shared_with', updated);
  }

  setSplitValue(friendId: number, value: string) {
    const numValue = parseFloat(value) || 0;
    const current = this.formData().shared_with;
    const updated = current.map(s => s.friend_id === friendId ? { ...s, split_value: numValue } : s);
    this.updateFormField('shared_with', updated);
  }

  getSplitPlaceholder(friendId: number): string {
    const share = this.formData().shared_with.find(s => s.friend_id === friendId);
    if (!share) return '';
    return share.split_type === 'percentage' ? '%' : 'S/';
  }
  
  async onSubmit() {
    if (this.isSubmitting()) return;
    
    const data = this.formData();
    
    // Validaciones básicas
    if (data.type === 'Transferencia') {
      if (!data.amount || !data.accountId || !data.toAccountId) {
        alert('Completa monto, cuenta origen y cuenta destino');
        return;
      }
      if (data.accountId === data.toAccountId) {
        alert('Las cuentas deben ser diferentes');
        return;
      }
    } else if (!data.amount || !data.description || !data.categoryId || !data.accountId) {
      alert('Por favor completa todos los campos');
      return;
    }
    
    if (data.amount <= 0) {
      alert('El monto debe ser mayor a 0');
      return;
    }
    
    this.isSubmitting.set(true);
    
    try {
      if (data.type === 'Transferencia') {
        // Ejecutar la Transferenciaencia (dos movimientos)
        this.transactionService.addTransferencia({
          amount: data.amount,
          description: data.description || 'Transferenciaencia',
          date: new Date(data.date),
          fromAccountId: data.accountId,
          toAccountId: data.toAccountId
        });
        // Actualizar balances manualmente
        this.accountService.updateAccountBalance(data.accountId, data.amount, 'expense');
        this.accountService.updateAccountBalance(data.toAccountId, data.amount, 'income');
      } else {
        this.transactionService.addTransaction({
          amount: data.amount,
          description: data.description,
          date: new Date(data.date),
          categoryId: data.categoryId,
          accountId: data.accountId,
          type: data.type,
          shared_with: data.shared_with
        } as any);
        this.accountService.updateAccountBalance(data.accountId, data.amount, data.type);
      }
      
      // Resetear formulario
      this.resetForm();
      
      // Emitir eventos
      this.onTransactionAdded.emit();
      this.closeModal();
      
    } catch (error) {
      console.error('Error al agregar la transacción:', error);
      alert('Error al agregar la transacción. Inténtalo de nuevo.');
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

  canProceedToNextStep(): boolean {
    const data = this.formData();
    if (this.currentStep() === 2) {
      // Step 2: Description, Amount, Date
      return !!(data.description && data.description.trim().length > 0 && data.amount && data.date);
    }
    if (this.currentStep() === 3) {
      // Step 3: Account selection only
      if (data.type === 'Transferencia') {
        return !!(data.accountId && data.toAccountId && data.accountId !== data.toAccountId);
      }
      return !!data.accountId;
    }
    if (this.currentStep() === 4) {
      // Step 4: Category
      if (data.type !== 'Transferencia') {
        return !!data.categoryId;
      }
      return true;
    }
    if (this.currentStep() === 5) {
      // Step 5: Sharing
      return data.shared_with.length > 0 && data.shared_with.every(s => s.split_value > 0);
    }
    return true;
  }

  isFormValid(): boolean {
    const data = this.formData();
    if (data.type === 'Transferencia') {
      return !!(data.amount && data.accountId && data.toAccountId && data.date && data.accountId !== data.toAccountId);
    }
    let valid = !!(data.amount && data.description && data.categoryId && data.accountId && data.date);
    if (valid && this.enableSharing() && data.type === 'expense') {
      // Validate shared_with
      valid = data.shared_with.length > 0 && data.shared_with.every(s => s.split_value > 0);
    }
    return valid;
  }

  closeModal(): void {
    this.resetForm();
    this.onClose.emit();
  }
  
  private resetForm() {
    this.formData.set({
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
      categoryId: '',
      accountId: '',
      toAccountId: '',
      type: 'expense',
      shared_with: []
    });
    this.enableSharing.set(false);
    this.currentStep.set(1);
  }
}
