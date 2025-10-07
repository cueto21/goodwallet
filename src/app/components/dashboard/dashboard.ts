import { Component, inject, computed, signal, OnInit, OnDestroy, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TransactionService } from '../../services/transaction';
import { AccountService } from '../../services/account';
import { LoanService } from '../../services/loan.service';
import { RecurringTransactionService } from '../../services/recurring-transaction.service';
import { CategoryService } from '../../services/category';
import { DateUtilService } from '../../services/date-util.service';
import { DarkModeService } from '../../services/dark-mode.service';
import { CardStyleService } from '../../services/card-style.service';
import { FriendsService } from '../../services/friends';
import { ThemeService } from '../../services/theme.service';
import { AccountFormModalComponent } from '../account-form-modal/account-form-modal.component';
import { BalanceProjectionModalComponent } from '../balance-projection-modal/balance-projection-modal.component';
import { TransactionFormModalComponent } from '../transaction-form-modal/transaction-form-modal.component';
import { LoanFormModalComponent } from '../loan-form-modal/loan-form-modal.component';
import { RecurringTransactionFormComponent } from '../recurring-transaction-form/recurring-transaction-form.component';
import { EditAccountModalComponent } from '../edit-account-modal/edit-account-modal.component';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, AccountFormModalComponent, BalanceProjectionModalComponent, TransactionFormModalComponent, LoanFormModalComponent, RecurringTransactionFormComponent, EditAccountModalComponent],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit, OnDestroy {
  private transactionService = inject(TransactionService);
  private accountService = inject(AccountService);
  private loanService = inject(LoanService);
  private recurringService = inject(RecurringTransactionService);
  private categoryService = inject(CategoryService);
  private dateUtil = inject(DateUtilService);
  private router = inject(Router);
  private darkModeService = inject(DarkModeService);
  private cardStyleService = inject(CardStyleService);
  private friendsService = inject(FriendsService);
  private themeService = inject(ThemeService);
  
  // Exponer Math para el template
  Math = Math;
  
  // Responsive breakpoint detection
  currentBreakpoint = signal<'xs' | 'sm' | 'md' | 'lg' | 'xl'>('xs');
  currentWindowWidth = signal<number>(0);
  private resizeHandler: () => void = () => {};
  
  // Sistema de selección de cuentas para filtrar movimientos
  selectedAccountIds = signal<Set<string>>(new Set());
  private accountsInitialized = signal(false);
  // Modal nueva cuenta
  showAccountModal = signal(false);
  showNewAccountForm = false;
  currentStep = 1;
  totalSteps = 2;
  private originalBodyOverflow = '';

  // Form properties
  newAccount = {
    name: '',
    type: 'savings' as 'savings' | 'credit',
    balance: null as number | null,
    creditLimit: null as number | null,
    selectedCardStyle: null as any
  };

  // Card styles
  availableCardStyles = computed(() => this.cardStyleService.getAllStyles());
  // Modal proyección de balance
  isBalanceProjectionModalOpen = signal(false);
  // Modal nueva transacción
  showTransactionModal = signal(false);
  preselectedTransactionType = signal<'income' | 'expense' | 'Transferencia' | null>(null);
  preselectedEnableSharing = signal<boolean | null>(null);
  // Modal nueva transacción recurrente
  showRecurringTransactionModal = signal(false);
  // Modal nuevo préstamo
  showLoanModal = signal(false);
  preselectedLoanType = signal<'lent' | 'borrowed' | null>(null);
  // Modal pagar gasto compartido
  showPaySharedModal = signal(false);
  selectedSharedTxForPay = signal<any>(null);
  selectedAccountForPay = signal('');
  // Modal editar cuenta
  showEditAccountModal = signal(false);
  selectedAccountForEdit = signal<any>(null);
  // Menú header personalizado
  headerMenuOpen = signal(false);
  private documentClickHandler?: (e: MouseEvent) => void;

  // Menús de acciones rápidas
  quickMenuMovementsOpen = signal(false);
  quickMenuLoansOpen = signal(false);

  // Dark mode
  darkMode = this.darkModeService.darkMode;

  // Current theme index for styling
  currentThemeIndex = this.themeService.currentThemeIndex;


  // Data signals
  transactions = this.transactionService.getTransactions();
  accounts = this.accountService.getAccounts();
  loans = this.loanService.getLoans();
  pendingRecurringTransactions = this.recurringService.pendingTransactions;
  categories = this.categoryService.getCategories();
  sharedTransactions = this.friendsService.getSharedTransactions();

  constructor() {
    // Effect para inicializar cuentas seleccionadas cuando las cuentas estén disponibles
    effect(() => {
      const currentAccounts = this.accounts();
      if (currentAccounts.length > 0 && !this.accountsInitialized()) {
        // Seleccionar todas las cuentas y tarjetas por defecto
        const allAccountIds = currentAccounts.map(account => account.id);
        this.selectedAccountIds.set(new Set(allAccountIds));
        this.accountsInitialized.set(true);
      }
    });

    // Debug: log when loans signal changes to inspect payloads
    effect(() => {
      const currentLoans = this.loans();
      try {
        console.log('[DEBUG] loans signal updated - count:', currentLoans.length, currentLoans.slice(0,5));
      } catch (e) {
        console.log('[DEBUG] loans signal update - (unable to stringify)');
      }
    });
  }

  /**
   * Simple prompt-based flow to add a new category. Keeps implementation minimal:
   * asks for name and type, then delegates to CategoryService.addCategory.
   */
  openAddCategoryPrompt() {
    const name = window.prompt('Nombre de la categoría:');
    if (!name || !name.trim()) return;
    const type = window.prompt('Tipo (income / expense):', 'expense') || 'expense';
    const normalizedType = (type === 'income') ? 'income' : 'expense';
    const icon = window.prompt('Icono (emoji o texto, opcional):', '');
    const color = window.prompt('Color (hex, opcional):', '');

    this.categoryService.addCategory({ name: name.trim(), type: normalizedType as any, icon: icon || '', color: color || '' });
  }

  ngOnInit() {
    // Asegura que el contenedor de cuentas haga scroll al inicio al cargar
    setTimeout(() => {
      const row = document.querySelector('.cards-row');
      if (row && typeof row.scrollTo === 'function') {
        row.scrollTo({ left: 0, behavior: 'auto' });
      }
    }, 600);
  // set initial width and breakpoint
  this.detectBreakpoint();
  // keep a bound handler so it can be removed on destroy
  this.resizeHandler = this.detectBreakpoint.bind(this);
  window.addEventListener('resize', this.resizeHandler);
    
    // Cargar las cuentas desde la API
    this.loadInitialData();
    
    // Check for overdue loans
    this.loanService.checkOverdueLoans();
    
    // Respaldo: inicializar después de un pequeño delay
    setTimeout(() => {
      if (!this.accountsInitialized()) {
        const currentAccounts = this.accounts();
        
        if (currentAccounts.length > 0) {
          const allAccountIds = currentAccounts.map(account => account.id);
          this.selectedAccountIds.set(new Set(allAccountIds));
          this.accountsInitialized.set(true);
        }
      }
    }, 500); // Aumentar el delay para dar tiempo a cargar los datos

    // Si hay query param que pide abrir la proyección de balance, abrir la modal
    try {
      const url = new URL(window.location.href);
      const openProjection = url.searchParams.get('openProjection');
      if (openProjection === '1') {
        // small timeout to ensure modal component is available
        setTimeout(() => this.openBalanceProjectionModal(), 200);
        // limpiar param sin recargar (history API)
        url.searchParams.delete('openProjection');
        window.history.replaceState({}, '', url.toString());
      }
    } catch (e) {
      // ignore URL parsing issues
    }

    // Run a deferred sizing pass to normalize card sizes
    setTimeout(() => this.adjustCardsToMax(), 250);

    // Also run on window resize (conservative throttling)
    const resizeApply = () => {
      // quick detect then apply sizing after layout stabilizes
      setTimeout(() => this.adjustCardsToMax(), 120);
    };
    window.addEventListener('resize', resizeApply);


    // remove the extra listener on destroy
    const originalDestroy = this.ngOnDestroy.bind(this);
    this.ngOnDestroy = () => {
      try { window.removeEventListener('resize', resizeApply); } catch (e) {}
      originalDestroy();
    };
  }


  ngOnDestroy() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler, true);
    }
  }

  // Ensure all account cards adopt at least the largest measured dimensions (conservative)
  private adjustCardsToMax() {
    try {
      const cardNodes = Array.from(document.querySelectorAll('.cards-row .account-card-mini')) as HTMLElement[];
      if (!cardNodes || cardNodes.length === 0) return;

      // measure
      let maxW = 0;
      let maxH = 0;
      cardNodes.forEach(el => {
        const r = el.getBoundingClientRect();
        if (r.width > maxW) maxW = r.width;
        if (r.height > maxH) maxH = r.height;
      });

      // Apply as minimums so responsive layout still works
      cardNodes.forEach(el => {
        el.style.minWidth = maxW + 'px';
        el.style.minHeight = maxH + 'px';
      });
    } catch (e) {
      // swallow - measurement is best-effort
      // console.debug('adjustCardsToMax failed', e);
    }
  }


  /**
   * Carga los datos iniciales desde la API
   */
  private async loadInitialData() {
    try {
      // Cargar cuentas si no han sido cargadas
      if (!this.accountService.areAccountsLoaded()) {
        await this.accountService.loadAccounts();
      }
      
      // Cargar préstamos si no han sido cargados
      if (!this.loanService.areLoansLoaded()) {
        await this.loanService.loadLoans();
      }
  // Cargar transacciones y categorías desde la API para usar datos importados
  try { await this.transactionService.loadFromApi(); } catch (e) { /* ignore */ }
  try { await this.categoryService.loadFromApi(); } catch (e) { /* ignore */ }
  try { await this.friendsService.loadSharedTransactions(); } catch (e) { /* ignore */ }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }

  private detectBreakpoint() {
    const width = window.innerWidth;
    this.currentWindowWidth.set(width);
    
    if (width < 576) {
      this.currentBreakpoint.set('xs');
    } else if (width < 768) {
      this.currentBreakpoint.set('sm');
    } else if (width < 992) {
      this.currentBreakpoint.set('md');
    } else if (width < 1200) {
      this.currentBreakpoint.set('lg');
    } else {
      this.currentBreakpoint.set('xl');
    }
  }
  
  // COMPUTED PROPERTIES
  totalBalance = computed(() => {
    // Solo contar el balance de cuentas de ahorro (dinero líquido real)
    const accounts = this.accounts();
    const savingsAccounts = accounts.filter(account => account.type === 'savings');
    const total = savingsAccounts.reduce((total, account) => total + account.balance, 0);
    
    return total;
  });

  monthlyIncome = computed(() => {
    const selectedIds = this.selectedAccountIds();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    if (selectedIds.size === 0) {
      return 0;
    }
    
    const income = this.transactions()
      .filter(t => 
        t.type === 'income' && 
        selectedIds.has(t.accountId) &&
        t.date.getMonth() === currentMonth && 
        t.date.getFullYear() === currentYear
      )
      .reduce((total, t) => total + t.amount, 0);
    
    return income;
  });
  
  monthlyExpenses = computed(() => {
    const selectedIds = this.selectedAccountIds();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    if (selectedIds.size === 0) {
      return 0;
    }
    
    const expenses = this.transactions()
      .filter(t => 
        t.type === 'expense' && 
        selectedIds.has(t.accountId) &&
        t.date.getMonth() === currentMonth && 
        t.date.getFullYear() === currentYear
      )
      .reduce((total, t) => total + t.amount, 0);
    
    return expenses;
  });

  // Computed para préstamos
  // Compute totals directly from loans signal to ensure correctness
  totalLent = computed(() => {
    const loans = this.loanService.getLoans()();
    const filtered = loans.filter(l => l.type === 'lent' && (l.status === 'pending' || l.status === 'overdue'));
    const sum = filtered.reduce((sumAcc, l) => {
      if (l.installments?.enabled) {
        const instSum = (l.installments.installmentsList || [])
          .filter(inst => inst.status === 'pending' || inst.status === 'overdue' || inst.status === 'partial')
          .reduce((s, inst) => {
            if (inst.status === 'partial') {
              const remaining = Number(inst.amount || 0) - Number(inst.partialAmountPaid || 0);
              return s + (remaining > 0 ? remaining : 0);
            }
            return s + Number(inst.amount || 0);
          }, 0);
        return sumAcc + (isNaN(instSum) ? 0 : instSum);
      }
      const amt = Number(l.amount || 0);
      return sumAcc + (isNaN(amt) ? 0 : amt);
    }, 0);

  // Debug output to inspect why totals may be zero
  console.log('[DEBUG] totalLent computed -> loansFilteredCount:', filtered.length, 'sum:', sum);
  if (filtered.length > 0) console.log('[DEBUG] totalLent details:', filtered.slice(0, 10));

    return sum;
  });

  totalBorrowed = computed(() => {
    const loans = this.loanService.getLoans()();
    const filtered = loans.filter(l => l.type === 'borrowed' && (l.status === 'pending' || l.status === 'overdue'));
    const sum = filtered.reduce((sumAcc, l) => {
      if (l.installments?.enabled) {
        const instSum = (l.installments.installmentsList || [])
          .filter(inst => inst.status === 'pending' || inst.status === 'overdue')
          .reduce((s, inst) => s + Number(inst.amount || 0), 0);
        return sumAcc + (isNaN(instSum) ? 0 : instSum);
      }
      const amt = Number(l.amount || 0);
      return sumAcc + (isNaN(amt) ? 0 : amt);
    }, 0);

  // Debug output to inspect why totals may be zero
  console.log('[DEBUG] totalBorrowed computed -> loansFilteredCount:', filtered.length, 'sum:', sum);
  if (filtered.length > 0) console.log('[DEBUG] totalBorrowed details:', filtered.slice(0, 10));

    return sum;
  });
  
  recentTransactions = computed(() => {
    const selectedIds = this.selectedAccountIds();
    const allTransactions = this.transactions();
    
    if (selectedIds.size === 0) {
      return [];
    }
    
    const categoriesList = this.categories();
    const filteredTransactions = allTransactions
      .filter(transaction => selectedIds.has(transaction.accountId))
      // sort by date descending (newest first)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(transaction => {
        // Resolve category name safely (support legacy category ids via mapOldCategoryId)
        const originalCategoryId = transaction.categoryId || 'no-category';
        const mappedCategoryId = this.mapOldCategoryId(originalCategoryId);
        const category = categoriesList.find(c => c.id === mappedCategoryId);
        let categoryName = category?.name || transaction.categoryId || 'Sin categoría';
        
        // Caso especial para Transferenciaencias
        if (mappedCategoryId === 'Transferencia') {
          categoryName = 'Transferenciaencia';
        }

        return {
          ...transaction,
          account: this.accountService.getAccountById(transaction.accountId),
          categoryName
        };
      });

    return filteredTransactions;
  });

  // Pagination for Movimientos
  currentPage = signal(1);
  pageSize = signal(5);

  // All filtered transactions (no slice) used to compute pagination
  filteredTransactions = computed(() => {
    const selectedIds = this.selectedAccountIds();
    const allTransactions = this.transactions();

    if (selectedIds.size === 0) {
      return [];
    }

    const categoriesList = this.categories();
    const filtered = allTransactions
      .filter(transaction => selectedIds.has(transaction.accountId) || transaction.accountId === '')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(transaction => {
        const originalCategoryId = transaction.categoryId || 'no-category';
        const mappedCategoryId = this.mapOldCategoryId(originalCategoryId);
        const category = categoriesList.find(c => c.id === mappedCategoryId);
        let categoryName = category?.name || transaction.categoryId || 'Sin categoría';

        if (mappedCategoryId === 'Transferencia') {
          categoryName = 'Transferenciaencia';
        }

        // Clean description by removing shared info
        let description = transaction.description;
        let friendName: string | null = null;
        if (description.includes('(Compartido con:')) {
          const match = description.match(/\(Compartido con: ([^)]+)\)/);
          friendName = match ? match[1] : null;
          description = description.replace(/\s*\(Compartido con: [^)]+\)\s*/, '').trim();
        } else if (transaction.referenceId) {
          // For payment or approval transactions, find the shared transaction
          const sharedOwed = this.sharedTransactions().owed.find(st => st.id === transaction.referenceId);
          if (sharedOwed) {
            friendName = sharedOwed.creator_name || null;
          } else {
            const sharedOwing = this.sharedTransactions().owing.find(st => st.paid_transaction_id === transaction.referenceId);
            if (sharedOwing) {
              friendName = sharedOwing.friend_name || null;
            }
          }
        }

        return {
          ...transaction,
          account: this.accountService.getAccountById(transaction.accountId),
          categoryName,
          description,
          friendName
        };
      });

    return filtered;
  });

  totalPages = computed(() => {
    const total = Math.max(1, Math.ceil(this.filteredTransactions().length / this.pageSize()));
    return total;
  });

  allMovements = computed(() => {
    const regular = this.filteredTransactions();
    const sharedOwed = this.sharedTransactions().owed.map(tx => {
      let description = tx.description.replace(/\s*\(Compartido con: [^)]+\)\s*/gi, '').trim();
      return {
        id: 'shared-' + tx.id,
        type: 'shared-expense',
        amount: -Number(tx.amount_owed),
        description: description,
        date: new Date(), // Use current date so pending shared expenses appear at the top
        categoryId: 'shared',
        categoryName: 'Gasto Compartido',
        accountId: '',
        account: undefined,
        friendName: tx.creator_name,
        sharedTx: tx
      };
    });
    const pendingApprovals = this.sharedTransactions().owing.filter(tx => tx.status === 'paid' && !tx.approved).map(tx => {
      let description = tx.description.replace(/\s*\(Compartido con: [^)]+\)\s*/gi, '').trim();
      return {
        id: 'approval-' + tx.id,
        type: 'pending-approval',
        amount: Number(tx.amount_owed),
        description: description,
        date: new Date(tx.paid_at || tx.date),
        categoryId: 'shared',
        categoryName: 'Pago Pendiente',
        accountId: '',
        account: undefined,
        friendName: tx.friend_name,
        sharedTx: tx
      };
    });
    const result = [...regular, ...sharedOwed, ...pendingApprovals].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    console.log('allMovements:', result);
    return result;
  });

  pagedTransactions = computed(() => {
    const page = Math.max(1, this.currentPage());
    const size = Math.max(1, this.pageSize());
    const start = (page - 1) * size;
    const end = start + size;
    return this.allMovements().slice(start, end);
  });

  prevPage() {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  goToPage(n: number) {
    const t = this.totalPages();
    const target = Math.min(Math.max(1, n), t);
    this.currentPage.set(target);
  }

  // Keep current page in-range when data changes
  private _pageRangeEffect = effect(() => {
    const tp = this.totalPages();
    if (this.currentPage() > tp) this.currentPage.set(tp);
    if (this.currentPage() < 1) this.currentPage.set(1);
  });

  // Mapeo de IDs antiguos a nuevos para compatibilidad
  private mapOldCategoryId(oldId: string): string {
    const categoryMappings: Record<string, string> = {
      'shopping': '2xorfi11ac9mexafj7p',        // Compras
      'food': '7fggbae2stumexafj7o',            // Alimentación
      'transport': 'a01ewd8rtm7mexafj7p',       // Transporte
      'entertainment': 'bn1ijusx8vamexafj7p',   // Entretenimiento
      'health': '7axfk5z1fl9mexafj7p',          // Salud
      'education': 'kdm7jcoiglmexafj7p',        // Educación
      'services': 'wcyzjrmwstmexafj7p',         // Servicios
      'salary': 'b9xga9zlpbkmexafj7q',          // Sueldo
      'freelance': 'f71c6um0jirmexafj7q',       // Freelance
      'investments': '244vxgysr1gmexafj7q',     // Inversiones
      'other-income': 'j666tsrnwrlmexafj7q'     // Otros Ingresos
    };
    
    return categoryMappings[oldId] || oldId;
  }

  categoryExpenses = computed(() => {
    const selectedIds = this.selectedAccountIds();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const categoriesList = this.categories();

    if (selectedIds.size === 0) {
      return [];
    }

    // Obtener todas las transacciones del mes actual (gastos e ingresos)
    const monthlyTransactions = this.transactions()
      .filter(t =>
        (t.type === 'expense' || t.type === 'income') &&
        selectedIds.has(t.accountId) &&
        t.date.getMonth() === currentMonth &&
        t.date.getFullYear() === currentYear
      );

    // Agrupar por categoría y calcular el neto (gastos positivos, ingresos negativos)
    const categoryMap = new Map<string, { netAmount: number, expenseCount: number, incomeCount: number, name: string }>();

    monthlyTransactions.forEach(transaction => {
      const originalCategoryId = transaction.categoryId || 'no-category';
      const mappedCategoryId = this.mapOldCategoryId(originalCategoryId);
      const categoryId = mappedCategoryId;

      // Buscar la categoría directamente en la lista de categorías
      const category = categoriesList.find(c => c.id === categoryId);
      let categoryName = category?.name || 'Sin categoría';

      // Caso especial para Transferenciaencias
      if (categoryId === 'Transferencia') {
        categoryName = 'Transferenciaencia';
      }

      if (categoryMap.has(categoryId)) {
        const existing = categoryMap.get(categoryId)!;
        if (transaction.type === 'expense') {
          existing.netAmount += transaction.amount;
          existing.expenseCount += 1;
        } else if (transaction.type === 'income') {
          existing.netAmount -= transaction.amount; // Restar ingresos del total de gastos
          existing.incomeCount += 1;
        }
      } else {
        const initialAmount = transaction.type === 'expense' ? transaction.amount : -transaction.amount;
        categoryMap.set(categoryId, {
          netAmount: initialAmount,
          expenseCount: transaction.type === 'expense' ? 1 : 0,
          incomeCount: transaction.type === 'income' ? 1 : 0,
          name: categoryName
        });
      }
    });

    // Convertir a array, filtrar solo categorías con gastos netos positivos, y ordenar por monto (mayor a menor)
    return Array.from(categoryMap.entries())
      .filter(([_, data]) => data.netAmount > 0) // Solo mostrar categorías con gastos netos
      .map(([categoryId, data]) => ({
        categoryId,
        categoryName: data.name,
        amount: data.netAmount,
        transactionCount: data.expenseCount + data.incomeCount
      }))
      .sort((a, b) => b.amount - a.amount);
  });

  // Últimos préstamos (los 5 más recientes)
  recentLoans = computed(() => {
    return this.loans()
      .sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime())
      .slice(0, 5);
  });

  // Préstamos y cuotas próximos a vencer o ya vencidos
  upcomingLoans = computed(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    
    const upcomingItems: Array<{
      id: string;
      personName: string;
      amount: number;
      dueDate: Date;
      type: 'lent' | 'borrowed';
      isOverdue: boolean;
      isInstallment: boolean;
      installmentNumber?: number;
      totalInstallments?: number;
      parentLoanId?: string;
    }> = [];

    this.loans().forEach(loan => {
      // Solo considerar préstamos pendientes o vencidos
      if (loan.status !== 'pending' && loan.status !== 'overdue') return;

      // Si el préstamo tiene cuotas, procesar cada cuota
      if (loan.installments?.enabled && loan.installments.installmentsList) {
        loan.installments.installmentsList.forEach(installment => {
          // Solo cuotas pendientes o vencidas
          if (installment.status !== 'pending' && installment.status !== 'overdue') return;
          
          const installmentDueDate = new Date(installment.dueDate);
          const isOverdue = installmentDueDate < today;
          const isToday = installmentDueDate.toDateString() === today.toDateString();
          const isUpcoming = installmentDueDate <= thirtyDaysFromNow;

          // Incluir si está vencida, vence hoy, O si vence en los próximos 30 días
          if (isOverdue || isToday || isUpcoming) {
            upcomingItems.push({
              id: installment.id,
              personName: loan.personName,
              amount: installment.amount,
              dueDate: installmentDueDate,
              type: loan.type,
              isOverdue: isOverdue || isToday,
              isInstallment: true,
              installmentNumber: installment.installmentNumber,
              totalInstallments: loan.installments?.totalInstallments || 0,
              parentLoanId: loan.id
            });
          }
        });
      } else {
        // Préstamo sin cuotas - procesarlo completo
        if (loan.dueDate) {
          const loanDueDate = new Date(loan.dueDate);
          const isOverdue = loanDueDate < today;
          const isToday = loanDueDate.toDateString() === today.toDateString();
          const isUpcoming = loanDueDate <= thirtyDaysFromNow;

          // Incluir si está vencido, vence hoy, O si vence en los próximos 30 días
          if (isOverdue || isToday || isUpcoming) {
            upcomingItems.push({
              id: loan.id,
              personName: loan.personName,
              amount: loan.amount,
              dueDate: loanDueDate,
              type: loan.type,
              isOverdue: isOverdue || isToday,
              isInstallment: false
            });
          }
        }
      }
    });

    // Ordenar: primero los vencidos (más antiguos primero), luego los próximos a vencer (más próximos primero)
    return upcomingItems
      .sort((a, b) => {
        // Si ambos están vencidos o ambos no están vencidos, ordenar por fecha
        if (a.isOverdue === b.isOverdue) {
          return a.dueDate.getTime() - b.dueDate.getTime();
        }
        // Los vencidos van primero
        return a.isOverdue ? -1 : 1;
      })
      .slice(0, 5);
  });

  // UTILITY METHODS
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  }

  formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return this.dateUtil.formatForDisplay(d);
  }

  getCurrentMonthName(): string {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return monthNames[new Date().getMonth()];
  }

  getCategoryPercentage(categoryAmount: number): number {
    const totalExpenses = this.monthlyExpenses();
    return totalExpenses > 0 ? (categoryAmount / totalExpenses) * 100 : 0;
  }

  getCategoryColor(categoryId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
      '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
      '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D2B4DE'
    ];
    
    // Usar el hash del categoryId para obtener un color consistente
    let hash = 0;
    for (let i = 0; i < categoryId.length; i++) {
      const char = categoryId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return colors[Math.abs(hash) % colors.length];
  }

  getDaysUntilDue(dueDate: Date): number {
    const today = new Date();
    const due = new Date(dueDate);
    const timeDifference = due.getTime() - today.getTime();
    const daysDifference = Math.ceil(timeDifference / (1000 * 3600 * 24));
    return daysDifference;
  }

  getSharedFriend(description: string): string | null {
    const match = description.match(/\(Compartido con: ([^)]+)\)/);
    return match ? match[1] : null;
  }

  getFriendName(transaction: any): string {
    return transaction.friendName || transaction.sharedTx?.friend_name || transaction.sharedTx?.creator_name || '';
  }

  toggleAccountSelection(accountId: string) {
    this.selectedAccountIds.update(currentIds => {
      const newIds = new Set(currentIds);
      if (newIds.has(accountId)) {
        newIds.delete(accountId);
      } else {
        newIds.add(accountId);
      }
      return newIds;
    });
  }


  private preventBodyScroll() {
    // Store original overflow
    this.originalBodyOverflow = document.body.style.overflow || '';

    // Prevent body scroll by setting overflow hidden
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = '0px'; // Prevent layout shift

    // Also prevent scroll on html element
    document.documentElement.style.overflow = 'hidden';
  }

  cancelNewAccount() {
    this.showNewAccountForm = false;
    this.resetNewAccountForm();
    this.restoreBodyScroll();
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  selectCardStyle(style: any) {
    this.newAccount.selectedCardStyle = style;
  }

  private restoreBodyScroll() {
    document.body.style.overflow = this.originalBodyOverflow;
    document.documentElement.style.overflow = '';
  }

  saveNewAccount() {
    if (!this.newAccount.name.trim()) {
      alert('El nombre de la cuenta es requerido');
      return;
    }

    if (this.newAccount.type === 'credit' && (this.newAccount.creditLimit === null || this.newAccount.creditLimit <= 0)) {
      alert('El límite de crédito debe ser mayor a 0');
      return;
    }

    // Simple account creation
    const accountData = {
      name: this.newAccount.name,
      type: this.newAccount.type,
      balance: this.newAccount.balance || 0,
      creditLimit: this.newAccount.type === 'credit' ? this.newAccount.creditLimit || 0 : undefined,
      cardStyle: this.newAccount.selectedCardStyle ? {
        gradient: this.newAccount.selectedCardStyle.gradient,
        cardType: this.newAccount.selectedCardStyle.cardType,
        bank: this.newAccount.selectedCardStyle.bank
      } : undefined
    };

    this.accountService.addAccount(accountData as any);
    this.showNewAccountForm = false;
    this.resetNewAccountForm();
    this.restoreBodyScroll();
    alert('Cuenta agregada exitosamente');
  }

  private resetNewAccountForm() {
    this.newAccount = {
      name: '',
      type: 'savings',
      balance: null,
      creditLimit: null,
      selectedCardStyle: this.availableCardStyles()[0] || null
    };
    this.currentStep = 1;
  }

  // Abrir modal de proyección de balance
  openBalanceProjectionModal(): void {
    this.isBalanceProjectionModalOpen.set(true);
  }

  closeBalanceProjectionModal(): void {
    this.isBalanceProjectionModalOpen.set(false);
  }

  onDashboardAccountCreated(account: any) {
    // Asegurar que la nueva cuenta quede seleccionada para métricas
    this.selectedAccountIds.update(set => {
      const newSet = new Set(set);
      newSet.add(String(account.id));
      return newSet;
    });
  }

  getCardGradient(account: any, index: number) {
    if (account && account.cardStyle && typeof account.cardStyle.gradient === 'string' && account.cardStyle.gradient.trim() !== '') {
      return account.cardStyle.gradient;
    }
    
    // Gradientes usando nuestra nueva paleta de colores
    const gradients = [
      'linear-gradient(135deg, var(--color-prussian-blue) 0%, var(--color-prussian-blue-light) 100%)',
      'linear-gradient(135deg, var(--color-columbia-blue) 0%, var(--color-columbia-blue-light) 100%)',
      'linear-gradient(135deg, var(--color-bittersweet) 0%, var(--color-bittersweet-light) 100%)',
      'linear-gradient(135deg, var(--color-prussian-blue-dark) 0%, var(--color-prussian-blue) 100%)',
      'linear-gradient(135deg, var(--color-bittersweet-dark) 0%, var(--color-bittersweet) 100%)'
    ];
    return gradients[index % gradients.length];
  }

  getTransactionCardGradient(transaction: any) {
    const account = transaction?.account;
    if (!account) {
      return 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'; // default grey
    }

    if (account.cardStyle && typeof account.cardStyle.gradient === 'string' && account.cardStyle.gradient.trim() !== '') {
      return account.cardStyle.gradient;
    }

    // Gradientes usando nuestra nueva paleta de colores
    const gradients = [
      'linear-gradient(135deg, var(--color-prussian-blue) 0%, var(--color-prussian-blue-light) 100%)',
      'linear-gradient(135deg, var(--color-columbia-blue) 0%, var(--color-columbia-blue-light) 100%)',
      'linear-gradient(135deg, var(--color-bittersweet) 0%, var(--color-bittersweet-light) 100%)',
      'linear-gradient(135deg, var(--color-prussian-blue-dark) 0%, var(--color-prussian-blue) 100%)',
      'linear-gradient(135deg, var(--color-bittersweet-dark) 0%, var(--color-bittersweet) 100%)'
    ];

    // Use a hash of the account id for consistent assignment
    const hash = (account.id || '').split('').reduce((a: number, b: string) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    return gradients[Math.abs(hash) % gradients.length];
  }

  getCardTextColor(account: any, index: number): string {
    const gradient = this.getCardGradient(account, index);
    // Safety: ensure gradient is a string before using includes
    if (!gradient || typeof gradient !== 'string') {
      return 'white';
    }
    // Si es el gradiente Columbia Blue, usar Prussian Blue para el texto
    if (gradient.includes('var(--color-columbia-blue)')) {
      return 'var(--color-prussian-blue-dark)';
    }
    // Para otros gradientes, usar texto blanco
    return 'white';
  }

  getCardTextClass(account: any, index: number): string {
    const gradient = this.getCardGradient(account, index);
    // Safety: ensure gradient is a string before using includes
    if (!gradient || typeof gradient !== 'string') {
      return 'text-white';
    }
    // Si es el gradiente Columbia Blue, no usar text-white
    if (gradient.includes('var(--color-columbia-blue)')) {
      return '';
    }
    // Para otros gradientes, usar text-white
    return 'text-white';
  }

  // HEADER MENU METHODS
  toggleHeaderMenu(event: MouseEvent) {
    event.stopPropagation();
    const willOpen = !this.headerMenuOpen();
    this.headerMenuOpen.set(willOpen);
    if (willOpen) {
      // registrar listener global para cerrar al hacer click afuera o Escape
      this.registerOutsideClick();
    }
  }

  closeHeaderMenu() {
    if (this.headerMenuOpen()) {
      this.headerMenuOpen.set(false);
    }
  }

  private registerOutsideClick() {
    if (this.documentClickHandler) return;
    this.documentClickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.header-menu-custom')) {
        this.closeHeaderMenu();
        // limpiar listener
        if (this.documentClickHandler) {
          document.removeEventListener('click', this.documentClickHandler, true);
          this.documentClickHandler = undefined;
        }
      }
    };
    document.addEventListener('click', this.documentClickHandler, true);

    // Listener de escape
    const keyHandler = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        this.closeHeaderMenu();
        window.removeEventListener('keydown', keyHandler, true);
      }
    };
    window.addEventListener('keydown', keyHandler, true);
  }

  // METHODS FOR QUICK ACTIONS
  createIncome() {
    this.preselectedTransactionType.set('income');
    this.showTransactionModal.set(true);
  }

  createExpense() {
    this.preselectedTransactionType.set('expense');
    this.showTransactionModal.set(true);
  }

  createTransferencia() {
    this.preselectedTransactionType.set('Transferencia');
    this.showTransactionModal.set(true);
  }

  createSharedExpense() {
    this.preselectedTransactionType.set('expense');
    this.preselectedEnableSharing.set(true);
    this.showTransactionModal.set(true);
  }

  createRecurringTransaction() {
    this.showRecurringTransactionModal.set(true);
  }

  createLentLoan() {
    this.preselectedLoanType.set('lent');
    this.showLoanModal.set(true);
  }

  createBorrowedLoan() {
    this.preselectedLoanType.set('borrowed');
    this.showLoanModal.set(true);
  }

  toggleQuickMenu(type: 'movements' | 'loans', event: MouseEvent) {
    event.stopPropagation();
    if (type === 'movements') {
      const willOpen = !this.quickMenuMovementsOpen();
      this.quickMenuMovementsOpen.set(willOpen);
      if (willOpen) {
        this.quickMenuLoansOpen.set(false);
        this.registerOutsideQuickMenus();
      }
    } else {
      const willOpen = !this.quickMenuLoansOpen();
      this.quickMenuLoansOpen.set(willOpen);
      if (willOpen) {
        this.quickMenuMovementsOpen.set(false);
        this.registerOutsideQuickMenus();
      }
    }
  }

  closeQuickMenus() {
    if (this.quickMenuMovementsOpen() || this.quickMenuLoansOpen()) {
      this.quickMenuMovementsOpen.set(false);
      this.quickMenuLoansOpen.set(false);
    }
  }

  private registerOutsideQuickMenus() {
    if (this.documentClickHandler) return;
    this.documentClickHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.quick-menu-wrapper') && !target.closest('.menu-btn-circle')) {
        this.closeQuickMenus();
        this.closeHeaderMenu();
        if (this.documentClickHandler) {
          document.removeEventListener('click', this.documentClickHandler, true);
          this.documentClickHandler = undefined;
        }
      }
    };
    document.addEventListener('click', this.documentClickHandler, true);
  }

  // MODAL MANAGEMENT METHODS
  closeTransactionModal() {
    this.showTransactionModal.set(false);
    this.preselectedTransactionType.set(null);
  }

  closeRecurringTransactionModal() {
    this.showRecurringTransactionModal.set(false);
  }

  closeLoanModal() {
    this.showLoanModal.set(false);
    this.preselectedLoanType.set(null);
  }

  paySharedTransaction(tx: any) {
    this.selectedSharedTxForPay.set(tx);
    this.selectedAccountForPay.set(this.accounts()[0]?.id || '');
    this.showPaySharedModal.set(true);
  }

  closePaySharedModal() {
    this.showPaySharedModal.set(false);
    this.selectedSharedTxForPay.set(null);
    this.selectedAccountForPay.set('');
  }

  selectAccountForPay(accountId: string) {
    this.selectedAccountForPay.set(accountId);
  }

  async confirmPaySharedTransaction() {
    const tx = this.selectedSharedTxForPay();
    const accountId = this.selectedAccountForPay();
    if (!tx || !accountId) return;

    try {
      await this.friendsService.paySharedTransaction(tx.id, accountId);
      this.closePaySharedModal();
      alert('Pago realizado exitosamente');
    } catch (error: any) {
      alert(error.message || 'Error al realizar el pago');
    }
  }

  async approveSharedTransaction(tx: any) {
    try {
      await this.friendsService.approveSharedTransaction(tx.id);
      alert('Pago aprobado exitosamente');
    } catch (error: any) {
      alert(error.message || 'Error al aprobar el pago');
    }
  }

  async deleteTransaction(transaction: any) {
    if (!confirm(`¿Estás seguro de que quieres eliminar el movimiento "${transaction.description}"?`)) {
      return;
    }

    try {
      await this.transactionService.deleteTransaction(transaction.id);
      alert('Movimiento eliminado exitosamente');
      // Reload data to reflect changes
      await this.loadInitialData();
      // Also reload accounts to update balances
      await this.accountService.loadAccounts();
    } catch (error: any) {
      alert(error.message || 'Error al eliminar el movimiento');
    }
  }

  onTransactionAdded() {
    this.closeTransactionModal();
    // Los datos se actualizan automáticamente a través de los servicios
  }

  onRecurringTransactionAdded() {
    this.closeRecurringTransactionModal();
    // Los datos se actualizan automáticamente a través de los servicios
  }

  onLoanAdded() {
    this.closeLoanModal();
    // Los datos se actualizan automáticamente a través de los servicios
  }

  closeAccountModal() {
    this.showAccountModal.set(false);
  }

  openNewAccountForm() {
    this.showAccountModal.set(true);
  }

  editAccount(account: any) {
    console.log('[DEBUG] dashboard.editAccount -> opening edit modal for account:', account);
    this.selectedAccountForEdit.set(account);
    this.showEditAccountModal.set(true);
  }

  closeEditAccountModal() {
    this.showEditAccountModal.set(false);
    this.selectedAccountForEdit.set(null);
  }

  onAccountEdited(updatedAccount: any) {
    // The account service will automatically update the signals
    // We might want to show a success message or handle any additional logic
    console.log('Account updated:', updatedAccount);
  }
}
