import { Injectable } from '@angular/core';
import { CardType, BankType, CardStyle } from '../models/account.interface';

export interface CardStyleOption {
  cardType: CardType;
  bank: BankType;
  name: string;
  gradient: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class CardStyleService {

  private cardStyles: CardStyleOption[] = [
    // TARJETAS DE DÉBITO - Primera fila
    {
      cardType: 'savings-account',
      bank: 'bcp',
      name: 'Débito Clásica Azul',
      gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
      description: 'Tarjeta débito - Azul elegante'
    },
    {
      cardType: 'savings-account',
      bank: 'bbva',
      name: 'Débito Premium Negro',
      gradient: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
      description: 'Tarjeta débito - Negro premium'
    },
    {
      cardType: 'savings-account',
      bank: 'interbank',
      name: 'Débito Verde Esmeralda',
      gradient: 'linear-gradient(135deg, #047857 0%, #059669 50%, #10b981 100%)',
      description: 'Tarjeta débito - Verde esmeralda'
    },
    {
      cardType: 'savings-account',
      bank: 'scotiabank',
      name: 'Débito Rojo Intenso',
      gradient: 'linear-gradient(135deg, #991b1b 0%, #ef4444 100%)',
      description: 'Tarjeta débito - Rojo intenso'
    },
    {
      cardType: 'savings-account',
      bank: 'falabella',
      name: 'Débito Verde CMR',
      gradient: 'linear-gradient(135deg, #166534 0%, #22c55e 50%, #4ade80 100%)',
      description: 'Tarjeta débito - Verde CMR intenso'
    },

    // TARJETAS VISA - Segunda fila
    {
      cardType: 'visa-classic',
      bank: 'bcp',
      name: 'Visa Classic',
      gradient: 'linear-gradient(135deg, #1d4ed8 0%, #60a5fa 50%, #dbeafe 100%)',
      description: 'Visa Classic - Azul degradado'
    },
    {
      cardType: 'visa-gold',
      bank: 'bbva',
      name: 'Visa Gold',
      gradient: 'linear-gradient(135deg, #b45309 0%, #d97706 30%, #f59e0b 70%, #fbbf24 100%)',
      description: 'Visa Gold - Dorado elegante'
    },
    {
      cardType: 'visa-platinum',
      bank: 'interbank',
      name: 'Visa Platinum',
      gradient: 'linear-gradient(135deg, #4b5563 0%, #9ca3af 50%, #f3f4f6 100%)',
      description: 'Visa Platinum - Plateado elegante'
    },
    {
      cardType: 'visa-classic',
      bank: 'scotiabank',
      name: 'Visa Black',
      gradient: 'linear-gradient(135deg, #000000 0%, #1f2937 50%, #374151 100%)',
      description: 'Visa Black - Negro exclusivo'
    },
    {
      cardType: 'visa-gold',
      bank: 'falabella',
      name: 'Visa Signature',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #ede9fe 100%)',
      description: 'Visa Signature - Púrpura premium'
    },

    // TARJETAS MASTERCARD - Tercera fila
    {
      cardType: 'mastercard-standard',
      bank: 'bcp',
      name: 'Mastercard Standard',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #f87171 50%, #fecaca 100%)',
      description: 'Mastercard Standard - Rojo clásico'
    },
    {
      cardType: 'mastercard-gold',
      bank: 'bbva',
      name: 'Mastercard Gold',
      gradient: 'linear-gradient(135deg, #92400e 0%, #ca8a04 30%, #eab308 70%, #facc15 100%)',
      description: 'Mastercard Gold - Dorado premium'
    },
    {
      cardType: 'mastercard-platinum',
      bank: 'interbank',
      name: 'Mastercard Platinum',
      gradient: 'linear-gradient(135deg, #374151 0%, #6b7280 50%, #e5e7eb 100%)',
      description: 'Mastercard Platinum - Gris metalizado'
    },
    {
      cardType: 'mastercard-standard',
      bank: 'scotiabank',
      name: 'Mastercard World',
      gradient: 'linear-gradient(135deg, #1f2937 0%, #4b5563 50%, #9ca3af 100%)',
      description: 'Mastercard World - Negro elegante'
    },
    {
      cardType: 'mastercard-gold',
      bank: 'falabella',
      name: 'Mastercard Titanium',
      gradient: 'linear-gradient(135deg, #0f172a 0%, #334155 50%, #cbd5e1 100%)',
      description: 'Mastercard Titanium - Titanio exclusivo'
    }
  ];

  getCardStyles(): CardStyleOption[] {
    return [...this.cardStyles];
  }

  getCardStylesByType(accountType: 'savings' | 'credit'): CardStyleOption[] {
    return this.cardStyles.filter(style => {
      if (accountType === 'credit') {
        return style.cardType.includes('visa') || style.cardType.includes('mastercard') || style.cardType.includes('cmr');
      } else {
        return style.cardType.includes('savings') || style.cardType === 'savings-account';
      }
    });
  }

  getCardStyleByIds(cardType: CardType, bank: BankType): CardStyleOption | undefined {
    return this.cardStyles.find(style => 
      style.cardType === cardType && style.bank === bank
    );
  }

  getAllStyles(): CardStyleOption[] {
    // Solo las opciones esenciales con nuevos diseños creativos
    const essentialStyles: CardStyleOption[] = [
      {
        cardType: 'savings-account',
        bank: 'bcp',
        name: 'BCP Clásico',
        gradient: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
        description: 'Azul elegante BCP'
      },
      {
        cardType: 'savings-account',
        bank: 'bbva',
        name: 'Visa Light',
        gradient: 'linear-gradient(135deg, #111827 0%, #374151 100%)',
        description: 'Negro premium BBVA'
      },
      {
        cardType: 'savings-account',
        bank: 'interbank',
        name: 'Verde Inter',
        gradient: 'linear-gradient(135deg, #047857 0%, #059669 50%, #10b981 100%)',
        description: 'Verde Interbank'
      },
      {
        cardType: 'visa-gold',
        bank: 'bbva',
        name: 'Visa Gold',
        gradient: 'linear-gradient(135deg, #b45309 0%, #d97706 30%, #f59e0b 70%, #fbbf24 100%)',
        description: 'Dorado elegante'
      },
      {
        cardType: 'mastercard-standard',
        bank: 'bcp',
        name: 'Master Red',
        gradient: 'linear-gradient(135deg, #dc2626 0%, #f87171 50%, #fecaca 100%)',
        description: 'Rojo Mastercard'
      },
      {
        cardType: 'visa-platinum',
        bank: 'interbank',
        name: 'Platinum',
        gradient: 'linear-gradient(135deg, #4b5563 0%, #9ca3af 50%, #f3f4f6 100%)',
        description: 'Plateado premium'
      },
      // NUEVOS DISEÑOS CREATIVOS Y DIVERTIDOS
      {
        cardType: 'savings-account',
        bank: 'custom',
        name: 'Celeste Sky',
        gradient: 'linear-gradient(135deg, #0ea5e9 0%, #38bdf8 50%, #7dd3fc 100%)',
        description: 'Celeste cielo vibrante'
      },
      {
        cardType: 'visa-classic',
        bank: 'custom',
        name: 'Sunset',
        gradient: 'linear-gradient(135deg, #f97316 0%, #fb923c 30%, #fbbf24 70%, #fde047 100%)',
        description: 'Atardecer naranja-amarillo'
      },
      {
        cardType: 'mastercard-gold',
        bank: 'custom',
        name: 'Galaxy',
        gradient: 'linear-gradient(135deg, #581c87 0%, #7c3aed 30%, #a855f7 70%, #c084fc 100%)',
        description: 'Púrpura galaxia'
      },
      {
        cardType: 'savings-account',
        bank: 'custom',
        name: 'Ocean',
        gradient: 'linear-gradient(135deg, #0f766e 0%, #0891b2 50%, #06b6d4 100%)',
        description: 'Azul océano profundo'
      }
    ];
    
    return essentialStyles;
  }

  getDefaultCardStyle(accountType: 'savings' | 'credit'): CardStyle {
    if (accountType === 'credit') {
      return {
        gradient: 'linear-gradient(135deg, #003366 0%, #0066CC 50%, #FF6600 100%)',
        cardType: 'visa-classic',
        bank: 'bcp'
      };
    } else {
      return {
        gradient: 'linear-gradient(135deg, #003366 0%, #FF6600 100%)',
        cardType: 'savings-account',
        bank: 'bcp'
      };
    }
  }

  getCardStylesByBank(): { [key in BankType]: CardStyleOption[] } {
    const stylesByBank = {} as { [key in BankType]: CardStyleOption[] };
    
    const banks: BankType[] = ['bcp', 'bbva', 'interbank', 'scotiabank', 'banbif', 'continental', 'pichincha', 'falabella', 'ripley', 'azteca', 'mibanco', 'caja-arequipa', 'custom'];
    
    banks.forEach(bank => {
      stylesByBank[bank] = this.cardStyles.filter(style => style.bank === bank);
    });
    
    return stylesByBank;
  }

  getBankName(bank: BankType): string {
    const bankNames: { [key in BankType]: string } = {
      'bcp': 'BCP',
      'bbva': 'BBVA Continental',
      'interbank': 'Interbank',
      'scotiabank': 'Scotiabank',
      'banbif': 'Banbif',
      'continental': 'Continental',
      'pichincha': 'Pichincha',
      'falabella': 'CMR Falabella',
      'ripley': 'Banco Ripley',
      'azteca': 'Banco Azteca',
      'mibanco': 'MiBanco',
      'caja-arequipa': 'Caja Arequipa',
      'custom': 'Personalizado'
    };
    
    return bankNames[bank];
  }

  getStylesByBank(bank: BankType): CardStyleOption[] {
    return this.cardStyles.filter(style => style.bank === bank);
  }

  getStylesByCardType(): { debit: CardStyleOption[], visa: CardStyleOption[], mastercard: CardStyleOption[] } {
    return {
      debit: this.cardStyles.filter(style => style.cardType === 'savings-account'),
      visa: this.cardStyles.filter(style => style.cardType.includes('visa')),
      mastercard: this.cardStyles.filter(style => style.cardType.includes('mastercard'))
    };
  }

  getCardTypeName(type: 'debit' | 'visa' | 'mastercard'): string {
    const typeNames = {
      'debit': 'Tarjetas de Débito',
      'visa': 'Tarjetas Visa',
      'mastercard': 'Tarjetas Mastercard'
    };
    return typeNames[type];
  }
}
