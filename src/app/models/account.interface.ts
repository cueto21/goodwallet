export interface Account {
    id: string;
    name: string;
    type: 'savings' | 'credit';
    balance: number;
    creditLimit?: number;
    cardStyle?: CardStyle;
    selectedCardStyle?: any;
    goals?: AccountGoals;
    createdAt: Date;
    updatedAt: Date;
}

export interface AccountGoals {
    balanceTarget?: number;      // Meta de saldo para cuentas de ahorro
    spendingLimit?: number;      // Límite máximo de gasto para tarjetas de crédito
    targetDate?: Date;           // Fecha objetivo para alcanzar la meta
    isActive: boolean;           // Si la meta está activa
    description?: string;        // Descripción opcional de la meta
}

export interface CardStyle {
    gradient: string;
    cardType: CardType;
    bank: BankType;
}

export type CardType = 
    | 'visa-classic'
    | 'visa-gold' 
    | 'visa-platinum'
    | 'visa-black'
    | 'mastercard-standard'
    | 'mastercard-gold'
    | 'mastercard-platinum'
    | 'mastercard-black'
    | 'american-express'
    | 'diners-club'
    | 'cmr-falabella'
    | 'ripley'
    | 'banco-custom'
    | 'savings-account';

export type BankType = 
    | 'bcp'           // Banco de Crédito del Perú - Azul
    | 'bbva'          // BBVA - Azul oscuro y blanco
    | 'interbank'     // Interbank - Verde y azul
    | 'scotiabank'    // Scotiabank - Rojo
    | 'banbif'        // Banbif - Naranja
    | 'continental'   // Continental - Morado
    | 'pichincha'     // Pichincha - Amarillo y azul
    | 'falabella'     // Banco Falabella - Verde CMR
    | 'ripley'        // Banco Ripley - Morado y rosa
    | 'azteca'        // Banco Azteca - Verde y blanco
    | 'mibanco'       // MiBanco - Azul claro
    | 'caja-arequipa' // Caja Arequipa - Verde
    | 'custom';       // Personalizado
