import { Injectable, signal } from '@angular/core';
import { ApiService } from './api.service';

export interface Friend {
  id: number;
  email: string;
  display_name: string;
  status: string;
  created_at: string;
  direction: 'sent' | 'received';
}

export interface SharedTransaction {
  id: number;
  transaction_id: number;
  amount_owed: number;
  split_type: 'fixed' | 'percentage';
  split_value: number;
  status: 'pending' | 'paid';
  paid_at?: string;
  approved?: boolean;
  paid_transaction_id?: number;
  description: string;
  total_amount: number;
  date: string;
  creator_name?: string;
  friend_name?: string;
}

@Injectable({
  providedIn: 'root'
})
export class FriendsService {
  private friends = signal<Friend[]>([]);
  private sharedTransactions = signal<{ owed: SharedTransaction[], owing: SharedTransaction[] }>({ owed: [], owing: [] });

  async loadFriends() {
    try {
      const data = await ApiService.get('/friends');
      this.friends.set(data);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }

  async addFriend(email: string) {
    try {
      await ApiService.post('/friends', { friend_email: email });
      await this.loadFriends();
    } catch (error) {
      console.error('Error adding friend:', error);
      throw error;
    }
  }

  async acceptFriendRequest(friendId: number) {
    try {
      await ApiService.put(`/friends/${friendId}/accept`);
      await this.loadFriends();
    } catch (error) {
      console.error('Error accepting friend request:', error);
      throw error;
    }
  }

  async loadSharedTransactions() {
    try {
      const data = await ApiService.get('/shared-transactions');
      console.log('loadSharedTransactions data:', data);
      this.sharedTransactions.set(data);
      console.log('sharedTransactions set to:', this.sharedTransactions());
    } catch (error) {
      console.error('Error loading shared transactions:', error);
    }
  }

  async paySharedTransaction(sharedId: number, accountId: string) {
    try {
      await ApiService.put(`/shared-transactions/${sharedId}/pay`, { account_id: accountId });
      await this.loadSharedTransactions();
    } catch (error) {
      console.error('Error paying shared transaction:', error);
      throw error;
    }
  }

  async approveSharedTransaction(sharedId: number) {
    try {
      await ApiService.put(`/shared-transactions/${sharedId}/approve`);
      await this.loadSharedTransactions();
    } catch (error) {
      console.error('Error approving shared transaction:', error);
      throw error;
    }
  }

  getFriends() {
    return this.friends.asReadonly();
  }

  getSharedTransactions() {
    return this.sharedTransactions.asReadonly();
  }
}