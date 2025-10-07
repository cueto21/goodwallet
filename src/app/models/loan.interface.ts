export interface LoanInstallment {
    id: string;
    installmentNumber: number;
    amount: number;
    dueDate: Date;
    status: 'pending' | 'paid' | 'overdue' | 'partial';
    paidDate?: Date;
    partialAmountPaid?: number; // Nuevo: monto pagado parcialmente
}

export interface Loan {
    id: string;
    amount: number;
    description: string;
    date: Date;
    dueDate: Date;
    type: 'lent' | 'borrowed'; // 'lent' = yo presté, 'borrowed' = me prestaron
    personName: string; // nombre de la persona
    status: 'pending' | 'paid' | 'overdue';
    paidDate?: Date; // fecha de pago cuando se completa
    notes?: string; // notas/descripcion adicional (backend 'notes')
    // Nueva funcionalidad de cuotas
    installments?: {
        enabled: boolean;
        totalInstallments: number;
        firstInstallmentDate: Date;
        installmentAmount: number;
        installmentsList: LoanInstallment[];
        paymentFrequency: 'daily' | 'weekly' | 'biweekly' | 'monthly';
    };
    createdAt: Date;
    updatedAt: Date;
}
