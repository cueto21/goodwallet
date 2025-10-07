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
    // BCP - Banco de Crédito del Perú (Azul y Naranja característicos)
    {
      cardType: 'savings-account',
      bank: 'bcp',
      name: 'BCP Cuenta de Ahorros',
      gradient: 'linear-gradient(135deg, #003366 0%, #FF6600 100%)', // Azul BCP + Naranja
      description: 'BCP Ahorros - Azul y naranja clásico'
    },
    {
      cardType: 'visa-classic',
      bank: 'bcp',
      name: 'BCP Visa Classic',
      gradient: 'linear-gradient(135deg, #003366 0%, #0066CC 50%, #FF6600 100%)',
      description: 'Visa Classic BCP - Azul corporativo con acento naranja'
    },
    {
      cardType: 'visa-gold',
      bank: 'bcp',
      name: 'BCP Visa Gold',
      gradient: 'linear-gradient(135deg, #DAA520 0%, #FFD700 30%, #003366 70%, #FF6600 100%)',
      description: 'Visa Gold BCP - Dorado con azul y naranja BCP'
    },
    {
      cardType: 'visa-platinum',
      bank: 'bcp',
      name: 'BCP Visa Platinum',
      gradient: 'linear-gradient(135deg, #C0C0C0 0%, #E5E5E5 30%, #003366 70%, #FF6600 100%)',
      description: 'Visa Platinum BCP - Plateado con identidad BCP'
    },

    // BBVA Continental (Azul BBVA característico)
    {
      cardType: 'savings-account',
      bank: 'bbva',
      name: 'BBVA Cuenta de Ahorros',
      gradient: 'linear-gradient(135deg, #072146 0%, #1464A0 100%)',
      description: 'BBVA Ahorros - Azul corporativo'
    },
    {
      cardType: 'visa-classic',
      bank: 'bbva',
      name: 'BBVA Visa',
      gradient: 'linear-gradient(135deg, #072146 0%, #1464A0 50%, #00A9CE 100%)',
      description: 'BBVA Visa - Degradado azul corporativo'
    },
    {
      cardType: 'mastercard-gold',
      bank: 'bbva',
      name: 'BBVA Mastercard Gold',
      gradient: 'linear-gradient(135deg, #FFD700 0%, #DAA520 30%, #1464A0 70%, #072146 100%)',
      description: 'BBVA Gold - Dorado con azul BBVA'
    },

    // Interbank (Verde característico)
    {
      cardType: 'savings-account',
      bank: 'interbank',
      name: 'Interbank Cuenta de Ahorros',
      gradient: 'linear-gradient(135deg, #00A651 0%, #00BF63 100%)',
      description: 'Interbank Ahorros - Verde corporativo'
    },
    {
      cardType: 'visa-classic',
      bank: 'interbank',
      name: 'Interbank Visa',
      gradient: 'linear-gradient(135deg, #00A651 0%, #00BF63 50%, #32CD32 100%)',
      description: 'Interbank Visa - Verde degradado'
    },
    {
      cardType: 'mastercard-platinum',
      bank: 'interbank',
      name: 'Interbank Mastercard Platinum',
      gradient: 'linear-gradient(135deg, #C0C0C0 0%, #E5E5E5 30%, #00A651 70%, #00BF63 100%)',
      description: 'Interbank Platinum - Plateado con verde corporativo'
    },

    // Scotiabank (Rojo característico)
    {
      cardType: 'savings-account',
      bank: 'scotiabank',
      name: 'Scotiabank Cuenta de Ahorros',
      gradient: 'linear-gradient(135deg, #DC143C 0%, #B22222 100%)',
      description: 'Scotiabank Ahorros - Rojo corporativo'
    },
    {
      cardType: 'visa-classic',
      bank: 'scotiabank',
      name: 'Scotiabank Visa',
      gradient: 'linear-gradient(135deg, #DC143C 0%, #FF4500 50%, #B22222 100%)',
      description: 'Scotiabank Visa - Rojo degradado'
    },
    {
      cardType: 'visa-gold',
      bank: 'scotiabank',
      name: 'Scotiabank Visa Gold',
      gradient: 'linear-gradient(135deg, #FFD700 0%, #DAA520 30%, #DC143C 70%, #B22222 100%)',
      description: 'Scotiabank Gold - Dorado con rojo corporativo'
    },

    // CMR Falabella (Verde CMR)
    {
      cardType: 'mastercard-standard',
      bank: 'falabella',
      name: 'CMR Falabella Classic',
      gradient: 'linear-gradient(135deg, #00A86B 0%, #32CD32 100%)',
      description: 'CMR Classic - Verde Falabella'
    },
    {
      cardType: 'visa-classic',
      bank: 'falabella',
      name: 'CMR Visa',
      gradient: 'linear-gradient(135deg, #00A86B 0%, #32CD32 50%, #228B22 100%)',
      description: 'CMR Visa - Verde degradado'
    },
    {
      cardType: 'mastercard-standard',
      bank: 'falabella',
      name: 'CMR Mastercard',
      gradient: 'linear-gradient(135deg, #32CD32 0%, #00A86B 50%, #006400 100%)',
      description: 'CMR Mastercard - Verde intenso'
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
    return [...this.cardStyles];
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
}
