import { Component, inject, OnInit, signal, computed, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FriendsService, Friend, SharedTransaction } from '../../services/friends';
import { AccountService } from '../../services/account';
import { DarkModeService } from '../../services/dark-mode.service';
import { AddFriendModalComponent } from '../add-friend-modal/add-friend-modal.component';

@Component({
  selector: 'app-friends',
  imports: [CommonModule, FormsModule, AddFriendModalComponent],
  templateUrl: './friends.html',
  styleUrl: './friends.scss'
})
export class FriendsComponent implements OnInit {
  private friendsService = inject(FriendsService);
  private accountService = inject(AccountService);
  private darkModeService = inject(DarkModeService);
  private cdr = inject(ChangeDetectorRef);

  isDarkMode = this.darkModeService.darkMode;

  friends = this.friendsService.getFriends();
  sharedTransactions = this.friendsService.getSharedTransactions();
  accounts = this.accountService.getAccounts();

  acceptedFriends = computed(() => this.friends().filter(f => f.status === 'accepted'));
  pendingRequests = computed(() => this.friends().filter(f => f.status === 'pending'));

  // Computed properties for totals
  totalOwed = computed(() => {
    return this.sharedTransactions().owing
      .filter(tx => tx.status === 'pending')
      .reduce((sum, tx) => sum + tx.amount_owed, 0);
  });

  totalOwing = computed(() => {
    return this.sharedTransactions().owed
      .filter(tx => tx.status === 'pending')
      .reduce((sum, tx) => sum + tx.amount_owed, 0);
  });

  showAddFriendForm = signal(false);
  newFriendEmail = '';

  selectedSharedTx: SharedTransaction | null = null;
  selectedAccountId = '';

  ngOnInit() {
    this.friendsService.loadFriends();
    this.friendsService.loadSharedTransactions();
    if (!this.accountService.areAccountsLoaded()) {
      this.accountService.loadAccounts();
    }
  }

  openAddFriendForm() {
    console.log('openAddFriendForm called');
    this.showAddFriendForm.set(true);
    this.newFriendEmail = '';
    this.cdr.markForCheck();
  }

  cancelAddFriend() {
    console.log('cancelAddFriend called');
    this.showAddFriendForm.set(false);
    this.newFriendEmail = '';
    this.cdr.markForCheck();
  }

  onFriendAdded() {
    this.friendsService.loadFriends();
    this.showAddFriendForm.set(false);
    this.cdr.markForCheck();
  }

  async addFriend() {
    if (!this.newFriendEmail.trim()) return;
    try {
      await this.friendsService.addFriend(this.newFriendEmail);
      this.cancelAddFriend();
      alert('Solicitud de amistad enviada');
    } catch (error: any) {
      alert(error.message || 'Error al enviar solicitud');
    }
  }

  async acceptFriend(friendId: number) {
    try {
      await this.friendsService.acceptFriendRequest(friendId);
      alert('Amigo aceptado');
    } catch (error: any) {
      alert(error.message || 'Error al aceptar amigo');
    }
  }

  openPayModal(sharedTx: SharedTransaction) {
    this.selectedSharedTx = sharedTx;
    this.selectedAccountId = this.accounts()[0]?.id || '';
  }

  cancelPay() {
    this.selectedSharedTx = null;
    this.selectedAccountId = '';
  }

  async paySharedTransaction() {
    if (!this.selectedSharedTx || !this.selectedAccountId) return;
    try {
      await this.friendsService.paySharedTransaction(this.selectedSharedTx.id, this.selectedAccountId);
      this.cancelPay();
      alert('Pago realizado exitosamente');
    } catch (error: any) {
      alert(error.message || 'Error al realizar el pago');
    }
  }

  formatCurrency(amount: number): string {
    return amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}