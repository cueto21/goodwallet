import { Injectable, signal, computed } from '@angular/core';
import { Category } from '../models/category.interface';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private categories = signal<Category[]>([]);

  constructor() {
    // Load from API; if fails, initialize defaults
    this.loadFromApi().catch(() => {
      this.initializeDefaultCategories();
    });
  }

  async loadFromApi() {
    try {
      const rows: any[] = await (await import('./api.service')).ApiService.get('/categories');
      const parsed = (rows || []).map(r => ({
        ...r,
        createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
        updatedAt: r.updatedAt ? new Date(r.updatedAt) : new Date()
      }));
      this.categories.set(parsed);
    } catch (e) {
      throw e; // Let caller handle
    }
  }


  private initializeDefaultCategories(): void {
    const defaultCategories: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
      { name: 'Alimentación', icon: '🍽️', color: '#FF6B6B', type: 'expense' },
      { name: 'Transporte', icon: '🚗', color: '#4ECDC4', type: 'expense' },
      { name: 'Entretenimiento', icon: '🎬', color: '#45B7D1', type: 'expense' },
      { name: 'Salud', icon: '⚕️', color: '#96CEB4', type: 'expense' },
      { name: 'Educación', icon: '📚', color: '#FFEAA7', type: 'expense' },
      { name: 'Compras', icon: '🛍️', color: '#DDA0DD', type: 'expense' },
      { name: 'Servicios', icon: '⚡', color: '#98D8C8', type: 'expense' },
      { name: 'Sueldo', icon: '💼', color: '#55A3FF', type: 'income' },
      { name: 'Freelance', icon: '💻', color: '#FD79A8', type: 'income' },
      { name: 'Inversiones', icon: '📈', color: '#FDCB6E', type: 'income' },
      { name: 'Otros Ingresos', icon: '💰', color: '#6C5CE7', type: 'income' }
    ];

    defaultCategories.forEach(categoryData => {
      this.addCategory(categoryData);
    });
  }

  getCategories() {
    return this.categories.asReadonly();
  }

  getCategoriesByType = computed(() => {
    const categories = this.categories();
    return {
      income: categories.filter(cat => cat.type === 'income'),
      expense: categories.filter(cat => cat.type === 'expense')
    };
  });

  addCategory(categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): void {
    // Try to save to remote API, fallback to local
    ApiService.post('/categories', categoryData).then((remote: any) => {
      const cat: Category = {
        ...categoryData,
        id: remote.id || this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.categories.update(categories => [...categories, cat]);
    }).catch(() => {
      const newCategory: Category = {
        ...categoryData,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.categories.update(categories => [...categories, newCategory]);
    });
  }

  updateCategory(id: string, updates: Partial<Category>): void {
    ApiService.put(`/categories/${id}`, updates).then(() => {
      this.categories.update(categories =>
        categories.map(category =>
          category.id === id
            ? { ...category, ...updates, updatedAt: new Date() }
            : category
        )
      );
    }).catch(() => {
      this.categories.update(categories =>
        categories.map(category =>
          category.id === id
            ? { ...category, ...updates, updatedAt: new Date() }
            : category
        )
      );
    });
  }

  deleteCategory(id: string): void {
    ApiService.delete(`/categories/${id}`).then(() => {
      this.categories.update(categories =>
        categories.filter(category => category.id !== id)
      );
    }).catch(() => {
      this.categories.update(categories =>
        categories.filter(category => category.id !== id)
      );
    });
  }

  getCategoryById(id: string): Category | undefined {
  if (id == null) return undefined;
  const idStr = String(id);
  return this.categories().find(category => String(category.id) === idStr);
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
