export interface Transaction {
    id: string;
    amount: number;
    description: string;
    date: Date;
    categoryId: string;
    accountId: string; // Para Transferenciaencias será la cuenta origen en el registro de salida y la cuenta destino en el registro de entrada
    type: 'income' | 'expense' | 'Transferencia';
    // Campos opcionales para trazabilidad de Transferenciaencias
    TransferenciaGroupId?: string; // agrupa los dos movimientos de una Transferenciaencia
    relatedAccountId?: string; // id de la otra cuenta involucrada
    referenceId?: number; // Para transacciones relacionadas con gastos compartidos
    createdAt: Date;
    updatedAt: Date;
}
