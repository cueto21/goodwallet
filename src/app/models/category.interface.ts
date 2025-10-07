export interface Category {
    id: string;
    name: string;
    icon: string;
    color: string;
    type: 'income' | 'expense';
    createdAt: Date;
    updatedAt: Date;
}
