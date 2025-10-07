import { Injectable, signal, inject, computed } from '@angular/core';
import { Account, CardStyle, AccountGoals } from '../models/account.interface';
import { CardStyleService } from './card-style.service';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private accounts = signal<Account[]>([]);
  private cardStyleService = inject(CardStyleService);
  private isLoaded = signal(false);

  // Computed para obtener metas totales
  totalBalanceGoal = computed(() => {
    return this.accounts()
      .filter(account => account.type === 'savings' && account.goals?.isActive && account.goals?.balanceTarget)
      .reduce((total, account) => total + (account.goals?.balanceTarget || 0), 0);
  });

  totalSpendingLimit = computed(() => {
    return this.accounts()
      .filter(account => account.type === 'credit' && account.goals?.isActive && account.goals?.spendingLimit)
      .reduce((total, account) => total + (account.goals?.spendingLimit || 0), 0);
  });

  constructor() {
    // Los datos se cargarán cuando se llame a loadAccounts()
  }

  /**
   * Carga las cuentas desde la API
   */
  async loadAccounts(): Promise<void> {
    console.log('🔍 AccountService: loadAccounts() called');
    try {
      console.log('📡 AccountService: Fetching accounts from API...');
      const accountsData = await ApiService.get('/accounts');
      console.log('📡 AccountService: Raw API response:', accountsData);
      console.log('📡 AccountService: Response type:', typeof accountsData);
      console.log('📡 AccountService: Is array?:', Array.isArray(accountsData));
      console.log('📡 AccountService: Response length:', accountsData?.length);
      
      // Use the data from API directly
      let dataToProcess = accountsData;
      if (!accountsData || (Array.isArray(accountsData) && accountsData.length === 0)) {
        console.warn('⚠️ AccountService: No accounts from API');
        dataToProcess = [];
      }
      
      const normalized = (dataToProcess || [])
        .filter((a: any) => {
          const isValid = a && typeof a === 'object';
          if (!isValid) {
            console.warn('⚠️ AccountService: Filtering out invalid account:', a);
          }
          return isValid;
        })
        .map((a: any, index: number) => {
          console.log(`🔄 AccountService: Processing account ${index}:`, a);
          const acc: any = { ...a };
          
          // Ensure id is a string for consistent comparisons in the UI
          if (acc.id !== undefined && acc.id !== null) {
            acc.id = String(acc.id);
          } else {
            acc.id = '';
            console.warn(`⚠️ AccountService: Account ${index} has no ID`);
          }

          // Normalize numeric fields
          acc.balance = acc.balance !== undefined && acc.balance !== null ? Number(acc.balance) || 0 : 0;
          if (acc.creditLimit !== undefined && acc.creditLimit !== null && acc.creditLimit !== '') {
            const n = Number(acc.creditLimit);
            acc.creditLimit = Number.isFinite(n) ? n : null;
          } else {
            acc.creditLimit = null;
          }

          // Ensure required fields exist
          acc.name = acc.name || 'Cuenta sin nombre';
          acc.type = acc.type || 'savings';

          // Ensure card style objects exist
          if (!acc.cardStyle || typeof acc.cardStyle !== 'object') acc.cardStyle = {};
          if (!acc.selectedCardStyle || typeof acc.selectedCardStyle !== 'object') acc.selectedCardStyle = {};

          console.log(`✅ AccountService: Normalized account ${index}:`, acc);
          return acc as Account;
        })
        .filter((acc: Account) => {
          const hasId = !!acc.id;
          if (!hasId) {
            console.warn('⚠️ AccountService: Filtering out account without ID:', acc);
          }
          return hasId;
        });
      
      console.log('📊 AccountService: Final normalized accounts:', normalized);
      console.log('📊 AccountService: Setting accounts count:', normalized.length);
      this.accounts.set(normalized);
      this.isLoaded.set(true);
      console.log('✅ AccountService: Accounts loaded and set successfully');
      console.log('✅ AccountService: Current signal value:', this.accounts());
    } catch (error) {
      console.error('❌ AccountService: Error loading accounts:', error);
      console.error('❌ AccountService: Error details:', {
        message: (error as any)?.message,
        stack: (error as any)?.stack,
        response: (error as any)?.response
      });
      
      // Set empty accounts array on error
      console.warn('⚠️ AccountService: Error loading accounts, starting with empty array');
      this.accounts.set([]);
      this.isLoaded.set(true);
    }
  }

  /**
   * Verifica si las cuentas han sido cargadas
   */
  areAccountsLoaded(): boolean {
    return this.isLoaded();
  }

  getAccounts() {
    return this.accounts.asReadonly();
  }

  getAccountById(id: string) {
    return this.accounts().find(account => account.id === id);
  }

  async addAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) {
    try {
      // Crear la cuenta en el backend
      const newAccount = await ApiService.post('/accounts', {
        name: account.name,
        currency_code: 'USD', // Por defecto USD, se puede agregar al modelo si es necesario
        initial_balance: account.balance || 0,
        type: account.type,
        creditLimit: account.creditLimit,
        goals: account.goals,
        selectedCardStyle: account.selectedCardStyle,
        cardStyle: account.cardStyle
      });

      // Recargar las cuentas desde el servidor
      await this.loadAccounts();
      return newAccount;
    } catch (error) {
      console.error('Error creating account:', error);
      throw error;
    }
  }

  async updateAccount(id: string, updates: Partial<Account>) {
    try {
      // Actualizar en el backend
      await ApiService.put(`/accounts/${id}`, updates);
      
      // Actualizar localmente
      this.accounts.update(accounts =>
        accounts.map(account =>
          account.id === id
            ? { ...account, ...updates, updatedAt: new Date() }
            : account
        )
      );
    } catch (error) {
      console.error('Error updating account:', error);
      throw error;
    }
  }

  async deleteAccount(id: string) {
    try {
      // Eliminar en el backend
      await ApiService.delete(`/accounts/${id}`);
      
      // Eliminar localmente
      this.accounts.update(accounts =>
        accounts.filter(account => account.id !== id)
      );
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  }

  async updateAccountBalance(accountId: string, amount: number, type: 'income' | 'expense') {
    try {
      const account = this.getAccountById(accountId);
      if (!account) return;

      const newBalance = type === 'income' 
        ? account.balance + amount 
        : account.balance - amount;

      await this.updateAccount(accountId, { balance: newBalance });
    } catch (error) {
      console.error('Error updating account balance:', error);
      throw error;
    }
  }

  // Nuevos métodos para manejar metas
  async updateAccountGoals(accountId: string, goals: AccountGoals) {
    await this.updateAccount(accountId, { goals });
  }

  getGoalProgress(account: Account): number {
    if (!account.goals?.isActive) return 0;
    
    if (account.type === 'savings' && account.goals.balanceTarget) {
      return Math.min((account.balance / account.goals.balanceTarget) * 100, 100);
    }
    
    if (account.type === 'credit' && account.goals.spendingLimit) {
      const spent = Math.abs(account.balance);
      return Math.min((spent / account.goals.spendingLimit) * 100, 100);
    }
    
    return 0;
  }

  isGoalAchieved(account: Account): boolean {
    if (!account.goals?.isActive) return false;
    
    if (account.type === 'savings' && account.goals.balanceTarget) {
      return account.balance >= account.goals.balanceTarget;
    }
    
    if (account.type === 'credit' && account.goals.spendingLimit) {
      return Math.abs(account.balance) <= account.goals.spendingLimit;
    }
    
    return false;
  }

  isGoalAtRisk(account: Account): boolean {
    if (!account.goals?.isActive) return false;
    
    if (account.type === 'credit' && account.goals.spendingLimit) {
      const spent = Math.abs(account.balance);
      return (spent / account.goals.spendingLimit) > 0.8; // 80% del límite
    }
    
    return false;
  }
}
