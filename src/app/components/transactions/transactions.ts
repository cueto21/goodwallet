import { Component, inject, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TransactionService } from '../../services/transaction';
import { AccountService } from '../../services/account';

@Component({
  selector: 'app-transactions',
  imports: [CommonModule, FormsModule],
  templateUrl: './transactions.html',
  styleUrl: './transactions.scss',
  encapsulation: ViewEncapsulation.None
})
export class TransactionsComponent {
  private transactionService = inject(TransactionService);
  private accountService = inject(AccountService);
  private route = inject(ActivatedRoute);
  
  // Propiedades para el formulario de nueva transacción
  showNewTransactionForm = false;
  newTransaction = {
    description: '',
    amount: 0,
    type: 'expense' as 'income' | 'expense',
    accountId: '',
    categoryId: '1'
  };
  
  // Propiedades para editar transacción
  showEditTransactionForm = false;
  editingTransactionId = '';
  editTransaction_form = {
    description: '',
    amount: 0,
    type: 'expense' as 'income' | 'expense',
    accountId: '',
    categoryId: ''
  };
  
  transactions = computed(() => {
    const allTransactions = this.transactionService.getTransactions()();
    return allTransactions.map((transaction: any) => ({
      ...transaction,
      account: this.accountService.getAccountById(transaction.accountId)
    }));
  });

  accounts = computed(() => {
    return this.accountService.getAccounts()();
  });

  filteredTransactions = computed(() => {
    const accountFilter = this.route.snapshot.queryParams['account'];
    if (accountFilter) {
      return this.transactions().filter((t: any) => t.accountId === accountFilter);
    }
    return this.transactions();
  });

  // Métodos para nueva transacción
  openNewTransactionForm() {
    this.showNewTransactionForm = true;
    this.resetNewTransactionForm();
  }

  cancelNewTransaction() {
    this.showNewTransactionForm = false;
    this.resetNewTransactionForm();
  }

  saveNewTransaction() {
    if (this.validateNewTransaction()) {
      this.transactionService.addTransaction({
        description: this.newTransaction.description,
        amount: this.newTransaction.amount,
        type: this.newTransaction.type,
        accountId: this.newTransaction.accountId,
        categoryId: this.newTransaction.categoryId,
        date: new Date()
      });
      
      // Actualizar el balance de la cuenta
      this.accountService.updateAccountBalance(this.newTransaction.accountId, this.newTransaction.amount, this.newTransaction.type);
      
      this.showNewTransactionForm = false;
      this.resetNewTransactionForm();
      alert('Transacción agregada exitosamente');
    }
  }

  private resetNewTransactionForm() {
    this.newTransaction = {
      description: '',
      amount: 0,
      type: 'expense',
      accountId: this.accounts().length > 0 ? this.accounts()[0].id : '',
      categoryId: '1'
    };
  }

  private validateNewTransaction(): boolean {
    if (!this.newTransaction.description.trim()) {
      alert('La descripción es requerida');
      return false;
    }
    if (this.newTransaction.amount <= 0) {
      alert('El monto debe ser mayor a 0');
      return false;
    }
    if (!this.newTransaction.accountId) {
      alert('Debe seleccionar una cuenta');
      return false;
    }
    return true;
  }

  // Métodos para editar transacción
  editTransaction(transactionId: string) {
    const transaction = this.transactions().find((t: any) => t.id === transactionId);
    if (transaction) {
      this.editingTransactionId = transactionId;
      this.editTransaction_form = {
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId
      };
      this.showEditTransactionForm = true;
    }
  }

  cancelEditTransaction() {
    this.showEditTransactionForm = false;
    this.editingTransactionId = '';
  }

  saveEditTransaction() {
    if (this.validateEditTransaction()) {
      // Obtener la transacción original para revertir su efecto en el balance
      const originalTransaction = this.transactions().find((t: any) => t.id === this.editingTransactionId);
      
      if (originalTransaction) {
        // Revertir el efecto de la transacción original en el balance
        const revertType = originalTransaction.type === 'income' ? 'expense' : 'income';
        this.accountService.updateAccountBalance(originalTransaction.accountId, originalTransaction.amount, revertType);
        
        // Aplicar el nuevo efecto de la transacción editada
        this.accountService.updateAccountBalance(this.editTransaction_form.accountId, this.editTransaction_form.amount, this.editTransaction_form.type);
      }
      
      this.transactionService.updateTransaction(this.editingTransactionId, {
        description: this.editTransaction_form.description,
        amount: this.editTransaction_form.amount,
        type: this.editTransaction_form.type,
        accountId: this.editTransaction_form.accountId,
        categoryId: this.editTransaction_form.categoryId
      });
      
      this.showEditTransactionForm = false;
      this.editingTransactionId = '';
      alert('Transacción actualizada exitosamente');
    }
  }

  private validateEditTransaction(): boolean {
    if (!this.editTransaction_form.description.trim()) {
      alert('La descripción es requerida');
      return false;
    }
    if (this.editTransaction_form.amount <= 0) {
      alert('El monto debe ser mayor a 0');
      return false;
    }
    if (!this.editTransaction_form.accountId) {
      alert('Debe seleccionar una cuenta');
      return false;
    }
    return true;
  }

  deleteTransaction(transactionId: string) {
    const transaction = this.transactions().find((t: any) => t.id === transactionId);
    if (transaction) {
      const confirmDelete = confirm(`¿Estás seguro que deseas eliminar la transacción "${transaction.description}" por S/ ${transaction.amount}?`);
      if (confirmDelete) {
        // Revertir el efecto de la transacción en el balance
        const revertType = transaction.type === 'income' ? 'expense' : 'income';
        this.accountService.updateAccountBalance(transaction.accountId, transaction.amount, revertType);
        
        // Llamar al servicio para eliminar la transacción
        this.transactionService.deleteTransaction(transactionId);
        
        // Mostrar mensaje de éxito
        alert('Transacción eliminada exitosamente');
      }
    }
  }

  private deleteTransactionFromService(transactionId: string) {
    // Este método ya no es necesario, se reemplazó con la llamada directa al servicio
  }

  getTransactionCardGradient(transaction: any) {
    const account = transaction.account;
    if (!account) {
      return 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'; // Gris por defecto
    }
    if (account.cardStyle && typeof account.cardStyle.gradient === 'string' && account.cardStyle.gradient.trim() !== '') {
      return account.cardStyle.gradient;
    }
    
    // Fallback usando el ID de la cuenta para consistencia
    const gradients = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
    ];
    
    // Usar hash del ID para obtener índice consistente
  const idStr = account.id !== undefined && account.id !== null ? String(account.id) : '';
  const hash = idStr.split('').reduce((a: number, b: string) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return gradients[Math.abs(hash) % gradients.length];
  }
}
